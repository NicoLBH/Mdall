/**
 * L'onglet Mémoire : ce que le projet tient pour vrai.
 *
 * On disait « on compare le nouveau dépôt à la mémoire du projet » sans qu'un
 * écran puisse la montrer. Une mémoire qu'on ne peut pas consulter n'en est pas
 * une : personne ne peut vérifier ce qu'elle contient, ni corriger ce qu'elle a
 * retenu de travers, ni s'en servir pour décider.
 *
 * Ce que cet écran montre est **une liste d'affirmations**, pas une liste de
 * sujets. Un sujet est ce qu'un humain a décidé de suivre ; une affirmation est
 * un fait daté. C'est le partage de GitHub : tous les commits sont la mémoire,
 * seuls quelques-uns deviennent des issues.
 *
 * Trois gestes y vivent :
 *
 *  - **lire** : chercher, filtrer, et voir d'où vient chaque affirmation ;
 *  - **transmettre** : copier le dossier de contexte, qui est cette mémoire
 *    mise à plat, dans un ordre déterministe, avec ses dates et ses sources ;
 *  - **rattraper** : verser les propositions fusionnées avant que cette table
 *    n'existe. Leur procès-verbal a été conservé au gel — c'est précisément ce
 *    qui rend le rattrapage possible sans rien recalculer.
 */

import { escapeHtml } from "../utils/escape-html.js";
import { store } from "../store.js";
import { svgIcon } from "../ui/icons.js";
import { clearProjectActiveScrollSource, setProjectViewHeader } from "./project-shell-chrome.js";
import { PROJECT_TAB_RESELECTED_EVENT } from "./project-header.js";
import {
  MEMORY,
  buildContextExport,
  kindLabel,
  searchAssertions,
  summarizeMemory
} from "../services/project-memory.js";

const view = {
  loading: true,
  /** `null` : la lecture a échoué. `[]` : le projet n'a rien versé. */
  assertions: null,
  projectId: "",
  query: "",
  kind: "",
  status: "",
  includeSuperseded: false,
  notice: "",
  busy: false
};

let mountedRoot = null;
let tabResetBound = false;

function formatDate(value) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "date inconnue";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function nameOf(userId) {
  if (!userId) return "un collaborateur";
  return userId === store.user?.id ? "vous" : "un collaborateur";
}

/** Les compteurs : des comptes, jamais des estimations. */
function renderCounts(resume) {
  const cellule = (valeur, mot) => `<span class="memory-counts__item"><b>${valeur}</b> ${escapeHtml(mot)}</span>`;

  return `
    <div class="memory-counts">
      ${cellule(resume.current, resume.current > 1 ? "affirmations en vigueur" : "affirmation en vigueur")}
      ${cellule(resume.assumed, "assumée(s)")}
      ${cellule(resume.rejected, "écartée(s)")}
      ${cellule(resume.superseded, "remplacée(s)")}
    </div>
  `;
}

function renderFilters() {
  const option = (valeur, label, actuel) =>
    `<option value="${escapeHtml(valeur)}"${valeur === actuel ? " selected" : ""}>${escapeHtml(label)}</option>`;

  return `
    <div class="memory-filters">
      <input
        type="search"
        class="gh-input memory-filters__search"
        placeholder="Chercher dans la mémoire — un numéro d'avis, un mot du titre…"
        value="${escapeHtml(view.query)}"
        data-memory-search
      >
      <select class="gh-input memory-filters__select" data-memory-kind aria-label="Nature">
        ${option("", "Toutes natures", view.kind)}
        ${option("avis", "Avis", view.kind)}
        ${option("attachment", "Rattachements", view.kind)}
        ${option("document", "Documents", view.kind)}
      </select>
      <select class="gh-input memory-filters__select" data-memory-status aria-label="État">
        ${option("", "Assumées et écartées", view.status)}
        ${option(MEMORY.ASSUMED, "Assumées", view.status)}
        ${option(MEMORY.REJECTED, "Écartées", view.status)}
      </select>
      <label class="memory-filters__toggle">
        <input type="checkbox" data-memory-superseded ${view.includeSuperseded ? "checked" : ""}>
        <span>Montrer ce qui a été remplacé</span>
      </label>
    </div>
  `;
}

/**
 * Une affirmation, avec de quoi en répondre.
 *
 * La provenance n'est pas un ornement : une mémoire sans provenance est une
 * rumeur. La proposition qui l'a versée se cite comme partout ailleurs — `#P4`.
 */
