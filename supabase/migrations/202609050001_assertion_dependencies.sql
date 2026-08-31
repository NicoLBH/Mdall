-- Ce qui repose sur quoi, et ce qui devient suspect quand une hypothèse change.
--
-- C'est ici que Mdall fait ce qu'aucun autre outil ne fait. Si la zone de neige
-- passe de A2 à B1, tout ce qui a été dimensionné dessus est à revoir — et
-- aujourd'hui personne ne le sait, parce que le lien n'existe nulle part. Il est
-- dans la tête de l'ingénieur qui a fait la note de calcul, et il en sort le
-- jour où cette personne change de projet.
--
-- ## La table des dépendances
--
-- Un graphe minimal, en **ajout seul** : une ligne dit « cette affirmation-ci
-- repose sur celle-là ». Rien d'autre. Pas de type de lien, pas de poids, pas de
-- profondeur : un lien plus riche demanderait de décider ce qu'il signifie avant
-- d'avoir vu s'en servir, et c'est la meilleure façon de se tromper une fois
-- pour toutes.
--
-- Le lien pointe vers une **affirmation précise**, pas vers une clé métier. Une
-- note de calcul ne repose pas sur « la zone de neige » en général : elle repose
-- sur la valeur A2 telle qu'elle était affirmée le 12 août. Quand cette
-- affirmation-là est remplacée, la note devient suspecte — et c'est bien ce
-- qu'on veut dire.
--
-- ## Le drapeau
--
-- `needs_review_since` porte la date à laquelle une affirmation est devenue
-- suspecte : celle du remplacement de l'hypothèse dont elle dépend.
-- `reviewed_at` porte la date à laquelle quelqu'un a dit l'avoir revérifiée.
--
-- **Deux colonnes, et non un booléen qu'on remettrait à zéro.** Revérifier lève
-- un drapeau, ça ne réécrit pas l'histoire : on doit pouvoir dire « cette note a
-- été suspectée le 12 août et revérifiée le 14 », et non seulement « elle va
-- bien ». Et si l'hypothèse rechange, une nouvelle date de suspicion repasse
-- devant l'ancienne vérification : le drapeau se relève tout seul, sans qu'on
-- ait à effacer quoi que ce soit.
--
-- Le drapeau est donc actif quand `needs_review_since` est renseigné et que
-- `reviewed_at` est nul ou antérieur — c'est une comparaison, pas un état.
--
-- ## Ce que cette table ne fait pas
--
-- Elle ne propage rien en cascade. Si A dépend de B qui dépend de C, changer C
-- ne marque que B. Une propagation transitive automatique marquerait la moitié
-- d'un projet au premier changement d'hypothèse, et un écran qui signale tout
-- ne signale plus rien. Le jour où le besoin s'en fera sentir, il se verra sur
-- des cas réels, et il se traitera alors — pas d'avance.
--
-- Additive : aucune colonne existante n'est modifiée ni supprimée.

create table if not exists public.assertion_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,

  -- Ce qui repose, et ce sur quoi ça repose.
  assertion_id uuid not null references public.project_assertions(id) on delete cascade,
  depends_on_assertion_id uuid not null references public.project_assertions(id) on delete cascade,

  -- Qui l'a déclaré, et quand. Un lien sans auteur est une rumeur, comme une
  -- affirmation sans provenance.
  declared_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  -- Une affirmation ne repose pas deux fois sur la même. Et elle ne repose pas
  -- sur elle-même : un cycle d'un seul nœud rendrait toute lecture infinie.
  unique (assertion_id, depends_on_assertion_id),
  constraint assertion_dependencies_no_self_link check (assertion_id <> depends_on_assertion_id)
);

create index if not exists assertion_dependencies_project_idx
  on public.assertion_dependencies (project_id);

-- Les deux sens se lisent : « sur quoi repose ceci ? » et « qu'est-ce qui repose
-- sur cela ? ». La seconde question est celle qu'on pose en changeant une
-- hypothèse, et c'est la plus importante des deux.
create index if not exists assertion_dependencies_depends_on_idx
  on public.assertion_dependencies (depends_on_assertion_id);

alter table public.project_assertions
  add column if not exists needs_review_since timestamptz;

alter table public.project_assertions
  add column if not exists reviewed_at timestamptz;

alter table public.project_assertions
  add column if not exists reviewed_by uuid references auth.users(id);

alter table public.assertion_dependencies enable row level security;

-- La même politique que la table qu'elle relie, mot pour mot. En poser une plus
-- stricte ici rendrait la mémoire lisible et ses liens invisibles : l'écran
-- afficherait « aucune dépendance » là où il y en a, ce qui est exactement le
-- mensonge que cette étape existe pour éviter. Le jour où `project_assertions`
-- se referme, les deux se referment ensemble.
drop policy if exists "assertion_dependencies_open_all" on public.assertion_dependencies;
create policy "assertion_dependencies_open_all"
on public.assertion_dependencies
for all
to anon, authenticated
using (true)
with check (true);
