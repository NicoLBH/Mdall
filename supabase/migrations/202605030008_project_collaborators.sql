-- Project collaborators + user lookup RPC (idempotent)

create table if not exists public.project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  collaborator_user_id uuid not null references auth.users(id) on delete cascade,
  project_lot_id uuid not null references public.project_lots(id) on delete cascade,
  collaborator_email text,
  invited_by_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'Actif',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_collaborators_unique_assignment unique (project_id, collaborator_user_id, project_lot_id)
);

alter table public.project_collaborators enable row level security;

create index if not exists idx_project_collaborators_project_id
  on public.project_collaborators(project_id);

create index if not exists idx_project_collaborators_user_id
  on public.project_collaborators(collaborator_user_id);

create index if not exists idx_project_collaborators_project_lot_id
  on public.project_collaborators(project_lot_id);

drop trigger if exists trg_project_collaborators_updated_at on public.project_collaborators;
create trigger trg_project_collaborators_updated_at
before update on public.project_collaborators
for each row execute function public.set_updated_at();

drop policy if exists project_collaborators_open_all on public.project_collaborators;
create policy project_collaborators_open_all
on public.project_collaborators
for all
to anon, authenticated
using (true)
with check (true);


create or replace view public.project_collaborators_view as
select
  pc.id,
  pc.project_id,
  pc.collaborator_user_id,
  pc.project_lot_id,
  pc.collaborator_email,
  pc.invited_by_user_id,
  pc.status,
  pc.created_at,
  pc.updated_at,
  coalesce(up.first_name, '') as first_name,
  coalesce(up.last_name, '') as last_name,
  trim(concat_ws(' ', coalesce(up.first_name, ''), coalesce(up.last_name, ''))) as full_name,
  coalesce(up.public_email, pc.collaborator_email) as email,
  coalesce(up.company, '') as company,
  lc.id as lot_catalog_id,
  lc.group_code as role_group_code,
  lc.group_label as role_group_label,
  lc.code as role_code,
  lc.label as role_label
from public.project_collaborators pc
left join public.user_public_profiles up on up.user_id = pc.collaborator_user_id
left join public.project_lots pl on pl.id = pc.project_lot_id
left join public.lot_catalog lc on lc.id = pl.lot_catalog_id;

grant select on public.project_collaborators_view to anon, authenticated;
create or replace function public.set_project_collaborator_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.collaborator_email is null or btrim(new.collaborator_email) = '' then
    select coalesce(nullif(btrim(up.public_email), ''), nullif(btrim(au.email), ''))
      into new.collaborator_email
    from auth.users au
    left join public.user_public_profiles up on up.user_id = au.id
    where au.id = new.collaborator_user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_collaborators_email on public.project_collaborators;
create trigger trg_project_collaborators_email
before insert or update on public.project_collaborators
for each row execute function public.set_project_collaborator_email();

create or replace function public.search_project_collaborator_candidates(
  p_query text default '',
  p_limit integer default 8
)
returns table (
  user_id uuid,
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
  select
    up.user_id,
    coalesce(nullif(btrim(up.public_email), ''), au.email) as email,
    coalesce(up.first_name, '') as first_name,
    coalesce(up.last_name, '') as last_name,
    trim(concat_ws(' ', coalesce(up.first_name, ''), coalesce(up.last_name, ''))) as full_name,
    coalesce(up.company, '') as company
  from auth.users au
  left join public.user_public_profiles up on up.user_id = au.id
  where auth.uid() is not null
    and (
      btrim(coalesce(p_query, '')) = ''
      or lower(coalesce(up.public_email, au.email, '')) like '%' || lower(btrim(coalesce(p_query, ''))) || '%'
      or lower(trim(concat_ws(' ', coalesce(up.first_name, ''), coalesce(up.last_name, '')))) like '%' || lower(btrim(coalesce(p_query, ''))) || '%'
    )
  order by
    case when lower(coalesce(up.public_email, au.email, '')) = lower(btrim(coalesce(p_query, ''))) then 0 else 1 end,
    case when lower(trim(concat_ws(' ', coalesce(up.first_name, ''), coalesce(up.last_name, '')))) like lower(btrim(coalesce(p_query, ''))) || '%' then 0 else 1 end,
    lower(trim(concat_ws(' ', coalesce(up.first_name, ''), coalesce(up.last_name, '')))),
    lower(coalesce(up.public_email, au.email, ''))
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$$;

grant execute on function public.search_project_collaborator_candidates(text, integer) to authenticated;
