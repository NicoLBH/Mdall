-- ════════════════════════════════════════════════════════════════════════════
--  La coupe passe sur tout le corpus en une fois
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Ce qui ne revenait pas
--
--  La console annonçait, en haut : « 1 % des affirmations énoncent un lien
--  (64 sur 9 378) », et plus bas, dans le bloc qui devait l'expliquer :
--  « Aucun mot de liaison n'apparaît dans le corpus. » Deux phrases du même
--  écran, qui se contredisent — et la plus catégorique des deux était fausse.
--
--  `le_detail_des_liaisons()` ne répondait pas. Mesuré sur un corpus de neuf
--  mille affirmations, avec PostgreSQL 16 :
--
--      la_forme_des_affirmations     6 800 ms
--      la_mesure_des_idees           6 400 ms
--      les_idees_du_systeme          6 600 ms
--      le_detail_des_liaisons       12 500 ms   ← au-delà du délai accordé
--
--  Les trois premières passent de justesse, la quatrième non. Ce n'est donc
--  pas « la console est cassée » : c'est une lecture deux fois plus lourde que
--  les autres, et les autres étaient déjà au bord.
--
--  ## D'où venait le poids
--
--  `la_coupe_dun_texte(bout)` coupe **un** texte. Les quatre lectures
--  l'appelaient en `cross join lateral` sur toute la table : neuf mille appels,
--  dont chacun refaisait le tour des cinquante-sept mots de liaison. Mesuré,
--  cette boucle à elle seule coûte 6 500 ms ; la même coupe écrite d'un seul
--  tenant sur le corpus entier en coûte **230**.
--
--  Vingt-huit fois, et ce n'est pas une optimisation d'intuition : c'est la
--  différence entre une question posée neuf mille fois et la même question
--  posée une fois.
--
--  ## Ce que cette migration change
--
--  **La coupe est écrite une fois, pour un ensemble de textes.**
--  `la_coupe_des_textes(text[])` devient la seule définition ; elle normalise
--  chaque texte une fois, cherche les cinquante-sept mots dedans, et retient le
--  premier. `la_coupe_dun_texte(bout)` garde sa signature et devient un passage
--  à un seul texte — un second découpage écrit à côté aurait divergé du premier
--  à la première retouche (règle 4).
--
--  `la_coupe_du_corpus()` applique cette coupe à `project_assertions` en une
--  passe, et les quatre lectures de la console s'appuient dessus.
--
--  ## Le `materialized` des textes, et pourquoi il n'est pas décoratif
--
--  Depuis PostgreSQL 12, une étape `with` citée une seule fois est **repliée**
--  dans la requête qui la cite : son contenu est alors recalculé à chaque
--  ligne du parcours. C'est exactement ce qu'il ne faut pas pour les textes
--  normalisés — les normaliser une fois coûte 240 ms, les normaliser une fois
--  par mot de liaison en coûte 6 200. `materialized` dit « calcule ceci une
--  fois ». Le retirer ne change aucun résultat et rend la console muette.
--
--  Les mots de liaison, eux, ne le portent pas : cinquante-sept lignes
--  constantes ne coûtent rien à refaire, et le mesurer l'a confirmé. Un
--  mot-clé posé partout « au cas où » finit par être recopié là où il nuit.
--
--  ## Ce qu'elle ne change pas
--
--  Aucune signature publique, aucune colonne, aucune porte : les quatre
--  lectures restent réservées aux administrateurs et vérifient la porte
--  elles-mêmes. Les nombres rendus sont les mêmes — c'est le chemin qui change.
--
--  Strictement additive : des `create or replace` de même signature, plus deux
--  fonctions neuves.
-- ════════════════════════════════════════════════════════════════════════════

