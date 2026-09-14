/**
 * Les vues : des recherches qu'on nomme, qu'on habille et qu'on retrouve.
 *
 * ## Ce qu'une vue ajoute à une recherche épinglée
 *
 * Une épingle garde une requête. Une **vue** lui donne un nom, une icône, une
 * couleur et une phrase qui dit à quoi elle sert. La différence n'est pas
 * cosmétique : une liste de douze requêtes brutes ne se parcourt pas — on relit
 * chacune pour retrouver celle qu'on cherche, et l'on finit par n'en garder
 * qu'une.
 *
 * ## Elles vivent dans la table des épingles
 *
 * `memory_pinned_searches`, avec `surface = 'sujets'`. Une seconde table aurait
 * dupliqué la politique de sécurité, l'index et le raisonnement sur la vie
 * privée — et c'est sur la sécurité que les deux écritures auraient fini par
 * diverger (règle 10). Le nom, l'icône et la couleur sont trois colonnes de
 * plus, toutes facultatives.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il n'écrit rien et ne lit rien : il décrit ce qu'une vue vaut, vérifie ce
 * qu'on lui donne, et rend de quoi dessiner.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les icônes proposées, **dans l'ordre où l'écran les montre**.
 *
 * Elles viennent toutes du jeu de l'application : en inventer une pour cet
 * écran ferait une icône que nul autre ne peut employer, et la première
 * divergence du jeu commence là.
 */
export const ICONES_DE_VUE = [
  "bookmark", "issue-opened", "person", "people", "mention", "clock-fill",
  "stack", "tag", "milestone", "table", "alert", "check-circle",
  "blocked", "file", "search", "pin", "smiley", "pencil", "history"
];

/**
 * Les couleurs proposées.
 *
 * **Une liste fermée, et courte.** Un sélecteur libre produit douze gris qui se
 * ressemblent, et l'icône ne distingue plus rien — ce qui est exactement ce
 * qu'on lui demande de faire.
 */
export const COULEURS_DE_VUE = [
  { cle: "gris", valeur: "#9198a1", nom: "Gris" },
  { cle: "bleu", valeur: "#4493f8", nom: "Bleu" },
  { cle: "vert", valeur: "#3fb950", nom: "Vert" },
  { cle: "jaune", valeur: "#d29922", nom: "Jaune" },
  { cle: "rouge", valeur: "#f85149", nom: "Rouge" },
  { cle: "violet", valeur: "#ab7df8", nom: "Violet" },
  { cle: "rose", valeur: "#f778ba", nom: "Rose" },
  { cle: "orange", valeur: "#db6d28", nom: "Orange" }
];

/**
 * Celle qu'on prend quand on n'a pas choisi.
 *
 * **Le marque-page**, parce que c'est ce qu'une vue est : un endroit où l'on
 * revient. L'ancienne — la pile — disait « plusieurs choses », ce qui est vrai
 * de n'importe quelle liste et ne distingue donc rien.
 */
export const ICONE_PAR_DEFAUT = "bookmark";
export const COULEUR_PAR_DEFAUT = "gris";

/**
 * Une icône ramenée à celles du jeu.
 *
 * **On ne laisse pas passer un nom inconnu** : `svgIcon` rendrait une case
 * vide, et la vue deviendrait invisible dans une liste où l'icône est le seul
 * repère.
 */
export function iconeDeLaVue(valeur) {
  const nom = texte(valeur);
  return ICONES_DE_VUE.includes(nom) ? nom : ICONE_PAR_DEFAUT;
}

/** Une couleur ramenée à la liste, et sa valeur hexadécimale. */
export function couleurDeLaVue(valeur) {
  const cle = texte(valeur).toLowerCase();
  return COULEURS_DE_VUE.find((couleur) => couleur.cle === cle)
    ?? COULEURS_DE_VUE.find((couleur) => couleur.cle === COULEUR_PAR_DEFAUT);
}

