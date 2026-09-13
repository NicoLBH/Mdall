/**
 * Les échéances d'un compte rendu, et ce qu'on en fait des objectifs.
 *
 * ## Le problème : une échéance est un texte, un objectif demande une date
 *
 * Le compte rendu écrit ce qu'il veut — « Pour le 30/04/2026 », « 30 avril »,
 * « sous 48 h », « avant la prochaine réunion », « S15 ». Un objectif Mdall,
 * lui, porte une date. Il faut donc convertir, et **c'est là que tout se joue**.
 *
 * Une date fausse est pire qu'une date absente. Un objectif daté du 30 mars
 * quand le document dit fin avril fait courir une alerte un mois trop tôt ;
 * daté de l'an prochain, il ne sonne jamais. Dans les deux cas, personne ne
 * remontera jusqu'au compte rendu pour vérifier — on fera confiance au chiffre.
 *
 * ## Trois façons d'obtenir une date, et une quatrième qui n'en est pas une
 *
 * | | |
 * | --- | --- |
 * | `ECRITE`   | le document donne le jour, le mois et l'année |
 * | `COMPLETEE`| le document donne le jour et le mois ; l'année vient du compte rendu |
 * | `COMPTEE`  | le document donne un délai — « sous 15 jours » — compté depuis la date de la réunion |
 * | *(refus)*  | tout le reste |
 *
 * La règle de `COMPLETEE` mérite d'être écrite : **une échéance est postérieure
 * à la réunion qui la fixe.** C'est ce qu'échéance veut dire. On prend donc
 * l'année du compte rendu, et l'année suivante si cela tomberait avant lui.
 * « 15 janvier » dans un compte rendu de décembre est le 15 janvier suivant.
 *
 * ## Ce qu'on refuse, et pourquoi on le nomme
 *
 * « Avant la prochaine réunion » n'est pas une date : on ne sait pas quand elle
 * est. « S15 » non plus : la numérotation des semaines varie d'un bureau à
 * l'autre, et se tromper d'une semaine est exactement le genre d'erreur qu'on
 * ne remarque pas.
 *
 * Ces échéances-là ne disparaissent pas : elles se comptent et s'affichent
 * telles quelles. C'est la liste de ce qu'on ne sait pas encore convertir, et
 * c'est elle qui dira s'il vaut la peine d'en convertir davantage (règle 5).
 *
 * ## Un objectif par date, et non par point
 *
 * Quarante points font quarante échéances, mais rarement quarante dates : un
 * chantier travaille par jalons — « ce qui doit être fait pour le 30 avril ».
 * Un objectif par point donnerait quarante objectifs dont aucun ne se lit.
 *
 * ## Rien n'est créé ici
 *
 * Ce module rend des listes. Créer un objectif est une écriture, et une
 * écriture passe par une proposition (règle 1).
 *
 * Rien ici n'appelle quoi que ce soit : des textes entrent, des dates sortent.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Comment la date a été obtenue. Les trois ne se valent pas. */
export const SUR = {
  ECRITE: "ecrite",
  COMPLETEE: "completee",
  COMPTEE: "comptee"
};

export const PHRASES_DU_SUR = {
  [SUR.ECRITE]: "La date est écrite en toutes lettres dans le document.",
  [SUR.COMPLETEE]: "Le document donne le jour et le mois ; l'année vient du compte rendu.",
  [SUR.COMPTEE]: "Le document donne un délai, compté depuis la date de la réunion."
};

const MOIS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
];

const aplati = (valeur) =>
  texte(valeur)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Une date en `AAAA-MM-JJ`, ou "" quand le jour n'existe pas. */
function enDate(annee, mois, jour) {
  if (!(mois >= 1 && mois <= 12) || !(jour >= 1 && jour <= 31)) return "";

  const date = new Date(Date.UTC(annee, mois - 1, jour));
  // Le 31 février existe en arithmétique, pas au calendrier : la construction
  // le décale au 3 mars, et l'on rendrait une date que personne n'a écrite.
  if (date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) return "";

  return date.toISOString().slice(0, 10);
}

/**
 * Le jour d'une date écrite à la française, ou "".
 *
 * Sert aussi bien à lire la date du compte rendu qu'une échéance complète : une
 * seule lecture pour les deux, sinon les deux finiraient par différer (règle 4).
 */
