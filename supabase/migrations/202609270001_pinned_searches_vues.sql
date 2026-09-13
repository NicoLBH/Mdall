-- Une recherche épinglée devient une **vue** : un nom, une icône, une couleur.
--
-- ## Pourquoi trois colonnes, et pas une table
--
-- Une épingle garde une requête. Une vue lui donne de quoi se reconnaître dans
-- une liste : une liste de douze requêtes brutes ne se parcourt pas — on relit
-- chacune pour retrouver celle qu'on cherche, et l'on finit par n'en garder
-- qu'une.
--
-- Ce sont trois attributs de la même chose, pas une chose de plus. Une seconde
-- table aurait dupliqué la politique de sécurité — propriétaire seul dans les
-- deux sens —, l'index et le raisonnement sur la vie privée, et c'est sur la
-- sécurité que les deux écritures auraient fini par diverger
-- (`docs/fondamentaux.md`, règle 10).
--
-- ## Toutes facultatives
--
-- `title` existait déjà et reste vide-par-défaut : la requête fait office de
-- nom. `description`, `icon` et `color` suivent la même règle. Une épingle
-- posée avant cette migration reste lisible, et se montre avec l'icône par
-- défaut.
--
-- ## Ce que la base ne vérifie pas
--
-- Ni le nom de l'icône, ni celui de la couleur : ce sont des noms d'un jeu qui
-- vit dans le code, et une contrainte ici obligerait à migrer la base chaque
-- fois qu'on ajoute une icône. Le service les **ramène** à ce qu'il connaît —
-- une valeur inconnue devient l'icône par défaut, pas une case vide.
--
-- Strictement additive : aucune colonne existante n'est modifiée.

begin;

alter table public.memory_pinned_searches
  add column if not exists description text,
  add column if not exists icon text,
  add column if not exists color text;

comment on column public.memory_pinned_searches.description is
  'À quoi sert cette vue. Facultative : elle ne se lit que sur l''écran des vues.';

comment on column public.memory_pinned_searches.icon is
  'Le nom d''une icône du jeu de l''application. Le code la ramène à ce qu''il connaît.';

comment on column public.memory_pinned_searches.color is
  'La clé d''une couleur de la liste fermée du code — gris, bleu, vert…';

commit;
