import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useGroups } from '@/hooks/use-groups'
import { createSettlement, listSettlementsForGroups, type CreateSettlementInput } from '@/services/settlements'

export function useSettlements() {
  const groups = useGroups()
  const queryClient = useQueryClient()
  const groupIds = (groups.data ?? []).map((group) => group.id)
  const queryKey = ['settlements', ...groupIds] as const

  const settlementsQuery = useQuery({
    queryKey,
    queryFn: () => listSettlementsForGroups(groupIds),
    enabled: groups.isSuccess,
  })

  return {
    ...settlementsQuery,
    createSettlement: useMutation({
      mutationFn: (input: CreateSettlementInput) => createSettlement(input),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey })
        await queryClient.invalidateQueries({ queryKey: ['expenses'] })
        await queryClient.invalidateQueries({ queryKey: ['groups'] })
      },
    }),
  }
}