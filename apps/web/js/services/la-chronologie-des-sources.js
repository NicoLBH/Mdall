/**
 * Le décalage entre l'ordre où les documents arrivent et l'ordre où ils se sont
 * écrits.
 *
 * ## Le défaut, et il est grave
 *
 * Un compte rendu qui ne parle plus d'un sujet le ferme — c'est la règle de
 * `fermeture-du-cr.js`, et elle se défend : un point réglé cesse d'être
 * rapporté, et rouvrir coûte un clic.
 *
 * **Mais elle suppose que les documents arrivent dans l'ordre.** Déposez le
 * compte rendu n° 20 après le n° 57, et tous les sujets nés entre les deux sont
 * absents du n° 20 — pas parce qu'ils sont réglés, mais parce qu'ils n'existaient
 * pas encore. La règle les ferme tous. Le dépôt d'une archive suffit à vider un
 * projet.
 *
 * ## La ligne qu'on trace, et pourquoi elle est là
 *
 * Un document porte deux dates, et les confondre est l'erreur :
 *
 * - **la date du document** — la réunion s'est tenue le 12 mars ;
 * - **la date du dépôt** — il est entré dans Mdall le 20 septembre.
 *
 * C'est la première qui ordonne. La seconde ne dit rien du chantier ; elle dit
 * seulement quand quelqu'un a eu le temps de classer.
 *
 * **Une source antérieure à ce qu'on sait déjà n'ajoute qu'à l'histoire.** Elle
 * ne révise pas le présent, parce qu'elle ne le connaît pas.
 *
 * ## Le fait daté passe, la déduction non
 *
 * C'est la distinction qui décide de tout ici, et elle n'est pas arbitraire.
 *
 * | Ce que le document fait | Depuis le passé |
 * | --- | --- |
 * | Il ouvre un sujet | **oui** — un point qu'on ne suivait pas reste à suivre |
 * | Il dit « fait », avec sa date | **oui** — c'est un fait daté, et la proposition se signe avec cette date sous les yeux |
 * | Il n'en parle plus | **non** — c'est une déduction sur *maintenant*, et un document du passé ne sait rien de maintenant |
 *
 * Une phrase du document est vraie au jour du document, et le lecteur qui signe
 * la voit datée. Une absence, elle, ne dit rien du tout : elle ne devient une
 * fermeture que par un raisonnement sur l'état présent — et ce raisonnement
 * exige que le document *soit* le présent.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne range rien, ne ferme rien, n'ouvre rien. Il répond à une question :
 * **où cette source se place-t-elle dans ce qu'on sait déjà, et qu'a-t-elle le
 * droit de réviser ?** Ce sont les appelants qui agissent.
 *
 * Des dates entrent, une place sort. Aucun réseau, aucune horloge — et surtout
 * pas « aujourd'hui » : une règle qui dépendrait de l'heure où on la lit ne se
 * vérifierait pas deux fois de suite (règle 12).
 */

import { jourEcrit } from "./echeances-du-cr.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le jour d'une source, quelle que soit la façon dont il est écrit.
 *
 * **Les deux formes circulent, et les confondre coûte quinze ans.** La base
 * range en ISO — `2026-09-11` —, le document est lu à la française —
 * `11 septembre 2026`, `11/09/2026`. Or `jourEcrit` lit une date française :
 * sur `2026-09-11`, il retient `26-09-11` et rend **`2011-09-26`**, sans rien
 * signaler. Un compte rendu de cette année passerait pour le plus ancien du
 * projet, et son silence fermerait tout.
 *
 * L'ISO se reconnaît donc **d'abord**, et à son ancrage au début : c'est la
 * seule façon de ne pas le laisser tomber dans la lecture française.
 */
export function leJourDeLaSource(valeur) {
  const dit = texte(valeur);

  const iso = dit.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, annee, mois, jour] = iso;
    const date = new Date(Date.UTC(Number(annee), Number(mois) - 1, Number(jour)));
    // Le 31 février existe en arithmétique, pas au calendrier.
    if (date.getUTCMonth() !== Number(mois) - 1 || date.getUTCDate() !== Number(jour)) return "";
    return date.toISOString().slice(0, 10);
  }

  return jourEcrit(dit);
}

/**
 * Les jours des sources déjà lues, lus dans les lignes que la base rend.
 *
 * **La traduction vit ici, à un seul endroit.** La base parle de `tenue_le`,
 * le service parle d'un jour ; recopier la lecture chez chacun de ceux qui en
 * ont besoin ferait diverger les deux le jour où la colonne change (règle 4).
 *
 * Les lignes qu'on ne sait pas dater sont retirées plutôt que rendues vides :
 * une borne qu'on n'a pas ne doit pas peser dans une comparaison.
 */
export function lesJoursDesSources(lignes = []) {
  return (Array.isArray(lignes) ? lignes : [])
    .map((ligne) => leJourDeLaSource(ligne?.tenue_le ?? ligne?.tenueLe ?? ligne))
    .filter(Boolean);
}

