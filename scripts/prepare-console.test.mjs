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

test("le parcours réel de la console ne sort pas du site et emporte son lecteur de .msg", async () => {
  const emportes = await lesModulesAEmporter(lireDuSite);

  assert.equal(emportes.includes("js/services/un-msg-deplie.js"), true);
  // Le lecteur de `.msg` s'appuie sur celui des `.eml` : s'il ne suivait pas,
  // la console tomberait à l'ouverture du premier fichier.
  assert.equal(emportes.includes("js/services/un-mail-deplie.js"), true);
  assert.equal(emportes.includes("js/services/trous-dun-mail.js"), true);
  assert.equal(emportes.includes("assets/js/auth.js"), true);

  for (const relatif of emportes) assert.equal(horsDuSite(relatif), false, relatif);

  // **Rien de l'orchestration du copilote.** La cloison la garde hors de
  // `apps/web` ; ce test dit qu'elle ne rentre pas non plus par la console.
  for (const interdit of ["catalogue", "note-de-calcul", "predimensionnement", "moteurs"]) {
    assert.equal(emportes.some((un) => un.includes(interdit)), false, interdit);
  }
});

/**
 * **La console ne se sert pas dans la page des utilisateurs.** Ses propres
 * modules n'atteignent `apps/web` que par `partage/`, c'est-à-dire par ce que
 * ce script a emporté : un `../../web/...` fonctionnerait ici et casserait une
 * fois déployé, où les deux sites ne sont plus voisins de la même façon.
 */