export function jourEcrit(valeur = "") {
  const dit = aplati(valeur);

  const chiffres = dit.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/);
  if (chiffres) {
    const annee = Number(chiffres[3]);
    return enDate(annee < 100 ? 2000 + annee : annee, Number(chiffres[2]), Number(chiffres[1]));
  }

  const lettres = dit.match(new RegExp(`(\\d{1,2})\\s+(${MOIS.join("|")})\\s+(\\d{4})`));
  if (lettres) {
    return enDate(Number(lettres[3]), MOIS.indexOf(lettres[2]) + 1, Number(lettres[1]));
  }

  return "";
}

/** Le jour et le mois, sans année — « 30/04 », « 30 avril ». */
function jourSansAnnee(valeur = "") {
  const dit = aplati(valeur);

  const lettres = dit.match(new RegExp(`(\\d{1,2})\\s+(${MOIS.join("|")})(?!\\s*\\d)`));
  if (lettres) return { jour: Number(lettres[1]), mois: MOIS.indexOf(lettres[2]) + 1 };

  const chiffres = dit.match(/(?:^|[^\d\/\-.])(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?![\d\/\-.])/);
  if (chiffres) return { jour: Number(chiffres[1]), mois: Number(chiffres[2]) };

  return null;
}

/** Un délai — « sous 15 jours », « dans 3 semaines », « sous 48 h ». */
function delai(valeur = "") {
  const dit = aplati(valeur);
  const trouve = dit.match(/\b(?:sous|dans|a|sous un delai de|delai)\s+(\d{1,3})\s*(h|heures?|jours?|semaines?|mois)\b/);
  if (!trouve) return null;

  const combien = Number(trouve[1]);
  const unite = trouve[2];

  if (unite.startsWith("h")) return Math.ceil(combien / 24);
  if (unite.startsWith("jour")) return combien;
  if (unite.startsWith("semaine")) return combien * 7;
  // Un mois vaut trente jours : la seule convention qui ne dépende d'aucun mois.
  return combien * 30;
}

/**
 * La date d'une échéance, telle qu'on peut l'établir — ou `null`.
 *
 * `null` est une réponse, et la bonne quand on ne sait pas : un objectif daté
 * au jugé fait courir une alerte que personne n'a fixée.
 *
 * @param {string} echeance l'échéance telle que le document l'écrit
 * @param {{leJour?: string}} options la date de la réunion, en `AAAA-MM-JJ`
 * @returns {{date: string, sur: string}|null}
 */
