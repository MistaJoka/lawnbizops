// =============================================================================
// No-backend DEMO mode. A fake Supabase client that serves the local seed data
// entirely in memory, so authed screens render with realistic data without any
// network/Docker/egress — for previewing UI in a sandbox and for demos.
//
// Activated ONLY in a DEV build with VITE_DEMO=1 (see demoModeEnabled). A
// production build (DEV=false) can never turn this on even if the flag leaks,
// and because there are NO module-level side effects, the whole dataset
// tree-shakes out of prod bundles instead of shipping publicly.
//
// Data mirrors supabase/seed.sql (the canonical "Apex Lawn & Landscape" demo
// business). Dates are anchored to the device's "today" so the Today/Schedule
// screens line up whenever it runs.
// =============================================================================
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { localToday } from './format'
import { addDaysISO } from './dates'

type EnvLike = { DEV?: boolean; VITE_DEMO?: string }

export function demoModeEnabled(env: EnvLike = import.meta.env as EnvLike): boolean {
  // Gate on DEV so a production bundle never ships the fake backend.
  return Boolean(env.DEV) && env.VITE_DEMO === '1'
}

const ORG = 'a0000000-0000-4000-a000-000000000001'
const USER = 'b0000000-0000-4000-a000-000000000002'

type Row = Record<string, unknown>
type DemoData = { tables: Record<string, Row[]>; dashboard: Row; session: Row }

// Built lazily + memoized — NO module-level side effects, so when demo mode is
// statically off (prod), this whole module tree-shakes away.
let cached: DemoData | null = null

