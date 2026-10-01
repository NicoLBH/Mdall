/**
 * L'idée relevée dans un document d'un projet — et son chemin vers la mémoire.
 *
 * ## La différence avec `une-idee.js`
 *
 * Celui-là décrit une idée **comptée sur tous les chantiers** : deux termes, un
 * lien, et des nombres. Celle-ci est une idée **lue dans un document précis** :
 * elle porte en plus la phrase exacte, le document et la page. C'est la même
 * forme — deux côtés et un lien nommé —, et les sortes de liens viennent de là
 * (règle 10). Ce qui s'ajoute ici est la provenance, sans laquelle rien n'entre
 * dans une mémoire.
 *
 * ## Le chemin, et pourquoi il n'y a rien de neuf dessus
 *
 *     document → lecture gardée → affirmation de proposition → signature → mémoire
 *
 * Une idée **n'est pas une nouvelle sorte de ligne de proposition**. C'est une
 * affirmation de mémoire, exactement celle que l'Atelier propose déjà : la
 * proposition l'écrit en mdall toute seule, la revue la coche, la fusion
 * l'applique. Inventer une nature « idée » aurait fait un second chemin à
 * tenir, un second écran, une seconde fusion — pour écrire la même chose
 * (règle 4).
 *
 * ## Ce qu'une idée affirme, et rien de plus
 *
 * Une idée lue dans un compte rendu ne dit pas qu'un plancher sera repris. Elle
 * dit que **ce document énonce un lien entre deux termes**. C'est tout ce qu'on
 * sait, et c'est donc tout ce qui est écrit :
 *
 *     Terrain argileux → Plancher beton = "entraîne" {
 *        document: 1824_CR_12.pdf, page 3
 *        parce que: "Le terrain argileux est confirmé donc le plancher béton
 *                    sera repris."
 *        statut: supposé
 *     }
 *
 * Le sujet est la **relation**, la valeur est le **verbe du lien**. Mettre
 * « Plancher beton » en sujet aurait obligé à lui inventer une valeur — et
 * « repris » n'est écrit nulle part : il serait sorti du modèle, pas du
 * document.
 *
 * **`constat`, et non `raisonnement`.** Ce qui est observé est ce que le
 * document dit, à sa date. Un constat ne devient jamais faux (règle 6) ; un
 * raisonnement, dans ce produit, traverse une décision humaine, et ce n'est pas
 * le cas ici.
 *
 * **`supposé`, et non `retenu`.** Le lien a été coupé mécaniquement dans une
 * phrase. Signer dit « garde cette lecture », pas « c'est établi ». Le statut
 * est ce que le projet en fait aujourd'hui, et il se révise sans que personne
 * soit en faute.
 *
 * ## Avant la signature, elle reste là où on l'a lue
 *
 * Une idée relevée vit dans **l'analyse conservée** du document
 * (`la-lecture-conservee.js`), que seul celui qui a lancé la lecture voit. Elle
 * n'est nulle part dans la mémoire du projet tant que personne n'a signé — ce
 * qui est la règle 1, et la réponse à « où vivent les idées qu'on n'a pas
 * encore versées ».
 *
 * ## Il est pur
 *
 * Des idées entrent, des affirmations et du texte sortent.
 */

import { cestUneIdee, leCote, leLienDit } from "./une-idee.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le procédé qui a relevé ces idées.
 *
 * Écrit dans chaque affirmation : sans lui, deux lectures faites par deux
 * découpages différents se relisent comme si elles s'étaient faites pareil, et
 * l'on ne sait plus laquelle refaire quand le découpage change (règle 12).
 */
export const LE_PROCEDE_DES_IDEES = "idées d'un document v1";

/** Ce qu'une idée relevée affirme, pour qui lit la mémoire six mois plus tard. */
export const CE_QUE_LIDEE_NOMME = "Le lien qu'un document du projet énonce entre "
  + "deux termes du chantier.";

/** À quoi ce nom sert, dans la mémoire. */
export const A_QUOI_ELLE_SERT = "Retrouver ce qu'un document a lié, et composer "
  + "deux liens qui se touchent.";

