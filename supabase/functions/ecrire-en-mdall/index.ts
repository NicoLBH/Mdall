/**
 * Écrire du Mdall depuis du français, par le modèle.
 *
 * ## Elle est au serveur, et c'est la seule place possible
 *
 * La clé du modèle n'entre jamais dans le navigateur, et **la consigne non
 * plus** : elle enseigne la grammaire de Mdall — ce qu'est une fonction, ce
 * qu'un nom doit porter, où chaque chose se range —, et c'est du savoir-faire.
 * Le navigateur envoie une phrase en français et reçoit des fichiers.
 *
 * ## Ce qui revient est relu, et c'est le navigateur qui le relit
 *
 * Un modèle qui écrit du code écrit du code **plausible** : rien dans sa
 * réponse ne distingue une fonction juste d'une fonction dont la condition
 * porte sur un nom que personne n'a déclaré. Ce qu'il écrit est donc relu par
 * `verification-du-brouillon.js` — le lecteur du projet — avant de s'afficher
 * comme du Mdall valable.
 *
 * **Mais pas ici, et c'est un choix.** Relire au serveur demanderait d'y copier
 * le lecteur entier du langage — `memoire-en-lecture.js` et les quatre modules
 * dont il dépend —, parce qu'une fonction déployée ne voit pas `apps/web`. Une
 * copie de cette taille diverge : c'est la grammaire du langage qui existerait
 * à deux endroits, et celle qu'on ne relit pas aurait raison le jour où l'on
 * cherche pourquoi le serveur accepte ce que l'écran refuse (règle 4).
 *
 * Le seul appelant relit avec le même module, à chaque frappe, gratuitement. Le
 * jour où un utilitaire serveur appellera cette fonction — le lot qui fait
 * converger les trois producteurs —, il faudra soit lui faire relire chez lui,
 * soit descendre le lecteur ici **une fois**, avec l'épreuve qui compare les
 * deux copies. Pas avant.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import { panneDuFournisseur } from "../_shared/sujets-du-modele.js";
import { TEMPERATURE_REPRODUCTIBLE, refuseLaTemperature } from "../_shared/reglage-du-modele.js";
import {
  CONSIGNES,
  SCHEMA_DU_MDALL,
  fichiersDuModele,
  lacunesDuModele
} from "../_shared/mdall-du-modele.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/** Le modèle, et un réglage plutôt qu'une constante — comme partout ailleurs. */
const MODELE = Deno.env.get("OPENAI_MDALL_MODEL") || "gpt-4.1-mini";

/**
 * Ce qu'on accepte de lire, et ce qu'on rend au plus.
 *
 * Une phrase de projet fait quelques lignes ; un paragraphe entier, quelques
 * dizaines. Au-delà, ce n'est plus une intention à transcrire, c'est un
 * document — et un document se lit par la lecture des documents.
 */
const MAX_CARACTERES = 12000;
const MAX_JETONS = 8000;
const MAX_SECONDES = 110;

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

