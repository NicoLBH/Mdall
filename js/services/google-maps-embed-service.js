function readMetaContent(name = "") {
  const meta = document.querySelector(`meta[name="${name}"]`);
  return String(meta?.getAttribute("content") || "").trim();
}

export function getGoogleMapsEmbedApiKey() {
  const fromConfig = String(globalThis?.MDALL_CONFIG?.googleMapsEmbedApiKey || "").trim();
  if (fromConfig) return fromConfig;

  return readMetaContent("google-maps-embed-api-key");
}

export function hasGoogleMapsEmbedApiKey() {
  return Boolean(getGoogleMapsEmbedApiKey());
}

export function buildGoogleMapsPlaceEmbedUrl({ latitude = null, longitude = null, zoom = 14 } = {}) {
  const key = getGoogleMapsEmbedApiKey();
  const lat = Number(latitude);
  const lon = Number(longitude);
  const safeZoom = Math.max(3, Math.min(21, Number(zoom) || 14));

  if (!key || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "";
  }

  const url = new URL("https://www.google.com/maps/embed/v1/place");
  url.searchParams.set("key", key);
  url.searchParams.set("q", `${lat},${lon}`);
  url.searchParams.set("zoom", String(safeZoom));
  url.searchParams.set("maptype", "roadmap");
  return url.toString();
}
