/**
 * Le cerveau, lu depuis la conversation.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Un aiguillage qui se trompe d'outil.** Deux outils tournent au navigateur ;
 * le serveur dit lequel par un rôle. Router sur le nom lui apprendrait un nom
 * d'outil — ce que ce champ existe pour éviter —, et l'écrire des deux côtés le
 * ferait diverger au premier renommage (règle 4).
 *
 * **Et un matériau relu.** Le bouton « Ouvrir le cerveau » doit montrer le
 * dessin dont la réponse parle, pas celui d'une mémoire relue trois minutes
 * plus tard : sur un projet qui bouge, la différence se voit au premier
 * versement.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { executerLeCerveau, TITRE_CERVEAU } from "./copilote-cerveau.js";

const MEMOIRE = [{ id: "a" }, { id: "b" }];

const faux = () => ({
  noeuds: [
    { id: "a", genre: "valeur", domaine: "sol", poids: 3, sujet: "Portance du sol" },
    { id: "r", genre: "fonction", domaine: "sol", poids: 2, sujet: "Semelle minimale" }
  ],
  liens: [{ de: "a", vers: "r" }],
  profondeur: 1, cycles: [], enregistres: true,
  compte: { socle: 1, rejouables: 0, opaques: 0 }
});

test("la lecture rend des nombres et un récit, et garde de quoi rouvrir", async () => {
  const { resultat, pourLeModele } = await executerLeCerveau({
    assertions: MEMOIRE, projectId: "p", lire: faux
  });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.titre, TITRE_CERVEAU);
  assert.equal(resultat.lecture.regles, 1);
  assert.match(resultat.recit, /cube/);

  // **Le matériau reste ici, il ne part pas au modèle** : des milliers de nœuds
  // ne lui apprendraient rien et coûteraient la moitié de sa fenêtre.
  assert.equal(resultat.cerveau.assertions, MEMOIRE);
  assert.equal(pourLeModele.cerveau, undefined);
  assert.equal(pourLeModele.regles, 1);
  assert.match(pourLeModele.recit, /cube/);
});

/**
 * **Un dessin qui ne se construit pas se dit, il ne fait pas tomber la réponse.**
 * La boucle du copilote attend la même forme que les agents du serveur : un
 * refus qui lève arrêterait la conversation au lieu d'expliquer.
 */
test("un cerveau illisible rend un refus, pas une exception", async () => {
  const { resultat, pourLeModele } = await executerLeCerveau({
    assertions: MEMOIRE,
    projectId: "p",
    lire: () => { throw new Error("index introuvable"); }
  });

  assert.equal(resultat.statut, "manque");
  assert.match(resultat.message, /index introuvable/);
  assert.match(pourLeModele.refus, /index introuvable/);
});

/** Ce qui se passe pendant se raconte : un aller-retour muet ressemble à une panne. */
test("la lecture dit ce qu'elle fait pendant qu'elle le fait", async () => {
  const dits = [];
  await executerLeCerveau({
    assertions: MEMOIRE, projectId: "p", lire: faux,
    onEtape: (dit) => dits.push(dit.texte)
  });

  assert.deepEqual(dits, ["Lecture du raisonnement du projet", "Cerveau lu"]);
});

/**
 * **Le rôle, et non le nom.** Le navigateur n'a pas de catalogue : il reçoit du
 * serveur « cerveau » ou « variante », et c'est tout ce qu'il en sait. Une garde
 * de texte, faute de pouvoir importer un écran qui parle à la base — mais elle
 * attrape exactement le défaut qui rendrait le cerveau muet : un aiguillage qui
 * repasse par le nom, ou un rôle écrit différemment des deux côtés.
 */
test("le navigateur route sur le rôle que le serveur lui donne", async () => {
  const { readFile } = await import("node:fs/promises");
  const [client, serveur] = await Promise.all([
    readFile(new URL("./copilote-service.js", import.meta.url), "utf8"),
    readFile(new URL("../../../../supabase/functions/project-copilot/index.ts", import.meta.url), "utf8")
  ]);

  assert.match(client, /appel\?\.quoi === "cerveau"/, "le navigateur lit un rôle");
  assert.match(serveur, /quoi: texte\(item\.name\) === OUTIL_CERVEAU\s*\n\s*\? "cerveau"/,
    "et le serveur l'écrit");
  assert.doesNotMatch(client, /lire_le_cerveau|tester_une_variante/,
    "le navigateur n'apprend aucun nom d'outil");
});
