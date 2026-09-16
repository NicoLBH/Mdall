/**
 * Le Copilote de tous les projets.
 *
 * ## Ce qu'il est
 *
 * Le pendant du Copilote de l'Atelier, sans le projet. Le Copilote d'un projet
 * hérite d'une mémoire : des affirmations tranchées, des zones, un périmètre.
 * Il ne devine pas, il lit — et c'est ce qui fait sa valeur. Mais toutes les
 * questions ne portent pas sur un chantier : « où en suis-je ? », « comment je
 * m'y prends pour une descente de charges ? », « qu'est-ce que l'application
 * sait faire ? » n'appartiennent à aucun projet, et les poser obligeait à en
 * ouvrir un au hasard. La réponse arrivait alors chargée d'une mémoire qui
 * n'avait rien à y voir.
 *
 * ## Ce qu'il envoie à la place
 *
 * Pas une mémoire diluée : une **façon de travailler**
 * (`services/profil-de-travail.js`), qui dit en toutes lettres qu'elle ne porte
 * la valeur d'aucun projet, et qui demande au modèle de nommer le projet à
 * ouvrir plutôt que d'inventer un chiffre plausible.
 *
 * ## Ce qui est à lui, et ce qui ne l'est pas
 *
 * Rien, ou presque. Le fil, la saisie, les pièces jointes et l'appel sont ceux
 * du Copilote (`studio/copilote/copilote.js`) ; le rail des discussions est
 * celui de l'Atelier (`ui/rail-des-discussions.js`) ; la mise en page est dans
 * `copilote-transversal-page.js`. Ce fichier assemble, et c'est tout ce qu'il
 * fait — **c'est ce qui garantit que les deux écrans ne divergeront pas.**
 *
 * ## La marque qui fait la différence
 *
 * `store.currentProjectId` nul, comme pour les autres écrans transverses. Le
 * service le lit et n'envoie alors aucun identifiant de projet ; le rail lit la
 * même chose et demande à la base les discussions qui n'en portent aucun. Un
 * second drapeau dirait un jour autre chose que le premier (règle 4).
 */

import { mountProjectShellChrome, setProjectViewHeader } from "./project-shell-chrome.js";
import {
  HOTE_DU_COPILOTE, RAIL_DU_COPILOTE, renderPageDuCopiloteTransversal
} from "./copilote-transversal-page.js";
import { brancherLeRail, reglagesDuRail } from "./ui/reglages-du-rail.js";
import {
  brancherLeRailDesDiscussions, renderRailDesDiscussionsHtml
} from "./ui/rail-des-discussions.js";
import {
  copiloteConversationId, openConversation, renderCopilote, startNewConversation
} from "./studio/copilote/copilote.js";
import { LE_COPILOTE } from "../services/ecrans-transversaux.js";

/** L'identifiant de l'historique dans le rail. Écrit au rendu, relu au rafraîchissement. */
const HISTORIQUE = "copiloteTransversalHistorique";

/**
 * Le repli et la largeur du rail : **des réglages à cet écran**.
 *
 * Replier celui de l'Atelier n'a aucune raison de replier celui-ci — on ne les
 * regarde pas dans la même intention.
 */
const reglages = reglagesDuRail("copiloteTransversal");

/** De quoi débrancher : les deux posent des écoutes sur le document. */
let detacherLeRail = null;
let detacherLesDiscussions = null;

/**
 * Le contenu du rail.
 *
 * **Sans « Créer un sujet ».** Verser une discussion dans un sujet la rend
 * visible par l'équipe d'un projet ; ici il n'y en a aucun, et l'entrée n'a
 * nulle part où mener. Elle n'est pas grisée : un bouton désactivé fait
 * chercher ce qui manque, une entrée absente ne pose pas la question.
 */
function navDuRail() {
  return renderRailDesDiscussionsHtml({
    id: HISTORIQUE,
    avecSujet: false,
    // L'entrée « Nouvelle discussion » est celle qu'on regarde tant qu'aucun fil
    // n'est ouvert. Deux repères bleus pour un seul écran ne désignent plus rien.
    actif: !copiloteConversationId(),
    // Pas de routeur de panneaux ici : la ligne porte donc le geste lui-même.
    attributsDeLEntree: { "data-copilote-new": "1" }
  });
}

export function renderCopiloteTransversal(root) {
  if (!root) return;

  root.innerHTML = renderPageDuCopiloteTransversal({
    navHtml: navDuRail(),
    railReplie: reglages.replie(),
    railLargeur: reglages.largeur()
  });

  mountProjectShellChrome({ projectId: null, tab: "copilote" });
  setProjectViewHeader({ contextLabel: LE_COPILOTE.nom, variant: "copilote", hideBar: true });

  brancher(root);
}

/** Redessiner : le repli du rail est le seul geste qui le demande. */
function redessiner(root) {
  if (!root?.isConnected) return;
  renderCopiloteTransversal(root);
}

function brancher(root) {
  const panneau = root.querySelector(`#${HOTE_DU_COPILOTE}`);

  // La poignée de largeur, le calage au défilement, le bouton de repli. On
  // débranche d'abord : `followRailScroll` écoute le document, et un rendu de
  // plus ajouterait une paire d'écouteurs qui mesurent un rail disparu.
  detacherLeRail?.();
  detacherLeRail = brancherLeRail({
    racine: root,
    id: RAIL_DU_COPILOTE,
    pageSelector: ".project-simple-page--copilote",
    reglages,
    redessiner: () => redessiner(root)
  });

  detacherLesDiscussions?.();
  detacherLesDiscussions = brancherLeRailDesDiscussions({
    racine: root,
    id: HISTORIQUE,
    avecSujet: false,
    panneau,
    surNouvelle: () => { startNewConversation(); renderCopilote(panneau); },
    surOuverture: (id) => {
      if (!openConversation(id)) return false;
      renderCopilote(panneau);
      return true;
    },
    // L'historique se réécrit seul ; l'entrée « Nouvelle discussion » est
    // au-dessus de lui et ne bouge pas. Son repère, lui, change.
    apresRafraichissement: () => marquerLEntreeNeuve(root),
    redessinerLePanneau: (hote) => renderCopilote(hote)
  });

  // **Les discussions se relisent à chaque venue sur l'écran.** Le rail les
  // garde d'une visite à l'autre, et un fil ouvert ailleurs — sur un autre
  // poste — n'apparaîtrait jamais.
  renderCopilote(panneau, { reload: true });
}

/** Le repère de l'entrée « Nouvelle discussion ». */
function marquerLEntreeNeuve(root) {
  const entree = root.querySelector(".project-rail [data-copilote-new]")?.closest(".nav-list__item");
  entree?.setAttribute("data-active", copiloteConversationId() ? "false" : "true");
}
