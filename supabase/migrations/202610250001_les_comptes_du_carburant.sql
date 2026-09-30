-- Ce que la console peut savoir du carburant : des comptes, jamais un contenu.
--
-- LA QUESTION POSÉE
--
-- « Je veux voir ce que le système fait des mails, et comprendre la valeur pour
-- la prédiction. » C'est la bonne question, et elle se heurte à la règle la
-- plus dure de la console : **elle ne lit jamais un contenu**
-- (`docs/la-console-de-ladministrateur.md`, § 3). Le dossier des mails est privé
-- par construction ; un administrateur n'est pas une exception, c'est le cas le
-- plus dangereux.
--
-- CE QU'ON PEUT RÉPONDRE SANS RIEN LIRE
--
-- Beaucoup, en fait. Pour savoir si un prédicteur a une chance, on n'a pas
-- besoin de lire un seul mail : il faut savoir **combien il y en a, sur combien
-- de chantiers, et sur quelle durée**. Un projet qui porte trois messages ne
-- prédit rien ; un projet qui en porte quatre cents sur dix-huit mois, peut-être.
--
-- C'est pour cela que cette fonction rend une **répartition** et pas seulement
-- un total. « 40 000 mails » ne dit rien : quarante mille répartis sur mille
-- projets sont quarante mille fois rien. Le chiffre qui décide, c'est combien de
-- projets ont assez de matière (`docs/nourrir-mdall.md`, § 8 ter).
--
-- CE QU'ELLE NE REND PAS, ET C'EST LA MOITIÉ DE SON INTÉRÊT
--
-- Aucun objet, aucune adresse, aucun nom de projet, aucun identifiant. Que des
-- nombres et deux dates. Elle ne peut pas servir à savoir *qui* dépose *quoi* :
-- `count(distinct ...)` rend un nombre, et un nombre ne se remonte pas.
--
-- `security definer`, et il faut dire pourquoi : les documents sont gardés par
-- `documents_by_project`, qui ne rend à chacun que ses projets. Un administrateur
-- ne verrait donc rien. La fonction contourne cette politique — et **ne peut
-- rendre que des agrégats**, par sa signature elle-même. C'est la même forme de
-- garde que `est_administrateur()` : ce qui sort est un nombre, pas une ligne.

-- ── La porte, recréée ──────────────────────────────────────────────────────
--
-- Elle avait été supprimée en même temps que l'archive de la console, parce
-- qu'elle n'avait plus un seul appelant et qu'une fonction `security definer`
-- que rien n'appelle est le pire des deux mondes. Elle en a un de nouveau, et
-- c'est celui pour lequel elle avait été écrite.
create or replace function public.est_administrateur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.administrateurs
    where courriel = lower(auth.jwt() ->> 'email')
  );
$$;

comment on function public.est_administrateur() is
  'Vrai si l''appelant est administrateur. Ne rend jamais qui sont les autres.';

revoke all on function public.est_administrateur() from public;
grant execute on function public.est_administrateur() to authenticated;

-- ── Les comptes du carburant ───────────────────────────────────────────────

create or replace function public.comptes_du_carburant()
returns table (
  messages bigint,
  pieces bigint,
  octets bigint,
  projets bigint,
  deposants bigint,
  depuis timestamptz,
  jusqua timestamptz,
  -- La répartition : combien de projets portent assez de matière pour qu'un
  -- prédicteur ait une chance. C'est le chiffre qui décide, pas le total.
  projets_1_9 bigint,
  projets_10_49 bigint,
  projets_50_199 bigint,
  projets_200_et_plus bigint,
  -- La durée couverte par les mails d'un projet, en jours, au milieu de la
  -- distribution. Un chantier dure deux ans : trois semaines de correspondance
  -- ne disent rien d'une suite.
  jours_medians integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- **La porte d'abord.** Sans elle, `security definer` rendrait ces comptes à
  -- n'importe quel compte authentifié.
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with mails as (
    select d.project_id, d.deposant, d.created_at, d.file_size_bytes, d.document_kind
    from public.documents d
    where d.deleted_at is null
      and d.document_kind in ('mail_depose', 'piece_de_mail')
  ),
  par_projet as (
    select m.project_id,
           count(*) filter (where m.document_kind = 'mail_depose') as combien,
           extract(epoch from (max(m.created_at) - min(m.created_at))) / 86400 as jours
    from mails m
    group by m.project_id
    having count(*) filter (where m.document_kind = 'mail_depose') > 0
  )
  select
    (select count(*) from mails where document_kind = 'mail_depose'),
    (select count(*) from mails where document_kind = 'piece_de_mail'),
    (select coalesce(sum(file_size_bytes), 0)::bigint from mails),
    (select count(*) from par_projet),
    (select count(distinct deposant) from mails where deposant is not null),
    (select min(created_at) from mails),
    (select max(created_at) from mails),
    (select count(*) from par_projet where combien between 1 and 9),
    (select count(*) from par_projet where combien between 10 and 49),
    (select count(*) from par_projet where combien between 50 and 199),
    (select count(*) from par_projet where combien >= 200),
    (select coalesce(
       percentile_cont(0.5) within group (order by jours), 0)::integer
     from par_projet);
end;
$$;

comment on function public.comptes_du_carburant() is
  'Des comptes sur les mails déposés : combien, sur combien de projets, sur quelle durée. Aucun contenu, aucun identifiant, aucun nom. Réservée aux administrateurs.';

revoke all on function public.comptes_du_carburant() from public;
grant execute on function public.comptes_du_carburant() to authenticated;