-- ── La coupe, pour un ensemble de textes ───────────────────────────────────
--
-- C'est **la** définition. Les mots de liaison sont dressés une fois, les
-- textes normalisés une fois, et la jointure cherche chaque mot dans chaque
-- texte déjà normalisé.
--
-- `rang` est la place du texte dans le tableau reçu, à partir de 1 : c'est par
-- lui que l'appelant retrouve de quelle affirmation vient quelle idée. Un texte
-- qui ne porte aucun mot de liaison ne rend aucune ligne — et c'est ainsi qu'on
-- compte ceux qui n'en portent pas.

create or replace function public.la_coupe_des_textes(textes text[])
returns table (
  rang integer,
  avant text,
  lien text,
  apres text,
  mot text,
  renverse boolean
)
language sql
stable
set search_path = public
as $$
  -- `mots` ne porte pas `materialized`, et c'est mesuré : cinquante-sept
  -- lignes constantes ne coûtent rien à refaire, et la batterie a montré que
  -- le forcer ne change ni le temps ni le résultat. Un mot-clé qu'on ne peut
  -- pas faire tomber est un mot-clé qu'on finit par recopier partout.
  with mots as (
    select * from public.les_mots_de_liaison()
  ),
  dits as materialized (
    select u.rang::integer as rang,
           ' ' || public.le_texte_normalise(u.bout) || ' ' as t
      from unnest(coalesce(textes, '{}'::text[])) with ordinality as u(bout, rang)
  ),
  places as (
    select d.rang, d.t, l.mot, l.lien, l.renverse,
           -- Le motif est encadré d'espaces, et le texte aussi : « car » ne se
           -- trouve pas dans « carrelage », et un mot en fin de phrase se
           -- trouve quand même.
           position(' ' || l.mot || ' ' in d.t) as ou
      from dits d
      join mots l on position(' ' || l.mot || ' ' in d.t) > 0
  ),
  -- **Le premier mot décide.** « si … alors … » commence par son lien ; lire le
  -- second donnerait une idée à l'envers. À égalité de place, le plus long
  -- gagne : « par consequent » n'est pas « par ».
  premiere as (
    select distinct on (rang) *
      from places
     order by rang, ou, length(mot) desc
  )
  select p.rang,
         case when p.renverse
              then public.le_terme_de_tete(substr(p.t, p.ou + length(p.mot) + 2))
              else public.le_terme_de_tete(substr(p.t, 1, p.ou))
         end,
         p.lien,
         case when p.renverse
              then public.le_terme_de_tete(substr(p.t, 1, p.ou))
              else public.le_terme_de_tete(substr(p.t, p.ou + length(p.mot) + 2))
         end,
         p.mot, p.renverse
    from premiere p;
$$;

comment on function public.la_coupe_des_textes(text[]) is
  'La coupe d''un ensemble de textes par leur premier mot de liaison, en une passe. Seule definition du decoupage.';

-- ── Le corpus coupé, en une passe ──────────────────────────────────────────
--
-- Les affirmations sont rassemblées en un tableau, coupées d'un coup, et le
-- rang rend à chaque idée son affirmation et son chantier.
--
-- **Elle n'a pas de porte à elle, et n'en a pas besoin** : rien ne peut
-- l'appeler. Elle n'est accordée à personne, et les quatre lectures de la
-- console l'atteignent parce qu'elles s'exécutent sous l'identité de leur
-- propriétaire. Une fonction qui lit tous les chantiers et que personne ne peut
-- appeler est une porte fermée, pas une porte oubliée.

create or replace function public.la_coupe_du_corpus()
returns table (
  id uuid,
  project_id uuid,
  avant text,
  lien text,
  apres text,
  mot text
)
language sql
stable
security definer
set search_path = public
as $$
  with corpus as materialized (
    select array_agg(a.statement order by a.id) as textes,
           array_agg(a.id order by a.id) as ids,
           array_agg(a.project_id order by a.id) as projets
      from public.project_assertions a
  )
  select co.ids[c.rang], co.projets[c.rang], c.avant, c.lien, c.apres, c.mot
    from corpus co
    cross join lateral public.la_coupe_des_textes(co.textes) c;
