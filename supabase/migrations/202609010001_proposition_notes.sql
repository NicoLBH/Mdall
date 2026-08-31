-- La note de dépôt : ce qu'un lot de documents dit, et ce qu'il change.
--
-- Une pull request GitHub porte un texte écrit par celui qui l'ouvre, et il
-- peut l'écrire parce qu'il sait ce qu'il a changé : il vient de l'écrire. Ici,
-- celui qui dépose dix-sept PDF ne sait pas ce qu'ils contiennent — c'est la
-- machine qui les a lus, pas lui. D'où cette table : le corps du message est
-- rédigé par la machine, au-dessus des faits que l'analyse a établis.
--
-- Trois choses se lisent dans sa forme.
--
-- 1. **Elle est en ajout seul.** Une note ne se réécrit pas : une nouvelle est
--    écrite, et c'est la plus récente qui s'affiche. Les précédentes restent —
--    elles disent ce que le projet croyait comprendre du lot à ce moment-là, et
--    c'est parfois la seule trace d'une lecture qui a changé.
--
-- 2. **Elle garde les faits.** `facts` est le relevé exact qui a servi à la
--    rédaction. Sans lui, on ne pourrait plus dire si une phrase de la note
--    vient d'un calcul ou d'un modèle qui a comblé un trou — et c'est
--    précisément la question qu'on se posera.
--
-- 3. **Elle sait sur quoi elle portait.** `fingerprint` est l'empreinte du lot
--    analysé. Tant qu'elle ne bouge pas, rien n'est réécrit : une note dérivée
--    se recalcule quand ce dont elle dérive bouge, pas à chaque affichage. Et
--    quand la proposition se ferme, la dernière note reste telle quelle — ce
--    qui est décidé se conserve.
--
-- `source` distingue ce que la machine a écrit de ce qu'un humain a corrigé.
-- L'écran ne propose pas encore la correction ; la colonne existe pour que le
-- jour où il la proposera, on n'ait pas à deviner l'origine des notes passées.

create table if not exists public.proposition_notes (
  id uuid primary key default gen_random_uuid(),
  proposition_id uuid not null references public.propositions(id) on delete cascade,
  -- Redondant avec la proposition, et voulu : il permet de lire « toutes les
  -- notes de ce projet » sans jointure.
  project_id uuid not null references public.projects(id) on delete cascade,
  markdown text not null,
  facts jsonb,
  fingerprint text,
  model text,
  source text not null default 'machine',
  generated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists proposition_notes_proposition_idx
  on public.proposition_notes (proposition_id, created_at desc);

alter table public.proposition_notes enable row level security;

drop policy if exists "proposition_notes_open_all" on public.proposition_notes;
create policy "proposition_notes_open_all"
on public.proposition_notes
for all
to anon, authenticated
using (true)
with check (true);
