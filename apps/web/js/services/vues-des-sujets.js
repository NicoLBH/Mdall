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
 * Ce qu'une ligne de la base devient à l'écran.
 *
 * Le nom se recalcule quand il est vide : la requête fait office, et c'est elle
 * qu'on reconnaît. La recopier en base la laisserait diverger de la requête
 * qu'elle résume (règle 4).
 */
export function vuePourLEcran(ligne = {}) {
  const requete = texte(ligne.query ?? ligne.requete);

  return {
    id: texte(ligne.id),
    requete,
    nom: texte(ligne.title ?? ligne.nom) || requete,
    description: texte(ligne.description),
    icone: iconeDeLaVue(ligne.icon ?? ligne.icone),
    couleur: couleurDeLaVue(ligne.color ?? ligne.couleur),
    // **Enregistrée et épinglée sont deux choses.** Une vue vit sur son écran ;
    // elle ne monte au rail que lorsqu'on l'y met. Le rail est court, et une
    // vue de plus y coûte une place à celles qu'on regarde tous les jours.
    auRail: (ligne.rail ?? ligne.auRail) === true,
    // Le compte qui l'a écrite, et la dernière fois qu'elle a bougé. Ce sont
    // des identifiants et une date brute : c'est l'écran qui sait mettre un nom
    // sur un compte, parce que lui seul connaît le trombinoscope du projet.
    creePar: texte(ligne.owner_id ?? ligne.creePar),
    miseAJour: texte(ligne.updated_at ?? ligne.miseAJour)
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