$$;

comment on function public.la_coupe_du_corpus() is
  'Toutes les affirmations, coupees en une passe. Reservee aux lectures de la console : accordee a personne.';

revoke all on function public.la_coupe_du_corpus() from public;

-- ── Les quatre lectures de la console, sur le corpus coupé ─────────────────

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
         count(distinct c.id)::bigint,
         count(distinct c.project_id)::bigint
    from public.la_coupe_du_corpus() c
   where c.avant is not null
     and c.apres is not null
     -- « nappe entraîne nappe » est vrai, et c'est ce qui le rend inutile.
     and c.avant <> c.apres
   group by c.avant, c.lien, c.apres
  having count(distinct c.project_id) >= seuil
   order by 4 desc, 5 desc, 1;
end;
$$;

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
  with coupees as materialized (
    select * from public.la_coupe_du_corpus()
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
  with mots as (
    select * from public.les_mots_de_liaison()
  ),
  dits as materialized (
    select ' ' || public.le_texte_normalise(a.statement) || ' ' as t
      from public.project_assertions a
  ),
  -- `contenues` compte les affirmations qui **portent** le mot, où qu'il soit —
  -- et non celles qui sont coupées dessus. L'écart entre les deux est
  -- l'information : un mot porté cent fois et jamais coupé est un mot qui
  -- arrive toujours après un autre.
  portees as (
    select l.mot as le_mot, count(*)::bigint as combien
      from dits d
      join mots l on position(' ' || l.mot || ' ' in d.t) > 0
     group by l.mot
  ),
  coupees as materialized (
    select * from public.la_coupe_du_corpus()
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
    from mots l
    left join portees po on po.le_mot = l.mot
    left join par_mot pm on pm.le_mot = l.mot
   order by 3 desc, 1;
end;
$$;

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
  with comptees as materialized (
    select a.id,
           coalesce(array_length(
             string_to_array(trim(public.le_texte_normalise(a.statement)), ' '), 1), 0) as mots
      from public.project_assertions a
  ),
  liantes as (
    select distinct id from public.la_coupe_du_corpus()
  )
  select (select count(*) from comptees),
         (select round(coalesce(avg(mots), 0), 1) from comptees),
         (select count(*) from comptees where mots >= 10),
         (select count(*) from comptees where id not in (select id from liantes));
end;
$$;

-- ── Les idées d'un document, sur la coupe commune ──────────────────────────

create or replace function public.les_idees_des_textes(textes text[])
returns table (
  rang integer,
  avant text,
  lien text,
  apres text,
  mot text
)
language sql
stable
set search_path = public
as $$
  select c.rang, c.avant, c.lien, c.apres, c.mot
    from public.la_coupe_des_textes(textes) c
   where c.avant is not null
     and c.apres is not null
     and c.avant <> c.apres;
$$;

comment on function public.les_idees_des_textes(text[]) is
  'Les idees entieres d''un ensemble de textes, rang par rang. Monte sur la coupe commune.';

-- ── Et la coupe d'un seul texte s'en va ────────────────────────────────────
--
-- **Exception à la règle des migrations strictement additives, et elle est
-- dite.** `la_coupe_dun_texte(text)` coupait un texte à la fois ; c'est par
-- elle que les quatre lectures passaient, neuf mille fois. Elles passent
-- maintenant par la coupe commune, et plus rien ne l'appelle — ni une
-- migration, ni une fonction de bord, ni l'écran.
--
-- La garder serait pire que la retirer. Une fonction que rien n'appelle ne se
-- vérifie plus : elle porterait un second découpage, à côté de celui qui sert,
-- et le jour où l'un des deux change l'autre ne suit pas (règle 4). C'est
-- exactement la duplication que cette migration défait.
--
-- Le retrait est sûr : les six fonctions qui la citaient ont été réécrites
-- au-dessus, dans ce même fichier, avant cette ligne.

drop function if exists public.la_coupe_dun_texte(text);
