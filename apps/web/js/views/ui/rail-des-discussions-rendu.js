/**
 * Le rail des discussions, **dessiné** : rien que du balisage.
 *
 * ## Pourquoi c'est un fichier à part
 *
 * Le rail qui *agit* — renommer, effacer, ouvrir un sujet — parle à la base par
 * le Copilote, et un module qui parle à la base **ne s'importe pas dans un
 * test** : l'authentification tire son client d'un CDN, et l'import lève avant
 * la première ligne. Le dessin, lui, n'a besoin de rien dès lors qu'on lui
 * **donne** les discussions plutôt qu'il n'aille les chercher. Séparé, il
 * s'exécute, et l'on regarde ce qui sort.
 *
 * C'est ce qui permet de vérifier la seule différence entre les deux écrans :
 * « Créer un sujet » n'existe pas là où il n'y a pas de projet.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { renderNavListGroup, renderNavListItem } from "./nav-list.js";
import { conversationTitle } from "../../services/copilote-conversations.js";

/**
 * L'historique des discussions.
 *
 * Il est plat et sans intitulé de groupe : ce ne sont pas des utilitaires de
 * plus, ce sont les fils d'un seul. Le décalage à gauche le dit mieux qu'un
 * titre, qui ferait croire à une rubrique.
 *
 * @param {object} options
 * @param {object[]} [options.conversations] celles qu'on a, la plus récemment
 *   touchée en tête
 * @param {string} [options.courante] celle qui est ouverte
 * @param {string} [options.id] l'identifiant de la liste — c'est lui que le
 *   rafraîchissement retrouve. Deux écrans montés ensemble n'auraient pas le
 *   même, et l'un réécrirait l'historique de l'autre.
 * @param {boolean} [options.avecSujet] proposer « Créer un sujet »
 */
export function renderHistoriqueDesDiscussions({
  conversations = [], courante = "", id = "copiloteHistorique", avecSujet = true
} = {}) {
  return renderNavListGroup({
    id,
    className: "nav-list__list--sub",
    items: (Array.isArray(conversations) ? conversations : []).map((conversation) => {
      const titre = conversationTitle(conversation);
      return renderNavListItem({
        label: titre,
        // L'intitulé est tronqué par le rail : l'infobulle rend la question
        // entière, sans quoi deux discussions voisines se ressemblent.
        title: titre,
        className: "nav-list__item--sub",
        isActive: conversation.id === courante,
        // Pas de `data-side-nav-target` : rouvrir un fil se traite à part, sinon
        // le panneau se redessinerait deux fois — une fois par le routeur, une
        // fois par nous — et la seconde effacerait la discussion chargée.
        dataAttributes: { "data-copilote-conversation": conversation.id },
        actionHtml: `
          <button type="button" class="nav-list__action-btn" data-copilote-menu="${escapeHtml(conversation.id)}"
            aria-haspopup="menu" aria-expanded="false"
            aria-label="Actions sur cette discussion" title="Actions">
            ${svgIcon("kebab-horizontal")}
          </button>
          <div class="copilote-fil-menu" role="menu" data-copilote-menu-for="${escapeHtml(conversation.id)}" hidden>
            <button type="button" class="copilote-fil-menu__item" role="menuitem"
              data-copilote-rename="${escapeHtml(conversation.id)}">
              ${svgIcon("pencil")}<span>Renommer</span>
            </button>
            <button type="button" class="copilote-fil-menu__item" role="menuitem"
              data-copilote-copy="${escapeHtml(conversation.id)}"
              title="Outil de développement — la discussion entière dans le presse-papiers">
              ${svgIcon("copy")}<span>Copier la discussion</span>
              <em class="copilote-fil-menu__temporaire">dev</em>
            </button>
            ${avecSujet ? `
            <button type="button" class="copilote-fil-menu__item" role="menuitem"
              data-copilote-en-sujet="${escapeHtml(conversation.id)}"
              title="Les messages deviennent des commentaires, visibles par l'équipe du projet">
              ${svgIcon("issue-opened")}<span>Créer un sujet</span>
            </button>` : ""}
            <button type="button" class="copilote-fil-menu__item is-danger" role="menuitem"
              data-copilote-delete="${escapeHtml(conversation.id)}">
              ${svgIcon("trash")}<span>Effacer</span>
            </button>
          </div>
        `
      });
    })
  });
}

