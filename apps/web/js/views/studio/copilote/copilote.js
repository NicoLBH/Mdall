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
import { rendreLeMarkdown } from "../../ui/markdown-leger.js";
import { renderVoileDeDepot } from "../../ui/voile-de-depot.js";
import {
  aRetenirDeLaConversation, executerOutil, outilParId, referenceOutil, sansFigure
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
 * Le Markdown d'une réponse, rendu par le composant partagé.
 *
 * Il est partagé parce qu'un modèle répond de la même façon partout : des
 * titres, des listes, du code, et des tableaux. Cinq expressions régulières
 * suffisaient pour le gras ; elles rendaient un tableau de huit massifs en
 * bouillie de barres verticales, précisément là où la réponse compte le plus.
 */
function mdToHtml(text) {
  return rendreLeMarkdown(text || "");
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
      // Où en est le copilote, étape par étape, avec ce que chacune a produit.
      // Une seule phrase remplacée à chaque tour ne laissait rien voir : on
      // lisait « analyse en cours » sans savoir si la note avait été lue, ni ce
      // qu'on y avait trouvé. La liste s'accumule, et elle reste sous la
      // réponse une fois celle-ci écrite.
      etapes: [],
      // Le rang du message dont la réflexion se poursuit. Une question posée en
      // cours de route interrompt le raisonnement, elle n'en ouvre pas un
      // second : le compte rendu reprend dans le même message, à sa place dans
      // le fil.
      enCours: null,
      // Le tour en cours, s'il y en a un. Il possède `isSending`, `etapes` et
      // `enCours` tant qu'il dure : un tour qui finit après qu'un autre a
      // commencé ne doit pas remettre à zéro ce qui ne lui appartient plus.
      tour: null,
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

/**
 * Toute une discussion, en texte, pour la coller ailleurs.
 *
 * **Ceci est un outil de développement, et il est destiné à disparaître.** Il
 * existe parce qu'un défaut du copilote se raconte mal : « il m'a redemandé la
 * contrainte de sol » ne dit ni ce qu'il avait en mémoire, ni ce qu'il a passé
 * à l'utilitaire, ni ce que l'utilitaire a répondu. La discussion entière, avec
 * qui a dit quoi et ce qui a été calculé, tient en un collage.
 *
 * Il ne partage rien : le texte va dans le presse-papiers de la personne qui
 * clique, et nulle part ailleurs. Une conversation avec le copilote reste
 * privée — c'est son propriétaire qui en dispose, personne d'autre.
 */
export async function transcrireLaDiscussion(id) {
  const etat = ensureState();
  // La discussion ouverte est celle dont l'état vit : elle porte les calculs
  // qui viennent d'avoir lieu, que la liste du rail ne connaît pas encore.
  const messages = etat.conversationId === id
    ? etat.messages ?? []
    : findConversation(etat.conversations, id)?.messages ?? [];

  const entete = findConversation(etat.conversations, id);
  // La version servie fait partie du rapport : un défaut corrigé et un défaut
  // persistant se ressemblent parfaitement quand la page testée n'est pas celle
  // qu'on croit, et cette confusion coûte un aller-retour entier.
  const { versionLisible } = await import("../../../services/version-du-site.js");
  const lignes = [
    `# ${entete?.title || "Discussion sans titre"}`,
    `Projet : ${cleProjet()} — ${messages.length} message${messages.length > 1 ? "s" : ""}`,
    `Version servie : ${await versionLisible().catch(() => "inconnue")}`,
    ""
  ];

  for (const [rang, message] of messages.entries()) {
    const quand = message.ts ? new Date(message.ts).toLocaleString("fr-FR") : "";
    lignes.push(`## [${rang + 1}] ${message.role === "user" ? "Vous" : "Copilote"}${quand ? ` — ${quand}` : ""}`);
    if ((message.etapes ?? []).length) {
      lignes.push(`_${message.etapes.length} étapes :_`,
        ...message.etapes.map((etape) => `  1. ${etape.texte}${etape.detail ? ` — ${etape.detail}` : ""}`));
    }
    if (message.note?.nom) lignes.push(`_Note jointe : ${message.note.nom}_`);
    if (texteDe(message.content)) lignes.push("", texteDe(message.content));

    for (const execution of message.executions ?? []) lignes.push("", ...transcrireUneExecution(execution));
    lignes.push("");
  }

  return lignes.join("\n").trim();
}

/** Ce qu'un utilitaire a reçu, produit, et de qui il l'a tenu. */
function transcrireUneExecution(execution) {
  if (!execution) return [];
  const lignes = [`### Utilitaire — ${execution.titre || execution.outil || "?"} (${execution.statut})`];
  if (execution.message) lignes.push(execution.message);

  const paire = (objet) => Object.entries(objet ?? {})
    .map(([cle, valeur]) => `  - ${cle} : ${typeof valeur === "object" ? JSON.stringify(valeur) : valeur}`);

  const entrees = paire(execution.entrees ?? execution.connues);
  if (entrees.length) lignes.push("- Entrées :", ...entrees);

  const provenances = Object.entries(execution.provenances ?? {})
    .map(([cle, source]) => `  - ${cle} : ${source?.origine}${source?.detail ? ` (${source.detail})` : ""}`);
  if (provenances.length) lignes.push("- Provenance des entrées :", ...provenances);

  for (const maillon of execution.chaine ?? []) {
    lignes.push(`- Enchaînement : ${maillon.libelle} = ${maillon.valeur} ${maillon.unite || ""}`.trimEnd()
      + ` — produit par ${maillon.titre} (${maillon.outil})`);
  }

  if (execution.ecartees?.length) lignes.push(`- Écartées : ${execution.ecartees.join(", ")}`);

  if (execution.valeurs) lignes.push("- Sorties :", `  \`\`\`json`, `  ${JSON.stringify(execution.valeurs)}`, "  \`\`\`");
  if (execution.champs?.length) {
    lignes.push(`- Demandé à l'écran : ${execution.champs.map((champ) => champ.libelle).join(", ")}`);
  }
  if (execution.repondue) {
    const dites = Object.entries(execution.repondue.valeurs ?? {})
      .map(([cle, valeur]) => `${cle} = ${valeur}`).join(", ");
    lignes.push(`- Répondu à l'écran : ${dites || "(rien)"}`);
  }

  return lignes;
}

function texteDe(valeur) {
  return String(valeur ?? "").trim();
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
/**
 * La note partie avec un message.
 *
 * Elle se voit **là où elle a servi** — dans la bulle de la question —, et non
 * plus dans la zone de saisie, où elle donnait l'impression d'attendre encore
 * d'être envoyée. Elle reste jointe à la discussion pour les questions
 * suivantes ; c'est la ligne discrète au-dessus du composeur qui le dit
 * désormais, et non plus une carte qui occupe la place du texte à écrire.
 */
function renderNoteDuMessage(msg) {
  const note = msg?.note;
  if (!note?.nom) return "";
  return `
    <div class="copilote-msg__note">
      ${svgIcon("file-pdf", { width: 18, height: 18 })}
      <span>${escapeHtml(note.nom)}</span>
    </div>
  `;
}

function renderMessage(msg, index, etat = null) {
  const role = msg.role === "user" ? "user" : "assistant";
  const seDeroule = etat?.isSending === true && etat?.enCours === index;
  const quand = msg.ts ? new Date(msg.ts).toLocaleString("fr-FR") : "";

  if (role === "user") {
    // L'horodatage est **sous** la bulle, pas dedans : à l'intérieur, il
    // réservait sa place même invisible, et ce vide se lisait comme un
    // remplissage bas mal réglé. Dehors, il n'occupe rien tant qu'on ne le
    // demande pas, et l'espace qu'il prend au survol aère le fil.
    return `
      <article class="copilote-msg copilote-msg--user">
        ${renderNoteDuMessage(msg)}
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
        ${seDeroule ? renderAttenteDansLeMessage(etat.etapes) : renderEtapesFaites(msg)}
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
/**
 * Les sorties qui ne sont pas des valeurs.
 *
 * Un tableau ou une synthèse a son propre rendu plus bas. Les laisser dans la
 * liste des résultats donnerait « appuis : [object Object] », qui ne dit rien et
 * fait douter de tout le reste.
 */
const TABLEAUX_DE_SORTIE = ["appuis", "correspondances", "gouvernance"];

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

  const lignes = appuis.map((appui, rang) => `
    <tr class="${appui.tenue ? "" : "est-en-defaut"}">
      <td>
        <button type="button" class="copilote-massifs__nom" data-massif="${rang}"
                aria-expanded="${appui.ouvert ? "true" : "false"}">
          <span class="copilote-massifs__chevron" aria-hidden="true">${appui.ouvert ? "▾" : "▸"}</span>
          ${escapeHtml(appui.nom || "")}
        </button>${appui.impose ? ` <em>cotes imposées</em>` : ""}
      </td>
      <td class="mono">${appui.quantite ?? 1}</td>
      <td class="mono">${appui.tenue
        ? `${nombreLisible(appui.Lx)} × ${nombreLisible(appui.Ly)} × ${nombreLisible(appui.Lz)}` : "—"}</td>
      <td class="mono">${appui.ratio !== null ? nombreLisible(appui.ratio, 2) : "—"}</td>
      <td>${escapeHtml(appui.tenue ? (appui.gouverne || "") : (appui.message || "ne vérifie pas"))}</td>
      <td class="mono">${appui.tenue && appui.volume !== null ? `${nombreLisible(appui.volume, 2)} m³` : "—"}</td>
    </tr>
    ${appui.ouvert ? `<tr class="copilote-massifs__detail"><td colspan="6">${renderDetailMassif(appui, execution)}</td></tr>` : ""}`).join("");

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

/** Les cas de l'utilitaire, tels qu'ils se proposent dans une liste. */
const CAS_A_RANGER = [
  ["G", "Permanente"], ["Q", "Exploitation"], ["Sn", "Neige"], ["Fa", "Accidentelle"],
  ["W1", "Vent cas 1"], ["W2", "Vent cas 2"], ["W3", "Vent cas 3"], ["W4", "Vent cas 4"],
  ["Sx", "Séisme X"], ["Sy", "Séisme Y"], ["Sz", "Séisme Z"]
];

/**
 * Ranger soi-même un cas que l'utilitaire n'a pas su nommer.
 *
 * ## Pourquoi on le demande plutôt que de le deviner
 *
 * Ranger un effort décide des pondérations, donc de la semelle. Une neige
 * accidentelle prise pour une neige normale est majorée là où elle ne doit pas
 * l'être, et absente des combinaisons accidentelles où elle doit être. Le
 * modèle rangerait cela de façon plausible ; plausible n'est pas juste, et
 * personne ne le verrait.
 *
 * ## Ce que l'écran propose, et ce qu'il n'impose pas
 *
 * Chaque cas non rangé reçoit une **recommandation avec sa raison** quand une
 * règle défendable existe, et rien quand il n'y en a pas — une case remplie
 * pour ne pas rester vide s'accepte par lassitude.
 *
 * Et **« laisser de côté » reste possible** : l'appui n'est alors pas
 * dimensionné, ce qui est une réponse honnête. Personne n'est obligé de trancher
 * sur une note qu'il n'a pas sous les yeux.
 */
function renderRangement(appui, execution) {
  const perdus = (appui.perdus ?? []).filter((perdu) => perdu?.libelle);
  if (!perdus.length) return "";

  return `
    <form class="copilote-rangement" data-rangement="${escapeHtml(execution?.outil || "")}"
      data-rangement-appui="${escapeHtml(appui.nom || "")}">
      <p class="copilote-outil__legende">Ranger ces cas pour dimensionner cet appui</p>
      ${perdus.map((perdu) => `
        <label class="copilote-rangement__ligne">
          <span class="copilote-rangement__quoi">${escapeHtml(perdu.libelle)}</span>
          <select name="${escapeHtml(perdu.libelle)}" class="copilote-champ__saisie">
            <option value="">— à ranger —</option>
            ${CAS_A_RANGER.map(([cle, dit]) => `
              <option value="${cle}" ${perdu.recommande?.cas === cle ? "selected" : ""}>${escapeHtml(dit)} (${cle})${
                perdu.recommande?.cas === cle ? " — recommandé" : ""}</option>`).join("")}
            <option value="aucun">Ne pas ranger — laisser cet appui de côté</option>
          </select>
        </label>
        ${perdu.recommande?.pourquoi
          ? `<p class="copilote-rangement__pourquoi">${escapeHtml(perdu.recommande.pourquoi)}</p>`
          : `<p class="copilote-rangement__pourquoi copilote-rangement__pourquoi--muet">
              Aucune recommandation : l'intitulé ne dit pas assez pour proposer un rangement défendable.
              Lisez la note avant de choisir.</p>`}
      `).join("")}
      <div class="copilote-rangement__actions">
        <button type="submit" class="copilote-action">Ranger et recalculer</button>
        <span class="copilote-rangement__note">Le calcul reprend avec ce rangement ; rien n'est enregistré.</span>
      </div>
    </form>
  `;
}

/**
 * Le détail d'un massif : ce sur quoi il a été calculé, et ce que ça a donné.
 *
 * ## Pourquoi il est là, et pas seulement dans l'Atelier
 *
 * « Aucune semelle carrée jusqu'à 4 m ne vérifie cet appui » est une réponse
 * qu'on ne peut ni vérifier ni corriger : on ne sait pas si la note a été mal
 * lue, si l'unité est fausse, ou si le sol est réellement trop faible. Les
 * charges retenues et les quatre ratios le disent — un glissement à 12 avec
 * une contrainte à 0,3 ne raconte pas la même histoire qu'une contrainte à 40.
 *
 * ## Ce qu'il n'est pas
 *
 * Ce n'est pas l'écran de l'utilitaire, et il ne cherche pas à l'être. Le fil
 * du copilote est un endroit où l'on **juge**, pas où l'on travaille : on y
 * regarde assez pour décider s'il faut ouvrir l'Atelier, et c'est tout. Les
 * entrées s'y modifient une par une, avec leur mise en page et leurs unités ;
 * les refaire ici serait entretenir deux formulaires pour un seul calcul.
 */
function renderDetailMassif(appui, execution) {
  const unite = uniteDEffort(execution?.valeurs?.unites);
  const cas = Object.entries(appui.charges ?? {});

  const charges = cas.length
    ? `<table class="copilote-detail__table">
         <thead><tr><th>Cas</th><th>V</th><th>Hx</th><th>Hy</th><th>Mx</th><th>My</th></tr></thead>
         <tbody>${cas.map(([nom, c]) => `
           <tr>
             <td>${escapeHtml(nom)}</td>
             ${["V", "Hx", "Hy", "Mx", "My"].map((k) => `<td class="mono">${nombreLisible(c?.[k], 3)}</td>`).join("")}
           </tr>`).join("")}</tbody>
       </table>
       <p class="copilote-detail__note">Efforts non pondérés, en ${escapeHtml(unite)} — repris de la note, sans conversion.</p>`
    : `<p class="copilote-detail__note">Aucune charge n'a été retenue pour cet appui.</p>`;

  const ratios = (appui.ratios ?? []).length
    ? `<ul class="copilote-outil__liste">${appui.ratios.map((r) => `
        <li class="${r.ratio > 1 ? "est-en-defaut" : ""}">
          <span class="copilote-outil__cle">${escapeHtml(r.quoi)}</span>
          <span class="mono">${nombreLisible(r.ratio, 2)}</span>
          ${r.combinaison ? `<span class="copilote-outil__source">${escapeHtml(r.combinaison)}</span>` : ""}
        </li>`).join("")}</ul>`
    : "";

  const surQuoi = appui.tenue
    ? `Vérifications sur la semelle retenue`
    : `Vérifications sur le plus grand essai${appui.coteMaxTentee !== null
      ? ` — ${nombreLisible(appui.coteMaxTentee)} × ${nombreLisible(appui.coteMaxTentee)} m` : ""}`;

  return `
    <div class="copilote-detail">
      <div class="copilote-detail__colonnes">
        <div>
          <p class="copilote-outil__legende">Charges retenues</p>
          ${charges}
        </div>
        <div>
          <p class="copilote-outil__legende">${escapeHtml(surQuoi)}</p>
          ${ratios || `<p class="copilote-detail__note">Le calcul n'a rendu aucun ratio.</p>`}
          ${appui.ratios?.some((r) => r.ratio > 1)
            ? `<p class="copilote-detail__note">Un ratio supérieur à 1 refuse la semelle : c'est lui qu'il faut lire avant de conclure que le sol est en cause.</p>`
            : ""}
        </div>
      </div>
      ${renderRangement(appui, execution)}
      ${(appui.correspondances ?? []).length ? `
        <p class="copilote-outil__legende">Cas de charge de la note</p>
        <ul class="copilote-outil__liste">
          ${appui.correspondances.map((ligne) => `
            <li>
              <span class="copilote-outil__cle">${escapeHtml(ligne.libelle || "")}</span>
              <span class="mono">${escapeHtml(ligne.cas || "non repris")}</span>
              <span class="copilote-outil__source">${escapeHtml(ligne.dit || "")}</span>
            </li>`).join("")}
        </ul>` : ""}
    </div>`;
}

/** L'unité d'effort, telle que le système retenu la nomme. */
function uniteDEffort(unites) {
  return { "{ T ; Tm }": "t", "{ kN ; kNm }": "kN", "{ daN ; daNm }": "daN" }[unites] || "";
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
 * D'où vient une entrée, en trois mots.
 *
 * Sans elle, un tableau de valeurs ne dit pas ce qu'il faut corriger quand il
 * est faux : une valeur venue de la mémoire se corrige dans la mémoire, une
 * valeur produite par un autre utilitaire se corrige à sa source, et une valeur
 * dite dans la conversation se redit.
 */
const MOTS_DE_PROVENANCE = {
  memoire: "mémoire du projet",
  dite: "dite ici",
  defaut: "valeur par défaut",
  utilitaire: "calculée par"
};

function ditLaProvenance(execution, cle) {
  const source = execution?.provenances?.[cle]
    ?? (execution?.venuesDeLaMemoire?.[cle] ? { origine: "memoire" } : null);
  if (!source) return "";

  const mot = MOTS_DE_PROVENANCE[source.origine] || source.origine;
  const suite = source.origine === "utilitaire" ? ` ${source.detail || ""}` : "";
  return `<span class="copilote-outil__source" title="${escapeHtml(source.detail || "")}">${
    escapeHtml(`${mot}${suite}`.trim())}</span>`;
}

/**
 * Ce que le calcul a fallu aller chercher ailleurs.
 *
 * Un enchaînement invisible est un enchaînement qu'on ne peut pas contester :
 * il faut lire quel utilitaire a produit quelle valeur, à partir de quoi. C'est
 * la même exigence que pour un résultat — sauf qu'ici c'est une **entrée** qui
 * a été calculée, et une entrée fausse ne se voit pas dans le résultat.
 */
function renderChaine(execution) {
  const maillons = Array.isArray(execution?.chaine) ? execution.chaine : [];
  if (!maillons.length) return "";

  return `
    <details class="copilote-chaine">
      <summary>Ce qui a été calculé pour pouvoir calculer (${maillons.length})</summary>
      <ul class="copilote-outil__liste">
        ${maillons.map((maillon) => `
          <li>
            <span class="copilote-outil__cle">${escapeHtml(maillon.libelle || maillon.pour || "")}</span>
            <span class="mono">${escapeHtml(String(maillon.valeur))}${
              maillon.unite ? ` ${escapeHtml(maillon.unite)}` : ""}</span>
            <span class="copilote-outil__source">${escapeHtml(maillon.titre || "")} — ${
              escapeHtml(maillon.outil || "")}</span>
          </li>
          <li class="copilote-chaine__entrees">
            <span class="copilote-outil__source">d'après ${
              escapeHtml(Object.entries(maillon.entrees ?? {})
                .map(([cle, valeur]) => `${cle} = ${valeur}`).join(", ") || "rien")}</span>
          </li>`).join("")}
      </ul>
    </details>`;
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
        ${renderChaine(execution)}
      </div>
    `;
  }

  const entrees = Object.entries(execution.entrees ?? {}).map(([cle, valeur]) => `
      <li>
        <span class="copilote-outil__cle">${escapeHtml(cle)}</span>
        <span class="mono">${escapeHtml(String(valeur))}</span>
        ${ditLaProvenance(execution, cle)}
      </li>
    `).join("");

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
      ${renderChaine(execution)}
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
      ${renderGouvernance(execution)}
      <div class="copilote-outil__pied">
        <p class="copilote-outil__note">
          Calculé par ${escapeHtml(execution.source || "l'utilitaire")}. Ce résultat n'entre pas dans la mémoire du projet.
        </p>
        ${renderRemise(execution)}
      </div>
    </div>
  `;
}

/**
 * Ce qui gouverne réellement, quand ce n'est pas le sol.
 *
 * Un tableau identique à 1, 2 et 5 bars se lit comme un calcul qui ignore ce
 * qu'on lui donne. Il dit en fait le contraire : la contrainte du sol est bien
 * prise en compte — elle n'est simplement pas ce qui commande la taille. Le
 * dire évite un doute légitime, et surtout envoie chercher au bon endroit :
 * améliorer le sol ne servira à rien, une longrine ou du lest, si.
 */
function renderGouvernance(execution) {
  const dit = execution?.valeurs?.gouvernance;
  if (!dit?.phrase) return "";
  return `<p class="copilote-outil__gouvernance">${svgIcon("alert")} ${escapeHtml(dit.phrase)}</p>`;
}

/**
 * De quoi porter le calcul dans l'Atelier.
 *
 * Le copilote a calculé ; l'Atelier tient l'étude. Le bouton ne verse rien : il
 * **remet** les massifs, et c'est devant le tableau que quelqu'un décide de les
 * ajouter. Un pré-dimensionnement est un avis, pas une décision.
 */
function renderRemise(execution) {
  if (execution?.statut !== "fait") return "";
  const tenus = (execution.valeurs?.appuis ?? []).filter((appui) => appui?.tenue && appui?.entrees);
  if (!tenus.length) return "";

  return `
    <button type="button" class="copilote-action copilote-outil__remise" data-remise-outil="${escapeHtml(execution.outil)}">
      ${svgIcon("gear")}
      <span>Ouvrir dans l'Atelier</span>
      <em>${tenus.length} massif${tenus.length > 1 ? "s" : ""}</em>
    </button>
  `;
}

/**
 * Ce que le copilote avait proposé, et qu'on n'a pas retenu.
 *
 * Le dire tient en une ligne, et cette ligne évite un malentendu coûteux :
 * l'utilitaire lit l'altitude sur la note jointe, mais le modèle en avait
 * proposé une autre. La question n'était pas de choisir entre les deux — elle
 * était de ne pas laisser croire que la note n'était pas arrivée.
 */
function renderEcartees(execution) {
  const noms = Array.isArray(execution?.ecartees) ? execution.ecartees.filter(Boolean) : [];
  if (!noms.length) return "";
  return `
    <p class="copilote-formulaire__ecartees">
      Écarté sans vous le demander, parce que le calcul le trouve ailleurs — la mémoire du projet,
      la note jointe, ou la valeur par défaut : ${escapeHtml(noms.join(", "))}.
    </p>
  `;
}

/**
 * Porter les massifs calculés jusqu'à l'Atelier.
 *
 * Rien n'est écrit ici : la remise attend dans l'état, et c'est l'écran des
 * fondations qui l'annonce et propose de l'ajouter. Écrire directement ferait du
 * copilote un auteur de l'étude, ce qu'il n'est pas — il propose, quelqu'un
 * décide, et l'on doit pouvoir dire non sans rien défaire.
 */
async function remettreALAtelier(root, outil) {
  const etat = ensureState();
  const execution = (etat.messages ?? [])
    .flatMap((message) => message.executions ?? [])
    .filter((candidat) => candidat?.statut === "fait" && candidat.outil === outil)
    .at(-1);
  if (!execution) return;

  const { semellesDeLaRemise, annoncerLaRemise } = await import("../../../services/fondations-remise.js");
  const semelles = semellesDeLaRemise(execution);
  if (!semelles.length) return;

  store.ui.fondations = store.ui.fondations ?? {};
  store.ui.fondations.remise = {
    semelles,
    outil: execution.outil,
    titre: execution.titre,
    note: execution.valeurs?.affaire || "",
    le: new Date().toISOString()
  };

  // Les panneaux de l'Atelier sont dessinés à l'ouverture : sans l'annonce, la
  // remise n'apparaîtrait qu'au rechargement de la page.
  annoncerLaRemise();

  // On va où le travail se fait. Le rail garde la discussion : on revient
  // dessus par où l'on est venu.
  document.querySelector('[data-side-nav-target="solidity-fondations"]')?.click();
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
  // Une demande à laquelle on a répondu reste dans l'histoire, pas à l'écran.
  if (execution.repondue) return "";

  // Une seule valeur manque, et elle a des choix : des pastilles valent mieux
  // qu'un formulaire. On répond d'un clic au lieu de viser une liste
  // déroulante puis un bouton — et la question posée reste lisible en dessous.
  const seul = (execution.champs ?? []).length === 1 ? execution.champs[0] : null;
  if (seul?.valeurs?.length) return renderPastilles(execution, seul, index);

  const combien = (execution.champs ?? []).length;
  const champs = (execution.champs ?? []).map((champ, rang) => {
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
          ${combien > 1 ? `<em class="copilote-champ__rang">${rang + 1}/${combien}</em>` : ""}
          ${escapeHtml(champ.libelle)}${champ.unite ? ` <span class="copilote-champ__unite">(${escapeHtml(champ.unite)})</span>` : ""}
        </span>
        ${saisie}
        ${champ.aide ? `<span class="copilote-champ__aide">${escapeHtml(champ.aide)}</span>` : ""}
      </label>
    `;
  }).join("");

  // Ce que l'utilitaire sait déjà repart avec le formulaire, en caché. Sans
  // cela, répondre à une question faisait perdre la valeur donnée à la
  // précédente, et l'on redemandait ce qui venait d'être dit.
  const acquis = Object.entries(execution.connues ?? {})
    .filter(([cle, valeur]) => !(execution.champs ?? []).some((champ) => champ.cle === cle)
      && String(valeur ?? "").trim() !== "")
    .map(([cle, valeur]) => `<input type="hidden" data-connue name="${escapeHtml(cle)}" value="${escapeHtml(String(valeur))}">`)
    .join("");

  return `
    <form class="copilote-formulaire" data-formulaire="${index}" data-outil="${escapeHtml(execution.outil)}">
      <p class="copilote-formulaire__titre">
        ${escapeHtml(execution.titre)}
        <span class="copilote-formulaire__reste">${combien === 1
          ? "1 valeur à préciser" : `${combien} valeurs à préciser`}</span>
      </p>
      <div class="copilote-formulaire__champs">${champs}</div>
      ${renderEcartees(execution)}
      ${acquis}
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
      ${renderEcartees(execution)}
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
/**
 * La réponse est arrivée : on la montre, **puis** on l'enregistre.
 *
 * L'ordre inverse laissait le rond tourner pendant toute l'écriture en base —
 * une seconde ou deux pendant lesquelles la réponse était là, lisible, sous un
 * indicateur qui disait le contraire. Le rond doit dire « j'attends encore
 * quelque chose » ; ici il n'y a plus rien à attendre pour lire.
 *
 * L'enregistrement, lui, n'a pas besoin d'être attendu pour afficher. S'il
 * échoue, il le dira — et ce sera un message d'erreur, pas un rond qui tourne.
 */
function afficherLaReponse(root, etat, jeton) {
  if (etat.tour !== jeton) return;
  etat.tour = null;
  etat.enCours = null;
  etat.isSending = false;
  etat.abort = null;
  etat.etapes = [];
  render(root);
}

/**
 * Une étape de plus, et l'écran qui suit.
 *
 * On n'appelle pas `render` : réécrire le fil entier à chaque étape ferait
 * sauter la position de lecture toutes les deux secondes. On ajoute la ligne à
 * la liste, et l'on remplace celle qui tourne.
 */
function noterUneEtape(root, etat, dit) {
  const etape = typeof dit === "string" ? { texte: dit, detail: "" } : (dit ?? {});
  if (!etape.texte) return;
  etat.etapes = [...(etat.etapes ?? []), etape];

  const liste = root.querySelector("#copiloteEtapes");
  if (liste) liste.innerHTML = lignesDAttente(etat.etapes);
}

/** Les étapes franchies, puis celle qui tourne. */
function lignesDAttente(etapes = []) {
  const courante = etapes[etapes.length - 1];
  return etapes.slice(0, -1).map(ligneDEtape).join("") + `
    <li class="copilote-etape est-en-cours">
      <span class="copilote-spinner" aria-hidden="true">${svgIcon("attachment-upload-spinner")}</span>
      <span class="copilote-etape__quoi">${escapeHtml(courante?.texte || "Le copilote réfléchit")}</span>
      ${courante?.detail ? `<span class="copilote-etape__detail">${escapeHtml(courante.detail)}</span>` : ""}
    </li>
  `;
}

function renderAttente(etapes = []) {
  return `
    <article class="copilote-msg copilote-msg--assistant copilote-msg--pending" aria-live="polite">
      <span class="copilote-msg__mark" aria-hidden="true">${svgIcon("copilot", { width: 32, height: 32 })}</span>
      <div class="copilote-msg__main">
        <div class="copilote-msg__meta">
          <span class="copilote-msg__author">Copilote</span>
        </div>
        <ol class="copilote-etapes" id="copiloteEtapes">${lignesDAttente(etapes)}</ol>
      </div>
    </article>
  `;
}

/**
 * Une étape franchie.
 *
 * Elle porte son **détail** — le nom de la note lue, le nombre d'appuis
 * trouvés, la cote hors gel retenue —, et c'est lui qui fait la différence
 * entre un fil d'attente et un compte rendu. « Note lue » rassure ; « Note lue
 * — 9 appuis · unités { T ; Tm } · altitude 241 m » se vérifie.
 */
function ligneDEtape(etape) {
  return `
    <li class="copilote-etape est-faite">
      <span class="copilote-etape__marque" aria-hidden="true">${svgIcon("check-circle-fill", { width: 12, height: 12 })}</span>
      <span class="copilote-etape__quoi">${escapeHtml(etape?.texte || "")}</span>
      ${etape?.detail ? `<span class="copilote-etape__detail">${escapeHtml(etape.detail)}</span>` : ""}
    </li>
  `;
}

/**
 * Ce que le copilote a fait, une fois qu'il l'a fait.
 *
 * Les étapes ne disparaissent pas avec le rond qui tourne : elles se replient
 * sous la réponse. C'est le même besoin que la chaîne des utilitaires — savoir
 * ce qui a servi —, à ceci près qu'on y lit l'ordre et le temps plutôt que la
 * provenance.
 */
/**
 * Les étapes en cours, **dans** le message qui se poursuit.
 *
 * C'est la même liste que celle du bloc d'attente, à ceci près qu'elle ne
 * s'accompagne pas d'une seconde marque de copilote : la réflexion n'a pas
 * recommencé, elle continue.
 */
function renderAttenteDansLeMessage(etapes = []) {
  return `<ol class="copilote-etapes" id="copiloteEtapes">${lignesDAttente(etapes)}</ol>`;
}

function renderEtapesFaites(msg) {
  const etapes = Array.isArray(msg?.etapes) ? msg.etapes : [];
  if (!etapes.length) return "";
  return `
    <details class="copilote-etapes-faites">
      <summary>Ce que le copilote a fait (${etapes.length} étape${etapes.length > 1 ? "s" : ""})</summary>
      <ol class="copilote-etapes">${etapes.map(ligneDEtape).join("")}</ol>
    </details>
  `;
}

function renderCorps(etat) {
  const messages = Array.isArray(etat.messages) ? etat.messages : [];
  if (messages.length === 0 && !etat.isSending) return renderAccueil();

  return `
    <div class="copilote-thread-wrap">
      <div class="copilote-thread" id="copiloteThread">
        <div class="copilote-thread__inner">
          ${messages.map((msg, index) => renderMessage(msg, index, etat)).join("")}
          ${etat.isSending && etat.enCours === null ? renderAttente(etat.etapes) : ""}
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
/**
 * La note **en attente d'envoi**, dans le composeur.
 *
 * Elle n'y reste que jusqu'au premier envoi. Après, elle se lit au-dessus de la
 * question où elle est partie, comme partout ailleurs : une carte qui demeure
 * dans la zone de saisie donne l'impression d'attendre encore d'être envoyée, et
 * mange la place du texte à écrire.
 *
 * Ce qui la remplace ensuite est le trombone lui-même, allumé, avec de quoi la
 * retirer — c'est un état de la discussion, pas une pièce en partance, et un
 * état tient dans une icône.
 */
function renderPieceJointe(etat) {
  const piece = etat.pieceJointe;
  if (!piece || noteDejaPartie(etat)) return "";
  const ko = Math.max(1, Math.round((piece.taille ?? 0) / 1024));

  return `
    <div class="copilote-piece">
      ${svgIcon("file-pdf")}
      <span class="copilote-piece__nom">${escapeHtml(piece.nom)}</span>
      <span class="copilote-piece__poids">${ko} ko</span>
      <button type="button" class="copilote-piece__retirer" id="copiloteRetirerPiece"
              aria-label="Retirer la note jointe" title="Retirer">×</button>
    </div>`;
}

/** La note a-t-elle déjà voyagé avec une question ? */
function noteDejaPartie(etat) {
  const nom = etat?.pieceJointe?.nom;
  return Boolean(nom) && (etat.messages ?? []).some((message) => message?.note?.nom === nom);
}

function render(root) {
  const etat = ensureState();
  const vide = (etat.messages ?? []).length === 0 && !etat.isSending;

  root.innerHTML = `
    <section class="settings-section is-active copilote-section" data-copilote-depot>
      <div class="copilote${vide ? " copilote--empty" : ""}">
        ${renderVoileDeDepot("Déposez une note de calcul (PDF)")}
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
                  <button type="button" class="copilote-tool${
                    noteDejaPartie(etat) ? " est-active" : ""}" id="copiloteJoindre"
                    ${etat.isSending ? "disabled" : ""}
                    aria-label="${noteDejaPartie(etat)
                      ? `${escapeHtml(etat.pieceJointe.nom)} est jointe à la discussion — en joindre une autre`
                      : "Joindre une note de calcul (PDF)"}"
                    title="${noteDejaPartie(etat)
                      ? `${escapeHtml(etat.pieceJointe.nom)} est jointe à la discussion — cliquez pour en joindre une autre`
                      : "Joindre une note de calcul (PDF)"}"
                    >${svgIcon("paperclip")}</button>
                  ${
                    // La note reste jointe pour les questions suivantes — « et si
                    // le sol faisait 2 bars ? » porte sur la même note. Il faut
                    // donc pouvoir la retirer, mais cela ne vaut pas une carte
                    // dans la zone de saisie : une croix à côté du trombone suffit.
                    noteDejaPartie(etat)
                      ? `<button type="button" class="copilote-tool copilote-tool--retirer" id="copiloteRetirerPiece"
                          aria-label="Retirer la note jointe à la discussion"
                          title="Retirer ${escapeHtml(etat.pieceJointe.nom)} de la discussion">×</button>`
                      : ""
                  }
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
  // Ce qui part avec la question se lit dans la question. La note reste jointe
  // à la discussion — on pose souvent deux questions sur la même —, mais elle
  // cesse d'occuper la zone où l'on écrit.
  if (etat.pieceJointe?.nom) {
    question.note = { nom: etat.pieceJointe.nom, taille: etat.pieceJointe.taille ?? null };
  }

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

  // **Qui possède l'état pendant ce tour.** L'enregistrement en base suit
  // l'affichage de la réponse ; pendant cette seconde-là l'écran est rendu et
  // quelqu'un peut déjà répondre à une question. Sans ce jeton, le `finally` du
  // tour précédent effaçait le journal du tour suivant — et l'on voyait les
  // étapes disparaître au moment où elles s'écrivaient.
  const jeton = {};
  etat.tour = jeton;

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
      onEtape: (dit) => noterUneEtape(root, etat, dit)
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
      // Le compte rendu ne disparaît pas avec le rond qui tourne : il se replie
      // sous la réponse, et l'on peut encore vérifier ce qui a été lu où.
      etapes: [...(etat.etapes ?? [])],
      // Le décompte vient du modèle. Nul quand il ne le dit pas : un zéro
      // serait un chiffre, et on ne fabrique pas les chiffres d'un compteur.
      tokensIn: Number.isFinite(usage?.inputTokens) ? usage.inputTokens : null,
      tokensOut: Number.isFinite(usage?.outputTokens) ? usage.outputTokens : null
    };
    etat.messages.push(reponse);
    afficherLaReponse(root, etat, jeton);
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
    // Le tour a pu être remplacé pendant l'enregistrement : on ne remet à zéro
    // que ce qu'on possède encore.
    if (etat.tour === jeton) {
      etat.tour = null;
      etat.isSending = false;
      etat.abort = null;
      etat.etapes = [];
      render(root);
      root.querySelector("#copiloteInput")?.focus();
    }
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

  const dit = (execution?.champs ?? []).find((entree) => entree.cle === champ)?.libelle;
  await lancerCalcul(root, outil, { ...(execution?.connues ?? {}), [champ]: valeur },
    {}, { libelles: dit ? { [champ]: dit } : {}, rang: Number.parseInt(groupe.dataset.pastilles, 10) });
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
/**
 * Ranger les cas qu'on n'a pas su nommer, puis recalculer.
 *
 * Le rangement n'est pas une valeur du projet : c'est une décision de lecture,
 * et elle vaut pour cette note et cette conversation. Elle repart donc avec
 * l'appel de l'outil, comme une entrée d'aiguillage — pas dans la mémoire.
 *
 * « Laisser de côté » est une réponse comme une autre : l'appui n'est pas
 * dimensionné, et c'est plus honnête qu'un rangement pris au hasard.
 */
async function rangerEtRecalculer(root, formulaire) {
  const outil = outilParId(String(formulaire.dataset.rangement || "").replace(/_V\d+$/, ""));
  if (!outil) return;

  const morceaux = [];
  for (const champ of formulaire.querySelectorAll("select[name]")) {
    if (!champ.value) continue;
    morceaux.push(`${champ.name} = ${champ.value}`);
  }
  if (!morceaux.length) return;

  const bouton = formulaire.querySelector("button[type=submit]");
  if (bouton?.disabled) return;
  if (bouton) { bouton.disabled = true; bouton.textContent = "Calcul en cours…"; }

  const etat = ensureState();
  // Ce qui a déjà servi au calcul repart avec lui : la contrainte de sol et la
  // cote hors gel ne se redemandent pas parce qu'on a rangé un cas de charge.
  const dernier = [...(etat.messages ?? [])]
    .flatMap((message) => message.executions ?? [])
    .filter((execution) => execution?.statut === "fait" && execution.outil === referenceOutil(outil))
    .at(-1);

  const rangements = [...morceaux, ...(String(dernier?.entrees?.rangementDesCas ?? "").split(";"))]
    .map((morceau) => morceau.trim())
    .filter(Boolean);

  await lancerCalcul(
    root, outil,
    { rangementDesCas: [...new Set(rangements)].join(" ; ") },
    { ...(dernier?.entrees ?? {}) },
    { libelles: { rangementDesCas: "Rangement des cas de charge" } }
  );
}

async function lancerCalcul(root, outil, saisies, acquis = {}, { libelles = {}, rang = null } = {}) {
  const etat = ensureState();
  if (etat.isSending) return;

  // **La réflexion reprend là où elle s'est interrompue.** Elle n'a pas
  // recommencé : le copilote a buté sur une valeur qu'il ne pouvait pas
  // inventer, quelqu'un la lui a donnée, et il continue. Ouvrir un second
  // message — avec sa marque, son horodatage et ses compteurs — racontait deux
  // réponses là où il n'y a qu'un raisonnement, et la question posée
  // disparaissait entre les deux.
  //
  // Le rang vient du formulaire lui-même : il porte l'index du message qui l'a
  // posé. Le déduire — « le dernier message qui a des exécutions » — marchait
  // dans le cas courant et se trompait dès qu'on répondait à une question plus
  // haut dans le fil, ce qui est exactement le moment où l'on ne comprend pas
  // ce qui se passe.
  const message = Number.isInteger(rang) && etat.messages[rang]
    ? etat.messages[rang]
    : etat.messages.findLast((candidat) => (candidat.executions ?? []).length > 0) ?? null;

  // Le journal reprend son cours, il ne repart pas de zéro : ce qui a été fait
  // avant la question reste au-dessus de la réponse.
  etat.etapes = [...(message?.etapes ?? [])];
  noterUneEtape(root, etat, {
    texte: "Vous avez répondu",
    detail: Object.entries(saisies)
      .map(([cle, valeur]) => `${libelles[cle] || cle} : ${valeur}`)
      .join(" · ") || "sans valeur"
  });

  const assertions = etat.assertionsConnues ?? [];
  // Ce qui vient de l'écran est **confirmé par définition** : quelqu'un vient de
  // le cliquer ou de le saisir. Le garde-fou contre les valeurs inventées n'a
  // plus lieu de s'y opposer — il vise ce que le modèle décide seul.
  //
  // On s'en souvient pour la suite de la conversation, avec la valeur : la
  // question suivante — « reprends la file B en 2 × 2 » — porte alors sur la
  // même contrainte de sol sans qu'on la ressaisisse, et une **autre** valeur
  // sous la même clé reste refusée.
  for (const [cle, valeur] of Object.entries({ ...acquis, ...saisies })) {
    if (String(valeur ?? "").trim()) etat.confirmeesValeurs[cle] = String(valeur).trim();
  }

  const resultat = await executerOutil({
    id: outil.id,
    // Ce que le formulaire portait déjà s'ajoute à ce qu'on vient d'y saisir :
    // répondre à une question ne doit pas faire perdre la réponse à la
    // précédente.
    entrees: { ...acquis, ...saisies },
    assertions,
    confirmees: [...Object.keys(saisies), ...Object.keys(acquis)],
    acquises: etat.confirmeesValeurs ?? {},
    piecesJointes: etat.pieceJointe ? [etat.pieceJointe] : [],
    onEtape: (dit) => noterUneEtape(root, etat, dit)
  });

  retenirDeLaConversation(etat, [resultat]);

  // Toujours manquant : quelque chose n'a pas été fourni, ou l'a été hors des
  // choix. On remplace la demande par la nouvelle, sans repartir vers le
  // modèle — le déranger pour lui dire qu'il manque encore une valeur ne sert
  // personne.
  if (resultat.statut === "manquant" || resultat.statut === "aConfirmer") {
    if (message) {
      message.executions = [resultat];
      message.etapes = [...etat.etapes];
    }
    render(root);
    return;
  }

  // La demande a été satisfaite : le formulaire n'a plus lieu d'être à l'écran —
  // le laisser sous l'ancienne réponse donnerait deux formulaires pour un seul
  // calcul, et on ne saurait plus lequel vient d'aboutir.
  //
  // Mais **elle ne s'efface pas de l'histoire**. Ce qui a été demandé et ce qui
  // a été répondu font partie de ce qui explique le résultat : les supprimer
  // rendait la discussion incompréhensible une fois relue — on y lisait une
  // question du copilote, puis un tableau, et rien entre les deux. On marque
  // donc la demande comme répondue, avec les réponses ; l'écran la cache, la
  // relecture la garde.
  for (const ancien of etat.messages) {
    if (!Array.isArray(ancien.executions)) continue;
    for (const execution of ancien.executions) {
      if (execution?.statut !== "manquant" && execution?.statut !== "aConfirmer") continue;
      execution.repondue = { le: new Date().toISOString(), valeurs: { ...saisies } };
    }
  }

  // Pas de message d'utilisateur ici. « J'ai fourni les valeurs demandées »
  // n'est pas une phrase que quelqu'un a dite : c'est une couture, et elle se
  // voyait. Ce qui a été répondu se lit dans les entrées du résultat, à
  // l'endroit où le calcul a eu lieu — la question et sa réponse restent dans
  // le fil de l'assistant, comme pour tout le reste.
  const relance = `J'ai fourni les valeurs demandées pour « ${outil.titre} ».`;

  // Le résultat entre dans le fil **avant** qu'on aille chercher la phrase qui
  // le raconte. Le calcul a eu lieu : si le modèle ne rappelle pas l'outil, ou
  // si le réseau tombe, le tableau doit rester à l'écran. Le laisser dépendre
  // d'une réponse rédigée, c'est risquer de perdre un travail déjà fait.
  const enCours = message ?? { role: "assistant", content: "", ts: new Date().toISOString() };
  if (!message) etat.messages.push(enCours);
  enCours.executions = [resultat];
  enCours.etapes = [...etat.etapes];

  // Le message qui se poursuit montre ses étapes en direct, à sa place dans le
  // fil : un bloc d'attente séparé ferait à nouveau deux réponses à l'écran.
  etat.enCours = etat.messages.indexOf(enCours);
  // Le tour possède l'état jusqu'à ce qu'un autre le prenne : voir `envoyer`.
  const jeton = {};
  etat.tour = jeton;
  etat.isSending = true;
  etat.lastError = "";
  render(root);

  const controle = new AbortController();
  etat.abort = controle;

  try {
    const { reply, usage, executions } = await sendAssistMessage(relance, {
      signal: controle.signal,
      confirmees: Object.keys(saisies),
      acquises: etat.confirmeesValeurs ?? {},
      piecesJointes: etat.pieceJointe ? [etat.pieceJointe] : [],
      onEtape: (dit) => noterUneEtape(root, etat, dit),
      // Le calcul est déjà fait : on le donne au modèle comme s'il l'avait
      // demandé, avec un identifiant d'appel à nous. C'est ce qui lui permet
      // de reprendre le fil sans redemander.
      toolExchanges: [
        {
          call_id: `formulaire-${Date.now()}`,
          name: outil.id,
          arguments: JSON.stringify({ ...acquis, ...saisies }),
          output: JSON.stringify(sansFigure(resultat))
        }
      ]
    });

    enCours.content = reply || "Réponse vide.";
    // Un modèle qui rappelle l'outil rendrait un second tableau identique : on
    // ne garde que ce qu'il a calculé d'autre.
    enCours.executions = [resultat, ...(Array.isArray(executions) ? executions : [])
      .filter((autre) => autre?.outil !== resultat.outil)];
    enCours.tokensIn = Number.isFinite(usage?.inputTokens) ? usage.inputTokens : null;
    enCours.tokensOut = Number.isFinite(usage?.outputTokens) ? usage.outputTokens : null;
    enCours.etapes = [...etat.etapes];
    afficherLaReponse(root, etat, jeton);
    await enregistrer(etat, enCours);
  } catch (error) {
    if (error?.name !== "AbortError") etat.lastError = error?.message || "Le copilote n'a pas répondu.";
    // Le calcul, lui, a bien eu lieu : on le dit plutôt que de laisser un
    // message vide sous un tableau que personne n'explique.
    enCours.content = enCours.content
      || "Le calcul est fait — le tableau ci-dessus en vient. La phrase qui le raconte n'a pas pu être écrite.";
    await enregistrer(etat, enCours).catch(() => {});
  } finally {
    // Le tour a pu être remplacé pendant l'enregistrement : on ne remet à zéro
    // que ce qu'on possède encore, et le compte rendu ne se recopie que si la
    // réponse n'a pas déjà été affichée — sinon on effacerait ce qu'on garde.
    if (etat.tour === jeton) {
      if ((etat.etapes ?? []).length) enCours.etapes = [...etat.etapes];
      etat.tour = null;
      etat.enCours = null;
      etat.isSending = false;
      etat.abort = null;
      etat.etapes = [];
      render(root);
    }
  }
}

/** Le formulaire rempli : ses champs deviennent les entrées du calcul. */
async function remplirEtCalculer(root, formulaire) {
  const outil = outilParId(String(formulaire.dataset.outil || "").replace(/_V\d+$/, ""));
  if (!outil) return;
  // Le formulaire sait dans quel message il a été posé : c'est ce message-là
  // qui reprend son cours, pas le dernier venu.
  const rang = Number.parseInt(formulaire.dataset.formulaire, 10);

  const saisies = {};
  const acquis = {};
  // Ce que l'écran a demandé, dit avec ses mots : « contrainteLimite : 1 » se
  // relit mal, « Contrainte admissible du sol : 1 » se relit.
  const libelles = {};
  for (const champ of formulaire.querySelectorAll("[name]")) {
    (champ.hasAttribute("data-connue") ? acquis : saisies)[champ.name] = champ.value;
    const intitule = champ.closest(".copilote-champ")?.querySelector(".copilote-champ__libelle");
    if (intitule) libelles[champ.name] = intitule.textContent.trim().replace(/\s+/g, " ");
  }

  // Le calcul prend plusieurs secondes — il parcourt 388 combinaisons par
  // essai. Un bouton qui reste identique pendant ce temps fait croire au clic
  // perdu, et l'on reclique : deux calculs pour une réponse. Le bouton le dit
  // avant d'attendre, et refuse le second clic.
  const bouton = formulaire.querySelector("button[type=submit]");
  if (bouton?.disabled) return;
  if (bouton) {
    bouton.disabled = true;
    bouton.dataset.libelle = bouton.textContent;
    bouton.textContent = "Calcul en cours…";
    bouton.classList.add("est-en-cours");
  }

  try {
    await lancerCalcul(root, outil, saisies, acquis, { libelles, rang });
  } finally {
    // Le formulaire a pu être remplacé par le résultat : on ne rend le bouton
    // que s'il est encore là, c'est-à-dire si le calcul n'a pas abouti.
    if (bouton?.isConnected) {
      bouton.disabled = false;
      bouton.textContent = bouton.dataset.libelle || "Calculer";
      bouton.classList.remove("est-en-cours");
    }
  }
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

  for (const bouton of root.querySelectorAll("[data-massif]")) {
    bouton.addEventListener("click", () => {
      const ligne = bouton.closest("[data-message-index]");
      const message = ensureState().messages[Number(ligne?.dataset.messageIndex)];
      const appuis = (message?.executions ?? []).flatMap((e) => e?.valeurs?.appuis ?? []);
      const appui = appuis[Number(bouton.dataset.massif)];
      if (!appui) return;
      appui.ouvert = !appui.ouvert;
      render(root);
    });
  }

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

  for (const bouton of root.querySelectorAll("[data-remise-outil]")) {
    bouton.addEventListener("click", () => void remettreALAtelier(root, bouton.dataset.remiseOutil));
  }

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

  for (const formulaire of root.querySelectorAll("[data-rangement]")) {
    formulaire.addEventListener("submit", (event) => {
      event.preventDefault();
      void rangerEtRecalculer(root, formulaire);
    });
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