function buildData(): DemoData {
  if (cached) return cached

  const today = localToday()
  const day = (offset: number) => addDaysISO(today, offset)
  const ts = (offsetDays: number, hour = 9) =>
    new Date(
      new Date(`${day(offsetDays)}T00:00:00`).getTime() + hour * 3_600_000,
    ).toISOString()
  const base = {
    org_id: ORG,
    user_id: USER,
    updated_at: ts(0),
    archived_at: null as string | null,
  }

  const SERVICES: Row[] = (
    [
      [
        '55555555-0000-4000-a000-000000000001',
        'Lawn Maintenance',
        'Mow, edge, blow — per visit',
        6500,
        'flat',
      ],
      [
        '55555555-0000-4000-a000-000000000002',
        'Hedge & Shrub Trim',
        'Shape hedges and shrubs',
        9500,
        'flat',
      ],
      [
        '55555555-0000-4000-a000-000000000003',
        'Palm Trimming',
        'Trim and skin palms',
        14000,
        'flat',
      ],
      [
        '55555555-0000-4000-a000-000000000004',
        'Mulch Installation',
        'Delivered + spread, per cubic yard',
        8500,
        'yard',
      ],
      [
        '55555555-0000-4000-a000-000000000006',
        'Pressure Washing',
        'Driveway / patio / roof',
        22000,
        'flat',
      ],
      [
        '55555555-0000-4000-a000-000000000007',
        'Paver Driveway',
        'Demo, base, paver install',
        450000,
        'flat',
      ],
    ] as const
  ).map(([id, name, description, default_price_cents, unit]) => ({
    ...base,
    id,
    name,
    description,
    default_price_cents,
    unit,
    created_at: ts(-118),
  }))

  const CLIENTS: Row[] = (
    [
      [
        'cccccccc-0000-4000-a000-000000000001',
        'Bob Castellano',
        '(954) 555-0188',
        'bobcastellano@gmail.com',
        'active',
        'Weekly mow. Pays on time, cash.',
        -110,
      ],
      [
        'cccccccc-0000-4000-a000-000000000002',
        'Margaret Whitfield',
        '(954) 555-0151',
        '',
        'active',
        'Elderly — ring bell twice. Slow to pay, do NOT pressure.',
        -108,
      ],
      [
        'cccccccc-0000-4000-a000-000000000003',
        'Delgado Family',
        '(754) 555-0133',
        'rdelgado@outlook.com',
        'active',
        'Biweekly. Two dogs in back yard.',
        -100,
      ],
      [
        'cccccccc-0000-4000-a000-000000000004',
        'Carlos Mendez',
        '(786) 555-0177',
        'carlosm@gmail.com',
        'active',
        'Biweekly, pays Zelle same day.',
        -95,
      ],
      [
        'cccccccc-0000-4000-a000-000000000005',
        'Frank DiMarco',
        '(954) 555-0166',
        'fdimarco@gmail.com',
        'active',
        'Paver driveway in progress. Deposit paid.',
        -40,
      ],
      [
        'cccccccc-0000-4000-a000-000000000006',
        'James Okafor',
        '(954) 555-0199',
        'jokafor@gmail.com',
        'lead',
        'Referral from Bob. Wants paver driveway quote.',
        -6,
      ],
      [
        'cccccccc-0000-4000-a000-000000000007',
        'Gloria Sanchez',
        '(786) 555-0124',
        'gsanchez@gmail.com',
        'quoted',
        'Quoted sod + mulch refresh, deciding.',
        -12,
      ],
      [
        'cccccccc-0000-4000-a000-000000000008',
        'Patricia Nguyen',
        '(954) 555-0145',
        'pnguyen@gmail.com',
        'active',
        'Accepted mulch + hedge estimate.',
        -20,
      ],
      [
        'cccccccc-0000-4000-a000-000000000009',
        'Henry Adler',
        '(954) 555-0112',
        '',
        'dormant',
        'One-time cleanup last fall. Win back?',
        -240,
      ],
      [
        'cccccccc-0000-4000-a000-000000000010',
        'Sunrise Villas HOA',
        '(954) 555-0101',
        'linda@sunrisevillas.org',
        'active',
        'Contact: Linda Park. Big common-area mow, gate code.',
        -90,
      ],
    ] as const
  ).map(([id, name, phone, email, stage, notes, off]) => ({
    ...base,
    id,
    name,
    phone,
    email,
    stage,
    notes,
    created_at: ts(off),
  }))

  const PROPERTIES: Row[] = (
    [
      [
        'bbbbbbbb-0000-4000-a000-000000000001',
        'cccccccc-0000-4000-a000-000000000001',
        'Home',
        '3421 NW 85th Ave',
        'Coral Springs',
        '33065',
        26.271,
        -80.2706,
        '4827',
        'Friendly dog, stays inside.',
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000002',
        'cccccccc-0000-4000-a000-000000000002',
        'Home',
        '10250 Westview Dr',
        'Coral Springs',
        '33076',
        26.2855,
        -80.2588,
        '',
        'Ring bell twice.',
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000003',
        'cccccccc-0000-4000-a000-000000000003',
        'Home',
        '6740 NW 41st St',
        'Coconut Creek',
        '33073',
        26.252,
        -80.179,
        '',
        'Two dogs — text before arriving.',
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000004',
        'cccccccc-0000-4000-a000-000000000004',
        'Home',
        '4815 Wiles Rd',
        'Coconut Creek',
        '33073',
        26.296,
        -80.186,
        '',
        '',
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000005',
        'cccccccc-0000-4000-a000-000000000005',
        'Driveway job',
        '7820 Holmberg Rd',
        'Parkland',
        '33067',
        26.31,
        -80.237,
        '',
        '650 sq ft paver driveway.',
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000006',
        'cccccccc-0000-4000-a000-000000000006',
        'Home',
        '12100 NW 70th Ct',
        'Parkland',
        '33076',
        26.305,
        -80.248,
        '',
        'Quote site visit.',
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000008',
        'cccccccc-0000-4000-a000-000000000008',
        'Home',
        '9100 W Atlantic Blvd',
        'Coral Springs',
        '33071',
        26.235,
        -80.256,
        '',
        '',
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000010',
        'cccccccc-0000-4000-a000-000000000010',
        'Common area',
        '3800 Inverrary Blvd',
        'Lauderhill',
        '33319',
        26.17,
        -80.22,
        '7421',
        'Gate code 7421. Mow front + median.',
      ],
    ] as const
  ).map(
    ([id, client_id, label, address_line1, city, zip, lat, lng, gate_code, notes]) => ({
      ...base,
      id,
      client_id,
      label,
      address_line1,
      address_line2: '',
      city,
      state: 'FL',
      zip,
      lat,
      lng,
      gate_code,
      notes,
      created_at: ts(-100),
    }),
  )

  const clientById = new Map(CLIENTS.map((c) => [c.id as string, c]))
  const propertyById = new Map(PROPERTIES.map((p) => [p.id as string, p]))

  const JOB_ROWS: [
    string,
    string,
    string,
    string,
    number,
    string,
    string,
    number,
    number | null,
  ][] = [
    [
      'dddddddd-0000-4000-a000-000000000001',
      'bbbbbbbb-0000-4000-a000-000000000001',
      '55555555-0000-4000-a000-000000000001',
      'Weekly mow',
      0,
      '08:00',
      'done',
      6500,
      0,
    ],
    [
      'dddddddd-0000-4000-a000-000000000002',
      'bbbbbbbb-0000-4000-a000-000000000003',
      '55555555-0000-4000-a000-000000000001',
      'Biweekly mow',
      0,
      '09:00',
      'done',
      6000,
      0,
    ],
    [
      'dddddddd-0000-4000-a000-000000000003',
      'bbbbbbbb-0000-4000-a000-000000000010',
      '55555555-0000-4000-a000-000000000001',
      'HOA common mow',
      0,
      '10:30',
      'in_progress',
      12000,
      null,
    ],
    [
      'dddddddd-0000-4000-a000-000000000004',
      'bbbbbbbb-0000-4000-a000-000000000004',
      '55555555-0000-4000-a000-000000000001',
      'Biweekly mow',
      0,
      '13:00',
      'scheduled',
      6500,
      null,
    ],
    [
      'dddddddd-0000-4000-a000-000000000005',
      'bbbbbbbb-0000-4000-a000-000000000005',
      '55555555-0000-4000-a000-000000000007',
      'Paver layout walk',
      0,
      '15:00',
      'scheduled',
      0,
      null,
    ],
    [
      'dddddddd-0000-4000-a000-000000000006',
      'bbbbbbbb-0000-4000-a000-000000000001',
      '55555555-0000-4000-a000-000000000001',
      'Weekly mow',
      7,
      '08:00',
      'scheduled',
      6500,
      null,
    ],
    [
      'dddddddd-0000-4000-a000-000000000007',
      'bbbbbbbb-0000-4000-a000-000000000002',
      '55555555-0000-4000-a000-000000000002',
      'Hedge trim',
      2,
      '09:30',
      'scheduled',
      9500,
      null,
    ],
    [
      'dddddddd-0000-4000-a000-000000000008',
      'bbbbbbbb-0000-4000-a000-000000000008',
      '55555555-0000-4000-a000-000000000004',
      'Mulch install — 8 yd',
      3,
      '08:00',
      'scheduled',
      68000,
      null,
    ],
    [
      'dddddddd-0000-4000-a000-000000000010',
      'bbbbbbbb-0000-4000-a000-000000000004',
      '55555555-0000-4000-a000-000000000001',
      'Biweekly mow',
      -18,
      '09:00',
      'invoiced',
      6500,
      -18,
    ],
  ]

  const JOBS: Row[] = JOB_ROWS.map(
    ([
      id,
      property_id,
      service_id,
      title,
      off,
      start_time,
      status,
      price_cents,
      doneOff,
    ]) => {
      const prop = propertyById.get(property_id)
      const client = prop ? clientById.get(prop.client_id as string) : undefined
      return {
        ...base,
        id,
        property_id,
        service_id,
        title,
        scheduled_date: day(off),
        start_time,
        status,
        price_cents,
        completed_at: doneOff == null ? null : ts(doneOff),
        created_at: ts(off - 1),
        property: prop
          ? {
              id: prop.id,
              label: prop.label,
              address_line1: prop.address_line1,
              city: prop.city,
              lat: prop.lat,
              lng: prop.lng,
              gate_code: prop.gate_code,
              notes: prop.notes,
              client: client
                ? { id: client.id, name: client.name, phone: client.phone }
                : null,
            }
          : null,
      }
    },
  )

  const ESTIMATES: Row[] = (
    [
      [
        'eeeeeeee-0000-4000-a000-000000000001',
        'cccccccc-0000-4000-a000-000000000006',
        'bbbbbbbb-0000-4000-a000-000000000006',
        'sent',
        -4,
        25,
        'EST-0023',
        'Paver driveway, 650 sq ft.',
      ],
      [
        'eeeeeeee-0000-4000-a000-000000000002',
        'cccccccc-0000-4000-a000-000000000007',
        'bbbbbbbb-0000-4000-a000-000000000006',
        'sent',
        -10,
        18,
        'EST-0024',
        'Sod replacement + mulch refresh.',
      ],
      [
        'eeeeeeee-0000-4000-a000-000000000003',
        'cccccccc-0000-4000-a000-000000000008',
        'bbbbbbbb-0000-4000-a000-000000000008',
        'accepted',
        -18,
        -4,
        'EST-0025',
        'Accepted — job scheduled.',
      ],
      [
        'eeeeeeee-0000-4000-a000-000000000005',
        'cccccccc-0000-4000-a000-000000000002',
        'bbbbbbbb-0000-4000-a000-000000000002',
        'draft',
        -1,
        29,
        null,
        'Draft — spring cleanup add-on.',
      ],
    ] as const
  ).map(([id, client_id, property_id, status, issuedOff, validOff, number, notes]) => ({
    ...base,
    id,
    client_id,
    property_id,
    status,
    number,
    issued_at: day(issuedOff),
    valid_until: day(validOff),
    notes,
    created_at: ts(issuedOff),
  }))

  const ESTIMATE_ITEMS: Row[] = (
    [
      [
        'eeeeeeee-0000-4000-a000-000000000001',
        'Paver driveway — demo, base, install (650 sq ft)',
        1,
        520000,
        0,
      ],
      [
        'eeeeeeee-0000-4000-a000-000000000002',
        'Sod installation (2,000 sq ft)',
        2000,
        350,
        0,
      ],
      ['eeeeeeee-0000-4000-a000-000000000002', 'Mulch refresh (10 cu yd)', 10, 8500, 1],
      [
        'eeeeeeee-0000-4000-a000-000000000003',
        'Mulch installation (8 cu yd)',
        8,
        8500,
        0,
      ],
      ['eeeeeeee-0000-4000-a000-000000000003', 'Hedge & shrub trim', 1, 9500, 1],
      [
        'eeeeeeee-0000-4000-a000-000000000005',
        'Spring cleanup — beds + haul',
        1,
        18000,
        0,
      ],
    ] as const
  ).map(([estimate_id, description, quantity, unit_price_cents, sort_order], i) => ({
    ...base,
    id: `e1100000-0000-4000-a000-00000000000${i}`,
    estimate_id,
    description,
    quantity,
    unit_price_cents,
    sort_order,
  }))

  const INVOICES: Row[] = (
    [
      [
        'ffffffff-0000-4000-a000-000000000001',
        'cccccccc-0000-4000-a000-000000000001',
        'sent',
        -5,
        10,
        null,
        'INV-1042',
        'June maintenance.',
      ],
      [
        'ffffffff-0000-4000-a000-000000000002',
        'cccccccc-0000-4000-a000-000000000003',
        'sent',
        -38,
        -8,
        null,
        'INV-1040',
        'May maintenance.',
      ],
      [
        'ffffffff-0000-4000-a000-000000000003',
        'cccccccc-0000-4000-a000-000000000002',
        'sent',
        -140,
        -110,
        -12,
        'INV-1031',
        'Palm + hedge trim. Gentle nudge sent.',
      ],
      [
        'ffffffff-0000-4000-a000-000000000004',
        'cccccccc-0000-4000-a000-000000000005',
        'partially_paid',
        -10,
        5,
        null,
        'INV-1041',
        'Paver driveway — 50% deposit received.',
      ],
      [
        'ffffffff-0000-4000-a000-000000000005',
        'cccccccc-0000-4000-a000-000000000004',
        'paid',
        -18,
        -3,
        null,
        'INV-1039',
        'June biweekly — paid Zelle.',
      ],
    ] as const
  ).map(([id, client_id, status, issuedOff, dueOff, remindOff, number, notes]) => ({
    ...base,
    id,
    client_id,
    status,
    number,
    issued_at: day(issuedOff),
    due_at: day(dueOff),
    last_reminded_at: remindOff == null ? null : ts(remindOff),
    notes,
    created_at: ts(issuedOff),
  }))

  const INVOICE_ITEMS: Row[] = (
    [
      [
        'ffffffff-0000-4000-a000-000000000001',
        'Lawn maintenance — June (4 visits)',
        4,
        6500,
        0,
      ],
      [
        'ffffffff-0000-4000-a000-000000000002',
        'Lawn maintenance — May (4 visits)',
        4,
        6000,
        0,
      ],
      [
        'ffffffff-0000-4000-a000-000000000003',
        'Palm trimming + hedge shaping',
        1,
        28000,
        0,
      ],
      ['ffffffff-0000-4000-a000-000000000003', 'Spring bed cleanup', 1, 12000, 1],
      [
        'ffffffff-0000-4000-a000-000000000004',
        'Paver driveway install (650 sq ft)',
        1,
        450000,
        0,
      ],
      [
        'ffffffff-0000-4000-a000-000000000005',
        'Biweekly maintenance — June (2 visits)',
        2,
        6500,
        0,
      ],
    ] as const
  ).map(([invoice_id, description, quantity, unit_price_cents, sort_order], i) => ({
    ...base,
    id: `f1100000-0000-4000-a000-00000000000${i}`,
    invoice_id,
    job_id: null,
    description,
    quantity,
    unit_price_cents,
    sort_order,
  }))

  const PAYMENTS: Row[] = (
    [
      ['ffffffff-0000-4000-a000-000000000004', 225000, 'check', -10, 'Deposit (50%)'],
      ['ffffffff-0000-4000-a000-000000000005', 13000, 'zelle', -17, 'Paid in full'],
    ] as const
  ).map(([invoice_id, amount_cents, method, paidOff, note], i) => ({
    ...base,
    id: `f2200000-0000-4000-a000-00000000000${i}`,
    invoice_id,
    amount_cents,
    method,
    paid_at: day(paidOff),
    note,
    created_at: ts(paidOff),
  }))

  const INVOICE_BALANCES: Row[] = INVOICES.map((inv) => {
    const total = INVOICE_ITEMS.filter((it) => it.invoice_id === inv.id).reduce(
      (s, it) =>
        s + Math.round((it.quantity as number) * (it.unit_price_cents as number)),
      0,
    )
    const paid = PAYMENTS.filter((p) => p.invoice_id === inv.id).reduce(
      (s, p) => s + (p.amount_cents as number),
      0,
    )
    const client = clientById.get(inv.client_id as string)
    return {
      invoice_id: inv.id,
      client_id: inv.client_id,
      number: inv.number,
      status: inv.status,
      issued_at: inv.issued_at,
      due_at: inv.due_at,
      last_reminded_at: inv.last_reminded_at,
      total_cents: total,
      paid_cents: paid,
      balance_cents: total - paid,
      client: client ? { name: client.name, phone: client.phone } : null,
    }
  })

  const EXPENSES: Row[] = (
    [
      ['Fuel — truck + mowers', 'fuel', 8200, -2, 'RaceTrac'],
      ['Mulch (pallet)', 'materials', 18500, -5, 'Site One'],
      ['Trimmer line + blades', 'parts', 4300, -9, 'Home Depot'],
    ] as const
  ).map(([note, category, amount_cents, off, vendor], i) => ({
    ...base,
    id: `a1100000-0000-4000-a000-00000000000${i}`,
    category,
    amount_cents,
    spent_on: day(off),
    vendor,
    note,
    client_id: null,
    job_id: null,
    created_at: ts(off),
  }))

  const TASKS: Row[] = (
    [
      [
        'cccccccc-0000-4000-a000-000000000002',
        'Call Margaret — invoice 90+ days overdue (be gentle)',
        -3,
        false,
      ],
      [
        'cccccccc-0000-4000-a000-000000000006',
        'Follow up with James on paver quote',
        1,
        false,
      ],
      [
        'cccccccc-0000-4000-a000-000000000005',
        "Order pavers + sand for Frank's driveway",
        0,
        false,
      ],
      [
        'cccccccc-0000-4000-a000-000000000009',
        'Win-back call to Henry (dormant)',
        5,
        false,
      ],
    ] as const
  ).map(([client_id, title, dueOff, done], i) => ({
    ...base,
    id: `a2200000-0000-4000-a000-00000000000${i}`,
    client_id,
    title,
    due_date: day(dueOff),
    done,
    created_at: ts(-1),
  }))

  const ACTIVITIES: Row[] = (
    [
      [
        'cccccccc-0000-4000-a000-000000000006',
        'note',
        'Referral from Bob. Called about paver driveway.',
        -6,
      ],
      [
        'cccccccc-0000-4000-a000-000000000008',
        'stage_change',
        'Stage changed to active (estimate accepted).',
        -4,
      ],
      [
        'cccccccc-0000-4000-a000-000000000002',
        'note',
        'Sent friendly payment reminder + PDF.',
        -12,
      ],
    ] as const
  ).map(([client_id, kind, body, off], i) => ({
    ...base,
    id: `a3300000-0000-4000-a000-00000000000${i}`,
    client_id,
    kind,
    body,
    created_at: ts(off),
  }))

  const INVENTORY: Row[] = (
    [
      ['Mulch (2 cu ft bags)', 'Materials', 'bags', 4, 12, 'Trailer'],
      ['Trimmer line .095', 'Parts', 'spool', 1, 4, 'Truck'],
      ['Paver base sand', 'Materials', 'bags', 0, 6, 'Shop'],
      ['2-cycle oil', 'Fluids', 'btl', 9, 4, 'Truck'],
    ] as const
  ).map(([name, category, unit, quantity, reorder_level, location], i) => ({
    ...base,
    id: `a4400000-0000-4000-a000-00000000000${i}`,
    name,
    category,
    unit,
    quantity,
    reorder_level,
    location,
    created_at: ts(-30),
  }))

  const BUSINESS_SETTINGS: Row[] = [
    {
      ...base,
      id: ORG,
      business_name: 'Apex Lawn & Landscape',
      address: '3421 NW 85th Ave, Coral Springs, FL 33065',
      email: 'apexlawn.fl@gmail.com',
      phone: '(954) 555-0142',
      review_url: 'https://g.page/r/apex-lawn-landscape/review',
      intake_token: 'demo-intake-token',
      invoice_prefix: 'INV-',
      estimate_prefix: 'EST-',
      next_invoice_number: 1043,
      next_estimate_number: 27,
      default_due_days: 15,
      logo_path: null,
      onboarded_at: ts(-118),
      // Automation flags — mirror the migration 0020 column defaults so demo
      // toggles render with a real on/off state (not undefined).
      auto_followup_after_job: false,
      auto_followup_days: 3,
      auto_overdue_reminder: false,
      auto_overdue_days: 7,
    },
  ]

  const SCHEDULES: Row[] = (
    [
      [
        'bbbbbbbb-0000-4000-a000-000000000001',
        '55555555-0000-4000-a000-000000000001',
        'weekly',
        -110,
        6500,
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000003',
        '55555555-0000-4000-a000-000000000001',
        'biweekly',
        -100,
        6000,
      ],
      [
        'bbbbbbbb-0000-4000-a000-000000000010',
        '55555555-0000-4000-a000-000000000001',
        'weekly',
        -90,
        12000,
      ],
    ] as const
  ).map(([property_id, service_id, cadence, anchorOff, price_cents], i) => ({
    ...base,
    id: `66666666-0000-4000-a000-00000000000${i}`,
    property_id,
    service_id,
    cadence,
    anchor_date: day(anchorOff),
    price_cents,
    last_materialized_through: day(21),
    paused_at: null,
    created_at: ts(anchorOff),
  }))

  cached = {
    tables: {
      services: SERVICES,
      clients: CLIENTS,
      properties: PROPERTIES,
      property_services: [],
      jobs: JOBS,
      estimates: ESTIMATES,
      estimate_items: ESTIMATE_ITEMS,
      invoices: INVOICES,
      invoice_items: INVOICE_ITEMS,
      payments: PAYMENTS,
      invoice_balances: INVOICE_BALANCES,
      expenses: EXPENSES,
      tasks: TASKS,
      activities: ACTIVITIES,
      inventory_items: INVENTORY,
      business_settings: BUSINESS_SETTINGS,
      recurring_schedules: SCHEDULES,
      subscriptions: [
        {
          ...base,
          id: ORG,
          status: 'active',
          trial_ends_at: ts(40),
          current_period_end: ts(40),
          plan_id: 'pro',
        },
      ],
      plans: [{ id: 'pro', name: 'Pro', price_cents: 4900 }],
      photos: [],
      mileage_logs: [],
    },
    dashboard: {
      collected_cents: 142000,
      outstanding_cents: 503000,
      pipeline_cents: 690000,
      jobs_week: 9,
      jobs_done_week: 4,
      open_tasks: 4,
      overdue_tasks: 2,
      leads: 1,
      quoted: 1,
      active: 6,
      dormant: 1,
    },
    session: {
      access_token: 'demo',
      refresh_token: 'demo',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: USER,
        email: 'demo@lawnbizops.test',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
      },
    },
  }
  return cached
}

