import Dexie, { type EntityTable } from 'dexie'

/** Tables that writes may target through the outbox. */
export type SyncTable =
  | 'clients'
  | 'properties'
  | 'services'
  | 'property_services'
  | 'business_settings'
  | 'recurring_schedules'
  | 'jobs'
  | 'estimates'
  | 'estimate_items'
  | 'invoices'
  | 'invoice_items'
  | 'payments'
  | 'expenses'
  | 'photos'
  | 'inventory_items'
  | 'activities'
  | 'tasks'
  | 'mileage_logs'
  | 'vendors_1099'
  | 'email_outbox'

export interface OutboxOp {
  /** Auto-increment — FIFO order. */
  seq: number
  id: string
  table: SyncTable
  kind: 'upsert' | 'update' | 'delete' | 'rpc'
  /**
   * upsert: the full row (client-generated uuid id) — retries are idempotent.
   * update: { id, patch } — partial column update by id (also idempotent).
   * delete: { id }
   * rpc: { fn, args }
   */
  payload: Record<string, unknown>
  attempts: number
  status: 'pending' | 'failed'
  error?: string
  createdAt: string
}

export interface KvEntry {
  key: string
  value: unknown
}

export const db = new Dexie('lawnbizops') as Dexie & {
  outbox: EntityTable<OutboxOp, 'seq'>
  kv: EntityTable<KvEntry, 'key'>
}

db.version(1).stores({
  outbox: '++seq, status',
  kv: 'key',
})
