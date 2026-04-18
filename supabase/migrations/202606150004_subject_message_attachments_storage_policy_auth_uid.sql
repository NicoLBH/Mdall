-- Storage RLS for subject message attachments:
-- avoid relying on helper function evaluation in storage context and
-- check project access directly from auth.uid().

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

drop policy if exists storage_subject_message_attachments_insert on storage.objects;
create policy storage_subject_message_attachments_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'subject-message-attachments'
  and (storage.foldername(name))[1] is not null
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

drop policy if exists storage_subject_message_attachments_update on storage.objects;
create policy storage_subject_message_attachments_update
on storage.objects
for update
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
)
with check (
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

drop policy if exists storage_subject_message_attachments_delete on storage.objects;
create policy storage_subject_message_attachments_delete
on storage.objects
for delete
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
