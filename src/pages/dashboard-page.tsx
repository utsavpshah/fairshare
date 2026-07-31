import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useExpenses } from '@/hooks/use-expenses'
import { useGroups } from '@/hooks/use-groups'
import { useSettlements } from '@/hooks/use-settlements'
import { calculateGroupBalances, summarizeBalances } from '@/services/balances'
import type { ActivityItem, GroupSummary } from '@/types/domain'
import { formatCurrency } from '@/utils/currency'

const previewSummaryCards = [
  { label: 'You owe', value: 54.2, tone: 'text-rose-600 dark:text-rose-300' },
  { label: 'You are owed', value: 142.5, tone: 'text-emerald-700 dark:text-emerald-300' },
  { label: 'Active groups', value: 4, tone: 'text-foreground' },
] as const

const previewGroups: GroupSummary[] = [
  {
    id: 'goa-trip',
    name: 'Goa Trip',
    description: 'Flights, beach shacks, and shared cabs for 5 friends.',
    memberCount: 5,
    balance: 84.75,
  },
  {
    id: 'house-expenses',
    name: 'House Expenses',
    description: 'Monthly groceries and utilities for the flat.',
    memberCount: 3,
    balance: -24.1,
  },
]

const previewRecentActivity: ActivityItem[] = [
  { id: '1', label: 'Ava added Sunday brunch', detail: 'Food • £82.40 • split equally', createdAt: '2h ago' },
  { id: '2', label: 'Milan settled up', detail: 'Paid you £20.00', createdAt: 'Yesterday' },
  { id: '3', label: 'New group created', detail: 'Office Lunch has 6 members', createdAt: '2d ago' },
]

const previewCategoryData = [
  { name: 'Food', value: 420 },
  { name: 'Transport', value: 160 },
  { name: 'Hotel', value: 350 },
  { name: 'Other', value: 90 },
]

const previewMonthlyData = [
  { month: 'Apr', amount: 240 },
  { month: 'May', amount: 390 },
  { month: 'Jun', amount: 310 },
  { month: 'Jul', amount: 520 },
]

function formatTooltipValue(value: number | string | readonly (number | string)[] | undefined) {
  const normalizedValue = Array.isArray(value) ? value[0] : value

  return formatCurrency(Number(normalizedValue ?? 0))
}

