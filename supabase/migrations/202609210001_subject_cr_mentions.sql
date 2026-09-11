-- Ce qu'un compte rendu de chantier a redit d'un sujet, réunion après réunion.
--
-- ## Le problème
--
-- Un compte rendu de chantier **reporte** : la douzième réunion reprend les
-- points de la onzième, qui reprenait ceux de la dixième. Un point reste écrit
-- tant qu'il n'est pas soldé.
--
-- Mdall sait déjà ne pas rouvrir douze fois le même sujet. Mais il ne gardait
-- aucune trace de ces reprises, et deux informations se perdaient avec elles :
--
-- - **qu'un point soit relancé depuis trente-quatre réunions sans que rien ne
--   bouge est exactement ce qu'on cherche à savoir.** C'est la seule chose qui
--   distingue un chantier qui avance d'un chantier qui piétine ;
-- - **on ne pouvait pas savoir si le compte rendu suivant avait été lu.** Un
--   sujet muet voulait dire « rien n'a bougé » comme « personne n'a rien
--   analysé ». Deux choses très différentes, que le silence confondait.
--
-- ## Ce qu'une ligne dit
--
-- **Une reprise.** Ce compte rendu-là a repris ce sujet-là, ce jour-là, et
-- l'état du point était celui-ci. Une ligne par (sujet, compte rendu) : un
-- même document ne reprend pas deux fois le même point.
--
-- C'est un **fait**, pas une phrase. La ligne que l'écran affiche — « Pas de
-- modification des comptes rendus n° 15 à 23 — 9 réunions » — se calcule à la
-- lecture, dans `services/reprise-sans-changement.js`. Écrire la phrase ici la
-- figerait : le jour où elle se dit mieux, les anciennes garderaient l'ancienne
-- formulation, et deux sujets voisins se liraient différemment (règle 4).
--
-- ## `a_change` : ce qui distingue le bruit du signal
--
-- Vrai quand cette reprise a apporté quelque chose — le sujet vient d'être
-- ouvert par ce compte rendu, ou l'état du point a changé depuis la reprise
-- précédente. Faux quand le point est repris à l'identique.
--
-- C'est ce qui permet de **replier** : on ne remonte que la suite des reprises
-- sans changement qui traîne, et la ligne repart après le dernier mouvement.
-- Sans cette colonne, la ligne annoncerait « rien n'a bougé depuis la première
-- réunion » sur un sujet qui a changé trois fois.
--
-- ## `numero` et `tenue_le` : recopiés, et c'est voulu
--
-- Ils vivent aussi sur le document, dans `declared_reference` et `issued_at`.
-- Les recopier ici n'est pas une duplication de commodité : ce sont **les
-- valeurs au moment de la reprise**. Un document retiré du corpus, un
-- rattachement corrigé, et la ligne d'activité continue de dire ce qu'elle a
-- dit — un constat ne devient jamais faux (règle 6).
--
-- Vides quand le compte rendu ne se nommait pas : ne pas savoir se dit, et la
-- phrase le dit à son tour (« au compte rendu suivant », sans numéro).
--
-- Additive : nouvelle table, aucune colonne existante n'est modifiée.

create table if not exists public.subject_cr_mentions (
  id uuid primary key default gen_random_uuid(),

  -- Le sujet repris. S'il disparaît, ses reprises n'ont plus d'objet.
  subject_id uuid not null references public.subjects(id) on delete cascade,

  -- Le compte rendu qui l'a repris. S'il disparaît du projet, la reprise aussi :
  -- une ligne qui citerait un document absent ne se vérifie plus.
  document_id uuid not null references public.documents(id) on delete cascade,

  -- Par quel versement. `null` si la proposition est supprimée : la reprise a
  -- eu lieu, et c'est elle le fait.
  proposition_id uuid references public.propositions(id) on delete set null,

  -- Le numéro du compte rendu **tel qu'il était lu ce jour-là**. '' quand le
  -- document ne se nomme pas.
  numero text not null default '',

  -- Le jour de la réunion. `null` quand le document ne le dit pas — et non la
  -- date du versement, qui n'est pas la même chose.
  tenue_le date,

  -- L'état du point à cette reprise, tel que le compte rendu l'écrit. Il sert à
  -- décider de la reprise suivante : c'est à lui qu'on la compare.
  etat text not null default '',

  -- Cette reprise a-t-elle apporté quelque chose ?
  a_change boolean not null default false,

  created_at timestamptz not null default now(),

  -- Un même compte rendu ne reprend pas deux fois le même point. Rejouer une
  -- fusion ne duplique donc rien.
  unique (subject_id, document_id)
);

-- « Qu'est-ce que les comptes rendus ont dit de ce sujet ? » est la seule
-- question qu'on pose à cette table, et on la pose à chaque ouverture d'un
-- sujet.
create index if not exists subject_cr_mentions_subject_idx
  on public.subject_cr_mentions (subject_id, tenue_le);

create index if not exists subject_cr_mentions_document_idx
  on public.subject_cr_mentions (document_id);

alter table public.subject_cr_mentions enable row level security;

-- La même politique que les sujets qu'elle décrit. En poser une plus stricte
-- rendrait un sujet lisible et son suivi invisible : on lirait « ouvert il y a
-- trois mois » sans pouvoir dire que neuf réunions l'ont relancé depuis.
drop policy if exists "subject_cr_mentions_open_all" on public.subject_cr_mentions;
create policy "subject_cr_mentions_open_all"
on public.subject_cr_mentions
for all
to anon, authenticated
using (true)
with check (true);

comment on table public.subject_cr_mentions is
  'Une ligne par reprise d''un sujet dans un compte rendu de chantier. La phrase affichée se calcule à la lecture : voir services/reprise-sans-changement.js.';
