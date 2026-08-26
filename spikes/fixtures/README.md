# Fixtures

## `example-harness-case/`

Fixture entièrement **synthétique**, inventée pour vérifier le harness de bout
en bout. Elle ne reproduit aucun format réel de document et ne préjuge d'aucune
nomenclature d'organisme.

Elle porte trois natures d'attente :

- deux items présents et clairs par source (`PRESENT`) ;
- un item réellement ambigu — deux lignes portent la même référence dans
  `doc-a` — dont la bonne réponse est l'abstention (`ABSTENTION`) ;
- un item disparu entre `doc-a` et `doc-b`, dont la bonne réponse est de ne rien
  affirmer (`ABSENT`).

Deux pipelines l'accompagnent, tous deux réservés aux tests :

- `demo-pipeline.mjs` — comportement correct ;
- `faulty-pipeline.mjs` — commet volontairement les quatre fautes interdites
  (affirmation sans provenance, extrait inventé, décision forcée sur un cas
  ambigu, conclusion déduite d'une absence), afin de vérifier que le harness les
  fait bien remonter.

## `private/`

Gitignoré. Emplacement des documents réels de projet utilisés comme fixtures.

Rien de confidentiel ne doit être committé. Une fixture versionnée est
synthétique, ou anonymisée au point de ne plus être rattachable à un projet
réel.
