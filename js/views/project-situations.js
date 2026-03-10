export function renderProjectSituations(root) {

root.innerHTML = `
<div class="situations-page">

<div class="issues-toolbar">

<select id="verdictFilter">
<option value="all">Tous</option>
<option value="ok">OK</option>
<option value="warn">Attention</option>
<option value="ko">Non conforme</option>
</select>

<input id="searchBox" placeholder="Rechercher une situation">

</div>

<div class="issues-summary" id="issuesTotals"></div>

<table class="issues-table">

<thead>
<tr>
<th>ID</th>
<th>Situation</th>
<th>Sujet</th>
<th>Avis</th>
<th>Verdict</th>
</tr>
</thead>

<tbody id="issuesTable"></tbody>

</table>

<div class="issue-details">

<h3 id="detailsTitle"></h3>

<div id="detailsMeta"></div>

<button id="detailsExpand">Afficher tout</button>

<div id="detailsBody"></div>

</div>

</div>
`;
}
