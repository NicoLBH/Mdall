const ICON_SPRITE_URL = "assets/icons.svg";

function escapeAttr(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export function svgIcon(name, {
  className = "",
  width = 16,
  height = 16,
  ariaHidden = true,
  focusable = false,
  title = "",
  style = ""
} = {}) {
  const safeName = escapeAttr(name);
  const classes = ["ui-icon", className].filter(Boolean).join(" ");
  const labelled = title ? ` aria-label="${escapeAttr(title)}"` : "";
  const hidden = ariaHidden && !title ? ` aria-hidden="true"` : "";
  const focusableAttr = ` focusable="${focusable ? "true" : "false"}"`;
  const styleAttr = style ? ` style="${escapeAttr(style)}"` : "";
  const titleNode = title ? `<title>${escapeAttr(title)}</title>` : "";

  return `
    <svg
      class="${classes}"
      viewBox="0 0 ${width} ${height}"
      width="${width}"
      height="${height}"
      fill="currentColor"
      overflow="visible"
      ${hidden}${labelled}${focusableAttr}${styleAttr}
    >
      ${titleNode}
      <use href="${ICON_SPRITE_URL}#${safeName}" xlink:href="${ICON_SPRITE_URL}#${safeName}"></use>
    </svg>
  `.replace(/\s+/g, " ").trim();
}
