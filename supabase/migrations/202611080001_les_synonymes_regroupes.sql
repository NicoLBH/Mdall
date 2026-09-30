-- Les synonymes regroupés, et la prédiction portée sur les sujets.
--
-- CE QUE LE TOUR PRÉCÉDENT A LAISSÉ, ET L'A DIT
--
-- « plancher beton », « dalle beton » et « plancher en beton » comptaient pour
-- trois sujets distincts. Et « plancher en beton » n'en formait même aucun : le
-- couple se fabriquait sur des mots **voisins dans la phrase d'origine**, or le
-- mot-outil « en », retiré juste avant, laissait un trou entre les deux.
--
-- TROIS RÈGLES, ET RIEN D'AUTRE
--
-- 1. **Le couple se forme sur ce qui reste**, pas sur la phrase d'origine. Une
--    fois les mots-outils retirés, « plancher » et « beton » sont voisins —
--    c'est cela qu'on voulait dire. « plancher en beton » et « plancher beton »
--    deviennent le même couple.
--
-- 2. **Le pluriel ne fait pas un sujet de plus.** « planchers betons » et
--    « plancher beton » se ramènent au même radical. Le radical est volontairement
--    pauvre — pluriels et quelques finales, rien de plus : une racinisation
--    ambitieuse rapproche « portail » et « porte », ce qui serait faux et
--    invisible.
--
-- 3. **L'ordre des deux mots ne compte pas.** « beton plancher » et « plancher
--    beton » désignent la même chose. La clé range les radicaux, l'affichage
--    garde la forme la plus écrite — on regroupe sans réécrire ce que les gens
--    ont écrit.
--
-- CE QUI N'EST PAS FAIT, ET POURQUOI
--
-- Rapprocher « plancher » de « dalle » demande de comparer des **sens**, pas des
-- chaînes. Aucune règle de caractères ne le fera, et prétendre le contraire
-- donnerait des regroupements faux qu'on ne verrait pas. Cela reste nommé dans
-- la console.
--
-- ET LA PRÉDICTION PASSE SUR LES SUJETS
--
-- `les_enchainements_des_sujets()` fait exactement ce que fait
-- `les_enchainements_du_systeme()` — les couples « après ceci, il est venu
-- cela », à l'intérieur d'un chantier — mais sur les sujets au lieu des huit
-- domaines. C'est la réponse à « après une question de nappe, une question de
-- cuvelage », là où les domaines ne savent dire que « après le sol, la
-- structure ».
--
-- Additive : aucune table, aucune colonne, aucune politique n'est modifiée.

-- ── Le radical d'un mot ────────────────────────────────────────────────────
--
-- Pauvre exprès. Chaque règle enlève une marque de nombre ou de genre, et
-- aucune ne touche au sens. Le seuil de cinq lettres protège les mots courts,
-- où retirer une lettre change le mot plutôt que sa forme.

create or replace function public.le_radical(mot text)
returns text
language sql
immutable
as $$
  select case
    when length(mot) < 5 then mot
    -- « reseaux » → « reseau », « locaux » → « local »
    when mot like '%eaux' then left(mot, -4) || 'eau'
    when mot like '%aux'  then left(mot, -3) || 'al'
    -- Le pluriel ordinaire, et le « x » des pluriels en -eu/-ou.
    when right(mot, 1) in ('s', 'x') then left(mot, -1)
    else mot
  end;
$$;

comment on function public.le_radical(text) is
  'La forme d''un mot débarrassée de sa marque de nombre. Volontairement pauvre : une racinisation ambitieuse rapprocherait « portail » et « porte », ce qui serait faux et invisible.';

-- ── Les sujets, synonymes regroupés ────────────────────────────────────────
--
-- **On supprime avant de recréer.** `create or replace` refuse de changer la
-- forme de ce qu'une fonction rend : « cannot change return type of existing
-- function ». Ces deux-là gagnent une colonne — `formes` —, donc elles doivent
-- partir d'abord. Le banc l'a refusé avant le déploiement, et c'est exactement
-- ce pour quoi il existe.

drop function if exists public.les_sujets_du_systeme(integer);

