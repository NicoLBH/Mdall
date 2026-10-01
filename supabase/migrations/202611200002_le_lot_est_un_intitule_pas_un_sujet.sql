-- ════════════════════════════════════════════════════════════════════════════
--  Le lot est un intitulé, pas le sujet de l'idée
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Ce qui se passait
--
--  Presque toute affirmation de compte rendu commence par son lot :
--
--      « 01 Terrassements-VRD — Mettre dans votre planning … pour permettre … »
--      « Lot n° 1 : Démolition / Gros Œuvre — Réaliser un carottage … afin de … »
--
--  `le_terme_de_tete` prend le **premier** mot technique du membre de phrase. Ce
--  premier mot est donc le nom du lot, et cinq idées sur vingt-six disaient
--  « démolition gros —vise→ … » : le lot pour sujet, et la vraie chose dont on
--  parle nulle part.
--
--  ## Ce qu'on avait mesuré, et pourquoi on n'a pas simplement retiré l'intitulé
--
--  Le retirer **partout** faisait tomber les termes partagés par deux chantiers
--  de **627 à 597**. Les intitulés de lot sont du vrai vocabulaire de métier,
--  partagé : « gros œuvre » sur trois chantiers, « chauffage ventilation » sur
--  trois, « électricité » sur quatre. Les jeter appauvrit le lexique.
--
--  La réponse n'est donc pas de choisir entre les deux, c'est de **séparer les
--  deux lectures** :
--
--  - le **lexique** lit l'affirmation entière, intitulé compris. Rien n'est
--    perdu : les 627 termes partagés restent 627.
--  - la **coupe** ne lit que la phrase. Le lot cesse d'être un sujet d'idée.
--
--  C'est ce que « le lot est une dimension » veut dire, concrètement.
--
--  ## La règle de l'intitulé, étroite et mesurée
--
--  Un intitulé, c'est ce qui précède le premier tiret cadratin **quand
--  l'affirmation commence par un marqueur que le versement a écrit lui-même** :
--  un numéro de lot — des chiffres, ou « Lot » — ou le mot « Avis ».
--
--  Les deux marqueurs se tiennent pour la même raison. « Avis 146 — Hauteur des
--  marches ≤ 16 cm » est bâtie comme « 01 Terrassements-VRD — … » : une étiquette,
--  un tiret, le contenu. Et sans ce second marqueur, « avis » devenait lui-même
--  un terme d'idée — il fait quatre lettres et n'est pas un mot-outil —, ce qui
--  donnait « avis —permet→ protéger » sur des milliers de lignes.
--
--  Mesuré : 5 475 affirmations (57,7 %), 217 intitulés distincts. Six cent
--  soixante-dix-sept pour les lots seuls, le reste pour les avis.
--
--  **La règle large a été essayée et rejetée, par la mesure.** « Tout ce qui
--  précède le premier tiret, au plus huit mots » attrape 5 635 affirmations
--  (59,4 %) — mais parmi elles « Avis — Amenée d'air » (4 223 fois) et
--  « Revêtements de la cage d'escalier : M2 — … ». Là, ce qui précède le tiret
--  **est le sujet** de l'avis, et le retirer jetterait précisément ce qu'on
--  cherche. Une règle qui attrape huit fois plus de lignes n'est pas huit fois
--  meilleure.
--
--  Strictement additive : une fonction neuve, et un `create or replace` de même
--  signature pour la coupe du corpus. Aucune table, aucune colonne, aucune
--  politique touchée.
-- ════════════════════════════════════════════════════════════════════════════

-- ── La phrase d'une affirmation, sans son intitulé de lot ───────────────────

create or replace function public.la_phrase_dune_affirmation(dit text)
returns text
language sql
immutable
as $$
  select case
           -- Un numéro de lot en tête : « 01 », « 12 », « Lot 13 »,
           -- « Lot n° 1 : ». Sans ce garde, la règle mangerait le sujet des avis.
           -- **Deux marqueurs, et deux seulement** : un numéro de lot, ou le mot
           -- « Avis ». Les deux sont des étiquettes que le versement a écrites
           -- lui-même, jamais de la prose. Sans ce garde, la règle mangerait le
           -- sujet des affirmations — « Revêtements de la cage d'escalier : M2 —
           -- avis favorable » perdrait précisément ce dont elle parle.
           when coalesce(dit, '') !~* '^\s*(avis\M|lot\s*n?[°o]?\s*[0-9]+|lot\s+[0-9]+|[0-9]{1,2}\M)'
             then coalesce(dit, '')
           -- Le premier tiret cadratin, cherché dans les deux cents premiers
           -- caractères : au-delà, ce n'est plus un intitulé, c'est une incise.
           -- `+ 3` : « ␣—␣ » fait trois **caractères**, et `substr` compte en
           -- caractères, non en octets. Avec `+ 5` la phrase perdait ses deux
           -- premières lettres, et le banc l'a dit avant le déploiement.
           when position(' — ' in left(coalesce(dit, ''), 200)) > 0
             then substr(dit, position(' — ' in left(dit, 200)) + 3)
           when position(' – ' in left(coalesce(dit, ''), 200)) > 0
             then substr(dit, position(' – ' in left(dit, 200)) + 3)
           -- Un numéro de lot sans tiret : il n'y a pas d'intitulé à détacher.
           else coalesce(dit, '')
         end;
$$;

comment on function public.la_phrase_dune_affirmation(text) is
  'Ce qu''une affirmation dit, sans l''intitule de lot qui la precede. Pour la coupe seule : le lexique lit l''affirmation entiere, intitule compris, parce que les noms de lots sont du vocabulaire de metier partage.';

-- ── L'intitulé lui-même, pour qui voudra le lire ───────────────────────────
--
-- Rendu à part plutôt que jeté : c'est la dimension qu'on vient de dégager, et
-- une dimension qu'on calcule sans jamais la rendre n'existe pas. Rien ne
-- l'appelle encore côté écran — c'est assumé et dit ici, parce que la coupe et
-- le lexique doivent s'appuyer sur la même définition du partage (règle 4), et
-- qu'une seconde écrite plus tard aurait divergé.
create or replace function public.lintitule_dune_affirmation(dit text)
returns text
language sql
immutable
as $$
  select nullif(btrim(left(coalesce(dit, ''),
           greatest(length(coalesce(dit, '')) - length(public.la_phrase_dune_affirmation(dit)) - 3, 0))),
         '');
$$;

comment on function public.lintitule_dune_affirmation(text) is
  'L''intitule de lot d''une affirmation, ou null. Le pendant de la_phrase_dune_affirmation : ce qui est detache d''un cote est rendu de l''autre.';

-- ── La coupe du corpus lit la phrase, pas l'intitulé ───────────────────────

create or replace function public.la_coupe_du_corpus()
returns table (
  id uuid,
  project_id uuid,
  avant text,
  lien text,
  apres text,
  mot text
)
language sql
stable
security definer
set search_path = public
as $$
  with corpus as materialized (
    select array_agg(public.la_phrase_dune_affirmation(
                       public.le_dit_dune_affirmation(
                         a.kind, a.subject_key, a.statement, a.payload))
                     order by a.id) as textes,
           array_agg(a.id order by a.id) as ids,
           array_agg(a.project_id order by a.id) as projets
      from public.project_assertions a
  )
  select co.ids[c.rang], co.projets[c.rang], c.avant, c.lien, c.apres, c.mot
    from corpus co
    cross join lateral public.la_coupe_des_textes(co.textes) c;
$$;
