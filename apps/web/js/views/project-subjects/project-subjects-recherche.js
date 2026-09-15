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
import {
  REQUETE_DES_LOTS, laVueDesLotsSePropose, phraseDeLaVueDesLots
} from "../../services/vue-des-lots.js";
import { svgIcon } from "../../ui/icons.js";
import { renderProjectRail } from "../ui/project-rail.js";
import {
  renderNavList, renderNavListDivider, renderNavListGroup, renderNavListItem
} from "../ui/nav-list.js";
import { renderSelectMenuSection } from "../ui/select-menu.js";
import {
  entreeDeSelection, ORDRE_DES_GROUPES, sectionsParGroupe
} from "./entrees-de-selection.js";
import { GROUPE, MARQUAGES, NOMS_DU_GROUPE, phraseDeLaSelection } from "../../services/selection-des-sujets.js";
import { renderTitreDEcranHtml } from "../ui/titre-decran.js";
import { renderQueryMirror } from "../../services/query-bar.js";
import { phraseDesIgnores } from "../../services/champs-des-sujets.js";
import { epinglesDuRail, railDesSujets } from "../../services/rail-des-sujets.js";
import {
  COULEURS_DE_VUE, ICONES_DE_VUE, couleurDeLaVue, gestesDeLaVue, iconeDeLaVue, motsDeLaVue,
  phraseDesVues, phraseDuRefus
} from "../../services/vues-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le groupe de « Moi » : il n'existe que dans un filtre, et passe en tête. */
export const NOM_DU_GROUPE_MOI = "Moi";

/** Sans accent ni casse : on ne tape ni l'un ni l'autre dans un champ de filtre. */
const repli = (valeur) => texte(valeur)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
  epingles = [], replie = false, sousVue = "subjects", menuDesEpingles = false
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
          ${replie
            // **Replié, une liste de noms ne tient pas.** Les entrées y sont
            // réduites à leur icône : douze vues faisaient douze icônes de
            // couleurs, sans un mot, et l'on cliquait au hasard pour retrouver
            // la sienne. Une seule épingle les tient toutes, et les nomme quand
            // on l'ouvre.
            ? renderEpinglesRepliees(posees, {
              ouvert: menuDesEpingles,
              // **L'épingle s'allume à la place de la vue qu'elle cache.**
              // Sans cela rien n'était marqué dans la colonne d'icônes — et,
              // pire, « Sujets » l'était, parce qu'une requête que le rail ne
              // nomme pas y retombait.
              active: sousVue === "subjects" && posees.some((posee) => posee.active)
            })
            : renderNavListGroup({ label: "Épinglées", items: posees.map(uneEpingle) })}
        `}
      `
    })
  });
}

/**
 * Les vues épinglées quand le rail est replié : **une épingle, et leur liste**.
 *
 * ## Pourquoi elles ne restent pas visibles
 *
 * Replié, le rail ne montre que des icônes. Celles des lectures sont les mêmes
 * pour tout le monde et s'apprennent une fois ; celles des vues sont choisies
 * par qui les crée, et douze vues font douze pastilles de couleur sans un mot.
 * On cliquait au hasard pour retrouver la sienne, ce qui est pire que de ne
 * rien montrer : cela coûte un clic **et** une navigation à annuler.
 *
 * Une épingle les tient donc toutes, avec un chevron qui dit qu'il y a quelque
 * chose dessous, et le menu les nomme.
 */
