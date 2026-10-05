/**
 * L'écran du parcours de démonstration.
 *
 * ## Ce qu'il fait, et ce qu'il ne fait pas
 *
 * Il **mène** aux sept écrans de la chaîne, dans l'ordre, et dit où en est ce
 * chantier-ci. Il ne reproduit rien : chaque étape est un lien vers l'écran
 * réel, et c'est là qu'on voit la matière. Un écran qui aurait recopié les sept
 * vues aurait fait une maquette, c'est-à-dire exactement ce qu'on cherche à ne
 * pas montrer.
 *
 * ## Pourquoi il lit la base
 *
 * Parce qu'un parcours qui afficherait sept étapes « à faire » sur un chantier
 * de dix-huit documents lus ne servirait à rien, et qu'un parcours qui les
 * afficherait toutes franchies sur un chantier vide serait un mensonge. Les
 * sept comptes viennent de
 * `le-parcours-de-la-demonstration-supabase.js`, et le module pur en déduit
 * l'état. Ici, il n'y a que du dessin et un clic.
 *
 * ## Les trois choses que cet écran refuse de taire
 *
 *  1. **ce qu'une étape ne montre pas**, sous chaque étape. Sans cela, sept
 *     étapes vertes se lisent « tout est vérifié » ;
 *  2. **ce que le parcours entier ne raconte pas**, en pied de page ;
 *  3. **ce qu'on n'a pas su lire.** Une base muette rend une étape « sans
 *     réponse », et jamais « pas encore » : les deux mènent à des gestes
 *     opposés.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { store } from "../../../store.js";
import {
  CE_QUE_LETAT_DIT, CE_QUE_LE_PARCOURS_NE_RACONTE_PAS, OU_EN_EST_LETAPE, RIEN_NEST_ECRIT,
  leCranDeLetape, ouEnEstLeParcours
} from "../../../services/le-parcours-de-la-demonstration.js";
import { lesFaitsDuParcours } from "../../../services/le-parcours-de-la-demonstration-supabase.js";
import { renderUnTon } from "../../ui/un-ton.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";

const texte = (valeur) => String(valeur ?? "").trim();

const etat = {
  projet: "",
  chargement: false,
  lu: false,
  /**
   * **Les faits, et `null` tant qu'on n'a rien demandé.**
   *
   * Un objet vide se lirait « la base a répondu, et elle n'a rien » : au premier
   * dessin, l'écran afficherait sept étapes sans réponse avant même d'avoir
   * demandé. `null` dit « on n'a pas encore demandé », et l'écran affiche alors
   * qu'il lit.
   */
  faits: null
};

/** Le projet affiché, pour repartir de zéro quand on en change. */
function clefDuProjet() {
  return texte(store.currentProject?.backendProjectId || store.currentProjectId);
}

/** Le pictogramme de chaque état. Le mot reste, l'icône aide à parcourir. */
const LICONE_DE_LETAT = {
  [OU_EN_EST_LETAPE.FRANCHIE]: "check-circle",
  [OU_EN_EST_LETAPE.FRANCHISSABLE]: "arrow-right",
  [OU_EN_EST_LETAPE.HORS_DATTEINTE]: "circle",
  [OU_EN_EST_LETAPE.INCONNUE]: "question"
};

