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
 * **Les points de départ**, et la fermeture se calcule.
 *
 * ## Pourquoi elle n'est plus écrite à la main
 *
 * Elle l'était : une liste de quinze noms, et une vérification qui refusait un
 * import ne figurant pas dedans. Cela a tenu tant que le serveur ne savait lire
 * que des mails. La lecture des comptes rendus en demande **cinquante et un** —
 * la proposition, les lots, les labels, les échéances, les fermetures, les
 * unités du métier. Les recopier à la main aurait été la première occasion d'en
 * oublier un, et l'oubli ne se voit qu'en production, au premier appel.
 *
 * On nomme donc ce dont le serveur a besoin, et la fermeture des imports se
 * calcule. C'est le même raisonnement que partout : une valeur écrite à deux
 * endroits finit par diverger (règle 4) — et une liste d'imports est une valeur.
 *
 * ## Deux travaux, un seul dossier
 *
 * Verser des mails et lire des comptes rendus partagent la moitié de leurs
 * modules. Les séparer en deux dossiers aurait copié deux fois `sha256.js`,
 * `assertion-taxonomy.js` et une douzaine d'autres — et deux copies du même
 * fichier dans le même déploiement finissent par ne plus être les mêmes.
 */
export const LES_DEPARTS = [
  // Verser des mails : déplier un `.msg`, lire une archive, ranger.
  "services/les-messages-dun-fichier.js",
  "services/le-depouillement.js",
  "services/le-versement-en-ordre.js",
  "services/le-journal-du-depouillement.js",
  // Lire des comptes rendus : la file, la lecture, la proposition.
  "services/la-file-des-comptes-rendus.js",
  "services/lecture-du-cr.js",
  "services/reconstitution-markdown.js",
  "services/lire-un-fichier-texte.js",
  "services/identite-du-compte-rendu.js",
  "services/liens-du-cr.js",
  "services/proposition-du-cr.js",
  "services/atelier-proposition.js",
  // Les lignes d'une proposition, en colonnes de base. La fonction de bord s'en
  // sert directement : sans ce départ, la fermeture ne le trouverait pas, et la
  // fonction échouerait à l'import, en production, au premier compte rendu.
  "services/les-lignes-dune-proposition.js",
  // Qui réveille le serveur et quand — et le délai au bout duquel une ligne
  // prise est tenue pour abandonnée. Les deux fonctions de bord le lisent là,
  // comme l'écran : deux valeurs auraient fait un écran qui réveille avant que
  // la reprise n'accepte (règle 4).
  "services/reveiller-la-file.js",
  // Importé dynamiquement par `atelier-proposition.js` : la fermeture ne le
  // trouve pas en lisant les `from "…"`, et son absence ne se verrait qu'au
  // premier enrichissement d'une proposition ouverte.
  "services/proposition-branche.js"
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

/**
 * La fermeture des imports, depuis les départs.
 *
 * **Un import introuvable arrête.** Un module manquant ne casse pas la copie :
 * il casse la fonction, en production, au premier appel — et le message parlera
 * d'un module introuvable, pas de la raison.
 */
export async function laFermeture(departs = [], lire = leTexte) {
  const vus = new Set();
  const manques = [];


  const visiter = async (module) => {
    if (vus.has(module)) return;
    vus.add(module);

    const source = await lire(module).catch(() => null);
    if (source === null) { manques.push(module); return; }

    for (const cible of lesImports(source).filter((un) => un.startsWith("."))) {
      await visiter(path.normalize(path.join(path.dirname(module), cible)));
    }
  };

  for (const depart of departs) await visiter(depart);
  const modules = [...vus].sort();

  /**
   * **Deux modules de même nom s'écraseraient**, et c'est la fermeture qui doit
   * le dire.
   *
   * Tout s'aplatit dans un seul dossier au serveur : `utils/sha256.js` et un
   * hypothétique `services/sha256.js` y deviendraient le même fichier, et le
   * second effacerait le premier. La fonction appellerait alors la mauvaise,
   * sans que rien ne lève.
   *
   * Le relevé vivait dans le script, hors de portée des épreuves : un cassage
   * l'a retiré sans qu'aucune ne bouge. Il est rendu ici, avec le reste.
   */
  return { modules, manques, heurts: lesNomsQuiSeHeurtent(modules) };
}

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

/** Les noms de fichier que deux modules se disputent, une fois aplatis. */
export function lesNomsQuiSeHeurtent(modules = []) {
  const par = new Map();
  for (const module of modules) {
    const nom = path.basename(module);
    if (!par.has(nom)) par.set(nom, []);
    par.get(nom).push(module);
  }
  return [...par.values()].filter((siens) => siens.length > 1).map((siens) => siens.join(" et "));
}

async function principal() {
  await rm(vers, { recursive: true, force: true });
  await mkdir(vers, { recursive: true });

  const { modules: LES_MODULES, manques, heurts } = await laFermeture(LES_DEPARTS);
  if (manques.length) {
    throw new Error(`modules introuvables : ${manques.join(", ")}`);
  }
  if (heurts.length) {
    throw new Error(`deux modules portent le même nom : ${heurts.join(" | ")}`);
  }

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

    await writeFile(path.join(vers, path.basename(module)), leModuleAplati(source), "utf8");
  }

  const poses = (await readdir(vers)).length;
  console.log(`versement: ${poses} modules descendus vers _shared/versement`);
}

if (process.argv[1] && process.argv[1].endsWith("prepare-versement.mjs")) {
  await principal();
}
