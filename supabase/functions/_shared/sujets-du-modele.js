/**
 * Lire les sujets d'un compte rendu de chantier par le modèle.
 *
 * ## Ce que ce fichier remplace
 *
 * Rien — et c'est le problème qu'il ferme. Déposer un compte rendu de chantier
 * n'ajoutait aucun sujet, ni par une proposition, ni par un dépôt direct. Un
 * chemin existait bien, l'ancienne pipeline d'analyse, mais il produisait des
 * sujets **à partir d'un PDF, sans proposition** : il contournait la règle 1,
 * et il s'en va avec cette version.
 *
 * ## Pourquoi le modèle, et pas un extracteur
 *
 * La même raison que pour les avis, en pire. Un livrable de bureau de contrôle
 * suit au moins la maquette de son émetteur ; un compte rendu de chantier suit
 * celle de son maître d'œuvre, et il y en a autant que d'agences. Tableaux à
 * trois colonnes, listes numérotées par lot, paragraphes courants : aucune
 * forme ne domine, et aucune ne tient d'un chantier au suivant.
 *
 * ## Ce qui rend le modèle acceptable : la citation, encore
 *
 * Chaque sujet rendu porte la ligne du compte rendu d'où il sort, et cette
 * ligne est recherchée dans le texte de la page — au serveur, avant la réponse.
 * Ce qui ne s'y retrouve pas est écarté et compté. Le garde-fou est celui de
 * `citation-verifiee.js` : le même pour toutes les lectures, écrit une fois.
 *
 * L'enjeu est ici plus grand que pour un avis. Un avis inventé se remarque — il
 * porte un code que la légende ne connaît pas. Un sujet inventé, lui, est
 * plausible : « Reprise d'étanchéité en toiture terrasse » pourrait figurer
 * dans n'importe quel compte rendu. Sans la citation, rien ne le distinguerait
 * d'un vrai, et l'on ouvrirait des sujets sur un chantier pour une phrase que
 * personne n'a écrite.
 *
 * ## Ce qu'on ne lui demande pas
 *
 * **De juger.** Ni la priorité, ni la gravité, ni l'urgence. Un compte rendu ne
 * les écrit pas, et les deviner ferait classer un chantier sur une intuition.
 *
 * **De trancher.** Ce qu'il rend n'est pas un sujet du projet : c'est une
 * **proposition** de sujet, qu'un humain accepte ou refuse. Rien n'entre
 * directement (règle 1), et ceci moins que tout : ouvrir un sujet engage
 * quelqu'un à le traiter.
 */

import { verifierLesCitations } from "./citation-verifiee.js";

export { ECART, PHRASES_DE_LECART, pagesEnTexte } from "./citation-verifiee.js";

/** Ce que le modèle doit rendre, et rien d'autre. */
export const SCHEMA_DES_SUJETS = {
  name: "sujets_du_compte_rendu",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      numero_de_reunion: { anyOf: [{ type: "string" }, { type: "null" }] },
      tenue_le: { anyOf: [{ type: "string" }, { type: "null" }] },
      redige_par: { anyOf: [{ type: "string" }, { type: "null" }] },
      sujets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            /** Le lot tel qu'écrit — « 02 — GROS ŒUVRE ». Il ne se traduit pas en code. */
            lot: { anyOf: [{ type: "string" }, { type: "null" }] },
            /**
             * Le numéro que le compte rendu donne au point — « 12.02.1 ».
             *
             * C'est lui qui fait qu'un point reporté d'une réunion à la suivante
             * se reconnaît : sans lui, la douzième réunion rouvrirait douze fois
             * la même chose.
             */
            reference: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** Ce qu'il y a à traiter, en une ligne, dans les mots du document. */
            titre: { type: "string" },
            /** Ce que le compte rendu en dit, recopié et non résumé. */
            description: { type: "string" },
            /** À qui c'est demandé, tel qu'écrit. Jamais un nom de personne deviné. */
            qui: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** La date ou le délai annoncé, tel qu'écrit. */
            echeance: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** « nouveau », « en cours », « soldé »… tel que le document le marque. */
            etat: { anyOf: [{ type: "string" }, { type: "null" }] },
            page: { anyOf: [{ type: "integer" }, { type: "null" }] },
            /** La ligne du document d'où le sujet sort. Sans elle, rien n'entre. */
            citation: { type: "string" }
          },
          required: ["lot", "reference", "titre", "description", "qui", "echeance", "etat", "page", "citation"]
        }
      },
      /**
       * Qui travaille sur ce chantier.
       *
       * **Pourquoi le compte rendu est le bon endroit pour le savoir.** Un
       * compte rendu de chantier nomme tout le monde : il ouvre par la liste
       * des présents, des absents et des excusés, et il découpe ses points par
       * lot en nommant l'entreprise de chacun. C'est la source la plus complète
       * et la plus à jour qui existe sur un chantier — plus que n'importe quel
       * fichier tenu à la main, parce qu'elle se remet à jour toute seule à
       * chaque réunion.
       *
       * Et c'est ce qui manque pour suivre un point d'une semaine à l'autre :
       * sans la liste des intervenants, « qui doit reprendre l'étanchéité »
       * reste un texte, et un sujet ne peut être assigné à personne.
       */
      intervenants: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            /** L'entreprise ou l'organisme, tel qu'écrit. C'est le repère principal. */
            societe: { type: "string" },
            /** La personne, quand le document la nomme. Jamais devinée. */
            nom: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** Son rôle tel qu'écrit — « maîtrise d'œuvre », « lot 02 — gros œuvre ». */
            role: { anyOf: [{ type: "string" }, { type: "null" }] },
            page: { anyOf: [{ type: "integer" }, { type: "null" }] },
            /** La ligne d'où l'intervenant sort. Sans elle, rien n'entre. */
            citation: { type: "string" }
          },
          required: ["societe", "nom", "role", "page", "citation"]
        }
      }
    },
    required: ["numero_de_reunion", "tenue_le", "redige_par", "sujets", "intervenants"]
  }
};

