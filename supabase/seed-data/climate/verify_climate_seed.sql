-- Row counts
select 'mdall_climate_commune_cantons' as table_name, count(*) from public.mdall_climate_commune_cantons
union all select 'mdall_climate_snow_departments', count(*) from public.mdall_climate_snow_departments
union all select 'mdall_climate_snow_canton_overrides', count(*) from public.mdall_climate_snow_canton_overrides
union all select 'mdall_climate_wind_departments', count(*) from public.mdall_climate_wind_departments
union all select 'mdall_climate_wind_canton_overrides', count(*) from public.mdall_climate_wind_canton_overrides
union all select 'mdall_climate_frost_departments', count(*) from public.mdall_climate_frost_departments;

-- Commune 44182 -> canton code 4432 + department
select insee_code, canton_code_2014, department_code
from public.mdall_climate_commune_cantons
where insee_code = '44182';

-- Canton lookup 4432 -> Pornic (2014)
select insee_code, canton_code_2014, canton_name_2014, canton_name_current
from public.mdall_climate_commune_cantons
where insee_code is null and canton_code_2014 = '4432';

-- Wind overrides for department 44, including "Tous les autres cantons"
select department_code, canton_name_normalized, resolved_zone
from public.mdall_climate_wind_canton_overrides
where department_code = '44'
order by canton_name_normalized;

-- Wind department rows for 44 must include multi-zone (2 and 3)
select department_code, resolved_zone
from public.mdall_climate_wind_departments
where department_code = '44'
order by resolved_zone;

-- Snow and frost department rows for 44
select department_code, resolved_zone
from public.mdall_climate_snow_departments
where department_code = '44';

select department_code, h0_min_m, h0_max_m, h0_default_m
from public.mdall_climate_frost_departments
where department_code = '44';
