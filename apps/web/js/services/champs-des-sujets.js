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

import { filterValues, parseQuery } from "./query-bar.js";

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
 * Depuis quand une activité est « récente ».
 *
 * **Quatorze jours, et c'est un choix, pas une mesure.** Un chantier tient une
 * réunion par semaine : deux semaines couvrent les deux derniers comptes rendus,
 * ce qu'on a en tête quand on demande « ce qui a bougé ». Sept jours en
 * manqueraient un, trente en montreraient quatre.
 */
export const JOURS_RECENTS = 14;

export const ACTIVITES = [{ value: "recente", token: "récente", label: "Activité récente" }];

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
  labels = [], objectifs = [], lots = [], personnes = [], situations = [],
  projets = [], signauxLus = true
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

  // **Les champs de liste se cochent à plusieurs.** Un sujet porte deux labels,
  // et l'on cherche « l'un ou l'autre » — c'est la question qu'on se pose en
  // ouvrant le menu. Les trois premiers champs, eux, restent à choix simple :
  // un sujet n'est pas ouvert **et** fermé, et proposer d'en cocher deux
  // promettrait une liste vide.
  const desLabels = avecAucun(nommes(labels, "key", "name"));
  if (desLabels.length > 0) {
    champs.push({ key: "label", label: "Labels", values: desLabels, multiple: true });
  }

  const desObjectifs = avecAucun(nommes(objectifs, "id", "title"));
  if (desObjectifs.length > 0) {
    champs.push({ key: "objectif", label: "Objectifs", values: desObjectifs, multiple: true });
  }

  const desLots = avecAucun(nommes(lots, "id", "name"));
  if (desLots.length > 0) champs.push({ key: "lot", label: "Lots", values: desLots, multiple: true });

  const desPersonnes = nommes(personnes, "id", "name");
  if (desPersonnes.length > 0) {
    // `@moi` en tête : c'est la lecture la plus fréquente, et la seule qui ne
    // dépende pas de savoir comment on s'appelle dans ce projet.
    const avecMoi = (fin = []) => [
      { value: MOI, token: "moi", label: "Moi" }, ...desPersonnes, ...fin
    ];

    champs.push({
      key: "assigné", label: "Assignés", multiple: true,
      values: avecMoi([{ value: AUCUN, token: AUCUN, label: "Personne" }])
    });

    // **Qui a ouvert le sujet**, et non qui le traite. Les deux se confondent
    // souvent et divergent toujours au moment où ça compte : on cherche ce
    // qu'on a soi-même relevé, pas ce qu'on doit faire.
    //
    // **Un seul, et c'est la base qui le dit** : `subjects.created_by` est une
    // colonne, pas une liste. Proposer d'en cocher deux promettrait les sujets
    // ouverts par l'un **ou** l'autre — ce qu'on ne demande jamais — et ferait
    // surtout croire qu'un sujet peut avoir deux auteurs.
    champs.push({ key: "auteur", label: "Auteur", values: avecMoi() });

    // **Mentionné avec un `@`** — dans un titre, une description, un
    // commentaire. C'est ce qui appelle une réponse, et c'est la seule lecture
    // qui ne se déduit d'aucune colonne du sujet : elle vient des textes.
    //
    // **Elle ne se propose que si la base a su les lire.** Sans les signaux,
    // le filtre ne rendrait jamais rien, et l'on chercherait ce qu'on a mal
    // tapé plutôt que ce qui n'a pas répondu (règle 5).
    if (signauxLus) {
      champs.push({ key: "mention", label: "Mentions", values: avecMoi(), multiple: true });
    }
  }

  // **Sur quel chantier.** Depuis que les situations traversent les projets, une
  // liste peut mêler quatre chantiers, et « les sujets bloqués » ne veut plus
  // dire grand-chose sans dire où. Le champ ne se déclare que là où il y a
  // plusieurs chantiers à distinguer : sur l'écran d'un seul projet, il
  // n'aurait qu'une valeur et ne retirerait jamais rien.
  //
  // Son jeton est le nom en traits d'union, comme pour les labels : la barre
  // coupe sur les espaces, et « Résidence Bertrand » ne s'y écrit pas tel quel.
  const desProjets = nommes(projets, "id", "name");
  if (desProjets.length > 1) {
    champs.push({ key: "projet", label: "Chantiers", values: desProjets, multiple: true });
  }

  const desSituations = avecAucun(nommes(situations, "id", "title"));
  if (desSituations.length > 0) {
    champs.push({
      key: "situation", label: "Situations", values: desSituations, multiple: true
    });
  }

  // Même règle : « ce qui a bougé » se calcule en base, avec les mentions. Sans
  // réponse, on ne propose pas une lecture qu'on ne peut pas tenir.
  if (signauxLus) champs.push({ key: "activité", label: "Activité", values: ACTIVITES });

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

