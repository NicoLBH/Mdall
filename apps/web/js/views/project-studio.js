import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { bindSideNavPanels } from "./ui/side-nav-layout.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import { RANGEMENT, renderVitrineDeLatelier } from "./atelier/vitrine-de-latelier.js";
import { panneauDemandeParLaRoute } from "../services/route-de-latelier.js";
import { utilitaireParCible } from "../services/catalogue-de-latelier.js";
import { renderNavList } from "./ui/nav-list.js";
import {
  bindRailResizer,
  followRailScroll,
  railWidth,
  renderProjectRail
} from "./ui/project-rail.js";
import {
  copiloteConversationId,
  copiloteConversations,
  openConversation,
  renderCopilote,
  startNewConversation
} from "./studio/copilote/copilote.js";
import {
  brancherLeRailDesDiscussions,
  renderRailDesDiscussionsHtml
} from "./ui/rail-des-discussions.js";
import { PROJECT_TAB_IDS } from "../constants.js";
import { store } from "../store.js";
import { renderSolidityClimate } from "./studio/solidity/solidity-climate.js";
import { renderSolidityGeorisks } from "./studio/solidity/solidity-georisks.js";
import { renderSolidityFondations } from "./studio/solidity/solidity-fondations.js";
import { renderIncendieHabitation } from "./studio/incendie/incendie-habitation.js";
import { renderSolidityArkolia } from "./studio/socotec/socotec-enr-pv-hangard-neuf.js";
import { renderSeismicGeneral } from "./studio/seismic/seismic-general.js";
import { renderCtContinuityLab } from "./studio/dev/ct-continuity-lab.js";
import { renderVariablesMutualisees } from "./studio/dev/variables-mutualisees.js";
import { renderLectureDesCr } from "./studio/dev/lecture-des-cr.js";
import { renderRangerLesSujets } from "./studio/dev/ranger-les-sujets.js";
import { renderResolutionConflits } from "./studio/conflits/resolution-conflits.js";
import {
  renderPanneauVariante,
  renderPanneauImpact,
  renderPanneauAudit
} from "./studio/explorations/explorations.js";

/**
 * Ce que le rail porte encore, et pourquoi si peu.
 *
 * **Il portait tout l'Atelier ; il ne porte plus que le Copilote.** Le
 * catalogue des utilitaires est passé dans la vitrine, pour trois raisons dites
 * au long dans `atelier/vitrine-de-latelier.js` — dont la plus lourde : un rail
 * à gauche de l'écran interdit à chaque utilitaire d'avoir le sien.
 *
 * Ce qui reste ici est **la barre latérale du Copilote**, et non celle de
 * l'Atelier : l'historique de ses discussions, et de quoi en ouvrir une neuve.
 * C'est exactement ce que la vitrine rend possible — un utilitaire qui a sa
 * propre gauche.
 */
function renderStudioNav() {
  return renderRailDesDiscussionsHtml({
    id: HISTORIQUE,
    // La ligne mène au panneau du Copilote : c'est le routeur de panneaux de
    // l'Atelier qui l'ouvre, et non nous.
    attributsDeLEntree: { "data-side-nav-target": "studio-copilote" }
  });
}

/**
 * L'accueil de l'Atelier — sa vitrine.
 *
 * Un nom, pas une chaîne recopiée : le routeur de panneaux, la barre de retour
 * et le panneau par défaut le désignent tous les trois (règle 10).
 */
const ACCUEIL = "atelier-vitrine";

/**
 * L'identifiant de l'historique dans le rail.
 *
 * Il est écrit au rendu et relu au rafraîchissement : les deux doivent dire le
 * même mot, et un écran qui se rafraîchirait sur un identifiant d'un autre
 * écran réécrirait l'historique du voisin (règle 10).
 */
const HISTORIQUE = "studioCopiloteHistorique";

