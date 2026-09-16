/**
 * Les champs interrogeables d'une proposition, et le filtre qu'ils décrivent.
 *
 * ## Pourquoi une grammaire, et pourquoi la même
 *
 * L'écran des propositions n'avait qu'un champ de texte libre et deux onglets.
 * On y cherchait « celles que j'ai ouvertes sur Chamonix » en ouvrant les deux
 * onglets et en lisant les lignes une par une.
 *
 * `query-bar.js` a été écrit sans connaître aucun écran, précisément pour
 * servir ici : le miroir coloré, les jetons, les menus qui posent une valeur.
 * **On ne le duplique pas** — une seconde barre de recherche aurait sa propre
 * grammaire, et deux grammaires se ressemblent assez pour qu'on ne remarque
 * leurs différences qu'en se trompant.
 *
 * ## Ce qu'une proposition porte, et rien d'autre
 *
 * Une proposition n'a **ni label, ni assigné, ni objectif, ni jalon**. Les
 * déclarer ferait proposer des filtres qui ne retiendraient jamais rien, et
 * l'on chercherait ce qu'on a mal tapé plutôt que ce qui n'existe pas. Ce qui
 * reste vient des colonnes de la table :
 *
 *   - son **état** — ouverte, fusionnée, refusée ;
 *   - qui l'a **ouverte** (`created_by`) ;
 *   - qui l'a **tranchée** (`merged_by`, `closed_by`) ;
 *   - a-t-elle des **documents** — la première question qu'on se pose devant
 *     une proposition : y a-t-il quelque chose dedans ;
 *   - son **projet**, là où l'écran en traverse plusieurs.
 *
 * ## Rien n'est deviné
 *
 * Un jeton n'est un filtre que si son champ est déclaré et sa valeur connue.
 * `auteur:zoiseau` reste du texte ordinaire, et cherche donc le mot.
 */

import { filterValues, parseQuery, toggleFilter, withFilter } from "./query-bar.js";
import { PROPOSITION } from "./proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();
const repli = (valeur) => texte(valeur).toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Ce qui s'écrit dans la barre : accentué, mais sans espace. */
const jeton = (valeur) => texte(valeur).replace(/\s+/g, "-").toLowerCase();

/**
 * Les trois états, et leurs noms dans la barre.
 *
 * `ouverte`/`fusionnée`/`refusée` plutôt que `open`/`merged`/`closed` : on tape
 * ce qu'on lit, et l'écran est en français. La valeur interne reste celle de la
 * base.
 *
 * **Trois, et non deux.** Le filtre de l'en-tête coupe en « ouvertes » et
 * « closes » parce que la question qu'on pose devant la liste est « qu'est-ce
 * qui attend encore une décision ? ». Mais fusionnée et refusée ne sont pas la
 * même chose — l'une est entrée au corpus, l'autre non —, et la barre sait
 * dire laquelle.
 */
export const ETATS = [
  { value: PROPOSITION.OPEN, token: "ouverte", label: "Ouvertes" },
  { value: PROPOSITION.MERGED, token: "fusionnée", label: "Fusionnées" },
  { value: PROPOSITION.CLOSED, token: "refusée", label: "Refusées" }
];

/** Les états qui ne sont plus une question : quelqu'un a décidé. */
export const ETATS_CLOS = [PROPOSITION.MERGED, PROPOSITION.CLOSED];

/**
 * Y a-t-il quelque chose dedans ?
 *
 * Une proposition sans document est une coquille : elle existe, elle attend, et
 * il n'y a rien à lire. C'est la première chose qu'on veut écarter — ou
 * retrouver, pour la refermer.
 */
export const DOCUMENTS = [
  { value: "avec", token: "oui", label: "Avec des documents" },
  { value: "sans", token: "non", label: "Sans document" }
];

/** La valeur qui désigne « celui qui regarde ». Celle de la grammaire des sujets. */
export const MOI = "@moi";

/**
 * Les champs qu'une barre peut reconnaître, montés depuis ce qu'on sait.
 *
 * Le vocabulaire est **donné** : les gens, les projets. Sans lui, le champ
 * n'est pas déclaré du tout, et son jeton reste du texte. Déclarer un champ
 * sans valeurs ferait proposer un filtre qui ne filtre rien.
 *
 * @param {object} vocabulaire
 * @param {{id: string, name: string}[]} [vocabulaire.personnes]
 * @param {{id: string, name: string}[]} [vocabulaire.projets]
 * @returns {object[]} des `QueryField` de `query-bar.js`
 */
