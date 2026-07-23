/**
 * Time-on-site math — the field half of job costing. Duration comes from the
 * started_at/completed_at stamps setJobStatus writes; labor cost prices it at
 * the org's hourly rate (business_settings.labor_rate_cents_per_hour, 0 = off).
 * Mirrors the SQL in job_profitability (0047) — keep the two in sync.
 */

/** Whole minutes on site, or null when the window is missing or negative. */
export function timeOnSiteMinutes(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): number | null {
  if (!startedAt || !completedAt) return null
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (Number.isNaN(ms) || ms < 0) return null
  return Math.round(ms / 60_000)
}

/** Labor cost in integer cents: minutes at the hourly rate, rounded at the edge. */
export function laborCostCents(minutes: number | null, rateCentsPerHour: number): number {
  if (!minutes || minutes <= 0 || rateCentsPerHour <= 0) return 0
  return Math.round((minutes * rateCentsPerHour) / 60)
}

/** "1h 45m" | "1h" | "45m" for the job-detail chip. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}
