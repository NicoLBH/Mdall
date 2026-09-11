/**
 * La tête d'un tableau : ce qu'elle porte, et **qui l'écoute**.
 *
 * ## Six tours sur des boutons qui ne faisaient rien, et ce qu'il y avait
 *
 * « Ouverts / Fermés » a été réparé cinq fois. Chaque défaut trouvé était réel
 * — un filtre écrit dans quatre cases, une écoute déléguée à une racine que le
 * rendu remplace —, et chaque fois les boutons sont restés muets. C'est une
 * observation d'usage qui a tranché, pas une relecture du code :
 *
 *     je clique « Fermés » → rien
 *     je change d'onglet, je reviens → la liste des fermés s'affiche
 *
 * Donc le geste arrivait et l'état s'écrivait. Ce qui manquait était le rendu
 * qui devait suivre : il était précédé d'un appel à une fonction restée **hors
 * de sa fabrique**, où `store` n'existe pas. Chaque clic levait un
 * `ReferenceError` — silencieusement, comme toute exception dans un écouteur —
 * et le gestionnaire s'arrêtait juste avant de redessiner.
 *
 * **La leçon est là.** Une exception dans un écouteur ne fait rien tomber :
 * elle s'écrit dans la console et la page continue, l'air de rien. Un geste à
 * moitié fait ressemble alors trait pour trait à un geste jamais entendu, et
 * l'on va chercher l'écoute cinq tours durant.
 *
 * ## Ce que ce fichier fait
 *
 *  - **il écoute en un seul endroit**, sur le document, en capture : il ne
 *    dépend d'aucune racine, donc aucun rendu ne peut le perdre (règle 10), et
 *    rien en chemin ne peut l'arrêter avant lui ;
 *  - **il entend l'appui autant que le clic.** Un `click` n'existe que si
 *    l'appui et le relâchement tombent sur le même élément ; tout ce qui
 *    remplace sous le doigt ce qu'on presse le supprime sans rien signaler.
 *    L'appui, lui, arrive toujours. Un témoin posé à l'appui empêche le
 *    doublon — un instant, jamais la valeur du bouton, qu'une bascule change
 *    dès qu'elle a agi ;
 *  - **il ne coupe pas la route de l'événement** : les menus qui se referment
 *    sur un clic ailleurs continuent de l'entendre. Être le premier suffit ;
 *  - **il ne se mêle que de ce qui est dans une zone de commande et déclaré
 *    ici** : un écran qui n'a rien enregistré ne voit aucune différence ;
 *  - **il ne laisse aucun geste échouer en silence.**
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { copierDansLePressePapiers, marquerCopie } from "./bouton-copier.js";

/** Ce que la tête peut avoir été cliquée pour faire. */
export const GESTE = { RIEN: "", BOUTON: "bouton", COPIE: "copie" };

/**
 * Là où ces gestes ont le droit d'exister. Ailleurs, on ne se mêle de rien.
 *
 * Deux zones, et c'est le même tableau : sa tête, et la barre de commandes qui
 * la surplombe. Les séparer obligerait à deux écoutes, et une valeur — ici, un
 * geste — qui vit à deux endroits finit par diverger (règle 4).
 */
export const ZONES = ".data-table-shell__head, .project-table-toolbar";

/** @deprecated le nom d'avant, quand il n'y avait que la tête. */
export const TETE = ZONES;

const texte = (valeur) => String(valeur ?? "").trim();

