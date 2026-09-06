/**
 * Le dépôt d'une proposition.
 *
 * ## Déposer, ce n'est pas seulement joindre un fichier
 *
 * L'onglet « Dépôts » ne montrait que des documents. Une proposition venue de
 * l'Atelier — une étude incendie, un pré-dimensionnement, une zone de neige —
 * n'y affichait rien, comme si rien n'avait été déposé. Or c'est exactement un
 * dépôt : quelqu'un a produit de la matière et l'apporte au projet. Que cette
 * matière soit un PDF ou une valeur calculée ne change pas la nature du geste.
 *
 * Un dépôt est donc **ce qu'une proposition apporte**, quelle qu'en soit la
 * forme, avec sa date, son auteur, et de quoi savoir si l'on peut s'y fier.
 *
 * ## « Vérifié », et ce que ce mot engage
 *
 * GitHub écrit « Verified » sur un commit dont il a pu vérifier la signature.
 * Ce n'est pas un jugement sur le code : c'est une affirmation sur la
 * **provenance** — on sait d'où cela vient, et personne ne s'est fait passer
 * pour un autre.
 *
 * Le parallèle tient, à condition de ne pas le vider de son sens. Un dépôt est
 * vérifié quand on peut remonter à ce sur quoi il s'appuie :
 *
 * - tout livrable qu'il apporte a été **lu** — un fichier que le stockage n'a
 *   pas rendu laisse l'analyse aveugle sur une partie du lot ;
 * - toute affirmation qu'il porte dit **d'où elle vient** — un texte et son
 *   article, ou l'utilitaire qui l'a calculée.
 *
 * Sinon il n'est pas vérifié, et l'on dit ce qui manque. Écrire « Vérifié »
 * partout ferait de la pastille une décoration, et une décoration qu'on
 * regarde deux fois cesse d'être lue.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** L'état de provenance d'un dépôt. */
export const PROVENANCE = {
  VERIFIE: "verifie",
  PARTIEL: "partiel",
  /** Un dépôt vide : il n'y a rien dont établir la provenance. */
  VIDE: "vide"
};

export const PROVENANCE_LABELS = {
  [PROVENANCE.VERIFIE]: "Vérifié",
  [PROVENANCE.PARTIEL]: "Provenance incomplète",
  [PROVENANCE.VIDE]: "Rien de déposé"
};

/**
 * Ce qui atteste d'une affirmation : un texte, un article, ou l'utilitaire qui
 * l'a produite. Une valeur qui n'en porte aucun ne se vérifie pas — on la
 * croit sur parole, et six mois plus tard personne ne saura d'où elle sortait.
 */
function porteSaProvenance(ligne) {
  // Deux formes circulent : la ligne brute d'une proposition, qui porte son
  // `payload`, et la ligne du tableau avant / après, qui a déjà été mise à
  // plat. Lire l'une et pas l'autre déclarerait « sans provenance » des
  // affirmations qui citent leur article.
  const payload = ligne?.payload ?? ligne ?? {};
  return Boolean(texte(payload.source) || texte(payload.article) || texte(payload.atelier)
    || texte(payload.reference) || texte(payload.utilitaire));
}

/**
 * Ce qu'une proposition dépose, et si l'on peut en établir la provenance.
 *
 * @param {object} options
 * @param {object} options.proposition
 * @param {object[]} options.affirmations les lignes non documentaires
 * @param {object[]} options.documents les livrables du dépôt
 * @param {object[]} options.unreachable ceux que le stockage n'a pas rendus
 * @param {boolean} options.analyseFaite l'analyse a-t-elle abouti
 */
export function depotDeLaProposition({
  proposition = null,
  affirmations = [],
  documents = [],
  unreachable = [],
  analyseFaite = true
} = {}) {
  const lignes = Array.isArray(affirmations) ? affirmations : [];
  const fichiers = Array.isArray(documents) ? documents : [];
  const illisibles = Array.isArray(unreachable) ? unreachable : [];

  const sansProvenance = lignes.filter((ligne) => !porteSaProvenance(ligne));

  const manques = [];
  if (illisibles.length) {
    manques.push(`${illisibles.length} livrable${illisibles.length > 1 ? "s n'ont" : " n'a"} pas pu être lu${illisibles.length > 1 ? "s" : ""}`);
  }
  if (sansProvenance.length) {
    manques.push(`${sansProvenance.length} affirmation${sansProvenance.length > 1 ? "s ne disent" : " ne dit"} pas d'où elle${sansProvenance.length > 1 ? "s viennent" : " vient"}`);
  }

  const rien = lignes.length === 0 && fichiers.length === 0;
  const provenance = rien
    ? PROVENANCE.VIDE
    : manques.length === 0 && analyseFaite
      ? PROVENANCE.VERIFIE
      : PROVENANCE.PARTIEL;

  return {
    titre: texte(proposition?.title) || "Dépôt",
    quand: proposition?.created_at ?? null,
    affirmations: lignes.length,
    livrables: fichiers.length,
    provenance,
    provenanceLabel: PROVENANCE_LABELS[provenance],
    // Ce qui manque, écrit pour être lu au survol de la pastille. Une pastille
    // qui dit « non vérifié » sans dire pourquoi n'apprend rien.
    pourquoi: rien
      ? "Cette proposition n'apporte encore rien."
      : manques.length
        ? `${manques.join(" · ")}.`
        : !analyseFaite
          ? "L'analyse des livrables n'a pas encore abouti."
          : "Tout ce que ce dépôt apporte a été lu, et chaque affirmation dit d'où elle vient."
  };
}

/** Ce qu'un dépôt apporte, en une ligne. */
export function resumeDuDepot(depot) {
  const morceaux = [];
  if (depot?.affirmations > 0) {
    morceaux.push(`${depot.affirmations} affirmation${depot.affirmations > 1 ? "s" : ""}`);
  }
  if (depot?.livrables > 0) {
    morceaux.push(`${depot.livrables} livrable${depot.livrables > 1 ? "s" : ""}`);
  }
  return morceaux.length ? morceaux.join(" · ") : "rien pour l'instant";
}
