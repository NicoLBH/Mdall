-- ════════════════════════════════════════════════════════════════════════════
--  La répétition du corpus — neuf mille lignes, combien de phrases ?
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Ce qu'on a vu en lisant le corpus pour de vrai
--
--  Sur mille affirmations lues, **quatre-vingt-quatorze textes distincts**. Le
--  même texte revenait jusqu'à trente-quatre fois. Dix fois en moyenne.
--
--  Cela change tout ce que la console annonce. « 68 affirmations sur 9 488
--  énoncent un lien » se lit comme « 68 phrases sur 9 488 » ; si le corpus ne
--  porte que quelques centaines de phrases distinctes, le dénominateur est faux
--  et le chiffre ne veut rien dire. Une proportion dont le dénominateur compte
--  des copies n'est pas une proportion (règle 12).
--
--  ## D'où elles viennent, et c'est la question qui compte
--
--  Trois causes différentes, et elles n'appellent pas le même travail :
--
--  1. **L'histoire.** Une affirmation remplacée reste en base — c'est voulu,
--     « une exécution qui a eu lieu ne devient pas fausse » (règle 6). Mais une
--     lecture du corpus qui compte l'histoire comme le présent compte le même
--     sujet autant de fois qu'il a été tranché. `remplacees` le dit.
--
--  2. **Le ré-versement.** La contrainte d'unicité porte sur
--     `(proposition_id, kind, subject_key)` : elle empêche une proposition de
--     verser deux fois le même sujet, elle n'empêche pas **dix propositions** de
--     verser le même. `sujets_reverses` compte les sujets versés par plus d'une.
--
--  3. **L'intitulé partagé.** « Avis — Amenée d'air » n'est pas une phrase,
--     c'est une étiquette, et deux sujets différents peuvent porter la même.
--     `textes_sur_plusieurs_sujets` compte ces textes-là.
--
--  Les trois se mesurent séparément, parce que les additionner rendrait un
--  nombre qu'on ne saurait pas expliquer.
--
--  ## Ce qu'elle ne rend pas
--
--  **Aucun texte.** On veut savoir combien de fois une phrase se répète, pas
--  laquelle : la console ne lit pas le contenu des chantiers. Le texte se lit
--  par `le_corpus_en_clair()`, derrière sa porte et son interrupteur, et c'est
--  le seul endroit.
--
--  Strictement additive : une fonction neuve, aucune table, aucune colonne,
--  aucune politique touchée.
-- ════════════════════════════════════════════════════════════════════════════

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
  -- **La porte d'abord**, comme les cinq autres lectures de la console.
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with normalisees as materialized (
    -- Le texte normalisé, et non le texte brut : « Amenée d'air » et
    -- « Amenee d'air » sont la même phrase recopiée, et les compter pour deux
    -- ferait un corpus plus riche qu'il n'est.
    --
    -- **Et `trim` par-dessus**, ce qui n'est pas une précaution de style :
    -- `le_texte_normalise` remplace la ponctuation par une espace, donc
    -- « Avis — Amenée d'air. » finit par une espace et « Avis — Amenee d'air »
    -- non. Sans le `trim`, un point final suffisait à faire deux phrases d'une
    -- seule, et la mesure gonflait le nombre de phrases distinctes — c'est-à-dire
    -- qu'elle se trompait exactement dans le sens où elle doit être juste.
    select a.id,
           a.project_id,
           a.kind,
           a.subject_key,
           a.proposition_id,
           a.superseded_by,
           trim(public.le_texte_normalise(a.statement)) as dit
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
         -- `coalesce` : sur un corpus vide, `max` rend `null`, et l'écran
         -- écrirait « null copies ».
         (select coalesce(max(combien), 0) from par_texte),
         (select count(*) from normalisees where superseded_by is not null),
         (select count(*) from normalisees where superseded_by is null),
         (select count(distinct dit) from normalisees where superseded_by is null),
         (select count(*) from par_sujet),
         (select count(*) from par_sujet where propositions > 1),
         (select count(*) from textes_etales);
end;
$$;

comment on function public.la_repetition_du_corpus() is
  'Combien de phrases distinctes dans les affirmations, et d''ou viennent les copies : l''histoire, le re-versement, l''intitule partage. Aucun texte rendu.';

revoke all on function public.la_repetition_du_corpus() from public;
grant execute on function public.la_repetition_du_corpus() to authenticated;
