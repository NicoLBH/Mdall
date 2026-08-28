-- La mémoire d'identité d'un projet.
--
-- Un RICT du projet B déposé dans le projet A était lu, analysé et conservé
-- sans un mot, ses avis mêlés aux vrais. Il fallait pouvoir dire à quel projet
-- un document appartient.
--
-- La solution évidente — une colonne « numéro d'affaire » sur le projet —
-- aurait été fausse, et coûteuse : « projet A, montée d'escalier B » et
-- « projet A, montée d'escalier C » peuvent porter deux affaires distinctes
-- tout en étant le même chantier. Une identité tenant en un champ aurait fait
-- rejeter des livrables légitimes.
--
-- D'où une table, et non une colonne. Trois propriétés en découlent.
--
-- 1. UN PROJET A PLUSIEURS MARQUEURS, ET LEUR NOMBRE CROÎT. Chaque affaire
--    confirmée s'y ajoute. Plus le projet avance, mieux sa mémoire discrimine :
--    c'est l'inverse d'une règle écrite une fois pour toutes.
--
-- 2. RIEN N'Y ENTRE SANS UN HUMAIN. `confirmed_by` porte qui a répondu. Un
--    marqueur n'est pas une lecture automatique conservée, c'est une réponse à
--    une question posée — et c'est pourquoi on peut ensuite s'y fier.
--
-- 3. LA VALEUR EST NORMALISÉE, LE LIBELLÉ EST GARDÉ. `marker_value` sert à
--    comparer — sans accents ni casse —, `marker_label` à écrire la phrase.
--    Comparer sur ce qu'on affiche ferait échouer l'appariement au premier
--    accent ; afficher ce qu'on compare donnerait des phrases illisibles.
--
-- `marker_type` reste un texte libre, sans contrainte d'énumération : les
-- prochains types viendront des documents qu'on saura lire — un nom
-- d'opération, un numéro de permis — et une contrainte ici obligerait à une
-- migration pour chaque. Le code sait lesquels il traite ; ceux qu'il ignore
-- ne le gênent pas.

create table if not exists public.project_identity_markers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  -- La nature du marqueur : `chrono_affaire`, `affaire`, et ce qui viendra.
  marker_type text not null,
  -- La valeur comparable : sans accents, sans casse, espaces normalisés.
  marker_value text not null,
  -- La valeur telle qu'elle est imprimée, pour pouvoir la citer.
  marker_label text,
  -- Combien de documents l'attestent. Un marqueur vu une fois vaut moins qu'un
  -- marqueur vu vingt fois, et l'écran doit pouvoir le dire.
  document_count integer not null default 1,
  -- Qui a confirmé. Un marqueur sans réponse humaine n'a pas à exister ici.
  confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_identity_markers_unique unique (project_id, marker_type, marker_value)
);

create index if not exists project_identity_markers_project_idx
  on public.project_identity_markers (project_id);

drop trigger if exists trg_project_identity_markers_updated_at on public.project_identity_markers;
create trigger trg_project_identity_markers_updated_at
before update on public.project_identity_markers
for each row execute function public.set_updated_at();

alter table public.project_identity_markers enable row level security;

drop policy if exists "project_identity_markers_open_all" on public.project_identity_markers;
create policy "project_identity_markers_open_all"
on public.project_identity_markers
for all
to anon, authenticated
using (true)
with check (true);