/**
 * L'écran de l'Atelier qu'on regarde.
 *
 * Il vit au niveau du module, comme le repli du rail, parce que l'Atelier se
 * redessine entièrement à chaque repli : replier le rail depuis « Fondations —
 * calcul » renvoyait sur le Copilote, c'est-à-dire qu'un geste de mise en page
 * changeait d'écran. Le panneau courant se retient donc au même endroit que la
 * largeur du rail, et il est repris au redessin.
 */
let panneauCourant = ACCUEIL;

/** Où se retiennent le repli et la largeur du rail. Des réglages, pas un état. */
const RAIL_COLLAPSED_KEY = "mdall.studioRailCollapsed.v1";
const RAIL_WIDTH_KEY = "mdall.studioRailWidth.v1";

const railState = { collapsed: false, width: 248 };

function lireReglages() {
  try {
    railState.collapsed = window.localStorage.getItem(RAIL_COLLAPSED_KEY) === "1";
    railState.width = railWidth(Number(window.localStorage.getItem(RAIL_WIDTH_KEY)) || 248);
  } catch {
    // Un navigateur qui refuse le stockage garde le rail déplié.
  }
}

/**
 * L'accueil de l'Atelier, et ce qui s'ouvre depuis lui.
 *
 * ## Deux mises en page, et pourquoi pas une
 *
 * **La vitrine** occupe la largeur pleine : c'est un écran de recherche, il n'a
 * rien à mettre sur un côté.
 *
 * **Un utilitaire ouvert** occupe lui aussi la largeur pleine, et c'est là tout
 * l'objet du changement. Le rail de l'Atelier prenait la gauche de l'écran pour
 * tous ; chaque utilitaire héritait donc d'une largeur amputée et de
 * l'interdiction d'avoir sa propre barre latérale. Il ne reste plus qu'une
 * barre — celle du Copilote — et elle est **dans** le Copilote, comme celle que
 * n'importe quel autre utilitaire pourra désormais se donner.
 *
 * ## Comment on revient à la vitrine
 *
 * **Par l'onglet Atelier**, comme partout ailleurs dans l'application : on
 * reclique l'onglet où l'on est et l'on revient à son accueil. Une barre de
 * retour propre à cet écran ajouterait un second chemin pour un geste que
 * l'application a déjà, et deux chemins finissent par se comporter
 * différemment (règle 4).
 */
