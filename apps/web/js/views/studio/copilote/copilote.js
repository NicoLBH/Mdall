/**
 * Le Copilote du projet.
 *
 * L'assistant vivait dans un calque posé au-dessus de toute l'application, et
 * son ambition était d'agir sur l'ensemble des projets. Il n'avait donc de
 * domicile nulle part : ni un projet auquel se rattacher, ni un vocabulaire, ni
 * une mémoire. Ce qu'il savait de vous, c'était l'**état de l'écran** — filtres,
 * pagination, sélection — et les réponses s'en ressentaient.
 *
 * Il s'installe ici, dans l'Atelier, à l'intérieur d'un projet. Ce n'est pas un
 * repli : c'est un ancrage. Un copilote de projet hérite d'un périmètre, d'un
 * découpage en zones et — depuis `memory-briefing.js` — de la mémoire du
 * projet, hiérarchisée par ce qui fonde quoi. Il ne devine plus : il lit.
 *
 * ## Ce que l'écran promet, et ce qu'il ne promet pas encore
 *
 * Sous la saisie, trois boutons : résoudre les conflits, créer un sujet,
 * préparer une proposition. Ils sont **inactifs**, et c'est délibéré : ils
 * disent où va ce copilote sans prétendre y être déjà. Un bouton qui ferait
 * semblable de fonctionner coûterait plus cher qu'un bouton éteint.
 *
 * Ce qu'ils ne feront jamais, même actifs : agir seuls. « L'Atelier propose, la
 * Mémoire enregistre — une seule porte. » Créer un sujet voudra dire le
 * **préparer**, et laisser quelqu'un le verser.
 *
 * ## Où vit la conversation
 *
 * À l'écran, dans `store.ui.assistant` : c'est ce qui permet de changer
 * d'onglet et de retrouver l'échange en cours. **En base**, dans
 * `copilot_conversations` / `copilot_messages`, avec une politique de sécurité
 * propriétaire seul : une discussion se retrouve d'un poste à l'autre, et
 * personne d'autre que son auteur ne peut la lire.
 *
 * L'écriture est optimiste : le message paraît à l'écran, puis part en base. Si
 * l'écriture échoue, l'écran le dit — une sauvegarde silencieusement perdue est
 * pire qu'une sauvegarde refusée, parce qu'on en découvre l'absence le
 * lendemain.
 */

import { store } from "../../../store.js";
import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { sendAssistMessage } from "../../../services/copilote-service.js";
import { brancherLaZoneDeDepot, trierLesFichiers } from "../../ui/zone-de-depot.js";
import {
  aRetenirDeLaConversation, executerOutil, outilParId, sansFigure
} from "../../../services/copilote-outils.js";
import { conversationTitle, findConversation } from "../../../services/copilote-conversations.js";
import {
  appendMessage,
  createConversation,
  listConversations
} from "../../../services/copilote-conversations-supabase.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { getNiceChartTicks, renderSvgLineChart } from "../../../utils/svg-line-chart.js";

/**
 * Ce que le copilote saura faire, et ne sait pas encore.
 *
 * Le libellé et l'icône sont posés maintenant pour que la place soit prise et
 * que la suite ne soit pas une surprise. `disabled` porte la vérité : ces
 * boutons ne cliquent pas.
 */
const ACTIONS_A_VENIR = [
  { id: "conflits", label: "Résoudre conflits", icon: "bug" },
  { id: "sujet", label: "Créer un sujet", icon: "issue-draft" },
  { id: "proposition", label: "Proposition", icon: "git-pull-request" }
];

/**
 * Le peu de Markdown que le modèle nous renvoie.
 *
 * On échappe **avant** de reconnaître quoi que ce soit : une réponse est du
 * texte venu d'ailleurs, et l'interpréter comme du HTML ouvrirait la porte à
 * n'importe quoi.
 */
