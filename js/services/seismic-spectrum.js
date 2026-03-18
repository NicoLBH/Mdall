const AGR_BY_ZONE = {
  "1": 0.4,
  "2": 0.7,
  "3": 1.1,
  "4": 1.6,
  "5": 3
};

const GI_BY_IMPORTANCE = {
  "I": 0.8,
  "II": 1,
  "III": 1.2,
  "IV": 1.4
};

export function normalizeImportanceCode(value = "") {
  const raw = String(value || "").trim().toUpperCase();
  if (["I", "II", "III", "IV"].includes(raw)) return raw;

  const match = String(value || "").match(/CAT[ÉE]GORIE D['’ ]IMPORTANCE\s+(I{1,3}|IV)/i);
  if (match) return String(match[1]).toUpperCase();

  return "II";
}

export function getSeismicSizingValues({ zoneSismique = "", importanceCategory = "" } = {}) {
  const zone = String(zoneSismique || "").trim();
  const importanceCode = normalizeImportanceCode(importanceCategory);
  const agr = Object.prototype.hasOwnProperty.call(AGR_BY_ZONE, zone) ? AGR_BY_ZONE[zone] : null;
  const gl = Object.prototype.hasOwnProperty.call(GI_BY_IMPORTANCE, importanceCode) ? GI_BY_IMPORTANCE[importanceCode] : null;
  const ag = Number.isFinite(agr) && Number.isFinite(gl) ? agr * gl : null;

  return {
    zoneSismique: zone || null,
    importanceCode,
    agr,
    gl,
    ag
  };
}
