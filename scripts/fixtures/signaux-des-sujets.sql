-- Le décor minimal pour rejouer `project_subject_signals` sur un vrai Postgres.
--
-- **Aucune donnée d'un projet réel.** Les noms sont inventés, les textes aussi :
-- un compte rendu de chantier porte des noms d'entreprises et de personnes, et
-- ils n'ont rien à faire dans un dépôt.
--
-- Seules les colonnes que la fonction lit sont déclarées. En déclarer davantage
-- ferait croire que ce décor est le schéma, et il ne l'est pas : le schéma vit
-- dans les migrations, et c'est elles qui font foi.

-- Supabase donne ce rôle à qui est connecté ; la migration lui accorde le droit
-- d'appeler la fonction. Sans lui, la migration s'arrête — et c'est bien : le
-- droit fait partie de ce qu'on vérifie.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end $$;

create table public.subjects (
  id uuid primary key,
  project_id uuid not null,
  title text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subject_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  subject_id uuid not null,
  body_markdown text,
  visibility text not null default 'normal',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.subject_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  subject_id uuid not null,
  created_at timestamptz not null default now()
);

-- La vue réelle joint quatre tables ; ce qui compte ici est ce qu'elle rend.
create table public.project_collaborators_view (
  project_id uuid not null,
  person_id uuid,
  first_name text,
  last_name text,
  full_name text,
  email text
);

insert into public.project_collaborators_view
  (project_id, person_id, first_name, last_name, full_name, email)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000001',
   'Camille', 'ROUX', 'Camille ROUX', 'camille.roux@exemple.test'),
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000002',
   'Dominique', 'VASSIÈRE', 'Dominique VASSIÈRE', 'dvassiere@exemple.test'),
  -- Quelqu'un du projet sans compte ni adresse : il ne doit désigner personne.
  ('11111111-1111-1111-1111-111111111111', '22222222-0000-0000-0000-000000000003',
   '', '', '', ''),
  -- Et quelqu'un d'un autre projet : il ne doit jamais ressortir ici.
  ('99999999-9999-9999-9999-999999999999', '22222222-0000-0000-0000-000000000009',
   'Camille', 'ROUX', 'Camille ROUX', 'ailleurs@exemple.test');

insert into public.subjects (id, project_id, title, description, created_at, updated_at) values
  -- Nommé par son seul nom de famille, **sans l'accent** qu'il porte. Rien
  -- d'autre ne peut le désigner ici : c'est ce qui met le pli à l'épreuve.
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Cloison coupe-feu', 'synthèse prévue avec @VASSIERE au droit des niches',
   '2026-01-01T00:00:00Z', '2026-01-02T00:00:00Z'),
  -- Nommé dans un commentaire seulement, et par son prénom.
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Chape', null, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
  -- Personne n'y est nommé : « voir avec Camille ROUX » n'est pas une mention.
  ('33333333-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Carrelage', 'voir avec Camille ROUX avant jeudi',
   '2026-01-01T00:00:00Z', '2026-01-03T00:00:00Z'),
  -- Nommé par son nom complet, en capitales.
  ('33333333-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Étanchéité', 'relance @CAMILLE ROUX avant la réunion',
   '2026-01-01T00:00:00Z', '2026-01-04T00:00:00Z'),
  -- Un sujet d'un autre projet : la fonction ne doit pas le voir.
  ('33333333-0000-0000-0000-000000000009', '99999999-9999-9999-9999-999999999999',
   'Ailleurs', '@camille roux', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

insert into public.subject_messages
  (project_id, subject_id, body_markdown, visibility, deleted_at, created_at)
values
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000002',
   'relancé, @camille doit passer lundi', 'normal', null, '2026-03-10T09:00:00Z'),
  -- Un échange avec le copilote : privé par construction. Il ne doit ni dater
  -- l'activité, ni produire de mention.
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000003',
   'note du copilote pour @dominique vassiere', 'ephemeral', null, '2026-06-01T09:00:00Z'),
  -- Un message effacé : pareil.
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000003',
   'ancien message citant @camille roux', 'normal', '2026-05-02T00:00:00Z', '2026-05-01T09:00:00Z');

insert into public.subject_history (project_id, subject_id, created_at) values
  ('11111111-1111-1111-1111-111111111111', '33333333-0000-0000-0000-000000000001',
   '2026-04-20T12:00:00Z');
