alter table public.subjects
  drop constraint if exists subjects_situation_id_fkey;

alter table public.subjects
  add constraint subjects_situation_id_fkey
  foreign key (situation_id) references public.situations(id) on delete set null;
