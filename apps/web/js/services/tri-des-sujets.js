/**
 * L'ordre des sujets dans le tableau.
 *
 * ## Pourquoi un tri, et pourquoi celui-là
 *
 * La question posée n'était pas « peut-on trier ? » mais : **est-ce que des
 * sujets continuent d'arriver ?** Le compteur restait à 73 d'un jour sur
 * l'autre, et rien à l'écran ne permettait de savoir si c'était parce que rien
 * n'entrait, ou parce que ce qui entrait se rangeait quelque part au milieu
 * d'une liste de soixante-treize lignes.
 *
 * Ranger par dernière activité répond à la question en un coup d'œil : ce qui
 * a bougé en dernier est en haut. Un chantier vivant le montre, un chantier
 * arrêté aussi.
 *
 * ## Ce que « dernière activité » veut dire, et ce qu'on refuse d'inventer
 *
 * On lit la date que le sujet porte : sa dernière modification, à défaut sa
 * création. **Quand il n'en porte aucune, on le dit** — `derniereActivite`
 * rend une chaîne vide, et le sujet se range à la fin.
 *
 * Ce détail n'est pas une précaution de style. L'écran a déjà, pour afficher
 * « ouvert il y a trois jours », une lecture qui retombe sur *maintenant*
 * quand elle ne trouve rien : acceptable pour une phrase, désastreux pour un
 * tri, où un sujet sans date remonterait en tête comme s'il venait de bouger.
 * Ne pas savoir n'autorise pas à prétendre le contraire (règle 5).
 *
 * ## Ce que le tri ne fait pas
 *
 * Il ne filtre pas, il ne compte pas, il ne pagine pas. Il reçoit la liste
 * déjà filtrée et rend la même, dans un autre ordre : le nombre de sujets ne
 * change jamais en triant, et c'est ce qui permet au compteur et à la liste de
 * rester d'accord.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Les ordres possibles. `PROJET` est l'ordre d'origine, qu'on ne touche pas. */
export const TRI = {
  PROJET: "projet",
  DERNIERE_ACTIVITE: "derniere-activite",
  /**
   * Ce que ça coûte de ne pas trancher — étape 5 de
   * `docs/lobjet-de-la-connaissance.md`.
   *
   * L'ordre ne se calcule pas ici : il est **donné**. Ce fichier ne sait rien
   * des arêtes, du graphe des dépendances ni des engagements, et aller les
   * chercher en ferait un second endroit qui décide ce qu'un sujet bloque
   * (règle 4). Il reçoit des places, il range.
   */
  CE_QUE_CA_BLOQUE: "ce-que-ca-bloque"
};

/**
 * Les ordres qu'un écran propose, et pourquoi ils ne sont pas les mêmes partout.
 *
 * **Ce que ça coûte de ne pas trancher ne se propose que dans un projet.** Le
 * calcul lit la mémoire de ce projet-là, son graphe de dépendances et ses
 * engagements ; l'offrir sur un écran qui traverse quarante projets ferait
 * quarante fois cinq lectures pour ranger une page. Un bouton qui promet un
 * rangement qu'il ne peut pas tenir est pire que pas de bouton.
 *
 * Les valeurs, elles, se reconnaissent partout : un ordre retenu dans un projet
 * ne doit pas devenir illisible parce qu'on a ouvert un autre écran.
 */
export const ORDRES = [TRI.DERNIERE_ACTIVITE, TRI.PROJET];

/** Dans un projet : ce qui a bougé, ce qui coûte cher à laisser ouvert, l'arrivée. */
export const ORDRES_DU_PROJET = [TRI.DERNIERE_ACTIVITE, TRI.CE_QUE_CA_BLOQUE, TRI.PROJET];

const TOUS = Object.values(TRI);

/** Le cycle demandé, ramené à ce qui existe — jamais vide. */
function cycle(ordres) {
  const lus = (Array.isArray(ordres) ? ordres : []).filter((ordre) => TOUS.includes(ordre));
  return lus.length ? lus : ORDRES;
}

/**
 * Un ordre lu depuis l'état, ramené à ce qui existe.
 *
 * ## Le défaut est la dernière activité
 *
 * La liste s'ouvrait dans l'ordre du projet — celui des identifiants, qui est
 * l'ordre d'arrivée — et le plus récent se trouvait donc tout en bas, après
 * quatre-vingt-treize lignes. Or la question qu'on se pose en ouvrant l'écran
 * est toujours la même : **qu'est-ce qui a bougé ?** Y répondre demandait de
 * dérouler, ou de cliquer un bouton qu'on ne voyait pas.
 *
 * L'ordre du projet reste accessible d'un clic ; il n'est simplement plus celui
 * par lequel on commence. `PROJET` porte pour cela une valeur à lui : un ordre
 * choisi et un ordre jamais choisi ne se distinguaient pas quand le premier
 * valait la chaîne vide.
 */
export function normaliserLeTri(tri) {
  const dit = texte(tri);
  return TOUS.includes(dit) ? dit : TRI.DERNIERE_ACTIVITE;
}

/**
 * Le bouton fait tourner les ordres, dans le même sens, toujours.
 *
 * Dans un projet il en fait tourner trois : ce qui a bougé, ce qui coûte cher à
 * laisser ouvert, puis l'ordre d'arrivée. Un troisième bouton aurait demandé une
 * place et une icône de plus pour la même question — « comment veux-tu que je
 * range ? » — posée une fois.
 *
 * Un ordre que cet écran ne propose pas n'est pas une erreur : on repart du
 * premier qu'il propose, plutôt que de rester coincé sur un rangement que le
 * bouton ne sait pas défaire.
 *
 * @param {string} tri
 * @param {string[]} [ordres] ce que cet écran-là propose
 */
