/* RAPSOBOT – project-situations view
   Version restaurée compatible avec l'ancien CSS (archive/app.js)
*/

import { store } from "../store.js";

let selectedItem = null;

export function renderProjectSituations(root) {

root.innerHTML = `
<div class="gh-layout">

<div class="gh-panel">

<div class="issues-table">

<div class="issues-table__head">
<div class="cell cell-theme">Thème</div>
<div class="cell cell-verdict">Verdict</div>
<div class="cell cell-prio">Prio</div>
<div class="cell cell-agent">Agent</div>
<div class="cell cell-id">avis_id</div>
</div>

<div id="situationsBody" class="issues-table__body"></div>

</div>

</div>

<div class="gh-splitter" id="rightSplitter"></div>

<aside class="gh-panel gh-panel--details">

<div class="details-title-wrap">

<div class="details-title-row">

<div class="details-title-maincol">

<div class="details-title-topline">
<span class="details-title-text">Détail</span>
</div>

</div>

<div class="details-title-actions">
<button id="detailsExpand" class="icon-btn icon-btn--sm">⤢</button>
</div>

</div>

</div>

<div id="detailsBody"></div>

</aside>

</div>
`;

initSplitter();

rerenderTable();
function rerenderTable(){

const store = getStore();
const body = document.getElementById("situationsBody");

body.innerHTML = "";

store.situations.forEach(situation=>{

body.appendChild(renderSituationRow(situation));

if(situation.open){

situation.sujets.forEach(sujet=>{

body.appendChild(renderSujetRow(sujet));

if(sujet.open){

sujet.avis.forEach(avis=>{
body.appendChild(renderAvisRow(avis));
});

}

});

}

});

}

function renderSituationRow(s){

const row = document.createElement("div");

row.className =
"issue-row issue-row--sit click lvl0" +
(selectedItem?.id === s.id ? " subissue-row--selected":"");

row.innerHTML = `
<div class="cell cell-theme lvl0">
<span class="chev">${s.open ? "▾":"▸"}</span>
<span class="theme-text theme-text--sit">${s.title}</span>
</div>

<div class="cell cell-verdict">${s.verdict||""}</div>
<div class="cell cell-prio">${s.prio||""}</div>
<div class="cell cell-agent mono-small">${s.agent||""}</div>
<div class="cell cell-id mono">${s.id||""}</div>
`;

row.onclick = ()=>{

s.open = !s.open;

selectItem(s);

rerenderTable();

};

return row;

}
function renderSujetRow(pb){

const row = document.createElement("div");

row.className =
"issue-row issue-row--pb click lvl1" +
(selectedItem?.id === pb.id ? " subissue-row--selected":"");

row.innerHTML = `
<div class="cell cell-theme lvl1">
<span class="chev">${pb.open ? "▾":"▸"}</span>
<span class="theme-text theme-text--pb">${pb.title}</span>
</div>

<div class="cell cell-verdict"></div>
<div class="cell cell-prio">${pb.prio||""}</div>
<div class="cell cell-agent mono-small">${pb.agent||""}</div>
<div class="cell cell-id mono">${pb.id||""}</div>
`;

row.onclick = ()=>{

pb.open = !pb.open;

selectItem(pb);

rerenderTable();

};

return row;

}

function renderAvisRow(a){

const row = document.createElement("div");

row.className =
"issue-row issue-row--avis click lvl2" +
(selectedItem?.id === a.id ? " subissue-row--selected":"");

row.innerHTML = `
<div class="cell cell-theme lvl2">
<span class="chev chev--spacer"></span>
<span class="theme-text theme-text--avis">${a.title}</span>
</div>

<div class="cell cell-verdict">${a.verdict||""}</div>
<div class="cell cell-prio">${a.prio||""}</div>
<div class="cell cell-agent mono-small">${a.agent||""}</div>
<div class="cell cell-id mono">${a.id||""}</div>
`;

row.onclick = ()=>{

selectItem(a);

};

return row;

}

}
function selectItem(item){

selectedItem = item;

renderDetails(item);

}

function renderDetails(item){

const body = document.getElementById("detailsBody");

body.innerHTML = `
<div class="details-grid">

<div class="details-main">

<div class="gh-comment">

<div class="gh-avatar">
<div class="gh-avatar-initial">S</div>
</div>

<div class="gh-comment-box">

<div class="gh-comment-header">
<span class="gh-comment-author">${item.agent || "system"}</span>
</div>

<div class="gh-comment-body">
${item.description || ""}
</div>

</div>

</div>

</div>

<div class="details-meta-col">

<div class="meta-title">Meta</div>

<div class="meta-item">
<span class="meta-k">ID</span>
<span class="meta-v mono">${item.id || ""}</span>
</div>

<div class="meta-item">
<span class="meta-k">Agent</span>
<span class="meta-v">${item.agent || ""}</span>
</div>

<div class="meta-item">
<span class="meta-k">Verdict</span>
<span class="meta-v">${item.verdict || ""}</span>
</div>

</div>

</div>
`;

}

function initSplitter(){

const splitter = document.getElementById("rightSplitter");

let startX;
let startWidth;

splitter.onmousedown = e=>{

startX = e.clientX;

startWidth =
document.querySelector(".gh-panel--details").offsetWidth;

document.onmousemove = drag;

document.onmouseup = stop;

};

function drag(e){

const dx = startX - e.clientX;

document.documentElement.style.setProperty(
"--rightW",
(startWidth + dx)+"px"
);

}

function stop(){

document.onmousemove = null;
document.onmouseup = null;

}

}