export function DashboardPage() {
  const auth = useAuth()
  const groups = useGroups()
  const expenses = useExpenses()
  const settlements = useSettlements()

  const liveGroups = groups.data ?? []
  const liveExpenses = expenses.data ?? []
  const liveSettlements = settlements.data ?? []
  const groupBalances = auth.user?.id
    ? calculateGroupBalances(
        liveGroups.map((group) => group.id),
        liveExpenses,
        liveSettlements,
        auth.user.id,
      )
    : {}
  const balanceSummary = summarizeBalances(groupBalances)

  const summaryCards = auth.isPreviewMode
    ? previewSummaryCards
    : [
        { label: 'You owe', value: balanceSummary.totalYouOwe, tone: 'text-rose-600 dark:text-rose-300' },
        { label: 'You are owed', value: balanceSummary.totalOwed, tone: 'text-emerald-700 dark:text-emerald-300' },
        { label: 'Active groups', value: liveGroups.length, tone: 'text-foreground' },
      ]

  const groupsSnapshot: GroupSummary[] = auth.isPreviewMode
    ? previewGroups
    : liveGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        memberCount: group.memberCount,
        balance: groupBalances[group.id] ?? 0,
      }))

  const recentActivity: ActivityItem[] = auth.isPreviewMode
    ? previewRecentActivity
    : [
        ...liveExpenses.map((expense) => ({
          id: `expense-${expense.id}`,
          createdAtRaw: expense.createdAt,
          label: `${groupsSnapshot.find((group) => group.id === expense.groupId)?.name ?? 'Group'} added ${expense.description}`,
          detail: `${expense.category} • ${formatCurrency(expense.amount, expense.currency)} • ${expense.splitMethod.toLowerCase()} split`,
        })),
        ...liveSettlements.map((settlement) => ({
          id: `settlement-${settlement.id}`,
          createdAtRaw: settlement.createdAt,
          label: `${groupsSnapshot.find((group) => group.id === settlement.groupId)?.name ?? 'Group'} recorded a settlement`,
          detail: `${formatCurrency(settlement.amount, settlement.currency)} settled on ${new Date(settlement.settlementDate).toLocaleDateString('en-GB')}`,
        })),
      ]
        .sort((left, right) => new Date(right.createdAtRaw).getTime() - new Date(left.createdAtRaw).getTime())
        .slice(0, 5)
        .map((activity) => ({
          id: activity.id,
          label: activity.label,
          detail: activity.detail,
          createdAt: new Date(activity.createdAtRaw).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          }),
        }))

  const categoryData = auth.isPreviewMode
    ? previewCategoryData
    : Object.values(
        liveExpenses.reduce<Record<string, { name: string; value: number }>>((accumulator, expense) => {
          accumulator[expense.category] ??= { name: expense.category, value: 0 }
          accumulator[expense.category].value += expense.amount
          return accumulator
        }, {}),
      )

  const monthlyData = auth.isPreviewMode
    ? previewMonthlyData
    : Object.values(
        liveExpenses.reduce<Record<string, { month: string; amount: number }>>((accumulator, expense) => {
          const month = new Date(expense.expenseDate).toLocaleDateString('en-GB', {
            month: 'short',
          })
          accumulator[month] ??= { month, amount: 0 }
          accumulator[month].amount += expense.amount
          return accumulator
        }, {}),
      )

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-0">
          <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(15,118,110,0.98),rgba(16,185,129,0.82))] p-6 text-primary-foreground sm:p-8">
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_55%)]" />
            <Badge className="bg-white/15 text-white">{auth.isPreviewMode ? 'Preview mode' : 'Authenticated'}</Badge>
            <h1 className="mt-4 max-w-sm font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              Clear balances before they become awkward.
            </h1>
            <p className="mt-3 max-w-md text-sm text-primary-foreground/85 sm:text-base">
              FairShare now tracks private groups, shared expenses, running balances, and recorded settlements on top of the static React plus Supabase foundation.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account state</CardTitle>
            <CardDescription>Current session and environment status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
              <span className="text-muted-foreground">Signed in user</span>
              <span className="font-semibold text-card-foreground">{auth.user?.name ?? 'Preview visitor'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
              <span className="text-muted-foreground">Supabase config</span>
              <span className="font-semibold text-card-foreground">{auth.isConfigured ? 'Connected' : 'Pending'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3">
              <span className="text-muted-foreground">Deployment model</span>
              <span className="font-semibold text-card-foreground">Static + Supabase</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className={card.tone}>
                {typeof card.value === 'number' && card.label !== 'Active groups'
                  ? formatCurrency(card.value)
                  : card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription>{auth.isPreviewMode ? 'Sample chart wiring for the dashboard phase.' : 'Expense totals grouped by category.'}</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} fill="var(--color-chart-1)" />
                  <Tooltip formatter={(value) => formatTooltipValue(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No category data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly spending</CardTitle>
            <CardDescription>{auth.isPreviewMode ? 'Bar chart scaffold for trend tracking.' : 'Monthly totals from recorded expenses.'}</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => formatTooltipValue(value)} />
                  <Bar dataKey="amount" radius={[10, 10, 0, 0]} fill="var(--color-chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No monthly spending data yet.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>{auth.isPreviewMode ? 'Expense and settlement timeline preview.' : 'Latest expense activity from your groups.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="rounded-2xl bg-secondary/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-card-foreground">{activity.label}</p>
                    <span className="text-xs text-muted-foreground">{activity.createdAt}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{activity.detail}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-secondary/60 px-4 py-6 text-sm text-muted-foreground">No recent activity yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Groups snapshot</CardTitle>
            <CardDescription>{auth.isPreviewMode ? 'Initial group cards until live Supabase queries are added.' : 'Your current groups and member counts.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupsSnapshot.length > 0 ? (
              groupsSnapshot.map((group) => (
                <div key={group.id} className="rounded-2xl border bg-card/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-card-foreground">{group.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge>{group.memberCount} members</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-card-foreground">
                    {group.balance >= 0 ? 'You are owed ' : 'You owe '}
                    {formatCurrency(Math.abs(group.balance))}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border bg-card/70 px-4 py-6 text-sm text-muted-foreground">No groups yet. Create one from the Groups page.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
