-- Align final storage policy state for subject message attachments.
--
-- Security model:
--   * `documents` and `avatars` keep their direct client upload flows.
--   * `subject-message-attachments` uses server-managed writes (edge function + service role).
--
-- This migration intentionally keeps read access scoped to authenticated users that
-- can access the project encoded in the first storage path segment,
-- while disabling authenticated direct writes on storage.objects.
--
-- NOTE: service role uploads are not blocked by these RLS policies.

-- Keep the bucket private (no anonymous/public object access).
update storage.buckets
set public = false
where id = 'subject-message-attachments';

-- Re-assert the SELECT policy as the explicit final read policy for this bucket.
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
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.project_collaborators pc
          left join public.directory_people dp on dp.id = pc.person_id
          where pc.project_id = p.id
            and lower(coalesce(pc.status, '')) = 'actif'
            and pc.removed_at is null
            and (
              pc.collaborator_user_id = auth.uid()
              or dp.linked_user_id = auth.uid()
            )
        )
      )
  )
);

-- Server-managed write model: remove authenticated direct write/delete policies.
drop policy if exists storage_subject_message_attachments_insert on storage.objects;
drop policy if exists storage_subject_message_attachments_update on storage.objects;
drop policy if exists storage_subject_message_attachments_delete on storage.objects;
