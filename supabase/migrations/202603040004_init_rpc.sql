create or replace function public.find_open_subject_candidates(
  p_project_id uuid,
  p_query_title text,
  p_limit integer default 10
)
returns table (
  subject_id uuid,
  title text,
  description text,
  status text,
  priority text,
  similarity_score real
)
language sql
stable
as $$
  select
    s.id as subject_id,
    s.title,
    s.description,
    s.status,
    s.priority,
    similarity(s.title, p_query_title) as similarity_score
  from public.subjects s
  where s.project_id = p_project_id
    and s.status = 'open'
    and s.title is not null
    and p_query_title is not null
    and length(trim(p_query_title)) > 0
  order by similarity(s.title, p_query_title) desc,
           s.updated_at desc nulls last,
           s.created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.find_closed_subject_candidates(
  p_project_id uuid,
  p_query_title text,
  p_limit integer default 10
)
returns table (
  subject_id uuid,
  title text,
  description text,
  status text,
  priority text,
  closed_at timestamptz,
  similarity_score real
)
language sql
stable
as $$
  select
    s.id as subject_id,
    s.title,
    s.description,
    s.status,
    s.priority,
    s.closed_at,
    similarity(s.title, p_query_title) as similarity_score
  from public.subjects s
  where s.project_id = p_project_id
    and s.status in ('closed', 'closed_duplicate', 'closed_invalid', 'closed_replaced')
    and s.title is not null
    and p_query_title is not null
    and length(trim(p_query_title)) > 0
  order by similarity(s.title, p_query_title) desc,
           s.closed_at desc nulls last,
           s.updated_at desc nulls last
  limit greatest(p_limit, 1);
$$;

create or replace function public.find_situation_candidates(
  p_project_id uuid,
  p_query_text text,
  p_limit integer default 10
)
returns table (
  situation_id uuid,
  title text,
  description text,
  status text,
  progress_percent numeric,
  similarity_score real
)
language sql
stable
as $$
  select
    si.id as situation_id,
    si.title,
    si.description,
    si.status,
    si.progress_percent,
    greatest(
      similarity(si.title, p_query_text),
      similarity(coalesce(si.description, ''), p_query_text)
    ) as similarity_score
  from public.situations si
  where si.project_id = p_project_id
    and p_query_text is not null
    and length(trim(p_query_text)) > 0
  order by greatest(
             similarity(si.title, p_query_text),
             similarity(coalesce(si.description, ''), p_query_text)
           ) desc,
           si.updated_at desc,
           si.created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.find_parent_subject_candidates(
  p_project_id uuid,
  p_query_title text,
  p_limit integer default 10
)
returns table (
  subject_id uuid,
  title text,
  description text,
  priority text,
  status text,
  situation_id uuid,
  parent_subject_id uuid,
  similarity_score real
)
language sql
stable
as $$
  select
    s.id as subject_id,
    s.title,
    s.description,
    s.priority,
    s.status,
    s.situation_id,
    s.parent_subject_id,
    similarity(s.title, p_query_title) as similarity_score
  from public.subjects s
  where s.project_id = p_project_id
    and s.status = 'open'
    and s.title is not null
    and p_query_title is not null
    and length(trim(p_query_title)) > 0
  order by
    case when s.parent_subject_id is null then 0 else 1 end asc,
    similarity(s.title, p_query_title) desc,
    s.updated_at desc nulls last,
    s.created_at desc
  limit greatest(p_limit, 1);
$$;

create or replace function public.refresh_situation_progress(
  p_situation_id uuid
)
returns table (
  situation_id uuid,
  total_subjects integer,
  closed_subjects integer,
  progress_percent numeric,
  status text
)
language plpgsql
as $$
declare
  v_total_subjects integer;
  v_closed_subjects integer;
  v_progress_percent numeric;
  v_status text;
begin
  select count(*)
  into v_total_subjects
  from public.subjects s
  where s.situation_id = p_situation_id
    and coalesce(s.status, '') <> 'closed_duplicate';

  select count(*)
  into v_closed_subjects
  from public.subjects s
  where s.situation_id = p_situation_id
    and s.status in ('closed', 'closed_invalid', 'closed_replaced');

  if v_total_subjects = 0 then
    v_progress_percent := 0;
    v_status := 'open';
  else
    v_progress_percent := round((v_closed_subjects::numeric / v_total_subjects::numeric) * 100, 2);

    if v_closed_subjects = 0 then
      v_status := 'in_progress';
    elsif v_closed_subjects = v_total_subjects then
      v_status := 'closed';
    else
      v_status := 'in_progress';
    end if;
  end if;

  update public.situations
  set
    progress_percent = v_progress_percent,
    status = v_status,
    updated_at = now(),
    closed_at = case when v_status = 'closed' then coalesce(closed_at, now()) else null end
  where id = p_situation_id;

  return query
  select
    si.id,
    v_total_subjects,
    v_closed_subjects,
    si.progress_percent,
    si.status
  from public.situations si
  where si.id = p_situation_id;
end;
$$;
