/**
 * La recherche des sujets : un rail, une barre, des filtres dans l'en-tête.
 *
 * ## Les trois posent le même état
 *
 * Le rail écrit une requête toute faite, la barre la modifie, les menus de
 * l'en-tête y ajoutent ou en retirent un jeton. Il n'y a donc **qu'un seul
 * état filtrant**, et c'est celui qu'on lit à l'écran. Chacun de ces trois
 * gestes se retrouve dans la barre, peut se corriger au clavier, se copier, se
 * coller et s'épingler.
 *
 * Un menu qui tiendrait sa propre case finirait par dire autre chose que la
 * barre, et l'on ne saurait plus lequel commande (règle 4). C'est déjà arrivé
 * deux fois sur cet écran-ci.
 *
 * ## Les mêmes gestes que la Mémoire, parce que c'est la même barre
 *
 * `query-bar.js` a été écrit sans connaître aucun écran, précisément pour
 * servir ici. Le miroir coloré, les suggestions au curseur, le bouton
 * d'épingle : tout vient de là, et rien n'est réécrit. Deux barres de
 * recherche se ressembleraient assez pour qu'on ne remarque leurs différences
 * qu'en se trompant.
 *
 * Ce module **dessine** ; il ne décide de rien. Les décisions sont dans
 * `champs-des-sujets.js` et `rail-des-sujets.js`, où elles s'exécutent en test.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderProjectRail } from "../ui/project-rail.js";
import {
  renderNavList, renderNavListDivider, renderNavListGroup, renderNavListItem
} from "../ui/nav-list.js";
import { renderQueryMirror } from "../../services/query-bar.js";
import { phraseDesIgnores } from "../../services/champs-des-sujets.js";
import { epinglesDuRail, railDesSujets } from "../../services/rail-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le rail : les lectures, puis les vues, puis les autres écrans du domaine.
 *
 * ## Trois groupes, et le trait les sépare
 *
 * **Les lectures** filtrent la liste qu'on regarde : tous, ce qui m'est
 * assigné, ce que j'ai ouvert, où l'on m'a nommé, ce qui a bougé. Elles posent
 * une requête dans la barre, et la barre reste modifiable.
 *
 * **Les vues** sont les recherches qu'on a épinglées : les mêmes requêtes, mais
 * écrites par qui regarde plutôt que par le produit.
 *
 * **Les autres écrans** — Situations, Objectifs, Labels — ne filtrent rien :
 * ils changent de page. Ils étaient dans la barre du haut, où ils voisinaient
 * avec des boutons d'action ; ici, ils voisinent avec ce qu'ils sont, c'est-à-
 * dire d'autres façons de regarder le même domaine.
 *
 * ## La coque vient du composant partagé
 *
 * `project-rail.js` porte le calage du haut au défilement, le repli calé en
 * bas et la poignée de largeur. La Mémoire s'en sert, l'Atelier aussi. Une
 * seconde coque aurait divergé au premier changement — et celle-ci porte assez
 * de détails pour être fausse avant d'être finie (règle 10).
 */
export function renderRailDesSujetsHtml({
  sujets = [], champs = [], requete = "", meta = {}, moi = "", maintenant = Date.now(),
  epingles = [], replie = false, sousVue = "subjects"
} = {}) {
  const { lectures } = railDesSujets({ sujets, champs, requete, meta, moi, maintenant });
  const posees = epinglesDuRail(epingles, requete);

  const uneLecture = (lecture) => renderNavListItem({
    label: lecture.nom,
    iconHtml: svgIcon(lecture.icone, { className: "octicon" }),
    // Un compte qu'on ne peut pas calculer ne s'affiche pas : zéro serait un
    // mensonge (règle 5).
    trailing: lecture.combien === null ? "" : String(lecture.combien),
    isActive: lecture.active && sousVue === "subjects",
    dataAttributes: {
      "data-sujets-lecture": lecture.requete,
      // Replié, le libellé n'est plus lisible : l'infobulle le redonne, et le
      // compte avec lui.
      "data-tooltip": replie
        ? `${lecture.nom}${lecture.combien === null ? "" : ` (${lecture.combien})`}`
        : ""
    }
  });

  const uneEpingle = (epingle) => renderNavListItem({
    label: epingle.nom,
    iconHtml: svgIcon("pin", { className: "octicon" }),
    isActive: epingle.active && sousVue === "subjects",
    title: epingle.requete,
    dataAttributes: {
      "data-sujets-lecture": epingle.requete,
      "data-tooltip": replie ? epingle.nom : ""
    },
    actionHtml: `<button type="button" class="bouton-discret sujets-rail__decrocher"
      data-sujets-decrocher="${escapeHtml(epingle.id)}"
      title="Retirer cette épingle" aria-label="Retirer cette épingle">
      ${svgIcon("x", { className: "octicon" })}
    </button>`
  });

  /** Un autre écran du domaine : il change de page, il ne filtre rien. */
  const unEcran = (cle, nom, icone, attribut) => renderNavListItem({
    label: nom,
    iconHtml: svgIcon(icone, { className: "octicon" }),
    isActive: sousVue === cle,
    dataAttributes: { [attribut]: cle, "data-tooltip": replie ? nom : "" }
  });

  return renderProjectRail({
    id: "sujetsRail",
    label: "Lectures des sujets",
    collapsed: replie,
    navHtml: renderNavList({
      label: "Lectures des sujets",
      html: `
        ${renderNavListGroup({ items: lectures.map(uneLecture) })}
        ${renderNavListDivider()}
        ${posees.length > 0
          ? renderNavListGroup({ label: "Vues", items: posees.map(uneEpingle) })
          : `<p class="sujets-rail__vide">Aucune vue épinglée. Épinglez une recherche pour la retrouver ici.</p>`}
        ${renderNavListDivider()}
        ${renderNavListGroup({
          items: [
            unEcran("situations", "Situations", "project", "data-sujets-ecran"),
            unEcran("objectives", "Objectifs", "milestone", "data-sujets-sousvue"),
            unEcran("labels", "Labels", "tag", "data-sujets-sousvue")
          ]
        })}
      `
    })
  });
}

