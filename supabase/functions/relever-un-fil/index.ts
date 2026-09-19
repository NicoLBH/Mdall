/**
 * Relever les prises de position d'un fil de courriels, par le modèle.
 *
 * ## Elle est au serveur, et c'est la seule place possible
 *
 * La clé du modèle n'entre jamais dans le navigateur, et la consigne de lecture
 * non plus : elle décrit ce que Mdall sait lire d'une correspondance, et c'est
 * du savoir-faire. Le navigateur envoie un fil **déjà déplié** et reçoit des
 * prises **vérifiées**.
 *
 * ## Elle ne reçoit pas de mails, elle reçoit un fil
 *
 * C'est ce qui la distingue de la lecture d'un compte rendu. Le dépliage, la
 * séparation du propos et de la citation, la reconstitution du fil se font
 * entièrement dans le navigateur, gratuitement (étapes 1 à 3). Ce qui monte ici
 * est le propos de chaque message, **une fois**, sans les recopies — c'est ce
 * qui rend cette lecture bon marché, et c'est aussi ce qui évite de faire
 * monter huit fois la même correspondance privée.
 *
 * ## Ce qui revient est vérifié avant de partir
 *
 * Chaque prise porte la phrase du message d'où elle sort, et cette phrase est
 * recherchée dans le texte de ce message — **ici**, avant la réponse. Ce qui ne
 * se retrouve pas est écarté et compté.
 *
 * Le garde-fou pèse lourd : une prise inventée est plausible. « Le support est
 * humide au droit de l'acrotère » pourrait figurer dans n'importe quel fil
 * d'étanchéité, et rien dans la réponse du modèle ne le distinguerait d'une
 * vraie. Ce qui l'en distingue, c'est le message.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import { panneDuFournisseur } from "../_shared/sujets-du-modele.js";
import { TEMPERATURE_REPRODUCTIBLE, refuseLaTemperature } from "../_shared/reglage-du-modele.js";
import {
  CONSIGNES,
  SCHEMA_DES_PRISES,
  ecarteesAuFormatDuMoteur,
  filEnTexte,
  laPartRelevee,
  lesMessagesRendus,
  prisesAuFormatDuMoteur,
  verifierLesPrises
} from "../_shared/prises-du-modele.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/** Le modèle, et un réglage plutôt qu'une constante — comme pour les CR. */
const MODELE = Deno.env.get("OPENAI_PRISES_MODEL") || "gpt-4.1-mini";

const MAX_CARACTERES = 120000;

/**
 * Le plafond de sortie.
 *
 * Plus bas que celui des comptes rendus, et pour une raison : une prise porte
 * sept champs courts, là où un point de CR en porte douze dont deux longs. Un
 * fil de trente messages tient largement. S'il ne tenait pas, la réponse se
 * dirait coupée plutôt que de revenir muette.
 */
