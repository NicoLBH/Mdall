-- Une seule extraction de sujets, et la prédiction d'un chantier sur les siens.
--
-- CE QUE LE TOUR PRÉCÉDENT A LAISSÉ : LA MÊME EXTRACTION, TROIS FOIS
--
-- `les_sujets_du_systeme()`, `la_mesure_des_sujets()` et
-- `les_enchainements_des_sujets()` portent chacune sa copie du découpage :
-- minuscules, accents, mots de quatre lettres, mots-outils, rang après
-- filtrage, couples de voisins, radicaux rangés. Trois copies d'une règle qui
-- va changer — la liste des mots-outils est faite pour être corrigée en
-- regardant la console.
--
-- « Une valeur écrite à deux endroits finit par diverger » (règle 4). Trois
-- copies divergeront plus vite, et le jour où l'une avancera sans les autres,
-- la console montrera un vocabulaire et la mesure en comptera un autre, sans
-- que rien ne le dise.
--
-- `les_sujets_dun_texte()` est maintenant **la** règle, et les trois fonctions
-- l'appellent. Elles rendent exactement ce qu'elles rendaient — c'est ce que le
-- banc vérifie.
--
-- ET LE PRÉDICTEUR D'UN CHANTIER PASSE SUR SES SUJETS
--
-- `services/ligne-de-base.js` prédit le **domaine** du prochain constat : huit
-- cases. On a dit pourquoi c'était trop gros pour valoir quelque chose — « après
-- le sol, la structure » est une évidence qu'on ne paie pas. La console prédit
-- désormais sur les sujets ; l'écran d'un chantier, non.
--
-- `les_sujets_de_ce_chantier()` donne à l'écran, par affirmation, les sujets
-- que ce chantier emploie. Le prédicteur et l'instrument de mesure ne changent
-- pas d'un caractère : ce sont les mêmes deux bêtises et la même précision à k,
-- sur une autre liste. C'est précisément ce que l'instrument promettait.
--
-- POURQUOI LE SEUIL EST INTERNE AU CHANTIER, ET CE QUE CELA PROTÈGE
--
-- Le seuil du système est « vu sur au moins deux chantiers ». Le reprendre ici
-- aurait fait sortir, pour un membre du projet, l'information qu'une de ses
-- tournures se retrouve **ailleurs dans le système** — une inférence sur le
-- contenu d'un autre chantier, faible mais réelle, et nous n'en voulons aucune.
--
-- Le seuil est donc **« répété dans ce chantier »**, et il n'est pas une
-- précaution de repli : un sujet vu une seule fois dans un chantier n'a aucune
-- suite à prédire, et l'y laisser n'ajouterait que du bruit au classement.
--
-- LA SEULE FONCTION DE SUJETS QUI N'EST PAS `security definer`
--
-- Les trois autres le sont, parce qu'elles lisent **tous** les chantiers et
-- vérifient la porte elles-mêmes. Celle-ci lit **un** chantier, celui qu'on
-- regarde, et la politique de `project_assertions` dit déjà qui en a le droit.
-- La laisser en `security invoker` — le défaut — fait que la porte est celle
-- qui existe déjà, au lieu d'une seconde écrite à la main qui pourrait un jour
-- ne plus dire la même chose.
--
-- Additive : aucune table, aucune colonne, aucune politique n'est modifiée.