export function triSuivant(tri, ordres = ORDRES) {
  const offerts = cycle(ordres);
  // Un ordre absent du cycle rend `-1`, et `(-1 + 1) % n` vaut `0` : on repart
  // du premier que l'écran propose. Rien à écrire pour ce cas — l'écrire en
  // plus aurait fait une branche que rien ne peut faire tomber.
  const place = offerts.indexOf(normaliserLeTri(tri));
  return offerts[(place + 1) % offerts.length];
}

/**
 * Ce que dit l'info-bulle du bouton.
 *
 * Elle annonce **ce que le clic va faire**, pas l'état courant : un bouton qui
 * dit « trié par dernière activité » alors qu'il va défaire ce tri se lit à
 * l'envers une fois sur deux.
 *
 * ## Pourquoi l'ordre d'origine se nomme
 *
 * `TRI.PROJET` est l'ordre d'arrivée des lignes. Dans un projet, c'est bien
 * « l'ordre du projet ». Sur un écran qui traverse les projets, la même phrase
 * promettrait un rangement par projet — que le bouton ne fait pas. L'appelant
 * dit donc comment s'appelle, chez lui, l'ordre auquel on revient.
 *
 * @param {string} tri
 * @param {string} [ordreDorigine] le nom de l'ordre d'origine, tel qu'il se dit
 *   sur cet écran-là
 */
export function motDuTri(tri, ordreDorigine = "l'ordre du projet", { ordres = ORDRES } = {}) {
  const suivant = triSuivant(tri, ordres);
  if (suivant === TRI.DERNIERE_ACTIVITE) return "Trier par dernière activité";
  if (suivant === TRI.CE_QUE_CA_BLOQUE) return "Trier par ce que ça coûte de ne pas trancher";
  return `Revenir à ${String(ordreDorigine || "l'ordre du projet")}`;
}

/**
 * La date de la dernière activité d'un sujet, ou rien.
 *
 * @param {object} sujet
 * @returns {string} une date telle que le sujet la porte, ou `""` quand il
 *   n'en porte aucune — jamais la date du jour.
 */
export function derniereActivite(sujet = null) {
  if (!sujet) return "";

  const candidats = [
    sujet.updated_at, sujet.updatedAt,
    sujet.raw?.updated_at, sujet.raw?.updatedAt,
    sujet.created_at, sujet.createdAt,
    sujet.raw?.created_at, sujet.raw?.createdAt
  ];

  for (const candidat of candidats) {
    const dit = texte(candidat);
    if (dit) return dit;
  }

  return "";
}

/** La date en nombre, ou `null` quand elle est absente ou illisible. */
function instant(sujet) {
  const dit = derniereActivite(sujet);
  if (!dit) return null;
  const lu = Date.parse(dit);
  return Number.isFinite(lu) ? lu : null;
}

/**
 * Les sujets, rangés.
 *
 * La liste d'origine n'est jamais modifiée : elle est aussi celle que comptent
 * les compteurs, et un tri en place les ferait compter dans un ordre qu'ils
 * n'ont pas demandé.
 *
 * Les sujets sans date **restent derrière**, dans leur ordre d'origine — le tri
 * de JavaScript est stable, ce qui suffit à le garantir. Les mettre en tête
 * reviendrait à dire qu'ils viennent de bouger ; les entremêler reviendrait à
 * leur inventer une place.
 *
 * @param {object[]} sujets déjà filtrés
 * @param {string} [tri] une valeur de `TRI`
 * @param {object} [options]
 * @param {Map<string, number>} [options.ordre] pour `CE_QUE_CA_BLOQUE` : la
 *   place de chaque sujet, telle qu'`ordreDesPointsOuverts` l'a calculée
 * @returns {object[]} une nouvelle liste, de même longueur
 */
export function trierLesSujets(sujets = [], tri = TRI.PROJET, { ordre = null } = {}) {
  const lus = Array.isArray(sujets) ? sujets : [];
  const demande = normaliserLeTri(tri);

  if (demande === TRI.CE_QUE_CA_BLOQUE) return parCeQueCaBloque(lus, ordre);
  if (demande !== TRI.DERNIERE_ACTIVITE) return lus.slice();

  return lus.slice().sort((gauche, droite) => {
    const a = instant(gauche);
    const b = instant(droite);
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return b - a;
  });
}

/**
 * Les sujets, rangés par ce que ça coûte de ne pas les trancher.
 *
 * ## Tant qu'on ne sait pas, on ne range pas
 *
 * Les places viennent de trois lectures en base. Tant qu'elles ne sont pas
 * revenues, la liste reste dans l'ordre où elle est arrivée : la retourner
 * d'abord, puis la retourner encore, ferait sauter les lignes sous les yeux de
 * quelqu'un qui vient de cliquer. Et ranger au hasard en attendant serait
 * affirmer un ordre qu'on n'a pas (règle 5).
 *
 * ## Un sujet fermé n'a pas de place ici
 *
 * `ordreDesPointsOuverts` ne range que les ouverts, et c'est voulu : ce qu'il
 * en coûte de ne pas trancher un sujet déjà tranché ne veut rien dire. Les
 * fermés restent donc derrière, dans leur ordre d'origine — le tri de
 * JavaScript est stable, ce qui suffit à le garantir.
 */
function parCeQueCaBloque(sujets, ordre) {
  if (!(ordre instanceof Map)) return sujets.slice();

  const place = (sujet) => {
    const lue = ordre.get(texte(sujet?.id));
    return Number.isFinite(lue) ? lue : Number.POSITIVE_INFINITY;
  };

  return sujets.slice().sort((gauche, droite) => place(gauche) - place(droite));
}
