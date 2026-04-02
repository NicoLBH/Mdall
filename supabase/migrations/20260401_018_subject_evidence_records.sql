create table if not exists public.subject_evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  subject_observation_id uuid not null references public.subject_observations(id) on delete cascade,
  evidence_role text not null,
  summary text,
  created_at timestamptz not null default now(),
  constraint subject_evidence_role_check
    check (evidence_role in ('origin', 'confirming', 'complement', 'contradicting', 'duplicate_signal', 'reopen_signal'))
);
