/**
 * Les raccourcis de la barre du haut, et leur ordre.
 *
 * ## Pourquoi ils sortent de l'en-tête
 *
 * L'en-tête est un fichier qui parle à l'authentification, et qui n'est donc
 * pas importable hors d'un navigateur. Tant que la liste y vivait, **aucune
 * épreuve ne pouvait dire ce qu'elle contenait ni dans quel ordre** — on la
 * relisait à l'œil, ce qui est la définition d'une intention non vérifiée
 * (règle 12). Le dessin d'un bouton reste là-bas ; ce qu'il y a à dessiner
 * vient d'ici.
 *
 * ## L'ordre, et ce qu'il dit
 *
 * `copilote | sujets | propositions | situations | projets`
 *
 * Il va de ce qu'on fait vers l'endroit où on le fait. Le copilote est la porte
 * de tout le reste ; les sujets et les propositions sont ce qui est en cours ;
 * les situations sont la façon dont on se l'organise ; les projets sont le
 * classeur, et l'on n'y descend que lorsqu'on sait déjà ce qu'on y cherche.
 *
 * **Les projets étaient en tête et ils passent en queue.** L'entrée la plus
 * générale se lit comme la plus importante quand elle est la première, alors
 * qu'elle est celle dont on a le moins besoin : on ouvre rarement Mdall pour
 * regarder la liste de ses chantiers.
 *
 * ## Les noms ne sont pas écrits ici
 *
 * Trois de ces cinq raccourcis mènent à un écran qui se nomme déjà lui-même
 * dans `ecrans-transversaux.js`, et le carnet dans `mon-carnet.js`. Un nom
 * recopié ici serait la quatrième version d'un mot qui en a déjà trois, et
 * c'est toujours celle qu'on ne regarde pas qui reste fausse (règle 10).
 *
 * ## Il est pur
 *
 * Il rend des descriptions : une adresse, un nom, une icône. Aucun DOM, aucun
 * magasin, aucun réseau — c'est l'en-tête qui les dessine.
 */

import { ICONE_DU_CARNET, NOM_DU_CARNET, ROUTE_DU_CARNET } from "./mon-carnet.js";
import { TOUS_LES_PROJETS, TOUS_LES_SUJETS, TOUTES_LES_PROPOSITIONS } from "./ecrans-transversaux.js";

/**
 * Le raccourci des situations referme celle qui est ouverte.
 *
 * **Son adresse ne change pas quand on y est déjà** — on est sur `#situations`
 * avec une situation sélectionnée —, donc le navigateur ne prévient personne et
 * l'écran reste où il est. Le clic doit donc porter un geste, et non seulement
 * un lien. C'est la seule marque de la liste, et elle est nommée pour que le
 * branchement de l'en-tête la retrouve sans la deviner.
 */
export const MARQUE_DES_SITUATIONS = "situations";

/**
 * L'icône des projets.
 *
 * Elle n'est pas dans `ecrans-transversaux.js` : « Tous les projets » n'y porte
 * pas d'icône, parce que le menu de gauche la lui donne autrement. Elle est
 * donc écrite ici, à l'endroit qui en a besoin, plutôt qu'ajoutée là-bas pour
 * un seul usage.
 */
const ICONE_DES_PROJETS = "repo";

/**
 * Les raccourcis qui ne dépendent d'aucun projet, dans l'ordre d'affichage.
 *
 * Le copilote n'y est pas : il vit dans l'Atelier d'un projet, et l'en-tête ne
 * le dessine que là. Hors projet, la barre commence donc aux sujets.
 */
export const RACCOURCIS_GLOBAUX = [
  {
    href: TOUS_LES_SUJETS.route,
    nom: TOUS_LES_SUJETS.nom,
    icone: TOUS_LES_SUJETS.icone,
    marque: ""
  },
  {
    href: TOUTES_LES_PROPOSITIONS.route,
    nom: TOUTES_LES_PROPOSITIONS.nom,
    icone: TOUTES_LES_PROPOSITIONS.icone,
    marque: ""
  },
  {
    href: ROUTE_DU_CARNET,
    nom: NOM_DU_CARNET,
    icone: ICONE_DU_CARNET,
    marque: MARQUE_DES_SITUATIONS
  },
  {
    href: TOUS_LES_PROJETS.route,
    nom: TOUS_LES_PROJETS.nom,
    icone: ICONE_DES_PROJETS,
    marque: ""
  }
];
