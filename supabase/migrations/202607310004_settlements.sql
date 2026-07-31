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

create index if not exists settlements_group_date_idx on public.settlements (group_id, settlement_date desc);
create index if not exists settlements_paid_by_idx on public.settlements (paid_by);
create index if not exists settlements_paid_to_idx on public.settlements (paid_to);

alter table public.settlements enable row level security;

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

grant execute on function public.create_settlement(uuid, numeric, text, uuid, uuid, date, text) to authenticated;