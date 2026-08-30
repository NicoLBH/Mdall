-- Ce que les gens se disent autour d'une proposition.
--
-- Jusqu'ici, une proposition portait des faits — des documents, des décisions —
-- et une description écrite une fois pour toutes par celui qui l'ouvrait. Il y
-- manquait le plus humain : la discussion. « Pourquoi tu écartes celui-là ? »,
-- « le bureau de contrôle a renvoyé le rapport corrigé », « on assume, on
-- fusionne ». Ce sont ces phrases qu'on relit dans six mois, et elles n'avaient
-- nulle part où aller.
--
-- Deux règles gouvernent cette table, et elles se lisent dans sa forme.
--
-- 1. **Rien n'est effacé.** Un message retiré est marqué `deleted_at` et son
--    texte reste : c'est la règle du projet partout ailleurs, et elle vaut
--    d'autant plus ici qu'un message supprimé peut être la seule trace d'une
--    objection. L'écran affiche « message retiré », le contenu ne réapparaît
--    pas — mais il n'est pas perdu pour autant.
--
-- 2. **Une modification se dit.** `edited_at` porte la date du dernier
--    changement, et l'écran l'affiche. Réécrire un message sans le dire
--    permettrait de faire mentir une conversation qui sert de mémoire.
--
-- On peut commenter une proposition close, et c'est délibéré : la décision est
-- figée, la conversation ne l'est pas. C'est souvent après coup qu'on comprend
-- ce qui s'est joué, et le dire là où cela s'est joué vaut mieux que de le dire
-- ailleurs.

create table if not exists public.proposition_comments (
  id uuid primary key default gen_random_uuid(),
  proposition_id uuid not null references public.propositions(id) on delete cascade,
  -- Le projet est redondant avec la proposition, et c'est voulu : il permet de
  -- lire « tout ce qui s'est dit sur ce projet » sans jointure.
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposition_comments_proposition_idx
  on public.proposition_comments (proposition_id, created_at);

drop trigger if exists trg_proposition_comments_updated_at on public.proposition_comments;
create trigger trg_proposition_comments_updated_at
before update on public.proposition_comments
for each row execute function public.set_updated_at();

alter table public.proposition_comments enable row level security;

drop policy if exists "proposition_comments_open_all" on public.proposition_comments;
create policy "proposition_comments_open_all"
on public.proposition_comments
for all
to anon, authenticated
using (true)
with check (true);
