-- Directory people + project collaborator person model (idempotent)

create table if not exists public.directory_people (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text generated always as (lower(btrim(email))) stored,
  first_name text,
  last_name text,
  company text,
  linked_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint directory_people_email_normalized_unique unique (email_normalized)
);

alter table public.directory_people enable row level security;

create index if not exists idx_directory_people_email_normalized
  on public.directory_people(email_normalized);

create index if not exists idx_directory_people_linked_user_id
  on public.directory_people(linked_user_id);

create unique index if not exists idx_directory_people_linked_user_id_unique
  on public.directory_people(linked_user_id)
  where linked_user_id is not null;

drop trigger if exists trg_directory_people_updated_at on public.directory_people;
create trigger trg_directory_people_updated_at
before update on public.directory_people
for each row execute function public.set_updated_at();

drop policy if exists directory_people_open_all on public.directory_people;
create policy directory_people_open_all
on public.directory_people
for all
to anon, authenticated
using (true)
with check (true);

insert into public.directory_people (
  email,
  first_name,
  last_name,
  company,
  linked_user_id,
  created_by_user_id
)
select distinct on (lower(btrim(coalesce(up.public_email, pc.collaborator_email, au.email, ''))))
  btrim(coalesce(up.public_email, pc.collaborator_email, au.email)) as email,
  nullif(btrim(coalesce(up.first_name, '')), '') as first_name,
  nullif(btrim(coalesce(up.last_name, '')), '') as last_name,
  nullif(btrim(coalesce(up.company, '')), '') as company,
  pc.collaborator_user_id as linked_user_id,
  pc.invited_by_user_id as created_by_user_id
from public.project_collaborators pc
left join auth.users au on au.id = pc.collaborator_user_id
left join public.user_public_profiles up on up.user_id = pc.collaborator_user_id
where btrim(coalesce(up.public_email, pc.collaborator_email, au.email, '')) <> ''
on conflict (email_normalized) do update
set
  first_name = coalesce(public.directory_people.first_name, excluded.first_name),
  last_name = coalesce(public.directory_people.last_name, excluded.last_name),
  company = coalesce(public.directory_people.company, excluded.company),
  linked_user_id = coalesce(public.directory_people.linked_user_id, excluded.linked_user_id),
  created_by_user_id = coalesce(public.directory_people.created_by_user_id, excluded.created_by_user_id);

update public.directory_people dp
set linked_user_id = au.id
from auth.users au
where dp.linked_user_id is null
  and btrim(coalesce(au.email, '')) <> ''
  and dp.email_normalized = lower(btrim(au.email));

create or replace function public.link_directory_person_to_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  if p_user_id is null then
    return;
  end if;

  select lower(btrim(email))
    into v_email
  from auth.users
  where id = p_user_id;

  if v_email is null or v_email = '' then
    return;
  end if;

  update public.directory_people
  set linked_user_id = p_user_id
  where email_normalized = v_email
    and (linked_user_id is null or linked_user_id = p_user_id);
end;
$$;

create or replace function public.handle_auth_user_link_directory_person()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.link_directory_person_to_user(new.id);
  return new;
end;
$$;

drop trigger if exists trg_auth_users_link_directory_person on auth.users;
create trigger trg_auth_users_link_directory_person
after insert on auth.users
for each row execute function public.handle_auth_user_link_directory_person();

select public.link_directory_person_to_user(id)
from auth.users;

alter table public.project_collaborators
  add column if not exists person_id uuid;

update public.project_collaborators pc
set person_id = dp.id
from public.directory_people dp
where pc.person_id is null
  and (
    (pc.collaborator_user_id is not null and dp.linked_user_id = pc.collaborator_user_id)
    or (btrim(coalesce(pc.collaborator_email, '')) <> '' and dp.email_normalized = lower(btrim(pc.collaborator_email)))
  );

insert into public.directory_people (
  email,
  linked_user_id,
  created_by_user_id
)
select distinct
  btrim(coalesce(au.email, pc.collaborator_email)) as email,
  pc.collaborator_user_id,
  pc.invited_by_user_id
from public.project_collaborators pc
left join auth.users au on au.id = pc.collaborator_user_id
where pc.person_id is null
  and btrim(coalesce(au.email, pc.collaborator_email, '')) <> ''
on conflict (email_normalized) do update
set linked_user_id = coalesce(public.directory_people.linked_user_id, excluded.linked_user_id);

update public.project_collaborators pc
set person_id = dp.id
from public.directory_people dp
where pc.person_id is null
  and dp.email_normalized = lower(
    btrim(
      coalesce(
        pc.collaborator_email,
        (select au.email from auth.users au where au.id = pc.collaborator_user_id),
        ''
      )
    )
  );

alter table public.project_collaborators
  alter column collaborator_user_id drop not null;

alter table public.project_collaborators
  alter column person_id set not null;

create index if not exists idx_project_collaborators_person_id
  on public.project_collaborators(person_id);

