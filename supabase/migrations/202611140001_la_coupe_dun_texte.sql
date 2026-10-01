-- Le découpage d'une affirmation, écrit une seule fois — et de quoi comprendre
-- pourquoi il ne trouve presque rien.
--
-- LE CONSTAT
--
-- La console annonce :
--
--     1 % des affirmations énoncent un lien (61 sur 9 285)
--     Aucune n'est encore partagée par deux chantiers.
--
--     « Le résultat me semble très faible. Pour le moment, nous sommes
--      complètement aveugles. »
--
-- Un pour cent, c'est soit le corpus qui n'énonce rien, soit le découpage qui
-- ne sait pas lire. On ne peut pas trancher : rien ne dit **où** cela casse.
-- Et un chiffre qu'on ne sait pas expliquer ne sert à rien (règle 12).
--
-- CE QUE CETTE MIGRATION AJOUTE
--
-- 1. **Le découpage, à un seul endroit.** Il était écrit deux fois — dans
--    « les_idees_du_systeme » et dans « la_mesure_des_idees » — par copie de
--    sept lignes de CTE. Deux copies d'une même règle finissent par ne plus
--    dire la même chose (règle 4), et la seconde est toujours celle qu'on
--    oublie de corriger. Il devient « la_coupe_dun_texte », que tout le monde
--    appelle, **y compris la lecture d'un document**, qui en a besoin pour
--    relever les idées d'un compte rendu.
--
-- 2. **Le détail par mot de liaison.** Pour chaque mot : combien
--    d'affirmations le contiennent, combien sont coupées dessus, combien
--    rendent une idée entière, et combien échouent — faute de terme d'un côté,
--    ou parce que les deux côtés sont le même. C'est la réponse à « où cela
--    casse ».
--
-- 3. **La forme des affirmations.** Si le corpus est fait d'intitulés
--    — « Menuiseries extérieures » — et non de phrases, aucun découpage n'y
--    trouvera de lien, et ce n'est pas le découpage qu'il faut corriger. Le
--    nombre moyen de mots et la part qui en porte au moins dix le disent en
--    une ligne.
--
-- CE QU'ELLE REMPLACE, ET C'EST DIT
--
-- Additive pour les tables : aucune table, aucune colonne, aucune politique
-- n'est touchée. **Deux fonctions sont remplacées** — « les_idees_du_systeme »
-- et « la_mesure_des_idees » —, à signature identique, pour qu'elles appellent
-- le découpage commun au lieu d'en porter chacune une copie. C'est l'exception,
-- et c'est tout.

