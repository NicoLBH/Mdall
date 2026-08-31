/**
 * Ce qu'une proposition soumet au jugement.
 *
 * Rien ici n'est calculé pour la première fois. Les documents ont été reconnus
 * au dépôt, les doublons repérés, les rattachements évalués par
 * `project-identity.js`, les avis produits par le moteur du suivi. **La revue ne
 * fabrique aucun savoir — elle donne un lieu à ce qu'on savait déjà et que
 * personne ne voyait.**
 *
 * Ce module transforme ces trois lectures en une liste d'affirmations qu'un
 * humain peut accepter ou refuser une par une. Chacune porte une clé stable,
 * `itemKey`, et c'est le point le plus important du fichier : c'est par elle
 * qu'une décision se retrouvera plus tard, quand un recalcul la contredira. Une
 * clé qui dépendrait de l'ordre d'un lot ou d'un horodatage rendrait toute
 * confrontation future impossible.
 */

import { ITEM } from "./proposition-state.js";

/**
 * Les statuts d'un avis, en français.
 *
 * Le moteur travaille avec `OPEN`, `RESOLVED`, `NO_NEWS` — c'est son affaire.
 * Les montrer tels quels à l'écran ferait lire à l'utilisateur les entrailles du
 * calcul, et « NO_NEWS → NO_NEWS » ne veut rien dire pour personne.
 */
export const STATUS_LABELS = {
  OPEN: "Ouvert",
  RESOLVED: "Levé",
  NO_NEWS: "Sans nouvelles"
};

function statusLabel(status) {
  return STATUS_LABELS[String(status ?? "")] ?? String(status ?? "");
}

/** Les natures d'affirmation qu'une proposition peut porter. */
export const ITEM_TYPE = {
  /** Un document entre dans le corpus. */
  DOCUMENT: "document",
  /** Une affaire est rattachée au projet, ou en est écartée. */
  ATTACHMENT: "attachment",
  /** Un avis apparaît, change d'état, ou est levé. */
  AVIS: "avis"
};

function item(type, key, payload) {
  return { itemType: type, itemKey: String(key), payload, status: ITEM.PROPOSED, reason: null };
}

/**
 * Un document soumis, et ce que la reconnaissance en a compris.
 *
 * La clé est l'identifiant du document : il ne bouge pas, et c'est le seul
 * élément dont on soit certain qu'il désigne toujours la même chose.
 */
export function documentItems(documents = []) {
  return documents.map((document) =>
    item(ITEM_TYPE.DOCUMENT, document.id, {
      name: document.original_filename ?? document.filename ?? "Document",
      kindLabel: document.detected_kind_label ?? null,
      author: document.detected_author ?? null,
      issuedAt: document.issued_at ?? null,
      reason: document.detection_reason ?? null,
      duplicateOf: document.duplicate_of_document_id ?? null,
      reissueOf: document.reissue_of_document_id ?? null
    })
  );
}

/**
 * Les affaires que le lot met en jeu, et ce qu'il faut en décider.
 *
 * La clé est la valeur normalisée du marqueur — l'affaire elle-même. C'est ce
 * qui fait qu'accepter « l'affaire 13861 » aujourd'hui vaudra encore dans six
 * mois, pour des documents qu'on n'a pas encore reçus.
 *
 * Les rattachements déjà certains n'ouvrent pas d'affirmation : ne rien
 * demander est la meilleure façon de ne pas lasser celui qui répond.
 */
export function attachmentItems(assessments = []) {
  return assessments
    .filter((entry) => entry.verdict !== "BELONGS" && (entry.declared ?? []).length > 0)
    .map((entry) =>
      item(ITEM_TYPE.ATTACHMENT, entry.declared.map((marker) => `${marker.type}:${marker.value}`).join("|"), {
        label: entry.declared[0].label,
        markers: entry.declared,
        verdict: entry.verdict,
        reason: entry.reason,
        documents: entry.documents ?? []
      })
    );
}

/**
 * Ce que la proposition changerait aux avis.
 *
 * On compare ce que le moteur affirme avec les documents de la proposition à ce
 * que le projet avait retenu sans eux. Trois mouvements, et seuls les deux
 * premiers ouvrent une question : un avis inchangé n'appelle aucune décision.
 *
 * La clé est le numéro que le bureau de contrôle a lui-même attribué. C'est
 * l'identité métier de l'avis, et la seule qui survive à un recalcul complet.
 */
export function avisItems(diff = {}) {
  const nouveaux = (diff.added ?? []).map((avis) =>
    item(ITEM_TYPE.AVIS, avis.reference, {
      change: "added",
      reference: avis.reference,
      title: avis.title ?? null,
      status: avis.status ?? null,
      opinion: avis.opinion_raw ?? null,
      evidence: avis.evidence ?? null
    })
  );

  const changes = (diff.changed ?? []).map((avis) =>
    item(ITEM_TYPE.AVIS, avis.reference, {
      change: "changed",
      reference: avis.reference,
      title: avis.title ?? null,
      status: avis.status ?? null,
      previousStatus: avis.previousStatus ?? null,
      opinion: avis.opinion_raw ?? null,
      previousOpinion: avis.previousOpinion ?? null,
      evidence: avis.evidence ?? null
    })
  );

  return [...nouveaux, ...changes];
}

