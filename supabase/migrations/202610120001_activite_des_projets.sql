-- L'activité d'un projet, semaine par semaine, sur douze mois.
--
-- ## Pourquoi une fonction et non trois lectures
--
-- La liste des projets veut, pour chacun, une courbe de cinquante-deux points.
-- Ramener les lignes une par une pour les compter dans le navigateur voudrait
-- dire descendre tous les documents, toutes les propositions et **tous les
-- commentaires** de l'année, de tous les projets — des milliers de lignes dont
-- on ne garderait qu'un compte. Et une limite de lecture tronquerait la courbe
-- par son côté le plus ancien, sans que rien à l'écran ne le dise.
--
-- Le compte se fait donc là où sont les lignes. Ce qui traverse le réseau est
-- ce qu'on dessine : un projet, une semaine, un nombre.
--
-- ## `security invoker` : la fonction ne donne aucun droit
--
-- Elle s'exécute avec les droits de qui l'appelle, et les politiques des trois
-- tables s'appliquent exactement comme sur une lecture directe. Une fonction
-- `security definer` aurait compté les projets qu'on n'a pas le droit de voir —
-- et rendu leur existence par la bande, puisqu'une courbe est déjà une
-- information.
--
-- ## Ce qu'elle compte
--
-- Trois façons pour quelque chose d'entrer dans un projet : un compte rendu
-- versé, une proposition ouverte, un commentaire écrit. Aucune pondération : un
-- poids qu'on ne saurait pas défendre est un poids qu'on retouche un jour au
-- hasard.
--
-- Ce n'est **pas** le classement de l'accueil, qui ne compte que mes traces à
-- moi et répond à « qu'ai-je dans les mains ? ». Ici la question est « ce
-- chantier vit-il ? », et elle regarde toute l'équipe.
--
-- Ce qui est supprimé ne compte pas : un document effacé n'a pas fait vivre le
-- projet, il a fait une manœuvre.
--
-- Additive : aucune table, aucune colonne, aucune politique n'est touchée.

create or replace function public.activite_des_projets(p_semaines integer default 52)
returns table (
  project_id uuid,
  semaine date,
  combien bigint
)
language sql
security invoker
stable
as $$
  with fenetre as (
    -- Le lundi de la première semaine montrée. Bornée : une fenêtre demandée à
    -- dix mille semaines ferait un balayage complet des trois tables.
    select (date_trunc('week', now())
      - make_interval(weeks => greatest(1, least(coalesce(p_semaines, 52), 260)) - 1))::date as depuis
  ),
  traces as (
    select d.project_id, d.created_at
      from public.documents d, fenetre f
      where d.deleted_at is null and d.created_at >= f.depuis

    union all

    select p.project_id, p.created_at
      from public.propositions p, fenetre f
      where p.created_at >= f.depuis

    union all

    select m.project_id, m.created_at
      from public.subject_messages m, fenetre f
      where m.deleted_at is null and m.created_at >= f.depuis
  )
  select
    traces.project_id,
    date_trunc('week', traces.created_at)::date as semaine,
    count(*)::bigint as combien
  from traces
  where traces.project_id is not null
  group by traces.project_id, date_trunc('week', traces.created_at)
$$;

comment on function public.activite_des_projets(integer) is
  'Le nombre de mouvements par projet et par semaine, sur la fenêtre demandée : '
  'documents versés, propositions ouvertes, commentaires écrits. Ce que voit '
  'l''appelant, et rien de plus — la fonction est security invoker.';

grant execute on function public.activite_des_projets(integer) to authenticated;
