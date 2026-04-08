-- Soft removal for project collaborators + removal date in view (idempotent)

alter table public.project_collaborators
  add column if not exists removed_at timestamptz;

update public.project_collaborators
set removed_at = null
where status = 'Actif' and removed_at is not null;

create index if not exists idx_project_collaborators_removed_at
  on public.project_collaborators(removed_at);

drop view if exists public.project_collaborators_view;
create view public.project_collaborators_view as
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
  pc.removed_at,
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
