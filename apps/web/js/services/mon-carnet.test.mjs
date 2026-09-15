import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPTE_INCONNU,
  NOM_DU_CARNET,
  ROUTE_DU_CARNET,
  adresseDunAncienLien,
  enTeteDuCarnet,
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

/* ── Tout en haut ────────────────────────────────────────────────────────── */

/**
 * **L'en-tête ne nomme aucun chantier dans le carnet.**
 *
 * La barre du haut portait « Untel / Résidence Bertrand ». Garder ce nom
 * au-dessus du carnet ferait croire qu'on est encore dans ce chantier, et qu'on
 * y lit ses situations à lui. On en est sorti.
 */
test("dans le carnet, aucun chantier n'est écrit tout en haut", () => {
  const entete = enTeteDuCarnet();

  assert.equal(entete.primary, NOM_DU_CARNET);
  assert.equal(entete.showSecondary, false, "aucun chantier au-dessus du carnet");
  assert.equal(entete.secondary, "");
  assert.equal(entete.href, ROUTE_DU_CARNET);
  assert.equal(entete.headerClass, "gh-header gh-header--global", "l'en-tête d'un écran qui n'est pas un projet");
});

/** Une situation ouverte se nomme dans le fil, avec de quoi revenir en arrière. */
test("une situation ouverte porte son fil d'Ariane", () => {
  const entete = enTeteDuCarnet({ id: "s-1", title: "Ma semaine" });

  assert.equal(entete.showSituationBreadcrumb, true);
  assert.equal(entete.breadcrumbTabLabel, NOM_DU_CARNET, "le retour mène au carnet");
  assert.equal(entete.breadcrumbCurrentLabel, "Ma semaine");
  assert.equal(entete.showSecondary, false, "et toujours aucun chantier");
});

/** Une situation sans titre ne laisse pas un fil d'Ariane muet. */
test("une situation sans titre se nomme quand même", () => {
  assert.equal(enTeteDuCarnet({ id: "s-1" }).breadcrumbCurrentLabel, "Situation");
});

/** Et sans situation ouverte, pas de fil : il n'y a rien à remonter. */
test("sans situation ouverte, il n'y a pas de fil à remonter", () => {
  assert.equal(enTeteDuCarnet(null).showSituationBreadcrumb, false);
  assert.equal(enTeteDuCarnet().breadcrumbTabLabel, "");
});
