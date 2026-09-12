/**
 * Le service de restitution : un PDF entre, ses pages en Markdown sortent.
 *
 * ## Ce qu'il est, et ce qu'il n'est pas
 *
 * Un relais de vingt lignes autour de la ligne de commande
 * [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf)
 * — Apache-2.0. Il ne lit rien lui-même, ne décide rien, ne garde rien : il
 * écrit le PDF reçu dans un dossier temporaire, lance la conversion, relit le
 * Markdown produit, répond, et efface.
 *
 * **Aucun modèle, aucune clé, aucun jeton consommé.** C'est toute la raison
 * d'être de cette colonne : si sa restitution vaut celle du modèle sur des
 * documents réels, l'appel payant disparaît.
 *
 * ## Pourquoi un service à part, et pas une fonction Supabase
 *
 * La conversion est écrite en Java, et le paquet npm n'est qu'une enveloppe
 * autour de son exécutable. Deno n'a pas de machine virtuelle Java, et
 * GitHub Pages encore moins. Il faut donc un conteneur, et c'est le seul
 * morceau de Mdall qui en demande un.
 *
 * ## Le contrat
 *
 *     POST /            Content-Type: application/pdf      →  { "markdown": "…" }
 *     GET  /sante                                          →  { "ok": true }
 *
 * Le Markdown rendu porte ses marqueurs de page — `=== PAGE 1 ===` — et c'est
 * `reconstituer-par-loutil` qui le découpe, avec le seul analyseur qui existe
 * pour cela. Le découper **aussi** ici ferait deux analyseurs pour une seule
 * convention, et ils finiraient par ne plus dire la même chose (règle 4).
 *
 * ## Ce qu'il ne fait pas, et qu'il ne doit pas faire
 *
 * Il n'authentifie personne. **Il ne doit donc jamais être exposé sur
 * l'internet public** : seule la fonction `reconstituer-par-loutil` l'appelle,
 * et c'est elle qui tient la porte. Un service ouvert serait une conversion de
 * PDF gratuite offerte au monde entier, sur votre facture.
 */

import { createServer } from "node:http";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convert } from "@opendataloader/pdf";

const PORT = Number(process.env.PORT) || 8080;

/** Au-delà, on refuse plutôt que de remplir le disque du conteneur. */
const POIDS_MAXIMUM = 40 * 1024 * 1024;

/**
 * Le marqueur de page.
 *
 * `%page-number%` est remplacé par la ligne de commande. La forme est celle
 * que Mdall emploie partout ailleurs pour découper un document en pages.
 */
const MARQUEUR = "=== PAGE %page-number% ===";

function json(reponse, corps, status = 200) {
  const dit = JSON.stringify(corps);
  reponse.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(dit)
  });
  reponse.end(dit);
}

/** Le corps de la requête, ou `null` s'il dépasse le poids accepté. */
async function corpsDeLaRequete(requete) {
  const morceaux = [];
  let poids = 0;

  for await (const morceau of requete) {
    poids += morceau.length;
    if (poids > POIDS_MAXIMUM) return null;
    morceaux.push(morceau);
  }

  return Buffer.concat(morceaux);
}

/**
 * Convertir un PDF, une fois.
 *
 * Le dossier temporaire est effacé quoi qu'il arrive : un conteneur qui garde
 * les documents qu'il a convertis est un conteneur qui finit par les perdre
 * quelque part.
 */
async function restituer(pdf) {
  const dossier = await mkdtemp(join(tmpdir(), "odl-"));

  try {
    const entree = join(dossier, "document.pdf");
    const sortie = join(dossier, "sortie");
    await writeFile(entree, pdf);

    await convert([entree], {
      outputDir: sortie,
      format: "markdown",
      markdownPageSeparator: MARQUEUR,
      // Les images ne servent à rien ici : on compare du texte, et les écrire
      // remplirait le dossier temporaire pour rien.
      imageOutput: "off",
      // Les tableaux sont la moitié d'un compte rendu de chantier. `cluster`
      // rattrape ceux qui n'ont pas de bordures — imparfaitement, mais mieux
      // que de les rendre en liste à puces.
      tableMethod: "cluster",
      headingHierarchy: true,
      quiet: true
    });

    const fichiers = await readdir(sortie);
    const markdown = fichiers.find((nom) => nom.endsWith(".md"));
    if (!markdown) return "";

    return await readFile(join(sortie, markdown), "utf8");
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

const serveur = createServer(async (requete, reponse) => {
  try {
    if (requete.method === "GET" && requete.url === "/sante") {
      return json(reponse, { ok: true });
    }

    if (requete.method !== "POST") {
      return json(reponse, { error: "Method not allowed" }, 405);
    }

    const pdf = await corpsDeLaRequete(requete);
    if (pdf === null) return json(reponse, { error: "pdf too large" }, 413);
    if (!pdf.length) return json(reponse, { error: "a pdf body is required" }, 400);

    const markdown = await restituer(pdf);

    // Rien rendu se dit, et ne se remplace pas par un document vide : un
    // document vide se lirait « ce PDF ne contient rien ».
    if (!markdown.trim()) return json(reponse, { error: "no markdown produced" }, 502);

    return json(reponse, { markdown });
  } catch (erreur) {
    console.error("[opendataloader] la conversion a échoué", erreur);
    return json(reponse, { error: "conversion failed", details: String(erreur?.message ?? erreur) }, 500);
  }
});

serveur.listen(PORT, () => {
  console.log(`[opendataloader] à l'écoute sur le port ${PORT}`);
});
