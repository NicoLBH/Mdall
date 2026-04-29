# Climate data import helpers

Imports climatiques générés fichier par fichier pour garder des diffs lisibles.

## Commandes

- Un import : `npm run climate:seed:commune-cantons` (et autres commandes `climate:seed:*`).
- Tous les imports : `npm run climate:seed:all`.

## Pourquoi c'est séparé

Les données source sont volumineuses ; on génère un SQL par source JSON pour éviter un seul gros diff.

## Vérification

Lancer les requêtes de `supabase/seed-data/climate/verify_climate_seed.sql` après import.

## Important

Ne pas déplacer les JSON source hors `apps/web/js/services/zoning` avant l'étape de nettoyage sécurité dédiée.
