/**
 * Ce qu'un outil de reconstitution rend, ramené à la forme de l'écran.
 *
 * ## Pourquoi un contrat, et pas un branchement direct
 *
 * L'écran compare deux reconstitutions du même document. Pour qu'il puisse les
 * mettre côte à côte, les deux doivent parler la même langue : **une liste de
 * pages, chacune avec son numéro et son Markdown.** C'est la seule forme qui
 * permette d'aligner page par page — et donc de dire *où* les deux divergent
 * plutôt que *combien*.
 *
 * L'outil qu'on branche derrière n'est pas décidé ici. Aujourd'hui c'est
 * [OpenDataLoader PDF](https://github.com/opendataloader-project/opendataloader-pdf)
 * qui tient la corde — Apache-2.0, sans modèle, sans GPU, et **sans jeton
 * consommé**, ce qui est tout l'intérêt. Demain ce sera peut-être un autre. Le
 * contrat, lui, ne bouge pas.
 *
 * ## Le contrat
 *
 * Le service répond en JSON :
 *
 *     { "pages": [ { "page": 1, "markdown": "# …" }, … ] }
 *
 * Ou, s'il ne sait rendre qu'un document d'un bloc, en Markdown découpé par des
 * marqueurs de page — la même convention que le texte qu'on envoie au modèle :
 *
 *     === PAGE 1 ===
 *     # …
 *
 * Rien d'autre n'est accepté. Un service qui rendrait un document sans pages
 * serait affiché comme une seule page, et l'alignement n'aurait plus rien à
 * quoi se raccrocher — on afficherait « tout diverge » pour un document
 * identique.
 */

/** Le marqueur de page, le même qu'à l'aller. Un seul endroit le décide. */
const MARQUEUR = /^=== PAGE (\d+) ===$/;

/**
 * Un document d'un bloc, découpé à ses marqueurs de page.
 *
 * Un texte sans aucun marqueur rend une liste **vide**, et non une page unique :
 * un document sans pages ne peut pas être aligné, et le présenter comme une
 * page 1 ferait tout diverger contre l'autre reconstitution (règle 5).
 */
export function pagesDuMarkdown(texte = "") {
  const pages = [];
  let courante = null;

  for (const ligne of String(texte ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const marqueur = ligne.trim().match(MARQUEUR);

    if (marqueur) {
      if (courante) pages.push(courante);
      courante = { page: Number(marqueur[1]), lignes: [] };
      continue;
    }

    courante?.lignes.push(ligne);
  }

  if (courante) pages.push(courante);

  return pages.map((page) => ({
    page: page.page,
    markdown: page.lignes.join("\n").replace(/^\n+/, "").replace(/\s+$/, "")
  }));
}

/**
 * La réponse de l'outil, quelle que soit la forme sous laquelle il la rend.
 *
 * Les pages sont rangées par numéro : un outil qui les rendrait en désordre
 * reconstruirait un document dans lequel on ne retrouverait rien.
 */
export function lireLaReponseDeLoutil(payload) {
  if (Array.isArray(payload?.pages)) {
    const vues = new Set();
    const pages = [];

    for (const page of payload.pages) {
      const numero = Number(page?.page);
      // Une page sans numéro n'a pas de place dans le document, et une page
      // rendue deux fois le doublerait.
      if (!Number.isFinite(numero) || numero <= 0 || vues.has(numero)) continue;
      vues.add(numero);
      pages.push({ page: numero, markdown: String(page?.markdown ?? "") });
    }

    return pages.sort((a, b) => a.page - b.page);
  }

  const brut = typeof payload === "string" ? payload : String(payload?.markdown ?? "");
  return pagesDuMarkdown(brut).sort((a, b) => a.page - b.page);
}
