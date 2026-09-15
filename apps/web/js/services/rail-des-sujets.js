/**
 * Le rail de l'écran des sujets : des lectures toutes faites, et leurs comptes.
 *
 * ## Une lecture est une requête, pas un écran
 *
 * « Mes sujets », « Bloqués », « Venus des comptes rendus » ne sont pas des
 * modes : ce sont des **requêtes toutes faites** que le rail écrit dans la
 * barre. La barre reste modifiable, et c'est tout l'intérêt — on part de « Mes
 * sujets » et l'on ajoute `lot:03` sans rien apprendre de nouveau.
 *
 * ## Elle se déduit, elle ne se retient pas
 *
 * Aucune case ne dit quelle lecture est active : on la **reconnaît** dans la
 * requête. Ajouter un filtre à la main fait donc rebasculer le rail sur « Tous »
 * sans que personne ait à y penser, et le filtrage en cours reste intact. Une
 * case retenue à côté de la requête finirait par la contredire, et l'on ne
 * saurait plus laquelle commande (règle 4).
 *
 * ## Les comptes sont ceux qu'on obtiendra
 *
 * Chaque lecture affiche le nombre de sujets qu'elle rendra — calculé en
 * appliquant sa requête, pas estimé autrement. Un compte qui diffère de ce
 * qu'on voit après avoir cliqué est pire qu'aucun compte.
 *
 * Rien ici n'appelle quoi que ce soit : des sujets et un vocabulaire entrent,
 * des lectures avec leurs comptes sortent.
 */

import { filterValues, formatQuery, parseQuery } from "./query-bar.js";
import { MOI, sujetsFiltres } from "./champs-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

export const LECTURE = {
  TOUS: "tous",
  MIENS: "miens",
  CREES: "crees",
  MENTIONS: "mentions",
  RECENTS: "recents"
};

/**
 * Ce que chaque lecture veut dire, en filtres.
 *
 * `null` en valeur signifie « ce champ, avec le label du compte rendu » : il
 * n'est connu qu'à l'exécution, puisque la clé du label dépend du projet.
 */
const FILTRES_DE_LA_LECTURE = {
  [LECTURE.TOUS]: {},
  [LECTURE.MIENS]: { "assigné": MOI },
  [LECTURE.CREES]: { auteur: MOI },
  [LECTURE.MENTIONS]: { mention: MOI },
  [LECTURE.RECENTS]: { activité: "recente" }
};

export const NOMS_DE_LA_LECTURE = {
  // « Sujets », et non « Tous les sujets » : c'est l'écran, pas un filtre de
  // plus. Le rail nomme des endroits ; le premier est celui d'où l'on part.
  [LECTURE.TOUS]: "Sujets",
  [LECTURE.MIENS]: "Assigné à moi",
  [LECTURE.CREES]: "Créé par moi",
  [LECTURE.MENTIONS]: "Mentions",
  [LECTURE.RECENTS]: "Activité récente"
};

/**
 * Le titre que porte l'écran d'une lecture.
 *
 * ## Pourquoi ce n'est pas le nom du rail
 *
 * Le rail nomme des **endroits** : « Sujets » est celui d'où l'on part, et le
 * mettre au long y ferait une entrée plus large que les autres pour ne rien
 * dire de plus. Au-dessus du tableau, la question n'est pas où l'on est mais
 * **ce qu'on regarde** : « Sujets » y répondrait par le nom de l'onglet, qui
 * est déjà écrit deux fois plus haut. « Tous les sujets » dit la chose.
 *
 * Les quatre autres se nomment pareil des deux côtés : elles disent déjà ce
 * qu'elles retiennent.
 */
export const NOMS_DE_LECRAN = {
  ...NOMS_DE_LA_LECTURE,
  [LECTURE.TOUS]: "Tous les sujets"
};

/**
 * Ce qu'on écrit au-dessus du tableau, quand ce n'est pas une vue.
 *
 * **Une requête quelconque n'est pas « tous les sujets ».** `lectureDe` retombe
 * sur `TOUS` pour tout ce qu'elle ne reconnaît pas — c'est le bon défaut pour
 * allumer une entrée du rail, et le mauvais pour titrer un écran : une liste
 * filtrée par `label:cr-chantier` s'annoncerait comme la liste entière. On
 * distingue donc les deux, et l'inconnu se dit sobrement.
 */
export const TITRE_QUELCONQUE = "Sujets";

