/**
 * Un champ rédigé : un titre, des réponses fréquentes à cocher, et le texte.
 *
 * ## Ce que ce trio résout
 *
 * Beaucoup d'endroits de l'application demandent la même chose : une phrase que
 * la machine sait **proposer**, des réponses que l'usage sait **classer**, et un
 * texte que l'humain doit pouvoir **reprendre en entier**. La notice de
 * sécurité en est le premier cas ; une note sur un plan, une observation sur un
 * document, un article de CCTP en seront d'autres.
 *
 * Les trois vont ensemble, et c'est pour cela que c'est un composant :
 *
 *   - le **titre** dit ce qu'on précise ;
 *   - les **cases** vont vite, se cumulent, et ce qui est coché nourrit la
 *     bibliothèque commune ;
 *   - l'**éditeur** porte le texte **entier**, pas seulement un morceau. Notre
 *     aide sert à remplir vite ; elle ne doit pas empêcher de reprendre. Un cas
 *     particulier finit toujours par arriver, et une phrase qu'on ne peut pas
 *     réécrire oblige à finir le document ailleurs.
 *
 * ## Ce qui se passe quand on a repris la main
 *
 * Dès qu'un texte est réécrit, il l'emporte, et les cases cessent de le
 * réécrire — elles effaceraient sinon le travail de quelqu'un. Elles restent
 * cochables, parce qu'elles servent aussi à classer les réponses fréquentes, et
 * un geste rend la main à la phrase proposée.
 *
 * ## Ce que le composant ne fait pas
 *
 * Il ne sait ni enregistrer, ni compter, ni proposer : il rend du HTML et
 * signale les gestes. Qui appelle décide de ce que cela veut dire.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { renderCommentComposer } from "./comment-composer.js";
import { renderSubjectMarkdownToolbar } from "./subject-rich-editor.js";
import { applyMarkdownComposerAction } from "../../utils/markdown-composer.js";
import { svgIcon } from "../../ui/icons.js";

/** La barre de mise en forme, sans ce qui n'a pas de sens ici. */
const BOUTONS = ["heading", "bold", "italic", "underline", "quote", "code", "link",
  "ordered-list", "bullet-list", "checklist"];

/**
 * Le champ, en HTML.
 *
 * @param {object} options
 * @param {string} options.cle ce qui identifie le champ d'un rendu à l'autre
 * @param {string} options.titre ce qu'on précise — « Nature des planchers »
 * @param {Array<{libelle:string, poids:number}>} options.propositions les réponses fréquentes
 * @param {string[]} options.retenues celles qui sont cochées
 * @param {string} options.texte le texte entier, tel qu'il sera lu
 * @param {boolean} options.repris vrai si le texte a été réécrit à la main
 * @param {boolean} options.ouvert l'éditeur est-il déployé
 * @param {boolean} options.apercu l'onglet « Aperçu » est-il actif
 * @param {string} options.apercuHtml le texte, rendu
 */
export function dessinerChampRedige({
  cle, titre, propositions = [], retenues = [], texte = "",
  repris = false, ouvert = false, apercu = false, apercuHtml = ""
} = {}) {
  const libres = retenues.filter((v) => !propositions.some((p) => p.libelle === v));

  return `
    <section class="champ-redige${ouvert ? " est-ouvert" : ""}" data-champ-redige="${escapeHtml(cle)}">
      <header class="champ-redige__tete">
        <h6>${escapeHtml(titre)}</h6>
        ${repris ? `
          <button type="button" class="champ-redige__rendre" data-champ-rendre="${escapeHtml(cle)}"
                  title="Revenir à la phrase proposée">texte repris — rendre la main</button>` : ""}
      </header>

      <div class="champ-redige__options" role="group" aria-label="${escapeHtml(titre)}">
        ${propositions.map((option) => {
          const coche = retenues.includes(option.libelle);
          return `
            <button type="button" role="checkbox" aria-checked="${coche}"
                    class="champ-redige__option${coche ? " est-coche" : ""}"
                    data-champ-option="${escapeHtml(cle)}" data-champ-valeur="${escapeHtml(option.libelle)}">
              <span class="champ-redige__marque" aria-hidden="true"></span>
              ${escapeHtml(option.libelle)}
              ${option.poids ? `<em title="retenu ${option.poids} fois">${option.poids}</em>` : ""}
            </button>
          `;
        }).join("")}
      </div>
      ${libres.length ? `<p class="champ-redige__libres">Ajouté à la main : ${escapeHtml(libres.join(" et "))}</p>` : ""}

      ${ouvert ? `
        <div class="champ-redige__editeur" data-champ-editeur="${escapeHtml(cle)}">
          ${renderCommentComposer({
            hideAvatar: true, hideTitle: true, hideActions: true,
            previewMode: apercu, previewHtml: apercuHtml,
            previewEmptyHint: "Rien à prévisualiser",
            composerClassName: "champ-redige__composeur",
            textareaId: `champ-${cle}`,
            previewId: `champ-apercu-${cle}`,
            textareaValue: texte,
            placeholder: "Reprenez la phrase entière si la proposition ne convient pas",
            tabWriteAction: `champ-ecrire:${cle}`,
            tabPreviewAction: `champ-apercu:${cle}`,
            textareaAttributes: { "data-champ-texte": cle },
            toolbarHtml: renderSubjectMarkdownToolbar({
              buttonAction: "champ-format", svgIcon, boutons: BOUTONS,
              pieceJointe: false, dispositionGroupee: true,
              extraData: { champCle: cle }
            })
          })}
        </div>` : ""}
    </section>
  `;
}

/**
 * Les gestes du champ, branchés une fois pour toutes.
 *
 * L'écran garde l'état — c'est lui qui sait ce qu'il redessine — et ne reçoit
 * ici que les intentions.
 */
export function brancherChampRedige(root, { onOption, onTexte, onOnglet, onFormat, onRendreLaMain } = {}) {
  if (!root) return;

  root.addEventListener("click", (evenement) => {
    const option = evenement.target.closest("[data-champ-option]");
    if (option) { onOption?.(option.dataset.champOption, option.dataset.champValeur); return; }
    const rendre = evenement.target.closest("[data-champ-rendre]");
    if (rendre) { onRendreLaMain?.(rendre.dataset.champRendre); return; }
    const format = evenement.target.closest('[data-action="champ-format"]');
    if (format) {
      // La mise en forme s'applique ici, pas chez l'appelant : c'est le même
      // geste partout, et le faire réécrire à chaque écran finirait par donner
      // deux gras différents dans la même application.
      const cle = format.dataset.champCle;
      const zone = Array.from(root.querySelectorAll("[data-champ-texte]"))
        .find((el) => el.dataset.champTexte === cle);
      if (zone && applyMarkdownComposerAction(zone, format.dataset.format)) {
        onTexte?.(cle, zone.value);
        zone.focus();
      }
      onFormat?.(cle, format.dataset.format);
      return;
    }
    const onglet = evenement.target.closest('[data-action^="champ-ecrire:"], [data-action^="champ-apercu:"]');
    if (onglet) {
      const [quoi, quelle] = String(onglet.dataset.action).split(":");
      onOnglet?.(quelle, quoi === "champ-apercu");
    }
  });

  // Le texte s'enregistre quand on quitte le champ : enregistrer à chaque
  // frappe ferait un aller-retour par lettre, et l'on écrirait sur un texte
  // qu'on est en train d'écrire.
  root.addEventListener("change", (evenement) => {
    const zone = evenement.target.closest("[data-champ-texte]");
    if (zone) onTexte?.(zone.dataset.champTexte, zone.value);
  });
}