alter table public.project_collaborators
  drop constraint if exists project_collaborators_unique_assignment;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_collaborators_unique_person_assignment'
      and conrelid = 'public.project_collaborators'::regclass
  ) then
    alter table public.project_collaborators
      add constraint project_collaborators_unique_person_assignment unique (project_id, person_id, project_lot_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_collaborators_person_id_fkey'
      and conrelid = 'public.project_collaborators'::regclass
  ) then
    alter table public.project_collaborators
      add constraint project_collaborators_person_id_fkey
      foreign key (person_id) references public.directory_people(id) on delete cascade;
  end if;
end
$$;

create or replace function public.set_project_collaborator_person_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_person record;
  v_user_email text;
begin
  if new.person_id is not null then
    select dp.id, dp.email, dp.linked_user_id
      into v_person
    from public.directory_people dp
    where dp.id = new.person_id;

    if new.collaborator_user_id is null then
      new.collaborator_user_id := v_person.linked_user_id;
    end if;

    if new.collaborator_email is null or btrim(new.collaborator_email) = '' then
      new.collaborator_email := v_person.email;
    end if;
  elsif new.collaborator_user_id is not null then
    select au.email
      into v_user_email
    from auth.users au
    where au.id = new.collaborator_user_id;

    if v_user_email is not null and btrim(v_user_email) <> '' then
      insert into public.directory_people (email, linked_user_id, created_by_user_id)
      values (btrim(v_user_email), new.collaborator_user_id, new.invited_by_user_id)
      on conflict (email_normalized) do update
      set linked_user_id = coalesce(public.directory_people.linked_user_id, excluded.linked_user_id);

      select dp.id, dp.email, dp.linked_user_id
        into v_person
      from public.directory_people dp
      where dp.email_normalized = lower(btrim(v_user_email));

      new.person_id := v_person.id;

      if new.collaborator_email is null or btrim(new.collaborator_email) = '' then
        new.collaborator_email := v_person.email;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_collaborators_email on public.project_collaborators;
drop trigger if exists trg_project_collaborators_person_defaults on public.project_collaborators;
create trigger trg_project_collaborators_person_defaults
before insert or update on public.project_collaborators
for each row execute function public.set_project_collaborator_person_defaults();

create or replace view public.project_collaborators_view as
select
  pc.id,
  pc.project_id,
  pc.person_id,
  pc.collaborator_user_id,
  dp.linked_user_id,
  pc.project_lot_id,
  pc.collaborator_email,
  pc.invited_by_user_id,
  pc.status,
  pc.created_at,
  pc.updated_at,
  coalesce(nullif(btrim(dp.first_name), ''), nullif(btrim(up.first_name), ''), '') as first_name,
  coalesce(nullif(btrim(dp.last_name), ''), nullif(btrim(up.last_name), ''), '') as last_name,
  trim(concat_ws(' ', coalesce(nullif(btrim(dp.first_name), ''), nullif(btrim(up.first_name), ''), ''), coalesce(nullif(btrim(dp.last_name), ''), nullif(btrim(up.last_name), ''), ''))) as full_name,
  coalesce(nullif(btrim(dp.email), ''), nullif(btrim(up.public_email), ''), nullif(btrim(pc.collaborator_email), '')) as email,
  coalesce(nullif(btrim(dp.company), ''), nullif(btrim(up.company), ''), '') as company,
  case when coalesce(dp.linked_user_id, pc.collaborator_user_id) is not null then 'mdall_user' else 'directory_person' end as source_type,
  lc.id as lot_catalog_id,
  lc.group_code as role_group_code,
  lc.group_label as role_group_label,
  lc.code as role_code,
  lc.label as role_label
from public.project_collaborators pc
join public.directory_people dp on dp.id = pc.person_id
left join public.user_public_profiles up on up.user_id = coalesce(dp.linked_user_id, pc.collaborator_user_id)
left join public.project_lots pl on pl.id = pc.project_lot_id
left join public.lot_catalog lc on lc.id = pl.lot_catalog_id;

grant select on public.project_collaborators_view to anon, authenticated;