export function titreDeLaListe({ requete = "", champs = [] } = {}) {
  // **La même décision que pour allumer le rail**, et elle n'est écrite qu'une
  // fois : deux façons de répondre à « quelle lecture regarde-t-on ? »
  // finiraient par ne plus s'accorder, et l'on aurait un titre qui dit une
  // chose et une entrée allumée qui en dit une autre (règle 4).
  const lecture = lectureQuOnRegarde(requete, champs);
  return lecture ? NOMS_DE_LECRAN[lecture] : TITRE_QUELCONQUE;
}

/**
 * Les lectures du rail, réduites à ce qui les identifie : leur nom et leur
 * requête.
 *
 * **De quoi refuser une vue qui en serait le double.** Enregistrer une vue sur
 * `mention:moi` fabrique une seconde entrée qui fait exactement ce que
 * « Mentions » fait déjà — et l'écran, qui reconnaît une vue à sa requête,
 * affichait ensuite le nom de la vue quand on cliquait « Mentions ».
 */
export function lecturesReservees(champs = []) {
  return Object.values(LECTURE).map((lecture) => ({
    cle: lecture,
    nom: NOMS_DE_LA_LECTURE[lecture],
    requete: requeteDeLaLecture(lecture, champs)
  }));
}

/**
 * L'icône de chaque lecture, **dans le jeu de la maison**.
 *
 * Aucune n'est dessinée ici : elles vivent dans `assets/icons.svg`, et en
 * inventer une pour cet écran ferait une icône que nul autre ne peut employer.
 */
export const ICONES_DE_LA_LECTURE = {
  [LECTURE.TOUS]: "issue-opened",
  [LECTURE.MIENS]: "people",
  [LECTURE.CREES]: "smiley",
  [LECTURE.MENTIONS]: "mention",
  [LECTURE.RECENTS]: "clock-fill"
};

/**
 * Les filtres d'une lecture, une fois le vocabulaire du projet connu.
 * `null` quand elle ne s'applique pas à ce projet.
 *
 * ## Tout ou rien
 *
 * **Un filtre dont le champ n'est pas déclaré disparaît silencieusement** de la
 * requête écrite : `formatQuery` ne sait pas l'écrire, et n'écrit rien. « Les
 * miens » sur un projet sans collaborateur devenait donc `statut:ouvert` — le
 * même que « Ouverts », deux lignes dans le rail pour la même chose, dont l'une
 * ment sur ce qu'elle montre.
 *
 * Une lecture n'est donc proposée que si **chacun** de ses filtres a un champ
 * déclaré. Ce défaut a été trouvé par le test qui compare le compte annoncé au
 * compte obtenu.
 */
function filtresDe(lecture, champs = []) {
  const bruts = FILTRES_DE_LA_LECTURE[lecture] ?? {};
  const declares = new Set((Array.isArray(champs) ? champs : []).map((champ) => texte(champ?.key)));
  const filtres = {};

  for (const cle of Object.keys(bruts)) {
    if (!declares.has(cle)) return null;
    filtres[cle] = bruts[cle];
  }

  return filtres;
}

/**
 * La requête d'une lecture, écrite comme la barre l'écrirait. `""` si la
 * lecture ne s'applique pas à ce projet.
 */
export function requeteDeLaLecture(lecture, champs = []) {
  const filtres = filtresDe(lecture, champs);
  if (!filtres) return "";
  return formatQuery({ filters: filtres, text: "" }, champs);
}

/**
 * La lecture que cette requête représente, ou « Tous ».
 *
 * Le **texte libre compte** : « Les miens » plus le mot « étanchéité » n'est
 * plus « Les miens ». Allumer quand même la lecture ferait croire qu'on voit
 * tous ses sujets alors qu'on n'en voit qu'une partie.
 */
export function lectureDe(requete = "", champs = []) {
  const { filters, text } = parseQuery(requete, champs);
  if (texte(text)) return LECTURE.TOUS;

  const cles = Object.keys(filters).sort();

  for (const lecture of Object.values(LECTURE)) {
    const attendus = filtresDe(lecture, champs);
    if (!attendus) continue;

    const voulues = Object.keys(attendus).sort();
    if (voulues.length !== cles.length) continue;
    // Un champ à choix multiple porte un tableau ; `filterValues` le lit comme
    // le reste du code, et une lecture n'est la sienne que si elle pose
    // **exactement** sa valeur — cocher un second label la quitte.
    if (voulues.every((cle) => {
      const posees = filterValues(filters, cle);
      return posees.length === 1 && posees[0] === attendus[cle];
    })) return lecture;
  }

  return LECTURE.TOUS;
}

