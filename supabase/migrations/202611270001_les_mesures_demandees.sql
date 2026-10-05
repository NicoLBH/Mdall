-- ─────────────────────────────────────────────────────────────────────────────
-- Les mesures demandées : la file des quatre outils de justesse
--
-- ## La question posée
--
-- > « Oui, fais les 4 outils depuis la console. »
--
-- Les quatre outils de mesure tournaient dans un terminal, avec trois variables
-- d'environnement et une commande par outil. La console affichait leurs bilans
-- quand il y en avait, et « jamais lancé » sinon — sans aucun moyen de changer
-- cela depuis la page.
--
-- ## Pourquoi une file, et non un appel direct
--
-- Parce que **deux des quatre coûtent des minutes**, et que la durée n'est pas
-- la même selon l'outil :
--
--   * la **dérive** et les **invariants** se lisent dans les analyses déjà
--     conservées : aucun appel au modèle, aucune facture, quelques
--     millisecondes. C'est pour cela qu'on peut les regarder souvent ;
--   * la **batterie de perturbations** relit deux documents sous six
--     perturbations chacun, à trois appels par lecture — une quarantaine
--     d'appels, et plusieurs minutes ;
--   * le **jeu de référence** relit deux documents annotés : six appels.
--
-- Une fonction de bord appelée directement expirerait sur la première, et la
-- console resterait sur une roue qui tourne sans que rien ne dise où cela en
-- est. C'est exactement le défaut qu'on a retiré du dépôt de messagerie en
-- octobre, puis de la lecture des comptes rendus en novembre : **on lance, on
-- rend la main, et l'écran dit où cela en est.**
--
-- ## Pourquoi sa propre table, et non `versements`
--
-- `versements` porte le geste d'un **chantier** : un `project_id` obligatoire,
-- des fichiers, une proposition emportée. Son geste vient du registre des
-- familles de documents, et ce registre dit ce qu'une famille de documents est.
--
-- Une mesure de justesse n'est pas un geste de chantier : elle peut n'en
-- concerner aucun — la batterie tourne sur un corpus à elle —, elle ne dépose
-- aucun document, et elle est réservée à la console. L'y faire entrer aurait
-- demandé de rendre `project_id` facultatif pour tout le monde et d'inventer
-- une famille de documents qui n'en est pas une (règle 10).
--
-- Elle a donc sa file, avec les mêmes mots — `en_attente`, `en_cours`, `fini`,
-- `echec` —, parce que ce sont les mots de toutes les files d'ici.
--
-- ## Strictement additive
--
-- Une table, trois fonctions, et rien d'autre. Aucune table existante touchée,
-- aucune politique changée, aucune colonne retirée.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.mesures_demandees (
  id uuid primary key default gen_random_uuid(),

  -- Lequel des quatre. **Contraint** : un outil que l'écran ne sait pas nommer
  -- s'afficherait sous un libellé vide, et l'on croirait à une mesure nouvelle
  -- là où c'est une faute de frappe (règle 5).
  outil text not null,

  -- Le chantier sur lequel mesurer, quand l'outil en demande un. `null` pour
  -- ceux qui tournent sur leur propre corpus — et `null` n'est pas « tous les
  -- chantiers », c'est « cet outil ne regarde aucun chantier ».
  projet_id uuid references public.projects(id) on delete set null,

  -- `en_attente` → `en_cours` → `fini` | `echec`.
  --
  -- **`en_attente` et `en_cours` ne disent pas la même chose**, et c'est ce qui
  -- permet de reprendre : une ligne `en_cours` depuis une heure a été
  -- abandonnée en route, une ligne `en_attente` depuis une heure n'a jamais été
  -- prise — et c'est le second cas qui dit « la fonction de bord ne tourne
  -- pas du tout ».
  statut text not null default 'en_attente',

  -- Le procédé mesuré — le modèle, et la version de la consigne. Il se dépose
  -- avec le bilan : deux procédés en vie font deux états du système, et non une
  -- moyenne.
  procede text not null default '',

  -- Qui a demandé. Posé par la base : demander au client de l'envoyer
  -- reviendrait à accepter qu'il envoie celui d'un autre.
  demande_par uuid references auth.users(id) on delete set null default auth.uid(),

  -- Pourquoi cela s'est arrêté, en français. Vide quand tout a tenu.
  arrete text not null default '',

  -- Le bilan qui en est sorti. `null` tant qu'il n'y en a pas — et une ligne
  -- `fini` sans mesure est un défaut qui se voit : l'outil a tourné et n'a rien
  -- déposé.
  mesure_id uuid references public.mesures_de_justesse(id) on delete set null,

  cree_le timestamptz not null default now(),
  pris_le timestamptz,
  fini_le timestamptz,

  -- Les quatre outils, nommés comme `mesures_de_justesse` les nomme. Deux
  -- listes qui divergeraient donneraient une demande qu'aucun dépôt ne peut
  -- satisfaire (règle 10).
  constraint un_outil_quon_connait check (
    outil in ('perturbations', 'derive', 'jeu_de_reference', 'invariants')),

  constraint un_statut_quon_connait check (
    statut in ('en_attente', 'en_cours', 'fini', 'echec'))
);

