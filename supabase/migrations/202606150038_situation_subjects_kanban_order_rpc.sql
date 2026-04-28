begin;

-- Ajoute un ordre manuel persistant pour les cartes kanban par situation et par colonne.
alter table if exists public.situation_subjects
  add column if not exists kanban_order integer not null default 0;

comment on column public.situation_subjects.kanban_order is
  'Ordre manuel (0-based) du sujet dans une colonne kanban, scoped par situation_id + kanban_status.';

-- Backfill idempotent avec un ordre stable pour les données existantes.
with ranked as (
  select
    ss.id,
    (row_number() over (
      partition by ss.situation_id, ss.kanban_status
      order by ss.created_at asc, ss.subject_id asc
    ) - 1)::integer as next_kanban_order
  from public.situation_subjects ss
)
update public.situation_subjects ss
set kanban_order = ranked.next_kanban_order
from ranked
where ranked.id = ss.id;

-- Index de lecture/tri pour charger rapidement une colonne kanban ordonnée.
create index if not exists idx_situation_subjects_kanban_scope_order
  on public.situation_subjects (situation_id, kanban_status, kanban_order);

create or replace function public.reorder_situation_kanban_subjects(
  p_situation_id uuid,
  p_kanban_status text,
  p_subject_ids uuid[]
)
returns table(subject_id uuid, kanban_order integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := trim(coalesce(p_kanban_status, ''));
  v_expected_count integer;
  v_distinct_count integer;
  v_actual_count integer;
begin
  if p_situation_id is null then
    raise exception 'p_situation_id is required';
  end if;

  if v_status = '' then
    raise exception 'p_kanban_status is required';
  end if;

  if p_subject_ids is null then
    raise exception 'p_subject_ids is required';
  end if;

  if v_status not in ('non_active', 'to_activate', 'in_progress', 'in_arbitration', 'resolved') then
    raise exception 'Invalid kanban status: %', v_status;
  end if;

  select array_length(p_subject_ids, 1),
         cardinality(array(select distinct x from unnest(p_subject_ids) as x))
  into v_expected_count, v_distinct_count;

  if coalesce(v_expected_count, 0) = 0 then
    raise exception 'p_subject_ids must not be empty';
  end if;

  if v_expected_count <> v_distinct_count then
    raise exception 'p_subject_ids contains duplicates';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s|%s', p_situation_id::text, v_status), 0));

  select count(*)
  into v_actual_count
  from public.situation_subjects ss
  where ss.situation_id = p_situation_id
    and ss.kanban_status = v_status;

  if v_actual_count <> v_expected_count then
    raise exception 'p_subject_ids size (%) must match existing column size (%)', v_expected_count, v_actual_count;
  end if;

  if exists (
    select 1
    from unnest(p_subject_ids) as requested(subject_id)
    left join public.situation_subjects ss
      on ss.situation_id = p_situation_id
     and ss.kanban_status = v_status
     and ss.subject_id = requested.subject_id
    where ss.id is null
  ) then
    raise exception 'p_subject_ids contains subjects outside the target situation/status';
  end if;

  return query
  with ordered as (
    select t.subject_id, (t.ord - 1)::integer as next_kanban_order
    from unnest(p_subject_ids) with ordinality as t(subject_id, ord)
  ),
  updated as (
    update public.situation_subjects ss
    set kanban_order = ordered.next_kanban_order
    from ordered
    where ss.situation_id = p_situation_id
      and ss.kanban_status = v_status
      and ss.subject_id = ordered.subject_id
    returning ss.subject_id, ss.kanban_order
  )
  select u.subject_id, u.kanban_order
  from updated u
  order by u.kanban_order asc;
end;
$$;

comment on function public.reorder_situation_kanban_subjects(uuid, text, uuid[]) is
  'Réordonne atomiquement les sujets d''une colonne kanban pour une situation donnée.';

grant execute on function public.reorder_situation_kanban_subjects(uuid, text, uuid[]) to authenticated;
revoke all on function public.reorder_situation_kanban_subjects(uuid, text, uuid[]) from public;

create or replace function public.move_situation_kanban_subject(
  p_situation_id uuid,
  p_subject_id uuid,
  p_target_kanban_status text,
  p_target_kanban_order integer default null
)
returns table(subject_id uuid, kanban_status text, kanban_order integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_status text;
  v_target_status text := trim(coalesce(p_target_kanban_status, ''));
  v_source_ids uuid[];
  v_target_ids uuid[];
  v_insert_pos integer;
  v_target_len integer;
begin
  if p_situation_id is null then
    raise exception 'p_situation_id is required';
  end if;

  if p_subject_id is null then
    raise exception 'p_subject_id is required';
  end if;

  if v_target_status = '' then
    raise exception 'p_target_kanban_status is required';
  end if;

  if v_target_status not in ('non_active', 'to_activate', 'in_progress', 'in_arbitration', 'resolved') then
    raise exception 'Invalid target kanban status: %', v_target_status;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_situation_id::text, 0));

  select ss.kanban_status
  into v_source_status
  from public.situation_subjects ss
  where ss.situation_id = p_situation_id
    and ss.subject_id = p_subject_id;

  if v_source_status is null then
    raise exception 'Subject % is not linked to situation %', p_subject_id, p_situation_id;
  end if;

  select coalesce(array_agg(ss.subject_id order by ss.kanban_order asc, ss.created_at asc, ss.subject_id asc), '{}'::uuid[])
  into v_source_ids
  from public.situation_subjects ss
  where ss.situation_id = p_situation_id
    and ss.kanban_status = v_source_status
    and ss.subject_id <> p_subject_id;

  if v_source_status = v_target_status then
    v_target_ids := v_source_ids;
  else
    select coalesce(array_agg(ss.subject_id order by ss.kanban_order asc, ss.created_at asc, ss.subject_id asc), '{}'::uuid[])
    into v_target_ids
    from public.situation_subjects ss
    where ss.situation_id = p_situation_id
      and ss.kanban_status = v_target_status;
  end if;

  v_target_len := coalesce(array_length(v_target_ids, 1), 0);

  if p_target_kanban_order is null then
    v_insert_pos := v_target_len;
  else
    v_insert_pos := greatest(0, least(p_target_kanban_order, v_target_len));
  end if;

  v_target_ids :=
    coalesce(v_target_ids[1:v_insert_pos], '{}'::uuid[])
    || array[p_subject_id]
    || coalesce(v_target_ids[v_insert_pos + 1:v_target_len], '{}'::uuid[]);

  -- Réordonne la colonne source après retrait.
  with ordered_source as (
    select t.subject_id, (t.ord - 1)::integer as next_kanban_order
    from unnest(v_source_ids) with ordinality as t(subject_id, ord)
  )
  update public.situation_subjects ss
  set kanban_order = ordered_source.next_kanban_order
  from ordered_source
  where ss.situation_id = p_situation_id
    and ss.kanban_status = v_source_status
    and ss.subject_id = ordered_source.subject_id;

  -- Réordonne la colonne cible (et met à jour le statut de la carte déplacée).
  return query
  with ordered_target as (
    select t.subject_id, (t.ord - 1)::integer as next_kanban_order
    from unnest(v_target_ids) with ordinality as t(subject_id, ord)
  ),
  updated_target as (
    update public.situation_subjects ss
    set kanban_status = v_target_status,
        kanban_order = ordered_target.next_kanban_order
    from ordered_target
    where ss.situation_id = p_situation_id
      and ss.subject_id = ordered_target.subject_id
    returning ss.subject_id, ss.kanban_status, ss.kanban_order
  )
  select ut.subject_id, ut.kanban_status, ut.kanban_order
  from updated_target ut
  order by ut.kanban_order asc;
end;
$$;

comment on function public.move_situation_kanban_subject(uuid, uuid, text, integer) is
  'Déplace une carte vers une colonne kanban cible et réordonne atomiquement les colonnes source et cible.';

grant execute on function public.move_situation_kanban_subject(uuid, uuid, text, integer) to authenticated;
revoke all on function public.move_situation_kanban_subject(uuid, uuid, text, integer) from public;

commit;
