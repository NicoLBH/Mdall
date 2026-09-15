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
 * **La barre du haut dit à qui l'on est, puis où l'on est.**
 *
 * Elle portait « Situations » en tête **et** dans le fil : « Situations /
 * Situations / Ma semaine ». Le même mot deux fois, dont l'un ne renseignait
 * sur rien. Le nom de l'écran vit maintenant dans le fil, et une seule fois.
 */
test("la barre du haut porte le nom de la personne, puis celui de l'écran", () => {
  const entete = enTeteDuCarnet(null, "Manoa Le Bihan");

  assert.equal(entete.primary, "Manoa Le Bihan");
  assert.equal(entete.breadcrumbTabLabel, NOM_DU_CARNET);
  assert.equal(entete.breadcrumbCurrentLabel, "", "aucune situation ouverte : rien après");
  assert.equal(entete.showSituationBreadcrumb, true, "le fil existe dès qu'on est dans le carnet");
});

/** Aucun chantier au-dessus du carnet : on est sorti du projet. */
test("dans le carnet, aucun chantier n'est écrit tout en haut", () => {
  const entete = enTeteDuCarnet(null, "Manoa Le Bihan");

  assert.equal(entete.showSecondary, false);
  assert.equal(entete.secondary, "");
  assert.equal(entete.href, ROUTE_DU_CARNET);
  assert.equal(entete.headerClass, "gh-header gh-header--global");
});

/**
 * **Le même mot ne se dit pas deux fois.** C'est le défaut relevé à l'écran :
 * « Situations / Situations / Ma semaine ».
 */
test("une situation ouverte se nomme une fois, après l'écran", () => {
  const entete = enTeteDuCarnet({ id: "s-1", title: "Ma semaine" }, "Manoa Le Bihan");

  assert.deepEqual(
    [entete.primary, entete.breadcrumbTabLabel, entete.breadcrumbCurrentLabel],
    ["Manoa Le Bihan", NOM_DU_CARNET, "Ma semaine"]
  );
  assert.notEqual(entete.primary, entete.breadcrumbTabLabel, "plus de « Situations / Situations »");
});

/** Une situation sans titre ne laisse pas un fil muet. */
test("une situation sans titre se nomme quand même", () => {
  assert.equal(enTeteDuCarnet({ id: "s-1" }, "Untel").breadcrumbCurrentLabel, "Situation");
});

/**
 * Sans personne connue, le nom de l'écran reprend la tête — et le fil se tait,
 * sinon on retomberait exactement sur le doublon qu'on vient de défaire.
 */
test("sans personne connue, l'écran prend la tête et le fil se tait", () => {
  const entete = enTeteDuCarnet(null, "");

  assert.equal(entete.primary, NOM_DU_CARNET);
  assert.equal(entete.showSituationBreadcrumb, false);
  assert.equal(entete.breadcrumbTabLabel, "");
});
