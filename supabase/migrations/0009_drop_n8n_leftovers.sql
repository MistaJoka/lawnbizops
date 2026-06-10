-- 0009: drop abandoned n8n-experiment leftovers (user-approved 2026-06-10).
-- Both tables were empty, RLS-disabled, and publicly exposed via the anon key.

drop table if exists public.documents;
drop table if exists public.n8n_chat_histories;
drop event trigger if exists ensure_rls;
drop function if exists public.rls_auto_enable();
drop extension if exists vector;
