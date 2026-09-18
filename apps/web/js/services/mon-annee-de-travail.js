/**
 * Mon année de travail : ce qu'on mesure, et pourquoi on le mesure ainsi.
 *
 * ## La question
 *
 * « Qu'est-ce que j'ai fait cette année ? » — posée à soi-même, sur l'écran
 * d'accueil, et personne d'autre ne la lit. Ce n'est pas un indicateur de
 * performance, et ce fichier n'a rien pour en devenir un : il ne compare
 * personne à personne, et il ne sort d'aucun compte.
 *
 * ## Ce qui compte comme travail : **un geste signé**
 *
 * Un geste qui **porte mon nom** et qui **laisse une trace que quelqu'un d'autre
 * peut relire**. Lire, naviguer, filtrer, chercher ne comptent pas : cela ne
 * laisse rien, personne ne peut le vérifier, et une mesure qu'on ne peut pas
 * vérifier est une mesure qu'on finit par ne plus croire.
 *
 * Quatre gestes, aujourd'hui, et ils valent tous **un** :
 *
 *  - une **proposition** que j'ai ouverte ;
 *  - une **affirmation** que j'ai signée — c'est ce qui entre en mémoire, et
 *    c'est le geste le plus lourd de tous ;
 *  - une **discussion** avec le Copilote ;
 *  - une **étude** d'utilitaire que j'ai remplie.
 *
 * **Aucune pondération**, et c'est délibéré. Faire valoir une signature 3,5
 * discussions demanderait de défendre le 3,5 ; on ne saurait pas, et l'on
 * retoucherait le chiffre un jour au hasard. Le même refus qu'ailleurs dans ce
 * projet.
 *
 * ## Ce qu'on ne compte pas, et pourquoi on le dit
 *
 * **Les dépôts de documents.** La table ne dit pas qui a déposé : « le projet a
 * bougé » n'est pas « j'y ai travaillé », et compter le travail des autres sous
 * le sien serait la pire façon de se tromper (règle 5).
 *
 * **Les commentaires écrits sur un sujet.** Ils comptent, mais ils ne sont pas
 * encore lus ici : la seule colonne qui les rattache à un compte est
 * facultative, et un compte partiel se lirait comme un compte. On le dit à
 * l'écran plutôt que de faire semblant.
 *
 * ## La teinte d'un jour : où il se place parmi vos niveaux de charge
 *
 * C'est la décision la plus discutable, alors elle est dite en toutes lettres.
 *
 * Un seuil fixe — 1 à 2, 3 à 5, 6 à 10, 11 et plus — est un chiffre qu'on ne
 * sait pas justifier, et il ne veut pas dire la même chose pour quelqu'un qui
 * écrit vingt commentaires par jour et pour quelqu'un qui signe une proposition
 * par semaine. Le même vert dirait chez l'un « journée ordinaire » et chez
 * l'autre « journée exceptionnelle ».
 *
 * Les quatre teintes se répartissent donc sur **vos niveaux de charge** — les
 * nombres de gestes que vos journées ont réellement pris, sans les doublons.
 * **Votre jour le plus chargé porte toujours la teinte la plus claire**, votre
 * jour actif le moins chargé la plus sombre des quatre.
 *
 * ### Pourquoi les niveaux, et non les jours
 *
 * Couper les *jours* en quatre groupes égaux semblait plus naturel, et c'est
 * faux au bord : avec deux jours actifs, aucun des deux n'atteint jamais le
 * dernier groupe, et la légende ment. Répartir sur les **niveaux** garde la
 * phrase vraie quel que soit le nombre de jours — c'est une garde cassée qui
 * l'a montré.
 *
 * **Les jours à zéro ne comptent pas.** Les inclure ferait de quelqu'un qui
 * travaille deux jours par semaine un niveau de charge à zéro geste, et
 * l'échelle se tasserait sur le vide.
 *
 * **Les ex æquo partagent leur teinte.** Ce sont les niveaux qui se répartissent,
 * pas les journées : deux jours à trois gestes ne peuvent pas prendre deux
 * teintes différentes, sans quoi la carte dirait une différence qui n'existe pas.
 *
 * **Un seul niveau fait une seule teinte.** Quelqu'un qui pose exactement un
 * geste par jour n'a pas de jour chargé, et la carte n'en invente pas.
 *
 * ## Une carte qu'on n'a pas lue n'est pas une année vide
 *
 * `null` tant que la lecture n'a pas abouti. Une grille toute grise dirait « je
 * n'ai rien fait de l'année », ce qui est une information — et fausse.
 *
 * ## Il est pur
 *
 * Il reçoit des traces datées et rend une grille. C'est ce qui permet de
 * l'exécuter et de vérifier qu'un jour chargé ne prend pas la teinte d'un jour
 * calme.
 */

const texte = (valeur) => String(valeur ?? "").trim();

const JOUR = 24 * 60 * 60 * 1000;

/** Combien de jours la carte montre. Douze mois glissants, au jour près. */
export const JOURS = 365;

/** Combien de teintes, la grise exceptée. */
export const TEINTES = 4;

/** Ce qu'on dit de la mesure, à l'écran. Écrit une fois (règle 10). */
export const CE_QUON_COMPTE =
  "Un geste qui porte votre nom : une proposition ouverte, une affirmation signée, "
  + "une discussion avec le Copilote, une étude remplie.";

