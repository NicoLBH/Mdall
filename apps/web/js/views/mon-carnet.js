/**
 * L'écran de mon carnet.
 *
 * ## Ce qu'il remplace
 *
 * Les situations étaient un onglet du projet. Elles n'y avaient pas leur place :
 * une situation dit ce qu'une **personne** se donne à faire, à travers tous ses
 * chantiers. Cet écran est le sien, et il s'atteint de partout.
 *
 * Voir `docs/les-situations-traversent-les-projets.md`, étape 3.
 *
 * ## Le même tableau, exactement
 *
 * Ce n'est pas un second écran des situations : c'est le même, monté ailleurs.
 * Ce qui change est ce qu'il va chercher — mes situations plutôt que celles
 * d'un projet — et cela se décide dans `mon-carnet.js`, à un seul endroit.
 *
 * La mise en page est dans `mon-carnet-coquille.js`, pour qu'un test l'exécute.
 */

import { renderCoquilleTransversale } from "./mon-carnet-coquille.js";
import { renderProjectSituations } from "./project-situations.js";
import { renderProjectSituationsTopBanner } from "./project-situations-runbar.js";
import { mountProjectShellChrome } from "./project-shell-chrome.js";

export function renderMonCarnet(root) {
  if (!root) return;

  root.innerHTML = renderCoquilleTransversale({ banniere: renderProjectSituationsTopBanner() });

  // La coquille du projet, sans projet. `mountProjectShellChrome` ne tient que
  // l'en-tête de vue et le repliement au défilement : ni l'un ni l'autre ne
  // demandent un projet, et le tableau qui suit est celui qu'on connaît.
  mountProjectShellChrome({ projectId: null, tab: "situations" });

  const content = document.getElementById("project-content");
  if (!content) return;

  renderProjectSituations(content);
}
