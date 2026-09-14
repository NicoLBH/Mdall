/**
 * La petite notification d'avancée, en bas à gauche de l'écran.
 *
 * ## Pourquoi en bas à gauche, et pourquoi si petite
 *
 * Elle accompagne une action qu'on vient de déclencher en haut du tableau. La
 * mettre au milieu obligerait à la chasser pour continuer à lire ; la mettre en
 * haut la poserait sur ce qu'on regarde. En bas à gauche, elle est dans le
 * champ sans être dans le chemin — c'est la place que prennent les notifications
 * de travail en cours partout ailleurs, et l'y mettre évite d'avoir à
 * l'apprendre.
 *
 * ## Le cercle se remplit, et c'est tout ce qu'il dit
 *
 * Un cercle qui se remplit dit **combien c'est fait** sans qu'on ait à lire le
 * compte. Un sablier qui tourne ne dit rien de plus que « attends », et ne
 * distingue pas une écriture lente d'une écriture bloquée.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne compte pas le temps et ne décide pas de disparaître : on lui donne un
 * état venu de `avancee-dun-lot.js`, il rend du HTML. La minuterie est à
 * l'écran, parce que c'est lui qui redessine.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { TON } from "../../services/avancee-dun-lot.js";

/**
 * La notification, ou `""` quand il n'y a rien à montrer.
 *
 * @param {object|null} avancee ce que rend `avanceeDunLot`
 */
export function renderAvanceeDunLotHtml(avancee = null) {
  if (!avancee || !avancee.ton) return "";

  const ton = String(avancee.ton);
  const fini = ton !== TON.COURS;
  // La part passe par une variable CSS : c'est elle que le dégradé conique
  // suit, et la faire varier ne redessine rien d'autre que le cercle.
  const part = Math.min(1, Math.max(0, Number(avancee.part) || 0));

  return `
    <div class="avancee-lot avancee-lot--${escapeHtml(ton)}"
      style="--avancee-part:${(part * 100).toFixed(1)}%"
      role="status" aria-live="polite">
      <span class="avancee-lot__marque" aria-hidden="true">
        ${fini
          // **La coche prend la place du cercle, à sa taille.** Un symbole plus
          // petit ferait sursauter le bloc au moment où il change d'état.
          ? `<span class="avancee-lot__signe">${
            svgIcon(String(avancee.icone || ""), { className: "octicon" })}</span>`
          : `<span class="avancee-lot__cercle"></span>`}
      </span>
      <span class="avancee-lot__mot">${escapeHtml(String(avancee.phrase ?? ""))}</span>
    </div>
  `;
}
