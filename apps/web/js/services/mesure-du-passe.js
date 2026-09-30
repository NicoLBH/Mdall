/**
 * Prédire dans le passé — **l'instrument, avant tout moteur**.
 *
 * ## Pourquoi cela vient en premier
 *
 * C'est la partie que tout le monde saute, et c'est celle qui décide si le
 * reste vaut quelque chose (`docs/la-memoire-qui-predit.md`, § 7).
 *
 * > **Une prédiction qu'on ne note pas est une intention** (règle 12).
 *
 * Construire un prédicteur avant d'avoir de quoi le mesurer, c'est se condamner
 * à ne jamais savoir s'il sert. Et l'on ne s'en aperçoit pas : les chiffres
 * qu'on ne calcule pas ne démentent personne.
 *
 * ## Ce que cet instrument permet, et que rien d'autre ne permet
 *
 * Mdall a des affirmations **datées et ordonnées**. On peut donc rejouer : à la
 * date *T*, avec **seulement** ce qu'on savait alors, qu'aurait dit le moteur ?
 * Et qu'est-il arrivé après *T* ?
 *
 * Cela donne des chiffres réels **avant d'avoir un seul utilisateur du
 * moteur** — et, plus tard, cent historiques de chantier feront cent jeux
 * d'épreuve gratuits (`docs/nourrir-mdall.md`).
 *
 * ## La coupe est stricte, et c'est la garde de tout l'édifice
 *
 * Ce qui est daté **de** *T* n'entre pas dans ce qu'on savait **à** *T*. La
 * différence entre `<` et `<=` semble anodine ; elle ne l'est pas. Une seule
 * ligne du futur qui fuit dans le passé gonfle tous les chiffres, et **rien ne
 * le signale** : un moteur qui a vu la réponse a l'air excellent.
 *
 * C'est l'épreuve la plus importante de ce fichier.
 *
 * ## L'instrument ne sait pas prédire, et c'est voulu
 *
 * Le prédicteur entre par la porte : une fonction qui reçoit ce qu'on savait et
 * rend une liste ordonnée. L'instrument ne connaît ni les fréquences, ni les
 * voisinages, ni les modèles — il mesure. Un instrument qui saurait prédire
 * finirait par se mesurer lui-même.
 *
 * ## Il ne lit rien et n'écrit rien
 *
 * De l'arithmétique sur un épisode, donc tout se vérifie.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Un instant comparable, ou `null`. Une date illisible n'est pas une date. */
function instant(valeur) {
  const quand = Date.parse(texte(valeur));
  return Number.isFinite(quand) ? quand : null;
}

/** Un jour, en millisecondes. */
const UN_JOUR = 24 * 60 * 60 * 1000;

/**
 * Combien de points il faut pour qu'un chiffre veuille dire quelque chose.
 *
 * **Le démarrage à froid, chiffré.** Un projet, la première année : le moteur
 * sera mauvais, et il doit **le dire**. « Sur 2 points » n'est pas « sur 40 »,
 * et afficher les deux de la même façon détruirait la confiance qu'on met trois
 * ans à bâtir.
 *
 * Cinq : en dessous, une réussite de plus fait bouger le taux de vingt points,
 * et l'on lirait du bruit comme un progrès.
 */
export const LE_FROID = 5;

/** La fenêtre par défaut : ce qui arrive dans le mois qui suit. */
export const FENETRE_EN_JOURS = 30;

/**
 * Ce qu'on savait à une date — **et rien de plus**.
 *
 * La coupe est **stricte** : ce qui porte exactement la date *T* n'en fait pas
 * partie. Une prédiction faite à *T* ne doit pas avoir vu ce qui s'est décidé
 * ce jour-là, sans quoi elle se mesure sur sa propre réponse.
 *
 * @returns {object} un épisode de la même forme, tronqué
 */
export function ceQuOnSavaitLe(episode = null, quand = "") {
  const borne = instant(quand);
  const avant = (pas) => {
    const sien = instant(pas?.quand);
    return sien !== null && borne !== null && sien < borne;
  };

  const ouvertures = (episode?.ouvertures ?? []).filter(avant)
    // Ce qu'on savait d'une fermeture : rien, si elle est postérieure. Garder
    // `fermeLe` ferait savoir en mars qu'un sujet se fermerait en juin.
    .map((une) => ({
      ...une,
      fermeLe: instant(une.fermeLe) !== null && instant(une.fermeLe) < borne ? une.fermeLe : null
    }));

  const constats = (episode?.constats ?? []).filter(avant)
    .map((un) => ({
      ...un,
      leveLe: instant(un.leveLe) !== null && instant(un.leveLe) < borne ? un.leveLe : null
    }));

  return {
    contexte: episode?.contexte ?? null,
    depuis: episode?.depuis ?? "",
    // La borne de ce qu'on savait est la date de la coupe, pas celle de la fin.
    jusqua: texte(quand),
    ouvertures,
    constats,
    combien: {
      ouvertures: ouvertures.length,
      enCours: ouvertures.filter((une) => !une.fermeLe).length,
      constats: constats.length,
      leves: constats.filter((un) => un.leveLe).length,
      // Ce qui n'a pas de date n'était pas dans la suite : la coupe ne le fait
      // pas apparaître, et ne le compte pas non plus.
      sansDate: 0
    }
  };
}

