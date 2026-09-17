/**
 * Le rail des discussions du Copilote : une seule fois, pour les deux écrans.
 *
 * ## Pourquoi il sort de l'Atelier
 *
 * L'Atelier le portait entier — l'entrée « Nouvelle discussion », l'historique,
 * le kebab, renommer, copier, effacer, ouvrir un sujet, et la délégation qui
 * tient le tout. Le Copilote transverse montre exactement la même chose, sur
 * les discussions qui ne sont d'aucun projet. En recopier deux cent cinquante
 * lignes aurait fait deux rails à corriger ensemble, dont l'un finirait en
 * retard sur l'autre — et le retard se voit ici sur un geste **sans retour**
 * (règle 10).
 *
 * ## Une différence, et une seule
 *
 * « Créer un sujet » verse la discussion dans un projet : les messages
 * deviennent des commentaires, visibles par l'équipe. Sans projet, il n'y a
 * nulle part où le faire — l'entrée n'existe alors pas. Elle n'est pas
 * désactivée : un bouton grisé fait chercher ce qui manque, une entrée absente
 * ne pose pas la question.
 *
 * ## Ce qu'il ne décide pas
 *
 * Où le Copilote est monté, et ce qu'il faut faire quand on ouvre un fil. Les
 * deux écrans n'ont pas la même coque — l'un a un routeur de panneaux, l'autre
 * non — et c'est l'appelant qui le sait.
 */

import { conversationTitle } from "../../services/copilote-conversations.js";
import {
  renderHistoriqueDesDiscussions as dessinerLHistorique,
  renderMenuDesDiscussionsHtml as dessinerLeMenu,
  renderRailDesDiscussionsHtml as dessinerLeRail
} from "./rail-des-discussions-rendu.js";
import {
  deleteConversation, renameConversation
} from "../../services/copilote-conversations-supabase.js";
import {
  copiloteConversationId,
  copiloteConversations,
  forgetConversationLocally,
  renameConversationLocally,
  transcrireLaDiscussion
} from "../studio/copilote/copilote.js";
import { copierDansLePressePapiers } from "./bouton-copier.js";

/**
 * L'historique, **tel qu'il est en ce moment**.
 *
 * Le dessin ne va rien chercher : on lui donne les discussions. C'est ce qui le
 * rend exécutable dans un test, et c'est ici qu'on lui passe l'état vif.
 */
export function renderHistoriqueDesDiscussions(options = {}) {
  return dessinerLHistorique({
    ...options, conversations: copiloteConversations(), courante: copiloteConversationId()
  });
}

/** Le rail entier, avec l'état vif. */
export function renderRailDesDiscussionsHtml(options = {}) {
  return dessinerLeRail({
    ...options, conversations: copiloteConversations(), courante: copiloteConversationId()
  });
}

/**
 * Brancher le rail : le menu de chaque fil, et ce qu'il permet.
 *
 * La délégation est nécessaire, pas décorative : l'historique se réécrit à
 * chaque message, et des écouteurs posés sur les entrées disparaîtraient avec
 * elles — la deuxième discussion serait morte au clic.
 *
 * @param {object} options
 * @param {Element} options.racine l'élément qui contient le rail
 * @param {string} [options.id] celui de l'historique, à rafraîchir
 * @param {boolean} [options.avecSujet]
 * @param {Element|null} [options.panneau] où le Copilote est monté — on le
 *   redessine après un effacement, sinon l'écran garde ouverte une discussion
 *   qui n'existe plus.
 * @param {() => void} [options.surNouvelle] ouvrir une discussion neuve
 * @param {(id: string) => boolean} [options.surOuverture] rouvrir une passée ;
 *   rend vrai quand elle existait
 * @param {() => void} [options.apresRafraichissement] ce que l'écran refait
 *   après réécriture de l'historique — l'Atelier y remet son repère de panneau
 * @param {(panneau: Element) => void} [options.redessinerLePanneau]
 * @returns {() => void} de quoi débrancher. **Il faut s'en servir** : l'écoute
 *   qui referme les menus est posée sur le document, et chaque rendu en
 *   empilerait une de plus.
 */
