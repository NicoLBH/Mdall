import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

export async function readJsonFile(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  const rawContent = await readFile(absolutePath, 'utf8');
  return JSON.parse(rawContent);
}

export function escapeSqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

export function normalizeCantonName(value) {
  if (!value) {
    return '';
  }

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  return escapeSqlString(value);
}

export function buildInsertStatement({ tableName, columns, rows, onConflictClause = '', useRawColumns = new Set() }) {
  if (!rows.length) {
    return `-- No rows generated for ${tableName}.`;
  }

  const formattedColumns = columns.join(', ');
  const formattedRows = rows
    .map((row) => {
      const values = columns.map((column) => {
        if (useRawColumns.has(column)) {
          return row[column] ?? 'NULL';
        }

        return buildSqlValue(row[column]);
      });
      return `  (${values.join(', ')})`;
    })
    .join(',\n');

  const suffix = onConflictClause ? `\n${onConflictClause}` : '';

  return `INSERT INTO ${tableName} (${formattedColumns})\nVALUES\n${formattedRows}${suffix};`;
}

export async function writeSqlFile(relativeOutputPath, sqlContent) {
  const absolutePath = path.resolve(projectRoot, relativeOutputPath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${sqlContent.trim()}\n`, 'utf8');
  return absolutePath;
}