-- ── Le texte, ramené à ce qui se compare ───────────────────────────────────
--
-- Minuscules, sans accent, toute ponctuation remplacée par une espace. Les
-- mots de liaison sont écrits sous cette forme : « à cause de » s'écrit
-- « a cause de », « s'oppose à » s'écrit « s oppose a ».
create or replace function public.le_texte_normalise(bout text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           translate(lower(coalesce(bout, '')),
                     'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
           '[^a-z]+', ' ', 'g');
$$;

comment on function public.le_texte_normalise(text) is
  'Un texte ramene a ce qui se compare : minuscules, sans accent, sans ponctuation. La forme sous laquelle les mots de liaison sont ecrits.';

-- ── La coupe d'un texte, à un seul endroit ─────────────────────────────────
--
-- Zéro ou une ligne. Zéro quand le texte ne porte aucun mot de liaison — et
-- c'est une information, pas un échec.
--
-- **La première liaison, et la plus longue à position égale.** Une affirmation
-- qui en porte trois énonce trois idées ; n'en lire qu'une est une perte, mais
-- lire les trois sur les mêmes deux membres en inventerait deux. « permet de »
-- et « permet » commencent au même endroit, et c'est la longue qui coupe au
-- bon endroit.
create or replace function public.la_coupe_dun_texte(bout text)
returns table (avant text, lien text, apres text, mot text, renverse boolean)
language sql
stable
as $$
  with dit as (
    -- Encadré d'espaces : « car » ne doit pas se lire dans « carrelage », et un
    -- mot de liaison en fin de phrase doit se trouver quand même.
    select ' ' || public.le_texte_normalise(bout) || ' ' as t
  ),
  -- **Où chaque mot tombe, et une seule fois.** La position était calculée deux
  -- fois — une fois pour filtrer, une fois pour couper —, avec le même motif
  -- écrit deux fois. Casser l'un des deux laissait l'autre juste : la coupe
  -- rendait alors une position nulle, l'idée tombait, et tout avait l'air
  -- normal. Deux écritures d'une même règle finissent par ne plus dire la même
  -- chose (règle 4), et celle-ci le disait déjà.
  places as (
    select l.mot, l.lien, l.renverse, d.t,
           position(' ' || l.mot || ' ' in d.t) as ou
      from dit d
      cross join public.les_mots_de_liaison() l
  ),
  premiere as (
    select * from places
     where ou > 0
     order by ou, length(mot) desc
     limit 1
  )
  select case when p.renverse
              then public.le_terme_de_tete(substr(p.t, p.ou + length(p.mot) + 2))
              else public.le_terme_de_tete(substr(p.t, 1, p.ou))
         end,
         p.lien,
         case when p.renverse
              then public.le_terme_de_tete(substr(p.t, 1, p.ou))
              else public.le_terme_de_tete(substr(p.t, p.ou + length(p.mot) + 2))
         end,
         p.mot,
         p.renverse
    from premiere p;
$$;

comment on function public.la_coupe_dun_texte(text) is
  'Ce qu''un texte enonce : avant, lien, apres, et le mot sur lequel il a ete coupe. Aucune ligne quand il ne porte aucun mot de liaison.';

-- ── Les idées des textes qu'on lui donne ───────────────────────────────────
--
-- La même coupe, sur une liste — c'est ainsi que la lecture d'un compte rendu
-- s'en sert : un texte par point relevé, et le rang dit lequel.
create or replace function public.les_idees_des_textes(textes text[])
returns table (rang integer, avant text, lien text, apres text, mot text)
language sql
stable
as $$
  select m.rang::integer, c.avant, c.lien, c.apres, c.mot
    from unnest(coalesce(textes, array[]::text[])) with ordinality as m(bout, rang)
    cross join lateral public.la_coupe_dun_texte(m.bout) c
   where c.avant is not null
     and c.apres is not null
     and c.avant <> c.apres;
$$;

comment on function public.les_idees_des_textes(text[]) is
  'Les idees entieres d''une liste de textes, avec le rang du texte d''ou chacune sort. Ce qui n''en rend pas ne sort pas.';

-- ── Les idées, par le découpage commun ─────────────────────────────────────
--
-- **Classées par occurrence décroissante.** Le seuil des deux chantiers a déjà
-- retiré ce qui n'est le contenu que d'un chantier ; ce qui reste est du
-- métier, et l'on veut alors le lire du plus fréquent au plus rare.
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
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  select c.avant, c.lien, c.apres,
         count(distinct a.id)::bigint,
         count(distinct a.project_id)::bigint
    from public.project_assertions a
    cross join lateral public.la_coupe_dun_texte(a.statement) c
   where c.avant is not null
     and c.apres is not null
     -- « nappe entraîne nappe » est vrai, et c'est ce qui le rend inutile.
     and c.avant <> c.apres
   group by c.avant, c.lien, c.apres
  having count(distinct a.project_id) >= seuil
   order by 4 desc, 5 desc, 1;
end;
$$;

comment on function public.les_idees_du_systeme(integer) is
  'Les idees que les chantiers enoncent, de la plus frequente a la plus rare. Une idee vue sur un seul chantier ne sort pas. Reservee aux administrateurs.';

revoke all on function public.les_idees_du_systeme(integer) from public;
grant execute on function public.les_idees_du_systeme(integer) to authenticated;

-- ── La mesure, par le découpage commun ─────────────────────────────────────

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
  with coupees as (
    select a.id, a.project_id, c.avant, c.apres, c.lien
      from public.project_assertions a
      cross join lateral public.la_coupe_dun_texte(a.statement) c
  ),
  entieres as (
    select * from coupees
     where avant is not null and apres is not null and avant <> apres
  ),
  par_idee as (
    select avant, lien, apres, count(distinct project_id) as chantiers
      from entieres group by avant, lien, apres
  )
  select (select count(*) from par_idee where chantiers >= seuil),
         (select count(*) from par_idee where chantiers < seuil),
         (select count(*) from public.project_assertions),
         (select count(*) from coupees),
         (select count(distinct id) from entieres);
end;
$$;

comment on function public.la_mesure_des_idees(integer) is
  'Sur quoi on a cherche, combien portent un lien, combien en rendent une idee entiere, et combien d''idees la console ne montre pas.';

revoke all on function public.la_mesure_des_idees(integer) from public;
grant execute on function public.la_mesure_des_idees(integer) to authenticated;

-- ── Où le découpage casse, mot par mot ─────────────────────────────────────
--
-- Six nombres par mot de liaison, et chacun répond à une question qu'un
-- pourcentage global laisse ouverte :
--
--   · `contenues`  — combien d'affirmations portent ce mot, où qu'il soit ;
--   · `premieres`  — combien sont coupées dessus (il arrive en premier) ;
--   · `entieres`   — combien en rendent une idée ;
--   · `sans_terme` — combien échouent faute de terme d'un côté : le mot est là,
--                    mais « le sol est argileux donc on reprend » n'a aucun mot
--                    technique à droite ;
--   · `tautologies`— combien ont le même terme des deux côtés ;
--   · `chantiers`  — sur combien de chantiers ce mot est coupé.
--
-- Un mot à `contenues` élevé et `entieres` nul est un mot qui promet et ne
-- rend rien : c'est là qu'il faut regarder.

create or replace function public.le_detail_des_liaisons()
returns table (
  mot text,
  lien text,
  contenues bigint,
  premieres bigint,
  entieres bigint,
  sans_terme bigint,
  tautologies bigint,
  chantiers bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with coupees as (
    select a.id, a.project_id, c.mot, c.avant, c.apres
      from public.project_assertions a
      cross join lateral public.la_coupe_dun_texte(a.statement) c
  ),
  portees as (
    select l.mot as le_mot, count(*)::bigint as combien
      from public.project_assertions a
      join public.les_mots_de_liaison() l
        on position(' ' || l.mot || ' ' in
                    ' ' || public.le_texte_normalise(a.statement) || ' ') > 0
     group by l.mot
  ),
  par_mot as (
    select co.mot as le_mot,
           count(*)::bigint as premieres,
           count(*) filter (
             where co.avant is not null and co.apres is not null
               and co.avant <> co.apres)::bigint as entieres,
           count(*) filter (
             where co.avant is null or co.apres is null)::bigint as sans_terme,
           count(*) filter (
             where co.avant is not null and co.apres is not null
               and co.avant = co.apres)::bigint as tautologies,
           count(distinct co.project_id)::bigint as chantiers
      from coupees co
     group by co.mot
  )
  select l.mot, l.lien,
         coalesce(po.combien, 0)::bigint,
         coalesce(pm.premieres, 0)::bigint,
         coalesce(pm.entieres, 0)::bigint,
         coalesce(pm.sans_terme, 0)::bigint,
         coalesce(pm.tautologies, 0)::bigint,
         coalesce(pm.chantiers, 0)::bigint
    from public.les_mots_de_liaison() l
    left join portees po on po.le_mot = l.mot
    left join par_mot pm on pm.le_mot = l.mot
   order by 3 desc, 1;
end;
$$;

comment on function public.le_detail_des_liaisons() is
  'Ou le decoupage casse, mot par mot : combien d''affirmations portent le mot, combien sont coupees dessus, et combien echouent et pourquoi.';

revoke all on function public.le_detail_des_liaisons() from public;
grant execute on function public.le_detail_des_liaisons() to authenticated;

-- ── La forme des affirmations ──────────────────────────────────────────────
--
-- Avant d'accuser le découpage, savoir sur quoi il travaille. Un corpus
-- d'intitulés — « Menuiseries extérieures », « Plancher haut du R+1 » — ne
-- porte aucun lien, et ce n'est pas le découpage qu'il faut corriger.

create or replace function public.la_forme_des_affirmations()
returns table (
  affirmations bigint,
  mots_moyens numeric,
  au_moins_dix_mots bigint,
  sans_liaison bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with comptees as (
    select a.id,
           coalesce(array_length(
             string_to_array(trim(public.le_texte_normalise(a.statement)), ' '), 1), 0) as mots
      from public.project_assertions a
  ),
  liantes as (
    select distinct a.id
      from public.project_assertions a
      cross join lateral public.la_coupe_dun_texte(a.statement) c
  )
  select (select count(*) from comptees),
         (select round(coalesce(avg(mots), 0), 1) from comptees),
         (select count(*) from comptees where mots >= 10),
         (select count(*) from comptees where id not in (select id from liantes));
end;
$$;

comment on function public.la_forme_des_affirmations() is
  'Sur quoi le decoupage travaille : combien d''affirmations, combien de mots en moyenne, combien en portent au moins dix, et combien ne portent aucun mot de liaison.';

revoke all on function public.la_forme_des_affirmations() from public;
grant execute on function public.la_forme_des_affirmations() to authenticated;
