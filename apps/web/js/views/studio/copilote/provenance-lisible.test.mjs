import test from "node:test";
import assert from "node:assert/strict";

import { MOTS_DE_PROVENANCE, phraseDeLaProvenance } from "./provenance-lisible.js";

test("une valeur de mémoire dit de quelle zone elle parle", () => {
  // Le défaut que ça répare : on lisait « mémoire du projet » et l'on ne savait
  // pas si la valeur valait pour l'ouvrage entier ou pour l'escalier dont on
  // venait de parler. Une réponse qu'on ne peut pas situer ne se conteste pas.
  assert.equal(
    phraseDeLaProvenance({ origine: "memoire", portee: "Escalier B" }),
    "mémoire du projet · Escalier B"
  );
});

test("sans portée, la phrase ne s'invente pas de séparateur", () => {
  // La grande majorité des affirmations n'en portent aucune : un point médian
  // en suspens se lirait comme une information manquante.
  assert.equal(phraseDeLaProvenance({ origine: "memoire" }), "mémoire du projet");
  assert.equal(phraseDeLaProvenance({ origine: "memoire", portee: "   " }), "mémoire du projet");
});

test("« calculée par » appelle le nom de l'agent, et la portée vient après", () => {
  // Sans le complément, la phrase s'arrête au milieu.
  assert.equal(
    phraseDeLaProvenance({ origine: "utilitaire", detail: "Profondeur hors gel" }),
    "calculée par Profondeur hors gel"
  );
  assert.equal(
    phraseDeLaProvenance({ origine: "utilitaire", detail: "Profondeur hors gel", portee: "Bâtiment A" }),
    "calculée par Profondeur hors gel · Bâtiment A"
  );
  // Le détail des autres origines est un titre de survol, pas la phrase : le
  // recopier ici ferait deux fois la même chose à l'écran.
  assert.equal(
    phraseDeLaProvenance({ origine: "etude", detail: "étude « Bâtiment A » du projet" }),
    "étude du projet"
  );
});

test("une origine qu'on ne sait pas nommer se dit telle quelle", () => {
  // Règle 5 : mieux vaut un mot brut qu'un silence. Une provenance qui
  // disparaît fait croire qu'il n'y en avait pas.
  assert.equal(phraseDeLaProvenance({ origine: "importee" }), "importee");
  assert.equal(phraseDeLaProvenance({ origine: "importee", portee: "Zone 1" }), "importee · Zone 1");
});

test("sans origine, il n'y a rien à dire", () => {
  assert.equal(phraseDeLaProvenance(null), "");
  assert.equal(phraseDeLaProvenance({}), "");
  assert.equal(phraseDeLaProvenance({ portee: "Escalier B" }), "");
});

test("chaque origine que le catalogue produit sait se dire", async () => {
  // Les origines sont écrites là-bas et nommées ici : une origine ajoutée sans
  // son mot s'afficherait en identifiant brut, au milieu d'une réponse rédigée.
  const source = await import("node:fs").then(({ readFileSync }) =>
    readFileSync(
      new URL("../../../../../../supabase/functions/_shared/utilitaires/catalogue.js", import.meta.url),
      "utf8"
    ));

  const produites = [...source.matchAll(/origine: "([a-z]+)"/g)].map((trouve) => trouve[1]);
  assert.ok(produites.length >= 4, "les origines n'ont pas été retrouvées");

  const muettes = [...new Set(produites)].filter((origine) => !MOTS_DE_PROVENANCE[origine]);
  assert.deepEqual(muettes, []);
});
