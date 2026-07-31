import { CalendarDays, Receipt, SplitSquareVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExpenseItem, GroupDetail } from '@/types/domain'
import { formatCurrency } from '@/utils/currency'

interface ExpenseCardProps {
  expense: ExpenseItem
  group?: GroupDetail
}

function resolveMemberName(group: GroupDetail | undefined, userId: string) {
  return group?.members.find((member) => member.userId === userId)?.profile.name ?? 'Unknown member'
}

export function ExpenseCard({ expense, group }: ExpenseCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{expense.description}</CardTitle>
              <Badge>{expense.category}</Badge>
              <Badge className="bg-muted text-muted-foreground">{expense.splitMethod}</Badge>
            </div>
            <CardDescription className="mt-2">
              {group?.name ?? 'Group'} • paid by {resolveMemberName(group, expense.paidBy)}
            </CardDescription>
          </div>
          <p className="font-serif text-2xl font-semibold text-card-foreground">
            {formatCurrency(expense.amount, expense.currency)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1.5">
            <CalendarDays className="h-4 w-4" />
            {expense.expenseDate}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1.5">
            <Receipt className="h-4 w-4" />
            Created by {resolveMemberName(group, expense.createdBy)}
          </div>
        </div>

        {expense.notes ? <p className="text-sm text-card-foreground">{expense.notes}</p> : null}

        <div className="space-y-2 rounded-3xl bg-secondary/60 p-4">
          <div className="flex items-center gap-2">
            <SplitSquareVertical className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-card-foreground">Split breakdown</p>
          </div>
          {expense.splits.map((split) => (
            <div key={`${expense.id}-${split.userId}`} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{resolveMemberName(group, split.userId)}</span>
              <span className="font-semibold text-card-foreground">{formatCurrency(split.amount, expense.currency)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
