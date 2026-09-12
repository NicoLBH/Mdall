import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";
import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { bindSideNavPanels } from "./ui/side-nav-layout.js";
import { RANGEMENT, renderVitrineDeLatelier } from "./atelier/vitrine-de-latelier.js";
import { utilitaireParCible } from "../services/catalogue-de-latelier.js";
import {
  renderNavList,
  renderNavListGroup,
  renderNavListItem
} from "./ui/nav-list.js";
import {
  bindRailResizer,
  followRailScroll,
  railWidth,
  renderProjectRail
} from "./ui/project-rail.js";
import {
  copiloteConversationId,
  copiloteConversations,
  forgetConversationLocally,
  openConversation,
  renameConversationLocally,
  renderCopilote,
  startNewConversation,
  transcrireLaDiscussion
} from "./studio/copilote/copilote.js";
import { conversationTitle } from "../services/copilote-conversations.js";
import { store } from "../store.js";
import {
  deleteConversation,
  renameConversation
} from "../services/copilote-conversations-supabase.js";
import { renderSolidityClimate } from "./studio/solidity/solidity-climate.js";
import { renderSolidityGeorisks } from "./studio/solidity/solidity-georisks.js";
import { renderSolidityFondations } from "./studio/solidity/solidity-fondations.js";
import { renderIncendieHabitation } from "./studio/incendie/incendie-habitation.js";
import { renderSolidityArkolia } from "./studio/socotec/socotec-enr-pv-hangard-neuf.js";
import { renderSeismicGeneral } from "./studio/seismic/seismic-general.js";
import { renderCtContinuityLab } from "./studio/dev/ct-continuity-lab.js";
import { copierDansLePressePapiers } from "./ui/bouton-copier.js";
import { renderVariablesMutualisees } from "./studio/dev/variables-mutualisees.js";
import { renderResolutionConflits } from "./studio/conflits/resolution-conflits.js";
import {
  renderPanneauVariante,
  renderPanneauImpact,
  renderPanneauAudit
} from "./studio/explorations/explorations.js";

/**
 * L'historique des discussions, sous l'entrée Copilote.
 *
 * Il est plat et sans intitulé de groupe : ce ne sont pas des utilitaires de
 * plus, ce sont les fils d'un seul. Le décalage à gauche le dit mieux qu'un
 * titre, qui ferait croire à une rubrique.
 */