-- « Qu'est-ce qui attend ? » — la question du serveur qui vide la file, posée à
-- chaque réveil.
create index if not exists mesures_demandees_a_prendre_idx
  on public.mesures_demandees (cree_le)
  where statut in ('en_attente', 'en_cours');

-- « Où en sont mes demandes ? » — celle de la console, posée à chaque venue.
create index if not exists mesures_demandees_par_date_idx
  on public.mesures_demandees (cree_le desc);

alter table public.mesures_demandees enable row level security;

-- ── Les politiques ───────────────────────────────────────────────────────────
--
-- **La console, et elle seule**, des deux côtés. Ouvrir la lecture à tous ferait
-- d'un taux d'erreur interne une information publique du produit ; ouvrir
-- l'écriture laisserait n'importe qui faire tourner une batterie de
-- perturbations — c'est-à-dire dépenser une quarantaine d'appels au modèle.

drop policy if exists "la console lit ses demandes" on public.mesures_demandees;
create policy "la console lit ses demandes"
  on public.mesures_demandees for select
  using (public.est_administrateur());

drop policy if exists "la console demande une mesure" on public.mesures_demandees;
create policy "la console demande une mesure"
  on public.mesures_demandees for insert
  with check (public.est_administrateur());

-- **Aucune politique d'effacement, et c'est voulu.** Une file dont on retire les
-- lignes qui ont échoué n'est plus une file : on relancerait sans savoir qu'on a
-- déjà essayé, et la facture serait payée deux fois (règle 6).
--
-- **Aucune politique de mise à jour non plus** : c'est la fonction de bord qui
-- avance une ligne, et elle le fait sous la clé de service. Une console qui
-- pourrait se déclarer « fini » sans avoir rien mesuré pourrait écrire la
-- justesse qui lui plaît.

comment on table public.mesures_demandees is
  'La file des quatre outils de justesse, demandés depuis la console. '
  'Lecture et demande réservées aux administrateurs ; l''avancement est écrit par la fonction de bord.';

-- ── Demander une mesure ──────────────────────────────────────────────────────

create or replace function public.demander_une_mesure(
  p_outil text,
  p_projet uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_outil text := btrim(coalesce(p_outil, ''));
  v_deja uuid;
  v_id uuid;
begin
  perform public.la_porte_de_la_console(
    'exploitation/justesse', format('demande=%s', v_outil));

  /**
   * **Une seule demande en vol par outil.**
   *
   * Deux clics sur « Lancer la batterie » font deux batteries, donc quatre-vingts
   * appels au modèle au lieu de quarante — et le second bilan écrase le premier
   * à l'écran, de sorte qu'on ne voit même pas qu'on a payé deux fois. La
   * seconde demande rend donc la ligne déjà en vol, et l'écran dit qu'elle
   * tourne.
   */
  select m.id into v_deja
    from public.mesures_demandees m
   where m.outil = v_outil
     and m.statut in ('en_attente', 'en_cours')
   order by m.cree_le desc
   limit 1;

  if v_deja is not null then
    return v_deja;
  end if;

  insert into public.mesures_demandees (outil, projet_id)
  values (v_outil, p_projet)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.demander_une_mesure(text, uuid) is
  'Pose une demande de mesure pour la console. Rend la demande déjà en vol plutôt que d''en poser une seconde.';

revoke all on function public.demander_une_mesure(text, uuid) from public, anon;
grant execute on function public.demander_une_mesure(text, uuid) to authenticated;

-- ── Relire ses demandes ──────────────────────────────────────────────────────

create or replace function public.les_mesures_demandees(p_combien integer default 20)
returns table (
  id uuid,
  outil text,
  statut text,
  procede text,
  arrete text,
  a_depose boolean,
  cree_le timestamptz,
  pris_le timestamptz,
  fini_le timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_combien integer := least(greatest(coalesce(p_combien, 20), 1), 200);
begin
  perform public.la_porte_de_la_console(
    'exploitation/justesse', format('demandes=%s', v_combien));

  return query
  select
    m.id, m.outil, m.statut, m.procede, m.arrete,
    -- **Un booléen, et non l'identifiant du bilan.** L'écran n'a qu'une question
    -- à poser — « cette demande a-t-elle déposé quelque chose ? » —, et une
    -- ligne `fini` qui n'a rien déposé est un défaut qu'il doit pouvoir dire.
    (m.mesure_id is not null) as a_depose,
    m.cree_le, m.pris_le, m.fini_le
    from public.mesures_demandees m
   order by m.cree_le desc
   limit v_combien;
end;
$$;

comment on function public.les_mesures_demandees(integer) is
  'Les demandes de mesure, de la plus récente à la plus ancienne. Des états et des dates, jamais un contenu.';

revoke all on function public.les_mesures_demandees(integer) from public, anon;
grant execute on function public.les_mesures_demandees(integer) to authenticated;
