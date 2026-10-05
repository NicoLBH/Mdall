/**
 * L'épreuve du composant des contrôles.
 *
 * **Il n'était rendu par aucune épreuve**, et c'est la batterie de mutations qui
 * l'a dit : on pouvait faire disparaître la section entière, marquer « tient »
 * un contrôle sans objet, ou cesser de nommer les manques — rien ne tombait.
 * Un composant qu'on n'a jamais vu rendre ne garde rien.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { renderLesPreuvesDeLaLecture } from "./les-preuves-de-la-lecture.js";

const LE_DOCUMENT = [
  "| Réf. | Objet | Marque |",
  "| A-07 | Fondations superficielles | F |",
  "L'étude de sol G2 AVP n'a pas été fournie à ce jour.",
  "Établi le : 18/04/2026"
].join("\n");

const UNE_LECTURE = {
  markdown: LE_DOCUMENT,
  structure: { nature: "rapport initial de contrôle technique" },
  legende: [{ marque: "F" }, { marque: "D" }],
  avis: [
    { reference: "A-07", marque: "F", citation: "L'étude de sol G2 AVP", le: "2026-04-18" },
    { reference: "A-12", marque: "Z", citation: "une phrase que le document ne porte pas" }
  ]
};

test("les quatre contrôles se dessinent, avec leur assiette", () => {
  const html = renderLesPreuvesDeLaLecture(UNE_LECTURE);

  assert.match(html, /Ce que nous avons vérifié de cette lecture/);
  for (const libelle of [
    "La forme du document a été reconnue",
    "Chaque citation figure dans le document",
    "Chaque marque employée est dans la légende",
    "Chaque date relevée figure dans le document"
  ]) {
    assert.ok(html.includes(libelle), `le contrôle « ${libelle} » ne se dessine pas`);
  }

  // Le couple, jamais le seul pourcentage : « 1/2 » et non « 50 % ».
  assert.match(html, /1\/2/);
  assert.doesNotMatch(html, /50 %/);
});

/**
 * **Les manques sont nommés, et pas seulement comptés.**
 *
 * « 1 citation manque » envoie chercher, et c'est celle-là qu'on cherche.
 */
test("un manque se nomme sous le libellé de son contrôle", () => {
  const html = renderLesPreuvesDeLaLecture(UNE_LECTURE);

  assert.match(html, /A-12/, "la citation manquante n'est pas nommée");
  assert.match(html, /A-12 → « Z »/, "la marque hors légende n'est pas nommée");
  assert.match(html, /ne tient pas/);
});

/**
 * **Un contrôle sans objet ne se marque pas « tient ».**
 *
 * Un écran tout vert sur une lecture qui n'a rien rendu est la pire propriété
 * possible pour un indicateur (règle 5).
 */
test("un contrôle sans objet le dit, et ne passe pas pour tenu", () => {
  const html = renderLesPreuvesDeLaLecture({
    markdown: LE_DOCUMENT, structure: { nature: "rapport" }, legende: [], avis: []
  });

  assert.match(html, /ni un succès ni un échec/);

  /**
   * **La marque se relève dans sa case, et non n'importe où dans la page.**
   *
   * La batterie de mutations l'a demandé : « ne se pose pas » figure aussi dans
   * la phrase du contrôle — « la question ne se pose pas » — et une recherche
   * sur la page entière passait même en retirant la garde. L'épreuve vérifiait
   * la présence d'une phrase, pas le verdict.
   */
  const marques = [...html.matchAll(/forme-reference__sur">([^<]*)</g)].map((un) => un[1]);
  assert.equal(marques.length, 4, "aucun contrôle n'a disparu de la liste");
  assert.equal(marques.filter((une) => une === "ne se pose pas").length, 3,
    `trois contrôles sans objet attendus — relevé : ${marques.join(" | ")}`);
  // La structure, elle, se juge toujours : c'est le seul contrôle à assiette 1.
  assert.equal(marques.filter((une) => une === "tient").length, 1);
});

test("ce que les contrôles ne disent pas se dit, et le plus gênant en premier", () => {
  const html = renderLesPreuvesDeLaLecture(UNE_LECTURE);

  assert.match(html, /Que la lecture soit juste/);
  assert.match(html, /parfaitement possible et parfaitement fausse/);
  // `escapeHtml` rend l'apostrophe en `&#39;` : chercher la forme droite ne
  // trouve rien, et `indexOf` rend -1 — ce qui passe pour « avant tout ».
  const ou = (quoi) => {
    const rang = html.indexOf(quoi);
    assert.ok(rang >= 0, `introuvable dans le rendu : ${quoi}`);
    return rang;
  };
  assert.ok(ou("Que la lecture soit juste") < ou("Ce que la lecture n&#39;a pas relevé"),
    "le non-dit le plus gênant n'est pas en premier");
});

test("sans lecture, le cadre n'existe pas plutôt que d'être vide", () => {
  // Un cadre « ce que nous avons vérifié » au-dessus de rien laisserait croire
  // qu'on a vérifié quelque chose.
  for (const rien of [null, undefined, "", 0, "une lecture"]) {
    assert.equal(renderLesPreuvesDeLaLecture(rien), "");
  }
});

test("le composant n'invente aucune classe", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const style = readFileSync(
    fileURLToPath(new URL("../../../style.css", import.meta.url)), "utf8");

  const classes = new Set([...renderLesPreuvesDeLaLecture(UNE_LECTURE)
    .matchAll(/class="([^"]+)"/g)]
    .flatMap((un) => un[1].split(/\s+/))
    .filter(Boolean));

  assert.ok(classes.has("forme-reference"), "la liste à assiette n'est pas reprise");
  for (const classe of classes) {
    assert.ok(style.includes(`.${classe}`), `« ${classe} » n'est pas dans la feuille de style`);
  }
});

test("ce qu'un relevé porte est échappé, jamais injecté", () => {
  const html = renderLesPreuvesDeLaLecture({
    markdown: "x", structure: { nature: "<img src=x onerror=alert(1)>" },
    legende: [{ marque: "F" }], avis: [{ reference: "<script>", marque: "Z", citation: "y" }]
  });

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});