export const CONSIGNES = [
  "Tu lis un compte rendu de réunion de chantier et tu en extrais les points à traiter. Tu ne juges rien, tu ne résumes rien, tu ne complètes rien.",
  "",
  "Un point à traiter est une observation, une demande, une réserve ou une question que le compte rendu adresse à quelqu'un. Selon les maîtres d'œuvre, cela se présente en tableau, en liste numérotée par lot, ou en paragraphes.",
  "",
  "Ce qui n'en est PAS un, et que tu laisses de côté : l'ordre du jour, la liste des présents, la liste de diffusion, l'heure d'ouverture et de clôture, la date de la prochaine réunion, les rappels de pièces contractuelles.",
  "",
  "Pour chaque point :",
  "- `titre` : ce qu'il y a à traiter, en une ligne, DANS LES MOTS DU DOCUMENT. Ne reformule pas et n'ajoute pas de verbe d'action qui n'y est pas.",
  "- `description` : ce que le compte rendu en dit, recopié. Si le document n'en dit pas plus que le titre, reprends le titre.",
  "- `lot` : le lot sous lequel le point est écrit, tel qu'écrit — « 02 — GROS ŒUVRE ». Sinon null.",
  "- `reference` : le numéro que le compte rendu donne au point — « 12.02.1 », « 4.3 ». Sinon null.",
  "- `qui` : à qui c'est demandé, tel qu'écrit — un lot, une entreprise, « MOE ». Jamais un nom de personne que tu supposes.",
  "- `echeance` : la date ou le délai annoncé, tel qu'écrit. Sinon null.",
  "- `etat` : « nouveau », « en cours », « soldé », « levé »… tel que le document le marque. Sinon null.",
  "- `page` : la page où le point se lit.",
  "- `citation` : la ligne du document d'où le point sort, RECOPIÉE MOT POUR MOT. Elle sera recherchée dans le texte de la page : si elle ne s'y retrouve pas, le point sera écarté.",
  "",
  "Au niveau du document :",
  "- `numero_de_reunion`, `tenue_le`, `redige_par` : tels que le document les déclare.",
  "",
  "Les intervenants : relève ceux que le document nomme — dans la liste des présents, des absents, des excusés, dans la liste de diffusion, et dans les en-têtes de lot qui nomment une entreprise.",
  "- `societe` : l'entreprise ou l'organisme, tel qu'écrit. C'est le champ obligatoire : une ligne sans société n'est pas un intervenant.",
  "- `nom` : la personne, UNIQUEMENT si le document la nomme. Jamais un nom que tu supposes, jamais un nom reconstruit à partir d'une adresse.",
  "- `role` : son rôle tel qu'écrit — « maîtrise d'œuvre », « lot 02 — gros œuvre », « bureau de contrôle ». Sinon null.",
  "- `citation` : la ligne d'où il sort, RECOPIÉE MOT POUR MOT.",
  "Ne relève pas d'adresse électronique ni de numéro de téléphone, même écrits : ils ne servent à rien ici et ils n'ont pas à voyager.",
  "Une même entreprise citée trois fois ne se relève qu'une fois, avec le nom de personne le plus complet que le document en donne.",
  "",
  "Ce qui n'est pas dans le document vaut null. N'invente jamais pour remplir un champ.",
  "N'invente surtout jamais un point : un point plausible que personne n'a écrit ferait ouvrir un sujet sur un chantier réel."
].join("\n");

