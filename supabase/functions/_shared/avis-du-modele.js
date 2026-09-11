/**
 * Lire les avis d'un rapport par le modèle, et vérifier ce qu'il rend.
 *
 * ## Pourquoi on arrête l'extraction en dur
 *
 * Elle marchait — sur **un** modèle de rapport. Le métier en produit beaucoup
 * plus : RICT, fiche d'examen de document, fiche de travaux, rapport d'étape,
 * RFCT, RVRAT — et cela pour chaque bureau de contrôle. Et un bureau change ses
 * modèles quand il veut : SOCOTEC vient de refaire les siens.
 *
 * Écrire un extracteur par forme, c'est s'engager à en écrire quarante-cinq,
 * puis à les réparer chaque fois qu'un émetteur refait sa maquette. Le coût
 * d'exécution d'un appel au modèle — **une fois par pièce, au versement** — est
 * sans commune mesure avec ce coût de maintenance.
 *
 * Et l'extraction en dur perdait la chose la plus utile : sur « Neige —
 * Favorable », elle laissait tomber « Région A2, altitude 260 m », c'est-à-dire
 * **ce que le bureau a effectivement examiné**. Sans cela, un engagement ne se
 * vérifie pas.
 *
 * ## Ce qui rend le modèle acceptable ici : la citation
 *
 * Un modèle peut inventer. On ne lui demande donc pas d'être fiable, on **le
 * vérifie** : chaque avis rendu doit porter la ligne du document d'où il sort,
 * et cette ligne est recherchée dans le texte de la page annoncée. Une ligne
 * qu'on ne retrouve pas est **écartée**, et le compte de ce qui a été écarté se
 * dit — c'est la mesure de ce que la lecture n'a pas su faire (règle 5).
 *
 * La vérification est mécanique, elle ne demande aucun jugement, et elle
 * s'exécute au serveur avant que quoi que ce soit ne revienne au navigateur.
 *
 * ## Ce qu'on ne lui demande pas
 *
 * **De normaliser.** Si la légende du document dit « A : Acceptable », l'avis
 * rendu porte « A ». Traduire en « Favorable » ferait dire au rapport ce qu'il
 * n'écrit pas. La légende est lue **dans le document** et rendue à part.
 *
 * **De juger.** Il ne dit pas si l'avis est important, ni ce qu'il faudrait en
 * faire. Il lit.
 *
 * ## Le garde-fou lui-même vit ailleurs
 *
 * La vérification par la citation ne concerne pas que les avis : elle vaut pour
 * toute lecture par le modèle, et les comptes rendus de chantier s'y soumettent
 * de la même façon. Elle est donc dans `citation-verifiee.js`, écrite une seule
 * fois — une règle recopiée diverge, et elle diverge par le bas.
 */

import { ECART, verifierLesCitations } from "./citation-verifiee.js";

export { ECART, PHRASES_DE_LECART, pagesEnTexte } from "./citation-verifiee.js";

/** Ce que le modèle doit rendre, et rien d'autre. */
export const SCHEMA_DES_AVIS = {
  name: "avis_du_rapport",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      organisme: { anyOf: [{ type: "string" }, { type: "null" }] },
      type_de_rapport: { anyOf: [{ type: "string" }, { type: "null" }] },
      reference_du_rapport: { anyOf: [{ type: "string" }, { type: "null" }] },
      emis_le: { anyOf: [{ type: "string" }, { type: "null" }] },
      /**
       * La légende des codes, **lue dans le document**.
       *
       * C'est elle qui rend la lecture indépendante de l'émetteur : « F :
       * Favorable » chez l'un, « A : Acceptable » chez l'autre, et rien à
       * écrire dans le code pour le second.
       */
      legende: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { code: { type: "string" }, libelle: { type: "string" } },
          required: ["code", "libelle"]
        }
      },
      avis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            reference: { anyOf: [{ type: "string" }, { type: "null" }] },
            intitule: { type: "string" },
            teneur: { type: "string" },
            teneur_libelle: { anyOf: [{ type: "string" }, { type: "null" }] },
            /**
             * Ce que le bureau a écrit **en plus** du verdict : « Région A2,
             * altitude 260 m », « Taux de travail de 1 bar aux ELS ». C'est ce
             * que l'extraction en dur perdait, et c'est ce qui permet de
             * vérifier un engagement.
             */
            constat: { anyOf: [{ type: "string" }, { type: "null" }] },
            page: { anyOf: [{ type: "integer" }, { type: "null" }] },
            /** La ligne du document d'où l'avis sort. Sans elle, rien n'entre. */
            citation: { type: "string" }
          },
          required: ["reference", "intitule", "teneur", "teneur_libelle", "constat", "page", "citation"]
        }
      }
    },
    required: ["organisme", "type_de_rapport", "reference_du_rapport", "emis_le", "legende", "avis"]
  }
};

