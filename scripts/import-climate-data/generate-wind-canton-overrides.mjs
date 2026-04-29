import { buildInsertStatement, escapeSqlString, normalizeCantonName, readJsonFile, writeSqlFile } from './helpers.mjs';
const SOURCE_PATH='apps/web/js/services/zoning/wind-canton-regions.json';
const OUTPUT_PATH='supabase/seed-data/climate/007_wind_canton_overrides.sql';
console.log('[climate-import] wind-canton-overrides start');
const rows=[];
for (const [department_code, zoneGroups] of (await readJsonFile(SOURCE_PATH))) {
  for (const [resolved_zone, cantonNames] of zoneGroups) {
    for (const canton_name of cantonNames) {
      rows.push({department_code:String(department_code),canton_name:String(canton_name),canton_name_normalized:normalizeCantonName(canton_name),resolved_zone:String(resolved_zone),source_payload:`${escapeSqlString(JSON.stringify({department_code,resolved_zone,canton_name}))}::jsonb`});
    }
  }
}
const sql=buildInsertStatement({tableName:'public.mdall_climate_wind_canton_overrides',columns:['department_code','canton_name','canton_name_normalized','resolved_zone','source_payload'],rows,onConflictClause:`ON CONFLICT (department_code, canton_name_normalized) DO UPDATE\nSET canton_name = EXCLUDED.canton_name,\n    resolved_zone = EXCLUDED.resolved_zone,\n    source_payload = EXCLUDED.source_payload,\n    updated_at = now()`,useRawColumns:new Set(['source_payload'])});
await writeSqlFile(OUTPUT_PATH,`-- Generated from ${SOURCE_PATH}\n${sql}`);
console.log('[climate-import] wind-canton-overrides written');
