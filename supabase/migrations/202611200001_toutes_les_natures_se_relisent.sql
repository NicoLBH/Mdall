-- ════════════════════════════════════════════════════════════════════════════
--  Toutes les natures se relisent — 2 274 affirmations n'étaient qu'un numéro
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Ce que le corpus a montré, une fois la lecture du payload en place
--
--  La réparation précédente a rendu leur phrase à **999** affirmations. Il en
--  restait **2 274**, soit **24 % de la mémoire**, qui se relisaient ainsi :
--
--      Document au corpus : 02b81e88-8a77-4dd0-96a2-d25a78127665
--
--  Mille cent quatre-vingt-cinq d'entre elles ne portent qu'un identifiant
--  technique. Les autres portent une clé à préfixe — « rubrique:… », « regle:… ».
--  Aucune ne se lit.
--
--  ## Pourquoi la réparation n'avait pris qu'un tiers
--
--  `le_dit_dune_affirmation` ne regardait que `payload->>'subject'`. C'est la
--  branche de **l'affirmation**, et il y en a cinq : un avis se nomme par son
--  numéro et sa rubrique, un rattachement par son intitulé, un point de chantier
--  par son lot et son titre, un document par son nom.
--
--  L'écrivain (`statementOf`) a ces cinq branches depuis qu'il a été corrigé.
--  Le lecteur n'en avait qu'une. **C'est la même divergence que la fois
--  précédente, d'un cran plus profond** : non plus « la base ne lit pas le
--  payload », mais « la base n'en lit qu'un cinquième ». Une construction écrite
--  à deux endroits finit par diverger (règle 4), et il a fallu deux rounds pour
--  en voir les deux moitiés.
--
--  Du côté JavaScript, les deux chemins passent maintenant par une seule
--  fonction, `laPhraseDuneAffirmation`. Ici, c'est la traduction de la même, et
--  les cas des deux épreuves viennent d'un seul fichier.
--
--  ## Ce qu'on ne fait pas
--
--  **On ne réécrit aucun `statement`.** Ces 2 274 lignes ont été signées avec la
--  phrase qu'elles portent ; une exécution qui a eu lieu ne devient pas fausse
--  (règle 6). On les **relit** par où l'écrivain passerait aujourd'hui.
--
--  Et quand il n'y a rien de mieux à dire — un document dont la charge est vide —
--  la phrase versée est gardée. La reconstruction ne doit jamais appauvrir : un
--  identifiant reste un identifiant, mais une phrase juste ne doit pas être
--  remplacée par un repli.
--
--  ## Exception à la règle des migrations strictement additives, et elle est dite
--
--  `le_dit_dune_affirmation` prend un argument de plus — la nature. Changer la
--  signature demande de retirer l'ancienne : `create or replace` ne le permet
--  pas. On ne garde pas les deux, parce que la plus ancienne rendrait un
--  cinquième des phrases et qu'un appel oublié passerait inaperçu.
--
--  Aucune table, aucune colonne, aucune politique n'est touchée.
-- ════════════════════════════════════════════════════════════════════════════

drop function if exists public.le_dit_dune_affirmation(text, jsonb);

-- ── Ce que dit une affirmation, selon sa nature ─────────────────────────────