/**
 * La barre, sur toute la largeur du tableau.
 *
 * Elle précède les filtres parce que c'est par elle qu'on commence : on cherche
 * un mot, et on affine ensuite. Le miroir, sous le champ, colore les jetons
 * reconnus — c'est ce qui distingue d'un coup d'œil `label:cr-chantier`, qui
 * filtre, de `label:zoiseau`, qui cherche le mot.
 */
export function renderRechercheDesSujetsHtml({ requete = "", champs = [], ignores = [] } = {}) {
  const dite = phraseDesIgnores(ignores);
  const remplie = Boolean(texte(requete));

  return `
    <div class="memory-search sujets-search gh-field-focus">
      <div class="memory-search__field">
        <div class="memory-search__mirror" aria-hidden="true">${renderQueryMirror(requete, champs)}</div>
        <input
          type="search"
          class="gh-input memory-search__input"
          placeholder="Chercher un sujet — un mot du titre, statut:ouvert, label:…"
          value="${escapeHtml(requete)}"
          aria-label="Chercher un sujet"
          data-sujets-recherche
        >
        <div class="memory-search__gestes">
          <button type="button" class="bouton-discret memory-search__geste" data-sujets-epingler
            title="Épingler cette recherche" aria-label="Épingler cette recherche"
            ${remplie ? "" : "disabled"}>
            ${svgIcon("pin", { className: "octicon" })}
          </button>
          <button type="button" class="bouton-discret memory-search__geste" data-sujets-vider
            title="Effacer la recherche" aria-label="Effacer la recherche"
            ${remplie ? "" : "disabled"}>
            ${svgIcon("x", { className: "octicon" })}
          </button>
        </div>
      </div>
      <span class="memory-search__icon" aria-hidden="true">${svgIcon("search", { className: "octicon" })}</span>
      <div class="memory-search__suggestions" data-sujets-suggestions hidden role="listbox"
        aria-label="Compléter la recherche"></div>
    </div>
    ${dite ? `<p class="sujets-search__reserve mono-small">${escapeHtml(dite)}</p>` : ""}
  `;
}

/**
 * Un menu de filtre pour l'en-tête du tableau.
 *
 * **Il pose un jeton, il ne retient rien.** Chaque entrée porte la requête
 * complète qu'elle produirait : le clic la recopie dans la barre, et c'est
 * tout. Le menu n'a donc aucun état à lui, et ne peut pas contredire ce qui est
 * écrit.
 *
 * **Sans bordure.** Un filtre n'est pas une action : l'encadrer comme un bouton
 * en fait une chose à cliquer, alors qu'on ne le remarque que lorsqu'on cherche
 * à réduire la liste.
 */
export function renderFiltreDenTeteHtml({ id, champ, requete = "", enCours = "", poser = null } = {}) {
  if (!champ || typeof poser !== "function") return "";

  const choisie = champ.values.find((valeur) => valeur.value === enCours) ?? null;
  const nom = choisie ? choisie.label : champ.label;

  return `
    <div class="issues-head-menu sujets-head-menu${choisie ? " est-posee" : ""}">
      <button class="issues-head-menu__btn" id="${escapeHtml(id)}Btn" type="button"
        aria-haspopup="true" aria-expanded="false">
        <span>${escapeHtml(nom)}</span>
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu issues-head-menu__dropdown" id="${escapeHtml(id)}Dropdown">
        ${[{ value: "", label: `Tous — ${champ.label.toLowerCase()}` }, ...champ.values].map((valeur) => {
          const active = valeur.value === enCours;
          return `
            <button class="gh-menu__item ${active ? "is-active" : ""}" type="button"
              data-sujets-lecture="${escapeHtml(poser(valeur.value))}">
              <span class="gh-menu__check">${active ? svgIcon("check", { className: "octicon" }) : ""}</span>
              ${escapeHtml(valeur.label)}
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}
