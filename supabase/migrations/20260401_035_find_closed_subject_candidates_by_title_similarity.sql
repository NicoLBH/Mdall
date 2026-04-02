create or replace function public.find_closed_subject_candidates(
  p_project_id uuid,
  p_query_title text,
  p_limit integer default 10
)
returns table (
  subject_id uuid,
  current_title text,
  current_description text,
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
    s.current_title,
    s.current_description,
    s.status,
    s.priority,
    s.closed_at,
    similarity(s.current_title, p_query_title) as similarity_score
  from public.subjects s
  where s.project_id = p_project_id
    and s.status in ('closed', 'closed_duplicate', 'closed_invalid', 'closed_replaced')
    and p_query_title is not null
    and length(trim(p_query_title)) > 0
  order by similarity(s.current_title, p_query_title) desc,
           s.closed_at desc nulls last,
           s.updated_at desc nulls last
  limit greatest(p_limit, 1);
$$;
