import { renderProblemsCountsIconHtml } from "../ui/subissues-counts.js";
import { getDisplayAuthorName } from "../ui/author-identity.js";
import { findCollaboratorByAssigneeId, normalizeAssigneeIds } from "../../services/subject-assignees-service.js";
import { normalizePaginationState, paginateItems, renderPaginationControls } from "../ui/pagination.js";
import { videDeLaListeDesSujets } from "../../services/liste-vide-des-sujets.js";
export function getSituationsTableGridTemplate() {
  return "minmax(0, 1fr) 84px max-content";
}

export function renderSituationsTableHeadHtml(options = {}) {
  const { renderDataTableHead, renderSubjectsStatusHeadHtml, renderSubjectsPriorityHeadHtml } = options.deps || options;
  const columns = Array.isArray(options.columns) && options.columns.length
    ? options.columns
    : [
        { className: "cell cell-theme", html: renderSubjectsStatusHeadHtml() },
        { className: "cell cell-priority-filter", html: renderSubjectsPriorityHeadHtml() }
      ];

  return renderDataTableHead({ columns });
}


function getSubjectChildrenCounts(sujet, getChildSubjects, getEffectiveSujetStatus) {
  const rootSubjectId = String(sujet?.id || "");
  if (!rootSubjectId || typeof getChildSubjects !== "function") {
    return { total: 0, closed: 0, open: 0 };
  }

  const directChildren = Array.isArray(getChildSubjects(rootSubjectId)) ? getChildSubjects(rootSubjectId) : [];
  const total = directChildren.length;
  const closed = directChildren
    .filter((childSubject) => {
      const childSubjectId = String(childSubject?.id || "");
      const childStatus = String(getEffectiveSujetStatus(childSubjectId) || childSubject?.status || "open").toLowerCase();
      return childStatus !== "open";
    })
    .length;

  return {
    total,
    closed,
    open: Math.max(0, total - closed)
  };
}

function renderSubjectChildrenCounterHtml(sujet, deps) {
  const counts = getSubjectChildrenCounts(sujet, deps.getChildSubjects, deps.getEffectiveSujetStatus);
  if (!counts.total) return "";
  return `
    <span class="subissues-counts subissues-counts--problems issue-row-subject-children-counter" aria-label="${counts.open} sous-sujets ouverts, ${counts.closed} fermés, ${counts.total} au total">
      ${renderProblemsCountsIconHtml(counts.closed, counts.total)}
      <span>${counts.closed} / ${counts.total}</span>
    </span>
  `;
}

function renderWelcomeHtml(deps) {
  const { renderIssuesTable } = deps;
  const tableHtml = renderIssuesTable({
    gridTemplate: getSituationsTableGridTemplate(),
    headHtml: renderSituationsTableHeadHtml({
      deps,
      columns: [
        { className: "cell cell-theme", html: deps.renderSubjectsStatusHeadHtml() },
        { className: "cell cell-messages-head", html: "" },
        { className: "cell cell-assignees-head", html: deps.renderSubjectsAssigneesHeadHtml?.() ?? "Assignés" }
      ]
    }),
    emptyTitle: "Aucune analyse disponible",
    emptyDescription: "Lancer une analyse pour générer des sujets."
  });
}

function getActiveProjectCollaborators(store) {
  const collaborators = Array.isArray(store?.projectForm?.collaborators) ? store.projectForm.collaborators : [];
  return collaborators
    .filter((collaborator) => String(collaborator?.status || "Actif").toLowerCase() !== "retiré")
    .map((collaborator) => ({
      id: String(collaborator?.personId || collaborator?.id || ""),
      userId: String(collaborator?.userId || collaborator?.linkedUserId || ""),
      name: String(collaborator?.name || [collaborator?.firstName, collaborator?.lastName].filter(Boolean).join(" ") || collaborator?.email || "Utilisateur"),
      email: String(collaborator?.email || ""),
      avatarUrl: String(collaborator?.avatarUrl || collaborator?.avatar || ""),
      avatarStoragePath: String(collaborator?.avatarStoragePath || "")
    }))
    .filter((collaborator) => !!collaborator.id);
}

