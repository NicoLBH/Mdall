-- ════════════════════════════════════════════════════════════════════════════
--  Une seule normalisation — et « œuvre » cesse de devenir « uvre »
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Ce que le corpus entier a montré
--
--  `le_texte_normalise` remplace par une espace tout ce qui n'est pas une
--  lettre a-z, et traduit seize lettres accentuées. La ligature « œ » n'est
--  dans aucune des deux listes : elle devient une espace, et elle coupe le mot
--  en deux.
--
--  Mesuré sur les 9 488 affirmations :
--
--      « manœuvre »      →  « man uvre »   →  terme « uvre »   (83 fois)
--      « gros œuvre »    →  « gros uvre »  →  terme « gros uvre » (65 fois)
--      « maître d'œuvre » →  « maitre d uvre »
--
--  Quarante et un termes distincts, deux cent deux occurrences, tous abîmés de
--  la même façon. « Gros œuvre » est le lot le plus courant d'un chantier
--  français et « manœuvre » un mot de métier : le lexique de la console ne les
--  portait ni l'un ni l'autre. Cinq termes en « œuvre » passent le seuil des
--  deux chantiers dès que la ligature est traduite — dont « gros œuvre » sur
--  trois chantiers et « manœuvre » sur deux.
--
--  Le corpus porte aussi « ᵉ », l'exposant de « 1ᵉʳ », cinq fois. **On ne le
--  traduit pas**, et c'est un choix : « 2ᵉ » rendrait le mot « e », là où il ne
--  rend aujourd'hui rien du tout. Un mot d'une lettre tombe de toute façon sous
--  le seuil des quatre, donc la traduction n'apporterait rien — et une ligne
--  qu'on ne peut pas faire tomber est une ligne qu'on finit par recopier là où
--  elle nuit. « æ » en revanche est traduit : le corpus n'en porte aucun
--  aujourd'hui, mais `translate` ne saura jamais le faire, et le banc l'éprouve
--  directement.
--
--  ## Pourquoi cela ne se réparait pas en un seul endroit
--
--  `translate` fait du caractère à caractère : il ne peut pas rendre deux
--  lettres pour une. Il faut un `replace` avant, et c'est une ligne.
--
--  Mais surtout : **la normalisation était recopiée dans cinq fonctions.**
--  `les_sujets_dun_texte`, `le_terme_de_tete`, `les_synonymes_regroupes` et
--  deux autres portaient chacune leur propre `translate(lower(...))`, écrit à
--  l'identique. Réparer la ligature dans `le_texte_normalise` seul n'aurait
--  touché qu'un chemin sur cinq, et le lexique serait resté abîmé — « une
--  valeur écrite à deux endroits finit par diverger » (règle 4), et ici elle
--  avait déjà divergé puisque les quatre copies ne recevaient pas le correctif.
--
--  Cette migration ramène les deux extractions qui comptent —
--  `les_sujets_dun_texte` et `le_terme_de_tete` — sur `le_texte_normalise`.
--  Elles rendent la même chose qu'avant, à la ligature près, et c'est ce que le
--  banc vérifie.
--
--  Strictement additive : des `create or replace` de même signature. Aucune
--  table, aucune colonne, aucune politique touchée.
-- ════════════════════════════════════════════════════════════════════════════

-- ── La normalisation, et elle seule ────────────────────────────────────────

create or replace function public.le_texte_normalise(bout text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           translate(
             -- **Les ligatures d'abord, et par `replace`** : `translate` est du
             -- caractère à caractère et ne peut pas rendre « oe » pour « œ ».
             -- Sans cela la ligature tombait comme n'importe quel signe, et
             -- coupait le mot : « manœuvre » devenait « man uvre ».
             --
             -- Les exposants (« 1ᵉʳ ») restent des signes : les traduire ferait
             -- du mot « e » là où il n'y a rien, et un mot d'une lettre tombe de
             -- toute façon.
             replace(replace(lower(coalesce(bout, '')),
                     'œ', 'oe'), 'æ', 'ae'),
             'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
           '[^a-z]+', ' ', 'g');
$$;

comment on function public.le_texte_normalise(text) is
  'Un texte ramene a ce qui se compare : minuscules, sans accent, ligatures rendues en deux lettres, sans ponctuation. La seule normalisation — les extractions l''appellent (regle 4).';

-- ── Les sujets d'une phrase, sur la normalisation commune ──────────────────
--
-- Le corps ne change pas d'un caractère : seule la normalisation recopiée est
-- remplacée par l'appel. C'est ce que le banc éprouve — une factorisation qui
-- change un résultat n'est pas une factorisation.

create or replace function public.les_sujets_dun_texte(phrase text)
returns table (sujet text, cle text, mots integer)
language sql
immutable
as $$
  with decoupe as (
    select m.mot,
           -- **Le rang après filtrage**, et c'est toute la règle du couple :
           -- deux mots séparés par un seul mot-outil sont voisins une fois
           -- celui-ci retiré. Sans cela, « plancher en beton » n'en formait
           -- aucun.
           row_number() over (order by m.ord) as rang
      from unnest(
        string_to_array(public.le_texte_normalise(phrase), ' ')
      ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  )
  select mot, public.le_radical(mot), 1 from decoupe
  union all
  select g.mot || ' ' || d.mot,
         -- **Les radicaux rangés**, pour que l'ordre des deux mots ne fasse pas
         -- deux sujets.
         least(public.le_radical(g.mot), public.le_radical(d.mot)) || ' '
           || greatest(public.le_radical(g.mot), public.le_radical(d.mot)),
         2
    from decoupe g
    join decoupe d on d.rang = g.rang + 1;
$$;

comment on function public.les_sujets_dun_texte(text) is
  'Les sujets d''une phrase : les mots retenus, et les couples de mots voisins apres retrait des mots-outils. La seule extraction, sur la seule normalisation (regle 4).';

-- ── Le terme de tête, sur la normalisation commune ─────────────────────────

create or replace function public.le_terme_de_tete(bout text)
returns text
language sql
immutable
as $$
  with mots as (
    select m.mot, m.ord
      from unnest(
             string_to_array(public.le_texte_normalise(bout), ' ')
           ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  ),
  tete as (select mot, ord from mots order by ord limit 1)
  select case
           when not exists (select 1 from tete) then null
           else (select t.mot from tete t)
                || coalesce(
                     (select ' ' || m.mot from mots m
                       where m.ord = (select t.ord from tete t) + 1
                       limit 1),
                     '')
         end;
$$;

comment on function public.le_terme_de_tete(text) is
  'Le terme de tete d''un membre de phrase : le premier mot technique, et son voisin immediat s''il en est un. Null quand il n''y en a aucun. Sur la normalisation commune.';