function getRouterHtml() {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--studio project-simple-page--atelier">
      <div class="project-simple-scroll project-simple-scroll--parametres project-simple-scroll--atelier" id="projectStudioRouterScroll">
        <div class="settings-shell settings-shell--parametres settings-shell--atelier">

          <div class="project-studio-router__content">

            <section class="project-studio-router__panel is-active" data-side-nav-panel="${ACCUEIL}">
              <div id="projectStudioVitrinePanel"></div>
            </section>

            <section class="project-studio-router__panel project-studio-router__panel--copilote"
              data-side-nav-panel="studio-copilote"
              style="--project-rail-width:${railWidth(railState.width, railState.collapsed)}px">
              <div class="project-rail-layout${railState.collapsed ? " project-rail-layout--collapsed" : ""}">
                ${renderProjectRail({
                  id: "studioRail",
                  label: "Discussions du Copilote",
                  collapsed: railState.collapsed,
                  navHtml: renderNavList({ label: "Discussions du Copilote", html: renderStudioNav() })
                })}
                <div class="project-rail-layout__content">
                  <div id="projectStudioCopilotePanel"></div>
                </div>
              </div>
            </section>

              <section class="project-studio-router__panel" data-side-nav-panel="exploration-variante">
                <div id="projectStudioVariantePanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="exploration-impact">
                <div id="projectStudioImpactPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="exploration-audit">
                <div id="projectStudioAuditPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-climate">
                <div id="projectStudioSolidityClimatePanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-georisks">
                <div id="projectStudioSolidityGeorisksPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-fondations">
                <div id="projectStudioSolidityFondationsPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="incendie-habitation">
                <div id="projectStudioIncendieHabitationPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="solidity-arkolia">
                <div id="projectStudioSolidityArkoliaPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="conflits-resolution">
                <div id="projectStudioConflitsPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="seismic-general">
                <div id="projectStudioSeismicGeneralPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="dev-ct-continuity-lab">
                <div id="projectStudioCtContinuityLabPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="dev-lecture-cr">
                <div id="projectStudioLectureCrPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="dev-ranger-sujets">
                <div id="projectStudioRangerSujetsPanel"></div>
              </section>
              <section class="project-studio-router__panel" data-side-nav-panel="dev-variables">
                <div id="projectStudioVariablesPanel"></div>
              </section>

            </div>
        </div>
      </div>
    </section>
  `;
}

let studioRailDetacher = null;
let studioPoigneeDetacher = null;
let studioCopiloteDetacher = null;

export function renderProjectStudio(root) {
  if (!root) return;

  // Pas de barre de contexte : elle n'affichait qu'« ATELIER » au-dessus d'un
  // écran qui le dit déjà, et ses seize pixels décalaient le haut du rail.
  setProjectViewHeader({ contextLabel: "Atelier", variant: "studio", hideBar: true });

  lireReglages();
  root.innerHTML = getRouterHtml();
  brancherRail(root);

  const vitrineRoot = root.querySelector("#projectStudioVitrinePanel");
  if (vitrineRoot) {
    dessinerLaVitrine(vitrineRoot);
    assurerLesOuvertures(vitrineRoot);
  }

  const copiloteRoot = root.querySelector("#projectStudioCopilotePanel");
  const solidityClimateRoot = root.querySelector("#projectStudioSolidityClimatePanel");
  const solidityGeorisksRoot = root.querySelector("#projectStudioSolidityGeorisksPanel");
  const solidityFondationsRoot = root.querySelector("#projectStudioSolidityFondationsPanel");
  const incendieHabitationRoot = root.querySelector("#projectStudioIncendieHabitationPanel");
  const solidityArkoliaRoot = root.querySelector("#projectStudioSolidityArkoliaPanel");
  const seismicGeneralRoot = root.querySelector("#projectStudioSeismicGeneralPanel");
  const ctContinuityLabRoot = root.querySelector("#projectStudioCtContinuityLabPanel");
  const lectureCrRoot = root.querySelector("#projectStudioLectureCrPanel");
  const variablesRoot = root.querySelector("#projectStudioVariablesPanel");
  const rangerSujetsRoot = root.querySelector("#projectStudioRangerSujetsPanel");
  const conflitsRoot = root.querySelector("#projectStudioConflitsPanel");

  /**
   * Les trois explorations, dessinées seulement quand on y va.
   *
   * Les autres panneaux se dessinent tous au montage : c'est sans conséquence,
   * ils n'attendent rien. Les explorations, elles, **lisent la mémoire** — trois
   * requêtes à l'ouverture de l'Atelier pour des écrans que personne ne regarde
   * — et l'étude d'impact pose le curseur dans son champ de recherche, ce qui
   * volerait le clavier au Copilote. Elles attendent donc leur tour.
   */
  const explorations = {
    "exploration-variante": [root.querySelector("#projectStudioVariantePanel"), renderPanneauVariante],
    "exploration-impact": [root.querySelector("#projectStudioImpactPanel"), renderPanneauImpact],
    "exploration-audit": [root.querySelector("#projectStudioAuditPanel"), renderPanneauAudit]
  };

  /** Vrai si la cible est une exploration, et alors elle est dessinée. */
  const rendreLExploration = (targetId, { force = false } = {}) => {
    const [panneau, rendre] = explorations[targetId] ?? [];
    if (!panneau) return false;
    rendre(panneau, { force });
    return true;
  };

  if (copiloteRoot) renderCopilote(copiloteRoot);
  if (solidityClimateRoot) renderSolidityClimate(solidityClimateRoot, { force: true });
  if (solidityGeorisksRoot) renderSolidityGeorisks(solidityGeorisksRoot);
  if (solidityFondationsRoot) renderSolidityFondations(solidityFondationsRoot);
  if (incendieHabitationRoot) renderIncendieHabitation(incendieHabitationRoot);
  if (solidityArkoliaRoot) renderSolidityArkolia(solidityArkoliaRoot);
  if (seismicGeneralRoot) renderSeismicGeneral(seismicGeneralRoot);
  if (ctContinuityLabRoot) renderCtContinuityLab(ctContinuityLabRoot);
  // **La lecture se dessine au montage, comme les autres.** Elle ne le faisait
  // qu'à la venue, au motif qu'elle n'a rien à montrer tant qu'aucun document
  // n'est déposé. C'était faux dès qu'on revenait à l'Atelier pendant une
  // lecture : le panneau était neuf et vide, et la lecture en cours écrivait
  // dans l'ancien élément, détaché. On avait payé deux appels pour rien.
  if (lectureCrRoot) renderLectureDesCr(lectureCrRoot);
  if (variablesRoot) renderVariablesMutualisees(variablesRoot);
  if (rangerSujetsRoot) renderRangerLesSujets(rangerSujetsRoot);
  if (conflitsRoot) renderResolutionConflits(conflitsRoot);

  const getScrollSource = () => root.querySelector("#projectStudioRouterScroll");

  // **La route l'emporte sur le dernier panneau regardé.** On vient de cliquer
  // un lien qui nomme un panneau : le lui refuser au profit d'où l'on était
  // ferait un raccourci qui n'emmène nulle part.
  const demande = panneauDemandeParLaRoute(window.location?.hash ?? "");
  if (demande) panneauCourant = demande;

  // Le panneau retenu, s'il existe encore : un utilitaire retiré d'une version
  // à l'autre ne doit pas rendre l'Atelier vide au redessin.
  if (!root.querySelector(`[data-side-nav-panel="${CSS.escape(panneauCourant)}"]`)) {
    panneauCourant = ACCUEIL;
  }

  bindSideNavPanels(root, {
    defaultTarget: panneauCourant,
    scrollContainer: getScrollSource()
  });

  // Le panneau retenu peut être une exploration : replier le rail depuis
  // « Tester une variante » ne doit pas rendre le panneau vide.
  rendreLExploration(panneauCourant);

  /**
   * **Une seule écoute, déléguée sur la racine.**
   *
   * Les entrées du rail ne bougent pas, mais les fiches de la vitrine se
   * réécrivent à chaque frappe dans la recherche. Des écouteurs posés sur les
   * fiches mourraient donc avec elles : on chercherait « incendie », on
   * cliquerait la fiche trouvée, et rien ne se passerait — sans erreur, sans
   * rien à quoi se raccrocher. C'est exactement le défaut qui a coûté six tours
   * sur les filtres de sujets.
   *
   * La racine, elle, ne se réécrit pas tant qu'on est dans l'Atelier.
   */
  root.addEventListener("click", (evenement) => {
    const button = evenement.target.closest?.("[data-side-nav-target]");
    if (!button || !root.contains(button)) return;

    registerProjectPrimaryScrollSource(getScrollSource());

    const targetId = String(button.dataset.sideNavTarget || "").trim();
    if (!targetId) return;

    // Le routeur de panneaux n'entend que les boutons qu'il a vus au montage :
    // la bascule se fait donc ici, sur le DOM tel qu'il est maintenant.
    afficherPanneau(root, targetId);

    // **On note après avoir ouvert, sans attendre.** Un utilitaire s'ouvre,
    // qu'on ait pu le compter ou non : faire dépendre l'ouverture d'un
    // compteur ferait payer l'essentiel par l'accessoire.
    noterLOuvertureDe(targetId);

    if (targetId === "solidity-climate" && solidityClimateRoot) renderSolidityClimate(solidityClimateRoot, { force: true });
    // Le copilote se redessine à chaque venue : la conversation a pu avancer
    // dans un autre onglet, et un fil figé donnerait l'impression d'avoir
    // perdu l'échange.
    if (targetId === "studio-copilote" && copiloteRoot) renderCopilote(copiloteRoot);
    // Les conflits se relisent à chaque venue : la mémoire a pu bouger dans
    // un autre onglet, et un écran d'arbitrage qui montre un état périmé est
    // pire qu'un écran vide.
    if (targetId === "conflits-resolution" && conflitsRoot) renderResolutionConflits(conflitsRoot, { force: true });
    // Les variables se relisent à chaque venue : la mémoire a pu bouger, et
    // un nom qui n'existe plus se chercherait longtemps.
    if (targetId === "dev-variables" && variablesRoot) renderVariablesMutualisees(variablesRoot, { force: true });
    // Les sujets se relisent à chaque venue : une proposition a pu être
    // fusionnée entre-temps, et proposer de ranger ce qui l'est déjà
    // demanderait de confirmer deux fois le même déplacement.
    if (targetId === "dev-ranger-sujets" && rangerSujetsRoot) renderRangerLesSujets(rangerSujetsRoot, { force: true });
    // La lecture d'un compte rendu se redessine à la venue : son état vit au
    // niveau du module, donc un document déjà lu se retrouve tel qu'on l'a
    // laissé — redéposer serait repayer un appel.
    if (targetId === "dev-lecture-cr" && lectureCrRoot) renderLectureDesCr(lectureCrRoot);
    // Les explorations se relisent à chaque venue : la mémoire a pu bouger
    // dans un autre onglet, et essayer une valeur sur un socle périmé
    // donnerait un raisonnement juste sur un projet qui n'existe plus.
    rendreLExploration(targetId, { force: true });

    panneauCourant = targetId || panneauCourant;
    marquerActif(root, targetId);
  });

  brancherLeRetourALaccueil(root);
  brancherLaVitrine(root, vitrineRoot);
  brancherCopilote(root, copiloteRoot, getScrollSource);
  marquerActif(root, panneauCourant);

  registerProjectPrimaryScrollSource(getScrollSource());
}

/* ── Revenir à l'accueil par l'onglet ────────────────────────────────────── */

/**
 * **Recliquer l'onglet Atelier ramène à la vitrine.**
 *
 * C'est le geste que l'application a déjà — les Situations, les Documents et
 * les Actions l'écoutent depuis longtemps — et c'est pour cela qu'aucune barre
 * de retour ne le double dans l'Atelier.
 *
 * Sans cette écoute, il ne se passait rien : l'onglet est déjà actif, l'adresse
 * ne change pas, donc le routeur ne redessine rien. Un onglet qu'on reclique et
 * qui reste muet se lit comme un onglet cassé, pas comme un onglet déjà là.
 */
let retourALaccueilBranche = false;
let racineDeLatelier = null;

/**
 * Effacer le panneau que l'adresse demandait.
 *
 * **Sans cela, on y retournerait tout seul.** L'adresse l'emporte sur le
 * dernier panneau regardé — c'est ce qui fait marcher le raccourci du Copilote
 * — donc tant que `…/atelier/copilote` reste dans la barre, le moindre redessin
 * rouvrirait le Copilote. On reclique l'onglet, la vitrine s'affiche, une
 * synchronisation passe, et l'on se retrouve ailleurs sans avoir rien fait.
 *
 * `replaceState` plutôt qu'écrire le `hash` : écrire déclencherait un
 * `hashchange`, donc un rendu complet de l'onglet, pour un changement qu'on
 * vient de faire à la main.
 */
function oublierLePanneauDeLaRoute() {
  try {
    const hash = String(window.location?.hash ?? "");
    if (!panneauDemandeParLaRoute(hash)) return;

    const garde = hash.replace(/^#/, "").split("/").slice(0, 3).join("/");
    window.history.replaceState(null, "", `#${garde}`);
  } catch {
    // Un navigateur qui refuse l'historique garde son adresse : le panneau
    // s'affiche quand même, et c'est le seul point qui compte ici.
  }
}

