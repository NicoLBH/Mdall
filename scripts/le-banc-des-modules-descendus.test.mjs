/**
 * **Chaque module descendu se charge pour de vrai.**
 *
 * ## Le défaut que ce banc existe pour attraper
 *
 * Les modules de `apps/web/js` sont copiés vers `_shared/versement` et leurs
 * imports **réécrits** : `../utils/sha256.js` devient `./sha256.js`. La copie
 * est vérifiée au caractère près — mais au caractère près d'une réécriture qui
 * peut parfaitement être fausse.
 *
 * Un import qui ne désigne rien ne casse pas la copie : il casse la **fonction
 * de bord**, en production, au premier appel. Et le message parlera d'un module
 * introuvable, pas de la raison.
 *
 * La fermeture est maintenant calculée et compte quatre-vingt-treize modules.
 * Une liste de quinze noms se relisait ; quatre-vingt-treize, non.
 *
 * ## Ce qu'on éprouve, et ce qu'on n'éprouve pas
 *
 * Que le graphe **se résout** et que chaque corps de premier niveau s'exécute
 * sans lever. C'est du JavaScript ordinaire : Node le charge aussi bien que
 * Deno. Ce qui diffère entre les deux — `Deno.env`, les imports `npm:` — vit
 * dans la fonction de bord elle-même, pas dans ce qui descend.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COPIE = path.join(RACINE, "supabase", "functions", "_shared", "versement");

const sansCopie = !existsSync(COPIE) && "la copie n'a pas été faite (npm run prepare:versement)";

test("chaque module descendu se charge", { skip: sansCopie }, async () => {
  const fautes = [];
  const modules = readdirSync(COPIE).filter((nom) => nom.endsWith(".js")).sort();

  for (const nom of modules) {
    try {
      await import(pathToFileURL(path.join(COPIE, nom)).href);
    } catch (erreur) {
      fautes.push(`${nom} — ${erreur?.message ?? erreur}`);
    }
  }

  assert.deepEqual(fautes, [],
    `ces modules ne se chargeraient pas au serveur :\n${fautes.join("\n")}`);
});

/**
 * **Le compte est une garde, pas une décoration.** Un dossier vide rendrait une
 * liste de fautes vide, et l'épreuve passerait en n'ayant rien chargé du tout
 * (règle 12).
 */
test("le banc a bien chargé les modules", { skip: sansCopie }, () => {
  const modules = readdirSync(COPIE).filter((nom) => nom.endsWith(".js"));
  assert.ok(modules.length > 50, `trop peu de modules descendus : ${modules.length}`);
});

/**
 * **Ce que les fonctions de bord demandent nommément doit s'y trouver.**
 *
 * Elles importent ces noms-là, un par un. Un export renommé dans le service — ce
 * qui est arrivé deux fois à l'Atelier — ne casse ni la copie ni le chargement :
 * il casse l'appel, au premier compte rendu.
 *
 * **La liste n'est plus écrite à la main.** Elle l'était, et elle a dérivé : un
 * module ajouté aux imports d'une fonction de bord n'y entrait que si l'on
 * pensait à l'y mettre, c'est-à-dire exactement quand on n'en avait pas besoin.
 * Elle se lit maintenant dans les `import` eux-mêmes (règle 4).
 */

/** Ce qu'une fonction de bord importe de la copie, lu dans sa source. */
export function cequElleImporte(source = "") {
  const demandes = new Map();
  const motif = /import\s*\{([^}]*)\}\s*from\s*"\.\.\/_shared\/versement\/([^"]+)"/g;

  for (const [, dedans, nom] of String(source ?? "").matchAll(motif)) {
    const noms = dedans
      .split(",")
      .map((un) => un.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    const deja = demandes.get(nom) ?? [];
    demandes.set(nom, [...deja, ...noms]);
  }

  return demandes;
}

test("les fonctions de bord trouvent ce qu'elles importent", { skip: sansCopie }, async () => {
  const bord = path.join(RACINE, "supabase", "functions");
  const fonctions = readdirSync(bord, { withFileTypes: true })
    .filter((une) => une.isDirectory() && !une.name.startsWith("_"))
    .map((une) => path.join(bord, une.name, "index.ts"))
    .filter((un) => existsSync(un));

  const fautes = [];
  let demandes = 0;

  for (const fichier of fonctions) {
    const source = readFileSync(fichier, "utf8");
    for (const [nom, noms] of cequElleImporte(source)) {
      const chemin = path.join(COPIE, nom);
      if (!existsSync(chemin)) {
        fautes.push(`${path.basename(path.dirname(fichier))} importe « ${nom} », qui n'est pas descendu`);
        continue;
      }
      const module = await import(pathToFileURL(chemin).href);
      for (const attendu of noms) {
        demandes += 1;
        if (module[attendu] === undefined) {
          fautes.push(
            `${path.basename(path.dirname(fichier))} importe « ${attendu} » de « ${nom} », `
            + "qui ne le rend pas : la fonction tomberait à l'appel"
          );
        }
      }
    }
  }

  assert.deepEqual(fautes, [], fautes.join("\n"));

  // **Sans ce compte, une lecture qui ne trouve aucun import passerait.** Zéro
  // demande rend zéro faute, et l'épreuve se prononcerait sur rien (règle 12).
  assert.ok(demandes > 30, `trop peu d'imports relus : ${demandes}`);
});
