const COMMUNES_API_URL = "https://geo.api.gouv.fr/communes";
const GEORISQUES_API_BASE = "https://www.georisques.gouv.fr/api/v1";

const GEORISQUES_COMMUNE_ENDPOINTS = [
  { key: "risques", label: "Risques", paths: ["risques"] },
  { key: "ppr", label: "PPR", paths: ["ppr"] },
  { key: "catnat", label: "CATNAT", paths: ["catnat"] },
  { key: "dicrim", label: "DICRIM", paths: ["dicrim"] },
  { key: "tim", label: "TIM", paths: ["tim"] },
  { key: "papi", label: "PAPI", paths: ["papi"] },
  { key: "azi", label: "AZI", paths: ["azi"] },
  { key: "tri", label: "TRI", paths: ["tri"] },
  {
    key: "tri_zonage_reglementaire",
    label: "TRI - Zonage réglementaire",
    paths: ["tri_zonage_reglementaire", "tri-zonage-reglementaire"]
  },
  { key: "old", label: "OLD", paths: ["old"] },
  { key: "radon", label: "RADON", paths: ["radon"] },
  {
    key: "zonage_sismique",
    label: "Zonage sismique",
    paths: ["zonage_sismique", "zonage-sismique"]
  },
  { key: "sis", label: "SIS", paths: ["sis"] },
  { key: "cavites", label: "Cavités", paths: ["cavites"] },
  { key: "mvt", label: "Mouvements de terrain", paths: ["mvt"] },
  {
    key: "retrait_gonflement_argiles",
    label: "Retrait gonflement des argiles",
    paths: ["retrait_gonflement_argiles", "retrait-gonflement-argiles"]
  },
  {
    key: "installations_classees",
    label: "Installations classées",
    paths: ["installations_classees", "installations-classees"]
  }
];

function safeString(value = "") {
  return String(value ?? "").trim();
}

function normalizeString(value = "") {
  return safeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

function buildEndpointUrl(path, codeInsee) {
  return `${GEORISQUES_API_BASE}/${path}?code_insee=${encodeURIComponent(codeInsee)}`;
}

async function fetchFirstAvailableEndpoint(codeInsee, endpoint) {
  const attempts = [];

  for (const path of endpoint.paths) {
    const url = buildEndpointUrl(path, codeInsee);
    try {
      const data = await fetchJson(url);
      return {
        key: endpoint.key,
        label: endpoint.label,
        status: "success",
        url,
        data,
        attempts
      };
    } catch (error) {
      attempts.push({
        url,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    key: endpoint.key,
    label: endpoint.label,
    status: "error",
    url: attempts[0]?.url || "",
    data: null,
    attempts,
    error: attempts[attempts.length - 1]?.error || "Requête impossible"
  };
}

async function resolveCommune(city, postalCode) {
  const safeCity = safeString(city);
  const safePostalCode = safeString(postalCode);

  if (!safeCity || !safePostalCode) {
    throw new Error("Ville et code postal requis.");
  }

  const url = `${COMMUNES_API_URL}?codePostal=${encodeURIComponent(safePostalCode)}&nom=${encodeURIComponent(safeCity)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population&boost=population&limit=10`;
  const results = await fetchJson(url);
  const items = Array.isArray(results) ? results : [];

  if (!items.length) {
    throw new Error("Aucune commune correspondante trouvée.");
  }

  const normalizedCity = normalizeString(safeCity);
  const exact = items.find((item) => normalizeString(item?.nom) === normalizedCity) || null;
  const matchingPostalCode = items.find((item) => Array.isArray(item?.codesPostaux) && item.codesPostaux.includes(safePostalCode)) || null;
  const best = exact || matchingPostalCode || items[0];

  return {
    name: safeString(best?.nom),
    codeInsee: safeString(best?.code),
    postalCodes: Array.isArray(best?.codesPostaux) ? best.codesPostaux : [],
    departmentCode: safeString(best?.codeDepartement),
    regionCode: safeString(best?.codeRegion),
    population: best?.population ?? null,
    sourceUrl: url
  };
}


export async function searchFrenchCommunes({ query = "", postalCode = "", limit = 6 } = {}) {
  const safeQuery = safeString(query);
  const safePostalCode = safeString(postalCode);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));

  if (safeQuery.length < 2) return [];

  const searchParams = new URLSearchParams({
    nom: safeQuery,
    boost: "population",
    limit: String(safeLimit),
    fields: "nom,code,codesPostaux,codeDepartement,departement,population"
  });

  if (safePostalCode) {
    searchParams.set("codePostal", safePostalCode);
  }

  const url = `${COMMUNES_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);

  return (Array.isArray(results) ? results : []).map((item) => ({
    name: safeString(item?.nom),
    codeInsee: safeString(item?.code),
    postalCodes: Array.isArray(item?.codesPostaux) ? item.codesPostaux.filter(Boolean).map((value) => safeString(value)) : [],
    departmentCode: safeString(item?.codeDepartement),
    departmentName: safeString(item?.departement?.nom),
    population: item?.population ?? null,
    sourceUrl: url
  })).filter((item) => item.name);
}

export async function fetchGeorisquesForCommune({ city = "", postalCode = "" } = {}) {
  const commune = await resolveCommune(city, postalCode);

  if (!commune.codeInsee) {
    throw new Error("Le code INSEE de la commune n'a pas pu être déterminé.");
  }

  const datasets = await Promise.all(
    GEORISQUES_COMMUNE_ENDPOINTS.map((endpoint) => fetchFirstAvailableEndpoint(commune.codeInsee, endpoint))
  );

  return {
    query: {
      city: safeString(city),
      postalCode: safeString(postalCode)
    },
    commune,
    requestedAt: new Date().toISOString(),
    datasets
  };
}
