-- 0025: stop exposing public tables/views to the anon role.
--
-- Supabase grants anon table-level SELECT by default, which makes every object
-- discoverable in the GraphQL/REST schema (advisor lint 0026) even though RLS
-- returns zero rows for anon — there are no anon policies since the auth-on
-- cutover (0012). The app never reads a public table as anon: pre-login it only
-- touches GoTrue (auth schema) and the authenticated-only app_state RPC; the
-- /billing route is reached only with a session, so plans is read as
-- authenticated too. Revoke anon SELECT to close the exposure. `authenticated`
-- is deliberately untouched — the whole app reads as authenticated.

revoke select on all tables in schema public from anon;

-- Don't let tables added by future migrations re-expose to anon.
alter default privileges in schema public revoke select on tables from anon;