/** Où une source se place dans ce qu'on sait déjà. */
export const PLACE = {
  /**
   * Rien de plus récent n'est connu : elle est le présent.
   *
   * C'est aussi la place d'une source qui n'a rien devant elle — le premier
   * compte rendu d'un projet est en tête, et il n'y a rien à comparer.
   */
  EN_TETE: "en-tete",
  /** Une source plus récente est déjà connue : celle-ci arrive après coup. */
  RETROSPECTIVE: "retrospective",
  /**
   * On ne sait pas la dater.
   *
   * **Ce n'est pas « en tête ».** Ne pas savoir où placer un document
   * n'autorise pas à le traiter comme le dernier (règle 5) : il se comporte
   * comme une rétrospective, et l'écran dit pourquoi.
   */
  SANS_DATE: "sans-date",
  /**
   * On n'a pas pu lire ce qui précède : la place est inconnue.
   *
   * **Ce n'est pas la même ignorance que `SANS_DATE`.** Là, le document n'a pas
   * de date ; ici, c'est l'histoire du projet qui manque. Les deux se disent
   * autrement, et les confondre enverrait chercher la date sur un document qui
   * en porte une.
   *
   * Le sens de l'erreur est choisi : **on ne déduit pas sans savoir où l'on
   * est.** Un sujet laissé ouvert à tort se voit et coûte un clic ; un sujet
   * fermé à tort disparaît.
   */
  SANS_REPERE: "sans-repere"
};

/**
 * Où se place une source, et ce qui la précède.
 *
 * @param {object} options
 * @param {string} options.date la date du document, ISO ou à la française
 * @param {string[]} options.connues les dates des sources déjà lues du même genre
 * @returns {{place: string, jour: string, laPlusRecente: string|null, combien: number}}
 */
export function laPlaceDeLaSource({ date = "", connues = [] } = {}) {
  const jours = (Array.isArray(connues) ? connues : [])
    .map((une) => leJourDeLaSource(une))
    .filter(Boolean)
    .sort();

  const laPlusRecente = jours.at(-1) ?? null;
  const jour = leJourDeLaSource(date);
  const socle = { jour, laPlusRecente, combien: jours.length };

  // **`null` n'est pas une liste vide.** Une liste vide dit « ce projet n'a
  // encore rien lu » — le document est alors le premier, donc en tête. `null`
  // dit « on n'a pas pu lire », et l'on ne déduit pas sans savoir (règle 5).
  if (connues === null || connues === undefined) return { ...socle, place: PLACE.SANS_REPERE };

  if (!jour) return { ...socle, place: PLACE.SANS_DATE };

  // **À égalité, elle est en tête.** Deux comptes rendus du même jour ne
  // s'annulent pas : le second complète le premier, il ne vient pas d'avant.
  if (!laPlusRecente || jour >= laPlusRecente) return { ...socle, place: PLACE.EN_TETE };

  return { ...socle, place: PLACE.RETROSPECTIVE };
}

/** Ce qu'une source peut faire de l'état d'un sujet. */
export const REVISION = {
  /** Ouvrir un sujet qu'on ne suivait pas. */
  OUVRIR: "ouvrir",
  /** Fermer parce que le document le dit — une mention, une date de fermeture. */
  FERMER_SUR_UNE_PHRASE: "fermer-sur-une-phrase",
  /** Fermer parce que le document n'en parle plus. */
  FERMER_PAR_ABSENCE: "fermer-par-absence"
};

/**
 * Ce qu'une source a le droit de réviser, vu d'où elle se place.
 *
 * **Seule la déduction est refusée au passé**, et c'est toute la règle. Un
 * document qui dit « fait » énonce un fait daté ; celui qui se tait n'énonce
 * rien, et sa fermeture est un raisonnement sur le présent — que seul le
 * présent peut tenir.
 */
export function cequElleRevise(place) {
  const tout = [REVISION.OUVRIR, REVISION.FERMER_SUR_UNE_PHRASE, REVISION.FERMER_PAR_ABSENCE];
  return new Set(place === PLACE.EN_TETE ? tout : tout.filter(
    (quoi) => quoi !== REVISION.FERMER_PAR_ABSENCE));
}

/** Cette source peut-elle fermer un sujet sur son silence ? */
export function fermeParAbsence(place) {
  return cequElleRevise(place).has(REVISION.FERMER_PAR_ABSENCE);
}

/**
 * Où se place cette source, dit en une phrase.
 *
 * **Elle nomme la date qui l'a fait reculer**, et non seulement le verdict :
 * « antérieure » sans dire à quoi laisse chercher, et un lecteur qui cherche
 * finit par ne plus lire. Rien quand la source est en tête et qu'il n'y a donc
 * rien à expliquer.
 */
export function phraseDeLaPlace(placement = {}) {
  const { place, jour, laPlusRecente, combien } = placement;

  if (place === PLACE.SANS_REPERE) {
    return "on n'a pas pu lire les comptes rendus déjà lus de ce projet : on ne sait pas où "
      + "celui-ci se place dans le temps";
  }
  if (place === PLACE.SANS_DATE) {
    return "ce document n'est pas daté : on ne sait pas où le placer dans le temps du projet";
  }
  if (place !== PLACE.RETROSPECTIVE) return "";

  const lues = Number(combien) || 0;
  return `ce document est daté du ${jour}, et ${lues > 1 ? `${lues} documents déjà lus vont` : "un document déjà lu va"}`
    + ` jusqu'au ${laPlusRecente} : il arrive après coup`;
}

/**
 * Ce qu'une source venue du passé ne fera pas, dit en une phrase.
 *
 * Elle se lit sous la précédente : l'une dit où l'on est, l'autre ce qui en
 * découle. Les coudre en une seule ferait une phrase qu'on ne lit plus.
 */
export function phraseDeCeQuelleNeFeraPas(placement = {}) {
  if (fermeParAbsence(placement?.place)) return "";

  return "son silence ne ferme donc aucun sujet : un document du passé ne dit rien "
    + "de ce qui est ouvert aujourd'hui. Ce qu'il affirme, lui, reste lisible.";
}
