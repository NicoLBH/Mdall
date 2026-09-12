/**
 * Refaire un document en Markdown, fidèlement.
 *
 * ## Ce que cette consigne demande, et ce qu'elle interdit
 *
 * Elle demande une **transcription structurée**, pas une lecture. Le modèle ne
 * doit rien choisir, rien résumer, rien conclure : il remet en forme ce qui est
 * écrit, dans l'ordre où c'est écrit, avec les tableaux en tableaux et les
 * titres en titres.
 *
 * C'est l'inverse exact de la consigne d'extraction, qui elle demande de
 * juger. Les mélanger donnerait un document déjà interprété, dans lequel on ne
 * pourrait plus distinguer ce que le PDF disait de ce que le modèle en a
 * compris — et c'est précisément cette distinction qu'on vient voir.
 *
 * ## Pourquoi page par page
 *
 * Pour que chaque ligne du résultat puisse être mise en face de la page dont
 * elle sort. Un document rendu d'un bloc obligerait à **demander** au modèle de
 * quelle page vient chaque passage : une provenance déclarée par celui-là même
 * qu'on vérifie ne vérifie rien.
 *
 * Elle vit au serveur avec le reste : la consigne dit ce que Mdall sait lire
 * d'un document de chantier, et cela ne descend pas dans le navigateur.
 */

export const CONSIGNES_DE_RECONSTITUTION = `Tu reçois le texte brut extrait d'un document PDF de chantier (compte rendu de réunion, rapport de bureau de contrôle, CCTP, notice). Il est découpé par des marqueurs "=== PAGE n ===".

Ta tâche : restituer ce document en Markdown, page par page, le plus fidèlement possible.

Règles impératives :
- Ne résume pas. Ne reformule pas. Ne complète pas. Ne corrige pas.
- Reprends les mots du document tels qu'ils sont écrits, y compris les fautes.
- Garde l'ordre exact du document.
- Les nombres, dates, cotes, références, numéros de lot et noms propres se recopient caractère pour caractère.
- Restitue les tableaux en tableaux Markdown (format GitHub, avec la ligne de séparation). Si une cellule est fusionnée, répète sa valeur sur les lignes concernées plutôt que de laisser du vide.
- Restitue les titres en titres (#, ##, ###), les listes en listes, les mentions en gras ou souligné du document en gras Markdown.
- Les en-têtes et pieds de page répétés à chaque page se restituent une seule fois, sur la page où ils apparaissent.
- Si un passage est illisible ou incohérent dans le texte extrait, écris-le tel quel. N'invente pas ce qui manque, et ne signale rien : le document refait ne contient que le document.
- Une page sans contenu lisible rend une chaîne vide.
- Rends une entrée par page reçue, avec son numéro, et aucune page de plus.`;

/** Ce que le modèle doit rendre, et rien d'autre. */
export const SCHEMA_DU_DOCUMENT = {
  name: "document_en_markdown",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      pages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            page: { type: "integer" },
            markdown: { type: "string" }
          },
          required: ["page", "markdown"]
        }
      }
    },
    required: ["pages"]
  }
};

/**
 * Les pages que le texte envoyé au modèle contient réellement.
 *
 * `pagesEnTexte` s'arrête à un plafond de caractères, **en silence** : un CCTP
 * de soixante pages part amputé, et le modèle rendrait alors très fidèlement un
 * document tronqué. On relit donc les marqueurs du texte qui part, plutôt que
 * de refaire le calcul de la coupe — deux calculs finiraient par diverger
 * (règle 4).
 */
export function pagesDuTexte(texte = "") {
  const pages = [];
  for (const trouve of String(texte ?? "").matchAll(/^=== PAGE (\d+) ===$/gm)) {
    pages.push(Number(trouve[1]));
  }
  return pages;
}

/**
 * Ce que le modèle a rendu, ramené à ce qu'on sait vérifier.
 *
 * Une page rendue sous un numéro qu'on n'a pas envoyé est écartée : elle ne
 * peut être confrontée à rien, et la laisser passer ferait afficher comme
 * « document » une page que le document ne contient pas.
 */
export function pagesRefaites(payload, envoyees = []) {
  const connues = new Set(envoyees.map((numero) => Number(numero)));
  const vues = new Set();
  const retenues = [];
  const inconnues = [];

  for (const page of Array.isArray(payload?.pages) ? payload.pages : []) {
    const numero = Number(page?.page);
    const markdown = String(page?.markdown ?? "");

    if (!Number.isFinite(numero) || !connues.has(numero)) {
      inconnues.push(Number.isFinite(numero) ? numero : null);
      continue;
    }
    // Une page rendue deux fois : on garde la première. Les concaténer
    // doublerait le document sans que rien ne l'explique.
    if (vues.has(numero)) continue;

    vues.add(numero);
    retenues.push({ page: numero, markdown });
  }

  return {
    pages: retenues.sort((a, b) => a.page - b.page),
    /** Les pages envoyées dont rien n'est revenu. Se disent : voir règle 5. */
    absentes: envoyees.map((numero) => Number(numero)).filter((numero) => !vues.has(numero)),
    inconnues
  };
}
