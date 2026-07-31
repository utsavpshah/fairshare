import { getSupabaseBrowserClient } from '@/lib/supabase'
import type { SettlementItem } from '@/types/domain'

interface SettlementRow {
  id: string
  group_id: string
  amount: number
  currency: string
  paid_by: string
  paid_to: string
  settlement_date: string
  notes: string | null
  created_at: string
  created_by: string
}

export interface CreateSettlementInput {
  groupId: string
  amount: number
  currency: string
  paidBy: string
  paidTo: string
  settlementDate: string
  notes: string
}

const previewSettlements: SettlementItem[] = [
  {
    id: 'preview-settlement-1',
    groupId: 'preview-goa-trip',
    amount: 20,
    currency: 'GBP',
    paidBy: 'preview-amy',
    paidTo: 'preview-owner',
    settlementDate: '2026-07-25',
    notes: 'Settled dinner share',
    createdAt: '2026-07-25T11:00:00.000Z',
    createdBy: 'preview-amy',
  },
]

function requireClient() {
  const client = getSupabaseBrowserClient()

  if (!client) {
    throw new Error('Supabase is not configured for live settlements.')
  }

  return client
}

export async function listSettlementsForGroups(groupIds: string[]) {
  const client = getSupabaseBrowserClient()

  if (!client) {
    return previewSettlements.filter((settlement) => groupIds.length === 0 || groupIds.includes(settlement.groupId))
  }

  if (groupIds.length === 0) {
    return []
  }

  const { data, error } = await client
    .from('settlements')
    .select(
      `
        id,
        group_id,
        amount,
        currency,
        paid_by,
        paid_to,
        settlement_date,
        notes,
        created_at,
        created_by
      `,
    )
    .in('group_id', groupIds)
    .order('settlement_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as SettlementRow[]).map((settlement) => ({
    id: settlement.id,
    groupId: settlement.group_id,
    amount: Number(settlement.amount),
    currency: settlement.currency,
    paidBy: settlement.paid_by,
    paidTo: settlement.paid_to,
    settlementDate: settlement.settlement_date,
    notes: settlement.notes ?? '',
    createdAt: settlement.created_at,
    createdBy: settlement.created_by,
  }))
}

export async function createSettlement(input: CreateSettlementInput) {
  const client = requireClient()
  const { data, error } = await client.rpc('create_settlement', {
    target_group_id: input.groupId,
    settlement_amount: input.amount,
    settlement_currency: input.currency.trim().toUpperCase(),
    settlement_paid_by: input.paidBy,
    settlement_paid_to: input.paidTo,
    target_settlement_date: input.settlementDate,
    settlement_notes: input.notes.trim(),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as string
}