-- ════════════════════════════════════════════════════════════════════════════
--  « non conforme » ne devient pas « conforme »
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## L'idée qui dit le contraire du texte
--
--  Sur le corpus entier, quarante et une lignes rendaient une idée. L'une
--  venait de « Escalier prévu et escalier exigé : non conforme », et rendait :
--
--      escalier prévu  —obligation→  conforme
--
--  Le découpage a bien travaillé : « exigé » est une obligation, elle est entre
--  les deux membres. Mais `le_terme_de_tete` prend le premier mot technique du
--  membre de droite, et c'est « conforme ». Le « non » qui le précède fait
--  quatre lettres de moins que le seuil : il tombe, et avec lui le sens de la
--  phrase.
--
--  **L'idée rendue affirme l'inverse de ce qui est écrit.** C'est pire qu'une
--  idée manquante : celle-ci, on la cherche ; celle-là, on la croit. Et elle
--  arrive avec le même aplomb que les vraies — rien à l'écran ne la distingue.
--
--  Deux autres suivaient le même chemin : « afin de ne plus perdre de temps »
--  rendait « perdre », et « afin de ne pas fragiliser » rendait « fragiliser ».
--  Trois sur quarante et une, et les trois disaient le contraire.
--
--  ## La règle, et pourquoi elle est étroite
--
--  **Le mot qui précède immédiatement le terme.** Pas une fenêtre de trois
--  mots : c'est mesuré, et une fenêtre de trois refusait deux idées justes
--  (« afin de libérer », « afin de drainer ») parce que « Lot n°1 » laisse un
--  « n » derrière lui. Un refus de trop est une idée vraie qu'on ne verra
--  jamais, et cela ne se rattrape pas en regardant l'écran.
--
--  Une fenêtre d'un mot et une fenêtre de deux donnent exactement les mêmes
--  trois refus sur ce corpus. On prend la plus étroite : à égalité de résultat,
--  la règle la plus simple est celle qu'on saura corriger.
--
--  ## Ce qu'on ne fait pas
--
--  **On ne retient pas la négation pour la porter dans l'idée.** « Escalier
--  exigé : non conforme » n'énonce pas une obligation négative : c'est un
--  constat, et c'est une autre espèce (voir `docs/un-constat-nest-pas-une-idee.md`).
--  Inventer un lien « obligation niée » rendrait une idée de plus avec une
--  assurance qu'on n'a pas.
--
--  On refuse, et on le compte. Ne pas savoir n'autorise pas à prétendre qu'il
--  n'y a rien (règle 5) — mais prétendre le contraire est plus grave encore.
--
--  Strictement additive : une fonction neuve, un `create or replace` de même
--  signature. Aucune table, aucune colonne, aucune politique touchée.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Les mots qui renversent ce qui suit ────────────────────────────────────
--
-- Écrits dans une fonction, comme les mots-outils et les mots de liaison : la
-- liste se corrigera en regardant ce que la console montre.
--
-- « plus » y est, et il est le seul à double sens : « ne plus perdre » nie,
-- « plus de trois mètres » compare. Les deux se distinguent dans le texte —
-- « plus de » laisse « de » entre lui et le terme, et la règle ne regarde que
-- le mot immédiatement précédent. Mesuré sur le corpus : aucun refus abusif.
create or replace function public.les_mots_de_negation()
returns text[]
language sql
immutable
as $$
  select array[
    'non','ne','pas','plus','aucun','aucune','aucuns','aucunes',
    'sans','jamais','ni','nul','nulle','nullement'
  ];
$$;

comment on function public.les_mots_de_negation() is
  'Les mots qui renversent le sens de ce qui les suit. Un terme precede de l''un d''eux dit le contraire de ce qu''il porte : on ne rend pas l''idee.';

-- ── Le terme de tête, qui refuse d'être nié ────────────────────────────────

create or replace function public.le_terme_de_tete(bout text)
returns text
language sql
immutable
as $$
  with tous as (
    -- **Tous les mots, y compris ceux qu'on écarte.** C'est la nouveauté : la
    -- négation est écartée par le seuil des quatre lettres (« non », « ne »,
    -- « pas »), donc on ne peut pas la chercher dans la liste filtrée. Il faut
    -- le texte tel qu'il est.
    select m.mot, m.ord
      from unnest(
             string_to_array(public.le_texte_normalise(bout), ' ')
           ) with ordinality as m(mot, ord)
     where m.mot <> ''
  ),
  mots as (
    select t.mot, t.ord
      from tous t
     where length(t.mot) >= 4
       and not (t.mot = any (public.les_mots_outils()))
       -- **Une négation n'est jamais un terme.** « aucune » fait six lettres et
       -- n'est pas un mot-outil : elle devenait la tête du terme, et
       -- « Aucune réservation ne sera faite » rendait « aucune reservation ».
       -- L'écarter ici fait de « reservation » la tête, et le mot qui la précède
       -- est alors la négation — qui la refuse, comme il faut.
       and not (t.mot = any (public.les_mots_de_negation()))
  ),
  tete as (select mot, ord from mots order by ord limit 1),
  -- Le mot qui précède immédiatement le terme, dans le texte entier.
  juste_avant as (
    select t.mot
      from tous t
     where t.ord < (select tt.ord from tete tt)
     order by t.ord desc
     limit 1
  )
  select case
           when not exists (select 1 from tete) then null
           -- **La négation l'emporte.** Rendre « conforme » pour
           -- « non conforme » affirme l'inverse du texte, avec l'aplomb d'une
           -- idée vraie.
           when exists (select 1 from juste_avant j
                         where j.mot = any (public.les_mots_de_negation()))
             then null
           else (select t.mot from tete t)
                || coalesce(
                     (select ' ' || m.mot from mots m
                       where m.ord = (select t.ord from tete t) + 1
                       limit 1),
                     '')
         end;
$$;

comment on function public.le_terme_de_tete(text) is
  'Le terme de tete d''un membre de phrase : le premier mot technique, et son voisin immediat. Null quand il n''y en a aucun, ou quand une negation le precede — « non conforme » ne devient pas « conforme ».';
