-- ════════════════════════════════════════════════════════════════════════════
--  Le corpus en clair — pour la mise au point du découpage, et pour elle seule
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Ce qu'on ne pouvait pas faire, et pourquoi c'est bloquant
--
--  La console annonce que 68 affirmations sur 9 488 énoncent un lien, et
--  n'emporte aucune idée : la règle veut qu'une idée vue sur un seul chantier
--  reste le contenu de ce chantier-là, et aucune n'est encore partagée par
--  deux. La règle est juste et elle ne bouge pas.
--
--  Mais elle a une conséquence qu'on n'avait pas vue : **on ne peut pas
--  améliorer le découpage sans voir ce qu'il n'a pas su lire.** Les 9 420
--  affirmations sans mot de liaison sont la matière du travail, et elles sont
--  précisément celles qui ne sortent jamais. On corrige à l'aveugle.
--
--  ## Ce que cette fonction ouvre, et ce qu'elle n'ouvre pas
--
--  Elle rend le **texte** des affirmations. C'est du contenu de chantier, et il
--  n'y a pas de demi-mesure possible : c'est le texte qu'il faut lire pour
--  savoir pourquoi « nous indiquer cette semaine les cotes » ne porte aucune
--  idée.
--
--  Elle ne rend **pas** l'identifiant du chantier, ni celui de l'affirmation,
--  ni rien qui mène à un projet. Un numéro d'ordre dit si deux affirmations
--  viennent du même chantier — ce qui sert à voir si un chantier écrit
--  autrement — sans dire **lequel**. Ce n'est pas de la prudence décorative :
--  c'est la différence entre un corpus de mise au point et un export de base.
--
--  ## Qui peut l'appeler
--
--  Les administrateurs, et personne d'autre — comme les quatre lectures de la
--  console. L'écran y ajoute un interrupteur qui se referme au bout de dix
--  secondes ; cet interrupteur empêche un clic distrait, il n'empêche rien
--  d'autre, et il ne faut pas le prendre pour une porte. **La porte est ici.**
--
--  Strictement additive : une fonction neuve, aucune table, aucune colonne,
--  aucune politique touchée.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.le_corpus_en_clair(au_plus integer default 20000)
returns table (
  chantier integer,
  dit text,
  avant text,
  lien text,
  apres text,
  mot text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  combien integer := least(greatest(1, coalesce(au_plus, 20000)), 50000);
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
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
  )
  select n.rang_du_chantier, n.statement, co.avant, co.lien, co.apres, co.mot
    from numerotes n
    left join coupees co on co.id = n.id
   order by n.rang_du_chantier, n.statement
   limit combien;
end;
$$;

comment on function public.le_corpus_en_clair(integer) is
  'Le texte des affirmations, et ce que la coupe en a tire. Contenu de chantier : reserve aux administrateurs, pour la mise au point du decoupage.';

revoke all on function public.le_corpus_en_clair(integer) from public;
grant execute on function public.le_corpus_en_clair(integer) to authenticated;
