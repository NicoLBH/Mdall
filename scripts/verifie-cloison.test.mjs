/**
 * La cloison : ce que le navigateur peut lire, et ce qu'il ne peut pas.
 *
 * ## Pourquoi ce test existe
 *
 * L'orchestration du copilote a vécu mille sept cents lignes dans le navigateur.
 * On protégeait le moteur de calcul — l'arithmétique — et l'on publiait la
 * méthode : quels utilitaires existent, quelles phrases décident de les appeler,
 * comment ils s'enchaînent, ce qu'on refuse de laisser inventer au modèle.
 *
 * Rien n'empêche de l'y remettre par distraction : un `import` qui remonte d'un
 * dossier, un module ajouté à la liste des copies publiques. Ce test tient la
 * frontière, et il casse la construction plutôt que la découvrir en lisant un
 * bundle en production.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webDir = path.join(rootDir, "apps", "web");
const utilitairesDir = path.join(rootDir, "supabase", "functions", "_shared", "utilitaires");

/**
 * Ce qui ne doit jamais être servi par le site.
 *
 * La comparaison porte sur le **contenu**, pas sur le nom : `catalogue.js`
 * existe aussi du côté des déductions, et il n'a rien à voir. Ce qu'on cherche,
 * c'est une copie — où qu'elle soit et quel que soit son nom.
 */
const SECRETS = ["catalogue.js", "note-de-calcul.js", "predimensionnement.js", "lire-la-note.js", "moteurs.js"];

/** Une empreinte insensible à la mise en forme, pour reconnaître une copie. */
function empreinte(source) {
  return source.replace(/\s+/g, " ").trim();
}

async function fichiersDe(dossier, filtre = () => true) {
  const trouves = [];
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...await fichiersDe(chemin, filtre));
    else if (filtre(chemin)) trouves.push(chemin);
  }
  return trouves;
}

test("aucun module d'orchestration n'est servi par le site", async () => {
  const interdits = new Map();
  for (const nom of SECRETS) {
    interdits.set(empreinte(await readFile(path.join(utilitairesDir, nom), "utf8")), nom);
  }

  const servis = await fichiersDe(webDir, (f) => f.endsWith(".js") || f.endsWith(".mjs"));
  const fautifs = [];

  for (const fichier of servis) {
    const copie = interdits.get(empreinte(await readFile(fichier, "utf8")));
    if (copie) fautifs.push(`${path.relative(rootDir, fichier)} est une copie de ${copie}`);
  }

  assert.deepEqual(fautifs, [], "ces modules seraient lisibles avec F12");
});

test("aucun fichier du site ne remonte vers les utilitaires du serveur", async () => {
  // Un `import "../../../supabase/functions/..."` serait suivi par le
  // navigateur : le module partirait avec la page.
  const servis = await fichiersDe(webDir, (f) => f.endsWith(".js") || f.endsWith(".mjs"));
  const fautifs = [];

  for (const fichier of servis) {
    const source = await readFile(fichier, "utf8");
    if (/from\s+["'][^"']*supabase\/functions/.test(source) || /import\(["'][^"']*supabase\/functions/.test(source)) {
      fautifs.push(path.relative(rootDir, fichier));
    }
  }

  assert.deepEqual(fautifs, []);
});

test("les modules d'orchestration ne dépendent de rien qui vienne du navigateur", async () => {
  // L'inverse compte aussi : un utilitaire qui importerait un service du site
  // ne se déploierait pas, et l'on ne s'en apercevrait qu'en production.
  const modules = await fichiersDe(utilitairesDir, (f) => f.endsWith(".js"));
  const fautifs = [];

  for (const fichier of modules) {
    const source = await readFile(fichier, "utf8");
    if (/from\s+["'][^"']*apps\/web/.test(source) || /import\(["'][^"']*apps\/web/.test(source)) {
      fautifs.push(path.relative(rootDir, fichier));
    }
  }

  assert.deepEqual(fautifs, []);
});