create or replace function public.le_dit_dune_affirmation(
  nature text,
  cle text,
  dit text,
  charge jsonb
)
returns text
language sql
immutable
as $$
  with lu as (
    select nullif(btrim(coalesce(charge->>'title', '')), '')     as titre_avis,
           nullif(btrim(coalesce(charge->>'reference', '')), '') as numero,
           nullif(btrim(coalesce(charge->>'label', '')), '')     as intitule,
           nullif(btrim(coalesce(charge->>'titre', '')), '')     as titre_point,
           nullif(btrim(coalesce(charge->>'lot', '')), '')       as lot,
           nullif(btrim(coalesce(charge->>'subject', '')), '')   as sujet,
           nullif(btrim(coalesce(charge->>'value', '')), '')     as valeur,
           nullif(btrim(coalesce(charge->>'name', '')), '')      as nom
  )
  select case
           -- **Un avis.** Sans numéro, sa rubrique seule : « Avis  — Fondations »
           -- laissait un trou là où la fiche n'imprime rien.
           when nature = 'avis' then
             case
               -- **Une reconstruction qui ne porte rien de la ligne ne remplace
               -- pas ce qui est écrit.** Un avis sans numéro ni rubrique rendrait
               -- « Avis relevé sur une fiche », et mille cent quatre-vingt-cinq
               -- lignes se liraient *identiquement*. Un identifiant illisible
               -- reste au moins distinct, et leur nombre est la mesure honnête de
               -- ce que la mémoire ne sait pas dire (règle 5).
               when lu.numero is null and lu.titre_avis is null then
                 coalesce(nullif(btrim(coalesce(dit, '')), ''), 'Avis relevé sur une fiche')
               when lu.numero is null then 'Avis — ' || lu.titre_avis
               when lu.titre_avis is null then 'Avis ' || lu.numero
               else 'Avis ' || lu.numero || ' — ' || lu.titre_avis
             end

           -- **Un rattachement.** Son intitulé, ou sa clé métier, qui au moins
           -- se lit — jamais un identifiant technique.
           when nature = 'attachment' then
             'Rattachement au projet : ' || coalesce(lu.intitule, btrim(coalesce(cle, '')))

           -- **Un point de compte rendu.** Son lot et ce qu'il dit : le numéro
           -- seul — « 12.02.1 » — ne désigne rien pour qui n'a pas le compte
           -- rendu ouvert à côté.
           when nature = 'sujet' then
             case
               when lu.titre_point is null then
                 'Point de chantier ' || coalesce(lu.numero, btrim(coalesce(cle, '')))
               when lu.lot is null then lu.titre_point
               else lu.lot || ' — ' || lu.titre_point
             end

           -- **Une affirmation.** Son sujet, et sa valeur quand elle en diffère :
           -- un raisonnement n'affirme rien, et sa seule valeur possible est sa
           -- question — « Quelle profondeur ? : Quelle profondeur ? ».
           when lu.sujet is not null then
             case when lu.valeur is null or lu.valeur = lu.sujet
                  then lu.sujet
                  else lu.sujet || ' : ' || lu.valeur end

           -- **Un document garde son nom**, et c'est la seule fois où ce repli
           -- est juste.
           when lu.nom is not null then 'Document au corpus : ' || lu.nom

           -- Rien de mieux que ce qui est déjà écrit. La reconstruction ne doit
           -- jamais appauvrir.
           else coalesce(dit, '')
         end
    from lu;
$$;

comment on function public.le_dit_dune_affirmation(text, text, text, jsonb) is
  'Ce que dit une affirmation, selon sa nature, comme l''ecran le dit : avis, rattachement, point de chantier, affirmation, document. 2 274 lignes ne se relisaient que par leur identifiant.';

-- ════════════════════════════════════════════════════════════════════════════
--  Les huit lectures passent à la signature par nature
-- ════════════════════════════════════════════════════════════════════════════
--
--  Leur corps ne change pas d'un caractère : seul l'appel reçoit la nature et la
--  clé métier. C'est ce que le banc éprouve, lecture par lecture — une lecture
--  qu'on oublie de rebrancher rend un cinquième des phrases, et la batterie a
--  montré deux fois qu'un tel oubli laisse le banc vert.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Le corpus coupé ────────────────────────────────────────────────────────

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
    select array_agg(public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload)
                     order by a.id) as textes,
           array_agg(a.id order by a.id) as ids,
           array_agg(a.project_id order by a.id) as projets
      from public.project_assertions a
  )
  select co.ids[c.rang], co.projets[c.rang], c.avant, c.lien, c.apres, c.mot
    from corpus co
    cross join lateral public.la_coupe_des_textes(co.textes) c;
$$;

-- ── Le détail mot à mot ────────────────────────────────────────────────────

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
    select ' ' || public.le_texte_normalise(
             public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload)) || ' ' as t
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

-- ── La forme des affirmations ──────────────────────────────────────────────

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
             string_to_array(trim(public.le_texte_normalise(
               public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload))), ' '), 1), 0) as mots
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

-- ── Les sujets du système ──────────────────────────────────────────────────

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
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with termes as (
    select a.id, a.project_id, s.sujet as terme, s.cle, s.mots as combien_de_mots
      from public.project_assertions a
      cross join lateral public.les_sujets_dun_texte(
        public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload)) s
  )
  select
    -- **La forme la plus écrite**, pas la clé : on regroupe sans réécrire ce
    -- que les gens ont écrit.
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

-- ── Et ce qu'on en écarte ──────────────────────────────────────────────────

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
  with par_cle as (
    select s.cle,
           -- **Pas `chantiers` ni `formes` :** ces noms sont ceux des
           -- paramètres de sortie, et PostgreSQL refuse la requête.
           count(distinct a.project_id) as combien_de_chantiers,
           count(distinct s.sujet) as combien_de_formes
      from public.project_assertions a
      cross join lateral public.les_sujets_dun_texte(
        public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload)) s
     group by s.cle
  )
  select (select count(*) from par_cle where combien_de_chantiers >= seuil),
         (select count(*) from par_cle where combien_de_chantiers < seuil),
         (select coalesce(sum(combien_de_formes), 0)::bigint
            from par_cle where combien_de_chantiers >= seuil),
         (select count(*) from public.project_assertions);
