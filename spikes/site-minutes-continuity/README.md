# Spike 2 — Site Minutes Continuity

**Statut : non implémenté.** Ce dossier est réservé.

À n'ouvrir qu'après évaluation du Spike 1.

## Question expérimentale

Mdall peut-il suivre une même remarque de compte rendu de chantier à travers
plusieurs CR successifs ?

## Règles à tenir

- La numérotation des remarques est utile mais n'est pas garantie stable :
  renumérotation, fusion, reformulation, séparation sont des cas normaux.
- États minimaux : `MATCHED_EXACT`, `MATCHED_PROPOSED`, `AMBIGUOUS`, `NEW`,
  `NOT_FOUND`.
- Un `MATCHED_PROPOSED` ne devient jamais silencieusement une identité définitive.
- Le matching sémantique reste séparé du matching exact, porte un score, et est
  évalué séparément. Le type de rapprochement est toujours visible.
- Une remarque absente n'est jamais considérée comme levée sans formulation
  source suffisante.
- Aucune entreprise responsable n'est déduite si le texte ne la donne pas.
