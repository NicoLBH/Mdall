/**
 * L'écran du référentiel des formes de raisonnement.
 *
 * ## Pourquoi il n'est d'aucun projet
 *
 * Parce que le référentiel n'en est d'aucun, et que c'est sa raison d'être. Le
 * ranger sous un chantier ferait croire qu'il lui appartient, alors qu'il est
 * précisément ce que les chantiers ont en commun.
 *
 * ## Ce qu'il ajoute à ce qui existait
 *
 * On rencontrait le référentiel — une phrase sur une ligne de mémoire, une
 * phrase dans la fenêtre de fermeture — et l'on ne pouvait pas le **visiter**.
 * « Que sait-on trancher ? » n'avait aucun endroit où se poser.
 *
 * ## Ce qu'il ne fait pas
 *
 * **Il ne verse rien, et il ne retire rien.** Une forme sort d'un projet, devant
 * le raisonnement dont elle est tirée, avec la signature de quelqu'un : c'est là
 * que le geste a un sens, et un bouton « verser » posé ici ferait signer une
 * forme qu'on ne regarde pas.
 *
 * **Et rien n'en redescend dans une mémoire.** Ce qu'on apprend ici, c'est où
 * regarder ; c'est au projet de regarder, de proposer, puis de signer.
 *
 * ## Ce qui est à lui, et ce qui ne l'est pas
 *
 * La mise en page est celle des autres écrans sans projet
 * (`mon-carnet-coquille.js`), la page est dans `le-referentiel-page.js`, la
 * lecture est en base. Ce fichier assemble, et c'est tout ce qu'il fait.
 */

import { mountProjectShellChrome, setProjectViewHeader } from "./project-shell-chrome.js";
import { renderCoquilleTransversale } from "./mon-carnet-coquille.js";
import { renderPageDuReferentiel } from "./le-referentiel-page.js";
import { listerLesFormes } from "../services/referentiel-des-formes-supabase.js";
import { LE_REFERENTIEL } from "../services/ecrans-transversaux.js";

/**
 * Ce que l'écran sait, entre deux rendus.
 *
 * `formes` vaut `null` tant qu'on n'a pas lu : ce n'est pas « aucune », et la
 * page le dit autrement (règle 5).
 */
const vue = { formes: null, cherche: "" };

function redessiner(hote) {
  hote.innerHTML = renderPageDuReferentiel({ formes: vue.formes, cherche: vue.cherche });

  const champ = hote.querySelector("[data-referentiel-cherche]");
  if (!champ) return;

  // Le champ se redessine à chaque frappe, et le curseur reviendrait au début.
  // On le remet où il était — sans quoi on tape « profondeur » et l'on obtient
  // « ruednoforp ».
  const ou = champ.value.length;
  champ.focus();
  champ.setSelectionRange(ou, ou);

  champ.addEventListener("input", () => {
    vue.cherche = champ.value;
    redessiner(hote);
  });
}

export function renderLeReferentiel(root) {
  root.innerHTML = renderCoquilleTransversale({ hoteDOutils: "referentielToolbarHost" });
  mountProjectShellChrome({ projectId: null, tab: "referentiel" });
  setProjectViewHeader({ contextLabel: LE_REFERENTIEL.nom, variant: "referentiel", hideBar: true });

  const contenu = document.getElementById("project-content");
  if (!contenu) return;

  vue.formes = null;
  vue.cherche = "";
  redessiner(contenu);

  (async () => {
    vue.formes = await listerLesFormes();
    if (contenu.isConnected) redessiner(contenu);
  })();
}
