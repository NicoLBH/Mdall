create index if not exists idx_situations_project_id
  on public.situations(project_id);

create index if not exists idx_situations_status
  on public.situations(status);

create index if not exists idx_milestones_project_id
  on public.milestones(project_id);

create index if not exists idx_milestones_status
  on public.milestones(status);

create index if not exists idx_milestones_due_date
  on public.milestones(due_date);