end;
$$;

-- ── Les sujets d'un chantier, pour son prédicteur ──────────────────────────

create or replace function public.les_sujets_de_ce_chantier(
  le_chantier uuid,
  au_moins integer default 2
)
returns table (
  affirmation uuid,
  sujet text
)
language sql
stable
as $$
  with termes as (
    select a.id, s.sujet as terme, s.cle
      from public.project_assertions a
      cross join lateral public.les_sujets_dun_texte(
        public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload)) s
     where a.project_id = le_chantier
  ),
  retenus as (
    select cle,
           mode() within group (order by terme) as sujet
      from termes
     group by cle
    -- **Répété dans ce chantier.** Un sujet vu une seule fois n'a aucune suite
    -- à prédire : le garder n'ajouterait que du bruit au classement.
    having count(distinct id) >= greatest(2, coalesce(au_moins, 2))
  )
  -- `distinct` : un sujet écrit deux fois dans la même phrase est un sujet, pas
  -- deux.
  select distinct t.id, r.sujet
    from termes t
    join retenus r on r.cle = t.cle;
$$;

-- ── La répétition du corpus ────────────────────────────────────────────────
--
-- Elle comptait des phrases de repli : « Document au corpus : <clé> » revient
-- autant de fois qu'il y a de clés, et ces lignes-là se ressemblaient bien plus
-- que les phrases qu'elles cachaient.

create or replace function public.la_repetition_du_corpus()
returns table (
  affirmations bigint,
  distinctes bigint,
  copies_max bigint,
  remplacees bigint,
  courantes bigint,
  distinctes_courantes bigint,
  sujets bigint,
  sujets_reverses bigint,
  textes_sur_plusieurs_sujets bigint
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
  with normalisees as materialized (
    select a.id,
           a.project_id,
           a.kind,
           a.subject_key,
           a.proposition_id,
           a.superseded_by,
           trim(public.le_texte_normalise(
             public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload))) as dit
      from public.project_assertions a
  ),
  par_texte as (
    select dit, count(*) as combien from normalisees group by dit
  ),
  par_sujet as (
    select project_id, kind, subject_key,
           count(distinct proposition_id) as propositions
      from normalisees
     group by project_id, kind, subject_key
  ),
  textes_etales as (
    select dit
      from normalisees
     group by dit
    having count(distinct (project_id, kind, subject_key)) > 1
  )
  select (select count(*) from normalisees),
         (select count(*) from par_texte),
         (select coalesce(max(combien), 0) from par_texte),
         (select count(*) from normalisees where superseded_by is not null),
         (select count(*) from normalisees where superseded_by is null),
         (select count(distinct dit) from normalisees where superseded_by is null),
         (select count(*) from par_sujet),
         (select count(*) from par_sujet where propositions > 1),
         (select count(*) from textes_etales);
end;
$$;

-- ── Le corpus en clair ─────────────────────────────────────────────────────
--
-- C'est ici que cela se voit le mieux : le fichier emporté montrait trois mille
-- quatre cent vingt-huit lignes « Document au corpus : <clé> », et l'on ne
-- pouvait pas savoir si la phrase existait ailleurs. Il montre maintenant ce
-- que l'écran montre.

create or replace function public.le_corpus_en_clair(au_plus integer default 20000)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  combien integer := least(greatest(1, coalesce(au_plus, 20000)), 50000);
  document jsonb;
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  with numerotes as (
    -- **Un numéro d'ordre, jamais l'identifiant.**
    select a.id,
           dense_rank() over (order by a.project_id)::integer as rang_du_chantier,
           public.le_dit_dune_affirmation(
               a.kind, a.subject_key, a.statement, a.payload) as statement
      from public.project_assertions a
  ),
  coupees as (
    select c.id, c.avant, c.lien, c.apres, c.mot
      from public.la_coupe_du_corpus() c
  ),
  portees as (
    select n.rang_du_chantier, n.statement, co.avant, co.lien, co.apres, co.mot
      from numerotes n
      left join coupees co on co.id = n.id
     order by n.rang_du_chantier, n.statement
     limit combien
  )
  select jsonb_build_object(
           'affirmations', (select count(*) from public.project_assertions),
           'rendues', count(*),
           'au_plus', combien,
           'corpus', coalesce(jsonb_agg(jsonb_build_object(
             'chantier', p.rang_du_chantier,
             'dit', p.statement,
             'avant', p.avant,
             'lien', p.lien,
             'apres', p.apres,
             'mot', p.mot)), '[]'::jsonb))
    into document
    from portees p;

  return document;
end;
$$;
