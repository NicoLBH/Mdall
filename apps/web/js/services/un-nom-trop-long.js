/**
 * Un nom trop long, raccourci **par le milieu**.
 *
 * ## Le défaut que cela répare
 *
 * > « Quand les noms de documents sont très longs, il faut un système avec le
 * >   début du nom + "…" + la fin du nom. »
 *
 * Un nom de document de quatre-vingts caractères poussait tout le reste de la
 * ligne hors de l'écran : la pastille d'état se retrouvait invisible, et l'on ne
 * pouvait plus savoir si le document avait été analysé.
 *
 * ## Pourquoi par le milieu, et non par la fin
 *
 * C'est le cœur de la chose. `text-overflow: ellipsis` coupe la fin, et **la fin
 * est ce qui distingue** :
 *
 *     1824_RICT_03_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_C.pdf
 *     1824_RICT_04_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_C.pdf
 *
 * Coupés par la fin, ces deux-là sont le même nom. Le numéro de rapport est au
 * début, l'indice et l'extension sont à la fin, et le milieu — le nom du
 * chantier, répété sur chaque fichier — est précisément ce qu'on peut perdre.
 *
 * ## Il ne décide pas de la largeur
 *
 * Il prend une longueur en caractères, et c'est l'écran qui la choisit. Un
 * module qui mesurerait le texte aurait besoin du DOM, donc ne s'éprouverait
 * pas — et une troncature qui ne s'éprouve pas se vérifie à l'œil sur un écran
 * qu'on n'ouvre pas tous les jours.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Le caractère de coupe. Un seul point de suspension, et non trois points. */
export const LA_COUPE = "…";

/**
 * Au-delà, un nom se raccourcit. En deçà, on n'y touche pas.
 *
 * Soixante : c'est ce qui tient dans la colonne du titre sans pousser la
 * pastille d'état, mesuré sur le tableau des documents. Le nombre vit ici
 * parce que les trois tableaux qui l'emploient doivent couper pareil.
 */
export const AU_PLUS = 60;

/**
 * Un nom raccourci par le milieu, ou tel quel s'il tient.
 *
 * **Jamais plus long que `auPlus`**, la coupe comprise : c'est la propriété
 * qu'on vient chercher, et une version qui ajoutait le caractère de coupe
 * par-dessus la longueur demandée rendait des noms d'un caractère de trop —
 * assez pour pousser la colonne voisine.
 *
 * @param {string} nom
 * @param {number} [auPlus] la longueur totale, coupe comprise
 */
export function unNomRaccourci(nom, auPlus = AU_PLUS) {
  const dit = texte(nom);
  const borne = Math.max(0, Math.trunc(Number(auPlus)) || 0);

  // **Pas de coupe sous quatre caractères**, parce qu'il n'y aurait plus rien à
  // lire : « a…b » ne distingue aucun document, et « … » seul encore moins. On
  // rend alors le début, qui dit au moins quelque chose.
  if (borne < 4) return dit.slice(0, borne);
  if (dit.length <= borne) return dit;

  // La place du texte, coupe retirée. Le début prend la moitié haute : le
  // numéro de rapport y vit, et c'est lui qu'on cherche en premier.
  const place = borne - LA_COUPE.length;
  const debut = Math.ceil(place / 2);
  const fin = place - debut;

  return `${dit.slice(0, debut)}${LA_COUPE}${fin ? dit.slice(-fin) : ""}`;
}

/**
 * Le nom raccourci **et** le nom entier, pour un rendu.
 *
 * `titre` est vide quand rien n'a été coupé : une infobulle qui répète ce qui
 * est déjà lisible est une infobulle qu'on apprend à ignorer, et l'on finit par
 * ignorer aussi celles qui disent quelque chose.
 *
 * @returns {{dit: string, titre: string, coupe: boolean}}
 */
export function ceQuUnNomMontre(nom, auPlus = AU_PLUS) {
  const entier = texte(nom);
  const dit = unNomRaccourci(entier, auPlus);
  const coupe = dit !== entier;

  return { dit, titre: coupe ? entier : "", coupe };
}
