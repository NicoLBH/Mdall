-- Les deux signaux qu'un sujet émet : **quand il a bougé**, et **qui y est nommé**.
--
-- ## Pourquoi ça passe en base
--
-- Le navigateur rapatriait le **corps de tous les messages du projet** pour les
-- relire lui-même : c'était la seule façon de savoir qu'un sujet avait été
-- commenté hier, et de trouver un `@nicolas LE BIHAN` tapé au clavier dans une
-- description. Cela marchait sur un projet neuf et devenait intenable sur un
-- projet installé — quelques milliers de messages, et l'on paie une lecture
-- complète de la discussion à chaque ouverture de la liste des sujets, pour en
-- tirer une date et une poignée d'identifiants.
--
-- Le calcul descend donc là où les textes sont déjà. Ce qui remonte, c'est
-- **une ligne par sujet** : une date, et un tableau de personnes. Des kilo-
-- octets là où il y avait des méga-octets, et le texte des conversations ne
-- traverse plus le réseau du tout.
--
-- ## Ce que « a bougé » veut dire
--
-- La plus récente de quatre dates : la ligne du sujet, sa création, son dernier
-- message, et son dernier événement métier (`subject_history` — statut,
-- assignation, labels, situation, objectif, parent, blocage). `updated_at` seul
-- manquait tout ce qui se passe dans le fil de discussion, c'est-à-dire
-- l'essentiel de la vie d'un sujet.
--
-- ## Ce que « y est nommé » veut dire
--
-- `subject_message_mentions` ne porte que les mentions **choisies dans la liste**
-- de complétion. Quelqu'un qui tape `@nicolas LE BIHAN` au clavier n'écrit aucune
-- ligne — et c'est le cas courant, pas le cas limite : un texte collé depuis un
-- compte rendu ne passe jamais par la liste. On relit donc le titre, la
-- description et les messages, et l'on y cherche les écritures qui désignent
-- quelqu'un du projet.
--
-- L'arobase est **exigée** : chercher le nom seul retiendrait tout sujet qui
-- parle de quelqu'un, et « voir avec Benoît » n'est pas une mention. Un `@` qui
-- ne correspond à personne du projet ne rend rien plutôt que d'ouvrir un nom au
-- plus proche : une mention fausse fait répondre quelqu'un à la place d'un autre
-- (`docs/fondamentaux.md`, règle 5).
--
-- ## Ce que cette fonction ne peut pas faire voir
--
-- Elle est **`security invoker`** : elle lit les sujets et les messages avec les
-- droits de qui appelle, et la politique de sécurité des tables s'applique
-- inchangée. Une fonction `security definer` aurait fait d'un simple filtre une
-- porte dérobée sur les conversations du projet.
--
-- Et elle ignore les messages `visibility = 'ephemeral'` : ce sont les échanges
-- avec le copilote, qui sont privés par construction. Les compter ferait
-- « bouger » un sujet parce qu'une IA a répondu, et pire, ferait apparaître dans
-- un signal partagé ce qui ne doit jamais l'être.
--
-- Strictement additive : aucune table, aucune colonne, aucune politique n'est
-- modifiée. Deux fonctions en lecture seule, et rien d'autre.

begin;

-- Replier un texte : sans accent, sans casse, et les espaces ramenés à un seul.
--
-- On ne tape pas les accents dans un `@`, et jamais deux fois la même casse. Le
-- pli se fait des deux côtés — le texte et le nom —, sans quoi « @BENOIT » ne
-- trouverait pas « Benoît ».
--
-- `unaccent` n'est pas installé sur cette base, et l'exiger ferait dépendre un
-- filtre d'écran d'une extension : `translate` suffit pour le latin, et ce sont
-- des noms de personnes.
create or replace function public.mdall_repli(p_texte text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(
    translate(
      replace(replace(lower(coalesce(p_texte, '')), 'œ', 'oe'), 'æ', 'ae'),
      'àâäáãåçèéêëìíîïñòóôöõùúûüýÿ',
      'aaaaaaceeeeiiiinooooouuuuyy'
    ),
    '\s+', ' ', 'g'
  );
$$;

comment on function public.mdall_repli(text) is
  'Replie un texte pour comparaison : minuscules, sans accent, espaces ramenés à un seul.';

grant execute on function public.mdall_repli(text) to authenticated;

-- Les signaux de chaque sujet d'un projet : une ligne par sujet.
create or replace function public.project_subject_signals(p_project_id uuid)
returns table (
  subject_id uuid,
  last_activity_at timestamptz,
  mention_person_ids uuid[]
)
language sql
stable
security invoker
set search_path = public
as $$
with messages as (
  select
    m.subject_id,
    max(m.created_at) as derniere,
    -- Les échanges avec le copilote sont privés : ils ne comptent ni comme
    -- activité, ni comme mention.
    public.mdall_repli(string_agg(coalesce(m.body_markdown, ''), ' ')) as texte
  from public.subject_messages m
  where m.project_id = p_project_id
    and m.deleted_at is null
    and coalesce(m.visibility, 'normal') = 'normal'
  group by m.subject_id
),
histoire as (
  select h.subject_id, max(h.created_at) as derniere
  from public.subject_history h
  where h.project_id = p_project_id
  group by h.subject_id
),
sujets as (
  select
    s.id,
    greatest(s.updated_at, s.created_at, m.derniere, h.derniere) as derniere,
    -- Le titre, la description et les messages : le même geste, écrit à trois
    -- endroits de la même page.
    concat_ws(' ', public.mdall_repli(concat_ws(' ', s.title, s.description)), m.texte) as texte
  from public.subjects s
  left join messages m on m.subject_id = s.id
  left join histoire h on h.subject_id = s.id
  where s.project_id = p_project_id
),
personnes as (
  select
    c.person_id,
    -- Les écritures qui désignent quelqu'un : nom complet, nom de famille,
    -- prénom, adresse, partie avant l'arobase, et les deux graphies collées.
    -- Le prénom seul est accepté : sur un projet, « @nicolas » désigne quelqu'un
    -- pour tout le monde, et le refuser ne trouverait rien dans neuf textes sur
    -- dix. Deux personnes du même prénom ressortent toutes les deux — c'est ce
    -- que le texte dit, et deviner laquelle serait pire.
    array_remove(array_remove(array[
      public.mdall_repli(c.full_name),
      public.mdall_repli(c.last_name),
      public.mdall_repli(c.first_name),
      public.mdall_repli(c.email),
      public.mdall_repli(split_part(coalesce(c.email, ''), '@', 1)),
      replace(public.mdall_repli(c.full_name), ' ', '.'),
      replace(public.mdall_repli(c.full_name), ' ', '-')
    ], null), '') as poignees
  from public.project_collaborators_view c
  where c.project_id = p_project_id
    and c.person_id is not null
)
select
  s.id,
  s.derniere,
  coalesce((
    select array_agg(distinct p.person_id)
    from personnes p
    where exists (
      select 1
      from unnest(p.poignees) as poignee
      where length(poignee) >= 2
        and position('@' || poignee in s.texte) > 0
    )
  ), array[]::uuid[])
from sujets s;
$$;

comment on function public.project_subject_signals(uuid) is
  'Par sujet : la date de sa dernière activité (ligne, message, événement métier) et les personnes du projet qui y sont nommées avec un @. Lecture seule, security invoker.';

grant execute on function public.project_subject_signals(uuid) to authenticated;

commit;
