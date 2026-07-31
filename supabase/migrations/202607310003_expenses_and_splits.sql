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

create index if not exists expenses_group_date_idx on public.expenses (group_id, expense_date desc);
create index if not exists expenses_created_by_idx on public.expenses (created_by);
create index if not exists expenses_paid_by_idx on public.expenses (paid_by);
create index if not exists expense_splits_expense_id_idx on public.expense_splits (expense_id);
create index if not exists expense_splits_user_id_idx on public.expense_splits (user_id);

alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;

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

grant execute on function public.create_expense_with_splits(uuid, text, numeric, text, uuid, text, date, text, text, jsonb) to authenticated;