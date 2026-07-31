import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { ExpenseCategory, ExpenseItem, ExpenseSplit, SplitMethod } from '@/types/domain'

interface ExpenseRow {
  id: string
  group_id: string
  description: string
  amount: number
  currency: string
  paid_by: string
  category: ExpenseCategory
  expense_date: string
  notes: string | null
  created_at: string
  created_by: string
  split_method: SplitMethod
}

interface ExpenseSplitRow {
  expense_id: string
  user_id: string
  amount: number
}

export interface CreateExpenseInput {
  groupId: string
  description: string
  amount: number
  currency: string
  paidBy: string
  category: ExpenseCategory
  expenseDate: string
  notes: string
  splitMethod: SplitMethod
  splits: ExpenseSplit[]
}

const previewExpenses: ExpenseItem[] = [
  {
    id: 'preview-expense-1',
    groupId: 'preview-goa-trip',
    description: 'Beach dinner at Calypso',
    amount: 96,
    currency: 'GBP',
    paidBy: 'preview-owner',
    category: 'Food',
    expenseDate: '2026-07-24',
    notes: 'Seafood platter and drinks',
    createdAt: '2026-07-24T20:15:00.000Z',
    createdBy: 'preview-owner',
    splitMethod: 'EQUAL',
    splits: [
      { userId: 'preview-owner', amount: 24 },
      { userId: 'preview-amy', amount: 24 },
      { userId: 'preview-sam', amount: 24 },
      { userId: 'preview-lee', amount: 24 },
    ],
  },
  {
    id: 'preview-expense-2',
    groupId: 'preview-goa-trip',
    description: 'Airport taxi',
    amount: 30,
    currency: 'GBP',
    paidBy: 'preview-sam',
    category: 'Transport',
    expenseDate: '2026-07-23',
    notes: '',
    createdAt: '2026-07-23T08:30:00.000Z',
    createdBy: 'preview-owner',
    splitMethod: 'EXACT',
    splits: [
      { userId: 'preview-owner', amount: 10 },
      { userId: 'preview-amy', amount: 5 },
      { userId: 'preview-sam', amount: 15 },
    ],
  },
]

function requireClient() {
  const client = getSupabaseBrowserClient()

  if (!client) {
    throw new Error('Supabase is not configured for live expenses.')
  }

  return client
}

export async function listExpensesForGroups(groupIds: string[]) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return previewExpenses.filter((expense) => groupIds.length === 0 || groupIds.includes(expense.groupId))
  }

  if (groupIds.length === 0) {
    return []
  }

  const { data: expenses, error: expensesError } = await client
    .from('expenses')
    .select(
      `
        id,
        group_id,
        description,
        amount,
        currency,
        paid_by,
        category,
        expense_date,
        notes,
        created_at,
        created_by,
        split_method
      `,
    )
    .in('group_id', groupIds)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (expensesError) {
    throw expensesError
  }

  const expenseRows = (expenses ?? []) as ExpenseRow[]

  if (expenseRows.length === 0) {
    return []
  }

  const expenseIds = expenseRows.map((expense) => expense.id)

  const { data: splits, error: splitsError } = await client
    .from('expense_splits')
    .select(
      `
        expense_id,
        user_id,
        amount
      `,
    )
    .in('expense_id', expenseIds)

  if (splitsError) {
    throw splitsError
  }

  const splitsByExpenseId = ((splits ?? []) as ExpenseSplitRow[]).reduce<Record<string, ExpenseSplit[]>>(
    (accumulator, row) => {
      accumulator[row.expense_id] ??= []
      accumulator[row.expense_id].push({ userId: row.user_id, amount: Number(row.amount) })
      return accumulator
    },
    {},
  )

  return expenseRows.map((expense) => ({
    id: expense.id,
    groupId: expense.group_id,
    description: expense.description,
    amount: Number(expense.amount),
    currency: expense.currency,
    paidBy: expense.paid_by,
    category: expense.category,
    expenseDate: expense.expense_date,
    notes: expense.notes ?? '',
    createdAt: expense.created_at,
    createdBy: expense.created_by,
    splitMethod: expense.split_method,
    splits: splitsByExpenseId[expense.id] ?? [],
  }))
}

export async function createExpense(input: CreateExpenseInput) {
  const client = requireClient()
  const { data, error } = await client.rpc('create_expense_with_splits', {
    target_group_id: input.groupId,
    expense_description: input.description.trim(),
    expense_amount: input.amount,
    expense_currency: input.currency.trim().toUpperCase(),
    expense_paid_by: input.paidBy,
    expense_category: input.category,
    expense_date: input.expenseDate,
    expense_notes: input.notes.trim(),
    expense_split_method: input.splitMethod,
    expense_splits: input.splits.map((split) => ({ user_id: split.userId, amount: split.amount })),
  })

  if (error) {
    throw error
  }

  return data as string
}
