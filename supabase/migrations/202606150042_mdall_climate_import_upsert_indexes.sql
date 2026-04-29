-- Support idempotent climate seed upserts for step 2 imports.
alter table public.mdall_climate_commune_cantons
  add column if not exists canton_name_2014_normalized text,
  add column if not exists canton_name_current_normalized text;

create unique index if not exists ux_mdall_climate_commune_cantons_canton_code_2014_null_insee
  on public.mdall_climate_commune_cantons(canton_code_2014)
  where insee_code is null;

create unique index if not exists ux_mdall_climate_snow_departments_department_zone
  on public.mdall_climate_snow_departments(department_code, resolved_zone);

create unique index if not exists ux_mdall_climate_wind_departments_department_zone
  on public.mdall_climate_wind_departments(department_code, resolved_zone);

create unique index if not exists ux_mdall_climate_snow_canton_overrides_department_canton
  on public.mdall_climate_snow_canton_overrides(department_code, canton_name_normalized);

create unique index if not exists ux_mdall_climate_wind_canton_overrides_department_canton
  on public.mdall_climate_wind_canton_overrides(department_code, canton_name_normalized);

create unique index if not exists ux_mdall_climate_frost_departments_department
  on public.mdall_climate_frost_departments(department_code);
