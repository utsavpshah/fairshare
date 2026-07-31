const ROUNDING_PRECISION = 100

function roundToCurrency(amount: number) {
  return Math.round(amount * ROUNDING_PRECISION) / ROUNDING_PRECISION
}

export interface EqualSplitInput {
  userId: string
}

export interface ExactSplitInput {
  userId: string
  amount: number
}

export function sumSplitAmounts(splits: ExactSplitInput[]) {
  return roundToCurrency(
    splits.reduce((total, split) => total + roundToCurrency(split.amount), 0),
  )
}

export function validateExactSplitTotal(total: number, splits: ExactSplitInput[]) {
  return roundToCurrency(total) === sumSplitAmounts(splits)
}

export function createEqualSplits(total: number, participants: EqualSplitInput[]) {
  if (participants.length === 0) {
    return []
  }

  const roundedTotal = roundToCurrency(total)
  const baseAmount = Math.floor((roundedTotal / participants.length) * ROUNDING_PRECISION) /
    ROUNDING_PRECISION
  const distributed = roundToCurrency(baseAmount * participants.length)
  let remainder = Math.round((roundedTotal - distributed) * ROUNDING_PRECISION)

  return participants.map((participant) => {
    const extra = remainder > 0 ? 0.01 : 0
    remainder = Math.max(0, remainder - 1)

    return {
      userId: participant.userId,
      amount: roundToCurrency(baseAmount + extra),
    }
  })
}
