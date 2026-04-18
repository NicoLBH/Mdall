-- Align attachment storage read policy with the same project access predicate
-- used by subject messaging edge uploads.

drop policy if exists storage_subject_message_attachments_select on storage.objects;
create policy storage_subject_message_attachments_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'subject-message-attachments'
  and exists (
    select 1
    from public.projects p
    where p.id::text = (storage.foldername(name))[1]
      and public.can_access_project_subject_conversation(p.id)
  )
);