/**
 * Ce qu'une recherche épinglée devient sur l'écran des vues.
 *
 * ## Une seule forme en entrée, et c'est le défaut que ça répare
 *
 * On acceptait **deux graphies** — celle des colonnes de la base et celle de
 * l'écran — en espérant couvrir les deux appelants. Aucune des deux n'était
 * celle qui arrivait : `recherche-epinglee.js` rend `titre`, on lisait `title`,
 * et le nom d'une vue retombait donc sur sa requête. La liste affichait
 * `objectif:permis-de-construire` là où le rail, qui lit l'autre graphie,
 * affichait « Les urgences du lot 03 ».
 *
 * Deviner la graphie ne rate pas bruyamment : ça rend `undefined`, et
 * `undefined` prend la valeur de repli. **On ne devine donc plus** : l'entrée
 * est ce que `recherchePourLEcran` rend, et rien d'autre (règle 10).
 *
 * Le nom se recalcule quand il est vide : la requête fait office, et c'est elle
 * qu'on reconnaît. La recopier en base la laisserait diverger de la requête
 * qu'elle résume (règle 4).
 */
export function vuePourLEcran(recherche = {}) {
  const requete = texte(recherche.requete);

  return {
    id: texte(recherche.id),
    requete,
    nom: texte(recherche.titre) || requete,
    description: texte(recherche.description),
    icone: iconeDeLaVue(recherche.icone),
    couleur: couleurDeLaVue(recherche.couleur),
    // **Enregistrée et épinglée sont deux choses.** Une vue vit sur son écran ;
    // elle ne monte au rail que lorsqu'on l'y met. Le rail est court, et une
    // vue de plus y coûte une place à celles qu'on regarde tous les jours.
    auRail: recherche.auRail === true,
    // Le compte qui l'a écrite, et la dernière fois qu'elle a bougé. Ce sont
    // un identifiant et une date brute : c'est l'écran qui sait mettre un nom
    // sur un compte, parce que lui seul connaît le trombinoscope du projet.
    creePar: texte(recherche.creePar),
    miseAJour: texte(recherche.miseAJour)
  };
}

/**
 * Les mois, écrits.
 *
 * **En toutes lettres, et pas en chiffres.** « 03/04 » se lit comme le 3 avril
 * d'un côté de l'Atlantique et le 4 mars de l'autre ; sur une liste qu'on
 * parcourt des yeux, la confusion ne se remarque même pas.
 */
export const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

/**
 * Une date de la base, écrite en français — ou `""` si ce n'en est pas une.
 *
 * `""` et non « date inconnue » : la ligne se contente alors de ne pas la dire.
 * Inventer une date, même vague, ferait croire à une mise à jour qui n'a pas eu
 * lieu (`docs/fondamentaux.md`, règle 5).
 */
