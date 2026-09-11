/**
 * La tête d'un tableau : ce qu'elle porte, et **qui l'écoute**.
 *
 * ## Cinq tours sur des boutons qui ne font rien
 *
 * « Ouverts / Fermés » a été réparé quatre fois. Chaque défaut trouvé était
 * réel — un filtre écrit dans quatre cases, une écoute déléguée à une racine
 * que le rendu remplace — et chaque fois les boutons sont restés muets. Le
 * quatrième tour a déplacé l'écoute ici, en un seul endroit, sur le document,
 * en phase de capture. Un bouton de tri neuf y a été branché du même geste.
 *
 * **Il est né muet lui aussi.** C'est le constat qui tranche : un bouton qui
 * n'a jamais connu l'ancienne écoute, enregistré auprès d'un écouteur posé sur
 * le document, ne peut pas échouer pour la raison qu'on invoquait. Un écouteur
 * de `click` en capture sur le document voit tous les clics de la page — sauf
 * ceux qui n'existent pas.
 *
 * ## Un clic peut ne jamais exister
 *
 * Le navigateur ne produit un `click` que si l'appui **et** le relâchement
 * tombent sur le même élément. Tout ce qui remplace sous le doigt ce qu'on est
 * en train de presser supprime le clic sans rien signaler : un rendu, un
 * glisser qui démarre, une tête collée qui se repose. Et le survol, lui,
 * continue de répondre — il ne demande que la position du pointeur.
 *
 * Un bouton qui s'éclaire au survol et ne fait rien au clic a donc **deux**
 * explications, pas une : il n'est pas écouté, ou bien il n'est jamais cliqué.
 * Quatre tours ont été dépensés sur la première sans jamais envisager la
 * seconde.
 *
 * ## Ce que ce fichier fait, du coup
 *
 *  - **il entend l'appui, pas seulement le clic.** L'appui arrive toujours ;
 *    c'est la seule famille de causes qu'un écouteur de `click`, si bien placé
 *    soit-il, ne peut pas atteindre. Le `click` reste écouté pour ce qui n'a
 *    pas de pointeur — le clavier, l'assistance — et un garde-fou empêche le
 *    même geste d'être fait deux fois ;
 *  - **il écoute en un seul endroit**, sur le document, en capture : il ne
 *    dépend d'aucune racine, donc aucun rendu ne peut le perdre (règle 10), et
 *    rien en chemin ne peut l'arrêter avant lui ;
 *  - **il ne coupe pas la route de l'événement** : les menus qui se referment
 *    sur un clic ailleurs continuent de l'entendre. Être le premier suffit ;
 *  - **il ne se mêle que de ce qui est dans une tête de tableau et déclaré
 *    ici** : un écran qui n'a rien enregistré ne voit aucune différence ;
 *  - **il mesure, et il le dit.** `veillerSurLaTete` va voir, après chaque
 *    rendu, quel élément reçoit réellement le point où chaque bouton se
 *    dessine. Quand ce n'est pas le bouton, la tête le dit et nomme ce qui le
 *    recouvre — plutôt que de laisser croire, une sixième fois, à un bouton
 *    sans écoute.
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

/** Ce que la tête a réellement reçu, et quand. Le reste n'est que supposition. */
const PERCU = { dernier: null, combien: 0 };

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
  const cle = geste.geste === GESTE.COPIE ? `copie:${geste.cible}` : `${geste.attribut}=${geste.valeur}`;
  PERCU.dernier = { cle, par: evenement.type, quand };
  PERCU.combien += 1;

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

  if (geste.geste === GESTE.COPIE) {
    const dit = await COPIES.get(geste.cible)?.();
    if (await copierDansLePressePapiers(dit)) marquerCopie(geste.noeud);
    return;
  }

  BOUTONS.get(geste.attribut)?.(geste.valeur, geste.noeud);
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

/**
 * Ce que l'écoute sait d'elle-même.
 *
 * Cinq tours ont été perdus à supposer, depuis le code, que l'écoute était
 * posée et que les gestes arrivaient. Ces deux faits se constatent ; ils ne se
 * déduisent pas (règle 12).
 */
export function etatDeLEcoute() {
  return {
    posee: ecoutePosee,
    gestes: Array.from(BOUTONS.keys()),
    copies: Array.from(COPIES.keys()),
    recus: PERCU.combien,
    dernier: PERCU.dernier ? { ...PERCU.dernier } : null
  };
}

/** Pour les tests : repartir d'une tête qui n'écoute rien. */
export function oublierLesGestes() {
  BOUTONS.clear();
  COPIES.clear();
}

/* ── La veille : ce qui reçoit vraiment le geste ─────────────────────────── */

/**
 * Nommer un nœud assez pour le reconnaître, pas assez pour emporter du contenu.
 *
 * Ce texte peut finir dans un message : il ne porte donc que la balise, les
 * classes et l'identifiant — jamais ce qui est écrit dedans.
 */
export function nomDuNoeud(noeud) {
  if (!noeud) return "rien";
  const balise = texte(noeud.tagName).toLowerCase() || "?";
  const id = texte(noeud.id) ? `#${texte(noeud.id)}` : "";
  const classes = texte(noeud.className && noeud.className.baseVal !== undefined
    ? noeud.className.baseVal
    : noeud.className)
    .split(/\s+/).filter(Boolean).slice(0, 3).map((classe) => `.${classe}`).join("");
  return `${balise}${id}${classes}`.slice(0, 80);
}