function renderUneEtape(etape, { prochaine = false } = {}) {
  const etat_ = CE_QUE_LETAT_DIT[etape.ou] ?? CE_QUE_LETAT_DIT[OU_EN_EST_LETAPE.INCONNUE];
  const cran = leCranDeLetape(etape);

  /**
   * **Le lien ne s'ouvre que si l'étape a quelque chose à montrer.**
   *
   * Une étape hors d'atteinte mène à un écran vide, et l'on croirait l'écran
   * cassé plutôt que l'étape pas encore venue. La prochaine et les franchies
   * s'ouvrent ; les autres portent le même libellé, éteint.
   */
  const ouvrable = etape.ou === OU_EN_EST_LETAPE.FRANCHIE
    || etape.ou === OU_EN_EST_LETAPE.FRANCHISSABLE;

  return `
    <li class="parcours__etape${prochaine ? " parcours__etape--prochaine" : ""}">
      <div class="parcours__tete">
        <span class="parcours__rang">${etape.rang}</span>
        <h4 class="parcours__titre">${escapeHtml(etape.titre)}</h4>
        ${renderUnTon({ mot: etat_.mot, vaut: etat_.vaut, titre: etat_.dit })}
        ${cran ? `<span class="parcours__cran mono-small">cran ${cran.rang} · ${
          escapeHtml(cran.libelle)}</span>` : ""}
      </div>

      <p class="parcours__question">${escapeHtml(etape.question)}</p>

      <dl class="parcours__dit">
        <dt>On y voit</dt><dd>${escapeHtml(etape.ceQuOnVoit)}</dd>
        <dt>Ce que ça établit</dt><dd>${escapeHtml(etape.ceQuElleProuve)}</dd>
        <dt class="parcours__creux">Ce que ça ne montre pas</dt>
        <dd class="parcours__creux">${escapeHtml(etape.ceQuElleNeMontrePas)}</dd>
      </dl>

      <div class="parcours__pied">
        ${ouvrable
          ? `<button type="button" class="gh-btn gh-btn--sm${
              prochaine ? " gh-btn--validate" : ""}" data-side-nav-target="${
              escapeHtml(etape.cible)}">
               ${svgIcon("arrow-right", { className: "octicon" })}
               Ouvrir ${escapeHtml(etape.ou)}
             </button>`
          /**
           * **Et non un bouton grisé.** Un bouton désactivé invite à cliquer et
           * ne dit pas pourquoi il ne marche pas ; la phrase de l'état le dit.
           */
          : `<span class="parcours__eteint mono-small">${
              svgIcon(LICONE_DE_LETAT[etape.ou] ?? "circle", { className: "octicon" })
            } ${escapeHtml(etat_.dit)}</span>`}
        <span class="parcours__ou mono-small">${escapeHtml(etape.ou)}</span>
      </div>
    </li>
  `;
}

function dessiner(root) {
  const parcours = ouEnEstLeParcours(etat.faits);
  const prochaine = parcours.prochaine?.cle ?? "";

  root.innerHTML = `
    <section class="parcours">
      <header class="parcours__entete">
        <h3>Le parcours</h3>
        <p class="settings-lead">
          Comment un document devient une mémoire qui prédit — les sept étapes de
          la chaîne, dans l'ordre, sur les écrans de ce chantier.
        </p>
      </header>

      <div class="gh-alert settings-callout">${escapeHtml(RIEN_NEST_ECRIT)}</div>

      <div class="parcours__barre">
        <span class="parcours__compte">${escapeHtml(parcours.dit)}</span>
        <span class="parcours__pousse"></span>
        <button type="button" class="gh-btn gh-btn--sm" data-parcours-relire>
          ${svgIcon("sync", { className: "octicon" })} Relire ce chantier
        </button>
      </div>

      ${etat.faits === null && etat.chargement
        ? `<p class="review-empty-note">Lecture de ce chantier…</p>`
        : `<ol class="parcours__etapes">
             ${parcours.etapes.map((une) => renderUneEtape(une, {
               prochaine: une.cle === prochaine
             })).join("")}
           </ol>`}

      <footer class="parcours__creux-du-tout">
        <h4>Ce que ce parcours ne raconte pas</h4>
        <ul class="settings-list">
          ${CE_QUE_LE_PARCOURS_NE_RACONTE_PAS
            .map((un) => `<li>${escapeHtml(un)}</li>`).join("")}
        </ul>
      </footer>
    </section>
  `;

  for (const bouton of root.querySelectorAll("[data-parcours-relire]")) {
    bouton.addEventListener("click", () => { etat.lu = false; void charger(root); });
  }
}

async function charger(root) {
  const projet = clefDuProjet();

  etat.chargement = true;
  dessiner(root);

  /**
   * **Aucun `catch` qui remettrait des zéros.** `lesFaitsDuParcours` rend déjà
   * `null` pour ce qu'il n'a pas su lire, fait par fait ; une erreur attrapée
   * ici ne pourrait rien dire de mieux, et un objet de zéros posé en repli
   * afficherait un chantier vierge.
   */
  etat.faits = await lesFaitsDuParcours(projet);
  etat.lu = true;
  etat.chargement = false;

  if (root.isConnected) dessiner(root);
}

export function renderLeParcours(root, { force = false } = {}) {
  if (!root) return;

  const projet = clefDuProjet();
  const aChange = projet !== etat.projet;
  if (aChange) {
    etat.projet = projet;
    etat.faits = null;
    etat.lu = false;
  }

  if (!force && !aChange && root.dataset.parcoursMonte === "true") return;
  root.dataset.parcoursMonte = "true";

  dessiner(root);
  if (!etat.lu || aChange) void charger(root);

  registerProjectPrimaryScrollSource(
    root.closest("#projectStudioRouterScroll")
      || document.getElementById("projectStudioRouterScroll")
  );
}
