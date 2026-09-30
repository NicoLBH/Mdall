-- Les sujets techniques, tels que les chantiers les nomment vraiment.
--
-- LE CONSTAT, CHIFFRÉ
--
-- Sur une base de trois chantiers et 7 857 affirmations, la console montre :
--
--     17 % des affirmations portent un domaine (1 329 sur 7 857)
--     Incendie · Structure · Sol
--
-- Trois mots pour sept mille affirmations. Et les 83 % restants ne sont pas
-- « mal classés » : ils ne rentrent dans aucune des huit cases, parce que les
-- huit cases ne décrivent pas un chantier — elles décrivent un sommaire.
--
-- POURQUOI C'EST UN PROBLÈME DE PRODUIT, PAS DE RÉGLAGE
--
-- « Après une question de sol, 80 % de chances d'une question de structure »
-- est une évidence de métier. Personne ne paie pour l'apprendre. Ce qui a de la
-- valeur est d'un cran en dessous : **quoi** en sol — niveau de nappe, nature
-- du terrain, contrainte admissible ? **quoi** en structure — plancher béton,
-- charpente bois, poteaux métalliques ?
--
-- Huit domaines ne peuvent pas le dire. Il en faut des milliers, et on ne peut
-- pas les écrire à la main : il faut les **trouver dans ce que les chantiers
-- écrivent**, et les voir grossir.
--
-- CE QUE CETTE FONCTION FAIT, ET CE QU'ELLE N'EST PAS
--
-- Elle extrait de chaque affirmation ses **termes** — les mots et les couples
-- de mots qui restent une fois retirés les mots-outils, les nombres et les mots
-- trop courts —, puis elle les compte sur l'ensemble des chantiers.
--
-- Ce n'est **pas** de l'apprentissage. C'est du comptage de termes, et c'est
-- volontaire : cela ne dépend d'aucun modèle, d'aucun service, d'aucune clé, et
-- cela se vérifie ligne à ligne. C'est la couche qui manquait, et c'est aussi
-- celle sans laquelle un modèle n'aurait rien sur quoi s'entraîner ni rien à
-- quoi se comparer.
--
-- LE GARDE-FOU QUI REND CECI MONTRABLE DANS LA CONSOLE
--
-- Un mot vu sur **un seul** chantier n'est pas du vocabulaire, c'est du contenu
-- de ce chantier-là. Il ne sort pas. Seuls sortent les termes vus sur au moins
-- deux chantiers différents — et le nombre de ceux qu'on a écartés est rendu,
-- parce que taire ce qu'on cache reviendrait à montrer un vocabulaire plus
-- pauvre qu'il n'est (règle 5).
--
-- Additive : aucune table, aucune colonne, aucune politique n'est modifiée.

-- ── Les mots-outils ────────────────────────────────────────────────────────
--
-- Écrits une fois, dans une fonction, plutôt que recopiés dans la requête :
-- c'est la liste qu'on relira et qu'on corrigera, et elle doit être trouvable.
create or replace function public.les_mots_outils()
returns text[]
language sql
immutable
as $$
  select array[
    'avec','dans','pour','par','sur','sous','entre','vers','chez','depuis',
    'cette','cet','ces','les','des','une','aux','leur','leurs','notre','nos',
    'votre','vos','mon','ton','son','ses','que','qui','quoi','dont','donc',
    'mais','car','ainsi','alors','comme','plus','moins','tres','tout','tous',
    'toute','toutes','autre','autres','meme','memes','etre','avoir','fait',
    'faire','doit','doivent','peut','peuvent','sera','seront','etait','etaient',
    'est','sont','ont','pas','non','oui','selon','afin','lors','apres','avant',
    'projet','chantier','dossier','document','page','partie','point','cas',
    'suite','objet','reunion','compte','rendu','courrier','mail','message',
    'monsieur','madame','bonjour','cordialement','merci','demande','reponse',
    'information','informations','element','elements','ensemble','niveau',
    'type','nature','etat','date','jour','semaine','mois','annee'
  ];
$$;

