-- Add an exact unique index for Supabase/PostgREST upserts targeting
-- onConflict: "project_id,fact_key,source_type,source_ref".
create unique index if not exists ux_project_context_facts_project_key_source_type_source_ref
  on public.project_context_facts(project_id, fact_key, source_type, source_ref);

comment on index public.ux_project_context_facts_project_key_source_type_source_ref is
  'Required exact unique index for Supabase/PostgREST upsert onConflict: "project_id,fact_key,source_type,source_ref".';
