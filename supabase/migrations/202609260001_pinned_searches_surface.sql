-- Les recherches épinglées servent maintenant deux écrans, pas un.
--
-- ## Pourquoi une colonne plutôt qu'une seconde table
--
-- L'écran des sujets a la même barre de recherche que la Mémoire — la même
-- grammaire, le même bouton, la même logique d'affichage. Il lui faut donc les
-- mêmes épingles : privées, en base, propriétaire seul dans les deux sens.
--
-- Une table `subject_pinned_searches` aurait dupliqué tout cela : la même
-- politique de sécurité, le même index, la même contrainte d'unicité, le même
-- raisonnement sur la vie privée. Deux écritures d'une même règle finissent par
-- diverger, et c'est sur la sécurité qu'elles divergeraient
-- (`docs/fondamentaux.md`, règle 10).
--
-- ## Ce que `surface` range, et ce qu'elle n'autorise pas
--
-- Elle dit **de quel écran** vient l'épingle, pour que le rail des sujets
-- n'affiche pas les requêtes de la Mémoire — dont la grammaire n'est pas la
-- sienne, et qui ne rendraient rien. Elle ne décide de rien d'autre : c'est
-- toujours `owner_id` qui autorise, et la politique ne change pas d'un
-- caractère.
--
-- ## Strictement additive
--
-- La colonne a une valeur par défaut, et les lignes existantes la reçoivent :
-- toutes les épingles déjà posées sont des épingles de la Mémoire, ce qui est
-- vrai, puisque c'est le seul écran qui en posait.
--
-- Le nom de la table ne change pas. Le renommer aurait cassé le code qui la
-- lit pour un gain d'exactitude qui ne se voit nulle part.

begin;

alter table public.memory_pinned_searches
  add column if not exists surface text not null default 'memoire';

comment on column public.memory_pinned_searches.surface is
  'L''écran d''où vient l''épingle : memoire ou sujets. Range, n''autorise pas — c''est owner_id qui autorise.';

-- Une liste fermée : une surface inventée ferait une épingle qu'aucun écran
-- n'affiche, et que personne ne pourrait donc retirer.
alter table public.memory_pinned_searches
  drop constraint if exists memory_pinned_searches_surface_check;

alter table public.memory_pinned_searches
  add constraint memory_pinned_searches_surface_check
    check (surface in ('memoire', 'sujets'));

-- L'unicité tient compte de la surface : la même requête peut valoir sur deux
-- écrans sans être la même épingle. L'ancienne contrainte l'interdisait — mais
-- elle n'a jamais eu l'occasion de mordre, la Mémoire étant seule à écrire.
alter table public.memory_pinned_searches
  drop constraint if exists memory_pinned_searches_owner_id_project_id_query_key;

create unique index if not exists memory_pinned_searches_unique_idx
  on public.memory_pinned_searches (owner_id, project_id, surface, query);

-- L'ordre du rail, par écran : c'est l'ordre où on les a posées, et il ne se
-- réordonne pas tout seul.
create index if not exists memory_pinned_searches_surface_idx
  on public.memory_pinned_searches (owner_id, project_id, surface, created_at);

commit;
