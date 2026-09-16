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
  GESTES_DES_SUJETS, renderPageDeTousLesSujets, requeteAvecLeStatut
} from "./tous-les-sujets-page.js";
import { quandOnClique } from "./ui/tete-de-tableau.js";
import { normaliserLeTri, triSuivant, TRI } from "../services/tri-des-sujets.js";
import {
  BLOC_DES_FILTRES, basculerUnMenuDenTete, dansUnBlocDeFiltres,
  fermerLesMenusDenTete, ouvrirUnMenuDenTete
} from "./ui/menus-den-tete.js";
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
  charge: null, personnes: [], nomsDesProjets: {}, requete: "", cherchesDesFiltres: {},
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
  contenu.innerHTML = renderPageDeTousLesSujets({ ...vue, moi: moi() });
  brancher(contenu);
}

function brancher(contenu) {
  const barre = contenu.querySelector("[data-sujets-recherche]");
  if (barre) {
    barre.oninput = (event) => {
      const ou = event.target.selectionStart;
      vue.requete = String(event.target.value || "");
      // **Changer la requête ramène à la première page.** Rester à la page
      // douze d'une liste qui n'en fait plus trois montre un tableau vide, et
      // l'on croit que la recherche ne retient rien.
      vue.page = 1;
      redessiner(contenu);
      rendreLeCurseur(contenu, "[data-sujets-recherche]", ou);
    };
  }

  contenu.querySelector("[data-sujets-vider]")?.addEventListener("click", (event) => {
    event.preventDefault();
    vue.requete = "";
    vue.page = 1;
    redessiner(contenu);
  });

  brancherLaPagination(contenu, "sujets-transversaux", (page) => {
    vue.page = page;
    redessiner(contenu);
  });

  const bloc = contenu.querySelector(`[${BLOC_DES_FILTRES}]`);
  if (!bloc) return;

  bloc.querySelectorAll("[data-sujets-menu]").forEach((bouton) => {
    bouton.addEventListener("click", (event) => {
      event.preventDefault();
      basculerUnMenuDenTete(contenu, String(bouton.getAttribute("data-sujets-menu") || ""));
    });
  });

  // **Un clic pose un jeton, il ne navigue pas.** Chaque entrée porte la requête
  // complète qu'elle produirait ; on la recopie telle quelle, et la barre reste
  // l'endroit où la requête se lit et se corrige au clavier.
  bloc.querySelectorAll("[data-sujets-lecture]").forEach((entree) => {
    entree.addEventListener("click", (event) => {
      event.preventDefault();
      const nomDuMenu = nomDuMenuDe(entree);
      vue.requete = String(entree.getAttribute("data-sujets-lecture") || "");
      vue.page = 1;
      redessiner(contenu);
      // Le menu part avec le redessin, et l'on recliquerait le bouton entre deux
      // valeurs d'un champ à choix multiple — où l'on en coche justement
      // plusieurs d'affilée.
      ouvrirUnMenuDenTete(contenu, nomDuMenu);
    });
  });

  bloc.querySelectorAll("[data-sujets-filtre-recherche]").forEach((champ) => {
    champ.addEventListener("input", (event) => {
      const cle = String(champ.getAttribute("data-sujets-filtre-recherche") || "");
      const nomDuMenu = nomDuMenuDe(champ);
      const debut = event.target.selectionStart;
      const fin = event.target.selectionEnd;

      vue.cherchesDesFiltres = {
        ...vue.cherchesDesFiltres, [cle]: String(event.target.value || "")
      };
      redessiner(contenu);
      ouvrirUnMenuDenTete(contenu, nomDuMenu);

      const remis = contenu.querySelector(`[data-sujets-filtre-recherche="${cle}"]`);
      if (!remis) return;
      remis.focus();
      if (Number.isFinite(debut) && Number.isFinite(fin)) remis.setSelectionRange(debut, fin);
    });
  });

  // Un clic ailleurs referme ce qui était ouvert : un menu resté ouvert derrière
  // ce qu'on regarde se lit comme un défaut d'affichage.
  contenu.addEventListener("click", (event) => {
    if (!dansUnBlocDeFiltres(event.target)) fermerLesMenusDenTete(contenu);
  });
}

function nomDuMenuDe(noeud) {
  return String(
    noeud.closest("[data-sujets-menu-liste]")?.getAttribute("data-sujets-menu-liste") || ""
  );
}

/**
 * **Le curseur revient là où il était.** Sans cela, le deuxième caractère le
 * renverrait au début du champ et la saisie deviendrait impossible.
 */
function rendreLeCurseur(contenu, selecteur, ou) {
  const remis = contenu.querySelector(selecteur);
  if (!remis) return;
  remis.focus();
  const position = Number.isFinite(ou) ? ou : remis.value.length;
  remis.setSelectionRange(position, position);
}
