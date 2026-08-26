# `/spikes` — harness d'expérimentation Mdall

Ce dossier héberge des **spikes** : des expériences destinées à falsifier une
hypothèse produit, pas à devenir discrètement le produit.

Il est isolé du reste du dépôt. Supprimer `spikes/` et la ligne `test:spikes`
de `package.json` retire l'intégralité de l'expérimentation sans toucher à
Mdall.

## Ce que ce dossier ne fait pas

Contraintes tenues par le code de ce dossier, et à tenir par tout spike ajouté :

- aucune migration Supabase, aucune table de production créée ou modifiée ;
- aucune écriture dans les données réelles d'un projet ;
- aucun sujet Mdall créé, fermé ou rouvert automatiquement ;
- aucune intégration dans les vues, le routeur ou le pipeline d'upload ;
- aucun appel automatique sur de vrais projets ;
- aucune modification du comportement de `npm test` ;
- aucun code de production déplacé ici.

Les spikes lisent des fixtures, écrivent dans `spikes/outputs/` et
`spikes/reports/`, et rien d'autre.

## Structure

```
spikes/
├── lib/                          harness commun (code pur, testé)
├── fixtures/                     jeux de données de test
│   ├── example-harness-case/     fixture synthétique de démonstration
│   └── private/                  fixtures réelles — gitignoré
├── outputs/                      enregistrements de run JSON — gitignoré
├── reports/                      rapports Markdown — gitignoré
├── selfcheck.mjs                 vérification de bout en bout du harness
├── ct-continuity/                Spike 1 — implémenté
├── site-minutes-continuity/      Spike 2 — non implémenté
├── email-continuity/             Spike 3 — non implémenté
└── targeted-revision-impact/     Spike 4 — non implémenté
```

## Commandes

```bash
npm run test:spikes          # tests du harness et des spikes (n'affecte pas npm test)
node spikes/selfcheck.mjs    # run de démonstration : écrit outputs/ + reports/
node spikes/selfcheck.mjs --dry-run   # affiche le rapport sans rien écrire

# Spike 1
node spikes/ct-continuity/run.mjs --case spikes/fixtures/ct-continuity-synthetic/case.json
```

`npm test` reste strictement inchangé : il ne parcourt que `apps/web/js`.

## Modèle de données : SOURCE → INTERPRÉTATION → LIEN

Le harness matérialise la séparation posée par le cadrage produit.

**La source** (`case.json`) décrit uniquement ce qui a été reçu. Elle ne contient
aucune interprétation.

```jsonc
{
  "schema": "mdall.spike.case/1",
  "case_id": "ct-3-rapports-organisme-x",
  "spike": "ct-continuity",
  "params": { "assertion_threshold": 0.6 },
  "sources": [
    {
      "source_id": "rapport-a",
      "source_type": "control_office_report",
      "issuer": "Organisme X",
      "issued_at": "2026-03-12",
      "order": 1,
      "content_ref": "./texts/rapport-a.txt"   // ou "content": "…" en ligne
    }
  ],
  "ground_truth_ref": "./ground-truth.json"
}
```

Une source sans contenu exploitable reste chargeable : elle est marquée
`content_available: false` plutôt que d'échouer silencieusement. Chaque contenu
chargé reçoit un `content_sha256` : un run est rattaché à un contenu précis.

Une source peut être **paginée**, via `pages_ref` (fichier `{ "pages": [{ "page": 1,
"text": "…" }] }`) ou `pages` en ligne. C'est la seule façon de vérifier réellement
une provenance à la page : sans pagination, `source_page` reste invérifiable.

**L'interprétation** est produite par le pipeline du spike, sous forme de
prédictions :