/**
 * Ce que le modèle a rendu, confronté au document.
 *
 * Ce qui appartient aux sujets, et qu'on apprend ici à la vérification, est ce
 * qui fait qu'une ligne **n'est pas un point à traiter** : pas de titre. Le
 * reste peut manquer — beaucoup de comptes rendus ne numérotent rien, et
 * exiger une référence ferait perdre l'essentiel de ce qu'ils portent.
 *
 * @returns {{retenus: object[], ecartes: object[], pagesCorrigees: number}}
 */
/**
 * Les intervenants rendus, confrontés au document.
 *
 * Le même garde-fou que les sujets, et pour une raison plus forte encore : un
 * intervenant inventé n'est pas une ligne de trop dans une liste, c'est **une
 * entreprise qui n'existe pas sur ce chantier**, à qui l'on finirait par
 * assigner des points.
 *
 * Ce qui fait qu'une ligne n'est pas un intervenant : pas de société. Le nom de
 * la personne peut manquer — beaucoup de comptes rendus ne nomment que les
 * entreprises, et l'exiger perdrait l'essentiel.
 */
export function verifierLesIntervenants({ intervenants = [], pages = [] } = {}) {
  const { retenus, ecartes, pagesCorrigees } = verifierLesCitations({
    lignes: intervenants,
    pages,
    estVide: (ligne) => !String(ligne?.societe ?? "").trim()
  });

  return {
    retenus,
    ecartes: ecartes.map(({ ligne, motif }) => ({ intervenant: ligne, motif })),
    pagesCorrigees
  };
}

export function verifierLesSujets({ sujets = [], pages = [] } = {}) {
  const { retenus, ecartes, pagesCorrigees } = verifierLesCitations({
    lignes: sujets,
    pages,
    estVide: (ligne) => !String(ligne?.titre ?? "").trim()
  });

  return {
    retenus,
    ecartes: ecartes.map(({ ligne, motif }) => ({ sujet: ligne, motif })),
    pagesCorrigees
  };
}

/**
 * Ce que le modèle a rendu, dans la forme qu'une proposition attend.
 *
 * La clé porte le document et le rang : deux points d'un même compte rendu ne
 * se confondent pas, et un même compte rendu relu deux fois rend les mêmes
 * clés. Quand le compte rendu numérote lui-même ses points, c'est **son**
 * numéro qui fait la clé : c'est ce qui permet de reconnaître, à la douzième
 * réunion, le point ouvert à la quatrième.
 */
/**
 * Les intervenants, dans la forme qu'une proposition attend.
 *
 * **La clé est la société, aplatie.** C'est le repère qui tient d'une réunion à
 * l'autre : le représentant change, l'entreprise reste. Prendre le nom de la
 * personne ferait proposer deux fois la même entreprise dès qu'un compte rendu
 * nomme un autre conducteur de travaux.
 */
export function intervenantsAuFormatDuMoteur(retenus = [], { sourceId = "" } = {}) {
  return (Array.isArray(retenus) ? retenus : []).map((ligne) => {
    const societe = String(ligne?.societe ?? "").trim();

    return {
      key: `intervenant:${aplati(societe)}`,
      societe,
      nom: String(ligne?.nom ?? "").trim() || null,
      role: String(ligne?.role ?? "").trim() || null,
      provenance: {
        source_id: sourceId,
        page: Number.isFinite(Number(ligne?.page)) ? Number(ligne.page) : null,
        excerpt: String(ligne?.citation ?? "").trim()
      },
      lu_par: "modele"
    };
  });
}

/** Un nom réduit à ce qui se compare, pour que « SARL Alpha » et « Sarl  Alpha » soient un. */
function aplati(valeur) {
  return String(valeur ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sujetsAuFormatDuMoteur(retenus = [], { sourceId = "" } = {}) {
  return (Array.isArray(retenus) ? retenus : []).map((ligne, rang) => {
    const reference = String(ligne?.reference ?? "").trim();

    return {
      key: reference ? `cr:${reference}` : `cr:${sourceId}:${rang + 1}`,
      titre: String(ligne?.titre ?? "").trim(),
      description: String(ligne?.description ?? "").trim(),
      lot: String(ligne?.lot ?? "").trim() || null,
      reference: reference || null,
      qui: String(ligne?.qui ?? "").trim() || null,
      echeance: String(ligne?.echeance ?? "").trim() || null,
      etat: String(ligne?.etat ?? "").trim() || null,
      provenance: {
        source_id: sourceId,
        page: Number.isFinite(Number(ligne?.page)) ? Number(ligne.page) : null,
        excerpt: String(ligne?.citation ?? "").trim()
      },
      lu_par: "modele"
    };
  });
}
