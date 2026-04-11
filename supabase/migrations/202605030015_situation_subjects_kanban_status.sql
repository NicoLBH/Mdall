begin;

alter table if exists public.situation_subjects
  add column if not exists kanban_status text not null default 'non_active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'situation_subjects_kanban_status_check'
  ) then
    alter table public.situation_subjects
      add constraint situation_subjects_kanban_status_check
      check (kanban_status in ('non_active', 'to_activate', 'in_progress', 'in_arbitration', 'resolved'));
  end if;
end $$;

comment on column public.situation_subjects.kanban_status is
  'Statut kanban du sujet dans le contexte de la situation.';

commit;
