-- Une situation regarde un périmètre, et non plus un projet.
--
-- ## Ce qui était trop étroit
--
-- Une entreprise travaille sur quatre chantiers. Ce qu'elle a à faire est
-- réparti entre quatre projets, et il faut ouvrir les quatre pour savoir ce qui
-- l'attend cette semaine. `situations.project_id` était `not null` : une
-- situation ne pouvait regarder qu'un endroit.
--
-- Voir `docs/les-situations-traversent-les-projets.md`, étape 2.
--
-- ## Ce que le périmètre dit
--
--   {"portee": "projet",  "projets": ["…"]}        un seul, comme aujourd'hui
--   {"portee": "choisis", "projets": ["…", "…"]}   ceux-là
--   {"portee": "tous"}                             tous ceux où je suis
--
-- **Une liste, et pas un booléen.** « Tous mes projets » et « ces trois-là » ne
-- sont pas la même intention : la première suit une personne, la seconde une
-- affaire. Un jour on voudra les distinguer à l'écran, et un booléen aurait
-- perdu la différence en route.
--
-- **`tous` ne liste rien, et cela ne veut pas dire « aucun ».** C'est le piège
-- de cette colonne : qui compterait les projets pour savoir ce qu'une situation
-- regarde lirait « zéro » sur celle qui regarde tout (règle 5).
--
-- ## Rien ne bouge pour ce qui existe
--
-- Chaque situation reçoit `{portee: "projet", projets: [son project_id]}`. Elle
-- regarde exactement ce qu'elle regardait hier. Une migration qui déplacerait
-- du travail au passage serait impossible à contrôler : on ne saurait plus, en
-- cas de doute, si c'est le code ou la migration qui a tort.
--
-- ## `project_id` reste, et devient facultatif
--
-- Il ne peut pas partir aujourd'hui : l'écran des situations est encore celui
-- d'un projet, et il filtre dessus. Il part à l'étape 3, quand l'écran devient
-- le mien. D'ici là **le périmètre est la vérité** et `project_id` la suit —
-- une valeur écrite à deux endroits finit par diverger (règle 4), et c'est le
-- périmètre qu'on lira.
--
-- Strictement additive : une colonne, une contrainte, un index, une obligation
-- retirée. Aucune donnée déplacée, aucune colonne supprimée.

alter table public.situations
  add column if not exists perimetre jsonb;

-- Ce qui existait regarde ce qu'il regardait. Rien de plus.
update public.situations
set perimetre = jsonb_build_object(
  'portee', 'projet',
  'projets', jsonb_build_array(project_id::text)
)
where perimetre is null
  and project_id is not null;

-- La forme est tenue par la base : un périmètre mal formé ne se voit pas à
-- l'écran, il rend simplement moins de sujets qu'il ne devrait.
alter table public.situations
  drop constraint if exists situations_perimetre_check;

alter table public.situations
  add constraint situations_perimetre_check
    check (
      perimetre is null
      or (
        jsonb_typeof(perimetre) = 'object'
        and perimetre->>'portee' in ('projet', 'choisis', 'tous')
        and (
          -- « tous » ne liste rien : la liste n'a pas à être écrite, et si elle
          -- l'est elle ne doit rien contredire.
          perimetre->>'portee' = 'tous'
          or (
            jsonb_typeof(perimetre->'projets') = 'array'
            and jsonb_array_length(perimetre->'projets') >= 1
            -- « projet » veut dire un seul : deux en feraient un « choisis »
            -- qui n'ose pas dire son nom.
            and (perimetre->>'portee' <> 'projet' or jsonb_array_length(perimetre->'projets') = 1)
          )
        )
      )
    );

-- Pour l'étape 3 : « quelles situations regardent ce projet ? » se demandera
-- à la base, pas à quinze lectures suivies d'un filtre en mémoire.
create index if not exists situations_perimetre_idx
  on public.situations using gin (perimetre);

-- Une situation qui regarde plusieurs projets n'en a plus un seul à inscrire
-- ici. La colonne reste pour ce qui n'a pas encore migré.
alter table public.situations
  alter column project_id drop not null;

-- ## Ce qui écrit une situation doit écrire son périmètre
--
-- La situation système d'un projet en est une : sans périmètre, elle naîtrait
-- en regardant nulle part, et personne ne le verrait avant l'étape 3.
create or replace function public.ensure_default_project_situations(p_project_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if p_project_id is null then
    return;
  end if;

  insert into public.situations (
    project_id,
    perimetre,
    title,
    description,
    objective_text,
    status,
    progress_percent,
    mode,
    filter_definition
  )
  select
    p_project_id,
    jsonb_build_object('portee', 'projet', 'projets', jsonb_build_array(p_project_id::text)),
    'Tous les sujets ouverts',
    'Situation système créée automatiquement pour regrouper tous les sujets ouverts du projet.',
    'Tous les sujets ouverts',
    'open',
    0,
    'automatic',
    jsonb_build_object('status', jsonb_build_array('open'))
  where not exists (
    select 1
    from public.situations s
    where s.project_id = p_project_id
      and lower(trim(coalesce(s.title, ''))) = lower('Tous les sujets ouverts')
  );
end;
$$;

comment on column public.situations.perimetre is
  'Ce que la situation regarde : {"portee":"projet|choisis|tous","projets":[...]}. « tous » ne liste rien, et cela ne veut pas dire « aucun ». C''est la vérité du périmètre ; project_id la suit jusqu''à l''étape 3.';

comment on column public.situations.project_id is
  'Projet d''origine. Facultatif depuis le périmètre : une situation peut en regarder plusieurs. Lire perimetre, pas cette colonne.';
