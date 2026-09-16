/**
 * Ce que le copilote saura faire, et ne sait pas encore.
 *
 * ## Pourquoi ces boutons existent alors qu'ils ne cliquent pas
 *
 * Le libellé et l'icône sont posés maintenant pour que la place soit prise et
 * que la suite ne soit pas une surprise. `disabled` porte la vérité : un bouton
 * qui ferait semblant de fonctionner coûterait plus cher qu'un bouton éteint.
 *
 * Ce qu'ils ne feront jamais, même actifs : agir seuls. « L'Atelier propose, la
 * Mémoire enregistre — une seule porte. » Créer un sujet voudra dire le
 * **préparer**, et laisser quelqu'un le verser.
 *
 * ## Pourquoi ils sont sortis du Copilote
 *
 * L'accueil montre la même saisie, et doit montrer les mêmes trois boutons :
 * c'est ce qui dit que c'est le même outil. Les recopier aurait fait deux listes
 * à tenir d'accord, et celle qu'on oublie est celle qu'on ne regarde pas
 * (règle 10).
 *
 * Et le Copilote parle à la base : il ne s'importe pas dans un test. Ici, il n'y
 * a que des noms et du balisage — on peut donc vérifier que les deux écrans
 * montrent bien les mêmes.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

/** Les trois, dans l'ordre où ils se lisent. */
export const ACTIONS_A_VENIR = [
  { id: "conflits", label: "Résoudre conflits", icon: "bug" },
  { id: "sujet", label: "Créer un sujet", icon: "issue-draft" },
  { id: "proposition", label: "Proposition", icon: "git-pull-request" }
];

/** Les trois boutons, étalés sous la saisie. */
export function renderActionsAVenirHtml() {
  return `
    <div class="copilote-actions" role="group" aria-label="Ce que le copilote saura faire">
      ${ACTIONS_A_VENIR.map((action) => `
        <button type="button" class="copilote-action" data-copilote-action="${escapeHtml(action.id)}" disabled
          title="Bientôt : ${escapeHtml(action.label.toLowerCase())}">
          ${svgIcon(action.icon)}
          <span>${escapeHtml(action.label)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

/** Les mêmes, dans le menu qui les replie dès qu'une conversation existe. */
export function renderActionsAVenirMenuHtml() {
  return ACTIONS_A_VENIR.map((action) => `
    <button type="button" class="copilote-menu__item" role="menuitem"
      data-copilote-action="${escapeHtml(action.id)}" disabled>
      ${svgIcon(action.icon)}
      <span>${escapeHtml(action.label)}</span>
    </button>
  `).join("");
}
