# Spike 4 — Targeted Revision Impact

**Statut : non implémenté.** Ce dossier est réservé.

À n'ouvrir qu'après validation suffisante des niveaux précédents.

## Question expérimentale

Une nouvelle révision d'un document modifie-t-elle une information qui avait
déjà servi à instruire un sujet Mdall existant ?

## Ce que ce spike ne fera pas

Pas de reconstruction du bâtiment, pas de BIM, pas d'IFC, pas de contrôle
réglementaire, pas d'overlay concurrent de Bluebeam, pas de graphe complet
d'entités.

## Règles à tenir

- Le sujet existant sert de **cible de recherche** : on ne cherche pas toutes
  les modifications du document.
- États de l'information : `UNCHANGED`, `CHANGED`, `AMBIGUOUS`, `NOT_FOUND`.
- États d'identité, quand un objet doit être retrouvé : `MATCHED`, `AMBIGUOUS`,
  `UNMATCHED`.
- Un `CHANGED` sans preuve des deux côtés (ancienne valeur + ancienne source,
  nouvelle valeur + nouvelle source) est invalide.
- Precision avant recall : `AMBIGUOUS` est préférable à un faux rapprochement.
- Les signaux d'entity resolution exposés doivent être ceux réellement extraits,
  jamais des signaux inventés.

## Benchmark

Le harness doit pouvoir enregistrer, pour un même cas : ground truth humaine,
résultat Mdall, résultat humain seul, résultat humain + outil de comparaison
renseigné manuellement. Une case externe reste prévue pour un éventuel
benchmark Primepoint ; son absence ne bloque jamais le spike.
