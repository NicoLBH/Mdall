-- Ce que chaque appel de modèle a consommé.
--
-- ## Pourquoi cette table existe
--
-- Le fondamental 13 : on n'accepte pas d'un modèle ce qu'on n'accepterait pas
-- d'un calcul — qu'il donne un résultat sans dire ce qu'il a coûté. Un coût
-- invisible est un coût qu'on subit.
--
-- ## Ce qu'une ligne porte, et ce qu'elle ne porte pas
--
-- Le projet, la personne, le modèle, les jetons entrés, les jetons sortis,
-- l'instant. **Ni la question, ni la réponse.** Le compteur dit *combien*,
-- jamais *quoi* : garder le contenu des échanges pour faire une addition serait
-- un troc inacceptable, et la discrétion promise aux conversations du copilote
-- l'interdit de toute façon.
--
-- ## Les jetons peuvent manquer, et c'est écrit
--
-- `input_tokens` et `output_tokens` sont **nullables**. Ils sont repris tels que
-- le fournisseur les annonce, jamais estimés : un compteur approché est un
-- compteur faux, et l'on lit un compteur pour décider d'un usage. Quand le champ
-- manque, `null` — « 0 jeton » serait une affirmation, l'absence est un aveu
-- (règle 5). Un total sait alors dire « trois appels n'ont pas rendu leur
-- décompte » plutôt que de mentir d'un chiffre rond.
--
-- ## Qui voit quoi
--
-- **Chacun voit les siennes**, partout. Et **les collaborateurs d'un projet
-- voient celles du projet** : l'onglet Indicateurs affiche un total par projet,
-- et un total qu'on ne peut pas détailler est un total qu'on ne croit pas.
--
-- Ce n'est pas une fuite : savoir qu'un collègue a consommé douze mille jetons
-- sur ce chantier ne dit rien de ce qu'il a demandé. Le contenu, lui, n'est
-- nulle part.
--
-- ## Personne n'écrit depuis le navigateur
--
-- Aucune politique d'écriture. Les lignes sont posées par les fonctions de bord,
-- avec la clé de service : c'est le serveur qui appelle le modèle, lui qui
-- reçoit le décompte, et lui seul qui peut garantir qu'une ligne correspond à un
-- appel réel. Laisser le navigateur écrire son compteur reviendrait à demander à
-- chacun de déclarer sa consommation.
--
-- Additive : nouvelle table, aucune colonne existante n'est modifiée.

create table if not exists public.ai_usages (
  id uuid primary key default gen_random_uuid(),

  -- Le projet où l'appel a été fait. Nullable : tout appel de modèle n'a pas
  -- forcément un projet — et rattacher de force au premier venu fausserait sa
  -- répartition.
  project_id uuid references public.projects(id) on delete set null,

  -- Qui a demandé. Nullable pour la même raison : un appel déclenché par une
  -- tâche de fond n'a personne derrière lui, et lui inventer un propriétaire
  -- ferait porter à quelqu'un une consommation qui n'est pas la sienne.
  owner_id uuid references auth.users(id) on delete set null,

  -- Le modèle appelé, tel qu'il se nomme chez le fournisseur. C'est cette
  -- chaîne qui décide du tarif : la traduire ici ferait deux noms pour une
  -- seule chose (règle 10).
  model text not null,

  -- À quoi servait l'appel — « copilote », « extraction-sujets »… Pas pour
  -- facturer : pour savoir **d'où vient** une consommation qui surprend.
  usage_kind text not null default 'inconnu',

  -- Tels que le fournisseur les annonce. `null` quand il ne les annonce pas.
  input_tokens bigint,
  output_tokens bigint,

  created_at timestamptz not null default now()
);

-- « Ma consommation, jour par jour » et « celle de ce projet » sont les deux
-- seules questions posées, et chacune a son index.
create index if not exists ai_usages_owner_idx
  on public.ai_usages (owner_id, created_at desc);

create index if not exists ai_usages_project_idx
  on public.ai_usages (project_id, created_at desc);

alter table public.ai_usages enable row level security;

-- Chacun voit les siennes, où qu'elles aient été faites.
drop policy if exists "ai_usages_les_miennes" on public.ai_usages;
create policy "ai_usages_les_miennes"
on public.ai_usages
for select
to authenticated
using (owner_id = auth.uid());

-- Et celles des projets où l'on travaille : un total de projet qu'on ne peut
-- pas détailler est un total qu'on ne croit pas.
drop policy if exists "ai_usages_de_mes_projets" on public.ai_usages;
create policy "ai_usages_de_mes_projets"
on public.ai_usages
for select
to authenticated
using (
  project_id is not null
  and (
    -- Celui à qui le projet appartient.
    exists (
      select 1 from public.projects projet
      where projet.id = public.ai_usages.project_id
        and projet.owner_id = auth.uid()
    )
    -- Ou quelqu'un qui y travaille. La colonne se nomme
    -- `collaborator_user_id` : la deviner `user_id` aurait rendu la politique
    -- invalide, et le total du projet serait resté vide sans rien dire.
    or exists (
      select 1 from public.project_collaborators collaborateur
      where collaborateur.project_id = public.ai_usages.project_id
        and collaborateur.collaborator_user_id = auth.uid()
    )
  )
);

comment on table public.ai_usages is
  'Ce que chaque appel de modèle a consommé : projet, personne, modèle, jetons. Jamais la question ni la réponse. Les jetons sont repris tels que le fournisseur les annonce ; null quand il ne les annonce pas.';
