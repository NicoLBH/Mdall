import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";

const SUPABASE_URL = getSupabaseUrl();

const toFinite = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

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
  const lat = toFinite(latitude);
  const lon = toFinite(longitude);
  const safeZoom = Math.max(3, Math.min(21, toFinite(zoom, 14)));

  if (!key || !Number.isFinite(lat) || !Number.isFinite(lon)) return "";

  const url = new URL("https://www.google.com/maps/embed/v1/place");
  url.searchParams.set("key", key);
  url.searchParams.set("q", `${lat},${lon}`);
  url.searchParams.set("zoom", String(safeZoom));
  url.searchParams.set("maptype", String(mapType || "roadmap"));
  return url.toString();
}

const fetchGoogleMapsPlaceEmbedUrlFromEdge = ({ latitude = null, longitude = null, zoom = 14, mapType = "roadmap" } = {}) => {
  const lat = toFinite(latitude);
  const lon = toFinite(longitude);
  const safeZoom = Math.max(3, Math.min(21, toFinite(zoom, 14)));
  const safeMapType = String(mapType || "roadmap").trim() || "roadmap";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return Promise.resolve("");


  return buildSupabaseAuthHeaders({ "Content-Type": "application/json", Accept: "application/json" })
    .then((headers) => fetch(`${SUPABASE_URL}/functions/v1/google-maps-embed-url`, {
      method: "POST",
      headers,
      body: JSON.stringify({ latitude: lat, longitude: lon, zoom: safeZoom, mapType: safeMapType })
    }))
    .then(async (response) => {
      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`google-maps-embed-url failed (${response.status}): ${details}`);
      }
      return response.json().catch(() => ({}));
    })
    .then((data) => {
      const embedUrl = String(data?.embedUrl || "").trim();
      if (!embedUrl) {
        throw new Error("google-maps-embed-url returned an empty embedUrl");
      }
      return embedUrl;
    })
    .catch((error) => {
      console.error("[google-maps-embed] url.fetch.failure", {
        latitude: lat,
        longitude: lon,
        zoom: safeZoom,
        mapType: safeMapType,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    });
};

export { fetchGoogleMapsPlaceEmbedUrlFromEdge as fetchGoogleMapsPlaceEmbedUrl };
