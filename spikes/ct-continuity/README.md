# Spike 1 — CT Continuity

**Statut : implémenté, non branché au produit.**

## Question expérimentale

Mdall peut-il reconstruire correctement l'évolution d'un même avis de bureau de
contrôle à travers plusieurs rapports successifs ?

## Ce que ce spike ne fait pas

- aucun contrôle réglementaire : le bureau de contrôle reste l'auteur de l'avis ;
- aucune réinterprétation technique d'un avis ;
- aucun sujet Mdall lu, créé, fermé ou rouvert ;
- aucun mapping « avis favorable = sujet fermé » ;
- aucun rapprochement sémantique entre deux références différentes.

## Lancer

```bash
node spikes/ct-continuity/run.mjs --case spikes/fixtures/ct-continuity-synthetic/case.json
node spikes/ct-continuity/run.mjs --case <…> --dry-run   # n'écrit rien
npm run test:spikes                                       # tests du harness et du spike
```

Le code de sortie vaut 1 si un garde-fou a été violé.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `extraction.mjs` | Phase A — texte d'un rapport → occurrences d'avis |
| `continuity.mjs` | occurrences de plusieurs rapports → états de continuité |
| `pipeline.mjs` | assemble les deux phases en prédictions pour le harness |
| `metrics.mjs` | métriques propres au spike |
| `guards.mjs` | garde-fous propres au contrôle technique |
| `pdf-adapter.mjs` | Phase B — contrat d'adaptateur PDF, **indisponible** |
| `run.mjs` | CLI |

## Phase A — extraction

Chaque occurrence produit :

```jsonc
{
  "external_reference_raw": "65.1",
  "external_reference_normalized": "65-1",
  "opinion_raw": "À préciser",      // la graphie source, jamais réécrite
  "opinion_normalized": "a_preciser", // s'ajoute à la précédente, ne la remplace pas
  "description_raw": "…",
  "source_document_id": "rapport-b",
  "source_page": 2,
  "source_excerpt": "Avis n° 65.1 : À préciser — …",
  "confidence": 0.95,               // confiance de lecture de l'occurrence
  "opinion_confidence": 0.9,        // confiance de reconnaissance de l'avis
  "extraction_state": "EXTRACTED"
}
```

`extraction_state` vaut `EXTRACTED`, `UNKNOWN_OPINION` ou `AMBIGUOUS_REFERENCE`.

**Deux confiances, deux questions** (§8.3). `confidence` répond à « ai-je bien lu
cette occurrence ? », `opinion_confidence` à « ai-je reconnu cet avis ? ». Un avis
non reconnu met la seconde à `null` et laisse la première intacte : `opinion_raw:
null` est une réponse honnête et complète, pas une lecture douteuse. Les mélanger
faisait passer une extraction franche pour un rapprochement hasardeux — c'est un
défaut que le harness a effectivement signalé au premier run.

**Aucune nomenclature d'organisme n'est présumée.** Motifs de ligne et lexique
d'avis sont des paramètres du cas :

```jsonc
"params": {
  "extraction": {
    "patterns": [{ "id": "custom", "source": "^REM\\s+(?<reference>[0-9]+)\\s*>>\\s*(?<rest>.+)$", "flags": "u" }],
    "lexicon": [{ "id": "conforme", "labels": ["conforme"] }]
  }
}
```

Deux mises en page sont reconnues par défaut (`Avis n° 65 : Favorable — …` et
une ligne de tableau `| 66 | Favorable | … |`), et deux seulement : le corpus
réel dira lesquelles ajouter.

## Continuité

Priorité de rapprochement, dans cet ordre :

1. référence externe brute identique → `EXACT_RAW` ;
2. référence normalisable sans ambiguïté → `NORMALIZED` ;
3. sinon → `AMBIGUOUS`, jamais un rapprochement forcé.

États : `NEW`, `MATCHED`, `NOT_FOUND`, `AMBIGUOUS`.
Évolution de l'avis sur un `MATCHED` : `UNCHANGED`, `CHANGED`, `UNKNOWN`.

Deux règles méritent d'être explicites :

