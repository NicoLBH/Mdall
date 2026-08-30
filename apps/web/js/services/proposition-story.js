/**
 * L'histoire d'une proposition : qui, quand, quoi.
 *
 * Une proposition n'est pas seulement un lot de documents et une liste de
 * décisions : c'est une **suite d'actes datés et signés**. Six mois plus tard,
 * ce qu'on vient chercher n'est presque jamais « quels fichiers » — c'est « qui
 * a décidé ça, quand, et sur la foi de quoi ». Une PR GitHub met sa description
 * en première position d'une conversation pour exactement cette raison : le
 * texte n'est pas un champ de formulaire, c'est le premier message de quelqu'un.
 *
 * Ce module ne lit aucune base : il reçoit ce qui a été enregistré et en fait
 * une suite d'événements. Rien n'y est inventé — chaque ligne s'appuie sur un
 * horodatage réellement écrit quelque part. Quand un auteur est inconnu, on
 * écrit « un collaborateur » plutôt qu'un identifiant : c'est vrai, et cela
 * n'apprend rien de moins.
 *
 * Le regroupement par minute est délibéré. Déposer dix-sept fichiers produit
 * dix-sept lignes en base et **un seul geste** : les raconter une par une
 * noierait la décision sous la mécanique.
 */

import { ITEM } from "./proposition-state.js";
import { PROPOSITION } from "./proposition-state.js";

/** Ce qu'une ligne de l'histoire peut être. */
export const STORY = {
  OPENED: "opened",
  DEPOSIT: "deposit",
  DECISION: "decision",
  /** Quelqu'un a écrit quelque chose. */
  COMMENT: "comment",
  MERGED: "merged",
  CLOSED: "closed"
};

/**
 * Le nom d'un auteur.
 *
 * La table peut porter une simple chaîne (le nom) ou un auteur complet (nom et
 * avatar) : les deux formes se lisent ici, de sorte qu'ajouter les visages n'ait
 * pas obligé à changer chaque appel.
 */
function nameOf(id, names) {
  const entree = names?.get?.(String(id ?? ""));
  if (!entree) return "Un collaborateur";
  return (typeof entree === "string" ? entree : entree.name) || "Un collaborateur";
}

function avatarOf(id, names) {
  const entree = names?.get?.(String(id ?? ""));
  return typeof entree === "string" ? "" : (entree?.avatarUrl ?? "");
}

/** La minute d'un horodatage : l'unité d'un geste humain. */
function minuteKey(value) {
  return String(value ?? "").slice(0, 16);
}

