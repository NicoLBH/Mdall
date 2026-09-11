/**
 * Un enchaînement d'étapes, en boîtes reliées.
 *
 * ## Pourquoi un composant, et pas deux dessins
 *
 * Le chemin d'une exécution — décision, corpus, lecture, avis, suivi — se lisait
 * d'un coup d'œil dans l'écran des Actions. La chaîne d'une variante — la valeur
 * essayée, les utilitaires rejoués, les fonctions natives refaites — se lisait
 * comme une liste, et c'est exactement ce qui a fait qu'un enchaînement pourtant
 * correct a été lu de travers : rien ne disait que la troisième ligne découlait
 * de la deuxième.
 *
 * Les deux montrent la même chose, un enchaînement. Les dessiner deux fois
 * donnerait deux gris, deux rayons de coin et deux flèches, et le jour où l'un
 * change l'autre ne suit pas (règle 4). Il y a donc un seul dessin, et il tourne
 * dans les deux sens.
 *
 * ## Ce qu'une étape porte
 *
 * ```js
 * { id, label, detail, tone, icon, duration, rang, entrees: [], sorties: [] }
 * ```
 *
 * `entrees` et `sorties` sont ce qu'une étape **lit** et ce qu'elle **écrit** :
 * sans elles, on voit une suite de boîtes sans voir pourquoi elles se suivent.
 * Elles sont facultatives — le chemin d'une exécution n'en a pas — et une étape
 * qui n'en déclare pas n'affiche pas de rubrique vide.
 *
 * ## Une file, ou un arbre
 *
 * `rang` est la profondeur de propagation : 0 pour ce qu'on change, 1 pour ce
 * qui en découle directement, 2 pour ce qui découle de cela. **Deux étapes du
 * même rang sont sœurs** — elles ne se suivent pas, elles partent ensemble.
 *
 * Sans rang, le dessin reste une file, et c'est le bon dessin pour le chemin
 * d'une exécution : décision, corpus, lecture, avis se suivent vraiment. Avec
 * rang, la colonne s'indente comme un journal de branches, et l'on voit la
 * fourche — laquelle est l'information principale d'une variante : changer la
 * commune change la neige **et** la cote hors gel, et la neige ne commande pas
 * la cote.
 *
 * L'indentation plutôt que des colonnes côte à côte : le schéma vit dans une
 * bande étroite à droite d'un tableau, et deux boîtes de front y seraient
 * illisibles. C'est aussi la forme qu'on lit déjà ailleurs — `git log --graph`.
 *
 * ## Ce que le composant ne décide pas
 *
 * Ni la couleur d'un ton, ni ce qui est cliquable. Le ton est **donné** par
 * l'appelant, qui sait ce qu'il montre ; et un titre n'est un bouton que si
 * l'appelant nomme l'attribut qui l'écoute. Rendre cliquable un titre qui
 * n'ouvre rien, ce serait promettre un détail qu'on n'a pas.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les deux sens de lecture. Un enchaînement se lit toujours dans l'un des deux. */
export const SENS = { HORIZONTAL: "horizontal", VERTICAL: "vertical" };

/**
 * Le rang d'une étape, ou `null` quand elle n'en déclare pas.
 *
 * `null`, `undefined` et `""` d'abord, avant toute conversion : `Number(null)`
 * vaut **0**, et une étape sans rang se serait rangée au tronc — un rang qu'elle
 * n'a pas revendiqué, et qui aurait suffi à faire passer une file pour un arbre.
 */
function rangDe(etape) {
  const declare = etape?.rang;
  if (declare === null || declare === undefined || declare === "") return null;
  const rang = Number(declare);
  return Number.isFinite(rang) ? Math.max(0, rang) : null;
}

/** Ce qu'une étape lit, ou ce qu'elle écrit. Rien quand elle ne le déclare pas. */
function renderFlux(titre, noms = []) {
  const dits = (Array.isArray(noms) ? noms : []).map(texte).filter(Boolean);
  if (!dits.length) return "";

  return `
    <span class="run-graph__flux">
      <i>${escapeHtml(titre)}</i>
      <span>${dits.map((nom) => escapeHtml(nom)).join(" · ")}</span>
    </span>
  `;
}

/**
 * Une étape : son icône, son titre, ce qu'elle lit, ce qu'elle écrit.
 *
 * Le titre devient un bouton quand l'appelant a nommé un attribut **et** que
 * l'étape est déclarée consultable. Les deux conditions, parce qu'un écran peut
 * avoir des étapes qui s'ouvrent et d'autres qui n'ont rien enregistré.
 */
/**
 * Le jalon d'une étape : là où quelqu'un avait mis son nom.
 *
 * ## Pourquoi sur l'étape, et pas dans une liste à côté
 *
 * Ce que la variante fait tomber était déjà dit — dans une section, en bas, à
 * part. C'est un rapport. Le lire **sur l'étape qui le traverse** en fait autre
 * chose : la chaîne cesse d'être une suite de calculs et devient une suite
 * d'étapes dont certaines ont été actées. C'est toute la différence, et c'est ce
 * qui manquait.
 *
 * ## Rien quand rien n'est croisé
 *
 * Et c'est le cas le plus fréquent. Une mention sur chaque étape ferait un
 * gabarit qu'on apprend à ignorer, et donnerait à l'écran l'air de tenir un
 * registre — ce que Mdall ne fait pas (règle 12).
 */
