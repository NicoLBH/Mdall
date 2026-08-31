// Qui appelle ?
//
// Les fonctions de Mdall sont déployées avec `--no-verify-jwt`, et il y a une
// raison : le portail rejette alors la requête de préflight du navigateur —
// elle arrive sans en-tête d'autorisation, par construction — et le navigateur
// n'annonce pas un refus d'authentification, il annonce un refus de CORS. Le
// symptôme ne nomme jamais la cause, et on cherche pendant une heure.
//
// La vérification se fait donc **ici**, après que le préflight a reçu sa
// réponse. Ce fichier est ce que le portail ne peut pas faire à notre place.
//
// Ce qui est vérifié : un jeton porteur qui désigne un utilisateur réel. La
// clé anonyme du projet est elle-même un jeton signé — elle passerait une
// simple vérification de présence, et c'est précisément ce qu'elle faisait :
// n'importe qui connaissant l'URL pouvait déclencher un appel payant.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export type RequireUserResult =
  | { user: { id: string; email?: string | null } }
  | { response: Response };

/**
 * L'utilisateur derrière l'appel, ou la réponse à lui rendre.
 *
 * @param req la requête entrante
 * @param headers les en-têtes CORS de la fonction appelante — un 401 sans eux
 *   arriverait au navigateur comme une erreur de CORS, c'est-à-dire comme rien.
 */
export async function requireUser(req: Request, headers: Record<string, string> = {}): Promise<RequireUserResult> {
  const refuser = (message: string, code: string) => ({
    response: new Response(JSON.stringify({ error: message, code }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" }
    })
  });

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return refuser("Missing Authorization bearer token", "AUTH_REQUIRED");
  }

  const token = authHeader.slice(7).trim();
  if (!token) return refuser("Missing Authorization bearer token", "AUTH_REQUIRED");

  const key = anonKey || serviceRoleKey;
  if (!supabaseUrl || !key) {
    // Sans de quoi vérifier, on refuse. Laisser passer « faute de mieux »
    // reviendrait à ne pas avoir de porte, en croyant en avoir une.
    return refuser("Auth is not configured", "AUTH_NOT_CONFIGURED");
  }

  try {
    const client = createClient(supabaseUrl, key);
    const { data, error } = await client.auth.getUser(token);
    const user = data?.user;
    if (error || !user?.id) return refuser("Unauthorized", "UNAUTHORIZED");
    return { user: { id: user.id, email: user.email ?? null } };
  } catch {
    return refuser("Unauthorized", "UNAUTHORIZED");
  }
}
