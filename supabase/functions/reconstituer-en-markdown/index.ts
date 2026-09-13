/**
 * Refaire un document en Markdown, pour qu'on puisse le relire.
 *
 * ## Pourquoi cette fonction existe
 *
 * L'extraction rend des points à traiter. Quand ils déçoivent, on ne sait pas
 * si le document a été mal lu ou bien lu et mal exploité — et l'on corrige à
 * l'aveugle. Cette fonction montre l'étape d'avant : le document tel que le
 * modèle le voit, dans son ordre, avec ses tableaux.
 *
 * Elle ne sert à rien d'autre. **Ce qu'elle rend n'alimente aucune extraction**
 * et n'entre nulle part : c'est une pièce à regarder, et rien ne s'y branche.
 *
 * ## C'est un second appel, et il se compte
 *
 * Relire un document pour le refaire coûte autant que de le lire. L'appel est
 * donc toujours **demandé** — jamais déclenché par le dépôt — et il se dépose
 * au compteur sous sa propre nature, pour qu'on voie ce que l'habitude de
 * vérifier coûte (fondamental 13).
 *
 * ## Ce qu'elle ne cache pas
 *
 * Le texte qui part est plafonné : au-delà, `pagesEnTexte` s'arrête. Les pages
 * qui n'ont pas tenu, celles dont rien n'est revenu et celles que le modèle a
 * rendues sans qu'on les ait envoyées sont **nommées dans la réponse**. Un
 * document tronqué qui s'afficherait comme complet serait le pire résultat
 * possible pour un écran dont le seul métier est de dire ce qui a été lu.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import { pagesEnTexte } from "../_shared/citation-verifiee.js";
import {
  CONSIGNES_DE_RECONSTITUTION,
  SCHEMA_DU_DOCUMENT,
  pagesDuTexte,
  pagesRefaites
} from "../_shared/document-en-markdown.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/**
 * **Le meilleur modèle disponible, et c'est un choix assumé.**
 *
 * C'est le premier maillon : tout ce qui suit — le secrétariat, les liens entre
 * sujets, les fermetures — lit ce qu'il rend, et une erreur de transcription se
 * propage sans jamais se corriger. Un lot mal attribué ici devient un sujet mal
 * rangé là-bas, et plus rien en aval ne peut le rattraper.
 *
 * Ce n'est pas non plus une simple recopie. Reposer un tableau déguisé, lire
 * une cellule de gauche qui tient sur quatre lignes pendant qu'une date de
 * droite n'en occupe qu'une, reconnaître qu'un décalage d'indentation est un
 * regroupement : c'est du raisonnement sur la mise en page, et le petit modèle
 * s'y trompe.
 *
 * C'est enfin le seul appel dont le travail se vérifie mot pour mot contre le
 * document — on sait donc ce qu'on achète. Le relevé des points, lui, reste sur
 * le petit modèle : il travaille sur un document déjà propre.
 *
 * Réglable sans redéploiement : le nom du modèle change plus vite que le code.
 */
const MODELE = Deno.env.get("OPENAI_TRANSCRIPTION_MODEL") || "gpt-5";

/**
 * Le plafond d'entrée, calé sur ce qui peut **revenir**.
 *
 * Une transcription rend autant de texte qu'elle en reçoit. Ce n'est donc pas
 * la fenêtre d'entrée qui décide — elle est large — mais la sortie maximale du
 * modèle. Au-delà, la réponse serait coupée au milieu : un document tronqué
 * sans que la coupure vienne du document.
 *
 * Le plafond a doublé avec le modèle, et pour deux raisons qui s'ajoutent : il
 * rend davantage d'un bloc, et le texte qui part est plus long qu'avant — une
 * page reposée sur sa grille porte les espaces qui font ses colonnes.
 *
 * Ce qui dépasse est nommé dans la réponse (`hors_plafond`) et affiché — un
 * document amputé qui s'afficherait entier serait le pire résultat possible
 * (règle 5).
 */
const MAX_CARACTERES = 180000;
const MAX_JETONS = 64000;

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
    const pages = Array.isArray(body?.pages) ? body.pages : [];
    // Le projet ne sert qu'au compteur de consommation. Facultatif : sans lui,
    // l'appel se range hors projet plutôt que d'être attribué au hasard.
    const projectId = String(body?.project_id ?? "").trim() || null;

    if (!pages.length) return reponse({ error: "pages is required" }, 400);

    const texte = pagesEnTexte(pages, { maxCaracteres: MAX_CARACTERES });
    if (!texte.trim()) return reponse({ error: "pages carry no text" }, 400);

    // Les pages réellement parties, relues dans le texte qui part : c'est la
    // seule façon de savoir ce que le plafond a laissé dehors.
    const envoyees = pagesDuTexte(texte);

    const appel = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        instructions: CONSIGNES_DE_RECONSTITUTION,
        input: texte,
        max_output_tokens: MAX_JETONS,
        // Assez pour reposer un tableau, pas assez pour se mettre à
        // interpréter : la consigne demande une transcription, pas une lecture.
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", ...SCHEMA_DU_DOCUMENT } }
      })
    });

    if (!appel.ok) {
      return reponse({ error: "OpenAI request failed", details: await appel.text() }, 502);
    }

    const rendu = await appel.json();

    // Ce que cette relecture a coûté. On n'attend pas : elle ne dépend pas de
    // son compteur. Et l'on dépose même si la réponse est coupée — un appel
    // tronqué a été facturé comme un autre.
    const jetons = jetonsDeLaReponse(rendu);
    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODELE,
      usageKind: "reconstitution-markdown", jetons
    });

    const lu = lireLaReponse(rendu);
    if (!lu) return reponse({ error: "No structured output returned", raw: rendu }, 502);

    const { pages: refaites, absentes, inconnues } = pagesRefaites(lu, envoyees);

    return reponse({
      pages: refaites,
      // Les pages du document qui n'ont pas tenu dans ce qui est parti.
      hors_plafond: pages
        .map((page: { page?: unknown }) => Number(page?.page))
        .filter((numero: number) => Number.isFinite(numero) && !envoyees.includes(numero)),
      absentes,
      inconnues,
      /** La réponse a-t-elle été coupée en cours de route ? */
      coupee: String(rendu?.status ?? "") === "incomplete",
      modele: MODELE,
      /**
       * Ce que cet appel-ci a consommé.
       *
       * **Rendu, et pas seulement déposé.** Le compteur dit ce qu'un mois a
       * coûté ; il ne dit pas ce que *cette* lecture a coûté, au moment où
       * l'on décide si elle valait la peine. Un prix qu'il faut aller chercher
       * dans un autre écran n'entre jamais dans la décision (fondamental 13).
       *
       * `null` quand le fournisseur n'a rien annoncé : un décompte manquant ne
       * se remplace pas par zéro, qui se lirait « gratuit ».
       */
      jetons
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