/**
 * Ce qui est arrivé après une date, dans la fenêtre qu'on se donne.
 *
 * **Une fenêtre, et non « la suite entière ».** Un moteur qui annonce, en mars,
 * un problème qui surviendra en novembre n'a rien annoncé : il a énuméré. Et un
 * moteur qui prévient la veille ne sert à rien non plus — c'est la fenêtre qui
 * rend les deux mesurables.
 */
export function ceQuiEstArriveApres(episode = null, quand = "", { jours = FENETRE_EN_JOURS } = {}) {
  const borne = instant(quand);
  const fin = borne === null ? null : borne + Math.max(1, Number(jours) || 0) * UN_JOUR;

  const dedans = (pas) => {
    const sien = instant(pas?.quand);
    return sien !== null && borne !== null && sien >= borne && sien <= fin;
  };

  return {
    ouvertures: (episode?.ouvertures ?? []).filter(dedans),
    constats: (episode?.constats ?? []).filter(dedans)
  };
}

/**
 * Rejouer le passé d'un épisode, pas à pas.
 *
 * À chaque moment de la suite, on coupe, on demande au prédicteur ce qu'il
 * aurait dit, et l'on regarde ce qui est arrivé ensuite.
 *
 * **Le premier moment ne se rejoue pas** : à cette date, on ne savait rien, et
 * mesurer une prédiction faite sans rien mesure la chance.
 *
 * @param {object} episode l'épisode entier
 * @param {object} options
 * @param {(su: object) => string[]} options.predire ce que le prédicteur aurait
 *   dit, du plus probable au moins — des **domaines**, pas des noms de sujets
 * @param {(arrive: object) => {quoi: string, quand: string}[]} options.arrive ce
 *   qui est réellement arrivé, **et quand** — c'est la date qui donne le délai
 *   d'avance. Injecté : l'instrument ne décide pas de ce qu'on prédit
 * @param {number} [options.jours] la fenêtre
 * @returns {{rendus: object[], sur: number}}
 */
export function rejouerLePasse(episode = null, {
  predire = null, arrive = null, jours = FENETRE_EN_JOURS
} = {}) {
  if (typeof predire !== "function" || typeof arrive !== "function") return { rendus: [], sur: 0 };

  const moments = [...(episode?.ouvertures ?? []), ...(episode?.constats ?? [])]
    .map((pas) => instant(pas.quand))
    .filter((quand) => quand !== null)
    .sort((gauche, droite) => gauche - droite);

  const rendus = [];
  // **Un moment, une mesure.** Deux constats du même jour ne font pas deux
  // points : ce sont les mêmes conditions, et les compter deux fois donnerait
  // du poids à une journée chargée.
  for (const quand of [...new Set(moments)].slice(1)) {
    const date = new Date(quand).toISOString();
    const su = ceQuOnSavaitLe(episode, date);
    const suite = ceQuiEstArriveApres(episode, date, { jours });

    const predit = (predire(su) ?? []).map(texte).filter(Boolean);
    // Ce qui est venu, **avec sa date** : sans elle, on saurait qu'on a visé
    // juste et pas de combien on était en avance — or un moteur qui prévient
    // la veille ne sert à rien.
    const venu = (arrive(suite) ?? [])
      .map((un) => ({ quoi: texte(un?.quoi), quand: texte(un?.quand) }))
      .filter((un) => un.quoi);

    rendus.push({
      quand: date,
      predit,
      venu,
      // **Rien n'est arrivé n'est pas une erreur du prédicteur**, et pas une
      // réussite non plus : c'est un point qu'on ne peut pas noter, et qui se
      // dit. Le compter comme un échec punirait un moteur pour un mois calme.
      notable: venu.length > 0
    });
  }

  return { rendus, sur: rendus.filter((un) => un.notable).length };
}

/** Les points qu'on peut noter — ceux où quelque chose est arrivé. */
function notables(rendus) {
  return (Array.isArray(rendus) ? rendus : []).filter((un) => un?.notable);
}

/** Ce qui a été annoncé dans les `rang` premiers choix **et** qui est venu. */
function vise(rendu, rang) {
  const annonces = new Set(rendu.predit.slice(0, rang));
  return (rendu.venu ?? []).filter((un) => annonces.has(un.quoi));
}

/**
 * La précision à *k* : combien de fois ce qui est arrivé était dans les *k*
 * premiers choix.
 *
 * **`null` quand il y a trop peu de points**, jamais `0`. Un taux calculé sur
 * deux points est une opinion déguisée en mesure, et c'est exactement ce que
 * cette page existe pour empêcher (règle 5).
 */
