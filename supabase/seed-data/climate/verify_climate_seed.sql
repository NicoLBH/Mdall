-- Row counts
select 'mdall_climate_commune_cantons' as table_name, count(*) from public.mdall_climate_commune_cantons
union all select 'mdall_climate_snow_departments', count(*) from public.mdall_climate_snow_departments
union all select 'mdall_climate_snow_canton_overrides', count(*) from public.mdall_climate_snow_canton_overrides
union all select 'mdall_climate_wind_departments', count(*) from public.mdall_climate_wind_departments
union all select 'mdall_climate_wind_canton_overrides', count(*) from public.mdall_climate_wind_canton_overrides
union all select 'mdall_climate_frost_departments', count(*) from public.mdall_climate_frost_departments;

-- No CP850/mojibake residue should remain in canton lookup rows.
select count(*) as corrupted_canton_lookup_rows
from public.mdall_climate_commune_cantons
where insee_code is null
  and (
    canton_name_2014 like '%�%'
    or canton_name_2014 like '%%'
    or canton_name_2014 like '%%'
    or canton_name_2014 like '%%'
    or canton_name_2014 like '%%'
    or canton_name_2014 like '%%'
    or canton_name_2014 like '%%'
    or canton_name_2014 like '%%'
    or canton_name_2014 like '%%'
    or canton_name_2014_normalized like '%�%'
    or canton_name_2014_normalized like '%%'
    or canton_name_2014_normalized like '%%'
    or canton_name_2014_normalized like '%%'
    or canton_name_2014_normalized like '%%'
    or canton_name_2014_normalized like '%%'
    or canton_name_2014_normalized like '%%'
    or canton_name_2014_normalized like '%%'
    or canton_name_2014_normalized like '%%'
  );

-- Snow overrides that do not match any 2014 canton lookup row.
select snow.department_code, snow.canton_name, snow.canton_name_normalized, snow.resolved_zone
from public.mdall_climate_snow_canton_overrides snow
left join public.mdall_climate_commune_cantons cc
  on cc.insee_code is null
 and cc.department_code = snow.department_code
 and cc.canton_name_2014_normalized = snow.canton_name_normalized
where snow.canton_name_normalized <> 'tous les autres cantons'
  and snow.canton_name not ilike '%(tous cantons)%'
  and cc.canton_code_2014 is null
order by snow.department_code, snow.canton_name;

-- Wind overrides that do not match any 2014 canton lookup row.
select wind.department_code, wind.canton_name, wind.canton_name_normalized, wind.resolved_zone
from public.mdall_climate_wind_canton_overrides wind
left join public.mdall_climate_commune_cantons cc
  on cc.insee_code is null
 and cc.department_code = wind.department_code
 and cc.canton_name_2014_normalized = wind.canton_name_normalized
where wind.canton_name_normalized <> 'tous les autres cantons'
  and wind.canton_name not ilike '%(tous cantons)%'
  and cc.canton_code_2014 is null
order by wind.department_code, wind.canton_name;


-- Aggregate overrides such as "Dole (tous cantons)" are not exact canton labels.
-- They are listed separately because they require grouped matching logic if needed.
select 'snow_aggregate_override' as kind, department_code, canton_name, canton_name_normalized, resolved_zone
from public.mdall_climate_snow_canton_overrides
where canton_name ilike '%(tous cantons)%'
order by department_code, canton_name;

select 'wind_aggregate_override' as kind, department_code, canton_name, canton_name_normalized, resolved_zone
from public.mdall_climate_wind_canton_overrides
where canton_name ilike '%(tous cantons)%'
order by department_code, canton_name;

-- Regression case: Mutigney must resolve through Montmirey-le-Château -> B1.
select commune.insee_code,
       commune.canton_code_2014,
       commune.department_code,
       lookup.canton_name_2014 as lookup_canton_name_2014,
       lookup.canton_name_2014_normalized as lookup_canton_name_2014_normalized,
       snow.canton_name as snow_override_canton_name,
       snow.resolved_zone as expected_snow_zone
from public.mdall_climate_commune_cantons commune
left join public.mdall_climate_commune_cantons lookup
  on lookup.insee_code is null
 and lookup.canton_code_2014 = commune.canton_code_2014
left join public.mdall_climate_snow_canton_overrides snow
  on snow.department_code = commune.department_code
 and snow.canton_name_normalized = lookup.canton_name_2014_normalized
where commune.insee_code = '39377';

-- Commune 44182 -> canton code 4432 + department.
select insee_code, canton_code_2014, department_code
from public.mdall_climate_commune_cantons
where insee_code = '44182';

-- Canton lookup 4432 -> Pornic (2014).
select insee_code, canton_code_2014, canton_name_2014, canton_name_current
from public.mdall_climate_commune_cantons
where insee_code is null and canton_code_2014 = '4432';

-- Wind overrides for department 44, including "Tous les autres cantons".
select department_code, canton_name_normalized, resolved_zone
from public.mdall_climate_wind_canton_overrides
where department_code = '44'
order by canton_name_normalized;

-- Wind department rows for 44 must include multi-zone (2 and 3).
select department_code, resolved_zone
from public.mdall_climate_wind_departments
where department_code = '44'
order by resolved_zone;

-- Snow and frost department rows for 44.
select department_code, resolved_zone
from public.mdall_climate_snow_departments
where department_code = '44';

select department_code, h0_min_m, h0_max_m, h0_default_m
from public.mdall_climate_frost_departments
where department_code = '44';

-- Guardrails: Tableau 2 Eurocode neige, Vosges must be A1/B1/C1 (not A2/C2).
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM public.mdall_climate_snow_canton_overrides
  WHERE department_code = '88'
    AND (
      (canton_name_normalized IN ('bulgneville','chatenois','coussey','lamarche','mirecourt','neufchateau','vittel') AND resolved_zone <> 'A1')
      OR (canton_name_normalized = 'tous les autres cantons' AND resolved_zone <> 'C1')
    );

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Invalid snow overrides for Vosges (88): % row(s) do not match Tableau 2', bad_count;
  END IF;
END $$;

-- Guardrails: libellés aligned with Tableau 2 and lookup rows used by the resolver.
DO $$
DECLARE
  bad_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM public.mdall_climate_snow_canton_overrides
  WHERE (department_code = '01' AND canton_name_normalized = 'pont de veyle')
     OR (department_code = '57' AND canton_name_normalized = 'volmunster')
     OR (department_code = '66' AND canton_name_normalized = 'saillegouse');

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Invalid legacy snow override labels still present: % row(s)', bad_count;
  END IF;

  SELECT COUNT(*) INTO bad_count
  FROM public.mdall_climate_commune_cantons
  WHERE insee_code IS NULL
    AND (
      (department_code = '01' AND canton_code_2014 = '0127' AND canton_name_2014_normalized <> 'ponte de veyle')
      OR (department_code = '57' AND canton_code_2014 = '5736' AND canton_name_2014_normalized <> 'volmuster')
      OR (department_code = '66' AND canton_code_2014 = '6613' AND canton_name_2014_normalized <> 'saillagouse')
    );

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Invalid canton lookup labels for table-2 snow overrides: % row(s)', bad_count;
  END IF;
END $$;
