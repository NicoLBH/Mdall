-- Required for idempotent UPSERT imports on commune climate mapping.
create unique index if not exists ux_mdall_climate_commune_cantons_insee_code
  on public.mdall_climate_commune_cantons(insee_code);
