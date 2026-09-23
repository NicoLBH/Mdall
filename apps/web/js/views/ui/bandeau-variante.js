/**
 * Le bandeau qui dit qu'on ne lit pas la mémoire du projet.
 *
 * ## Pourquoi il est aussi voyant
 *
 * Le seul vrai danger d'une variante est d'oublier qu'on y est. Un badge
 * discret ne survit pas à un aller-retour à la machine à café : on revient,
 * on lit une cote de fondation, on la note, et elle est fausse.
 *
 * Ce bandeau porte donc une couleur qui ne sert à rien d'autre dans
 * l'application, il est collé en haut de la zone lue, et la sortie y est
 * toujours visible. On ne peut pas ne pas le voir.
 *
 * ## Ce qu'il dit d'autre
 *
 * Qu'il n'y a **rien à écrire ici** : tant qu'une variante est ouverte, les
 * gestes qui font entrer quelque chose en mémoire sont retirés. Écrire depuis
 * une lecture fausse est le seul moyen qu'une variante avait de salir la
 * mémoire, et on le ferme.
 *
 * Et que la mémoire a **bougé depuis**, le cas échéant : une variante n'est
 * vraie que de la mémoire sur laquelle elle a été calculée, et une variante
 * périmée a exactement le même air qu'une variante fraîche.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { abandonnerLaVariante } from "../../services/variante-en-cours.js";

const texte = (valeur) => String(valeur ?? "").trim();
const accorde = (compte, singulier, pluriel) => (compte > 1 ? pluriel : singulier);

/**
 * Le bandeau, ou rien du tout.
 *
 * @param {object|null} variante celle qu'on essaie
 * @param {object} [options]
 * @param {boolean} [options.aBouge] la mémoire a changé depuis le calcul
 * @param {string} [options.suppose] ce dont elle part et qu'un document plus récent a revu
 */
export function renderBandeauVariante(variante, { aBouge = false, seulement = false, suppose = "" } = {}) {
  if (!variante) return "";

  const touchees = Number(variante.recalculees ?? 0) + Number(variante.aRevoir ?? 0);
  // Une variante peut porter plusieurs substitutions. Les dire toutes : n'en
  // nommer qu'une laisserait croire qu'on lit la mémoire sous un seul écart.
  const depart = Array.isArray(variante.depart) ? variante.depart : [];

  return `
    <div class="variante-bandeau${aBouge ? " variante-bandeau--perimee" : ""}" role="status" data-variante-bandeau>
      <span class="variante-bandeau__marque">${svgIcon("beaker", { className: "octicon" })} Variante</span>
      <span class="variante-bandeau__quoi">
        ${depart.map((entree) => `
          <b>${escapeHtml(entree.sujet)}</b> lu à <b>${escapeHtml(entree.vers)}</b>
          au lieu de ${escapeHtml(entree.depuis)}.
        `).join(" ")}
        ${variante.recalculees} ${accorde(variante.recalculees, "valeur relue", "valeurs relues")},
        ${variante.aRevoir} ${accorde(variante.aRevoir, "à revérifier", "à revérifier")}.
      </span>
      ${
        aBouge
          ? `<span class="variante-bandeau__perime">
              ${svgIcon("alert", { className: "octicon" })}
              La mémoire a bougé depuis ce calcul : ces conséquences ne valent plus.
            </span>`
          : ""
      }
      ${
        // « La mémoire a bougé » dit qu'il s'est passé quelque chose, n'importe
        // quoi. Celle-ci nomme **ce dont la variante part** et depuis quel
        // document il a été revu : c'est la seule des deux qui dise si
        // l'hypothèse porte encore sur quelque chose.
        texte(suppose)
          ? `<span class="variante-bandeau__perime">
              ${svgIcon("history", { className: "octicon" })}
              ${escapeHtml(texte(suppose))}
            </span>`
          : ""
      }
      ${
        // Sur trois cents lignes, l'écart est trois lignes. Sans ce filtre il
        // faut le chercher, et une variante qu'on ne sait pas lire ne sert à
        // rien : c'est l'écart qu'on vient voir, pas la mémoire.
        touchees
          ? `<button type="button"
              class="gh-btn gh-btn--sm variante-bandeau__filtre${seulement ? " est-actif" : ""}"
              data-variante-filtre aria-pressed="${seulement ? "true" : "false"}">
              ${svgIcon(seulement ? "check" : "file-diff", { className: "octicon" })}
              Ne montrer que ce qui change
            </button>`
          : ""
      }
      <span class="variante-bandeau__rien">Rien ne s'écrit ici.</span>
      <button type="button" class="gh-btn gh-btn--sm variante-bandeau__sortir" data-variante-sortir>
        ${svgIcon("x", { className: "octicon" })} Revenir à la mémoire
      </button>
    </div>
  `;
}

/**
 * Le bouton de sortie, branché.
 *
 * Il ne redessine rien lui-même : l'écran s'est abonné à `quandLaVarianteChange`
 * et se refait tout seul. Deux chemins de redessin pour un seul geste finiraient
 * par diverger.
 */
export function brancherLeBandeauVariante(root) {
  for (const bouton of root.querySelectorAll("[data-variante-sortir]")) {
    bouton.addEventListener("click", () => abandonnerLaVariante());
  }
}
