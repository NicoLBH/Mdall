-- La colonne `zone` s'en va.
--
-- Elle a vécu le temps d'une version, à côté de `zones`, pour ne pas rompre une
-- base où la migration du tableau n'était pas encore passée. Les deux se
-- lisaient, une seule faisait foi — et deux champs pour une même chose est
-- précisément ce que ce projet reproche partout ailleurs. Plus rien ne la lit ni
-- ne l'écrit depuis que `zones` porte la portée.
--
-- **Ce n'est pas une migration additive**, et c'est assumé : garder en base une
-- colonne que personne ne lit revient à laisser une seconde vérité disponible
-- pour le prochain qui passera. Les rares lignes qui ne portaient qu'elle
-- valent pour l'ensemble du projet, ce qui est la lecture par défaut.
--
-- `if exists` : la migration doit pouvoir se rejouer sur une base qui ne l'a
-- jamais eue.

drop index if exists project_assertions_zone_idx;

alter table public.project_assertions
  drop column if exists zone;