/**
 * Une idée relevée, normalisée — ou `null` si ce n'en est pas une.
 *
 * Les deux côtés et le lien passent par `une-idee.js` : un côté vide, un lien
 * que l'écran ne sait pas nommer, ou deux côtés identiques sont refusés là-bas,
 * et il n'y a pas deux définitions de ce qu'est une idée (règle 10).
 *
 * **La phrase est obligatoire ici**, alors qu'elle ne l'est pas là-bas : une
 * idée qui entre dans une mémoire sans la phrase dont elle sort ne se relit
 * pas, et ne se conteste pas. La provenance est ce qui sépare une mémoire d'un
 * tas de phrases (règle 1).
 */
export function uneIdeeRelevee(brute) {
  const idee = {
    avant: texte(brute?.avant),
    lien: texte(brute?.lien),
    apres: texte(brute?.apres),
    phrase: texte(brute?.phrase),
    document: texte(brute?.document),
    page: Number.isFinite(Number(brute?.page)) && brute?.page !== null
      ? Number(brute.page)
      : null
  };

  if (!cestUneIdee(idee)) return null;
  if (!idee.phrase) return null;
  return idee;
}

/** Les idées relevées d'une lecture, sans les doublons. */
export function lesIdeesRelevees(brutes = []) {
  const vues = new Set();

  return (Array.isArray(brutes) ? brutes : [])
    .map(uneIdeeRelevee)
    .filter(Boolean)
    .filter((une) => {
      // Le même lien relevé deux fois dans le même document est le même lien :
      // deux lignes dans la proposition feraient cocher deux fois la même chose.
      const cle = `${leCote(une.avant)}|${une.lien}|${leCote(une.apres)}`;
      if (vues.has(cle)) return false;
      vues.add(cle);
      return true;
    });
}

/** Le nom de la relation, tel qu'il s'écrit en mémoire. */
export function leSujetDuneIdee(idee) {
  if (!cestUneIdee(idee)) return "";
  return `${texte(idee.avant)} → ${texte(idee.apres)}`;
}

/** D'où elle sort, en une ligne : le document, et la page s'il y en a une. */
export function laProvenanceDuneIdee(idee) {
  const ou = texte(idee?.document);
  if (!ou) return "";
  return idee?.page ? `${ou}, page ${idee.page}` : ou;
}

/**
 * L'affirmation de mémoire qu'une idée propose.
 *
 * `null` quand ce n'est pas une idée relevée : une proposition ne porte pas de
 * ligne qu'on ne saurait pas relire.
 *
 * @param {object} idee ce que `uneIdeeRelevee` a rendu
 * @param {object} [options]
 * @param {string[]} [options.zones] les parties d'ouvrage que cela concerne.
 *   Vide veut dire « partout », et c'est une portée, pas une absence de réponse.
 */
export function laffirmationDuneIdee(idee, { zones = [] } = {}) {
  const propre = uneIdeeRelevee(idee);
  if (!propre) return null;

  const lien = leLienDit(propre.lien);
  const ou = laProvenanceDuneIdee(propre);

  return {
    sujet: leSujetDuneIdee(propre),
    // Le verbe du lien, et c'est tout ce que le document affirme.
    valeur: lien.libelle,
    nature: "constat",
    quoi: CE_QUE_LIDEE_NOMME,
    utilisation: A_QUOI_ELLE_SERT,
    zones: Array.isArray(zones) && zones.length ? zones : [],
    // **Le type de la provenance est l'origine de la valeur** : elle vient
    // d'une pièce du projet, donc `document`.
    provenance: { type: "document", quoi: ou },
    source: texte(propre.document),
    reference: propre.page ? `page ${propre.page}` : null,
    // La phrase exacte. Sans elle, une idée fausse ne se conteste pas : on ne
    // sait plus si c'est le document qui le dit ou le découpage qui s'est trompé.
    citation: propre.phrase,
    statut: "supposé",
    atelier: LE_PROCEDE_DES_IDEES
  };
}

/** Toutes les affirmations d'une lecture, dans l'ordre où les idées sont venues. */
export function lesAffirmationsDesIdees(idees = [], options = {}) {
  return (Array.isArray(idees) ? idees : [])
    .map((une) => laffirmationDuneIdee(une, options))
    .filter(Boolean);
}