function renderJalon(jalon = null) {
  const sorte = texte(jalon?.sorte);
  if (!sorte) return "";

  const combien = Number(jalon?.combien) || 0;
  const qui = (jalon?.engagements ?? [])
    .map((engagement) => texte(engagement?.acte?.note).split("—")[0].trim())
    .filter(Boolean);

  return `
    <span class="run-graph__jalon run-graph__jalon--${escapeHtml(sorte)}">
      ${svgIcon("shield", { className: "octicon" })}
      <span>${escapeHtml(
        sorte === "traverse"
          ? `Examinée${combien > 1 ? ` ${combien} fois` : ""}${qui.length ? ` — ${qui[0]}` : ""}`
          : `Ce dont dépend une valeur examinée${qui.length ? ` — ${qui[0]}` : ""}`
      )}</span>
    </span>
  `;
}

function renderEtape(noeud, { attributDuLien = "", consultables = null } = {}) {
  const id = texte(noeud?.id);
  const ouvrable = Boolean(attributDuLien) && (consultables ? consultables.has(id) : true);
  // Le rang décale la boîte, et la feuille de style trace le crochet. Une étape
  // sans rang ne décale rien : c'est une file, et c'est le bon dessin pour elle.
  const rang = rangDe(noeud);

  return `
    <div class="run-graph__node run-graph__node--${escapeHtml(texte(noeud?.tone) || "neutral")}"${
      rang === null ? "" : ` data-run-graph-rang="${rang}" style="--run-graph-rang:${rang}"`
    }>
      <span class="run-graph__head">
        <span class="run-graph__icon">${svgIcon(texte(noeud?.icon) || "dot-fill-pending", { className: "octicon" })}</span>
        ${
          ouvrable
            ? `<button type="button" class="run-graph__label run-graph__label--lien"
                 ${attributDuLien}="${escapeHtml(id)}">${escapeHtml(texte(noeud?.label))}</button>`
            : `<span class="run-graph__label"${
                consultables && attributDuLien
                  ? ` title="Aucun détail n'a été enregistré pour cette étape."`
                  : ""
              }>${escapeHtml(texte(noeud?.label))}</span>`
        }
      </span>
      ${texte(noeud?.detail) ? `<span class="run-graph__detail">${escapeHtml(texte(noeud.detail))}</span>` : ""}
      ${renderFlux("lit", noeud?.entrees)}
      ${renderFlux("écrit", noeud?.sorties)}
      ${renderJalon(noeud?.jalon)}
      ${
        noeud?.duration === null || noeud?.duration === undefined
          ? ""
          : `<span class="run-graph__duration">${escapeHtml(texte(noeud.duree ?? noeud.duration))}</span>`
      }
    </div>
  `;
}

/**
 * L'enchaînement entier, boîtes et liaisons.
 *
 * @param {object[]} noeuds les étapes, dans l'ordre où elles se sont suivies
 * @param {object} options
 * @param {string} [options.sens] `SENS.HORIZONTAL` par défaut
 * @param {string} [options.attributDuLien] l'attribut du bouton, quand un titre s'ouvre
 * @param {Set<string>} [options.consultables] les étapes qui ont quelque chose à ouvrir
 * @param {string} [options.attributDuCanevas] posé sur le canevas, pour le zoom
 */
export function renderEnchainement(noeuds = [], {
  sens = SENS.HORIZONTAL, attributDuLien = "", consultables = null, attributDuCanevas = ""
} = {}) {
  const etapes = Array.isArray(noeuds) ? noeuds.filter(Boolean) : [];
  if (!etapes.length) return "";

  const vertical = sens === SENS.VERTICAL;
  // Un arbre dès qu'une étape est plus profonde qu'une autre. Des étapes toutes
  // du même rang n'ont pas fourché : c'est une file, et on la dessine ainsi.
  const rangs = etapes.map(rangDe).filter((rang) => rang !== null);
  const arbre = vertical && rangs.length === etapes.length && new Set(rangs).size > 1;

  return `
    <div class="run-graph__canvas${vertical ? " run-graph__canvas--vertical" : ""}${
      arbre ? " run-graph__canvas--arbre" : ""
    }"${attributDuCanevas ? ` ${attributDuCanevas}` : ""}>
      ${etapes.map((noeud, position) => `
        ${
          // Le trait qui relie deux boîtes n'a de sens que dans une file : dans
          // un arbre, la boîte suivante n'est pas forcément la suite de la
          // précédente, et un trait entre elles dirait le contraire de ce qui
          // s'est passé. C'est le coude de l'indentation qui relie, à la place.
          position > 0 && !arbre ? `<span class="run-graph__link" aria-hidden="true"></span>` : ""
        }
        ${renderEtape(noeud, { attributDuLien, consultables })}
      `).join("")}
    </div>
  `;
}
