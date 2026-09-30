/**
 * Ce que les comptes du carburant veulent dire.
 *
 * ## Le total ne dit rien, la répartition dit tout
 *
 * « 40 000 mails » est un chiffre de plaquette. Quarante mille répartis sur
 * mille chantiers sont quarante mille fois rien : la prédiction se nourrit de
 * **suites** — après tel domaine vient tel autre —, et une suite se lit dans un
 * chantier, pas en travers de mille (`docs/nourrir-mdall.md`, § 8 ter).
 *
 * Le chiffre qui décide est donc : **combien de projets portent assez de
 * matière**. Et « assez » se dit, plutôt que de se deviner.
 *
 * ## Il ne sait rien lire
 *
 * Des nombres entrent, des phrases sortent. Ce module ne voit ni objet, ni
 * adresse, ni nom de projet : la fonction de base n'en rend aucun, par
 * construction.
 */

import { poidsDit } from "../utils/poids-dit.js";

const nombre = (valeur) => Number(valeur) || 0;

/** Un compte, avec ses milliers séparés : « 24 457 » se lit, « 24457 » non. */
export const compteDit = (combien) => nombre(combien).toLocaleString("fr-FR");

/**
 * Les tranches, et le seuil à partir duquel un projet pèse.
 *
 * **Cinquante messages**, et c'est une hypothèse déclarée, pas une mesure. Elle
 * vient de l'autre bout : la mesure du passé refuse de se prononcer en dessous
 * de cinq points notés (`ligne-de-base.js`), et un projet rend de l'ordre d'un
 * point pour dix messages. En dessous de cinquante, on n'aurait donc même pas
 * de quoi mesurer si l'on prédit bien.
 *
 * À corriger dès qu'on aura mesuré pour de vrai. Écrire un seuil faux et le
 * dire vaut mieux qu'un seuil caché dans une condition (règle 12).
 */
export const ASSEZ_DE_MATIERE = 50;

export const LES_TRANCHES = [
  { cle: "projets_1_9", dit: "1 à 9 messages", pese: false },
  { cle: "projets_10_49", dit: "10 à 49", pese: false },
  { cle: "projets_50_199", dit: "50 à 199", pese: true },
  { cle: "projets_200_et_plus", dit: "200 et plus", pese: true }
];

/**
 * Ce qu'une tranche dit d'elle-même.
 *
 * **« Assez pour mesurer » en face de « 0 chantier » se lisait de travers** :
 * on comprenait que zéro suffisait. Ce mot ne juge pas la ligne, il situe la
 * tranche par rapport au seuil — et il doit le dire ainsi.
 */
export function motDeLaTranche(tranche = null) {
  return tranche?.pese ? "au-dessus" : "en dessous";
}

/**
 * Les tranches, garnies, dans l'ordre.
 *
 * **Une tranche vide se dessine quand même** — contrairement à l'usage du reste
 * de Mdall. Ici le zéro est l'information : « aucun projet au-dessus de 200 »
 * est exactement ce qu'on vient regarder.
 */
export function laRepartition(comptes = null) {
  const projets = nombre(comptes?.projets);
  return LES_TRANCHES.map((tranche) => {
    const combien = nombre(comptes?.[tranche.cle]);
    return {
      ...tranche,
      combien,
      part: projets ? combien / projets : 0
    };
  });
}

/** Combien de projets portent assez de matière pour qu'on puisse mesurer. */
export function projetsQuiPesent(comptes = null) {
  return LES_TRANCHES
    .filter((tranche) => tranche.pese)
    .reduce((somme, tranche) => somme + nombre(comptes?.[tranche.cle]), 0);
}

/**
 * Le gisement en une phrase.
 *
 * Vide quand rien n'a été déposé : une phrase « 0 message » apprend à ne plus
 * lire les phrases.
 */