/** Les guillemets sont les seuls caractères qui casseraient le sélecteur. */
const CSS_ECHAPPE = (valeur) => texte(valeur).replace(/["\\]/g, "\\$&");

/** Un nom d'attribut utilisable dans un sélecteur, et rien d'autre. */
const nomSain = (valeur) => /^[a-z][a-z0-9-]*$/.test(texte(valeur));

/**
 * Quel geste ce clic demande — sans toucher au DOM, pour être vérifiable.
 *
 * @param {{closest: (selecteur: string) => any}} cible ce qui a été cliqué
 * @param {object} [declare] ce que les écrans ont enregistré
 * @param {string[]} [declare.attributs] les attributs de données écoutés
 * @param {string[]} [declare.copies] les cibles de copie écoutées
 * @returns {{geste: string, attribut?: string, valeur?: string, cible?: string, noeud?: object}}
 */
export function gesteDeLaTete(cible, { attributs = [], copies = [] } = {}) {
  const rien = { geste: GESTE.RIEN };
  if (!cible || typeof cible.closest !== "function") return rien;
  if (!cible.closest(ZONES)) return rien;

  for (const nom of copies) {
    if (!texte(nom)) continue;
    const noeud = cible.closest(`[data-copier="${CSS_ECHAPPE(nom)}"]`);
    if (noeud) return { geste: GESTE.COPIE, cible: texte(nom), noeud };
  }

  for (const attribut of attributs) {
    if (!nomSain(attribut)) continue;
    const noeud = cible.closest(`[data-${attribut}]`);
    if (noeud) {
      return {
        geste: GESTE.BOUTON,
        attribut,
        valeur: texte(noeud.getAttribute?.(`data-${attribut}`)),
        noeud
      };
    }
  }

  return rien;
}

/* ── L'écoute, une seule fois pour toute l'application ───────────────────── */

const BOUTONS = new Map();
const COPIES = new Map();
let ecoutePosee = false;

/**
 * L'appui déjà traité, dont le clic ne doit pas refaire le geste.
 *
 * **Et surtout pas en le comparant à ce que le bouton demande.** Une bascule
 * change de demande dès qu'elle a agi : le tri passe à « revenir à l'ordre du
 * projet » au rendu qui suit l'appui. Le clic qui arrive ensuite, sur le bouton
 * redessiné, porterait alors une autre valeur, ne se reconnaîtrait pas comme le
 * doublon qu'il est, et défferait aussitôt ce que l'appui venait de faire — le
 * bouton paraîtrait de nouveau mort, pour une raison toute neuve.
 *
 * Un clic suit toujours l'appui qui l'a produit, et rien ne s'intercale entre
 * les deux. Un seul témoin, posé à l'appui et consommé par le clic suivant,
 * suffit donc — sans comparer ni valeur ni bouton. La borne de temps n'est là
 * que pour qu'un appui resté sans clic ne fasse pas taire, une heure plus tard,
 * un clic qui n'a rien à voir.
 */
const APPUI = { traiteA: 0 };
const APPUI_ENCORE_FRAIS = 2000;

function clicDuMemeAppui(quand) {
  if (!APPUI.traiteA || quand - APPUI.traiteA > APPUI_ENCORE_FRAIS) return false;
  APPUI.traiteA = 0;
  return true;
}

async function auGeste(evenement) {
  const cible = evenement?.target;
  if (!cible || typeof cible.closest !== "function") return;

  const geste = gesteDeLaTete(cible, {
    attributs: Array.from(BOUTONS.keys()),
    copies: Array.from(COPIES.keys())
  });

  if (geste.geste === GESTE.RIEN) return;

  const quand = Date.now();

  // **On ne touche pas à l'appui.** Empêcher son geste par défaut supprimerait
  // le clic qui devait suivre, la prise de focus, la sélection — et le
  // `mousedown` que d'autres écrans attendent. On agit, et on laisse la
  // séquence se dérouler : c'est le garde-fou des gestes déjà faits qui empêche
  // le doublon, pas la suppression de l'événement suivant.
  //
  // Sur le clic, en revanche, on empêche le geste par défaut — et sans couper
  // la route : les menus qui se referment sur un clic ailleurs écoutent eux
  // aussi le document, et les faire taire pour se rendre service laisserait des
  // fenêtres ouvertes derrière soi. Être le premier suffit.
  if (evenement.type === "click") evenement.preventDefault();

  if (evenement.type === "click" && clicDuMemeAppui(quand)) return;
  if (evenement.type === "pointerdown") APPUI.traiteA = quand;

  // **Ce qui suit ne doit jamais se perdre en silence.** Une exception dans un
  // écouteur s'écrit dans la console et la page continue, l'air de rien : c'est
  // exactement ainsi que le redessin manquant est passé cinq tours durant pour
  // un bouton sans écoute. Elle se voit, et elle nomme son geste.
  try {
    if (geste.geste === GESTE.COPIE) {
      const dit = await COPIES.get(geste.cible)?.();
      if (await copierDansLePressePapiers(dit)) marquerCopie(geste.noeud);
      return;
    }

    BOUTONS.get(geste.attribut)?.(geste.valeur, geste.noeud);
  } catch (erreur) {
    // eslint-disable-next-line no-console
    console.error("[mdall] le geste de la tête a échoué", { geste: geste.attribut || geste.cible }, erreur);
  }
}

/**
 * Pourquoi **deux** événements, et l'appui d'abord.
 *
 * Un `click` n'existe que si l'appui et le relâchement tombent sur le même
 * élément. Tout ce qui remplace ce qu'on est en train de presser — un rendu,
 * un glisser qui démarre, une tête collée qui se repose — supprime le clic sans
 * rien signaler : le survol continue de répondre, puisqu'il ne demande que la
 * position du pointeur, et le bouton paraît sourd alors qu'il n'a jamais rien
 * eu à entendre.
 *
 * C'est la seule famille de causes qu'un écouteur de `click`, si bien placé
 * soit-il, ne peut pas atteindre. L'appui, lui, arrive toujours. Le `click`
 * reste écouté pour ce qui n'a pas de pointeur — le clavier, l'assistance —
 * et le garde-fou des gestes déjà faits empêche le doublon.
 */
function poserLEcoute() {
  if (ecoutePosee || typeof document === "undefined") return;
  ecoutePosee = true;

  document.addEventListener("pointerdown", auGeste, { capture: true });
  document.addEventListener("click", auGeste, { capture: true });
}

/**
 * Écouter un bouton de tête, désigné par son attribut de données.
 *
 * @param {string} attribut sans le `data-` (`"subjects-status-filter"`)
 * @param {(valeur: string, noeud: Element) => void} faire
 */
export function quandOnClique(attribut, faire) {
  if (!nomSain(attribut) || typeof faire !== "function") return;
  BOUTONS.set(texte(attribut), faire);
  poserLEcoute();
}

/**
 * Écouter un bouton de copie de tête.
 *
 * Le texte se résout **au geste**, jamais au rendu : ce qu'on veut copier est
 * l'état du moment où l'on constate quelque chose, pas celui du dernier dessin.
 *
 * @param {string} cible la valeur de `data-copier`
 * @param {() => string|Promise<string>} texteDe
 */
export function quandOnCopie(cible, texteDe) {
  if (!texte(cible) || typeof texteDe !== "function") return;
  COPIES.set(texte(cible), texteDe);
  poserLEcoute();
}

/** Pour les tests : repartir d'une tête qui n'écoute rien. */
export function oublierLesGestes() {
  BOUTONS.clear();
  COPIES.clear();
}

/* ── Le bouton de tri ────────────────────────────────────────────────────── */

/**
 * Le bouton qui range le tableau.
 *
 * Il est **discret et à sa place** : dans la colonne dont il change l'ordre
 * d'arrivée, à gauche de son intitulé. Un bouton de tri qui vit ailleurs que
 * dans la tête du tableau se cherche à chaque fois.
 *
 * @param {object} options
 * @param {string} options.attribut l'attribut de données, sans le `data-`
 * @param {string} [options.valeur] ce que le clic demandera
 * @param {boolean} [options.actif] le tri est-il en place
 * @param {string} [options.titre] ce que le clic va faire — pas l'état courant
 */
export function renderBoutonDeTri({ attribut = "", valeur = "", actif = false, titre = "Trier" } = {}) {
  if (!nomSain(attribut)) return "";

  return `
    <button
      type="button"
      class="table-head-sort${actif ? " is-active" : ""}"
      data-${escapeHtml(attribut)}="${escapeHtml(valeur)}"
      aria-pressed="${actif ? "true" : "false"}"
      title="${escapeHtml(titre)}" aria-label="${escapeHtml(titre)}"
    >${svgIcon("sort-desc", { className: "octicon octicon-sort-desc" })}</button>
  `;
}
