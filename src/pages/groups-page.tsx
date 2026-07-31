import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { CreateGroupCard } from '@/components/groups/create-group-card'
import { GroupCard } from '@/components/groups/group-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useGroups } from '@/hooks/use-groups'
import { useAuth } from '@/hooks/use-auth'

export function GroupsPage() {
  const auth = useAuth()
  const groups = useGroups()

  const handleCreateGroup = async (values: { name: string; description: string }) => {
    try {
      await groups.createGroup.mutateAsync(values)
      toast.success('Group created.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create group.')
    }
  }

  const handleSaveGroup = async (groupId: string, values: { name: string; description: string }) => {
    try {
      await groups.updateGroup.mutateAsync({ groupId, ...values })
      toast.success('Group updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the group.')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await groups.deleteGroup.mutateAsync(groupId)
      toast.success('Group deleted.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the group.')
    }
  }

  const handleInviteMember = async (groupId: string, email: string) => {
    try {
      await groups.inviteMember.mutateAsync({ groupId, email })
      toast.success('Member added to the group.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add the member.')
    }
  }

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      await groups.removeMember.mutateAsync({ groupId, userId })
      toast.success('Member removed from the group.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the member.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Groups and members</CardTitle>
              <CardDescription>Create groups, control membership, and keep access aligned with Supabase RLS.</CardDescription>
            </div>
            <Badge className="w-fit bg-accent/20 text-accent-foreground">
              {auth.isPreviewMode ? 'Preview data' : 'Live Supabase'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
            Group owners can edit groups, add members by email, remove members, and delete groups. Members can view the group and will later add expenses and settlements in the next phases.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <CreateGroupCard
          isDisabled={auth.isPreviewMode}
          isSubmitting={groups.createGroup.isPending}
          onSubmit={handleCreateGroup}
        />

        <Card>
          <CardHeader>
            <CardTitle>How members work</CardTitle>
            <CardDescription>Phase 2 uses private Supabase accounts and owner-managed membership.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              'Create each person in Supabase Auth first.',
              'Invite them to a group by the same email address.',
              'Owners manage membership and group details.',
              'All reads are constrained through group membership and RLS.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl bg-secondary/60 px-4 py-4">
                <Users className="mt-0.5 h-4 w-4 text-primary" />
                <p className="text-sm text-card-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {groups.isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading groups...</CardContent>
        </Card>
      ) : null}

      {groups.error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Could not load groups. Run the Phase 2 Supabase migration and make sure the authenticated user belongs to at least one group.
          </CardContent>
        </Card>
      ) : null}

      {!groups.isLoading && !groups.error && groups.data?.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-semibold text-card-foreground">No groups yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Create your first group to start inviting members and organizing expenses.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {groups.data?.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            isDeleting={groups.deleteGroup.isPending}
            isInviting={groups.inviteMember.isPending}
            isRemovingMember={groups.removeMember.isPending}
            isSaving={groups.updateGroup.isPending}
            onDelete={handleDeleteGroup}
            onInvite={handleInviteMember}
            onRemoveMember={handleRemoveMember}
            onSave={handleSaveGroup}
          />
        ))}
      </div>
    </div>
  )
}

