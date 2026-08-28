-- La dérivation du suivi des avis : ce qui se garde, et ce qui se recalcule.
--
-- Les documents sont des faits, déjà stockés. Les avis n'en sont que la
-- conséquence — ils se recalculent, et la moindre correction du moteur ou du
-- vocabulaire peut les changer. On ne les conserve donc pas comme une vérité,
-- mais comme l'état connu à un moment, daté et signé par le moteur qui l'a
-- produit.
--
-- Deux règles gouvernent ces tables, et elles se lisent dans leur forme.
--
-- 1. UN AVIS N'EST JAMAIS SUPPRIMÉ. Il est mis à jour par son identité
--    naturelle — le projet et le numéro que le bureau de contrôle lui a
--    lui-même attribué —, d'où la contrainte d'unicité qui la porte. Celui qui
--    disparaît du lot est marqué `absent_from_corpus`, sa preuve conservée.
--    Cette règle prépare la promotion des avis en sujets : un sujet ne peut pas
--    être supprimé, donc rien de ce à quoi il se rattachera ne doit pouvoir
--    l'être non plus.
--
-- 2. AUCUN RECALCUL INCRÉMENTAL. `ct_analysis_runs` garde l'empreinte du lot,
--    la version du moteur et les packs employés. Dès que l'un des trois change,
--    tout est relu. Un document plus ancien arrivé en retard réécrit
--    l'histoire, et invalider finement une chaîne chronologique ordonnée est
--    bien plus difficile que de tout recalculer.
--
-- La géométrie extraite des PDF n'est pas stockée : mesure faite, les fichiers
-- pèsent vingt fois moins que ce qu'on en tire, et ils ne peuvent pas périmer.

create table if not exists public.ct_avis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Le numéro que le bureau de contrôle a attribué : c'est lui l'identité, et
  -- c'est pour le lire correctement que le moteur travaille si dur.
  external_reference text not null,
  title text,
  opinion_raw text,
  opinion_label text,
  status text not null,
  resolution_reason text,
  raised_at date,
  raised_in_document_id uuid references public.documents(id) on delete set null,
  last_seen_document_id uuid references public.documents(id) on delete set null,
  resolved_at date,
  -- La preuve d'alors : la phrase, sa page, son document. Un avis qui ne peut
  -- plus se justifier ne vaut pas mieux qu'une affirmation.
  evidence jsonb,
  -- Quel vocabulaire l'a lu, et dans quelle version.
  pack_id text,
  pack_version integer,
  -- L'avis ne ressort plus du lot. On ne l'efface pas : un document a pu être
  -- écarté, un numéro mal lu la veille, et effacer effacerait aussi la trace.
  absent_from_corpus boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ct_avis_project_reference_key unique (project_id, external_reference)
);

create table if not exists public.ct_analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- Les empreintes de contenu des documents lus, triées et condensées : ni
  -- l'ordre de dépôt ni les noms de fichiers n'y entrent.
  corpus_fingerprint text,
  document_count integer not null default 0,
  avis_count integer not null default 0,
  tracked_avis_count integer not null default 0,
  guard_violation_count integer not null default 0,
  packs_used jsonb,
  engine_version text,
  computed_at timestamptz not null default now()
);

create index if not exists ct_avis_project_status_idx
  on public.ct_avis (project_id, status)
  where absent_from_corpus = false;

create index if not exists ct_analysis_runs_project_computed_idx
  on public.ct_analysis_runs (project_id, computed_at desc);

drop trigger if exists trg_ct_avis_updated_at on public.ct_avis;
create trigger trg_ct_avis_updated_at
before update on public.ct_avis
for each row execute function public.set_updated_at();

alter table public.ct_avis enable row level security;
alter table public.ct_analysis_runs enable row level security;

drop policy if exists "ct_avis_open_all" on public.ct_avis;
create policy "ct_avis_open_all"
on public.ct_avis
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "ct_analysis_runs_open_all" on public.ct_analysis_runs;
create policy "ct_analysis_runs_open_all"
on public.ct_analysis_runs
for all
to anon, authenticated
using (true)
with check (true);
