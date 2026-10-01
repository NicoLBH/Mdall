import { escapeHtml } from "../utils/escape-html.js";
import { setProjectViewHeader, clearProjectActiveScrollSource, debugProjectScrollPolicy } from "./project-shell-chrome.js";
import { RUN_LOG_CHANGED_EVENT, getRunLogEntries, getRunMetrics } from "../services/project-automation.js";
import { syncProjectActionsFromSupabase } from "../services/project-supabase-sync.js";
import { svgIcon } from "../ui/icons.js";
import { renderEnchainement } from "./ui/enchainement.js";
import {
  buildRunGraph, formatStepDuration, laLectureDuCorpus
} from "../services/run-workflow.js";
import {
  STATUT, etapeDe, etapesConsultables, numeroter, resumerEtape
} from "../services/run-journal.js";
import {
  LE_BATTEMENT_DU_JOURNAL, ONGLETS, ORIGINE, TOUTES, UNE_EXECUTION, decrireVisibilite,
  lesExecutionsDites, longletDit, ongletValide, partitionnerActions, quelqueChoseTourne
} from "../services/run-partition.js";
import { renderNavList, renderNavListGroup, renderNavListItem } from "./ui/nav-list.js";
import {
  bindRailResizer, followRailScroll, railWidth, renderProjectRail
} from "./ui/project-rail.js";
import { store } from "../store.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  renderDataTableEmptyState,
  renderDataTableHead,
  renderDataTableShell
} from "./ui/data-table-shell.js";
import { normalizePaginationState, paginateItems, renderPaginationControls } from "./ui/pagination.js";
import { dureeDite } from "../utils/duree-dite.js";

