alter table public.subjects
add constraint subjects_type_check
check (subject_type in ('explicit_problem', 'validation_point', 'missing_or_inconsistency'));

alter table public.subjects
add constraint subjects_priority_check
check (priority in ('low', 'medium', 'high', 'critical'));

alter table public.subjects
add constraint subjects_status_check
check (status in ('open', 'reviewed', 'dismissed'));