create or replace function public.search_project_collaborator_candidates(
  p_query text default '',
  p_project_id uuid default null,
  p_limit integer default 8
)
returns table (
  candidate_key text,
  source_type text,
  person_id uuid,
  user_id uuid,
  linked_user_id uuid,
  email text,
  first_name text,
  last_name text,
  full_name text,
  company text
)
language sql
stable
security definer
set search_path = public, auth
as $$
with params as (
  select
    lower(btrim(coalesce(p_query, ''))) as query_normalized,
    greatest(1, least(coalesce(p_limit, 8), 20)) as result_limit,
    p_project_id as project_id
),
current_project_people as (
  select distinct on (dp.email_normalized)
    coalesce(dp.id::text, dp.email_normalized) as candidate_key,
    case when dp.linked_user_id is not null then 'mdall_user' else 'directory_person' end as source_type,
    dp.id as person_id,
    dp.linked_user_id as user_id,
    dp.linked_user_id as linked_user_id,
    dp.email,
    coalesce(dp.first_name, '') as first_name,
    coalesce(dp.last_name, '') as last_name,
    trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))) as full_name,
    coalesce(dp.company, '') as company,
    dp.email_normalized as email_lower,
    0 as priority
  from public.project_collaborators pc
  join public.directory_people dp on dp.id = pc.person_id
  cross join params p
  where p.project_id is not null
    and pc.project_id = p.project_id
    and (
      p.query_normalized = ''
      or dp.email_normalized like '%' || p.query_normalized || '%'
      or lower(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, '')))) like '%' || p.query_normalized || '%'
      or lower(coalesce(dp.company, '')) like '%' || p.query_normalized || '%'
    )
),
mdall_users as (
  select
    coalesce(dp.id::text, au.id::text) as candidate_key,
    'mdall_user' as source_type,
    dp.id as person_id,
    au.id as user_id,
    coalesce(dp.linked_user_id, au.id) as linked_user_id,
    coalesce(nullif(btrim(dp.email), ''), nullif(btrim(up.public_email), ''), au.email) as email,
    coalesce(nullif(btrim(dp.first_name), ''), coalesce(up.first_name, ''), '') as first_name,
    coalesce(nullif(btrim(dp.last_name), ''), coalesce(up.last_name, ''), '') as last_name,
    trim(concat_ws(' ', coalesce(nullif(btrim(dp.first_name), ''), coalesce(up.first_name, ''), ''), coalesce(nullif(btrim(dp.last_name), ''), coalesce(up.last_name, ''), ''))) as full_name,
    coalesce(nullif(btrim(dp.company), ''), coalesce(up.company, ''), '') as company,
    lower(btrim(coalesce(nullif(btrim(dp.email), ''), nullif(btrim(up.public_email), ''), au.email, ''))) as email_lower,
    1 as priority
  from auth.users au
  left join public.user_public_profiles up on up.user_id = au.id
  left join public.directory_people dp
    on dp.linked_user_id = au.id
    or dp.email_normalized = lower(btrim(coalesce(nullif(btrim(up.public_email), ''), au.email, '')))
  cross join params p
  where auth.uid() is not null
    and (
      p.query_normalized = ''
      or lower(btrim(coalesce(nullif(btrim(dp.email), ''), nullif(btrim(up.public_email), ''), au.email, ''))) like '%' || p.query_normalized || '%'
      or lower(trim(concat_ws(' ', coalesce(nullif(btrim(dp.first_name), ''), coalesce(up.first_name, ''), ''), coalesce(nullif(btrim(dp.last_name), ''), coalesce(up.last_name, ''), '')))) like '%' || p.query_normalized || '%'
      or lower(coalesce(nullif(btrim(dp.company), ''), coalesce(up.company, ''), '')) like '%' || p.query_normalized || '%'
    )
),
global_directory_exact as (
  select
    dp.id::text as candidate_key,
    case when dp.linked_user_id is not null then 'mdall_user' else 'directory_person' end as source_type,
    dp.id as person_id,
    dp.linked_user_id as user_id,
    dp.linked_user_id as linked_user_id,
    dp.email,
    coalesce(dp.first_name, '') as first_name,
    coalesce(dp.last_name, '') as last_name,
    trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))) as full_name,
    coalesce(dp.company, '') as company,
    dp.email_normalized as email_lower,
    2 as priority
  from public.directory_people dp
  cross join params p
  where auth.uid() is not null
    and p.query_normalized <> ''
    and dp.email_normalized = p.query_normalized
),
raw_candidates as (
  select * from current_project_people
  union all
  select * from mdall_users
  union all
  select * from global_directory_exact
),
deduped as (
  select distinct on (email_lower)
    candidate_key,
    source_type,
    person_id,
    user_id,
    linked_user_id,
    email,
    first_name,
    last_name,
    full_name,
    company,
    email_lower,
    priority
  from raw_candidates
  where email_lower <> ''
  order by email_lower, priority asc, case when linked_user_id is not null then 0 else 1 end, full_name asc, email asc
)
select
  candidate_key,
  source_type,
  person_id,
  user_id,
  linked_user_id,
  email,
  first_name,
  last_name,
  full_name,
  company
from deduped
cross join params p
order by
  case when email_lower = p.query_normalized then 0 else 1 end,
  priority asc,
  lower(full_name) asc,
  email_lower asc
limit (select result_limit from params);
$$;

grant execute on function public.search_project_collaborator_candidates(text, uuid, integer) to authenticated;

alter table public.subjects
  add column if not exists assignee_person_id uuid;

update public.subjects s
set assignee_person_id = dp.id
from public.directory_people dp
where s.assignee_person_id is null
  and s.assignee_user_id is not null
  and dp.linked_user_id = s.assignee_user_id;

create index if not exists idx_subjects_assignee_person_id
  on public.subjects(assignee_person_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_assignee_person_id_fkey'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public.subjects
      add constraint subjects_assignee_person_id_fkey
      foreign key (assignee_person_id) references public.directory_people(id) on delete set null;
  end if;
end
$$;
