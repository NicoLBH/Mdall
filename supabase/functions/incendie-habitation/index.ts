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
 * ## Sauf pour vérifier, et sous serrure
 *
 * Une règle mal lue produit un résultat qui a l'air d'un résultat. Le
 * dépouillement doit donc pouvoir être relu **en face de l'article**, et pas
 * seulement dans le code. C'est le mode inspection : il rend les règles d'un
 * module, dans leur ordre, et rien d'autre du corpus.
 *
 * Il ne s'ouvre que pour les comptes inscrits dans le secret
 * `INCENDIE_INSPECTEURS` — une liste d'adresses ou d'identifiants séparés par
 * des virgules. Secret absent ou vide : personne, pas même celui qui a créé le
 * projet. Un mode de vérification ouvert à tous les collaborateurs serait
 * exactement ce qu'on refusait de faire.
 *
 * ## Elle ne garde rien
 *
 * Aucun état entre deux appels, aucune écriture en base, aucune lecture de la
 * mémoire du projet. Les réponses viennent de l'écran, le raisonnement y
 * retourne. C'est ce qui permet de rejouer un cas à l'identique un an plus tard.
 */

import { requireUser } from "../_shared/require-user.ts";
import { consulter, demander, expliquer, lireArticle, VERSION } from "./corpus.js";
import { peutInspecter } from "./inspection.js";

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

  const { reponses, produit, article, inspection } = (corps ?? {}) as {
    reponses?: Record<string, unknown>; produit?: string; article?: string; inspection?: string;
  };
  const donnees = reponses && typeof reponses === "object" ? reponses : {};
  if (Object.keys(donnees).length > REPONSES_MAX) {
    return json({ error: `Au plus ${REPONSES_MAX} réponses par appel.` }, 400);
  }

  try {
    // Quatre formes d'appel. L'écran veut tout : les questions qui restent, les
    // modules conclus, le graphe. Le copilote veut une chose et une seule — le
    // degré coupe-feu des planchers — avec de quoi la défendre. L'écran veut
    // aussi, à la demande, le texte d'un article pour le mettre sous la
    // question. Et le vérificateur veut les règles, s'il en a le droit.
    if (typeof article === "string" && article) {
      return json({ version: VERSION, article: lireArticle(article) });
    }
    if (typeof inspection === "string" && inspection) {
      if (!peutInspecter(qui.user, Deno.env.get("INCENDIE_INSPECTEURS"))) {
        return json({
          error: "Le dépouillement ne s'ouvre que pour les comptes inscrits dans « INCENDIE_INSPECTEURS ». "
            + "C'est volontaire : la table des règles est le travail, et elle ne se partage pas avec un projet."
        }, 403);
      }
      return json({ version: VERSION, inspection: expliquer(inspection, donnees) });
    }
    if (typeof produit === "string" && produit) {
      return json({ version: VERSION, reponse: demander(produit, donnees) });
    }
    return json(consulter(donnees));
  } catch (erreur) {
    return json({ error: erreur instanceof Error ? erreur.message : String(erreur) }, 400);
  }
});
