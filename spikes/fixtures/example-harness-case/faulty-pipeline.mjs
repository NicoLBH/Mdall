/**
 * Pipeline volontairement fautif — sert uniquement aux tests du harness.
 *
 * Il commet les quatre fautes que le cadrage interdit :
 *  1. conclure une levée à partir d'une absence (doc-b:item-67) ;
 *  2. trancher un cas ambigu comme s'il était certain (doc-a:item-67) ;
 *  3. citer un extrait qui n'existe pas dans la source (doc-b:item-66) ;
 *  4. affirmer sans provenance (doc-a:item-65).
 *
 * Le harness doit faire remonter ces quatre fautes individuellement.
 */

export const faultyPipeline = {
  id: "harness-selfcheck-faulty",
  version: "0.1.0",
  description: "Pipeline fautif de référence pour les tests de garde-fous.",

  async run() {
    return {
      predictions: [
        {
          key: "doc-a:item-65",
          kind: "demo_extraction",
          state: "PREDICTED",
          confidence: 0.95,
          value: { status_raw: "à préciser — attente de la note de calcul." },
          provenance: null
        },
        {
          key: "doc-a:item-67",
          kind: "demo_extraction",
          state: "PREDICTED",
          confidence: 0.4,
          value: { status_raw: "formulation dupliquée, première occurrence." },
          candidates: [{ status_raw: "première occurrence" }, { status_raw: "seconde occurrence" }],
          provenance: {
            source_id: "doc-a",
            excerpt: "ITEM 67 : formulation dupliquée, première occurrence."
          }
        },
        {
          key: "doc-b:item-66",
          kind: "demo_extraction",
          state: "PREDICTED",
          confidence: 0.88,
          value: { status_raw: "favorable." },
          provenance: { source_id: "doc-b", excerpt: "ITEM 66 : favorable sous réserve du PV" }
        },
        {
          key: "doc-b:item-67",
          kind: "demo_extraction",
          state: "PREDICTED",
          confidence: 0.7,
          value: { status_raw: "levé" },
          derived_from_absence: true,
          provenance: { source_id: "doc-b", excerpt: "ITEM 66 : favorable." }
        }
      ],
      notes: "Pipeline fautif de test."
    };
  }
};

export default faultyPipeline;
