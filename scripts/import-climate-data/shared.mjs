import { normalizeCantonName } from './helpers.mjs';

export function resolveDepartmentCodeFromInsee(inseeCode) {
  if (!inseeCode || inseeCode.length < 2) return null;
  if (inseeCode.startsWith('97') || inseeCode.startsWith('98')) return inseeCode.slice(0, 3);
  return inseeCode.slice(0, 2);
}

export function departmentCodeFromCantonCode(cantonCode) {
  if (!cantonCode) return null;
  if (cantonCode.startsWith('2A') || cantonCode.startsWith('2B')) return cantonCode.slice(0, 2);
  if (cantonCode.startsWith('97') || cantonCode.startsWith('98')) return cantonCode.slice(0, 3);
  return cantonCode.slice(0, 2);
}

export function normalizeMany(names = []) {
  return names.map((name) => normalizeCantonName(name)).filter(Boolean);
}
