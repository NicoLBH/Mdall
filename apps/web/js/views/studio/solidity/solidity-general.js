export function renderSolidityGeneral(root) {
  if (!root) return;
  root.innerHTML = `
    <section class="arkolia-identity-preview arkolia-assise-card">
      <header class="arkolia-identity-preview__header">
        <h3 class="arkolia-identity-preview__title">Neige, Vent & Gel</h3>
      </header>
      <div class="arkolia-identity-preview__body">
        <p class="gh-text-muted">Cet écran est remplacé par les outils distincts Neige, Vent et Gel.</p>
      </div>
    </section>
  `;
}
