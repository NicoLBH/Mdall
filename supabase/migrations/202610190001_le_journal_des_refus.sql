-- Ce qui n'a pas abouti, et pourquoi.
--
-- ## Le défaut qu'on ferme
--
-- Les fonctions de bord savent refuser, et elles disent pourquoi. Ce motif est
-- rendu au navigateur de celui qui a subi le refus, il s'affiche une seconde,
-- et **il meurt là**. Le lendemain, quelqu'un d'autre bute sur la même chose et
-- n'apprend rien de la veille ; personne ne sait qu'un fournisseur est en panne
-- depuis deux heures, ni qu'un quota est atteint depuis mardi.
--
-- Le fondamental 13 dit qu'on n'accepte pas d'un modèle ce qu'on n'accepterait
-- pas d'un calcul — qu'il rende un résultat sans dire ce qu'il a coûté. Le
-- pendant est vrai : **une panne qu'on ne compte pas est une panne qu'on
-- subit**. `ai_usages` compte ce qui a abouti ; il manquait ce qui n'a pas
-- abouti.
--
-- Et c'est de l'information **irrattrapable** : chaque jour où on ne l'écrit
-- pas est un jour perdu pour toujours.
--
-- ## Pourquoi c'est le navigateur qui écrit, contrairement à `ai_usages`
--
-- C'est l'inverse du compteur de consommation, et pour une raison qui décide :
-- **les pannes les plus graves sont invisibles du serveur**. Si Supabase est
-- indisponible, ou si le portail refuse la requête, la fonction de bord ne
-- s'exécute jamais — elle n'a rien à écrire, et son silence ressemble à celui
-- d'une journée sans incident.
--
-- Seul celui qui a lancé l'appel sait qu'il n'a pas abouti.
--
-- ## Ce qui rend cette écriture sûre : un domaine fermé
--
-- Laisser un navigateur écrire du texte libre dans une table lue par
-- l'exploitation, ce serait ouvrir un canal par lequel n'importe quoi — un
-- fragment de conversation privée, une valeur de projet — pourrait sortir.
--
-- Donc **rien de libre n'entre ici**. Le motif est pris dans une liste de huit,
-- et c'est la base qui le vérifie : un motif inconnu fait échouer l'insertion.
-- Le nom de la fonction suit la même règle, par sa forme. Le message d'erreur,
-- lui, **n'est jamais déposé** : il reste dans la console de celui qui l'a
-- subi. Le journal répond à « combien, de quel genre, quand, sur quoi » — c'est
-- ce qu'il faut pour alerter, et c'est tout ce qu'il faut.
--
-- Une ligne de ce journal ne peut donc **rien** porter que le domaine n'ait
-- prévu. C'est une garantie de structure, pas une promesse.
--
-- ## Qui voit quoi
--
-- La même règle que `ai_usages` : chacun voit les siens, et les collaborateurs
-- d'un projet voient ceux du projet. Savoir qu'un collègue a essuyé trois
-- surcharges du modèle ce matin ne dit rien de ce qu'il demandait — et lui
-- évite de recommencer.
--
-- Additive : nouvelle table, aucune colonne existante n'est modifiée.

create table if not exists public.refus_des_fonctions (
  id uuid primary key default gen_random_uuid(),

  -- Le projet où l'appel a été lancé. Nullable : un appel hors projet existe,
  -- et le rattacher au hasard fausserait le compte de quelqu'un.
  project_id uuid references public.projects(id) on delete set null,

  -- Qui a subi le refus. **Posé par la base, jamais par l'appelant** : un
  -- navigateur qui déclarerait un autre propriétaire ferait porter une panne à
  -- quelqu'un qui n'y était pas.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- La fonction appelée, telle qu'elle se déploie : « extract-avis »,
  -- « project-copilot ». Sa forme est contrainte — rien d'autre qu'un nom de
  -- fonction ne peut prendre cette place.
  fonction text not null
    constraint refus_des_fonctions_fonction_forme
    check (fonction ~ '^[a-z0-9][a-z0-9-]{0,63}$'),

  -- Le genre de panne, pris dans le domaine fermé de
  -- `services/journal-des-refus.js`. La base le vérifie : c'est ce qui rend
  -- impossible de faire passer autre chose par ce canal.
  motif text not null
    constraint refus_des_fonctions_motif_connu
    check (motif in (
      'injoignable',   -- rien n'a répondu : réseau, portail, service arrêté
      'non-autorise',  -- la session ne vaut plus, ou n'a pas le droit
      'trop-long',     -- on a cessé d'attendre ; ce n'est pas un refus
      'trop-grand',    -- ce qu'on envoyait ne passe pas
      'quota',         -- il n'y a plus de droits de tirage
      'surcharge',     -- le fournisseur dit de revenir plus tard
      'refuse',        -- il a répondu qu'il ne pouvait pas, et l'a nommé
      'mal-forme'      -- il a répondu, et la réponse ne se lit pas
    )),

  -- Le code de la réponse, quand il y en a eu une. `null` quand rien n'a
  -- répondu : « 0 » se lirait comme un code, et l'absence est un aveu.
  statut integer,

  survenu_le timestamptz not null default now()
);

-- « Qu'est-ce qui casse en ce moment ? » se pose sur un projet ou sur soi, et
-- toujours du plus récent.
create index if not exists refus_des_fonctions_projet_idx
  on public.refus_des_fonctions (project_id, survenu_le desc);

create index if not exists refus_des_fonctions_owner_idx
  on public.refus_des_fonctions (owner_id, survenu_le desc);

alter table public.refus_des_fonctions enable row level security;

-- **Chacun note les siens, et seulement les siens.** `owner_id` vient de la
-- base ; cette clause interdit qu'on le remplace.
drop policy if exists "refus_des_fonctions_je_note_les_miens" on public.refus_des_fonctions;
create policy "refus_des_fonctions_je_note_les_miens"
on public.refus_des_fonctions
for insert
to authenticated
with check (owner_id = auth.uid());

-- Chacun voit les siens, où qu'ils soient survenus.
drop policy if exists "refus_des_fonctions_les_miens" on public.refus_des_fonctions;
create policy "refus_des_fonctions_les_miens"
on public.refus_des_fonctions
for select
to authenticated
using (owner_id = auth.uid());

-- Et ceux des projets où l'on travaille : trois surcharges ce matin, c'est une
-- information de chantier, pas une information personnelle.
drop policy if exists "refus_des_fonctions_de_mes_projets" on public.refus_des_fonctions;
create policy "refus_des_fonctions_de_mes_projets"
on public.refus_des_fonctions
for select
to authenticated
using (
  project_id is not null
  and (
    exists (
      select 1 from public.projects projet
      where projet.id = public.refus_des_fonctions.project_id
        and projet.owner_id = auth.uid()
    )
    -- La colonne se nomme `collaborator_user_id` — la deviner `user_id`
    -- rendrait la politique invalide, et le journal du projet resterait vide
    -- sans rien dire.
    or exists (
      select 1 from public.project_collaborators collaborateur
      where collaborateur.project_id = public.refus_des_fonctions.project_id
        and collaborateur.collaborator_user_id = auth.uid()
    )
  )
);

-- **Aucune politique de modification ni de suppression.** Un journal qu'on peut
-- réécrire n'est pas un journal. Ce qui a eu lieu a eu lieu (règle 6).

comment on table public.refus_des_fonctions is
  'Ce qui n''a pas abouti : la fonction, le genre de panne pris dans un domaine fermé, le code de réponse, l''instant. Jamais le message d''erreur, jamais la charge utile. Écrit par le navigateur, parce que les pannes les plus graves sont invisibles du serveur.';
