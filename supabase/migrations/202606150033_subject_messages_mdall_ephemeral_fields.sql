-- Add Mdall/ephemeral fields on subject messages while preserving existing data.

alter table public.subject_messages
  add column if not exists visibility text not null default 'normal',
  add column if not exists visible_until timestamptz null,
  add column if not exists origin text not null default 'human',
  add column if not exists llm_request_id uuid null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subject_messages_visibility_check'
      AND conrelid = 'public.subject_messages'::regclass
  ) THEN
    ALTER TABLE public.subject_messages
      ADD CONSTRAINT subject_messages_visibility_check
      CHECK (visibility IN ('normal', 'ephemeral'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subject_messages_origin_check'
      AND conrelid = 'public.subject_messages'::regclass
  ) THEN
    ALTER TABLE public.subject_messages
      ADD CONSTRAINT subject_messages_origin_check
      CHECK (origin IN ('human', 'mdall'));
  END IF;
END
$$;

create index if not exists idx_subject_messages_subject_created
  on public.subject_messages(subject_id, created_at asc);

create index if not exists idx_subject_messages_subject_visibility_visible_until
  on public.subject_messages(subject_id, visibility, visible_until);

create index if not exists idx_subject_messages_llm_request_id
  on public.subject_messages(llm_request_id)
  where llm_request_id is not null;

-- Keep direct client inserts human-only. Mdall messages will be inserted via future
-- security-definer RPCs that enforce project access and lock rules server-side.
drop policy if exists subject_messages_insert on public.subject_messages;
create policy subject_messages_insert
on public.subject_messages
for insert
to authenticated
with check (
  public.can_access_project_subject_conversation(project_id)
  and public.is_subject_conversation_locked(subject_id) = false
  and author_person_id = public.current_person_id()
  and origin = 'human'
);
