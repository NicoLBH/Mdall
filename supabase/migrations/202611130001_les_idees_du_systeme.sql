-- Les idées que les chantiers énoncent — et non plus les mots qu'ils emploient.
--
-- LE CONSTAT
--
-- La console déroulait les termes trouvés dans les affirmations : « plafonds »,
-- « dispositions », « passage », « portes ».
--
--     « Et alors ? On n'est pas là pour refaire un lexique du vocabulaire de
--      construction. Où sont les idées, les raisonnements, les fonctions ?
--      Comment est-ce que ça s'enchaîne ? »
--
-- Et alors rien. Un terme nomme une chose ; il ne dit pas ce qu'elle entraîne,
-- ce qu'elle impose, ni ce qu'elle interdit. On ne décide sur aucun terme.
--
-- CE QUE CETTE MIGRATION AJOUTE
--
-- Le cran du dessus : non plus « de quoi parle-t-on ? », mais « qu'est-ce qui
-- fait quoi ? ». Une idée est une fonction — quelque chose entre, quelque
-- chose sort, et un lien nommé dit de quelle façon :
--
--     sol argileux  ──entraîne──▶  plancher repris
--
-- COMMENT ELLE LES TROUVE, ET POURQUOI SANS MODÈLE
--
-- Par les mots de liaison que la phrase écrit elle-même : « donc », « car »,
-- « à condition que », « faute de ». Le mot coupe l'affirmation en deux, et de
-- chaque côté on garde le terme de tête — le même découpage que les sujets,
-- donc la même granulométrie.
--
-- Ce n'est pas de l'apprentissage, et c'est volontaire : cela ne dépend d'aucun
-- modèle, d'aucun service et d'aucune clé, cela se vérifie ligne à ligne, et
-- cela marche le jour où on le déploie. Un modèle lirait mieux — il est là pour
-- rendre la vie plus confortable, pas pour qu'on en dépende.
--
-- CE QU'ELLE NE SAIT PAS LIRE, DIT PLUTÔT QUE TU
--
-- Les liaisons de tête. « Si le sol est argileux, les fondations descendent »
-- commence par son lien : à gauche, il n'y a rien. Seules les liaisons placées
-- **entre** les deux membres sont lues. Deviner la coupure sur une virgule
-- rendrait des idées fausses avec l'aplomb des vraies — et une idée fausse dans
-- un raisonnement contamine toute la chaîne.
--
-- LE GARDE-FOU QUI REND CECI MONTRABLE DANS LA CONSOLE
--
-- Le même que pour les sujets : une idée vue sur **un seul** chantier est le
-- contenu de ce chantier-là, pas une idée de métier. Elle ne sort pas. Et le
-- nombre de celles qu'on écarte est rendu, parce que taire ce qu'on cache
-- montrerait un corpus plus pauvre qu'il n'est (règle 5).
--
-- Additive : aucune table, aucune colonne, aucune politique n'est modifiée.
-- Trois fonctions nouvelles, et rien d'autre.

-- ── Les mots de liaison ────────────────────────────────────────────────────
--
-- Écrits une seule fois, ici, et nulle part ailleurs : c'est la liste qu'on
-- relira et qu'on corrigera en regardant ce que la console montre. Le navigateur
-- n'en tient aucune copie — il ne connaît que les **sortes** de liens, qu'il
-- doit nommer à l'écran (`apps/web/js/services/une-idee.js`, règle 4).
--
-- `renverse` dit de quel côté va la flèche. « A donc B » va de A vers B ;
-- « A car B » va de B vers A. Confondre les deux inverserait la cause et la
-- conséquence — la seule erreur qui rende un raisonnement exactement faux.
--
-- Les mots sont écrits **normalisés** : minuscules, sans accent, et toute
-- ponctuation remplacée par une espace. « à cause de » s'écrit donc
-- « a cause de », et « s'oppose à » s'écrit « s oppose a ». C'est la forme
-- qu'aura l'affirmation au moment de la comparaison.
create or replace function public.les_mots_de_liaison()
returns table (mot text, lien text, renverse boolean)
language sql
immutable
as $$
  select * from (values
    -- Ce qui fait arriver. Le lien le plus fort, et le seul qui autorise à prévoir.
    ('donc',             'cause',       false),
    ('par consequent',   'cause',       false),
    ('ce qui entraine',  'cause',       false),
    ('entraine',         'cause',       false),
    ('entrainent',       'cause',       false),
    ('provoque',         'cause',       false),
    ('provoquent',       'cause',       false),
    ('implique',         'cause',       false),
    ('impliquent',       'cause',       false),
    ('aboutit a',        'cause',       false),
    ('car',              'cause',       true),
    ('parce que',        'cause',       true),
    ('en raison de',     'cause',       true),
    ('du fait de',       'cause',       true),
    ('compte tenu de',   'cause',       true),
    ('a cause de',       'cause',       true),

    -- Ce qui ne vaut que si. Rien n'est affirmé du reste du temps.
    ('conditionne',      'condition',   false),
    ('conditionnent',    'condition',   false),
    ('a condition que',  'condition',   true),
    ('a condition de',   'condition',   true),
    ('sous reserve de',  'condition',   true),
    ('sous reserve que', 'condition',   true),
    ('dans la mesure ou','condition',   true),

    -- Ce qui rend obligatoire. Une contrainte se décide, elle n'arrive pas seule.
    ('impose',           'obligation',  false),
    ('imposent',         'obligation',  false),
    ('exige',            'obligation',  false),
    ('exigent',          'obligation',  false),
    ('necessite',        'obligation',  false),
    ('necessitent',      'obligation',  false),
    ('requiert',         'obligation',  false),
    ('requierent',       'obligation',  false),
    ('oblige a',         'obligation',  false),
    ('obligent a',       'obligation',  false),

    -- Ce qui rend possible — et rien de plus. Possible n'est pas fait.
    ('permet de',        'permet',      false),
    ('permettent de',    'permet',      false),
    ('permet',           'permet',      false),
    ('permettent',       'permet',      false),
    ('rend possible',    'permet',      false),
    ('autorise',         'permet',      false),
    ('autorisent',       'permet',      false),

    -- Le but. Une intention dit ce qu'on cherche, jamais ce qu'on obtient.
    ('afin de',          'but',         false),
    ('afin que',         'but',         false),
    ('en vue de',        'but',         false),
    ('dans le but de',   'but',         false),
    ('de maniere a',     'but',         false),
    ('de facon a',       'but',         false),
    ('pour permettre',   'but',         false),

    -- Ce qui retire une possibilité. La seule sorte qui enlève au lieu d'ajouter.
    ('empeche',          'empechement', false),
    ('empechent',        'empechement', false),
    ('interdit',         'empechement', false),
    ('interdisent',      'empechement', false),
    ('rend impossible',  'empechement', false),
    ('s oppose a',       'empechement', false),
    ('faute de',         'empechement', true),
    ('a defaut de',      'empechement', true),
    ('en l absence de',  'empechement', true)
  ) as liaisons(mot, lien, renverse);
