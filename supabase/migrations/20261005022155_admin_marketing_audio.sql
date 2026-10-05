-- Existing owner-only media storage now accepts normalized narration/music.
alter table public.admin_marketing_media drop constraint admin_marketing_media_kind_check;
alter table public.admin_marketing_media add constraint admin_marketing_media_kind_check check (kind in ('image','video','voice','music'));
update storage.buckets set allowed_mime_types = array['image/png','image/jpeg','video/mp4','audio/mpeg'] where id='admin-marketing';
-- No new browser grants or storage policies. Bucket stays private.
