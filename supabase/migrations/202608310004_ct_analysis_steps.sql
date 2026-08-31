-- Combien de temps chaque étape a réellement pris.
--
-- Le graphe d'une exécution montrait un enchaînement sans durées, et c'était
-- délibéré : nous n'enregistrions que le résultat, et des durées inventées
-- feraient un joli dessin qui ment. La réponse honnête n'était donc pas
-- d'afficher des chiffres plausibles, mais **de mesurer pour de bon**.
--
-- Cette colonne garde ce que l'exécution a chronométré elle-même : un tableau
-- de `{ id, label, ms }`, dans l'ordre où les phases se sont enchaînées. Rien
-- d'autre — ni pourcentages, ni moyennes, ni estimations. Une phase qui n'a pas
-- été mesurée n'y figure pas, et le graphe l'affiche alors sans durée plutôt
-- qu'avec une durée fausse.
--
-- L'unité est la milliseconde, telle que le navigateur l'a lue. Elle mesure ce
-- que l'utilisateur a attendu — réseau et lecture des PDF compris —, ce qui est
-- précisément la question qu'on se pose en regardant un graphe d'exécution.
--
-- Additive : les exécutions déjà enregistrées gardent une valeur nulle, et leur
-- graphe reste ce qu'il était.

alter table public.ct_analysis_runs
  add column if not exists steps jsonb;
