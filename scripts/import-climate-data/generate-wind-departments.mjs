import { buildInsertStatement, escapeSqlString, readJsonFile, writeSqlFile } from './helpers.mjs';
const SOURCE_PATH='apps/web/js/services/zoning/wind-regions-departments.json';
const OUTPUT_PATH='supabase/seed-data/climate/006_wind_departments.sql';
console.log('[climate-import] wind-departments start');
const rows=(await readJsonFile(SOURCE_PATH)).flatMap(([department_code,department_name,zones])=>zones.map((resolved_zone)=>({department_code:String(department_code),resolved_zone:String(resolved_zone),source_payload:`${escapeSqlString(JSON.stringify({department_code,department_name,resolved_zone}))}::jsonb`})));
const sql=buildInsertStatement({tableName:'public.mdall_climate_wind_departments',columns:['department_code','resolved_zone','source_payload'],rows,onConflictClause:`ON CONFLICT (department_code, resolved_zone) DO UPDATE\nSET source_payload = EXCLUDED.source_payload,\n    updated_at = now()`,useRawColumns:new Set(['source_payload'])});
await writeSqlFile(OUTPUT_PATH,`-- Generated from ${SOURCE_PATH}\n${sql}`);
console.log('[climate-import] wind-departments written');