- **`NOT_FOUND` ne signifie jamais `CLOSED`.** Une prédiction fondée sur une
  absence porte `derived_from_absence: true` et ne peut affirmer qu'un état non
  conclusif. Le garde-fou le vérifie à chaque run, et la métrique
  `false_closure_count` l'affiche même quand elle vaut 0.
- **Deux avis non reconnus des deux côtés donnent `UNKNOWN`, pas `CHANGED`.**
  Deux formulations différentes que le moteur ne sait pas lire ne prouvent pas un
  changement d'avis.

## Statut source ≠ statut Mdall

Le spike ne produit aucun statut de sujet. Une transition d'avis peut produire
une `experimental_suggestion` — tenue **hors** des prédictions, portant
`applies_mdall_status: false`, et jamais appliquée. Un garde-fou refuse toute
prédiction portant un statut de sujet Mdall.

## Métriques

Aux métriques communes du harness s'ajoutent : `extraction_precision`,
`extraction_recall`, `reference_exact_match_rate`, `opinion_source_fidelity`,
`continuity_precision`, `continuity_recall`, `false_merge_count`,
`false_closure_count`, `provenance_accuracy`, `abstention_count`,
`abstention_correctness`.

`false_merge_count` et `false_closure_count` sont des **effectifs**, pas des taux :
sur un petit corpus, une erreur unitaire compte davantage qu'un pourcentage.

`provenance_accuracy` est une vérification réelle, pas une déclaration : l'extrait
cité doit se trouver dans la source citée, et à la page citée quand la source est
paginée. Une page connaissable et non renseignée compte comme un échec.

## Phase B — adaptateur PDF : indisponible, et pourquoi

L'extraction PDF de Mdall (`supabase/functions/extract-pdf-text/index.ts`) est
une Edge Function Deno qui dépend de `npm:unpdf`, lit un `analysis_run`,
télécharge depuis le storage Supabase et réécrit en base. Elle n'est pas
appelable depuis un spike Node sans ajouter une dépendance au dépôt ou toucher
à la production — les deux sont hors périmètre.

Elle appelle par ailleurs `extractText(pdf, { mergePages: true })` : **les pages
sont fusionnées**, et le texte produit ne porte plus aucun numéro de page. Le
`source_page` stocké aujourd'hui en base vient donc de ce que le modèle déclare,
sans moyen de le vérifier.

Conséquence : le spike consomme du texte déjà extrait. `content_ref` pour du
texte plat, `pages_ref` pour conserver la pagination — et la provenance à la page
n'est mesurable que dans le second cas. Le contrat qu'un futur adaptateur devra
respecter est décrit dans `pdf-adapter.mjs` ; il devra extraire page par page.

## Fixtures

`spikes/fixtures/ct-continuity-synthetic/` est **entièrement inventée** et ne
reproduit la nomenclature d'aucun organisme réel. Elle exerce les dix cas
obligatoires du §28.4 : avis inchangé, avis modifié, favorable après
défavorable, avis nouveau, avis absent du rapport suivant, numérotation
ambiguë, statut non reconnu, texte reformulé, référence mal extraite, plusieurs
avis proches.

Les rapports réels vont dans `spikes/fixtures/private/`, qui est gitignoré.

## Limites connues

1. **Le score sur la fixture synthétique ne prouve rien.** La fixture a été
   écrite en connaissant les motifs d'extraction. 100 % y est le minimum
   attendu, pas un résultat. La seule mesure qui compte viendra de rapports
   réels de plusieurs organismes.
2. **Aucune donnée réelle n'a encore été passée.** Le corpus reste à constituer
   et à annoter à la main.
3. **Pas de lecture PDF** (ci-dessus) : les fixtures sont textuelles.
4. **Aucun rapprochement sémantique.** Une référence renumérotée d'un rapport à
   l'autre est vue comme un `NOT_FOUND` plus un `NEW`. C'est délibéré pour cette
   première version — mesurer d'abord le cas déterministe — et c'est précisément
   ce que le Spike 2 devra affronter.
5. **Le lexique d'avis est court** et français. Une formulation absente du
   lexique donne `opinion_raw: null` : le moteur ne devine pas.
6. **Un rapport qui renumérote intégralement ses avis** produira beaucoup de
   `NOT_FOUND` et de `NEW`. C'est un résultat honnête, pas un bon résultat : ce
   sera le premier signal à surveiller sur corpus réel.