export function brancherLeRailDesDiscussions({
  racine,
  id = "copiloteHistorique",
  avecSujet = true,
  panneau = null,
  surNouvelle = () => {},
  surOuverture = () => false,
  apresRafraichissement = () => {},
  redessinerLePanneau = () => {}
} = {}) {
  const rail = racine?.querySelector?.(".project-rail");
  if (!rail) return () => {};

  const fermerMenus = () => {
    for (const menu of rail.querySelectorAll("[data-copilote-menu-for]")) menu.hidden = true;
    for (const bouton of rail.querySelectorAll("[data-copilote-menu]")) bouton.setAttribute("aria-expanded", "false");
    // Celui du rail replié se referme avec les autres : deux listes
    // superposées se recouvrent, et l'on clique dans celle qu'on ne regarde pas.
    const replie = rail.querySelector("[data-copilote-discussions-menu]");
    if (replie) replie.hidden = true;
    rail.querySelector("[data-copilote-discussions]")?.setAttribute("aria-expanded", "false");
  };

  /**
   * L'historique se redessine seul, sans toucher au reste du rail : redessiner
   * l'écran entier à chaque message replierait les réglages en cours.
   */
  const rafraichir = () => {
    /**
     * **Le menu du rail replié se réécrit aussi.**
     *
     * Il ne vit pas dans le groupe de l'historique — il est accroché à l'entrée
     * du Copilote, qui, elle, ne bouge pas. Ne rafraîchir que l'historique
     * laissait donc, rail replié, un menu figé sur les discussions d'il y a une
     * heure : la question qu'on venait de poser n'y figurait pas.
     */
    const menu = racine.querySelector("[data-copilote-discussions-menu]");
    if (menu?.isConnected) {
      const ouvert = !menu.hidden;
      menu.outerHTML = dessinerLeMenu({
        conversations: copiloteConversations(), courante: copiloteConversationId()
      });
      const repose = racine.querySelector("[data-copilote-discussions-menu]");
      if (repose && ouvert) repose.hidden = false;
    }

    const liste = racine.querySelector(`#${CSS.escape(id)}`);
    if (!liste?.isConnected) return;
    liste.outerHTML = renderHistoriqueDesDiscussions({ id, avecSujet });
    apresRafraichissement();
  };

  /**
   * Renommer.
   *
   * Le nom part en base avant d'apparaître à l'écran : l'ordre inverse
   * montrerait un nom que rien ne conserve, et il disparaîtrait au
   * rechargement sans que personne comprenne pourquoi.
   */
  async function renommerFil(fil) {
    const actuel = copiloteConversations().find((entree) => entree.id === fil);
    const propose = window.prompt("Renommer cette discussion", conversationTitle(actuel) || "");
    if (propose === null) return;

    try {
      const nom = await renameConversation(fil, propose);
      renameConversationLocally(fil, nom);
      rafraichir();
    } catch (error) {
      window.alert(`Le nouveau nom n'a pas pu être enregistré. ${error?.message || ""}`.trim());
    }
  }

  /**
   * Copier la discussion — outil de développement, destiné à disparaître.
   *
   * Le texte ne part nulle part : il va dans le presse-papiers de qui clique.
   * Une conversation avec le copilote est privée, et la copier pour soi n'est
   * pas la partager.
   */
  async function copierLeFil(fil) {
    const texte = await transcrireLaDiscussion(fil);
    if (!texte) {
      window.alert("Cette discussion n'a rien à copier.");
      return;
    }
    await copierDansLePressePapiers(texte);
  }

  /**
   * Effacer.
   *
   * On demande confirmation parce que c'est sans retour : la discussion et ses
   * messages partent de la base, et rien n'en garde de copie — c'est ce qu'on
   * promet à quelqu'un qui efface une conversation privée.
   */
  async function effacerFil(fil) {
    const actuel = copiloteConversations().find((entree) => entree.id === fil);
    const nom = conversationTitle(actuel);
    if (!window.confirm(`Effacer « ${nom} » ? La discussion et ses messages seront supprimés, sans retour.`)) return;

    try {
      await deleteConversation(fil);
      forgetConversationLocally(fil);
      rafraichir();
      if (panneau) redessinerLePanneau(panneau);
    } catch (error) {
      window.alert(`La discussion n'a pas pu être effacée. ${error?.message || ""}`.trim());
    }
  }

  /**
   * Ouvrir un sujet à partir d'une discussion.
   *
   * **Ce qui part ne revient pas** : le sujet est visible par toute l'équipe du
   * projet, et la discussion, elle, reste privée. On demande donc avant, en
   * disant ce que le geste fait — pas « êtes-vous sûr ? », qui ne dit rien.
   */
  async function ouvrirUnSujetDepuisLeFil(fil) {
    const conversation = copiloteConversations().find((entree) => entree.id === fil);
    if (!conversation) return;

    const nombre = (conversation.messages ?? []).filter((message) => String(message?.content || "").trim()).length;
    if (!nombre) {
      window.alert("Cette discussion n'a rien à montrer.");
      return;
    }

    const nom = conversationTitle(conversation) || "cette discussion";
    const ok = window.confirm(
      `Ouvrir un sujet « ${nom} » ?\n\n`
      + `Les ${nombre} messages deviendront des commentaires, visibles par toute l'équipe du projet. `
      + `La discussion, elle, reste privée.`
    );
    if (!ok) return;

    try {
      const { transformerEnSujet } = await import("../../services/copilote-en-sujet.js");
      const { resolveCurrentBackendProjectId } = await import("../../services/project-supabase-sync.js");
      const { store } = await import("../../store.js");
      const projet = await resolveCurrentBackendProjectId().catch(() => "");
      const rendu = await transformerEnSujet({ projectId: projet, conversation });

      if (!rendu.ok) { window.alert(rendu.raison); return; }
      if (rendu.commentaires < rendu.attendus) {
        // Le compte seul ne sert à rien : « 0 sur 5 » a laissé chercher deux
        // tours. C'est la raison qu'on lit, le compte n'en est que le décor.
        window.alert(
          `Le sujet « ${rendu.sujet.title} » est ouvert, avec ${rendu.commentaires} commentaire`
          + `${rendu.commentaires > 1 ? "s" : ""} sur ${rendu.attendus}.\n\n`
          + (rendu.raison || "Les autres n'ont pas pu être écrits.")
        );
      }

      const projetAffiche = String(store.currentProjectId || "").trim();
      if (projetAffiche) window.location.hash = `#project/${projetAffiche}/sujets`;
    } catch (erreur) {
      window.alert(`Le sujet n'a pas pu être ouvert. ${erreur?.message || ""}`.trim());
    }
  }

  const auClic = async (event) => {
    /**
     * **Avant tout le reste** : repliée, l'icône du Copilote ouvre la liste des
     * discussions. Elle porte aussi le geste « nouvelle discussion » quand le
     * rail est déplié, et c'est celui-là qu'on ne veut pas déclencher ici.
     */
    const bascule = event.target.closest("[data-copilote-discussions]");
    if (bascule) {
      event.stopPropagation();
      const menu = rail.querySelector("[data-copilote-discussions-menu]");
      const ouvert = menu && !menu.hidden;
      fermerMenus();
      if (menu && !ouvert) {
        menu.hidden = false;
        bascule.setAttribute("aria-expanded", "true");
      }
      return;
    }

    if (event.target.closest("[data-copilote-new]")) {
      fermerMenus();
      surNouvelle();
      return;
    }

    const kebab = event.target.closest("[data-copilote-menu]");
    if (kebab) {
      // Le menu ne doit pas ouvrir la discussion au passage : on l'ouvre pour
      // la renommer ou l'effacer, pas pour la lire.
      event.stopPropagation();
      const fil = kebab.dataset.copiloteMenu;
      const menu = rail.querySelector(`[data-copilote-menu-for="${CSS.escape(fil)}"]`);
      const ouvert = menu && !menu.hidden;
      fermerMenus();
      if (menu && !ouvert) {
        menu.hidden = false;
        kebab.setAttribute("aria-expanded", "true");
      }
      return;
    }

    const renommer = event.target.closest("[data-copilote-rename]");
    if (renommer) {
      event.stopPropagation();
      fermerMenus();
      await renommerFil(renommer.dataset.copiloteRename);
      return;
    }

    const copier = event.target.closest("[data-copilote-copy]");
    if (copier) {
      event.stopPropagation();
      fermerMenus();
      await copierLeFil(copier.dataset.copiloteCopy);
      return;
    }

    const enSujet = event.target.closest("[data-copilote-en-sujet]");
    if (enSujet) {
      event.stopPropagation();
      fermerMenus();
      await ouvrirUnSujetDepuisLeFil(enSujet.dataset.copiloteEnSujet);
      return;
    }

    const effacer = event.target.closest("[data-copilote-delete]");
    if (effacer) {
      event.stopPropagation();
      fermerMenus();
      await effacerFil(effacer.dataset.copiloteDelete);
      return;
    }

    fermerMenus();

    const fil = event.target.closest("[data-copilote-conversation]");
    if (fil) surOuverture(fil.dataset.copiloteConversation);
  };

  const auClicAilleurs = (event) => {
    if (!event.target.closest?.(".project-rail")) fermerMenus();
  };

  const surConversations = () => rafraichir();

  rail.addEventListener("click", auClic);
  document.addEventListener("click", auClicAilleurs);
  document.addEventListener("copilote:conversations", surConversations);

  return () => {
    rail.removeEventListener("click", auClic);
    document.removeEventListener("click", auClicAilleurs);
    document.removeEventListener("copilote:conversations", surConversations);
  };
}
