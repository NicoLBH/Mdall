-- Les mesures de justesse : un bilan par passage, et rien d'autre dedans.
--
-- LA QUESTION POSÉE
--
--   « Propose-moi un endroit pour lire et vérifier les tests […] en évitant au
--     maximum de voir les tests à plusieurs endroits. »
--
-- Quatre outils mesurent la façon dont Mdall lit les documents : la batterie de
-- perturbations, la dérive des analyses gelées, le jeu de référence, et les
-- invariants que les deux premiers posent au passage. Les quatre vivaient dans
-- quatre terminaux, et leur résultat mourait avec la fenêtre.
--
-- Cette table est l'unique endroit où leur bilan se dépose. L'écran de la
-- console la lit, et c'est tout ce qu'il lit : deux sources pour un même chiffre
-- finissent par ne plus dire la même chose, et c'est celle qu'on ne regarde pas
-- qui a raison le jour où l'on cherche (règle 4).
--
-- CE QU'UNE LIGNE PORTE, ET CE QU'ELLE NE PORTERA JAMAIS
--
-- Des comptes, des taux, une date et le procédé qui a servi. **Jamais un
-- contenu de chantier** : ni citation, ni avis, ni nom de document, ni
-- identifiant de projet.
--
-- Ce n'est pas une prudence de façade. « RICT-03 a manqué l'avis A-23 » est la
-- phrase la plus utile que ces outils produisent — et c'est un contenu de
-- chantier. La console ne lit pas les contenus ; elle n'a donc pas à le savoir.
-- Celui qui veut le détail relance l'outil, et le chantier lui appartient.
--
-- La contrainte `bilan_sans_contenu` tient cette promesse par la **structure** :
-- un bilan qui porte une clé nommant un document, une citation ou un projet est
-- refusé par la base. Une promesse qu'aucune contrainte ne garde est une
-- intention.
--
-- POURQUOI `procede`
--
-- C'est le `lu_par` des lectures conservées : le modèle **et** la version du
-- procédé. Sans lui, deux bilans qui diffèrent ne diraient pas si l'on a changé
-- quelque chose ou si le procédé ne se répète pas — et c'est exactement la
-- distinction que la dérive existe pour tenir.
--
-- POURQUOI AUCUN `project_id`
--
-- La perturbation et le jeu de référence tournent sur un corpus **inventé**, qui
-- n'appartient à aucun chantier. La dérive, elle, lit un chantier — mais ce
-- qu'elle dépose ici en est l'agrégat, et un agrégat de chantier rangé sous son
-- identifiant redeviendrait une information sur ce chantier.
--
-- QUI ÉCRIT, QUI LIT
--
-- Un administrateur, et lui seul, des deux côtés. Les outils tournent sous son
-- jeton ; la console lit sous le même. Ouvrir la lecture à tous ferait d'un taux
-- d'erreur interne une information publique du produit.
--
-- RIEN NE S'EFFACE
--
-- Une mesure qui a eu lieu ne devient pas fausse (règle 6). C'est une suite dans
-- le temps, et une suite dont on retire les mauvais points n'est plus une suite.
-- `effacer_les_vieilles_mesures()` existe pour la conservation ; **rien ne
-- l'appelle encore**, et c'est dit à l'écran plutôt que laissé croire (règle 12).
--
-- STRICTEMENT ADDITIVE
--
-- Une table neuve, ses politiques, une fonction. Aucune table existante n'est
-- créée, modifiée ni supprimée.

create table if not exists public.mesures_de_justesse (
  id uuid primary key default gen_random_uuid(),

  -- **Posé par la base, jamais par l'appelant.** Un outil qui déclarerait un
  -- autre propriétaire ferait porter sa mesure à quelqu'un qui ne l'a pas prise.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  quand timestamptz not null default now(),

  -- Lequel des quatre outils. Borné : une valeur inconnue serait une ligne que
  -- l'écran ne saurait pas nommer, et qu'il afficherait quand même.
  quoi text not null check (quoi in ('perturbations', 'derive', 'jeu_de_reference', 'invariants')),

  -- Le modèle et la version du procédé mesuré. Vide quand l'outil a tourné sur
  -- ses lecteurs de carton : c'est alors une mesure de l'outil, pas des lectures.
  procede text not null default '',

  -- Combien de choses la mesure a portées — épreuves, passages, documents. Ce
  -- qui donne son assiette au taux : « 100 % » sur une épreuve n'est pas
  -- « 100 % » sur quatre cents.
  combien integer not null default 0 check (combien >= 0),

  -- Le bilan, tel que l'outil le rend. Des nombres, et rien d'autre.
  bilan jsonb not null default '{}'::jsonb,

  -- **La promesse tenue par la structure.** Un bilan qui nommerait un document,
  -- une citation, un chantier ou une personne est refusé ici, et non relu plus
  -- tard par quelqu'un d'attentif.
  constraint bilan_sans_contenu check (
    not (bilan ?| array[
      'document', 'documents', 'citation', 'citations', 'avis', 'projet',
      'project_id', 'chantier', 'nom', 'reference', 'references', 'piegesTombes',
      'ecarts', 'manques', 'enTrop', 'fausses'
    ])
  )
);