function brancherLeRetourALaccueil(root) {
  // La racine change à chaque rendu de l'onglet ; l'écoute, elle, se pose une
  // seule fois. En poser une par rendu les empilerait, et le dixième passage
  // dans l'Atelier redessinerait dix fois.
  racineDeLatelier = root;
  if (retourALaccueilBranche) return;
  retourALaccueilBranche = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (evenement) => {
    const detail = evenement?.detail || {};
    if (String(detail.tabId || "").trim().toLowerCase() !== PROJECT_TAB_IDS.STUDIO) return;

    // Un autre projet a reclicé son onglet : ce n'est pas le nôtre.
    const projetCourant = String(store.currentProjectId || "").trim();
    const projetDeLEvenement = String(detail.projectId || "").trim();
    if (projetDeLEvenement && projetCourant && projetDeLEvenement !== projetCourant) return;

    const root = racineDeLatelier;
    if (!root || !root.isConnected) return;

    oublierLePanneauDeLaRoute();
    afficherPanneau(root, ACCUEIL);
    marquerActif(root, ACCUEIL);
  });
}

/**
 * Compter une ouverture — mais seulement d'un utilitaire du catalogue.
 *
 * La vitrine elle-même n'est pas un utilitaire : la compter ferait d'elle la
 * première des vedettes, et la rangée mettrait en avant l'écran depuis lequel
 * on la regarde.
 */
