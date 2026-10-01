-- ════════════════════════════════════════════════════════════════════════════
--  « aucun degré exigé » n'est pas une obligation
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## L'idée que la réparation précédente n'a pas attrapée
--
--  Dès que les avis du bureau de contrôle ont retrouvé leur phrase, celle-ci est
--  sortie :
--
--      « Parois séparant les ensembles de celliers ou caves :
--        aucun degré exigé par cet alinéa »
--
--      →  parois séparant  —impose→  alinéa
--
--  Deux choses fausses d'un coup. Le terme de droite est un renvoi de
--  règlement ; et surtout **l'obligation n'existe pas** : la phrase dit
--  qu'aucun degré n'est exigé. L'idée affirme le contraire du texte.
--
--  La règle posée au round précédent refuse un terme que précède immédiatement
--  une négation. Elle ne pouvait pas attraper celle-ci : « aucun » ne précède ni
--  « parois » ni « alinéa » — il précède **le mot de liaison**.
--
--  ## La règle, et sa fenêtre
--
--  Une négation dans les **deux mots** qui précèdent le mot de liaison nie la
--  liaison elle-même : on ne rend pas l'idée.
--
--  Deux mots, et c'est mesuré. Une fenêtre d'un seul n'attrape qu'une ligne sur
--  les dix concernées — « aucun degré exigé » met « degré » entre la négation et
--  « exigé ». Une fenêtre de trois donne exactement le même résultat que deux :
--  à égalité, on prend la plus étroite, parce qu'un refus de trop est une idée
--  vraie qu'on ne verra jamais.
--
--  Sur le corpus entier : **dix lignes, deux idées distinctes**, et les deux
--  disaient le contraire de leur phrase.
--
--  ## Ce qu'on ne fait pas, et c'est aussi mesuré
--
--  **On n'ajoute pas « alinéa » aux mots-outils.** C'était la correction
--  évidente, et elle est inutile : la seule idée qui tirait ce terme est celle
--  que la règle ci-dessus refuse déjà. Mesuré, l'ajout ne change aucun chiffre.
--  Une liste de mots qu'on allonge sans effet est une liste qu'on ne relira plus.
--
--  **On ne retient pas la négation pour en faire une idée négative.** « Aucun
--  degré exigé » est un constat, pas une obligation inversée, et c'est une autre
--  espèce (`docs/un-constat-nest-pas-une-idee.md`). Inventer un lien « obligation
--  niée » rendrait une idée de plus avec une assurance qu'on n'a pas.
--
--  Strictement additive : un `create or replace` de même signature. Aucune table,
--  aucune colonne, aucune politique touchée.
-- ════════════════════════════════════════════════════════════════════════════

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
  -- `mots` ne porte pas `materialized`, et c'est mesuré : cinquante-sept lignes
  -- constantes ne coûtent rien à refaire.
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
           -- trouve pas dans « carrelage », et un mot en fin de phrase se trouve
           -- quand même.
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
  ),
  -- **Les deux mots qui précèdent la liaison.** Une négation là nie la liaison
  -- elle-même : « aucun degré exigé » n'est pas une obligation, et l'idée qui en
  -- sortait affirmait le contraire de sa phrase.
  --
  -- Deux mots : « aucun » ne touche pas « exigé », « degré » est entre les deux.
  -- Trois donne le même résultat, et à égalité la règle la plus étroite est
  -- celle qu'on saura corriger.
  niees as (
    select p.rang
      from premiere p
      cross join lateral (
        select m.mot as avant_le_lien
          from unnest(string_to_array(btrim(left(p.t, p.ou)), ' '))
               with ordinality as m(mot, ord)
         where m.mot <> ''
         order by m.ord desc
         limit 2
      ) deux
     where deux.avant_le_lien = any (public.les_mots_de_negation())
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
    from premiere p
   -- La liaison niée ne rend rien : ni idée, ni demi-idée. Elle reste comptée
   -- comme une affirmation qui porte un mot de liaison, parce qu'elle en porte
   -- un — taire cela ferait croire que le corpus en porte moins (règle 5).
   where p.rang not in (select rang from niees);
$$;

comment on function public.la_coupe_des_textes(text[]) is
  'La coupe d''un ensemble de textes par leur premier mot de liaison, en une passe. Seule definition du decoupage. Une negation dans les deux mots qui precedent la liaison la nie : rien n''est rendu.';