-- « Où en est la justesse ? » est la question de l'écran, et la seule : le
-- dernier bilan de chaque outil, puis la suite dans le temps.
create index if not exists mesures_de_justesse_quoi_date_idx
  on public.mesures_de_justesse (quoi, quand desc);

alter table public.mesures_de_justesse enable row level security;

drop policy if exists mesures_de_justesse_ladministrateur_lit on public.mesures_de_justesse;
create policy mesures_de_justesse_ladministrateur_lit
on public.mesures_de_justesse for select to authenticated
using (public.est_administrateur());

drop policy if exists mesures_de_justesse_ladministrateur_depose on public.mesures_de_justesse;
create policy mesures_de_justesse_ladministrateur_depose
on public.mesures_de_justesse for insert to authenticated
with check (public.est_administrateur() and owner_id = auth.uid());

-- **Ni mise à jour, ni effacement.** Aucune politique ne les ouvre, et une table
-- sous RLS sans politique pour un verbe le refuse à tous. Une mesure qui a eu
-- lieu ne devient pas fausse ; la corriger reviendrait à choisir ses résultats.

comment on table public.mesures_de_justesse is
  'Le bilan de chaque passage des outils de mesure. Des comptes et des taux, jamais un contenu de chantier : la contrainte bilan_sans_contenu le tient par la structure, et non par la bonne volonté.';

-- ════════════════════════════════════════════════════════════════════════════
--  La conservation
-- ════════════════════════════════════════════════════════════════════════════
--
-- Vingt-six mois : deux fois treize, pour pouvoir comparer une année à la
-- précédente et voir le dernier point de comparaison avant de le perdre.
--
-- **Rien ne l'appelle.** Ni `pg_cron`, ni un bouton. C'est un outil posé, pas
-- une purge en service, et l'écran le dit.

create or replace function public.effacer_les_vieilles_mesures()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  combien integer;
begin
  if not public.est_administrateur() then
    raise exception 'reserve a l administrateur';
  end if;

  delete from public.mesures_de_justesse where quand < now() - interval '26 months';
  get diagnostics combien = row_count;
  return combien;
end;
$$;

comment on function public.effacer_les_vieilles_mesures() is
  'Efface les mesures de plus de vingt-six mois. Rien ne l''appelle : c''est un outil posé, pas une purge en service.';

revoke all on function public.effacer_les_vieilles_mesures() from public;
grant execute on function public.effacer_les_vieilles_mesures() to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  Déposer une mesure
-- ════════════════════════════════════════════════════════════════════════════
--
-- POURQUOI UNE FONCTION, ET NON UN `insert` DEPUIS L'OUTIL
--
-- L'outil pourrait écrire dans la table : la politique d'insertion le permet, et
-- elle le garde. Mais c'est l'outil qui choisirait alors ce qu'il range dans
-- `bilan`, et un outil qui ajoute un champ en ajoute un à l'écran — un champ que
-- la console affiche sans savoir ce qu'il mesure (règle 5).
--
-- La fonction **borne** : elle ne garde du bilan que les clés déclarées, et jette
-- le reste sans rien dire. Un outil qui veut montrer un chiffre neuf passe donc
-- par une migration, c'est-à-dire par une relecture — et c'est le bon prix.
--
-- Elle rend l'identifiant de la ligne posée : l'outil l'écrit dans son terminal,
-- et c'est ce qui permet de retrouver au banc la mesure dont on parle.

