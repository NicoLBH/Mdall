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
  panneDuFournisseur,
  rattacherAuxRubriques,
  rubriquesAuFormatDuMoteur,
  sujetsAuFormatDuMoteur,
  sujetsDuProjetEnTexte,
  verifierLesIntervenants,
  verifierLesLabels,
  verifierLesRapprochements,
  verifierLesRubriques,
  verifierLesSujets
} from "../_shared/sujets-du-modele.js";

const openAiApiKey = Deno.env.get("OPENAI_API_KEY")!;

/**
 * Le modèle qui relit le compte rendu — et **un réglage, pas une constante**.
 *
 * ## Pourquoi il se change sans toucher au code
 *
 * Cette lecture est la plus lourde du procédé : elle rend jusqu'à
 * `MAX_JETONS` jetons d'un coup, et c'est ce débit-là qui décide si elle tient
 * dans le temps imparti. Le jour où elle n'a plus tenu, la seule chose à
 * essayer était un autre modèle — et cela demandait un changement de code, une
 * relecture et un déploiement pour chaque candidat.
 *
 * C'est la convention que quatre autres fonctions suivent déjà
 * (`OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_STRUCTURE_MODEL`…) : le nom vit dans
 * l'environnement, et l'on compare deux candidats en changeant une variable.
 *
 * ## Comment on sait lequel est le bon
 *
 * Pas au ressenti : l'écran de l'Atelier conserve ce que chaque lecture a valu
 * et l'affiche comparé à la précédente — sa durée comprise. On change le
 * modèle, on relit le même compte rendu, et l'on voit d'un coup d'œil ce que
 * l'on a gagné en temps et ce que l'on a perdu en exactitude.
 *
 * **Le défaut ne bouge pas.** Un modèle plus gros n'est pas plus rapide, et en
 * changer à l'aveugle pourrait ralentir la lecture qu'on essaie d'accélérer.
 * Le défaut reste donc celui qui a fonctionné jusqu'ici, et c'est la mesure qui
 * décide de le remplacer.
 */
const MODELE = Deno.env.get("OPENAI_SUJETS_MODEL") || "gpt-4.1-mini";
const MAX_CARACTERES = 120000;

/**
 * Le plafond de sortie, relevé — et pourquoi il était trop bas.
 *
 * Chaque point rendu porte maintenant ses labels, le sujet qu'il continue et la
 * raison du rapprochement. Un compte rendu de onze pages et quarante points
 * dépassait 8 000 jetons, la réponse revenait **coupée au milieu du JSON**, et
 * rien ne s'en lisait. L'écran annonçait alors « la lecture a été refusée » —
 * ce qui était faux : elle avait eu lieu, elle avait été payée, et elle n'avait
 * pas tenu dans la boîte qu'on lui avait donnée.
 *
 * C'est le genre de panne qu'on ne trouve pas en relisant le code : il a fallu
 * que la réponse dise elle-même qu'elle était incomplète. Elle le dit
 * maintenant, et l'écran aussi.
 */
const MAX_JETONS = 24000;

