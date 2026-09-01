-- Les discussions avec le copilote, en base — et à personne d'autre.
--
-- Elles vivaient dans le navigateur. C'était la garantie la plus simple qui
-- soit : ce qui n'est jamais écrit ne fuit pas. Mais elle se payait cher — une
-- discussion perdue en changeant de poste, effacée avec les données du site,
-- introuvable le lendemain sur un autre écran. Une mémoire de travail qui ne
-- survit pas à la nuit n'est pas une mémoire de travail.
--
-- Elles passent donc en base. La garantie change de nature, et il faut le dire
-- franchement : elle ne repose plus sur l'absence d'écriture, mais sur **la
-- politique de sécurité de ces deux tables**. C'est désormais la seule chose
-- qui se tient entre une conversation privée et le reste de l'équipe.
--
-- ## Pourquoi cette politique n'est pas celle du reste de la base
--
-- Les tables de Mdall — la mémoire, les actes, les zones — sont ouvertes à tout
-- utilisateur du projet : c'est voulu, ce sont des choses que le projet tient
-- pour vraies, et les cacher n'aurait aucun sens.
--
-- **Ici, non.** On essaie des questions au copilote, on y dit ce qu'on ne sait
-- pas, on y prépare ce qu'on n'assume pas encore. Qu'une seule de ces
-- conversations apparaisse sous les yeux d'un autre intervenant et plus
-- personne n'écrira rien de vrai : le produit serait discrédité, et il l'aurait
-- mérité.
--
-- La politique est donc **propriétaire seul**, dans les deux sens :
--
--   using       — on ne lit que les siennes ;
--   with check  — on n'en écrit que pour soi.
--
-- Sans `with check`, on ne verrait pas les conversations des autres mais on
-- pourrait leur en fabriquer. Et `to authenticated` seulement : la clé anonyme
-- ne désigne personne, donc `auth.uid()` y est nul, donc aucune ligne ne lui
-- appartient — mais l'écrire évite d'avoir à s'en convaincre.
--
-- Le projet est rattaché pour que les discussions se rangent par chantier, et
-- **il n'ouvre aucun droit** : appartenir au projet ne donne pas accès aux
-- conversations qui s'y tiennent. C'est la différence entre « ranger » et
-- « partager ».
--
-- ## Ce qui est écrit, et ce qui ne l'est pas
--
-- Les questions et les réponses, avec leur date et leur décompte de jetons.
-- Pas la mémoire du projet envoyée avec elles : elle est déjà en base, la
-- recopier ici en ferait une seconde source qui divergerait.
--
-- Additive : aucune table ni colonne existante n'est modifiée.

create table if not exists public.copilot_conversations (
  id uuid primary key default gen_random_uuid(),

  -- Le chantier dont on parle. Il range, il n'autorise pas.
  project_id uuid not null references public.projects(id) on delete cascade,

  -- Le seul qui puisse lire cette discussion. `default auth.uid()` évite qu'un
  -- appelant distrait écrive une ligne au nom d'un autre : la valeur par défaut
  -- est déjà la bonne, et `with check` refuse toute autre.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Le titre, quand quelqu'un l'a renommée. Sinon la première question fait
  -- office de nom, et elle se recalcule à la lecture : la recopier ici la
  -- laisserait diverger du message qu'elle résume.
  title text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.copilot_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null references public.copilot_conversations(id) on delete cascade,

  -- Répété sur le message, et pas seulement porté par la discussion : une
  -- politique qui devrait remonter à la conversation pour savoir à qui est un
  -- message serait plus lente et plus facile à contourner.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  role text not null check (role in ('user', 'assistant')),
  content text not null,

  -- Ce que le modèle a consommé. Nul tant qu'il ne le dit pas : zéro serait un
  -- chiffre, et on ne fabrique pas les chiffres d'un compteur.
  tokens_in integer,
  tokens_out integer,

  created_at timestamptz not null default now()
);

-- Les discussions d'une personne sur un projet, la plus récemment touchée
-- d'abord : c'est l'ordre du rail.
create index if not exists copilot_conversations_owner_idx
  on public.copilot_conversations (owner_id, project_id, updated_at desc);

-- Les messages d'une discussion, dans l'ordre du fil.
create index if not exists copilot_messages_conversation_idx
  on public.copilot_messages (conversation_id, created_at);

alter table public.copilot_conversations enable row level security;
alter table public.copilot_messages enable row level security;

drop policy if exists "copilot_conversations_owner_only" on public.copilot_conversations;
create policy "copilot_conversations_owner_only"
on public.copilot_conversations
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Deux conditions, et la seconde n'est pas redondante : `owner_id` protège la
-- ligne, l'existence de la conversation empêche d'accrocher un message à la
-- discussion de quelqu'un d'autre en se déclarant propriétaire du message.
drop policy if exists "copilot_messages_owner_only" on public.copilot_messages;
create policy "copilot_messages_owner_only"
on public.copilot_messages
for all
to authenticated
using (
  owner_id = auth.uid()
  and exists (
    select 1 from public.copilot_conversations c
    where c.id = conversation_id and c.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1 from public.copilot_conversations c
    where c.id = conversation_id and c.owner_id = auth.uid()
  )
);
