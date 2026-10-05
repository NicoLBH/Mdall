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
  // Faire passer la batterie de perturbations et le jeu de référence depuis la
  // console. Leurs cœurs vivent dans les services depuis qu'ils servent aux deux
  // côtés ; leur **corpus**, lui, est fait de fichiers, et un fichier ne
  // s'importe pas : `leCorpusDescendu()` l'emporte en module, plus bas.
  "services/les-morceaux-dune-mesure.js",
  // Ce qu'une annotation doit déclarer, et ce qu'on refuse. `passer-le-jeu.js`
  // ne l'importe plus — il reçoit ses annotations —, mais la fonction de bord
  // en a besoin pour mettre en forme celles qui descendent avec le corpus.
  "services/lannotation.js",
  "services/passer-la-batterie.js",
  "services/passer-le-jeu.js",
  "services/un-lecteur-du-serveur.js",
  // Mesurer la justesse depuis la console : la dérive des analyses conservées,
  // et la réduction d'un bilan à des nombres — la serrure qui empêche un contenu
  // de chantier d'entrer dans la console. Les cœurs de mesure vivent dans les
  // services depuis qu'ils servent aux deux côtés : les laisser dans `scripts/`
  // aurait obligé à les recopier au serveur, et deux copies du même calcul
  // donnent deux justesses du même système (règle 4).
  "services/la-derive-des-analyses.js",
  "services/le-depot-dun-bilan.js",
  // Verser des mails : déplier un `.msg`, lire une archive, ranger.
  "services/les-messages-dun-fichier.js",
  "services/le-depouillement.js",
  "services/le-versement-en-ordre.js",
  "services/le-journal-du-depouillement.js",
  // Lire des comptes rendus : la file, la lecture, la proposition.
  "services/la-file-des-comptes-rendus.js",
  // La mécanique de file elle-même, commune aux gestes. Les deux fonctions de bord
  // l'appellent directement : sans ce départ, la fermeture ne la trouverait pas, et
  // l'absence ne se verrait qu'à l'import, en production, au premier réveil.
  "services/la-file-dun-geste.js",
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
  // Ce qu'une lecture de compte rendu garde, et ce qu'on en rouvre. Le
  // navigateur et le serveur gardent la même chose, par le même module : deux
  // versions auraient gardé deux analyses du même écran (règle 4).
  "services/la-lecture-conservee.js",
  // Importé dynamiquement par `atelier-proposition.js` : la fermeture ne le
  // trouve pas en lisant les `from "…"`, et son absence ne se verrait qu'au
  // premier enrichissement d'une proposition ouverte.
  "services/proposition-branche.js",
  /**
   * Lire un rapport de bureau de contrôle : les trois étapes, et ce qu'une
   * lecture garde.
   *
   * **C'est le même orchestrateur que le navigateur exécute.** Les trois appels
   * lui sont passés : l'écran lui donnait les trois services du navigateur, la
   * fonction de bord lui donne les trois fonctions de bord. Une seconde
   * orchestration au serveur aurait lu un rapport autrement sans que rien ne le
   * dise (règle 4).
   */
  "services/lire-un-rapport.js",
  "services/la-lecture-dun-rapport.js",
  // Le registre des familles : la fonction de bord y lit son propre geste, et
  // l'écran y lit le même. Deux listes auraient fait un geste posé par le
  // navigateur que le serveur ne cherche pas (règle 10).
  "services/les-familles-de-document.js"
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

/**
 * Le corpus de mesure, emporté **en module**.
 *
 * ## Pourquoi il ne peut pas rester un dossier de fichiers
 *
 * La batterie de perturbations et le jeu de référence tournent sur deux
 * documents écrits à la main, et deux annotations qui disent ce qu'on en attend.
 * En ligne de commande, les outils les lisent du disque — c'est la forme la plus
 * lisible pour les écrire et les relire.
 *
 * Deno n'a pas ce dossier. Sans cette descente, les deux outils ne pouvaient
 * **pas** se lancer depuis la console : leur corpus n'y existait pas.
 *
 * ## Pourquoi on les génère, et qu'on ne les recopie pas à la main
 *
 * Un corpus recopié aurait divergé au premier document ajouté — et la mesure
 * aurait porté sur un corpus différent de celui qu'on croit, sans que rien ne le
 * dise. La source de vérité reste le dossier ; le module est fabriqué à chaque
 * construction, à partir de lui.
 */
async function leCorpusDescendu() {
  const ouEstLeCorpus = path.join(racine, "scripts", "la-batterie-des-perturbations", "le-corpus");
  const ouSontLesAnnotations = path.join(racine, "scripts", "le-jeu-de-reference", "les-annotations");

  const documents = [];
  for (const nom of (await readdir(ouEstLeCorpus)).filter((un) => un.endsWith(".md")).sort()) {
    documents.push({ nom, contenu: await readFile(path.join(ouEstLeCorpus, nom), "utf8") });
  }

  const annotations = [];
  for (const nom of (await readdir(ouSontLesAnnotations)).filter((un) => un.endsWith(".json")).sort()) {
    annotations.push({
      nom,
      brute: JSON.parse(await readFile(path.join(ouSontLesAnnotations, nom), "utf8"))
    });
  }

  return `/**
 * Le corpus de mesure, descendu au serveur.
 *
 * **Fabriqué par \`scripts/prepare-versement.mjs\`.** Ne pas le modifier à la
 * main : la source est \`scripts/la-batterie-des-perturbations/le-corpus/\` et
 * \`scripts/le-jeu-de-reference/les-annotations/\`, et cette copie est refaite à
 * chaque construction.
 */

/** Les documents de la batterie, tels que le dossier les porte. */
export const LE_CORPUS_DESCENDU = ${JSON.stringify(documents, null, 2)};

/** Les annotations du jeu de référence, telles que le dossier les porte. */
export const LES_ANNOTATIONS_DESCENDUES = ${JSON.stringify(annotations, null, 2)};
`;
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

  // **Le corpus de mesure**, qui est fait de fichiers et non de modules : sans
  // lui, la batterie et le jeu de référence ne peuvent pas se lancer au serveur.
  await writeFile(path.join(vers, "le-corpus-descendu.js"), await leCorpusDescendu(), "utf8");

  const poses = (await readdir(vers)).length;
  console.log(`versement: ${poses} modules descendus vers _shared/versement`);
}

if (process.argv[1] && process.argv[1].endsWith("prepare-versement.mjs")) {
  await principal();
}
