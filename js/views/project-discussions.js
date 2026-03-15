import { registerProjectPrimaryScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { svgIcon } from "../ui/icons.js";
import { escapeHtml } from "../utils/escape-html.js";

import {
  renderSideNavLayout,
  renderSideNavGroup,
  renderSideNavItem
} from "./ui/side-nav-layout.js";

import {
  renderDiscussionEmptyState,
  renderDiscussionList,
  renderDiscussionRow
} from "./ui/discussion-list.js";

import { renderCommentComposer } from "./ui/comment-composer.js";

import {
  renderMessageThread,
  renderMessageThreadActivity,
  renderMessageThreadComment,
  renderMessageThreadEvent
} from "./ui/message-thread.js";

import {
  bindGhActionButtons,
  bindGhSelectMenus,
  renderGhActionButton
} from "./ui/gh-split-button.js";

import {
  renderProjectTableToolbar,
  renderProjectTableToolbarGroup,
  renderProjectTableToolbarSearch,
  renderProjectTableToolbarSelect
} from "./ui/project-table-toolbar.js";

const CATEGORY_META = [
  { id: "all", label: "Voir toutes les discussions", icon: "💬", description: "Toutes catégories" },
  { id: "announcements", label: "Annonces", icon: "📣", description: "Informations générales" },
  { id: "general", label: "Général", icon: "💭", description: "Échanges transverses" },
  { id: "ideas", label: "Idées", icon: "💡", description: "Améliorations et pistes" },
  { id: "polls", label: "Sondages", icon: "🗳️", description: "Votes et arbitrages" },
  { id: "qa", label: "Q&A", icon: "🙏", description: "Questions / réponses" },
  { id: "show", label: "Show and tell", icon: "🙌", description: "Démonstrations et partages" }
];

const DISCUSSIONS = [
  {
    id: "d1",
    categoryId: "ideas",
    title: "Partage de nouvelles idées pour de nouvelles fonctionnalités",
    author: "NicoLBH",
    kind: "started",
    isOpen: true,
    closeReason: "",
    updatedAt: "2026-03-13T15:30:00",
    repliesCount: 0,
    timeline: [
      {
        type: "comment",
        author: "NicoLBH",
        authorType: "human",
        at: "2026-03-13T15:30:00",
        body: "Je propose d'utiliser cet espace pour les idées produit qui ne relèvent pas encore d'un sujet formel.\n\nPremière piste : relier plus facilement une discussion à un **sujet**, une **situation** ou un **avis**.",
        repliesCount: 0,
        roles: ["Maintainer", "Author"]
      },
      {
        type: "activity",
        text: "a lié cette discussion au sujet **PS-14 / Vérification des joints de fractionnement**",
        note: "Ce lien est illustratif pour la phase UI.",
        at: "2026-03-13T16:10:00"
      }
    ]
  },
  {
    id: "d2",
    categoryId: "announcements",
    title: "Annonces générales",
    author: "NicoLBH",
    kind: "announced",
    isOpen: true,
    closeReason: "",
    updatedAt: "2026-03-13T14:10:00",
    repliesCount: 0,
    timeline: [
      {
        type: "comment",
        author: "NicoLBH",
        authorType: "human",
        at: "2026-03-13T14:10:00",
        body: "Canal réservé aux informations projet utiles mais non normatives : disponibilité des livrables, changements de planning, rappels de coordination.",
        repliesCount: 0,
        roles: ["Maintainer", "Author"]
      }
    ]
  },
  {
    id: "d3",
    categoryId: "general",
    title: "Discussion générale sur le projet",
    author: "NicoLBH",
    kind: "started",
    isOpen: true,
    closeReason: "",
    updatedAt: "2026-03-13T13:00:00",
    repliesCount: 0,
    timeline: [
      {
        type: "comment",
        author: "NicoLBH",
        authorType: "human",
        at: "2026-03-13T13:00:00",
        body: "Espace libre pour les échanges transverses. Dès qu'un point devient structurant, on pourra le transformer en sujet.",
        repliesCount: 0,
        roles: ["Maintainer", "Author"]
      },
      {
        type: "event",
        label: "INFO",
        head: "Pont prévu vers Sujets / Avis / Situations",
        body: "Une discussion ne remplace pas un objet métier. L'interface permettra plus tard de convertir un échange en élément pilotable."
      }
    ]
  },
  {
    id: "d4",
    categoryId: "polls",
    title: "Choix du prochain lot pilote à industrialiser",
    author: "NicoLBH",
    kind: "started",
    isOpen: true,
    closeReason: "",
    updatedAt: "2026-03-15T09:00:00",
    repliesCount: 0,
    poll: {
      question: "Quel lot doit être prioritaire pour la prochaine itération ?",
      options: [
        "Structure",
        "Sécurité incendie",
        "Accessibilité",
        "Thermique"
      ]
    },
    timeline: [
      {
        type: "comment",
        author: "NicoLBH",
        authorType: "human",
        at: "2026-03-15T09:00:00",
        body: "Sondage de démonstration pour préparer l'interface des arbitrages collectifs. La logique de vote sera branchée plus tard.",
        repliesCount: 0,
        roles: ["Maintainer", "Author"]
      }
    ]
  }
];

const CLOSE_REASON_META = {
  resolved: {
    label: "Resolved",
    text: "Close as resolved",
    description: "The discussion has been resolved",
    icon: "discussion-closed"
  },
  outdated: {
    label: "Outdated",
    text: "Close as outdated",
    description: "The discussion is no longer relevant",
    icon: "discussion-outdated"
  },
  duplicate: {
    label: "Duplicate",
    text: "Close as duplicate",
    description: "The discussion is a duplicate of another",
    icon: "discussion-duplicate"
  }
};

const state = {
  selectedCategoryId: "all",
  selectedDiscussionId: "",
  search: "",
  sort: "latest",
  filter: "open",
  composerText: "",
  composerPreview: false,
  helpMode: false,
  closeMenuOpen: false
};

let discussionsCurrentRoot = null;
let discussionsTabResetBound = false;

function bindDiscussionsTabReset() {
  if (discussionsTabResetBound) return;
  discussionsTabResetBound = true;

  document.addEventListener("click", (event) => {
    const tabLink = event.target.closest?.('.project-tabs a[data-project-tab-id="discussions"]');
    if (!tabLink) return;

    const href = tabLink.getAttribute("href") || "";
    if (!href || href !== location.hash) return;
    if (!state.selectedDiscussionId) return;
    if (!discussionsCurrentRoot || !discussionsCurrentRoot.isConnected) return;

    event.preventDefault();

    state.selectedDiscussionId = "";
    state.closeMenuOpen = false;
    state.composerText = "";
    state.composerPreview = false;
    state.helpMode = false;

    renderProjectDiscussions(discussionsCurrentRoot, { preserveSelection: true });
  });
}

function mdToHtml(text) {
  const safe = escapeHtml(text || "");
  return safe
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

function fmtTs(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);

  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getCategoryMeta(categoryId) {
  return CATEGORY_META.find((item) => item.id === categoryId) || CATEGORY_META[0];
}

function getFilteredDiscussions() {
  const q = String(state.search || "").trim().toLowerCase();

  let items = DISCUSSIONS.filter((item) => {
    if (state.selectedCategoryId !== "all" && item.categoryId !== state.selectedCategoryId) return false;
    if (state.filter === "open" && !item.isOpen) return false;
    if (state.filter === "closed" && item.isOpen) return false;

    if (!q) return true;

    return [
      item.title,
      item.author,
      getCategoryMeta(item.categoryId).label,
      item.poll?.question || ""
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  items = items.slice().sort((a, b) => {
    if (state.sort === "oldest") return new Date(a.updatedAt) - new Date(b.updatedAt);
    if (state.sort === "title") return a.title.localeCompare(b.title, "fr");
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  return items;
}

function getSelectedDiscussion() {
  return DISCUSSIONS.find((item) => item.id === state.selectedDiscussionId) || null;
}

function renderCategoryIcon(icon) {
  return `<span class="project-discussions__emoji" aria-hidden="true">${escapeHtml(icon || "💬")}</span>`;
}

function renderLeftNav() {
  return renderSideNavGroup({
    title: "Catégories",
    items: CATEGORY_META.map((item) =>
      renderSideNavItem({
        label: item.label,
        targetId: item.id,
        iconHtml: renderCategoryIcon(item.icon),
        isActive: state.selectedCategoryId === item.id,
        isPrimary: item.id === "all"
      })
    )
  });
}

function renderListToolbar() {
  const leftHtml = renderProjectTableToolbarGroup({
    html: renderProjectTableToolbarSearch({
      id: "projectDiscussionsSearch",
      value: state.search,
      placeholder: "Rechercher une discussion…"
    })
  });

  const rightHtml = [
    renderProjectTableToolbarGroup({
      html: renderProjectTableToolbarSelect({
        id: "projectDiscussionsSort",
        value: state.sort,
        options: [
          { value: "latest", label: "Latest activity" },
          { value: "oldest", label: "Oldest" },
          { value: "title", label: "Title" }
        ]
      })
    }),
    renderProjectTableToolbarGroup({
      html: renderProjectTableToolbarSelect({
        id: "projectDiscussionsFilter",
        value: state.filter,
        options: [
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
          { value: "all", label: "All" }
        ]
      })
    }),
    renderProjectTableToolbarGroup({
      html: renderGhActionButton({
        id: "projectDiscussionsNew",
        label: "Nouvelle discussion",
        tone: "primary",
        mainAction: "new-discussion"
      })
    })
  ].join("");

  return renderProjectTableToolbar({
    leftHtml,
    rightHtml,
    className: "project-table-toolbar--discussions"
  });
}

function renderListView() {
  const category = getCategoryMeta(state.selectedCategoryId);
  const items = getFilteredDiscussions();

  if (!items.length) {
    return `
      <section class="project-discussions__panel">
        <div class="project-discussions__title-row">
          <h2 class="project-discussions__title">Discussions</h2>
        </div>

        ${renderListToolbar()}

        ${renderDiscussionEmptyState({
          title: "Aucune discussion correspondante.",
          description: state.selectedCategoryId === "all"
            ? "Crée une première discussion pour lancer les échanges du projet."
            : `Aucune discussion n'existe encore dans la catégorie ${category.label}.`,
          actionLabel: "Nouvelle discussion"
        })}
      </section>
    `;
  }

  return `
    <section class="project-discussions__panel">
      <div class="project-discussions__title-row">
        <h2 class="project-discussions__title">Discussions</h2>
      </div>

      ${renderListToolbar()}

      ${renderDiscussionList({
        rowsHtml: items.map((item) =>
          renderDiscussionRow({
            id: item.id,
            title: item.title,
            categoryLabel: getCategoryMeta(item.categoryId).label,
            categoryIcon: getCategoryMeta(item.categoryId).icon,
            author: item.author,
            kind: item.kind,
            updatedAtLabel: fmtTs(item.updatedAt),
            repliesCount: item.repliesCount,
            isSelected: false
          })
        ).join("")
      })}
    </section>
  `;
}

function renderPollModule(discussion) {
  if (discussion.categoryId !== "polls" || !discussion.poll) return "";

  return `
    <section class="project-discussions__poll-card">
      <div class="project-discussions__poll-head">
        <div class="project-discussions__poll-icon">${escapeHtml(getCategoryMeta("polls").icon)}</div>
        <div>
          <div class="project-discussions__poll-title">Poll question</div>
          <div class="project-discussions__poll-subtitle">Interface UI uniquement pour la phase 1</div>
        </div>
      </div>

      <div class="project-discussions__poll-question">
        ${escapeHtml(discussion.poll.question)}
      </div>

      <div class="project-discussions__poll-options">
        ${discussion.poll.options.map((option, idx) => `
          <label class="project-discussions__poll-option">
            <input type="radio" name="discussionPollOption" ${idx === 0 ? "checked" : ""} disabled>
            <span>${escapeHtml(option)}</span>
          </label>
        `).join("")}
      </div>

      <div class="project-discussions__poll-footer mono">
        Fonctionnalités de vote non développées à ce stade.
      </div>
    </section>
  `;
}

function renderCommentRoles(roles = []) {
  if (!Array.isArray(roles) || !roles.length) return "";
  return roles.map((role) => `
    <span class="project-discussions__role-pill mono">${escapeHtml(role)}</span>
  `).join("");
}

function renderReplyUi(item = {}) {
  return `
    <div class="project-discussions__reply-shell">
      <div class="project-discussions__reply-votes">
        <button type="button" class="project-discussions__vote-btn" disabled>
          ${svgIcon("arrow-up")}
          <span class="mono">1</span>
        </button>
      </div>

      <div class="project-discussions__reply-main">
        <div class="project-discussions__reply-input-wrap">
          <input
            class="project-discussions__reply-input"
            type="text"
            value=""
            placeholder="Write a reply"
            disabled
          >
        </div>
      </div>

      <div class="project-discussions__reply-count mono">
        ${escapeHtml(item.repliesCount ?? 0)} replies
      </div>
    </div>
  `;
}

function renderTimelineItem(item, idx) {
  if (item.type === "activity") {
    return renderMessageThreadActivity({
      idx,
      iconHtml: `<span class="project-discussions__timeline-icon">${svgIcon("comment-discussion")}</span>`,
      textHtml: mdToHtml(item.text || ""),
      noteHtml: item.note ? `<div class="tl-note">${mdToHtml(item.note)}</div>` : ""
    });
  }

  if (item.type === "event") {
    return renderMessageThreadEvent({
      idx,
      badgeHtml: `<div class="thread-badge"><span class="thread-badge__label mono">${escapeHtml(item.label || "INFO")}</span></div>`,
      headHtml: escapeHtml(item.head || ""),
      bodyHtml: mdToHtml(item.body || "")
    });
  }

  const rolesHtml = renderCommentRoles(item.roles || []);

  return renderMessageThreadComment({
    idx,
    author: item.author || "Utilisateur",
    tsHtml: `
      <div class="project-discussions__comment-meta-row">
        <span class="gh-comment-ts mono">${escapeHtml(fmtTs(item.at))}</span>
        ${rolesHtml}
      </div>
    `,
    bodyHtml: `
      <div class="project-discussions__comment-copy">${mdToHtml(item.body || "")}</div>
      ${renderReplyUi(item)}
    `,
    avatarHtml: item.authorType === "human"
      ? svgIcon("avatar-human", { width: 22, height: 22, className: "ui-icon ui-icon--block", style: "display:block" })
      : "",
    avatarType: item.authorType === "human" ? "human" : "agent",
    avatarInitial: item.authorType === "human" ? "M" : "R",
    boxClassName: "project-discussions__comment-box"
  });
}

function renderCloseMenu(discussion) {
  const isClosed = !discussion.isOpen;
  const selectedReason = discussion.closeReason && CLOSE_REASON_META[discussion.closeReason]
    ? CLOSE_REASON_META[discussion.closeReason]
    : null;

  const orderedKeys = ["resolved", "outdated", "duplicate"];

  const reopenItemHtml = `
    <button
      type="button"
      class="discussion-close-action__item discussion-close-action__item--reopen"
      data-discussion-reopen="true"
    >
      <span class="discussion-close-action__item-icon discussion-close-action__item-icon--reopen">
        ${svgIcon("comment-discussion")}
      </span>
      <span class="discussion-close-action__item-body">
        <span class="discussion-close-action__item-title">Rouvrir la discussion</span>
        <span class="discussion-close-action__item-desc">La discussion repasse à l’état ouvert</span>
      </span>
    </button>
  `;

  const itemsHtml = orderedKeys.map((key) => {
    const meta = CLOSE_REASON_META[key];
    if (!meta) return "";

    if (isClosed && discussion.closeReason === key) {
      return reopenItemHtml;
    }

    return `
      <button
        type="button"
        class="discussion-close-action__item ${discussion.closeReason === key && isClosed ? "is-selected" : ""}"
        data-discussion-close="${escapeHtml(key)}"
      >
        <span class="discussion-close-action__item-icon">
          ${svgIcon(meta.icon)}
        </span>
        <span class="discussion-close-action__item-body">
          <span class="discussion-close-action__item-title">${escapeHtml(meta.text)}</span>
          <span class="discussion-close-action__item-desc">${escapeHtml(meta.description)}</span>
        </span>
      </button>
    `;
  }).join("");

  return `
    <div class="discussion-close-action ${state.closeMenuOpen ? "is-open" : ""}">
      <button
        type="button"
        class="gh-btn discussion-close-action__main"
        data-discussion-action="toggle-close-menu"
      >
        ${svgIcon(selectedReason?.icon || "discussion-closed")}
        <span>${isClosed ? `Closed${selectedReason ? ` · ${selectedReason.label}` : ""}` : "Close discussion"}</span>
      </button>

      <button
        type="button"
        class="gh-btn discussion-close-action__toggle"
        data-discussion-action="toggle-close-menu"
        aria-expanded="${state.closeMenuOpen ? "true" : "false"}"
      >
        ${svgIcon("chevron-down")}
      </button>

      <div class="discussion-close-action__menu">
        ${itemsHtml}
      </div>
    </div>
  `;
}

function renderComposer(discussion) {
  const actionsHtml = `
    <div class="project-discussions__composer-actions">
      ${renderCloseMenu(discussion)}
      <button class="gh-btn gh-btn--primary project-discussions__comment-submit" data-discussion-action="submit-comment" type="button">
        Comment
      </button>
    </div>
  `;

  const hintHtml = `
    <div class="rapso-mention-hint comment-composer__hint">
      <span class="mono">Markdown is supported</span>
    </div>
  `;

  return renderCommentComposer({
    title: "Add a comment",
    avatarHtml: svgIcon("avatar-human", { width: 22, height: 22, className: "ui-icon ui-icon--block", style: "display:block" }),
    previewMode: state.composerPreview,
    helpMode: state.helpMode,
    textareaId: "projectDiscussionComposer",
    previewId: "projectDiscussionComposerPreview",
    textareaValue: state.composerText,
    placeholder: state.helpMode
      ? "Pose une question d'aide contextuelle sur cette discussion…"
      : "Add your comment here…",
    hintHtml,
    actionsHtml
  });
}

function renderDiscussionState(discussion) {
  if (discussion.isOpen) return "Open";
  if (discussion.closeReason && CLOSE_REASON_META[discussion.closeReason]) {
    return `Closed · ${CLOSE_REASON_META[discussion.closeReason].label}`;
  }
  return "Closed";
}

function renderDetailView() {
  const discussion = getSelectedDiscussion();
  if (!discussion) return renderListView();

  const category = getCategoryMeta(discussion.categoryId);
  const commentCount = discussion.timeline.filter((item) => item.type === "comment").length;

  return `
    <section class="project-discussions__detail project-discussions__detail--standalone">
      <div class="project-discussions__detail-head">
        <div class="project-discussions__detail-title-row">
          <div class="project-discussions__category-pill mono">${escapeHtml(category.icon)} ${escapeHtml(category.label)}</div>
          <div class="project-discussions__state-pill mono">${escapeHtml(renderDiscussionState(discussion))}</div>
        </div>

        <h2 class="project-discussions__detail-title">${escapeHtml(discussion.title)}</h2>

        <div class="project-discussions__detail-meta">
          ${escapeHtml(discussion.author)} ${escapeHtml(discussion.kind)} · ${escapeHtml(fmtTs(discussion.updatedAt))}
        </div>
      </div>

      ${renderPollModule(discussion)}

      <div class="project-discussions__comments-title">${commentCount} comment${commentCount > 1 ? "s" : ""}</div>

      ${renderMessageThread({
        className: "project-discussions__thread",
        itemsHtml: discussion.timeline.map((item, idx) => renderTimelineItem(item, idx)).join("")
      })}

      <div class="project-discussions__composer-wrap">
        ${renderComposer(discussion)}
      </div>
    </section>
  `;
}

function renderPage() {
  if (state.selectedDiscussionId) {
    return `
      <section class="project-discussions project-discussions--detail">
        <section class="project-discussions__scroll" id="projectDiscussionsScroll">
          ${renderDetailView()}
        </section>
      </section>
    `;
  }

  return renderSideNavLayout({
    className: "project-discussions side-nav-layout--discussions",
    navClassName: "project-discussions__nav",
    contentClassName: "project-discussions__content",
    navHtml: renderLeftNav(),
    contentHtml: `
      <section class="project-discussions__scroll" id="projectDiscussionsScroll">
        ${renderListView()}
      </section>
    `
  });
}

function syncHeader() {
  const host = document.getElementById("projectViewHeaderHost");
  if (!host) return;

  if (state.selectedDiscussionId) {
    host.innerHTML = "";
    return;
  }

  setProjectViewHeader({
    contextLabel: "Discussions",
    variant: "discussions",
    title: "",
    subtitle: "",
    toolbarHtml: ""
  });
}

function pushFakeHelpReply(text) {
  const discussion = getSelectedDiscussion();
  if (!discussion) return;

  discussion.timeline.push({
    type: "comment",
    author: "@rapso",
    authorType: "agent",
    at: new Date().toISOString(),
    body: `Mode help actif.\n\nQuestion reçue : **${text || "(vide)"}**\n\nDans cette phase, la réponse est simulée mais la zone de saisie, la preview et la timeline sont déjà mutualisées.`,
    repliesCount: 0,
    roles: ["Assistant"]
  });

  discussion.updatedAt = new Date().toISOString();
}

function pushFakeComment(text) {
  const discussion = getSelectedDiscussion();
  if (!discussion) return;

  discussion.timeline.push({
    type: "comment",
    author: "Mano",
    authorType: "human",
    at: new Date().toISOString(),
    body: text,
    repliesCount: 0,
    roles: ["Author"]
  });

  discussion.updatedAt = new Date().toISOString();
  discussion.repliesCount += 1;
}

function bindEvents(root) {
  bindGhActionButtons();

  bindGhSelectMenus(root, {
    onChange(selectId, value) {
      if (selectId === "projectDiscussionsSort") {
        state.sort = value;
        renderProjectDiscussions(root, { preserveSelection: true });
      }

      if (selectId === "projectDiscussionsFilter") {
        state.filter = value;
        renderProjectDiscussions(root, { preserveSelection: true });
      }
    }
  });

  root.querySelectorAll("[data-side-nav-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedCategoryId = btn.dataset.sideNavTarget || "all";
      state.selectedDiscussionId = "";
      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });

  root.querySelectorAll("[data-discussion-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedDiscussionId = row.dataset.discussionId || "";
      state.closeMenuOpen = false;
      renderProjectDiscussions(root, { preserveSelection: true });
    });

    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.selectedDiscussionId = row.dataset.discussionId || "";
        state.closeMenuOpen = false;
        renderProjectDiscussions(root, { preserveSelection: true });
      }
    });
  });

  root.querySelectorAll(".gh-action").forEach((el) => {
    el.addEventListener("ghaction:action", (event) => {
      const action = String(event.detail?.action || "");
      if (action === "new-discussion") {
        alert("Phase 1 UI : la création réelle sera branchée plus tard.");
      }
    });
  });

  root.querySelectorAll("[data-discussion-action='new-discussion']").forEach((btn) => {
    btn.addEventListener("click", () => {
      alert("Phase 1 UI : la création réelle sera branchée plus tard.");
    });
  });

  const searchInput = root.querySelector("#projectDiscussionsSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.search = event.target.value || "";
      renderProjectDiscussions(root, { preserveSelection: true });
    });
  }

  root.querySelectorAll("[data-action='tab-write']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.composerPreview = false;
      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });

  root.querySelectorAll("[data-action='tab-preview']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.composerPreview = true;
      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });

  root.querySelectorAll("[data-discussion-action='toggle-close-menu']").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.closeMenuOpen = !state.closeMenuOpen;
      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });

  root.querySelectorAll("[data-discussion-close]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const discussion = getSelectedDiscussion();
      if (!discussion) return;

      const reason = btn.dataset.discussionClose || "";
      if (!CLOSE_REASON_META[reason]) return;

      discussion.isOpen = false;
      discussion.closeReason = reason;
      state.closeMenuOpen = false;

      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });

  root.querySelectorAll("[data-discussion-reopen]").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const discussion = getSelectedDiscussion();
      if (!discussion) return;

      discussion.isOpen = true;
      state.closeMenuOpen = false;

      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });
  
  document.addEventListener("click", handleDocumentClickCloseMenu, { once: true });

  root.querySelectorAll("[data-discussion-action='toggle-help']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.helpMode = !state.helpMode;
      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });

  const textarea = root.querySelector("#projectDiscussionComposer");
  if (textarea) {
    textarea.addEventListener("input", (event) => {
      state.composerText = event.target.value || "";
      const preview = root.querySelector("#projectDiscussionComposerPreview");
      if (preview) preview.innerHTML = mdToHtml(state.composerText);
    });

    const preview = root.querySelector("#projectDiscussionComposerPreview");
    if (preview) preview.innerHTML = mdToHtml(state.composerText);
  }

  root.querySelectorAll("[data-discussion-action='submit-comment']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = String(state.composerText || "").trim();
      if (!text) return;

      if (state.helpMode || /^\s*(\/help|@help)\b/i.test(text)) {
        pushFakeHelpReply(text.replace(/^\s*(\/help|@help)\b\s*/i, ""));
      } else {
        pushFakeComment(text);
      }

      state.composerText = "";
      state.composerPreview = false;
      state.closeMenuOpen = false;
      renderProjectDiscussions(root, { preserveSelection: true });
    });
  });
}

function handleDocumentClickCloseMenu(event) {
  if (!event.target.closest(".discussion-close-action")) {
    state.closeMenuOpen = false;
  }
}

export function renderProjectDiscussions(root, { preserveSelection = false } = {}) {
  root.className = "project-shell__content";
  discussionsCurrentRoot = root;
  bindDiscussionsTabReset();

  if (!preserveSelection) {
    state.selectedDiscussionId = "";
    state.closeMenuOpen = false;
    state.composerText = "";
    state.composerPreview = false;
    state.helpMode = false;
  }

  syncHeader();
  root.innerHTML = renderPage();

  registerProjectPrimaryScrollSource(document.getElementById("projectDiscussionsScroll"));
  bindEvents(root);

  const preview = root.querySelector("#projectDiscussionComposerPreview");
  if (preview) preview.innerHTML = mdToHtml(state.composerText);
}
