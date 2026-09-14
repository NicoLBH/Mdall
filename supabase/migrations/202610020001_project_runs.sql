-- Ce que le projet a **fait**, et non ce qu'il a calculé.
--
-- ## Pourquoi une table de plus
--
-- `ct_analysis_runs` conserve les analyses : un lot de documents relu par un
-- moteur, avec ses avis et son empreinte de corpus. Toutes ses colonnes
-- décrivent cela, et la lecture du dossier prend « la dernière ligne » comme
-- étant l'état courant de l'analyse.
--
-- Une **fusion** n'est pas une analyse. Elle ne lit pas un corpus : elle écrit
-- dans le projet — la mémoire, les sujets, les lots, les sociétés, les
-- fermetures. L'y ranger aurait fait deux choses d'un même nom, et la dernière
-- fusion se serait présentée comme la dernière analyse (règle 4). Ce qu'on veut
-- en garder est d'ailleurs autre : pas des comptes d'avis, mais **le chemin
-- d'exécution** — ses étapes, leurs durées, leurs journaux.
--
-- ## Ce qu'une ligne dit
--
-- Une exécution qui a eu lieu sur ce projet : son geste (`fusion`
-- aujourd'hui), ce qui l'a causée, quand elle a commencé, combien elle a pris,
-- si elle a tenu, et ce que chacune de ses étapes a fait.
--
-- ## `steps` : la même forme que pour une analyse, et c'est délibéré
--
-- `[{id, label, ms, statut, lignes}]`. L'onglet Actions sait déjà lire cette
-- forme : deux journaux de formes différentes auraient demandé deux écrans pour
-- les lire. `ms` vaut `null` quand l'étape n'a pas été chronométrée — ce n'est
-- pas « 0 ms », et l'écran affiche un tiret.
--
-- ## Ce que la table ne fait pas
--
-- Elle ne remplace rien et n'efface rien. Une fusion écrit sa ligne une fois,
-- à la fin ; on ne la met jamais à jour. Un constat ne devient pas faux
-- (règle 6) : si la même proposition était refusionnée un jour, ce serait une
-- seconde exécution, avec sa propre ligne.
--
-- Strictement additive : nouvelle table, aucune colonne existante touchée.

create table if not exists public.project_runs (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.projects(id) on delete cascade,

  -- Ce que cette exécution a fait au projet. `fusion` aujourd'hui ; d'autres
  -- gestes lourds viendront s'y ranger plutôt que d'inventer une table par
  -- geste.
  geste text not null,

  -- Ce qui l'a causée. `null` si la proposition est supprimée : l'exécution a
  -- eu lieu, et c'est elle le fait.
  proposition_id uuid references public.propositions(id) on delete set null,

  -- Le nom qu'on lit dans la liste, tel qu'il a été arrêté ce jour-là. Le
  -- recomposer à la relecture ferait dépendre le journal d'un numéro qui a pu
  -- bouger.
  titre text not null default '',

  -- Ce que l'exécution a valu, en une phrase.
  resume text not null default '',

  -- `ok` ou `echec`. Une seule étape qui n'a pas tenu fait tomber l'exécution :
  -- « partiel » se lirait comme « ça va ».
  statut text not null default 'ok',

  started_at timestamptz not null default now(),
  finished_at timestamptz,

  -- Le temps total, mesuré par l'exécution elle-même. `null` quand elle n'a pas
  -- été chronométrée.
  duration_ms integer,

  -- Le chemin d'exécution : une entrée par étape, avec son journal.
  steps jsonb,

  -- Qui l'a lancée. Posé par la base : demander au client de l'envoyer
  -- reviendrait à accepter qu'il envoie celui d'un autre.
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),

  created_at timestamptz not null default now()
);

-- « Qu'est-ce qui s'est passé sur ce projet, et quand ? » est la seule question
-- qu'on pose à cette table, et l'onglet Actions la pose à chaque ouverture.
create index if not exists project_runs_project_started_idx
  on public.project_runs (project_id, started_at desc);

create index if not exists project_runs_proposition_idx
  on public.project_runs (proposition_id);

alter table public.project_runs enable row level security;

-- Le journal des actions est lu par tous les collaborateurs, et c'est normal :
-- il raconte ce qui est arrivé au projet. Une fusion est un acte du projet, pas
-- un brouillon personnel — contrairement aux exécutions d'Atelier, qui sont
-- cloisonnées dans leur propre table.
drop policy if exists project_runs_open_all on public.project_runs;
create policy project_runs_open_all
on public.project_runs
for all
to anon, authenticated
using (true)
with check (true);

comment on table public.project_runs is
  'Une ligne par exécution lourde du projet — une fusion aujourd''hui —, avec son chemin d''exécution : étapes, durées, journaux. Les analyses de corpus vivent dans ct_analysis_runs.';
