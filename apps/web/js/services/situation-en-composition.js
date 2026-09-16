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
  COULEUR_PAR_DEFAUT, ICONE_PAR_DEFAUT, couleurDeLaVue, iconeDeLaVue, refusDeLaVue, vueAEcrire
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
    statut: STATUT.OUVERTE,
    habitOuvert: false,
    habitAvant: null,
    refus: ""
  };
}

/**
 * Ce qui empêche d'enregistrer cette situation, ou `""`.
 *
 * **C'est le refus d'une vue**, appliqué à des situations : un nom vide ne se
 * retrouve pas dans le rail, et deux situations du même nom ne s'y distinguent
 * plus.
 *
 * **Sauf un.** Une vue sans recherche ne montrerait rien, et se refuse ; une
 * situation sans recherche se remplit à la main, et s'enregistre. C'est la
 * seule règle des vues qui ne vaut pas ici, et elle se dit à voix haute plutôt
 * que de se deviner.
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
    // **Une situation sans requête s'enregistre**, et c'est le seul refus des
    // vues qui ne vaut pas ici. Une vue *est* une recherche nommée ; une
    // situation est un endroit où l'on range des sujets, et la requête n'est
    // qu'une façon — commode, et pas la seule — de dire lesquels. Celle qu'on
    // remplit à la main les reçoit un par un, depuis l'onglet Sujets de leur
    // projet, et c'est la porte que la base tient ouverte depuis toujours :
    // `situation_subjects`, qu'une situation « manuelle » lit déjà.
    requeteObligatoire: false,
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
 * Les deux états d'une situation.
 *
 * **Ce n'est pas une recherche.** Une situation fermée est rangée ; sa requête
 * continuerait pourtant de retenir les mêmes sujets. C'est pour cela que l'état
 * ne s'écrit pas dans la requête, et que le formulaire le demande à part.
 */
export const STATUT = { OUVERTE: "open", FERMEE: "closed" };

export function statutDe(valeur) {
  return texte(valeur).toLowerCase() === STATUT.FERMEE ? STATUT.FERMEE : STATUT.OUVERTE;
}

/**
 * La forme d'une situation qu'on rouvre pour la modifier.
 *
 * ## La requête se donne, elle ne se devine pas
 *
 * Une situation d'aujourd'hui porte sa requête. Une situation d'avant portait
 * un `filter_definition`, et le reprendre en requête est une affirmation qui
 * peut échouer — c'est `requete-dun-filtre.js` qui la fait et qui dit quand
 * elle n'aboutit pas. Ce module ne la referait pas mieux : il prend ce qu'on
 * lui donne, et **rien quand on ne lui donne rien**.
 *
 * **Une situation d'avant rouverte sans sa requête devient une situation qu'on
 * remplit à la main**, et c'est ce qu'il faut regarder avant d'enregistrer :
 * son ancien filtre ne s'appliquera plus. Le formulaire le montre — le tableau
 * dessous dit « cette situation se remplit à la main » au lieu de lister ce
 * qu'elle retenait —, et c'est une chose qu'on voit plutôt qu'un refus qu'on
 * subit.
 */
export function compositionDepuisLaSituation(situation = null, { requete = "" } = {}) {
  return {
    ...compositionNeuve(),
    id: texte(situation?.id),
    nom: texte(situation?.title) || texte(situation?.nom),
    description: texte(situation?.description),
    requete: texte(requete),
    icone: iconeDeLaVue(situation?.icon ?? situation?.icone),
    couleur: couleurDeLaVue(situation?.color ?? situation?.couleur).cle,
    statut: statutDe(situation?.status)
  };
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

  return { ...reste, requete: query, status: statutDe(composition.statut) };
}
