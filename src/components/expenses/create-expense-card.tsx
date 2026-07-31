import { zodResolver } from '@hookform/resolvers/zod'
import { ReceiptText } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/use-auth'
import { buildExpenseSplits } from '@/services/expense-utils'
import type { ExpenseCategory, GroupDetail, SplitMethod } from '@/types/domain'

const expenseCategories = [
  'Food',
  'Transport',
  'Shopping',
  'Hotel',
  'Fuel',
  'Entertainment',
  'Utilities',
  'Other',
] as const satisfies readonly ExpenseCategory[]

const expenseSchema = z.object({
  groupId: z.string().min(1, 'Choose a group.'),
  description: z.string().trim().min(2, 'Description must be at least 2 characters.').max(120, 'Description must be 120 characters or less.'),
  amount: z.coerce.number().positive('Amount must be greater than zero.'),
  currency: z.string().trim().length(3, 'Use a 3-letter currency code.'),
  paidBy: z.string().min(1, 'Choose who paid.'),
  category: z.enum(expenseCategories),
  expenseDate: z.string().min(1, 'Choose an expense date.'),
  notes: z.string().trim().max(400, 'Notes must be 400 characters or less.'),
  splitMethod: z.enum(['EQUAL', 'EXACT']),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface CreateExpenseCardProps {
  groups: GroupDetail[]
  isDisabled: boolean
  isSubmitting: boolean
  onSubmit: (values: {
    groupId: string
    description: string
    amount: number
    currency: string
    paidBy: string
    category: ExpenseCategory
    expenseDate: string
    notes: string
    splitMethod: SplitMethod
    splits: { userId: string; amount: number }[]
  }) => Promise<void> | void
}

export function CreateExpenseCard({ groups, isDisabled, isSubmitting, onSubmit }: CreateExpenseCardProps) {
  const auth = useAuth()
  const initialGroup = groups[0]
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      groupId: initialGroup?.id ?? '',
      description: '',
      amount: 0,
      currency: 'GBP',
      paidBy: initialGroup?.members.find((member) => member.userId === auth.user?.id)?.userId ?? initialGroup?.members[0]?.userId ?? '',
      category: 'Food',
      expenseDate: new Date().toISOString().slice(0, 10),
      notes: '',
      splitMethod: 'EQUAL',
    },
  })
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(initialGroup?.members.map((member) => member.userId) ?? [])
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({})

  const watchedGroupId = form.watch('groupId')
  const watchedSplitMethod = form.watch('splitMethod')
  const watchedAmount = form.watch('amount')
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === watchedGroupId) ?? groups[0],
    [groups, watchedGroupId],
  )

  useEffect(() => {
    if (!selectedGroup) {
      return
    }

    const memberIds = selectedGroup.members.map((member) => member.userId)
    setSelectedParticipantIds(memberIds)
    setExactAmounts(
      Object.fromEntries(
        selectedGroup.members.map((member) => [member.userId, '']),
      ),
    )

    const defaultPaidBy = selectedGroup.members.find((member) => member.userId === auth.user?.id)?.userId ?? selectedGroup.members[0]?.userId ?? ''
    form.setValue('paidBy', defaultPaidBy)
  }, [auth.user?.id, form, selectedGroup?.id])

  const toggleParticipant = (userId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    )
  }

  const handleSubmit = async (values: ExpenseFormValues) => {
    const splits = buildExpenseSplits({
      total: values.amount,
      splitMethod: values.splitMethod,
      participants: selectedParticipantIds,
      exactAmounts: Object.fromEntries(
        Object.entries(exactAmounts).map(([userId, amount]) => [userId, Number(amount || 0)]),
      ),
    })

    await onSubmit({
      ...values,
      splits,
      currency: values.currency.toUpperCase(),
    })

    form.reset({
      ...form.getValues(),
      description: '',
      amount: 0,
      notes: '',
      splitMethod: 'EQUAL',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add an expense</CardTitle>
        <CardDescription>Record who paid, what it was for, and exactly how the cost should be shared.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => void handleSubmit(values))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-group">Group</label>
              <Select id="expense-group" disabled={isDisabled} {...form.register('groupId')}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-date">Expense date</label>
              <Input id="expense-date" type="date" disabled={isDisabled} {...form.register('expenseDate')} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="expense-description">Description</label>
            <Input id="expense-description" placeholder="Dinner at the beach shack" disabled={isDisabled} {...form.register('description')} />
            {form.formState.errors.description ? <p className="text-xs text-destructive">{form.formState.errors.description.message}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-amount">Amount</label>
              <Input id="expense-amount" type="number" step="0.01" min="0" disabled={isDisabled} {...form.register('amount')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-currency">Currency</label>
              <Input id="expense-currency" maxLength={3} disabled={isDisabled} {...form.register('currency')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-category">Category</label>
              <Select id="expense-category" disabled={isDisabled} {...form.register('category')}>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-paid-by">Paid by</label>
              <Select id="expense-paid-by" disabled={isDisabled} {...form.register('paidBy')}>
                {selectedGroup?.members.map((member) => (
                  <option key={member.userId} value={member.userId}>{member.profile.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground" htmlFor="expense-notes">Notes</label>
            <Textarea id="expense-notes" placeholder="Optional details, booking ref, or context" disabled={isDisabled} {...form.register('notes')} />
          </div>

          <div className="space-y-3 rounded-3xl border bg-background/50 p-4">
            <div className="grid gap-4 sm:grid-cols-[0.4fr_0.6fr] sm:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-card-foreground" htmlFor="split-method">Split method</label>
                <Select id="split-method" disabled={isDisabled} {...form.register('splitMethod')}>
                  <option value="EQUAL">Equal</option>
                  <option value="EXACT">Exact</option>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Select which members share this expense. {watchedSplitMethod === 'EXACT' ? 'For exact splits, the amounts must add up to the full total.' : 'Equal splits are calculated automatically across selected people.'}
              </p>
            </div>

            <div className="space-y-3">
              {selectedGroup?.members.map((member) => {
                const isSelected = selectedParticipantIds.includes(member.userId)

                return (
                  <div key={member.userId} className="grid gap-3 rounded-2xl bg-secondary/60 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <label className="flex items-center gap-3 text-sm font-medium text-card-foreground">
                      <input
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleParticipant(member.userId)}
                        disabled={isDisabled}
                      />
                      <span>{member.profile.name}</span>
                    </label>

                    {watchedSplitMethod === 'EXACT' ? (
                      <Input
                        className="sm:w-32"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={exactAmounts[member.userId] ?? ''}
                        onChange={(event) =>
                          setExactAmounts((current) => ({
                            ...current,
                            [member.userId]: event.target.value,
                          }))
                        }
                        disabled={isDisabled || !isSelected}
                      />
                    ) : (
                      <p className="text-sm font-semibold text-card-foreground sm:w-32 sm:text-right">
                        {isSelected && watchedAmount > 0
                          ? 'Auto'
                          : 'Not included'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto" disabled={isDisabled || isSubmitting || groups.length === 0}>
            <ReceiptText className="h-4 w-4" />
            Save expense
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
