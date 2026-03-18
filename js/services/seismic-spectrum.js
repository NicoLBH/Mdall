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

const SOIL_PARAMETER_BY_ZONE_GROUP = {
  zone1to4: {
    A: 1,
    B: 1.35,
    C: 1.5,
    D: 1.6,
    E: 1.8
  },
  zone5: {
    A: 1,
    B: 1.2,
    C: 1.15,
    D: 1.35,
    E: 1.4
  }
};

const SPECTRAL_PERIODS_BY_ZONE_GROUP = {
  zone1to4: {
    A: { TB: 0.03, TC: 0.2, TD: 2.5 },
    B: { TB: 0.05, TC: 0.25, TD: 2.5 },
    C: { TB: 0.06, TC: 0.4, TD: 2 },
    D: { TB: 0.1, TC: 0.6, TD: 1.5 },
    E: { TB: 0.08, TC: 0.45, TD: 1.25 }
  },
  zone5: {
    A: { TB: 0.15, TC: 0.4, TD: 2 },
    B: { TB: 0.15, TC: 0.5, TD: 2 },
    C: { TB: 0.2, TC: 0.6, TD: 2 },
    D: { TB: 0.2, TC: 0.8, TD: 2 },
    E: { TB: 0.15, TC: 0.5, TD: 2 }
  }
};

export function normalizeImportanceCode(value = "") {
  const raw = String(value || "").trim().toUpperCase();
  if (["I", "II", "III", "IV"].includes(raw)) return raw;

  const match = String(value || "").match(/CAT[ÉE]GORIE D['’ ]IMPORTANCE\s+(I{1,3}|IV)/i);
  if (match) return String(match[1]).toUpperCase();

  return "II";
}

export function normalizeSoilClass(value = "") {
  const raw = String(value || "").trim().toUpperCase();
  return ["A", "B", "C", "D", "E"].includes(raw) ? raw : "A";
}

function getZoneGroup(zoneSismique = "") {
  return String(zoneSismique || "").trim() === "5" ? "zone5" : "zone1to4";
}

function parsePositiveNumber(value, fallback = 0) {
  const normalized = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

export function computeDampingCorrection(dampingRatio = 5) {
  const xi = parsePositiveNumber(dampingRatio, 5);
  const eta = Math.max((10 / (5 + xi)) ** 0.5, 0.55);
  return {
    xi,
    eta
  };
}

export function getSoilParameter(zoneSismique = "", soilClass = "A") {
  const zoneGroup = getZoneGroup(zoneSismique);
  const normalizedSoilClass = normalizeSoilClass(soilClass);
  return SOIL_PARAMETER_BY_ZONE_GROUP[zoneGroup]?.[normalizedSoilClass] ?? null;
}

export function getSpectralPeriods(zoneSismique = "", soilClass = "A") {
  const zoneGroup = getZoneGroup(zoneSismique);
  const normalizedSoilClass = normalizeSoilClass(soilClass);
  const periods = SPECTRAL_PERIODS_BY_ZONE_GROUP[zoneGroup]?.[normalizedSoilClass];
  return periods ? { ...periods } : { TB: null, TC: null, TD: null };
}

export function computeElasticResponseValue({ T = 0, ag = null, S = null, eta = null, TB = null, TC = null, TD = null } = {}) {
  if (![ag, S, eta, TB, TC, TD].every((value) => Number.isFinite(value))) {
    return null;
  }

  if (!Number.isFinite(T) || T < 0) {
    return null;
  }

  if (T <= TB) {
    return ag * S * (1 + (T / TB) * (eta * 2.5 - 1));
  }

  if (T <= TC) {
    return ag * S * eta * 2.5;
  }

  if (T <= TD) {
    return ag * S * eta * 2.5 * (TC / T);
  }

  if (T <= 4) {
    return ag * S * eta * 2.5 * ((TC * TD) / (T * T));
  }

  return null;
}

export function buildElasticResponseSpectrumTable(input = {}, { step = 0.1, maxPeriod = 4 } = {}) {
  const parsedStep = parsePositiveNumber(step, 0.1) || 0.1;
  const parsedMaxPeriod = parsePositiveNumber(maxPeriod, 4) || 4;
  const sizing = getSeismicSizingValues(input);
  const rows = [];

  for (let T = 0; T <= parsedMaxPeriod + 1e-9; T += parsedStep) {
    const roundedT = Number(T.toFixed(4));
    rows.push({
      T: roundedT,
      Se: computeElasticResponseValue({
        T: roundedT,
        ag: sizing.ag,
        S: sizing.S,
        eta: sizing.eta,
        TB: sizing.TB,
        TC: sizing.TC,
        TD: sizing.TD
      })
    });
  }

  return rows;
}

export function getSeismicSizingValues({ zoneSismique = "", importanceCategory = "", soilClass = "A", dampingRatio = 5 } = {}) {
  const zone = String(zoneSismique || "").trim();
  const importanceCode = normalizeImportanceCode(importanceCategory);
  const normalizedSoilClass = normalizeSoilClass(soilClass);
  const agr = Object.prototype.hasOwnProperty.call(AGR_BY_ZONE, zone) ? AGR_BY_ZONE[zone] : null;
  const gl = Object.prototype.hasOwnProperty.call(GI_BY_IMPORTANCE, importanceCode) ? GI_BY_IMPORTANCE[importanceCode] : null;
  const ag = Number.isFinite(agr) && Number.isFinite(gl) ? agr * gl : null;
  const { xi, eta } = computeDampingCorrection(dampingRatio);
  const S = getSoilParameter(zone, normalizedSoilClass);
  const { TB, TC, TD } = getSpectralPeriods(zone, normalizedSoilClass);

  return {
    zoneSismique: zone || null,
    importanceCode,
    soilClass: normalizedSoilClass,
    xi,
    agr,
    gl,
    ag,
    eta,
    S,
    TB,
    TC,
    TD
  };
}