// ── in-memory PostgREST-ish query builder ────────────────────────────────────
type Result = { data: Row[]; error: null }

function makeQuery(rows: Row[]) {
  const filters: ((r: Row) => boolean)[] = []
  let sortKey: string | null = null
  let sortAsc = true
  let limitN: number | null = null

  const run = (): Row[] => {
    let out = rows.filter((r) => filters.every((f) => f(r)))
    if (sortKey) {
      const k = sortKey
      out = [...out].sort((a, b) => {
        const av = a[k] as never
        const bv = b[k] as never
        if (av === bv) return 0
        return (av < bv ? -1 : 1) * (sortAsc ? 1 : -1)
      })
    }
    if (limitN != null) out = out.slice(0, limitN)
    return out
  }

  const builder = {
    select: () => builder,
    eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), builder),
    neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), builder),
    in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), builder),
    is: (c: string, v: unknown) => (
      filters.push((r) => (v === null ? r[c] == null : r[c] === v)),
      builder
    ),
    gte: (c: string, v: never) => (filters.push((r) => (r[c] as never) >= v), builder),
    lte: (c: string, v: never) => (filters.push((r) => (r[c] as never) <= v), builder),
    gt: (c: string, v: never) => (filters.push((r) => (r[c] as never) > v), builder),
    lt: (c: string, v: never) => (filters.push((r) => (r[c] as never) < v), builder),
    order: (c: string, opts?: { ascending?: boolean }) => (
      (sortKey = c),
      (sortAsc = opts?.ascending !== false),
      builder
    ),
    limit: (n: number) => ((limitN = n), builder),
    range: () => builder,
    single: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
    maybeSingle: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
    // writes are no-ops in demo — the optimistic cache update already happened
    upsert: () => Promise.resolve({ data: null, error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => builder,
    delete: () => builder,
    then: (onF: (r: Result) => unknown, onR?: (e: unknown) => unknown) =>
      Promise.resolve({ data: run(), error: null } as Result).then(onF, onR),
  }
  return builder
}