function mdToHtml(text) {
  return escapeHtml(text || "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

/** Sous quelle clé les discussions de ce projet se rangent. */
function cleProjet() {
  return String(store.currentProjectId || "");
}

/**
 * Qui parle.
 *
 * La clé de stockage le porte : deux comptes sur le même navigateur ne doivent
 * pas se relire l'un l'autre, et un poste partagé sur un chantier est la règle
 * plutôt que l'exception.
 */
function cleUtilisateur() {
  return String(store.user?.id || "");
}

function ensureState() {
  if (!store.ui) store.ui = {};

  if (!store.ui.assistant) {
    store.ui.assistant = {
      isSending: false,
      draft: "",
      lastError: "",
      creditsOpen: false,
      menuOpen: false,
      // Où en est le copilote, en une phrase. « Il réfléchit » pendant huit
      // secondes ressemble à une panne ; dire ce qui se passe ressemble à du
      // travail — et c'en est.
      etape: "",
      // De quoi interrompre l'appel en cours. Un bouton d'arrêt qui n'arrête
      // rien serait pire que pas de bouton du tout.
      abort: null,
      // Nul tant qu'aucune question n'a été posée : une discussion vide n'a
      // rien à conserver, et le rail se remplirait de lignes sans titre.
      conversationId: null,
      messages: [],
      conversations: [],
      chargement: false,
      // Ce que la mémoire disait au dernier envoi. Les utilitaires s'en servent
      // pour pré-remplir leurs entrées et comparer leurs résultats.
      assertionsConnues: [],
      // La note de calcul déposée, en mémoire vive et nulle part ailleurs. Elle
      // n'est ni stockée ni enregistrée avec la conversation : une note
      // déposée pour un essai n'est pas une pièce du projet.
      pieceJointe: null,
      // Ce que la conversation a déjà fait confirmer, valeur comprise. Sans
      // cette mémoire, chaque nouvelle question redemanderait la contrainte de
      // sol qu'on vient de saisir ; avec la valeur, une autre valeur sous la
      // même clé reste refusée.
      confirmeesValeurs: {},
      projectKey: cleProjet(),
      userKey: cleUtilisateur()
    };
  }

  // Changer de projet **ou de compte** repart de zéro. Le premier éviterait une
  // confusion ; le second éviterait une fuite, et c'est autre chose : les
  // questions d'un intervenant ne se montrent pas au suivant. La base le
  // refuserait de toute façon — on ne le lui demande pas.
  if (store.ui.assistant.projectKey !== cleProjet() || store.ui.assistant.userKey !== cleUtilisateur()) {
    store.ui.assistant.projectKey = cleProjet();
    store.ui.assistant.userKey = cleUtilisateur();
    store.ui.assistant.conversations = [];
    store.ui.assistant.conversationId = null;
    store.ui.assistant.messages = [];
    store.ui.assistant.draft = "";
    store.ui.assistant.lastError = "";
    store.ui.assistant.pieceJointe = null;
    store.ui.assistant.confirmeesValeurs = {};
    // Ce qui a été lu d'une note appartient au projet où on l'a déposée. Le
    // garder au changement de projet — ou de compte — le rendrait relisible
    // ailleurs, et « privé » ne peut pas être une intention.
    void import("../../../services/note-de-calcul-service.js")
      .then((module) => module.oublierLesNotesLues())
      .catch(() => {});
    store.ui.assistant.chargement = false;
  }

  return store.ui.assistant;
}

/** L'identifiant du projet en base — celui auquel les discussions se rattachent. */
async function projetEnBase() {
  return (await resolveCurrentBackendProjectId().catch(() => "")) || "";
}

/**
 * Relire les discussions depuis la base.
 *
 * Une seule fois par venue sur l'écran : le rail affiche ce qu'on a, et une
 * relecture à chaque rendu ferait clignoter la liste pendant qu'on écrit.
 */
async function chargerConversations(root) {
  const etat = ensureState();
  if (etat.chargement) return;
  etat.chargement = true;

  try {
    const projet = await projetEnBase();
    etat.conversations = projet ? await listConversations(projet) : [];
  } catch (error) {
    // Une lecture qui échoue n'efface rien : on garde ce qu'on avait, et on le
    // dit. Afficher une liste vide ferait croire qu'il n'y a jamais rien eu.
    etat.lastError = `Les discussions passées n'ont pas pu être relues. ${error?.message || ""}`.trim();
  }

  document.dispatchEvent(new CustomEvent("copilote:conversations"));
  if (root?.isConnected) render(root);
}

/**
 * Écrire un message en base, et tenir la liste locale à jour.
 *
 * La discussion se crée au premier message, pas au clic sur « nouvelle
 * discussion » : une ligne sans question n'a rien à conserver.
 */
async function enregistrer(etat, message) {
  try {
    if (!etat.conversationId) {
      const projet = await projetEnBase();
      if (!projet) throw new Error("Ce projet n'est pas encore relié à la base.");
      const creee = await createConversation(projet);
      etat.conversationId = creee.id;
      etat.conversations = [creee, ...etat.conversations];
    }

    const ecrit = await appendMessage(etat.conversationId, message);
    // L'identifiant et la date viennent de la base : garder ceux du navigateur
    // ferait diverger l'écran de ce qui est enregistré.
    Object.assign(message, ecrit);

    const conversation = findConversation(etat.conversations, etat.conversationId);
    if (conversation) {
      conversation.messages = etat.messages.map((entree) => ({ ...entree }));
      conversation.updatedAt = new Date().toISOString();
      etat.conversations = [
        conversation,
        ...etat.conversations.filter((entree) => entree.id !== conversation.id)
      ];
    }
  } catch (error) {
    etat.lastError = `La discussion n'a pas pu être enregistrée. ${error?.message || ""}`.trim();
  }

  document.dispatchEvent(new CustomEvent("copilote:conversations"));
}

/** Ouvrir une discussion neuve. L'ancienne est déjà en base, elle y reste. */
export function startNewConversation() {
  const etat = ensureState();

  etat.conversationId = null;
  etat.messages = [];
  etat.draft = "";
  etat.lastError = "";
  etat.menuOpen = false;

  document.dispatchEvent(new CustomEvent("copilote:conversations"));
}

/** Rouvrir une discussion passée, telle qu'elle a été laissée. */
export function openConversation(id) {
  const etat = ensureState();
  const conversation = findConversation(etat.conversations, id);
  if (!conversation) return false;

  etat.conversationId = conversation.id;
  etat.messages = conversation.messages.map((message) => ({ ...message }));
  etat.draft = "";
  etat.lastError = "";
  return true;
}

/** Retirer une discussion de la liste affichée, après son effacement en base. */
export function forgetConversationLocally(id) {
  const etat = ensureState();
  etat.conversations = etat.conversations.filter((entree) => entree.id !== id);
  if (etat.conversationId === id) {
    etat.conversationId = null;
    etat.messages = [];
  }
}

/** Renommer une discussion dans la liste affichée, après son écriture en base. */
export function renameConversationLocally(id, title) {
  const conversation = findConversation(ensureState().conversations, id);
  if (conversation) conversation.title = title;
}

/** Les discussions du projet, la plus récente en tête. */
export function copiloteConversations() {
  return ensureState().conversations;
}

/** L'identifiant de la discussion affichée — celui que le rail met en avant. */
export function copiloteConversationId() {
  return ensureState().conversationId;
}

/**
 * Un message.
 *
 * **Aucun des deux ne porte de nom.** « Vous », dans une conversation privée à
 * deux, ne désigne personne d'autre ; et « Copilote » redit ce que sa marque
 * montre déjà. Deux étiquettes pour deux interlocuteurs qu'on ne peut pas
 * confondre.
 *
 * **La date est en bas à droite, et au survol seulement.** Sur un message qu'on
 * vient d'écrire elle n'apprend rien ; sur un fil qu'on relit trois semaines
 * plus tard elle est la seule chose qui situe. La montrer toujours revient à
 * payer tout le temps pour un besoin rare.
 *
 * Côté copilote, elle partage sa ligne avec les commandes : copier, compter.
 * Une ligne de plus sous chaque réponse aurait espacé le fil sans rien dire.
 */
function renderMessage(msg, index) {
  const role = msg.role === "user" ? "user" : "assistant";
  const quand = msg.ts ? new Date(msg.ts).toLocaleString("fr-FR") : "";

  if (role === "user") {
    // L'horodatage est **sous** la bulle, pas dedans : à l'intérieur, il
    // réservait sa place même invisible, et ce vide se lisait comme un
    // remplissage bas mal réglé. Dehors, il n'occupe rien tant qu'on ne le
    // demande pas, et l'espace qu'il prend au survol aère le fil.
    return `
      <article class="copilote-msg copilote-msg--user">
        <div class="copilote-msg__bulle">
          <div class="copilote-msg__body">${mdToHtml(msg.content || "")}</div>
        </div>
        ${quand ? `<div class="copilote-msg__stamp mono">${escapeHtml(quand)}</div>` : ""}
      </article>
    `;
  }

  return `
    <article class="copilote-msg copilote-msg--assistant" data-message-index="${index}">
      <span class="copilote-msg__mark" aria-hidden="true">${svgIcon("copilot", { width: 32, height: 32 })}</span>
      <div class="copilote-msg__main">
        ${(msg.executions ?? []).map((execution) => renderExecution(execution)).join("")}
        <div class="copilote-msg__body">${mdToHtml(msg.content || "")}</div>
        ${(msg.executions ?? []).map((execution) => renderFormulaire(execution, index)).join("")}
        <div class="copilote-msg__footer">
          <div class="copilote-msg__actions">
            <button type="button" class="copilote-msg__action" data-copy-message="${index}"
              aria-label="Copier la réponse" title="Copier">${svgIcon("copy")}</button>
            <button type="button" class="copilote-msg__action" data-tokens-message="${index}"
              aria-haspopup="dialog" aria-expanded="${msg.tokensOpen ? "true" : "false"}"
              aria-label="Jetons consommés" title="Jetons consommés">${svgIcon("meter")}</button>
          </div>
          ${quand ? `<span class="copilote-msg__stamp mono">${escapeHtml(quand)}</span>` : ""}
        </div>
        ${renderJetons(msg, index)}
      </div>
    </article>
  `;
}

/** Les sorties qui se lisent en tableau, pas en liste de clés. */
const TABLEAUX_DE_SORTIE = ["appuis", "correspondances"];

/**
 * Les massifs pré-dimensionnés, en tableau.
 *
 * C'est ce qu'on livre : un massif par appui, ses cotes, ce qui le gouverne et
 * son volume. Une liste « appuis : [object Object] » ne dirait rien, et un
 * paragraphe rédigé par le modèle demanderait qu'on le croie sur parole.
 *
 * Le ratio est montré parce qu'il dit la marge : à 0,98 la semelle passe et ne
 * supporte aucune reprise, à 0,55 on peut discuter la cote avec le maçon.
 */
function renderMassifs(execution) {
  const appuis = execution?.valeurs?.appuis;
  if (!Array.isArray(appuis) || !appuis.length) return "";

  const lignes = appuis.map((appui) => `
    <tr class="${appui.tenue ? "" : "est-en-defaut"}">
      <td>${escapeHtml(appui.nom || "")}${appui.impose ? ` <em>cotes imposées</em>` : ""}</td>
      <td class="mono">${appui.quantite ?? 1}</td>
      <td class="mono">${appui.tenue
        ? `${nombreLisible(appui.Lx)} × ${nombreLisible(appui.Ly)} × ${nombreLisible(appui.Lz)}` : "—"}</td>
      <td class="mono">${appui.tenue && appui.ratio !== null ? nombreLisible(appui.ratio, 2) : "—"}</td>
      <td>${escapeHtml(appui.tenue ? (appui.gouverne || "") : (appui.message || "ne vérifie pas"))}</td>
      <td class="mono">${appui.tenue && appui.volume !== null ? `${nombreLisible(appui.volume, 2)} m³` : "—"}</td>
    </tr>`).join("");

  return `
    <div class="copilote-massifs">
      <p class="copilote-outil__legende">Massifs pré-dimensionnés</p>
      <div class="copilote-massifs__cadre">
        <table class="copilote-massifs__table">
          <thead><tr><th>Appui</th><th>Nb</th><th>Lx × Ly × Lz</th><th>Ratio</th><th>Gouverné par</th><th>Volume</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>
    </div>`;
}

/**
 * Comment les cas de charge de la note ont été rangés.
 *
 * Un cas mal rangé — une neige accidentelle prise pour une neige normale —
 * produit un résultat plausible et faux. L'ingénieur qui relit doit pouvoir le
 * voir sans lire le code, et dire « non, chez nous ce vent-là va ailleurs ».
 */
function renderCorrespondances(execution) {
  const lignes = execution?.valeurs?.correspondances;
  if (!Array.isArray(lignes) || !lignes.length) return "";
  return `
    <details class="copilote-correspondances">
      <summary>Comment les cas de charge ont été rangés</summary>
      <ul class="copilote-outil__liste">
        ${lignes.map((ligne) => `
          <li>
            <span class="copilote-outil__cle">${escapeHtml(ligne.libelle || "")}</span>
            <span class="mono">${escapeHtml(ligne.cas || "non repris")}</span>
            <span class="copilote-outil__source">${escapeHtml(ligne.dit || "")}</span>
          </li>`).join("")}
      </ul>
    </details>`;
}

/** Un nombre, à la française, sans décimales inutiles. */
function nombreLisible(valeur, decimales = 2) {
  if (!Number.isFinite(valeur)) return "—";
  return String(Number(valeur.toFixed(decimales))).replace(".", ",");
}

/**
 * Ce qu'un utilitaire a calculé, montré tel quel.
 *
 * **La trace est aussi importante que la réponse.** Une phrase du copilote qui
 * annonce « TB = 0,10 s » demande qu'on le croie ; la même phrase accompagnée
 * de l'utilitaire, de sa version, de ses entrées et de leur provenance se
 * vérifie. C'est la différence entre un assistant et un outil de travail.
 */
function renderExecution(execution) {
  if (execution?.statut === "manquant" || execution?.statut === "aConfirmer") return "";

  if (execution?.statut !== "fait") {
    return `
      <div class="copilote-outil copilote-outil--refus">
        <p class="copilote-outil__titre">${escapeHtml(execution?.titre || "Utilitaire")}</p>
        <p class="copilote-outil__note">${escapeHtml(execution?.message || "L'utilitaire n'a pas conclu.")}</p>
      </div>
    `;
  }

  const entrees = Object.entries(execution.entrees ?? {}).map(([cle, valeur]) => {
    const venue = execution.venuesDeLaMemoire?.[cle];
    return `
      <li>
        <span class="copilote-outil__cle">${escapeHtml(cle)}</span>
        <span class="mono">${escapeHtml(String(valeur))}</span>
        ${venue ? `<span class="copilote-outil__source">mémoire du projet</span>` : ""}
      </li>
    `;
  }).join("");

  const sorties = Object.entries(execution.valeurs ?? {})
    // Ce qui se lit en tableau ne se lit pas en liste : `appuis` et
    // `correspondances` ont leur propre rendu, juste dessous.
    .filter(([cle]) => !TABLEAUX_DE_SORTIE.includes(cle))
    .map(([cle, valeur]) => `
      <li>
        <span class="copilote-outil__cle">${escapeHtml(cle)}</span>
        <span class="mono">${escapeHtml(String(valeur))} ${escapeHtml(execution.unites?.[cle] || "")}</span>
      </li>
    `).join("");

  const ecarts = (execution.ecarts ?? []).map((ecart) => `
    <li>
      ${escapeHtml(ecart.sujet)} : le projet retient
      <span class="mono">${escapeHtml(String(ecart.valeurTenue))} ${escapeHtml(ecart.unite)}</span>,
      le calcul donne
      <span class="mono">${escapeHtml(String(ecart.valeurCalculee))} ${escapeHtml(ecart.unite)}</span>.
    </li>
  `).join("");

  const figure = execution.figure?.points?.length
    ? `<div class="copilote-outil__figure">
         <p class="copilote-outil__legende">${escapeHtml(execution.figure.titre || "Courbe")}</p>
         ${renderSvgLineChart({
           ariaDescription: execution.figure.titre || "Courbe de l'utilitaire",
           width: 520,
           height: 220,
           xLabel: execution.figure.xLabel || "",
           yLabel: execution.figure.yLabel || "",
           xDomain: execution.figure.xDomain || [0, 4],
           yDomain: [0, (getNiceChartTicks(
             execution.figure.points.reduce((haut, point) => Math.max(haut, point.y), 0), 4
           ).at(-1)) || 1],
           xTicks: [0, 1, 2, 3, 4],
           yTicks: getNiceChartTicks(execution.figure.points.reduce((haut, point) => Math.max(haut, point.y), 0), 4),
           xGrid: { skipFirst: true, lineStyle: "dashed" },
           yGrid: { skipFirst: true, lineStyle: "solid" },
           interactive: false,
           series: [{ label: "", points: execution.figure.points, stroke: true, fill: false, pointsVisible: false }]
         })}
       </div>`
    : "";

  return `
    <div class="copilote-outil">
      <p class="copilote-outil__titre">
        ${svgIcon("cpu")}
        ${escapeHtml(execution.titre)}
        <span class="copilote-outil__version mono">${escapeHtml(execution.outil)}</span>
      </p>
      <div class="copilote-outil__colonnes">
        <div>
          <p class="copilote-outil__legende">Entrées</p>
          <ul class="copilote-outil__liste">${entrees}</ul>
        </div>
        <div>
          <p class="copilote-outil__legende">Résultats</p>
          <ul class="copilote-outil__liste">${sorties}</ul>
        </div>
      </div>
      ${figure}
      ${renderMassifs(execution)}
      ${renderCorrespondances(execution)}
      ${
        ecarts
          ? `<div class="copilote-outil__ecarts">
              <p class="copilote-outil__legende">Ce qui ne s'accorde pas avec la mémoire</p>
              <ul class="copilote-outil__liste">${ecarts}</ul>
            </div>`
          : ""
      }
      <p class="copilote-outil__note">
        Calculé par ${escapeHtml(execution.source || "l'utilitaire")}. Ce résultat n'entre pas dans la mémoire du projet.
      </p>
    </div>
  `;
}

/**
 * Le formulaire d'un utilitaire à qui il manque des entrées.
 *
 * **Il est construit depuis la déclaration de l'utilitaire, jamais depuis les
 * mots du modèle.** Un formulaire dicté par le modèle inventerait des champs
 * que le calcul n'attend pas, et l'utilisateur remplirait consciencieusement du
 * vide. Ce que la mémoire savait déjà est prérempli et reste modifiable : c'est
 * l'objet même d'une question en « et si ».
 */
function renderFormulaire(execution, index) {
  if (execution?.statut !== "manquant" && execution?.statut !== "aConfirmer") return "";

  // Une seule valeur manque, et elle a des choix : des pastilles valent mieux
  // qu'un formulaire. On répond d'un clic au lieu de viser une liste
  // déroulante puis un bouton — et la question posée reste lisible en dessous.
  const seul = (execution.champs ?? []).length === 1 ? execution.champs[0] : null;
  if (seul?.valeurs?.length) return renderPastilles(execution, seul, index);

  const champs = (execution.champs ?? []).map((champ) => {
    const valeur = execution.connues?.[champ.cle] ?? "";

    const saisie = champ.valeurs
      ? `<select class="copilote-champ__saisie" name="${escapeHtml(champ.cle)}">
           <option value="">—</option>
           ${champ.valeurs.map((choix) => `
             <option value="${escapeHtml(choix)}" ${String(valeur) === String(choix) ? "selected" : ""}>${escapeHtml(choix)}</option>
           `).join("")}
         </select>`
      : `<input class="copilote-champ__saisie" type="${champ.type === "nombre" ? "number" : "text"}"
           name="${escapeHtml(champ.cle)}" value="${escapeHtml(String(valeur))}" step="any">`;

    return `
      <label class="copilote-champ">
        <span class="copilote-champ__libelle">
          ${escapeHtml(champ.libelle)}${champ.unite ? ` <span class="copilote-champ__unite">(${escapeHtml(champ.unite)})</span>` : ""}
        </span>
        ${saisie}
        ${champ.aide ? `<span class="copilote-champ__aide">${escapeHtml(champ.aide)}</span>` : ""}
      </label>
    `;
  }).join("");

  return `
    <form class="copilote-formulaire" data-formulaire="${index}" data-outil="${escapeHtml(execution.outil)}">
      <p class="copilote-formulaire__titre">${escapeHtml(execution.titre)} — il manque des valeurs</p>
      <div class="copilote-formulaire__champs">${champs}</div>
      <button type="submit" class="copilote-action copilote-formulaire__envoi">Calculer</button>
    </form>
  `;
}

/**
 * Les réponses possibles, à cliquer.
 *
 * Les pastilles viennent de la **déclaration de l'utilitaire**, comme le
 * formulaire : ce sont les valeurs que le calcul sait traiter, ni plus ni
 * moins. Un jeu de propositions rédigé par le modèle offrirait des réponses
 * qu'il ne saurait pas exploiter.
 *
 * Le champ libre reste, et il ne sert pas qu'à saisir une valeur hors liste :
 * on y apporte une précision, on y change d'avis, on y explique. Ne laisser que
 * les pastilles obligerait à choisir même quand la bonne réponse est « aucune
 * des quatre, et voici pourquoi ».
 */
function renderPastilles(execution, champ, index) {
  return `
    <div class="copilote-pastilles" data-pastilles="${index}" data-outil="${escapeHtml(execution.outil)}"
      data-champ="${escapeHtml(champ.cle)}">
      <p class="copilote-pastilles__question">${escapeHtml(champ.libelle)} ?</p>
      ${
        execution.proposeParLeModele?.[champ.cle]
          ? `<p class="copilote-pastilles__garde">
              Le copilote allait retenir <span class="mono">${escapeHtml(execution.proposeParLeModele[champ.cle])}</span>,
              que personne n'a dit. Le calcul attend votre réponse.
            </p>`
          : ""
      }
      <div class="copilote-pastilles__choix">
        ${champ.valeurs.map((valeur) => `
          <button type="button" class="copilote-pastille" data-valeur="${escapeHtml(valeur)}">${escapeHtml(valeur)}</button>
        `).join("")}
      </div>
      ${champ.aide ? `<p class="copilote-pastilles__aide">${escapeHtml(champ.aide)}</p>` : ""}
      <form class="copilote-pastilles__libre" data-pastilles-libre>
        <input type="text" class="copilote-champ__saisie" name="libre"
          placeholder="Saisissez votre propre réponse ou apportez des précisions">
        <button type="submit" class="copilote-action">Envoyer</button>
      </form>
    </div>
  `;
}

/**
 * Le compteur de jetons d'un message.
 *
 * Le décompte vient du modèle, par la fonction : `usage.input_tokens` et
 * `usage.output_tokens`, tels quels. Rien n'est estimé ici — un compteur
 * approché est un compteur faux, et on lit un compteur pour décider.
 *
 * Un tiret quand le chiffre manque, jamais un zéro : « 0 jeton » est une
 * affirmation, « — » est un aveu.
 */
function renderJetons(msg, index) {
  if (!msg.tokensOpen) return "";

  // L'unité se dit, même sur un tableau de deux lignes : « 11493 » seul se lit
  // aussi bien comme des jetons que comme des caractères ou des centimes.
  const chiffre = (valeur) => (Number.isFinite(valeur) ? `${valeur} tokens` : "—");

  return `
    <div class="copilote-tokens" role="dialog" aria-label="Jetons consommés" data-tokens-panel="${index}">
      <p class="copilote-tokens__title">Jetons de ce message</p>
      <div class="copilote-tokens__row"><span>Entrée</span><span class="mono">${chiffre(msg.tokensIn)}</span></div>
      <div class="copilote-tokens__row"><span>Sortie</span><span class="mono">${chiffre(msg.tokensOut)}</span></div>
      ${
        Number.isFinite(msg.tokensIn) || Number.isFinite(msg.tokensOut)
          ? ""
          : `<p class="copilote-tokens__note">Le modèle n'a pas remonté son décompte pour ce message.</p>`
      }
    </div>
  `;
}

/**
 * L'accueil, quand rien n'a encore été dit.
 *
 * Il annonce **ce que le copilote sait**, et pas seulement ce qu'il sait faire.
 * Une invite qui promet « demandez-moi n'importe quoi » se fait juger sur la
 * première réponse ; celle-ci dit d'où elle parle, donc sur quoi la juger.
 */
function renderAccueil() {
  return `
    <div class="copilote-empty" id="copiloteAccueil">
      <span class="copilote-empty__mark" aria-hidden="true">${svgIcon("copilot", { width: 32, height: 32 })}</span>
      <p class="copilote-empty__title">Le copilote de ce projet</p>
      <p class="copilote-empty__sub">
        Il lit la mémoire de ce projet — données de base, contraintes, hypothèses, constats —
        avant de répondre. Ce qui n'y figure pas, il le dira plutôt que de l'inventer.
      </p>
    </div>
  `;
}

/**
 * L'attente.
 *
 * Elle occupe la place d'un message à venir, à l'endroit exact où la réponse
 * apparaîtra. Un indicateur posé ailleurs — dans un coin, sur le bouton —
 * laisserait croire que le fil est fini et que rien ne vient.
 */
function renderAttente(etape) {
  return `
    <article class="copilote-msg copilote-msg--assistant copilote-msg--pending" aria-live="polite">
      <span class="copilote-msg__mark" aria-hidden="true">${svgIcon("copilot", { width: 32, height: 32 })}</span>
      <div class="copilote-msg__main">
        <div class="copilote-msg__meta">
          <span class="copilote-msg__author">Copilote</span>
        </div>
        <div class="copilote-pending">
          <span class="copilote-spinner" aria-hidden="true">${svgIcon("attachment-upload-spinner")}</span>
          <span>${escapeHtml(etape || "Le copilote réfléchit…")}</span>
        </div>
      </div>
    </article>
  `;
}

function renderCorps(etat) {
  const messages = Array.isArray(etat.messages) ? etat.messages : [];
  if (messages.length === 0 && !etat.isSending) return renderAccueil();

  return `
    <div class="copilote-thread-wrap">
      <div class="copilote-thread" id="copiloteThread">
        <div class="copilote-thread__inner">
          ${messages.map((msg, index) => renderMessage(msg, index)).join("")}
          ${etat.isSending ? renderAttente(etat.etape) : ""}
        </div>
      </div>
      <button type="button" class="copilote-scroll" id="copiloteScroll" hidden
        aria-label="Aller au dernier message" title="Aller au dernier message">
        ${svgIcon("arrow-up", { className: "copilote-scroll__icon" })}
      </button>
    </div>
  `;
}

/**
 * Le panneau des crédits.
 *
 * **Il n'est rempli par rien.** Les chiffres qu'il affiche sont figés dans ce
 * fichier, et le panneau le dit : promettre un compteur qu'aucune source
 * n'alimente serait pire qu'un écran vide — on prendrait une décision d'usage
 * sur un nombre inventé. Il est là pour que la place soit prise et que la forme
 * soit décidée ; le brancher viendra quand il y aura un compteur à brancher.
 */
function renderCredits(etat) {
  if (!etat.creditsOpen) return "";

  return `
    <div class="copilote-credits" role="dialog" aria-label="Crédits inclus">
      <div class="copilote-credits__head">
        <span class="copilote-credits__title">Crédits inclus</span>
        <span class="copilote-credits__hint" aria-hidden="true">${svgIcon("alert", { width: 14, height: 14 })}</span>
      </div>
      <div class="copilote-credits__row">
        <span>Renouvellement le 1er du mois</span>
        <span class="copilote-credits__count mono">— / —</span>
      </div>
      <div class="copilote-credits__bar" aria-hidden="true"><span style="width:0%"></span></div>
      <p class="copilote-credits__note">Aucun compteur n'alimente encore ce panneau : il montre la place, pas une consommation.</p>
    </div>
  `;
}

/**
 * Ce que le copilote saura faire.
 *
 * **Sur l'écran d'accueil, les trois boutons s'étalent** : c'est là qu'ils
 * servent, en disant d'emblée ce qui vient. **Dès la première question, ils se
 * replient dans un menu** — la conversation prend la place, et trois boutons
 * éteints entre le fil et la saisie n'y ajoutent rien, ils l'éloignent.
 */
function renderActions(etat) {
  const vide = (etat.messages ?? []).length === 0 && !etat.isSending;

  if (vide) {
    return `
      <div class="copilote-actions" role="group" aria-label="Ce que le copilote saura faire">
        ${ACTIONS_A_VENIR.map((action) => `
          <button type="button" class="copilote-action" data-copilote-action="${escapeHtml(action.id)}" disabled
            title="Bientôt : ${escapeHtml(action.label.toLowerCase())}">
            ${svgIcon(action.icon)}
            <span>${escapeHtml(action.label)}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  return `
    <div class="copilote-compose__menu">
      <button type="button" class="copilote-tool" id="copiloteMenu"
        aria-haspopup="menu" aria-expanded="${etat.menuOpen ? "true" : "false"}"
        aria-label="Ce que le copilote saura faire" title="Ce que le copilote saura faire">
        ${svgIcon("comment-outline")}
      </button>
      ${
        etat.menuOpen
          ? `<div class="copilote-menu" role="menu">
              ${ACTIONS_A_VENIR.map((action) => `
                <button type="button" class="copilote-menu__item" role="menuitem"
                  data-copilote-action="${escapeHtml(action.id)}" disabled>
                  ${svgIcon(action.icon)}
                  <span>${escapeHtml(action.label)}</span>
                </button>
              `).join("")}
              <p class="copilote-menu__note">Ces trois-là ne cliquent pas encore.</p>
            </div>`
          : ""
      }
    </div>
  `;
}

/**
 * L'écran.
 *
 * Une seule barre de défilement, et c'est celle du fil : la page ne bouge plus,
 * la saisie reste en bas. Deux ascenseurs pour une conversation obligeaient à
 * choisir lequel pousser, et le bouton « aller en bas » ne savait plus lequel
 * regarder.
 *
 * Le fil occupe toute la largeur — sa barre est donc au bord de l'écran, là où
 * on la cherche — et la colonne de lecture est ramenée au centre à l'intérieur.
 */
/**
 * La note de calcul déposée, telle qu'on la voit.
 *
 * Elle se voit **avant** le champ de saisie, parce qu'elle change le sens de ce
 * qu'on va taper : « fais-moi un pré-dimensionnement » ne veut pas dire la même
 * chose avec et sans note jointe. Et elle se retire d'un clic — une pièce
 * jointe qu'on ne peut pas enlever accompagne toutes les questions suivantes
 * sans qu'on l'ait voulu.
 */
function renderPieceJointe(etat) {
  const piece = etat.pieceJointe;
  if (!piece) return "";
  const ko = Math.max(1, Math.round((piece.taille ?? 0) / 1024));
  return `
    <div class="copilote-piece">
      ${svgIcon("file")}
      <span class="copilote-piece__nom">${escapeHtml(piece.nom)}</span>
      <span class="copilote-piece__poids">${ko} ko</span>
      <button type="button" class="copilote-piece__retirer" id="copiloteRetirerPiece"
              aria-label="Retirer la note jointe" title="Retirer">×</button>
    </div>`;
}

function render(root) {
  const etat = ensureState();
  const vide = (etat.messages ?? []).length === 0 && !etat.isSending;

  root.innerHTML = `
    <section class="settings-section is-active copilote-section" data-copilote-depot>
      <div class="copilote${vide ? " copilote--empty" : ""}">
        <div class="copilote-depot__voile" aria-hidden="true">
          <div class="copilote-depot__mot">${svgIcon("file")} Déposez une note de calcul (PDF)</div>
        </div>
        ${renderCorps(etat)}

        <div class="copilote-composer">
          <div class="copilote-composer__inner">
            <div class="copilote-compose gh-field-focus">
              ${renderPieceJointe(etat)}
              <textarea
                id="copiloteInput"
                class="copilote-input"
                rows="3"
                ${etat.isSending ? "disabled" : ""}
                placeholder="${etat.isSending ? "Le copilote réfléchit…" : "Posez une question sur ce projet…"}"
              >${escapeHtml(etat.draft || "")}</textarea>

              <div class="copilote-compose__bar">
                <div class="copilote-compose__left">${vide ? "" : renderActions(etat)}</div>

                <div class="copilote-compose__tools">
                  <button type="button" class="copilote-tool" id="copiloteJoindre"
                    ${etat.isSending ? "disabled" : ""}
                    aria-label="Joindre une note de calcul (PDF)" title="Joindre une note de calcul (PDF)"
                    >${svgIcon("paperclip")}</button>
                  <input type="file" id="copiloteFichier" accept="application/pdf" hidden>

                  <button type="button" class="copilote-tool" id="copiloteCredits"
                    aria-haspopup="dialog" aria-expanded="${etat.creditsOpen ? "true" : "false"}"
                    aria-label="Crédits inclus" title="Crédits inclus">${svgIcon("meter")}</button>

                  <span class="copilote-compose__divider" role="separator" aria-orientation="vertical"></span>

                  ${
                    etat.isSending
                      ? `<button type="button" class="copilote-stop" id="copiloteStop"
                           aria-label="Arrêter la réponse" title="Arrêter">
                           <span class="copilote-stop__square" aria-hidden="true"></span>
                         </button>`
                      : `<button type="button" class="copilote-send" id="copiloteSend" aria-label="Envoyer"
                           title="Envoyer">${svgIcon("paper-airplane")}</button>`
                  }
                </div>
              </div>

              ${renderCredits(etat)}
            </div>

            ${vide ? renderActions(etat) : ""}

            ${
              etat.lastError
                ? `<p class="copilote-error">${escapeHtml(etat.lastError)}</p>`
                : ""
            }
          </div>
        </div>
      </div>
    </section>
  `;

  const fil = root.querySelector("#copiloteThread");
  if (fil) {
    // Deux fois, et la seconde n'est pas superflue : au moment où l'on vient
    // d'écrire le HTML, la hauteur du contenu n'est pas encore celle qu'elle
    // sera une fois les polices posées. On se retrouvait à quelques centaines
    // de pixels du bas, et le bouton « aller en bas » s'affichait alors qu'on
    // venait de recevoir la réponse.
    fil.scrollTop = fil.scrollHeight;
    window.requestAnimationFrame(() => {
      fil.scrollTop = fil.scrollHeight;
      fil.dispatchEvent(new Event("scroll"));
    });
  }

  bind(root);
}

/**
 * Ce que la conversation retient d'un calcul qui a abouti.
 *
 * La contrainte admissible du sol et la valeur départementale du hors gel sont
 * des décisions : on les prend **une fois**, elles valent pour tous les massifs
 * et pour toute la discussion. Sans cette mémoire, le modèle — qui n'invente
 * jamais de valeur, c'est la règle — rappelait l'outil sans arguments à la
 * question suivante, et le formulaire revenait en boucle sur la même note.
 *
 * On retient la valeur, pas seulement la clé : c'est elle qui autorise, et une
 * autre valeur sous le même nom reste refusée.
 */
function retenirDeLaConversation(etat, executions = []) {
  for (const execution of executions) {
    if (execution?.statut !== "fait") continue;
    const outil = outilParId(String(execution.outil ?? "").replace(/_V\d+$/, ""));
    const garde = aRetenirDeLaConversation(outil, execution.entrees ?? {});
    Object.assign(etat.confirmeesValeurs, garde);
  }
}

/**
 * Joindre une note de calcul.
 *
 * Elle est lue dans le navigateur et gardée en mémoire vive : rien ne part
 * ailleurs tant qu'une question n'est pas posée, et rien n'est stocké nulle
 * part. Le plafond n'est pas une politesse — au-delà, la lecture côté serveur
 * refuserait le fichier, et mieux vaut le dire ici, à l'endroit du geste.
 */
const PIECE_MAX_OCTETS = 6 * 1024 * 1024;

async function joindre(root, fichier, { ecartes = 0 } = {}) {
  const etat = ensureState();
  const champ = root.querySelector("#copiloteFichier");
  if (champ) champ.value = "";
  if (!fichier) return;

  if (fichier.type !== "application/pdf") {
    etat.lastError = "Seuls les PDF se lisent pour le moment.";
    render(root);
    return;
  }
  if (fichier.size > PIECE_MAX_OCTETS) {
    etat.lastError = "Ce fichier dépasse 6 Mo : la lecture le refuserait.";
    render(root);
    return;
  }

  try {
    const { lireLeFichier } = await import("../../../services/note-de-calcul-service.js");
    etat.pieceJointe = await lireLeFichier(fichier);
    etat.lastError = ecartes > 0
      ? `Une seule note à la fois : ${ecartes} autre${ecartes > 1 ? "s" : ""} fichier${
        ecartes > 1 ? "s ont" : " a"} été laissé${ecartes > 1 ? "s" : ""} de côté.`
      : "";
  } catch (erreur) {
    etat.pieceJointe = null;
    etat.lastError = erreur instanceof Error ? erreur.message : "Le fichier n'a pas pu être lu.";
  }
  render(root);
}

async function envoyer(root) {
  const etat = ensureState();
  const champ = root.querySelector("#copiloteInput");
  const contenu = String(champ?.value || "").trim();
  if (!contenu || etat.isSending) return;

  const question = { role: "user", content: contenu, ts: new Date().toISOString() };

  etat.draft = "";
  etat.messages.push(question);
  etat.isSending = true;
  etat.lastError = "";
  etat.menuOpen = false;
  render(root);

  // La question est enregistrée avant la réponse : si le réseau tombe ensuite,
  // ce qui a été demandé ne disparaît pas de l'historique pour autant.
  await enregistrer(etat, question);

  const controle = new AbortController();
  etat.abort = controle;

  try {
    const { reply, usage, executions, context } = await sendAssistMessage(contenu, {
      signal: controle.signal,
      // Ce que la conversation porte et qui n'est pas une valeur : la note de
      // calcul déposée. Elle reste jointe tant qu'on ne la retire pas — on
      // pose souvent deux questions sur la même note.
      piecesJointes: etat.pieceJointe ? [etat.pieceJointe] : [],
      // Ce qui a déjà été confirmé dans cette conversation, avec sa valeur :
      // redemander la contrainte de sol à chaque question la ferait retaper
      // quatre fois, et une clé libérée sans sa valeur laisserait passer autre
      // chose.
      confirmees: Object.entries(etat.confirmeesValeurs ?? {}).map(([cle, valeur]) => `${cle}=${valeur}`),
      // Et ce que la conversation a déjà établi **pré-remplit** l'outil. Le
      // modèle n'invente pas de valeur : il rappelle donc l'outil sans
      // arguments, et sans cette couche le formulaire redemandait la contrainte
      // de sol à chaque question sur la même note.
      acquises: etat.confirmeesValeurs ?? {},
      // Redessiner seulement l'attente : réécrire le fil entier à chaque étape
      // ferait sauter la position de lecture toutes les deux secondes.
      onEtape: (dit) => {
        etat.etape = dit;
        const ligne = root.querySelector(".copilote-pending span:last-child");
        if (ligne) ligne.textContent = dit;
      }
    });

    // La mémoire lue pour cette question sert aussi au formulaire qui suivra :
    // la relire au moment du calcul risquerait de calculer sur un état que la
    // réponse affichée ne connaît pas.
    etat.assertionsConnues = context?.memoire?.assertions ?? [];
    retenirDeLaConversation(etat, executions);
    const reponse = {
      role: "assistant",
      content: reply || "Réponse vide.",
      ts: new Date().toISOString(),
      // Ce que les utilitaires ont calculé, gardé avec la réponse : une réponse
      // sans sa trace demande qu'on la croie sur parole.
      executions: Array.isArray(executions) ? executions : [],
      // Le décompte vient du modèle. Nul quand il ne le dit pas : un zéro
      // serait un chiffre, et on ne fabrique pas les chiffres d'un compteur.
      tokensIn: Number.isFinite(usage?.inputTokens) ? usage.inputTokens : null,
      tokensOut: Number.isFinite(usage?.outputTokens) ? usage.outputTokens : null
    };
    etat.messages.push(reponse);
    await enregistrer(etat, reponse);
  } catch (error) {
    // Une interruption n'est pas une panne : c'est une décision de
    // l'utilisateur, et l'afficher en rouge comme une erreur lui reprocherait
    // d'avoir cliqué sur le bouton qu'on lui a mis sous la main.
    if (error?.name === "AbortError") etat.lastError = "";
    // L'erreur se dit à part, pas dans le fil : une panne de réseau n'est pas
    // une réponse du copilote, et la ranger parmi ses messages ferait croire
    // qu'il a répondu cela.
    else etat.lastError = error?.message || "Le copilote n'a pas répondu.";
  } finally {
    etat.isSending = false;
    etat.abort = null;
    etat.etape = "";
    render(root);
    root.querySelector("#copiloteInput")?.focus();
  }
}

/**
 * Copier une réponse.
 *
 * C'est le **markdown d'origine** qui part au presse-papiers, pas le texte
 * rendu : on colle une réponse dans un compte rendu ou un mail, et y retrouver
 * ses titres et ses listes vaut mieux qu'un pavé aplati.
 *
 * Le retour est visible et bref. Une copie silencieuse laisse recliquer trois
 * fois, sans savoir si elle a eu lieu.
 */
async function copier(root, index) {
  const etat = ensureState();
  const contenu = etat.messages[index]?.content || "";
  if (!contenu) return;

  const bouton = root.querySelector(`[data-copy-message="${index}"]`);

  try {
    await navigator.clipboard.writeText(contenu);
    bouton?.classList.add("is-done");
    window.setTimeout(() => bouton?.classList.remove("is-done"), 1200);
  } catch {
    // Un presse-papiers refusé (page non sécurisée, permission) ne casse rien :
    // le texte reste sélectionnable à la main.
    bouton?.classList.add("is-failed");
    window.setTimeout(() => bouton?.classList.remove("is-failed"), 1200);
  }
}

/**
 * Le bouton de retour au dernier message.
 *
 * Il ne se montre que lorsqu'il sert — quand on a remonté le fil de plus d'une
 * hauteur d'écran. Un bouton toujours présent finit par recouvrir une réponse
 * qu'on est en train de lire, pour ne rien proposer d'utile.
 */
function brancherDefilement(root) {
  const fil = root.querySelector("#copiloteThread");
  const bouton = root.querySelector("#copiloteScroll");
  if (!fil || !bouton) return;

  const SEUIL = 80;
  const ajuster = () => {
    const reste = fil.scrollHeight - fil.scrollTop - fil.clientHeight;
    bouton.hidden = reste < SEUIL;
  };

  fil.addEventListener("scroll", ajuster);
  bouton.addEventListener("click", () => fil.scrollTo({ top: fil.scrollHeight, behavior: "smooth" }));

  // Trois moments, parce qu'une seule mesure ne suffit jamais :
  //
  //  - **tout de suite**, pour le cas ordinaire ;
  //  - **après la mise en page**, car au moment où l'on vient d'écrire le HTML
  //    la hauteur visible vaut encore zéro et le reste à faire défiler paraît
  //    énorme — le bouton s'affichait alors qu'on était déjà en bas ;
  //  - **quand le contenu grandit**, ce qu'aucun événement de défilement ne
  //    signale : une police qui finit de se poser rallonge le fil sans que
  //    personne ne défile.
  //
  // Le contenu est observé autant que le cadre : observer le seul cadre
  // manquait précisément le cas où c'est le texte qui s'allonge.
  ajuster();
  window.requestAnimationFrame(ajuster);

  if (typeof ResizeObserver === "function") {
    const observateur = new ResizeObserver(ajuster);
    observateur.observe(fil);
    const contenu = fil.querySelector(".copilote-thread__inner");
    if (contenu) observateur.observe(contenu);
  }

  // Les polices arrivent après le premier rendu et changent la hauteur du fil.
  document.fonts?.ready?.then(ajuster).catch(() => {});
}

/**
 * Une pastille cliquée : c'est une valeur, et elle part au calcul.
 *
 * Pas au modèle d'abord — il n'aurait rien à en faire de plus que ce qu'on
 * sait déjà : quel outil, quel champ, quelle valeur. Le faire passer par lui
 * ajouterait un aller-retour et une chance de se tromper d'outil.
 */
async function repondreParPastille(root, groupe, valeur) {
  const etat = ensureState();
  if (etat.isSending) return;

  const outil = outilParId(String(groupe.dataset.outil || "").replace(/_V\d+$/, ""));
  const champ = String(groupe.dataset.champ || "");
  if (!outil || !champ) return;

  const execution = etat.messages
    .flatMap((message) => message.executions ?? [])
    .find((entree) => (entree?.statut === "manquant" || entree?.statut === "aConfirmer")
      && entree.outil === groupe.dataset.outil);

  await lancerCalcul(root, outil, { ...(execution?.connues ?? {}), [champ]: valeur });
}

/** Une précision libre : une question de plus, rien d'autre. */
async function envoyerTexte(root, texte) {
  const champ = root.querySelector("#copiloteInput");
  if (!champ) return;
  champ.value = texte;
  await envoyer(root);
}

/**
 * Ce qui manquait a été fourni : on calcule, puis on fait raconter.
 *
 * **Le calcul a lieu ici, avant de reparler au modèle.** L'ordre inverse — lui
 * renvoyer les valeurs et le laisser rappeler l'utilitaire — marcherait la
 * plupart du temps et raterait le reste : rien ne garantit qu'il rappelle le
 * bon outil avec exactement ce qui a été saisi.
 *
 * Une seule fonction pour le formulaire et pour les pastilles : ce sont deux
 * façons de donner la même chose, et deux chemins auraient fini par ne plus
 * traiter le résultat de la même manière.
 */
async function lancerCalcul(root, outil, saisies) {
  const etat = ensureState();
  if (etat.isSending) return;

  const assertions = etat.assertionsConnues ?? [];
  // Ce qui vient de l'écran est **confirmé par définition** : quelqu'un vient de
  // le cliquer ou de le saisir. Le garde-fou contre les valeurs inventées n'a
  // plus lieu de s'y opposer — il vise ce que le modèle décide seul.
  //
  // On s'en souvient pour la suite de la conversation, avec la valeur : la
  // question suivante — « reprends la file B en 2 × 2 » — porte alors sur la
  // même contrainte de sol sans qu'on la ressaisisse, et une **autre** valeur
  // sous la même clé reste refusée.
  for (const [cle, valeur] of Object.entries(saisies)) {
    if (String(valeur ?? "").trim()) etat.confirmeesValeurs[cle] = String(valeur).trim();
  }

  const resultat = await executerOutil({
    id: outil.id,
    entrees: saisies,
    assertions,
    confirmees: Object.keys(saisies),
    acquises: etat.confirmeesValeurs ?? {},
    piecesJointes: etat.pieceJointe ? [etat.pieceJointe] : []
  });

  retenirDeLaConversation(etat, [resultat]);

  // Toujours manquant : quelque chose n'a pas été fourni, ou l'a été hors des
  // choix. On remplace la demande par la nouvelle, sans repartir vers le
  // modèle — le déranger pour lui dire qu'il manque encore une valeur ne sert
  // personne.
  if (resultat.statut === "manquant" || resultat.statut === "aConfirmer") {
    const dernier = etat.messages[etat.messages.length - 1];
    if (dernier) dernier.executions = [resultat];
    render(root);
    return;
  }

  // La demande a été satisfaite : elle n'a plus lieu d'être. La laisser sous
  // l'ancienne réponse donnerait deux formulaires pour un seul calcul, et on ne
  // saurait plus lequel vient d'aboutir.
  for (const message of etat.messages) {
    if (Array.isArray(message.executions)) {
      message.executions = message.executions.filter(
        (execution) => execution?.statut !== "manquant" && execution?.statut !== "aConfirmer"
      );
    }
  }

  const question = {
    role: "user",
    content: `J'ai fourni les valeurs demandées pour « ${outil.titre} ».`,
    ts: new Date().toISOString()
  };

  etat.messages.push(question);
  etat.isSending = true;
  etat.lastError = "";
  render(root);
  await enregistrer(etat, question);

  const controle = new AbortController();
  etat.abort = controle;

  try {
    const { reply, usage, executions } = await sendAssistMessage(question.content, {
      signal: controle.signal,
      confirmees: Object.keys(saisies),
      acquises: etat.confirmeesValeurs ?? {},
      piecesJointes: etat.pieceJointe ? [etat.pieceJointe] : [],
      onEtape: (dit) => {
        etat.etape = dit;
        const ligne = root.querySelector(".copilote-pending span:last-child");
        if (ligne) ligne.textContent = dit;
      },
      // Le calcul est déjà fait : on le donne au modèle comme s'il l'avait
      // demandé, avec un identifiant d'appel à nous. C'est ce qui lui permet
      // de reprendre le fil sans redemander.
      toolExchanges: [
        {
          call_id: `formulaire-${Date.now()}`,
          name: outil.id,
          arguments: JSON.stringify(saisies),
          output: JSON.stringify(sansFigure(resultat))
        }
      ]
    });

    etat.messages.push({
      role: "assistant",
      content: reply || "Réponse vide.",
      ts: new Date().toISOString(),
      executions: [resultat, ...(Array.isArray(executions) ? executions : [])],
      tokensIn: Number.isFinite(usage?.inputTokens) ? usage.inputTokens : null,
      tokensOut: Number.isFinite(usage?.outputTokens) ? usage.outputTokens : null
    });
    await enregistrer(etat, etat.messages[etat.messages.length - 1]);
  } catch (error) {
    if (error?.name !== "AbortError") etat.lastError = error?.message || "Le copilote n'a pas répondu.";
  } finally {
    etat.isSending = false;
    etat.abort = null;
    etat.etape = "";
    render(root);
  }
}

/** Le formulaire rempli : ses champs deviennent les entrées du calcul. */
async function remplirEtCalculer(root, formulaire) {
  const outil = outilParId(String(formulaire.dataset.outil || "").replace(/_V\d+$/, ""));
  if (!outil) return;

  const saisies = {};
  for (const champ of formulaire.querySelectorAll("[name]")) {
    saisies[champ.name] = champ.value;
  }

  await lancerCalcul(root, outil, saisies);
}

/** Renoncer à la réponse en cours. La question posée, elle, reste dans le fil. */
function interrompre(root) {
  const etat = ensureState();
  etat.abort?.abort();
}

/** Le champ prend la hauteur de ce qu'on y écrit, sans dépasser sa limite. */
function ajusterHauteur(champ) {
  if (!champ) return;
  champ.style.height = "auto";
  champ.style.height = `${champ.scrollHeight}px`;
}

function bind(root) {
  const etat = ensureState();
  const champ = root.querySelector("#copiloteInput");

  ajusterHauteur(champ);

  champ?.addEventListener("input", (event) => {
    etat.draft = String(event.target.value || "");
    ajusterHauteur(event.target);
  });

  champ?.addEventListener("keydown", (event) => {
    // Entrée envoie, Maj+Entrée passe à la ligne : c'est ce que fait toute
    // conversation, et demander Ctrl+Entrée pour la chose la plus fréquente
    // était un obstacle de plus.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void envoyer(root);
    }
  });

  root.querySelector("#copiloteJoindre")?.addEventListener("click", () => {
    root.querySelector("#copiloteFichier")?.click();
  });

  // Toute la discussion accepte le dépôt, pas seulement le trombone : on
  // arrive avec un PDF sous le pointeur, on ne cherche pas où viser. Le
  // branchement est celui des documents et des sujets — trois copies de ces
  // vingt lignes avaient fini par ne plus dire tout à fait la même chose.
  brancherLaZoneDeDepot(root.querySelector("[data-copilote-depot]"), {
    classe: "est-survole",
    actif: () => !ensureState().isSending,
    onFichiers: (fichiers) => {
      const { retenus, ecartes } = trierLesFichiers(fichiers, (f) => f.type === "application/pdf");
      const etatCourant = ensureState();
      if (!retenus.length) {
        // Un fichier écarté sans un mot laisse croire que le dépôt n'a pas
        // fonctionné, et l'on recommence.
        etatCourant.lastError = ecartes.length
          ? "Seuls les PDF se lisent pour le moment."
          : "";
        render(root);
        return;
      }
      // Une seule note à la fois : deux notes déposées, on ne saurait plus
      // laquelle l'outil a lue.
      void joindre(root, retenus[0], { ecartes: retenus.length - 1 + ecartes.length });
    }
  });
  root.querySelector("#copiloteFichier")?.addEventListener("change", (event) => {
    void joindre(root, event.target.files?.[0] ?? null);
  });
  root.querySelector("#copiloteRetirerPiece")?.addEventListener("click", () => {
    ensureState().pieceJointe = null;
    render(root);
  });

  root.querySelector("#copiloteSend")?.addEventListener("click", () => void envoyer(root));
  root.querySelector("#copiloteStop")?.addEventListener("click", () => interrompre(root));

  for (const bouton of root.querySelectorAll("[data-copy-message]")) {
    bouton.addEventListener("click", () => void copier(root, Number(bouton.dataset.copyMessage)));
  }

  for (const bouton of root.querySelectorAll("[data-tokens-message]")) {
    bouton.addEventListener("click", (event) => {
      event.stopPropagation();
      const index = Number(bouton.dataset.tokensMessage);
      const ouvert = etat.messages[index]?.tokensOpen;
      // Un seul panneau ouvert à la fois : deux compteurs côte à côte
      // n'apprennent rien de plus et se recouvrent.
      etat.messages.forEach((msg) => { msg.tokensOpen = false; });
      if (etat.messages[index]) etat.messages[index].tokensOpen = !ouvert;
      render(root);
    });
  }

  if (etat.messages.some((msg) => msg.tokensOpen)) {
    const fermer = (event) => {
      if (event.target.closest?.(".copilote-tokens, [data-tokens-message]")) return;
      document.removeEventListener("click", fermer);
      etat.messages.forEach((msg) => { msg.tokensOpen = false; });
      render(root);
    };
    document.addEventListener("click", fermer);
  }

  for (const formulaire of root.querySelectorAll("[data-formulaire]")) {
    formulaire.addEventListener("submit", (event) => {
      event.preventDefault();
      void remplirEtCalculer(root, formulaire);
    });
  }

  for (const groupe of root.querySelectorAll("[data-pastilles]")) {
    for (const pastille of groupe.querySelectorAll("[data-valeur]")) {
      pastille.addEventListener("click", () => {
        void repondreParPastille(root, groupe, pastille.dataset.valeur);
      });
    }

    groupe.querySelector("[data-pastilles-libre]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const saisie = event.target.querySelector("[name=libre]");
      const texte = String(saisie?.value || "").trim();
      if (!texte) return;
      // Le champ libre n'est pas une valeur : c'est une phrase. Elle repart
      // comme une question ordinaire, et le modèle en fait ce qu'il veut —
      // rappeler l'utilitaire, ou répondre autrement.
      void envoyerTexte(root, texte);
    });
  }

  brancherDefilement(root);

  root.querySelector("#copiloteCredits")?.addEventListener("click", (event) => {
    event.stopPropagation();
    etat.creditsOpen = !etat.creditsOpen;
    etat.menuOpen = false;
    render(root);
  });

  root.querySelector("#copiloteMenu")?.addEventListener("click", (event) => {
    event.stopPropagation();
    etat.menuOpen = !etat.menuOpen;
    etat.creditsOpen = false;
    render(root);
  });

  if (etat.menuOpen) {
    const fermer = (event) => {
      if (event.target.closest?.(".copilote-menu, #copiloteMenu")) return;
      document.removeEventListener("click", fermer);
      etat.menuOpen = false;
      render(root);
    };
    document.addEventListener("click", fermer);
  }

  // Un clic ailleurs referme : un panneau qui ne se ferme que par son propre
  // bouton finit par rester ouvert sous ce qu'on veut lire.
  if (etat.creditsOpen) {
    const fermer = (event) => {
      if (event.target.closest?.(".copilote-credits, #copiloteCredits")) return;
      document.removeEventListener("click", fermer);
      etat.creditsOpen = false;
      render(root);
    };
    document.addEventListener("click", fermer);
  }
}

