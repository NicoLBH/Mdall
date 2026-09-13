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

import { formatQuery, parseQuery } from "./query-bar.js";
import { MOI, sujetsFiltres } from "./champs-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

export const LECTURE = {
  TOUS: "tous",
  OUVERTS: "ouverts",
  MIENS: "miens",
  BLOQUES: "bloques",
  DU_CR: "du_cr",
  SANS_LABEL: "sans_label",
  FERMES: "fermes"
};

/**
 * Ce que chaque lecture veut dire, en filtres.
 *
 * `null` en valeur signifie « ce champ, avec le label du compte rendu » : il
 * n'est connu qu'à l'exécution, puisque la clé du label dépend du projet.
 */
const FILTRES_DE_LA_LECTURE = {
  [LECTURE.TOUS]: {},
  [LECTURE.OUVERTS]: { statut: "open" },
  [LECTURE.MIENS]: { statut: "open", "assigné": MOI },
  [LECTURE.BLOQUES]: { statut: "open", "bloqué": "bloques" },
  [LECTURE.DU_CR]: { statut: "open", label: null },
  [LECTURE.SANS_LABEL]: { statut: "open", label: "aucun" },
  [LECTURE.FERMES]: { statut: "closed" }
};

export const NOMS_DE_LA_LECTURE = {
  [LECTURE.TOUS]: "Tous les sujets",
  [LECTURE.OUVERTS]: "Ouverts",
  [LECTURE.MIENS]: "Les miens",
  [LECTURE.BLOQUES]: "Bloqués",
  [LECTURE.DU_CR]: "Venus des comptes rendus",
  [LECTURE.SANS_LABEL]: "Sans label",
  [LECTURE.FERMES]: "Fermés"
};

/** L'icône de chaque lecture, dans le jeu de la maison. */
export const ICONES_DE_LA_LECTURE = {
  [LECTURE.TOUS]: "list-unordered",
  [LECTURE.OUVERTS]: "issue-opened",
  [LECTURE.MIENS]: "person",
  [LECTURE.BLOQUES]: "blocked",
  [LECTURE.DU_CR]: "file",
  [LECTURE.SANS_LABEL]: "tag",
  [LECTURE.FERMES]: "check-circle"
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
function filtresDe(lecture, champs = [], { labelDuCr = "" } = {}) {
  const bruts = FILTRES_DE_LA_LECTURE[lecture] ?? {};
  const declares = new Set((Array.isArray(champs) ? champs : []).map((champ) => texte(champ?.key)));
  const filtres = {};

  for (const [cle, valeur] of Object.entries(bruts)) {
    if (!declares.has(cle)) return null;

    if (valeur !== null) { filtres[cle] = valeur; continue; }
    // Le label du compte rendu n'existe pas dans tous les projets. Sans lui, la
    // lecture ne se propose pas du tout — proposer un filtre qui ne filtre rien
    // ferait chercher ce qu'on a mal tapé.
    if (!texte(labelDuCr)) return null;
    filtres[cle] = texte(labelDuCr);
  }

  return filtres;
}

/**
 * La requête d'une lecture, écrite comme la barre l'écrirait. `""` si la
 * lecture ne s'applique pas à ce projet.
 */
export function requeteDeLaLecture(lecture, champs = [], contexte = {}) {
  const filtres = filtresDe(lecture, champs, contexte);
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
export function lectureDe(requete = "", champs = [], contexte = {}) {
  const { filters, text } = parseQuery(requete, champs);
  if (texte(text)) return LECTURE.TOUS;

  const cles = Object.keys(filters).sort();

  for (const lecture of Object.values(LECTURE)) {
    const attendus = filtresDe(lecture, champs, contexte);
    if (!attendus) continue;

    const voulues = Object.keys(attendus).sort();
    if (voulues.length !== cles.length) continue;
    if (voulues.every((cle) => filters[cle] === attendus[cle])) return lecture;
  }

  return LECTURE.TOUS;
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
  sujets = [], champs = [], requete = "", meta = {}, moi = "", labelDuCr = ""
} = {}) {
  const contexte = { labelDuCr };
  const active = lectureDe(requete, champs, contexte);

  const lectures = Object.values(LECTURE).map((lecture) => {
    const laRequete = requeteDeLaLecture(lecture, champs, contexte);
    // Une lecture dont aucun champ n'est déclaré ne se propose pas : sans
    // labels dans le projet, « Sans label » n'a rien à dire.
    if (!laRequete && lecture !== LECTURE.TOUS) return null;

    const { sujets: retenus, ignores } = sujetsFiltres({
      sujets, requete: laRequete, champs, meta, moi
    });

    return {
      cle: lecture,
      nom: NOMS_DE_LA_LECTURE[lecture],
      icone: ICONES_DE_LA_LECTURE[lecture],
      requete: laRequete,
      combien: ignores.length > 0 ? null : retenus.length,
      active: lecture === active
    };
  }).filter(Boolean);

  return { lectures, active };
}

/**
 * Une recherche épinglée, prête à dessiner.
 *
 * Elle porte son propre nom — ou sa requête, qui se lit et qu'on reconnaît — et
 * s'allume quand la barre porte exactement la sienne. **Exactement** : une
 * épingle qui s'allumerait sur une requête voisine ferait croire qu'on regarde
 * ce qu'on a épinglé alors qu'on regarde autre chose.
 */
export function epinglesDuRail(epingles = [], requete = "") {
  const courante = texte(requete);

  return (Array.isArray(epingles) ? epingles : [])
    .map((epingle) => ({
      id: texte(epingle?.id),
      requete: texte(epingle?.query ?? epingle?.requete),
      nom: texte(epingle?.title ?? epingle?.titre) || texte(epingle?.query ?? epingle?.requete)
    }))
    .filter((epingle) => epingle.id && epingle.requete)
    .map((epingle) => ({ ...epingle, active: epingle.requete === courante }));
}
