import { zodResolver } from '@hookform/resolvers/zod'
import { HandCoins } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { useExpenses } from '@/hooks/use-expenses'
import { useGroups } from '@/hooks/use-groups'
import { useSettlements } from '@/hooks/use-settlements'
import { calculateGroupBalances, summarizeBalances } from '@/services/balances'
import type { GroupDetail } from '@/types/domain'
import { formatCurrency } from '@/utils/currency'

const settlementSchema = z
  .object({
    groupId: z.string().min(1, 'Select a group.'),
    paidBy: z.string().min(1, 'Select who paid.'),
    paidTo: z.string().min(1, 'Select who received the payment.'),
    amount: z.coerce.number().positive('Amount must be greater than zero.'),
    currency: z.string().trim().length(3, 'Currency must be a 3-letter code.'),
    settlementDate: z.string().min(1, 'Choose a settlement date.'),
    notes: z.string().trim().max(280, 'Notes must be 280 characters or less.'),
  })
  .refine((values) => values.paidBy !== values.paidTo, {
    message: 'The payer and receiver must be different members.',
    path: ['paidTo'],
  })

type SettlementFormValues = z.infer<typeof settlementSchema>

function resolveMemberName(groupId: string, userId: string, groupsById: Record<string, GroupDetail | undefined>) {
  return groupsById[groupId]?.members.find((member) => member.userId === userId)?.profile.name ?? 'Unknown member'
}

