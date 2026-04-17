import { escapeHtml } from "../../utils/escape-html.js";

export function renderCommentComposer({
  title = "Add a comment",
  avatarHtml = "",
  previewMode = false,
  helpMode = false,
  textareaId = "humanCommentBox",
  previewId = "humanCommentPreview",
  textareaValue = "",
  placeholder = "",
  hintHtml = "",
  contextHtml = "",
  actionsHtml = ""
} = {}) {
  return `
    <div class="human-action comment-composer">
      <div class="gh-avatar gh-avatar--human comment-composer__avatar" aria-hidden="true">${avatarHtml}</div>

      <div class="comment-general-block comment-composer__main">
        <div class="gh-timeline-title mono comment-composer__title">${escapeHtml(title)}</div>

        <div class="comment-box gh-comment-boxwrap comment-composer__box ${helpMode ? "gh-comment-box--help" : ""}">
          ${contextHtml || ""}
          <div class="comment-tabs comment-composer__tabs ${helpMode ? "gh-comment-header--help" : ""}" role="tablist" aria-label="Comment tabs">
            <button class="comment-tab ${!previewMode ? "is-active" : ""}" data-action="tab-write" type="button">Write</button>
            <button class="comment-tab ${previewMode ? "is-active" : ""}" data-action="tab-preview" type="button">Preview</button>
          </div>

          <div class="comment-editor comment-composer__editor ${previewMode ? "hidden" : ""}">
            <textarea
              id="${escapeHtml(textareaId)}"
              class="textarea comment-composer__textarea"
              placeholder="${escapeHtml(placeholder)}"
            >${escapeHtml(textareaValue)}</textarea>
          </div>

          <div class="comment-editor comment-composer__preview-wrap ${previewMode ? "" : "hidden"}">
            <div class="comment-preview comment-composer__preview" id="${escapeHtml(previewId)}"></div>
          </div>
        </div>

        <div class="actions-row actions-row--details comment-composer__actions" style="margin-top:10px;">
          ${hintHtml || ""}
          <div class="actions-row__right comment-composer__actions-right" style="display:flex; align-items:center; gap:8px; justify-content:flex-end; flex:0 0 auto;">
            ${actionsHtml || ""}
          </div>
        </div>
      </div>
    </div>
  `;
}
