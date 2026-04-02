create index if not exists idx_subject_links_project_id
  on public.subject_links(project_id);

create index if not exists idx_subject_links_source_subject_id
  on public.subject_links(source_subject_id);

create index if not exists idx_subject_links_target_subject_id
  on public.subject_links(target_subject_id);

create index if not exists idx_subject_links_link_type
  on public.subject_links(link_type);
