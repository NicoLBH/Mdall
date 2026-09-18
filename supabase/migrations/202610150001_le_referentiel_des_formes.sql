-- Le référentiel des formes de raisonnement, et qui les y a versées.
--
-- Suite de l'étape 2 de `docs/lobjet-de-la-connaissance.md`. La forme existait
-- et se montrait ; rien ne la faisait voyager. Voici où elle voyage.
--
-- ## Deux tables, et c'est la séparation qui fait l'anonymat
--
-- `reasoning_forms` **n'a aucune colonne pour dire d'où elle vient**. Pas de
-- `project_id`, pas de `signed_by`, pas de `created_by`. Ce n'est pas une
-- politique qu'on pourrait desserrer un jour : c'est la forme de la table. Lire
-- le référentiel entier ne permet pas de savoir quel projet a versé quoi, parce
-- que l'information n'y est pas.
--
-- `reasoning_form_contributions` porte ce lien — projet, affirmation,
-- signataire — et **ne se lit que par les membres du projet**. C'est la seule
-- table des deux qui soit privée, et elle l'est complètement.
--
-- Un seul table qui aurait porté les deux aurait obligé à choisir : ouverte, et
-- le référentiel dit qui ; fermée, et il ne sert plus à personne.
--
-- ## L'empreinte est calculée ici, pas reçue
--
-- Le client envoie des noms ; le serveur écrit l'empreinte. Un déclencheur les
-- replie, les ordonne, les dédoublonne et compose la chaîne. Trois raisons :
--
-- 1. **Rien ne peut se cacher dans l'empreinte.** Elle n'est pas un champ libre
--    qu'on remplirait à côté des noms : elle est ce que les noms font. Un client
--    qui y glisserait une valeur la verrait écrasée.
-- 2. **Deux clients ne peuvent pas créer deux fois la même forme.** « Nature du
--    sol + Altitude » et « altitude + nature du sol » se replient sur la même
--    chaîne, et l'unicité les confond. Une valeur écrite à deux endroits finit
--    par diverger (`docs/fondamentaux.md`, règle 4) ; une forme écrite deux fois
--    ferait un référentiel qui ne sait plus ce qu'il sait.
-- 3. Le repli est le même que celui de `services/memoire-identifiants.js` —
--    accents retirés, minuscules, espaces normalisés. Le client envoie donc déjà
--    des noms repliés, et le déclencheur ne fait rien : il est là pour ce qui
--    n'est pas ce client-là.
--
-- ## Ce qui est versé ne se reprend pas
--
-- Une forme versée a pu être lue par un autre projet la seconde d'après. La
-- retirer ne la retirerait de la tête de personne, et prétendre le contraire
-- serait mentir sur ce que le produit sait faire. **Il n'y a donc pas de chemin
-- de suppression d'une forme**, et l'écran le dit avant qu'on signe.
--
-- Ce qui se retire, c'est la **signature** : « ce projet-ci a versé cette
-- forme » est une information privée, et elle s'efface. `retire_le` la marque
-- plutôt que de supprimer la ligne — un constat ne devient pas faux (règle 6),
-- et l'unicité doit continuer d'empêcher un second versement.
--
-- ## Ce que cette migration ne fait pas
--
-- Elle ne garantit pas qu'un nom soit anonyme. « Hauteur sous plafond du bureau
-- de la directrice » est un nom, il passera, et aucune règle en base ne peut
-- l'en empêcher. C'est pourquoi la sortie se signe, devant la forme entière
-- affichée : la garantie est là, et elle est humaine. La base garantit
-- seulement que **rien d'autre que des noms** ne peut entrer.
--
-- Strictement additive : deux tables nouvelles, une fonction nouvelle. Rien
-- d'existant n'est touché.

-- ── Le référentiel, anonyme par construction ─────────────────────────────────

create table if not exists public.reasoning_forms (
  id uuid primary key default gen_random_uuid(),

  -- De quoi on part, et ce qu'on en tire. Des noms, jamais des valeurs : il n'y
  -- a pas de colonne où une valeur pourrait aller.
  entrees text[] not null,
  conclusions text[] not null,

  -- Le vocabulaire de métier qui range la forme — « gros-oeuvre », « incendie ».
  -- Facultatif : une forme sans domaine se range mal, elle ne se perd pas.
  domaine text not null default '',

  -- Ce que le déclencheur compose. Lisible, parce qu'une empreinte qu'on ne sait
  -- pas lire est une empreinte qu'on ne sait pas contrôler avant de la laisser
  -- partir — et le seul moment où le contrôle est possible, c'est avant.
  empreinte text not null default '',

  created_at timestamptz not null default now()
);

-- `unaccent` est une extension, et elle n'est pas installée partout. Plutôt que
-- de faire dépendre le référentiel de sa présence, on replie ce qu'on sait
-- replier sans elle — le client, lui, a déjà retiré les accents.
create or replace function public.unaccent_ou_pas(valeur text)
returns text
language sql
immutable
as $$
  select translate(
    coalesce(valeur, ''),
    'àâäáãåÀÂÄÁÃÅçÇéèêëÉÈÊËîïíìÎÏÍÌôöòóõÔÖÒÓÕûüùúÛÜÙÚÿŸñÑ',
    'aaaaaaAAAAAAcCeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUyYnN'
  );
$$;

