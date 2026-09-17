/**
 * Les deux menus de la Mémoire.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Une entrée qui disparaît d'un menu ne laisse aucune trace.** L'écran se
 * dessine, le menu s'ouvre, il a l'air complet — et « Reconstruire les liens du
 * raisonnement », qu'on utilise trois fois par an, n'existe plus. C'est le genre
 * de perte qu'on ne découvre que le jour où l'on en a besoin, c'est-à-dire trop
 * tard pour savoir quelle modification l'a emportée.
 *
 * **Et une frontière qui bouge** : « Ajouter » écrit ou sort la mémoire,
 * « Affichage » ne fait que regarder. Un geste qui passerait de l'un à l'autre
 * se chercherait longtemps.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { gestesDAffichage, gestesDAjout } from "./project-memoire-gestes.js";

const libelles = (gestes) => gestes.map((g) => (g.separator ? "———" : g.label));
const parAction = (gestes, action) => gestes.find((g) => g.action === action);

test("le menu Ajouter propose les cinq gestes, dans l'ordre et séparés", () => {
  assert.deepEqual(libelles(gestesDAjout({ total: 8 })), [
    "Déclarer une variable",
    "———",
    "Verser les contraintes du site",
    "———",
    "Reconstruire les liens du raisonnement",
    "———",
    "Exporter en JSON",
    "Exporter en CSV",
    "Copier le dossier de contexte"
  ]);
});

/**
 * **Un export vide se comprend mal.** On l'ouvre, il ne contient rien, et l'on
 * cherche ce qu'on a mal filtré — alors que la mémoire est simplement vide.
 * Déclarer et verser restent offerts : c'est justement ce qu'on vient y faire.
 */
test("sans rien en mémoire, on peut encore écrire mais plus sortir", () => {
  const gestes = gestesDAjout({ total: 0 });

  assert.equal(parAction(gestes, "declarer").disabled, false);
  assert.equal(parAction(gestes, "verser:site").disabled, false);
  assert.equal(parAction(gestes, "verser:lectures").disabled, false);

  for (const action of ["export:json", "export:csv", "export:contexte"]) {
    assert.equal(parAction(gestes, action).disabled, true, action);
  }
});

/** Pendant un écrit, rien ne part : deux versements qui se croisent écrivent deux fois. */
test("pendant un écrit, tout le menu est éteint", () => {
  const gestes = gestesDAjout({ total: 8, busy: true });

  for (const geste of gestes.filter((g) => !g.separator)) {
    assert.equal(geste.disabled, true, geste.action);
  }
});

/**
 * **La reconstruction des liens n'est pas un versement**, et le menu le dit :
 * rien n'entre en mémoire, c'est une relecture de ce que les règles disent
 * déjà. Sans cette phrase, on la prend pour un import et l'on hésite à la
 * lancer sur un projet vivant.
 */
test("la reconstruction dit ce qu'elle fait avant qu'on la lance", () => {
  const geste = parAction(gestesDAjout({ total: 8 }), "verser:lectures");

  assert.match(geste.title, /Relit ce que chaque règle a lu/);
  assert.match(geste.title, /résolus après coup sont marqués/);
});

/* ── Regarder ────────────────────────────────────────────────────────────── */

/**
 * **« Liste » est éteinte, et c'est voulu** : c'est ce qu'on regarde déjà. Elle
 * dit qu'il y a deux façons de lire et laquelle est ouverte ; le cerveau
 * s'ouvre par-dessus et se referme sur elle, il n'y a pas de troisième écran.
 */
test("le menu Affichage montre les deux façons de regarder, la sienne éteinte", () => {
  const gestes = gestesDAffichage({
    usage: { quoi: "Dessine la forme du raisonnement du projet." },
    libelle: "Le cerveau du projet",
    servi: true
  });

  assert.deepEqual(libelles(gestes), ["Liste", "Le cerveau du projet"]);
  assert.equal(parAction(gestes, "affichage:liste").disabled, true);
  assert.equal(parAction(gestes, "affichage:cerveau").disabled, false);
  assert.match(parAction(gestes, "affichage:cerveau").title, /forme du raisonnement/);
});

/**
 * **Un usage que le moteur ne sert pas encore s'éteint** (règle 5) : proposer
 * une lecture qui ne se dessinerait pas ferait croire à une panne, là où il n'y
 * a qu'une étape pas encore faite.
 */
test("un cerveau que le moteur ne sert pas ne se propose pas", () => {
  const gestes = gestesDAffichage({ usage: { quoi: "…" }, libelle: "Le cerveau", servi: false });
  assert.equal(parAction(gestes, "affichage:cerveau").disabled, true);

  const pendant = gestesDAffichage({ usage: { quoi: "…" }, libelle: "Le cerveau", servi: true, busy: true });
  assert.equal(parAction(pendant, "affichage:cerveau").disabled, true);
});

/**
 * **Sans usage déclaré, pas de menu du tout.** Un « Affichage » qui n'offrirait
 * que « Liste », éteinte, serait un bouton qui ne fait rien.
 */
test("sans usage, le menu Affichage n'existe pas", () => {
  assert.deepEqual(gestesDAffichage({ usage: null }), []);
  assert.deepEqual(gestesDAffichage(), []);
});

/**
 * **La frontière entre les deux menus.** Écrire ou sortir la mémoire d'un côté,
 * regarder de l'autre : un geste qui passerait de l'un à l'autre se chercherait
 * longtemps, et l'on a déjà perdu la reconstruction des liens sous « Verser »,
 * où personne ne la trouvait.
 */
test("aucun geste n'est dans les deux menus", () => {
  const ajout = new Set(gestesDAjout({ total: 1 }).filter((g) => g.action).map((g) => g.action));
  const affichage = gestesDAffichage({ usage: { quoi: "" }, libelle: "x", servi: true });

  for (const geste of affichage) assert.ok(!ajout.has(geste.action), geste.action);
  for (const action of ajout) assert.ok(!action.startsWith("affichage:"), action);
});