function renderAssertion(assertion) {
  const remplacee = Boolean(assertion.superseded_by);
  const ecartee = assertion.status === MEMORY.REJECTED;

  return `
    <li class="memory-row${remplacee ? " memory-row--superseded" : ""}">
      <span class="memory-row__mark memory-row__mark--${ecartee ? "rejected" : "assumed"}">
        ${svgIcon(ecartee ? "x-circle-fill" : "check-circle-fill", { className: "octicon" })}
      </span>
      <div class="memory-row__body">
        <div class="memory-row__head">
          <span class="memory-row__key">${escapeHtml(assertion.subject_key)}</span>
          <span class="memory-row__statement">${escapeHtml(assertion.statement)}</span>
        </div>
        ${assertion.detail ? `<span class="memory-row__detail">${escapeHtml(assertion.detail)}</span>` : ""}
        <span class="memory-row__meta">
          ${escapeHtml(kindLabel(assertion.kind))}
          · ${escapeHtml(ecartee ? "écartée" : "assumée")} le ${escapeHtml(formatDate(assertion.decided_at))}
          par ${escapeHtml(nameOf(assertion.decided_by))}
          ${assertion.proposition_number ? `· <a href="#" class="md-proposition-link" data-memory-proposition="${escapeHtml(assertion.proposition_id ?? "")}">#P${Number(assertion.proposition_number)}</a>` : ""}
          ${remplacee ? `· <span class="memory-row__superseded">remplacée le ${escapeHtml(formatDate(assertion.superseded_at))}</span>` : ""}
        </span>
      </div>
    </li>
  `;
}

/**
 * La liste des affirmations.
 *
 * Exportée parce qu'elle se regarde ailleurs que dans l'application : sans
 * session, l'écran de connexion s'affiche et cet onglet reste inatteignable —
 * une page d'essai qui recopierait son HTML finirait par mentir sur ce qu'elle
 * montre.
 */
export function renderMemoryList(lignes) {
  if (lignes.length === 0) {
    return `
      <div class="propositions-empty">
        <b>Rien ne correspond</b>
        <p>Aucune affirmation ne répond à cette recherche. Ce qui a été remplacé est masqué par défaut.</p>
      </div>
    `;
  }

  return `<ul class="memory-list">${lignes.map(renderAssertion).join("")}</ul>`;
}

const renderList = renderMemoryList;

function renderContent(root) {
  if (view.loading) {
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--memory">
        <div class="propositions-shell">
          <div class="propositions-empty"><b>Lecture de la mémoire…</b></div>
        </div>
      </section>
    `;
    return;
  }

  // `null` ne se dit pas comme `[]`. « Le projet ne sait rien » et « je n'ai
  // pas pu lire » sont deux phrases différentes, et les confondre a déjà coûté
  // une soirée.
  if (view.assertions === null) {
    root.innerHTML = `
      <section class="project-simple-page project-simple-page--memory">
        <div class="propositions-shell">
          <div class="propositions-empty propositions-empty--warn">
            <b>La mémoire n'a pas pu être lue</b>
            <p>Ce n'est pas qu'elle est vide : la base n'a pas répondu. Rechargez la page pour réessayer.</p>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const resume = summarizeMemory(view.assertions);
  const lignes = searchAssertions(view.assertions, {
    query: view.query,
    kind: view.kind,
    status: view.status,
    includeSuperseded: view.includeSuperseded
  });

  root.innerHTML = `
    <section class="project-simple-page project-simple-page--memory">
      <div class="propositions-shell">
        <header class="memory-head">
          <div>
            <h2 class="memory-head__title">La mémoire du projet</h2>
            <p class="memory-head__lead">
              Ce que le projet tient pour vrai, avec la date à laquelle il l'a tranché et la proposition
              qui l'a versé. Les affirmations entrent par la fusion d'une proposition — elles ne s'écrivent
              pas à la main.
            </p>
          </div>
          <div class="memory-head__actions">
            <button type="button" class="gh-btn gh-btn--sm" data-memory-export ${
              resume.total === 0 || view.busy ? "disabled" : ""
            }>${svgIcon("copy", { className: "octicon" })} Copier le dossier de contexte</button>
            <button type="button" class="gh-btn gh-btn--sm" data-memory-backfill ${view.busy ? "disabled" : ""}>
              ${svgIcon("history", { className: "octicon" })} Verser les propositions fusionnées
            </button>
          </div>
        </header>

        ${view.notice ? `<div class="propositions-empty propositions-empty--warn"><p>${escapeHtml(view.notice)}</p></div>` : ""}

        ${renderCounts(resume)}
        ${renderFilters()}
        ${renderList(lignes)}
      </div>
    </section>
  `;

  bind(root);
}

function bind(root) {
  const recherche = root.querySelector("[data-memory-search]");
  if (recherche) {
    recherche.addEventListener("input", (event) => {
      view.query = event.target.value;
      // On redessine la liste seule : redessiner la page ferait perdre le
      // curseur à chaque touche.
      const hote = root.querySelector(".memory-list, .propositions-empty:not(.propositions-empty--warn)");
      const lignes = searchAssertions(view.assertions ?? [], {
        query: view.query,
        kind: view.kind,
        status: view.status,
        includeSuperseded: view.includeSuperseded
      });
      if (hote) hote.outerHTML = renderList(lignes);
    });
  }

  root.querySelector("[data-memory-kind]")?.addEventListener("change", (event) => {
    view.kind = event.target.value;
    renderContent(root);
  });

  root.querySelector("[data-memory-status]")?.addEventListener("change", (event) => {
    view.status = event.target.value;
    renderContent(root);
  });

  root.querySelector("[data-memory-superseded]")?.addEventListener("change", (event) => {
    view.includeSuperseded = event.target.checked;
    renderContent(root);
  });

  root.querySelector("[data-memory-export]")?.addEventListener("click", () => copyContext(root));
  root.querySelector("[data-memory-backfill]")?.addEventListener("click", () => backfill(root));

  for (const lien of root.querySelectorAll("[data-memory-proposition]")) {
    lien.addEventListener("click", (event) => {
      event.preventDefault();
      store.pendingPropositionId = lien.getAttribute("data-memory-proposition") || "";
      const projet = String(location.hash || "").split("/")[1] || "";
      location.hash = `#project/${projet}/propositions`;
    });
  }
}

