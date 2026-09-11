/**
 * La tête d'un tableau : ce qu'elle porte, et **qui l'écoute**.
 *
 * ## Quatre tours sur un bouton qui ne fait rien
 *
 * « Ouverts / Fermés » a été réparé trois fois. Chaque fois, le défaut trouvé
 * était réel — la dernière était une vraie divergence, un filtre écrit dans
 * quatre cases — et chaque fois le bouton est resté mort. Puis un quatrième
 * symptôme est arrivé qui a tout éclairé : **les trois boutons de la tête
 * étaient inertes à la fois**, y compris celui qui copie l'état de la liste,
 * qui n'a pourtant rien à voir avec les filtres et qui était branché
 * directement sur son propre nœud.
 *
 * Trois boutons sans rapport, morts ensemble, ne se diagnostiquent pas comme
 * trois défauts : ce n'est pas ce qu'ils font qui est cassé, c'est **l'écoute
 * du clic**.
 *
 * ## Ce qui l'expliquait
 *
 * Les gestes de la tête étaient entendus ailleurs qu'ils n'étaient dessinés :
 * `views/ui/table-head-filter-toggle.js` dessine le groupe, mais le clic était
 * attrapé par un écouteur délégué posé une fois pour toutes sur la racine de
 * l'onglet — une racine que le rendu remplace, que le routeur reconstruit, et
 * qui porte un drapeau « déjà branchée » recopié avec le HTML. Il suffit d'une
 * racine qui hérite du drapeau sans hériter de l'écouteur pour que tout ce
 * qu'elle contient devienne muet — et cela vaut pour tous ses boutons d'un
 * coup, ce qui est exactement ce qu'on observait.
 *
 * ## Le remède : un seul endroit, et le plus tôt possible
 *
 * L'écoute vit désormais **ici**, avec le dessin. Un seul écouteur, posé sur le
 * document, en phase de capture :
 *
 *  - **un seul** : il ne dépend plus d'aucune racine, donc aucun rendu ne peut
 *    le perdre (règle 10, un nom vit à un seul endroit) ;
 *  - **en capture** : il voit le clic avant tout le monde, donc rien en chemin
 *    ne peut l'arrêter avant lui.
 *
 * Il ne s'occupe que de ce qui est **dans une tête de tableau** et **déclaré**
 * ici : un écran qui n'a rien enregistré ne voit aucune différence, et le clic
 * poursuit sa route comme avant.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { copierDansLePressePapiers, marquerCopie } from "./bouton-copier.js";

/** Ce que la tête peut avoir été cliquée pour faire. */
export const GESTE = { RIEN: "", BOUTON: "bouton", COPIE: "copie" };

/** Là où ces gestes ont le droit d'exister. Ailleurs, on ne se mêle de rien. */
export const TETE = ".data-table-shell__head";

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
  if (!cible.closest(TETE)) return rien;

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

function poserLEcoute() {
  if (ecoutePosee || typeof document === "undefined") return;
  ecoutePosee = true;

  document.addEventListener("click", async (evenement) => {
    const cible = evenement?.target;
    if (!cible || typeof cible.closest !== "function") return;

    const geste = gesteDeLaTete(cible, {
      attributs: Array.from(BOUTONS.keys()),
      copies: Array.from(COPIES.keys())
    });
    if (geste.geste === GESTE.RIEN) return;

    // On empêche le geste par défaut, **sans couper la route du clic** : les
    // menus qui se referment sur un clic ailleurs écoutent eux aussi le
    // document, et les faire taire pour se rendre service laisserait des
    // fenêtres ouvertes derrière soi. Être le premier suffit ; il n'y a rien à
    // gagner à être le seul.
    evenement.preventDefault();

    if (geste.geste === GESTE.COPIE) {
      const dit = await COPIES.get(geste.cible)?.();
      if (await copierDansLePressePapiers(dit)) marquerCopie(geste.noeud);
      return;
    }

    BOUTONS.get(geste.attribut)?.(geste.valeur, geste.noeud);
  }, { capture: true });
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
 * Le texte se résout **au clic**, jamais au rendu : ce qu'on veut copier est
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