function renderCopiloteHistorique() {
  const courante = copiloteConversationId();

  return renderNavListGroup({
    id: "studioCopiloteHistorique",
    className: "nav-list__list--sub",
    items: copiloteConversations().map((conversation) => {
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
            <button type="button" class="copilote-fil-menu__item" role="menuitem"
              data-copilote-en-sujet="${escapeHtml(conversation.id)}"
              title="Les messages deviennent des commentaires, visibles par l'équipe du projet">
              ${svgIcon("issue-opened")}<span>Créer un sujet</span>
            </button>
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
  return [
    renderNavListGroup({
      items: [
        renderNavListItem({
          label: "Nouvelle discussion",
          dataAttributes: { "data-side-nav-target": "studio-copilote" },
          iconHtml: svgIcon("copilot", { className: "octicon octicon-copilot" }),
          isActive: true,
          actionHtml: `
            <button type="button" class="nav-list__action-btn" data-copilote-new
              aria-label="Nouvelle discussion" title="Nouvelle discussion">
              ${svgIcon("new-chat")}
            </button>
          `
        })
      ]
    }),
    renderCopiloteHistorique()
  ].join("");
}

/**
 * L'accueil de l'Atelier — sa vitrine.
 *
 * Un nom, pas une chaîne recopiée : le routeur de panneaux, la barre de retour
 * et le panneau par défaut le désignent tous les trois (règle 10).
 */
const ACCUEIL = "atelier-vitrine";

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
 * ## La barre de retour
 *
 * Elle dit où l'on est et d'où l'on revient. Sans rail, un utilitaire ouvert
 * n'a plus rien autour de lui qui le nomme : on saurait ce qu'on regarde sans
 * savoir comment en sortir. Elle porte aussi **la version** de l'utilitaire,
 * parce que c'est en le regardant travailler qu'on veut la connaître.
 */
function getRouterHtml() {
  return `
    <section class="project-simple-page project-simple-page--settings project-simple-page--studio project-simple-page--atelier">
      <div class="project-simple-scroll project-simple-scroll--parametres" id="projectStudioRouterScroll">
        <div class="settings-shell settings-shell--parametres settings-shell--atelier">

          <div class="atelier-retour" id="atelierRetour" hidden>
            <button type="button" class="atelier-retour__lien" data-side-nav-target="${ACCUEIL}">
              ${svgIcon("arrow-left", { className: "octicon" })}
              <span>Atelier</span>
            </button>
            <span class="atelier-retour__sep" aria-hidden="true">/</span>
            <span class="atelier-retour__nom" id="atelierRetourNom"></span>
            <span class="atelier-retour__version mono-small" id="atelierRetourVersion"></span>
          </div>

          <div class="project-studio-router__content">

            <section class="project-studio-router__panel is-active" data-side-nav-panel="${ACCUEIL}">
              <div id="projectStudioVitrinePanel"></div>
            </section>

            <section class="project-studio-router__panel project-studio-router__panel--copilote"
              data-side-nav-panel="studio-copilote">
              <div class="project-rail-layout${railState.collapsed ? " project-rail-layout--collapsed" : ""}"
                style="--project-rail-width:${railWidth(railState.width, railState.collapsed)}px">
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
  if (vitrineRoot) dessinerLaVitrine(vitrineRoot);

  const copiloteRoot = root.querySelector("#projectStudioCopilotePanel");
  const solidityClimateRoot = root.querySelector("#projectStudioSolidityClimatePanel");
  const solidityGeorisksRoot = root.querySelector("#projectStudioSolidityGeorisksPanel");
  const solidityFondationsRoot = root.querySelector("#projectStudioSolidityFondationsPanel");
  const incendieHabitationRoot = root.querySelector("#projectStudioIncendieHabitationPanel");
  const solidityArkoliaRoot = root.querySelector("#projectStudioSolidityArkoliaPanel");
  const seismicGeneralRoot = root.querySelector("#projectStudioSeismicGeneralPanel");
  const ctContinuityLabRoot = root.querySelector("#projectStudioCtContinuityLabPanel");
  const variablesRoot = root.querySelector("#projectStudioVariablesPanel");
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
  if (variablesRoot) renderVariablesMutualisees(variablesRoot);
  if (conflitsRoot) renderResolutionConflits(conflitsRoot);

  const getScrollSource = () => root.querySelector("#projectStudioRouterScroll");

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
    // Les explorations se relisent à chaque venue : la mémoire a pu bouger
    // dans un autre onglet, et essayer une valeur sur un socle périmé
    // donnerait un raisonnement juste sur un projet qui n'existe plus.
    rendreLExploration(targetId, { force: true });

    panneauCourant = targetId || panneauCourant;
    marquerActif(root, targetId);
  });

  brancherLaVitrine(root, vitrineRoot);
  brancherCopilote(root, copiloteRoot, getScrollSource);
  marquerActif(root, panneauCourant);

  registerProjectPrimaryScrollSource(getScrollSource());
}

/* ── La vitrine ──────────────────────────────────────────────────────────── */

/**
 * Ce qu'on a tapé, et comment on a rangé.
 *
 * Cela vit au niveau du module, comme le repli du rail et pour la même raison :
 * l'Atelier se redessine entièrement à plusieurs occasions, et une recherche
 * perdue au redessin obligerait à la retaper sans qu'on comprenne pourquoi.
 */
const vitrineEtat = { recherche: "", rayon: "", rangement: RANGEMENT.RECOMMANDE };

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
    const onglet = evenement.target.closest?.("[data-light-tab-target]");
    // Une fiche : le routeur s'en charge, on ne s'en mêle pas.
    if (!onglet || evenement.target.closest?.("[data-side-nav-target]")) return;

    const valeur = onglet.dataset.lightTabTarget ?? "";
    // Les deux barres portent le même attribut : c'est leur enveloppe qui dit
    // laquelle on vient de toucher.
    if (onglet.closest(".atelier-rayons")) vitrineEtat.rayon = valeur;
    else if (onglet.closest(".atelier-rangement")) vitrineEtat.rangement = valeur || RANGEMENT.RECOMMANDE;
    else return;

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

  majBarreDeRetour(root, targetId);

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

/**
 * La barre de retour : où l'on est, et comment en sortir.
 *
 * Sans rail, un utilitaire ouvert n'a plus rien autour de lui qui le nomme. On
 * saurait ce qu'on regarde sans savoir d'où l'on vient — et l'on repartirait par
 * l'onglet du projet, c'est-à-dire en quittant l'Atelier pour y revenir.
 *
 * Elle porte **la version**, parce que c'est en regardant l'utilitaire
 * travailler qu'on veut la connaître, pas en lisant sa fiche.
 *
 * Sur la vitrine, elle n'existe pas : on y est déjà.
 */
function majBarreDeRetour(root, targetId) {
  const barre = root.querySelector("#atelierRetour");
  if (!barre) return;

  const surLaVitrine = !targetId || targetId === ACCUEIL;
  barre.hidden = surLaVitrine;
  if (surLaVitrine) return;

  const utilitaire = utilitaireParCible(targetId);
  const nom = root.querySelector("#atelierRetourNom");
  const version = root.querySelector("#atelierRetourVersion");

  // Un utilitaire absent du catalogue garde sa barre, avec ce qu'on sait de
  // lui : sans nom, elle serait un bouton de retour muet — mais un bouton de
  // retour muet vaut mieux que pas de sortie du tout (règle 5).
  if (nom) nom.textContent = utilitaire?.nom ?? "";
  if (version) version.textContent = utilitaire?.version ? `v${utilitaire.version}` : "";
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
 * Les discussions dans le rail : en ouvrir une neuve, en rouvrir une passée.
 *
 * La délégation est nécessaire, pas décorative : l'historique se réécrit à
 * chaque message, et des écouteurs posés sur les entrées disparaîtraient avec
 * elles — la deuxième discussion serait morte au clic.
 */
function brancherCopilote(root, copiloteRoot, getScrollSource) {
  // L'écouteur d'avant se retire : l'Atelier se redessine à chaque repli du
  // rail, et des écouteurs empilés redessineraient l'historique autant de fois
  // qu'on a replié.
  if (studioCopiloteDetacher) studioCopiloteDetacher();
  studioCopiloteDetacher = null;

  const rail = root.querySelector(".project-rail");
  if (!rail || !copiloteRoot) return;

  const venir = () => {
    registerProjectPrimaryScrollSource(getScrollSource());
    afficherPanneau(root, "studio-copilote");
    renderCopilote(copiloteRoot);
    marquerActif(root, "studio-copilote");
  };

  const fermerMenus = () => {
    for (const menu of rail.querySelectorAll("[data-copilote-menu-for]")) menu.hidden = true;
    for (const bouton of rail.querySelectorAll("[data-copilote-menu]")) bouton.setAttribute("aria-expanded", "false");
  };

  rail.addEventListener("click", async (event) => {
    if (event.target.closest("[data-copilote-new]")) {
      fermerMenus();
      startNewConversation();
      venir();
      return;
    }

    const kebab = event.target.closest("[data-copilote-menu]");
    if (kebab) {
      // Le menu ne doit pas ouvrir la discussion au passage : on l'ouvre pour
      // la renommer ou l'effacer, pas pour la lire.
      event.stopPropagation();
      const id = kebab.dataset.copiloteMenu;
      const menu = rail.querySelector(`[data-copilote-menu-for="${CSS.escape(id)}"]`);
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
      await renommerFil(root, renommer.dataset.copiloteRename, copiloteRoot);
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
      await effacerFil(root, effacer.dataset.copiloteDelete, copiloteRoot);
      return;
    }

    fermerMenus();

    const fil = event.target.closest("[data-copilote-conversation]");
    if (fil && openConversation(fil.dataset.copiloteConversation)) venir();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest?.(".project-rail")) fermerMenus();
  });

  // L'historique se redessine seul, sans toucher au reste du rail : redessiner
  // l'Atelier entier à chaque message replierait les réglages en cours.
  const rafraichir = () => {
    const liste = root.querySelector("#studioCopiloteHistorique");
    if (!liste?.isConnected) return;
    liste.outerHTML = renderCopiloteHistorique();
    // Le panneau courant, pas le Copilote : un message qui arrive pendant qu'on
    // est sur un utilitaire ne doit pas déplacer le repère du rail.
    marquerActif(root, panneauCourant);
  };

  /**
   * Renommer.
   *
   * Le nom part en base avant d'apparaître à l'écran : l'ordre inverse
   * montrerait un nom que rien ne conserve, et il disparaîtrait au
   * rechargement sans que personne comprenne pourquoi.
   */
  async function renommerFil(hote, id, panneau) {
    const actuel = copiloteConversations().find((entree) => entree.id === id);
    const propose = window.prompt("Renommer cette discussion", conversationTitle(actuel) || "");
    if (propose === null) return;

    try {
      const nom = await renameConversation(id, propose);
      renameConversationLocally(id, nom);
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
  /**
   * Ouvrir un sujet à partir d'une discussion.
   *
   * **Ce qui part ne revient pas** : le sujet est visible par toute l'équipe du
   * projet, et la discussion, elle, reste privée. On demande donc avant, en
   * disant ce que le geste fait — pas « êtes-vous sûr ? », qui ne dit rien.
   */
  async function ouvrirUnSujetDepuisLeFil(id) {
    const conversation = copiloteConversations().find((entree) => entree.id === id);
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
      const { transformerEnSujet } = await import("../services/copilote-en-sujet.js");
      const { resolveCurrentBackendProjectId } = await import("../services/project-supabase-sync.js");
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

  async function copierLeFil(id) {
    const texte = await transcrireLaDiscussion(id);
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
  async function effacerFil(hote, id, panneau) {
    const actuel = copiloteConversations().find((entree) => entree.id === id);
    const nom = conversationTitle(actuel);
    if (!window.confirm(`Effacer « ${nom} » ? La discussion et ses messages seront supprimés, sans retour.`)) return;

    try {
      await deleteConversation(id);
      forgetConversationLocally(id);
      rafraichir();
      if (panneau) renderCopilote(panneau);
    } catch (error) {
      window.alert(`La discussion n'a pas pu être effacée. ${error?.message || ""}`.trim());
    }
  }

  const surConversations = () => rafraichir();

  document.addEventListener("copilote:conversations", surConversations);
  studioCopiloteDetacher = () => document.removeEventListener("copilote:conversations", surConversations);
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
