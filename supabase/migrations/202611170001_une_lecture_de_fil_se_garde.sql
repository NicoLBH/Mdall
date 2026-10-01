-- ════════════════════════════════════════════════════════════════════════════
--  Une lecture de fil de mails se garde, et se rouvre
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Le problème, posé par celui qui s'en sert
--
--  « Si je prends la logique actuelle pour les CR chantier : atelier > lecture
--  d'un CR chantier, on analyse, on garde en base le résultat de l'analyse :
--  c'est ici que l'on doit voir les idées, les fonctions, les raisonnements.
--  Il faut donc reproduire la même chose avec atelier > lecture d'un fil de
--  mails : garder en base les analyses, lister les mails qui ont déjà été
--  analysés, afficher le détail de chaque analyse. »
--
--  Le lecteur de fils de mails déplie et relève, et **tout disparaît en
--  quittant l'écran**. Le relevé coûte un appel au modèle ; on le repayait à
--  chaque fois qu'on voulait revoir ce qu'il avait trouvé.
--
--  ## Pourquoi une table, et pas `cr_lectures`
--
--  Un compte rendu a un numéro de réunion, une date de tenue, des rubriques et
--  des lots. Un fil de mails a un objet, des messages, des dates d'extrémité et
--  des prises de position. Ce ne sont pas les mêmes colonnes, et les loger
--  ensemble obligerait chacun à laisser vides celles de l'autre — puis à
--  deviner, en lisant une ligne, de quelle sorte de lecture il s'agit.
--
--  C'est la même raison qui avait écarté `ct_analysis_runs` pour les comptes
--  rendus, et elle vaut ici.
--
--  ## Elle est **privée**, et c'est la base qui le tient
--
--  Dans l'Atelier on essaie. Un fil de mails est en outre ce qu'il y a de plus
--  personnel dans un chantier : qui a écrit quoi, à qui, et ce qu'on en a
--  déduit. La règle de lecture ne rend donc que les lectures de qui demande.
--
--  Un écran qui oublierait de filtrer ne pourrait pas montrer ce qu'il ne doit
--  pas : ailleurs, la séparation ne serait qu'une politesse d'affichage.
--
--  ## Une ligne par lecture, jamais mise à jour
--
--  Une lecture qui a eu lieu ne devient pas fausse (règle 6). Relever le même
--  fil est une seconde lecture, avec sa propre ligne — et c'est précisément ce
--  qu'on veut comparer quand on ajuste une consigne.
--
--  Strictement additive : nouvelle table, aucune colonne existante touchée.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.fil_lectures (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.projects(id) on delete cascade,

  -- L'objet du fil, tel qu'il a été déplié. C'est par là qu'on le reconnaît
  -- six lectures plus tard, et c'est aussi son identité : deux dépôts des mêmes
  -- `.eml` sont deux lectures du même fil.
  objet text not null default '',

  -- Les fichiers déposés, par leurs noms. Un fil se monte souvent de plusieurs
  -- `.eml` ou `.msg`, et savoir lesquels évite de redéposer les mêmes.
  fichiers jsonb not null default '[]'::jsonb,

  -- Combien de messages le fil porte, et entre quelles dates il court. Trois
  -- nombres qui tiennent dans une ligne de liste, et qui suffisent à choisir.
  messages integer not null default 0,
  commence_le text not null default '',
  finit_le text not null default '',

  -- Ce que la lecture vaut, dans la forme que l'écran mesure : prises par
  -- nature, trous, part relevée. Telle quelle.
  mesures jsonb not null default '{}'::jsonb,

  -- Par quoi ce fil a été relevé — le modèle, et la version du procédé. Sans
  -- lui, comparer deux lectures ne dit pas si c'est le fil qui a changé ou la
  -- façon de le lire.
  lu_par text not null default '',

  -- Ce que la lecture a vu, gelé : le fil déplié, les prises, ce qui s'en
  -- dérive, et les idées que le fil énonce.
  --
  -- **`analyse_gelee`, et non `analyse`.** `ANALYSE` est un mot **réservé** de
  -- PostgreSQL — l'orthographe britannique d'`ANALYZE` —, et un déploiement a
  -- déjà été refusé pour cela.
  analyse_gelee jsonb,

  -- La proposition que cette lecture a nourrie, quand elle en a nourri une.
  proposition_id uuid references public.propositions(id) on delete set null,

  -- Qui l'a faite. Posé par la base : demander au client de l'envoyer
  -- reviendrait à accepter qu'il envoie celui d'un autre.
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),

  created_at timestamptz not null default now()
);

-- « Quels fils ai-je déjà lus sur ce chantier ? » est la question de l'accueil,
-- et c'est la seule que cette table reçoive.
create index if not exists fil_lectures_projet_date_idx
  on public.fil_lectures (project_id, created_at desc);

create index if not exists fil_lectures_owner_idx
  on public.fil_lectures (owner_id);

alter table public.fil_lectures enable row level security;

-- **Privée.** Une lecture d'Atelier n'appartient qu'à qui l'a faite.
drop policy if exists fil_lectures_privee on public.fil_lectures;
create policy fil_lectures_privee
on public.fil_lectures
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() or owner_id is null);

comment on table public.fil_lectures is
  'Une ligne par lecture de fil de mails dans l''Atelier, avec ce qu''elle a vu. Privee : elle n''appartient qu''a qui l''a faite.';
