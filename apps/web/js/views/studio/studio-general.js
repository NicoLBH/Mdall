import { registerProjectPrimaryScrollSource } from "../project-shell-chrome.js";

/**
 * Le Copilote de l'Atelier.
 *
 * La page d'accueil expliquait ce qu'était l'Atelier à qui s'y trouvait déjà :
 * quatre paragraphes lus une fois, ignorés ensuite, et qui occupaient la
 * première entrée du rail. Elle est vidée en attendant ce qui doit l'occuper —
 * un copilote qui propose la suite plutôt qu'un texte qui décrit l'endroit.
 */
export function renderStudioGeneral(root) {
  if (!root) return;

  root.innerHTML = `<section class="settings-section is-active"></section>`;

  registerProjectPrimaryScrollSource(root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll"));
}
