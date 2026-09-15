/**
 * La situation qu'on est en train d'écrire.
 *
 * ## Le même formulaire que celui d'une vue
 *
 * On composait une situation dans une fenêtre qui demandait d'abord une
 * mécanique — « manuelle » ou « automatique » — avant de demander une
 * intention. C'était l'ordre inverse de la question qu'on se pose : on sait ce
 * qu'on veut suivre, pas comment la base s'y prendra.
 *
 * L'onglet Sujets sait déjà poser cette question. Une vue s'écrit en quatre
 * traits — un habit, un nom, une phrase, une requête — et **le tableau se met à
 * jour dessous pendant qu'on écrit**. Une situation est la même chose, à ceci
 * près qu'elle traverse les chantiers.
 *
 * Voir `docs/le-carnet-prend-la-forme-des-sujets.md`, étape 3.
 *
 * ## Ce que ce module fait, et ce qu'il ne fait pas
 *
 * Il tient la **forme en cours** et dit ce qui l'empêche de s'enregistrer. Il
 * n'écrit rien, ne lit rien, n'appelle rien : une forme entre, une décision
 * sort. C'est pour cela qu'il s'exécute en test, pour de vrai.
 *
 * ## Rien n'est redéclaré ici
 *
 * Les refus, les icônes, les couleurs et la mise en forme de ce qu'on écrira
 * sont ceux des vues. En écrire une seconde version pour les situations ferait
 * deux jeux de règles qui se ressemblent assez pour qu'on les croie identiques
 * et diffèrent assez pour qu'on le voie — exactement ce qu'on répare (règle
 * 10). Ce fichier ne fait que **nommer la chose** et traduire ce qu'on écrit
 * vers les colonnes des situations.
 */

import {
  COULEUR_PAR_DEFAUT, ICONE_PAR_DEFAUT, refusDeLaVue, vueAEcrire
} from "./vues-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le mot de la chose qu'on compose ici.
 *
 * Il vit à un seul endroit : le titre de l'écran, le bouton d'enregistrement et
 * les phrases de refus le prennent tous d'ici. Recopié trois fois, il aurait
 * fini par différer d'une des trois (règle 10).
 */
export const MOT_DE_LA_SITUATION = "situation";

/**
 * Une forme neuve, avec l'habit par défaut.
 *
 * **L'icône et la couleur sont posées dès le départ**, et non laissées vides :
 * le bouton d'habit montre ce qu'on aura, et une case vide ferait croire qu'il
 * faut choisir avant de pouvoir continuer.
 */
export function compositionNeuve() {
  return {
    id: "",
    nom: "",
    description: "",
    requete: "",
    icone: ICONE_PAR_DEFAUT,
    couleur: COULEUR_PAR_DEFAUT,
    habitOuvert: false,
    habitAvant: null,
    refus: ""
  };
}

/**
 * Ce qui empêche d'enregistrer cette situation, ou `""`.
 *
 * **C'est le refus d'une vue**, appliqué à des situations : une requête vide ne
 * montrerait rien, un nom vide ne se retrouve pas dans le rail, et deux
 * situations du même nom ne s'y distinguent plus.
 *
 * Les lectures du rail comptent parmi les homonymes possibles : « Assigné à
 * moi » n'est pas en base, mais elle occupe le rail, et une situation qui
 * doublerait sa requête ferait deux entrées pour une seule question.
 *
 * @param {object} composition la forme en cours
 * @param {object[]} situations celles qui existent déjà — lues telles qu'elles
 *   sortent de la base, c'est-à-dire avec `title` et non `nom`
 * @param {object[]} lectures les entrées réservées du rail
 */
export function refusDeLaComposition({ composition = {}, situations = [], lectures = [] } = {}) {
  return refusDeLaVue({
    requete: composition.requete,
    nom: composition.nom,
    id: texte(composition.id),
    // **La graphie de la base entre, celle des vues sort.** `refusDeLaVue`
    // compare des `nom` ; lui passer des lignes de `situations` telles quelles
    // ferait comparer des `undefined`, et aucun homonyme ne serait jamais vu.
    vues: (Array.isArray(situations) ? situations : []).map((situation) => ({
      id: texte(situation?.id),
      nom: texte(situation?.nom) || texte(situation?.title)
    })),
    lectures
  });
}

/**
 * Ce qu'on enverra en base, une fois la situation acceptée.
 *
 * **La colonne s'appelle `requete`, pas `query`.** Les vues vivent dans la
 * table des recherches épinglées, les situations dans la leur ; c'est la seule
 * chose qui change entre les deux écritures, et c'est ici qu'elle se dit.
 *
 * Les valeurs sont ramenées par `vueAEcrire` : une icône inconnue arrivée d'un
 * formulaire rouvert après un changement de jeu deviendrait une case vide.
 */
export function situationAEcrire(composition = {}) {
  const { query, ...reste } = vueAEcrire({
    requete: composition.requete,
    nom: composition.nom,
    description: composition.description,
    icone: composition.icone,
    couleur: composition.couleur
  });

  return { ...reste, requete: query };
}