/**
 * Le rail entier : ouvrir une discussion neuve, et retrouver les passées.
 *
 * @param {object} options
 * @param {string} [options.id] celui de l'historique
 * @param {boolean} [options.avecSujet]
 * @param {boolean} [options.actif] l'entrée « Nouvelle discussion » est-elle
 *   celle qu'on regarde
 * @param {boolean} [options.replie] le rail est-il replié. L'historique n'y
 *   tient alors pas : il passe dans un menu, ouvert par la seule icône qui
 *   reste.
 * @param {Record<string, string>} [options.attributsDeLEntree] ce que l'écran
 *   pose sur la ligne pour savoir qu'on l'a cliquée. L'Atelier y met la cible
 *   de son routeur de panneaux ; l'écran transverse, qui n'en a pas, y met le
 *   geste lui-même.
 */
export function renderRailDesDiscussionsHtml({
  conversations = [], courante = "", id = "copiloteHistorique", avecSujet = true,
  actif = true, attributsDeLEntree = {}, replie = false
} = {}) {
  const fils = Array.isArray(conversations) ? conversations : [];

  return [
    renderNavListGroup({
      items: [
        renderNavListItem({
          label: "Nouvelle discussion",
          // **Repliée, l'entrée ouvre la liste au lieu d'ouvrir un fil neuf.**
          // C'est la seule icône qui reste : lui laisser le geste d'avant
          // rendrait l'historique inatteignable sans déplier le rail.
          dataAttributes: replie ? { "data-copilote-discussions": "1" } : attributsDeLEntree,
          title: replie ? "Discussions du Copilote" : "",
          iconHtml: svgIcon("copilot", { className: "octicon octicon-copilot" }),
          isActive: actif,
          actionHtml: replie
            ? renderMenuDesDiscussionsHtml({ conversations: fils, courante })
            : `
            <button type="button" class="nav-list__action-btn" data-copilote-new
              aria-label="Nouvelle discussion" title="Nouvelle discussion">
              ${svgIcon("new-chat")}
            </button>
          `
        })
      ]
    }),
    renderHistoriqueDesDiscussions({ conversations: fils, courante, id, avecSujet })
  ].join("");
}

/**
 * Les discussions dans un menu, quand le rail est replié.
 *
 * ## Pourquoi elles n'y restent pas sous forme de liste
 *
 * Replié, le rail fait soixante-six pixels : un titre de discussion n'y tient
 * pas, et la feuille de style masquait donc l'historique. C'était honnête —
 * mieux vaut rien qu'une colonne de lignes vides — mais cela **rendait les
 * discussions inatteignables** : pour rouvrir un fil, il fallait déplier le
 * rail, cliquer, puis le replier. Trois gestes pour un.
 *
 * Le menu les rend au clic sur la seule icône qui reste. « Nouvelle
 * discussion » est en tête, parce que c'est ce que l'icône faisait avant : le
 * geste qu'on connaît ne disparaît pas, il change de place.
 *
 * ## Il s'ouvre à droite, et non sous l'icône
 *
 * Un menu calé sur le bord droit d'une entrée de soixante-six pixels sortirait
 * de l'écran par la gauche. Il s'ouvre donc **à côté du rail**, là où il y a la
 * place.
 */
export function renderMenuDesDiscussionsHtml({ conversations = [], courante = "" } = {}) {
  const fils = Array.isArray(conversations) ? conversations : [];

  return `
    <div class="copilote-fil-menu copilote-fil-menu--rail-replie" role="menu"
      data-copilote-discussions-menu hidden>
      <button type="button" class="copilote-fil-menu__item" role="menuitem" data-copilote-new>
        ${svgIcon("new-chat")}<span>Nouvelle discussion</span>
      </button>
      ${fils.length ? `<div class="copilote-fil-menu__filet" role="separator"></div>` : ""}
      ${fils.map((conversation) => {
        const titre = conversationTitle(conversation);
        return `
          <button type="button" role="menuitem"
            class="copilote-fil-menu__item${conversation.id === courante ? " est-courante" : ""}"
            data-copilote-conversation="${escapeHtml(conversation.id)}"
            title="${escapeHtml(titre)}">
            ${svgIcon("comment-outline")}<span>${escapeHtml(titre)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

