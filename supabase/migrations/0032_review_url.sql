-- Google review request link for the business. Used by the "Request review"
-- action on a completed job, which opens a prefilled SMS / email containing
-- this URL. Additive, non-null with an empty default so existing rows stay
-- valid; the existing org-scoped RLS policy and set_updated_at trigger on
-- business_settings cover the new column unchanged.
alter table public.business_settings
  add column if not exists review_url text not null default '';
