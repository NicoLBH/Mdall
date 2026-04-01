create table if not exists public.subject_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  event_type text not null,
  event_payload jsonb,
  created_at timestamptz not null default now(),
  constraint subject_history_event_type_check
    check (
      event_type in (
        'created',
        'enriched',
        'reopened',
        'closed',
        'closed_duplicate',
        'closed_invalid',
        'closed_replaced',
        'linked',
        'status_changed',
        'parent_assigned',
        'moved_to_situation',
        'moved_to_milestone',
        'assignee_changed',
        'title_updated',
        'description_updated'
      )
    )
);
