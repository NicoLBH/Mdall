/**
 * La portée d'un dépôt : il ne porte que ce qu'il apporte.
 *
 * ## Ce qui n'allait pas
 *
 * Ouvrir une proposition relançait l'analyse sur **tout le corpus accepté du
 * projet**, puis comparait le résultat au suivi conservé. Sur une proposition
 * venue de l'Atelier — cinq valeurs de neige et de vent, aucun document —,
 * l'écran annonçait quatre cent quatre-vingt-neuf changements : les avis de
 * tous les rapports de contrôle du projet, relevés une seconde fois et
 * attribués à un dépôt qui n'y était pour rien.
 *
 * C'est une erreur d'attribution, et c'est la pire espèce. Signer une
 * proposition, c'est **assumer ce qu'elle change**. Lui faire porter le corpus
 * entier fait signer à quelqu'un quatre cent quatre-vingt-neuf décisions qu'il
 * n'a pas prises — et la fusion les aurait versées en mémoire à son nom.
 *
 * ## La règle
 *
 * **Un dépôt ne porte que ce que ses propres livrables disent.** Deux gardes,
 * et elles se complètent :
 *
 * 1. **Aucun livrable exploitable → aucune analyse.** Il n'y a rien à lire, donc
 *    rien à comparer. Relire le corpus pour n'en rien tirer coûtait une minute
 *    et ne pouvait produire que du faux.
 * 2. **Un avis n'appartient au dépôt que s'il a été lu dans l'un de ses
 *    livrables.** Le reste appartient au projet, et le projet le sait déjà.
 *
 * ## Ce qu'on fait de ce qu'on écarte
 *
 * On le compte et on le dit. Un avis mis de côté parce qu'on n'a pas su
 * remonter à son document n'est pas un avis qui n'existe pas : c'est un avis
 * dont on ignore la provenance. Le taire ferait disparaître une lecture ; le
 * garder l'attribuerait à tort. On l'écarte du lot **et on annonce le nombre**.
 *
 * Cela ne vaut évidemment pas pour la réécriture du suivi après une fusion :
 * elle porte, elle, sur le projet tout entier — c'est sa raison d'être.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une analyse regarde. */
export const PORTEE = {
  /** Ce que cette proposition apporte, et rien d'autre. */
  DEPOT: "depot",
  /** Tout le corpus du projet — la réécriture du suivi après une fusion. */
  PROJET: "projet"
};

/**
 * De quel document vient un avis.
 *
 * Le moteur nomme ses sources `doc-1`, `doc-2` — des identifiants de lecture,
 * pas de base. Les rapports portent les deux, et c'est par eux qu'on retombe
 * sur le document réel.
 */
export function documentDeLAvis(avis, reports = []) {
  const parLecture = new Map(
    (Array.isArray(reports) ? reports : [])
      .filter((report) => texte(report?.sourceId))
      .map((report) => [texte(report.sourceId), texte(report.documentId)])
  );

  const source = texte(avis?.sourceId);
  if (!source) return "";
  return parLecture.get(source) || (parLecture.size === 0 ? source : "") || source;
}

/**
 * Ne garder du diff que ce que les livrables du dépôt ont dit.
 *
 * @param {object} diff le diff complet
 * @param {object} options
 * @param {string[]} options.documentIds les livrables du dépôt
 * @param {object[]} options.reports les lectures, pour retrouver les documents
 * @returns {{added: object[], changed: object[], silent: object[],
 *            unchanged: number, horsDepot: number}}
 */
export function limiterAuDepot(diff = {}, { documentIds = [], reports = [] } = {}) {
  const siens = new Set((Array.isArray(documentIds) ? documentIds : []).map(texte).filter(Boolean));
  if (siens.size === 0) {
    return { added: [], changed: [], silent: [], unchanged: 0,
      horsDepot: (diff.added ?? []).length + (diff.changed ?? []).length };
  }

  let horsDepot = 0;
  const garder = (liste) => (Array.isArray(liste) ? liste : []).filter((avis) => {
    if (siens.has(documentDeLAvis(avis, reports))) return true;
    horsDepot += 1;
    return false;
  });

  const added = garder(diff.added);
  const changed = garder(diff.changed);

  return {
    added,
    changed,
    // Le silence porte sur le corpus, pas sur le dépôt : un avis qu'aucun
    // livrable du lot ne reprend est justement celui dont le lot ne parle pas.
    // Le restreindre aux documents du dépôt viderait la liste de son sens.
    silent: diff.silent ?? [],
    unchanged: diff.unchanged ?? 0,
    horsDepot
  };
}

/**
 * Ce qu'un dépôt a de lisible.
 *
 * Un dépôt sans livrable exploitable n'a rien à faire relire. Le dire ici plutôt
 * qu'au bout d'une minute de lecture évite une analyse qui ne peut produire que
 * du faux.
 */
export function riensALire(soumisExploitables = []) {
  return !Array.isArray(soumisExploitables) || soumisExploitables.length === 0;
}
