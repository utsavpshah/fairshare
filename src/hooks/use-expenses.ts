import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createExpense, listExpensesForGroups, type CreateExpenseInput } from '@/services/expenses'
import { useGroups } from '@/hooks/use-groups'

export function useExpenses() {
  const groups = useGroups()
  const queryClient = useQueryClient()
  const groupIds = (groups.data ?? []).map((group) => group.id)
  const queryKey = ['expenses', ...groupIds] as const

  const expensesQuery = useQuery({
    queryKey,
    queryFn: () => listExpensesForGroups(groupIds),
    enabled: groups.isSuccess,
  })

  return {
    ...expensesQuery,
    createExpense: useMutation({
      mutationFn: (input: CreateExpenseInput) => createExpense(input),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey })
        await queryClient.invalidateQueries({ queryKey: ['groups'] })
      },
    }),
  }
}
