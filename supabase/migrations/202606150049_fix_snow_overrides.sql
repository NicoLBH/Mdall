-- 202606_fix_snow_overrides.sql

BEGIN;

-- 88 Vosges : correction des zones selon tableau 2 Eurocode neige
UPDATE public.mdall_climate_snow_canton_overrides
SET
  resolved_zone = 'A1',
  source_payload = jsonb_set(source_payload, '{resolved_zone}', '"A1"', true),
  updated_at = now()
WHERE department_code = '88'
  AND canton_name_normalized IN (
    'bulgneville',
    'chatenois',
    'coussey',
    'lamarche',
    'mirecourt',
    'neufchateau',
    'vittel'
  );

UPDATE public.mdall_climate_snow_canton_overrides
SET
  resolved_zone = 'C1',
  source_payload = jsonb_set(source_payload, '{resolved_zone}', '"C1"', true),
  updated_at = now()
WHERE department_code = '88'
  AND canton_name_normalized = 'tous les autres cantons';

-- Libellés corrigés selon tableau officiel

-- Ain : Ponte-de-Veyle
UPDATE public.mdall_climate_snow_canton_overrides
SET
  canton_name = 'Ponte-de-Veyle',
  canton_name_normalized = 'ponte de veyle',
  source_payload = jsonb_build_object(
    'department_code', '01',
    'canton_name', 'Ponte-de-Veyle',
    'resolved_zone', resolved_zone
  ),
  updated_at = now()
WHERE department_code = '01'
  AND canton_name_normalized = 'pont de veyle';

-- Moselle : Volmuster
UPDATE public.mdall_climate_snow_canton_overrides
SET
  canton_name = 'Volmuster',
  canton_name_normalized = 'volmuster',
  source_payload = jsonb_build_object(
    'department_code', '57',
    'canton_name', 'Volmuster',
    'resolved_zone', resolved_zone
  ),
  updated_at = now()
WHERE department_code = '57'
  AND canton_name_normalized = 'volmunster';

-- Pyrénées-Orientales : Saillagouse
UPDATE public.mdall_climate_snow_canton_overrides
SET
  canton_name = 'Saillagouse',
  canton_name_normalized = 'saillagouse',
  source_payload = jsonb_build_object(
    'department_code', '66',
    'canton_name', 'Saillagouse',
    'resolved_zone', resolved_zone
  ),
  updated_at = now()
WHERE department_code = '66'
  AND canton_name_normalized = 'saillegouse';

COMMIT;