/**
 * Copie le dossier de contexte.
 *
 * Ce qu'on copie est ce qu'on donnerait à un modèle : la mémoire à plat, dans
 * un ordre déterministe, avec ses dates et ses sources — y compris ce qui a été
 * remplacé, mis à part. Le taire ferait répondre comme si un document périmé
 * valait encore.
 */
async function copyContext(root) {
  const texte = buildContextExport({
    project: { name: store.projectForm?.name ?? "" },
    assertions: view.assertions ?? [],
    generatedAt: new Date().toISOString()
  });

  try {
    await navigator.clipboard.writeText(texte);
    view.notice = "Le dossier de contexte est dans le presse-papiers.";
  } catch {
    view.notice = "Le presse-papiers a refusé la copie. Le dossier n'a pas été copié.";
  }
  renderContent(root);
}

/**
 * Verse les propositions fusionnées avant que la mémoire n'existe.
 *
 * Rien n'est recalculé : on lit leur procès-verbal, celui qui a été écrit au
 * gel, et on le verse tel quel. Les dates sont celles des fusions, pas celle
 * d'aujourd'hui — dater une décision de six mois du jour où l'on rattrape
 * serait réécrire l'histoire pour se simplifier la vie.
 *
 * Le geste est rejouable : une proposition ne verse qu'une fois chaque
 * affirmation, la base s'en assure.
 */
async function backfill(root) {
  if (view.busy) return;
  view.busy = true;
  view.notice = "Versement des propositions fusionnées…";
  renderContent(root);

  try {
    const [propositions, memoire] = await Promise.all([
      import("../services/propositions-supabase.js"),
      import("../services/project-memory-supabase.js")
    ]);

    const toutes = (await propositions.listPropositions(view.projectId)) ?? [];
    const fusionnees = toutes
      .filter((entry) => entry.status === "merged")
      .sort((gauche, droite) => String(gauche.merged_at ?? "").localeCompare(String(droite.merged_at ?? "")));

    let versees = 0;
    let echecs = 0;

    for (const proposition of fusionnees) {
      const items = await propositions.listPropositionItems(proposition.id);
      const resultat = await memoire.rememberProposition({
        proposition,
        items: (items ?? []).map((row) => ({
          itemType: row.item_type,
          itemKey: row.item_key,
          payload: row.payload,
          status: row.status,
          reason: row.reason
        }))
      });
      if (!resultat) echecs += 1;
      else versees += resultat.written;
    }

    view.assertions = await memoire.listProjectAssertions(view.projectId);
    view.notice = echecs
      ? `${versees} affirmation(s) versée(s). ${echecs} proposition(s) n'ont pas pu l'être.`
      : versees > 0
        ? `${versees} affirmation(s) versée(s) depuis ${fusionnees.length} proposition(s) fusionnée(s).`
        : "Rien à rattraper : la mémoire portait déjà tout ce que les propositions fusionnées ont décidé.";
  } catch {
    view.notice = "Le rattrapage n'a pas abouti. La mémoire reste ce qu'elle était.";
  }

  view.busy = false;
  renderContent(root);
}

function bindTabReset() {
  if (tabResetBound) return;
  tabResetBound = true;

  window.addEventListener(PROJECT_TAB_RESELECTED_EVENT, (event) => {
    if (String(event?.detail?.tabId || "") !== "memoire") return;
    if (!mountedRoot?.isConnected) return;
    view.query = "";
    view.kind = "";
    view.status = "";
    view.includeSuperseded = false;
    view.notice = "";
    renderContent(mountedRoot);
  });
}

export function renderProjectMemory(root) {
  if (!root) return;
  root.className = "project-shell__content";
  clearProjectActiveScrollSource();
  mountedRoot = root;
  bindTabReset();

  setProjectViewHeader({ contextLabel: "Mémoire", variant: "memory" });

  view.loading = true;
  view.notice = "";
  renderContent(root);

  (async () => {
    try {
      const [{ resolveCurrentBackendProjectId }, memoire] = await Promise.all([
        import("../services/project-supabase-sync.js"),
        import("../services/project-memory-supabase.js")
      ]);

      // L'identifiant de route n'est pas celui de la base : les lire l'un pour
      // l'autre rend une liste vide sans erreur, ce qui est la pire des pannes.
      view.projectId = (await resolveCurrentBackendProjectId().catch(() => "")) || "";
      view.assertions = view.projectId ? await memoire.listProjectAssertions(view.projectId) : null;
    } catch {
      view.assertions = null;
    }

    view.loading = false;
    if (root.isConnected) renderContent(root);
  })();
}