export const CONSIGNES = [
  "Tu lis un document de bureau de contrôle et tu en extrais les avis. Tu ne juges rien, tu ne résumes rien, tu ne complètes rien.",
  "",
  "Un avis est une ligne où le bureau se prononce sur un point du projet. Selon les documents, cela se présente en tableau, en liste, ou en paragraphes.",
  "",
  "Pour chaque avis :",
  "- `intitule` : ce qui a été examiné, tel qu'écrit — « Neige », « Dimensionnement », « Zone de neige ». Jamais reformulé.",
  "- `teneur` : le code tel qu'il est écrit dans le document — F, S, D, HM, PM, SO, A, R… Ne le traduis pas et n'en invente pas.",
  "- `teneur_libelle` : ce que la légende du document dit de ce code, si elle le dit. Sinon null.",
  "- `constat` : ce que le bureau a écrit EN PLUS du verdict — « Région A2, altitude 260 m », « Absence d'information sur les fondations ». C'est le champ le plus utile : ne le laisse jamais vide quand le document porte quelque chose.",
  "- `reference` : le numéro de l'avis s'il en porte un, sinon null. Beaucoup n'en ont pas, c'est normal.",
  "- `page` : la page où l'avis se lit.",
  "- `citation` : la ligne du document d'où l'avis sort, RECOPIÉE MOT POUR MOT. Elle sera recherchée dans le texte de la page : si elle ne s'y retrouve pas, l'avis sera écarté.",
  "",
  "Au niveau du document :",
  "- `organisme` : le bureau de contrôle qui a émis ce document, tel qu'il s'y nomme.",
  "- `type_de_rapport`, `reference_du_rapport`, `emis_le` : tels que le document les déclare.",
  "- `legende` : les codes d'avis et leur signification, lus dans le document.",
  "",
  "Ce qui n'est pas dans le document vaut null. N'invente jamais pour remplir un champ."
].join("\n");

/**
 * Ce que le modèle a rendu, confronté au document.
 *
 * Le refus est celui de `citation-verifiee.js` — le même pour toutes les
 * lectures. Ce qui appartient aux avis, et qu'on lui apprend ici, est ce qui
 * fait qu'une ligne **n'est pas un avis** : ni intitulé, ni teneur. La
 * vérification ne peut pas le savoir toute seule, et le lui écrire en dur
 * l'aurait rendue inutilisable pour la lecture suivante.
 *
 * Les écarts se rendent sous le nom que ce module emploie depuis toujours —
 * `avis` et non `ligne` : changer une clé pour une raison de refactorisation
 * ferait taire un appelant qui, lui, n'a pas changé.
 *
 * @returns {{retenus: object[], ecartes: object[], pagesCorrigees: number}}
 */
export function verifierLesAvis({ avis = [], pages = [] } = {}) {
  const { retenus, ecartes, pagesCorrigees } = verifierLesCitations({
    lignes: avis,
    pages,
    estVide: (ligne) =>
      !String(ligne?.intitule ?? "").trim() && !String(ligne?.teneur ?? "").trim()
  });

  return {
    retenus,
    ecartes: ecartes.map(({ ligne, motif }) => ({ avis: ligne, motif })),
    pagesCorrigees
  };
}

/**
 * Ce que le modèle a rendu, dans la forme que le reste de Mdall attend déjà.
 *
 * `services/avis-versement.js` et `services/avis-liaison.js` lisent `title_raw`,
 * `value.opinion_raw`, `opinion_label` et `provenance` — la forme du moteur
 * d'extraction. On s'y conforme plutôt que de changer quatre modules : ce qui
 * change ici est **d'où** viennent les avis, pas ce qu'on en fait.
 *
 * Le `constat` rejoint la description : c'est là que la liaison va le chercher,
 * et c'est ce qui manquait à l'écran.
 */
export function avisAuFormatDuMoteur(retenus = [], { sourceId = "" } = {}) {
  return (Array.isArray(retenus) ? retenus : []).map((ligne, rang) => {
    const reference = String(ligne?.reference ?? "").trim();
    const teneur = String(ligne?.teneur ?? "").trim();
    const libelle = String(ligne?.teneur_libelle ?? "").trim();

    return {
      kind: reference ? "extraction" : "observation",
      key: `modele:${sourceId}:${rang + 1}`,
      title_raw: String(ligne?.intitule ?? "").trim(),
      description_raw: String(ligne?.constat ?? "").trim(),
      opinion_label: libelle || teneur,
      value: {
        external_reference_raw: reference || null,
        external_reference_normalized: reference || null,
        opinion_raw: teneur
      },
      provenance: {
        source_id: sourceId,
        page: Number.isFinite(Number(ligne?.page)) ? Number(ligne.page) : null,
        excerpt: String(ligne?.citation ?? "").trim()
      },
      lu_par: "modele"
    };
  });
}
