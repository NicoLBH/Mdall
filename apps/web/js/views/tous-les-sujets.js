/**
 * L'écran de tous mes sujets.
 *
 * ## Ce qu'il est
 *
 * L'onglet Sujets d'un projet, sans le projet. « Qu'est-ce qui est bloqué ? »,
 * « qu'est-ce qui porte le label critique ? » sont des questions qui traversent
 * les projets, et l'on ne va pas ouvrir quinze onglets pour y répondre.
 *
 * ## Ce qu'il ne fait pas
 *
 * **Il n'ouvre pas un sujet.** Un sujet se lit, se commente et se ferme là où il
 * est, avec son fil, ses pièces et son arborescence. Chaque ligne mène à
 * l'onglet Sujets de son projet.
 *
 * ## Ce fichier assemble, il ne dessine pas
 *
 * Le dessin est dans `tous-les-sujets-page.js`, qui n'a besoin de rien et
 * s'exécute donc en test. Ici il n'y a que la lecture en base et l'écoute des
 * gestes — ce qui demande un document, et reste dehors.
 *
 * ## Ce que la lecture coûte
 *
 * Une charge de sujets assemble cinq lectures par projet — labels, objectifs,
 * assignés, liens, signaux. Quinze projets font donc soixante-quinze requêtes,
 * lancées en parallèle. C'est le même coût que l'écran des situations, et le
 * réduire touche le chargeur, pas cet écran.
 */

import { mountProjectShellChrome, setProjectViewHeader } from "./project-shell-chrome.js";
import { renderCoquilleTransversale } from "./mon-carnet-coquille.js";
import {
  GESTES_DES_SUJETS, renderPageDeTousLesSujets, requeteAvecLeStatut, requeteDeDepart
} from "./tous-les-sujets-page.js";
import { quandOnClique } from "./ui/tete-de-tableau.js";
import { brancherLeRail, reglagesDuRail } from "./ui/reglages-du-rail.js";
import { brancherLaRequete } from "./ui/branchement-de-la-requete.js";
import { normaliserLeTri, triSuivant, TRI } from "../services/tri-des-sujets.js";
import { mesPersonnes } from "../services/meta-des-sujets.js";
import { fetchMesChantiers } from "../services/project-situations-supabase.js";
import { chargerLesSujetsDesChantiers } from "../services/project-subjects-supabase.js";
import { chargerLesPersonnesDesChantiers } from "../services/profile-supabase-sync.js";
import { TOUS_LES_SUJETS } from "../services/ecrans-transversaux.js";
import { store } from "../store.js";
import { brancherLaPagination } from "./ui/pagination-transversale.js";

/**
 * Ce que l'écran sait, entre deux rendus.
 *
 * `charge` vaut `null` tant qu'on n'a pas lu : ce n'est pas « aucun sujet »,
 * et le tableau le dit plutôt que de rendre une liste vide (règle 5).
 */
const vue = {
  charge: null, personnes: [], nomsDesProjets: {},
  /**
   * **On part des sujets ouverts**, et le jeton est dans la barre.
   *
   * On arrive ici pour savoir ce qu'il reste à faire ; tout montrer d'un coup y
   * mêle des années de sujets réglés. Le filtre se **lit** donc à l'écran et
   * s'efface au clavier — un défaut qu'on ne voit nulle part fait chercher dans
   * la base des sujets qui étaient là depuis le début.
   */
  requete: requeteDeDepart(), cherchesDesFiltres: {},
  erreur: "", page: 1,
  /**
   * L'ordre demandé — **une seule case**, et volontairement : le filtre d'à
   * côté a coûté quatre tours pour avoir vécu dans quatre (règle 4). Le statut,
   * lui, n'a pas de case du tout : il est un jeton de la requête.
   */
  tri: TRI.DERNIERE_ACTIVITE
};

/**
 * Ce que la tête du tableau demande.
 *
 * **L'écoute est posée une fois pour toutes**, au chargement du module, et non
 * à chaque rendu : `quandOnClique` écoute le document et range ce qu'on lui
 * déclare dans une table à lui — la déclarer à chaque redessin n'ajouterait
 * rien et la ferait tenir dans deux endroits.
 *
 * Les noms des attributs sont **à cet écran** : l'onglet des sujets d'un projet
 * déclare les siens, et deux écrans qui partageraient un nom se voleraient leur
 * geste — le dernier monté gagnerait, sans que rien ne le dise.
 */
