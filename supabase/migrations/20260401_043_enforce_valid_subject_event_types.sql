alter table public.subject_history
  drop constraint if exists subject_history_event_type_check;

alter table public.subject_history
  add constraint subject_history_event_type_check
  check (
    event_type in (
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
      'subject_status_changed'
    )
  );