test("les modules de la console ne remontent jamais vers apps/web", async () => {
  const consoleDir = path.join(rootDir, "apps", "console", "js");
  for (const nom of ["console.js", "le-versoir.js"]) {
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
 * **Ce que le versoir dessine.**
 *
 * On lit sa source, comme pour la barre du haut : cette page parle au disque et
 * au DOM, et ne s'importe pas hors d'un navigateur. Deux défauts seraient
 * muets, et l'un des deux a bel et bien été écrit avant d'être vu à l'écran.
 */
test("le versoir montre les documents un par un, et les signatures en une ligne", async () => {
  const source = await readFile(
    new URL("../apps/console/js/le-versoir.js", import.meta.url), "utf8");

  const message = source.slice(
    source.indexOf("function renderUnMessage(un)"),
    source.indexOf("function renderLInventaire(")
  );

  // Les documents se détaillent : c'est ce qu'on est venu voir.
  assert.match(message, /un\.documents\.map\(renderUnePiece\)/);
  // Les vignettes, jamais une par une : sur le message réel, elles étaient huit
  // et remplissaient l'écran, au milieu duquel un plan se serait perdu.
  assert.doesNotMatch(message, /un\.vignettes\.map/);
  assert.match(message, /renderLesVignettes\(un\)/);

  // Et elles ne sont pas « écartées » : rien n'est jeté, c'est tout le principe
  // de cette page — la phrase le disait, et c'était faux.
  const vignettes = source.slice(
    source.indexOf("function renderLesVignettes(un)"),
    source.indexOf("function renderUnMessage(un)")
  );
  assert.match(vignettes, /gardées/);
  assert.doesNotMatch(vignettes, /écart/);

  // **Rien ne part de cet écran de lui-même.** Il ne parle à personne : pas de
  // `fetch`, pas de client de base. Le seul départ possible est le versement,
  // et il passe par un service nommé, sur un clic.
  // On regarde le corps, imports retirés : le nom d'un service qui parle à la
  // base contient « supabase », et ce n'est pas lui qu'on cherche.
  const corps = source.replace(/^import[\s\S]*?from\s*"[^"]*";$/gm, "");
  assert.doesNotMatch(corps, /\bfetch\(|\bsupabase\.|\.upload\(|XMLHttpRequest/);
  assert.match(source, /verserLesPieces/);
  assert.match(source, /#versoirVerser/);
});

/**
 * **Verser est un geste explicite.**
 *
 * Verser au fil du dépôt aurait été plus court d'un clic, et faux : on ouvre
 * cent archives pour regarder ce qu'elles portent, et toutes ne méritent pas
 * d'être gardées.
 */
test("le versoir ne verse que sur un clic, et dit ce qu'il n'a pas pu faire", async () => {
  const source = await readFile(
    new URL("../apps/console/js/le-versoir.js", import.meta.url), "utf8");

  // La lecture d'un fichier ne verse rien : seul le gestionnaire du bouton le fait.
  const lecture = source.slice(source.indexOf("const lire = async (fichiers)"),
    source.indexOf("choisir?.addEventListener"));
  assert.doesNotMatch(lecture, /verserLesPieces/);

  const geste = source.slice(source.indexOf('closest?.("#versoirVerser")'));
  assert.match(geste, /verserLesPieces\(pieces\)/);
  // Le bouton se désarme : cinq mégaoctets par plan, et un second clic
  // relancerait tout.
  assert.match(geste, /bouton\.disabled = true/);
  // Une archive qu'on n'a pas pu lire ne se dit pas « rien à verser ».
  assert.match(geste, /fait\.lu/);
});

/**
 * **Le lecteur de PDF n'est pas réécrit.**
 *
 * C'est celui de l'onglet Documents et du copilote, emporté tel quel. Un second
 * lecteur aurait divergé du premier au premier correctif (règle 4), et il aurait
 * fallu recalibrer toutes ses classes.
 */
test("l'archive ouvre ses PDF avec le lecteur de Mdall, pas avec le sien", async () => {
  const source = await readFile(
    new URL("../apps/console/js/larchive.js", import.meta.url), "utf8");

  assert.match(source, /import\("\.\.\/partage\/js\/services\/ct-lab-pdf-view\.js"\)/);
  assert.match(source, /renderPdfDocument\(/);
  // Aucun rendu écrit ici : pas de canevas, pas de pdf.js en direct.
  assert.doesNotMatch(source, /getDocument|createElement\("canvas"\)|getContext\(/);
  // Et il dessine dans les classes que la feuille de style porte déjà.
  assert.match(source, /documents-pdf-viewer__pages/);

  // **Les octets ne descendent que pour la pièce qu'on ouvre.** Une archive de
  // cent mille pièces ne se télécharge pas pour afficher une liste : rien, ni
  // au dessin de la liste ni à son montage, ne les réclame — seul le
  // gestionnaire du clic le fait.
  const avantLeClic = source.slice(source.indexOf("function renderLaListe("),
    source.indexOf("liste.addEventListener"));
  assert.doesNotMatch(avantLeClic, /octetsDeLaPiece/);

  const auClic = source.slice(source.indexOf("liste.addEventListener"));
  assert.match(auClic, /octetsDeLaPiece\(empreinte\)/);
});

/**
 * **pdf.js voyage avec la console, et rien d'autre ne le dit.**
 *
 * Le lecteur le charge par un chemin calculé (`../../vendor/unpdf`), que le
 * parcours des imports ne peut pas voir. Oublier de l'emporter donnerait une
 * console qui s'ouvre, une liste qui s'affiche, et un PDF qui refuse de
 * s'ouvrir en demandant de lancer un build — sur un poste où il a déjà tourné.
 */
test("la console emporte le moteur PDF que son lecteur va chercher", async () => {
  assert.equal(TELS_QUELS.includes("vendor/unpdf"), true);

  // Et c'est bien là que le lecteur le cherche : les deux bouts du même fil.
  const lecteur = await readFile(
    new URL("../apps/web/js/services/ct-lab-pdf-view.js", import.meta.url), "utf8");
  assert.match(lecteur, /const VENDOR_BASE = "\.\.\/\.\.\/vendor\/unpdf"/);
});

/**
 * **Un message déjà vu ne se redessine pas.**
 *
 * Dire « 1 message déjà vu » en haut et le dessiner deux fois en dessous ferait
 * lire deux plans là où il y en a un — c'est exactement ce que l'écran faisait
 * avant qu'on le regarde. Et le marquage vient du même passage que le compte,
 * jamais d'un second calcul (règle 4).
 */
test("le versoir replie un message déjà vu au lieu de le redessiner", async () => {
  const source = await readFile(
    new URL("../apps/console/js/le-versoir.js", import.meta.url), "utf8");

  const message = source.slice(
    source.indexOf("function renderUnMessage(un)"),
    source.indexOf("function renderLInventaire(")
  );
  assert.match(message, /if \(un\.dejaVu\) return renderUnMessageDejaVu\(un\);/);

  // Le marquage vient du service, et la liste s'y adosse.
  const inventaire = source.slice(source.indexOf("function renderLInventaire("));
  assert.match(inventaire, /marquerLesRepetitions\(messages\)\.map\(renderUnMessage\)/);

  // Et il n'est pas supprimé : on garde de quoi y revenir.
  const replie = source.slice(
    source.indexOf("function renderUnMessageDejaVu(un)"),
    source.indexOf("function renderUnMessage(un)")
  );
  assert.match(replie, /un\.fichier/);
  assert.match(replie, /déjà vu/);
});