async function rpc(name: string, params?: Record<string, unknown>) {
  const d = buildData()
  switch (name) {
    case 'estimate_by_token': {
      const estimates = d.tables.estimates ?? []
      const est = estimates.find((e) => e.status === 'sent') ?? estimates[0]
      if (!est) return { data: null, error: null }
      const items = (d.tables.estimate_items ?? []).filter(
        (i) => i.estimate_id === est.id,
      )
      const client = (d.tables.clients ?? []).find((c) => c.id === est.client_id)
      const prop = (d.tables.properties ?? []).find((p) => p.id === est.property_id)
      const bs = (d.tables.business_settings ?? [])[0]
      return {
        data: {
          id: est.id,
          number: est.number,
          status: est.status,
          issued_at: est.issued_at,
          valid_until: est.valid_until,
          notes: est.notes ?? '',
          business_name: bs?.business_name ?? '',
          client_name: client?.name ?? '',
          property_label: prop?.label ?? prop?.address_line1 ?? '',
          items: items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit_price_cents: i.unit_price_cents,
          })),
        },
        error: null,
      }
    }
    case 'respond_to_estimate':
      return {
        data: params?.p_action === 'decline' ? 'declined' : 'accepted',
        error: null,
      }
    case 'intake_business_name':
      return {
        data: (d.tables.business_settings ?? [])[0]?.business_name ?? '',
        error: null,
      }
    case 'submit_lead':
      return { data: { ok: true }, error: null }
    case 'app_state':
      return {
        data: {
          onboarded: true,
          access: true,
          status: 'active',
          trial_ends_at: d.session.expires_at,
        },
        error: null,
      }
    case 'current_org':
      return { data: ORG, error: null }
    case 'dashboard_metrics':
      return { data: d.dashboard, error: null }
    default:
      // profitability / pnl / income_by_method / expenses_by_category / materialize_jobs
      return { data: name === 'materialize_jobs' ? null : [], error: null }
  }
}

/** A fake SupabaseClient backed entirely by the in-memory seed. */
export function createDemoClient(): SupabaseClient<Database> {
  const session = buildData().session
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({
        data: { session, user: session.user },
        error: null,
      }),
      signInAnonymously: async () => ({
        data: { session, user: session.user },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      refreshSession: async () => ({ data: { session }, error: null }),
    },
    from: (table: string) => makeQuery(buildData().tables[table] ?? []),
    rpc,
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: 'demo' }, error: null }),
        remove: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
        download: async () => ({ data: null, error: null }),
      }),
    },
  }
  return client as unknown as SupabaseClient<Database>
}
