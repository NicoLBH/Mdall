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
import process from "node:process";

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

const LE_DELAI_MS = 120_000;

const enfant = spawnSync(process.execPath,
  ["--experimental-vm-modules", "--no-warnings", "--input-type=module", "-e", ENFANT],
  { encoding: "utf8", timeout: LE_DELAI_MS });

/**
 * **Pourquoi l'enfant n'a rien rendu, en le nommant.**
 *
 * Le message disait « le banc n'a rien rendu », et c'est tout ce qu'on a eu
 * quand l'intégration continue est tombée : trois épreuves en échec, aucune
 * cause. L'enfant était mort d'un **signal** — un segment de mémoire perdu dans
 * `vm.SourceTextModule`, sous un Node plus ancien que celui du projet —, et un
 * signal ne laisse ni sortie, ni erreur, ni code de retour.
 *
 * Ne pas savoir n'autorise pas à se taire sur ce qu'on sait (règle 5) : le
 * signal, le code, et le runtime sont là, et ils disent lequel des trois
 * problèmes on a.
 */
function pourquoiRien() {
  if (enfant.error) return `le banc n'a pas pu être lancé : ${enfant.error.message}`;

  if (enfant.signal) {
    const delai = enfant.signal === "SIGTERM"
      ? ` (le délai de ${Math.round(LE_DELAI_MS / 1000)} s est peut-être dépassé)`
      : "";
    return `le banc est mort du signal ${enfant.signal}${delai}, sous Node ${process.version}`
      + " — ce n'est pas une faute des écrans, mais du moteur qui les évalue :"
      + " « vm.SourceTextModule » perd un segment de mémoire sous Node 20."
      + " Le runtime du projet est dans « .nvmrc ».";
  }

  if (enfant.stderr) return enfant.stderr;
  return `le banc a rendu ${enfant.status} sans rien écrire, sous Node ${process.version}`;
}

const rendu = enfant.status === 0 && enfant.stdout
  ? JSON.parse(enfant.stdout)
  : { panne: pourquoiRien() };

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

/**
 * **Le message d'une panne doit nommer la panne.**
 *
 * « le banc n'a rien rendu » est ce que l'intégration continue a dit pendant
 * trois échecs : rien sur la cause, rien sur le runtime, rien à chercher. Une
 * phrase qui ne dit pas pourquoi coûte une heure à chaque fois (règle 12).
 */
test("une panne de l'enfant se nomme", () => {
  // On n'attend pas qu'elle arrive : on la pose, et l'on vérifie ce qui se dit.
  const dit = (quoi) => {
    const garde = { error: enfant.error, signal: enfant.signal, stderr: enfant.stderr,
      status: enfant.status };
    Object.assign(enfant, { error: undefined, signal: null, stderr: "", status: 1 }, quoi);
    try {
      return pourquoiRien();
    } finally {
      Object.assign(enfant, garde);
    }
  };

  assert.match(dit({ signal: "SIGSEGV" }), /SIGSEGV/);
  assert.match(dit({ signal: "SIGSEGV" }), /\.nvmrc/,
    "la phrase ne dit pas où lire le runtime du projet");
  assert.match(dit({ signal: "SIGTERM" }), /délai/,
    "un enfant tué par le délai se dit comme un plantage");
  assert.match(dit({ error: new Error("spawn ENOENT") }), /ENOENT/);
  assert.match(dit({ stderr: "ReferenceError: machin" }), /ReferenceError/);
  assert.match(dit({ status: 7 }), /7/,
    "un code de retour sans sortie ne se dit pas");
  // Et aucune de ces phrases n'est celle qui ne disait rien.
  for (const quoi of [{ signal: "SIGSEGV" }, { status: 7 }, { error: new Error("x") }]) {
    assert.doesNotMatch(dit(quoi), /^le banc n'a rien rendu$/);
  }
});
