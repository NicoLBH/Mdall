/**
 * Refaire un document **sans modèle**, par un outil de reconstitution.
 *
 * ## Pourquoi une seconde reconstitution
 *
 * Un document refait par un modèle se lit très bien, même quand il est faux.
 * Le seul juge fiable serait le PDF lui-même, mais le relire ligne à ligne est
 * exactement le travail qu'on cherche à éviter. Une seconde reconstitution,
 * obtenue **autrement**, donne un juge praticable : là où les deux s'accordent,
 * il n'y a rien à vérifier ; là où elles divergent, l'une se trompe.
 *
 * Et elle ne consomme **aucun jeton** : rien n'est déposé au compteur, parce
 * qu'il n'y a rien à compter. C'est tout l'intérêt de la comparaison — si
 * l'outil suffit, le premier appel disparaît.
 *
 * ## Elle relaie, elle ne lit pas
 *
 * L'outil tourne ailleurs : OpenDataLoader PDF demande une machine virtuelle
 * Java, que Deno n'a pas. Cette fonction n'est donc qu'un relais, et c'est
 * délibéré : **l'adresse de l'outil ne descend jamais dans le navigateur**, et
 * la porte reste celle de Mdall.
 *
 * ## Tant qu'aucune adresse n'est donnée, elle le dit
 *
 * Sans `OPENDATALOADER_URL`, elle répond `501` et un motif nommé. Elle ne se
 * rabat sur rien : rendre un document vide ferait croire que l'outil a lu le
 * PDF et n'y a rien trouvé (règle 5).
 *
 * Le contrat de l'outil est décrit dans `_shared/markdown-de-loutil.js`.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { lireLaReponseDeLoutil } from "../_shared/markdown-de-loutil.js";

/**
 * L'adresse de l'outil, donnée au déploiement.
 *
 * Elle n'a pas de valeur par défaut, et n'en aura pas : un défaut enverrait le
 * PDF d'un chantier à une adresse que personne n'a choisie.
 */
const URL_DE_LOUTIL = Deno.env.get("OPENDATALOADER_URL") ?? "";

/**
 * Le mot de passe partagé avec l'outil, ou rien.
 *
 * Hébergé gratuitement, l'outil a une adresse **publique**, et l'obscurité
 * d'une adresse n'est pas une protection. Ce mot de passe dit « cet appel vient
 * de Mdall » ; il ne dit pas qui, et n'a pas à le dire — l'utilisateur a déjà
 * été vérifié quelques lignes plus haut.
 *
 * Sans lui, l'appel part quand même : l'outil décide seul s'il l'accepte.
 */
const JETON = (Deno.env.get("OPENDATALOADER_TOKEN") ?? "").trim();

/** L'en-tête qui le porte. Le même nom que du côté de l'outil. */
const EN_TETE_DU_JETON = "X-Mdall-Jeton";

/**
 * Le temps qu'on lui laisse.
 *
 * Deux minutes, et non une : un service hébergé gratuitement s'endort, et son
 * réveil prend parfois une minute à lui seul. Couper avant lui ferait passer un
 * outil qui se réveille pour un outil en panne.
 */
const DELAI = 120000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, Authorization, x-client-info, apikey, content-type, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function reponse(corps: unknown, status = 200): Response {
  return new Response(JSON.stringify(corps), { status, headers: jsonHeaders });
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    // Le portail ne vérifie pas l'appelant — il rejetterait le préflight du
    // navigateur, qui arrive sans autorisation. La porte est donc ici.
    const garde = await requireUser(req, corsHeaders);
    if ("response" in garde) return garde.response;

    if (req.method !== "POST") return reponse({ error: "Method not allowed" }, 405);

    if (!URL_DE_LOUTIL) {
      // Nommé, pour que l'écran puisse dire ce qui manque au lieu d'afficher
      // « échec » sur une fonction qui n'a jamais été branchée.
      return reponse({ error: "tool not configured", motif: "outil-non-branche" }, 501);
    }

    const pdf = new Uint8Array(await req.arrayBuffer());
    if (!pdf.byteLength) return reponse({ error: "a pdf body is required" }, 400);

    const arret = AbortSignal.timeout(DELAI);
    let appel: Response;
    try {
      appel = await fetch(URL_DE_LOUTIL, {
        method: "POST",
        headers: {
          "Content-Type": "application/pdf",
          ...(JETON ? { [EN_TETE_DU_JETON]: JETON } : {})
        },
        body: pdf,
        signal: arret
      });
    } catch (error) {
      return reponse({
        error: "tool unreachable", motif: "outil-injoignable", details: String(error)
      }, 502);
    }

    if (!appel.ok) {
      // 401 : le mot de passe manque ou ne correspond pas. Nommé à part — il ne
      // se corrige pas comme une panne, et les confondre ferait chercher
      // longtemps une adresse qui est bonne.
      const motif = appel.status === 401 ? "outil-refuse-le-jeton" : "outil-refuse";
      return reponse({ error: "tool request failed", motif, details: await appel.text() }, 502);
    }

    // L'outil rend du JSON ou du Markdown découpé en pages : les deux formes
    // sont ramenées à la même ici, une fois, plutôt que dans chaque écran.
    const brut = await appel.text();
    let charge: unknown = brut;
    try {
      charge = JSON.parse(brut);
    } catch {
      // Du Markdown, alors. Ce n'est pas une erreur.
    }

    const pages = lireLaReponseDeLoutil(charge);
    if (!pages.length) {
      return reponse({ error: "tool returned no page", motif: "rien-rendu" }, 502);
    }

    return reponse({ pages, outil: "opendataloader" });
  } catch (error) {
    return reponse({ error: "Unexpected error", details: String(error) }, 500);
  }
});
