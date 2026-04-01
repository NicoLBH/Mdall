alter table subject_history
add constraint subject_history_actor_type_check
check (
  actor_type in ('system', 'llm', 'user', 'workflow')
);
