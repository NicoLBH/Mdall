create unique index if not exists subject_links_unique_canonical
on public.subject_links (project_id, source_subject_id, target_subject_id, link_type);
