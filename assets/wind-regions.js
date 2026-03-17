// wind-regions.js
// Version 1 - Base tableau 4.3 + structure 4.4 + logique de résolution
// Source : Eurocode - Zones de vent France

// ============================
// TABLEAU 4.3 (complet)
// ============================

export const WIND_DEPARTMENT_REGIONS = {
  "01": [1, 2],
  "02": [2],
  "03": [2],
  "04": [1, 2],
  "05": [1, 2],
  "06": [1, 2],
  "07": [2],
  "08": [2],
  "09": [2],
  "10": [2],
  "11": [2, 3],
  "12": [2],
  "13": [3],
  "14": [2],
  "15": [1, 2],
  "16": [1],
  "17": [1, 2, 3],
  "18": [2],
  "19": [1],
  "2B": [3, 4],
  "2A": [3, 4],
  "21": [1, 2],
  "22": [3],
  "23": [1],
  "24": [1],
  "25": [1, 2],
  "26": [2],
  "27": [2],
  "28": [2],
  "29": [3],
  "30": [2, 3],
  "31": [1, 2],
  "32": [1],
  "33": [1, 2],
  "34": [3],
  "35": [2],
  "36": [2],
  "37": [2],
  "38": [1, 2],
  "39": [1],
  "40": [1, 2],
  "41": [2],
  "42": [2],
  "43": [2],
  "44": [2, 3],
  "45": [2],
  "46": [1],
  "47": [1],
  "48": [2],
  "49": [2],
  "50": [2],
  "51": [2],
  "52": [2],
  "53": [2],
  "54": [2],
  "55": [2],
  "56": [3],
  "57": [2],
  "58": [2],
  "59": [2, 3],
  "60": [2],
  "61": [2],
  "62": [2, 3],
  "63": [2],
  "64": [2],
  "65": [1],
  "66": [3],
  "67": [2],
  "68": [2],
  "69": [2],
  "70": [1, 2],
  "71": [2],
  "72": [2],
  "73": [1],
  "74": [1],
  "75": [2],
  "76": [2, 3],
  "77": [2],
  "78": [2],
  "79": [2],
  "80": [2, 3],
  "81": [1, 2],
  "82": [1],
  "83": [2],
  "84": [2],
  "85": [3],
  "86": [1],
  "87": [1],
  "88": [2],
  "89": [2],
  "90": [2],
  "91": [2],
  "92": [2],
  "93": [2],
  "94": [2],
  "95": [2]
};

// ============================
// TABLEAU 4.4 (à compléter)
// ============================
//


export const WIND_COMMUNE_REGION_SPLITS = {



//
// ============================
// NORMALISATION
// ============================

export function normalizeCommuneName(name) {
  if (!name) return null;

  return name
    .toLowerCase()
    .normalize("NFD") // supprime accents
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================
// EXTRACTION DEPARTEMENT
// ============================

export function getDepartmentCodeFromInsee(insee) {
  if (!insee) return null;

  // Corse
  if (insee.startsWith("2A") || insee.startsWith("2B")) {
    return insee.substring(0, 2);
  }

  return insee.substring(0, 2);
}

export function getDepartmentCodeFromPostalCode(postalCode) {
  if (!postalCode) return null;

  const code = postalCode.toString();

  // Corse cas particulier
  if (code.startsWith("20")) return null;

  return code.substring(0, 2);
}

// ============================
// RESOLUTION REGION VENT
// ============================

export function getWindRegion({
  inseeCode = null,
  postalCode = null,
  communeName = null
}) {
  let department = null;

  if (inseeCode) {
    department = getDepartmentCodeFromInsee(inseeCode);
  } else if (postalCode) {
    department = getDepartmentCodeFromPostalCode(postalCode);
  }

  if (!department) {
    return { error: "Impossible de déterminer le département" };
  }

  const regions = WIND_DEPARTMENT_REGIONS[department];

  if (!regions) {
    return { error: "Département non trouvé" };
  }

  // Cas simple
  if (regions.length === 1) {
    return {
      region: regions[0],
      source: "department"
    };
  }

  // Cas multi-régions
  if (!communeName) {
    return {
      ambiguous: true,
      possibleRegions: regions
    };
  }

  const normalized = normalizeCommuneName(communeName);

  const split = WIND_COMMUNE_REGION_SPLITS[department];

  if (!split) {
    return {
      error: "Données communales manquantes pour ce département"
    };
  }

  for (const region of Object.keys(split)) {
    const communes = split[region];

    const found = communes.some(
      (c) => normalizeCommuneName(c) === normalized
    );

    if (found) {
      return {
        region: parseInt(region),
        source: "commune"
      };
    }
  }

  return {
    error: "Commune non trouvée dans le tableau 4.4"
  };
}
