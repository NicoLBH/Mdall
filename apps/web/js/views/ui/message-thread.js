import { escapeHtml } from "../../utils/escape-html.js";

export function renderMessageAvatar({
  type = "agent",
  avatarHtml = "",
  initial = "R",
  className = ""
} = {}) {
  if (avatarHtml) {
    return `<div class="gh-avatar ${type === "human" ? "gh-avatar--human" : ""} ${className}" aria-hidden="true">${avatarHtml}</div>`;
  }

  return `
    <div class="gh-avatar ${type === "human" ? "gh-avatar--human" : ""} ${className}" aria-hidden="true">
      <span class="gh-avatar-initial">${escapeHtml(initial)}</span>
    </div>
  `;
}

export function renderMessageCard({
  author = "",
  tsHtml = "",
  bodyHtml = "",
  avatarHtml = "",
  avatarType = "agent",
  avatarInitial = "R",
  className = "",
  boxClassName = "",
  headerClassName = "",
  bodyClassName = "",
  headerRightHtml = ""
} = {}) {
  return `
    <div class="gh-comment ${className}">
      ${renderMessageAvatar({
        type: avatarType,
        avatarHtml,
        initial: avatarInitial
      })}
      <div class="gh-comment-box ${boxClassName}">
        <div class="gh-comment-header ${headerClassName}">
          <div class="gh-comment-header-main">
            <div class="gh-comment-author">${escapeHtml(author)}</div>
            ${tsHtml || ""}
          </div>
          ${headerRightHtml || ""}
        </div>
        <div class="gh-comment-body ${bodyClassName}">${bodyHtml}</div>
      </div>
    </div>
  `;
}

export function renderMessageThread({
  itemsHtml = "",
  className = ""
} = {}) {
  return `<div class="thread gh-thread message-thread ${className}">${itemsHtml}</div>`;
}

export function renderMessageThreadComment({
  idx = 0,
  author = "",
  tsHtml = "",
  bodyHtml = "",
  avatarHtml = "",
  avatarType = "agent",
  avatarInitial = "R",
  className = "",
  boxClassName = "",
  headerClassName = "",
  bodyClassName = "",
  headerRightHtml = ""
} = {}) {
  return `
    <div class="thread-item thread-item--comment thread-item--comment--flush message-thread__item ${className}" data-thread-kind="comment" data-thread-idx="${idx}">
      <div class="thread-wrapper">
        ${renderMessageCard({
          author,
          tsHtml,
          bodyHtml,
          avatarHtml,
          avatarType,
          avatarInitial,
          boxClassName,
          headerClassName,
          bodyClassName,
          headerRightHtml
        })}
      </div>
    </div>
  `;
}

export function renderMessageThreadActivity({
  idx = 0,
  iconHtml = "",
  authorIconHtml = "",
  textHtml = "",
  noteHtml = "",
  className = ""
} = {}) {
  return `
    <div class="thread-item thread-item--activity thread-item--comment--flush message-thread__item ${className}" data-thread-kind="activity" data-thread-idx="${idx}">
      <div class="thread-wrapper">
        <div class="tl-activity">
          ${iconHtml}
          ${authorIconHtml}
          <div class="tl-activity__text">${textHtml}</div>
        </div>
        ${noteHtml || ""}
      </div>
    </div>
  `;
}

export function renderMessageThreadEvent({
  idx = 0,
  badgeHtml = "",
  headHtml = "",
  bodyHtml = "",
  className = ""
} = {}) {
  return `
    <div class="thread-item message-thread__item ${className}" data-thread-kind="event" data-thread-idx="${idx}">
      ${badgeHtml}
      <div class="thread-wrapper">
        <div class="thread-item__head">${headHtml}</div>
        <div class="thread-item__body">${bodyHtml}</div>
      </div>
    </div>
  `;
}
