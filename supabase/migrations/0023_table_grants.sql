-- 0023: explicit table privileges for the authenticated role.
--
-- Hosted Supabase grants these via default privileges, so the app already
-- works in prod — but a fresh `supabase db reset` (the CI RLS test) doesn't
-- replicate them, leaving "permission denied" before RLS even runs. Make the
-- schema self-contained: grant table DML to authenticated (RLS still gates
-- every row), and set default privileges so future tables inherit it.
-- Functions keep their explicit grants (we deliberately revoked EXECUTE on the
-- cron/trigger-only ones), so this does NOT touch routines.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
