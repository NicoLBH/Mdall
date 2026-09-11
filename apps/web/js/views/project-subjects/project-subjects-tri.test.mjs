import test from "node:test";
import assert from "node:assert/strict";

import { createProjectSubjectsSelectors } from "./project-subjects-selectors.js";
import { TRI } from "../../services/tri-des-sujets.js";

/**
 * Le tri du tableau des sujets, **là où il se pose**.
 *
 * Le service qui range est vérifié à côté. Ce qui se vérifie ici est l'autre
 * moitié : que le tri soit appliqué **au même endroit que les filtres**, sur la
 * liste que lisent le tableau, la pagination, les compteurs et le diagnostic.
 *
 * C'est la leçon du filtre voisin, qui a coûté quatre tours : une valeur, ou un
 * ordre, qui vit à deux endroits finit par diverger (règle 4). Trier dans le
 * rendu aurait affiché un ordre que la pagination ignore — et la page 2 n'aurait
 * pas montré ce qui suit la page 1.
 */

const sujet = (id, dates = {}) => ({ id, title: `Sujet ${id}`, status: "open", ...dates });

function selecteursSur(store, sujets) {
  return createProjectSubjectsSelectors({
    store,
    ensureViewUiState: () => {},
    getRunBucket: () => ({}),
    getCustomSubjects: () => sujets,
    normalizeSubjectSituationIds: () => [],
    normalizeBackendPriority: (valeur) => String(valeur ?? ""),
    getEffectiveSujetStatus: () => "open",
    matchSearch: () => true,
    firstNonEmpty: (...valeurs) => valeurs.find(Boolean) ?? ""
  });
}

const unStore = (tri = "") => ({
  projectSubjectsView: { filters: { status: "open", priority: "" }, subjectsSort: tri },
  situationsView: { filters: { status: "open", priority: "" } }
});

const LES_SUJETS = [
  sujet("vieux", { updated_at: "2026-01-04T10:00:00Z" }),
  sujet("recent", { updated_at: "2026-03-02T09:00:00Z" }),
  sujet("nu"),
  sujet("moyen", { updated_at: "2026-02-11T18:00:00Z" })
];

test("la liste filtrée arrive rangée par dernière activité", () => {
  const selecteurs = selecteursSur(unStore(TRI.DERNIERE_ACTIVITE), LES_SUJETS);

  assert.deepEqual(
    selecteurs.getFilteredFlatSubjects().map((element) => element.id),
    ["recent", "moyen", "vieux", "nu"]
  );
});

/**
 * **Ce que trier n'a pas le droit de faire.** Le compteur des sujets ouverts se
 * lit ailleurs que la liste ; s'ils cessaient d'être d'accord, on retomberait
 * exactement sur la panne qu'on vient de passer quatre tours à poursuivre — un
 * nombre qui annonce des sujets qu'on ne voit pas.
 */
test("trier ne change pas le nombre de sujets", () => {
  const sansTri = selecteursSur(unStore(), LES_SUJETS).getFilteredFlatSubjects();
  const avecTri = selecteursSur(unStore(TRI.DERNIERE_ACTIVITE), LES_SUJETS).getFilteredFlatSubjects();

  assert.equal(avecTri.length, sansTri.length);
  assert.deepEqual(
    new Set(avecTri.map((element) => element.id)),
    new Set(sansTri.map((element) => element.id))
  );
});

test("sans tri demandé, l'ordre du projet est celui qu'on rend", () => {
  const selecteurs = selecteursSur(unStore(), LES_SUJETS);
  assert.equal(selecteurs.getCurrentSubjectsSort(), TRI.PROJET);
});

/**
 * L'ordre n'a **qu'une case**. L'ancien état des Situations n'en porte pas de
 * copie : c'est précisément la copie de trop qui avait rendu le filtre voisin
 * inopérant en passant par l'autre onglet.
 */
test("l'ancien état des Situations ne peut pas défaire le tri", () => {
  const store = unStore(TRI.DERNIERE_ACTIVITE);
  const selecteurs = selecteursSur(store, LES_SUJETS);

  store.situationsView.subjectsSort = "";
  store.situationsView.filters.sort = "";

  assert.equal(selecteurs.getCurrentSubjectsSort(), TRI.DERNIERE_ACTIVITE);
});

test("un tri inconnu se lit comme l'ordre du projet", () => {
  const selecteurs = selecteursSur(unStore("par couleur"), LES_SUJETS);
  assert.equal(selecteurs.getCurrentSubjectsSort(), TRI.PROJET);
});
