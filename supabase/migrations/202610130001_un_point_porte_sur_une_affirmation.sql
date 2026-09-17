-- Un point naît d'où il veut, et il dit sur quoi il porte.
--
-- Étapes 1 et 2 de `docs/lobjet-de-la-connaissance.md`.
--
-- ## Ce que le schéma disait, et qui n'était pas vrai
--
-- `subjects.document_id` et `subjects.analysis_run_id` étaient **obligatoires** :
-- dans le schéma, un point était l'enfant d'un document analysé, pas du projet.
-- Or on ouvre un point parce qu'une valeur pose question, parce qu'une réunion a
-- soulevé quelque chose, ou parce qu'on y pense en marchant — et rien de tout
-- cela n'a de page.
--
-- Le code s'en accommodait en **fabriquant un faux document** :
-- `create_manual_subject` créait un `manual-subjects-system.json` et une analyse
-- fictive « réussie » pour chaque projet, uniquement pour satisfaire deux
-- contraintes. Un document qui n'existe pas, dans la table des documents du
-- projet, avec une analyse qui n'a jamais tourné. Le schéma mentait, et le code
-- mentait pour lui obéir.
--
-- Les deux colonnes deviennent facultatives. Ce qui les portait les garde : un
-- point venu d'un compte rendu cite toujours sa page.
--
-- ## L'arête amont : « porte sur »
--
-- Rien, nulle part, ne disait sur quelle affirmation un point porte. On savait
-- ce qu'un changement de valeur **atteint** — c'est `assertion_dependencies` —
-- et jamais ce qu'un débat ouvert **met en question**.
--
-- Une table à part, et non une colonne sur `subjects` : un point porte souvent
-- sur plusieurs valeurs, et une colonne aurait fait choisir laquelle compte.
--
-- **Deux arêtes, et surtout ne pas les confondre.** Celle-ci dit « ce point met
-- en question cette affirmation-ci ». L'autre — « cette affirmation vient de ce
-- point-là » — n'est pas ici : c'est l'étape 3, et un seul champ pour les deux
-- ferait couvrir une valeur par le débat qui la conteste.
--
-- ## Elle pointe une version, jamais un nom
--
-- Comme l'avis de bureau de contrôle et comme les dépendances : le lien va vers
-- une **affirmation précise**, pas vers une clé métier. Un point n'a pas mis en
-- question « la classe de sol » en général : il a mis en question la valeur C
-- telle qu'elle était affirmée le 12 août. Quand cette affirmation-là est
-- remplacée, la chaîne des remplacements dit ce qu'il advient du débat — et il
-- n'y a rien à écrire pour cela.
--
-- Additive : aucune colonne existante n'est supprimée, aucune contrainte
-- durcie. Deux contraintes sont **relâchées**, ce qui n'invalide aucune ligne.

alter table public.subjects alter column document_id drop not null;
alter table public.subjects alter column analysis_run_id drop not null;

create table if not exists public.subject_assertion_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,

  -- Le point, et la version d'affirmation sur laquelle il porte.
  subject_id uuid not null references public.subjects(id) on delete cascade,
  assertion_id uuid not null references public.project_assertions(id) on delete cascade,

  -- Qui l'a posée, et quand. Un lien sans auteur est une rumeur, comme une
  -- affirmation sans provenance.
  --
  -- `declared_by` nul dit « proposé par reconnaissance, pas encore confirmé » —
  -- et l'écran doit pouvoir le distinguer d'un geste humain. C'est la même
  -- prudence que pour la liaison d'un avis : un point mal accroché contesterait
  -- en silence une valeur que personne n'a mise en doute.
  declared_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  -- Un point ne porte pas deux fois sur la même version.
  unique (subject_id, assertion_id)
);

create index if not exists subject_assertion_links_project_idx
  on public.subject_assertion_links (project_id);

-- Les deux sens se lisent : « sur quoi ce point porte-t-il ? » et « quels points
-- ouverts portent sur cette valeur ? ». La seconde est celle qu'on pose devant
-- une valeur qu'on s'apprête à croire acquise, et c'est la plus importante des
-- deux.
create index if not exists subject_assertion_links_assertion_idx
  on public.subject_assertion_links (assertion_id);

alter table public.subject_assertion_links enable row level security;

-- La même politique que les tables qu'elle relie, mot pour mot. En poser une
-- plus stricte ici rendrait les points lisibles et leurs arêtes invisibles :
-- l'écran afficherait « aucun point ne porte dessus » là où il y en a, ce qui
-- est exactement le mensonge que cette étape existe pour éviter.
drop policy if exists "subject_assertion_links_open_all" on public.subject_assertion_links;
create policy "subject_assertion_links_open_all"
on public.subject_assertion_links
for all
to anon, authenticated
using (true)
with check (true);


