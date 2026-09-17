/**
 * « Ouvrir un écran », exécuté depuis la conversation.
 *
 * ## Pourquoi au navigateur
 *
 * Le serveur ne peut pas changer l'adresse d'une page. Et il n'a pas la liste
 * des projets de la personne — le navigateur l'a déjà chargée pour construire
 * le contexte transversal. La porter au serveur en ferait une seconde lecture
 * de la même chose (règle 4).
 *
 * ## Le nom, et pas l'identifiant
 *
 * Le modèle **nomme** le projet ; c'est ici qu'on le reconnaît. Lui faire
 * choisir un identifiant aurait produit, tôt ou tard, un chiffre plausible qui
 * désigne un projet réel — celui de quelqu'un d'autre —, et rien à l'écran
 * n'aurait dit que ce n'était pas celui qu'on demandait.
 *
 * ## Trois réponses, et pas deux
 *
 * Reconnu, **plusieurs**, aucun. Confondre les deux derniers serait la faute :
 * « je n'ai pas trouvé » et « j'en ai trouvé deux » n'appellent pas la même
 * suite, et choisir le premier des deux ouvrirait le mauvais chantier sans que
 * personne ne l'ait demandé (`docs/fondamentaux.md`, règle 5).
 *
 * ## Ce module ne déplace personne
 *
 * Il reconnaît, il compose l'adresse, il la rend. Le déplacement a lieu quand
 * le tour est fini et la réponse enregistrée : partir au milieu emporterait la
 * conversation qu'on est en train d'écrire.
 */

import { ECRANS_DU_PROJET, ecranDuProjet, routeDeLEcran } from "../../vendor/utilitaires/ecrans-du-projet.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le titre de l'exécution, tel que le fil l'affiche. */
export const TITRE_NAVIGATION = "Ouvrir un écran";

/**
 * Un nom réduit à ce qui le distingue.
 *
 * Accents, casse et ponctuation partent : « Restaurant scolaire — Le Reposoir
 * (74) » et « restaurant scolaire au reposoir 74 » désignent le même chantier,
 * et personne ne retape un tiret cadratin.
 */
function reduit(valeur) {
  return texte(valeur)
    .toLowerCase()
    .normalize("NFD")
    // Les diacritiques, et eux seuls : `\p{Diacritic}` n'est pas partout.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Les mots-outils du français, qui ne distinguent aucun chantier.
 *
 * Ils sont dans la moitié des noms de projet — « la Médiathèque **des** Gets »,
 * « SCCV **du** Diamant » —, et les compter ferait échouer la reconnaissance sur
 * la seule différence entre « des Gets » et « aux Gets ».
 */
const MOTS_OUTILS = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "au", "aux", "et", "en",
  "sur", "sous", "dans", "pour", "avec", "chez", "par", "ses", "son", "sa"
]);

/** Les mots d'un nom qui portent de l'information. */
function motsUtiles(valeur) {
  return reduit(valeur).split(" ").filter((mot) => {
    if (mot.length < 3 || MOTS_OUTILS.has(mot)) return false;
    // **Un nombre seul ne désigne pas un chantier.** « (74) » est le
    // département : il se dit souvent et ne figure pas toujours dans le nom
    // enregistré. L'exiger ferait rater le projet à cause de la précision qu'on
    // avait donnée pour aider.
    return !/^[0-9]+$/.test(mot);
  });
}

/**
 * Les projets que ce nom peut désigner.
 *
 * Trois passes, de la plus sûre à la plus large, et **on s'arrête à la première
 * qui répond**. Mélanger les trois ferait remonter une correspondance vague à
 * côté d'une exacte, et les deux se vaudraient.
 *
 * @param {string} nom ce que le modèle a recopié
 * @param {{id?: string, name?: string}[]} projets ceux de la personne
 * @returns {object[]} zéro, un, ou plusieurs projets
 */
export function projetsDesignes(nom, projets = []) {
  const cherche = reduit(nom);
  const tous = (Array.isArray(projets) ? projets : []).filter((projet) => texte(projet?.id));
  const mots = motsUtiles(nom);

  // **Un nom qui ne tient qu'à des mots-outils ne désigne rien.** « le », « du »,
  // « 74 » se retrouvent dans la moitié des noms ; les laisser passer ferait
  // ouvrir le premier projet de la liste sur un mot vide de sens.
  if (!cherche || !mots.length) return [];

  const exacts = tous.filter((projet) => reduit(projet?.name) === cherche);
  if (exacts.length) return exacts;

  const contenus = tous.filter((projet) => {
    const sien = reduit(projet?.name);
    return sien && (sien.includes(cherche) || cherche.includes(sien));
  });
  if (contenus.length) return contenus;

  // Dernière passe : tous les mots portants du nom demandé se retrouvent dans
  // celui du projet. « restaurant scolaire au reposoir (74) » reconnaît ainsi
  // « Restaurant scolaire — Le Reposoir » sans reconnaître « Groupe scolaire ».
  return tous.filter((projet) => {
    const sien = reduit(projet?.name);
    return sien && mots.every((mot) => sien.includes(mot));
  });
}

/** Le nom d'un projet, tel qu'on le dit à l'écran. */
function nomDuProjet(projet) {
  return texte(projet?.name) || texte(projet?.id);
}

/**
 * Reconnaître le projet et composer l'adresse, sans y aller.
 *
 * @param {object} options
 * @param {string} options.nom le nom recopié par le modèle
 * @param {string} options.ecran une clé de `ECRANS_DU_PROJET`
 * @param {object[]} options.projets ceux de la personne
 * @returns {{resultat: object, pourLeModele: object}} la même forme que les
 *   autres exécutions : l'appelant n'a pas à savoir laquelle il traite.
 */
