import { store } from "../store.js";

export function renderProjectSituations(root) {
  const state = store.situationsView;
  root.innerHTML = `
    <div class="situations-view">
      <div class="situations-toolbar">
        <input
          id="situationsSearch"
          type="text"
          placeholder="Recherche..."
          value="${state.search}"
        />
        <select id="verdictFilter">
          <option value="ALL">Tous</option>
          <option value="OK">OK</option>
          <option value="KO">KO</option>
          <option value="WARNING">Warning</option>
        </select>
      </div>
      <div id="situationsTable"></div>
    </div>
  `;
  renderSituationsTable();
  bindEvents();
}

function renderSituationsTable() {
  const container = document.getElementById("situationsTable");
  const data = store.situationsView.data || [];
  if (!container) return;
  let html = `
    <table class="situations-table">
      <thead>
        <tr>
          <th>Situation</th>
          <th>Sujet</th>
          <th>Avis</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(situation => {
    html += renderSituationRow(situation);
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}

function renderSituationRow(situation) {
  let html = `
    <tr class="row-situation">
      <td colspan="4">
        <strong>${situation.title || situation.id}</strong>
      </td>
    </tr>
  `;
  if (!situation.sujets) return html;
  situation.sujets.forEach(sujet => {
    html += renderSujetRow(sujet);
  });
  return html;
}


function renderSujetRow(sujet) {
  let html = `
    <tr class="row-sujet">
      <td></td>
      <td colspan="3">
        ${sujet.title || sujet.id}
      </td>
    </tr>
  `;
  if (!sujet.avis) return html;
  sujet.avis.forEach(avis => {
    html += renderAvisRow(avis);
  });
  return html;
}

function renderAvisRow(avis) {
  return `
    <tr class="row-avis">
      <td></td>
      <td></td>
      <td>
        ${avis.title || avis.id}
      </td>
      <td>
        ${avis.verdict || "-"}
      </td>
    </tr>
  `;
}

function bindEvents() {
  const search = document.getElementById("situationsSearch");
  if (search) {
    search.addEventListener("input", e => {
      store.situationsView.search = e.target.value;
      renderSituationsTable();
    });
  }
}
