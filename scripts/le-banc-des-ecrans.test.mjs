/**
 * Chaque module d'écran s'évalue — imports bouchonnés, globales nommées.
 *
 * Le contrat du banc est en tête de `le-banc-des-ecrans.mjs`. Ici, on le lance
 * et on refuse ce qu'il trouve.
 *
 * **Un seul enfant, parce que `--experimental-vm-modules` ne peut pas s'ajouter
 * à la commande des épreuves** — la même raison, et la même forme, que
 * `syntaxe-du-navigateur.test.mjs`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { lesNomsImportes } from "./le-banc-des-ecrans.mjs";

const BANC = fileURLToPath(new URL("./le-banc-des-ecrans.mjs", import.meta.url));

const ENFANT = `
import("${BANC}")
  .then((banc) => banc.lesEcransQuiNeChargentPas())
  .then((rendu) => process.stdout.write(JSON.stringify(rendu)))
  .catch((erreur) => {
    process.stdout.write(JSON.stringify({ panne: String(erreur?.stack ?? erreur) }));
  });
`;

const enfant = spawnSync(process.execPath,
  ["--experimental-vm-modules", "--no-warnings", "--input-type=module", "-e", ENFANT],
  { encoding: "utf8", timeout: 120_000 });

const rendu = enfant.status === 0 && enfant.stdout
  ? JSON.parse(enfant.stdout)
  : { panne: enfant.stderr || "le banc n'a rien rendu" };

/**
 * **Le défaut que ceci attrape, et il est parti deux fois en production.**
 *
 * Un module qui référence un nom jamais importé est du JavaScript valide : le
 * nom pourrait être global. Ni les épreuves, ni la batterie, ni les trois
 * constructions, ni `syntaxe-du-navigateur` — qui analyse sans exécuter — ne
 * peuvent le voir. L'écran, lui, ne s'affiche pas du tout.
 */
test("chaque module d'écran s'évalue sans lever", () => {
  assert.equal(rendu.panne, undefined, `le banc n'a pas pu tourner :\n${rendu.panne}`);
  assert.deepEqual(rendu.fautes, [],
    `ces écrans ne se chargent pas :\n${(rendu.fautes ?? []).join("\n")}`);
});

/**
 * **Le compte est une garde, pas une décoration.** Un parcours qui ne trouverait
 * rien rendrait une liste de fautes vide, et l'épreuve passerait en n'ayant rien
 * évalué du tout (règle 12).
 */
test("le banc a bien évalué les écrans", () => {
  assert.equal(rendu.panne, undefined, `le banc n'a pas pu tourner :\n${rendu.panne}`);
  assert.ok(rendu.combien > 30, `trop peu d'écrans évalués : ${rendu.combien}`);
});

/**
 * **Un banc qui ne trouve rien peut être juste, ou aveugle** (règle 12).
 *
 * Les deux mutations qui l'aveuglent — une globale attrape-tout, ou lier sans
 * évaluer — ne changent **rien** à ce qu'il rend tant que le code est sain.
 * Elles ont survécu à la batterie pour cette seule raison.
 *
 * Les témoins ferment cela : le premier porte le défaut parti deux fois en
 * production, le second est le même module l'import en place. Le banc doit
 * signaler l'un et se taire sur l'autre — sans quoi c'est lui qui est cassé.
 */
test("le banc voit encore le défaut pour lequel il existe", () => {
  assert.equal(rendu.panne, undefined, `le banc n'a pas pu tourner :\n${rendu.panne}`);
  assert.match(rendu.temoins?.nomJamaisImporte ?? "",
    /RANGEMENT_DU_TEMOIN is not defined/,
    "le banc ne voit plus un nom jamais importé : il est aveugle");
  assert.equal(rendu.temoins?.nomBienImporte, null,
    `le banc accuse un module sain : ${rendu.temoins?.nomBienImporte}`);
});

/* ── Ce que l'éditeur de liens doit savoir lire ───────────────────────────── */

/**
 * **Le bouchon doit exporter exactement les noms demandés.** Un nom manquant
 * ferait échouer le module pour la mauvaise raison, et l'on chercherait un
 * import oublié là où il n'y en a pas.
 */
test("les noms importés se lisent, sous toutes leurs formes", () => {
  const lus = lesNomsImportes(`
    import { a, b as c } from "./un.js";
    import defaut from "./deux.js";
    import defaut2, { d } from "./trois.js";
    import * as tout from "./quatre.js";
    import "./cinq.js";
    import {
      e,
      f
    } from "./six.js";
  `);

  assert.deepEqual([...lus.get("./un.js")], ["a", "b"]);
  assert.deepEqual([...lus.get("./deux.js")], ["default"]);
  assert.deepEqual([...lus.get("./trois.js")].sort(), ["d", "default"]);
  assert.deepEqual([...lus.get("./quatre.js")], []);
  assert.deepEqual([...lus.get("./cinq.js")], []);
  assert.deepEqual([...lus.get("./six.js")], ["e", "f"]);
});