```jsonc
{
  "key": "rapport-b:avis-65",          // clé de confrontation à la ground truth
  "kind": "extraction",
  "state": "PREDICTED",                 // ou ABSTAINED / AMBIGUOUS / UNRESOLVED
  "confidence": 0.82,                   // null si inconnue — jamais 0 par défaut
  "value": { "opinion_raw": "défavorable" },
  "provenance": { "source_id": "rapport-b", "page": 4, "excerpt": "…" },
  "candidates": [],                     // rapprochements concurrents éventuels
  "derived_from_absence": false         // true si l'inférence repose sur une absence
}
```

**Le lien au sujet** se modélise comme une prédiction d'un autre `kind`, avec sa
confiance propre : la confiance d'interprétation et la confiance de
rattachement ne se mélangent jamais.

## Ground truth

Labellisation humaine, un fichier par cas :

```jsonc
{
  "schema": "mdall.spike.ground-truth/1",
  "case_id": "ct-3-rapports-organisme-x",
  "annotator": "prénom nom",
  "annotated_at": "2026-08-26",
  "items": [
    { "key": "rapport-b:avis-65", "kind": "extraction",
      "expectation": "PRESENT", "value": { "opinion_raw": "défavorable" },
      "provenance": { "source_id": "rapport-b", "page": 4, "excerpt": "…" } },

    { "key": "rapport-b:avis-67", "kind": "extraction",
      "expectation": "ABSENT",
      "notes": "l'avis n'apparaît plus : ne rien affirmer, surtout pas une levée" },

    { "key": "rapport-a:avis-70", "kind": "extraction",
      "expectation": "ABSTENTION",
      "notes": "deux références indiscernables : s'abstenir est la bonne réponse" }
  ]
}
```

Trois natures d'attente, et c'est volontaire :

| `expectation` | Comportement correct | Comportement fautif |
| --- | --- | --- |
| `PRESENT` | produire la valeur attendue | rien produire, se tromper de valeur, s'abstenir |
| `ABSENT` | ne rien affirmer | affirmer quoi que ce soit |
| `ABSTENTION` | s'abstenir explicitement (`AMBIGUOUS`) | trancher (`FORCED_DECISION`) |

`POSITIVE`/`NEGATIVE` sont acceptés comme alias de `PRESENT`/`ABSENT`.

## Métriques

`spikes/lib/metrics.mjs` produit TP / FP / FN / TN puis precision, recall, F1,
false positive rate et abstention quality. Trois règles :

1. **un dénominateur nul donne `null`, jamais un score flatteur.** Zéro
   prédiction ne vaut pas 100 % de precision ; le rapport affiche
   `n/a (dénominateur = 0)`.
2. **une abstention n'est pas une erreur ordinaire.** Elle est comptée
   séparément, et jugée : correcte sur un cas réellement ambigu, incorrecte sur
   un cas clair.
3. **chaque item confronté laisse une trace individuelle** (`outcomes`), pour que
   le rapport montre les erreurs une par une. Sur un corpus de dix documents, un
   pourcentage ne veut rien dire ; une erreur unitaire, si.

Un spike ajoute ses propres métriques sans modifier le harness. `extraMetrics`
accepte un tableau, ou une fabrique recevant le cas chargé quand la métrique a
besoin des sources (vérifier une provenance, par exemple) :

```js
extraMetrics: (testCase) => [
  { id: "false_merge_count", label: "False merge count", kind: "count",
    compute: ({ outcomes }) => ({ value: countFalseMerges(outcomes) }) }
]
```

`kind` décide du rendu : `ratio` (défaut, affiché avec sa fraction), `score`
(valeur seule, pour un F1 dont la fraction n'apprendrait rien) ou `count` (un
effectif — l'afficher en pourcentage n'aurait aucun sens).

## Garde-fous

`spikes/lib/guards.mjs` détecte des comportements interdits par le cadrage —
indépendamment des scores. Une violation est affichée **avant** les métriques :

