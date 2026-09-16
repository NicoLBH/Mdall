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
 * @param {Record<string, string>} [options.attributsDeLEntree] ce que l'écran
 *   pose sur la ligne pour savoir qu'on l'a cliquée. L'Atelier y met la cible
 *   de son routeur de panneaux ; l'écran transverse, qui n'en a pas, y met le
 *   geste lui-même.
 */
export function renderRailDesDiscussionsHtml({
  conversations = [], courante = "", id = "copiloteHistorique", avecSujet = true,
  actif = true, attributsDeLEntree = {}
} = {}) {
  return [
    renderNavListGroup({
      items: [
        renderNavListItem({
          label: "Nouvelle discussion",
          dataAttributes: attributsDeLEntree,
          iconHtml: svgIcon("copilot", { className: "octicon octicon-copilot" }),
          isActive: actif,
          actionHtml: `
            <button type="button" class="nav-list__action-btn" data-copilote-new
              aria-label="Nouvelle discussion" title="Nouvelle discussion">
              ${svgIcon("new-chat")}
            </button>
          `
        })
      ]
    }),
    renderHistoriqueDesDiscussions({ conversations, courante, id, avecSujet })
  ].join("");
}

