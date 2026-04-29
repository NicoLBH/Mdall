import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

function toFiniteNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function readMetaContent(name = "") {
  if (typeof document === "undefined") return "";
  const meta = document.querySelector(`meta[name="${name}"]`);
  return String(meta?.getAttribute("content") || "").trim();
}

export function getGoogleMapsEmbedApiKey() {
  const fromConfig = String(globalThis?.MDALL_CONFIG?.googleMapsEmbedApiKey || "").trim();
  if (fromConfig) return fromConfig;
  return readMetaContent("google-maps-embed-api-key");
}

function toFiniteNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function buildGoogleMapsPlaceEmbedUrl({ latitude = null, longitude = null, zoom = 14, mapType = "roadmap" } = {}) {
  const key = getGoogleMapsEmbedApiKey();
  const lat = toFiniteNumber(latitude);
  const lon = toFiniteNumber(longitude);
  const safeZoom = Math.max(3, Math.min(21, toFiniteNumber(zoom, 14)));

  if (!key || !Number.isFinite(lat) || !Number.isFinite(lon)) return "";

  console.info("[google-maps-embed] url.fetch.start", {
    latitude: lat,
    longitude: lon,
    zoom: safeZoom,
    mapType: safeMapType
  });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/google-maps-embed-url`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/json"
    }),
    body: JSON.stringify({
      latitude: lat,
      longitude: lon,
      zoom: safeZoom,
      mapType: safeMapType
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const error = new Error(`google-maps-embed-url failed (${response.status}): ${details}`);
    console.error("[google-maps-embed] url.fetch.failure", {
      latitude: lat,
      longitude: lon,
      zoom: safeZoom,
      mapType: safeMapType,
      message: error.message
    });
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  const embedUrl = String(data?.embedUrl || "").trim();

  if (!embedUrl) {
    const error = new Error("google-maps-embed-url returned an empty embedUrl");
    console.error("[google-maps-embed] url.fetch.failure", {
      latitude: lat,
      longitude: lon,
      zoom: safeZoom,
      mapType: safeMapType,
      message: error.message
    });
    throw error;
  }

  console.info("[google-maps-embed] url.fetch.success", {
    latitude: lat,
    longitude: lon,
    zoom: safeZoom,
    mapType: safeMapType
  });

  return embedUrl;
}

export async function fetchGoogleMapsPlaceEmbedUrl({ latitude = null, longitude = null, zoom = 14, mapType = "roadmap" } = {}) {
  const lat = toFiniteNumber(latitude);
  const lon = toFiniteNumber(longitude);
  const safeZoom = Math.max(3, Math.min(21, toFiniteNumber(zoom, 14)));
  const safeMapType = String(mapType || "roadmap").trim() || "roadmap";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "";
  }

  console.info("[google-maps-embed] url.fetch.start", {
    latitude: lat,
    longitude: lon,
    zoom: safeZoom,
    mapType: safeMapType
  });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/google-maps-embed-url`, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/json"
    }),
    body: JSON.stringify({
      latitude: lat,
      longitude: lon,
      zoom: safeZoom,
      mapType: safeMapType
    })
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const error = new Error(`google-maps-embed-url failed (${response.status}): ${details}`);
    console.error("[google-maps-embed] url.fetch.failure", {
      latitude: lat,
      longitude: lon,
      zoom: safeZoom,
      mapType: safeMapType,
      message: error.message
    });
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  const embedUrl = String(data?.embedUrl || "").trim();

  if (!embedUrl) {
    const error = new Error("google-maps-embed-url returned an empty embedUrl");
    console.error("[google-maps-embed] url.fetch.failure", {
      latitude: lat,
      longitude: lon,
      zoom: safeZoom,
      mapType: safeMapType,
      message: error.message
    });
    throw error;
  }

  console.info("[google-maps-embed] url.fetch.success", {
    latitude: lat,
    longitude: lon,
    zoom: safeZoom,
    mapType: safeMapType
  });

  return embedUrl;
}
