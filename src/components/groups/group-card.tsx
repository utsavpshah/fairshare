import { zodResolver } from '@hookform/resolvers/zod'
import { Edit3, Trash2, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { canManageGroup, sortGroupMembers } from '@/services/groups-utils'
import type { GroupDetail } from '@/types/domain'

const editGroupSchema = z.object({
  name: z.string().trim().min(2, 'Group name must be at least 2 characters.').max(80, 'Group name must be 80 characters or less.'),
  description: z.string().trim().max(280, 'Description must be 280 characters or less.'),
})

const inviteMemberSchema = z.object({
  email: z.string().trim().email('Enter a valid member email address.'),
})

type EditGroupFormValues = z.infer<typeof editGroupSchema>
type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>

interface GroupCardProps {
  group: GroupDetail
  isDeleting: boolean
  isInviting: boolean
  isSaving: boolean
  isRemovingMember: boolean
  onDelete: (groupId: string) => Promise<void> | void
  onInvite: (groupId: string, email: string) => Promise<void> | void
  onRemoveMember: (groupId: string, userId: string) => Promise<void> | void
  onSave: (groupId: string, values: EditGroupFormValues) => Promise<void> | void
}

export function GroupCard({
  group,
  isDeleting,
  isInviting,
  isRemovingMember,
  isSaving,
  onDelete,
  onInvite,
  onRemoveMember,
  onSave,
}: GroupCardProps) {
  const auth = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const canManage = canManageGroup(group.myRole)
  const sortedMembers = sortGroupMembers(group.members, auth.user?.id)

  const editForm = useForm<EditGroupFormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: group.name,
      description: group.description,
    },
  })

  const inviteForm = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
    },
  })

  const handleSave = async (values: EditGroupFormValues) => {
    await onSave(group.id, values)
    setIsEditing(false)
  }

  const handleInvite = async (values: InviteMemberFormValues) => {
    await onInvite(group.id, values.email)
    inviteForm.reset()
    setIsInviteOpen(false)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{group.name}</CardTitle>
              <Badge>{group.myRole}</Badge>
              <Badge className="bg-muted text-muted-foreground">{group.memberCount} members</Badge>
            </div>
            <CardDescription className="mt-2 max-w-2xl">{group.description || 'No description yet.'}</CardDescription>
          </div>
          {canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditing((value) => !value)}>
                <Edit3 className="h-4 w-4" />
                {isEditing ? 'Close edit' : 'Edit'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsInviteOpen((value) => !value)}>
                <UserPlus className="h-4 w-4" />
                {isInviteOpen ? 'Close invite' : 'Add member'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void onDelete(group.id)} disabled={isDeleting}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {isEditing ? (
          <form className="space-y-4 rounded-3xl border bg-background/50 p-4" onSubmit={editForm.handleSubmit((values) => void handleSave(values))}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor={`group-name-${group.id}`}>
                Group name
              </label>
              <Input id={`group-name-${group.id}`} {...editForm.register('name')} />
              {editForm.formState.errors.name ? <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor={`group-description-${group.id}`}>
                Description
              </label>
              <Textarea id={`group-description-${group.id}`} {...editForm.register('description')} />
              {editForm.formState.errors.description ? <p className="text-xs text-destructive">{editForm.formState.errors.description.message}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSaving}>
                Save changes
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {isInviteOpen ? (
          <form className="space-y-4 rounded-3xl border bg-background/50 p-4" onSubmit={inviteForm.handleSubmit((values) => void handleInvite(values))}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor={`member-email-${group.id}`}>
                Member email
              </label>
              <Input id={`member-email-${group.id}`} type="email" placeholder="friend@example.com" {...inviteForm.register('email')} />
              {inviteForm.formState.errors.email ? <p className="text-xs text-destructive">{inviteForm.formState.errors.email.message}</p> : null}
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isInviting}>
                Add member
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        <div className="space-y-3">
          {sortedMembers.map((member) => {
            const isCurrentUser = member.userId === auth.user?.id

            return (
              <div key={member.userId} className="flex items-center justify-between gap-4 rounded-2xl bg-secondary/60 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-card-foreground">{member.profile.name}</p>
                    <Badge>{member.role}</Badge>
                    {isCurrentUser ? <Badge className="bg-accent/20 text-accent-foreground">You</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{member.profile.email}</p>
                </div>
                {canManage && !isCurrentUser ? (
                  <Button size="icon" variant="ghost" onClick={() => void onRemoveMember(group.id, member.userId)} disabled={isRemovingMember} aria-label={`Remove ${member.profile.name}`}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
