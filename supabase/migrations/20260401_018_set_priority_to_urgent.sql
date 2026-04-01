update public.subjects
set priority = 'urgent'
where id = (
  select id from public.subjects limit 1
);
