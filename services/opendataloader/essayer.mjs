/**
 * Essayer la restitution sur un document, sans rien déployer.
 *
 *     node essayer.mjs mon-compte-rendu.pdf
 *
 * ## Pourquoi ce script existe
 *
 * La question qui décide de tout — **l'outil est-il assez bon sur nos
 * documents ?** — n'a pas besoin d'un serveur, ni d'un hébergeur, ni d'un
 * compte. Elle a besoin d'un PDF et de deux minutes.
 *
 * Ce script convertit le document et écrit le Markdown à côté. On l'ouvre en
 * regard du PDF, et l'on voit tout de suite si les tableaux tiennent, si les
 * titres sont à leur place, si l'ordre est respecté. C'est la seule
 * vérification qui compte, et elle se fait à l'œil.
 *
 * ## Le document ne bouge pas
 *
 * Il est lu là où il est, converti sur place, et rien n'est envoyé nulle part :
 * aucun réseau, aucun modèle, aucune clé. Un compte rendu de chantier réel peut
 * donc passer ici sans qu'il quitte la machine — c'est ce qui permet de juger
 * sur de vrais documents plutôt que sur des imitations.
 *
 * **Ne le rangez pas dans le dépôt pour autant.** Les documents de chantier
 * n'ont rien à faire dans Mdall : ce sont des pièces de projets réels, avec des
 * noms d'entreprises et de personnes dedans.
 */

import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { convert } from "@opendataloader/pdf";
import { REGLAGES } from "./reglages.mjs";

const chemin = process.argv[2];

if (!chemin) {
  console.error("Donnez un PDF :  node essayer.mjs mon-compte-rendu.pdf");
  process.exit(1);
}

const entree = resolve(chemin);
const sortie = join(dirname(entree), `${basename(entree, extname(entree))}.md`);

const dossier = await mkdtemp(join(tmpdir(), "odl-essai-"));

try {
  const dedans = join(dossier, "document.pdf");
  const dehors = join(dossier, "sortie");
  await writeFile(dedans, await readFile(entree));

  console.log(`Restitution de ${basename(entree)}…`);
  // **Les mêmes réglages que le service.** Juger sur d'autres réglages
  // reviendrait à décider de garder ou de jeter l'outil sur un résultat qui
  // n'est pas celui que Mdall recevra (règle 4).
  await convert([dedans], { outputDir: dehors, ...REGLAGES });

  const fichiers = await readdir(dehors);
  const produit = fichiers.find((nom) => nom.endsWith(".md"));
  if (!produit) {
    console.error("Rien n'a été produit. Ce PDF est peut-être un scan : sans OCR, il ne porte aucun texte.");
    process.exit(2);
  }

  const markdown = await readFile(join(dehors, produit), "utf8");
  await writeFile(sortie, markdown);

  // Les quelques nombres qui permettent de comparer un document à l'autre, et
  // une version de l'outil à la suivante.
  const pages = [...markdown.matchAll(/^=== PAGE \d+ ===$/gm)].length;
  const tableaux = [...markdown.matchAll(/^\|[\s:|-]*-[\s:|-]*\|?\s*$/gm)].length;
  const titres = [...markdown.matchAll(/^#{1,6} /gm)].length;

  console.log(`\nÉcrit dans ${sortie}`);
  console.log(`  ${pages} page${pages > 1 ? "s" : ""}`);
  console.log(`  ${titres} titre${titres > 1 ? "s" : ""}`);
  console.log(`  ${tableaux} tableau${tableaux > 1 ? "x" : ""}`);
  console.log(`  ${markdown.length} caractères`);
  console.log("\nOuvrez-le en regard du PDF : les tableaux tiennent-ils ? l'ordre est-il le bon ?");
} finally {
  await rm(dossier, { recursive: true, force: true });
}
