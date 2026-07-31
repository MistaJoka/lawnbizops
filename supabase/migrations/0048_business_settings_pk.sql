-- business_settings had unique(org_id) but no primary key (perf advisor 0004).
-- org_id is NOT NULL and the table is one-row-per-org, so promote it to the PK
-- and drop the now-redundant unique constraint — the PK's index serves the
-- client's upsert onConflict: 'org_id' just the same.
-- Applied to prod 2026-07-31 as version 'business_settings_pk'.
alter table public.business_settings
  add constraint business_settings_pkey primary key (org_id);
alter table public.business_settings
  drop constraint business_settings_org_key;
