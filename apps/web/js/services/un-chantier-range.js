/**
 * Un chantier qui se range, et la liste qui s'allège.
 *
 * ## Ranger n'est pas supprimer
 *
 * Un chantier livré ne disparaît pas : on y revient pour la garantie de parfait
 * achèvement, pour une reprise de désordre, pour un litige. Ce qu'on veut n'est
 * pas l'effacer — c'est qu'il cesse d'encombrer la liste de ceux qui tournent.
 *
 * Et c'est ce que la mémoire du projet vaut : supprimer un chantier détruirait
 * la matière dont la prédiction se nourrit. Une exécution qui a eu lieu ne
 * devient pas fausse (règle 6).
 *
 * ## Une date, pas un booléen
 *
 * « Archivé le 12 mars » se lit, se trie et se défait. « Archivé = vrai » ne dit
 * pas quand, et il faudrait une seconde colonne le jour où l'on voudra le
 * savoir (règle 5).
 *
 * ## Il est pur
 *
 * Des lignes de projets entrent, des listes et des comptes sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Les deux états d'un chantier, et la clé qui les nomme. */
export const RANGEMENT = { EN_COURS: "actifs", RANGES: "archives" };

/** L'état demandé, ramené à l'un des deux. */
export function rangementValide(cle) {
  return texte(cle) === RANGEMENT.RANGES ? RANGEMENT.RANGES : RANGEMENT.EN_COURS;
}

/**
 * Ce chantier est-il rangé ?
 *
 * **Une date illisible ne range pas.** Mieux vaut un chantier de trop dans la
 * liste des vivants qu'un chantier disparu sans raison : on ne fait disparaître
 * que sur une date qu'on a su lire (règle 5).
 */
export function cestUnChantierRange(projet = null) {
  const quand = texte(projet?.archivedAt);
  if (!quand) return false;
  return Number.isFinite(Date.parse(quand));
}

/** Les chantiers de l'état demandé. */
export function lesChantiersDe(projets = [], cle = RANGEMENT.EN_COURS) {
  const ranges = rangementValide(cle) === RANGEMENT.RANGES;
  return (Array.isArray(projets) ? projets : [])
    .filter((un) => cestUnChantierRange(un) === ranges);
}

/**
 * Combien de chantiers de chaque côté.
 *
 * Les deux comptes portent sur **la même liste**, celle qu'on regarde : un
 * compte d'archives calculé ailleurs finirait par annoncer douze archives dans
 * un filtre qui n'en montre que trois (règle 4).
 */
export function lesComptesDuRangement(projets = []) {
  const tous = Array.isArray(projets) ? projets : [];
  const ranges = tous.filter(cestUnChantierRange).length;
  return { [RANGEMENT.EN_COURS]: tous.length - ranges, [RANGEMENT.RANGES]: ranges };
}

/** Ce que le bouton propose, selon l'état du chantier. */
export function leGesteDuRangement(projet = null) {
  return cestUnChantierRange(projet)
    ? {
      quoi: "sortir",
      bouton: "Remettre en cours",
      titre: "Ce chantier est rangé",
      dit: "Il n'apparaît plus dans la liste des chantiers en cours. Tout y est"
        + " intact : ses fichiers, sa mémoire, son histoire."
    }
    : {
      quoi: "ranger",
      bouton: "Archiver ce chantier",
      titre: "Archiver ce chantier",
      dit: "Il sortira de la liste des chantiers en cours, et rien ne sera"
        + " supprimé — ni les fichiers, ni la mémoire, ni l'histoire. On le"
        + " remet en cours quand on veut."
    };
}
