-- Align Storage select access with the attachment source-of-truth table.
-- This avoids inferring authorization from path segments only.

drop policy if exists storage_subject_message_attachments_select on storage.objects;

create policy storage_subject_message_attachments_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'subject-message-attachments'
  and exists (
    select 1
    from public.subject_message_attachments sma
    where sma.storage_bucket = storage.objects.bucket_id
      and sma.storage_path = storage.objects.name
      and sma.deleted_at is null
      and public.can_access_project_subject_conversation(sma.project_id)
  )
);
