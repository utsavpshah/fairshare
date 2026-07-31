import type { ExpenseItem, SettlementItem } from '@/types/domain'

function roundAmount(amount: number) {
  return Number(amount.toFixed(2))
}

export function getExpenseImpactForUser(expense: ExpenseItem, userId: string) {
  const paidAmount = expense.paidBy === userId ? expense.amount : 0
  const owedShare = expense.splits.find((split) => split.userId === userId)?.amount ?? 0

  return roundAmount(paidAmount - owedShare)
}

export function getSettlementImpactForUser(settlement: SettlementItem, userId: string) {
  const paidAmount = settlement.paidBy === userId ? settlement.amount : 0
  const receivedAmount = settlement.paidTo === userId ? settlement.amount : 0

  return roundAmount(paidAmount - receivedAmount)
}

export function calculateGroupBalances(
  groupIds: string[],
  expenses: ExpenseItem[],
  settlements: SettlementItem[],
  userId: string,
) {
  return Object.fromEntries(
    groupIds.map((groupId) => {
      const expenseBalance = expenses
        .filter((expense) => expense.groupId === groupId)
        .reduce((total, expense) => total + getExpenseImpactForUser(expense, userId), 0)

      const settlementBalance = settlements
        .filter((settlement) => settlement.groupId === groupId)
        .reduce((total, settlement) => total + getSettlementImpactForUser(settlement, userId), 0)

      return [groupId, roundAmount(expenseBalance + settlementBalance)]
    }),
  ) as Record<string, number>
}

export function summarizeBalances(groupBalances: Record<string, number>) {
  return Object.values(groupBalances).reduce(
    (summary, balance) => {
      if (balance > 0) {
        summary.totalOwed += balance
      }

      if (balance < 0) {
        summary.totalYouOwe += Math.abs(balance)
      }

      return summary
    },
    { totalOwed: 0, totalYouOwe: 0 },
  )
}