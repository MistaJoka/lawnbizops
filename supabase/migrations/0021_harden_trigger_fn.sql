-- 0021: keep the trigger-only SECURITY DEFINER function off the REST API.
-- job_done_followup runs only as the AFTER UPDATE trigger on jobs; it should
-- not be callable via /rpc by anon/authenticated (consistent with 0017).

revoke execute on function public.job_done_followup() from anon, authenticated;