function noterLOuvertureDe(targetId) {
  if (!utilitaireParCible(targetId)) return;

  import("../services/ouvertures-de-latelier-supabase.js")
    .then(({ noterLOuverture }) => noterLOuverture(targetId))
    .catch(() => {
      // Un utilitaire s'ouvre, qu'on ait pu le compter ou non.
    });
}

/* ── La vitrine ──────────────────────────────────────────────────────────── */

/**
 * Ce qu'on a tapé, et comment on a rangé.
 *
 * Cela vit au niveau du module, comme le repli du rail et pour la même raison :
 * l'Atelier se redessine entièrement à plusieurs occasions, et une recherche
 * perdue au redessin obligerait à la retaper sans qu'on comprenne pourquoi.
 */
const vitrineEtat = { recherche: "", rayon: "", rangement: RANGEMENT.RECOMMANDE, ouvertures: null };

/**
 * Les compteurs d'ouverture, lus une fois, puis gardés.
 *
 * `null` veut dire « pas encore lus » — la rangée se range alors par l'ordre du
 * catalogue, ce qui est un ordre stable et non un classement inventé.
 *
 * **On ne les relit pas à chaque redessin** : ils bougent d'une unité par
 * ouverture, et une rangée qui se réordonnerait sous le doigt cesserait d'être
 * un repère. Ils se relisent au prochain passage dans l'Atelier.
 */
