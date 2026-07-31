import { describe, expect, it } from 'vitest'
import type { ExpenseItem, SettlementItem } from '@/types/domain'
import { calculateGroupBalances, getExpenseImpactForUser, getSettlementImpactForUser, summarizeBalances } from '@/services/balances'

const expenses: ExpenseItem[] = [
  {
    id: 'expense-1',
    groupId: 'group-a',
    description: 'Dinner',
    amount: 100,
    currency: 'GBP',
    paidBy: 'user-a',
    category: 'Food',
    expenseDate: '2026-07-31',
    notes: '',
    createdAt: '2026-07-31T10:00:00.000Z',
    createdBy: 'user-a',
    splitMethod: 'EQUAL',
    splits: [
      { userId: 'user-a', amount: 50 },
      { userId: 'user-b', amount: 50 },
    ],
  },
  {
    id: 'expense-2',
    groupId: 'group-b',
    description: 'Taxi',
    amount: 30,
    currency: 'GBP',
    paidBy: 'user-c',
    category: 'Transport',
    expenseDate: '2026-07-31',
    notes: '',
    createdAt: '2026-07-31T12:00:00.000Z',
    createdBy: 'user-c',
    splitMethod: 'EXACT',
    splits: [
      { userId: 'user-a', amount: 10 },
      { userId: 'user-c', amount: 20 },
    ],
  },
]

const settlements: SettlementItem[] = [
  {
    id: 'settlement-1',
    groupId: 'group-a',
    amount: 20,
    currency: 'GBP',
    paidBy: 'user-b',
    paidTo: 'user-a',
    settlementDate: '2026-07-31',
    notes: '',
    createdAt: '2026-07-31T14:00:00.000Z',
    createdBy: 'user-b',
  },
]

describe('balance utilities', () => {
  it('calculates the expense impact for the current user', () => {
    expect(getExpenseImpactForUser(expenses[0], 'user-a')).toBe(50)
    expect(getExpenseImpactForUser(expenses[1], 'user-a')).toBe(-10)
  })

  it('calculates the settlement impact for the current user', () => {
    expect(getSettlementImpactForUser(settlements[0], 'user-a')).toBe(-20)
    expect(getSettlementImpactForUser(settlements[0], 'user-b')).toBe(20)
  })

  it('builds per-group balances and summary totals', () => {
    const groupBalances = calculateGroupBalances(['group-a', 'group-b'], expenses, settlements, 'user-a')

    expect(groupBalances).toEqual({
      'group-a': 30,
      'group-b': -10,
    })
    expect(summarizeBalances(groupBalances)).toEqual({
      totalOwed: 30,
      totalYouOwe: 10,
    })
  })
})