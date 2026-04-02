alter table public.subjects
  alter column current_title set not null,
  alter column current_description set not null,
  alter column priority set not null,
  alter column status set not null;