let ouverturesEnCours = false;

function assurerLesOuvertures(hote) {
  if (ouverturesEnCours || vitrineEtat.ouvertures !== null) return;
  ouverturesEnCours = true;

  (async () => {
    try {
      const { lireLesOuvertures } = await import("../services/ouvertures-de-latelier-supabase.js");
      const lues = await lireLesOuvertures();
      // `null` : la base n'a pas répondu. On ne retient rien, et la prochaine
      // venue réessaiera — plutôt que de figer un classement qu'on n'a pas lu.
      if (!lues) return;

      vitrineEtat.ouvertures = lues;

      // **On ne redessine que si la rangée est visible.** Les compteurs
      // arrivent après coup ; si quelqu'un a commencé à taper entretemps, la
      // rangée est déjà masquée — redessiner lui reprendrait le curseur pour
      // changer un ordre que personne ne regarde.
      if (!vitrineEtat.recherche && !vitrineEtat.rayon) dessinerLaVitrine(hote);
    } catch {
      // Un Atelier se parcourt, qu'on ait pu lire les compteurs ou non.
    } finally {
      ouverturesEnCours = false;
    }
  })();
}

function dessinerLaVitrine(hote) {
  if (!hote) return;
  hote.innerHTML = renderVitrineDeLatelier(vitrineEtat);
}

