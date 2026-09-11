-- Les sujets qu'une personne épingle, sur un projet.
--
-- ## Le problème
--
-- Un chantier porte soixante-treize sujets ouverts. Trois d'entre eux occupent
-- la semaine — c'est pour ceux-là qu'on revient sur l'écran, et il faut les
-- retrouver à chaque fois dans une liste triée par autre chose. Les filtres ne
-- servent à rien ici : ce n'est ni un statut, ni un lot, ni une échéance qui
-- les rassemble, c'est **l'attention de quelqu'un**.
--
-- ## Ce qui distingue cette table de tout le reste de Mdall
--
-- **Elle est privée.** Le projet est un lieu partagé : les sujets, les avis,
-- les décisions se lisent à plusieurs, et c'est leur raison d'être. Une épingle,
-- non. Elle dit ce qui préoccupe une personne cette semaine, et cela ne regarde
-- personne d'autre.
--
-- La politique le fait respecter par la base, pas par l'écran : `owner_id =
-- auth.uid()` en lecture comme en écriture. Un écran qui filtrerait lui-même
-- laisserait les épingles de chacun à portée de la première requête venue, et
-- la discrétion ne serait qu'une politesse d'affichage.
--
-- C'est la même politique, mot pour mot, que `memory_pinned_searches` : deux
-- épingles, deux fois la même promesse, et il faut qu'elles la tiennent pareil.
--
-- ## Ce qui n'est pas ici
--
-- **Le nombre maximum.** Trois est un choix de lisibilité — au-delà, le bandeau
-- des épinglés devient une seconde liste et ne met plus rien en avant. Ce n'est
-- pas une vérité sur les épingles, c'est un réglage d'écran, et il vit dans
-- `services/epingles-des-sujets.js`, à un seul endroit (règle 10). Une
-- contrainte ici le figerait dans la base, où il ne se relit pas.
--
-- Additive : nouvelle table, aucune colonne existante n'est modifiée.

create table if not exists public.subject_pins (
  id uuid primary key default gen_random_uuid(),

  -- Le chantier dont on parle. Il range, il n'autorise pas.
  project_id uuid not null references public.projects(id) on delete cascade,

  -- Le sujet épinglé. S'il disparaît, l'épingle n'a plus d'objet.
  subject_id uuid not null references public.subjects(id) on delete cascade,

  -- Le seul qui puisse lire cette épingle. `default auth.uid()` évite qu'un
  -- appelant distrait écrive une ligne au nom d'un autre : la valeur par défaut
  -- est déjà la bonne, et `with check` refuse toute autre.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),

  -- Un même sujet ne s'épingle pas deux fois pour la même personne : on aurait
  -- deux entrées qui font la même chose, et l'on ne saurait plus laquelle
  -- retirer.
  unique (owner_id, subject_id)
);

-- Les épingles d'une personne sur un projet, dans l'ordre où elle les a posées :
-- c'est l'ordre du bandeau, et il ne se réordonne pas tout seul.
create index if not exists subject_pins_owner_idx
  on public.subject_pins (owner_id, project_id, created_at);

-- « Ce sujet est-il épinglé ? » se pose à l'ouverture de chaque sujet.
create index if not exists subject_pins_subject_idx
  on public.subject_pins (subject_id);

alter table public.subject_pins enable row level security;

drop policy if exists "subject_pins_owner_only" on public.subject_pins;
create policy "subject_pins_owner_only"
on public.subject_pins
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

comment on table public.subject_pins is
  'Les sujets qu''une personne épingle sur un projet. Privées : chacun ne voit que les siennes. Le nombre maximum est un réglage d''écran, dans services/epingles-des-sujets.js.';