export function champsDesPropositions({ personnes = [], projets = [] } = {}) {
  const champs = [
    // **À choix multiple.** « Closes » en pose deux d'un coup — fusionnées ou
    // refusées —, et c'est bien « ou » qu'on demande. Le statut d'un sujet,
    // lui, reste à choix simple : un sujet n'est ni ouvert ni fermé à la fois,
    // et il n'a que deux états.
    { key: "statut", label: "Statut", values: ETATS, multiple: true },
    { key: "documents", label: "Documents", values: DOCUMENTS }
  ];

  const nommes = (entrees, id, nom) => (Array.isArray(entrees) ? entrees : [])
    .map((entree) => ({
      value: texte(entree?.[id]),
      token: jeton(entree?.[nom]),
      label: texte(entree?.[nom]) || texte(entree?.[id])
    }))
    .filter((valeur) => valeur.value && valeur.label);

  const desPersonnes = nommes(personnes, "id", "name");
  if (desPersonnes.length > 0) {
    // `@moi` en tête : c'est la lecture la plus fréquente, et la seule qui ne
    // dépende pas de savoir comment on s'appelle dans ce projet. `seule` la
    // réserve — quelqu'un peut s'appeler « Moi », et le jeton irait sur lui.
    const avecMoi = [
      { value: MOI, token: "moi", label: "Moi", seule: true }, ...desPersonnes
    ];

    // **Qui l'a ouverte.** Une seule personne : `created_by` est une colonne,
    // pas une liste, et proposer d'en cocher deux ferait croire le contraire.
    champs.push({ key: "auteur", label: "Auteur", values: avecMoi });

    // **Qui a tranché.** C'est la question d'après : une proposition close l'a
    // été par quelqu'un, et « qui a fusionné ça ? » se pose une fois par
    // semaine. Elle reste sans réponse sur une proposition ouverte, ce qui est
    // la bonne réponse — personne, pas encore.
    champs.push({ key: "décideur", label: "Décidée par", values: avecMoi });
  }

  // **Sur quel projet.** Le champ ne se déclare que là où il y a plusieurs
  // projets à distinguer : sur l'écran d'un seul, il n'aurait qu'une valeur et
  // ne retirerait jamais rien.
  const desProjets = nommes(projets, "id", "name");
  if (desProjets.length > 1) {
    champs.push({ key: "projet", label: "Projets", values: desProjets, multiple: true });
  }

  return champs;
}

/** Une liste de chaînes, quelle que soit la forme sous laquelle elle arrive. */
function listeDe(valeur) {
  if (Array.isArray(valeur)) return valeur.map(texte).filter(Boolean);
  const dit = texte(valeur);
  return dit ? [dit] : [];
}

/** Qui a tranché cette proposition, ou rien tant que personne ne l'a fait. */
function quiATranche(proposition) {
  return texte(proposition?.merged_by) || texte(proposition?.closed_by);
}

/**
 * Les propositions que cette requête retient.
 *
 * **Le texte libre cherche dans le titre et dans le nom du projet.** Pas dans
 * la description : une recherche qui remonte une ligne dont le titre ne
 * contient pas le mot cherché se lit comme une erreur, et l'on ne voit pas où
 * le mot se cache. Le projet, lui, est à l'écran sur la ligne — « toutes celles
 * de Chamonix » est une question qu'on pose.
 *
 * @param {object} options
 * @param {object[]} options.propositions
 * @param {string} options.requete ce qui est écrit dans la barre
 * @param {object[]} options.champs ceux de `champsDesPropositions`
 * @param {string|string[]} [options.moi] qui regarde, **en identifiants de
 *   compte**. Plusieurs n'a pas de sens ici — une proposition porte un
 *   `user_id` —, mais la forme reste celle de la grammaire des sujets.
 * @param {object} [options.nomsDesProjets] pour que le texte libre les trouve
 * @returns {{propositions: object[], filtres: object, texte: string,
 *   ignores: string[], inconnus: object[]}}
 */
