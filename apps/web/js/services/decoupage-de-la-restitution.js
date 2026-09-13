/**
 * Le découpage rendu, confronté au découpage annoncé.
 *
 * ## La question à laquelle ce service répond
 *
 * Un compte rendu restitué sans ses titres est un tableau de deux cents lignes
 * où plus rien ne se trouve. La consigne demande donc au modèle de rendre les
 * lots en titres Markdown, précédés d'un trait `---`. Sur un vrai document,
 * elle n'a rien produit : ni titre, ni trait.
 *
 * **« Le modèle n'obéit pas » est une conjecture, pas un diagnostic.** Deux
 * causes tout à fait différentes donnent le même écran :
 *
 *  - la reconnaissance de structure **n'a relevé aucun chapitre** — et la
 *    consigne sur les titres n'a alors jamais été écrite : le modèle a obéi à
 *    une consigne qu'on ne lui a pas donnée ;
 *  - la reconnaissance en a relevé quinze, et **la restitution les a ignorés**.
 *
 * La première se corrige dans l'échantillon et le schéma de structure ; la
 * seconde dans la consigne de transcription. Se tromper de moitié coûte un
 * appel et un aller-retour.
 *
 * On compte donc les deux, et l'écran dit laquelle des deux a lâché. C'est la
 * même discipline que les cinq mesures de la restitution : mesurer plutôt que
 * supposer.
 *
 * Rien ici n'appelle quoi que ce soit : un texte et un squelette entrent, des
 * nombres sortent.
 */

/** Un titre ATX. Les `#` collés au texte n'en sont pas (`#chantier`). */
const TITRE = /^(#{1,6})\s+\S/;

/** Un trait de séparation : trois tirets ou plus, seuls sur leur ligne. */
const TRAIT = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce que la restitution a écrit comme découpage.
 *
 * @param {string} markdown la restitution assemblée
 * @returns {{titres: number, parNiveau: number[], traits: number, titresDecoupants: number,
 *   traitsDevantUnTitre: number}}
 */
export function decoupageRendu(markdown = "") {
  const lignes = String(markdown ?? "").split("\n");

  // Un niveau par case, de 1 à 6 : `parNiveau[0]` compte les `#`.
  const parNiveau = [0, 0, 0, 0, 0, 0];
  let traits = 0;
  let traitsDevantUnTitre = 0;

  lignes.forEach((ligne, rang) => {
    const titre = String(ligne).match(TITRE);
    if (titre) {
      parNiveau[titre[1].length - 1] += 1;
      return;
    }

    // La ligne de séparation d'un tableau (`|---|---|`) ressemble à un trait,
    // mais ses barres verticales l'excluent de `TRAIT` : sur un compte rendu
    // qui porte quarante tableaux, la confondre dirait quarante traits pour
    // zéro découpage. Le test le vérifie plutôt que de s'en remettre à la
    // lecture du motif.
    if (!TRAIT.test(ligne)) return;

    traits += 1;
    // Le trait ne compte que s'il précède un titre : c'est ce que la consigne
    // demande. Un trait perdu entre deux paragraphes ne découpe rien.
    const suite = lignes.slice(rang + 1, rang + 3).find((ligne) => texte(ligne) !== "");
    if (suite && TITRE.test(suite)) traitsDevantUnTitre += 1;
  });

  return {
    titres: parNiveau.reduce((total, combien) => total + combien, 0),
    parNiveau,
    traits,
    // Ceux qui découpent vraiment : la consigne ne demande un trait que devant
    // les niveaux 1 à 3.
    titresDecoupants: parNiveau[0] + parNiveau[1] + parNiveau[2],
    traitsDevantUnTitre
  };
}

/** Ce que la reconnaissance de structure a annoncé comme découpage. */
export function decoupageAnnonce(structure = null) {
  const chapitres = Array.isArray(structure?.chapitres) ? structure.chapitres : [];
  const nommes = chapitres.filter((chapitre) => texte(chapitre?.motif) !== "");

  return {
    chapitres: nommes.length,
    // Ceux dont la consigne demande un trait : les autres se rangent SOUS un lot
    // et n'ont pas à le découper.
    decoupants: nommes.filter((chapitre) => Number(chapitre?.niveau) <= 3).length
  };
}

export const DECOUPAGE = {
  /** On n'a pas de quoi répondre : pas de structure lue, ou pas de restitution. */
  INCONNU: "inconnu",
  /** La reconnaissance n'a relevé aucun chapitre : rien n'a été demandé. */
  RIEN_DEMANDE: "rien_demande",
  /** Des chapitres annoncés, aucun titre rendu. */
  IGNORE: "ignore",
  /** Les titres sont là, les traits non. */
  SANS_TRAIT: "sans_trait",
  /** Les deux sont là. */
  TENU: "tenu"
};

export const PHRASES_DU_DECOUPAGE = {
  [DECOUPAGE.INCONNU]: "Le découpage n'a pas pu être confronté.",
  [DECOUPAGE.RIEN_DEMANDE]: "La reconnaissance de structure n'a relevé aucun chapitre : la consigne sur les titres n'a donc pas été écrite, et la restitution n'avait rien à découper.",
  [DECOUPAGE.IGNORE]: "La reconnaissance a relevé des chapitres, la restitution n'en a rendu aucun en titre.",
  [DECOUPAGE.SANS_TRAIT]: "Les titres sont là, les traits de séparation non.",
  [DECOUPAGE.TENU]: "Le découpage annoncé se retrouve dans la restitution."
};

/**
 * **Ce qu'il faut corriger**, pour chaque verdict. C'est la raison d'être de la
 * mesure : sans cette ligne, on relance le même appel en espérant mieux.
 */
export const A_REPRENDRE = {
  [DECOUPAGE.INCONNU]: "",
  [DECOUPAGE.RIEN_DEMANDE]: "C'est la reconnaissance de structure qu'il faut reprendre — son échantillon de pages, ou ce qu'on lui demande de relever — et non la consigne de transcription.",
  [DECOUPAGE.IGNORE]: "C'est la consigne de transcription qu'il faut reprendre : la structure a fait son travail.",
  [DECOUPAGE.SANS_TRAIT]: "La consigne du trait passe après celle du titre dans le même paragraphe ; la détacher la rendrait plus visible.",
  [DECOUPAGE.TENU]: ""
};

/**
 * Laquelle des deux moitiés a lâché.
 *
 * @param {object} options
 * @param {string} options.markdown la restitution assemblée
 * @param {object|null} options.structure le squelette reconnu — `null` : non lu
 */
export function decoupageDeLaRestitution({ markdown = "", structure = null } = {}) {
  const rendu = decoupageRendu(markdown);
  const annonce = decoupageAnnonce(structure);

  // **Ne pas savoir n'autorise pas à accuser** (règle 5). Sans squelette, on ne
  // peut pas dire si le modèle a désobéi : on ne sait pas ce qu'on lui a
  // demandé.
  const verdict = !structure || texte(markdown) === "" ? DECOUPAGE.INCONNU
    : annonce.chapitres === 0 ? DECOUPAGE.RIEN_DEMANDE
    : rendu.titres === 0 ? DECOUPAGE.IGNORE
    : rendu.traitsDevantUnTitre === 0 && rendu.titresDecoupants > 0 ? DECOUPAGE.SANS_TRAIT
    : DECOUPAGE.TENU;

  return { verdict, rendu, annonce };
}
