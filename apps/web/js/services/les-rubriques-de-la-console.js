/**
 * Les rubriques de la console, et ce que chacune répond.
 *
 * ## Le défaut que cela répare
 *
 * La console posait tout sur une seule page : les comptes du carburant, la
 * répartition par chantier, ce que la classification reconnaît, les
 * enchaînements de domaines, ceux des sujets, les sujets eux-mêmes, et ce qui
 * n'est pas fait. Sept blocs, à la suite, sans rien pour dire lequel répond à
 * quelle question.
 *
 * > « L'affichage est laborieux, trop d'informations sur la même page. »
 *
 * On ne lit pas sept blocs : on fait défiler jusqu'à trouver, et l'on finit par
 * ne plus regarder du tout.
 *
 * ## Une question par rubrique
 *
 * Chacune porte **la question à laquelle elle répond**, pas le nom de la table
 * qu'elle lit. C'est ce qui permet de savoir où aller sans avoir appris la
 * console : on cherche une réponse, pas un écran.
 *
 * L'ordre n'est pas décoratif, il suit la chaîne :
 *
 *   ce qu'on a reçu → ce qu'on en reconnaît → ce qu'on en prédit →
 *   de quoi on parle → ce que cela énonce → ce qui manque.
 *
 * Sans matière, rien ne se reconnaît ; sans reconnaissance, rien ne se prédit.
 * Une rubrique lue avant la précédente ne veut rien dire.
 *
 * **Les idées viennent après les sujets**, et c'est le même cran que celui des
 * sujets après les domaines : un terme nomme une chose, une idée dit ce qu'elle
 * fait. On ne peut pas relever ce qu'une chose entraîne avant de savoir la
 * nommer.
 *
 * ## Chaque rubrique déclare son onglet
 *
 * Et non l'inverse. La barre d'onglets aurait pu porter la liste de ses
 * rubriques ; elles auraient alors été écrites deux fois, et celle qu'on ne
 * relit jamais aurait fini par ignorer une rubrique neuve — un rail amputé
 * d'une entrée, ou un onglet qui ne mène nulle part (règle 10).
 *
 * C'est aussi ce qui tient **une seule adresse pour un seul écran** : le
 * fragment nomme la rubrique, et l'onglet s'en déduit. Il n'y a donc rien à
 * accorder entre la barre du haut et le rail de gauche, et un signet sur une
 * rubrique ouvre son onglet.
 *
 * ## Il est pur
 *
 * Des noms et des phrases. L'écran les dessine, les services les remplissent.
 */

import { ONGLET, ONGLET_PAR_DEFAUT, ongletDeLaConsoleValide } from "./les-onglets-de-la-console.js";

/** La rubrique du carburant : ce dont tout le reste dépend. */
export const LE_CARBURANT = "carburant";

/** Celle des comptes : la première question d'exploitation — qui est là. */
export const LES_COMPTES = "comptes";

/** La santé des systèmes : est-ce que cela répond, et depuis quand. */
export const LA_SANTE = "sante";

/** L'usage : le stockage, les documents, les venues. */
export const LUSAGE = "usage";

/** Le trafic : combien de monde, et combien de temps. */
export const LE_TRAFIC = "trafic";

/** Le journal des consultations de la console. */
export const LES_CONSULTATIONS = "consultations";

/** La justesse des analyses : ce que les quatre outils de mesure ont trouvé. */
export const LA_JUSTESSE = "justesse";

