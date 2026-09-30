/**
 * Descend au serveur les modules qui savent lire un mail.
 *
 * ## Pourquoi ils doivent y être
 *
 * Déplier un `.msg`, lire une archive, calculer une empreinte : rien de tout
 * cela n'a besoin d'un navigateur. C'était là parce que les octets y étaient.
 * Depuis que le dépôt se fait en file (`202610300001_...`), les octets sont dans
 * le casier et le travail se fait au serveur — il faut donc que la fonction de
 * bord sache lire un mail.
 *
 * ## Pourquoi on copie au lieu de réécrire
 *
 * Une seconde lecture des `.msg` divergerait de la première, et la divergence
 * serait muette : le serveur rangerait un mail que l'Atelier lit autrement, ou
 * l'inverse, et il faudrait comparer deux empreintes pour s'en apercevoir
 * (règle 4). Il n'y a qu'une lecture, elle est éprouvée là où elle vit, et elle
 * est **copiée telle quelle**.
 *
 * ## Le sens de la copie, et pourquoi il est celui-là
 *
 * `prepare-utilitaires.mjs` descend du serveur vers le navigateur, parce que
 * l'orchestration du copilote ne doit pas se lire dans une page. Ici c'est
 * l'inverse : la source de vérité est dans `apps/web/js/services`, où `npm test`
 * l'exerce à chaque tour. Descendre la vérité au serveur l'aurait sortie de la
 * suite d'épreuves — et une lecture de mails qu'on n'éprouve plus est une
 * lecture qu'on ne saura plus corriger.
 *
 * ## Ce qu'elle ne sont pas
 *
 * Versionnées. `.gitignore` les écarte comme les autres copies du build : « la
 * copie qui reste vraie un temps, puis diverge ». Le déploiement les fabrique
 * avant d'envoyer les fonctions.
 */

import { mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const depuis = path.join(racine, "apps", "web", "js");
const vers = path.join(racine, "supabase", "functions", "_shared", "versement");

/**
 * Ce qui descend, et rien d'autre.
 *
 * La liste est la fermeture des imports de `les-messages-dun-fichier.js` et de
 * `le-depouillement.js` : tout ce dont la lecture d'un dépôt a besoin, et qui
 * ne touche ni au réseau ni à l'écran. Un module qui importerait `store.js` ou
 * `auth.js` ne pourrait pas descendre — et la vérification ci-dessous le dit
 * plutôt que de laisser la fonction tomber au premier appel.
 */
const LES_MODULES = [
  "services/creuser-les-dossiers.js",
  "services/decoder-un-mail.js",
  "services/la-ligne-dun-mail.js",
  "services/le-convoi.js",
  "services/le-depouillement.js",
  "services/le-dossier-des-mails.js",
  "services/le-journal-du-depouillement.js",
  "services/le-projet-ou-lon-ecrit.js",
  "services/le-dedoublonnage.js",
  "services/le-fil-des-mails.js",
  "services/ce-quon-cite.js",
  "services/le-jeu-de-caracteres.js",
  "services/le-versement-en-ordre.js",
  "services/une-adresse-lisible.js",
  "services/les-messages-dun-fichier.js",
  "services/nettoyer-le-propos.js",
  "services/trous-dun-mail.js",
  "services/un-mail-deplie.js",
  "services/un-msg-deplie.js",
  "services/un-zip-deplie.js",
  "utils/poids-dit.js",
  "utils/sha256.js"
];

/**
 * Ce qu'un module qui descend n'a pas le droit d'importer.
 *
 * Deno n'a ni `window`, ni `document`, ni la session du navigateur. Un import
 * vers l'un d'eux ne casse pas la copie : il casse la fonction, en production,
 * au premier dépôt — et le message parlera d'un module introuvable, pas de la
 * raison.
 */
const INTERDITS = ["../store.js", "assets/js/auth.js", "/ui/", "/views/"];

async function leTexte(module) {
  return readFile(path.join(depuis, module), "utf8");
}

/** Les imports relatifs d'un module, tels qu'ils sont écrits. */
export function lesImports(source) {
  return [...String(source ?? "").matchAll(/from\s+"([^"]+)"/g)].map((un) => un[1]);
}

/**
 * Le chemin d'un import, une fois les deux dossiers aplatis.
 *
 * Au serveur, tout est dans un seul dossier : `../utils/poids-dit.js` devient
 * `./poids-dit.js`. Réécrire l'import est la seule retouche qu'on s'autorise,
 * et elle est mécanique — la reproduire à la main dans quinze fichiers aurait
 * été la première occasion de diverger.
 */
export function limportAplati(cible) {
  const dit = String(cible ?? "");
  if (!dit.startsWith(".")) return dit;
  return `./${path.basename(dit)}`;
}

/** Le module, prêt à vivre dans un seul dossier. */
export function leModuleAplati(source) {
  return String(source ?? "").replace(
    /from\s+"([^"]+)"/g,
    (_tout, cible) => `from "${limportAplati(cible)}"`
  );
}

async function principal() {
  await rm(vers, { recursive: true, force: true });
  await mkdir(vers, { recursive: true });

  const manques = [];
  for (const module of LES_MODULES) {
    const source = await leTexte(module).catch(() => null);
    if (source === null) { manques.push(module); continue; }

    for (const interdit of INTERDITS) {
      if (source.includes(interdit)) {
        throw new Error(
          `${module} importe « ${interdit} » : il ne peut pas tourner au serveur.`
        );
      }
    }

    // Tout import relatif doit désigner un module de la liste : sinon la copie
    // part avec un trou, et la fonction tombe au premier dépôt.
    for (const cible of lesImports(source).filter((un) => un.startsWith("."))) {
      const nom = path.basename(cible);
      if (!LES_MODULES.some((un) => path.basename(un) === nom)) {
        throw new Error(`${module} importe « ${cible} », qui ne descend pas.`);
      }
    }

    await writeFile(path.join(vers, path.basename(module)), leModuleAplati(source), "utf8");
  }

  if (manques.length) {
    throw new Error(`modules introuvables : ${manques.join(", ")}`);
  }

  const poses = (await readdir(vers)).length;
  console.log(`versement: ${poses} modules descendus vers _shared/versement`);
}

if (process.argv[1] && process.argv[1].endsWith("prepare-versement.mjs")) {
  await principal();
}
