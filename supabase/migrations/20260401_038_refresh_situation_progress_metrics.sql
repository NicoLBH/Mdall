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
