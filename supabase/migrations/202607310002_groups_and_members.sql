create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint groups_name_length check (char_length(trim(name)) between 2 and 80),
  constraint groups_description_length check (char_length(description) <= 280)
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (group_id, user_id),
  constraint group_members_role_check check (role in ('OWNER', 'MEMBER'))
);

create index if not exists groups_created_by_idx on public.groups (created_by);
create index if not exists groups_created_at_idx on public.groups (created_at desc);
create index if not exists group_members_user_id_idx on public.group_members (user_id);
create index if not exists group_members_group_role_idx on public.group_members (group_id, role);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create or replace function public.is_group_member(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members membership
    where membership.group_id = target_group_id
      and membership.user_id = target_user_id
  );
$$;

create or replace function public.is_group_owner(target_group_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members membership
    where membership.group_id = target_group_id
      and membership.user_id = target_user_id
      and membership.role = 'OWNER'
  );
$$;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_owner(uuid, uuid) to authenticated;

create policy "Users can view groups they belong to"
  on public.groups
  for select
  to authenticated
  using (public.is_group_member(id));

create policy "Users can create groups they own"
  on public.groups
  for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Owners can update groups"
  on public.groups
  for update
  to authenticated
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

create policy "Owners can delete groups"
  on public.groups
  for delete
  to authenticated
  using (public.is_group_owner(id));

create policy "Users can view group memberships in their groups"
  on public.group_members
  for select
  to authenticated
  using (public.is_group_member(group_id));

create or replace function public.create_group_with_owner(group_name text, group_description text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.groups (name, description, created_by)
  values (trim(group_name), trim(coalesce(group_description, '')), auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, auth.uid(), 'OWNER');

  return new_group_id;
end;
$$;

create or replace function public.update_group_details(target_group_id uuid, group_name text, group_description text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_owner(target_group_id) then
    raise exception 'Only a group owner can update this group';
  end if;

  update public.groups
  set
    name = trim(group_name),
    description = trim(coalesce(group_description, ''))
  where id = target_group_id;
end;
$$;

create or replace function public.delete_group_owned_by_user(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_owner(target_group_id) then
    raise exception 'Only a group owner can delete this group';
  end if;

  delete from public.groups where id = target_group_id;
end;
$$;

create or replace function public.add_group_member_by_email(target_group_id uuid, member_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile_id uuid;
begin
  if not public.is_group_owner(target_group_id) then
    raise exception 'Only a group owner can add members';
  end if;

  select profile.id
  into target_profile_id
  from public.profiles profile
  where lower(profile.email) = lower(trim(member_email));

  if target_profile_id is null then
    raise exception 'No existing user found for %', member_email;
  end if;

  if public.is_group_member(target_group_id, target_profile_id) then
    raise exception 'This user is already a member of the group';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target_group_id, target_profile_id, 'MEMBER');

  return target_profile_id;
end;
$$;

create or replace function public.remove_group_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_owner(target_group_id) then
    raise exception 'Only a group owner can remove members';
  end if;

  if auth.uid() = target_user_id then
    raise exception 'Owners cannot remove themselves. Delete the group instead.';
  end if;

  delete from public.group_members
  where group_id = target_group_id
    and user_id = target_user_id;
end;
$$;

grant execute on function public.create_group_with_owner(text, text) to authenticated;
grant execute on function public.update_group_details(uuid, text, text) to authenticated;
grant execute on function public.delete_group_owned_by_user(uuid) to authenticated;
grant execute on function public.add_group_member_by_email(uuid, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

create policy "Users can read profiles in shared groups"
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.group_members viewer_membership
      join public.group_members target_membership
        on target_membership.group_id = viewer_membership.group_id
      where viewer_membership.user_id = auth.uid()
        and target_membership.user_id = public.profiles.id
    )
  );