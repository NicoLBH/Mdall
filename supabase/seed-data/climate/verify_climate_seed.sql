-- Row counts
select 'mdall_climate_commune_cantons' as table_name, count(*) from public.mdall_climate_commune_cantons
union all select 'mdall_climate_snow_departments', count(*) from public.mdall_climate_snow_departments
union all select 'mdall_climate_snow_canton_overrides', count(*) from public.mdall_climate_snow_canton_overrides
union all select 'mdall_climate_wind_departments', count(*) from public.mdall_climate_wind_departments
union all select 'mdall_climate_wind_canton_overrides', count(*) from public.mdall_climate_wind_canton_overrides
union all select 'mdall_climate_frost_departments', count(*) from public.mdall_climate_frost_departments;

-- Key indexes presence
select schemaname, tablename, indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'mdall_climate_commune_cantons','mdall_climate_snow_departments','mdall_climate_snow_canton_overrides',
    'mdall_climate_wind_departments','mdall_climate_wind_canton_overrides','mdall_climate_frost_departments'
  )
order by tablename, indexname;

-- Ensure no public/authenticated SELECT policy exists on mdall_climate_* tables
select
  p.polrelid::regclass as table_name,
  p.polname,
  p.polcmd,
  p.polroles
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname like 'mdall_climate_%'
  and p.polcmd = 'r';

-- Sample dynamic commune lookup (first available commune)
with any_commune as (
  select insee_code from public.mdall_climate_commune_cantons where insee_code is not null order by insee_code limit 1
)
select c.insee_code, c.canton_code_2014, c.canton_name_2014, c.canton_name_current, c.department_code
from public.mdall_climate_commune_cantons c
join any_commune a on a.insee_code = c.insee_code;
