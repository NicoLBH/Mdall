/**
 * Comment sait-on qu'un point est réglé ?
 *
 * ## C'est la question la plus délicate de tout le plan
 *
 * Un compte rendu de chantier ne ferme presque jamais explicitement. Il cesse
 * d'en parler. Et une disparition ne veut pas dire ce qu'on croit : un point
 * peut sortir du compte rendu parce qu'il est réglé, parce que le rédacteur l'a
 * oublié, parce que le lot n'était pas convoqué cette semaine, ou parce que le
 * document a changé de trame.
 *
 * **Fermer sur ce seul signe perdrait des points qu'on suit depuis des mois** —
 * et personne ne s'en apercevrait, puisque ce qui disparaît ne laisse rien à
 * voir.
 *
 * ## Trois signes, et ils ne se valent pas
 *
 * | Signe | Ce qu'il vaut |
 * | --- | --- |
 * | Le document le dit — « fait », « soldé », une date de fermeture | **une réponse** |
 * | Le point est barré | une réponse, **si la mise en forme survit** — voir plus bas |
 * | Le point a disparu du compte rendu | **une question, pas une réponse** |
 *
 * ## Ce qu'on ne sait pas détecter, et il faut le dire
 *
 * **Le barré ne parvient pas jusqu'ici.** Un trait de rature est un trait
 * *dessiné* par-dessus le texte, pas une propriété de la police : `pdf.js` rend
 * l'italique et le gras, jamais la rature. Un point barré arrive donc comme un
 * point ordinaire, et rien dans ce fichier ne peut le distinguer.
 *
 * On ne prétend pas le contraire : il n'y a pas d'état « barré » ici. Le jour
 * où la géométrie saura relever les traits qui traversent une ligne, il en
 * viendra un — voir `docs/a-traiter-plus-tard.md`.
 *
 * ## Ce qui décide, c'est nous — pas le modèle
 *
 * Le modèle **rapporte** ce que la colonne de fermeture porte, mot pour mot. La
 * lecture de ce mot — « Fait » ferme, « 50% » ne ferme pas, « Suspendu » encore
 * moins — se fait ici, où elle se vérifie. Demander le verdict au modèle
 * mettrait une décision de fermeture hors de portée de tout test.
 *
 * Rien ici n'appelle quoi que ce soit : des points entrent, des verdicts sortent.
 */

import { jourEcrit } from "./echeances-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

const aplati = (valeur) =>
  texte(valeur)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Ce qu'un point est devenu, d'après ce que le document en dit. */
export const FERMETURE = {
  /** Le document le dit : une date de fermeture, ou une mention. */
  DITE: "dite",
  /** Le document dit explicitement que ce n'est pas fini. */
  RETENUE: "retenue",
  /** Le document n'en dit rien : le point reste ouvert. */
  OUVERTE: "ouverte"
};

export const PHRASES_DE_LA_FERMETURE = {
  [FERMETURE.DITE]: "Le compte rendu marque ce point comme réglé.",
  [FERMETURE.RETENUE]: "Le compte rendu dit explicitement que ce point n'est pas fini.",
  [FERMETURE.OUVERTE]: "Le compte rendu n'en dit rien : le point reste ouvert."
};

/** Ce que chaque verdict ferait, en toutes lettres. */
export const EFFETS_DE_LA_FERMETURE = {
  [FERMETURE.DITE]: "La proposition fermerait ce sujet, avec la phrase qui le justifie.",
  [FERMETURE.RETENUE]: "Le sujet reste ouvert, et son activité enregistre où il en est.",
  [FERMETURE.OUVERTE]: "Rien ne change pour ce sujet."
};

/**
 * Les mentions qui ferment, et celles qui retiennent.
 *
 * **Les deux listes sont écrites, et c'est voulu.** Un « non achevé » qui
 * tomberait dans « rien de dit » ferait perdre une information que le rédacteur
 * a pris la peine d'écrire ; un « 50% » pris pour une fermeture fermerait un
 * point à moitié fait.
 */
const FERME = /^(fait|faits|realise|realisee|realises|soldee?|solde|levee?|leve|termine|terminee|ok|oui)\b/;

const RETIENT = /(en cours|non achev|non realis|non fait|suspendu|reporte|a faire|retard|inadmissible|penalit)/;

/**
 * Ce que le compte rendu dit de la fermeture d'un point.
 *
 * Lit la colonne de fermeture — « Fait le » — telle que le document l'écrit,
 * puis l'état déclaré. Rend le verdict **et la phrase qui le justifie** : une
 * fermeture qu'on ne peut pas justifier ne se propose pas.
 *
 * @param {{faitLe?: string, etat?: string}} point
 * @returns {{etat: string, signe: string}}
 */