export function precisionA(rendus = [], k = 3) {
  const notes = notables(rendus);
  if (notes.length < LE_FROID) return null;

  const rang = Math.max(1, Number(k) || 1);
  const justes = notes.filter((un) => vise(un, rang).length > 0);
  return justes.length / notes.length;
}

/**
 * Le taux de fausse alerte — **le vrai coût, et celui que tout le monde cache**.
 *
 * Trois recommandations fausses, et plus personne ne les lit : on a alors
 * détruit ce qu'on met trois ans à construire. On compte donc la part de ce
 * qu'on a annoncé et qui n'est pas venu — pas la part de ce qu'on a manqué.
 */
export function tauxDeFausseAlerte(rendus = [], k = 3) {
  const notes = notables(rendus);
  if (notes.length < LE_FROID) return null;

  const rang = Math.max(1, Number(k) || 1);
  let annonces = 0;
  let fausses = 0;

  for (const un of notes) {
    const venus = new Set(un.venu.map((quoi) => quoi.quoi));
    for (const dit of un.predit.slice(0, rang)) {
      annonces += 1;
      if (!venus.has(dit)) fausses += 1;
    }
  }

  return annonces ? fausses / annonces : null;
}

/**
 * Le délai d'avance, en jours — **combien de temps avant, en moyenne**.
 *
 * Un moteur qui prévient la veille ne sert à rien. Ce chiffre se lit à côté de
 * la précision : viser juste trois jours avant et viser juste trois semaines
 * avant ne valent pas la même chose.
 *
 * ## Ce qui arrive le jour même n'a pas été anticipé
 *
 * Les moments du rejeu **sont** ceux de la suite : à chaque pas, quelque chose
 * vient de se produire. Compter ce qui arrive à l'instant même donnerait une
 * avance de zéro jour à chaque coup — un chiffre juste et parfaitement inutile,
 * qui ferait lire « 0 j d'avance » comme un échec du moteur alors que c'est la
 * mécanique du rejeu.
 *
 * On ne compte donc que ce qui est venu **strictement après**. Sans rien de
 * tel, on ne se prononce pas (`null`) — et l'écran se tait plutôt que
 * d'afficher zéro (règle 5).
 */
export function delaiDAvance(rendus = [], k = 3) {
  const notes = notables(rendus);
  if (notes.length < LE_FROID) return null;

  const rang = Math.max(1, Number(k) || 1);
  const avances = [];

  for (const un of notes) {
    const depuis = instant(un.quand);
    // Le premier moment où la chose annoncée est effectivement survenue : c'est
    // de là qu'on était en avance, et non de la dernière fois qu'elle est
    // revenue dans la fenêtre.
    const venus = vise(un, rang)
      .map((quoi) => instant(quoi.quand))
      .filter((quand) => quand !== null && depuis !== null && quand > depuis);
    if (!venus.length || depuis === null) continue;
    avances.push((Math.min(...venus) - depuis) / UN_JOUR);
  }

  if (!avances.length) return null;
  return avances.reduce((somme, un) => somme + un, 0) / avances.length;
}

/**
 * La mesure d'un prédicteur sur le passé d'un épisode.
 *
 * Tout ce qu'il faut pour décider s'il vaut quelque chose, **et sur combien il
 * repose**. Une prédiction porte toujours sur combien elle repose, comme une
 * affirmation porte sa provenance.
 *
 * @returns {{sur: number, froid: boolean, precision1: number|null,
 *   precision3: number|null, fausseAlerte: number|null, avance: number|null}}
 */
export function mesureDuPredicteur(episode = null, options = {}) {
  const { rendus, sur } = rejouerLePasse(episode, options);

  return {
    sur,
    // **Le froid se dit, il ne se déduit pas d'un chiffre nul.** Un écran qui
    // reçoit « froid » sait qu'il ne doit rien afficher ; un écran qui reçoit
    // zéro affiche zéro pour cent.
    froid: sur < LE_FROID,
    precision1: precisionA(rendus, 1),
    precision3: precisionA(rendus, 3),
    fausseAlerte: tauxDeFausseAlerte(rendus, 3),
    avance: delaiDAvance(rendus, 3),
    // **Les points eux-mêmes**, parce qu'un pourcentage ne dit pas si le
    // système travaille : un prédicteur qui annonce toujours le domaine le plus
    // courant obtient un bon chiffre sans rien avoir compris. Ce qui le montre,
    // c'est le face-à-face entre ce qui a été annoncé et ce qui est venu — et
    // il faut les points pour le dresser (`le-detail-de-la-prediction.js`).
    rendus
  };
}

/** Un taux, en pour cent. Vide quand on ne se prononce pas. */
export function enPourCent(part) {
  return Number.isFinite(part) ? `${Math.round(part * 100)} %` : "";
}
