import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  REFUS, formeDunRaisonnement, phraseDeLaForme, phraseDesRefus, pourquoiElleNeVoyagePas
} from "./forme-dun-raisonnement.js";

/** Un raisonnement versé à la fermeture d'un sujet. */
const chemin = (question, entrees, conclusions) => ({
  point: "p-1",
  question,
  porteSur: entrees.map(([sujet, valeur]) => ({ sujet, valeur })),
  examine: [{ quoi: "etude-geotechnique.pdf", ou: "" }],
  decision: { sujet: question, valeur: conclusions[0]?.[1] ?? "" },
  produit: conclusions.map(([sujet, valeur]) => ({ sujet, valeur }))
});

const ligne = (raisonnement, plus = {}) => ({
  id: "r-1", superseded_by: null, decided_at: "2026-03-12T10:00:00Z", decided_by: "u-1",
  proposition_number: 12,
  payload: { subject: raisonnement.question, value: raisonnement.question, raisonnement, domain: "gros-oeuvre" },
  zones: ["Bâtiment A"],
  ...plus
});

const HORS_GEL = chemin(
  "Quelle profondeur hors gel au bâtiment A du collège de Montholon ?",
  [["Altitude", "742,30"], ["Nature du sol", "moraine"]],
  [["Profondeur hors gel", "0,69 m"]]
);

const MEMOIRE = [
  { id: "v-alt", superseded_by: null, payload: { subject: "Altitude", value: "742,30" }, zones: ["Bâtiment A"] },
  { id: "v-sol", superseded_by: null, payload: { subject: "Nature du sol", value: "moraine" }, zones: ["Pignon nord"] }
];

/* ── Ce qui part, et rien d'autre ────────────────────────────────────────── */

test("la forme porte les noms, et seulement les noms", () => {
  // Deux projets ne partagent jamais leurs valeurs, ils partagent leurs formes.
  const forme = formeDunRaisonnement(ligne(HORS_GEL), { assertions: MEMOIRE });

  assert.deepEqual(forme.entrees, ["altitude", "nature du sol"]);
  assert.deepEqual(forme.conclusions, ["profondeur hors gel"]);
});

test("rien du projet ne se retrouve dans ce qui part", () => {
  // La propriété qu'on vient vérifier en la lisant : pas de valeur, pas de
  // portée, pas de question, pas de date, pas de personne, pas d'identifiant.
  const forme = formeDunRaisonnement(ligne(HORS_GEL), { assertions: MEMOIRE });
  const tout = JSON.stringify(forme).toLowerCase();

  for (const interdit of [
    "742,30", "0,69", "moraine",        // les valeurs
    "bâtiment a", "batiment a",         // les parties de l'ouvrage
    "montholon", "collège", "college",  // le lieu, dans la question
    "quelle profondeur",                // la question elle-même
    "2026", "u-1", "r-1", "p-1",        // date, personne, identifiants
    "etude-geotechnique"                // ce qui a été regardé
  ]) {
    assert.ok(!tout.includes(interdit), `« ${interdit} » sort du projet`);
  }
});

test("la question ne voyage jamais, même quand elle se lirait bien", () => {
  // C'est la chose la plus tentante à emporter, et la plus dangereuse : du
  // texte libre qui porte des lieux, des ouvrages, parfois des personnes.
  const forme = formeDunRaisonnement(ligne(HORS_GEL), { assertions: MEMOIRE });

  assert.equal(forme.question, undefined);
  assert.ok(!Object.values(forme).some((valeur) => String(valeur).includes("?")));
});

test("l'empreinte se lit, et se compare d'un projet à l'autre", () => {
  // Chiffrée, elle se comparerait aussi — et ne se vérifierait plus. Une
  // empreinte qu'on ne sait pas lire est une empreinte qu'on ne sait pas
  // contrôler avant de la laisser partir.
  const ici = formeDunRaisonnement(ligne(HORS_GEL), { assertions: MEMOIRE });
  const ailleurs = formeDunRaisonnement(
    ligne(chemin("Autre question, autre projet",
      [["nature du sol", "argile"], ["altitude", "310,00"]],
      [["profondeur hors gel", "0,50 m"]])),
    { assertions: [] }
  );

  assert.equal(ici.empreinte, "altitude + nature du sol > profondeur hors gel");
  assert.equal(ici.empreinte, ailleurs.empreinte);
});

test("le domaine vient de la charge, jamais du texte", () => {
  const forme = formeDunRaisonnement(ligne(HORS_GEL), { assertions: MEMOIRE });

  assert.equal(forme.domaine, "gros-oeuvre");
});

/* ── Les refus qu'on sait tenir ──────────────────────────────────────────── */

