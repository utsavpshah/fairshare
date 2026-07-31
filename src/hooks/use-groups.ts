import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteGroup, inviteMemberByEmail, listGroupsForUser, removeMember, updateGroup, createGroup } from '@/services/groups'
import { useAuth } from '@/hooks/use-auth'

export function useGroups() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['groups', auth.user?.id ?? 'preview'] as const

  const groupsQuery = useQuery({
    queryKey,
    queryFn: () => listGroupsForUser(auth.user?.id),
    enabled: auth.isPreviewMode || Boolean(auth.user?.id),
  })

  const refreshGroups = async () => {
    await queryClient.invalidateQueries({ queryKey })
  }

  return {
    ...groupsQuery,
    createGroup: useMutation({
      mutationFn: createGroup,
      onSuccess: refreshGroups,
    }),
    updateGroup: useMutation({
      mutationFn: ({ groupId, ...input }: { groupId: string; name: string; description: string }) =>
        updateGroup(groupId, input),
      onSuccess: refreshGroups,
    }),
    deleteGroup: useMutation({
      mutationFn: deleteGroup,
      onSuccess: refreshGroups,
    }),
    inviteMember: useMutation({
      mutationFn: ({ groupId, email }: { groupId: string; email: string }) => inviteMemberByEmail(groupId, email),
      onSuccess: refreshGroups,
    }),
    removeMember: useMutation({
      mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) => removeMember(groupId, userId),
      onSuccess: refreshGroups,
    }),
  }
}
