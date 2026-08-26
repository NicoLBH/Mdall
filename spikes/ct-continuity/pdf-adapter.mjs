/**
 * Spike 1 — Phase B : adaptateur PDF.
 *
 * ÉTAT : non disponible, volontairement.
 *
 * L'extraction PDF de Mdall vit dans une Edge Function Deno
 * (`supabase/functions/extract-pdf-text/index.ts`) qui :
 *   - dépend de `npm:unpdf`, du runtime Deno et du client Supabase ;
 *   - lit un `analysis_run`, télécharge le document depuis le storage, puis
 *     écrit le texte extrait dans la base ;
 *   - appelle `extractText(pdf, { mergePages: true })`, ce qui **fusionne les
 *     pages** : le texte produit ne porte plus aucun numéro de page.
 *
 * Elle n'est donc pas réutilisable depuis un spike Node sans, au choix,
 * ajouter `unpdf` en dépendance du dépôt, ou appeler la fonction déployée —
 * c'est-à-dire toucher à la production. Les deux sont hors du périmètre du
 * Spike 1.
 *
 * Conséquence assumée : le spike travaille sur du texte déjà extrait, fourni
 * par la fixture (`content_ref`, ou `pages_ref` pour conserver la pagination).
 * La provenance à la page n'est mesurable que sur des fixtures paginées.
 *
 * Le jour où un adaptateur sera écrit, il devra respecter ce contrat.
 */

export class PdfAdapterUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "PdfAdapterUnavailableError";
  }
}

/**
 * Contrat attendu d'un futur adaptateur.
 *
 * @typedef {object} PdfAdapter
 * @property {(input: {path?: string, bytes?: Uint8Array}) => Promise<{pages: {page: number, text: string}[]}>} extractPages
 *
 * `extractPages` doit rendre une page par page — donc `mergePages: false` —
 * faute de quoi `source_page` reste invérifiable et la métrique
 * `provenance_accuracy` perd son sens.
 */

export const pdfAdapter = {
  available: false,
  reason:
    "L'extraction PDF de production est une Edge Function Deno couplée à Supabase, et fusionne les pages. " +
    "Le spike consomme du texte déjà extrait (content_ref) ou paginé (pages_ref).",

  async extractPages() {
    throw new PdfAdapterUnavailableError(
      "Aucun adaptateur PDF utilisable depuis le spike. Fournir le texte via content_ref ou pages_ref. " +
        "Voir spikes/ct-continuity/README.md, section « Phase B »."
    );
  }
};

export default pdfAdapter;
