-- ─────────────────────────────────────────────────────────────────────────────
-- La santé des lectures, lue dans nos propres tables
--
-- ## La question posée
--
-- > « C'est une console pour gérer l'application : il est hors de question de
-- >   passer par le terminal pour obtenir des infos. Il faut que tout soit
-- >   alimenté depuis l'architecture de l'application, avec des requêtes, des
-- >   comptages. Jamais de ligne de commande. On doit suivre la santé du
-- >   système en ligne. »
--
-- La rubrique « La justesse » ne montrait que les bilans de quatre outils de
-- banc, qu'on lance à la main depuis une invite de commandes. Sur une
-- installation qui n'en avait jamais reçu, elle affichait quatre fois « jamais
-- lancé » — et le seul geste qu'elle proposait était d'ouvrir un terminal.
--
-- Ce n'est pas une console d'exploitation. Une console d'exploitation lit ce
-- que le système **a déjà fait**, et le lit en ligne.
--
-- ## Ce que cette fonction compte
--
-- Les trois tables de lectures — `cr_lectures`, `rapport_lectures`,
-- `fil_lectures` — portent déjà tout ce qu'il faut pour dire si les documents
-- sont lus, et comment :
--
--   * **combien de lectures**, par famille : l'assiette de tout le reste ;
--   * **combien ont gelé une analyse** : une lecture sans `analyse_gelee` est
--     une lecture qui n'a rien rendu, et c'est le défaut le plus grave qu'on
--     puisse avoir sans le voir — l'écran annonce « analysé » et il n'y a rien
--     à rouvrir ;
--   * **combien ont relevé quelque chose** : zéro point sur un compte rendu de
--     douze pages est une lecture qui a échoué sans le dire ;
--   * **sur combien de documents distincts**, pour voir les relectures ;
--   * **par quel procédé** : le modèle et la version de la consigne. Deux
--     procédés en vie sur la même famille font deux états du système, et non
--     une moyenne.
--
-- ## Et trois comptes qu'on ne confond pas
--
-- `avec_releve`, `sans_releve` et `releve_inconnu` sont **trois** cas, et non
-- deux. Une lecture dont les mesures ne portent pas la clé n'a pas relevé zéro :
-- on ne sait pas ce qu'elle a relevé. `Number(null)` vaut zéro, et zéro est
-- fini — les fondre ferait lire « douze lectures sans aucun point » là où l'on
-- n'a simplement rien mesuré (règle 5).
--
-- ## Ce qu'elle ne porte pas, et ne peut pas porter
--
-- Aucun nom de document, aucun titre, aucun contenu : **des comptes, des dates
-- et des noms de procédé**. `lu_par` vaut « gpt-4.1-mini · lecture de CR v1 » —
-- c'est le modèle et la version de la consigne, pas le chantier. La console ne
-- lit pas un contenu, et cette fonction ne lui en donne pas le moyen.
--
-- ## Strictement additive
--
-- Une fonction, et rien d'autre. Aucune table touchée, aucune politique
-- changée, aucune colonne retirée.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.la_sante_des_lectures(p_jours integer default 30)
returns table (
  -- Une entrée par famille qui a au moins une lecture dans la fenêtre.
  -- **Une famille sans lecture n'y figure pas**, et c'est l'écran qui le dit :
  -- une ligne à zéro et une famille absente demandent le même geste — lancer une
  -- lecture — mais seule la seconde peut vouloir dire « cette table n'existe
  -- plus », et c'est au JavaScript d'en décider.
  familles jsonb,
  -- La file, par geste et par statut. Elle dit si ce qui part arrive : des
  -- lectures qui n'aboutissent jamais ne se voient pas dans les trois tables
  -- ci-dessus, puisqu'elles n'y écrivent rien.
  files jsonb,
  -- Depuis quand on compte. Sans elle, « 14 lectures » ne se compare à rien.
  depuis timestamptz,
  -- Quand on a regardé — l'heure de la base, et non celle du navigateur, qui
  -- peut être fausse de deux heures.
  regarde_le timestamptz
)
language plpgsql
-- Journalise son accès : donc `volatile`. Une fonction déclarée `stable`
-- tournerait en lecture seule, et Postgres refuserait l'insertion du journal.
volatile
security definer
set search_path = public, auth
as $$
declare
  -- Bornée : une fenêtre de dix ans ferait un balayage de toutes les lectures
  -- du produit pour une page qu'on ouvre en passant.
  v_jours integer := least(greatest(coalesce(p_jours, 30), 1), 365);
  v_depuis timestamptz := now() - make_interval(days => v_jours);