/**
 * La lecture qu'on regarde — ou `""` quand ce n'en est aucune.
 *
 * ## Pourquoi ce n'est pas `lectureDe`
 *
 * `lectureDe` retombe sur « tous » pour tout ce qu'elle ne reconnaît pas : elle
 * répond « laquelle, au plus près », ce qui convient pour poser une requête.
 * Pour **allumer** une entrée, c'est faux — et visiblement faux : on regarde une
 * vue, on tape `label:sensible` à la main, et « Sujets » s'allume comme si l'on
 * voyait la liste entière alors qu'on en voit deux lignes. L'entrée allumée dit
 * alors où l'on est, et se trompe (règle 5).
 *
 * Aucune allumée est une réponse : on est ailleurs, dans quelque chose que le
 * rail ne nomme pas.
 */
export function lectureQuOnRegarde(requete = "", champs = []) {
  const dite = texte(requete);
  if (!dite) return LECTURE.TOUS;

  const lecture = lectureDe(dite, champs);
  return lecture === LECTURE.TOUS ? "" : lecture;
}

/**
 * Le rail, prêt à dessiner : chaque lecture, sa requête, son compte, et si elle
 * est celle qu'on regarde.
 *
 * **Le compte est `null` quand on ne peut pas le calculer** — une lecture qui
 * demande de savoir qui regarde, sans le savoir. Zéro serait un mensonge
 * (règle 5).
 *
 * @param {object} options
 * @param {object[]} options.sujets tous les sujets du projet
 * @param {object[]} options.champs ceux de `champsDesSujets`
 * @param {string} options.requete ce qui est dans la barre
 * @param {Record<string, object>} [options.meta]
 * @param {string} [options.moi]
 * @param {string} [options.labelDuCr] la clé du label « CR chantier », s'il existe
 */
export function railDesSujets({
  sujets = [], champs = [], requete = "", meta = {}, moi = "", maintenant = Date.now(),
  /**
   * Le nom de l'endroit d'où l'on part, quand ce n'est pas « Sujets ».
   *
   * **Le rail nomme des endroits**, et l'endroit d'où l'on part n'est pas le
   * même selon l'écran : sur l'onglet Sujets d'un projet on part de ses sujets,
   * dans le carnet on part de **la liste de ses situations**. Le reste ne
   * bouge pas — « Assigné à moi » désigne les mêmes sujets des deux côtés.
   *
   * Il se donne plutôt qu'il ne se devine : un rail qui lirait l'écran courant
   * pour choisir son premier mot serait un rail qui connaît les écrans.
   */
  nomDuDepart = ""
} = {}) {
  const active = lectureQuOnRegarde(requete, champs);

  const lectures = Object.values(LECTURE).map((lecture) => {
    // **Une seule vérification, et c'est `filtresDe` qui la porte.** Une
    // lecture dont un champ n'est pas déclaré ne se propose pas : sans
    // collaborateur dans le projet, « Assigné à moi » perdrait son filtre en
    // silence et deviendrait « Tous ».
    //
    // Un second garde-fou existait ici — « requête vide, donc on écarte » — et
    // il disait la même chose plus mal : il aurait aussi écarté une lecture
    // légitimement sans filtre. Deux expressions d'une même règle divergent à
    // la première qui bouge (règle 4).
    if (!filtresDe(lecture, champs)) return null;
    const laRequete = requeteDeLaLecture(lecture, champs);

    const { sujets: retenus, ignores } = sujetsFiltres({
      sujets, requete: laRequete, champs, meta, moi, maintenant
    });

    return {
      cle: lecture,
      nom: (lecture === LECTURE.TOUS && texte(nomDuDepart)) || NOMS_DE_LA_LECTURE[lecture],
      icone: ICONES_DE_LA_LECTURE[lecture],
      requete: laRequete,
      combien: ignores.length > 0 ? null : retenus.length,
      active: lecture === active
    };
  }).filter(Boolean);

  return { lectures, active };
}

