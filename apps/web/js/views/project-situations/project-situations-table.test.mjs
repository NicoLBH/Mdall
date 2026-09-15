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

/**
 * Le tableau, tel qu'il est monté sur l'écran d'un projet.
 *
 * `projectScopeId` dit lequel des deux écrans on regarde : posé, c'est la liste
 * d'un projet ; nul, c'est le carnet, qui n'est la liste d'aucun. Le laisser
 * nul par défaut ici ferait passer chaque test pour un test du carnet.
 */
function tableau({ projectScopeId = "projet-courant", nomsDesProjets = {}, avancements = {} } = {}) {
  return createProjectSituationsTable({
    store: { situationsView: { selectedSituationId: null, projectScopeId, nomsDesProjets } },
    uiState: { avancementParSituationId: avancements },
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

/* ── Ce que la situation regarde ─────────────────────────────────────────── */

const BERTRAND = "aaaaaaaa-1111-4111-8111-111111111111";
const NOVACLIM = "bbbbbbbb-2222-4222-8222-222222222222";

/**
 * **Sur l'écran d'un projet, regarder ce projet est la règle.** Nommer le
 * chantier sur chacune des quinze lignes ferait un bruit qu'on cesse de lire au
 * bout de trois, et la seule qui compte — celle qui en regarde quatre — s'y
 * noierait.
 */
test("une situation qui ne regarde que ce projet ne le dit pas", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "projet", projets: [BERTRAND] }
  });

  assert.ok(!html.includes("projet"), "rien à signaler ne se signale pas");
  assert.equal(html.match(/class="badge/g)?.length, 1, "celle du mode, et rien d'autre");
});

/** Une situation qui en regarde plusieurs se distingue au premier coup d'œil. */
test("une situation qui traverse les projets le dit", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "choisis", projets: [BERTRAND, NOVACLIM] }
  });

  assert.match(html, /2 projets/);
  assert.equal(html.match(/class="badge/g)?.length, 2);
});

/**
 * **« Tous » ne liste rien, et ce n'est pas « aucun ».** Un écran qui compterait
 * la liste n'afficherait rien sur la situation qui regarde le plus large — la
 * seule qu'il fallait montrer (règle 5).
 */
test("tout mon travail se voit, bien qu'il ne nomme aucun projet", () => {
  const html = tableau().renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "tous" }
  });

  assert.match(html, /Tous mes projets/);
});

/** Une situation d'avant l'étape 2 n'a pas de périmètre : elle regarde le sien. */
test("sans périmètre écrit, rien de nouveau ne s'affiche", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND, project_id: BERTRAND });

  assert.equal(html.match(/class="badge/g)?.length, 1);
});

/* ── Le même tableau, monté dans le carnet ───────────────────────────────── */

/**
 * **Dans le carnet, rien n'est acquis.** Les situations viennent de partout, et
 * une ligne qui ne nomme pas son chantier oblige à l'ouvrir pour savoir de quoi
 * elle parle. Ce que l'écran d'un projet tait par évidence, celui-ci le dit.
 */
test("dans le carnet, une situation nomme son chantier", () => {
  const html = tableau({
    projectScopeId: null,
    nomsDesProjets: { [BERTRAND]: "Résidence Bertrand" }
  }).renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "projet", projets: [BERTRAND] }
  });

  assert.match(html, /Résidence Bertrand/);
});

/** Et sur l'écran d'un projet, la même situation ne dit toujours rien. */
test("la même ligne se tait sur l'écran de son projet", () => {
  const html = tableau({ nomsDesProjets: { [BERTRAND]: "Résidence Bertrand" } }).renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "projet", projets: [BERTRAND] }
  });

  assert.ok(!html.includes("Résidence Bertrand"));
  assert.equal(html.match(/class="badge/g)?.length, 1);
});

/**
 * Un chantier qu'on ne sait pas nommer se dit — mais seulement quand on a
 * cherché. Un carnet dont les noms n'ont pas été chargés compte, il n'accuse
 * pas la base d'avoir perdu un chantier.
 */
test("dans le carnet sans les noms, on compte plutôt que d'accuser", () => {
  const html = tableau({ projectScopeId: null }).renderSituationTitleCell({
    ...SITUATION,
    owner_id: BERTRAND,
    perimetre: { portee: "choisis", projets: [BERTRAND, NOVACLIM] }
  });

  assert.match(html, /2 projets/);
  assert.ok(!html.includes("introuvable"));
});

/* ── Où en est la situation ──────────────────────────────────────────────── */

test("l'avancement se lit sur la ligne, et se détaille au survol", () => {
  const html = tableau({
    avancements: { [SITUATION.id]: { total: 4, clos: 1, pourcentage: 25 } }
  }).renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND });

  assert.match(html, /25 %/);
  assert.match(html, /1 sujet clos sur 4/);
});

/**
 * **Ne pas savoir n'est pas zéro.** Une situation dont les sujets n'ont pas pu
 * être lus n'est pas à 0 % : « 0 % » se lirait comme « rien n'a avancé », et
 * l'on irait chercher pourquoi le chantier dort (règle 5).
 */
test("une situation dont on ignore l'avancement n'affiche pas « 0 % »", () => {
  const html = tableau().renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND });

  assert.ok(!html.includes("%"), "rien plutôt qu'un chiffre inventé");
  assert.equal(html.match(/class="badge/g)?.length, 1, "seule la pastille du mode");
});

/** Et une situation vide ne met pas un pourcentage sur zéro sujet. */
test("une situation vide ne porte pas de pourcentage", () => {
  const html = tableau({
    avancements: { [SITUATION.id]: { total: 0, clos: 0, pourcentage: 0 } }
  }).renderSituationTitleCell({ ...SITUATION, owner_id: BERTRAND });

  assert.ok(!html.includes("%"));
});
