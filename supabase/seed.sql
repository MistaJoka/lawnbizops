-- =============================================================================
-- seed.sql — coherent demo business for LOCAL development only.
--
-- Runs automatically on `supabase db reset` (config.toml [db.seed]).
-- NEVER run against prod: it inserts a fake org, a login user, and ~3 months of
-- a South Florida solo landscaper's data designed to exercise every screen —
-- Today (route + board lanes), Schedule, Clients/pipeline, Money (aging + A/R),
-- Estimates, Dashboard, Tasks, Inventory.
--
-- Login (local app):  demo@lawnbizops.test  /  demo1234
--
-- All rows carry explicit org_id + user_id because the DB defaults
-- (current_org(), auth.uid()) resolve to NULL outside an authenticated session.
-- Dates are anchored to CURRENT_DATE so "today" lines up whenever you reset.
-- =============================================================================

-- The org is NOT hard-coded: the on_auth_user_created trigger provisions a
-- fresh org for the demo user on signup, and current_org() picks it. So we let
-- the trigger create the org, then adopt it (captured in temp table _seed_ctx)
-- for every data row. Demo user id is fixed: b0000000-0000-4000-a000-000000000002

-- NB: no BEGIN/COMMIT and no temp tables — the CLI seed runner splits the file
-- into separate batches, so cross-statement state doesn't survive. Each
-- statement resolves the org inline from the membership the trigger created.

-- ---------------------------------------------------------------------------
-- Auth: one confirmed email/password user so the local app can log in.
-- Token columns set to '' (not NULL) to avoid GoTrue "NULL to string" on login.
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  is_super_admin, is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  'b0000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'demo@lawnbizops.test',
  crypt('demo1234', gen_salt('bf')),
  now(), now() - interval '120 days', now(),
  '{"provider":"email","providers":["email"]}', '{"business_name":"Apex Lawn & Landscape"}',
  '', '', '', '',
  false, false, false
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(), 'b0000000-0000-4000-a000-000000000002', 'b0000000-0000-4000-a000-000000000002',
  jsonb_build_object('sub', 'b0000000-0000-4000-a000-000000000002', 'email', 'demo@lawnbizops.test', 'email_verified', true),
  'email', now(), now() - interval '120 days', now()
);

-- ---------------------------------------------------------------------------
-- Adopt the org the new-user trigger just provisioned: capture it, fill in the
-- (empty) business_settings + mark onboarded, and upgrade the trial to active.
-- ---------------------------------------------------------------------------
update public.business_settings set
  business_name = 'Apex Lawn & Landscape',
  address = '3421 NW 85th Ave, Coral Springs, FL 33065',
  email = 'apexlawn.fl@gmail.com', phone = '(954) 555-0142',
  invoice_prefix = 'INV-', estimate_prefix = 'EST-',
  next_invoice_number = 1043, next_estimate_number = 27,
  default_due_days = 15, onboarded_at = now() - interval '118 days'
where org_id = (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1);

update public.subscriptions set
  status = 'active',
  trial_ends_at = now() + interval '40 days',
  current_period_end = now() + interval '40 days'
where org_id = (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1);