export function phraseDuGisement(comptes = null) {
  const messages = nombre(comptes?.messages);
  if (!messages) return "";

  const dits = [`${compteDit(messages)} ${messages > 1 ? "messages" : "message"}`];

  const pieces = nombre(comptes?.pieces);
  if (pieces) dits.push(`${compteDit(pieces)} ${pieces > 1 ? "pièces jointes" : "pièce jointe"}`);

  const octets = nombre(comptes?.octets);
  if (octets) dits.push(poidsDit(octets));

  const projets = nombre(comptes?.projets);
  if (projets) dits.push(`sur ${compteDit(projets)} ${projets > 1 ? "chantiers" : "chantier"}`);

  return dits.join(" · ");
}

/**
 * Ce que ce gisement permet, dit sans complaisance.
 *
 * **C'est la phrase la plus importante de l'écran**, et elle doit pouvoir dire
 * non. Un tableau de bord qui répond toujours « ça progresse » n'aide à décider
 * de rien : la question posée est *« qu'est-ce que je fais différemment si ce
 * nombre double ? »*.
 */
export function phraseDeCeQueCaPermet(comptes = null) {
  const projets = nombre(comptes?.projets);
  if (!projets) {
    return "Aucun mail déposé : rien à mesurer, et rien à prédire.";
  }

  const pesent = projetsQuiPesent(comptes);
  const jours = nombre(comptes?.jours_medians);
  const duree = jours >= 60
    ? `, sur ${Math.round(jours / 30)} mois de correspondance au milieu de la distribution`
    : "";

  if (!pesent) {
    return `Aucun chantier ne porte ${ASSEZ_DE_MATIERE} messages ou plus. `
      + "C'est trop peu pour mesurer si l'on prédit bien, donc trop peu pour "
      + "prédire : ce qui manque n'est pas un moteur, c'est de la matière.";
  }

  return `${compteDit(pesent)} ${pesent > 1 ? "chantiers portent" : "chantier porte"} `
    + `${ASSEZ_DE_MATIERE} messages ou plus${duree}. C'est sur ceux-là, et sur eux `
    + "seuls, qu'une mesure du passé a du sens.";
}

/**
 * Ce que le système **ne fait pas encore** de ces mails.
 *
 * ## Pourquoi cette liste existe, et pourquoi elle est au présent
 *
 * La question posée était : « l'avancement de leur traitement — anonymisation,
 * extraction du contenu, des domaines… ». La réponse honnête est qu'**aucun de
 * ces traitements n'existe**. Dessiner des barres de progression à zéro pour
 * des étapes qui n'ont pas été écrites serait une intention présentée comme un
 * chantier en cours (règle 12).
 *
 * Elles sont donc nommées, et marquées pour ce qu'elles sont. Le jour où l'une
 * s'écrit, elle change de colonne ici, et ce n'est plus une liste de vœux.
 */
export const CE_QUI_NEST_PAS_FAIT = [
  {
    quoi: "L'extraction du contenu",
    ou: "cinq valeurs au dépôt — expéditeur, objet, date, nombre de pièces, fil —, "
      + "et rien d'autre : le corps est gardé tel quel, et relu à chaque lecture",
    pourquoi: "sans elles, une liste de deux cents mails demanderait deux cents "
      + "rapatriements ; au-delà, extraire serait figer une forme avant de savoir "
      + "ce qu'on en tirera"
  },
  {
    quoi: "La reconnaissance des domaines",
    ou: "elle existe et tourne, mais dans le navigateur, à la lecture — et rien n'est gardé",
    pourquoi: "sa table d'indices est un premier jet, à corriger par un sachant"
  },
  {
    quoi: "L'anonymisation",
    ou: "rien n'est anonymisé, et rien n'a besoin de l'être aujourd'hui",
    pourquoi: "les mails ne quittent pas le projet de celui qui les a déposés"
  },
  {
    quoi: "La mesure du prédicteur, agrégée",
    ou: "elle se calcule par chantier, dans le navigateur de son déposant",
    pourquoi: "l'agréger demanderait de faire sortir un chiffre d'un projet — et donc de le demander"
  }
];
