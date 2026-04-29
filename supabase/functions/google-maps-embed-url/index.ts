import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function toFiniteNumber(value: unknown, fallback: number | null = null): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const googleMapsEmbedApiKey = Deno.env.get("GOOGLE_MAPS_EMBED_API_KEY") || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase env missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!googleMapsEmbedApiKey) {
      return new Response(JSON.stringify({ error: "GOOGLE_MAPS_EMBED_API_KEY is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const latitude = toFiniteNumber(body?.latitude);
    const longitude = toFiniteNumber(body?.longitude);
    const zoom = Math.max(3, Math.min(21, toFiniteNumber(body?.zoom, 14) || 14));
    const mapType = String(body?.mapType || "roadmap").trim() || "roadmap";

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return new Response(JSON.stringify({ error: "latitude and longitude are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const embedUrl = new URL("https://www.google.com/maps/embed/v1/place");
    embedUrl.searchParams.set("key", googleMapsEmbedApiKey);
    embedUrl.searchParams.set("q", `${latitude},${longitude}`);
    embedUrl.searchParams.set("zoom", String(zoom));
    embedUrl.searchParams.set("maptype", mapType);

    return new Response(JSON.stringify({ embedUrl: embedUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
