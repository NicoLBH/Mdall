import { buildInsertStatement, escapeSqlString, readJsonFile, writeSqlFile } from './helpers.mjs';
import { departmentCodeFromCantonCode } from './shared.mjs';

const SOURCE_PATH = 'apps/web/js/services/zoning/canton-names-map.json';
const OUTPUT_PATH = 'supabase/seed-data/climate/003_current_canton_names.sql';
console.log('[climate-import] current-canton-names start');
const mapping = await readJsonFile(SOURCE_PATH);
const rows = Object.entries(mapping).map(([cantonCode2014, cantonNameCurrent]) => ({
  insee_code: null,
  canton_code_2014: String(cantonCode2014),
  canton_name_current: String(cantonNameCurrent),
  canton_name_current_normalized: String(cantonNameCurrent).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['’\-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(),
  department_code: departmentCodeFromCantonCode(String(cantonCode2014)),
  source_payload: `${escapeSqlString(JSON.stringify({ canton_code_2014: String(cantonCode2014), canton_name_current: String(cantonNameCurrent) }))}::jsonb`,
}));
const sql = buildInsertStatement({
  tableName: 'public.mdall_climate_commune_cantons',
  columns: ['insee_code','canton_code_2014','canton_name_current','canton_name_current_normalized','department_code','source_payload'],
  rows,
  onConflictClause: `ON CONFLICT (canton_code_2014) WHERE insee_code IS NULL DO UPDATE\nSET canton_name_current = EXCLUDED.canton_name_current,\n    canton_name_current_normalized = EXCLUDED.canton_name_current_normalized,\n    department_code = EXCLUDED.department_code,\n    source_payload = EXCLUDED.source_payload,\n    updated_at = now()`,
  useRawColumns: new Set(['source_payload']),
});
await writeSqlFile(OUTPUT_PATH, `-- Generated from ${SOURCE_PATH}\n${sql}`);
console.log('[climate-import] current-canton-names written');