export function fermetureDuPoint(point = {}) {
  const faitLe = texte(point?.faitLe);
  const etat = texte(point?.etat);

  for (const dit of [faitLe, etat]) {
    if (!dit) continue;
    const plat = aplati(dit);

    // **Ce qui retient l'emporte sur ce qui ferme.** « Fait à 50% » n'est pas
    // fait, et « réalisé, non achevé » non plus : le doute ne ferme pas.
    if (RETIENT.test(plat)) return { etat: FERMETURE.RETENUE, signe: dit };
    // Un pourcentage qui n'est pas cent ne ferme rien.
    const part = plat.match(/(\d{1,3})\s*%/);
    if (part) {
      return Number(part[1]) >= 100
        ? { etat: FERMETURE.DITE, signe: dit }
        : { etat: FERMETURE.RETENUE, signe: dit };
    }

    // Une date dans la colonne de fermeture est la fermeture même.
    if (dit === faitLe && jourEcrit(dit)) return { etat: FERMETURE.DITE, signe: dit };
    if (FERME.test(plat)) return { etat: FERMETURE.DITE, signe: dit };
  }

  return { etat: FERMETURE.OUVERTE, signe: "" };
}

/** Les points que ce compte rendu marque comme réglés, et ceux qu'il retient. */
export function fermeturesDuCompteRendu(points = []) {
  const fermes = [];
  const retenus = [];

  for (const point of Array.isArray(points) ? points : []) {
    const verdict = fermetureDuPoint(point);
    if (verdict.etat === FERMETURE.DITE) fermes.push({ ...point, ...verdict });
    else if (verdict.etat === FERMETURE.RETENUE) retenus.push({ ...point, ...verdict });
  }

  return { fermes, retenus };
}

/**
 * Les sujets que ce compte rendu ne mentionne plus.
 *
 * ## Une disparition pose une question, elle ne ferme rien
 *
 * C'est la règle la plus importante de cette étape, et la seule qui ne se
 * négocie pas. Un point sort d'un compte rendu pour quatre raisons dont une
 * seule est « il est réglé ». Fermer sur ce signe ferait disparaître, sans
 * trace, des points qu'on suit depuis des mois.
 *
 * ## On ne compare que ce qui est comparable
 *
 * Seuls les sujets portant le label du compte rendu entrent dans la
 * comparaison : un sujet ouvert à la main, ou venu d'un rapport de bureau de
 * contrôle, n'a aucune raison de figurer dans un compte rendu de chantier — le
 * dire disparu serait une question posée sur rien.
 *
 * **Sans ce label, on ne compare pas du tout.** Ne pas savoir d'où viennent les
 * sujets n'autorise pas à les déclarer disparus (règle 5) : on rend alors
 * `connu: false`, et l'écran dit pourquoi la liste est vide.
 *
 * @param {object} options
 * @param {object[]} options.confrontes la lecture confrontée aux sujets
 * @param {object[]|null} options.sujetsDuProjet — `null` : on n'a pas pu lire
 * @param {string[]|null} options.sujetsDuLabel les identifiants des sujets qui
 *   portent le label du compte rendu — `null` : on ne sait pas
 * @returns {{connu: boolean, disparus: object[], suivis: number}}
 */
export function sujetsDisparus({
  confrontes = [], sujetsDuProjet = null, sujetsDuLabel = null
} = {}) {
  if (!Array.isArray(sujetsDuProjet) || !Array.isArray(sujetsDuLabel)) {
    return { connu: false, disparus: [], suivis: 0 };
  }

  const porteLeLabel = new Set(sujetsDuLabel.map(texte).filter(Boolean));
  const suivis = sujetsDuProjet.filter((sujet) => porteLeLabel.has(texte(sujet?.id)));

  const retrouves = new Set(
    (Array.isArray(confrontes) ? confrontes : [])
      .map((point) => texte(point?.sujet?.id))
      .filter(Boolean)
  );

  return {
    connu: true,
    suivis: suivis.length,
    disparus: suivis.filter((sujet) => !retrouves.has(texte(sujet?.id)))
  };
}

/**
 * Ce qu'il faut dire des disparitions, en une phrase.
 *
 * Elle ne dit jamais « ces sujets sont réglés ». Elle pose la question, et c'est
 * quelqu'un qui répond.
 */
export function phraseDesDisparus(disparition = {}) {
  if (!disparition?.connu) {
    return "On ne sait pas quels sujets viennent de comptes rendus : aucune disparition ne peut être relevée.";
  }

  const combien = disparition.disparus?.length ?? 0;
  if (disparition.suivis === 0) {
    return "Aucun sujet du projet ne vient encore d'un compte rendu : il n'y a rien à comparer.";
  }
  if (combien === 0) {
    return `Les ${disparition.suivis} sujets suivis depuis les comptes rendus figurent tous dans celui-ci.`;
  }

  return `${combien} sujet${combien > 1 ? "s" : ""} suivi${combien > 1 ? "s" : ""} depuis les comptes rendus n'apparai${
    combien > 1 ? "ssent" : "t"} pas dans celui-ci. Ce n'est pas une réponse : un point sort d'un compte rendu parce qu'il est réglé, parce qu'on l'a oublié, parce que le lot n'était pas convoqué, ou parce que le document a changé de trame.`;
}
