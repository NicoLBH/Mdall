import { buildInsertStatement, escapeSqlString, readJsonFile, writeSqlFile } from './helpers.mjs';
const SOURCE_PATH='apps/web/js/services/zoning/frost-depth-departments.json';
const OUTPUT_PATH='supabase/seed-data/climate/008_frost_departments.sql';
console.log('[climate-import] frost-departments start');
const parse=(v)=>Number(String(v).replace(',','.'));
const rows=(await readJsonFile(SOURCE_PATH)).map(([department_code,department_name,h0_values_raw])=>{const values=h0_values_raw.map(parse).filter(Number.isFinite);return {department_code:String(department_code),h0_min_m:Math.min(...values),h0_max_m:Math.max(...values),h0_default_m:Math.max(...values),source_payload:`${escapeSqlString(JSON.stringify({department_code,department_name,h0_values:h0_values_raw}))}::jsonb`};});
const sql=buildInsertStatement({tableName:'public.mdall_climate_frost_departments',columns:['department_code','h0_min_m','h0_max_m','h0_default_m','source_payload'],rows,onConflictClause:`ON CONFLICT (department_code) DO UPDATE\nSET h0_min_m = EXCLUDED.h0_min_m,\n    h0_max_m = EXCLUDED.h0_max_m,\n    h0_default_m = EXCLUDED.h0_default_m,\n    source_payload = EXCLUDED.source_payload,\n    updated_at = now()`,useRawColumns:new Set(['source_payload'])});
await writeSqlFile(OUTPUT_PATH,`-- Generated from ${SOURCE_PATH}\n${sql}`);
console.log('[climate-import] frost-departments written');
