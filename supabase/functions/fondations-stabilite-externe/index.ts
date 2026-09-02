/**
 * L'utilitaire « Fondations — calcul », côté serveur.
 *
 * Pourquoi ici et pas dans le navigateur : le calcul parcourt 388 combinaisons
 * d'actions et il est destiné à grossir — la stabilité interne et l'annexe F de
 * l'EC8-5 restent à porter. Surtout, c'est une **règle de l'art**, pas un
 * agrément d'affichage : la garder au même endroit que la mémoire du projet,
 * c'est garantir qu'un poste ancien ou un navigateur particulier ne rendent
 * jamais un autre résultat que celui qui fait foi.
 *
 * La fonction ne fait donc que trois choses : vérifier qui appelle, appeler le
 * moteur, rendre ce qu'il a trouvé. Elle n'écrit rien, ne lit rien de la base,
 * et ne garde aucun état entre deux appels — les entrées viennent de l'écran,
 * les sorties y retournent.
 */

import { requireUser } from "../_shared/require-user.ts";
import { calculerStabiliteExterne } from "./calcul.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: jsonHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: jsonHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // La vérification d'identité est faite ici, après le préflight : voir
  // `_shared/require-user.ts` pour la raison.
  const qui = await requireUser(req, corsHeaders);
  if ("response" in qui) return qui.response;

  let entrees: unknown;
  try {
    entrees = await req.json();
  } catch {
    return json({ error: "Corps de requête illisible." }, 400);
  }

  try {
    const resultat = calculerStabiliteExterne((entrees as Record<string, unknown>) ?? {});
    return json({ resultat });
  } catch (erreur) {
    // Un refus de calcul est une réponse, pas une panne : l'écran doit pouvoir
    // dire pourquoi il ne calcule pas, et le dire avec les mots du métier.
    const message = erreur instanceof Error ? erreur.message : String(erreur);
    return json({ error: message }, 400);
  }
});
