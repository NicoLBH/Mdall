import { escapeHtml } from "../../utils/escape-html.js";

export function renderSituationGridView(situation, subjects = []) {
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;
  const title = String(situation?.title || "Situation");

  return `
    <section class="project-situation-alt-view project-situation-alt-view--grid" aria-label="Vue grille">
      <div class="settings-empty-state">
        La vue grille de <strong>${escapeHtml(title)}</strong> sera affichée ici (${subjectCount} sujet(s)).
      </div>
    </section>
  `;
}