| Garde-fou | Règle |
| --- | --- |
| `provenance_required` | toute affirmation porte une source et un extrait |
| `excerpt_must_exist_in_source` | l'extrait cité existe réellement dans la source citée |
| `absence_is_not_a_conclusion` | aucune conclusion positive déduite d'une absence : une prédiction fondée sur une absence ne peut affirmer qu'un état non conclusif |
| `ambiguity_not_presented_as_certain` | aucun rapprochement ambigu affirmé comme certain |

Les trois premiers sont exportés par `commonGuards`. Chaque spike ajoute les
siens — le Spike 1 y ajoute par exemple « aucun statut de sujet Mdall dans une
prédiction » et « l'avis restitué figure littéralement dans l'extrait cité ».

Les recherches de texte de ces garde-fous exigent des frontières de mot
(`containsPhrase`) : « favorable » est contenu dans « défavorable », et sur ce
domaine c'est exactement l'inversion qu'il ne faut pas laisser passer.

## Spikes

| Spike | Statut |
| --- | --- |
| 1 — `ct-continuity` | implémenté, évalué sur fixture synthétique uniquement, avec un laboratoire manuel dans l'Atelier |
| 2 — `site-minutes-continuity` | non implémenté |
| 3 — `email-continuity` | non implémenté |
| 4 — `targeted-revision-impact` | non implémenté |

## Le moteur dans l'application

Le Spike 1 dispose d'un banc d'essai manuel : `Atelier › Développements ›
CT Continuity Lab`. Il charge des PDF à la main, les lit **dans le navigateur**
et exécute le moteur — sans rien envoyer, sans rien enregistrer, sans toucher à
un seul sujet Mdall.

Pour cela, `npm run build:web` copie dans `apps/web/vendor/` :

- `unpdf`, la bibliothèque d'extraction déjà utilisée par la fonction Edge de
  production, mais appelée ici avec `mergePages: false` ;
- le sous-ensemble **pur** du moteur (`scripts/prepare-spike-engine.mjs`).

Le moteur reste versionné uniquement dans `spikes/` : rien n'est dupliqué dans
le dépôt. Le script de copie échoue si l'un des modules concernés se met à
importer un module Node — mieux vaut casser le build que livrer une page qui
plante à l'ouverture.

## Écrire un spike

```js
import { runSpikeCase } from "../lib/harness.mjs";
import { commonGuards } from "../lib/guards.mjs";

const pipeline = {
  id: "ct-continuity",
  version: "0.1.0",
  async run({ sources, params, groundTruth, trace }) {
    // trace.record({ model, promptId, promptVersion, promptText, rawResponse, normalizedOutput })
    return { predictions: [/* … */], notes: "" };
  }
};

await runSpikeCase({ manifestPath, pipeline, guards: commonGuards });
```

`runSpikeCase` charge le cas, exécute le pipeline, confronte à la ground truth,
applique les garde-fous, écrit l'enregistrement de run et le rapport, et renvoie
le tout.

## Reproductibilité

Chaque run enregistre : `run_id`, cas, pipeline et version, horodatage,
paramètres effectifs, empreinte de chaque source, prédictions brutes, issues
individuelles, compteurs, métriques, violations et appels LLM. L'horloge est
injectable (`clock`) afin que deux exécutions identiques produisent des fichiers
identiques — les JSON sont sérialisés clés triées.

Pour un pipeline appelant un LLM, `trace.record(...)` conserve modèle, id et
version de prompt, empreinte SHA-256 du prompt et de la réponse brute, et sortie
normalisée. Les valeurs enregistrées passent par une redaction défensive :
**aucune clé d'API n'est lue ni écrite par ce dossier** ; les secrets restent
dans l'environnement.

## Données réelles

`spikes/fixtures/private/` est gitignoré. Les documents réels de projet y vont,
jamais dans le dépôt. Une fixture publique doit être entièrement synthétique.

Pour le Spike 3 (emails), une validation RGPD / droit du numérique est un
prérequis de **mise en production**, pas de construction d'un spike local sur
des données de test autorisées.
