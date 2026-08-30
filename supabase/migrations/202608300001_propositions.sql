-- Une proposition : un changement du corpus soumis à jugement.
--
-- C'est la moitié de la métaphore git qu'on garde. L'autre moitié — la branche —
-- est abandonnée, et il faut dire pourquoi, parce que la forme de ces tables en
-- découle entièrement.
--
-- Une branche suppose une copie de travail isolée. Dans git elle est bon marché
-- parce que tout est adressé par contenu ; ici l'état est une base relationnelle
-- avec quinze tables et des cascades. La copier voudrait dire réécrire chaque
-- clé étrangère, ou doubler chaque table d'une couche « proposé ». Et surtout :
-- ce qu'une branche contiendrait — les avis, la chronologie — est **dérivé**, et
-- se recalcule entièrement dès que le corpus bouge. On versionnerait la sortie
-- d'une fonction dont les entrées sont déjà versionnées.
--
-- D'où la règle qui remplace la branche, et qu'on retrouvera dans chaque
-- requête d'analyse :
--
--   LE CORPUS D'UNE ANALYSE EST UNE REQUÊTE, PAS UNE COPIE.
--   documents acceptés du projet + documents de la proposition qu'on regarde.
--
-- Rien n'est dupliqué. `documents.corpus_state` suffit à séparer les deux.

create table if not exists public.propositions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  -- 'open' tant qu'on peut y ajouter et en discuter ; 'merged' quand elle a été
  -- appliquée au corpus ; 'closed' quand on y a renoncé. Une proposition n'est
  -- jamais supprimée : elle porte des réponses humaines, qui restent.
  status text not null default 'open',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  merged_at timestamptz,
  merged_by uuid references auth.users(id),
  constraint propositions_status_check check (status in ('open', 'merged', 'closed'))
);

-- Les affirmations que la proposition soumet, une par une.
--
-- Ce n'est pas un journal : ce sont les décisions du projet. Les items acceptés
-- sont ce contre quoi les recalculs futurs seront confrontés, et c'est ce qui
-- rendra possible de dire « ceci contredit ce que vous aviez décidé le 12 mars ».
-- Sans eux, une proposition ne serait qu'un écran d'aperçu.
--
-- `item_type` reste un TEXTE LIBRE, sans énumération. Les types viendront des
-- documents qu'on saura lire — un document, un rattachement d'affaire, un avis,
-- demain un jalon ou un lot —, et une contrainte ici obligerait à une migration
-- pour chacun. Le code sait lesquels il traite ; ceux qu'il ignore ne le gênent pas.
--
-- `item_key` est l'identité métier de l'affirmation à l'intérieur de son type :
-- un identifiant de document, une valeur d'affaire, un numéro d'avis. C'est elle
-- qui permettra de retrouver une décision passée pour la confronter — donc elle
-- doit être stable, et ne jamais dépendre de l'ordre d'un lot.
create table if not exists public.proposition_items (
  id uuid primary key default gen_random_uuid(),
  proposition_id uuid not null references public.propositions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  item_type text not null,
  item_key text not null,
  payload jsonb,
  status text not null default 'proposed',
  -- Un refus sans phrase est un refus qu'on ne pourra pas contester.
  reason text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposition_items_status_check check (status in ('proposed', 'accepted', 'refused')),
  constraint proposition_items_unique unique (proposition_id, item_type, item_key)
);

-- Où en est un document vis-à-vis du corpus.
--
-- 'accepted' par défaut : tout ce qui existe aujourd'hui est dans le corpus, et
-- doit le rester. C'est ce qui rend cette migration sans effet sur l'existant.
alter table public.documents
  add column if not exists corpus_state text not null default 'accepted',
  add column if not exists proposition_id uuid references public.propositions(id) on delete set null;

alter table public.documents
  drop constraint if exists documents_corpus_state_check;
alter table public.documents
  add constraint documents_corpus_state_check
  check (corpus_state in ('accepted', 'proposed', 'refused'));

create index if not exists propositions_project_status_idx
  on public.propositions (project_id, status, created_at desc);

create index if not exists proposition_items_proposition_idx
  on public.proposition_items (proposition_id);

create index if not exists documents_corpus_state_idx
  on public.documents (project_id, corpus_state)
  where deleted_at is null;

drop trigger if exists trg_propositions_updated_at on public.propositions;
create trigger trg_propositions_updated_at
before update on public.propositions
for each row execute function public.set_updated_at();

drop trigger if exists trg_proposition_items_updated_at on public.proposition_items;
create trigger trg_proposition_items_updated_at
before update on public.proposition_items
for each row execute function public.set_updated_at();

alter table public.propositions enable row level security;
alter table public.proposition_items enable row level security;

drop policy if exists "propositions_open_all" on public.propositions;
create policy "propositions_open_all"
on public.propositions
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "proposition_items_open_all" on public.proposition_items;
create policy "proposition_items_open_all"
on public.proposition_items
for all
to anon, authenticated
using (true)
with check (true);