create or replace function public.deposer_une_mesure(
  p_quoi text,
  p_procede text default '',
  p_combien integer default 0,
  p_bilan jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = public, auth
as $$
declare
  v_id uuid;
  -- **Les seules clés qui traversent.** Des nombres, tous, et chacun avec son
  -- assiette : `epreuves` est l'assiette de `tombees`, `attendus` celle de
  -- `trouves`. Un taux sans son assiette ne se lit pas, et l'écran refuserait
  -- de l'afficher ; mieux vaut qu'il n'entre pas.
  v_permis text[] := array[
    -- La batterie de perturbations
    'perturbations', 'epreuves', 'tombees', 'sansEffet',
    -- La dérive
    'lectures', 'derives', 'instabilites', 'procedesInconnus', 'sansProcede',
    -- Le jeu de référence, étape par étape : jamais un score unique
    'attendus', 'trouves', 'rates', 'inventes', 'pieges', 'piegesEvites',
    'etapes',
    -- Les invariants
    'invariants', 'invariantsTombes'
  ];
  -- **Et rien d'autre.** La liste a porté un moment 'secondes' et 'appels' —
  -- combien de temps la mesure a pris, combien d'appels au modele elle a coute.
  -- Aucun outil ne les produit : c'etait du SQL que rien n'appelle, et une
  -- epreuve confronte desormais les deux cotes pour que cela ne revienne pas
  -- (regle 1).
  v_propre jsonb := '{}'::jsonb;
  v_cle text;
begin
  -- La porte de la console, pour la même raison qu'ailleurs : déposer une mesure
  -- est un geste d'administration, et il laisse une ligne que personne ne retire.
  perform public.la_porte_de_la_console(
    'justesse/depot', format('quoi=%s combien=%s', p_quoi, p_combien));

  foreach v_cle in array v_permis loop
    -- **Seuls les nombres passent.** Une chaîne sous une clé permise serait le
    -- chemin par lequel un contenu entrerait : `tombees` valant
    -- « RICT-03 a manqué A-23 » traverserait `bilan_sans_contenu`, qui ne
    -- regarde que les noms de clés.
    if jsonb_typeof(p_bilan -> v_cle) = 'number' then
      v_propre := v_propre || jsonb_build_object(v_cle, p_bilan -> v_cle);
    -- `etapes` est le seul objet admis : un nombre par étape, et c'est ce qui
    -- interdit au jeu de référence de rendre un score unique.
    elsif v_cle = 'etapes' and jsonb_typeof(p_bilan -> 'etapes') = 'object' then
      v_propre := v_propre || jsonb_build_object('etapes', (
        select coalesce(jsonb_object_agg(cle, valeur), '{}'::jsonb)
          from jsonb_each(p_bilan -> 'etapes') as e(cle, valeur)
         where jsonb_typeof(valeur) = 'number'
      ));
    end if;
  end loop;

  insert into public.mesures_de_justesse (quoi, procede, combien, bilan)
  values (
    btrim(coalesce(p_quoi, '')),
    -- Borné : un procédé est un nom de modèle et un numéro de version.
    left(btrim(coalesce(p_procede, '')), 200),
    greatest(coalesce(p_combien, 0), 0),
    v_propre
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.deposer_une_mesure(text, text, integer, jsonb) is
  'Dépose le bilan d''un outil de mesure. Ne garde du bilan que les clés déclarées, et seulement si elles portent un nombre : c''est ce qui empêche un contenu d''entrer par une clé permise.';

revoke all on function public.deposer_une_mesure(text, text, integer, jsonb) from public;
grant execute on function public.deposer_une_mesure(text, text, integer, jsonb) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  Relire la justesse
-- ════════════════════════════════════════════════════════════════════════════
--
-- CE QUE L'ÉCRAN DEMANDE, ET POURQUOI C'EST UNE SEULE FONCTION
--
-- Deux choses, et elles ne se séparent pas : **le dernier bilan de chaque
-- outil**, et **la suite des bilans dans le temps**. Le dernier seul se lit « la
-- justesse est de 94 % », ce qui ne veut rien dire ; la suite seule ne dit pas
-- où l'on en est.
--
-- Et elle rend **ce qui n'a jamais été mesuré** : les outils déclarés dont
-- aucune ligne ne porte le nom. Une liste à trois entrées quand il y a quatre
-- outils se lit « le quatrième va bien » (règle 12).

create or replace function public.la_justesse_des_analyses(
  p_combien integer default 60
)
returns table (
  quoi text,
  procede text,
  quand timestamptz,
  combien integer,
  bilan jsonb,
  -- **Le rang du plus récent au plus ancien, par outil.** C'est ce qui permet au
  -- JavaScript de prendre « le dernier de chaque outil » sans supposer que la
  -- base les a rendus dans un certain ordre — une supposition qui tient jusqu'au
  -- jour où quelqu'un ajoute un `order by` ailleurs.
  rang bigint
)
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_combien integer := least(greatest(coalesce(p_combien, 60), 1), 500);
begin
  perform public.la_porte_de_la_console(
    'exploitation/justesse', format('combien=%s', v_combien));

  return query
  select m.quoi, m.procede, m.quand, m.combien, m.bilan, m.rang
    from (
      select
        d.quoi, d.procede, d.quand, d.combien, d.bilan,
        -- Par outil **et par procédé** : le dernier bilan d'un procédé qu'on
        -- n'emploie plus n'est pas le dernier bilan de l'outil.
        row_number() over (
          partition by d.quoi, d.procede order by d.quand desc, d.id desc
        ) as rang
      from public.mesures_de_justesse d
    ) m
   order by m.quoi, m.quand desc
   limit v_combien;
end;
$$;

comment on function public.la_justesse_des_analyses(integer) is
  'Les bilans des outils de mesure, du plus récent, avec le rang de chacun dans son couple outil/procédé. Gardée par la porte de la console, et journalisée comme toute consultation.';

revoke all on function public.la_justesse_des_analyses(integer) from public;
grant execute on function public.la_justesse_des_analyses(integer) to authenticated;
