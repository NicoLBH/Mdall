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
import { renderSelectMenuSection } from "../ui/select-menu.js";
import { renderTitreDEcranHtml } from "../ui/titre-decran.js";
import { renderQueryMirror } from "../../services/query-bar.js";
import { phraseDesIgnores } from "../../services/champs-des-sujets.js";
import { epinglesDuRail, railDesSujets } from "../../services/rail-des-sujets.js";
import {
  COULEURS_DE_VUE, ICONES_DE_VUE, couleurDeLaVue, iconeDeLaVue, phraseDesVues, phraseDuRefus
} from "../../services/vues-des-sujets.js";

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

  /**
   * Une vue épinglée : **son icône, dans sa couleur**, et son nom.
   *
   * C'est à cela qu'on la reconnaît en descendant le rail — pas à sa requête,
   * qui n'y tiendrait pas, ni à une épingle générique qui les rendrait toutes
   * pareilles. C'est précisément ce que l'écran des vues sert à choisir.
   */
  const uneEpingle = (epingle) => renderNavListItem({
    label: epingle.nom,
    iconHtml: `<span class="sujets-rail__epingle-icone"
      style="color:${escapeHtml(couleurDeLaVue(epingle.couleur).valeur)}">${
      svgIcon(iconeDeLaVue(epingle.icone), { className: "octicon" })}</span>`,
    isActive: epingle.active && sousVue === "subjects",
    title: epingle.requete,
    dataAttributes: {
      "data-sujets-lecture": epingle.requete,
      "data-tooltip": replie ? epingle.nom : ""
    },
    actionHtml: `<button type="button" class="bouton-discret sujets-rail__decrocher"
      data-sujets-derailler="${escapeHtml(epingle.id)}"
      title="Retirer du rail" aria-label="Retirer du rail">
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
        ${renderNavListGroup({
          items: [
            // **« Vues » est un endroit, pas une rubrique.** Une phrase
            // d'explication à sa place — « aucune vue épinglée, épinglez… » —
            // occupait le rail en permanence pour dire qu'il n'y avait rien,
            // et n'offrait rien à cliquer. L'entrée mène à leur écran, vide ou
            // non ; c'est là qu'on en crée une.
            unEcran("views", "Vues", "stack", "data-sujets-sousvue"),
            unEcran("situations", "Situations", "table", "data-sujets-ecran"),
            unEcran("objectives", "Objectifs", "milestone", "data-sujets-sousvue"),
            unEcran("labels", "Labels", "tag", "data-sujets-sousvue")
          ]
        })}
        ${posees.length === 0 ? "" : `
          ${renderNavListDivider()}
          ${renderNavListGroup({ label: "Épinglées", items: posees.map(uneEpingle) })}
        `}
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
 * ## Le bouton garde le nom du champ
 *
 * Il prenait le nom de la valeur choisie : « CR chantier » remplaçait
 * « Labels ». On ne savait plus ce que le menu filtrait, et deux filtres posés
 * côte à côte donnaient une ligne de noms propres qu'il fallait ouvrir un à un
 * pour comprendre. Le champ garde donc son nom et son caret ; **ce qui est
 * coché se compte à côté**, et se lit en toutes lettres dans la barre — qui est
 * l'endroit où la requête se lit.
 *
 * ## Le même menu que la colonne de droite d'un sujet
 *
 * Celui qui sert à poser un assigné, un label, un objectif. Mêmes sections,
 * mêmes entrées, même coche à droite (`select-menu.js`) : ce sont les mêmes
 * listes et le même geste, et deux menus qui se ressemblent sans être les mêmes
 * divergent au premier réglage (règle 10).
 *
 * ## On coche à plusieurs, et ça veut dire « ou »
 *
 * Deux labels cochés cherchent les sujets qui portent l'un **ou** l'autre :
 * c'est la question qu'on se pose en ouvrant le menu. « Et » rendrait presque
 * toujours zéro.
 */
export function renderFiltreDenTeteHtml({ id, champ, requete = "", enCours = [], poser = null } = {}) {
  if (!champ || typeof poser !== "function") return "";

  const cochees = (Array.isArray(enCours) ? enCours : [enCours]).map(texte).filter(Boolean);
  const combien = cochees.length;

  const entrees = champ.values.map((valeur) => {
    const active = cochees.includes(valeur.value);
    return {
      key: `${champ.key}:${valeur.value}`,
      title: valeur.label,
      isSelected: active,
      isActive: active,
      // La coche à droite, comme dans la colonne d'un sujet : c'est là que
      // l'œil la cherche une fois qu'il l'y a vue une fois.
      rightHtml: active ? svgIcon("check", { className: "octicon" }) : "",
      dataAttrs: { "sujets-lecture": poser(valeur.value) }
    };
  });

  // **L'attribut qui ouvre le menu, et celui qui porte sa liste.** Ils sont
  // nommés plutôt que déduits d'un identifiant : c'est ce que la délégation
  // cherche, et un menu sans eux ne s'ouvre pas — ce qui est arrivé.
  return `
    <div class="issues-head-menu sujets-head-menu${combien ? " est-posee" : ""}">
      <button class="issues-head-menu__btn" type="button" data-sujets-menu="${escapeHtml(id)}"
        aria-haspopup="true" aria-expanded="false">
        <span>${escapeHtml(champ.label)}</span>
        ${combien ? `<span class="sujets-head-menu__compte">${combien}</span>` : ""}
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu subject-meta-dropdown issues-head-menu__dropdown sujets-head-menu__liste"
        data-sujets-menu-liste="${escapeHtml(id)}" role="dialog">
        <div class="subject-meta-dropdown__title">${escapeHtml(champ.label)}</div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ items: entrees, emptyTitle: `Aucun ${champ.label.toLowerCase()}` })}
        </div>
        ${combien ? `
          <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>
          <button type="button" class="select-menu__item sujets-head-menu__vider"
            data-sujets-lecture="${escapeHtml(poser(""))}">
            <span class="select-menu__item-mainrow">
              <span class="select-menu__item-content">
                <span class="select-menu__item-title">Tout montrer</span>
              </span>
            </span>
          </button>
        ` : ""}
      </div>
    </div>
  `;
}

/* ── Les vues : leur liste, et leur création ─────────────────────────────── */

/**
 * Le tableau des vues enregistrées.
 *
 * ## Pourquoi un écran, et pas une rubrique du rail
 *
 * Une rubrique montre des noms ; un écran montre ce qu'ils valent. Ici on voit
 * la requête de chaque vue, qui l'a créée, et l'on peut la retirer — trois
 * choses qui ne tiennent pas dans une entrée de rail large de deux cents
 * pixels, et sans lesquelles une liste de douze vues devient illisible.
 *
 * ## Le vide se dit, et se répare
 *
 * Aucune vue n'est un état normal, pas une panne : la phrase dit ce qu'une vue
 * fait, et le bouton est là. Un tableau vide sans rien à cliquer fait chercher
 * où l'on crée.
 */
export function renderTableauDesVuesHtml({ vues = [], menuOuvert = "" } = {}) {
  const liste = Array.isArray(vues) ? vues : [];
  const ouvert = texte(menuOuvert);

  /**
   * Le menu d'une ligne : épingler, et supprimer.
   *
   * **Les deux gestes ne se confondent pas**, et c'est pourquoi ils sont
   * séparés par un filet et que le second est rouge : retirer une vue du rail
   * la range, la supprimer la perd. Un seul bouton pour les deux aurait fait
   * perdre des recherches à qui voulait seulement dégager sa barre de gauche.
   */
  const unMenu = (vue) => `
    <div class="gh-menu sujets-vues__menu" data-sujets-vue-menu-liste="${escapeHtml(vue.id)}"
      role="menu"${vue.id === ouvert ? "" : " hidden"}>
      <button type="button" class="gh-menu__item" role="menuitem"
        data-sujets-vue-epingler="${escapeHtml(vue.id)}">
        ${svgIcon("pin", { className: "octicon" })}
        <span>${vue.auRail ? "Retirer du rail" : "Épingler la vue"}</span>
      </button>
      <div class="gh-menu__separator" role="presentation"></div>
      <button type="button" class="gh-menu__item gh-menu__item--danger" role="menuitem"
        data-sujets-decrocher="${escapeHtml(vue.id)}">
        ${svgIcon("trash", { className: "octicon" })}
        <span>Supprimer</span>
      </button>
    </div>
  `;

  return `
    <section class="sujets-vues">
      ${renderTitreDEcranHtml({
        titre: "Vues",
        actionsHtml: `<button type="button" class="gh-btn gh-btn--primary" data-sujets-vue-nouvelle>
          Nouvelle vue
        </button>`
      })}

      <div class="data-table-shell">
        <div class="data-table-shell__head">
          <span class="mono-small">${escapeHtml(phraseDesVues(liste))}</span>
        </div>

        ${liste.length === 0 ? `
          <p class="sujets-vues__vide">
            Une vue garde une recherche sous un nom, avec son icône, pour la retrouver d'un clic
            dans le rail.
          </p>
        ` : `
          <ul class="sujets-vues__liste">
            ${liste.map((vue) => `
              <li class="sujets-vues__ligne">
                <button type="button" class="sujets-vues__ouvrir"
                  data-sujets-lecture="${escapeHtml(vue.requete)}">
                  <span class="sujets-vues__icone" style="color:${escapeHtml(vue.couleur.valeur)}"
                    aria-hidden="true">${svgIcon(vue.icone, { className: "octicon" })}</span>
                  <span class="sujets-vues__corps">
                    <span class="sujets-vues__nom">${escapeHtml(vue.nom)}</span>
                    ${vue.description
                      ? `<span class="sujets-vues__mot">${escapeHtml(vue.description)}</span>`
                      : ""}
                    <span class="sujets-vues__requete mono-small">${escapeHtml(vue.requete)}</span>
                  </span>
                </button>
                ${vue.auRail
                  ? `<span class="sujets-vues__au-rail" title="Épinglée au rail"
                      aria-label="Épinglée au rail">${svgIcon("pin", { className: "octicon" })}</span>`
                  : ""}
                <div class="sujets-vues__gestes">
                  <button type="button" class="bouton-discret sujets-vues__kebab"
                    data-sujets-vue-menu="${escapeHtml(vue.id)}"
                    aria-haspopup="true" aria-expanded="${vue.id === ouvert}"
                    title="Ce qu'on peut faire de cette vue"
                    aria-label="Ce qu'on peut faire de cette vue">
                    ${svgIcon("kebab-horizontal", { className: "octicon" })}
                  </button>
                  ${unMenu(vue)}
                </div>
              </li>
            `).join("")}
          </ul>
        `}
      </div>
    </section>
  `;
}

/**
 * Le formulaire d'une vue : son habit, son nom, et la recherche qu'elle garde.
 *
 * ## L'ordre est celui de la question
 *
 * On choisit d'abord à quoi elle ressemblera — c'est ce qu'on verra dans le
 * rail —, puis comment elle s'appelle, puis ce qu'elle retient. L'inverse
 * ferait composer une requête sans savoir ce qu'on est en train de fabriquer.
 *
 * ## Le tableau reste dessous
 *
 * On voit ce que la recherche rend **pendant** qu'on l'écrit. Enregistrer une
 * vue sans avoir vu ce qu'elle montre, c'est enregistrer une promesse.
 */
export function renderFormulaireDeVueHtml({
  vue = {}, champs = [], ignores = [], refus = "", tableauHtml = ""
} = {}) {
  const icone = iconeDeLaVue(vue.icone);
  const couleur = couleurDeLaVue(vue.couleur);
  const dit = phraseDuRefus(refus);

  return `
    <section class="sujets-vue-forme">
      ${renderTitreDEcranHtml({ titre: vue.id ? "Modifier la vue" : "Nouvelle vue" })}

      <div class="sujets-vue-forme__habit">
        <span class="sujets-vue-forme__apercu" style="color:${escapeHtml(couleur.valeur)}"
          aria-hidden="true">${svgIcon(icone, { className: "octicon" })}</span>

        <div class="sujets-vue-forme__choix">
          <p class="sujets-vue-forme__intitule">Icône</p>
          <div class="sujets-vue-forme__icones" role="radiogroup" aria-label="Icône de la vue">
            ${ICONES_DE_VUE.map((nom) => `
              <button type="button" class="sujets-vue-forme__icone${nom === icone ? " est-choisie" : ""}"
                role="radio" aria-checked="${nom === icone}" aria-label="${escapeHtml(nom)}"
                data-sujets-vue-icone="${escapeHtml(nom)}">
                ${svgIcon(nom, { className: "octicon" })}
              </button>
            `).join("")}
          </div>

          <p class="sujets-vue-forme__intitule">Couleur</p>
          <div class="sujets-vue-forme__couleurs" role="radiogroup" aria-label="Couleur de la vue">
            ${COULEURS_DE_VUE.map((choix) => `
              <button type="button" class="sujets-vue-forme__couleur${
                  choix.cle === couleur.cle ? " est-choisie" : ""}"
                role="radio" aria-checked="${choix.cle === couleur.cle}"
                style="--sujets-vue-couleur:${escapeHtml(choix.valeur)}"
                title="${escapeHtml(choix.nom)}" aria-label="${escapeHtml(choix.nom)}"
                data-sujets-vue-couleur="${escapeHtml(choix.cle)}"></button>
            `).join("")}
          </div>
        </div>
      </div>

      <label class="sujets-vue-forme__champ">
        <span class="sujets-vue-forme__intitule">Nom</span>
        <input type="text" class="gh-input" data-sujets-vue-nom
          placeholder="Les urgences du lot 03" value="${escapeHtml(vue.nom ?? "")}">
      </label>

      <label class="sujets-vue-forme__champ">
        <span class="sujets-vue-forme__intitule">Description</span>
        <input type="text" class="gh-input" data-sujets-vue-description
          placeholder="À quoi elle sert — facultatif"
          value="${escapeHtml(vue.description ?? "")}">
      </label>

      ${renderRechercheDesSujetsHtml({ requete: vue.requete ?? "", champs, ignores })}

      ${dit ? `<p class="sujets-vue-forme__refus">${escapeHtml(dit)}</p>` : ""}

      <div class="sujets-vue-forme__gestes">
        <button type="button" class="gh-btn" data-sujets-vue-annuler>Annuler</button>
        <button type="button" class="gh-btn gh-btn--primary" data-sujets-vue-enregistrer>
          Enregistrer la vue
        </button>
      </div>

      ${tableauHtml}
    </section>
  `;
}
