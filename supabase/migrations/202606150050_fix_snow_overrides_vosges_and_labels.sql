-- 202606150049_fix_snow_overrides_vosges_and_labels.sql
-- Correctifs selon Tableau 2 Eurocode neige :
-- - Vosges (88) : A1/B1/C1, pas A2/B1/C2
-- - libellés : Ponte-de-Veyle, Volmuster, Saillagouse
-- Cette migration est idempotente et nettoie aussi les doublons de libellés divergents.

BEGIN;

-- 1) Vosges : les cantons listés en A1 dans le tableau 2 ne doivent pas rester en A2.
UPDATE public.mdall_climate_snow_canton_overrides
SET
  resolved_zone = 'A1',
  source_payload = jsonb_build_object(
    'department_code', department_code,
    'canton_name', canton_name,
    'resolved_zone', 'A1'
  ),
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

-- 2) Vosges : fallback départemental = C1, pas C2.
UPDATE public.mdall_climate_snow_canton_overrides
SET
  resolved_zone = 'C1',
  source_payload = jsonb_build_object(
    'department_code', department_code,
    'canton_name', canton_name,
    'resolved_zone', 'C1'
  ),
  updated_at = now()
WHERE department_code = '88'
  AND canton_name_normalized = 'tous les autres cantons';

-- 3) Libellés divergents : supprimer les anciennes variantes si elles existent.
DELETE FROM public.mdall_climate_snow_canton_overrides
WHERE department_code = '01'
  AND canton_name_normalized = 'pont de veyle';

DELETE FROM public.mdall_climate_snow_canton_overrides
WHERE department_code = '57'
  AND canton_name_normalized = 'volmunster';

DELETE FROM public.mdall_climate_snow_canton_overrides
WHERE department_code = '66'
  AND canton_name_normalized = 'saillegouse';

-- 4) Libellés officiels du tableau 2 : créer si absent, sinon mettre à jour.
INSERT INTO public.mdall_climate_snow_canton_overrides (
  department_code,
  canton_name,
  canton_name_normalized,
  resolved_zone,
  source_payload,
  created_at,
  updated_at
)
SELECT
  '01',
  'Ponte-de-Veyle',
  'ponte de veyle',
  'A2',
  jsonb_build_object(
    'department_code', '01',
    'canton_name', 'Ponte-de-Veyle',
    'resolved_zone', 'A2'
  ),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.mdall_climate_snow_canton_overrides
  WHERE department_code = '01'
    AND canton_name_normalized = 'ponte de veyle'
);

UPDATE public.mdall_climate_snow_canton_overrides
SET
  canton_name = 'Ponte-de-Veyle',
  canton_name_normalized = 'ponte de veyle',
  resolved_zone = 'A2',
  source_payload = jsonb_build_object(
    'department_code', '01',
    'canton_name', 'Ponte-de-Veyle',
    'resolved_zone', 'A2'
  ),
  updated_at = now()
WHERE department_code = '01'
  AND canton_name_normalized = 'ponte de veyle';

INSERT INTO public.mdall_climate_snow_canton_overrides (
  department_code,
  canton_name,
  canton_name_normalized,
  resolved_zone,
  source_payload,
  created_at,
  updated_at
)
SELECT
  '57',
  'Volmuster',
  'volmuster',
  'B1',
  jsonb_build_object(
    'department_code', '57',
    'canton_name', 'Volmuster',
    'resolved_zone', 'B1'
  ),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.mdall_climate_snow_canton_overrides
  WHERE department_code = '57'
    AND canton_name_normalized = 'volmuster'
);

UPDATE public.mdall_climate_snow_canton_overrides
SET
  canton_name = 'Volmuster',
  canton_name_normalized = 'volmuster',
  resolved_zone = 'B1',
  source_payload = jsonb_build_object(
    'department_code', '57',
    'canton_name', 'Volmuster',
    'resolved_zone', 'B1'
  ),
  updated_at = now()
WHERE department_code = '57'
  AND canton_name_normalized = 'volmuster';

INSERT INTO public.mdall_climate_snow_canton_overrides (
  department_code,
  canton_name,
  canton_name_normalized,
  resolved_zone,
  source_payload,
  created_at,
  updated_at
)
SELECT
  '66',
  'Saillagouse',
  'saillagouse',
  'C2',
  jsonb_build_object(
    'department_code', '66',
    'canton_name', 'Saillagouse',
    'resolved_zone', 'C2'
  ),
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.mdall_climate_snow_canton_overrides
  WHERE department_code = '66'
    AND canton_name_normalized = 'saillagouse'
);

UPDATE public.mdall_climate_snow_canton_overrides
SET
  canton_name = 'Saillagouse',
  canton_name_normalized = 'saillagouse',
  resolved_zone = 'C2',
  source_payload = jsonb_build_object(
    'department_code', '66',
    'canton_name', 'Saillagouse',
    'resolved_zone', 'C2'
  ),
  updated_at = now()
WHERE department_code = '66'
  AND canton_name_normalized = 'saillagouse';

COMMIT;
