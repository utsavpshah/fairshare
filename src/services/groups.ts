import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { GroupDetail, GroupMember, GroupRole } from '@/types/domain'

interface GroupRelation {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
}

interface ProfileRelation {
  id: string
  name: string
  email: string
  avatar: string | null
}

interface MembershipRow {
  group_id: string
  role: GroupRole
  groups: GroupRelation | GroupRelation[] | null
}

interface GroupMemberRow {
  group_id: string
  user_id: string
  role: GroupRole
  profiles: ProfileRelation | ProfileRelation[] | null
}

export interface UpsertGroupInput {
  name: string
  description: string
}

const previewGroups: GroupDetail[] = [
  {
    id: 'preview-goa-trip',
    name: 'Goa Trip',
    description: 'Shared costs for flights, food, and beach taxis.',
    createdAt: '2026-07-20T10:00:00.000Z',
    createdBy: 'preview-owner',
    memberCount: 4,
    balance: 0,
    myRole: 'OWNER',
    members: [
      {
        groupId: 'preview-goa-trip',
        userId: 'preview-owner',
        role: 'OWNER',
        profile: { id: 'preview-owner', name: 'You', email: 'you@example.com', avatar: null },
      },
      {
        groupId: 'preview-goa-trip',
        userId: 'preview-amy',
        role: 'MEMBER',
        profile: { id: 'preview-amy', name: 'Amy', email: 'amy@example.com', avatar: null },
      },
      {
        groupId: 'preview-goa-trip',
        userId: 'preview-sam',
        role: 'MEMBER',
        profile: { id: 'preview-sam', name: 'Sam', email: 'sam@example.com', avatar: null },
      },
      {
        groupId: 'preview-goa-trip',
        userId: 'preview-lee',
        role: 'MEMBER',
        profile: { id: 'preview-lee', name: 'Lee', email: 'lee@example.com', avatar: null },
      },
    ],
  },
]

function requireClient() {
  const client = getSupabaseBrowserClient()

  if (!client) {
    throw new Error('Supabase is not configured for live group management.')
  }

  return client
}

function asSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value
}

function mapGroupMember(row: GroupMemberRow): GroupMember | null {
  const profile = asSingleRelation(row.profiles)

  if (!profile) {
    return null
  }

  return {
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
    },
  }
}

export async function listGroupsForUser(userId?: string | null) {
  const client = getSupabaseBrowserClient()

  if (!client || !userId) {
    return previewGroups
  }

  const { data: memberships, error: membershipsError } = await client
    .from('group_members')
    .select(
      `
        group_id,
        role,
        groups (
          id,
          name,
          description,
          created_by,
          created_at
        )
      `,
    )
    .eq('user_id', userId)

  if (membershipsError) {
    throw membershipsError
  }

  const groupMemberships = ((memberships ?? []) as unknown as MembershipRow[]).filter((row) =>
    Boolean(asSingleRelation(row.groups)),
  )
  const groupIds = groupMemberships.map((row) => row.group_id)

  if (groupIds.length === 0) {
    return []
  }

  const { data: members, error: membersError } = await client
    .from('group_members')
    .select(
      `
        group_id,
        user_id,
        role,
        profiles (
          id,
          name,
          email,
          avatar
        )
      `,
    )
    .in('group_id', groupIds)

  if (membersError) {
    throw membersError
  }

  const membersByGroupId = ((members ?? []) as unknown as GroupMemberRow[]).reduce<Record<string, GroupMember[]>>(
    (accumulator, row) => {
      const member = mapGroupMember(row)

      if (!member) {
        return accumulator
      }

      accumulator[row.group_id] ??= []
      accumulator[row.group_id].push(member)
      return accumulator
    },
    {},
  )

  return groupMemberships
    .map((membership) => {
      const group = asSingleRelation(membership.groups)

      if (!group) {
        return null
      }

      const groupMembers = membersByGroupId[membership.group_id] ?? []

      return {
        id: group.id,
        name: group.name,
        description: group.description ?? '',
        createdAt: group.created_at,
        createdBy: group.created_by,
        memberCount: groupMembers.length,
        balance: 0,
        members: groupMembers,
        myRole: membership.role,
      } satisfies GroupDetail
    })
    .filter((group): group is GroupDetail => Boolean(group))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export async function createGroup(input: UpsertGroupInput) {
  const client = requireClient()
  const { data, error } = await client.rpc('create_group_with_owner', {
    group_name: input.name.trim(),
    group_description: input.description.trim(),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as string
}

export async function updateGroup(groupId: string, input: UpsertGroupInput) {
  const client = requireClient()
  const { error } = await client.rpc('update_group_details', {
    target_group_id: groupId,
    group_name: input.name.trim(),
    group_description: input.description.trim(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteGroup(groupId: string) {
  const client = requireClient()
  const { error } = await client.rpc('delete_group_owned_by_user', {
    target_group_id: groupId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function inviteMemberByEmail(groupId: string, email: string) {
  const client = requireClient()
  const { error } = await client.rpc('add_group_member_by_email', {
    target_group_id: groupId,
    member_email: email.trim().toLowerCase(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function removeMember(groupId: string, memberUserId: string) {
  const client = requireClient()
  const { error } = await client.rpc('remove_group_member', {
    target_group_id: groupId,
    target_user_id: memberUserId,
  })

  if (error) {
    throw new Error(error.message)
  }
}