/**
 * L'écoute de la vitrine.
 *
 * **Déléguée sur l'hôte, et non posée sur les boutons** : la grille se réécrit
 * à chaque frappe, donc des écouteurs posés sur les fiches disparaîtraient avec
 * elles — la première recherche tuerait la navigation.
 *
 * Les clics sur les fiches, eux, ne sont **pas** entendus ici : elles portent
 * `data-side-nav-target`, et c'est le routeur de l'Atelier qui les ouvre, comme
 * il ouvrait les entrées du rail. Un second chemin pour un seul geste finirait
 * par diverger du premier (règle 4).
 */
function brancherLaVitrine(root, hote) {
  if (!hote) return;

  // Le curseur revient où il était : réécrire le champ à chaque frappe le
  // renverrait en fin de ligne, et corriger une faute au milieu d'un mot
  // deviendrait impossible.
  hote.addEventListener("input", (evenement) => {
    const champ = evenement.target.closest?.("#atelierRecherche");
    if (!champ) return;

    const ou = champ.selectionStart;
    vitrineEtat.recherche = champ.value;
    dessinerLaVitrine(hote);

    const rendu = hote.querySelector("#atelierRecherche");
    if (!rendu) return;
    rendu.focus();
    try {
      rendu.setSelectionRange(ou, ou);
    } catch {
      // Un champ de type `search` refuse parfois la position : le curseur reste
      // en fin de ligne, ce qui vaut mieux que de perdre le focus.
    }
  });

  hote.addEventListener("click", (evenement) => {
    // Une fiche ou une vedette : le routeur s'en charge, on ne s'en mêle pas.
    if (evenement.target.closest?.("[data-side-nav-target]")) return;

    const rayon = evenement.target.closest?.("[data-atelier-rayon]");
    if (rayon) {
      vitrineEtat.rayon = rayon.dataset.atelierRayon ?? "";
      dessinerLaVitrine(hote);
      return;
    }

    const onglet = evenement.target.closest?.(".atelier-rangement [data-light-tab-target]");
    if (!onglet) return;
    vitrineEtat.rangement = onglet.dataset.lightTabTarget || RANGEMENT.RECOMMANDE;
    dessinerLaVitrine(hote);
  });
}

/**
 * Le repère de l'entrée courante.
 *
 * Le routeur de panneaux pose `is-active` sur le bouton ; la liste de
 * navigation, elle, porte le trait bleu sur le `li`. Les deux ne se parlaient
 * pas : le trait restait sur Copilote quel que soit l'utilitaire ouvert. Il se
 * pose ici, au même endroit que dans la Mémoire.
 *
 * L'entrée Copilote s'efface au profit de la discussion ouverte dès que
 * celle-ci figure dans l'historique : deux traits bleus pour un seul écran ne
 * désignent plus rien.
 */
function marquerActif(root, targetId) {
  // Le Copilote a sa propre mise en page : une seule barre de défilement, celle
  // du fil, et la saisie posée en bas. La classe le dit à la feuille de style
  // plutôt qu'un sélecteur qui devinerait le panneau actif.
  root.querySelector(".project-simple-page--studio")
    ?.classList.toggle("project-simple-page--copilote", targetId === "studio-copilote");

  const filCourant = copiloteConversationId();
  const historique = copiloteConversations().some((conversation) => conversation.id === filCourant);

  for (const item of root.querySelectorAll(".project-rail .nav-list__item")) {
    const fil = item.querySelector("[data-copilote-conversation]")?.dataset.copiloteConversation || "";
    const cible = item.querySelector("[data-side-nav-target]")?.dataset.sideNavTarget || "";

    const actif = fil
      ? targetId === "studio-copilote" && fil === filCourant
      : cible === targetId && !(cible === "studio-copilote" && historique);

    item.setAttribute("data-active", actif ? "true" : "false");
  }
}

