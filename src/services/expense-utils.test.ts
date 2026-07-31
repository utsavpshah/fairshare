import { describe, expect, it } from 'vitest'
import { buildExpenseSplits, ExpenseValidationError } from '@/services/expense-utils'

describe('expense-utils', () => {
  it('builds equal splits across selected participants', () => {
    expect(
      buildExpenseSplits({
        total: 75,
        splitMethod: 'EQUAL',
        participants: ['a', 'b', 'c'],
      }),
    ).toEqual([
      { userId: 'a', amount: 25 },
      { userId: 'b', amount: 25 },
      { userId: 'c', amount: 25 },
    ])
  })

  it('rejects exact splits when the sum mismatches the total', () => {
    expect(() =>
      buildExpenseSplits({
        total: 100,
        splitMethod: 'EXACT',
        participants: ['a', 'b'],
        exactAmounts: { a: 30, b: 50 },
      }),
    ).toThrow(ExpenseValidationError)
  })

  it('builds valid exact splits', () => {
    expect(
      buildExpenseSplits({
        total: 100,
        splitMethod: 'EXACT',
        participants: ['a', 'b'],
        exactAmounts: { a: 40, b: 60 },
      }),
    ).toEqual([
      { userId: 'a', amount: 40 },
      { userId: 'b', amount: 60 },
    ])
  })
})