export function SettlementsPage() {
  const auth = useAuth()
  const groups = useGroups()
  const expenses = useExpenses()
  const settlements = useSettlements()

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      groupId: '',
      paidBy: '',
      paidTo: '',
      amount: 0,
      currency: 'GBP',
      settlementDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  })

  const selectedGroupId = form.watch('groupId')
  const liveGroups = groups.data ?? []
  const groupsById = useMemo(
    () => Object.fromEntries(liveGroups.map((group) => [group.id, group])),
    [liveGroups],
  )
  const selectedGroup = selectedGroupId ? groupsById[selectedGroupId] : undefined
  const memberOptions = selectedGroup?.members ?? []
  const groupBalances = auth.user?.id
    ? calculateGroupBalances(
        liveGroups.map((group) => group.id),
        expenses.data ?? [],
        settlements.data ?? [],
        auth.user.id,
      )
    : {}
  const balanceSummary = summarizeBalances(groupBalances)

  const handleSubmit = async (values: SettlementFormValues) => {
    try {
      await settlements.createSettlement.mutateAsync(values)
      toast.success('Settlement saved.')
      form.reset({
        groupId: values.groupId,
        paidBy: '',
        paidTo: '',
        amount: 0,
        currency: values.currency.toUpperCase(),
        settlementDate: values.settlementDate,
        notes: '',
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the settlement.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Balances and settlements</CardTitle>
              <CardDescription>Track what is still owed and record payments that settle up a group.</CardDescription>
            </div>
            <Badge className="w-fit bg-accent/20 text-accent-foreground">
              {auth.isPreviewMode ? 'Preview data' : 'Live Supabase'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
            Settlements reduce outstanding balances without changing the original expense history.
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>You owe</CardDescription>
            <CardTitle className="text-rose-600 dark:text-rose-300">{formatCurrency(balanceSummary.totalYouOwe)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>You are owed</CardDescription>
            <CardTitle className="text-emerald-700 dark:text-emerald-300">{formatCurrency(balanceSummary.totalOwed)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recorded settlements</CardDescription>
            <CardTitle>{settlements.data?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Record a settlement</CardTitle>
            <CardDescription>Choose who paid, who received it, and the amount settled.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => void handleSubmit(values))}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground" htmlFor="settlement-group">Group</label>
                <Select id="settlement-group" value={selectedGroupId} onChange={(event) => {
                  form.setValue('groupId', event.target.value, { shouldValidate: true })
                  form.setValue('paidBy', '')
                  form.setValue('paidTo', '')
                }}>
                  <option value="">Select a group</option>
                  {liveGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </Select>
                {form.formState.errors.groupId ? <p className="text-xs text-destructive">{form.formState.errors.groupId.message}</p> : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground" htmlFor="settlement-paid-by">Paid by</label>
                  <Select id="settlement-paid-by" value={form.watch('paidBy')} onChange={(event) => form.setValue('paidBy', event.target.value, { shouldValidate: true })} disabled={!selectedGroup}>
                    <option value="">Select member</option>
                    {memberOptions.map((member) => (
                      <option key={member.userId} value={member.userId}>{member.profile.name}</option>
                    ))}
                  </Select>
                  {form.formState.errors.paidBy ? <p className="text-xs text-destructive">{form.formState.errors.paidBy.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground" htmlFor="settlement-paid-to">Paid to</label>
                  <Select id="settlement-paid-to" value={form.watch('paidTo')} onChange={(event) => form.setValue('paidTo', event.target.value, { shouldValidate: true })} disabled={!selectedGroup}>
                    <option value="">Select member</option>
                    {memberOptions.map((member) => (
                      <option key={member.userId} value={member.userId}>{member.profile.name}</option>
                    ))}
                  </Select>
                  {form.formState.errors.paidTo ? <p className="text-xs text-destructive">{form.formState.errors.paidTo.message}</p> : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground" htmlFor="settlement-amount">Amount</label>
                  <Input id="settlement-amount" type="number" step="0.01" min="0.01" {...form.register('amount', { valueAsNumber: true })} />
                  {form.formState.errors.amount ? <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground" htmlFor="settlement-currency">Currency</label>
                  <Input id="settlement-currency" maxLength={3} {...form.register('currency')} />
                  {form.formState.errors.currency ? <p className="text-xs text-destructive">{form.formState.errors.currency.message}</p> : null}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground" htmlFor="settlement-date">Date</label>
                  <Input id="settlement-date" type="date" {...form.register('settlementDate')} />
                  {form.formState.errors.settlementDate ? <p className="text-xs text-destructive">{form.formState.errors.settlementDate.message}</p> : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground" htmlFor="settlement-notes">Notes</label>
                <Textarea id="settlement-notes" placeholder="Optional note" {...form.register('notes')} />
                {form.formState.errors.notes ? <p className="text-xs text-destructive">{form.formState.errors.notes.message}</p> : null}
              </div>

              <Button type="submit" disabled={auth.isPreviewMode || settlements.createSettlement.isPending || liveGroups.length === 0}>
                Save settlement
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding by group</CardTitle>
            <CardDescription>Positive means you are owed. Negative means you still owe others.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveGroups.length > 0 ? (
              liveGroups.map((group) => {
                const balance = groupBalances[group.id] ?? 0

                return (
                  <div key={group.id} className="rounded-2xl border bg-card/70 px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-card-foreground">{group.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                      </div>
                      <Badge>{group.memberCount} members</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-card-foreground">
                      {balance >= 0 ? 'You are owed ' : 'You owe '}
                      {formatCurrency(Math.abs(balance))}
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl border bg-card/70 px-4 py-6 text-sm text-muted-foreground">No groups yet. Create a group before recording settlements.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {groups.isLoading || expenses.isLoading || settlements.isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading balances...</CardContent>
        </Card>
      ) : null}

      {settlements.error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">Could not load settlements. Run the Phase 4 Supabase migration before testing live settlement recording.</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Settlement history</CardTitle>
          <CardDescription>Payments logged between members after expenses are added.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(settlements.data ?? []).length > 0 ? (
            (settlements.data ?? []).map((settlement) => (
              <div key={settlement.id} className="rounded-2xl bg-secondary/60 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <HandCoins className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-card-foreground">
                        {resolveMemberName(settlement.groupId, settlement.paidBy, groupsById)} paid {resolveMemberName(settlement.groupId, settlement.paidTo, groupsById)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{groupsById[settlement.groupId]?.name ?? 'Group'} • {settlement.settlementDate}</p>
                    {settlement.notes ? <p className="mt-2 text-sm text-card-foreground">{settlement.notes}</p> : null}
                  </div>
                  <p className="font-serif text-2xl font-semibold text-card-foreground">{formatCurrency(settlement.amount, settlement.currency)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-secondary/60 px-4 py-6 text-sm text-muted-foreground">No settlements recorded yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}