-- ── L'extraction, à un seul endroit ────────────────────────────────────────
--
-- Les sujets d'une phrase : chaque mot retenu, et chaque couple de mots
-- voisins **après** retrait des mots-outils.
--
-- `cle` regroupe, `sujet` s'affiche, `mots` dit la précision. Les trois
-- voyagent ensemble parce qu'ils se déduisent du même découpage : les séparer
-- aurait rendu possible un sujet affiché sous une clé qui n'est pas la sienne.

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
        string_to_array(
          regexp_replace(
            translate(lower(coalesce(phrase, '')),
                      'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
            '[^a-z]+', ' ', 'g'),
          ' ')
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
  'Les sujets d''une phrase : les mots retenus, et les couples de mots voisins après retrait des mots-outils. La seule extraction — les quatre fonctions de sujets l''appellent (règle 4).';

-- ── Les trois fonctions du système, sur l'extraction commune ───────────────
--
-- Elles rendent la même chose qu'avant, au caractère près. C'est ce que le banc
-- vérifie : une factorisation qui change un résultat n'est pas une
-- factorisation.

drop function if exists public.les_sujets_du_systeme(integer);

create or replace function public.les_sujets_du_systeme(au_moins integer default 2)
returns table (
  sujet text,
  mots integer,
  formes bigint,
  affirmations bigint,
  chantiers bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  seuil integer := greatest(2, coalesce(au_moins, 2));
begin
  -- **La porte d'abord.** Sans elle, `security definer` rendrait ces comptes à
  -- n'importe quel compte authentifié.
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with termes as (
    select a.id, a.project_id, s.sujet as terme, s.cle, s.mots as combien_de_mots
      from public.project_assertions a
      cross join lateral public.les_sujets_dun_texte(a.statement) s
  )
  select
    -- **La forme la plus écrite**, pas la clé : on regroupe sans réécrire ce
    -- que les gens ont écrit. « plancher beton » reste « plancher beton », même
    -- si la clé est « beton plancher ».
    mode() within group (order by t.terme),
    max(t.combien_de_mots)::integer,
    count(distinct t.terme)::bigint,
    count(distinct t.id)::bigint,
    count(distinct t.project_id)::bigint
    from termes t
   group by t.cle
  -- Un terme vu sur un seul chantier est son contenu, pas du vocabulaire.
  having count(distinct t.project_id) >= seuil
   order by 4 desc, 1;
end;
$$;

comment on function public.les_sujets_du_systeme(integer) is
  'Les sujets techniques, synonymes de forme regroupés : pluriels, ordre des mots, et mots-outils intercalés. Rend la forme la plus écrite et combien de formes s''y rangent. Un sujet vu sur un seul chantier ne sort pas.';

revoke all on function public.les_sujets_du_systeme(integer) from public;
grant execute on function public.les_sujets_du_systeme(integer) to authenticated;

drop function if exists public.la_mesure_des_sujets(integer);

create or replace function public.la_mesure_des_sujets(au_moins integer default 2)
returns table (
  montres bigint,
  caches bigint,
  formes bigint,
  affirmations bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  seuil integer := greatest(2, coalesce(au_moins, 2));
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with par_cle as (
    select s.cle,
           -- **Pas `chantiers` ni `formes` :** ces noms sont ceux des
           -- paramètres de sortie, et PostgreSQL refuse la requête — « column
           -- reference is ambiguous ». Le banc l'a refusée avant le déploiement.
           count(distinct a.project_id) as combien_de_chantiers,
           count(distinct s.sujet) as combien_de_formes
      from public.project_assertions a
      cross join lateral public.les_sujets_dun_texte(a.statement) s
     group by s.cle
  )
  select (select count(*) from par_cle where combien_de_chantiers >= seuil),
         (select count(*) from par_cle where combien_de_chantiers < seuil),
         -- Combien de formes se sont rangées sous les sujets qu'on montre :
         -- c'est la mesure du regroupement, et elle vaut mieux qu'une promesse.
         -- `sum()` rend un `numeric`, et la signature promet un `bigint` : sans
         -- la conversion, PostgreSQL refuse la fonction entière.
         (select coalesce(sum(combien_de_formes), 0)::bigint
            from par_cle where combien_de_chantiers >= seuil),
         (select count(*) from public.project_assertions);
end;
$$;

comment on function public.la_mesure_des_sujets(integer) is
  'Combien de sujets passent le seuil, combien ne le passent pas, et combien de formes se rangent sous ceux qu''on montre.';

revoke all on function public.la_mesure_des_sujets(integer) from public;
grant execute on function public.la_mesure_des_sujets(integer) to authenticated;

create or replace function public.les_enchainements_des_sujets(au_moins integer default 2)
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
declare
  seuil integer := greatest(2, coalesce(au_moins, 2));
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  with termes as (
    select a.id, a.project_id, a.created_at, s.sujet as terme, s.cle
      from public.project_assertions a
      cross join lateral public.les_sujets_dun_texte(a.statement) s
  ),
  -- La forme montrable de chaque clé, et celles qui passent le seuil.
  retenus as (
    select cle, mode() within group (order by terme) as sujet
      from termes
     group by cle
    having count(distinct project_id) >= seuil
  ),
  -- Une ligne par (affirmation, sujet), dédoublonnée : un sujet répété dans une
  -- même phrase ne compte qu'une fois.
  portees as (
    select distinct t.id, t.project_id, t.created_at, r.sujet
      from termes t
      join retenus r on r.cle = t.cle
  ),
  -- Le rang de chaque affirmation dans son chantier : c'est par lui que « la
  -- suivante » se définit, et `id` départage deux affirmations de la même
  -- seconde.
  rangs as (
    select distinct id, project_id, created_at,
           dense_rank() over (partition by project_id order by created_at, id) as rang
      from portees
  )
  select p.sujet,
         s.sujet,
         count(*)::bigint,
         count(distinct p.project_id)::bigint
    from portees p
    join rangs rp on rp.id = p.id
    join rangs rs on rs.project_id = rp.project_id and rs.rang = rp.rang + 1
    join portees s on s.id = rs.id
   group by p.sujet, s.sujet
   order by 3 desc, 1, 2;
end;
$$;

comment on function public.les_enchainements_des_sujets(integer) is
  'Quels sujets techniques en suivent d''autres, à l''intérieur d''un chantier. Le calcul de les_enchainements_du_systeme(), porté sur les sujets au lieu des huit domaines. Réservée aux administrateurs.';

revoke all on function public.les_enchainements_des_sujets(integer) from public;
grant execute on function public.les_enchainements_des_sujets(integer) to authenticated;

-- ── Les sujets d'un chantier, pour son propre prédicteur ───────────────────
--
-- **`security invoker`, et c'est le fond de l'affaire.** Voir l'en-tête : cette
-- fonction lit un seul chantier, et la politique de `project_assertions` dit
-- déjà qui le peut. Un `security definer` aurait demandé une seconde porte
-- écrite à la main, qui aurait un jour cessé de dire la même chose que la
-- première.
--
-- Le seuil est **interne au chantier** : « répété ici », et non « vu ailleurs ».
-- Rien du contenu d'un autre chantier n'entre dans ce calcul ni n'en sort.

create or replace function public.les_sujets_de_ce_chantier(
  le_chantier uuid,
  au_moins integer default 2
)
returns table (
  affirmation uuid,
  sujet text
)
language sql
stable
as $$
  with termes as (
    select a.id, s.sujet as terme, s.cle
      from public.project_assertions a
      cross join lateral public.les_sujets_dun_texte(a.statement) s
     where a.project_id = le_chantier
  ),
  -- Les clés que ce chantier répète, et leur forme la plus écrite.
  --
  -- **Pas de colonne `mots`**, bien que l'extraction la rende : le prédicteur
  -- compte des sujets, il ne pondère pas selon leur précision, et rien à
  -- l'écran ne la lit. Une colonne que personne ne lit voyage pourtant à chaque
  -- appel — et sur un chantier de cinq cents affirmations, cela fait des
  -- milliers de lignes qui la portent pour rien.
  retenus as (
    select cle,
           mode() within group (order by terme) as sujet
      from termes
     group by cle
    -- **Répété dans ce chantier.** Un sujet vu une seule fois n'a aucune suite
    -- à prédire : le garder n'ajouterait que du bruit au classement.
    having count(distinct id) >= greatest(2, coalesce(au_moins, 2))
  )
  -- `distinct` : un sujet écrit deux fois dans la même phrase est un sujet, pas
  -- deux. Sans cela, une phrase bavarde pèserait deux fois dans les fréquences.
  select distinct t.id, r.sujet
    from termes t
    join retenus r on r.cle = t.cle;
$$;

comment on function public.les_sujets_de_ce_chantier(uuid, integer) is
  'Par affirmation, les sujets que ce chantier répète — de quoi porter son prédicteur sur les sujets au lieu des huit domaines. security invoker : la politique de project_assertions est la porte. Le seuil est interne au chantier, rien d''un autre n''y entre.';

revoke all on function public.les_sujets_de_ce_chantier(uuid, integer) from public;
grant execute on function public.les_sujets_de_ce_chantier(uuid, integer) to authenticated;
