/**
 * Résoudre les conflits : l'utilitaire qui met face à face ce qui ne s'accorde pas.
 *
 * **Pourquoi ici et non dans la Mémoire.** La Mémoire sert à *voir* ce que le
 * projet tient pour vrai — complètement, sans tri ni jugement. Exploiter cette
 * mémoire est le travail de l'Atelier : « Suivi des avis BC » manipule les avis
 * qu'elle contient, celui-ci en rapproche les contradictions. Mêler les deux
 * ferait passer un désaccord pour une connaissance de plus, et donnerait à un
 * écran de consultation un rôle d'arbitrage qu'il n'a pas.
 *
 * **Volontairement sommaire.** C'est un déplacement, pas un développement : on
 * reprend l'affichage tel qu'il était et rien de plus. Résoudre un conflit
 * depuis cet écran — choisir une valeur, corriger l'entrée d'une règle, marquer
 * un arbitrage — mérite un vrai utilitaire, et ce n'est pas le travail du jour.
 * Il détecte et il montre ; l'humain va corriger là où il faut.
 */

import { escapeHtml } from "../../../utils/escape-html.js";
import { svgIcon } from "../../../ui/icons.js";
import { registerProjectPrimaryScrollSource } from "../../project-shell-chrome.js";
import { resolveCurrentBackendProjectId } from "../../../services/project-supabase-sync.js";
import { CONFLIT, describeConflict, findConflicts, summarizeConflicts } from "../../../services/assertion-conflicts.js";

const state = { loading: false, error: "", assertions: null };

/**
 * Ce que le compte dit en tête.
 *
 * Chaque forme se compte à part : un total unique ferait croire à une seule pile
 * à traiter, alors qu'elles ne se résolvent pas de la même façon.
 */
function renderResume(conflits) {
  const resume = summarizeConflicts(conflits);
  const morceaux = [
    resume.ruleAgainstValue ? `${resume.ruleAgainstValue} règle(s) contre une valeur retenue` : "",
    resume.twoValues ? `${resume.twoValues} valeur(s) concurrente(s)` : "",
    resume.twoRules ? `${resume.twoRules} règle(s) en double` : ""
  ].filter(Boolean);

  return morceaux.length ? morceaux.join(" · ") : "";
}

function renderConflit(conflit) {
  const dit = describeConflict(conflit);
  const regle = conflit.type === CONFLIT.REGLE_ET_VALEUR || conflit.type === CONFLIT.DEUX_REGLES;

  return `
    <li class="memory-ecart${regle ? " memory-ecart--grave" : ""}">
      <span class="memory-ecart__label">${escapeHtml(dit.label)}</span>
      <p class="memory-ecart__sentence">${escapeHtml(dit.sentence)}</p>
      <p class="memory-ecart__ask">${escapeHtml(dit.ask)}</p>
    </li>
  `;
}

function renderCorps() {
  if (state.loading) return `<p class="gh-text-muted">Lecture de la mémoire…</p>`;

  if (state.error) {
    return `<p class="gh-text-muted" style="color:var(--danger);">${escapeHtml(state.error)}</p>`;
  }

  // `null` veut dire « je n'ai pas pu lire », `[]` veut dire « rien à
  // signaler ». Les dire de la même façon ferait passer une panne pour une
  // bonne nouvelle.
  if (state.assertions === null) {
    return `<p class="gh-text-muted">La mémoire n'a pas pu être lue. Ce n'est pas qu'elle est sans conflit : on ne sait pas.</p>`;
  }

  const conflits = findConflicts(state.assertions);
  if (conflits.length === 0) {
    return `
      <p class="gh-text-muted">
        Aucun conflit entre ce que la mémoire porte aujourd'hui. Seules les affirmations qui
        <strong>nomment leur sujet</strong> sont rapprochées : ce qu'une note de calcul retient
        n'entre pas encore, faute d'extraction — l'absence de conflit ne veut donc pas dire qu'il
        n'y en a pas.
      </p>
    `;
  }

  return `
    <p class="gh-text-muted">${escapeHtml(renderResume(conflits))}</p>
    <ul class="memory-ecarts__list">${conflits.map(renderConflit).join("")}</ul>
  `;
}

function render(root) {
  root.innerHTML = `
    <section class="settings-section is-active" data-solidity-tool-card="conflits">
      <div class="settings-card settings-card--param studio-tool-card">
        <div class="settings-card__head studio-tool-card__head">
          <div>
            <span class="settings-card__head-title">
              <h4>Résoudre les conflits</h4>
              <div class="studio-tool-card__actions">
                <button type="button" class="gh-btn" data-conflits-refresh ${state.loading ? "disabled" : ""}>
                  ${svgIcon("sync", { className: "octicon" })} Relire la mémoire
                </button>
              </div>
            </span>
          </div>
        </div>
        <div class="settings-card__body studio-tool-card__body">
          <p class="gh-text-muted">
            Mdall ne prononce pas de conformité : il repère que deux informations de la mémoire se
            contredisent, les met côte à côte, et vous laisse décider. Cet écran détecte et montre ;
            la correction se fait là où l'information a été posée.
          </p>
          ${renderCorps()}
        </div>
      </div>
    </section>
  `;

  root.querySelector("[data-conflits-refresh]")?.addEventListener("click", () => {
    void charger(root, { force: true });
  });
}

async function charger(root, { force = false } = {}) {
  if (state.loading) return;
  if (!force && state.assertions !== null) return;

  state.loading = true;
  state.error = "";
  render(root);

  try {
    const projectId = await resolveCurrentBackendProjectId();
    if (!projectId) throw new Error("Projet introuvable.");
    const { listProjectAssertions } = await import("../../../services/project-memory-supabase.js");
    state.assertions = await listProjectAssertions(projectId);
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    state.assertions = null;
  } finally {
    state.loading = false;
    render(root);
  }
}

export function renderResolutionConflits(root, { force = false } = {}) {
  if (!root) return;
  render(root);
  void charger(root, { force });
  registerProjectPrimaryScrollSource(
    root.closest("#projectStudioRouterScroll") || document.getElementById("projectStudioRouterScroll")
  );
}
