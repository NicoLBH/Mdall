-- ════════════════════════════════════════════════════════════════════════════
--  Le corpus tient dans un document — le plafond de PostgREST ne le coupe plus
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Ce qui était faux, et comment on l'a su
--
--  `le_corpus_en_clair()` portait sa propre limite, vingt mille, et rendait un
--  **ensemble de lignes**. Le fichier emporté en portait mille.
--
--  Mille n'est pas un nombre de hasard : c'est `db-max-rows`, le plafond que
--  PostgREST applique à toute réponse en lignes. Il s'applique **après** la
--  fonction, sur le transport, et la fonction ne le voit pas. Les neuf mille
--  quatre cent quatre-vingt-huit affirmations sortaient tronquées au neuvième,
--  et rien ne le disait.
--
--  C'est le pire des défauts : pas une erreur, un chiffre. Le fichier annonçait
--  « 1 000 affirmations, dont 998 dont le découpage ne tire rien » — une phrase
--  juste sur un corpus faux. L'ordre `order by rang_du_chantier` faisait le
--  reste : les mille lignes venaient toutes du premier chantier, et on en
--  aurait conclu qu'un seul chantier écrit (règle 12).
--
--  ## Ce que cette migration fait
--
--  La fonction rend **un seul document** au lieu d'un ensemble de lignes. Une
--  ligne ne se fait pas tronquer à mille lignes : le plafond de PostgREST ne
--  compte pas ce qu'il y a dedans.
--
--  Et elle dit ce qu'elle n'a pas rendu. `affirmations` est le compte entier,
--  `rendues` ce que le document porte. Les deux sont là pour qu'un écart se
--  voie — le défaut qu'on répare n'était pas la troncature, c'était son silence
--  (règle 5).
--
--  ## Exception à la règle des migrations strictement additives, et elle est dite
--
--  `le_corpus_en_clair(integer)` change de type de retour : `create or replace`
--  ne le permet pas, il faut la retirer d'abord. On ne garde pas l'ancienne à
--  côté sous un autre nom : elle rendrait le même corpus par le chemin qui le
--  tronque, et le jour où la coupe change l'une des deux ne suivrait pas
--  (règle 4). Une seule définition, et c'est celle qui n'est pas coupée.
--
--  Aucune table, aucune colonne, aucune politique n'est touchée.
-- ════════════════════════════════════════════════════════════════════════════

drop function if exists public.le_corpus_en_clair(integer);

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
  -- **La porte d'abord.** Sans elle, `security definer` rendrait le texte des
  -- affirmations de tous les chantiers à n'importe quel compte authentifié.
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  with numerotes as (
    -- **Un numéro d'ordre, jamais l'identifiant.** Il dit « ces deux-là
    -- viennent du même chantier » sans dire lequel.
    select a.id,
           dense_rank() over (order by a.project_id)::integer as rang_du_chantier,
           a.statement
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
           -- Le corpus entier, et non ce que le document porte : c'est l'écart
           -- entre les deux qu'on vient voir.
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

comment on function public.le_corpus_en_clair(integer) is
  'Le texte des affirmations et ce que la coupe en tire, en UN document : un ensemble de lignes se fait tronquer a mille par PostgREST. Contenu de chantier, reserve aux administrateurs.';

revoke all on function public.le_corpus_en_clair(integer) from public;
grant execute on function public.le_corpus_en_clair(integer) to authenticated;
