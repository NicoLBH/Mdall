/**
 * Les schémas redessinés : ce qu'on exige d'un trait qu'on a transcrit.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { FIGURES, figuresDe, COLONNES_FAMILLES } from "./figures.js";

test("l'article 6 porte la figure de ses planchers, avec la table des degrés", () => {
  // C'est la figure la plus utile du fascicule pour qui répond : l'article
  // énumère quatre degrés puis deux exceptions, et la phrase des exceptions
  // arrive après la liste.
  const [figure] = figuresDe("6");
  assert.ok(figure);
  for (const degre of ["1/4 h", "1/2 h", "1 h", "1 h 30"]) assert.ok(figure.svg.includes(degre), degre);
  for (const cas of ["comble communicant", "entre logements", "vide sanitaire accessible"]) {
    assert.ok(figure.svg.includes(cas), cas);
  }
  // Et les deux exceptions, que la table seule ne dit pas.
  assert.match(figure.svg, /NON accessible/);
  assert.match(figure.svg, /prolongées jusqu'à la couverture/);
});

test("l'article premier porte sa figure, et elle dit d'où elle vient", () => {
  const figures = figuresDe("1er");
  assert.equal(figures.length, 1);
  const [figure] = figures;
  assert.ok(figure.titre);
  assert.ok(figure.legende.length > 40, "une légende doit apprendre quelque chose");
  // Sans le renvoi au fascicule, personne ne peut aller vérifier que le trait
  // dit bien ce que la figure disait.
  assert.match(figure.source, /SOCOTEC/);
});

test("« premier » et « 1er » désignent le même article", () => {
  assert.equal(figuresDe("premier").length, 1);
  assert.equal(figuresDe("1er").length, 1);
  assert.deepEqual(figuresDe("42"), []);
  assert.deepEqual(figuresDe(null), []);
});

test("le dessin prend les couleurs de la page, il ne les impose pas", () => {
  // C'est ce qui lui permet de se lire en thème clair comme en thème sombre.
  // Une couleur écrite en dur dans le fichier serait invisible dans l'un des deux.
  for (const figure of Object.values(FIGURES).flat()) {
    assert.doesNotMatch(figure.svg, /#[0-9a-f]{3,6}\b/i, figure.id);
    assert.doesNotMatch(figure.svg, /\bfill="(?!none)[a-z]+"/i, figure.id);
    assert.match(figure.svg, /^<svg /);
    assert.match(figure.svg, /viewBox="0 0 \d+ \d+"/);
    // Un dessin sans énoncé n'existe pas pour qui ne voit pas l'écran.
    assert.match(figure.svg, /aria-label="[^"]{40,}"/, figure.id);
  }
});

test("la deuxième famille tient à cheval sur l'individuel et le collectif", () => {
  // C'est l'information que la figure porte et qu'aucune phrase de l'arrêté
  // n'écrit : une maison individuelle de plus d'un étage et un collectif de
  // trois étages au plus sont l'un et l'autre en deuxième famille.
  const deuxiemes = COLONNES_FAMILLES.filter((c) => c.libelle === "2");
  assert.equal(deuxiemes.length, 2);
  assert.deepEqual(deuxiemes.map((c) => c.groupe), ["Indiv.", "Collectifs"]);
  assert.equal(COLONNES_FAMILLES.filter((c) => c.surtitre === "3").length, 2);
});

test("le dessin reste léger : c'est tout l'intérêt d'un trait", () => {
  for (const figure of Object.values(FIGURES).flat()) {
    assert.ok(figure.svg.length < 20000, `${figure.id} pèse ${figure.svg.length} octets`);
  }
});
