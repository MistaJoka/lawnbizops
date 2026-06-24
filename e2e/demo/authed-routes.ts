// Every param-free authed route, with the marker that proves it painted its
// expected content (a section `heading`, or `text` for the context-guard "new"
// routes that render a "pick X first" message when nothing is selected).
//
// Shared by the demo render smoke (routes.spec.ts) and the demo a11y scan
// (a11y.spec.ts) so the route list stays in one place. Detail routes ($id
// params) are covered by click-through in routes.spec.ts, not listed here.
export type AuthedRoute = { path: string; heading?: RegExp; text?: RegExp }

export const AUTHED_ROUTES: AuthedRoute[] = [
  { path: '/', heading: /^today$/i },
  { path: '/dashboard', heading: /^dashboard$/i },
  { path: '/board', heading: /^quote$/i },
  { path: '/pipeline', heading: /pipeline/i },
  { path: '/schedule', heading: /schedule/i },
  { path: '/clients', heading: /clients/i },
  { path: '/clients/new', heading: /new client/i },
  { path: '/clients/import', heading: /import/i },
  { path: '/jobs/new', heading: /new job/i },
  { path: '/estimates/new', heading: /estimate/i },
  { path: '/invoices/new', heading: /invoice/i },
  { path: '/money', heading: /money/i },
  { path: '/money/reports', heading: /report/i },
  { path: '/expenses/new', heading: /expense/i },
  { path: '/inventory', heading: /inventory/i },
  { path: '/properties/new', text: /pick a client first/i }, // guard: needs a client
  { path: '/schedules/new', text: /pick a property first/i }, // guard: needs a property
  { path: '/tax', heading: /tax/i },
  { path: '/tax/mileage/new', heading: /log a trip/i },
  { path: '/tax/payees/new', heading: /payee|1099/i },
  { path: '/tools', heading: /tools/i },
  { path: '/tools/grade', heading: /grade/i },
  { path: '/tools/mulch', heading: /mulch/i },
  { path: '/settings', heading: /settings/i },
  { path: '/settings/profile', heading: /profile|business/i },
  { path: '/settings/services', heading: /service catalog/i },
  { path: '/settings/preferences', heading: /preferences/i },
  { path: '/settings/payments', heading: /payment/i },
  { path: '/settings/tax', heading: /tax/i },
  { path: '/settings/automations', heading: /automation/i },
  { path: '/settings/export', heading: /export/i },
  { path: '/settings/sync', heading: /sync/i },
]

// Detail/edit routes ($id params), resolved with canonical ids from the demo
// seed fixture (src/lib/demo.ts). These are the data-dense screens where money
// and status render — the highest-value targets for render + a11y regression.
// If the seed ids change, these fail loudly and the constants get updated.
export type DetailRoute = { path: string; label: string }

export const DETAIL_ROUTES: DetailRoute[] = [
  { path: '/clients/cccccccc-0000-4000-a000-000000000001', label: 'client detail' },
  { path: '/clients/cccccccc-0000-4000-a000-000000000001/edit', label: 'client edit' },
  { path: '/properties/bbbbbbbb-0000-4000-a000-000000000001', label: 'property detail' },
  {
    path: '/properties/bbbbbbbb-0000-4000-a000-000000000001/edit',
    label: 'property edit',
  },
  { path: '/jobs/dddddddd-0000-4000-a000-000000000001', label: 'job detail' },
  { path: '/invoices/ffffffff-0000-4000-a000-000000000001', label: 'invoice detail' },
  { path: '/estimates/eeeeeeee-0000-4000-a000-000000000001', label: 'estimate detail' },
  { path: '/expenses/a1100000-0000-4000-a000-000000000000', label: 'expense detail' },
  {
    path: '/schedules/66666666-0000-4000-a000-000000000000/edit',
    label: 'schedule edit',
  },
]