function ecouterLaTete() {
  quandOnClique(GESTES_DES_SUJETS.statut, (valeur) => {
    if (!hote) return;
    vue.requete = requeteAvecLeStatut(vue, valeur);
    // Changer ce que la liste retient change ce qu'est « la première page ».
    vue.page = 1;
    redessiner(hote);
  });

  quandOnClique(GESTES_DES_SUJETS.tri, (valeur) => {
    if (!hote) return;
    // Le bouton porte déjà ce qu'il demande ; on ne le recalcule que s'il ne
    // porte rien, pour que la bascule reste vraie même sans attribut.
    vue.tri = valeur === TRI.PROJET || valeur === TRI.DERNIERE_ACTIVITE
      ? normaliserLeTri(valeur)
      : triSuivant(vue.tri);
    // Retourner la liste change sa première page : y rester montrerait son
    // milieu.
    vue.page = 1;
    redessiner(hote);
  });
}

/**
 * Le contenu qu'on redessine.
 *
 * L'écoute de la tête est posée sur le document, et non sur lui : elle lui
 * survit d'un rendu à l'autre, et doit donc savoir où écrire. On le garde ici
 * plutôt que de le rechercher — l'écran n'en a qu'un.
 */
let hote = null;

/**
 * Le repli et la largeur du rail : **des réglages à cet écran**.
 *
 * Replier celui de l'onglet Sujets d'un projet n'a aucune raison de replier
 * celui-ci — on ne les regarde pas dans la même intention.
 */
const reglagesDuRailDesSujets = reglagesDuRail("tousLesSujets");

/** De quoi débrancher le rail : ses écoutes sont sur le document. */
let detacherLeRail = null;

export function renderTousLesSujets(root) {
  if (!root) return;

  root.innerHTML = renderCoquilleTransversale({ hoteDOutils: "sujetsToolbarHost" });
  mountProjectShellChrome({ projectId: null, tab: "sujets" });
  setProjectViewHeader({ contextLabel: TOUS_LES_SUJETS.nom, variant: "sujets", hideBar: true });

  const contenu = document.getElementById("project-content");
  if (!contenu) return;

  hote = contenu;
  ecouterLaTete();
  vue.charge = null;
  vue.erreur = "";
  redessiner(contenu);
  charger(contenu).catch(() => undefined);
}

async function charger(contenu) {
  const chantiers = await fetchMesChantiers().catch(() => []);
  vue.nomsDesProjets = Object.fromEntries(chantiers.map((projet) => [projet.id, projet.name]));

  const ids = chantiers.map((projet) => projet.id);
  // **Les personnes vont avec.** Sans elles, ni « assigné », ni « auteur », ni
  // « mention » ne se déclarent — trois filtres disparaissent sans un mot.
  vue.personnes = await chargerLesPersonnesDesChantiers(ids).catch(() => []);

  const charge = await chargerLesSujetsDesChantiers(ids).catch(() => null);
  // `null` n'est pas une charge vide : la lecture a échoué, et le dire est la
  // seule chose honnête à faire.
  vue.erreur = charge ? "" : "Les sujets n'ont pas pu être lus.";
  vue.charge = charge?.rawSubjectsResult ?? null;
  redessiner(contenu);
}

/** Qui regarde — **toutes** mes identités, une par projet. */
function moi() {
  return mesPersonnes({ collaborateurs: vue.personnes, utilisateur: store.user?.id ?? "" });
}

function redessiner(contenu) {
  if (!contenu || !contenu.isConnected) return;

  contenu.className = "project-shell__content";
  contenu.innerHTML = renderPageDeTousLesSujets({
    ...vue,
    moi: moi(),
    railReplie: reglagesDuRailDesSujets.replie(),
    railLargeur: reglagesDuRailDesSujets.largeur()
  });
  brancher(contenu);
}

function brancher(contenu) {
  brancherLaPagination(contenu, "sujets-transversaux", (page) => {
    vue.page = page;
    redessiner(contenu);
  });

  // La poignée de largeur, le calage au défilement, le bouton de repli. On
  // débranche d'abord : `followRailScroll` écoute le document, et un rendu de
  // plus ajouterait une paire d'écouteurs qui mesurent un rail disparu.
  detacherLeRail?.();
  detacherLeRail = brancherLeRail({
    racine: contenu,
    id: "sujetsRail",
    pageSelector: ".project-simple-page--situations",
    reglages: reglagesDuRailDesSujets,
    redessiner: () => redessiner(contenu)
  });

  // **La barre, le rail et les menus posent la même requête**, et une seule
  // écoute les entend tous les trois (`ui/branchement-de-la-requete.js`). Les
  // propositions emploient la même, dans un projet comme à travers tous.
  brancherLaRequete(contenu, {
    nom: "sujets",
    etat: vue,
    redessiner: () => redessiner(contenu)
  });
}
