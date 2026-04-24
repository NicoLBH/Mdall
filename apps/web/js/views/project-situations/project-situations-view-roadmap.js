import { escapeHtml } from "../../utils/escape-html.js";

export function renderSituationRoadmapView(situation, subjects = []) {
  const subjectCount = Array.isArray(subjects) ? subjects.length : 0;
  const title = String(situation?.title || "Situation");

  return `
    <section class="project-situation-alt-view project-situation-alt-view--roadmap" aria-label="Vue trajectoire">
      <div class="settings-empty-state">
        La vue trajectoire de <strong>${escapeHtml(title)}</strong> sera affichée ici (${subjectCount} sujet(s)).
      </div>
    </section>
  `;
}
