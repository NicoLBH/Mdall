/**
 * **Le projet tourne sur une seule version de Node, et elle est écrite une fois.**
 *
 * ## Le défaut, et il a bloqué un déploiement
 *
 * `deploy-pages.yml` demandait Node 20. Le conteneur de développement sert
 * Node 22. Trois épreuves passaient donc ici et tombaient là-bas — et pas sur une
 * faute du code : `vm.SourceTextModule`, dont `le-banc-des-ecrans` se sert pour
 * évaluer deux cent dix-sept écrans, perd un segment de mémoire sous Node 20,
 * par intermittence. L'enfant mourait d'un SIGSEGV, sans sortie ni erreur, et
 * l'intégration continue disait « le banc n'a rien rendu ».
 *
 * Une version écrite à deux endroits finit par diverger (règle 4), et celle-là
 * l'était à trois : deux ateliers et le conteneur. Elle vit maintenant dans
 * `.nvmrc`, que `actions/setup-node` sait lire.
 *
 * ## Pourquoi on relit du texte
 *
 * Un fichier d'atelier ne s'exécute pas ici et ne se dessine pas. Le défaut est
 * un nombre dans un `yaml` — précisément invisible, et sans autre prise que le
 * texte.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ATELIERS = path.join(RACINE, ".github", "workflows");

const lire = (...morceaux) => readFileSync(path.join(RACINE, ...morceaux), "utf8");

/** La version demandée dans `.nvmrc`, sans son « v » ni ses blancs. */
export function laVersionDeNvmrc(texte = "") {
  return String(texte ?? "").trim().replace(/^v/, "");
}

test("le runtime du projet est déclaré, et c'est un nombre", () => {
  const version = laVersionDeNvmrc(lire(".nvmrc"));
  assert.match(version, /^\d+(\.\d+)*$/, `« .nvmrc » ne dit pas une version : « ${version} »`);
});

/**
 * **`engines` et `.nvmrc` disent la même chose.** `npm` refuse d'installer sous
 * un runtime trop vieux, et l'atelier en choisit un : les deux doivent s'accorder,
 * sinon l'un passe et l'autre tombe.
 */
test("le minimum de package.json accorde la version de .nvmrc", () => {
  const paquet = JSON.parse(lire("package.json"));
  const exige = String(paquet?.engines?.node ?? "");
  assert.ok(exige, "« package.json » ne dit pas sur quel Node le projet tourne");

  const minimum = Number(exige.replace(/[^\d.]/g, "").split(".")[0]);
  const majeure = Number(laVersionDeNvmrc(lire(".nvmrc")).split(".")[0]);

  assert.ok(Number.isFinite(minimum) && Number.isFinite(majeure),
    `versions illisibles : « ${exige} » et « ${laVersionDeNvmrc(lire(".nvmrc"))} »`);
  assert.ok(majeure >= minimum,
    `« .nvmrc » demande Node ${majeure}, et « engines » exige ${minimum} ou plus`);
});

/**
 * **Aucun atelier ne nomme sa propre version.** C'est l'écriture qui a divergé :
 * un nombre dans un `yaml` que personne ne relit en même temps que `.nvmrc`.
 */
test("les ateliers lisent le runtime dans .nvmrc, et ne le réécrivent pas", () => {
  const ateliers = readdirSync(ATELIERS).filter((nom) => /\.ya?ml$/.test(nom));
  assert.ok(ateliers.length, "aucun atelier à relire : cette épreuve ne regarde rien");

  let vus = 0;
  for (const nom of ateliers) {
    const texte = readFileSync(path.join(ATELIERS, nom), "utf8");
    if (!texte.includes("actions/setup-node")) continue;
    vus += 1;

    assert.match(texte, /node-version-file:\s*"?\.nvmrc"?/,
      `${nom} ne lit pas le runtime dans « .nvmrc »`);
    assert.doesNotMatch(texte, /^\s*node-version:\s*\d/m,
      `${nom} écrit sa propre version de Node : elle divergera de « .nvmrc »`);
  }

  // Sans ce compte, un dossier sans atelier passerait en n'ayant rien relu
  // (règle 12).
  assert.ok(vus > 0, "aucun atelier n'installe Node : rien n'a été vérifié");
});