const MAX_JETONS = 16000;

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
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const filId = String(body?.fil_id ?? "").trim();

    // **Le projet ne sert qu'au compteur.** Le relevé n'en a pas besoin : il ne
    // voit qu'un fil. Il est donc facultatif, et son absence range l'appel hors
    // projet plutôt que de l'attribuer au hasard.
    const projectId = String(body?.project_id ?? "").trim() || null;

    if (!messages.length) return reponse({ error: "messages is required" }, 400);

    // Le chronomètre part avant l'appel : c'est lui qu'on mesure, et non ce que
    // la fonction fait de sa réponse.
    const commenceA = Date.now();

    const fil = filEnTexte(messages, { maxCaracteres: MAX_CARACTERES });
    if (!fil.trim()) return reponse({ error: "messages carry no text" }, 400);

    // Le budget est tenu par un signal plutôt que par une course de promesses :
    // une course laisserait l'appel continuer dans le vide, et il serait payé.
    const horloge = AbortSignal.timeout(MAX_SECONDES * 1000);

    /**
     * L'appel, avec ou sans la température fixée.
     *
     * Écrit une fois et appelé deux fois : le second appel n'existe que pour
     * un modèle qui refuse qu'on lui fixe une température, et il doit être le
     * même à ce paramètre près (règle 10).
     */
    const demander = (temperature: number | null) => fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        instructions: CONSIGNES,
        input: fil,
        max_output_tokens: MAX_JETONS,
        text: { format: { type: "json_schema", ...SCHEMA_DES_PRISES } },
        ...(temperature === null ? {} : { temperature })
      }),
      signal: horloge
    });

    // **La température tenue, ou rien.** Elle descend telle quelle jusqu'à
    // l'écran : un relevé qu'on n'a pas pu rendre reproductible ne doit pas
    // se présenter comme s'il l'était (règle 5).
    let temperatureTenue: number | null = TEMPERATURE_REPRODUCTIBLE;

    let appel: Response;
    try {
      appel = await demander(temperatureTenue);

      // **Un modèle de raisonnement refuse qu'on lui fixe une température.**
      // Le modèle est un réglage : quelqu'un peut en poser un demain, et le
      // relevé tomberait alors pour un paramètre de trop. On réessaie une
      // fois, sans elle, et l'on dit qu'elle n'a pas tenu.
      if (!appel.ok) {
        const refus = await appel.clone().text().catch(() => "");
        if (refuseLaTemperature(refus, appel.status)) {
          temperatureTenue = null;
          appel = await demander(null);
        }
      }
    } catch (erreur) {
      // **Un dépassement n'est pas un refus.** On le dit avec le code qui le
      // dit — 504 — et une cause nommée, pour que l'écran cesse d'annoncer une
      // panne que personne n'a déclarée.
      const coupe = (erreur as Error)?.name === "TimeoutError"
        || (erreur as Error)?.name === "AbortError";

      return reponse({
        error: coupe ? "OpenAI request timed out" : "OpenAI request failed",
        panne: {
          status: coupe ? 504 : 502,
          type: coupe ? "delai_depasse" : "fournisseur_injoignable",
          code: String((erreur as Error)?.name ?? ""),
          message: coupe
            ? `Le modèle n'a pas répondu en ${MAX_SECONDES} secondes. Le fil est peut-être `
              + "trop long pour un seul relevé."
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

    /**
     * La réponse a-t-elle tenu dans le plafond ?
     *
     * **Coupée n'est pas refusée.** Une réponse tronquée au milieu du JSON ne
     * se relit pas, et annoncer « le relevé a été refusé » serait faux : il a
     * eu lieu, et il a été payé. La distinction change ce qu'il y a à faire —
     * un fil trop long se recoupe, un relevé refusé se réessaie.
     */
    const coupee = String(rendu?.status ?? "") === "incomplete";

    // Ce que ce relevé a coûté. On n'attend pas : il ne dépend pas de son
    // compteur.
    const jetons = jetonsDeLaReponse(rendu);
    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODELE,
      usageKind: "releve-dun-fil", jetons
    });

    const lu = lireLaReponse(rendu);
    if (!lu) {
      return reponse({
        error: "No structured output returned",
        coupee,
        panne: {
          status: 200,
          type: coupee ? "reponse_coupee" : "reponse_illisible",
          code: String(rendu?.incomplete_details?.reason ?? ""),
          message: coupee
            ? `La réponse a dépassé ${MAX_JETONS} jetons et a été coupée au milieu : rien ne s'en relit.`
            : "Le modèle n'a rien rendu de structuré."
        }
      }, 502);
    }

    // **Le compte, message par message.** Il se fait avant la porte : un
    // message dont le modèle n'a rien dit n'est pas un message dont les prises
    // ont été écartées, et seul ce qui est lu ici permet de les distinguer.
    const rendus = lesMessagesRendus(lu, messages);

    // **La porte.** Ce que le modèle n'a pas su citer ne sort pas d'ici.
    const { retenues, ecartees, messagesCorriges, renvoisEcartes } = verifierLesPrises({
      prises: rendus.prises,
      messages
    });

    return reponse({
      prises: prisesAuFormatDuMoteur(retenues, { filId, messages }),
      /**
       * Ce qui a été jeté, et pourquoi — **avec ce que c'était**.
       *
       * Un compte seul ne dit pas si la porte a protégé ou si elle a jeté.
       * L'intitulé et la citation refusée le disent, et c'est la seule façon
       * de régler le garde-fou sur des cas plutôt que sur une impression.
       */
      ecartees: ecarteesAuFormatDuMoteur(ecartees),
      /**
       * Les messages dont le modèle déclare ne rien tirer, et ceux dont il n'a
       * rien dit du tout. `null` quand sa réponse n'a pas rendu compte message
       * par message : ne pas savoir ne s'annonce pas comme un zéro (règle 5).
       */
      messages_muets: rendus.muets,
      messages_oublies: rendus.oublies,
      /**
       * Combien de renvois ne tenaient pas devant le fil — un rang qui n'existe
       * pas, ou qui n'est pas antérieur. Ils ont été écartés : un renvoi
       * inventé ferait passer une question restée sans réponse pour une
       * question répondue.
       */
      renvois_ecartes: renvoisEcartes,
      /**
       * Quelle part de chaque message une citation reprend.
       *
       * **Un message peu relevé n'est pas un message muet**, et rien ne le
       * disait : sur un fil réel, celui qui portait un refus et un avis
       * défavorable a rendu trois prises — sans aucune des deux phrases.
       * Ce n'est pas un taux à faire monter, c'est un écart à regarder.
       */
      couverture: laPartRelevee(messages, retenues),
      /**
       * Combien de prises visaient un autre message que celui où leur citation
       * se trouve. Elles sont gardées — la prise est réelle —, mais **leur
       * auteur a changé**, et cela ne se tait pas.
       */
      messages_corriges: messagesCorriges,
      /** La réponse a-t-elle été coupée ? Des prises manquent alors, en silence. */
      coupee,
      modele: MODELE,
      /**
       * La température que l'appel a tenue, ou `null` si le modèle l'a refusée.
       *
       * **C'est ce qui dit si deux lectures du même fil se ressemblent.** Un
       * relevé qu'on n'a pas pu rendre reproductible ne doit pas se présenter
       * comme s'il l'était : une citation qui change alors que le document n'a
       * pas changé n'est plus une preuve (règle 1).
       */
      temperature: temperatureTenue,
      /**
       * Ce que ce relevé a consommé.
       *
       * **Redescendu, alors que le compteur en garde déjà une trace.** Le
       * compteur dit ce qu'un mois a coûté ; il ne dit pas ce que *ce*
       * relevé-ci a coûté, au moment précis où l'on décide s'il valait la
       * peine. Un prix qu'il faut aller chercher dans un autre écran n'entre
       * jamais dans la décision (fondamental 13).
       *
       * Ce sont des nombres de jetons, pas une consigne : rien de ce qui a été
       * envoyé ne remonte avec eux.
       */
      jetons: { entree: jetons.input_tokens, sortie: jetons.output_tokens },
      /** Ce que ce relevé a pris, mesuré ici et non au navigateur. */
      duree_ms: Date.now() - commenceA
    });
  } catch (error) {
    return reponse({ error: "Unexpected error", details: String(error) }, 500);
  }
});

/** Ce que l'API rend, quel que soit le chemin par lequel elle le rend. */
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
