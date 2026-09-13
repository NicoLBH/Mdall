/**
 * Les champs interrogeables d'un sujet, et le filtre qu'ils décrivent.
 *
 * ## Pourquoi la barre plutôt que six menus
 *
 * `label:"CR chantier" assigné:moi statut:ouvert étanchéité` — les filtres et
 * les mots vivent au même endroit, et cet endroit est le champ de saisie. On
 * lit ce qu'on regarde, on le corrige au clavier, on le copie, on le colle, on
 * l'épingle. Six menus obligent à les ouvrir tous les six pour savoir ce qu'on
 * regarde, et ne se copient pas.
 *
 * C'est le mécanisme de la Mémoire (`query-bar.js`), qui a été écrit sans
 * connaître aucun écran précisément pour servir ici. **On ne le duplique pas :
 * une seconde barre de recherche aurait sa propre grammaire, et deux grammaires
 * se ressemblent assez pour qu'on ne remarque leurs différences qu'en se
 * trompant.**
 *
 * ## Les menus de l'en-tête posent les mêmes filtres
 *
 * Cliquer « Ouverts » dans l'en-tête écrit `statut:ouvert` dans la barre. Il n'y
 * a donc **qu'un seul état filtrant** : la requête. Un menu qui tiendrait sa
 * propre case finirait par dire autre chose que la barre, et l'on ne saurait
 * plus laquelle commande (règle 4).
 *
 * ## Rien n'est deviné
 *
 * Un jeton n'est un filtre que si son champ est déclaré et sa valeur connue.
 * `label:zoiseau` reste du texte ordinaire, et cherche donc le mot « zoiseau ».
 * Interpréter au plus proche ferait disparaître des lignes sans que personne
 * comprenne pourquoi.
 *
 * ## Ce que ce module ne sait pas
 *
 * Il ne lit ni la base, ni le store. Le vocabulaire — les labels du projet, ses
 * objectifs, ses lots, ses collaborateurs — lui est **donné** ; sans lui, le
 * champ n'est pas déclaré du tout, et son jeton reste du texte. Déclarer un
 * champ sans valeurs ferait proposer un filtre qui ne filtre rien.
 */

import { parseQuery } from "./query-bar.js";

const texte = (valeur) => String(valeur ?? "").trim();
const repli = (valeur) => texte(valeur).toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Ce qui s'écrit dans la barre : accentué, mais sans espace. */
const jeton = (valeur) => texte(valeur).replace(/\s+/g, "-").toLowerCase();

/**
 * Les statuts, et leurs noms dans la barre.
 *
 * `ouvert`/`fermé` plutôt que `open`/`closed` : on tape ce qu'on lit, et
 * l'écran est en français. La valeur interne, elle, reste celle de la base.
 */
export const STATUTS = [
  { value: "open", token: "ouvert", label: "Ouverts" },
  { value: "closed", token: "fermé", label: "Fermés" }
];

export const PRIORITES = [
  { value: "critical", token: "critique", label: "Critique" },
  { value: "high", token: "haute", label: "Haute" },
  { value: "medium", token: "moyenne", label: "Moyenne" },
  { value: "low", token: "basse", label: "Basse" }
];

/**
 * Ce que « bloqué » veut dire ici : le sujet attend un autre sujet
 * (`subject_links.link_type = blocked_by`). Pas « en retard », pas « à
 * l'arrêt » — une dépendance écrite, et rien d'autre.
 */
export const BLOCAGES = [
  { value: "bloques", token: "oui", label: "Bloqués" },
  { value: "libres", token: "non", label: "Non bloqués" }
];

/** La valeur qui désigne « celui qui regarde ». */
export const MOI = "@moi";

/** La valeur qui désigne « aucun » : un sujet sans label, sans objectif, sans personne. */
export const AUCUN = "aucun";

/**
 * Les champs, construits sur le vocabulaire du projet.
 *
 * **Un champ sans valeur n'est pas déclaré.** Un projet sans objectif ne doit
 * pas proposer `objectif:` — le filtre ne rendrait jamais rien, et l'on
 * chercherait ce qu'on a mal tapé.
 *
 * @param {object} vocabulaire
 * @param {{key: string, name: string}[]} [vocabulaire.labels]
 * @param {{id: string, title: string}[]} [vocabulaire.objectifs]
 * @param {{id: string, name: string}[]} [vocabulaire.lots]
 * @param {{id: string, name: string}[]} [vocabulaire.personnes]
 * @returns {object[]} des `QueryField` de `query-bar.js`
 */