export function dateDeLEcheance(echeance = "", { leJour = "" } = {}) {
  const dit = texte(echeance);
  if (!dit) return null;

  const ecrite = jourEcrit(dit);
  if (ecrite) return { date: ecrite, sur: SUR.ECRITE };

  const reunion = texte(leJour);
  // Sans la date de la réunion, ni le délai ni l'année ne se calculent. On
  // refuse plutôt que de compter depuis aujourd'hui : la lecture d'un compte
  // rendu de mars faite en septembre daterait tout de six mois trop tard.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reunion)) return null;

  const jours = delai(dit);
  if (jours !== null) {
    const date = new Date(`${reunion}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + jours);
    return { date: date.toISOString().slice(0, 10), sur: SUR.COMPTEE };
  }

  const partiel = jourSansAnnee(dit);
  if (partiel) {
    const annee = Number(reunion.slice(0, 4));
    // **Une échéance est postérieure à la réunion qui la fixe.** C'est ce
    // qu'échéance veut dire : « 15 janvier » dans un compte rendu de décembre
    // est le 15 janvier suivant.
    const memeAnnee = enDate(annee, partiel.mois, partiel.jour);
    if (!memeAnnee) return null;
    if (memeAnnee >= reunion) return { date: memeAnnee, sur: SUR.COMPLETEE };

    const suivante = enDate(annee + 1, partiel.mois, partiel.jour);
    return suivante ? { date: suivante, sur: SUR.COMPLETEE } : null;
  }

  return null;
}

/** Une date `AAAA-MM-JJ` telle qu'on l'écrit en français. */
export function dateEnFrancais(date = "") {
  const trouve = texte(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return trouve ? `${trouve[3]}/${trouve[2]}/${trouve[1]}` : "";
}

/** Le nom d'un objectif. Un seul endroit : le filtre et l'écran le lisent pareil. */
export function nomDeLObjectif(date = "") {
  const dit = dateEnFrancais(date);
  return dit ? `Échéance du ${dit}` : "";
}

/**
 * Les objectifs que ce compte rendu porte, et les échéances qu'on n'a pas su lire.
 *
 * **Un objectif par date, et non par point.** Quarante points font rarement
 * quarante dates : un chantier travaille par jalons.
 *
 * @param {object[]} points la lecture assemblée
 * @param {{tenueLe?: string}} options la date du compte rendu, telle qu'écrite
 * @returns {{objectifs: object[], sansDate: object[], leJour: string}}
 */
export function objectifsDuCompteRendu(points = [], { tenueLe = "" } = {}) {
  const leJour = jourEcrit(tenueLe);
  const parDate = new Map();
  const sansDate = [];

  for (const point of Array.isArray(points) ? points : []) {
    const echeance = texte(point?.echeance);
    if (!echeance) continue;

    const lue = dateDeLEcheance(echeance, { leJour });
    if (!lue) {
      sansDate.push({ echeance, titre: texte(point?.titre) });
      continue;
    }

    if (!parDate.has(lue.date)) {
      parDate.set(lue.date, { date: lue.date, nom: nomDeLObjectif(lue.date), sur: lue.sur, points: [] });
    }

    const objectif = parDate.get(lue.date);
    objectif.points.push({ titre: texte(point?.titre), echeance, sur: lue.sur });
    // Un objectif dont une seule échéance a été comptée ou complétée n'est plus
    // « écrit » : on montre la moins sûre des provenances, pas la plus flatteuse.
    if (objectif.sur === SUR.ECRITE && lue.sur !== SUR.ECRITE) objectif.sur = lue.sur;
  }

  return {
    objectifs: [...parDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    sansDate,
    leJour
  };
}

/**
 * Ce que le projet a déjà, et ce qu'il faudrait créer.
 *
 * @param {object[]|null} objectifsDuProjet — `null` quand on n'a pas pu les lire
 */
export function objectifsAProposer(points = [], { tenueLe = "", objectifsDuProjet = null } = {}) {
  const { objectifs, sansDate, leJour } = objectifsDuCompteRendu(points, { tenueLe });

  const connu = objectifsDuProjet !== null && objectifsDuProjet !== undefined;
  const duProjet = Array.isArray(objectifsDuProjet) ? objectifsDuProjet : [];

  return {
    connu,
    leJour,
    sansDate,
    objectifs: objectifs.map((objectif) => ({
      ...objectif,
      // **La date décide, pas le nom.** Un objectif nommé autrement mais daté
      // du même jour est le même jalon : en créer un second le doublerait.
      existe: connu && duProjet.some(
        (candidat) => texte(candidat?.due_date ?? candidat?.dueDate) === objectif.date
      )
    }))
  };
}

/**
 * Ce qu'il faut dire des échéances, en une phrase.
 *
 * Sans la date de la réunion, ni les délais ni les dates sans année ne se
 * calculent — et le dire explique pourquoi la liste est courte.
 */
export function phraseDesObjectifs(proposition = {}) {
  const objectifs = proposition?.objectifs?.length ?? 0;
  const sansDate = proposition?.sansDate?.length ?? 0;

  if (objectifs === 0 && sansDate === 0) return "Aucun point de ce compte rendu ne porte d'échéance.";

  if (objectifs === 0) {
    return `${sansDate} échéance${sansDate > 1 ? "s" : ""} ${
      sansDate > 1 ? "sont écrites" : "est écrite"} sans date exploitable : aucun objectif ne peut en sortir.`;
  }

  const aCreer = proposition.objectifs.filter((objectif) => !objectif.existe).length;

  if (!proposition.connu) {
    return `${objectifs} échéance${objectifs > 1 ? "s distinctes" : ""} ${
      objectifs > 1 ? "ont été lues" : "a été lue"} — les objectifs du projet n'ont pas pu être lus, on ne sait donc pas lesquels existent déjà.`;
  }

  if (aCreer === 0) {
    return `Les ${objectifs} échéance${objectifs > 1 ? "s" : ""} de ce compte rendu ${
      objectifs > 1 ? "ont déjà leur objectif" : "a déjà son objectif"} dans le projet.`;
  }

  return `${aCreer} objectif${aCreer > 1 ? "s" : ""} ${aCreer > 1 ? "seraient créés" : "serait créé"}, ${
    aCreer > 1 ? "un par date d'échéance" : "à la date d'échéance"}.`;
}