test("un nom qui est une partie de l'ouvrage retient la forme entière", () => {
  // « Bâtiment A » ne veut rien dire ailleurs. Et le refus porte sur la forme
  // entière : retirer le nom en silence donnerait une forme qui n'a jamais
  // existé.
  const suspect = chemin("q", [["Bâtiment A", "oui"], ["Altitude", "742,30"]],
    [["Profondeur hors gel", "0,69 m"]]);

  assert.deepEqual(pourquoiElleNeVoyagePas(suspect, { assertions: MEMOIRE }),
    [REFUS.NOM_DE_LOUVRAGE]);
  assert.equal(formeDunRaisonnement(ligne(suspect), { assertions: MEMOIRE }), null);
});

test("un nom qui est une valeur de ce projet retient la forme", () => {
  // Il désignerait ici ce qu'il vaut là-bas, et la confusion voyagerait avec.
  const suspect = chemin("q", [["moraine", "oui"]], [["Profondeur hors gel", "0,69 m"]]);

  assert.deepEqual(pourquoiElleNeVoyagePas(suspect, { assertions: MEMOIRE }),
    [REFUS.NOM_QUI_EST_UNE_VALEUR]);
});

test("une forme sans entrée ou sans conclusion n'apprend rien", () => {
  // « On est parti de rien » et « on n'a rien conclu » ne se réutilisent pas.
  assert.deepEqual(pourquoiElleNeVoyagePas(chemin("q", [], [["Profondeur hors gel", "0,69 m"]]), {}),
    [REFUS.SANS_ENTREE]);
  assert.deepEqual(pourquoiElleNeVoyagePas(chemin("q", [["Altitude", "742,30"]], []), {}),
    [REFUS.SANS_CONCLUSION]);
});

test("un refus dit ce qui bloque, pas qu'il bloque", () => {
  // « Forme non exportable » n'apprend rien ; « un de ses noms est une partie de
  // l'ouvrage » se vérifie d'un coup d'œil.
  const dit = phraseDesRefus([REFUS.NOM_DE_LOUVRAGE, REFUS.SANS_ENTREE]);

  assert.match(dit, /une partie de l'ouvrage/);
  assert.match(dit, /on ne sait pas de quoi ce raisonnement est parti/);
  assert.equal(phraseDesRefus([]), "");
});

test("une ligne qui n'est pas un raisonnement n'a pas de forme", () => {
  const valeur = { id: "v-1", superseded_by: null, payload: { subject: "Altitude", value: "742,30" } };

  assert.equal(formeDunRaisonnement(valeur, { assertions: MEMOIRE }), null);
  assert.equal(formeDunRaisonnement(null), null);
});

/* ── Ce qu'on relit avant de signer ──────────────────────────────────────── */

test("la phrase écrit exactement ce qui partirait", () => {
  // Une phrase qui résumerait ferait signer autre chose que ce qui part.
  const forme = formeDunRaisonnement(ligne(HORS_GEL), { assertions: MEMOIRE });

  assert.equal(phraseDeLaForme(forme),
    "altitude et nature du sol donnent profondeur hors gel.");
  // Sans article : les deviner écrirait « de le sol » une fois sur trois, et
  // les tenir dans une liste ferait de ce fichier un dictionnaire.
  assert.equal(/\bde (la|le|l')\b/.test(phraseDeLaForme(forme)), false);
  assert.equal(phraseDeLaForme(null), "");
});

/* ── L'écran de la Mémoire la montre, en entier ──────────────────────────── */

test("la ligne d'un raisonnement montre ce qui pourrait voyager", () => {
  // Une garde sur le **texte** de l'écran, et c'est le seul cas où cela vaut :
  // un rendu qu'on écrit sans jamais l'appeler ne dessine rien, et aucun test de
  // service ne tombe. Or c'est précisément l'appel qui fait la promesse : voir
  // exactement ce qui partirait, avant que quoi que ce soit parte (règle 1).
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  // L'interpolation, pas le nom : la **définition** porte le même nom et ferait
  // passer la garde alors que rien n'est dessiné.
  assert.match(ecran, /\$\{renderCeQuiPourraitVoyager\(assertion, chemin\)\}/,
    "la ligne d'un raisonnement ne montre pas ce qui pourrait voyager");
  assert.match(ecran, /formeDunRaisonnement\(assertion, \{ assertions \}\)/,
    "l'écran ne prépare aucune forme");
});

test("quand elle ne peut pas partir, l'écran dit pourquoi", () => {
  // « Forme non exportable » n'apprend rien et ne se corrige pas. Sans cette
  // garde, un encadré qui disparaît en silence se lit comme un raisonnement qui
  // n'a rien à apporter — alors qu'il a un nom de zone dans ses entrées.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  assert.match(ecran, /phraseDesRefus\(pourquoiElleNeVoyagePas\(chemin, \{ assertions \}\)\)/,
    "l'écran tait la raison pour laquelle la forme ne sort pas");
});
