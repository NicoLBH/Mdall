-- Ce que la prédiction fait, montré en clair : **quels domaines en suivent
-- d'autres**, combien de fois, et avec quelle probabilité.
--
-- LA QUESTION POSÉE
--
-- « Comment indiquer, dans la console, si des domaines ont tendance à se
-- suivre ? avec quelle occurrence et quelle probabilité ? enfin, ce que fait la
-- prédiction. »
--
-- C'est littéralement le mécanisme du prédicteur. `ceQuiSuitHabituellement`
-- (`apps/web/js/services/ligne-de-base.js`) forme les couples « après ceci, il
-- est venu cela » à l'intérieur d'un chantier, les compte, et propose les plus
-- fréquents. Rien de plus. Cette fonction fait le même calcul, sur
-- **l'ensemble des chantiers** — ce qu'aucun écran de projet ne peut montrer,
-- puisqu'un chantier ne voit que lui-même.
--
-- CE QUE CELA PERMET DE DÉCIDER
--
-- Un enchaînement qui revient sur beaucoup de chantiers est une régularité du
-- bâtiment, et le prédicteur a une chance. Un enchaînement qui ne se voit que
-- sur un chantier est une habitude de ce chantier-là, et l'apprendre ne
-- servirait qu'à lui. Le nombre de chantiers est donc aussi important que le
-- nombre de couples, et les deux sont rendus.
--
-- POURQUOI LES COUPLES SE FORMENT PAR CHANTIER
--
-- `partition by project_id`. Une suite se lit **dans** un chantier, pas en
-- travers de mille (`docs/nourrir-mdall.md`, § 8 ter) : mêler deux chantiers
-- formerait un couple entre la dernière affirmation de l'un et la première de
-- l'autre, c'est-à-dire un enchaînement qui n'a eu lieu nulle part.
--
-- POURQUOI UN DOMAINE PEUT SE SUIVRE LUI-MÊME
--
-- Parce que c'est ce qui arrive, et parce que c'est une information : un
-- prédicteur dont le meilleur coup est « ce qui vient de venir reviendra » ne
-- prédit pas grand-chose, et il faut pouvoir s'en apercevoir. Les écarter
-- montrerait une machine plus fine qu'elle n'est (règle 12).
--
-- CE QU'ELLE NE REND PAS
--
-- Aucun texte d'affirmation, aucun identifiant de projet, aucun auteur, aucune
-- date. Deux mots d'un vocabulaire fermé et deux nombres — par sa signature.
--
-- Additive : aucune table, aucune colonne, aucune politique n'est modifiée.

create or replace function public.les_enchainements_du_systeme()
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
begin
  -- **La porte d'abord.** Sans elle, `security definer` rendrait ces comptes à
  -- n'importe quel compte authentifié.
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with suite as (
    select a.id,
           a.project_id,
           nullif(trim(a.domain), '') as domaine,
           a.created_at
      from public.project_assertions a
     where nullif(trim(a.domain), '') is not null
  ),
  couples as (
    select s.project_id,
           s.domaine as avant,
           -- `id` départage deux affirmations écrites à la même seconde : sans
           -- lui l'ordre serait celui que la base rend ce jour-là, et le même
           -- calcul donnerait deux résultats.
           lead(s.domaine) over (partition by s.project_id order by s.created_at, s.id) as apres
      from suite s
  )
  select c.avant,
         c.apres,
         count(*)::bigint,
         count(distinct c.project_id)::bigint
    from couples c
   where c.apres is not null
   group by c.avant, c.apres
   order by 3 desc, 1, 2;
end;
$$;

comment on function public.les_enchainements_du_systeme() is
  'Quels domaines en suivent d''autres, à l''intérieur d''un chantier : combien de fois, et sur combien de chantiers. Deux mots d''un vocabulaire fermé et deux nombres — aucun texte, aucun identifiant de projet, aucun auteur. Réservée aux administrateurs.';

revoke all on function public.les_enchainements_du_systeme() from public;
grant execute on function public.les_enchainements_du_systeme() to authenticated;
