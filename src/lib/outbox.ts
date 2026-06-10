import { db, type OutboxOp, type SyncTable } from './db'
import { supabase } from './supabase'
import { queryClient } from './queryClient'

/**
 * The offline write spine. Every mutation in the app goes through enqueue():
 * it lands in IndexedDB first, then a single FIFO flusher pushes it to
 * Supabase whenever we're online and the app is visible. iOS has no Background
 * Sync, so visibility/online events + app start ARE our sync triggers.
 *
 * Failure classes:
 *  - network/5xx/429 → op stays pending, flush halts (preserves FIFO for
 *    dependent ops), retried with capped backoff on the next trigger.
 *  - 4xx/validation → op marked failed and SKIPPED so one poison op never
 *    blocks "mark job done"; surfaced in the Sync issues screen.
 */

export type EnqueueInput =
  | { table: SyncTable; kind: 'upsert'; payload: Record<string, unknown> }
  | {
      table: SyncTable
      kind: 'update'
      payload: { id: string; patch: Record<string, unknown> }
    }
  | { table: SyncTable; kind: 'delete'; payload: { id: string } }
  | {
      table: SyncTable
      kind: 'rpc'
      payload: { fn: string; args: Record<string, unknown> }
    }

/** Query-key prefixes to invalidate after ops against a table sync. */
const INVALIDATE: Record<SyncTable, string[][]> = {
  clients: [['clients']],
  properties: [['properties'], ['clients']],
  services: [['services']],
  property_services: [['property_services'], ['properties']],
  business_settings: [['business_settings']],
  recurring_schedules: [['recurring_schedules'], ['jobs']],
  jobs: [['jobs']],
  estimates: [['estimates']],
  estimate_items: [['estimates']],
  invoices: [['invoices']],
  invoice_items: [['invoices']],
  payments: [['payments'], ['invoices']],
  photos: [['photos']],
}

export async function enqueue(input: EnqueueInput): Promise<void> {
  await db.outbox.add({
    id: crypto.randomUUID(),
    table: input.table,
    kind: input.kind,
    payload: input.payload,
    attempts: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
  } as OutboxOp)
  void flush()
}

type OpResult = { ok: true } | { ok: false; retryable: boolean; message: string }

async function execute(op: OutboxOp): Promise<OpResult> {
  try {
    if (op.kind === 'rpc') {
      const { fn, args } = op.payload as { fn: string; args: Record<string, unknown> }
      // rpc names/args are dynamic by design; typed wrappers live at call sites
      const { error } = await supabase.rpc(fn as never, args as never)
      if (error) return failureFrom(error.code, error.message)
      return { ok: true }
    }
    if (op.kind === 'update') {
      const { id, patch } = op.payload as { id: string; patch: Record<string, unknown> }
      const { error, status } = await supabase
        .from(op.table)
        .update(patch as never)
        .eq('id', id)
      if (error) return failureFrom(status, error.message)
      return { ok: true }
    }
    if (op.kind === 'delete') {
      const { error, status } = await supabase
        .from(op.table)
        .delete()
        .eq('id', (op.payload as { id: string }).id)
      if (error) return failureFrom(status, error.message)
      return { ok: true }
    }
    const { error, status } = await supabase.from(op.table).upsert(op.payload as never)
    if (error) return failureFrom(status, error.message)
    return { ok: true }
  } catch (e) {
    // fetch threw — no network at all. Always retryable.
    return {
      ok: false,
      retryable: true,
      message: e instanceof Error ? e.message : String(e),
    }
  }
}

function failureFrom(status: number | string | undefined, message: string): OpResult {
  const code = typeof status === 'string' ? parseInt(status, 10) : status
  const retryable =
    code === undefined || Number.isNaN(code) || code >= 500 || code === 429
  return { ok: false, retryable, message }
}

let inFlight: Promise<void> | null = null
let retryTimer: ReturnType<typeof setTimeout> | undefined

export async function flush(): Promise<void> {
  // Wait out any in-progress flush, then run our own pass — ops enqueued
  // mid-flush are never silently skipped.
  if (inFlight) await inFlight
  if (!navigator.onLine) return
  inFlight = drain().finally(() => {
    inFlight = null
  })
  await inFlight
}

async function drain(): Promise<void> {
  const touched = new Set<SyncTable>()
  // Loop until the queue is empty or we halt on a retryable failure, so ops
  // enqueued while we were draining get picked up in the next pass.
  outer: for (;;) {
    const ops = await db.outbox.where('status').equals('pending').sortBy('seq')
    if (ops.length === 0) break
    for (const op of ops) {
      const result = await execute(op)
      if (result.ok) {
        await db.outbox.delete(op.seq)
        touched.add(op.table)
        continue
      }
      if (result.retryable) {
        // Halt to preserve FIFO ordering for dependent ops; retry later.
        await db.outbox.update(op.seq, {
          attempts: op.attempts + 1,
          error: result.message,
        })
        scheduleRetry(op.attempts + 1)
        break outer
      }
      // Poison op: park it, surface it, keep the queue moving.
      await db.outbox.update(op.seq, {
        status: 'failed',
        attempts: op.attempts + 1,
        error: result.message,
      })
    }
  }
  for (const table of touched) {
    for (const key of INVALIDATE[table]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }
}

function scheduleRetry(attempts: number) {
  clearTimeout(retryTimer)
  const delay = Math.min(2 ** attempts * 1000, 60_000)
  retryTimer = setTimeout(() => void flush(), delay)
}

/** Stop pending retry timers (tests, teardown). */
export function stopRetries(): void {
  clearTimeout(retryTimer)
  retryTimer = undefined
}

/** Re-queue a failed op (Sync issues screen → Retry). */
export async function retryFailed(seq: number): Promise<void> {
  await db.outbox.update(seq, { status: 'pending', error: undefined })
  void flush()
}

/** Drop a failed op permanently (Sync issues screen → Discard). */
export async function discardFailed(seq: number): Promise<void> {
  await db.outbox.delete(seq)
}

/** Wire up sync triggers. Call once at app start. */
export function initOutbox(): void {
  window.addEventListener('online', () => void flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush()
  })
  void flush()
}
