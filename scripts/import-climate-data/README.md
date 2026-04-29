# Climate data import helpers

Ce dossier contient le socle technique pour importer progressivement les données climatiques vers Supabase.

## Pourquoi des imports découpés

Les données sources sont volumineuses. Les imports sont donc générés fichier JSON par fichier JSON pour éviter des diffs trop gros et faciliter la revue.

## Ce qui est inclus à l'étape 2.0

- helpers Node réutilisables pour lire un JSON source ;
- normaliser les noms de cantons (sans accents, apostrophes et tirets, en minuscules) ;
- générer des instructions `INSERT` SQL ;
- écrire des fichiers SQL de sortie.

Les scripts d'import spécifiques (`2.1+`) seront ajoutés séparément, un fichier source à la fois.
