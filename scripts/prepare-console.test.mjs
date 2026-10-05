import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  RACINES, TELS_QUELS, cheminsImportes, horsDuSite, lesModulesAEmporter
} from "./prepare-console.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(rootDir, "apps", "web");
const lireDuSite = (relatif) => readFile(path.join(webDir, relatif), "utf8");

test("les imports relatifs se relèvent, sous toutes leurs formes", () => {
  const source = [
    `import { a } from "./un.js";`,
    `import "./deux.js";`,
    `import {\n  b,\n  c\n} from "../trois.js";`,
    `export { d } from "./quatre.js";`,
    `const e = await import("./cinq.js");`,
    `import { f } from "https://cdn.example.com/f/+esm";`
  ].join("\n");

  assert.deepEqual(cheminsImportes(source).sort(),
    ["../trois.js", "./cinq.js", "./deux.js", "./quatre.js", "./un.js"]);
});

/**
 * **Le garde-fou porte sur le chemin résolu, pas sur ce qui est écrit.** Une
 * suite de `..` habilement repliée — `js/../../supabase/...` — mène hors du
 * site sans en avoir l'air, et seule la résolution le voit.
 */
test("un chemin qui sort de apps/web est reconnu, même replié", () => {
  assert.equal(horsDuSite("js/services/un-msg-deplie.js"), false);
  assert.equal(horsDuSite("js/services/../ui/icons.js"), false);
  assert.equal(horsDuSite("../supabase/functions/_shared/utilitaires/catalogue.js"), true);
  assert.equal(horsDuSite("js/../../supabase/functions/_shared/utilitaires/catalogue.js"), true);
  assert.equal(horsDuSite("/etc/passwd"), true);
});

test("la console refuse d'emporter ce qui sort du site", async () => {
  const lire = async (relatif) =>
    relatif === "js/entree.js" ? `import "../../supabase/functions/_shared/secret.js";` : "";

  await assert.rejects(
    () => lesModulesAEmporter(lire, ["js/entree.js"]),
    /sort de apps\/web/
  );
});

test("les imports se suivent de proche en proche, sans doublon ni boucle", async () => {
  const site = {
    "js/a.js": `import "./b.js";\nimport "./c.js";`,
    "js/b.js": `import "./c.js";\nimport "./a.js";`,
    "js/c.js": ``
  };
  const emportes = await lesModulesAEmporter(async (relatif) => site[relatif], ["js/a.js"]);
  assert.deepEqual(emportes.sort(), ["js/a.js", "js/b.js", "js/c.js"]);
});

/**
 * **Ce que la console emporte pour de vrai.** Une racine renommée sans que ce
 * script le sache casserait le build ; ce test le dit avant, et en une seconde.
 */
test("toutes les racines déclarées existent dans apps/web", async () => {
  for (const relatif of RACINES) {
    await assert.doesNotReject(() => lireDuSite(relatif), relatif);
  }
});

test("le parcours réel de la console reste dans le site, et il est court", async () => {
  const emportes = await lesModulesAEmporter(lireDuSite);

  // La porte et les icônes, avec ce qu'elles entraînent : de quoi poser une
  // question à la base et dessiner un avatar.
  assert.equal(emportes.includes("js/services/la-porte-de-la-console.js"), true);
  assert.equal(emportes.includes("assets/js/auth.js"), true);
  assert.equal(emportes.includes("js/ui/icons.js"), true);

  for (const relatif of emportes) assert.equal(horsDuSite(relatif), false, relatif);

  /**
   * **Ce que la console n'emporte plus, et c'est le sujet de ce tour.**
   *
   * Elle a porté la chaîne entière des mails — lire un `.msg`, l'inventorier,
   * le convoyer, en tirer une chronologie, la mesurer — plus le lecteur de PDF
   * et pdf.js. Cette liste est le garde-fou qui dit quand elle recommence : une
   * console qui sait déplier un mail est une seconde application.
   *
   * Ce n'est **pas** un test qui lit du code comme du texte : il porte sur ce
   * que le script emporte pour de vrai, c'est-à-dire sur ce que le navigateur
   * chargera.
   */
  for (const interdit of [
    "un-msg-deplie", "un-zip-deplie", "un-mail-deplie", "le-convoi",
    "linventaire-du-versoir", "episode-dune-archive", "larchive-des",
    "ct-lab-pdf-view", "ligne-de-base", "mesure-du-passe"
  ]) {
    assert.equal(emportes.some((un) => un.includes(interdit)), false, interdit);
  }

  // **Rien de l'orchestration du copilote.** La cloison la garde hors de
  // `apps/web` ; ce test dit qu'elle ne rentre pas non plus par la console.
  for (const interdit of ["catalogue", "note-de-calcul", "predimensionnement", "moteurs"]) {
    assert.equal(emportes.some((un) => un.includes(interdit)), false, interdit);
  }
});

