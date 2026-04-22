import { escapeHtml } from "../../utils/escape-html.js";

export function renderSubjectMarkdownToolbar({
  buttonAction = "composer-format",
  svgIcon,
  extraData = {}
} = {}) {
  const toolbarButtons = [
    { action: "heading", icon: "markdown-heading", label: "Titre (H3)" },
    { action: "bold", icon: "markdown-bold", label: "Gras" },
    { action: "italic", icon: "markdown-italic", label: "Italique" },
    { action: "underline", icon: "markdown-underline", label: "Souligné" },
    { action: "quote", icon: "markdown-quote", label: "Citation" },
    { action: "code", icon: "markdown-code", label: "Code" },
    { action: "link", icon: "markdown-link", label: "Lien" },
    { action: "ordered-list", icon: "markdown-list-ordered", label: "Liste numérotée" },
    { action: "bullet-list", icon: "markdown-list-unordered", label: "Liste à puces" },
    { action: "checklist", icon: "markdown-tasklist", label: "Checklist" },
    { action: "mention", icon: "markdown-mention", label: "Mention" },
    { action: "subject-ref", icon: "cross-reference", label: "Référence sujet" }
  ];

  const toDataAttributeName = (key) => String(key || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
  const extraAttributes = Object.entries(extraData)
    .map(([key, value]) => `data-${escapeHtml(toDataAttributeName(key))}="${escapeHtml(String(value || ""))}"`)
    .join(" ");
  const renderToolbarButton = (button = {}) => `
    <button
      class="comment-toolbar-btn"
      type="button"
      data-action="${escapeHtml(buttonAction)}"
      data-format="${escapeHtml(button.action)}"
      ${extraAttributes}
      title="${escapeHtml(button.label)}"
      aria-label="${escapeHtml(button.label)}"
    >
      ${svgIcon(button.icon)}
    </button>
  `;

  const shouldUseComposerLayout = buttonAction === "composer-format"
    || buttonAction === "thread-reply-format"
    || buttonAction === "thread-edit-format"
    || buttonAction === "description-format"
    || buttonAction === "create-subject-format";
  if (!shouldUseComposerLayout) {
    return toolbarButtons.map((button) => renderToolbarButton(button)).join("");
  }

  const attachmentAction = buttonAction === "thread-edit-format"
    ? "thread-edit-attachments-pick"
    : buttonAction === "thread-reply-format"
      ? "thread-reply-attachments-pick"
      : buttonAction === "description-format"
        ? "description-attachments-pick"
      : buttonAction === "create-subject-format"
        ? "create-subject-attachments-pick"
        : "composer-attachments-pick";
  const attachmentButton = `
    <button
      class="comment-toolbar-btn"
      type="button"
      data-action="${escapeHtml(attachmentAction)}"
      ${extraAttributes}
      title="Pièce jointe"
      aria-label="Pièce jointe"
    >
      ${svgIcon("paperclip")}
    </button>
  `;

  const groupOne = ["heading", "bold", "italic", "underline", "quote", "code", "link"];
  const groupTwo = ["ordered-list", "bullet-list", "checklist"];
  const mentionButton = toolbarButtons.find((button) => button.action === "mention");
  const subjectRefButton = toolbarButtons.find((button) => button.action === "subject-ref");
  const renderGroup = (actions = []) => actions
    .map((action) => toolbarButtons.find((button) => button.action === action))
    .filter(Boolean)
    .map((button) => renderToolbarButton(button))
    .join("");

  return `
    <div class="comment-toolbar-layout">
      <div class="comment-toolbar-layout__group">${renderGroup(groupOne)}</div>
      <div class="comment-toolbar-layout__group">${renderGroup(groupTwo)}</div>
      <div class="comment-toolbar-layout__group">${attachmentButton}${mentionButton ? renderToolbarButton(mentionButton) : ""}${subjectRefButton ? renderToolbarButton(subjectRefButton) : ""}</div>
    </div>
  `;
}
