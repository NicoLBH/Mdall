/**
 * L'écran de toutes mes propositions.
 *
 * ## Ce qu'il est
 *
 * Le pendant de l'onglet Propositions d'un projet, sans le projet. On ne
 * travaille pas un projet à la fois : « qu'est-ce qui attend une décision ? »
 * est une question qui traverse les projets, et l'on ne va pas ouvrir quinze
 * onglets pour y répondre.
 *
 * ## Ce qu'il ne fait pas
 *
 * **Il n'ouvre pas une proposition.** Une proposition se lit, se discute et se
 * tranche là où son corpus est — dans son projet. Un détail monté ici montrerait
 * la moitié de ce qu'elle est, et la moitié qui manque est celle où l'on décide.
 * Chaque ligne mène donc à l'onglet de son projet.
 *
 * ## Ce qui est à lui, et ce qui ne l'est pas
 *
 * La mise en page est celle des autres écrans sans projet
 * (`mon-carnet-coquille.js`), la grammaire est celle des propositions, le
 * tableau et son en-tête sont ceux de l'onglet d'un projet, la lecture est en
 * base (`propositions-supabase.js`). Ce fichier assemble, et c'est tout ce
 * qu'il fait.
 */

import { mountProjectShellChrome, setProjectViewHeader } from "./project-shell-chrome.js";
import { renderCoquilleTransversale } from "./mon-carnet-coquille.js";
import {
  GESTES_DES_PROPOSITIONS, renderPageDeToutesLesPropositions
} from "./toutes-les-propositions-page.js";
import { fetchMesChantiers } from "../services/project-situations-supabase.js";
import { listPropositionsDesProjets } from "../services/propositions-supabase.js";
import { chargerLesPersonnesDesChantiers } from "../services/profile-supabase-sync.js";
import { TOUTES_LES_PROPOSITIONS } from "../services/ecrans-transversaux.js";
import { brancherLaPagination } from "./ui/pagination-transversale.js";
import { quandOnClique } from "./ui/tete-de-tableau.js";
import { brancherLaRequete } from "./ui/branchement-de-la-requete.js";
import {
  champsDesPropositions, requeteAvecLEtat, requeteDeDepartDesPropositions
} from "../services/champs-des-propositions.js";
import { comptesDesPersonnes } from "./toutes-les-propositions-page.js";
import { normaliserLeTri, triSuivant, TRI } from "../services/tri-des-sujets.js";
import { store } from "../store.js";

/**
 * Ce que l'écran sait, entre deux rendus.
 *
 * `propositions` vaut `null` tant qu'on n'a pas lu : ce n'est pas « aucune »,
 * et le tableau le dit plutôt que de rendre une liste vide (règle 5).
 */
const vue = {
  propositions: null, nomsDesProjets: {}, personnes: [], erreur: "", page: 1,
  cherchesDesFiltres: {},
  /**
   * **On part des ouvertes**, et le jeton est dans la barre.
   *
   * La question posée en arrivant est « qu'est-ce qui attend une décision ? » :
   * une liste qui mêle d'emblée les fusionnées et les refusées y répond mal.
   * Le filtre se **lit** donc à l'écran et s'efface au clavier — un défaut qu'on
   * ne voit nulle part fait chercher où sont passées les autres.
   */
  requete: requeteDeDepartDesPropositions(),
  /** L'ordre demandé. Une seule case. */
  tri: TRI.DERNIERE_ACTIVITE
};

/**
 * Le contenu qu'on redessine.
 *
 * L'écoute de la tête est posée sur le document et lui survit d'un rendu à
 * l'autre : elle doit donc savoir où écrire. L'écran n'a qu'un contenu.
 */
let hote = null;

/** La grammaire de l'écran : celle qu'il montre, et celle que le clic écrit. */
function champsDeLEcran() {
  return champsDesPropositions({
    personnes: comptesDesPersonnes(vue.personnes),
    projets: Object.entries(vue.nomsDesProjets).map(([id, name]) => ({ id, name }))
  });
}

/** Qui regarde — un compte, celui qui a cliqué. */
function moi() {
  return String(store.user?.id ?? "").trim();
}

/**
 * Ce que la tête du tableau demande.
 *
 * Les noms des attributs sont **à cet écran** : `quandOnClique` range ce qu'on
 * lui déclare dans une table à lui, et deux écrans qui partageraient un nom se
 * voleraient leur geste — le dernier monté gagnerait, sans un mot.
 */
function ecouterLaTete() {
  quandOnClique(GESTES_DES_PROPOSITIONS.etat, (valeur) => {
    if (!hote) return;
    // **Le clic écrit dans la barre**, il ne tient pas de case : il n'y a qu'un
    // seul état filtrant, et c'est la requête (règle 4). Recliquer celui qui est
    // allumé l'éteint, et l'on revoit tout.
    vue.requete = requeteAvecLEtat(vue.requete, champsDeLEcran(), valeur);
    // Changer ce que la liste retient change ce qu'est « la première page ».
    vue.page = 1;
    redessiner(hote);
  });

  quandOnClique(GESTES_DES_PROPOSITIONS.tri, (valeur) => {
    if (!hote) return;
    vue.tri = valeur === TRI.PROJET || valeur === TRI.DERNIERE_ACTIVITE
      ? normaliserLeTri(valeur)
      : triSuivant(vue.tri);
    vue.page = 1;
    redessiner(hote);
  });
}

export function renderToutesLesPropositions(root) {
  if (!root) return;

  root.innerHTML = renderCoquilleTransversale({ hoteDOutils: "propositionsToolbarHost" });
  mountProjectShellChrome({ projectId: null, tab: "propositions" });
  setProjectViewHeader({
    contextLabel: TOUTES_LES_PROPOSITIONS.nom, variant: "propositions", hideBar: true
  });

  const contenu = document.getElementById("project-content");
  if (!contenu) return;

  hote = contenu;
  ecouterLaTete();
  vue.propositions = null;
  vue.erreur = "";
  redessiner(contenu);
  charger(contenu).catch(() => undefined);
}

async function charger(contenu) {
  const chantiers = await fetchMesChantiers().catch(() => []);
  vue.nomsDesProjets = Object.fromEntries(chantiers.map((projet) => [projet.id, projet.name]));

  // **Les personnes vont avec.** Sans elles, ni « auteur » ni « décideur » ne se
  // déclarent — deux filtres disparaissent sans un mot, et la ligne ne sait
  // nommer personne.
  vue.personnes = await chargerLesPersonnesDesChantiers(
    chantiers.map((projet) => projet.id)
  ).catch(() => []);

  const lues = await listPropositionsDesProjets(chantiers.map((projet) => projet.id));

  // **`null` n'est pas une liste vide.** La lecture a échoué ; le dire est la
  // seule chose honnête à faire, et le tableau reste en « lecture ».
  vue.erreur = lues === null ? "Les propositions n'ont pas pu être lues." : "";
  vue.propositions = lues;
  redessiner(contenu);
}

function redessiner(contenu) {
  if (!contenu || !contenu.isConnected) return;

  contenu.className = "project-shell__content";
  contenu.innerHTML = renderPageDeToutesLesPropositions({ ...vue, moi: moi() });
  brancher(contenu);
}

function brancher(contenu) {
  brancherLaPagination(contenu, "propositions-transversales", (page) => {
    vue.page = page;
    redessiner(contenu);
  });

  brancherLaRequete(contenu, {
    nom: "propositions",
    etat: vue,
    redessiner: () => redessiner(contenu)
  });
}
