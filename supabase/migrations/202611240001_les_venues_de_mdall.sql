-- Le trafic et le temps passé : une table de venues, et rien d'autre dedans.
--
-- LA QUESTION POSÉE
--
--   « Je veux pouvoir voir le trafic, le temps moyen d'utilisation… »
--
-- La console répondait que cela ne se savait pas, et c'était vrai : Mdall ne
-- gardait que `last_sign_in_at`, la dernière entrée de chaque compte. Combien de
-- monde hier, combien de temps chacun est resté — rien ne le disait, parce
-- qu'aucune table ne l'écrivait.
--
-- CE QU'UNE VENUE PORTE, ET CE QU'ELLE NE PORTERA JAMAIS
--
-- Qui, quand elle a commencé, quand on l'a vue pour la dernière fois, et combien
-- de secondes éveillées. **Ni écran ouvert, ni chantier, ni geste, ni document.**
--
-- Ce n'est pas une prudence de façade. « Qui a passé combien de temps sur quel
-- chantier » serait utile, et ce serait un journal de navigation : la promesse
-- du produit est que le contenu ne traverse pas, et un journal de navigation la
-- défait par la bande — on saurait qui lit quoi sans jamais lire une ligne.
--
-- Une ligne de cette table ne peut donc rien porter que ces quatre champs. C'est
-- une garantie de structure, pas une promesse.
--
-- CE QUE LE TEMPS MESURE, ET CE QU'IL NE MESURE PAS
--
-- Un onglet laissé ouvert toute la nuit, c'est huit heures. Compter le temps
-- pendant lequel la page existe donnerait un temps moyen de plusieurs heures,
-- faux et flatteur — le genre de chiffre qu'on finit par montrer à quelqu'un.
--
-- On ne compte donc que le temps **éveillé** : l'onglet au premier plan, et un
-- geste dans les cinq dernières minutes. Le navigateur décide (c'est lui qui
-- sait), la base **borne** (parce qu'il pourrait envoyer n'importe quoi).
--
-- Ce que cela mesure reste « l'application était ouverte et quelqu'un la
-- touchait », et non « quelqu'un travaillait ». L'écran de la console l'écrit :
-- un indicateur dont on a oublié ce qu'il mesure est pire qu'un indicateur
-- manquant (règle 5).
--
-- CONSERVATION
--
-- Treize mois, pour pouvoir comparer un mois à celui de l'an passé, et pas plus.
-- `effacer_les_vieilles_venues()` le fait ; **rien ne l'appelle encore**, et
-- c'est dit à l'écran plutôt que laissé croire (règle 12).
--
-- STRICTEMENT ADDITIVE
--
-- Une table neuve, ses politiques, et trois fonctions. Aucune table existante
-- n'est créée, modifiée ni supprimée.

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),

  -- **Posé par la base, jamais par l'appelant.** Un navigateur qui déclarerait
  -- un autre propriétaire ferait porter sa présence à quelqu'un qui n'était pas
  -- là — et ce serait la seule table du produit où cela se verrait comme un fait.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  commencee_le timestamptz not null default now(),

  -- Le dernier battement. L'écart avec `commencee_le` est l'empan de la venue ;
  -- il est **toujours supérieur ou égal** aux secondes éveillées, et c'est la
  -- différence entre « il est resté deux heures » et « il a travaillé vingt
  -- minutes ».
  vue_le timestamptz not null default now(),

  -- Ce qui est réellement compté. Borné à chaque ajout.
  secondes_actives integer not null default 0
    constraint venues_secondes_positives check (secondes_actives >= 0)
);

-- « Combien de monde hier, et combien de temps ? » se pose sur une fenêtre, et
-- toujours du plus récent.
create index if not exists venues_quand_idx on public.venues (commencee_le desc);
create index if not exists venues_owner_idx on public.venues (owner_id, commencee_le desc);

alter table public.venues enable row level security;