function renderEpinglesRepliees(posees = [], { ouvert = false, active = false } = {}) {
  return `
    <div class="sujets-rail__epingles" data-active="${active}">
      <button type="button" class="sujets-rail__epingles-bouton${ouvert ? " est-ouvert" : ""}"
        data-sujets-epingles-menu="1" aria-haspopup="true" aria-expanded="${ouvert}"
        ${active ? 'aria-current="page" ' : ""}data-tooltip="Vues épinglées"
        aria-label="Vues épinglées">
        ${svgIcon("pin", { className: "octicon" })}
        ${svgIcon("chevron-right", { className: "octicon sujets-rail__epingles-caret" })}
      </button>

      <div class="gh-menu sujets-rail__epingles-liste" role="menu"${ouvert ? "" : " hidden"}>
        <p class="sujets-rail__epingles-intitule">Épinglées</p>
        ${posees.map((epingle) => `
          <button type="button" class="gh-menu__item${epingle.active ? " est-active" : ""}"
            role="menuitem" data-sujets-lecture="${escapeHtml(epingle.requete)}"
            title="${escapeHtml(epingle.requete)}">
            <span class="sujets-rail__epingle-icone"
              style="color:${escapeHtml(couleurDeLaVue(epingle.couleur).valeur)}">${
              svgIcon(iconeDeLaVue(epingle.icone), { className: "octicon" })}</span>
            <span>${escapeHtml(epingle.nom)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
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
export function renderFiltreDenTeteHtml({
  id, champ, requete = "", enCours = [], poser = null, cherche = "", decorDe = null
} = {}) {
  if (!champ || typeof poser !== "function") return "";

  const cochees = (Array.isArray(enCours) ? enCours : [enCours]).map(texte).filter(Boolean);
  const combien = cochees.length;
  const multiple = champ.multiple === true;

  // Ce qu'on tape dans le champ de recherche restreint la liste, et rien
  // d'autre : on cherche une valeur, on ne cherche pas des sujets.
  const retenu = repli(cherche);
  const proposees = champ.values.filter((valeur) => !retenu
    || repli(valeur.label).includes(retenu) || repli(valeur.token ?? valeur.value).includes(retenu));

  const entrees = proposees.map((valeur) => {
    // **La décoration vient de l'écran**, qui seul connaît les avatars, les
    // couleurs des labels et les dates des objectifs. Ce module dessine la
    // forme ; il ne va rien chercher.
    const decor = (typeof decorDe === "function" ? decorDe(valeur) : null) ?? {};

    return {
      ...entreeDeSelection({
        cle: `${champ.key}:${valeur.value}`,
        titre: valeur.label,
        sousTitre: texte(decor.sousTitre),
        choisie: cochees.includes(valeur.value),
        decorHtml: texte(decor.decorHtml),
        attribut: "sujets-lecture",
        valeur: poser(valeur.value)
      }),
      // Le groupe range le trombinoscope — maîtrise d'ouvrage, entreprises.
      // Les labels et les objectifs n'en ont pas.
      groupLabel: texte(decor.groupe)
    };
  });

  // Un trombinoscope se range par groupe — maîtrise d'ouvrage, entreprises. Les
  // labels et les objectifs n'en ont pas, et une section unique sans titre vaut
  // mieux qu'un titre inventé.
  const sections = entrees.some((entree) => entree.groupLabel)
    // **« Moi » en tête.** C'est la valeur la plus fréquente, et la seule qui ne
    // dépende pas de savoir comment on s'appelle dans ce projet. Rangée par
    // ordre alphabétique, elle finissait sous les entreprises.
    ? sectionsParGroupe(entrees, { ordre: [NOM_DU_GROUPE_MOI, ...ORDRE_DES_GROUPES] })
    : [{ title: "", items: entrees }];

  // **L'attribut qui ouvre le menu, et celui qui porte sa liste.** Ils sont
  // nommés plutôt que déduits d'un identifiant : c'est ce que la délégation
  // cherche, et un menu sans eux ne s'ouvre pas — ce qui est arrivé.
  return `
    <div class="issues-head-menu sujets-head-menu${combien ? " est-posee" : ""}">
      <button class="issues-head-menu__btn" type="button" data-sujets-menu="${escapeHtml(id)}"
        aria-haspopup="true" aria-expanded="false">
        <span>${escapeHtml(champ.label)}</span>
        ${combien && multiple ? `<span class="sujets-head-menu__compte">${combien}</span>` : ""}
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu subject-meta-dropdown issues-head-menu__dropdown sujets-head-menu__liste"
        data-sujets-menu-liste="${escapeHtml(id)}" role="dialog">
        <div class="subject-meta-dropdown__title">${escapeHtml(titreDuFiltre(champ))}</div>

        <div class="subject-meta-dropdown__search">
          <span class="subject-meta-dropdown__search-icon" aria-hidden="true">${
            svgIcon("search", { className: "octicon octicon-search" })}</span>
          <input type="search" class="subject-meta-dropdown__search-input"
            data-sujets-filtre-recherche="${escapeHtml(champ.key)}"
            value="${escapeHtml(cherche)}"
            placeholder="Filtrer ${escapeHtml(champ.label.toLowerCase())}" autocomplete="off">
        </div>
        <div class="subject-kanban-dropdown__separator" aria-hidden="true"></div>

        <div class="subject-meta-dropdown__body">
          ${sections.map((section) => renderSelectMenuSection({
            title: section.title,
            items: section.items,
            emptyTitle: `Aucun ${champ.label.toLowerCase()}`,
            emptyHint: retenu ? "Aucun résultat pour cette recherche." : ""
          })).join("")}
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

/**
 * Le titre du menu : le même verbe que dans la colonne d'un sujet.
 *
 * « Sélectionner des assignés » y dit ce qu'on est en train de faire ; ici on
 * ne sélectionne pas, on restreint. Le titre le dit, et c'est la seule chose
 * qui distingue les deux menus.
 */
function titreDuFiltre(champ) {
  return champ.multiple === true
    ? `Filtrer par ${champ.label.toLowerCase()}`
    : `Choisir ${champ.label.toLowerCase()}`;
}

/**
 * Un menu d'action de groupe, à la place d'un filtre.
 *
 * **Le même menu, au même endroit, et c'est voulu.** Quand rien n'est coché, la
 * tête du tableau porte « Labels » et le menu filtre ; quand quelque chose est
 * coché, elle porte « Labels » et le menu **pose** un label sur ce qui est
 * coché. Le geste est le même, la liste est la même, et la sélection dit lequel
 * des deux on fait. Deux rangées de boutons — une pour filtrer, une pour poser —
 * auraient demandé de chercher la bonne à chaque fois.
 *
 * Il n'y a donc pas de menu vide : un champ que le projet ne déclare pas ne
 * figure ni dans les filtres, ni ici.
 */
function renderMenuDeGroupeHtml({ id, nom, icone = "", entrees = [] } = {}) {
  return `
    <div class="issues-head-menu sujets-head-menu sujets-head-menu--groupe">
      <button class="gh-btn gh-btn--sm sujets-groupe__bouton" type="button"
        data-sujets-menu="${escapeHtml(id)}" aria-haspopup="true" aria-expanded="false">
        ${icone ? svgIcon(icone, { className: "octicon" }) : ""}
        <span>${escapeHtml(nom)}</span>
        ${svgIcon("chevron-down", { className: "gh-chevron" })}
      </button>

      <div class="gh-menu subject-meta-dropdown issues-head-menu__dropdown sujets-head-menu__liste"
        data-sujets-menu-liste="${escapeHtml(id)}" role="dialog">
        <div class="subject-meta-dropdown__title">${escapeHtml(nom)}</div>
        <div class="subject-meta-dropdown__body">
          ${renderSelectMenuSection({ items: entrees, emptyTitle: `Aucun ${nom.toLowerCase()}` })}
        </div>
      </div>
    </div>
  `;
}

/**
 * Ce qu'on peut faire des sujets cochés.
 *
 * ## Pourquoi ça remplace les filtres, et ne s'ajoute pas à eux
 *
 * Un compte rendu versé ouvre quarante sujets d'un coup. Les ranger un par un
 * se paie quarante fois trois clics, et personne ne le fait : on laisse les
 * quarante sans label, et la recherche par label ne sert plus à rien. Ce qui
 * manque n'est pas un raccourci, c'est ce qui rend le rangement possible.
 *
 * Les boutons prennent la place des filtres parce que c'est la même question,
 * posée dans l'autre sens — « lesquels portent ce label » devient « pose ce
 * label sur ceux-là » — et parce qu'on ne filtre pas pendant qu'on range : un
 * filtre changé sous une sélection la viderait de ce qu'elle contient.
 *
 * @param {object} options
 * @param {number} options.combien le nombre de sujets cochés
 * @param {object[]} options.champs ceux de `champsDesSujets` — la liste des
 *   labels, des personnes, des situations et des objectifs vient de là, et de
 *   nulle part ailleurs (règle 10)
 */
export function renderActionsGroupeesHtml({ combien = 0, champs = [] } = {}) {
  if (!combien) return "";

  const champDe = (cle) => (Array.isArray(champs) ? champs : []).find((champ) => champ.key === cle);

  /** Les valeurs d'un champ, moins celles qui ne se posent pas. */
  const entreesDe = (cle, groupe) => (champDe(cle)?.values ?? [])
    // « moi » et « aucun » désignent une recherche, pas une valeur qu'on écrit :
    // poser « aucun » sur quarante sujets ne veut rien dire.
    .filter((valeur) => valeur.value !== "aucun" && valeur.value !== "@moi")
    .map((valeur) => ({
      key: `${groupe}:${valeur.value}`,
      title: valeur.label,
      dataAttrs: { "sujets-groupe": `${groupe}:${valeur.value}` }
    }));

  const menus = [
    renderMenuDeGroupeHtml({
      id: "sujets-groupe-marquage",
      nom: NOMS_DU_GROUPE[GROUPE.MARQUAGE],
      icone: "check-circle",
      entrees: MARQUAGES.map((marquage) => ({
        key: `${GROUPE.MARQUAGE}:${marquage.cle}`,
        title: marquage.nom,
        iconHtml: svgIcon(marquage.icone, { className: "octicon" }),
        dataAttrs: { "sujets-groupe": `${GROUPE.MARQUAGE}:${marquage.cle}` }
      }))
    }),
    ...[
      ["label", GROUPE.LABELS, "tag"],
      ["assigné", GROUPE.ASSIGNES, "people"],
      ["situation", GROUPE.SITUATIONS, "table"],
      ["objectif", GROUPE.OBJECTIFS, "milestone"]
    ].map(([cle, groupe, icone]) => {
      const entrees = entreesDe(cle, groupe);
      if (!entrees.length) return "";
      return renderMenuDeGroupeHtml({
        id: `sujets-groupe-${groupe}`, nom: NOMS_DU_GROUPE[groupe], icone, entrees
      });
    })
  ].filter(Boolean).join("");

  return `
    <div class="sujets-groupe">
      ${menus}
    </div>
  `;
}

/**
 * Combien de sujets sont cochés, sur combien.
 *
 * ## Pourquoi c'est ici, et pas dans la rangée des boutons
 *
 * Le compte **prend la place du filtre ouverts/fermés**, à l'autre bout de
 * l'en-tête. Deux raisons, et la seconde est la vraie : on ne filtre pas
 * pendant qu'on range — un filtre changé sous une sélection la viderait de ce
 * qu'elle contient —, et la rangée des actions a besoin de toute sa largeur.
 * Écrit au milieu des boutons, il les poussait hors de la ligne.
 *
 * Il n'est écrit qu'**une fois** : la phrase vit dans `selection-des-sujets.js`,
 * et deux endroits qui comptent la même chose finissent par ne plus dire la
 * même (règle 4).
 */
export function renderCompteDeLaSelectionHtml({ combien = 0, total = 0 } = {}) {
  const dit = phraseDeLaSelection({ combien, total });
  if (!dit) return "";

  return `<span class="sujets-groupe__compte mono-small">${escapeHtml(dit)}</span>`;
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
/**
 * Le menu d'une vue — **le même partout où on l'ouvre**.
 *
 * Le tableau des vues le porte sur chaque ligne ; l'écran d'une vue le porte à
 * côté de « Nouveau sujet ». Ce sont les mêmes gestes sur le même objet :
 * écrits deux fois, ils auraient deux libellés au bout de six mois, et l'un des
 * deux oublierait le filet qui sépare « retirer du rail » de « supprimer »
 * (règle 10).
 *
 * Ce qu'il contient se décide dans `vues-des-sujets.js`, qui s'exécute en test.
 * Ici, on l'habille.
 *
 * @param {object} options
 * @param {object} options.vue
 * @param {boolean} [options.ouvert]
 * @param {boolean} [options.avecModifier] « Modifier la vue » — inutile dans le
 *   tableau des vues, où l'on est déjà sur l'écran qui les modifie.
 */
export function renderMenuDeLaVueHtml({ vue = {}, ouvert = false, avecModifier = false } = {}) {
  const id = texte(vue?.id);

  return `
    <div class="gh-menu sujets-vues__menu" data-sujets-vue-menu-liste="${escapeHtml(id)}"
      role="menu"${ouvert ? "" : " hidden"}>
      ${gestesDeLaVue(vue, { avecModifier }).map((geste) => (geste.separateur
        ? '<div class="gh-menu__separator" role="presentation"></div>'
        : `
          <button type="button" class="gh-menu__item${geste.danger ? " gh-menu__item--danger" : ""}"
            role="menuitem" data-${escapeHtml(geste.attribut)}="${escapeHtml(id)}">
            ${svgIcon(geste.icone, { className: "octicon" })}
            <span>${escapeHtml(geste.nom)}</span>
          </button>
        `)).join("")}
    </div>
  `;
}

/**
 * Dans quelle vue on est, au-dessus du tableau.
 *
 * ## Pourquoi cette ligne existe
 *
 * Une vue est une requête enregistrée : une fois cliquée, l'écran ressemble
 * trait pour trait à n'importe quelle liste filtrée. On ne savait plus dans
 * laquelle on était, et l'on recliquait dans le rail pour vérifier. Son habit
 * et son nom reviennent donc là où l'on regarde — sur la ligne du bouton, à
 * gauche, en face des gestes qu'elle autorise.
 *
 * L'épingle n'est dite que si la vue est au rail : une icône toujours présente
 * ne distingue plus rien.
 */
export function renderTitreDeLaVueHtml(vue = null) {
  if (!vue?.id) return "";

  const couleur = couleurDeLaVue(vue.couleur?.cle ?? vue.couleur);

  return `
    <span class="sujets-vue-titre">
      <span class="sujets-vue-titre__icone" style="color:${escapeHtml(couleur.valeur)}"
        aria-hidden="true">${svgIcon(iconeDeLaVue(vue.icone), { className: "octicon" })}</span>
      <span class="sujets-vue-titre__nom">${escapeHtml(texte(vue.nom))}</span>
      ${vue.auRail === true
        ? `<span class="sujets-vue-titre__rail" title="Épinglée au rail"
            aria-label="Épinglée au rail">${svgIcon("pin", { className: "octicon" })}</span>`
        : ""}
    </span>
  `;
}

/**
 * La ligne grise d'une vue : de qui elle vient, quand elle a bougé, et si elle
 * est au rail.
 *
 * ## Pourquoi ces trois-là, et plus la requête
 *
 * La requête y était, et elle ne servait à rien : on la relit pour retrouver ce
 * qu'on a déjà nommé juste au-dessus. Ce qu'on cherche sur cette ligne, c'est de
 * qui elle vient, si elle est à jour, et si elle est dans le rail — les trois
 * choses qui décident si on l'ouvre, si on la modifie ou si on la supprime.
 *
 * ## L'épingle est un mot, pas seulement une icône
 *
 * Elle était une icône seule, en bout de ligne. Une icône seule se devine ; sur
 * une liste qu'on parcourt, on ne devine pas — on ouvrait le menu pour savoir
 * si la vue était déjà au rail. Elle porte donc son mot.
 *
 * Ce qui manque ne s'invente pas : un compte qu'on ne sait pas nommer et une
 * date qu'on n'a pas sont **passés**, pas remplacés par un tiret (règle 5).
 */
export function renderSousLigneDeVueHtml(vue = {}) {
  const mots = motsDeLaVue({
    auteur: vue?.auteur, miseAJour: vue?.miseAJour, auRail: vue?.auRail
  });

  const morceaux = [
    mots.auteur ? escapeHtml(mots.auteur) : "",
    mots.miseAJour ? escapeHtml(mots.miseAJour) : "",
    mots.epinglee
      ? `<span class="sujets-vues__au-rail">${
        svgIcon("pin", { className: "octicon" })}Épinglée</span>`
      : ""
  ].filter(Boolean);

  if (!morceaux.length) return "";

  return `<span class="sujets-vues__ligne-grise issue-row-meta-text mono-small">${
    morceaux.join(" • ")}</span>`;
}

export function renderTableauDesVuesHtml({ vues = [], menuOuvert = "", lots = 0 } = {}) {
  const liste = Array.isArray(vues) ? vues : [];
  const ouvert = texte(menuOuvert);

  // **La vue des lots se propose, elle ne se crée pas.** Un clic ouvre la
  // recherche ; c'est la personne qui décide de l'enregistrer. Le rail est
  // court, et une vue de plus y coûte une place à celles qu'on regarde tous les
  // jours (règle 1).
  const proposeLesLots = laVueDesLotsSePropose(vues, lots);

  return `
    <section class="sujets-vues">
      ${renderTitreDEcranHtml({
        titre: "Vues",
        actionsHtml: `<button type="button" class="gh-btn gh-btn--primary" data-sujets-vue-nouvelle>
          Nouvelle vue
        </button>`
      })}

      ${proposeLesLots ? `
        <p class="review-empty-note">
          ${escapeHtml(phraseDeLaVueDesLots(lots))}
          <button type="button" class="bouton-discret"
            data-sujets-lecture="${escapeHtml(REQUETE_DES_LOTS)}">Voir les lots</button>
        </p>
      ` : ""}

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
                    ${/*
                      **Les classes du tableau des sujets, telles quelles.** Un
                      titre et sa ligne grise se présentent pareil partout : les
                      redessiner ici avec d'autres noms ferait deux écritures du
                      même dessin, et la seconde divergerait au premier réglage
                      (règle 10). Seule la taille du titre est propre à cette
                      liste, et elle tient en une déclaration.
                    */""}
                    <span class="issue-row-title-grid__title issue-row-subject-title-line">
                      <span class="sujets-vues__nom row-title-trigger theme-text">${
                        escapeHtml(vue.nom)}</span>
                    </span>
                    ${vue.description
                      ? `<span class="sujets-vues__mot">${escapeHtml(vue.description)}</span>`
                      : ""}
                    ${renderSousLigneDeVueHtml(vue)}
                  </span>
                </button>
                <div class="sujets-vues__gestes">
                  <button type="button" class="bouton-discret sujets-vues__kebab"
                    data-sujets-vue-menu="${escapeHtml(vue.id)}"
                    aria-haspopup="true" aria-expanded="${vue.id === ouvert}"
                    title="Ce qu'on peut faire de cette vue"
                    aria-label="Ce qu'on peut faire de cette vue">
                    ${svgIcon("kebab-horizontal", { className: "octicon" })}
                  </button>
                  ${renderMenuDeLaVueHtml({ vue, ouvert: vue.id === ouvert })}
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
  vue = {}, champs = [], ignores = [], refus = "", lectureDoublee = "",
  tableauHtml = "", habitOuvert = false
} = {}) {
  const icone = iconeDeLaVue(vue.icone);
  const couleur = couleurDeLaVue(vue.couleur);
  // Le refus nomme la lecture qu'on double : « le rail fait déjà cette
  // recherche » fait chercher laquelle parmi cinq.
  const dit = phraseDuRefus(refus, { lecture: lectureDoublee });

  return `
    <section class="sujets-vue-forme">
      ${renderTitreDEcranHtml({ titre: vue.id ? "Modifier la vue" : "Nouvelle vue" })}

      <!-- **L'habit à gauche du titre**, sur la même ligne : c'est ce qu'on
           verra dans le rail, et le choisir loin du nom qu'on écrit fait
           composer l'un sans regarder l'autre. -->
      <div class="sujets-vue-forme__ligne">
        <div class="sujets-vue-forme__habit">
          <p class="sujets-vue-forme__intitule" id="sujetsVueHabit">Icône</p>
          <button type="button" class="gh-btn sujets-vue-forme__habit-bouton"
            data-sujets-vue-habit="1" aria-haspopup="dialog"
            aria-expanded="${habitOuvert ? "true" : "false"}" aria-labelledby="sujetsVueHabit"
            style="color:${escapeHtml(couleur.valeur)}">
            ${svgIcon(icone, { className: "octicon" })}
          </button>
          ${habitOuvert ? renderChoixDeLHabitHtml({ icone, couleur }) : ""}
        </div>

        <label class="sujets-vue-forme__champ sujets-vue-forme__champ--titre">
          <span class="sujets-vue-forme__intitule">Titre ${MARQUE_OBLIGATOIRE}</span>
          <input type="text" class="gh-input" data-sujets-vue-nom required
            placeholder="Les urgences du lot 03" value="${escapeHtml(vue.nom ?? "")}">
        </label>
      </div>

      <label class="sujets-vue-forme__champ">
        <span class="sujets-vue-forme__intitule">Description</span>
        <input type="text" class="gh-input" data-sujets-vue-description
          placeholder="À quoi elle sert — facultatif"
          value="${escapeHtml(vue.description ?? "")}">
      </label>

      <div class="sujets-vue-forme__champ">
        <span class="sujets-vue-forme__intitule">Requête ${MARQUE_OBLIGATOIRE}</span>
        <!-- La recherche et les deux gestes sur une seule ligne : on écrit la
             requête, on voit le tableau dessous, on enregistre. -->
        <div class="sujets-vue-forme__requete">
          ${renderRechercheDesSujetsHtml({ requete: vue.requete ?? "", champs, ignores })}
          <div class="sujets-vue-forme__gestes">
            <button type="button" class="gh-btn" data-sujets-vue-annuler>Annuler</button>
            <button type="button" class="gh-btn gh-btn--primary" data-sujets-vue-enregistrer>
              Enregistrer la vue
            </button>
          </div>
        </div>
      </div>

      ${dit ? `<p class="sujets-vue-forme__refus">${escapeHtml(dit)}</p>` : ""}

      ${tableauHtml}
    </section>
  `;
}

/**
 * Ce qui marque un champ obligatoire.
 *
 * **Une étoile, et elle est dite.** Un astérisque muet se lit comme une note de
 * bas de page qu'on cherche ; celui-ci porte son titre, et le lecteur d'écran
 * l'annonce.
 */
const MARQUE_OBLIGATOIRE = '<abbr class="sujets-vue-forme__requis" title="Champ obligatoire">*</abbr>';

/**
 * Le choix de l'habit : une couleur, une icône.
 *
 * ## Pourquoi un menu, et pas deux rangées dans le formulaire
 *
 * Dix-neuf icônes et huit couleurs occupaient la moitié de l'écran en
 * permanence, pour un choix qu'on fait une fois. Elles vivent donc sous le
 * bouton qui les porte — celui-là même qui montre le résultat —, et le
 * formulaire retrouve sa ligne.
 *
 * ## Des cercles, et un disque quand c'est pris
 *
 * Une couleur non choisie est un **contour** : la rangée se lit comme un choix
 * ouvert. Celle qu'on a prise devient un disque plein, avec une coche dedans et
 * un fond gris autour — trois marques pour une, parce que c'est la seule
 * information de cette rangée et qu'une nuance de couleur ne se distingue pas
 * d'une autre au premier regard.
 */
export function renderChoixDeLHabitHtml({ icone = "", couleur = null } = {}) {
  const prise = couleur ?? couleurDeLaVue("");

  return `
    <div class="gh-menu sujets-vue-habit" role="dialog" aria-label="Icône et couleur de la vue">
      <p class="sujets-vue-habit__intitule">Couleur</p>
      <div class="sujets-vue-habit__couleurs" role="radiogroup" aria-label="Couleur de la vue">
        ${COULEURS_DE_VUE.map((choix) => {
          const choisie = choix.cle === prise.cle;
          return `
            <button type="button" class="sujets-vue-habit__couleur${choisie ? " est-choisie" : ""}"
              role="radio" aria-checked="${choisie}"
              style="--sujets-vue-couleur:${escapeHtml(choix.valeur)}"
              title="${escapeHtml(choix.nom)}" aria-label="${escapeHtml(choix.nom)}"
              data-sujets-vue-couleur="${escapeHtml(choix.cle)}">
              ${choisie ? svgIcon("check", { className: "octicon" }) : ""}
            </button>
          `;
        }).join("")}
      </div>

      <p class="sujets-vue-habit__intitule">Icône</p>
      <div class="sujets-vue-habit__icones" role="radiogroup" aria-label="Icône de la vue">
        ${ICONES_DE_VUE.map((nom) => `
          <button type="button" class="sujets-vue-habit__icone${nom === icone ? " est-choisie" : ""}"
            role="radio" aria-checked="${nom === icone}" aria-label="${escapeHtml(nom)}"
            data-sujets-vue-icone="${escapeHtml(nom)}">
            ${svgIcon(nom, { className: "octicon" })}
          </button>
        `).join("")}
      </div>

      <div class="sujets-vue-habit__gestes">
        <button type="button" class="gh-btn" data-sujets-vue-habit-annuler="1">Annuler</button>
        <button type="button" class="gh-btn gh-btn--primary" data-sujets-vue-habit-appliquer="1">
          Appliquer
        </button>
      </div>
    </div>
  `;
}
