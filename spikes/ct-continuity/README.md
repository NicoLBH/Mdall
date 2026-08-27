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

## Lecture des PDF

Deux chemins, une seule bibliothèque : `unpdf`, celle qu'emploie déjà la
fonction Edge `supabase/functions/extract-pdf-text`.

| Chemin | Où | Ce qu'il fait |
| --- | --- | --- |
| `pdf-adapter.mjs` | Node, pour la CLI et les tests | lit un fichier, rend les pages |
| Atelier › Développements › CT Continuity Lab | navigateur | lit les PDF chargés à la main, sans rien envoyer |

Deux différences avec la fonction de production, et elles comptent :

- **`mergePages: false`.** La fonction de production fusionne les pages : le
  texte qu'elle produit ne porte plus aucun numéro de page, et le `source_page`
  stocké en base vient donc de ce que le modèle déclare, sans moyen de le
  vérifier. Ici la pagination est conservée, et `provenance_accuracy` redevient
  une vérification réelle.
- **Aucun accès à Supabase.** Ni `analysis_run`, ni storage, ni écriture en base.

Côté navigateur, `unpdf` et le sous-ensemble pur du moteur sont copiés dans
`apps/web/vendor/` par `npm run build:web`. Le moteur n'est donc versionné qu'à
un seul endroit — ici — et le laboratoire exécute exactement le code que
`npm run test:spikes` couvre.

## Le laboratoire de l'Atelier

`Atelier › Développements › CT Continuity Lab` sert à passer de vrais rapports
sans écrire une ligne de ground truth au préalable :

1. dix boutons « Ajouter rapport N », dans l'ordre chronologique ;
2. extraction locale, puis exécution du moteur ;
3. un tableau référence × rapport, chaque case cliquable montrant sa provenance,
   ses deux confiances et sa méthode de rapprochement ;
4. les indicateurs auto-vérifiables et les garde-fous ;
5. un export du cas au format `mdall.spike.case/1`, pages incluses.

### Quand rien ne sort

C'est le cas normal au premier contact avec un corpus réel, et la page est
outillée pour ça :

- **Texte extrait** — le texte page par page, tel que le moteur le reçoit, avec
  le nombre de lignes reconnues par les motifs. Vide ⇒ le PDF est une image.
  Plein mais zéro ligne reconnue ⇒ ce sont les motifs qu'il faut corriger, et la
  page le dit plutôt que d'afficher des `NOT_FOUND` qui n'apprendraient rien.
- **Motifs d'extraction** — motifs et lexique éditables dans la page, appliqués
  à chaud. Un motif est refusé s'il ne compile pas ou s'il lui manque
  `(?<reference>…)` et `(?<rest>…)`/`(?<opinion>…)`.
- **Export du texte** — pour analyser une mise en page hors ligne.

Les motifs par défaut couvrent trois mises en page (`Avis n° 65 : …`, tableau à
séparateurs, et `2.1.3 Défavorable …`). Le troisième exige une **formulation
d'avis connue** : sans cette contrainte, toute ligne commençant par un nombre
deviendrait un faux avis — « 12.5 m de hauteur » en tête.

Trois mises en page ne font pas une couverture. Chaque organisme rencontré
demandera de vérifier, et souvent d'ajouter un motif.

**Ce que le laboratoire n'affiche pas : precision et recall.** Ils exigent une
ground truth annotée à la main ; sans elle, ces chiffres n'existent pas et le
laboratoire n'en invente aucun. Ce qu'il montre à la place se vérifie seul
contre les PDF chargés : provenance retrouvée à la page, proportion d'avis
reconnus par le lexique, abstentions, violations de garde-fou, et des alertes
d'extraction — dont celle qui compte le plus : *un rapport dont rien n'a été
extrait produit des `NOT_FOUND` qui sont des artefacts, pas des informations.*

L'export ne contient que la couche source. L'interprétation produite par le
moteur ne doit jamais être recyclée en ground truth : c'est ce qu'on cherche
justement à évaluer.

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
3. **Le laboratoire ne mesure pas la justesse.** Il montre ce que le moteur a
   compris et ce qui se vérifie tout seul. Conclure demande une ground truth
   annotée puis un run de la CLI.
4. **Aucun rapprochement sémantique.** Une référence renumérotée d'un rapport à
   l'autre est vue comme un `NOT_FOUND` plus un `NEW`. C'est délibéré pour cette
   première version — mesurer d'abord le cas déterministe — et c'est précisément
   ce que le Spike 2 devra affronter.
5. **Le lexique d'avis est court** et français. Une formulation absente du
   lexique donne `opinion_raw: null` : le moteur ne devine pas.
6. **Un rapport qui renumérote intégralement ses avis** produira beaucoup de
   `NOT_FOUND` et de `NEW`. C'est un résultat honnête, pas un bon résultat : ce
   sera le premier signal à surveiller sur corpus réel.
