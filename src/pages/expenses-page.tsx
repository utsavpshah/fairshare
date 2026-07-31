import { Funnel } from 'lucide-react'
import { toast } from 'sonner'
import { CreateExpenseCard } from '@/components/expenses/create-expense-card'
import { ExpenseCard } from '@/components/expenses/expense-card'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useExpenses } from '@/hooks/use-expenses'
import { useGroups } from '@/hooks/use-groups'
import { ExpenseValidationError } from '@/services/expense-utils'
import type { ExpenseCategory, SplitMethod } from '@/types/domain'
import { useMemo, useState } from 'react'

const allCategories: Array<ExpenseCategory | 'All'> = [
  'All',
  'Food',
  'Transport',
  'Shopping',
  'Hotel',
  'Fuel',
  'Entertainment',
  'Utilities',
  'Other',
]

export function ExpensesPage() {
  const auth = useAuth()
  const groups = useGroups()
  const expenses = useExpenses()
  const [groupFilter, setGroupFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'All'>('All')

  const groupsById = useMemo(
    () => Object.fromEntries((groups.data ?? []).map((group) => [group.id, group])),
    [groups.data],
  )

  const filteredExpenses = useMemo(() => {
    return (expenses.data ?? []).filter((expense) => {
      const matchesGroup = groupFilter === 'all' || expense.groupId === groupFilter
      const matchesCategory = categoryFilter === 'All' || expense.category === categoryFilter
      return matchesGroup && matchesCategory
    })
  }, [categoryFilter, expenses.data, groupFilter])

  const handleCreateExpense = async (values: {
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
  }) => {
    try {
      await expenses.createExpense.mutateAsync(values)
      toast.success('Expense saved.')
    } catch (error) {
      if (error instanceof ExpenseValidationError) {
        toast.error(error.message)
        return
      }

      toast.error(error instanceof Error ? error.message : 'Could not save the expense.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Expenses and splits</CardTitle>
              <CardDescription>Record shared costs with equal or exact splits across the right people.</CardDescription>
            </div>
            <Badge className="w-fit bg-accent/20 text-accent-foreground">
              {auth.isPreviewMode ? 'Preview data' : 'Live Supabase'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
            Expenses are stored per group, split across selected members, and protected by the same membership RLS boundary as groups.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <CreateExpenseCard
          groups={groups.data ?? []}
          isDisabled={auth.isPreviewMode}
          isSubmitting={expenses.createExpense.isPending}
          onSubmit={handleCreateExpense}
        />

        <Card>
          <CardHeader>
            <CardTitle>Expense filters</CardTitle>
            <CardDescription>Use these to narrow the history while Phase 3 is in place.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-group-filter">Group</label>
              <Select id="expense-group-filter" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
                <option value="all">All groups</option>
                {(groups.data ?? []).map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-card-foreground" htmlFor="expense-category-filter">Category</label>
              <Select id="expense-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as ExpenseCategory | 'All')}>
                {allCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>
            <div className="rounded-3xl bg-secondary/60 p-4 text-sm text-secondary-foreground">
              <div className="flex items-start gap-3">
                <Funnel className="mt-0.5 h-4 w-4 text-primary" />
                <p>
                  The full search filters for person and date range can land in the next pass. This phase already gives you real group-based expense history and category filtering.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {groups.isLoading || expenses.isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading expenses...</CardContent>
        </Card>
      ) : null}

      {expenses.error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Could not load expenses. Run the Phase 3 Supabase migration before testing live expense creation.
          </CardContent>
        </Card>
      ) : null}

      {!groups.isLoading && !expenses.isLoading && !expenses.error && filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-semibold text-card-foreground">No expenses found</p>
            <p className="mt-2 text-sm text-muted-foreground">Add your first expense or broaden the filters.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        {filteredExpenses.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} group={groupsById[expense.groupId]} />
        ))}
      </div>
    </div>
  )
}
