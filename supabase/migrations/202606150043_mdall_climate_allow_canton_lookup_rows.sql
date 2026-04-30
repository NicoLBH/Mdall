-- Allow nullable insee_code for climate canton lookup reference rows used by seeds.
-- - Rows with non-null insee_code represent commune -> canton mappings.
-- - Rows with null insee_code represent canton name lookup reference rows inserted by seeds 002/003.
-- - The partial index on (canton_code_2014) where insee_code is null depends on this behavior.
alter table public.mdall_climate_commune_cantons
  alter column insee_code drop not null;
