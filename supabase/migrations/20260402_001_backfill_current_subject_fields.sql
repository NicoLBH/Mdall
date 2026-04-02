update public.subjects
set
  current_title = coalesce(current_title, title),
  current_description = coalesce(current_description, description)
where current_title is null
   or current_description is null;