export function champsDesSujets({
  labels = [], objectifs = [], lots = [], personnes = []
} = {}) {
  const champs = [
    { key: "statut", label: "Statut", values: STATUTS },
    { key: "priorité", label: "Priorité", values: PRIORITES },
    { key: "bloqué", label: "Blocage", values: BLOCAGES }
  ];

  const nommes = (entrees, id, nom) => (Array.isArray(entrees) ? entrees : [])
    .map((entree) => ({
      value: texte(entree?.[id]),
      token: jeton(entree?.[nom]),
      label: texte(entree?.[nom]) || texte(entree?.[id])
    }))
    .filter((valeur) => valeur.value && valeur.label);

  // « aucun » n'a de sens que là où l'absence se cherche : un sujet sans label
  // est une chose qu'on veut trouver, un sujet sans statut n'existe pas.
  const avecAucun = (valeurs) => (valeurs.length > 0
    ? [...valeurs, { value: AUCUN, token: AUCUN, label: "Aucun" }]
    : []);

  const desLabels = avecAucun(nommes(labels, "key", "name"));
  if (desLabels.length > 0) champs.push({ key: "label", label: "Label", values: desLabels });

  const desObjectifs = avecAucun(nommes(objectifs, "id", "title"));
  if (desObjectifs.length > 0) champs.push({ key: "objectif", label: "Objectif", values: desObjectifs });

  const desLots = avecAucun(nommes(lots, "id", "name"));
  if (desLots.length > 0) champs.push({ key: "lot", label: "Lot", values: desLots });

  const desPersonnes = nommes(personnes, "id", "name");
  if (desPersonnes.length > 0) {
    champs.push({
      key: "assigné",
      label: "Assigné à",
      // `@moi` en tête : c'est la lecture la plus fréquente, et la seule qui ne
      // dépende pas de savoir comment on s'appelle dans ce projet.
      values: [
        { value: MOI, token: "moi", label: "Moi" },
        ...desPersonnes,
        { value: AUCUN, token: AUCUN, label: "Personne" }
      ]
    });
  }

  return champs;
}

/**
 * Ce qu'un sujet porte, tel que l'écran le sait.
 *
 * @typedef {object} MetaDuSujet
 * @property {string[]} [labels] les clés de ses labels
 * @property {string[]} [objectifs] les identifiants de ses objectifs
 * @property {string[]} [lots] les lots de ses assignés — la base ne range pas un
 *   sujet dans un lot, elle range les **personnes**. Le lot d'un sujet est donc
 *   celui de qui le porte, et l'écran le dit plutôt que de laisser croire à une
 *   colonne qui n'existe pas.
 * @property {string[]} [assignes] les identifiants de ses assignés
 * @property {boolean} [bloque] un lien `blocked_by` le vise
 */

const listeDe = (valeur) => (Array.isArray(valeur) ? valeur.map(texte).filter(Boolean) : []);

/** Le sujet répond-il à ce filtre de liste ? */
function portePar(valeurs, cherche) {
  if (cherche === AUCUN) return valeurs.length === 0;
  return valeurs.some((valeur) => repli(valeur) === repli(cherche));
}

/**
 * Les sujets que cette requête retient.
 *
 * **Le texte libre cherche dans le titre.** Pas dans la description : une
 * recherche qui remonte un sujet dont le titre ne contient pas le mot cherché
 * se lit comme une erreur, et l'on ne voit pas où le mot se cache.
 *
 * @param {object} options
 * @param {object[]} options.sujets
 * @param {string} options.requete ce qui est écrit dans la barre
 * @param {object[]} options.champs ceux de `champsDesSujets`
 * @param {Record<string, MetaDuSujet>} [options.meta] par identifiant de sujet
 * @param {string} [options.moi] l'identifiant de qui regarde — sans lui,
 *   `assigné:moi` ne filtre rien plutôt que de rendre la liste vide
 * @returns {{sujets: object[], filtres: Record<string,string>, texte: string,
 *   ignores: string[]}}
 */
export function sujetsFiltres({
  sujets = [], requete = "", champs = [], meta = {}, moi = ""
} = {}) {
  const tous = Array.isArray(sujets) ? sujets : [];
  const { filters, text } = parseQuery(requete, champs);

  const mots = repli(text).split(/\s+/).filter(Boolean);
  // Un filtre qu'on ne peut pas appliquer est **annoncé**, pas appliqué de
  // travers : `assigné:moi` sans savoir qui regarde rendrait une liste vide,
  // et l'on croirait n'avoir aucun sujet.
  const ignores = [];

  const retenus = tous.filter((sujet) => {
    const sien = meta?.[texte(sujet?.id)] ?? {};

    if (filters.statut && repli(sujet?.status ?? sujet?.statut) !== repli(filters.statut)) return false;
    if (filters["priorité"] && repli(sujet?.priority ?? sujet?.priorite) !== repli(filters["priorité"])) return false;

    if (filters["bloqué"]) {
      const attendu = filters["bloqué"] === "bloques";
      if (Boolean(sien.bloque) !== attendu) return false;
    }

    if (filters.label && !portePar(listeDe(sien.labels), filters.label)) return false;
    if (filters.objectif && !portePar(listeDe(sien.objectifs), filters.objectif)) return false;
    if (filters.lot && !portePar(listeDe(sien.lots), filters.lot)) return false;

    if (filters["assigné"]) {
      const cherche = filters["assigné"] === MOI ? texte(moi) : filters["assigné"];
      if (filters["assigné"] === MOI && !cherche) {
        if (!ignores.includes("assigné")) ignores.push("assigné");
      } else if (!portePar(listeDe(sien.assignes), cherche)) {
        return false;
      }
    }

    if (mots.length === 0) return true;
    const titre = repli(sujet?.title ?? sujet?.titre);
    return mots.every((mot) => titre.includes(mot));
  });

  return { sujets: retenus, filtres: filters, texte: text, ignores };
}

/**
 * Ce qu'on ne peut pas appliquer, dit en une phrase. `""` quand tout s'applique.
 *
 * **Un filtre silencieusement sans effet est pire qu'une erreur** : la liste a
 * l'air filtrée, et elle ne l'est pas.
 */
export function phraseDesIgnores(ignores = []) {
  const noms = listeDe(ignores);
  if (noms.length === 0) return "";

  return `${noms.map((nom) => `« ${nom} »`).join(", ")} n'a pas pu être appliqué : `
    + "on ne sait pas qui regarde. La liste n'est donc pas restreinte là-dessus.";
}
