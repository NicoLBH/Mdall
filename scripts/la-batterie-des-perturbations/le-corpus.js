/**
 * Le corpus — **des documents inventés, qui portent les difficultés réelles.**
 *
 * ## Aucune matière de chantier, jamais
 *
 * Pas un mot d'un document réel n'entre dans le dépôt : ni nom de personne, ni
 * nom d'entreprise, ni commune, ni référence d'affaire. Les documents du corpus
 * sont écrits de bout en bout, et les noms qu'ils portent — VERIFAS, NOVACLIM,
 * BERTRAND, GLOBALIS, Montholon (89110) — n'existent pas.
 *
 * Ce n'est pas une précaution de confort. Un corpus de mesure se lit, se copie,
 * se cite dans un rapport ; un document réel qui y entre en sort.
 *
 * ## Ce que « porter les difficultés réelles » veut dire
 *
 * Un corpus de documents faciles mesure une lecture facile. Ceux-ci portent donc
 * ce qui casse : une marque « SO » qui ne veut rien dire hors de sa légende, un
 * avis dont le constat tient en deux phrases dont la seconde contredit la
 * première si on la lit seule, une observation qui dit explicitement qu'une
 * absence ne vaut pas avis favorable, des dates au format court, et des tableaux
 * assez longs pour qu'une coupure de page tombe en leur milieu.
 *
 * ## La famille se déclare dans le document
 *
 * En tête, dans un commentaire Markdown : `<!-- famille: rapports -->`. Un
 * fichier posé dans le dossier sans elle est refusé, et non rangé sous une
 * famille par défaut — une lecture de compte rendu passée au lecteur de rapports
 * rendrait un résultat, et il serait faux.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LES_FAMILLES_PROJETEES } from "../la-mesure-des-analyses/lempreinte-dune-lecture.js";

const ICI = dirname(fileURLToPath(import.meta.url));
export const OU_EST_LE_CORPUS = join(ICI, "le-corpus");

const texte = (valeur) => String(valeur ?? "").trim();

/** La famille qu'un document déclare en tête, ou `""`. */
export function laFamilleDeclaree(doc = "") {
  const dit = String(doc ?? "").match(/<!--\s*famille:\s*([a-z_]+)\s*-->/i);
  return texte(dit?.[1]);
}

/**
 * Le corpus, lu du disque.
 *
 * @throws si un document ne déclare pas sa famille, ou en déclare une que la
 *   batterie ne sait pas projeter. **Lever plutôt que sauter** : un corpus qui
 *   rétrécit en silence rend un bilan sur moins de documents qu'on ne croit.
 */
export function leCorpus(ou = OU_EST_LE_CORPUS) {
  return readdirSync(ou)
    .filter((nom) => nom.endsWith(".md"))
    .sort()
    .map((nom) => {
      const contenu = readFileSync(join(ou, nom), "utf8");
      const famille = laFamilleDeclaree(contenu);

      if (!famille) {
        throw new Error(`« ${nom} » ne déclare pas sa famille : ajoutez `
          + "`<!-- famille: … -->` en tête.");
      }
      if (!LES_FAMILLES_PROJETEES.includes(famille)) {
        throw new Error(`« ${nom} » déclare la famille « ${famille} », que la `
          + `batterie ne sait pas projeter (elle sait : ${LES_FAMILLES_PROJETEES.join(", ")}).`);
      }

      return { nom, famille, texte: contenu };
    });
}