function getRunSuccessIconSvg() {
  return svgIcon("check-circle-fill", {
    className: "octicon octicon-check-circle-fill",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

/**
 * L'échec : un disque rouge barré d'une croix.
 *
 * L'octogone d'alerte disait « attention » ; ici il s'agit de dire « cela n'a
 * pas abouti ». Comme la colonne « Statut » disparaît, cette icône porte seule
 * l'information : elle doit se lire sans hésitation.
 */
function getRunAlertIconSvg() {
  return svgIcon("x-circle-fill", {
    className: "octicon octicon-x-circle-fill",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunPendingIconSvg() {
  return svgIcon("dot-fill-pending", {
    className: "octicon octicon-dot-fill",
    width: 16,
    height: 16,
    style: "margin-top:2px"
  });
}

function getRunStateIcon(entry) {
  const status = String(entry?.outcomeStatus || entry?.status || "").toLowerCase();

  if (status === "success") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--success" title="Exécution réussie">
        ${getRunSuccessIconSvg()}
      </span>
    `;
  }

  if (status === "error" || status === "cancelled" || status === "interrupted") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--alert" title="Exécution en anomalie">
        ${getRunAlertIconSvg()}
      </span>
    `;
  }

  if (status === "running" || status === "queued" || status === "pending") {
    return `
      <span class="workflow-runs__state-icon workflow-runs__state-icon--pending" title="Exécution en cours">
        ${getRunPendingIconSvg()}
      </span>
    `;
  }

  return `
    <span class="workflow-runs__state-icon workflow-runs__state-icon--neutral"></span>
  `;
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function getRunStatusMeta(entry) {
  const lifecycleStatus = String(entry?.lifecycleStatus || entry?.status || "").toLowerCase();
  const outcomeStatus = String(entry?.outcomeStatus || "").toLowerCase();

  if (lifecycleStatus === "running") {
    return {
      label: "En cours",
      className: "workflow-status-pill workflow-status-pill--running"
    };
  }

  if (outcomeStatus === "success") {
    return {
      label: "Réussi",
      className: "workflow-status-pill workflow-status-pill--success"
    };
  }

  if (outcomeStatus === "error") {
    return {
      label: "Échec",
      className: "workflow-status-pill workflow-status-pill--error"
    };
  }

  return {
    label: lifecycleStatus === "completed" ? "Terminé" : (outcomeStatus || lifecycleStatus || "—"),
    className: "workflow-status-pill"
  };
}

function getTriggerLabel(entry) {
  if (entry.triggerLabel) return entry.triggerLabel;

  if (entry.triggerType === "document-upload") {
    return "Dépôt de document";
  }

  if (entry.triggerType === "manual") {
    return "Lancement manuel";
  }

  if (entry.triggerType === "automatic") {
    return "Déclenchement automatique";
  }

  if (entry.triggerType === "atelier") {
    return "Lancée depuis l'Atelier";
  }

  // Une exécution causée par une fusion porte normalement le numéro de la
  // proposition ; sans lui, dire d'où elle vient reste plus utile que « — ».
  if (entry.triggerType === "proposition") {
    return "Fusion d'une proposition";
  }

  return "—";
}

function renderRunStatus(entry) {
  const meta = getRunStatusMeta(entry);
  return `<span class="${meta.className}">${escapeHtml(meta.label)}</span>`;
}



function getStepLabel(stepKey) {
  const labels = {
    georisques: "Géorisques",
    seismicZone: "Zone sismique",
    snowRegion: "Zone de neige",
    frostZone: "Zone de gel",
    climaticZone: "Zone climatique",
    thermalZone: "Zone thermique",
    acousticFacade: "Isolement acoustique de façade"
  };

  return labels[stepKey] || stepKey;
}

function getStepStatusMeta(status) {
  const normalized = String(status || "pending").toLowerCase();

  if (normalized === "success") {
    return { label: "Réussi", className: "workflow-status-pill workflow-status-pill--success" };
  }

  if (normalized === "error" || normalized === "failed") {
    return { label: "Échec", className: "workflow-status-pill workflow-status-pill--error" };
  }

  if (normalized === "running") {
    return { label: "En cours", className: "workflow-status-pill workflow-status-pill--running" };
  }

  return { label: "En attente", className: "workflow-status-pill" };
}

function getOrderedStepEntries(steps) {
  const preferredOrder = [
    "georisques",
    "snowRegion",
    "frostZone",
    "climaticZone",
    "thermalZone",
    "seismicZone",
    "acousticFacade"
  ];

  return Object.entries(steps || {}).sort(([a], [b]) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);
    const safeA = aIndex === -1 ? 999 : aIndex;
    const safeB = bIndex === -1 ? 999 : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return a.localeCompare(b, "fr");
  });
}

function getStepSummary(stepKey, step = {}) {
  if (stepKey === "georisques") {
    const parts = [];
    if (step.communeName) parts.push(step.communeName);
    if (step.codeInsee) parts.push(`INSEE ${step.codeInsee}`);
    if (Number.isFinite(step.datasetsCount)) parts.push(`${step.datasetsCount} jeu(x)`);
    if (Number.isFinite(step.successCount) && step.successCount > 0) parts.push(`${step.successCount} réussi(s)`);
    if (Number.isFinite(step.errorCount) && step.errorCount > 0) parts.push(`${step.errorCount} erreur(s)`);
    if (step.error) parts.push(step.error);
    return parts.join(" · ");
  }

  const parts = [];
  if (step.value) parts.push(String(step.value));
  if (step.source) parts.push(`source : ${step.source}`);
  if (step.error) parts.push(step.error);
  return parts.join(" · ");
}

function renderRunPipelineSteps(entry) {
  const steps = entry?.details?.steps;
  if (!steps || typeof steps !== "object") return "";

  const orderedSteps = getOrderedStepEntries(steps);
  if (!orderedSteps.length) return "";

  return `
    <div class="workflow-runs__meta" style="margin-top:8px;">
      <div style="font-weight:600; margin-bottom:6px; color: var(--fgColor-muted, #656d76);">Pipeline</div>
      <div style="display:grid; gap:6px;">
        ${orderedSteps.map(([stepKey, step]) => {
          const meta = getStepStatusMeta(step?.status);
          const summary = getStepSummary(stepKey, step);
          return `
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:8px;">
              <span style="min-width:132px; font-weight:600;">${escapeHtml(getStepLabel(stepKey))}</span>
              <span class="${meta.className}">${escapeHtml(meta.label)}</span>
              ${summary ? `<span style="color: var(--fgColor-muted, #656d76);">${escapeHtml(summary)}</span>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}


function getRunHistoryIconSvg() {
  return svgIcon("history", {
    className: "octicon octicon-history",
    width: 16,
    height: 16,
    style: "vertical-align:text-bottom"
  });
}

/**
 * Le compte, en tête de la colonne « Action ».
 *
 * Il décrit ce qui est en dessous, pas tout le journal : depuis que les
 * exécutions se rangent en deux piles, un total unique compterait des lignes
 * que la vue courante ne montre pas.
 */
function renderRunCountInline(total) {
  const totalRuns = Number(total ?? getRunMetrics().totalRuns ?? 0);

  const dit = lesExecutionsDites(totalRuns);

  return `
    <span class="workflow-runs__head-count" title="${escapeHtml(
      `${dit} journalisée${totalRuns > 1 ? "s" : ""}`)}">
      ${getRunHistoryIconSvg()}
      <span>${escapeHtml(dit)}</span>
    </span>
  `;
}

/**
 * Une ligne du journal : l'acte, sa cause, sa date et sa durée.
 *
 * Trois colonnes plutôt que cinq. Le déclencheur descend sous le titre, en gris,
 * parce que c'est un complément et non une donnée qu'on compare de ligne en
 * ligne. Et la colonne « Statut » disparaît : son icône est déjà en tête de la
 * ligne — un état dit deux fois n'est pas dit deux fois mieux, il occupe deux
 * fois la place.
 */
function renderRunRows(entries) {
  return entries.map((entry) => {
    const objet = entry.documentName
      ? `<span class="workflow-runs__object">${escapeHtml(entry.documentName)}</span>`
      : "";
    const cause = `<span class="workflow-runs__trigger">${escapeHtml(getTriggerLabel(entry))}</span>`;
    // Une exécution d'Atelier antérieure au cloisonnement est encore lue par
    // tout le monde. L'absence de marque ne le dit pas — seule une mention le
    // dit, et il faut qu'elle soit dite.
    const visibilite = decrireVisibilite(entry);
    const mention = visibilite?.note
      ? `<span class="workflow-runs__dot">·</span><span class="workflow-runs__mention">${escapeHtml(visibilite.note)}</span>`
      : "";

    return `
      <div class="workflow-runs__row">
        <div class="workflow-runs__cell workflow-runs__cell--action">
          <div class="workflow-runs__title-row">
            ${getRunStateIcon(entry)}
            ${renderMarqueAtelier(entry)}
            <button type="button" class="workflow-runs__title workflow-runs__title--link" data-run-open="${escapeHtml(
              entry.id || ""
            )}">${escapeHtml(entry.name || UNE_EXECUTION)}</button>
          </div>
          <div class="workflow-runs__meta workflow-runs__subline">
            ${objet}${objet && cause ? `<span class="workflow-runs__dot">·</span>` : ""}${cause}${mention}
          </div>
        </div>

        <div class="workflow-runs__cell workflow-runs__cell--when">
          <span class="workflow-runs__when-line">
            <span class="workflow-runs__when-icon">${svgIcon("calendar", { className: "octicon" })}</span>
            ${escapeHtml(formatDateTime(entry.startedAt))}
          </span>
          <span class="workflow-runs__when-line">
            <span class="workflow-runs__when-icon">${svgIcon("stopwatch", { className: "octicon" })}</span>
            ${escapeHtml(dureeDite(entry.durationMs))}
          </span>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * La marque d'une exécution d'Atelier.
 *
 * Pas un cadenas : un cadenas dit « secret », et ce n'est pas de cela qu'il
 * s'agit. Une exécution d'Atelier n'est pas cachée, elle est **personnelle** —
 * un essai en cours, qui n'a pas à devenir un acte du projet parce qu'on l'a
 * lancé. La marque est donc celle de l'Atelier lui-même : elle dit d'où la
 * ligne vient, et l'onglet au-dessus a déjà dit ce qui en découle.
 *
 * Elle ne s'affiche que lorsque la confidentialité est réelle. Une exécution
 * d'Atelier antérieure au cloisonnement reste lue par tout le monde : elle
 * porte alors une mention, pas la marque.
 */
function renderMarqueAtelier(entry) {
  const visibilite = decrireVisibilite(entry);
  if (!visibilite?.marque) return "";
  // **L'icône vient de la règle, pas de l'écran.** Elle était écrite ici, en
  // dur : un versement aurait donc porté la marque de l'Atelier, c'est-à-dire
  // dit « essai » d'un dépôt qui est un acte (règle 10).
  return `
    <span class="workflow-runs__atelier" title="${escapeHtml(visibilite.titre)}"
          aria-label="${escapeHtml(visibilite.titre)}">
      ${svgIcon(visibilite.icone || "cpu", { className: "octicon" })}
    </span>
  `;
}

/**
 * Les deux vues du journal, et ce qu'elles changent pour le lecteur.
 *
 * L'explication est sous les onglets et non dans une infobulle : la question
 * « qui voit ça ? » se pose avant de cliquer, pas après avoir survolé.
 */
/**
 * Le rail des trois vues, à gauche.
 *
 * ## Pourquoi il n'est plus une rangée d'onglets
 *
 * Les trois vues étaient trois boutons posés au-dessus du tableau. Ils
 * marchaient, et ils avaient deux défauts : la ligne se lisait comme un filtre
 * secondaire alors qu'elle décide de **tout ce qu'on voit**, et le tableau
 * n'annonçait nulle part ce qu'il montrait.
 *
 * ## Pourquoi c'est `renderProjectRail`, et plus une copie
 *
 * Ce rail était dessiné à la main, avec les classes que la Mémoire employait
 * **avant** de passer à la coque commune : `memoire-tree`, `memoire-layout`,
 * une poignée branchée à part, une largeur bornée autrement. La Mémoire a
 * déménagé ; cette copie est restée.
 *
 * Conséquences, toutes visibles à l'écran : le rail ne se calait pas sous la
 * barre des onglets, ne descendait pas jusqu'en bas, et replié il laissait le
 * tableau glisser sous lui au lieu de rester au centre. Trois détails qu'il
 * fallait régler **une fois de plus**, alors qu'ils l'étaient déjà ailleurs.
 *
 * Une coque dessinée deux fois diverge au premier changement, et la seconde est
 * fausse avant d'être finie (règle 4). Il n'y en a plus qu'une.
 *
 * Le compte va avec le nom : « Atelier 0 » dit, avant le clic, qu'il n'y a rien
 * à y voir.
 *
 * ## Et les entrées sont celles des autres rails
 *
 * Elles étaient dessinées avec `side-nav-layout`, le gabarit des pages de
 * réglages — qui ne se replient pas. La coque, elle, se replie : les règles qui
 * masquent le texte d'un rail replié sont écrites pour `nav-list`, le gabarit
 * que la Mémoire, les Sujets, l'Accueil et le Copilote emploient tous.
 *
 * Résultat à l'écran : **le rail des Actions replié gardait ses libellés et ses
 * compteurs**, à cheval sur la colonne d'icônes. Il était le dernier à ne pas
 * se servir du composant commun ; il n'y en a plus qu'un (règle 4).
 */
function renderRailDesActions(piles, actif) {
  return renderProjectRail({
    id: "actionsRail",
    label: "Les vues du journal",
    collapsed: store.projectActionsView?.railOuvert === false,
    navHtml: renderNavList({
      label: "Les vues du journal",
      html: renderNavListGroup({
        items: ONGLETS.map((onglet) => renderNavListItem({
          label: onglet.libelle,
          iconHtml: svgIcon(onglet.icone),
          isActive: onglet.cle === actif,
          trailing: String((piles[onglet.cle] ?? []).length),
          // Le libellé est tronqué dans un rail étroit : l'infobulle le rend.
          title: onglet.libelle,
          dataAttributes: { "data-actions-onglet": onglet.cle }
        }))
      })
    })
  });
}

/**
 * Ce qu'on dit d'une vue qui ne porte rien.
 *
 * **Une phrase par vue, et chacune dit quoi faire.** « Aucune action exécutée »
 * sous « Versements » n'apprend rien : ce qui manque là n'est pas une action
 * lancée, c'est un dépôt. Le dire au bon endroit évite de chercher le bouton
 * dans le mauvais écran.
 */
const LE_VIDE_DUNE_VUE = {
  [TOUTES]: {
    title: "Rien ne s'est encore passé sur ce projet",
    description: "Les analyses, les dépôts et les lectures viendront ici, toutes ensemble."
  },
  [ORIGINE.PROJET]: {
    title: "Aucune action exécutée",
    description: "Lance une analyse ou un enrichissement manuel pour alimenter le journal d’exécution."
  },
  [ORIGINE.ATELIER]: {
    title: "Aucun essai dans l'Atelier",
    description: "Ce que vous lancerez depuis l'Atelier — une lecture de comptes rendus, "
      + "un utilitaire — viendra ici, et n'ira pas plus loin."
  },
  [ORIGINE.VERSEMENT]: {
    title: "Vous n'avez encore rien versé",
    description: "Déposez des mails depuis Fichiers : le serveur les range, et le dépôt "
      + "se suivra ici."
  }
};

function renderRunsTable() {
  const piles = partitionnerActions(getRunLogEntries());
  const actif = ongletValide(store.projectActionsView?.onglet);
  const entries = piles[actif] ?? [];
  if (!store.projectActionsView || typeof store.projectActionsView !== "object") {
    store.projectActionsView = { pagination: { mode: "client", pageSize: 25, currentPage: 1 } };
  }
  const pagination = normalizePaginationState({
    totalItems: entries.length,
    pageSize: store.projectActionsView?.pagination?.pageSize,
    currentPage: store.projectActionsView?.pagination?.currentPage
  });
  store.projectActionsView.pagination = {
    ...(store.projectActionsView.pagination && typeof store.projectActionsView.pagination === "object"
      ? store.projectActionsView.pagination
      : {}),
    mode: "client",
    pageSize: pagination.pageSize,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems
  };
  const paged = paginateItems(entries, pagination);

  const vide = LE_VIDE_DUNE_VUE[actif] ?? LE_VIDE_DUNE_VUE[ORIGINE.PROJET];

  const tableHtml = renderDataTableShell({
    className: "workflow-runs-table data-table-shell--document-scroll",
    gridTemplate: "minmax(320px,2fr) 220px",
    headHtml: renderDataTableHead({
      columns: [
        {
          html: `<span class="workflow-runs__head-label">Action</span>${renderRunCountInline(entries.length)}`,
          className: "workflow-runs__head-col workflow-runs__head-col--action"
        },
        "Quand"
      ]
    }),
    bodyHtml: renderRunRows(paged.items),
    state: paged.items.length ? "ready" : "empty",
    emptyHtml: renderDataTableEmptyState(vide)
  });
  const vue = longletDit(actif);
  const replie = store.projectActionsView?.railOuvert === false;

  return `
    <div class="project-rail-layout${replie ? " project-rail-layout--collapsed" : ""}">
      ${renderRailDesActions(piles, actif)}

      <div class="project-rail-layout__content">
        ${/*
          **Le tableau dit ce qu'il montre.** Le rail porte la vue active, et
          le rail peut être replié : sans ce titre, un journal replié ne dit
          plus du tout ce qu'on y lit. L'explication tient sur la même ligne
          logique — ce que la rangée d'onglets disait déjà, et qui n'avait pas
          à disparaître avec elle.

          **Dans la colonne, jamais au-dessus du rail** : posé sur le bord
          gauche de la coque, un titre commence derrière la barre latérale, qui
          flotte par-dessus.
        */""}
        <div class="memoire-corps__tete">
          <h2 class="actions-vue__titre">${escapeHtml(vue.libelle)}</h2>
          <p class="actions-vue__dit">${escapeHtml(vue.explication)}</p>
        </div>
        ${tableHtml}${renderPaginationControls(pagination, { entity: "actions" })}
      </div>
    </div>
  `;
}

/**
 * Le détail d'une exécution.
 *
 * Le journal a grossi parce que les actions racontent l'histoire du projet :
 * qui a fait quoi, quand, et ce que la machine en a tiré. Un tableau ne peut pas
 * porter tout cela sans devenir illisible — d'où deux niveaux, comme sur les
 * pages d'exécution de GitHub : une ligne par acte, et une page par acte.
 *
 * La page dit trois choses, dans cet ordre : **ce que c'était** (l'action, son
 * état, sa cause), **ce qu'elle a lu**, et **ce qu'il faut en retenir** — les
 * annotations, c'est-à-dire ce qui n'allait pas. Une exécution sans annotation
 * le dit aussi : « aucune » est une information, une section vide n'en est pas
 * une.
 */
function renderRunDetail(entry) {
  const meta = getRunStatusMeta(entry);
  const corpus = entry?.details?.corpus ?? null;

  const identite = [
    ["Déclencheur", getTriggerLabel(entry)],
    ["Lancée le", formatDateTime(entry.startedAt)],
    ["Terminée le", entry.endedAt ? formatDateTime(entry.endedAt) : "—"],
    ["Durée", dureeDite(entry.durationMs)],
    ["Objet", entry.documentName || "—"]
  ];

  const lecture = laLectureDuCorpus(corpus);

  const annotations = [];
  if (corpus?.guardViolationCount > 0) {
    annotations.push({
      tone: "warn",
      text: `${corpus.guardViolationCount} violation(s) de garde`,
      note: "Le moteur a signalé des lectures qu'il ne sait pas garantir. Le détail se retrouve dans l'atelier."
    });
  }
  if (entry.summary && String(entry.outcomeStatus || "").toLowerCase() === "error") {
    annotations.push({ tone: "error", text: entry.summary, note: "" });
  }

  const documents = corpus?.documents ?? [];

  return `
    <section class="run-detail">
      <div class="run-detail__head">
        <div class="run-detail__title-row">
          ${getRunStateIcon(entry)}
          <h2 class="run-detail__title">${escapeHtml(entry.name || UNE_EXECUTION)}</h2>
          <span class="${meta.className}">${escapeHtml(meta.label)}</span>
        </div>
        <p class="run-detail__lead">${escapeHtml(entry.summary || getTriggerLabel(entry))}</p>
      </div>

      ${renderRunGraph(entry)}
      ${renderRunSection("L'exécution", identite)}
      ${lecture.length > 0 ? renderRunSection("Ce que l'analyse a lu", lecture) : ""}
      ${renderRunPipelineSteps(entry)}

      <section class="run-section">
        <h3 class="run-section__title">Annotations</h3>
        ${
          annotations.length === 0
            ? `<p class="run-section__empty">Aucune. L'exécution n'a rien signalé qu'il faille relire.</p>`
            : annotations
                .map(
                  (annotation) => `
                    <div class="run-annotation run-annotation--${annotation.tone}">
                      <b>${escapeHtml(annotation.text)}</b>
                      ${annotation.note ? `<span>${escapeHtml(annotation.note)}</span>` : ""}
                    </div>
                  `
                )
                .join("")
        }
      </section>

      ${
        documents.length > 0
          ? `<section class="run-section">
               <h3 class="run-section__title">Livrables lus <span class="run-section__count">${documents.length}</span></h3>
               <ul class="run-files">
                 ${documents.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}
               </ul>
             </section>`
          : ""
      }
    </section>
  `;
}

/**
 * Le chemin d'une exécution, en boîtes reliées.
 *
 * Un enchaînement se comprend d'un coup d'œil là où une liste de chiffres
 * demande de le reconstruire : une décision cause une analyse, l'analyse lit un
 * corpus, le corpus produit des avis, les avis deviennent le suivi.
 *
 * Chaque boîte porte un chiffre réellement écrit en base, et sa durée quand
 * l'exécution l'a mesurée. Les étapes restent **sur une ligne** et débordent si
 * besoin : plier un enchaînement en colonnes lui fait perdre ce qu'il a de plus
 * lisible, sa direction. Le déroulé horizontal, lui, se fait à la souris.
 */
function renderRunGraph(entry) {
  const nodes = buildRunGraph(entry);
  if (nodes.length === 0) return "";
  const consultables = etapesConsultables(entry);

  return `
    <section class="run-section run-section--graph" data-run-graph-section>
      <div class="run-section__head run-section__head--graph">
        <h3 class="run-section__title run-section__title--graph">Le chemin de cette exécution</h3>
        <div class="run-graph__tools" data-run-graph-tools hidden>
          <button type="button" class="run-graph__tool" data-graph-zoom="out" aria-label="Réduire">
            ${svgIcon("minus", { className: "octicon" })}
          </button>
          <button type="button" class="run-graph__tool" data-graph-zoom="in" aria-label="Agrandir">
            ${svgIcon("plus", { className: "octicon" })}
          </button>
          <button type="button" class="run-graph__tool" data-graph-full aria-label="Plein écran">
            ${svgIcon("screen-full", { className: "octicon" })}
          </button>
        </div>
      </div>

      ${
        // Aucune phase mesurée : on le dit. Un graphe muet laisserait croire que
        // tout a été instantané, ou que l'affichage est cassé.
        nodes.length > 0 && nodes.every((node) => node.duration === null)
          ? `<p class="run-graph__unmeasured">Les durées de cette exécution n'ont pas été enregistrées.</p>`
          : ""
      }
      ${
        // Et quand aucune étape n'a de journal, on le dit **aussi**. Sans cette
        // ligne, on cherche où cliquer : rien ne distingue « il n'y a rien à
        // ouvrir » de « l'écran est cassé », et l'infobulle ne se lit qu'au
        // survol d'un titre qu'on n'a aucune raison de survoler.
        consultables.size === 0
          ? `<p class="run-graph__unmeasured">Aucune étape de cette exécution n'a enregistré de journal : il n'y a rien à ouvrir. Les exécutions plus récentes en tiennent un.</p>`
          : ""
      }
      <div class="run-graph" data-run-graph-viewport>
        ${
          // Le même dessin que la chaîne d'une variante, et volontairement :
          // deux enchaînements dessinés deux fois donneraient deux gris et deux
          // flèches, et le jour où l'un change l'autre ne suivrait pas
          // (règle 4). Voir `views/ui/enchainement.js`.
          renderEnchainement(nodes.map((node) => ({ ...node, duree: formatStepDuration(node.duration) })), {
            attributDuLien: "data-run-step",
            consultables,
            attributDuCanevas: "data-run-graph-canvas"
          })
        }
      </div>
    </section>
  `;
}

/**
 * Les commandes du graphe, quand il déborde.
 *
 * Elles n'apparaissent que si elles servent : un bouton de zoom sur un dessin
 * qui tient déjà tout entier n'est qu'un bouton de plus à ignorer.
 */
function bindRunGraph(root) {
  const section = root.querySelector("[data-run-graph-section]");
  const viewport = root.querySelector("[data-run-graph-viewport]");
  const canvas = root.querySelector("[data-run-graph-canvas]");
  const tools = root.querySelector("[data-run-graph-tools]");
  if (!section || !viewport || !canvas || !tools) return;

  let zoom = 1;

  const sync = () => {
    canvas.style.setProperty("--run-graph-zoom", String(zoom));
    // `scrollWidth > clientWidth` dit exactement ce qu'on veut savoir : le
    // dessin ne tient pas, donc les commandes ont une utilité.
    tools.hidden = viewport.scrollWidth <= viewport.clientWidth + 1 && zoom === 1;
  };

  for (const bouton of tools.querySelectorAll("[data-graph-zoom]")) {
    bouton.addEventListener("click", () => {
      const pas = bouton.getAttribute("data-graph-zoom") === "in" ? 0.15 : -0.15;
      zoom = Math.min(1.6, Math.max(0.5, Math.round((zoom + pas) * 100) / 100));
      sync();
    });
  }

  tools.querySelector("[data-graph-full]")?.addEventListener("click", () => {
    section.classList.toggle("run-section--fullscreen");
    sync();
  });

  sync();
  // Le débordement dépend de la largeur disponible : ce qui tenait à l'ouverture
  // peut ne plus tenir après un redimensionnement.
  window.addEventListener("resize", sync, { passive: true });
}

function renderRunSection(titre, lignes = []) {
  if (lignes.length === 0) return "";

  return `
    <section class="run-section">
      <h3 class="run-section__title">${escapeHtml(titre)}</h3>
      <div class="run-rows">
        ${lignes
          .map(
            ([label, valeur]) => `
              <div class="run-row">
                <span class="run-row__label">${escapeHtml(label)}</span>
                <span class="run-row__value">${escapeHtml(String(valeur ?? "—"))}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

/**
 * Le détail d'une étape, ligne à ligne.
 *
 * Troisième niveau du journal : une ligne par acte, une page par exécution, et
 * ici une page par **étape**. C'est le niveau auquel on répond à « qu'est-ce
 * qui a été fait, dans quel ordre, et où ça s'est arrêté ».
 *
 * La mise en forme est celle d'un journal d'exécution — gouttière de numéros à
 * gauche, texte à chasse fixe, groupes repliés derrière un chevron — parce que
 * c'est la forme que les gens savent déjà lire, et parce qu'elle rend le
 * repérage possible : on cite un numéro de ligne.
 *
 * Les numéros ne sont pas recalculés à l'affichage. Un groupe replié laisse un
 * trou dans la suite visible, et ce trou est l'information : il dit combien de
 * lignes se cachent là sans les montrer.
 */
function renderStepDetail(entry, etape) {
  const lignes = numeroter(etape.lignes ?? []);
  const resume = resumerEtape(etape);
  const meta = etatDeLEtape(etape.statut);

  return `
    <section class="run-detail run-detail--step">
      <div class="run-detail__head">
        <div class="run-detail__title-row">
          <button type="button" class="run-step__retour" data-run-step-back>
            ${svgIcon("arrow-left", { className: "octicon" })} ${escapeHtml(entry.name || "Exécution")}
          </button>
        </div>
        <div class="run-detail__title-row">
          <span class="${meta.icone}">${svgIcon(meta.symbole, { className: "octicon" })}</span>
          <h2 class="run-detail__title">${escapeHtml(etape.label || etape.id)}</h2>
          ${etape.ms === null ? "" : `<span class="run-step__duree">${escapeHtml(formatStepDuration(etape.ms))}</span>`}
        </div>
        <p class="run-detail__lead">
          ${escapeHtml(meta.phrase)}
          ${resume.total} ligne${resume.total > 1 ? "s" : ""} enregistrée${resume.total > 1 ? "s" : ""}${
            decrireLesEcarts(resume)
          }.
        </p>
      </div>

      <div class="run-log" data-run-log>
        ${lignes.map(renderLogLine).join("")}
      </div>
    </section>
  `;
}

/** « dont 2 à relire et 1 en échec », ou rien du tout. */
function decrireLesEcarts({ avertissements, echecs }) {
  const morceaux = [];
  if (avertissements > 0) morceaux.push(`${avertissements} à relire`);
  if (echecs > 0) morceaux.push(`${echecs} en échec`);
  return morceaux.length ? `, dont ${morceaux.join(" et ")}` : "";
}

/** Une ligne du journal : un fait, ou un groupe qu'on déplie. */
function renderLogLine(ligne) {
  if (!ligne.groupe) {
    return `
      <div class="run-log__line run-log__line--${escapeHtml(ligne.niveau)}">
        <span class="run-log__num">${ligne.numero}</span>
        <span class="run-log__text">${escapeHtml(ligne.texte)}</span>
      </div>
    `;
  }

  const caches = ligne.lignes.length;
  // Un groupe qui a échoué s'ouvre tout seul. Replier ce qui a cassé, c'est
  // reproduire le défaut qu'on corrige : il faudrait chercher où ça s'est
  // arrêté au lieu de le voir. Son en-tête porte aussi la couleur de son état,
  // sans quoi un échec se cacherait derrière un chevron gris.
  const ouvert = ligne.statut === STATUT.ECHEC;
  return `
    <div class="run-log__group" data-run-log-group>
      <button type="button" class="run-log__line run-log__line--group run-log__line--${escapeHtml(ligne.statut)}"
              data-run-log-toggle aria-expanded="${ouvert ? "true" : "false"}">
        <span class="run-log__num">${ligne.numero}</span>
        <span class="run-log__caret">${svgIcon("chevron-right", { className: "octicon" })}</span>
        <span class="run-log__text">${escapeHtml(ligne.groupe)}</span>
        <span class="run-log__count">${caches} ligne${caches > 1 ? "s" : ""}</span>
      </button>
      <div class="run-log__children"${ouvert ? "" : " hidden"}>
        ${ligne.lignes
          .map(
            (enfant) => `
              <div class="run-log__line run-log__line--child run-log__line--${escapeHtml(enfant.niveau)}">
                <span class="run-log__num">${enfant.numero}</span>
                <span class="run-log__text">${escapeHtml(enfant.texte)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

/**
 * Ce que le statut d'une étape de journal vaut, en mots et en signes.
 *
 * À ne pas confondre avec `getStepStatusMeta`, qui décrit les étapes de
 * l'enrichissement Géorisques : ce ne sont pas les mêmes étapes, et elles
 * n'ont ni les mêmes états ni la même façon de se rendre.
 */
function etatDeLEtape(statut) {
  if (statut === STATUT.ECHEC) {
    return {
      symbole: "x-circle-fill",
      icone: "run-step__etat run-step__etat--echec",
      phrase: "L'exécution s'est arrêtée ici."
    };
  }
  if (statut === STATUT.NON_ATTEINTE) {
    return {
      symbole: "dot-fill-pending",
      icone: "run-step__etat run-step__etat--attente",
      phrase: "Cette étape n'a pas été atteinte : une précédente s'est arrêtée."
    };
  }
  return {
    symbole: "check-circle-fill",
    icone: "run-step__etat run-step__etat--ok",
    phrase: "Cette étape est allée au bout."
  };
}

/** Les groupes se déplient et se replient, comme un journal d'exécution. */
function bindRunLog(root) {
  for (const bouton of root.querySelectorAll("[data-run-log-toggle]")) {
    bouton.addEventListener("click", () => {
      const enfants = bouton.parentElement?.querySelector(".run-log__children");
      if (!enfants) return;
      const ouvert = bouton.getAttribute("aria-expanded") === "true";
      bouton.setAttribute("aria-expanded", ouvert ? "false" : "true");
      enfants.hidden = ouvert;
    });
  }
}

function getOpenRun() {
  const openId = String(store.projectActionsView?.openRunId || "");
  if (!openId) return null;
  return getRunLogEntries().find((entry) => String(entry.id) === openId) ?? null;
}

function renderProjectActionsContent(root) {
  const open = getOpenRun();
  // Trois niveaux, et le plus profond n'existe que si le précédent existe : une
  // étape ouverte sans son exécution serait une page orpheline.
  const etape = open ? etapeDe(open, store.projectActionsView?.openStepId) : null;

  /**
   * **La coquille est celle des Sujets, à l'identique.**
   *
   * Elle était `project-page-shell`, qui borne à 1216 pixels et **centre** :
   * avec un rail en position fixe contre le bord gauche, le contenu comptait la
   * marge du rail **en plus** du centrage, et le tableau se retrouvait décalé
   * d'une largeur de rail vers la droite. Replié, il glissait sous le rail.
   *
   * `page-large` est ce que les Sujets emploient pour la même chose : un
   * tableau qui veut de la largeur, dans une page qui porte un rail.
   */
  root.innerHTML = `
    <section class="project-simple-page project-simple-page--actions"
      style="--project-rail-width:${railWidth(
        store.projectActionsView?.railLargeur, store.projectActionsView?.railOuvert === false)}px">
      <div class="page-large">
        ${etape ? renderStepDetail(open, etape) : open ? renderRunDetail(open) : renderRunsTable()}
      </div>
    </section>
  `;

  if (etape) bindRunLog(root);
  else if (open) bindRunGraph(root);
  else brancherLeRail(root);

  // **Après avoir dessiné, décider s'il faut recommencer.** L'état vient d'être
  // lu : c'est le seul moment où l'on sait s'il reste quelque chose à suivre.
  reglerLeBattement();
}

/**
 * La poignée du rail.
 *
 * La même que celle des Sujets et des Fichiers : on déplace pendant le geste,
 * on redessine à la fin. Redessiner à chaque pixel reconstruirait le tableau
 * vingt fois par seconde, et la poignée décrocherait du pointeur.
 */
let railDetacher = null;

function brancherLeRail(root) {
  // **Le haut du rail suit le défilement.** Les onglets du projet défilent avec
  // la page, l'en-tête global non : sans ce calage, le rail restait à la
  // hauteur qu'il avait au rendu et laissait un blanc sous les onglets quand
  // ils se compactaient. La mesure vit dans la coque commune.
  railDetacher?.();
  railDetacher = followRailScroll(root.querySelector(".project-rail"));

  bindRailResizer({
    root,
    id: "actionsRail",
    pageSelector: ".project-simple-page",
    getWidth: () => railWidth(store.projectActionsView?.railLargeur),
    onEnd: (largeur) => {
      if (!store.projectActionsView || typeof store.projectActionsView !== "object") {
        store.projectActionsView = {};
      }
      store.projectActionsView.railLargeur = largeur;
      renderProjectActionsContent(root);
    }
  });
}

/**
 * Relire le journal tant qu'une exécution est vive.
 *
 * ## Ce que ça répare
 *
 * Le journal se redessinait sur `RUN_LOG_CHANGED_EVENT`, qui est un événement
 * **de la page** : une fusion menée dans l'onglet se voyait avancer. Un
 * versement de mails, lui, n'a plus lieu dans la page depuis qu'il est passé au
 * serveur — celui-ci écrit dans la base sans rien dire au navigateur. La ligne
 * restait donc « en cours », avec son disque orange qui tourne, jusqu'à ce
 * qu'on recharge la page ; c'est-à-dire pendant tout le temps où l'on regarde.
 *
 * ## Ce qui l'arrête
 *
 * Trois choses, et il faut les trois : plus rien de vif, l'écran démonté, ou
 * une relecture qui trouve l'écran parti pendant qu'elle attendait. Un
 * battement qu'on oublie d'arrêter interroge la base toute la nuit sur un
 * onglet laissé ouvert, et écrit dans un élément détaché.
 */
let battementDuJournal = null;

function arreterLeBattement() {
  if (!battementDuJournal) return;
  clearInterval(battementDuJournal);
  battementDuJournal = null;
}

function reglerLeBattement() {
  if (!mountedRoot?.isConnected || !quelqueChoseTourne(getRunLogEntries())) {
    arreterLeBattement();
    return;
  }
  // Déjà en train de battre : un second minuteur doublerait les requêtes sans
  // rien montrer de plus.
  if (battementDuJournal) return;

  battementDuJournal = setInterval(async () => {
    if (!mountedRoot?.isConnected) return arreterLeBattement();
    await syncProjectActionsFromSupabase({ force: true }).catch(() => {});
    // L'écran a pu être quitté pendant la lecture : entre l'envoi et la
    // réponse, il s'écoule le temps d'un clic.
    if (!mountedRoot?.isConnected) return arreterLeBattement();
    renderProjectActionsContent(mountedRoot);
  }, LE_BATTEMENT_DU_JOURNAL);
}

/**
 * Re-cliquer l'onglet « Actions » revient au journal.
 *
 * Le même geste que pour les sujets et les propositions : l'onglet ramène chez
 * lui, et c'est pour cela qu'il n'y a plus de bouton de retour dans le détail.
 * Le lien de l'onglet actif ne change pas l'adresse, donc aucun `hashchange`
 * n'a lieu : cet événement est le seul signal disponible.
 *
 * L'écran est reconstruit à chaque navigation ; l'écouteur lit donc l'écran
 * monté, jamais celui qu'il avait sous la main le jour où il a été posé.
 */
let tabResetBound = false;
let mountedRoot = null;
let ecouteDuJournal = null;

/**
 * Le journal se redessine quand une exécution bouge.
 *
 * ## Ce que ça répare
 *
 * Une fusion dure une minute et demie et passe par onze étapes. L'écran les
 * lisait **au montage**, et rien ne lui disait qu'une venait de finir : le
 * chemin restait figé sur l'état de l'instant où l'on était arrivé, et il
 * fallait quitter l'onglet et y revenir pour voir où l'on en était. Sur un
 * geste qui dure, c'est la différence entre attendre et se demander si c'est
 * bloqué.
 *
 * **Une seule écoute, posée une fois.** Deux écrans qui en poseraient chacune
 * une redessineraient deux fois par changement, et celui qui n'est plus monté
 * écrirait dans un élément détaché.
 */
function ecouterLeJournal() {
  if (ecouteDuJournal) return;

  ecouteDuJournal = () => {
    // Monté ailleurs, ou plus monté du tout : on ne dessine pas dans le vide.
    if (!mountedRoot?.isConnected) return;
    renderProjectActionsContent(mountedRoot);
  };

  globalThis.window?.addEventListener?.(RUN_LOG_CHANGED_EVENT, ecouteDuJournal);
}

function bindTabReset() {
  if (tabResetBound) return;
  tabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    if (String(event?.detail?.tabId || "") !== "actions") return;
    if (!mountedRoot?.isConnected) return;
    if (!store.projectActionsView?.openRunId) return;

    store.projectActionsView.openRunId = "";
    store.projectActionsView.openStepId = "";
    renderProjectActionsContent(mountedRoot);
  });
}

export function renderProjectActions(root) {
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();
  mountedRoot = root;
  bindTabReset();
  ecouterLeJournal();

  // Entrer dans l'onglet, c'est ouvrir le journal — jamais retomber sur
  // l'exécution qu'on lisait la dernière fois.
  if (store.projectActionsView && typeof store.projectActionsView === "object") {
    store.projectActionsView.openRunId = "";
    store.projectActionsView.openStepId = "";
  }

    // **Pas de bandeau de vue.** Il portait un libellé et rien d'autre : une
  // bande vide entre les onglets et le contenu, qui empêchait le rail de se
  // caler sous la barre des onglets et de descendre jusqu'en bas. Les Sujets,
  // la Mémoire, l'Atelier et les Propositions le masquent déjà.
  setProjectViewHeader({
    contextLabel: "Actions",
    variant: "actions",
    hideBar: true
  });

  renderProjectActionsContent(root);
  root.onclick = (event) => {
    if (!store.projectActionsView || typeof store.projectActionsView !== "object") store.projectActionsView = {};

    // Ouvrir une exécution, et en revenir. Le journal reste où il était : on
    // reprend sa lecture là où on l'avait laissée, page comprise.
    const opener = event.target?.closest?.("[data-run-open]");
    if (opener) {
      event.preventDefault();
      store.projectActionsView.openRunId = opener.getAttribute("data-run-open") || "";
      store.projectActionsView.openStepId = "";
      renderProjectActionsContent(root);
      return;
    }

    // Ouvrir une étape depuis le graphe, et en revenir.
    const etapeOuverte = event.target?.closest?.("[data-run-step]");
    if (etapeOuverte) {
      event.preventDefault();
      store.projectActionsView.openStepId = etapeOuverte.getAttribute("data-run-step") || "";
      renderProjectActionsContent(root);
      return;
    }
    if (event.target?.closest?.("[data-run-step-back]")) {
      event.preventDefault();
      store.projectActionsView.openStepId = "";
      renderProjectActionsContent(root);
      return;
    }

    // Replier le rail. Le bouton est celui de la coque commune — calé en bas,
    // au même endroit replié ou non : un bouton qui se déplace selon l'état
    // qu'il commande oblige à le chercher chaque fois qu'on veut revenir.
    const replier = event.target?.closest?.("[data-project-rail-collapse]");
    if (replier) {
      event.preventDefault();
      store.projectActionsView.railOuvert = store.projectActionsView.railOuvert === false;
      renderProjectActionsContent(root);
      return;
    }

    // Changer d'onglet remet à la première page : la pagination portait sur
    // l'autre pile, et sa page 3 n'existe peut-être pas ici.
    const onglet = event.target?.closest?.("[data-actions-onglet]");
    if (onglet) {
      event.preventDefault();
      store.projectActionsView.onglet = onglet.getAttribute("data-actions-onglet") || "";
      if (store.projectActionsView.pagination && typeof store.projectActionsView.pagination === "object") {
        store.projectActionsView.pagination.currentPage = 1;
      }
      renderProjectActionsContent(root);
      return;
    }

    const trigger = event.target?.closest?.('[data-pagination-entity="actions"][data-pagination-page]');
    if (!trigger) return;
    event.preventDefault();
    const nextPage = Math.max(1, Number.parseInt(trigger.getAttribute("data-pagination-page") || "1", 10) || 1);
    if (!store.projectActionsView || typeof store.projectActionsView !== "object") store.projectActionsView = {};
    if (!store.projectActionsView.pagination || typeof store.projectActionsView.pagination !== "object") {
      store.projectActionsView.pagination = { mode: "client", pageSize: 25, currentPage: 1 };
    }
    store.projectActionsView.pagination.currentPage = nextPage;
    renderProjectActionsContent(root);
  };
  debugProjectScrollPolicy("render-project-actions");

  syncProjectActionsFromSupabase({ force: true })
    .then(() => {
      if (!root?.isConnected) return;
      const entries = getRunLogEntries();
      const pagination = normalizePaginationState({
        totalItems: entries.length,
        pageSize: store.projectActionsView?.pagination?.pageSize,
        currentPage: store.projectActionsView?.pagination?.currentPage
      });
      if (!store.projectActionsView || typeof store.projectActionsView !== "object") {
        store.projectActionsView = { pagination: { mode: "client", pageSize: 25, currentPage: 1 } };
      }
      if (!store.projectActionsView.pagination || typeof store.projectActionsView.pagination !== "object") {
        store.projectActionsView.pagination = { mode: "client", pageSize: 25, currentPage: 1 };
      }
      store.projectActionsView.pagination.currentPage = pagination.currentPage;
      renderProjectActionsContent(root);
    })
    .catch((error) => {
      console.warn("syncProjectActionsFromSupabase failed", error);
    });
}