-- **Chacun écrit la sienne, et seulement la sienne.** `owner_id` vient de la
-- base ; cette clause interdit qu'on le remplace.
drop policy if exists venues_je_note_la_mienne on public.venues;
create policy venues_je_note_la_mienne
on public.venues for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists venues_je_lis_les_miennes on public.venues;
create policy venues_je_lis_les_miennes
on public.venues for select to authenticated
using (owner_id = auth.uid());

drop policy if exists venues_je_prolonge_les_miennes on public.venues;
create policy venues_je_prolonge_les_miennes
on public.venues for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- **Et chacun peut effacer les siennes.**
--
-- C'est le droit à l'effacement rendu réel plutôt qu'écrit dans une politique de
-- confidentialité : la mesure de ma présence m'appartient. Le prix est que le
-- chiffre du trafic est diminuable par ceux qu'il compte — et c'est le bon prix,
-- parce qu'un indicateur d'exploitation ne vaut pas qu'on retienne les données
-- de quelqu'un qui demande leur effacement.
drop policy if exists venues_jefface_les_miennes on public.venues;
create policy venues_jefface_les_miennes
on public.venues for delete to authenticated
using (owner_id = auth.uid());

comment on table public.venues is
  'Qui était là, quand, et combien de secondes éveillées. Aucun écran, aucun chantier, aucun document : « qui a passé du temps sur quoi » serait un journal de navigation, et défaitrait la promesse du produit par la bande.';

comment on column public.venues.secondes_actives is
  'Le temps où l''application était au premier plan et touchée dans les cinq minutes. Ce n''est pas du temps de travail, et ce n''est pas l''empan de la venue.';

-- ── Prolonger une venue ────────────────────────────────────────────────────
--
-- POURQUOI UNE FONCTION, ET NON UN `update` DEPUIS LE NAVIGATEUR
--
-- Deux raisons, et la seconde décide.
--
-- D'abord `secondes_actives = secondes_actives + p` doit être atomique : deux
-- onglets de la même personne feraient sinon une lecture, une lecture, deux
-- écritures, et l'une des deux minutes disparaîtrait.
--
-- Surtout, **l'ajout doit être borné par la base**. Le navigateur envoie un
-- nombre, donc il peut envoyer n'importe lequel — un onglet réveillé après une
-- heure de veille déclarerait une heure d'un coup. La borne est celle de
-- `AU_PLUS_PAR_BATTEMENT_S` dans `services/les-venues.js` : le même nombre, écrit
-- des deux côtés parce que chacun doit tenir seul, et une épreuve les confronte.

create or replace function public.prolonger_une_venue(
  p_venue uuid,
  p_secondes integer default 0
)
returns timestamptz
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_secondes integer := least(greatest(coalesce(p_secondes, 0), 0), 300);
  v_vue_le timestamptz;
begin
  update public.venues
     set vue_le = now(),
         secondes_actives = secondes_actives + v_secondes
   where id = p_venue
   returning vue_le into v_vue_le;

  -- **`null` quand rien n'a bougé**, et c'est l'information : la venue n'existe
  -- pas, ou elle n'est pas à moi. Le navigateur en ouvre alors une neuve plutôt
  -- que de battre dans le vide (règle 5).
  return v_vue_le;
end;
$$;

comment on function public.prolonger_une_venue(uuid, integer) is
  'Prolonge une venue et y ajoute des secondes éveillées, bornées à 300. Rend null si la venue n''existe pas ou n''est pas la vôtre.';

revoke all on function public.prolonger_une_venue(uuid, integer) from public;
grant execute on function public.prolonger_une_venue(uuid, integer) to authenticated;

-- ── Le trafic, pour la console ─────────────────────────────────────────────
--
-- Par pas de temps : combien de venues, combien de comptes **distincts**, et le
-- temps éveillé. Les deux premiers ne disent pas la même chose — dix venues d'une
-- personne ne font pas dix personnes —, et c'est précisément ce qu'on vient
-- vérifier quand on regarde un trafic.

