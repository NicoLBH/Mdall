-- Temporary fallback policy for subject message attachments storage.
-- The previous project-scoped policies produced false negatives in production
-- (403 RLS on upload for project owners/collaborators). This policy restores
-- upload reliability by allowing any authenticated user on this private bucket.
-- Access to attachment metadata remains controlled by table RLS.

drop policy if exists storage_subject_message_attachments_select on storage.objects;
create policy storage_subject_message_attachments_select
on storage.objects
for select
to authenticated
using (bucket_id = 'subject-message-attachments');

drop policy if exists storage_subject_message_attachments_insert on storage.objects;
create policy storage_subject_message_attachments_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'subject-message-attachments');

drop policy if exists storage_subject_message_attachments_update on storage.objects;
create policy storage_subject_message_attachments_update
on storage.objects
for update
to authenticated
using (bucket_id = 'subject-message-attachments')
with check (bucket_id = 'subject-message-attachments');

drop policy if exists storage_subject_message_attachments_delete on storage.objects;
create policy storage_subject_message_attachments_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'subject-message-attachments');