/** Le moteur de pdf.js repart avec le lecteur : il pesait plus que tout le reste. */
test("la console n'emporte plus pdf.js", () => {
  assert.equal(TELS_QUELS.includes("vendor/unpdf"), false);
});

/**
 * **La console ne se sert pas dans la page des utilisateurs.** Ses propres
 * modules n'atteignent `apps/web` que par `partage/`, c'est-à-dire par ce que
 * ce script a emporté : un `../../web/...` fonctionnerait ici et casserait une
 * fois déployé, où les deux sites ne sont plus voisins de la même façon.
 */
test("les modules de la console ne remontent jamais vers apps/web", async () => {
  const consoleDir = path.join(rootDir, "apps", "console", "js");
  for (const nom of ["console.js", "lavatar.js"]) {
    const source = await readFile(path.join(consoleDir, nom), "utf8");
    for (const importe of cheminsImportes(source)) {
      assert.equal(importe.includes("/web/"), false, `${nom} → ${importe}`);
      assert.equal(
        importe.startsWith("./") || importe.startsWith("../partage/"), true,
        `${nom} → ${importe}`
      );
    }
  }
});

/**
 * **Tout ce que la console importe de `partage/` est bien emporté.**
 *
 * ## Le défaut, qui n'a fait tomber absolument rien
 *
 * `lexploitation.js` s'est mis à importer `partage/js/services/la-justesse-de-mdall.js`
 * — un module neuf de `apps/web` — et `RACINES` ne le nommait pas. Le script a
 * emporté ses 49 modules comme d'habitude, `prepare:console` a rendu zéro,
 * `npm test` est passé en entier, et la page aurait cherché au premier clic un
 * fichier qui n'existe pas. Un écran blanc, en production, sans un seul signal.
 *
 * C'est le cas exact où lire des sources comme du texte se justifie : **le
 * défaut est invisible et précis.** Le script ne part pas des fichiers de la
 * console — il part d'une liste —, donc rien ne relie ce que la console demande
 * à ce qu'elle reçoit. Ce test est ce lien.
 *
 * Le test voisin vérifie que la console ne remonte pas vers `apps/web` ; celui-ci
 * vérifie que ce qu'elle demande à `partage/` est là. Les deux moitiés de la même
 * frontière.
 */
test("rien de ce que la console importe de partage/ ne manque", async () => {
  const { readdir } = await import("node:fs/promises");
  const consoleDir = path.join(rootDir, "apps", "console", "js");

  // **Tous les fichiers, et non une liste de noms.** Une liste aurait eu le
  // même défaut que `RACINES` : le module suivant s'y serait ajouté, ou non.
  const fichiers = (await readdir(consoleDir)).filter((un) => un.endsWith(".js"));
  assert.ok(fichiers.length >= 4, `trop peu de fichiers lus dans apps/console/js : ${fichiers}`);

  const emportes = new Set(await lesModulesAEmporter(lireDuSite));
  const telsQuels = TELS_QUELS.map((un) => un.replace(/\/+$/, ""));

  const demandes = [];
  for (const nom of fichiers) {
    const source = await readFile(path.join(consoleDir, nom), "utf8");
    for (const importe of cheminsImportes(source)) {
      if (!importe.startsWith("../partage/")) continue;
      // `../partage/js/services/x.js` demande `js/services/x.js` de apps/web.
      demandes.push([nom, importe.replace("../partage/", "")]);
    }
  }

  assert.ok(demandes.length >= 10,
    `trop peu d'imports de partage/ relevés : ${demandes.length}`);

  for (const [nom, relatif] of demandes) {
    const emporte = emportes.has(relatif)
      || telsQuels.some((un) => relatif === un || relatif.startsWith(`${un}/`));
    assert.ok(emporte,
      `${nom} importe « ${relatif} », que le script n'emporte pas : la page `
      + "chargerait un module absent, et rien d'autre ne le dirait");
  }
});