create or replace function public.reasoning_form_empreinte()
returns trigger
language plpgsql
as $$
begin
  -- Repliées, ordonnées, dédoublonnées, les vides retirées. Le même repli que
  -- `cleDuSujet` côté client : accents retirés, minuscules, espaces normalisés.
  new.entrees := coalesce((
    select array_agg(distinct nom order by nom)
    from (
      select regexp_replace(lower(unaccent_ou_pas(btrim(valeur))), '\s+', ' ', 'g') as nom
      from unnest(new.entrees) as valeur
    ) as replies
    where nom <> ''
  ), array[]::text[]);

  new.conclusions := coalesce((
    select array_agg(distinct nom order by nom)
    from (
      select regexp_replace(lower(unaccent_ou_pas(btrim(valeur))), '\s+', ' ', 'g') as nom
      from unnest(new.conclusions) as valeur
    ) as replies
    where nom <> ''
  ), array[]::text[]);

  new.domaine := regexp_replace(lower(btrim(coalesce(new.domaine, ''))), '\s+', ' ', 'g');

  -- Écrite, jamais reçue : ce que le client aurait mis là est écrasé.
  new.empreinte :=
    array_to_string(new.entrees, ' + ') || ' > ' || array_to_string(new.conclusions, ' + ');

  return new;
end;
$$;

drop trigger if exists trg_reasoning_forms_empreinte on public.reasoning_forms;
create trigger trg_reasoning_forms_empreinte
before insert or update on public.reasoning_forms
for each row execute function public.reasoning_form_empreinte();

-- Une forme n'existe qu'une fois. C'est ce qui fait qu'un second versement
-- reconnaît la forme déjà là au lieu d'en créer une jumelle.
create unique index if not exists reasoning_forms_empreinte_idx
  on public.reasoning_forms (empreinte);

-- La question qu'on pose vraiment : « j'ai à trancher ceci — d'où part-on
-- ailleurs ? ». Elle se pose sur les conclusions, et c'est le seul index qui
-- compte.
create index if not exists reasoning_forms_conclusions_idx
  on public.reasoning_forms using gin (conclusions);

alter table public.reasoning_forms enable row level security;

-- Le référentiel se lit par tous ceux qui ont un compte : c'est ce pour quoi il
-- existe. Il ne contient rien qui appartienne à quiconque — ni valeur, ni
-- projet, ni personne — et le restreindre à son propre projet le réduirait à ce
-- qu'on sait déjà.
drop policy if exists "reasoning_forms_lecture" on public.reasoning_forms;
create policy "reasoning_forms_lecture"
on public.reasoning_forms
for select
to authenticated
using (true);

-- On y verse, on n'y reprend rien : pas de politique `update`, pas de politique
-- `delete`. Ce n'est pas un oubli, c'est la promesse de l'écran.
drop policy if exists "reasoning_forms_versement" on public.reasoning_forms;
create policy "reasoning_forms_versement"
on public.reasoning_forms
for insert
to authenticated
with check (true);

-- ── Qui a versé quoi : privé, et seulement pour son projet ───────────────────

create table if not exists public.reasoning_form_contributions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.reasoning_forms(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,

  -- Le raisonnement d'où la forme est tirée. `on delete set null` : la forme
  -- reste versée même si la ligne de mémoire disparaît, parce qu'elle est
  -- partie.
  assertion_id uuid references public.project_assertions(id) on delete set null,

  -- La signature. C'est elle qui fait du versement une proposition signée
  -- (règle 1) et non un effet de bord.
  signed_by uuid references auth.users(id),
  signed_at timestamptz not null default now(),

  -- Retirer sa signature n'efface pas la ligne : elle garde la place, et
  -- l'unicité continue d'empêcher un second versement de la même forme depuis
  -- le même projet.
  retire_le timestamptz,
  retire_par uuid references auth.users(id),

  unique (project_id, form_id)
);

create index if not exists reasoning_form_contributions_project_idx
  on public.reasoning_form_contributions (project_id);

alter table public.reasoning_form_contributions enable row level security;

-- Lecture : le propriétaire du projet et ses collaborateurs actifs, et personne
-- d'autre. La même politique, mot pour mot, que les faits de contexte d'un
-- projet — deux politiques différentes pour deux tables également privées
-- finiraient par ne pas protéger de la même chose.
drop policy if exists "reasoning_form_contributions_lecture" on public.reasoning_form_contributions;
create policy "reasoning_form_contributions_lecture"
on public.reasoning_form_contributions
for select
to authenticated
using (
  project_id in (
    select p.id from public.projects p where p.owner_id = auth.uid()
  )
  or project_id in (
    select pc.project_id
    from public.project_collaborators pc
    left join public.directory_people dp on dp.id = pc.person_id
    where pc.status = 'Actif'
      and (pc.collaborator_user_id = auth.uid() or dp.linked_user_id = auth.uid())
  )
);

drop policy if exists "reasoning_form_contributions_signature" on public.reasoning_form_contributions;
create policy "reasoning_form_contributions_signature"
on public.reasoning_form_contributions
for insert
to authenticated
with check (
  project_id in (
    select p.id from public.projects p where p.owner_id = auth.uid()
  )
  or project_id in (
    select pc.project_id
    from public.project_collaborators pc
    left join public.directory_people dp on dp.id = pc.person_id
    where pc.status = 'Actif'
      and (pc.collaborator_user_id = auth.uid() or dp.linked_user_id = auth.uid())
  )
);

-- Retirer sa signature marque la ligne ; personne ne la supprime.
drop policy if exists "reasoning_form_contributions_retrait" on public.reasoning_form_contributions;
create policy "reasoning_form_contributions_retrait"
on public.reasoning_form_contributions
for update
to authenticated
using (
  project_id in (
    select p.id from public.projects p where p.owner_id = auth.uid()
  )
  or project_id in (
    select pc.project_id
    from public.project_collaborators pc
    left join public.directory_people dp on dp.id = pc.person_id
    where pc.status = 'Actif'
      and (pc.collaborator_user_id = auth.uid() or dp.linked_user_id = auth.uid())
  )
);
