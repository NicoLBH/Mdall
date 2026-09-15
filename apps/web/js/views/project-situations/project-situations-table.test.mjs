/**
 * Ce que la ligne d'une situation dit d'elle-même.
 *
 * Le rendu s'exécute ici pour de vrai : on lui donne une situation, on lit le
 * HTML qui sort. Un test qui se contenterait de chercher le nom d'une fonction
 * dans le fichier passerait sur une pastille jamais appelée.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSituationsTable } from "./project-situations-table.js";

function tableau() {
  return createProjectSituationsTable({
    store: { situationsView: { selectedSituationId: null } },
    uiState: {},
    getSituations: () => [],
    getPaginatedSituations: () => [],
    getSituationsPaginationState: () => null,
    normalizeSituationMode: (mode) => (mode === "automatic" ? "automatic" : "manual"),
    normalizeSituationStatus: (statut) => (statut === "closed" ? "closed" : "open"),
    renderSituationCount: () => "3",
    formatSituationUpdatedLabel: () => "hier",
    getCurrentSituationsStatusFilter: () => "open",
    getSituationsStatusCounts: () => ({ open: 1, closed: 0 })
  });
}

const SITUATION = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Ma semaine",
  status: "open",
  mode: "manual",
  updated_at: "2026-09-14T08:00:00Z"
};

/**
 * **Le cas normal ne se commente pas.** Une mention sur chacune des quinze
 * lignes ferait un bruit qu'on cesse de lire au bout de trois, et la seule qui
 * compte s'y noierait.
 */
test("une situation à moi ne porte aucune mention", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: "22222222-2222-4222-8222-222222222222" });

  assert.match(html, /Ma semaine/);
  assert.ok(!html.includes("cloisonnement"), "rien à signaler ne se signale pas");
  // Une seule pastille : celle du mode. Une pastille vide n'est pas « rien »,
  // c'est un rectangle gris dont personne ne saura quoi penser.
  assert.equal(html.match(/class="badge/g)?.length, 1, "aucune pastille en trop, même vide");
});

/**
 * **L'exception se dit.** Sans propriétaire, la base refuse la réécriture :
 * laisser la ligne muette ferait cliquer sur un geste qui échoue sans raison
 * visible, et l'on chercherait la panne dans le réseau.
 */
test("une situation d'avant le cloisonnement le dit, et dit quoi faire", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: null });

  assert.match(html, /créée avant le cloisonnement/);
  assert.match(html, /Reprenez-la/, "l'infobulle dit la suite, pas seulement l'empêchement");
  // La pastille des autres écrans, pas une largeur inventée pour l'occasion.
  assert.match(html, /class="badge"/);
  assert.equal(html.match(/class="badge/g)?.length, 2, "celle du mode, et celle-ci");
});