export const LES_RUBRIQUES = [
  {
    cle: LES_COMPTES,
    onglet: ONGLET.UTILISATEURS,
    libelle: "Les comptes",
    icone: "person",
    question: "Qui est là, et qu'est-ce que chacun a fait ?",
    explication: "Un nom, une adresse, ses chantiers, ses sujets comptés et ce "
      + "que l'IA lui a coûté. Jamais ce qu'il a écrit."
  },
  {
    cle: LA_SANTE,
    onglet: ONGLET.EXPLOITATION,
    libelle: "La santé des systèmes",
    icone: "pulse",
    question: "Est-ce que cela répond, et depuis quand ?",
    explication: "Lu dans les traces de Mdall, et non sur la page d'état d'un "
      + "fournisseur : celle-ci est verte quand notre clé est révoquée. Et "
      + "« aucune trace » s'y lit « on ne sait pas »."
  },
  {
    cle: LUSAGE,
    onglet: ONGLET.EXPLOITATION,
    libelle: "L'usage",
    icone: "meter",
    question: "Combien d'octets, de documents, de chantiers — et qui est venu ?",
    explication: "La moyenne par chantier recouvre deux produits différents : la "
      + "médiane et les extrêmes disent lequel. Les documents effacés s'y "
      + "comptent à part, parce que leurs octets restent."
  },
  {
    cle: LE_TRAFIC,
    onglet: ONGLET.EXPLOITATION,
    libelle: "Le trafic",
    icone: "pulse",
    question: "Combien de monde vient, et combien de temps reste-t-il ?",
    explication: "Des venues et des comptes — dix venues d'une personne ne font "
      + "pas dix personnes. Le temps compté est celui où l'application est au "
      + "premier plan et touchée : ce n'est pas du temps de travail."
  },
  {
    cle: LA_JUSTESSE,
    onglet: ONGLET.EXPLOITATION,
    libelle: "La justesse",
    icone: "beaker",
    question: "Les documents sont-ils bien lus, et comment le sait-on ?",
    explication: "Quatre outils, quatre angles, et aucun qui suffise seul. Jamais "
      + "un score unique : un taux global ne dit pas sur quoi l'on se trompe, et "
      + "c'est tout ce qu'on voudrait savoir."
  },
  {
    cle: LES_CONSULTATIONS,
    onglet: ONGLET.EXPLOITATION,
    libelle: "Les consultations",
    icone: "history",
    question: "Qui a ouvert quelle page de la console, et quand ?",
    explication: "Le journal des accès administrateurs. Il se lit, il ne s'efface "
      + "pas — et le lire s'y inscrit aussi."
  },
  {
    cle: LE_CARBURANT,
    onglet: ONGLET.CARBURANT,
    libelle: "Le carburant",
    icone: "mail",
    question: "Qu'est-ce que Mdall a reçu, et qu'est-ce que cela permet ?",
    explication: "Des nombres et deux dates — jamais un objet, une adresse ou un "
      + "nom de chantier. Sans matière, aucun prédicteur n'a de chance."
  },
  {
    cle: "reconnaissance",
    onglet: ONGLET.CARBURANT,
    libelle: "Ce qui est reconnu",
    icone: "labels-distribution",
    question: "Sur ce qu'on a reçu, qu'est-ce que le système sait nommer ?",
    explication: "Un taux de précision dit qu'on se trompe ; il ne dit jamais sur "
      + "quoi. Domaine par domaine, et sur combien de chantiers."
  },
  {
    cle: "prediction",
    onglet: ONGLET.CARBURANT,
    libelle: "Ce qui s'enchaîne",
    icone: "graph",
    question: "Qu'est-ce qui suit quoi, et mieux que par hasard ?",
    explication: "C'est ce que la prédiction sait faire. Une suite se lit dans un "
      + "chantier, jamais en travers de mille."
  },
  {
    cle: "sujets",
    onglet: ONGLET.CARBURANT,
    libelle: "Les sujets employés",
    icone: "tag",
    question: "De quoi les chantiers parlent-ils, dans leurs mots ?",
    explication: "Des termes trouvés dans ce qu'ils écrivent, là où la taxonomie "
      + "n'a que huit cases."
  },
  {
    cle: "idees",
    onglet: ONGLET.CARBURANT,
    libelle: "Les idées énoncées",
    icone: "north-star",
    question: "Qu'est-ce qui entraîne quoi, et qu'est-ce qui s'enchaîne ?",
    explication: "Le cran au-dessus des termes : non plus de quoi on parle, mais "
      + "ce qui fait quoi. Deux idées qui se composent donnent une conséquence "
      + "que personne n'a écrite."
  },
  {
    cle: "manques",
    onglet: ONGLET.CARBURANT,
    libelle: "Ce qui n'est pas fait",
    icone: "alert",
    question: "Qu'est-ce qui n'existe pas, et qu'on pourrait croire en cours ?",
    explication: "Nommément. Des barres à zéro présenteraient une intention comme "
      + "un chantier en cours (règle 12)."
  }
];

/**
 * La rubrique par défaut : la première du premier onglet.
 *
 * **Déduite, et non écrite.** Écrite, elle aurait pu désigner une rubrique d'un
 * autre onglet que celui qui est en tête — la console se serait ouverte sur un
 * onglet en montrant le contenu d'un autre.
 */
export const LA_RUBRIQUE_PAR_DEFAUT = LES_RUBRIQUES
  .find((une) => une.onglet === ONGLET_PAR_DEFAUT).cle;

/** La rubrique demandée, ramenée à l'une de celles qui existent. */
export function laRubriqueValide(cle) {
  const demande = String(cle ?? "").trim();
  return LES_RUBRIQUES.some((une) => une.cle === demande) ? demande : LA_RUBRIQUE_PAR_DEFAUT;
}

/**
 * L'onglet dont une rubrique relève.
 *
 * C'est ce qui permet à la barre du haut de se souligner au bon endroit sans
 * qu'on lui dise : l'adresse nomme la rubrique, elle en déduit l'onglet.
 */
export function ongletDeLaRubrique(cle) {
  return ongletDeLaConsoleValide(laRubriqueDite(cle).onglet);
}

/**
 * Les rubriques d'un onglet, dans l'ordre où elles sont déclarées.
 *
 * Le rail de gauche n'en montre que celles-là : les six du carburant sous
 * « Carburant », celle des comptes sous « Utilisateurs ». Un rail qui montrerait
 * les sept partout ferait de la barre d'onglets une décoration.
 */
export function lesRubriquesDeLonglet(cle) {
  const voulu = ongletDeLaConsoleValide(cle);
  return LES_RUBRIQUES.filter((une) => une.onglet === voulu);
}

/**
 * Où mène un onglet : sa première rubrique.
 *
 * Un onglet n'est pas une adresse — il n'a pas d'écran à lui. Lui donner le
 * fragment `#utilisateurs` ouvrirait une rubrique inconnue, donc la rubrique par
 * défaut : cliquer sur « Carburant » ramènerait aux comptes.
 */
export function laPremiereRubriqueDe(cle) {
  return (lesRubriquesDeLonglet(cle)[0] ?? LES_RUBRIQUES[0]).cle;
}

/** Une rubrique entière — son nom, sa question, ce qu'elle explique. */
export function laRubriqueDite(cle) {
  const valide = laRubriqueValide(cle);
  return LES_RUBRIQUES.find((une) => une.cle === valide) ?? LES_RUBRIQUES[0];
}