$$;

comment on function public.les_mots_de_liaison() is
  'Les mots par lesquels une phrase relie deux choses, et le sens de la fleche. Ecrits une seule fois : le navigateur ne connait que les sortes de liens.';

-- ── Le terme de tête d'un membre de phrase ─────────────────────────────────
--
-- Le même découpage que les sujets : les mots d'au moins quatre lettres qui ne
-- sont pas des mots-outils. On garde le **premier**, qui en français porte
-- presque toujours le sujet de la proposition, plus celui qui le suit
-- immédiatement s'il en est un : « plancher beton » dit ce que « plancher » ne
-- dit pas, et c'est la granulométrie qu'on cherche.
--
-- `null` quand le membre ne contient aucun terme — à l'appelant de ne rien
-- compter plutôt que de compter une moitié d'idée.
create or replace function public.le_terme_de_tete(bout text)
returns text
language sql
immutable
as $$
  with mots as (
    select m.mot, m.ord
      from unnest(
             string_to_array(
               regexp_replace(
                 translate(lower(coalesce(bout, '')),
                           'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
                 '[^a-z]+', ' ', 'g'),
               ' ')
           ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  ),
  tete as (select mot, ord from mots order by ord limit 1)
  select case
           when not exists (select 1 from tete) then null
           else (select t.mot from tete t)
                || coalesce(
                     (select ' ' || m.mot from mots m
                       where m.ord = (select t.ord from tete t) + 1
                       limit 1),
                     '')
         end;
$$;

comment on function public.le_terme_de_tete(text) is
  'Le terme de tete d''un membre de phrase : le premier mot technique, et son voisin immediat s''il en est un. Null quand il n''y en a aucun.';

-- ── Les idées ──────────────────────────────────────────────────────────────

create or replace function public.les_idees_du_systeme(au_moins integer default 2)
returns table (
  avant text,
  lien text,
  apres text,
  affirmations bigint,
  chantiers bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  seuil integer := greatest(2, coalesce(au_moins, 2));
begin
  -- **La porte d'abord.** Sans elle, `security definer` rendrait ces comptes à
  -- n'importe quel compte authentifié.
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with propres as (
    select a.id,
           a.project_id,
           -- Encadrée d'espaces : « car » ne doit pas se trouver dans
           -- « carrelage », et un mot de liaison en fin de phrase doit se
           -- trouver quand même.
           ' ' || regexp_replace(
                    translate(lower(coalesce(a.statement, '')),
                              'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
                    '[^a-z]+', ' ', 'g') || ' ' as dit
      from public.project_assertions a
  ),
  coupes as (
    select p.id, p.project_id, p.dit, l.mot, l.lien, l.renverse,
           position(' ' || l.mot || ' ' in p.dit) as ou
      from propres p
      join public.les_mots_de_liaison() l
        on position(' ' || l.mot || ' ' in p.dit) > 0
  ),
  -- **La première liaison de la phrase, et la plus longue à égalité.** Une
  -- affirmation qui en porte trois énonce trois idées ; n'en lire qu'une est
  -- une perte, mais lire les trois sur les mêmes deux membres en inventerait
  -- deux. On lit la première, et l'on dit ce qu'on ne lit pas.
  --
  -- La plus longue à position égale : « permet de » et « permet » commencent
  -- au même endroit, et c'est la longue qui coupe au bon endroit.
  premiere as (
    select distinct on (c.id)
           c.id, c.project_id, c.dit, c.mot, c.lien, c.renverse, c.ou
      from coupes c
     order by c.id, c.ou, length(c.mot) desc
  ),
  cotes as (
    select pr.id, pr.project_id, pr.lien,
           case when pr.renverse
                then public.le_terme_de_tete(substr(pr.dit, pr.ou + length(pr.mot) + 2))
                else public.le_terme_de_tete(substr(pr.dit, 1, pr.ou))
           end as avant,
           case when pr.renverse
                then public.le_terme_de_tete(substr(pr.dit, 1, pr.ou))
                else public.le_terme_de_tete(substr(pr.dit, pr.ou + length(pr.mot) + 2))
           end as apres
      from premiere pr
  )
  select co.avant, co.lien, co.apres,
         count(distinct co.id)::bigint,
         count(distinct co.project_id)::bigint
    from cotes co
   where co.avant is not null
     and co.apres is not null
     -- « nappe entraîne nappe » est vrai, et c'est ce qui le rend inutile.
     and co.avant <> co.apres
   group by co.avant, co.lien, co.apres
  having count(distinct co.project_id) >= seuil
   order by 5 desc, 4 desc, 1;
end;
$$;

comment on function public.les_idees_du_systeme(integer) is
  'Les idees que les chantiers enoncent : ce qui entraine quoi, ce qui impose quoi. Une idee vue sur un seul chantier ne sort pas. Reservee aux administrateurs.';

revoke all on function public.les_idees_du_systeme(integer) from public;
grant execute on function public.les_idees_du_systeme(integer) to authenticated;

-- ── Ce qu'on n'a pas montré ────────────────────────────────────────────────
--
-- Quatre nombres, et chacun répond à une question qu'une liste seule laisse
-- ouverte :
--
--   · `affirmations` — sur quoi on a cherché ;
--   · `liantes`      — combien portent un mot de liaison ;
--   · `lisibles`     — combien en ont rendu une idée entière (les autres ont
--                      bien un lien, mais l'un des deux côtés n'a aucun terme) ;
--   · `montrees` / `cachees` — combien d'idées passent le seuil des chantiers,
--                      et combien ne le passent pas.
--
-- Sans eux, une liste vide voudrait dire deux choses opposées : le corpus
-- n'énonce aucun lien, ou il en énonce et aucun n'est partagé (règle 5).

create or replace function public.la_mesure_des_idees(au_moins integer default 2)
returns table (
  montrees bigint,
  cachees bigint,
  affirmations bigint,
  liantes bigint,
  lisibles bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  seuil integer := greatest(2, coalesce(au_moins, 2));
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with propres as (
    select a.id, a.project_id,
           ' ' || regexp_replace(
                    translate(lower(coalesce(a.statement, '')),
                              'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
                    '[^a-z]+', ' ', 'g') || ' ' as dit
      from public.project_assertions a
  ),
  coupes as (
    select p.id, p.project_id, p.dit, l.mot, l.lien, l.renverse,
           position(' ' || l.mot || ' ' in p.dit) as ou
      from propres p
      join public.les_mots_de_liaison() l
        on position(' ' || l.mot || ' ' in p.dit) > 0
  ),
  premiere as (
    select distinct on (c.id)
           c.id, c.project_id, c.dit, c.mot, c.lien, c.renverse, c.ou
      from coupes c
     order by c.id, c.ou, length(c.mot) desc
  ),
  cotes as (
    select pr.id, pr.project_id, pr.lien,
           case when pr.renverse
                then public.le_terme_de_tete(substr(pr.dit, pr.ou + length(pr.mot) + 2))
                else public.le_terme_de_tete(substr(pr.dit, 1, pr.ou))
           end as avant,
           case when pr.renverse
                then public.le_terme_de_tete(substr(pr.dit, 1, pr.ou))
                else public.le_terme_de_tete(substr(pr.dit, pr.ou + length(pr.mot) + 2))
           end as apres
      from premiere pr
  ),
  entieres as (
    select * from cotes
     where avant is not null and apres is not null and avant <> apres
  ),
  par_idee as (
    select avant, lien, apres, count(distinct project_id) as chantiers
      from entieres group by avant, lien, apres
  )
  select (select count(*) from par_idee where chantiers >= seuil),
         (select count(*) from par_idee where chantiers < seuil),
         (select count(*) from public.project_assertions),
         (select count(*) from premiere),
         (select count(distinct id) from entieres);
end;
$$;

comment on function public.la_mesure_des_idees(integer) is
  'Sur quoi on a cherche, combien portent un lien, combien en rendent une idee entiere, et combien d''idees la console ne montre pas.';

revoke all on function public.la_mesure_des_idees(integer) from public;
grant execute on function public.la_mesure_des_idees(integer) to authenticated;