begin
  perform public.la_porte_de_la_console(
    'exploitation/justesse', format('jours=%s', v_jours));

  return query
  with toutes as (
    -- **Les trois tables ramenées à ce qui se compte.** Trois blocs de comptage
    -- recopiés auraient divergé au premier indicateur ajouté, et c'est la copie
    -- qu'on relit le moins qui serait restée fausse (règle 10).
    --
    -- La clé du relevé diffère d'une famille à l'autre, et c'est voulu : « 12 »
    -- ne dit rien, « 12 points » et « 12 avis » ne se comparent pas. Elle est
    -- lue ici exactement comme `lesMesuresDites` la lit côté écran.
    select
      'comptes_rendus'::text as famille,
      c.created_at,
      c.lu_par,
      c.document_id,
      (c.analyse_gelee is not null) as gelee,
      case when jsonb_typeof(c.mesures -> 'points') = 'number'
           then (c.mesures ->> 'points')::numeric end as releve
      from public.cr_lectures c
     where c.created_at > v_depuis
    union all
    select
      'rapports'::text,
      r.created_at,
      r.lu_par,
      r.document_id,
      (r.analyse_gelee is not null),
      case when jsonb_typeof(r.mesures -> 'avis') = 'number'
           then (r.mesures ->> 'avis')::numeric end
      from public.rapport_lectures r
     where r.created_at > v_depuis
    union all
    select
      'mails'::text,
      f.created_at,
      f.lu_par,
      -- **Un fil n'est pas une ligne de Fichiers.** Il est fait de plusieurs
      -- messages, et aucun document ne le porte : compter ses documents
      -- distincts rendrait zéro, ce qui se lirait « aucun document lu ».
      null::uuid,
      (f.analyse_gelee is not null),
      case when jsonb_typeof(f.mesures -> 'prises') = 'number'
           then (f.mesures ->> 'prises')::numeric end
      from public.fil_lectures f
     where f.created_at > v_depuis
  ),
  par_procede as (
    select t.famille, coalesce(nullif(btrim(t.lu_par), ''), 'procédé non dit') as procede,
           count(*) as combien, max(t.created_at) as derniere
      from toutes t
     group by 1, 2
  ),
  par_famille as (
    select
      t.famille,
      count(*) as lectures,
      count(*) filter (where t.gelee) as avec_analyse,
      count(*) filter (where t.releve > 0) as avec_releve,
      count(*) filter (where t.releve = 0) as sans_releve,
      count(*) filter (where t.releve is null) as releve_inconnu,
      count(distinct t.document_id) as documents,
      max(t.created_at) as derniere
      from toutes t
     group by 1
  )
  select
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'famille', f.famille,
        'lectures', f.lectures,
        'avec_analyse', f.avec_analyse,
        'avec_releve', f.avec_releve,
        'sans_releve', f.sans_releve,
        'releve_inconnu', f.releve_inconnu,
        'documents', f.documents,
        'derniere', f.derniere,
        'procedes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'procede', p.procede, 'combien', p.combien, 'derniere', p.derniere)
            order by p.combien desc, p.procede)
            from par_procede p where p.famille = f.famille
        ), '[]'::jsonb)
      ) order by f.famille)
      from par_famille f
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'geste', g.geste, 'statut', g.statut, 'combien', g.combien)
        order by g.geste, g.statut)
      from (
        select coalesce(nullif(btrim(v.geste), ''), 'geste non dit') as geste,
               v.statut, count(*) as combien
          from public.versements v
         where v.cree_le > v_depuis
         group by 1, 2
      ) g
    ), '[]'::jsonb),
    v_depuis,
    now();
end;
$$;

comment on function public.la_sante_des_lectures(integer) is
  'Des comptages de lectures par famille et par procédé, pour la console. '
  'Aucun nom de document, aucun contenu : des nombres, des dates et des noms de procédé.';

revoke all on function public.la_sante_des_lectures(integer) from public, anon;
grant execute on function public.la_sante_des_lectures(integer) to authenticated;