/**
 * Le temps qu'on laisse au modèle, et pourquoi il est plafonné **ici**.
 *
 * Sans budget, on attendait la réponse indéfiniment — et c'est la passerelle qui
 * finissait par couper, avec un `504` qui ne porte aucune cause. L'écran
 * affichait alors « la lecture a été refusée · le serveur n'a rien nommé de
 * cette panne » : deux phrases fausses pour un fait simple, on a cessé
 * d'attendre.
 *
 * On coupe donc **avant** elle, pour répondre soi-même et nommer ce qui s'est
 * passé. Ce plafond ne fait pas tenir une lecture qui ne tenait pas : il fait la
 * différence entre un échec qu'on diagnostique et un échec muet.
 */
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
    const pages = Array.isArray(body?.pages) ? body.pages : [];
    const sourceId = String(body?.source_id ?? "").trim();

    // **Le projet ne sert qu'au compteur de consommation.** La lecture n'en a
    // pas besoin : elle ne voit que des pages. Il est donc facultatif — une
    // lecture reste possible sans lui, et sa consommation se range alors hors
    // projet plutôt que d'être attribuée au hasard.
    const projectId = String(body?.project_id ?? "").trim() || null;

    if (!pages.length) return reponse({ error: "pages is required" }, 400);

    // Le chronomètre part **avant** l'appel au modèle : c'est lui qu'on mesure,
    // et non ce que la fonction fait de sa réponse.
    const commenceA = Date.now();

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

    // Le budget est tenu par un signal plutôt que par une course de promesses :
    // une course laisserait l'appel continuer dans le vide, et il serait payé.
    const horloge = AbortSignal.timeout(MAX_SECONDES * 1000);

    let appel: Response;
    try {
      appel = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${openAiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODELE,
          instructions: deja ? `${CONSIGNES}\n${deja}` : CONSIGNES,
          input: texte,
          max_output_tokens: MAX_JETONS,
          text: { format: { type: "json_schema", ...SCHEMA_DES_SUJETS } }
        }),
        signal: horloge
      });
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
            ? `Le modèle n'a pas répondu en ${MAX_SECONDES} secondes. Le document est peut-être `
              + "trop long pour une seule lecture."
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
     * se relit pas, et l'écran annonçait « la lecture a été refusée » : c'était
     * faux, elle avait eu lieu et elle avait été payée. La distinction change
     * ce qu'il y a à faire — un document trop long se recoupe, une lecture
     * refusée se réessaie.
     */
    const coupee = String(rendu?.status ?? "") === "incomplete";

    // Ce que cette lecture a coûté. On n'attend pas : l'extraction ne dépend
    // pas de son compteur.
    void deposerLaConsommation({
      projectId, ownerId: garde.user.id, model: MODELE,
      usageKind: "extraction-sujets", jetons: jetonsDeLaReponse(rendu)
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

    // **La porte.** Ce que le modèle n'a pas su citer ne sort pas d'ici.
    const { retenus, ecartes, pagesCorrigees } = verifierLesSujets({
      sujets: (lu.sujets as unknown[]) ?? [],
      pages
    });

    // Les rubriques passent la même porte : une section inventée deviendrait un
    // sujet père, sous lequel on rangerait des points réels.
    const sections = verifierLesRubriques({
      rubriques: (lu.rubriques as unknown[]) ?? [],
      pages
    });

    // **Un point qui vise une rubrique disparue se détache plutôt que de se
    // tromper de père.** Il redevient un point sans rubrique : cela se compte,
    // là où un mauvais rangement ne se verrait jamais.
    const ranges = rattacherAuxRubriques({ sujets: retenus, rubriques: sections.retenus });

    // **Un identifiant inventé égare un point, il ne le perd pas.** Rattaché à
    // la discussion d'un sujet qui n'a rien à voir, personne n'ira le chercher
    // — et rien ne le signalera. Ce qui n'a pas été envoyé ne revient pas.
    const rapproches = verifierLesRapprochements({ sujets: ranges.sujets, connus });

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
      /** Sous quels titres le document range ses points. */
      rubriques: rubriquesAuFormatDuMoteur(sections.retenus, { sourceId }),
      /** Combien de points visaient une rubrique qui n'a pas franchi la porte. */
      rattachements_detaches: ranges.detaches,
      sujets: sujetsAuFormatDuMoteur(etiquetes.sujets, { sourceId }),
      /** Les labels que le modèle a proposés hors de la liste fermée. */
      labels_ecartes: etiquetes.ecartes,
      /** La réponse a-t-elle été coupée ? Des points manquent alors, en silence. */
      coupee,
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
        ...sections.ecartes.map((ecart: { motif: string }) => ecart.motif),
        ...gens.ecartes.map((ecart: { motif: string }) => ecart.motif)
      ],
      pages_corrigees: pagesCorrigees + sections.pagesCorrigees + gens.pagesCorrigees,
      modele: MODELE,
      /**
       * Ce que cette lecture a pris, en millisecondes.
       *
       * **Mesuré ici, et pas au navigateur.** Le temps du réseau et celui de
       * l'attente d'un onglet en arrière-plan s'y ajouteraient, et l'on
       * comparerait deux modèles sur le débit de la connexion.
       */
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