/** Le jour d'un instant, en `AAAA-MM-JJ`, ou `""` quand la date est illisible. */
export function jourDe(quand = "") {
  const lu = Date.parse(texte(quand));
  return Number.isFinite(lu) ? new Date(lu).toISOString().slice(0, 10) : "";
}

/**
 * Les jours de la fenêtre, du plus ancien à aujourd'hui.
 *
 * On les pose **tous**, y compris les vides : une carte qui ne dessinerait que
 * les jours vus serrerait les creux jusqu'à les faire disparaître, et deux
 * années n'auraient pas la même échelle de temps.
 */
export function joursDeLaFenetre(maintenant = Date.now(), combien = JOURS) {
  const nombre = Math.max(1, Math.trunc(combien) || 1);
  const aujourdhui = Date.parse(jourDe(new Date(maintenant).toISOString()));

  return Array.from({ length: nombre }, (_, rang) =>
    new Date(aujourdhui - (nombre - 1 - rang) * JOUR).toISOString().slice(0, 10));
}

/**
 * Le nombre de gestes par jour, sur la fenêtre.
 *
 * Ce qui tombe hors de la fenêtre est ignoré en silence : ce n'est pas une
 * perte, c'est le cadre qu'on a choisi.
 */
export function gestesParJour({ traces = [], maintenant = Date.now(), combien = JOURS } = {}) {
  const fenetre = new Set(joursDeLaFenetre(maintenant, combien));
  const comptes = new Map();

  for (const trace of Array.isArray(traces) ? traces : []) {
    const jour = jourDe(trace?.quand);
    if (!jour || !fenetre.has(jour)) continue;
    comptes.set(jour, (comptes.get(jour) ?? 0) + 1);
  }

  return comptes;
}

/**
 * Vos niveaux de charge : les nombres de gestes que vos journées ont pris.
 *
 * Triés, sans doublons, les jours vides retirés. C'est l'échelle sur laquelle
 * les quatre teintes se répartissent.
 */
export function niveauxDeCharge(comptes = []) {
  const valeurs = [...(comptes ?? [])]
    .map((valeur) => Math.max(0, Math.trunc(valeur) || 0))
    .filter((valeur) => valeur > 0);

  return [...new Set(valeurs)].sort((gauche, droite) => gauche - droite);
}

/**
 * La teinte d'un jour : où son niveau de charge se place parmi les vôtres.
 *
 * Le jour le plus chargé prend toujours la dernière teinte, le moins chargé la
 * première. Un seul niveau fait une seule teinte : sans jour plus chargé qu'un
 * autre, il n'y a pas de jour chargé.
 *
 * @param {number} combien les gestes de ce jour
 * @param {number[]} niveaux vos niveaux de charge, triés et sans doublons
 * @returns {number} 0 pour un jour sans geste, 1 à 4 sinon
 */
export function teinteDunJour(combien = 0, niveaux = []) {
  const gestes = Math.max(0, Math.trunc(combien) || 0);
  if (!gestes) return 0;

  const echelle = Array.isArray(niveaux) ? niveaux : [];
  const rang = echelle.indexOf(gestes);
  // Un niveau qu'on ne connaît pas, ou une échelle d'un seul niveau : la
  // première teinte. Elle dit « ce jour a compté », et rien de plus.
  if (rang < 0 || echelle.length < 2) return 1;

  return 1 + Math.floor(((TEINTES - 1) * rang) / (echelle.length - 1));
}

/**
 * Mon année, jour par jour.
 *
 * @param {object} options
 * @param {object[]|null} options.traces mes traces datées — `null` : pas lues
 * @returns {{jours: {jour: string, combien: number, teinte: number}[], total: number,
 *   joursActifs: number}|null}
 */
export function monAnneeDeTravail({ traces = null, maintenant = Date.now(), combien = JOURS } = {}) {
  if (!Array.isArray(traces)) return null;

  const comptes = gestesParJour({ traces, maintenant, combien });
  // L'échelle se calcule une fois, et non une fois par jour : 365 tris de la
  // même liste à chaque rendu de l'accueil se sentiraient.
  const niveaux = niveauxDeCharge([...comptes.values()]);

  const jours = joursDeLaFenetre(maintenant, combien).map((jour) => {
    const gestes = comptes.get(jour) ?? 0;
    return { jour, combien: gestes, teinte: teinteDunJour(gestes, niveaux) };
  });

  return {
    jours,
    total: [...comptes.values()].reduce((somme, valeur) => somme + valeur, 0),
    joursActifs: comptes.size
  };
}

/**
 * Ce qu'on écrit en tête de la carte.
 *
 * Le total **et** le nombre de jours : « 6 277 gestes » ne dit pas si c'est
 * trois jours ou trois cents, et c'est précisément la différence qu'on veut
 * lire. Le même refus du compte nu qu'ailleurs dans ce projet.
 */
export function phraseDeLAnnee(annee = null) {
  if (!annee) return "";

  const gestes = annee.total === 1 ? "1 geste" : `${annee.total.toLocaleString("fr-FR")} gestes`;
  const jours = annee.joursActifs === 1 ? "1 jour" : `${annee.joursActifs} jours`;

  return `${gestes} sur ${jours}, ces douze derniers mois`;
}
