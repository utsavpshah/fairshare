import type { GroupMember, GroupRole } from '@/types/domain'

export function canManageGroup(role: GroupRole) {
  return role === 'OWNER'
}

export function sortGroupMembers(members: GroupMember[], currentUserId?: string | null) {
  return [...members].sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === 'OWNER' ? -1 : 1
    }

    if (currentUserId) {
      if (left.userId === currentUserId && right.userId !== currentUserId) {
        return -1
      }

      if (right.userId === currentUserId && left.userId !== currentUserId) {
        return 1
      }
    }

    return left.profile.name.localeCompare(right.profile.name)
  })
}