function accord(nombre, singulier, pluriel) {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

/**
 * Vrai si cet horodatage appartient au geste de fermeture.
 *
 * La fermeture écrit d'un coup toutes les affirmations — c'est le gel. Les
 * raconter comme une décision séparée dirait deux fois la même chose, à une
 * seconde d'intervalle, et la seconde ligne aurait l'air d'un doublon.
 */
function belongsToClosing(at, closedAt) {
  if (!at || !closedAt) return false;
  return Math.abs(new Date(at).getTime() - new Date(closedAt).getTime()) < 120000;
}

/**
 * L'histoire d'une proposition, du plus ancien au plus récent.
 *
 * @param {{proposition: object, documents?: object[], decisions?: object[],
 *          names?: Map<string,string>}} source
 * @returns {object[]} des événements `{kind, at, who, text, detail}`
 */
export function buildStory({
  proposition,
  documents = [],
  decisions = [],
  comments = [],
  names = new Map()
} = {}) {
  if (!proposition) return [];

  const closedAt = proposition.merged_at ?? proposition.closed_at ?? null;
  const events = [];

  events.push({
    kind: STORY.OPENED,
    at: proposition.created_at ?? null,
    who: nameOf(proposition.created_by, names),
    avatarUrl: avatarOf(proposition.created_by, names),
    authorId: String(proposition.created_by ?? ""),
    text: "a ouvert cette proposition",
    detail: ""
  });

  // Les messages prennent leur place dans l'ordre du temps, entre les actes.
  // Les séparer — la discussion d'un côté, les faits de l'autre — perdrait ce
  // qui fait la valeur d'un fil : une objection se lit à côté de ce qu'elle
  // vise, pas dans une autre colonne.
  for (const comment of comments) {
    events.push({
      kind: STORY.COMMENT,
      at: comment.created_at ?? null,
      who: nameOf(comment.author_id, names),
      avatarUrl: avatarOf(comment.author_id, names),
      authorId: String(comment.author_id ?? ""),
      commentId: String(comment.id ?? ""),
      body: comment.deleted_at ? "" : String(comment.body ?? ""),
      editedAt: comment.edited_at ?? null,
      deleted: Boolean(comment.deleted_at),
      text: "a commenté",
      detail: ""
    });
  }

  // Les dépôts, par geste. Une proposition peut en accumuler plusieurs : c'est
  // la raison d'être des propositions plutôt que des dépôts isolés.
  const depots = new Map();
  for (const document of documents) {
    const cle = `${document.created_by ?? ""}|${minuteKey(document.created_at)}`;
    const groupe = depots.get(cle) ?? { at: document.created_at, who: document.created_by, names: [] };
    groupe.names.push(document.original_filename ?? document.filename ?? "document");
    depots.set(cle, groupe);
  }

  for (const groupe of depots.values()) {
    events.push({
      kind: STORY.DEPOSIT,
      at: groupe.at,
      who: nameOf(groupe.who, names),
      avatarUrl: avatarOf(groupe.who, names),
      text: `a déposé ${accord(groupe.names.length, "livrable", "livrables")}`,
      detail: nameSome(groupe.names)
    });
  }

  // Les décisions prises en cours de route, hors du gel de la fermeture.
  const gestes = new Map();
  for (const decision of decisions) {
    if (!decision.decided_at || belongsToClosing(decision.decided_at, closedAt)) continue;
    const cle = `${decision.decided_by ?? ""}|${minuteKey(decision.decided_at)}`;
    const geste = gestes.get(cle) ?? { at: decision.decided_at, who: decision.decided_by, accepted: 0, refused: 0 };
    if (decision.status === ITEM.REFUSED) geste.refused += 1;
    else geste.accepted += 1;
    gestes.set(cle, geste);
  }

  for (const geste of gestes.values()) {
    const morceaux = [];
    if (geste.accepted > 0) morceaux.push(accord(geste.accepted, "affirmation acceptée", "affirmations acceptées"));
    if (geste.refused > 0) morceaux.push(accord(geste.refused, "affirmation écartée", "affirmations écartées"));

    events.push({
      kind: STORY.DECISION,
      at: geste.at,
      who: nameOf(geste.who, names),
      avatarUrl: avatarOf(geste.who, names),
      text: `a tranché : ${morceaux.join(", ")}`,
      detail: ""
    });
  }

  if (proposition.status === PROPOSITION.MERGED) {
    events.push({
      kind: STORY.MERGED,
      at: proposition.merged_at ?? null,
      who: nameOf(proposition.merged_by, names),
      avatarUrl: avatarOf(proposition.merged_by, names),
      text: "a fusionné la proposition",
      // Ce que l'auteur a écrit en signant passe avant le résumé que la machine
      // sait faire : c'est la seule phrase du lot que personne d'autre ne
      // pouvait écrire.
      title: String(proposition.merge_title ?? "").trim(),
      note: String(proposition.merge_note ?? "").trim(),
      detail: describeOutcome(proposition.snapshot)
    });
  }

  if (proposition.status === PROPOSITION.CLOSED) {
    events.push({
      kind: STORY.CLOSED,
      at: proposition.closed_at ?? null,
      who: nameOf(proposition.closed_by, names),
      avatarUrl: avatarOf(proposition.closed_by, names),
      text: "a abandonné la proposition",
      detail: "Ses documents restent au projet, marqués refusés."
    });
  }

  // Un horodatage manquant ne fait pas remonter un événement en tête : il le
  // laisse où sa place logique l'a mis.
  return events
    .map((event, rang) => ({ ...event, rang }))
    .sort((gauche, droite) => {
      const a = gauche.at ? new Date(gauche.at).getTime() : Number.NaN;
      const b = droite.at ? new Date(droite.at).getTime() : Number.NaN;
      if (Number.isNaN(a) || Number.isNaN(b) || a === b) return gauche.rang - droite.rang;
      return a - b;
    });
}

/** Ce que la fusion a retenu, quand on l'a conservé. */
function describeOutcome(snapshot) {
  if (!snapshot) return "";

  const acceptes = Number(snapshot.acceptedCount) || 0;
  const refuses = Number(snapshot.refusedCount) || 0;

  return refuses > 0
    ? `${accord(acceptes, "affirmation acceptée", "affirmations acceptées")}, ${accord(
        refuses,
        "refusée",
        "refusées"
      )}.`
    : `${accord(acceptes, "affirmation acceptée", "affirmations acceptées")}.`;
}

/** Trois noms, puis un compte : une liste de dix-sept fichiers n'est plus une phrase. */
export function nameSome(noms = [], limite = 3) {
  const propres = noms.filter(Boolean);
  if (propres.length === 0) return "";

  return `${propres.slice(0, limite).join(", ")}${
    propres.length > limite ? ` et ${propres.length - limite} autre(s)` : ""
  }`;
}
