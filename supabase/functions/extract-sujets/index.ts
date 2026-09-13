/**
 * Lire les points à traiter d'un compte rendu de chantier, par le modèle.
 *
 * ## Pourquoi cette fonction existe
 *
 * Déposer un compte rendu de chantier n'ajoutait aucun sujet. L'ancienne
 * pipeline en produisait bien, mais à partir d'un PDF et **sans proposition** :
 * elle contournait la règle 1, et elle s'en va avec cette version. Ce qui la
 * remplace ne verse rien — il propose, et quelqu'un tranche.
 *
 * ## Elle est au serveur, et c'est la seule place possible
 *
 * La clé du modèle n'entre jamais dans le navigateur, et la consigne de lecture
 * non plus : elle décrit ce que Mdall sait lire d'un compte rendu, et c'est du
 * savoir-faire. Le navigateur envoie des pages et reçoit des points vérifiés.
 *
 * ## Ce qui revient est vérifié avant de partir
 *
 * Chaque point rendu porte la ligne du compte rendu d'où il sort, et cette
 * ligne est recherchée dans le texte de la page — **ici**, avant la réponse.
 * Ce qui ne se retrouve pas est écarté et compté.
 *
 * Le garde-fou pèse plus lourd ici que pour les avis : un point inventé est
 * plausible. « Reprise d'étanchéité en toiture terrasse » pourrait figurer dans
 * n'importe quel compte rendu, et rien dans la réponse du modèle ne le
 * distinguerait d'un vrai. Ce qui l'en distingue, c'est le document.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireUser } from "../_shared/require-user.ts";
import { deposerLaConsommation, jetonsDeLaReponse } from "../_shared/consommation-ia.ts";
import {
  CONSIGNES,
  SCHEMA_DES_SUJETS,
  intervenantsAuFormatDuMoteur,
  pagesEnTexte,
  sujetsAuFormatDuMoteur,
  sujetsDuProjetEnTexte,
  verifierLesIntervenants,
  verifierLesLabels,
  verifierLesRapprochements,
  verifierLesSujets
} from "../_shared/sujets-du-modele.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/** Le même que les deux autres lectures : un seul fournisseur à exploiter. */
const MODELE = "gpt-4.1-mini";
const MAX_CARACTERES = 120000;
const MAX_JETONS = 8000;

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
    const sourceId = String(body?.source_id ?? "").trim();

    // **Le projet ne sert qu'au compteur de consommation.** La lecture n'en a
    // pas besoin : elle ne voit que des pages. Il est donc facultatif — une
    // lecture reste possible sans lui, et sa consommation se range alors hors
    // projet plutôt que d'être attribuée au hasard.
    const projectId = String(body?.project_id ?? "").trim() || null;

    if (!pages.length) return reponse({ error: "pages is required" }, 400);

    const texte = pagesEnTexte(pages, { maxCaracteres: MAX_CARACTERES });
    if (!texte.trim()) return reponse({ error: "pages carry no text" }, 400);

    /**
     * Ce que le projet suit déjà.
     *
     * **Facultatif, et l'absence n'est pas le vide.** Sans cette liste, le
     * modèle ne rapproche rien et tous les points repartent neufs — ce qui est
     * l'erreur la moins coûteuse. Lui envoyer une liste vide en prétendant
     * qu'elle est complète lui ferait conclure que le projet ne suit rien, ce
     * qui n'est pas la même chose (règle 5).
     */
    const connus = Array.isArray(body?.sujets_du_projet) ? body.sujets_du_projet : [];
    const deja = sujetsDuProjetEnTexte(connus);

    const appel = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELE,
        instructions: deja ? `${CONSIGNES}\n${deja}` : CONSIGNES,
        input: texte,
        max_output_tokens: MAX_JETONS,
        text: { format: { type: "json_schema", ...SCHEMA_DES_SUJETS } }
      })
    });

    if (!appel.ok) {
      return reponse({ error: "OpenAI request failed", details: await appel.text() }, 502);
    }

    const rendu = await appel.json();

    // Ce que cette lecture a coûté. On n'attend pas : l'extraction ne dépend
    // pas de son compteur.
    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODELE,
      usageKind: "extraction-sujets", jetons: jetonsDeLaReponse(rendu)
    });
    const lu = lireLaReponse(rendu);
    if (!lu) return reponse({ error: "No structured output returned", raw: rendu }, 502);

    // **La porte.** Ce que le modèle n'a pas su citer ne sort pas d'ici.
    const { retenus, ecartes, pagesCorrigees } = verifierLesSujets({
      sujets: (lu.sujets as unknown[]) ?? [],
      pages
    });

    // **Un identifiant inventé égare un point, il ne le perd pas.** Rattaché à
    // la discussion d'un sujet qui n'a rien à voir, personne n'ira le chercher
    // — et rien ne le signalera. Ce qui n'a pas été envoyé ne revient pas.
    const rapproches = verifierLesRapprochements({ sujets: retenus, connus });

    // **La liste des labels est fermée, et la porte est ici.** Un label inventé
    // n'est pas une étiquette de trop : c'est une étiquette que le projet
    // portera pour toujours, à côté de celle qui disait déjà la même chose.
    const etiquetes = verifierLesLabels({ sujets: rapproches.sujets });

    // Les intervenants passent le même garde-fou, et pour une raison plus forte
    // encore : un intervenant inventé est une entreprise qui n'existe pas sur
    // ce chantier, à qui l'on finirait par assigner des points.
    const gens = verifierLesIntervenants({
      intervenants: (lu.intervenants as unknown[]) ?? [],
      pages
    });

    return reponse({
      numero_de_reunion: lu.numero_de_reunion ?? null,
      tenue_le: lu.tenue_le ?? null,
      redige_par: lu.redige_par ?? null,
      sujets: sujetsAuFormatDuMoteur(etiquetes.sujets, { sourceId }),
      /** Les labels que le modèle a proposés hors de la liste fermée. */
      labels_ecartes: etiquetes.ecartes,
      /** Combien de rapprochements pointaient vers un sujet qu'on n'a pas envoyé. */
      rapprochements_ecartes: rapproches.ecartes,
      /**
       * A-t-on dit au modèle ce que le projet suit ?
       *
       * Sans cela, tous les points repartent neufs — et l'écran doit pouvoir
       * dire pourquoi, plutôt que de laisser croire que rien ne correspondait.
       */
      rapprochement_demande: Boolean(deja),
      intervenants: intervenantsAuFormatDuMoteur(gens.retenus, { sourceId }),
      // Ce qui a été jeté, et pourquoi. Se dit, se compte, ne se cache pas.
      ecartes: [
        ...ecartes.map((ecart: { motif: string }) => ecart.motif),
        ...gens.ecartes.map((ecart: { motif: string }) => ecart.motif)
      ],
      pages_corrigees: pagesCorrigees + gens.pagesCorrigees,
      modele: MODELE
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
