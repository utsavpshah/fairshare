import { createEqualSplits, validateExactSplitTotal } from '@/services/split-utils'
import type { SplitMethod } from '@/types/domain'

export class ExpenseValidationError extends Error {}

interface BuildExpenseSplitsInput {
  total: number
  splitMethod: SplitMethod
  participants: string[]
  exactAmounts?: Record<string, number>
}

export function buildExpenseSplits({
  total,
  splitMethod,
  participants,
  exactAmounts = {},
}: BuildExpenseSplitsInput) {
  const normalizedParticipants = [...new Set(participants.filter(Boolean))]

  if (normalizedParticipants.length === 0) {
    throw new ExpenseValidationError('Select at least one participant for the expense split.')
  }

  if (total <= 0) {
    throw new ExpenseValidationError('Expense amount must be greater than zero.')
  }

  if (splitMethod === 'EQUAL') {
    return createEqualSplits(
      total,
      normalizedParticipants.map((userId) => ({ userId })),
    )
  }

  const exactSplits = normalizedParticipants.map((userId) => ({
    userId,
    amount: Number(exactAmounts[userId] ?? 0),
  }))

  if (exactSplits.some((split) => split.amount <= 0)) {
    throw new ExpenseValidationError('Every selected participant must have a positive exact amount.')
  }

  if (!validateExactSplitTotal(total, exactSplits)) {
    throw new ExpenseValidationError('Exact split amounts must add up to the full expense total.')
  }

  return exactSplits
}