function renderAssigneeAvatar(collaborator = {}, escapeHtml, fallbackAvatar = "") {
  const displayName = String(collaborator?.name || collaborator?.email || "U");
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";
  const avatarUrl = String(collaborator?.avatarUrl || fallbackAvatar || "");
  if (avatarUrl) {
    return `<span class="subject-assignee-avatar"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" class="subject-assignee-avatar__img"></span>`;
  }
  return `<span class="subject-assignee-avatar subject-assignee-avatar--fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
}

function getSubjectMessagesCount(sujet, deps) {
  const rawPayload = deps?.store?.projectSubjectsView?.rawSubjectsResult && typeof deps.store.projectSubjectsView.rawSubjectsResult === "object"
    ? deps.store.projectSubjectsView.rawSubjectsResult
    : (deps?.store?.projectSubjectsView?.rawResult && typeof deps.store.projectSubjectsView.rawResult === "object"
      ? deps.store.projectSubjectsView.rawResult
      : {});
  const subjectMessageCountsBySubjectId = rawPayload?.subjectMessageCountsBySubjectId && typeof rawPayload.subjectMessageCountsBySubjectId === "object"
    ? rawPayload.subjectMessageCountsBySubjectId
    : {};
  const count = Number(subjectMessageCountsBySubjectId[String(sujet?.id || "")] || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function renderSubjectMessagesCountCellHtml(sujet, deps) {
  const { svgIcon, escapeHtml } = deps;
  const count = getSubjectMessagesCount(sujet, deps);
  if (!count) {
    return '<span class="issue-row-messages-empty" aria-hidden="true"></span>';
  }
  return `
    <span class="issue-row-messages-count" aria-label="${escapeHtml(`${count} message(s)`)}">
      ${svgIcon("message")}
      <span>${escapeHtml(String(count))}</span>
    </span>
  `;
}

function renderSubjectAssigneesCellHtml(sujet, deps) {
  const { store, escapeHtml } = deps;
  const subjectMeta = deps.getSubjectSidebarMeta(sujet.id);
  const collaborators = getActiveProjectCollaborators(store);
  const collaboratorsById = new Map(collaborators.map((collaborator) => [collaborator.id, collaborator]));
  const selected = normalizeAssigneeIds(subjectMeta.assignees)
    .map((assigneeId) => findCollaboratorByAssigneeId(collaboratorsById, assigneeId) || {
      id: assigneeId,
      userId: "",
      name: `Collaborateur ${String(assigneeId || "").slice(0, 8)}`,
      email: "",
      avatarUrl: ""
    })
    .slice(0, 3);

  if (!selected.length) return `<span class="issue-row-assignees-empty">—</span>`;

  return `
    <span class="issue-row-assignees" aria-label="${escapeHtml(`${selected.length} assigné(s)`)}}">
      ${selected.map((collaborator) => renderAssigneeAvatar(
        collaborator,
        escapeHtml,
        String(collaborator?.userId || "") === String(store?.user?.id || "") ? String(store?.user?.avatar || "") : ""
      )).join("")}
    </span>
  `;
}

export function renderFlatSujetRow(sujet, situationId, options = {}) {
  const deps = options.deps || {};
  const {
    escapeHtml,
    svgIcon,
    issueIcon,
    getEffectiveSujetStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    getEntityDisplayRef,
    getEntityDescriptionState,
    formatRelativeTimeLabel,
    getEntityListTimestamp,
    getSubjectSidebarMeta,
    getSubjectLabelDefinition,
    renderSubjectLabelBadge,
    getObjectiveById,
    getChildSubjects,
    getBlockedBySubjects,
    getHeadVisibleBlockedBySubjects,
    firstNonEmpty
  } = deps;

  const effStatus = getEffectiveSujetStatus(sujet.id);
  const meta = getEntityReviewMeta("sujet", sujet.id);
  const titleSeenClass = getReviewTitleStateClass("sujet", sujet.id);
  const displayRef = getEntityDisplayRef("sujet", sujet.id);
  const descriptionState = getEntityDescriptionState("sujet", sujet.id) || {};
  const author = getDisplayAuthorName(firstNonEmpty(descriptionState?.author, sujet?.agent, sujet?.raw?.agent, "system"), {
    agent: firstNonEmpty(descriptionState?.agent, sujet?.agent, sujet?.raw?.agent, "system"),
    fallback: "System"
  });
  const openedLabel = formatRelativeTimeLabel(getEntityListTimestamp("sujet", sujet), "opened");
  const subjectMeta = getSubjectSidebarMeta(sujet.id);
  const subjectLabelsHtml = subjectMeta.labels
    .map((label) => getSubjectLabelDefinition(label))
    .filter(Boolean)
    .map((labelDef) => renderSubjectLabelBadge(labelDef))
    .join("");
  const objective = getObjectiveById(subjectMeta.objectiveIds[0] || "");
  const objectiveLabel = objective
    ? ` - <button type="button" class="issue-row-subject-objective" data-row-objective-id="${escapeHtml(objective.id)}"><span class="issue-row-subject-objective__icon" aria-hidden="true">${svgIcon("milestone", { className: "octicon octicon-milestone" })}</span><span class="issue-row-subject-objective__text">${escapeHtml(firstNonEmpty(objective.title, objective.id, "Objectif"))}</span></button>`
    : "";
  const headVisibleBlockedBySubjects = Array.isArray(getHeadVisibleBlockedBySubjects?.(sujet.id))
    ? getHeadVisibleBlockedBySubjects(sujet.id)
    : (Array.isArray(getBlockedBySubjects?.(sujet.id)) ? getBlockedBySubjects(sujet.id) : []);
  const isBlocked = headVisibleBlockedBySubjects.length > 0;
  const blockedBadge = isBlocked
    ? `<span class="issue-row-blocked-pill" aria-label="Sujet bloqué">${svgIcon("blocked", { className: "octicon octicon-blocked fgColor-danger" })}<span>Bloqué</span></span>`
    : "";

  return `
    <div class="issue-row issue-row--pb click js-row-sujet${options.isSelectable === false ? "" : (options.rowSelectedClass ? options.rowSelectedClass("sujet", sujet.id) : "")}" data-sujet-id="${escapeHtml(sujet.id)}">
      <div class="cell cell-theme lvl0">
        <span class="issue-row-title-grid">
          <span class="issue-row-title-grid__status">
            ${issueIcon(effStatus, { reviewState: meta.review_state, entityType: "sujet", isSeen: meta.is_seen })}
          </span>
            <span class="issue-row-title-grid__title issue-row-subject-title-line">
            <button type="button" class="row-title-trigger js-row-title-trigger theme-text theme-text--pb ${titleSeenClass}" data-row-entity-type="sujet" data-row-entity-id="${escapeHtml(sujet.id)}">${escapeHtml(firstNonEmpty(sujet.title, sujet.id, "Non classé"))}</button>
            ${renderSubjectChildrenCounterHtml(sujet, deps)}${subjectLabelsHtml ? `<span class="issue-row-subject-labels">${subjectLabelsHtml}</span>` : ""}
          </span>
          <span class="issue-row-title-grid__meta issue-row-meta-text mono-small">${blockedBadge}${escapeHtml(displayRef)} - <span class="issue-row-author-name">${escapeHtml(author)}</span> • ${escapeHtml(openedLabel)}${objectiveLabel}</span>
        </span>
      </div>
      <div class="cell cell-messages-value">${renderSubjectMessagesCountCellHtml(sujet, deps)}</div>
      <div class="cell cell-assignees-value">${renderSubjectAssigneesCellHtml(sujet, deps)}</div>
    </div>
  `;
}

/**
 * Combien de colonnes le bandeau porte, selon le nombre d'épingles.
 *
 * **Une carte seule fait la moitié de la largeur, pas la largeur entière.** Un
 * bandeau pleine largeur au-dessus d'un tableau pleine largeur ne se distingue
 * plus de lui : il devient une première ligne, et il cesse d'être un repère.
 * À deux, chacune la moitié ; à trois, chacune un tiers.
 *
 * Ce qui revient à toujours poser au moins deux colonnes, et autant qu'il y a
 * d'épingles au-delà.
 */
export function colonnesDuBandeau(combien = 0) {
  const epingles = Number.isFinite(combien) ? Math.max(0, Math.trunc(combien)) : 0;
  return Math.max(2, epingles);
}

/**
 * Le bandeau des sujets épinglés, au-dessus du tableau.
 *
 * ## Pourquoi un bandeau et pas un tri
 *
 * Un chantier porte soixante-treize sujets ouverts ; trois occupent la semaine.
 * Les remonter par un tri les mélangerait au reste dès qu'on trie autrement, et
 * un filtre ne les rassemble pas — ce n'est ni un statut, ni un lot, ni une
 * échéance qui les réunit, c'est l'attention de quelqu'un.
 *
 * Le bandeau est **hors du tableau** : il ne se filtre pas, ne se trie pas, ne
 * se pagine pas. C'est ce qui en fait un repère — il est au même endroit à
 * chaque ouverture, quoi qu'on ait fait de la liste en dessous.
 *
 * ## Des cartes côte à côte, et non des lignes
 *
 * Des lignes au même gabarit que le tableau se lisent comme les trois premières
 * lignes du tableau : on ne voit plus qu'elles sont à part, et l'on cherche
 * pourquoi le tri ne les touche pas. Une carte, elle, ne ressemble à rien
 * d'autre sur cet écran — c'est tout ce qu'on lui demande.
 */
export function renderSujetsEpinglesHtml({ sujets = [], deps = {} } = {}) {
  const epingles = (Array.isArray(sujets) ? sujets : []).filter(Boolean);
  if (epingles.length === 0) return "";

  const cartes = epingles.map((sujet) => renderCarteEpinglee(sujet, deps)).filter(Boolean);
  if (cartes.length === 0) return "";

  return `
    <section class="subjects-pinned" aria-label="Sujets épinglés"
      style="--subjects-pinned-colonnes:${colonnesDuBandeau(cartes.length)};">
      ${cartes.join("")}
    </section>
  `;
}

/**
 * Une carte du bandeau.
 *
 * Elle porte **ce qui sert à reconnaître le sujet et à y retourner** : son
 * état, son titre, son numéro. Pas ses labels, pas ses assignés, pas son
 * compteur de messages — une carte qui redirait tout du sujet serait une
 * seconde ligne de tableau, en plus encombrante.
 *
 * Le titre ouvre le sujet par le même bouton que le tableau : deux chemins vers
 * le même sujet devraient se comporter pareil, et ils le font parce que c'est
 * le même déclencheur (règle 10).
 */
function renderCarteEpinglee(sujet, deps = {}) {
  const {
    escapeHtml,
    svgIcon,
    issueIcon,
    getEffectiveSujetStatus,
    getEntityReviewMeta,
    getReviewTitleStateClass,
    getEntityDisplayRef,
    firstNonEmpty
  } = deps;

  const id = String(sujet?.id ?? "").trim();
  if (!id || typeof escapeHtml !== "function") return "";

  const etat = getEffectiveSujetStatus?.(id) ?? "open";
  const meta = getEntityReviewMeta?.("sujet", id) ?? {};
  const titre = firstNonEmpty?.(sujet?.title, id, "Non classé") ?? (sujet?.title || id);
  const reference = getEntityDisplayRef?.("sujet", sujet) ?? "";

  return `
    <article class="subject-pinned-card" data-sujet-id="${escapeHtml(id)}">
      <div class="subject-pinned-card__head">
        <span class="subject-pinned-card__status" aria-hidden="true">
          ${issueIcon?.(etat, { reviewState: meta.review_state, entityType: "sujet", isSeen: meta.is_seen }) ?? ""}
        </span>
        <button type="button"
          class="row-title-trigger js-row-title-trigger subject-pinned-card__title ${getReviewTitleStateClass?.("sujet", id) ?? ""}"
          data-row-entity-type="sujet" data-row-entity-id="${escapeHtml(id)}">${escapeHtml(titre)}</button>
      </div>
      <div class="subject-pinned-card__foot mono-small">
        <span class="subject-pinned-card__ref">${escapeHtml(reference)}</span>
        <button type="button" class="subject-pinned-card__unpin"
          data-subject-pin="${escapeHtml(id)}"
          title="Retirer des épinglés" aria-label="Retirer des épinglés">
          ${svgIcon?.("unpin", { className: "octicon" }) ?? ""}
        </button>
      </div>
    </article>
  `;
}

export function renderProjectSubjectsTable({ filteredSituations, deps }) {
  const {
    store,
    renderIssuesTable,
    getFilteredFlatSubjects,
    getSubjectsPaginationState,
    getCurrentSubjectsStatusFilter,
    getCurrentSubjectsPriorityFilter,
    sujetMatchesStatusFilter,
    sujetMatchesPriorityFilter
  } = deps;

  const allFilteredFlatSubjects = Array.isArray(getFilteredFlatSubjects?.()) ? getFilteredFlatSubjects() : [];
  const selectorPagination = typeof getSubjectsPaginationState === "function" ? getSubjectsPaginationState(allFilteredFlatSubjects.length) : null;
  const pagination = normalizePaginationState({
    totalItems: allFilteredFlatSubjects.length,
    pageSize: store?.projectSubjectsView?.pagination?.pageSize ?? selectorPagination?.pageSize,
    currentPage: store?.projectSubjectsView?.pagination?.currentPage ?? selectorPagination?.currentPage
  });
  const rawPayload = store.projectSubjectsView?.rawSubjectsResult && typeof store.projectSubjectsView.rawSubjectsResult === "object"
    ? store.projectSubjectsView.rawSubjectsResult
    : (store.projectSubjectsView?.rawResult && typeof store.projectSubjectsView.rawResult === "object"
      ? store.projectSubjectsView.rawResult
      : {});
  const rawSubjectsById = rawPayload?.subjectsById && typeof rawPayload.subjectsById === "object"
    ? rawPayload.subjectsById
    : {};
  const rawFlatSubjects = Object.values(rawSubjectsById);
  const activeStatusFilter = typeof getCurrentSubjectsStatusFilter === "function" ? getCurrentSubjectsStatusFilter() : "open";
  const activePriorityFilter = typeof getCurrentSubjectsPriorityFilter === "function" ? getCurrentSubjectsPriorityFilter() : "";
  const fallbackFlatSubjects = rawFlatSubjects.filter((subject) => {
    if (typeof sujetMatchesStatusFilter === "function" && !sujetMatchesStatusFilter(subject, activeStatusFilter)) return false;
    if (typeof sujetMatchesPriorityFilter === "function" && !sujetMatchesPriorityFilter(subject, activePriorityFilter)) return false;
    return true;
  });
  const pagedSubjects = paginateItems(allFilteredFlatSubjects, pagination);
  const flatSubjects = pagedSubjects.items.length ? pagedSubjects.items : fallbackFlatSubjects.slice(0, pagination.pageSize);
  const hasAnySubjects = !!Object.keys(rawSubjectsById).length || !!allFilteredFlatSubjects.length || !!fallbackFlatSubjects.length;
  const isLoading = !!store.projectSubjectsView?.loading;

  if (isLoading && !hasAnySubjects) {
    return renderIssuesTable({
      gridTemplate: getSituationsTableGridTemplate(),
      headHtml: renderSituationsTableHeadHtml({
        deps,
        columns: [
          { className: "cell cell-theme", html: deps.renderSubjectsStatusHeadHtml() },
          { className: "cell cell-messages-head", html: "" },
          { className: "cell cell-assignees-head", html: deps.renderSubjectsAssigneesHeadHtml?.() ?? "Assignés" }
        ]
      }),
      state: "loading",
      loadingTitle: "Chargement des sujets…",
      loadingDescription: "Récupération des sujets du projet en cours."
    });
  }

  if (!hasAnySubjects) return renderWelcomeHtml(deps);

  const rowDebugPreview = flatSubjects.slice(0, 3).map((subject) => ({
    id: subject?.id || "",
    title: subject?.title || "",
    priority: subject?.priority || "",
    status: subject?.status || "",
    parent_subject_id: subject?.parent_subject_id || null
  }));

  const rows = flatSubjects.map((sujet) => renderFlatSujetRow(sujet, "", { isSelectable: false, deps }));

  // **Pourquoi c'est vide.** « Aucun résultat pour les filtres actuels » ne dit
  // pas lequel des filtres a vidé la liste, ni s'il y avait quelque chose à
  // vider : on clique « Fermés », rien n'apparaît, et l'on conclut au défaut
  // alors que le projet n'a peut-être fermé aucun sujet. La phrase nomme le
  // filtre en cause et **combien il y en a de l'autre côté**.
  const dit = videDeLaListeDesSujets({
    statut: activeStatusFilter,
    priorite: activePriorityFilter,
    recherche: store?.projectSubjectsView?.search ?? store?.situationsView?.search ?? "",
    comptes: typeof deps.getSubjectsStatusCounts === "function" ? deps.getSubjectsStatusCounts("") : {},
    paginee: !!pagination?.enabled
  });
  const vide = { emptyTitle: dit.titre, emptyDescription: dit.explication };

  if (!rows.length) {
    return renderIssuesTable({
      gridTemplate: getSituationsTableGridTemplate(),
      headHtml: renderSituationsTableHeadHtml({
        deps,
        columns: [
          { className: "cell cell-theme", html: deps.renderSubjectsStatusHeadHtml() },
          { className: "cell cell-messages-head", html: "" },
          { className: "cell cell-assignees-head", html: deps.renderSubjectsAssigneesHeadHtml?.() ?? "Assignés" }
        ]
      }),
      ...vide
    });
  }

  const tableHtml = renderIssuesTable({
    gridTemplate: getSituationsTableGridTemplate(),
    headHtml: renderSituationsTableHeadHtml({
      deps,
      columns: [
        { className: "cell cell-theme", html: deps.renderSubjectsStatusHeadHtml() },
        { className: "cell cell-messages-head", html: "" },
        { className: "cell cell-assignees-head", html: deps.renderSubjectsAssigneesHeadHtml?.() ?? "Assignés" }
      ]
    }),
    rowsHtml: rows.join(""),
    ...vide
  });
  const paginationHtml = renderPaginationControls(pagination, { entity: "subjects" });
  return `${tableHtml}${paginationHtml}`;
}