/**
 * Ce que l'écran dit d'une idée relevée : la fonction, et le verbe de son lien.
 *
 * Le même dessin que la console — deux termes et une flèche —, parce que c'est
 * la même chose vue d'un seul document plutôt que de tous.
 */
export function phraseDuneIdeeRelevee(idee) {
  const propre = uneIdeeRelevee(idee);
  if (!propre) return "";
  return `${propre.avant} ${leLienDit(propre.lien).fleche} ${propre.apres}`;
}

/**
 * Ce qu'une lecture a relevé, en une phrase — et ce qu'elle n'a pas relevé.
 *
 * Une lecture sans idée ne veut pas dire que le document n'en énonce aucune :
 * le découpage ne lit que les liaisons placées **entre** les deux membres
 * d'une phrase. Le taire ferait prendre une limite de méthode pour un constat
 * sur le document (règle 5).
 */
export function phraseDesIdeesRelevees(idees = [], { points = 0 } = {}) {
  const combien = Array.isArray(idees) ? idees.length : 0;
  const lus = Number(points) || 0;

  if (!combien) {
    return lus
      ? `Aucun lien relevé sur ${lus} point${lus > 1 ? "s" : ""}. Seules les `
        + "liaisons placées entre les deux membres d'une phrase sont lues — "
        + "« si… » commence par son lien, et n'a rien à sa gauche."
      : "Rien n'a été relevé : il n'y avait aucun point à lire.";
  }

  return `${combien} lien${combien > 1 ? "s" : ""} relevé${combien > 1 ? "s" : ""}`
    + `${lus ? ` sur ${lus} point${lus > 1 ? "s" : ""}` : ""}. `
    + "Chacun se relit dans la phrase dont il sort, et n'entre dans la mémoire "
    + "que si la proposition est signée.";
}

/**
 * Ce qu'on donne à couper, point par point.
 *
 * **La citation d'abord.** C'est le texte du document, mot pour mot ; le titre
 * et la description sont ce que la lecture en a fait. Couper dans une
 * reformulation ferait entrer en mémoire un lien que le document n'écrit pas,
 * avec une citation qui ne le contiendrait pas — et la provenance mentirait
 * précisément là où elle sert.
 *
 * Un point sans aucun texte rend `""` : il garde son rang, pour que ce qui
 * revient se replace au bon endroit.
 */
export function lesTextesAcouper(points = []) {
  return (Array.isArray(points) ? points : []).map((point) =>
    texte(point?.citation) || texte(point?.description) || texte(point?.titre));
}

/**
 * Les idées relevées, replacées sur les points dont elles sortent.
 *
 * `coupes` est ce que la base a rendu : un `rang` **qui commence à un**, parce
 * que c'est ainsi que PostgreSQL numérote (`with ordinality`).
 *
 * **Une coupe dont le rang ne désigne aucun point n'a pas de phrase**, et une
 * idée sans sa phrase est refusée par `uneIdeeRelevee`. C'est le seul garde-fou,
 * et il suffit : il y en avait un second, qui bornait le rang, et aucune mutation
 * ne pouvait le faire tomber — il n'écartait que ce que la phrase manquante
 * écartait déjà. Un garde-fou qui ne peut pas tomber n'en est pas un, il en a
 * seulement l'air (règle 4).
 *
 * @param {object[]} coupes ce que `les_idees_des_textes()` a rendu
 * @param {object[]} points les points de la lecture, dans le même ordre
 * @param {object} [options]
 * @param {string} [options.document] le nom du document lu
 */
export function lesIdeesDesCoupes(coupes = [], points = [], { document = "" } = {}) {
  const lus = Array.isArray(points) ? points : [];
  const textes = lesTextesAcouper(lus);

  return lesIdeesRelevees((Array.isArray(coupes) ? coupes : []).map((coupe) => {
    const rang = Number(coupe?.rang);
    return {
      avant: coupe?.avant,
      lien: coupe?.lien,
      apres: coupe?.apres,
      phrase: textes[rang - 1],
      document: texte(document),
      page: lus[rang - 1]?.page ?? null
    };
  }));
}