/**
 * Lequel de ces boutons ne reçoit pas le geste, et qui le reçoit à sa place.
 *
 * **Pourquoi cette mesure existe.** Cinq tours ont été perdus à raisonner sur du
 * code qui, lu ligne à ligne, était juste. Ce qui manquait n'était pas une idée
 * de plus : c'était **ce que le navigateur fait du point** où l'on appuie. Un
 * bouton recouvert par un élément transparent se survole encore — le survol
 * remonte toute la chaîne — mais le geste part ailleurs. Rien à l'écran ne
 * distingue ce cas d'un bouton sans écoute, et c'est précisément pour cela
 * qu'il faut le mesurer plutôt que le supposer (règle 12 : on enregistre ce
 * qui a été vérifié).
 *
 * La fonction ne touche pas au DOM : elle reçoit les boutons, leur cadre et de
 * quoi interroger le point. C'est ce qui la rend vérifiable.
 *
 * @param {{cle: string, noeud: object, cadre: {left:number,top:number,width:number,height:number}}[]} boutons
 * @param {object} outils
 * @param {(x: number, y: number) => object|null} outils.elementDuPoint
 * @returns {{cle: string, recouvertPar: string}[]} vide quand tout va bien
 */
export function ceQuiRecouvre(boutons = [], { elementDuPoint = null, fenetre = null } = {}) {
  if (typeof elementDuPoint !== "function") return [];

  const ennuis = [];

  for (const bouton of Array.isArray(boutons) ? boutons : []) {
    const cadre = bouton?.cadre;
    const noeud = bouton?.noeud;
    if (!noeud || !cadre) continue;
    // Un bouton qui n'occupe aucune place n'est pas recouvert : il n'est pas
    // dessiné. Le signaler ferait du bruit sur chaque écran replié.
    if (!(cadre.width > 0) || !(cadre.height > 0)) continue;

    const x = cadre.left + cadre.width / 2;
    const y = cadre.top + cadre.height / 2;

    // Hors de la fenêtre, la question n'a pas de sens : on interrogerait un
    // point que personne ne peut viser, et ce qui s'y trouve accuserait un
    // innocent. Ne pas savoir se dit en ne disant rien, pas en accusant
    // (règle 5).
    if (fenetre && (x < 0 || y < 0 || x > Number(fenetre.largeur || 0) || y > Number(fenetre.hauteur || 0))) continue;

    const dessus = elementDuPoint(x, y);
    if (!dessus) continue;
    if (dessus === noeud) continue;
    if (typeof noeud.contains === "function" && noeud.contains(dessus)) continue;

    ennuis.push({ cle: texte(bouton.cle), recouvertPar: nomDuNoeud(dessus) });
  }

  return ennuis;
}

/**
 * La même mesure, prise sur la page, et **dite à l'écran**.
 *
 * Elle n'écrit que lorsqu'il y a quelque chose à dire. Un bouton qui reçoit ses
 * gestes ne porte aucune phrase ; un bouton recouvert le dit, et nomme ce qui
 * le recouvre. Se taire dans ce cas laisserait croire à un bouton sans écoute —
 * l'erreur qui a coûté cinq tours.
 *
 * @param {ParentNode} [racine] où chercher les têtes
 * @returns {{cle: string, recouvertPar: string}[]}
 */
export function veillerSurLaTete(racine = null) {
  if (typeof document === "undefined") return [];
  const ou = racine || document;
  if (typeof ou.querySelectorAll !== "function") return [];

  const selecteurs = [
    ...Array.from(BOUTONS.keys()).filter(nomSain).map((attribut) => `[data-${attribut}]`),
    ...Array.from(COPIES.keys()).filter(Boolean).map((cible) => `[data-copier="${CSS_ECHAPPE(cible)}"]`)
  ];
  if (!selecteurs.length) return [];

  const ennuis = [];

  for (const tete of ou.querySelectorAll(TETE)) {
    const boutons = Array.from(tete.querySelectorAll(selecteurs.join(","))).map((noeud) => ({
      cle: nomDuNoeud(noeud),
      noeud,
      cadre: noeud.getBoundingClientRect()
    }));

    const trouves = ceQuiRecouvre(boutons, {
      elementDuPoint: (x, y) => document.elementFromPoint(x, y),
      fenetre: {
        largeur: window.innerWidth || document.documentElement?.clientWidth || 0,
        hauteur: window.innerHeight || document.documentElement?.clientHeight || 0
      }
    });

    direCeQuiRecouvre(tete, trouves);
    ennuis.push(...trouves);
  }

  return ennuis;
}

const VEILLE = "table-head-veille";

function direCeQuiRecouvre(tete, ennuis) {
  const ancienne = tete.querySelector(`.${VEILLE}`);
  if (!ennuis.length) {
    ancienne?.remove();
    return;
  }

  const dit = `Ces boutons ne reçoivent pas le geste : ${
    ennuis.map((ennui) => `${ennui.cle} est recouvert par ${ennui.recouvertPar}`).join(" · ")
  }`;

  const ligne = ancienne || tete.ownerDocument.createElement("div");
  ligne.className = VEILLE;
  ligne.textContent = dit;
  if (!ancienne) tete.appendChild(ligne);
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