/**
 * Ce qu'une lecture du rail change à l'écran.
 *
 * ## Le défaut que ça répare
 *
 * Le rail reste affiché sur les Labels, les Objectifs et les Vues — c'est
 * voulu : ce sont des écrans du même domaine, et le faire disparaître au moment
 * où l'on y arrive oblige à revenir en arrière pour en sortir. Mais la requête
 * qu'on y cliquait ne s'appliquait qu'à un tableau **qu'on ne voyait pas** : on
 * cliquait « Sujets », l'écran des Labels restait, et rien ne disait pourquoi.
 * Il ne restait qu'à recharger la page.
 *
 * **Poser une lecture depuis le rail, c'est donc revenir à la liste.** C'est le
 * sens du geste : on ne clique pas « Assigné à moi » pour rester sur les
 * Labels. Le formulaire d'une vue se ferme avec le reste — il tient le tableau
 * sous lui, et l'écrasement de sa requête par celle qu'on vient de cliquer
 * ferait enregistrer une vue qui ne retient pas ce qu'on y avait écrit.
 *
 * ## Et le défaut que celui-là avait créé
 *
 * Les menus de filtre de l'en-tête posent leur valeur **par le même geste** :
 * cocher « CR chantier » écrit `label:cr-chantier` dans la requête. Traité
 * comme une lecture du rail, il refermait le formulaire qu'on était en train de
 * remplir et renvoyait à la liste de tous les sujets — au moment précis où l'on
 * composait la requête de sa vue, c'est-à-dire là où ces menus servent le plus.
 *
 * Les deux gestes ne disent donc pas la même chose : **le rail change d'écran,
 * l'en-tête précise la requête en cours**. C'est d'où vient le clic qui les
 * sépare, et rien d'autre — la valeur posée est la même.
 *
 * @param {object} options
 * @param {string} options.requete la requête à poser
 * @param {"rail"|"tableau"} [options.depuis] d'où vient le clic
 * @param {string} [options.sousVue] celle qu'on regarde — elle ne sert que
 *   pour rester dessus
 * @param {boolean} [options.formeOuverte] un formulaire de vue est ouvert
 */
export function ecranApresUneLecture({
  requete = "", depuis = "rail", sousVue = "subjects", formeOuverte = false
} = {}) {
  const laRequete = texte(requete);

  // Un filtre posé sous un formulaire de vue **reste dans le formulaire** : le
  // tableau qu'il tient dessous montre ce que la requête rend, et c'est
  // exactement ce qu'on regarde en la composant.
  if (depuis !== "rail" && formeOuverte) {
    return {
      requete: laRequete,
      sousVue: texte(sousVue) || "subjects",
      tableauSeul: false,
      fermerLaForme: false
    };
  }

  return {
    requete: laRequete,
    sousVue: "subjects",
    tableauSeul: true,
    fermerLaForme: true
  };
}

/**
 * Une recherche épinglée, prête à dessiner.
 *
 * **Une seule forme en entrée** : celle que `recherche-epinglee.js` rend. On
 * acceptait ici aussi la graphie des colonnes de la base, et deviner une
 * graphie ne rate pas bruyamment — ça rend `undefined`, qui prend la valeur de
 * repli. C'est ainsi que le nom d'une vue est devenu sa requête (règle 10).
 *
 * Elle porte son propre nom — ou sa requête, qui se lit et qu'on reconnaît — et
 * s'allume quand la barre porte exactement la sienne. **Exactement** : une
 * épingle qui s'allumerait sur une requête voisine ferait croire qu'on regarde
 * ce qu'on a épinglé alors qu'on regarde autre chose.
 */
export function epinglesDuRail(epingles = [], requete = "") {
  const courante = texte(requete);

  return (Array.isArray(epingles) ? epingles : [])
    // **Seules celles qu'on a épinglées.** Une vue enregistrée vit sur son
    // écran ; le rail est court, et toutes les y mettre revenait à faire payer
    // chaque enregistrement d'une place dans la barre de gauche.
    .filter((epingle) => epingle?.auRail === true)
    .map((epingle) => ({
      id: texte(epingle?.id),
      requete: texte(epingle?.requete),
      nom: texte(epingle?.titre) || texte(epingle?.requete),
      // De quoi la reconnaître d'un coup d'œil : c'est tout ce qu'une entrée de
      // rail large de deux cents pixels peut porter.
      icone: texte(epingle?.icone),
      couleur: texte(epingle?.couleur)
    }))
    .filter((epingle) => epingle.id && epingle.requete)
    .map((epingle) => ({ ...epingle, active: epingle.requete === courante }));
}