/**
 * Caler l'écran sur la hauteur qui reste.
 *
 * `height: 100%` ne servait à rien : aucun ancêtre n'a de hauteur fixée, et un
 * pourcentage qui n'a rien à quoi se rapporter est ignoré. Toute la colonne
 * grandissait donc avec le fil, et c'est le document qui défilait — d'où les
 * deux ascenseurs, et un bouton « aller en bas » qui regardait le mauvais.
 *
 * On mesure donc ce qui reste sous le bandeau, et on l'écrit. Mesurer plutôt
 * que soustraire une constante : la hauteur du bandeau change avec la largeur
 * de l'écran, et une valeur écrite en dur y aurait survécu jusqu'au premier
 * redimensionnement.
 */
function caler(root) {
  const page = root.closest(".project-simple-page--studio");
  if (!page) return;

  const haut = page.getBoundingClientRect().top;
  page.style.setProperty("--copilote-hauteur", `${Math.max(320, Math.round(window.innerHeight - haut))}px`);
}

let calage = null;

export function renderCopilote(root, { reload = false } = {}) {
  if (!root) return;

  const etat = ensureState();
  render(root);

  caler(root);
  if (calage) window.removeEventListener("resize", calage);
  calage = () => caler(root);
  window.addEventListener("resize", calage);

  // Le fil est le seul ascenseur de l'écran : la coque ne défile plus. Le lui
  // désigner comme source de défilement ferait chercher au bandeau un
  // mouvement qui n'a plus lieu.
  registerProjectPrimaryScrollSource(null);

  // Les discussions se relisent à la première venue, et sur demande. Une
  // relecture à chaque rendu ferait clignoter le rail pendant qu'on écrit.
  if (reload || (etat.conversations.length === 0 && !etat.chargement)) {
    void chargerConversations(root);
  }
}
