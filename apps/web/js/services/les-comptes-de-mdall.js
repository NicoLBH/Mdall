/**
 * Les comptes de Mdall, tels que la console les montre.
 *
 * ## Ce que ce module fait, et ce qu'il ne fait pas
 *
 * Il met en forme ce que la base rend, et rien d'autre : il ne lit rien, n'écrit
 * rien, ne connaît aucune requête. Les trois fonctions de base vivent dans
 * `les-comptes-de-mdall-supabase.js`, et le jugement — qui a le droit, sur quoi —
 * vit **entièrement en base** (`est_administrateur()` et le journal des accès).
 *
 * ## La règle de la console, et elle vaut ici aussi
 *
 * > La forme et les comptes traversent ; le contenu reste.
 *
 * Ce module voit un nom, un prénom, une adresse, des noms de chantier et des
 * nombres. Il ne voit **jamais** une conversation avec le copilote, un message
 * de sujet, une affirmation, ni le texte d'un document. Ce n'est pas une
 * politesse : c'est la promesse du produit, et un administrateur n'en est pas
 * l'exception — c'est le cas le plus dangereux.
 *
 * ## Le tarif n'est pas ici
 *
 * La consommation d'un compte se met en euros par `consommation-ia.js`, le même
 * module que l'écran de l'utilisateur. Un second barème pour la console aurait
 * divergé de la facture au premier tarif relevé (règle 4) — et c'est précisément
 * le chiffre qu'un administrateur vient vérifier.
 *
 * ## Il est pur
 *
 * Des lignes entrent, des lignes sortent.
 */

import { PAS, lePasValide } from "./consommation-ia.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Combien de comptes par page.
 *
 * Vingt-cinq : la taille que les autres tableaux de Mdall emploient, et de quoi
 * tenir dans un écran sans faire défiler l'en-tête. La base la borne à cent de
 * son côté — un appelant qui demanderait la table entière n'y arriverait pas.
 */
export const PAR_PAGE = 25;

/**
 * Les deux rôles qu'on peut avoir sur un chantier, et ce qu'on en dit.
 *
 * **Propriétaire n'est pas collaborateur**, et les séparer est tout l'intérêt :
 * un déclencheur inscrit le propriétaire comme collaborateur de son propre
 * chantier, et les fondre ferait monter « collabore à » avec « possède », sans
 * rien apprendre de plus.
 */
export const LE_ROLE = {
  PROPRIETAIRE: "proprietaire",
  COLLABORATEUR: "collaborateur"
};

export const CE_QUE_DIT_LE_ROLE = {
  [LE_ROLE.PROPRIETAIRE]: "Propriétaire",
  [LE_ROLE.COLLABORATEUR]: "Collaborateur"
};

/**
 * Comment le pas se nomme pour la base.
 *
 * ## Pourquoi une table, et pourquoi ici
 *
 * `consommation-ia.js` nomme les pas en français — `jour`, `mois`, `annee` —
 * parce que c'est ce que l'écran écrit. `date_trunc` les veut en anglais. La
 * traduction existe donc quelque part ; écrite deux fois, elle aurait fini par
 * envoyer `annee` à PostgreSQL, qui lève — un écran vide sur une faute de
 * vocabulaire (règle 10).
 *
 * **Un pas inconnu devient `day`**, et non une erreur : c'est ce que
 * `lePasValide` fait déjà de son côté, et les deux doivent retomber au même
 * endroit, sinon l'axe et les données ne parleraient pas du même pas.
 */
const LE_PAS_EN_BASE = {
  [PAS.JOUR]: "day",
  [PAS.MOIS]: "month",
  [PAS.ANNEE]: "year"
};

export function lePasPourLaBase(pas) {
  return LE_PAS_EN_BASE[lePasValide(pas)];
}

/**
 * Un identifiant, raccourci pour être lu.
 *
 * Un UUID entier prend la moitié d'une colonne et ne se retient pas. Les huit
 * premiers caractères suffisent à reconnaître une ligne d'une autre, et l'écran
 * garde le complet pour qui veut le copier — tronquer **sans** garder l'entier
 * donnerait un identifiant avec lequel on ne peut rien faire.
 */
export function lidentifiantCourt(identifiant) {
  const dit = texte(identifiant);
  return dit ? dit.slice(0, 8) : "";
}

/**
 * Ce qu'une ligne de compte devient à l'écran.
 *
 * **Un compte sans nom garde son adresse**, et un compte sans adresse garde son
 * identifiant : inventer « Utilisateur anonyme » ferait croire à un défaut de
 * saisie là où il n'y a qu'un compte qui n'a pas rempli son profil.
 */
