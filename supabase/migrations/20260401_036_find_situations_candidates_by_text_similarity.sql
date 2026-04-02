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
    similarity(si.title, p_query_text) as similarity_score
  from public.situations si
  where si.project_id = p_project_id
    and p_query_text is not null
    and length(trim(p_query_text)) > 0
  order by similarity(si.title, p_query_text) desc,
           si.updated_at desc,
           si.created_at desc
  limit greatest(p_limit, 1);
$$;
