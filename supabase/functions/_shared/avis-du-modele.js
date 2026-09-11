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
 */

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

/** Le document tel qu'on le donne à lire : une page à la fois, numérotée. */
export function pagesEnTexte(pages = [], { maxCaracteres = 120000 } = {}) {
  const morceaux = [];
  let total = 0;

  for (const page of Array.isArray(pages) ? pages : []) {
    const numero = Number(page?.page);
    const texte = String(page?.text ?? page?.texte ?? "").trim();
    if (!texte) continue;

    const bloc = `\n=== PAGE ${Number.isFinite(numero) ? numero : "?"} ===\n${texte}`;
    if (total + bloc.length > maxCaracteres) break;

    morceaux.push(bloc);
    total += bloc.length;
  }

  return morceaux.join("\n");
}

/**
 * Le texte, réduit à ce qui se compare.
 *
 * Une extraction de PDF coupe les lignes où la mise en page le veut, double les
 * espaces et garde les insécables. Comparer des chaînes brutes ferait échouer
 * des citations exactes pour des raisons de typographie.
 */
function aplati(valeur) {
  return String(valeur ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[   ]/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pourquoi un avis rendu par le modèle n'entre pas. */
export const ECART = {
  /** Aucune citation : rien à vérifier, donc rien à croire. */
  SANS_CITATION: "sans-citation",
  /** La citation ne se retrouve pas dans le document. */
  INTROUVABLE: "introuvable",
  /** Ni intitulé ni teneur : ce n'est pas un avis. */
  VIDE: "vide"
};

export const PHRASES_DE_LECART = {
  [ECART.SANS_CITATION]: "cette ligne ne cite pas le document",
  [ECART.INTROUVABLE]: "cette citation ne se retrouve pas dans le document",
  [ECART.VIDE]: "cette ligne ne porte ni intitulé ni teneur"
};

/**
 * Ce que le modèle a rendu, confronté au document.
 *
 * ## Le seul garde-fou qui compte
 *
 * Un modèle peut inventer une ligne entière — un avis plausible sur un point
 * plausible. Rien dans sa réponse ne le trahit. Ce qui le trahit, c'est le
 * **document** : une citation qu'on n'y retrouve pas n'a pas été lue.
 *
 * La recherche se fait d'abord dans la page annoncée — c'est le cas strict —,
 * puis dans le document entier : une erreur d'une page sur la citation d'une
 * ligne réelle ne doit pas faire perdre l'avis, mais elle se note.
 *
 * ## Ce qui est écarté se compte
 *
 * On ne rend pas une liste propre en taisant ce qu'on a jeté : c'est la mesure
 * de ce que la lecture n'a pas su faire, et elle doit se voir avant qu'on signe.
 *
 * @returns {{retenus: object[], ecartes: object[], pagesCorrigees: number}}
 */
export function verifierLesAvis({ avis = [], pages = [] } = {}) {
  const parPage = new Map();
  const morceaux = [];

  for (const page of Array.isArray(pages) ? pages : []) {
    const numero = Number(page?.page);
    const plat = aplati(page?.text ?? page?.texte);
    if (!plat) continue;

    if (Number.isFinite(numero)) parPage.set(numero, plat);
    morceaux.push(plat);
  }

  const document = morceaux.join(" ");

  const retenus = [];
  const ecartes = [];
  let pagesCorrigees = 0;

  for (const ligne of Array.isArray(avis) ? avis : []) {
    const intitule = String(ligne?.intitule ?? "").trim();
    const teneur = String(ligne?.teneur ?? "").trim();
    if (!intitule && !teneur) {
      ecartes.push({ avis: ligne, motif: ECART.VIDE });
      continue;
    }

    const citation = aplati(ligne?.citation);
    if (!citation) {
      ecartes.push({ avis: ligne, motif: ECART.SANS_CITATION });
      continue;
    }

    const annoncee = Number(ligne?.page);
    const surSaPage = Number.isFinite(annoncee) && (parPage.get(annoncee) ?? "").includes(citation);

    if (surSaPage) {
      retenus.push({ ...ligne, citationVerifiee: true, pageVerifiee: true });
      continue;
    }

    // La citation existe, mais pas là où le modèle l'a dite. On la garde — la
    // ligne a bien été lue — et l'on cherche sa vraie page, sans quoi le lien
    // vers le PDF ouvrirait la mauvaise.
    if (document.includes(citation)) {
      const vraie = [...parPage.entries()].find(([, plat]) => plat.includes(citation))?.[0] ?? null;
      pagesCorrigees += 1;
      retenus.push({ ...ligne, page: vraie, citationVerifiee: true, pageVerifiee: false });
      continue;
    }

    ecartes.push({ avis: ligne, motif: ECART.INTROUVABLE });
  }

  return { retenus, ecartes, pagesCorrigees };
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