-- ## Et le faux document disparaît
--
-- `create_manual_subject` fabriquait, pour chaque projet, un
-- `manual-subjects-system.json` et une analyse fictive « réussie », uniquement
-- pour satisfaire les deux contraintes qu'on vient de relâcher. Un point ouvert
-- à la main ne vient de nulle part ailleurs que du projet : il le dit
-- maintenant, et la table des documents cesse de porter une pièce que personne
-- n'a déposée.
--
-- Les faux documents déjà créés restent : ils sont cités par les points qui les
-- portent, et les effacer romprait cette citation. Une ligne fausse qu'on
-- assume vaut mieux qu'une suppression qui casse — et plus aucune ne se crée.

create or replace function public.create_manual_subject(
  p_project_id uuid,
  p_title text,
  p_actor_person_id uuid,
  p_subject_type text default 'explicit_problem'
)
returns table (
  id uuid,
  project_id uuid,
  title text,
  status text,
  priority text,
  created_at timestamptz,
  updated_at timestamptz,
  subject_number bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_project public.projects;
  v_subject public.subjects;
  v_person_id uuid;
  v_actor_user_id uuid := auth.uid();
  v_title text := trim(coalesce(p_title, ''));
  v_subject_type text := trim(coalesce(p_subject_type, 'explicit_problem'));
  v_actor_label text;
  v_result_label text;
begin
  if p_project_id is null then
    raise exception 'project_id is required';
  end if;

  select * into v_project
  from public.projects p
  where p.id = p_project_id;

  if v_project.id is null then
    raise exception 'Project not found';
  end if;

  if not public.can_access_project_subject_conversation(v_project.id) then
    raise exception 'Insufficient rights to create manual subject';
  end if;

  v_person_id := coalesce(p_actor_person_id, public.current_person_id());
  if v_person_id is null then
    raise exception 'No linked directory person for current user';
  end if;

  if not exists (select 1 from public.directory_people dp where dp.id = v_person_id) then
    raise exception 'Invalid actor person id';
  end if;

  if v_title = '' then
    raise exception 'Subject title cannot be empty';
  end if;

  if v_subject_type not in ('explicit_problem', 'validation_point', 'missing_or_inconsistency') then
    raise exception 'Invalid subject type';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_project.id::text, 0));

  insert into public.subjects (
    project_id,
    document_id,
    analysis_run_id,
    subject_type,
    title,
    normalized_title,
    priority,
    status,
    created_by,
    assignee_user_id,
    assignee_person_id
  )
  values (
    v_project.id,
    -- **Aucun document, aucune analyse.** Un point ouvert à la main ne vient de
    -- nulle part ailleurs que du projet. Fabriquer un faux compte rendu pour
    -- satisfaire deux contraintes mettait dans la table des documents une pièce
    -- que personne n'a déposée, avec une analyse qui n'a jamais tourné.
    null,
    null,
    v_subject_type,
    v_title,
    v_title,
    'medium',
    'open',
    v_actor_user_id,
    v_actor_user_id,
    v_person_id
  )
  returning * into v_subject;

  -- Intentionally does not set document_ref_ids:
  -- business/UI references must be explicitly associated later.

  select coalesce(
    nullif(trim(concat_ws(' ', coalesce(dp.first_name, ''), coalesce(dp.last_name, ''))), ''),
    nullif(trim(coalesce(dp.email, '')), ''),
    'Utilisateur'
  )
    into v_actor_label
  from public.directory_people dp
  where dp.id = v_person_id;

  v_result_label := format('a créé le sujet « %s »', v_title);

  insert into public.subject_history (
    project_id,
    subject_id,
    analysis_run_id,
    document_id,
    subject_observation_id,
    event_type,
    actor_type,
    actor_label,
    actor_user_id,
    title,
    description,
    event_payload
  )
  values (
    v_subject.project_id,
    v_subject.id,
    v_subject.analysis_run_id,
    v_subject.document_id,
    null,
    'subject_created',
    'user',
    coalesce(v_actor_label, 'Utilisateur'),
    v_actor_user_id,
    'Sujet créé',
    v_result_label,
    jsonb_build_object(
      'action', 'created',
      'field', 'subject',
      'before', '{}'::jsonb,
      'after', jsonb_build_object(
        'id', v_subject.id,
        'subject_number', v_subject.subject_number,
        'title', coalesce(v_subject.title, ''),
        'status', coalesce(v_subject.status, ''),
        'priority', coalesce(v_subject.priority, ''),
        'subject_type', coalesce(v_subject.subject_type, ''),
        'created_by', v_subject.created_by,
        'assignee_user_id', v_subject.assignee_user_id,
        'assignee_person_id', v_subject.assignee_person_id
      ),
      'delta', jsonb_build_object('created', true),
      'result_label', v_result_label,
      'display', jsonb_build_object('result_label', v_result_label),
      'actor_person_id', v_person_id
    )
  );

  return query
  select
    v_subject.id,
    v_subject.project_id,
    v_subject.title,
    v_subject.status,
    v_subject.priority,
    v_subject.created_at,
    v_subject.updated_at,
    v_subject.subject_number;
end;
$$;

grant execute on function public.create_manual_subject(uuid, text, uuid, text) to authenticated;
revoke all on function public.create_manual_subject(uuid, text, uuid, text) from public;
