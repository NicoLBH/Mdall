import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPTE_INCONNU,
  NOM_DU_CARNET,
  ROUTE_DU_CARNET,
  adresseDunAncienLien,
  estMonCarnet
} from "./mon-carnet.js";

/**
 * **La route décide, pas les données.** `currentProjectId` est posé par la
 * route, `projectScopeId` par le chargement : les laisser répondre toutes les
 * deux, c'était accepter qu'elles se contredisent le jour où l'une est mise à
 * jour et pas l'autre (règle 4).
 */
test("sans projet courant, on est dans le carnet", () => {
  assert.equal(estMonCarnet({ currentProjectId: null }), true);
  assert.equal(estMonCarnet({ currentProjectId: "" }), true);
  assert.equal(estMonCarnet({ currentProjectId: "   " }), true);
  assert.equal(estMonCarnet({}), true);
  assert.equal(estMonCarnet(null), true);
});

test("avec un projet courant, on est sur l'écran d'un projet", () => {
  assert.equal(estMonCarnet({ currentProjectId: "projet-1" }), false);
});

/**
 * Les données ne votent pas. Une liste chargée pour un projet, regardée depuis
 * le carnet, reste regardée depuis le carnet — sinon deux réponses coexistent
 * et c'est celle qu'on ne lit pas qui a raison.
 */
test("ce que le chargement a mis dans le magasin ne change pas la réponse", () => {
  assert.equal(estMonCarnet({ currentProjectId: null, situationsView: { projectScopeId: "projet-1" } }), true);
  assert.equal(estMonCarnet({ currentProjectId: "projet-1", situationsView: { projectScopeId: null } }), false);
});

/** Un nom vit à un seul endroit : le menu, l'en-tête et l'écran le lisent ici. */
test("le nom et l'adresse du carnet sont écrits une fois", () => {
  assert.equal(NOM_DU_CARNET, "Situations");
  assert.equal(ROUTE_DU_CARNET, "#situations");
  assert.equal(COMPTE_INCONNU, "—", "et surtout pas « 0 »");
});

/* ── Les anciens liens ───────────────────────────────────────────────────── */

/**
 * **Un ancien lien ne se perd pas en silence.**
 *
 * `#project/<id>/situations` était l'adresse de l'onglet. Il n'existe plus, et
 * sans cette règle la page retomberait sur Fichiers sans rien dire : on aurait
 * demandé ses situations et obtenu autre chose (règle 5).
 */
test("l'ancien lien des situations mène au carnet", () => {
  assert.equal(adresseDunAncienLien(["project", "chantier-1", "situations"]), ROUTE_DU_CARNET);
});

/** Et les autres onglets ne bougent pas d'un pouce. */
test("les autres onglets d'un projet ne sont pas détournés", () => {
  assert.equal(adresseDunAncienLien(["project", "chantier-1", "documents"]), null);
  assert.equal(adresseDunAncienLien(["project", "chantier-1", "memoire"]), null);
  assert.equal(adresseDunAncienLien(["project", "chantier-1"]), null);
  assert.equal(adresseDunAncienLien(["projects"]), null);
  assert.equal(adresseDunAncienLien(["situations"]), null, "on y est déjà : pas de renvoi en boucle");
  assert.equal(adresseDunAncienLien([]), null);
  assert.equal(adresseDunAncienLien(), null);
});
