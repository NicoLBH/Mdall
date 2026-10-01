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
 * ## Il est pur
 *
 * Des noms et des phrases. L'écran les dessine, les services les remplissent.
 */

/** La rubrique par défaut : ce dont tout le reste dépend. */
export const LE_CARBURANT = "carburant";

export const LES_RUBRIQUES = [
  {
    cle: LE_CARBURANT,
    libelle: "Le carburant",
    icone: "mail",
    question: "Qu'est-ce que Mdall a reçu, et qu'est-ce que cela permet ?",
    explication: "Des nombres et deux dates — jamais un objet, une adresse ou un "
      + "nom de chantier. Sans matière, aucun prédicteur n'a de chance."
  },
  {
    cle: "reconnaissance",
    libelle: "Ce qui est reconnu",
    icone: "labels-distribution",
    question: "Sur ce qu'on a reçu, qu'est-ce que le système sait nommer ?",
    explication: "Un taux de précision dit qu'on se trompe ; il ne dit jamais sur "
      + "quoi. Domaine par domaine, et sur combien de chantiers."
  },
  {
    cle: "prediction",
    libelle: "Ce qui s'enchaîne",
    icone: "graph",
    question: "Qu'est-ce qui suit quoi, et mieux que par hasard ?",
    explication: "C'est ce que la prédiction sait faire. Une suite se lit dans un "
      + "chantier, jamais en travers de mille."
  },
  {
    cle: "sujets",
    libelle: "Les sujets employés",
    icone: "tag",
    question: "De quoi les chantiers parlent-ils, dans leurs mots ?",
    explication: "Des termes trouvés dans ce qu'ils écrivent, là où la taxonomie "
      + "n'a que huit cases."
  },
  {
    cle: "idees",
    libelle: "Les idées énoncées",
    icone: "north-star",
    question: "Qu'est-ce qui entraîne quoi, et qu'est-ce qui s'enchaîne ?",
    explication: "Le cran au-dessus des termes : non plus de quoi on parle, mais "
      + "ce qui fait quoi. Deux idées qui se composent donnent une conséquence "
      + "que personne n'a écrite."
  },
  {
    cle: "manques",
    libelle: "Ce qui n'est pas fait",
    icone: "alert",
    question: "Qu'est-ce qui n'existe pas, et qu'on pourrait croire en cours ?",
    explication: "Nommément. Des barres à zéro présenteraient une intention comme "
      + "un chantier en cours (règle 12)."
  }
];

/** La rubrique demandée, ramenée à l'une de celles qui existent. */
export function laRubriqueValide(cle) {
  const demande = String(cle ?? "").trim();
  return LES_RUBRIQUES.some((une) => une.cle === demande) ? demande : LE_CARBURANT;
}

/** Une rubrique entière — son nom, sa question, ce qu'elle explique. */
export function laRubriqueDite(cle) {
  const valide = laRubriqueValide(cle);
  return LES_RUBRIQUES.find((une) => une.cle === valide) ?? LES_RUBRIQUES[0];
}