/**
 * Un avis qu'aucun document du lot ne reprend.
 *
 * Un rapport de visite ne rappelle pas tout ce qui existe : il porte ce qui a
 * été créé ou modifié depuis le précédent. Un avis qui n'y figure pas n'est
 * donc **pas sans nouvelles** — il est simplement inchangé, et le compter comme
 * un mouvement demandait de confirmer soixante-douze fois ce que personne
 * n'avait dit.
 *
 * L'absence reste une information, et elle se lit dans l'histoire de l'avis
 * (« n'apparaît pas dans ce rapport »). Elle n'est pas une décision à prendre.
 */
function estSilence(precedent, avis) {
  const avant = String(precedent?.status ?? "");
  const apres = String(avis?.status ?? "");
  return apres === "NO_NEWS" && avant !== "NO_NEWS";
}

/**
 * Ce que les documents de la proposition changeraient aux avis du projet.
 *
 * `known` est l'état conservé — ce que le projet retient aujourd'hui.
 * `computed` est ce que le moteur affirme en y ajoutant les documents soumis.
 *
 * Quatre issues, et la quatrième est celle qui manquait :
 *
 *  - **apparu** : le lot le fait entrer ;
 *  - **modifié** : le lot en dit autre chose ;
 *  - **inchangé** : le lot le reprend à l'identique ;
 *  - **non repris** : aucun document du lot n'en parle. Ce n'est pas un
 *    mouvement — c'est un silence, et un silence ne se tranche pas.
 */
export function diffAvis(known = [], computed = []) {
  const avant = new Map(known.map((row) => [String(row.external_reference), row]));

  const added = [];
  const changed = [];
  const silent = [];
  let unchanged = 0;

  for (const avis of computed) {
    const reference = String(avis.reference ?? "");
    const precedent = avant.get(reference);

    if (!precedent) {
      added.push(avis);
      continue;
    }

    if (estSilence(precedent, avis)) {
      silent.push({ ...avis, previousStatus: precedent.status ?? null });
      continue;
    }

    const memeStatut = String(precedent.status ?? "") === String(avis.status ?? "");
    const memeAvis = String(precedent.opinion_raw ?? "") === String(avis.opinion_raw ?? "");

    if (memeStatut && memeAvis) {
      unchanged += 1;
      continue;
    }
    changed.push({
      ...avis,
      previousStatus: precedent.status ?? null,
      previousOpinion: precedent.opinion_raw ?? null
    });
  }

  return { added, changed, silent, unchanged };
}

/**
 * Ce qui a changé pour un avis, dit en français.
 *
 * L'écran affichait « OPEN → OPEN », ce qui est un non-sens : le statut n'avait
 * pas bougé, c'est l'appréciation du bureau de contrôle qui avait changé. Nommer
 * un changement, c'est nommer **ce qui** a changé — sans quoi le lecteur cherche
 * une différence là où il n'y en a pas, et cesse de faire confiance à l'écran.
 *
 * @returns {{label: string, detail: string}} l'étiquette du mouvement, et sa phrase
 */
export function describeAvisChange(payload = {}) {
  const { change, status, previousStatus, opinion, previousOpinion } = payload;

  if (change === "added") {
    return {
      label: "Nouvel avis",
      detail: [statusLabel(status), opinion ? `avis ${opinion}` : ""].filter(Boolean).join(" · ")
    };
  }

  const statutBouge = String(previousStatus ?? "") !== String(status ?? "");
  const avisBouge = String(previousOpinion ?? "") !== String(opinion ?? "");

  const morceaux = [];
  if (statutBouge) morceaux.push(`${statusLabel(previousStatus)} → ${statusLabel(status)}`);
  if (avisBouge) morceaux.push(`avis ${previousOpinion || "—"} → ${opinion || "—"}`);

  return {
    // Deux mouvements de nature différente, donc deux étiquettes : changer de
    // statut et changer d'appréciation n'appellent pas la même lecture.
    label: statutBouge ? "Change d'état" : "Appréciation modifiée",
    detail: morceaux.join(" · ") || statusLabel(status)
  };
}

/**
 * Rend aux affirmations les décisions déjà prises.
 *
 * L'analyse est refaite à chaque ouverture — c'est la doctrine : rien n'est
 * conservé de ce qui se recalcule. Mais les **réponses**, elles, se conservent,
 * et les perdre à chaque rechargement rendrait la revue impraticable dès la
 * dixième affirmation.
 */
export function applyDecisions(items = [], stored = []) {
  const decisions = new Map(stored.map((row) => [`${row.item_type}|${row.item_key}`, row]));

  return items.map((entry) => {
    const decision = decisions.get(`${entry.itemType}|${entry.itemKey}`);
    if (!decision) return entry;
    return { ...entry, status: decision.status, reason: decision.reason ?? null };
  });
}

/**
 * Ce qu'il y a à lire, par nature.
 *
 * Les nombres servent les intitulés des trois blocs, et rien d'autre : un bloc
 * vide se dit, il ne se cache pas — savoir qu'aucun avis ne change est une
 * information, pas une absence d'information.
 */
export function summarizeReview(items = []) {
  const parType = (type) => items.filter((entry) => entry.itemType === type);

  return {
    documents: parType(ITEM_TYPE.DOCUMENT).length,
    attachments: parType(ITEM_TYPE.ATTACHMENT).length,
    avis: parType(ITEM_TYPE.AVIS).length,
    refused: items.filter((entry) => entry.status === ITEM.REFUSED).length,
    undecided: items.filter((entry) => entry.status === ITEM.PROPOSED).length
  };
}