export function propositionsFiltrees({
  propositions = [], requete = "", champs = [], moi = "", nomsDesProjets = {}
} = {}) {
  const toutes = Array.isArray(propositions) ? propositions : [];
  const miennes = listeDe(moi);
  const noms = nomsDesProjets && typeof nomsDesProjets === "object" ? nomsDesProjets : {};
  const { filters, text, inconnus } = parseQuery(requete, champs);

  const mots = repli(text).split(/\s+/).filter(Boolean);
  // Un filtre qu'on ne peut pas appliquer est **annoncé**, pas appliqué de
  // travers : `auteur:moi` sans savoir qui regarde rendrait une liste vide, et
  // l'on croirait n'avoir aucune proposition.
  const ignores = [];

  const retenues = toutes.filter((proposition) => {
    const etats = filterValues(filters, "statut");
    if (etats.length && !etats.includes(texte(proposition?.status) || PROPOSITION.OPEN)) return false;

    const projets = filterValues(filters, "projet");
    if (projets.length && !projets.includes(texte(proposition?.project_id))) return false;

    const documents = filters.documents;
    if (documents) {
      const combien = Number(proposition?.documentCount) || 0;
      if (documents === "avec" && combien === 0) return false;
      if (documents === "sans" && combien > 0) return false;
    }

    // Les deux champs qui peuvent désigner « moi » : sans savoir qui regarde,
    // ils sont annoncés et non appliqués.
    for (const [cle, sien] of [
      ["auteur", texte(proposition?.created_by)],
      ["décideur", quiATranche(proposition)]
    ]) {
      const cochees = filterValues(filters, cle);
      if (cochees.length === 0) continue;

      const cherchees = [];
      for (const cochee of cochees) {
        if (cochee !== MOI) { cherchees.push(cochee); continue; }
        if (miennes.length) cherchees.push(...miennes);
        else if (!ignores.includes(cle)) ignores.push(cle);
      }

      if (cherchees.length === 0) continue;
      if (!sien || !cherchees.includes(sien)) return false;
    }

    if (mots.length === 0) return true;
    const dit = repli(`${texte(proposition?.title)} ${noms[texte(proposition?.project_id)] ?? ""}`);
    return mots.every((mot) => dit.includes(mot));
  });

  // Ce qu'un champ déclaré n'a pas reconnu remonte tel quel : une liste vide ne
  // distingue pas « ce filtre ne retient rien » de « j'ai mal tapé ».
  return { propositions: retenues, filtres: filters, texte: text, ignores, inconnus };
}

/**
 * L'état que la requête regarde, tel que le filtre de l'en-tête le nomme.
 *
 * ## Deux boutons pour trois valeurs
 *
 * L'en-tête coupe en « ouvertes » et « closes » — la question qu'on pose devant
 * la liste est « qu'est-ce qui attend encore une décision ? ». La barre, elle,
 * distingue fusionnée et refusée. Un jeton que les deux boutons ne savent pas
 * dire — `statut:fusionnée` seul — n'allume donc **aucun** des deux : allumer
 * « Closes » ferait croire qu'on voit aussi les refusées, et c'est faux.
 *
 * @returns {"" | "open" | "closed"}
 */
export function etatRegarde(requete = "", champs = []) {
  const posees = filterValues(parseQuery(requete, champs).filters, "statut");
  if (posees.length === 1 && posees[0] === PROPOSITION.OPEN) return "open";
  if (posees.length === ETATS_CLOS.length && ETATS_CLOS.every((etat) => posees.includes(etat))) {
    return "closed";
  }
  return "";
}

/**
 * La requête que produirait un clic sur « Ouvertes » ou « Closes ».
 *
 * **Recliquer celui qui est allumé l'éteint** : on revient à la liste entière,
 * qui est l'état d'où l'on part. Sans cela, une fois le premier clic donné, il
 * n'y avait plus aucun moyen de revoir les deux — sauf à effacer les jetons à
 * la main dans la barre.
 *
 * Elle vit ici, avec la grammaire : l'écran n'a pas à savoir que « closes »
 * s'écrit avec deux jetons.
 */
export function requeteAvecLEtat(requete = "", champs = [], demande = "") {
  const voulu = texte(demande).toLowerCase() === "closed" ? "closed" : "open";
  const nette = withFilter(requete, champs, "statut", "");
  if (etatRegarde(requete, champs) === voulu) return nette;
  if (voulu === "open") return withFilter(nette, champs, "statut", PROPOSITION.OPEN);

  // « Closes » en pose deux : fusionnées **ou** refusées. `toggleFilter` les
  // ajoute l'une après l'autre, parce que le champ se coche à plusieurs.
  return ETATS_CLOS.reduce(
    (dite, etat) => toggleFilter(dite, champs, "statut", etat), nette
  );
}

/**
 * La requête de départ : les propositions ouvertes.
 *
 * **Elle est écrite dans la barre**, et c'est tout le point : `statut:ouverte`
 * s'y lit, s'y sélectionne et s'y efface. Un filtre par défaut qu'on ne voit
 * nulle part est un écran qui ment sur ce qu'il montre.
 *
 * Elle vient de la grammaire, elle n'est pas recopiée : poser la chaîne à la
 * main ferait un second endroit où le jeton s'orthographie, et le jour où
 * `ETATS` le renomme, le défaut cesserait silencieusement de filtrer (règle 10).
 */
export function requeteDeDepartDesPropositions() {
  return withFilter("", champsDesPropositions(), "statut", PROPOSITION.OPEN);
}
