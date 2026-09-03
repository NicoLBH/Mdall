/**
 * L'utilitaire « Incendie — Habitation », côté serveur.
 *
 * ## Pourquoi le raisonnement ne descend pas dans le navigateur
 *
 * Le référentiel est public : n'importe qui peut lire l'arrêté du 31 janvier
 * 1986. Ce qui ne l'est pas, c'est son **dépouillement** — le découpage de
 * chaque phrase en conditions élémentaires, l'ordre dans lequel elles se lisent,
 * et les conditions implicites qu'une longue phrase transporte sans le dire.
 * C'est ce travail-là qui a un prix, et il n'a aucune raison de voyager avec
 * chaque page.
 *
 * La fonction rend donc, pour un cas donné : ce qui a été conclu, l'article et
 * la phrase qui l'ont décidé, ce qu'il reste à demander, et la carte du graphe.
 * Elle ne rend jamais la table des règles ni les branches non prises.
 *
 * ## Elle ne garde rien
 *
 * Aucun état entre deux appels, aucune écriture en base, aucune lecture de la
 * mémoire du projet. Les réponses viennent de l'écran, le raisonnement y
 * retourne. C'est ce qui permet de rejouer un cas à l'identique un an plus tard.
 */

import { requireUser } from "../_shared/require-user.ts";
import { consulter, demander, VERSION } from "./corpus.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

/**
 * Combien de réponses au plus dans un appel.
 *
 * Le référentiel n'en compte que quelques dizaines : au-delà, ce n'est plus un
 * cas, c'est quelqu'un qui cherche à faire travailler la fonction pour rien.
 */
const REPONSES_MAX = 200;

function json(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: jsonHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: jsonHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const qui = await requireUser(req, corsHeaders);
  if ("response" in qui) return qui.response;

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return json({ error: "Corps de requête illisible." }, 400);
  }

  const { reponses, produit } = (corps ?? {}) as { reponses?: Record<string, unknown>; produit?: string };
  const donnees = reponses && typeof reponses === "object" ? reponses : {};
  if (Object.keys(donnees).length > REPONSES_MAX) {
    return json({ error: `Au plus ${REPONSES_MAX} réponses par appel.` }, 400);
  }

  try {
    // Deux formes d'appel. L'écran veut tout : les questions qui restent, les
    // modules conclus, le graphe. Le copilote veut une chose et une seule — le
    // degré coupe-feu des planchers — avec de quoi la défendre.
    if (typeof produit === "string" && produit) {
      return json({ version: VERSION, reponse: demander(produit, donnees) });
    }
    return json(consulter(donnees));
  } catch (erreur) {
    return json({ error: erreur instanceof Error ? erreur.message : String(erreur) }, 400);
  }
});
