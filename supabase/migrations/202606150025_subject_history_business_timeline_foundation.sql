-- Timeline métier foundation:
-- `public.subject_history` is the single source of truth for business timeline activities.
-- Conversation timeline data remains in `public.subject_message_events` and must not be mixed here.

-- 1) Extend subject_history event types for business timeline activities.
alter table if exists public.subject_history
  drop constraint if exists subject_history_event_type_check;

alter table if exists public.subject_history
  add constraint subject_history_event_type_check
  check (
    event_type in (
      -- legacy / existing values kept for backward compatibility
      'subject_created',
      'subject_enriched',
      'subject_reopened',
      'subject_closed',
      'subject_marked_duplicate',
      'subject_replaced',
      'subject_link_created',
      'subject_child_created',
      'subject_parent_assigned',
      'subject_moved_to_situation',
      'subject_moved_to_milestone',
      'subject_assignee_changed',
      'subject_title_updated',
      'subject_description_updated',
      'subject_status_changed',

      -- normalized business timeline event types
      'subject_assignees_changed',
      'subject_labels_changed',
      'subject_situations_changed',
      'subject_objectives_changed',
      'subject_parent_added',
      'subject_parent_removed',
      'subject_child_added',
      'subject_child_removed',
      'subject_blocked_by_added',
      'subject_blocked_by_removed',
      'subject_blocking_for_added',
      'subject_blocking_for_removed'
    )
  );

comment on table public.subject_history is
  'Business timeline source of truth for subject activity history. Conversation events stay in subject_message_events.';

comment on column public.subject_history.event_type is
  'Business event discriminator used by the subject timeline. Use normalized event types for UI mapping.';

comment on column public.subject_history.event_payload is
  'Normalized payload for business timeline activities. Preferred keys: action, field, before, after, delta, counterpart_subject_id, counterpart_subject_number, counterpart_subject_title, result_label/display.';

-- 2) Optional helper read model for future timeline merge (conversation + business activity).
--    This helper intentionally excludes subject creation from display activities.
create or replace function public.list_subject_business_timeline_events(
  p_subject_id uuid,
  p_limit integer default 200,
  p_before timestamptz default null
)
returns table (
  id uuid,
  project_id uuid,
  subject_id uuid,
  event_type text,
  actor_type text,
  actor_label text,
  actor_user_id uuid,
  created_at timestamptz,
  timeline_title text,
  timeline_description text,
  event_payload jsonb,
  normalized_payload jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    h.id,
    h.project_id,
    h.subject_id,
    h.event_type,
    h.actor_type,
    h.actor_label,
    h.actor_user_id,
    h.created_at,
    h.title as timeline_title,
    h.description as timeline_description,
    h.event_payload,
    jsonb_build_object(
      'action', coalesce(h.event_payload->>'action', split_part(h.event_type, '_', array_length(string_to_array(h.event_type, '_'), 1))),
      'field', coalesce(h.event_payload->>'field', h.event_type),
      'before', coalesce(h.event_payload->'before', '{}'::jsonb),
      'after', coalesce(h.event_payload->'after', '{}'::jsonb),
      'delta', coalesce(h.event_payload->'delta', '{}'::jsonb),
      'counterpart_subject_id', h.event_payload->'counterpart_subject_id',
      'counterpart_subject_number', h.event_payload->'counterpart_subject_number',
      'counterpart_subject_title', h.event_payload->'counterpart_subject_title',
      'display', coalesce(h.event_payload->'display', '{}'::jsonb),
      'result_label', h.event_payload->'result_label'
    ) as normalized_payload
  from public.subject_history h
  where h.subject_id = p_subject_id
    and h.event_type <> 'subject_created'
    and (
      p_before is null
      or h.created_at < p_before
    )
  order by h.created_at desc
  limit greatest(coalesce(p_limit, 200), 1);
$$;

comment on function public.list_subject_business_timeline_events(uuid, integer, timestamptz) is
  'Normalized reader for business timeline events from subject_history only (source of truth). Excludes subject_created display activity.';

create index if not exists idx_subject_history_business_timeline
  on public.subject_history(subject_id, created_at desc)
  where event_type in (
    'subject_title_updated',
    'subject_description_updated',
    'subject_assignees_changed',
    'subject_labels_changed',
    'subject_situations_changed',
    'subject_objectives_changed',
    'subject_parent_added',
    'subject_parent_removed',
    'subject_child_added',
    'subject_child_removed',
    'subject_blocked_by_added',
    'subject_blocked_by_removed',
    'subject_blocking_for_added',
    'subject_blocking_for_removed',
    'subject_closed',
    'subject_reopened'
  );
