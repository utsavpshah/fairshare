export type GroupRole = 'OWNER' | 'MEMBER'

export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Hotel'
  | 'Fuel'
  | 'Entertainment'
  | 'Utilities'
  | 'Other'

export type SplitMethod = 'EQUAL' | 'EXACT'

export interface GroupSummary {
  id: string
  name: string
  description: string
  memberCount: number
  balance: number
}

export interface GroupMemberProfile {
  id: string
  name: string
  email: string
  avatar: string | null
}

export interface GroupMember {
  groupId: string
  userId: string
  role: GroupRole
  profile: GroupMemberProfile
}

export interface GroupDetail extends GroupSummary {
  createdAt: string
  createdBy: string
  members: GroupMember[]
  myRole: GroupRole
}

export interface ExpenseSplit {
  userId: string
  amount: number
}

export interface ExpenseItem {
  id: string
  groupId: string
  description: string
  amount: number
  currency: string
  paidBy: string
  category: ExpenseCategory
  expenseDate: string
  notes: string
  createdAt: string
  createdBy: string
  splitMethod: SplitMethod
  splits: ExpenseSplit[]
}

export interface SettlementItem {
  id: string
  groupId: string
  amount: number
  currency: string
  paidBy: string
  paidTo: string
  settlementDate: string
  notes: string
  createdAt: string
  createdBy: string
}

export interface ActivityItem {
  id: string
  label: string
  detail: string
  createdAt: string
}