-- ---------------------------------------------------------------------------
-- Service catalog (his real services + South FL high-ROI work)
-- ---------------------------------------------------------------------------
insert into public.services (id, org_id, user_id, name, description, default_price_cents, unit) values
  ('55555555-0000-4000-a000-000000000001', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Lawn Maintenance',     'Mow, edge, blow — per visit',        6500,  'flat'),
  ('55555555-0000-4000-a000-000000000002', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Hedge & Shrub Trim',   'Shape hedges and shrubs',            9500,  'flat'),
  ('55555555-0000-4000-a000-000000000003', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Palm Trimming',        'Trim and skin palms',               14000,  'flat'),
  ('55555555-0000-4000-a000-000000000004', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Mulch Installation',   'Delivered + spread, per cubic yard', 8500,  'yard'),
  ('55555555-0000-4000-a000-000000000005', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Sod Installation',     'Remove + lay sod, per sq ft',         350,  'sqft'),
  ('55555555-0000-4000-a000-000000000006', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Pressure Washing',     'Driveway / patio / roof',           22000,  'flat'),
  ('55555555-0000-4000-a000-000000000007', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Paver Driveway',       'Demo, base, paver install',        450000,  'flat'),
  ('55555555-0000-4000-a000-000000000008', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Storm Cleanup',        'Post-storm debris haul',            35000,  'flat');

-- ---------------------------------------------------------------------------
-- Clients — full pipeline spread: lead / quoted / active / dormant
-- ---------------------------------------------------------------------------
insert into public.clients (id, org_id, user_id, name, phone, email, stage, notes, created_at) values
  ('cccccccc-0000-4000-a000-000000000001', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Bob Castellano',     '(954) 555-0188', 'bobcastellano@gmail.com', 'active', 'Weekly mow. Pays on time, cash.',                    now() - interval '110 days'),
  ('cccccccc-0000-4000-a000-000000000002', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Margaret Whitfield', '(954) 555-0151', '',                        'active', 'Elderly, hard of hearing — ring bell twice. Slow to pay, do NOT pressure.', now() - interval '108 days'),
  ('cccccccc-0000-4000-a000-000000000003', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Delgado Family',     '(754) 555-0133', 'rdelgado@outlook.com',    'active', 'Biweekly. Two dogs in back yard.',                   now() - interval '100 days'),
  ('cccccccc-0000-4000-a000-000000000004', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Carlos Mendez',      '(786) 555-0177', 'carlosm@gmail.com',       'active', 'Biweekly, pays Zelle same day.',                     now() - interval '95 days'),
  ('cccccccc-0000-4000-a000-000000000005', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Frank DiMarco',      '(954) 555-0166', 'fdimarco@gmail.com',      'active', 'Paver driveway in progress. Deposit paid.',          now() - interval '40 days'),
  ('cccccccc-0000-4000-a000-000000000006', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'James Okafor',       '(954) 555-0199', 'jokafor@gmail.com',       'lead',   'Referral from Bob. Wants paver driveway quote.',     now() - interval '6 days'),
  ('cccccccc-0000-4000-a000-000000000007', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Gloria Sanchez',     '(786) 555-0124', 'gsanchez@gmail.com',      'quoted', 'Quoted sod + mulch refresh, deciding.',              now() - interval '12 days'),
  ('cccccccc-0000-4000-a000-000000000008', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Patricia Nguyen',    '(954) 555-0145', 'pnguyen@gmail.com',       'active', 'Accepted mulch + hedge estimate.',                   now() - interval '20 days'),
  ('cccccccc-0000-4000-a000-000000000009', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Henry Adler',        '(954) 555-0112', '',                        'dormant','One-time cleanup last fall. Win back?',               now() - interval '240 days'),
  ('cccccccc-0000-4000-a000-000000000010', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Sunrise Villas HOA', '(954) 555-0101', 'linda@sunrisevillas.org', 'active', 'Contact: Linda Park. Big common-area mow, gate code.',now() - interval '90 days');

-- ---------------------------------------------------------------------------
-- Properties — clustered NW Broward coords so drive-order has real meaning
-- ---------------------------------------------------------------------------
insert into public.properties (id, org_id, user_id, client_id, label, address_line1, city, state, zip, lat, lng, gate_code, notes) values
  ('bbbbbbbb-0000-4000-a000-000000000001', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000001', 'Home',        '3421 NW 85th Ave',  'Coral Springs', 'FL', '33065', 26.2710, -80.2706, '4827', 'Friendly dog, stays inside.'),
  ('bbbbbbbb-0000-4000-a000-000000000002', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000002', 'Home',        '10250 Westview Dr', 'Coral Springs', 'FL', '33076', 26.2855, -80.2588, '',     'Ring bell twice.'),
  ('bbbbbbbb-0000-4000-a000-000000000003', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000003', 'Home',        '6740 NW 41st St',   'Coconut Creek', 'FL', '33073', 26.2520, -80.1790, '',     'Two dogs — text before arriving.'),
  ('bbbbbbbb-0000-4000-a000-000000000004', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000004', 'Home',        '4815 Wiles Rd',     'Coconut Creek', 'FL', '33073', 26.2960, -80.1860, '',     ''),
  ('bbbbbbbb-0000-4000-a000-000000000005', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000005', 'Driveway job','7820 Holmberg Rd',  'Parkland',      'FL', '33067', 26.3100, -80.2370, '',     '650 sq ft paver driveway.'),
  ('bbbbbbbb-0000-4000-a000-000000000006', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000006', 'Home',        '12100 NW 70th Ct',  'Parkland',      'FL', '33076', 26.3050, -80.2480, '',     'Quote site visit.'),
  ('bbbbbbbb-0000-4000-a000-000000000007', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000007', 'Home',        '5601 Coral Ridge Dr','Coral Springs','FL', '33076', 26.2790, -80.2540, '',     ''),
  ('bbbbbbbb-0000-4000-a000-000000000008', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000008', 'Home',        '9100 W Atlantic Blvd','Coral Springs','FL','33071', 26.2350, -80.2560, '',     ''),
  ('bbbbbbbb-0000-4000-a000-000000000009', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000009', 'Home',        '2200 N University Dr','Coral Springs','FL','33071', 26.2660, -80.2520, '',     ''),
  ('bbbbbbbb-0000-4000-a000-000000000010', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000010', 'Common area', '3800 Inverrary Blvd','Lauderhill',   'FL', '33319', 26.1700, -80.2200, '7421', 'Gate code 7421. Mow front + median.');

-- Per-property price override (HOA common area is bigger than default mow)
insert into public.property_services (org_id, user_id, property_id, service_id, price_cents) values
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000010', '55555555-0000-4000-a000-000000000001', 12000);

-- ---------------------------------------------------------------------------
-- Recurring schedules (visible in Schedule). last_materialized_through set
-- ahead of today so the app's on-open materialize is a no-op (no surprise
-- duplicate jobs during the walkthrough).
-- ---------------------------------------------------------------------------
insert into public.recurring_schedules
  (id, org_id, user_id, property_id, service_id, cadence, anchor_date, price_cents, last_materialized_through) values
  ('66666666-0000-4000-a000-000000000001', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000001', '55555555-0000-4000-a000-000000000001', 'weekly',       CURRENT_DATE - 110, 6500,  CURRENT_DATE + 21),
  ('66666666-0000-4000-a000-000000000002', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000003', '55555555-0000-4000-a000-000000000001', 'biweekly',     CURRENT_DATE - 100, 6000,  CURRENT_DATE + 21),
  ('66666666-0000-4000-a000-000000000003', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000004', '55555555-0000-4000-a000-000000000001', 'biweekly',     CURRENT_DATE - 95,  6500,  CURRENT_DATE + 21),
  ('66666666-0000-4000-a000-000000000004', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000010', '55555555-0000-4000-a000-000000000001', 'weekly',       CURRENT_DATE - 90, 12000,  CURRENT_DATE + 21);

-- ---------------------------------------------------------------------------
-- Jobs — today's board/route, near future, and billed history
-- ---------------------------------------------------------------------------
insert into public.jobs
  (id, org_id, user_id, property_id, service_id, title, scheduled_date, start_time, status, price_cents, completed_at) values
  -- TODAY (route view + board Done / In progress / Scheduled)
  ('dddddddd-0000-4000-a000-000000000001', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000001', '55555555-0000-4000-a000-000000000001', 'Weekly mow',        CURRENT_DATE, '08:00', 'done',        6500,  now() - interval '4 hours'),
  ('dddddddd-0000-4000-a000-000000000002', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000003', '55555555-0000-4000-a000-000000000001', 'Biweekly mow',      CURRENT_DATE, '09:00', 'done',        6000,  now() - interval '3 hours'),
  ('dddddddd-0000-4000-a000-000000000003', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000010', '55555555-0000-4000-a000-000000000001', 'HOA common mow',    CURRENT_DATE, '10:30', 'in_progress', 12000, null),
  ('dddddddd-0000-4000-a000-000000000004', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000004', '55555555-0000-4000-a000-000000000001', 'Biweekly mow',      CURRENT_DATE, '13:00', 'scheduled',   6500,  null),
  ('dddddddd-0000-4000-a000-000000000005', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000005', '55555555-0000-4000-a000-000000000007', 'Paver layout walk', CURRENT_DATE, '15:00', 'scheduled',   0,     null),
  -- NEAR FUTURE (Schedule + board Scheduled)
  ('dddddddd-0000-4000-a000-000000000006', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000001', '55555555-0000-4000-a000-000000000001', 'Weekly mow',        CURRENT_DATE + 7, '08:00', 'scheduled', 6500, null),
  ('dddddddd-0000-4000-a000-000000000007', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000002', '55555555-0000-4000-a000-000000000002', 'Hedge trim',        CURRENT_DATE + 2, '09:30', 'scheduled', 9500, null),
  ('dddddddd-0000-4000-a000-000000000008', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000008', '55555555-0000-4000-a000-000000000004', 'Mulch install — 8 yd', CURRENT_DATE + 3, '08:00', 'scheduled', 68000, null),
  -- RAIN SKIP (recent)
  ('dddddddd-0000-4000-a000-000000000009', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000004', '55555555-0000-4000-a000-000000000001', 'Biweekly mow',      CURRENT_DATE - 2, '09:00', 'skipped',     6500, null),
  -- BILLED HISTORY (feeds invoices below)
  ('dddddddd-0000-4000-a000-000000000010', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000004', '55555555-0000-4000-a000-000000000001', 'Biweekly mow',      CURRENT_DATE - 18, '09:00', 'invoiced', 6500, now() - interval '18 days'),
  ('dddddddd-0000-4000-a000-000000000011', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000003', '55555555-0000-4000-a000-000000000001', 'Biweekly mow',      CURRENT_DATE - 10, '09:00', 'invoiced', 6000, now() - interval '10 days'),
  ('dddddddd-0000-4000-a000-000000000012', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000002', '55555555-0000-4000-a000-000000000003', 'Palm + hedge trim', CURRENT_DATE - 120,'09:00', 'invoiced', 40000, now() - interval '120 days');

-- ---------------------------------------------------------------------------
-- Estimates (Quote lane) + items. Numbers auto-assigned by trigger.
-- ---------------------------------------------------------------------------
insert into public.estimates (id, org_id, user_id, client_id, property_id, status, issued_at, valid_until, notes) values
  ('eeeeeeee-0000-4000-a000-000000000001', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000006', 'bbbbbbbb-0000-4000-a000-000000000006', 'sent',     now() - interval '4 days',  CURRENT_DATE + 25, 'Paver driveway, 650 sq ft.'),
  ('eeeeeeee-0000-4000-a000-000000000002', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000007', 'bbbbbbbb-0000-4000-a000-000000000007', 'sent',     now() - interval '10 days', CURRENT_DATE + 18, 'Sod replacement + mulch refresh.'),
  ('eeeeeeee-0000-4000-a000-000000000003', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000008', 'bbbbbbbb-0000-4000-a000-000000000008', 'accepted', now() - interval '18 days', CURRENT_DATE - 4,  'Accepted — job scheduled.'),
  ('eeeeeeee-0000-4000-a000-000000000004', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000009', 'bbbbbbbb-0000-4000-a000-000000000009', 'declined', now() - interval '30 days', CURRENT_DATE - 16, 'Declined — too expensive.'),
  ('eeeeeeee-0000-4000-a000-000000000005', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000002', 'bbbbbbbb-0000-4000-a000-000000000002', 'draft',    now() - interval '1 days',  CURRENT_DATE + 29, 'Draft — spring cleanup add-on.');

insert into public.estimate_items (org_id, user_id, estimate_id, description, quantity, unit_price_cents, sort_order) values
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'eeeeeeee-0000-4000-a000-000000000001', 'Paver driveway — demo, base, install (650 sq ft)', 1,    520000, 0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'eeeeeeee-0000-4000-a000-000000000002', 'Sod installation (2,000 sq ft)',                   2000, 350,    0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'eeeeeeee-0000-4000-a000-000000000002', 'Mulch refresh (10 cu yd)',                         10,   8500,   1),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'eeeeeeee-0000-4000-a000-000000000003', 'Mulch installation (8 cu yd)',                     8,    8500,   0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'eeeeeeee-0000-4000-a000-000000000003', 'Hedge & shrub trim',                               1,    9500,   1),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'eeeeeeee-0000-4000-a000-000000000004', 'Pressure wash driveway + roof',                    1,    45000,  0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'eeeeeeee-0000-4000-a000-000000000005', 'Spring cleanup — beds + haul',                     1,    18000,  0);

-- ---------------------------------------------------------------------------
-- Invoices (A/R + collections). Numbers auto-assigned by trigger.
-- Aging spread: current, overdue ~8d, overdue 90+, deposit (partial), paid.
-- ---------------------------------------------------------------------------
insert into public.invoices (id, org_id, user_id, client_id, status, issued_at, due_at, last_reminded_at, notes) values
  ('ffffffff-0000-4000-a000-000000000001', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000001', 'sent',          now() - interval '5 days',   CURRENT_DATE + 10, null,                       'June maintenance.'),
  ('ffffffff-0000-4000-a000-000000000002', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000003', 'sent',          now() - interval '38 days',  CURRENT_DATE - 8,  null,                       'May maintenance.'),
  ('ffffffff-0000-4000-a000-000000000003', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000002', 'sent',          now() - interval '140 days', CURRENT_DATE - 110, now() - interval '12 days', 'Palm + hedge trim. Gentle nudge sent.'),
  ('ffffffff-0000-4000-a000-000000000004', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000005', 'partially_paid',now() - interval '10 days',  CURRENT_DATE + 5,  null,                       'Paver driveway — 50% deposit received.'),
  ('ffffffff-0000-4000-a000-000000000005', (select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000004', 'paid',          now() - interval '18 days',  CURRENT_DATE - 3,  null,                       'June biweekly — paid Zelle.');

insert into public.invoice_items (org_id, user_id, invoice_id, job_id, description, quantity, unit_price_cents, sort_order) values
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000001', null, 'Lawn maintenance — June (4 visits)', 4, 6500,   0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000002', 'dddddddd-0000-4000-a000-000000000011', 'Lawn maintenance — May (4 visits)', 4, 6000, 0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000003', 'dddddddd-0000-4000-a000-000000000012', 'Palm trimming + hedge shaping', 1, 28000, 0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000003', null, 'Spring bed cleanup',                1, 12000, 1),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000004', null, 'Paver driveway install (650 sq ft)',1, 450000, 0),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000005', 'dddddddd-0000-4000-a000-000000000010', 'Biweekly maintenance — June (2 visits)', 2, 6500, 0);

-- Payments (deposit on the paver job; full payment on Carlos's invoice)
insert into public.payments (org_id, user_id, invoice_id, amount_cents, method, paid_at, note) values
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000004', 225000, 'check', now() - interval '10 days', 'Deposit (50%)'),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'ffffffff-0000-4000-a000-000000000005', 13000,  'zelle', now() - interval '17 days', 'Paid in full');

-- ---------------------------------------------------------------------------
-- Follow-up tasks (Today TasksSection + dashboard open/overdue counts)
-- ---------------------------------------------------------------------------
insert into public.tasks (org_id, user_id, client_id, title, due_date, done) values
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000002', 'Call Margaret — invoice 90+ days overdue (be gentle)', CURRENT_DATE - 3, false),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000006', 'Follow up with James on paver quote',                  CURRENT_DATE + 1, false),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000005', 'Order pavers + sand for Frank''s driveway',            CURRENT_DATE,     false),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000009', 'Win-back call to Henry (dormant)',                     CURRENT_DATE + 5, false),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000007', 'Send Gloria revised sod quote',                        CURRENT_DATE - 1, true);

-- ---------------------------------------------------------------------------
-- Activity timeline samples (client detail history)
-- ---------------------------------------------------------------------------
insert into public.activities (org_id, user_id, client_id, kind, body, created_at) values
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000006', 'note',         'Referral from Bob. Called about paver driveway.', now() - interval '6 days'),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000008', 'stage_change', 'Stage changed to active (estimate accepted).',    now() - interval '4 days'),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'cccccccc-0000-4000-a000-000000000002', 'note',         'Sent friendly payment reminder + PDF.',           now() - interval '12 days');

-- ---------------------------------------------------------------------------
-- Inventory — two low + one out trigger the Today low-stock banner
-- ---------------------------------------------------------------------------
insert into public.inventory_items (org_id, user_id, name, category, unit, quantity, reorder_level, location) values
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Mulch (2 cu ft bags)', 'Materials', 'bags', 4,  12, 'Trailer'),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Trimmer line .095',    'Parts',     'spool', 1,  4,  'Truck'),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', 'Paver base sand',      'Materials', 'bags', 0,  6,  'Shop'),
  ((select org_id from public.memberships where user_id = 'b0000000-0000-4000-a000-000000000002' limit 1), 'b0000000-0000-4000-a000-000000000002', '2-cycle oil',          'Fluids',    'btl',  9,  4,  'Truck');
