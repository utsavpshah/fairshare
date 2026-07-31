import { describe, expect, it } from 'vitest'
import { canManageGroup, sortGroupMembers } from '@/services/groups-utils'
import type { GroupMember } from '@/types/domain'

const members: GroupMember[] = [
  {
    groupId: 'group-1',
    userId: 'member-2',
    role: 'MEMBER',
    profile: { id: 'member-2', name: 'Zara', email: 'zara@example.com', avatar: null },
  },
  {
    groupId: 'group-1',
    userId: 'owner-1',
    role: 'OWNER',
    profile: { id: 'owner-1', name: 'Alex', email: 'alex@example.com', avatar: null },
  },
  {
    groupId: 'group-1',
    userId: 'member-1',
    role: 'MEMBER',
    profile: { id: 'member-1', name: 'Mina', email: 'mina@example.com', avatar: null },
  },
]

describe('groups-utils', () => {
  it('treats owners as managers', () => {
    expect(canManageGroup('OWNER')).toBe(true)
    expect(canManageGroup('MEMBER')).toBe(false)
  })

  it('sorts owners first, then current user, then by name', () => {
    const sortedMembers = sortGroupMembers(members, 'member-2')

    expect(sortedMembers.map((member) => member.userId)).toEqual(['owner-1', 'member-2', 'member-1'])
  })
})