create or replace function public.les_sujets_du_systeme(au_moins integer default 2)
returns table (
  sujet text,
  mots integer,
  formes bigint,
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
  with decoupe as (
    select a.id,
           a.project_id,
           m.mot,
           -- **Le rang après filtrage**, et c'est toute la première règle : deux
           -- mots séparés par un seul mot-outil sont voisins une fois celui-ci
           -- retiré. Sans cela, « plancher en beton » ne formait aucun couple.
           row_number() over (partition by a.id order by m.ord) as rang
      from public.project_assertions a
      cross join lateral unnest(
        string_to_array(
          regexp_replace(
            translate(lower(coalesce(a.statement, '')),
                      'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
            '[^a-z]+', ' ', 'g'),
          ' ')
      ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  ),
  termes as (
    select id, project_id,
           mot as terme,
           public.le_radical(mot) as cle,
           1 as combien_de_mots
      from decoupe
    union all
    select g.id, g.project_id,
           g.mot || ' ' || d.mot,
           -- **Les radicaux rangés**, pour que l'ordre des deux mots ne fasse
           -- pas deux sujets.
           least(public.le_radical(g.mot), public.le_radical(d.mot)) || ' '
             || greatest(public.le_radical(g.mot), public.le_radical(d.mot)),
           2
      from decoupe g
      join decoupe d
        on d.id = g.id
       and d.rang = g.rang + 1
  )
  select
    -- **La forme la plus écrite**, pas la clé : on regroupe sans réécrire ce
    -- que les gens ont écrit. « plancher beton » reste « plancher beton », même
    -- si la clé est « beton plancher ».
    mode() within group (order by t.terme),
    max(t.combien_de_mots)::integer,
    count(distinct t.terme)::bigint,
    count(distinct t.id)::bigint,
    count(distinct t.project_id)::bigint
    from termes t
   group by t.cle
  -- Un terme vu sur un seul chantier est son contenu, pas du vocabulaire.
  having count(distinct t.project_id) >= seuil
   order by 4 desc, 1;
end;
$$;

comment on function public.les_sujets_du_systeme(integer) is
  'Les sujets techniques, synonymes de forme regroupés : pluriels, ordre des mots, et mots-outils intercalés. Rend la forme la plus écrite et combien de formes s''y rangent. Un sujet vu sur un seul chantier ne sort pas.';

revoke all on function public.les_sujets_du_systeme(integer) from public;
grant execute on function public.les_sujets_du_systeme(integer) to authenticated;

-- ── Ce qu'on écarte, recompté sur les mêmes clés ───────────────────────────

drop function if exists public.la_mesure_des_sujets(integer);

create or replace function public.la_mesure_des_sujets(au_moins integer default 2)
returns table (
  montres bigint,
  caches bigint,
  formes bigint,
  affirmations bigint
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
  with decoupe as (
    select a.id, a.project_id, m.mot,
           row_number() over (partition by a.id order by m.ord) as rang
      from public.project_assertions a
      cross join lateral unnest(
        string_to_array(
          regexp_replace(
            translate(lower(coalesce(a.statement, '')),
                      'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
            '[^a-z]+', ' ', 'g'),
          ' ')
      ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  ),
  termes as (
    select id, project_id, mot as terme, public.le_radical(mot) as cle from decoupe
    union all
    select g.id, g.project_id, g.mot || ' ' || d.mot,
           least(public.le_radical(g.mot), public.le_radical(d.mot)) || ' '
             || greatest(public.le_radical(g.mot), public.le_radical(d.mot))
      from decoupe g
      join decoupe d on d.id = g.id and d.rang = g.rang + 1
  ),
  par_cle as (
    select cle,
           -- **Pas `chantiers` ni `formes` :** ces noms sont ceux des
           -- paramètres de sortie, et PostgreSQL refuse la requête — « column
           -- reference is ambiguous ». Le banc l'a refusée avant le déploiement.
           count(distinct project_id) as combien_de_chantiers,
           count(distinct terme) as combien_de_formes
      from termes group by cle
  )
  select (select count(*) from par_cle where combien_de_chantiers >= seuil),
         (select count(*) from par_cle where combien_de_chantiers < seuil),
         -- Combien de formes se sont rangées sous les sujets qu'on montre :
         -- c'est la mesure du regroupement, et elle vaut mieux qu'une promesse.
         -- `sum()` rend un `numeric`, et la signature promet un `bigint` : sans
         -- la conversion, PostgreSQL refuse la fonction entière.
         (select coalesce(sum(combien_de_formes), 0)::bigint
            from par_cle where combien_de_chantiers >= seuil),
         (select count(*) from public.project_assertions);
end;
$$;

comment on function public.la_mesure_des_sujets(integer) is
  'Combien de sujets passent le seuil, combien ne le passent pas, et combien de formes se rangent sous ceux qu''on montre.';

revoke all on function public.la_mesure_des_sujets(integer) from public;
grant execute on function public.la_mesure_des_sujets(integer) to authenticated;

-- ── La prédiction, portée sur les sujets ───────────────────────────────────
--
-- Le même calcul que `les_enchainements_du_systeme()`, sur les sujets au lieu
-- des huit domaines.
--
-- UNE AFFIRMATION PORTE PLUSIEURS SUJETS
--
-- Un domaine était unique par affirmation ; un sujet ne l'est pas — une phrase
-- en porte cinq ou dix. On forme donc les couples entre **chaque sujet d'une
-- affirmation et chaque sujet de la suivante**. C'est la généralisation
-- honnête de « après ceci, il est venu cela », et c'est ce que le prédicteur
-- ferait.
--
-- Pour que cela reste borné et signifiant, seuls entrent les sujets qui passent
-- déjà le seuil des chantiers : un sujet propre à un chantier n'a rien à
-- prédire ailleurs, et il ne doit pas sortir non plus.

create or replace function public.les_enchainements_des_sujets(au_moins integer default 2)
returns table (
  avant text,
  apres text,
  combien bigint,
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
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with decoupe as (
    select a.id, a.project_id, a.created_at, m.mot,
           row_number() over (partition by a.id order by m.ord) as rang
      from public.project_assertions a
      cross join lateral unnest(
        string_to_array(
          regexp_replace(
            translate(lower(coalesce(a.statement, '')),
                      'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
            '[^a-z]+', ' ', 'g'),
          ' ')
      ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  ),
  termes as (
    select id, project_id, created_at, mot as terme, public.le_radical(mot) as cle
      from decoupe
    union all
    select g.id, g.project_id, g.created_at, g.mot || ' ' || d.mot,
           least(public.le_radical(g.mot), public.le_radical(d.mot)) || ' '
             || greatest(public.le_radical(g.mot), public.le_radical(d.mot))
      from decoupe g
      join decoupe d on d.id = g.id and d.rang = g.rang + 1
  ),
  -- La forme montrable de chaque clé, et celles qui passent le seuil.
  retenus as (
    select cle, mode() within group (order by terme) as sujet
      from termes
     group by cle
    having count(distinct project_id) >= seuil
  ),
  -- Une ligne par (affirmation, sujet), dédoublonnée : un sujet répété dans une
  -- même phrase ne compte qu'une fois.
  portees as (
    select distinct t.id, t.project_id, t.created_at, r.sujet
      from termes t
      join retenus r on r.cle = t.cle
  ),
  -- Le rang de chaque affirmation dans son chantier : c'est par lui que « la
  -- suivante » se définit, et `id` départage deux affirmations de la même
  -- seconde.
  rangs as (
    select distinct id, project_id, created_at,
           dense_rank() over (partition by project_id order by created_at, id) as rang
      from portees
  )
  select p.sujet,
         s.sujet,
         count(*)::bigint,
         count(distinct p.project_id)::bigint
    from portees p
    join rangs rp on rp.id = p.id
    join rangs rs on rs.project_id = rp.project_id and rs.rang = rp.rang + 1
    join portees s on s.id = rs.id
   group by p.sujet, s.sujet
   order by 3 desc, 1, 2;
end;
$$;

comment on function public.les_enchainements_des_sujets(integer) is
  'Quels sujets techniques en suivent d''autres, à l''intérieur d''un chantier. Le calcul de les_enchainements_du_systeme(), porté sur les sujets au lieu des huit domaines. Réservée aux administrateurs.';

revoke all on function public.les_enchainements_des_sujets(integer) from public;
grant execute on function public.les_enchainements_des_sujets(integer) to authenticated;
