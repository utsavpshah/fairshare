-- FairShare full Supabase bootstrap
-- Use this on a fresh Supabase project to create all current auth/profile,
-- groups/members, and expenses/splits database objects in one run.
--
-- App users should still be created through Supabase Authentication -> Users,
-- not by inserting directly into public.profiles.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar text,
  created_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'GBP',
  paid_by uuid not null references public.profiles (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete restrict,
  category text not null,
  split_method text not null,
  expense_date date not null,
  notes text not null default '',
  receipt_url text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_description_length check (char_length(trim(description)) between 2 and 120),
  constraint expenses_currency_length check (char_length(trim(currency)) = 3),
  constraint expenses_category_check check (category in ('Food', 'Transport', 'Shopping', 'Hotel', 'Fuel', 'Entertainment', 'Utilities', 'Other')),
  constraint expenses_split_method_check check (split_method in ('EQUAL', 'EXACT')),
  constraint expenses_notes_length check (char_length(notes) <= 400)
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint expense_splits_amount_positive check (amount > 0),
  constraint expense_splits_unique_member unique (expense_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  amount numeric(12, 2) not null,
  currency text not null default 'GBP',
  paid_by uuid not null references public.profiles (id) on delete restrict,
  paid_to uuid not null references public.profiles (id) on delete restrict,
  settlement_date date not null,
  notes text not null default '',
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint settlements_amount_positive check (amount > 0),
  constraint settlements_currency_length check (char_length(trim(currency)) = 3),
  constraint settlements_notes_length check (char_length(notes) <= 280),
  constraint settlements_participants_different check (paid_by <> paid_to)
);

create index if not exists groups_created_by_idx on public.groups (created_by);
create index if not exists groups_created_at_idx on public.groups (created_at desc);
create index if not exists group_members_user_id_idx on public.group_members (user_id);
create index if not exists group_members_group_role_idx on public.group_members (group_id, role);
create index if not exists expenses_group_date_idx on public.expenses (group_id, expense_date desc);
create index if not exists expenses_created_by_idx on public.expenses (created_by);
create index if not exists expenses_paid_by_idx on public.expenses (paid_by);
create index if not exists expense_splits_expense_id_idx on public.expense_splits (expense_id);
create index if not exists expense_splits_user_id_idx on public.expense_splits (user_id);
create index if not exists settlements_group_date_idx on public.settlements (group_id, settlement_date desc);
create index if not exists settlements_paid_by_idx on public.settlements (paid_by);
create index if not exists settlements_paid_to_idx on public.settlements (paid_to);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    avatar = excluded.avatar;

  return new;
end;
$$;

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

create or replace function public.create_expense_with_splits(
  target_group_id uuid,
  expense_description text,
  expense_amount numeric,
  expense_currency text,
  expense_paid_by uuid,
  expense_category text,
  expense_date date,
  expense_notes text,
  expense_split_method text,
  expense_splits jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_expense_id uuid;
  split_record record;
  split_total numeric(12, 2) := 0;
  split_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_group_member(target_group_id) then
    raise exception 'You can only add expenses to groups you belong to';
  end if;

  if not public.is_group_member(target_group_id, expense_paid_by) then
    raise exception 'The payer must belong to the selected group';
  end if;

  if jsonb_typeof(expense_splits) <> 'array' or jsonb_array_length(expense_splits) = 0 then
    raise exception 'At least one expense split is required';
  end if;

  for split_record in
    select
      (entry ->> 'user_id')::uuid as user_id,
      round((entry ->> 'amount')::numeric, 2) as amount
    from jsonb_array_elements(expense_splits) as entry
  loop
    if split_record.user_id is null then
      raise exception 'Each split entry must include a user_id';
    end if;

    if split_record.amount is null or split_record.amount <= 0 then
      raise exception 'Each split amount must be greater than zero';
    end if;

    if not public.is_group_member(target_group_id, split_record.user_id) then
      raise exception 'Split members must belong to the selected group';
    end if;

    split_total := split_total + split_record.amount;
    split_count := split_count + 1;
  end loop;

  if split_count = 0 then
    raise exception 'At least one expense split is required';
  end if;

  if exists (
    select 1
    from (
      select (entry ->> 'user_id')::uuid as user_id
      from jsonb_array_elements(expense_splits) as entry
    ) duplicated
    group by duplicated.user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate split members are not allowed';
  end if;

  if round(expense_amount::numeric, 2) <> round(split_total, 2) then
    raise exception 'Split amounts must equal the total expense amount';
  end if;

  insert into public.expenses (
    group_id,
    description,
    amount,
    currency,
    paid_by,
    created_by,
    category,
    split_method,
    expense_date,
    notes
  )
  values (
    target_group_id,
    trim(expense_description),
    round(expense_amount::numeric, 2),
    upper(trim(expense_currency)),
    expense_paid_by,
    auth.uid(),
    expense_category,
    expense_split_method,
    expense_date,
    trim(coalesce(expense_notes, ''))
  )
  returning id into new_expense_id;

  insert into public.expense_splits (expense_id, user_id, amount)
  select
    new_expense_id,
    (entry ->> 'user_id')::uuid,
    round((entry ->> 'amount')::numeric, 2)
  from jsonb_array_elements(expense_splits) as entry;

  return new_expense_id;
end;
$$;

create or replace function public.create_settlement(
  target_group_id uuid,
  settlement_amount numeric,
  settlement_currency text,
  settlement_paid_by uuid,
  settlement_paid_to uuid,
  target_settlement_date date,
  settlement_notes text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_settlement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_group_member(target_group_id) then
    raise exception 'You can only add settlements to groups you belong to';
  end if;

  if settlement_paid_by = settlement_paid_to then
    raise exception 'The payer and receiver must be different members';
  end if;

  if not public.is_group_member(target_group_id, settlement_paid_by) then
    raise exception 'The paying member must belong to the selected group';
  end if;

  if not public.is_group_member(target_group_id, settlement_paid_to) then
    raise exception 'The receiving member must belong to the selected group';
  end if;

  insert into public.settlements (
    group_id,
    amount,
    currency,
    paid_by,
    paid_to,
    settlement_date,
    notes,
    created_by
  )
  values (
    target_group_id,
    round(settlement_amount::numeric, 2),
    upper(trim(settlement_currency)),
    settlement_paid_by,
    settlement_paid_to,
    target_settlement_date,
    trim(coalesce(settlement_notes, '')),
    auth.uid()
  )
  returning id into new_settlement_id;

  return new_settlement_id;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, name, email, avatar)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name', split_part(users.email, '@', 1)),
  users.email,
  users.raw_user_meta_data ->> 'avatar_url'
from auth.users as users
where users.email is not null
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  avatar = excluded.avatar;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_owner(uuid, uuid) to authenticated;
grant execute on function public.create_group_with_owner(text, text) to authenticated;
grant execute on function public.update_group_details(uuid, text, text) to authenticated;
grant execute on function public.delete_group_owned_by_user(uuid) to authenticated;
grant execute on function public.add_group_member_by_email(uuid, text) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;
grant execute on function public.create_expense_with_splits(uuid, text, numeric, text, uuid, text, date, text, text, jsonb) to authenticated;
grant execute on function public.create_settlement(uuid, numeric, text, uuid, uuid, date, text) to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can read profiles in shared groups" on public.profiles;
drop policy if exists "Users can view groups they belong to" on public.groups;
drop policy if exists "Users can create groups they own" on public.groups;
drop policy if exists "Owners can update groups" on public.groups;
drop policy if exists "Owners can delete groups" on public.groups;
drop policy if exists "Users can view group memberships in their groups" on public.group_members;
drop policy if exists "Users can view expenses in their groups" on public.expenses;
drop policy if exists "Users can insert their own expenses in their groups" on public.expenses;
drop policy if exists "Users can update their own expenses" on public.expenses;
drop policy if exists "Users can delete their own expenses" on public.expenses;
drop policy if exists "Users can view expense splits in their groups" on public.expense_splits;
drop policy if exists "Users can view settlements in their groups" on public.settlements;
drop policy if exists "Users can insert settlements in their groups" on public.settlements;
drop policy if exists "Users can update their own settlements" on public.settlements;
drop policy if exists "Users can delete their own settlements" on public.settlements;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

create policy "Users can view expenses in their groups"
  on public.expenses
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "Users can insert their own expenses in their groups"
  on public.expenses
  for insert
  to authenticated
  with check (auth.uid() = created_by and public.is_group_member(group_id));

create policy "Users can update their own expenses"
  on public.expenses
  for update
  to authenticated
  using (auth.uid() = created_by and public.is_group_member(group_id))
  with check (auth.uid() = created_by and public.is_group_member(group_id));

create policy "Users can delete their own expenses"
  on public.expenses
  for delete
  to authenticated
  using (auth.uid() = created_by and public.is_group_member(group_id));

create policy "Users can view expense splits in their groups"
  on public.expense_splits
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.expenses expense
      where expense.id = expense_splits.expense_id
        and public.is_group_member(expense.group_id)
    )
  );

create policy "Users can view settlements in their groups"
  on public.settlements
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "Users can insert settlements in their groups"
  on public.settlements
  for insert
  to authenticated
  with check (auth.uid() = created_by and public.is_group_member(group_id));

create policy "Users can update their own settlements"
  on public.settlements
  for update
  to authenticated
  using (auth.uid() = created_by and public.is_group_member(group_id))
  with check (auth.uid() = created_by and public.is_group_member(group_id));

create policy "Users can delete their own settlements"
  on public.settlements
  for delete
  to authenticated
  using (auth.uid() = created_by and public.is_group_member(group_id));