import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);
const scripts = [
  'generate-commune-canton-2014.mjs',
  'generate-canton-2014-names.mjs',
  'generate-canton-current-names.mjs',
  'generate-snow-departments.mjs',
  'generate-snow-canton-overrides.mjs',
  'generate-wind-departments.mjs',
  'generate-wind-canton-overrides.mjs',
  'generate-frost-departments.mjs',
];
for (const script of scripts) {
  await run('node', [`scripts/import-climate-data/${script}`], { stdio: 'inherit' });
}
console.log('[climate-import] all imports generated');