export function ouvrirUnEcran({ nom = "", ecran = "", projets = [] } = {}) {
  const destination = ecranDuProjet(ecran);

  // Une clé hors de l'énumération ne se rapproche pas de la plus proche :
  // « memoire » et « documents » n'ouvrent pas le même écran.
  if (!destination) {
    const refus = {
      statut: "refus",
      titre: TITRE_NAVIGATION,
      message: `« ${texte(ecran) || "—"} » n'est pas un écran de projet.`
    };
    return {
      resultat: refus,
      pourLeModele: {
        ouvert: false,
        raison: "ecran-inconnu",
        ecrans: ECRANS_DU_PROJET.map((connu) => connu.cle)
      }
    };
  }

  const trouves = projetsDesignes(nom, projets);

  if (trouves.length !== 1) {
    // **On ne choisit pas.** Deux projets qui répondent et aucun qui répond
    // sont deux situations différentes, et le modèle doit pouvoir les dire
    // différemment : l'une redemande lequel, l'autre redemande le nom.
    const raison = trouves.length ? "plusieurs-projets" : "projet-introuvable";
    const message = trouves.length
      ? `Plusieurs projets répondent à « ${texte(nom)} ». Personne n'a été déplacé.`
      : `Aucun projet ne répond à « ${texte(nom)} ». Personne n'a été déplacé.`;

    return {
      resultat: { statut: "refus", titre: TITRE_NAVIGATION, message },
      pourLeModele: {
        ouvert: false,
        raison,
        demande: texte(nom),
        candidats: trouves.map(nomDuProjet),
        // Ce que la personne suit vraiment : de quoi redemander en citant des
        // noms qui existent, plutôt qu'en redemandant le même mot.
        projets: (Array.isArray(projets) ? projets : []).map(nomDuProjet).filter(Boolean)
      }
    };
  }

  const [projet] = trouves;
  const route = routeDeLEcran(projet.id, destination.cle);

  return {
    resultat: {
      statut: "fait",
      titre: TITRE_NAVIGATION,
      // C'est ce champ qui distingue cette exécution des autres à l'affichage,
      // et c'est lui que le fil relit pour y aller une fois la réponse écrite.
      destination: {
        projetId: texte(projet.id),
        projet: nomDuProjet(projet),
        ecran: destination.cle,
        route
      }
    },
    pourLeModele: {
      ouvert: true,
      projet: nomDuProjet(projet),
      ecran: destination.cle,
      quoi: destination.quoi
    }
  };
}

/**
 * L'adresse où aller, d'après ce qu'un message a exécuté.
 *
 * ## Pourquoi c'est une fonction, et pas trois lignes dans l'écran
 *
 * C'est le maillon entre « l'outil a tourné » et « l'écran a bougé ». Écrit à
 * l'intérieur du fil, il n'était vérifiable que l'application ouverte — et
 * c'est précisément le maillon dont la panne se lit comme un mensonge : le
 * copilote dit qu'il vous emmène, et rien ne bouge.
 *
 * ## Une seule, la première
 *
 * Deux ouvertures dans un même message voudraient dire deux endroits à la fois.
 * On prend la première et l'on ignore les suivantes : la carte de chacune reste
 * dans le fil, et un clic y mène.
 *
 * ## Et rien si l'on y est déjà
 *
 * Réécrire la même adresse ne déplace rien — aucun `hashchange` ne part — mais
 * empile une entrée d'historique, et le bouton « précédent » ne ramènerait
 * nulle part.
 *
 * @param {object[]} executions ce que le message a exécuté
 * @param {string} [hashCourant] `location.hash`, pour ne pas réécrire l'identique
 * @returns {string} l'adresse à écrire, ou `""` quand il n'y a nulle part à aller
 */
export function routeOuAller(executions = [], hashCourant = "") {
  const route = (Array.isArray(executions) ? executions : [])
    .map((execution) => texte(execution?.destination?.route))
    .find(Boolean) ?? "";

  return route === texte(hashCourant) ? "" : route;
}

/**
 * L'outil, tel que la conversation l'appelle.
 *
 * La liste des projets se lit **ici** et non au moment du contexte : une
 * discussion dure, et un projet créé entre-temps doit pouvoir s'ouvrir. La
 * lecture s'injecte pour les tests — sans quoi ce module tirerait la base
 * entière derrière lui et ne s'importerait plus hors d'un navigateur.
 *
 * @param {object} options
 * @param {object} options.entrees ce que le modèle a rempli
 * @param {Function} [options.onEtape] ce qui se raconte pendant
 * @param {Function} [options.lireLesProjets] injecté par les tests
 */
export async function executerLaNavigation({
  entrees = {}, onEtape = null, lireLesProjets = null
} = {}) {
  const dire = (dit, detail = "") => {
    if (typeof onEtape === "function") onEtape({ texte: dit, detail });
  };

  const nom = texte(entrees?.projet);
  const ecran = texte(entrees?.ecran);
  dire("Recherche du projet", nom);

  const lire = lireLesProjets ?? (async () => {
    const module = await import("./project-situations-supabase.js");
    return module.fetchMesChantiers();
  });

  // Une lecture qui échoue ne fait pas tomber le tour : elle rend une liste
  // vide, donc « aucun projet ne répond », donc une question — et non un
  // déplacement au hasard.
  const projets = await Promise.resolve()
    .then(lire)
    .then((lus) => (Array.isArray(lus) ? lus : []))
    .catch(() => []);

  const rendu = ouvrirUnEcran({ nom, ecran, projets });
  dire(
    rendu.resultat.statut === "fait"
      ? `Ouverture de ${rendu.resultat.destination.projet}`
      : "Projet non reconnu",
    rendu.resultat.statut === "fait" ? rendu.resultat.destination.ecran : nom
  );

  return rendu;
}