export function dateEnFrancais(quand) {
  const dite = texte(quand);
  if (!dite) return "";

  const date = new Date(dite);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getDate()} ${MOIS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Ce que la ligne grise d'une vue dit d'elle.
 *
 * ## Pourquoi ces trois-là, et pas la requête
 *
 * La requête y était, et elle ne servait à rien : on la relit pour retrouver ce
 * qu'on a déjà nommé au-dessus. Ce qu'on cherche sur cette ligne, c'est **de
 * qui elle vient, si elle est à jour, et si elle est dans le rail** — les trois
 * choses qui décident si on l'ouvre, si on la modifie ou si on la supprime.
 *
 * Chaque morceau manque plutôt que de mentir : un compte qu'on ne sait pas
 * nommer, une date qu'on n'a pas, et la ligne les passe (règle 5).
 */
export function motsDeLaVue({ auteur = "", miseAJour = "", auRail = false } = {}) {
  const quand = dateEnFrancais(miseAJour);
  const nom = texte(auteur);

  return {
    auteur: nom ? `créée par ${nom}` : "",
    miseAJour: quand ? `Dernière mise à jour le ${quand}` : "",
    epinglee: auRail === true
  };
}

/**
 * La vue qu'on est en train de regarder, ou `null`.
 *
 * ## Pourquoi l'écran a besoin de le savoir
 *
 * Une vue est une requête enregistrée : une fois cliquée, l'écran ressemble
 * trait pour trait à n'importe quelle liste filtrée. On ne sait plus dans
 * laquelle on est, et l'on reclique dans le rail pour vérifier. Le nom et
 * l'habit reviennent donc au-dessus du tableau — c'est la seule chose qui
 * distingue cet écran-là d'un autre.
 *
 * **Exactement la même requête.** Une vue qui s'annoncerait sur une requête
 * voisine ferait croire qu'on regarde ce qu'on a enregistré alors qu'on
 * regarde autre chose — la même raison qui allume une épingle du rail, et le
 * même mot : exactement (règle 5).
 */
export function vueRegardee({ vues = [], requete = "" } = {}) {
  const dite = texte(requete);
  if (!dite) return null;

  return (Array.isArray(vues) ? vues : []).find((vue) => texte(vue?.requete) === dite) ?? null;
}

/**
 * Ce que le menu d'une vue propose.
 *
 * **Épingler et supprimer ne se confondent pas**, et c'est pourquoi un filet
 * les sépare et que la seconde est rouge : retirer une vue du rail la range,
 * la supprimer la perd. Un seul bouton pour les deux aurait fait perdre des
 * recherches à qui voulait seulement dégager sa barre de gauche.
 *
 * L'épingle dit **ce que le clic va faire**, pas l'état courant : une entrée
 * qui dirait « épinglée » alors qu'elle va désépingler se lit à l'envers une
 * fois sur deux.
 *
 * @param {object} vue celle dont on ouvre le menu
 * @param {object} [options]
 * @param {boolean} [options.avecModifier] l'entrée « Modifier la vue ». Elle
 *   n'a pas de sens dans le tableau des vues, où l'on est déjà sur l'écran qui
 *   les modifie.
 */
export function gestesDeLaVue(vue = {}, { avecModifier = false } = {}) {
  const auRail = vue?.auRail === true;

  return [
    ...(avecModifier
      ? [{ cle: "modifier", nom: "Modifier la vue", icone: "pencil", attribut: "sujets-vue-modifier" }]
      : []),
    {
      cle: "epingler",
      nom: auRail ? "Désépingler la vue" : "Épingler la vue",
      // L'épingle barrée dit qu'on va la retirer. La même icône dans les deux
      // sens obligerait à lire le mot pour savoir dans quel état on est.
      icone: auRail ? "pin-slash" : "pin",
      attribut: "sujets-vue-epingler"
    },
    { separateur: true },
    { cle: "supprimer", nom: "Supprimer", icone: "trash", attribut: "sujets-decrocher", danger: true }
  ];
}

export const REFUS = {
  SANS_REQUETE: "sans_requete",
  SANS_NOM: "sans_nom",
  DEJA_LA: "deja_la"
};

export const PHRASES_DU_REFUS = {
  [REFUS.SANS_REQUETE]: "Une vue sans recherche ne montrerait rien : écrivez ce qu'elle doit retenir.",
  [REFUS.SANS_NOM]: "Donnez-lui un nom : c'est par lui qu'on la retrouve dans le rail.",
  [REFUS.DEJA_LA]: "Une vue porte déjà ce nom. Deux vues du même nom ne se distinguent plus."
};

/**
 * Ce qui empêche d'enregistrer cette vue, ou `""`.
 *
 * **Le nom est exigé, la description non.** Le nom est ce qui s'affiche dans le
 * rail ; la description ne se lit que sur l'écran des vues, et l'exiger ferait
 * inventer une phrase pour passer.
 */
export function refusDeLaVue({ requete = "", nom = "", vues = [], id = "" } = {}) {
  if (!texte(requete)) return REFUS.SANS_REQUETE;
  if (!texte(nom)) return REFUS.SANS_NOM;

  const replie = texte(nom).toLowerCase();
  const homonyme = (Array.isArray(vues) ? vues : [])
    .some((vue) => texte(vue?.nom).toLowerCase() === replie && texte(vue?.id) !== texte(id));

  return homonyme ? REFUS.DEJA_LA : "";
}

/** La phrase d'un refus, ou `""` quand il n'y en a pas. */
export function phraseDuRefus(motif) {
  return PHRASES_DU_REFUS[texte(motif)] ?? "";
}

/**
 * Ce qu'on enverra en base, une fois la vue acceptée.
 *
 * Les valeurs sont **ramenées**, pas recopiées : une icône inconnue arrivée par
 * un formulaire rouvert après un changement de jeu deviendrait une case vide.
 */
export function vueAEcrire({ requete = "", nom = "", description = "", icone = "", couleur = "" } = {}) {
  return {
    query: texte(requete),
    title: texte(nom),
    description: texte(description),
    icon: iconeDeLaVue(icone),
    color: couleurDeLaVue(couleur).cle
  };
}

/** Ce qu'on dit d'une liste de vues, en une phrase. */
export function phraseDesVues(vues = []) {
  const combien = (Array.isArray(vues) ? vues : []).length;
  if (combien === 0) {
    return "Aucune vue enregistrée. Une vue garde une recherche sous un nom, pour la retrouver d'un clic.";
  }
  return `${combien} vue${combien > 1 ? "s" : ""}`;
}