/** Afficher un panneau sans passer par un clic : rouvrir un fil en a besoin. */
function afficherPanneau(root, targetId) {
  panneauCourant = targetId || panneauCourant;
  for (const panneau of root.querySelectorAll("[data-side-nav-panel]")) {
    panneau.classList.toggle("is-active", panneau.dataset.sideNavPanel === targetId);
  }
  // Le routeur pose `is-active` sur le bouton du panneau : sans ça, le rail
  // désignerait encore l'écran d'où l'on vient.
  for (const bouton of root.querySelectorAll("[data-side-nav-target]")) {
    const actif = bouton.dataset.sideNavTarget === targetId;
    bouton.classList.toggle("is-active", actif);
    bouton.setAttribute("data-side-nav-active", actif ? "true" : "false");
    bouton.setAttribute("aria-current", actif ? "page" : "false");
  }
}

/**
 * Les discussions dans le rail.
 *
 * Tout le geste — le kebab, renommer, copier, effacer, ouvrir un sujet — vit
 * dans `ui/rail-des-discussions.js` : le Copilote transverse montre le même
 * rail, et deux copies d'un menu qui **efface sans retour** divergent au
 * premier correctif.
 *
 * Ce qui reste ici est ce que l'Atelier est seul à savoir : où le Copilote est
 * monté, quel panneau afficher, et quel repère marquer dans le rail.
 */
function brancherCopilote(root, copiloteRoot, getScrollSource) {
  // L'écouteur d'avant se retire : l'Atelier se redessine à chaque repli du
  // rail, et des écouteurs empilés redessineraient l'historique autant de fois
  // qu'on a replié.
  if (studioCopiloteDetacher) studioCopiloteDetacher();
  studioCopiloteDetacher = null;

  if (!copiloteRoot) return;

  const venir = () => {
    registerProjectPrimaryScrollSource(getScrollSource());
    afficherPanneau(root, "studio-copilote");
    renderCopilote(copiloteRoot);
    marquerActif(root, "studio-copilote");
  };

  studioCopiloteDetacher = brancherLeRailDesDiscussions({
    racine: root,
    id: HISTORIQUE,
    panneau: copiloteRoot,
    surNouvelle: () => { startNewConversation(); venir(); },
    surOuverture: (id) => {
      if (!openConversation(id)) return false;
      venir();
      return true;
    },
    // Le panneau courant, pas le Copilote : un message qui arrive pendant qu'on
    // est sur un utilitaire ne doit pas déplacer le repère du rail.
    apresRafraichissement: () => marquerActif(root, panneauCourant),
    redessinerLePanneau: (panneau) => renderCopilote(panneau)
  });
}

/**
 * Le rail : son calage, sa poignée, son repli.
 *
 * Le même composant que la Mémoire — l'Atelier s'étoffe, et il lui faut la même
 * place. Redessiner l'écran entier au repli serait excessif : seul le rail et
 * la marge du contenu changent, et la variable les porte tous les deux.
 */
function brancherRail(root) {
  if (studioRailDetacher) studioRailDetacher();
  if (studioPoigneeDetacher) studioPoigneeDetacher();

  studioRailDetacher = followRailScroll(root.querySelector(".project-rail"));
  studioPoigneeDetacher = bindRailResizer({
    root,
    id: "studioRail",
    pageSelector: ".project-simple-page--studio",
    getWidth: () => railState.width,
    onEnd: (largeur) => {
      railState.width = largeur;
      try {
        window.localStorage.setItem(RAIL_WIDTH_KEY, String(largeur));
      } catch {
        // Sans stockage, la largeur revient à sa valeur par défaut.
      }
    }
  });

  root.querySelector("[data-project-rail-collapse]")?.addEventListener("click", () => {
    railState.collapsed = !railState.collapsed;
    try {
      window.localStorage.setItem(RAIL_COLLAPSED_KEY, railState.collapsed ? "1" : "0");
    } catch {
      // Le repli ne se retiendra pas, l'écran fonctionne quand même.
    }
    renderProjectStudio(root);
  });
}
