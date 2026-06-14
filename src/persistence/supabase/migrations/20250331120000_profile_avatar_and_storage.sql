-- Public profile image URL (Supabase Storage public URL base; add ?v= for cache-bust after overwrite)
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'Public URL for avatar image in Storage bucket avatars';

-- Bucket: one object per user at {user_id}/avatar.jpg (restrict MIME/size in Dashboard if needed)
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', true
where not exists (select 1 from storage.buckets where id = 'avatars');

-- Public read (bucket is public)
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Authenticated users may only create objects under their user id folder
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) = 'avatar.jpg'
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) = 'avatar.jpg'
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) = 'avatar.jpg'
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) = 'avatar.jpg'
  );
