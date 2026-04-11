import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";

export const SYSTEM_AUTHOR_NAME = "Mdall";

export function isSystemAuthor(value = "", agent = "") {
  const rawValue = String(value || "").trim().toLowerCase();
  const rawAgent = String(agent || "").trim().toLowerCase();
  return rawValue === "system" || rawAgent === "system";
}

export function getDisplayAuthorName(value = "", options = {}) {
  const fallback = String(options.fallback || "").trim();
  const agent = String(options.agent || "").trim();
  const rawValue = String(value || fallback || "").trim();
  if (isSystemAuthor(rawValue, agent)) return SYSTEM_AUTHOR_NAME;
  if (rawValue) return rawValue;
  if (String(agent || "").trim().toLowerCase() === "human") return "Human";
  return fallback || "System";
}

export function renderAvatarImage(src = "", options = {}) {
  const className = String(options.className || "gh-avatar__img").trim();
  const alt = String(options.alt || "");
  const loading = options.loading === false ? "" : ' loading="lazy"';
  const normalizedSrc = String(src || "").trim();
  if (!normalizedSrc) return "";
  return `<img src="${escapeHtml(normalizedSrc)}" alt="${escapeHtml(alt)}" class="${escapeHtml(className)}"${loading}>`;
}

export function renderSystemAvatar(options = {}) {
  const className = String(options.className || "gh-avatar__system-icon").trim();
  const iconClassName = String(options.iconClassName || "").trim();
  return `<span class="${escapeHtml(className)}" aria-hidden="true">${svgIcon("heimdall", { className: iconClassName, title: SYSTEM_AUTHOR_NAME })}</span>`;
}

export function getAuthorIdentity(options = {}) {
  const author = String(options.author || "").trim();
  const agent = String(options.agent || "").trim().toLowerCase();
  const avatarUrl = String(options.avatarUrl || "").trim();
  const currentUserAvatar = String(options.currentUserAvatar || "").trim();
  const humanAvatarHtml = String(options.humanAvatarHtml || "");
  const fallbackName = String(options.fallbackName || "System").trim() || "System";
  const displayName = getDisplayAuthorName(author, { agent, fallback: fallbackName });
  const isSystem = isSystemAuthor(author, agent);
  const isHuman = !isSystem && (agent === "human" || String(displayName).trim().toLowerCase() === "human");

  if (isSystem) {
    return {
      displayName,
      avatarType: "agent",
      avatarHtml: renderSystemAvatar(options.systemAvatarOptions || {}),
      avatarInitial: "M",
      isSystem,
      isHuman
    };
  }

  if (isHuman) {
    if (currentUserAvatar) {
      return {
        displayName,
        avatarType: "human",
        avatarHtml: renderAvatarImage(currentUserAvatar, options.humanAvatarImageOptions || {}),
        avatarInitial: "H",
        isSystem,
        isHuman
      };
    }

    return {
      displayName,
      avatarType: "human",
      avatarHtml: humanAvatarHtml,
      avatarInitial: "H",
      isSystem,
      isHuman
    };
  }

  if (avatarUrl) {
    return {
      displayName,
      avatarType: "agent",
      avatarHtml: renderAvatarImage(avatarUrl, options.avatarImageOptions || {}),
      avatarInitial: String(displayName || fallbackName || "A").trim().charAt(0).toUpperCase() || "A",
      isSystem,
      isHuman
    };
  }

  const initials = String(displayName || fallbackName || "A")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";

  return {
    displayName,
    avatarType: "agent",
    avatarHtml: "",
    avatarInitial: initials,
    isSystem,
    isHuman
  };
}