comment on function public.les_mots_outils() is
  'Les mots qui ne désignent rien de technique. Écrits une seule fois : c''est la liste qu''on corrigera en regardant ce que la console montre.';

-- ── Les sujets ─────────────────────────────────────────────────────────────

create or replace function public.les_sujets_du_systeme(au_moins integer default 2)
returns table (
  sujet text,
  mots integer,
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
  with decoupe as (
    select a.id,
           a.project_id,
           m.mot,
           m.ord
      from public.project_assertions a
      cross join lateral unnest(
        string_to_array(
          regexp_replace(
            -- Les accents tombent : « bétons » et « betons » sont le même mot,
            -- et `unaccent` demanderait une extension qu'on ne peut pas
            -- supposer installée.
            translate(lower(coalesce(a.statement, '')),
                      'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
            '[^a-z]+', ' ', 'g'),
          ' ')
      ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  ),
  -- Un mot seul, et deux mots qui se suivent. Le couple porte l'essentiel du
  -- sens technique : « plancher » et « beton » disent bien moins que
  -- « plancher beton ».
  termes as (
    select id, project_id, mot as terme, 1 as combien_de_mots from decoupe
    union all
    select g.id, g.project_id, g.mot || ' ' || d.mot, 2
      from decoupe g
      join decoupe d
        on d.id = g.id
       and d.ord = g.ord + 1
  )
  select t.terme,
         max(t.combien_de_mots)::integer,
         count(distinct t.id)::bigint,
         count(distinct t.project_id)::bigint
    from termes t
   group by t.terme
  -- **Le garde-fou.** Un terme vu sur un seul chantier est son contenu, pas du
  -- vocabulaire. Il ne sort pas.
  having count(distinct t.project_id) >= seuil
   order by 3 desc, 1;
end;
$$;

comment on function public.les_sujets_du_systeme(integer) is
  'Les termes techniques que les chantiers emploient, comptés sur l''ensemble. Un terme vu sur un seul chantier ne sort pas : c''est du contenu, pas du vocabulaire. Réservée aux administrateurs.';

revoke all on function public.les_sujets_du_systeme(integer) from public;
grant execute on function public.les_sujets_du_systeme(integer) to authenticated;

-- ── Combien on en a écartés ────────────────────────────────────────────────
--
-- Taire ce qu'on cache montrerait un vocabulaire plus pauvre qu'il n'est
-- (règle 5). Cette fonction rend deux nombres : combien de termes passent le
-- seuil, et combien ne le passent pas.

create or replace function public.la_mesure_des_sujets(au_moins integer default 2)
returns table (
  montres bigint,
  caches bigint,
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
  with decoupe as (
    select a.id, a.project_id, m.mot, m.ord
      from public.project_assertions a
      cross join lateral unnest(
        string_to_array(
          regexp_replace(
            translate(lower(coalesce(a.statement, '')),
                      'àâäéèêëïîôöùûüçñ', 'aaaeeeeiioouuucn'),
            '[^a-z]+', ' ', 'g'),
          ' ')
      ) with ordinality as m(mot, ord)
     where length(m.mot) >= 4
       and not (m.mot = any (public.les_mots_outils()))
  ),
  termes as (
    select id, project_id, mot as terme from decoupe
    union all
    select g.id, g.project_id, g.mot || ' ' || d.mot
      from decoupe g
      join decoupe d on d.id = g.id and d.ord = g.ord + 1
  ),
  par_terme as (
    select terme, count(distinct project_id) as chantiers from termes group by terme
  )
  select (select count(*) from par_terme where chantiers >= seuil),
         (select count(*) from par_terme where chantiers < seuil),
         (select count(*) from public.project_assertions);
end;
$$;

comment on function public.la_mesure_des_sujets(integer) is
  'Combien de termes passent le seuil de chantiers, et combien ne le passent pas. Le second nombre dit ce que la console ne montre pas.';

revoke all on function public.la_mesure_des_sujets(integer) from public;
grant execute on function public.la_mesure_des_sujets(integer) to authenticated;