export function unCompteALecran(ligne = null) {
  const identifiant = texte(ligne?.identifiant);
  if (!identifiant) return null;

  const prenom = texte(ligne?.prenom);
  const nom = texte(ligne?.nom);
  const courriel = texte(ligne?.courriel);

  return {
    identifiant,
    court: lidentifiantCourt(identifiant),
    courriel,
    prenom,
    nom,
    societe: texte(ligne?.societe),
    /** Comment on le nomme : son nom s'il en a un, son adresse sinon. */
    commeOnLappelle: [prenom, nom].filter(Boolean).join(" ")
      || courriel
      || lidentifiantCourt(identifiant),
    entreLe: texte(ligne?.entre_le),
    derniereTrace: texte(ligne?.derniere_trace),
    projetsPossedes: nombre(ligne?.projets_possedes),
    projetsCollabores: nombre(ligne?.projets_collabores)
  };
}

/**
 * Une page de comptes, et combien il y en a en tout.
 *
 * **Le total vient de la base, pas de la longueur de la page.** Compter les
 * lignes reçues dirait « 25 comptes » sur une base de mille, et l'écran
 * n'oserait pas proposer la page suivante.
 *
 * `null` traverse : une lecture qui n'a pas abouti n'est pas « aucun compte ».
 */
export function lesComptesALecran(lignes = null) {
  if (lignes === null || lignes === undefined) return null;

  const comptes = liste(lignes).map(unCompteALecran).filter(Boolean);
  return {
    comptes,
    // Chaque ligne porte le même total, par fenêtrage. Sans ligne, il n'y a
    // rien, et zéro est alors la bonne réponse.
    combienEnTout: nombre(liste(lignes)[0]?.combien_en_tout)
  };
}

/**
 * Le détail d'un compte.
 *
 * Les chantiers arrivent en un seul paquet, rôle compris ; on les sépare ici
 * pour que l'écran n'ait pas à le refaire — et pour que « possède » et
 * « collabore » ne se mélangent jamais dans un décompte.
 */
export function leDetailDunCompte(ligne = null) {
  const compte = unCompteALecran(ligne);
  if (!compte) return null;

  const projets = liste(ligne?.projets).map((un) => ({
    id: texte(un?.id),
    nom: texte(un?.nom) || "Chantier sans nom",
    role: un?.role === LE_ROLE.COLLABORATEUR ? LE_ROLE.COLLABORATEUR : LE_ROLE.PROPRIETAIRE,
    creeLe: texte(un?.cree_le),
    archiveLe: texte(un?.archive_le),
    sujets: nombre(un?.sujets)
  })).filter((un) => un.id);

  return {
    ...compte,
    sujets: nombre(ligne?.sujets),
    appels: nombre(ligne?.appels),
    jetons: nombre(ligne?.jetons),
    premierAppel: texte(ligne?.premier_appel),
    dernierAppel: texte(ligne?.dernier_appel),
    possedes: projets.filter((un) => un.role === LE_ROLE.PROPRIETAIRE),
    collabores: projets.filter((un) => un.role === LE_ROLE.COLLABORATEUR)
  };
}

/**
 * La consommation d'un compte, telle que `consommation-ia.js` la sait lire.
 *
 * ## Pourquoi cette traduction existe
 *
 * La base rend des lignes **déjà groupées** par pas et par modèle : rendre dix
 * mille appels pour en faire douze points serait dix mille lignes de trop. Mais
 * l'axe, les pas vides, les libellés et le tarif restent au JavaScript — c'est
 * là qu'ils sont écrits une fois, pour l'écran de l'utilisateur comme pour la
 * console.
 *
 * Une ligne groupée se présente donc comme un appel qui en vaut `combien` :
 * `totalDesAppels` sait compter cela, et `parPas` les regroupe une seconde fois
 * au même pas — ce qui ne change rien, puisque le début d'un pas se tronque en
 * lui-même.
 *
 * **`null` n'est pas zéro.** Un pas où aucun appel n'a de décompte du
 * fournisseur rend `null`, et doit le rester : zéro jeton et « on ne sait pas »
 * ne se disent pas pareil, et c'est la carte qui dit de combien on se trompe
 * (règle 5).
 */
export function laConsommationALecran(lignes = null) {
  if (lignes === null || lignes === undefined) return null;

  return liste(lignes).map((une) => ({
    model: texte(une?.model),
    entree: une?.entree === null || une?.entree === undefined ? null : nombre(une.entree),
    sortie: une?.sortie === null || une?.sortie === undefined ? null : nombre(une.sortie),
    combien: Math.max(1, nombre(une?.combien)),
    le: texte(une?.le),
    // La console ne lit pas la nature des appels : la fonction de base ne la
    // rend pas, et une nature inventée ferait une répartition par usage fausse.
    nature: "",
    projetId: "",
    ownerId: ""
  }));
}
