-- Ce que le rapport montre et que son texte ne dit pas.
--
-- Un rapport de bureau de contrôle montre autant qu'il écrit. « Fissuration en
-- pied de voile » ne dit ni l'ampleur, ni l'emplacement, ni qu'aucun repère de
-- mesure n'a été posé à côté — la photo, elle, le dit. Cette moitié de
-- l'information restait dans le PDF, et personne ne la revoyait.
--
-- Une figure est une **découpe de page**, pas une image extraite : on ne lit
-- pas les objets image du document, on découpe la bande qui suit le texte d'un
-- avis quand elle porte de l'encre. Un schéma vectoriel, une capture de tableau
-- ou un plan annoté sont ainsi retenus comme une photographie le serait.
--
-- Trois choses se lisent dans cette table.
--
-- 1. **Une figure porte toujours d'où elle vient** : le document, la page, et
--    le rectangle découpé. Une image sans provenance ne se vérifie pas, et une
--    image qu'on ne peut pas vérifier ne vaut pas mieux qu'une affirmation.
--
-- 2. **Elle ne se stocke qu'une fois.** `sha256` est l'empreinte des pixels :
--    le même schéma répété dans dix rapports occupe une ligne, pas dix. La
--    contrainte d'unicité porte sur le couple document / empreinte, de sorte
--    qu'une seconde lecture du même rapport ne duplique rien.
--
-- 3. **Sa légende est dérivée.** `caption` est ce qu'un modèle a cru voir, et
--    `caption_model` dit lequel. La colonne existe pour que le jour où une
--    légende est écrite, on sache qu'elle n'est pas la parole du bureau de
--    contrôle. Elle peut rester nulle : une figure sans légende reste une
--    figure, une légende inventée serait un faux.

create table if not exists public.avis_figures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,

  -- Où, dans le document.
  page integer not null,
  -- Le rectangle découpé, en points PDF : { x, y, width, height }.
  bbox jsonb,
  -- L'avis auquel la figure se rattache, tel que le bureau de contrôle le
  -- numérote. Une figure sans avis n'est pas écrite : c'est une illustration
  -- de rapport, pas une preuve.
  avis_reference text not null,

  -- Les pixels.
  storage_bucket text not null default 'documents',
  storage_path text not null,
  sha256 text not null,
  width integer,
  height integer,
  -- La part de pixels encrés, telle qu'elle a été mesurée. Elle explique
  -- pourquoi cette bande a été retenue et une autre non.
  ink_ratio real,

  -- Ce qu'un modèle a cru voir. Dérivé, donc réécrivable — et jamais confondu
  -- avec ce que le rapport dit.
  caption text,
  caption_model text,
  caption_generated_at timestamptz,

  created_at timestamptz not null default now(),

  constraint avis_figures_unique unique (document_id, sha256)
);

create index if not exists avis_figures_document_idx
  on public.avis_figures (document_id, page);

create index if not exists avis_figures_avis_idx
  on public.avis_figures (project_id, avis_reference);

alter table public.avis_figures enable row level security;

drop policy if exists "avis_figures_open_all" on public.avis_figures;
create policy "avis_figures_open_all"
on public.avis_figures
for all
to anon, authenticated
using (true)
with check (true);
