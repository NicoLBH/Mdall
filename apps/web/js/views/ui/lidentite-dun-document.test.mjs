/**
 * L'encart d'identité, éprouvé sur ses deux cas douteux.
 *
 * Ni l'un ni l'autre ne lève : un fait sans valeur rend une colonne vide, qu'on
 * prend pour une absence dans le document, et un encart sans aucun fait rend un
 * cadre qui annonce « Le document » et ne dit rien de lui.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { renderLidentiteDunDocument } from "./lidentite-dun-document.js";

test("chaque fait nommé se rend, avec son intitulé et sa valeur", () => {
  const html = renderLidentiteDunDocument({
    faits: [{ quoi: "Fichier", valeur: "RICT-03.pdf" }, { quoi: "Pages", valeur: "2" }]
  });

  assert.match(html, /<dt>Fichier<\/dt><dd>RICT-03\.pdf<\/dd>/);
  assert.match(html, /<dt>Pages<\/dt><dd>2<\/dd>/);
  assert.match(html, /<h3>Le document<\/h3>/);
});

test("un fait sans valeur ne prend pas de colonne", () => {
  // **Le défaut que ce banc existe pour attraper.** Une colonne « Référence »
  // vide se lit comme « le document n'en porte pas », là où rien n'a été lu —
  // et l'on cherche dans le PDF ce qui n'a jamais été cherché (règle 5). Les
  // appelants écrivent « non lue » quand c'est le cas.
  const html = renderLidentiteDunDocument({
    faits: [{ quoi: "Fichier", valeur: "a.pdf" }, { quoi: "Référence", valeur: "" },
      { quoi: "", valeur: "orpheline" }, null]
  });

  assert.doesNotMatch(html, /Référence/);
  assert.doesNotMatch(html, /orpheline/);
  assert.equal(html.match(/document-identite__fait"/g).length, 1);
});

test("un encart sans aucun fait ni réserve ne se dessine pas", () => {
  // Un cadre qui annonce « Le document » et ne dit rien de lui ferait chercher
  // ce qui manque.
  assert.equal(renderLidentiteDunDocument({ faits: [] }).trim(), "");
  assert.equal(renderLidentiteDunDocument().trim(), "");
});

test("une réserve seule suffit à dessiner l'encart", () => {
  // C'est le cas d'un document dont rien n'a été lu : il faut bien le dire
  // quelque part, et l'absence d'encart ne le dirait pas.
  const html = renderLidentiteDunDocument({ faits: [], reserve: "Rien n'a été lu." });
  assert.match(html, /Rien n&#39;a été lu\./);
});

test("le titre se remplace, et jamais par du vide", () => {
  assert.match(renderLidentiteDunDocument({
    titre: "Le rapport", faits: [{ quoi: "a", valeur: "b" }]
  }), /<h3>Le rapport<\/h3>/);

  assert.match(renderLidentiteDunDocument({
    titre: "   ", faits: [{ quoi: "a", valeur: "b" }]
  }), /<h3>Le document<\/h3>/);
});

test("ce qui vient du document est échappé", () => {
  // Un nom de fichier porte ce que son auteur y a mis.
  const html = renderLidentiteDunDocument({
    faits: [{ quoi: "Fichier", valeur: '<img src=x onerror="1">' }]
  });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});
