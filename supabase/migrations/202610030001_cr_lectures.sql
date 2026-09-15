-- Ce qu'une lecture de compte rendu a valu, gardé pour la suivante.
--
-- ## Le problème
--
-- L'écran de l'Atelier affiche depuis l'étape 2 ce que la lecture vaut :
-- points relevés, citations retrouvées, rubriques reconnues, orphelins. Ces
-- nombres n'ont de sens que **comparés**. « 3 orphelins » ne dit rien ; « 3
-- orphelins là où le compte rendu précédent en donnait 1 » dit que la lecture a
-- dérivé, et c'est la seule façon de s'en apercevoir.
--
-- Or ils vivaient dans la page, et disparaissaient en la quittant. On ne
-- pouvait comparer qu'en gardant deux captures d'écran côte à côte.
--
-- ## Pourquoi une table, et pourquoi celle-là
--
-- `ct_analysis_runs` conserve les analyses de corpus ; `project_runs`, les
-- gestes lourds du projet. Une lecture de compte rendu n'est ni l'une ni
-- l'autre : elle ne relit pas un corpus, et elle n'écrit rien dans le projet —
-- c'est un essai, dans l'Atelier, avant même qu'une proposition existe. L'y
-- ranger aurait fait deux choses d'un même nom, et « la dernière ligne » aurait
-- désigné tantôt une analyse, tantôt une lecture.
--
-- ## Elle est **privée**, et c'est la base qui le tient
--
-- Dans l'Atelier on essaie, on relance dix fois pour comprendre un écart. Ce
-- sont des gestes de travail personnels ; les publier revient à afficher le
-- brouillon de quelqu'un, et la première conséquence est qu'on cesse
-- d'essayer. La règle de lecture ne rend donc que les lectures de qui demande.
--
-- Un écran qui oublierait de filtrer ne pourrait pas montrer ce qu'il ne doit
-- pas : ailleurs, la séparation ne serait qu'une politesse d'affichage.
--
-- ## Une ligne par lecture, jamais mise à jour
--
-- Une lecture qui a eu lieu ne devient pas fausse (règle 6). Relire le même
-- document est une seconde lecture, avec sa propre ligne — et c'est
-- précisément ce qu'on veut comparer quand on ajuste une consigne.
--
-- Strictement additive : nouvelle table, aucune colonne existante touchée.

create table if not exists public.cr_lectures (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.projects(id) on delete cascade,

  -- Le nom du fichier lu, tel qu'il a été déposé. Il ne se recompose pas : le
  -- document n'est pas encore rangé dans Fichiers au moment de la lecture.
  document text not null default '',

  -- Ce que le compte rendu déclare de lui-même. C'est par là qu'on reconnaît,
  -- six lectures plus tard, de quelle réunion il s'agissait.
  numero_de_reunion text not null default '',
  tenue_le text not null default '',

  -- Ce que la lecture vaut, dans la forme que `mesureDeLaLecture` rend :
  -- {points, retrouves, sansCitation, sansLot, rubriques, rattaches, orphelins,
  --  pages, caracteres}. Telle quelle : la raboter ici reviendrait à conserver
  -- un détail en base pour ne jamais l'afficher.
  mesures jsonb not null default '{}'::jsonb,

  -- Par quoi ce compte rendu a été lu — le modèle, et la version du procédé.
  -- Sans lui, comparer deux lectures ne dit pas si c'est le document qui a
  -- changé ou la façon de le lire.
  lu_par text not null default '',

  -- Qui l'a faite. Posé par la base : demander au client de l'envoyer
  -- reviendrait à accepter qu'il envoie celui d'un autre.
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),

  created_at timestamptz not null default now()
);

-- « Quelle était ma lecture précédente sur ce projet ? » est la seule question
-- qu'on pose à cette table, et l'Atelier la pose à chaque lecture.
create index if not exists cr_lectures_projet_date_idx
  on public.cr_lectures (project_id, created_at desc);

create index if not exists cr_lectures_owner_idx
  on public.cr_lectures (owner_id);

alter table public.cr_lectures enable row level security;

-- **Privée.** Une lecture d'Atelier n'appartient qu'à qui l'a faite. Contrairement
-- au journal des fusions, qui raconte ce qui est arrivé au projet et que tous
-- les collaborateurs lisent.
drop policy if exists cr_lectures_privee on public.cr_lectures;
create policy cr_lectures_privee
on public.cr_lectures
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() or owner_id is null);

comment on table public.cr_lectures is
  'Une ligne par lecture de compte rendu dans l''Atelier, avec ce qu''elle a valu. Privée : elle n''appartient qu''à qui l''a faite. Sert à comparer une lecture à la précédente.';
