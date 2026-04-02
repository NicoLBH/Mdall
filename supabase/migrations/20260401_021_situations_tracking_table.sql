create table if not exists public.situations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  objective_text text,
  status text not null default 'open',
  progress_percent numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint situations_status_check
    check (status in ('open', 'in_progress', 'closed')),
  constraint situations_progress_percent_check
    check (progress_percent >= 0 and progress_percent <= 100)
);
