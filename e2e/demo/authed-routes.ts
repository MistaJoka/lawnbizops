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
