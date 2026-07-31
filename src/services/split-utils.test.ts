import { describe, expect, it } from 'vitest'
import {
  createEqualSplits,
  sumSplitAmounts,
  validateExactSplitTotal,
} from '@/services/split-utils'

describe('split-utils', () => {
  it('creates balanced equal splits with rounding preserved', () => {
    const splits = createEqualSplits(100, [
      { userId: 'a' },
      { userId: 'b' },
      { userId: 'c' },
    ])

    expect(splits).toEqual([
      { userId: 'a', amount: 33.34 },
      { userId: 'b', amount: 33.33 },
      { userId: 'c', amount: 33.33 },
    ])
    expect(sumSplitAmounts(splits)).toBe(100)
  })

  it('validates exact splits against the expense total', () => {
    expect(
      validateExactSplitTotal(90, [
        { userId: 'a', amount: 30 },
        { userId: 'b', amount: 30 },
        { userId: 'c', amount: 30 },
      ]),
    ).toBe(true)

    expect(
      validateExactSplitTotal(90, [
        { userId: 'a', amount: 40 },
        { userId: 'b', amount: 30 },
        { userId: 'c', amount: 10 },
      ]),
    ).toBe(false)
  })
})
