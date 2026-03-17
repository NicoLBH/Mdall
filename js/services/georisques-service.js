const COMMUNES_API_URL = "https://geo.api.gouv.fr/communes";
const ADDRESS_API_URL = "https://api-adresse.data.gouv.fr/search/";
const IGN_COMPLETION_API_URL = "https://data.geopf.fr/geocodage/completion/";
const GEORISQUES_API_BASE = "https://www.georisques.gouv.fr/api/v1";

const GEORISQUES_COMMUNE_ENDPOINTS = [
  { key: "risques", label: "Risques", paths: ["gaspar/risques"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "ppr", label: "PPR", paths: ["ppr"] },
  { key: "catnat", label: "CATNAT", paths: ["gaspar/catnat"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "dicrim", label: "DICRIM", paths: ["gaspar/dicrim"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "tim", label: "TIM", paths: ["gaspar/tim"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "papi", label: "PAPI", paths: ["gaspar/papi"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "azi", label: "AZI", paths: ["gaspar/azi"], queryMode: "radiusLatlonOrCodeInsee" },
  { key: "tri", label: "TRI", paths: ["gaspar/tri"], queryMode: "radiusLatlonOrCodeInsee" },
  {
    key: "tri_zonage_reglementaire",
    label: "TRI - Zonage réglementaire",
    paths: ["tri_zonage"],
    queryMode: "latlonOrCodeInsee"
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
    paths: ["rga"],
    queryMode: "latlonOrCodeInsee"
  },
  {
    key: "installations_classees",
    label: "Installations classées",
    paths: ["installations_classees", "installations-classees"]
  }
];

const GEORISQUES_POINT_RADIUS_METERS = 1000;

function safeString(value = "") {
  return String(value ?? "").trim();
}

function normalizeString(value = "") {
  return safeString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toCoordsFromGeometry(geometry) {
  const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];
  return {
    lon: toNumber(coordinates[0]),
    lat: toNumber(coordinates[1])
  };
}

function formatGeorisquesPoint(lon, lat) {
  const safeLon = toNumber(lon);
  const safeLat = toNumber(lat);

  if (!Number.isFinite(safeLon) || !Number.isFinite(safeLat)) {
    return "";
  }

  return `${safeLon},${safeLat}`;
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

function buildEndpointUrl(path, context = {}) {
  const url = new URL(`${GEORISQUES_API_BASE}/${path}`);
  const queryMode = safeString(context.queryMode || "codeInsee");
  const codeInsee = safeString(context.codeInsee);

  if (queryMode === "latlonOrCodeInsee") {
    if (codeInsee) {
      url.searchParams.set("code_insee", codeInsee);
      return url.toString();
    }

    const latlon = formatGeorisquesPoint(context.lon, context.lat);
    if (!latlon) {
      throw new Error("Coordonnées latitude / longitude indisponibles pour cette requête Géorisques.");
    }
    url.searchParams.set("latlon", latlon);
    return url.toString();
  }

  if (queryMode === "radiusLatlonOrCodeInsee") {
    url.searchParams.set("rayon", String(context.radius || GEORISQUES_POINT_RADIUS_METERS));

    if (codeInsee) {
      url.searchParams.set("code_insee", codeInsee);
    } else {
      const latlon = formatGeorisquesPoint(context.lon, context.lat);
      if (!latlon) {
        throw new Error("Coordonnées latitude / longitude indisponibles pour cette requête Géorisques.");
      }
      url.searchParams.set("latlon", latlon);
    }

    url.searchParams.set("page", "1");
    url.searchParams.set("page_size", "10");
    return url.toString();
  }

  url.searchParams.set("code_insee", codeInsee);
  return url.toString();
}

async function fetchFirstAvailableEndpoint(context, endpoint) {
  const attempts = [];

  for (const path of endpoint.paths) {
    let url = "";

    try {
      url = buildEndpointUrl(path, {
        codeInsee: context?.codeInsee,
        lat: context?.lat,
        lon: context?.lon,
        radius: context?.radius,
        queryMode: endpoint?.queryMode || "codeInsee"
      });

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

  const url = `${COMMUNES_API_URL}?codePostal=${encodeURIComponent(safePostalCode)}&nom=${encodeURIComponent(safeCity)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,centre&boost=population&limit=10`;
  const results = await fetchJson(url);
  const items = Array.isArray(results) ? results : [];

  if (!items.length) {
    throw new Error("Aucune commune correspondante trouvée.");
  }

  const normalizedCity = normalizeString(safeCity);
  const exact = items.find((item) => normalizeString(item?.nom) === normalizedCity) || null;
  const matchingPostalCode = items.find((item) => Array.isArray(item?.codesPostaux) && item.codesPostaux.includes(safePostalCode)) || null;
  const best = exact || matchingPostalCode || items[0];
  const centreCoords = toCoordsFromGeometry(best?.centre);

  return {
    name: safeString(best?.nom),
    codeInsee: safeString(best?.code),
    postalCodes: Array.isArray(best?.codesPostaux) ? best.codesPostaux : [],
    departmentCode: safeString(best?.codeDepartement),
    regionCode: safeString(best?.codeRegion),
    population: best?.population ?? null,
    lat: centreCoords.lat,
    lon: centreCoords.lon,
    sourceUrl: url
  };
}

function mapMunicipalityFeature(feature, sourceUrl = "") {
  const properties = feature?.properties || {};
  const coords = toCoordsFromGeometry(feature?.geometry);
  const city = safeString(properties.city || properties.name || properties.label);
  const postalCode = safeString(properties.postcode || properties.postcode_local || "");

  return {
    label: safeString(properties.label || [city, postalCode].filter(Boolean).join(" ")),
    name: city,
    postalCode,
    postalCodes: postalCode ? [postalCode] : [],
    codeInsee: safeString(properties.citycode || properties.code || ""),
    departmentCode: safeString(properties.context || "").split(",")[0]?.trim() || "",
    lat: coords.lat,
    lon: coords.lon,
    sourceUrl
  };
}

export async function searchFrenchCommunes({ query = "", postalCode = "", limit = 6 } = {}) {
  const safeQuery = safeString(query);
  const safePostalCode = safeString(postalCode);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));

  if (safeQuery.length < 2) return [];

  const searchParams = new URLSearchParams({
    q: safePostalCode ? `${safeQuery} ${safePostalCode}` : safeQuery,
    type: "municipality",
    limit: String(safeLimit)
  });

  const url = `${ADDRESS_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);
  const features = Array.isArray(results?.features) ? results.features : [];

  return features
    .map((feature) => mapMunicipalityFeature(feature, url))
    .filter((item) => item.name)
    .sort((a, b) => {
      const exactA = normalizeString(a.name) === normalizeString(safeQuery) ? 1 : 0;
      const exactB = normalizeString(b.name) === normalizeString(safeQuery) ? 1 : 0;
      return exactB - exactA;
    });
}

export async function searchFrenchPostalCodes({ query = "", limit = 6 } = {}) {
  const safeQuery = safeString(query).replace(/\D+/g, "");
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));

  if (safeQuery.length < 2) return [];

  const searchParams = new URLSearchParams({
    q: safeQuery,
    type: "municipality",
    limit: String(safeLimit)
  });

  const url = `${ADDRESS_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);
  const features = Array.isArray(results?.features) ? results.features : [];

  return features
    .map((feature) => mapMunicipalityFeature(feature, url))
    .filter((item) => item.postalCode && item.postalCode.startsWith(safeQuery));
}

function getIgnCompletionItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.completions)) return payload.completions;
  if (Array.isArray(payload?.suggestions)) return payload.suggestions;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function mapIgnCompletionItem(item, sourceUrl = "") {
  const properties = item?.properties || {};
  const label = safeString(
    item?.fulltext ||
    item?.label ||
    item?.text ||
    properties?.fulltext ||
    properties?.label ||
    properties?.name ||
    item?.name
  );

  return {
    label,
    kind: safeString(item?.type || properties?.type || item?.kind || properties?.kind),
    sourceUrl,
    raw: item
  };
}

export async function searchIgnAddresses({ query = "", limit = 6 } = {}) {
  const safeQuery = safeString(query);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 10));

  if (safeQuery.length < 3) return [];

  const searchParams = new URLSearchParams({
    text: safeQuery,
    type: "StreetAddress",
    maximumResponses: String(safeLimit),
    terr: "METROPOLE"
  });

  const url = `${IGN_COMPLETION_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);

  return getIgnCompletionItems(results)
    .map((item) => mapIgnCompletionItem(item, url))
    .filter((item) => item.label);
}

export async function resolveFrenchAddress(query = "") {
  const safeQuery = safeString(query);

  if (!safeQuery) {
    throw new Error("Adresse requise.");
  }

  const searchParams = new URLSearchParams({
    q: safeQuery,
    limit: "1"
  });

  const url = `${ADDRESS_API_URL}?${searchParams.toString()}`;
  const results = await fetchJson(url);
  const feature = Array.isArray(results?.features) ? results.features[0] : null;

  if (!feature) {
    throw new Error("Adresse introuvable.");
  }

  const properties = feature.properties || {};
  const coords = toCoordsFromGeometry(feature.geometry);

  return {
    address: safeString(properties.label || safeQuery),
    city: safeString(properties.city),
    postalCode: safeString(properties.postcode),
    codeInsee: safeString(properties.citycode),
    lat: coords.lat,
    lon: coords.lon,
    sourceUrl: url
  };
}

export async function resolveFrenchCommune({ city = "", postalCode = "" } = {}) {
  const commune = await resolveCommune(city, postalCode);
  return {
    city: commune.name,
    postalCode: commune.postalCodes?.[0] || safeString(postalCode),
    codeInsee: commune.codeInsee,
    lat: commune.lat,
    lon: commune.lon,
    sourceUrl: commune.sourceUrl
  };
}

export async function resolveFrenchPostalCode(postalCode = "") {
  const safePostalCode = safeString(postalCode).replace(/\D+/g, "");

  if (safePostalCode.length < 5) {
    throw new Error("Code postal requis.");
  }

  const url = `${COMMUNES_API_URL}?codePostal=${encodeURIComponent(safePostalCode)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,centre&boost=population&limit=10`;
  const results = await fetchJson(url);
  const items = Array.isArray(results) ? results : [];
  const best = items[0] || null;

  if (!best) {
    throw new Error("Aucune commune correspondante trouvée.");
  }

  const centreCoords = toCoordsFromGeometry(best?.centre);

  return {
    city: safeString(best?.nom),
    postalCode: safePostalCode,
    codeInsee: safeString(best?.code),
    lat: centreCoords.lat,
    lon: centreCoords.lon,
    sourceUrl: url
  };
}

export async function fetchGeorisquesForCommune({ city = "", postalCode = "", latitude = null, longitude = null } = {}) {
  const commune = await resolveCommune(city, postalCode);

  if (!commune.codeInsee) {
    throw new Error("Le code INSEE de la commune n'a pas pu être déterminé.");
  }

  const datasets = await Promise.all(
    GEORISQUES_COMMUNE_ENDPOINTS.map((endpoint) => fetchFirstAvailableEndpoint({
      codeInsee: commune.codeInsee,
      lat: toNumber(latitude) ?? commune.lat,
      lon: toNumber(longitude) ?? commune.lon,
      radius: GEORISQUES_POINT_RADIUS_METERS
    }, endpoint))
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
