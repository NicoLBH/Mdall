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
import { renderPageDeTousLesSujets } from "./tous-les-sujets-page.js";
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

/**
 * Ce que l'écran sait, entre deux rendus.
 *
 * `charge` vaut `null` tant qu'on n'a pas lu : ce n'est pas « aucun sujet »,
 * et le tableau le dit plutôt que de rendre une liste vide (règle 5).
 */
const vue = {
  charge: null, personnes: [], nomsDesProjets: {}, requete: "", cherchesDesFiltres: {}, erreur: ""
};

export function renderTousLesSujets(root) {
  if (!root) return;

  root.innerHTML = renderCoquilleTransversale({ hoteDOutils: "sujetsToolbarHost" });
  mountProjectShellChrome({ projectId: null, tab: "sujets" });
  setProjectViewHeader({ contextLabel: TOUS_LES_SUJETS.nom, variant: "sujets", hideBar: true });

  const contenu = document.getElementById("project-content");
  if (!contenu) return;

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
      redessiner(contenu);
      rendreLeCurseur(contenu, "[data-sujets-recherche]", ou);
    };
  }

  contenu.querySelector("[data-sujets-vider]")?.addEventListener("click", (event) => {
    event.preventDefault();
    vue.requete = "";
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
