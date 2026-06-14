-- 0017: tighten EXECUTE on internal SECURITY DEFINER functions.
--
-- materialize_jobs_all() is meant to run only from the nightly pg_cron job, and
-- handle_new_user() only as the auth.users signup trigger — neither should be
-- callable over the REST API by anon/authenticated. (current_org() and
-- app_state() stay executable: the app calls them every navigation.)

revoke execute on function public.materialize_jobs_all() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