/** Ce que le modèle a rendu de structuré, quelle que soit la forme de l'enveloppe. */
function lireLaReponse(rendu: Record<string, unknown>): Record<string, unknown> | null {
  const direct = (rendu as { output_parsed?: unknown })?.output_parsed;
  if (direct && typeof direct === "object") return direct as Record<string, unknown>;

  const texte = (rendu as { output_text?: unknown })?.output_text
    ?? ((rendu as { output?: { content?: { text?: string }[] }[] })?.output ?? [])
      .flatMap((bloc) => bloc?.content ?? [])
      .map((morceau) => morceau?.text ?? "")
      .join("");

  if (typeof texte !== "string" || !texte.trim()) return null;

  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
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

    const body = await req.json();
    const dit = String(body?.dit ?? "").trim().slice(0, MAX_CARACTERES);

    // **Le projet ne sert qu'au compteur.** La transcription n'en a pas besoin :
    // elle ne voit qu'une phrase. Son absence range l'appel hors projet plutôt
    // que de l'attribuer au hasard.
    const projectId = String(body?.project_id ?? "").trim() || null;

    if (!dit) return reponse({ error: "dit is required" }, 400);

    const horloge = AbortSignal.timeout(MAX_SECONDES * 1000);

    /**
     * L'appel, avec ou sans la température fixée.
     *
     * Écrit une fois et appelé deux fois : le second n'existe que pour un
     * modèle qui refuse qu'on lui fixe une température, et il doit être le même
     * à ce paramètre près (règle 10).
     */
    const demander = (temperature: number | null) => fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        instructions: CONSIGNES,
        input: dit,
        max_output_tokens: MAX_JETONS,
        text: { format: { type: "json_schema", ...SCHEMA_DU_MDALL } },
        ...(temperature === null ? {} : { temperature })
      }),
      signal: horloge
    });

    // **La température tenue, ou rien.** Elle descend telle quelle jusqu'à
    // l'écran : une transcription qu'on n'a pas pu rendre reproductible ne doit
    // pas se présenter comme si elle l'était (règle 5).
    let temperatureTenue: number | null = TEMPERATURE_REPRODUCTIBLE;

    let appel: Response;
    try {
      appel = await demander(temperatureTenue);

      if (!appel.ok) {
        const refus = await appel.clone().text().catch(() => "");
        if (refuseLaTemperature(refus, appel.status)) {
          temperatureTenue = null;
          appel = await demander(null);
        }
      }
    } catch (erreur) {
      // **Un dépassement n'est pas un refus.** On le dit avec le code qui le
      // dit, et une cause nommée, pour que l'écran cesse d'annoncer une panne
      // que personne n'a déclarée.
      const coupe = (erreur as Error)?.name === "TimeoutError"
        || (erreur as Error)?.name === "AbortError";

      return reponse({
        error: coupe ? "OpenAI request timed out" : "OpenAI request failed",
        panne: {
          status: coupe ? 504 : 502,
          type: coupe ? "delai_depasse" : "fournisseur_injoignable",
          code: String((erreur as Error)?.name ?? ""),
          message: coupe
            ? `Le modèle n'a pas répondu en ${MAX_SECONDES} secondes.`
            : String((erreur as Error)?.message ?? "").slice(0, 300)
        }
      }, coupe ? 504 : 502);
    }

    if (!appel.ok) {
      // **Nommée, et non recopiée.** Le corps d'une erreur du fournisseur peut
      // contenir un écho de la consigne, qui ne descend pas dans le navigateur.
      return reponse({
        error: "OpenAI request failed",
        panne: panneDuFournisseur(await appel.text().catch(() => ""), appel.status)
      }, 502);
    }

    const rendu = await appel.json();

    // Ce que cette transcription a coûté. On n'attend pas : elle ne dépend pas
    // de son compteur.
    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODELE,
      usageKind: "ecrire-en-mdall", jetons: jetonsDeLaReponse(rendu)
    });

    /**
     * La réponse a-t-elle tenu dans le plafond ?
     *
     * **Coupée n'est pas refusée.** Un JSON tronqué au milieu ne se relit pas,
     * et annoncer « la transcription a été refusée » serait faux : elle a eu
     * lieu, et elle a été payée. La distinction change ce qu'il y a à faire —
     * une phrase trop longue se recoupe, un refus se réessaie.
     */
    const coupee = String(rendu?.status ?? "") === "incomplete";

    const lu = lireLaReponse(rendu);
    const fichiers = lu ? fichiersDuModele(lu) : null;

    if (!fichiers) {
      return reponse({
        error: "No structured output returned",
        coupee,
        panne: {
          status: 200,
          type: coupee ? "reponse_coupee" : "reponse_illisible",
          code: String(rendu?.incomplete_details?.reason ?? ""),
          message: coupee
            ? `La réponse a dépassé ${MAX_JETONS} jetons et a été coupée au milieu : rien ne s'en relit.`
            : "Le modèle n'a rendu aucun fichier."
        }
      }, 502);
    }

    return reponse({
      /**
       * Les fichiers, **tels que le modèle les a écrits**.
       *
       * Ils ne sont pas garantis lisibles : c'est l'appelant qui relit, avec le
       * lecteur du projet, et l'écran pose ses remarques à côté de leur ligne.
       * Voir l'en-tête de ce fichier.
       */
      fichiers,
      /**
       * Ce que le modèle déclare ne pas avoir su écrire.
       *
       * **On le lui demande explicitement**, parce que le silence est le mode
       * de défaillance le plus coûteux : une phrase du français qui disparaît
       * sans un mot laisse croire qu'elle a été codée.
       */
      lacunes: lacunesDuModele(lu),
      /** La température tenue, ou `null` quand le modèle l'a refusée (règle 5). */
      temperature: temperatureTenue,
      modele: MODELE,
      coupee
    });
  } catch (erreur) {
    return reponse({ error: String((erreur as Error)?.message ?? erreur) }, 500);
  }
});