/**
 * Ce sujet a-t-il bougé récemment ?
 *
 * **On lit la dernière activité, pas la création.** Un sujet ouvert il y a six
 * mois et commenté hier a bougé ; l'inverse n'est pas vrai.
 *
 * **Et « activité » veut dire tout ce qui lui arrive** : un commentaire, un
 * changement de statut, une assignation, un label — pas seulement une
 * modification de sa ligne. `updated_at` seul manquait tout ce qui se passe
 * dans le fil de discussion, c'est-à-dire l'essentiel de la vie d'un sujet, et
 * la lecture rendait alors la liste entière d'un projet fraîchement versé et
 * presque rien d'un projet installé. C'est `meta-des-sujets.js` qui rassemble
 * ces sources ; on lit ici ce qu'il a conclu, et la ligne du sujet à défaut.
 *
 * Sans date lisible, le sujet ne compte pas comme récent — supposer qu'il l'est
 * ferait remonter tout ce qu'on ne sait pas dater (règle 5).
 */
function estRecent(sujet, sien, maintenant) {
  const quand = Date.parse(
    sien?.activite
      ?? sujet?.updated_at ?? sujet?.updatedAt ?? sujet?.last_activity_at ?? sujet?.created_at ?? ""
  );
  if (!Number.isFinite(quand)) return false;

  return maintenant - quand <= JOURS_RECENTS * 24 * 60 * 60 * 1000;
}

/** Le sujet répond-il à ce filtre de liste ? */
function portePar(valeurs, cherche) {
  if (cherche === AUCUN) return valeurs.length === 0;
  return valeurs.some((valeur) => repli(valeur) === repli(cherche));
}

/**
 * Le sujet répond-il à **l'une** des valeurs cochées ?
 *
 * **« Ou », et non « et ».** Deux labels cochés cherchent les sujets qui
 * portent l'un ou l'autre : c'est ce qu'on demande en cochant, et l'autre
 * lecture rendrait presque toujours zéro — un sujet portant exactement ces
 * deux labels-là est l'exception, pas la question.
 *
 * Aucune valeur cochée n'est **pas** un filtre : la liste passe entière.
 */
function porteLUneDe(valeurs, cherchees) {
  if (cherchees.length === 0) return true;
  return cherchees.some((cherche) => portePar(valeurs, cherche));
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
  sujets = [], requete = "", champs = [], meta = {}, moi = "", maintenant = Date.now()
} = {}) {
  const tous = Array.isArray(sujets) ? sujets : [];
  const { filters, text, inconnus } = parseQuery(requete, champs);

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

    // Les champs de liste se cochent à plusieurs, et se lisent en « ou ».
    for (const [cle, valeurs] of [
      ["label", sien.labels], ["objectif", sien.objectifs],
      ["lot", sien.lots], ["situation", sien.situations]
    ]) {
      if (!porteLUneDe(listeDe(valeurs), filterValues(filters, cle))) return false;
    }

    // Les trois champs qui peuvent désigner « moi » : sans savoir qui regarde,
    // ils sont annoncés et non appliqués. Une liste vide ferait croire qu'on
    // n'a aucun sujet.
    for (const [cle, valeurs] of [
      ["assigné", sien.assignes], ["auteur", sien.auteurs], ["mention", sien.mentions]
    ]) {
      const cochees = filterValues(filters, cle);
      if (cochees.length === 0) continue;

      // `@moi` sans savoir qui regarde ne s'applique pas ; les autres valeurs
      // cochées, si. Écarter le champ entier retirerait une condition que
      // l'utilisateur a bel et bien posée.
      const cherchees = [];
      for (const cochee of cochees) {
        if (cochee !== MOI) { cherchees.push(cochee); continue; }
        if (texte(moi)) cherchees.push(texte(moi));
        else if (!ignores.includes(cle)) ignores.push(cle);
      }

      if (!porteLUneDe(listeDe(valeurs), cherchees)) return false;
    }

    // **Le chantier est une colonne du sujet**, pas une chose qu'il porte : on
    // le lit sur lui, et non dans sa méta. Un sujet appartient à un chantier et
    // à un seul.
    const chantiers = filterValues(filters, "projet");
    if (chantiers.length) {
      const sien2 = texte(sujet?.project_id ?? sujet?.projectId);
      if (!sien2 || !chantiers.includes(sien2)) return false;
    }

    if (filters["activité"] === "recente" && !estRecent(sujet, sien, maintenant)) return false;

    if (mots.length === 0) return true;
    const titre = repli(sujet?.title ?? sujet?.titre);
    return mots.every((mot) => titre.includes(mot));
  });

  // Ce qu'un champ déclaré n'a pas reconnu remonte tel quel : une liste vide
  // ne distingue pas « ce filtre ne retient rien » de « j'ai mal tapé ».
  return { sujets: retenus, filtres: filters, texte: text, ignores, inconnus };
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