create or replace function public.le_trafic_de_mdall(
  p_du date,
  p_au date,
  p_pas text default 'day'
)
returns table (
  le timestamptz,
  venues bigint,
  comptes bigint,
  secondes_actives bigint,
  -- Par venue : la médiane et le plus long. **La moyenne seule recouvre deux
  -- usages** — vingt visites d'une minute et une d'une heure donnent la même
  -- qu'une poignée de sessions de travail.
  secondes_medianes numeric,
  secondes_maximum bigint
)
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  -- **Trois pas, et pas un de plus.** `date_trunc` en accepte bien d'autres ;
  -- laisser passer celui qu'on reçoit reviendrait à laisser l'appelant choisir
  -- une granularité que l'axe du JavaScript ne sait pas dessiner — la courbe
  -- s'afficherait vide, ce qui se lit « personne n'est venu » (règle 5).
  v_pas text := lower(coalesce(nullif(trim(p_pas), ''), 'day'));
begin
  if v_pas not in ('day', 'month', 'year') then
    raise exception 'pas inconnu : %', v_pas;
  end if;

  perform public.la_porte_de_la_console(
    'exploitation/trafic', format('du=%s au=%s pas=%s', p_du, p_au, v_pas));

  return query
  select
    date_trunc(v_pas, v.commencee_le) as le,
    count(*)::bigint,
    -- Les comptes distincts, et non les venues : dix venues d'une personne ne
    -- font pas dix personnes, et c'est le chiffre qu'on croit lire.
    count(distinct v.owner_id)::bigint,
    sum(v.secondes_actives)::bigint,
    -- **Le transtypage n'est pas décoratif.** `percentile_cont` sur un entier
    -- rend un `double precision` ; la colonne est déclarée `numeric`, et
    -- PostgreSQL refuse la fonction au déploiement — « structure of query does
    -- not match function result type ». Le banc l'a trouvé, aucun texte ne
    -- l'aurait dit.
    (percentile_cont(0.5) within group (order by v.secondes_actives))::numeric,
    max(v.secondes_actives)::bigint
  from public.venues v
  where v.commencee_le >= p_du::timestamptz
    -- **La borne de fin est incluse.** Une venue du dernier jour de la fenêtre
    -- qui disparaîtrait ferait un trafic qui s'arrête la veille.
    and v.commencee_le < (p_au::date + 1)::timestamptz
  group by 1
  order by 1;
end;
$$;

comment on function public.le_trafic_de_mdall(date, date, text) is
  'Le trafic par pas de temps : venues, comptes distincts, secondes éveillées. Jamais un écran, un chantier ni un document.';

revoke all on function public.le_trafic_de_mdall(date, date, text) from public;
grant execute on function public.le_trafic_de_mdall(date, date, text) to authenticated;

-- ── La conservation ────────────────────────────────────────────────────────
--
-- Treize mois : de quoi comparer un mois à celui de l'an passé, et pas un jour
-- de plus. Une mesure de présence gardée indéfiniment est une mesure dont
-- personne ne saura dire pourquoi on la garde encore.
--
-- **Rien ne l'appelle encore**, et la console le dit plutôt que de laisser
-- croire la purge faite. Une durée de conservation écrite et jamais appliquée
-- est pire qu'aucune : elle se présente comme une garantie (règle 12).

create or replace function public.effacer_les_vieilles_venues()
returns bigint
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_combien bigint;
begin
  perform public.la_porte_de_la_console('exploitation/purge', 'venues>13mois');

  with parties as (
    delete from public.venues
     where commencee_le < now() - interval '13 months'
    returning 1
  )
  select count(*) into v_combien from parties;

  return v_combien;
end;
$$;

comment on function public.effacer_les_vieilles_venues() is
  'Efface les venues de plus de treize mois. Gardée par la porte de la console, et journalisée comme toute consultation.';

revoke all on function public.effacer_les_vieilles_venues() from public;
grant execute on function public.effacer_les_vieilles_venues() to authenticated;
