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
 * (`mon-carnet-coquille.js`), le tableau est pur et testé
 * (`ui/tableau-des-propositions.js`), la lecture est en base
 * (`propositions-supabase.js`). Ce fichier assemble, et c'est tout ce qu'il
 * fait.
 */

import { mountProjectShellChrome, setProjectViewHeader } from "./project-shell-chrome.js";
import { renderCoquilleTransversale } from "./mon-carnet-coquille.js";
import { renderPageDeToutesLesPropositions } from "./toutes-les-propositions-page.js";
import { fetchMesChantiers } from "../services/project-situations-supabase.js";
import { listPropositionsDesProjets } from "../services/propositions-supabase.js";
import { TOUTES_LES_PROPOSITIONS } from "../services/ecrans-transversaux.js";

/**
 * Ce que l'écran sait, entre deux rendus.
 *
 * `propositions` vaut `null` tant qu'on n'a pas lu : ce n'est pas « aucune »,
 * et le tableau le dit plutôt que de rendre une liste vide (règle 5).
 */
const vue = { propositions: null, nomsDesProjets: {}, cherche: "", erreur: "" };

export function renderToutesLesPropositions(root) {
  if (!root) return;

  root.innerHTML = renderCoquilleTransversale({ hoteDOutils: "propositionsToolbarHost" });
  mountProjectShellChrome({ projectId: null, tab: "propositions" });
  setProjectViewHeader({
    contextLabel: TOUTES_LES_PROPOSITIONS.nom, variant: "propositions", hideBar: true
  });

  const contenu = document.getElementById("project-content");
  if (!contenu) return;

  vue.propositions = null;
  vue.erreur = "";
  redessiner(contenu);
  charger(contenu).catch(() => undefined);
}

async function charger(contenu) {
  const chantiers = await fetchMesChantiers().catch(() => []);
  vue.nomsDesProjets = Object.fromEntries(chantiers.map((projet) => [projet.id, projet.name]));

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
  contenu.innerHTML = renderPageDeToutesLesPropositions(vue);
  brancher(contenu);
}

/**
 * **Le curseur est remis là où il était.** Sans cela, le deuxième caractère le
 * renverrait au début du champ et la saisie deviendrait impossible — c'est le
 * défaut qu'on répare une fois par écran qui redessine à la frappe.
 */
function brancher(contenu) {
  const champ = contenu.querySelector("[data-propositions-recherche]");
  if (!champ) return;

  champ.oninput = (event) => {
    const ou = event.target.selectionStart;
    vue.cherche = String(event.target.value || "");
    redessiner(contenu);

    const remis = contenu.querySelector("[data-propositions-recherche]");
    if (!remis) return;
    remis.focus();
    const position = Number.isFinite(ou) ? ou : remis.value.length;
    remis.setSelectionRange(position, position);
  };
}
