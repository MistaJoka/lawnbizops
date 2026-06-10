-- 0008: private logos bucket for the business profile

insert into storage.buckets (id, name, public)
  values ('logos', 'logos', false)
  on conflict (id) do nothing;

create policy "anon logos all (temp no-auth)" on storage.objects
  for all to anon
  using (bucket_id = 'logos')
  with check (bucket_id = 'logos');
create policy "auth logos all" on storage.objects
  for all to authenticated
  using (bucket_id = 'logos')
  with check (bucket_id = 'logos');
