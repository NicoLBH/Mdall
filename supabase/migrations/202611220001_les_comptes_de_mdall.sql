-- Les comptes de Mdall, vus de la console — et le journal qui dit qui les a vus.
--
-- LA QUESTION POSÉE
--
-- « Dans la console admin, un onglet Utilisateurs : la liste des comptes, et
-- quand on clique sur une ligne, le détail — ses projets, sa consommation d'IA,
-- ses sujets. »
--
-- C'est le **premier vrai écran d'exploitation** de la console. Jusqu'ici elle ne
-- lisait que des agrégats anonymes — des nombres, deux dates, aucun identifiant
-- (`comptes_du_carburant()`). Ici, elle lit des **personnes** : un nom, un
-- prénom, une adresse. C'est un autre régime, et il faut le traiter comme tel.
--
-- CE QUI DOIT PRÉCÉDER UN TEL ÉCRAN, ET QUI N'EXISTAIT PAS
--
-- `docs/la-console-de-ladministrateur.md`, § 5.4, l'écrit depuis des mois :
--
--   « Un journal des accès administrateurs : qui, quelle page, quand, quel
--     filtre. **Irrattrapable si on ne l'écrit pas dès le premier jour**,
--     exactement comme les écartés et comme les refus. C'est aussi ce qui rend
--     la console défendable devant un client. »
--
-- Et plus haut : « elle doit précéder le premier vrai écran d'exploitation ».
-- Cette migration le pose donc **avec** l'écran, pas après. Un journal qu'on
-- ajoute six mois plus tard ne dit rien des six premiers mois, et c'est
-- précisément la période qu'on voudra expliquer.
--
-- Le RGPD ne demande pas autre chose : tout accès à des données personnelles
-- doit être attribuable (art. 5.2) et journalisé (art. 32).
--
-- CE QUE LE JOURNAL COUVRE, ET CE QU'IL NE COUVRE PAS ENCORE
--
-- Il couvre **les pages qui lisent des personnes** : les trois fonctions de ce
-- fichier. Les pages déjà en place — le carburant, les domaines, les sujets du
-- système — ne lisent que des agrégats anonymes, sans un identifiant qui
-- désigne quiconque, et ne sont pas journalisées à ce tour. Ce n'est pas un
-- oubli : c'est la ligne qu'on tient, et il faut la dire — l'étendre à ces
-- fonctions demanderait de les passer de `stable` à `volatile`, donc de les
-- modifier, et cette migration reste strictement additive.
--
-- CE QUE CES FONCTIONS NE LISENT JAMAIS
--
-- `copilot_conversations`, `copilot_messages` — la promesse absolue du produit ;
-- `subject_messages` — les échanges entre collaborateurs ;
-- `project_assertions` — le contenu de la mémoire ;
-- le texte des `documents`, les transcriptions, les pièces ;
-- le dossier des mails, privé par construction.
--
-- Elles lisent des **comptes**, des **dates**, des **noms de personne et de
-- chantier**, et rien d'autre. Une épreuve lit le texte de ce fichier et refuse
-- ces tables : c'est le cas précis où une épreuve sur la source vaut quelque
-- chose — un défaut qu'aucun résultat ne trahirait.
--
-- STRICTEMENT ADDITIVE
--
-- Une table neuve et quatre fonctions neuves. Aucune table existante n'est
-- modifiée, aucune colonne n'est retirée, aucune politique n'est remplacée.

-- ── Le journal des accès ───────────────────────────────────────────────────
--
-- Qui, quelle page, quand, quel filtre. Rien de ce qui a été lu : le journal
-- dit qu'on a ouvert la liste des comptes, pas lesquels s'y trouvaient.
--
-- Il n'a **aucune politique de lecture** : personne ne le lit depuis un
-- navigateur, pas même un administrateur. Le consulter se fait avec les clés,
-- là où l'on ne peut pas se journaliser soi-même une exception.

create table if not exists public.acces_administrateurs (
  id uuid primary key default gen_random_uuid(),
  -- Qui. L'identifiant **et** l'adresse : un compte effacé laisse un
  -- identifiant qui ne désigne plus personne, et un journal qui ne dit plus qui
  -- a regardé ne défend rien.
  qui uuid references auth.users(id) on delete set null,
  courriel text,
  -- Quelle page de la console.
  page text not null,
  -- Quel filtre : la recherche tapée, le numéro de page, le compte ouvert. Du
  -- texte libre borné — ce que la fonction a reçu, jamais ce qu'elle a rendu.
  filtre text,
  quand timestamptz not null default now()
);

alter table public.acces_administrateurs enable row level security;

create index if not exists idx_acces_administrateurs_quand
  on public.acces_administrateurs(quand desc);
create index if not exists idx_acces_administrateurs_qui
  on public.acces_administrateurs(qui, quand desc);

comment on table public.acces_administrateurs is
  'Qui a ouvert quelle page de la console, quand, avec quel filtre. Aucune politique de lecture : ne se consulte qu''avec les clés.';

-- ── Journaliser, et garder la porte au même endroit ────────────────────────
--
-- `security definer` : la table n'a pas de politique d'insertion, et c'est
-- voulu — on ne doit pas pouvoir écrire une ligne de journal à la main, ni en
-- omettre une.
--
-- **La porte est vérifiée ici aussi.** Un appel qui échouerait la porte ne doit
-- pas laisser de ligne : une tentative refusée n'est pas un accès.

create or replace function public.la_porte_de_la_console(p_page text, p_filtre text default null)
returns void
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
begin
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  insert into public.acces_administrateurs (qui, courriel, page, filtre)
  values (
    auth.uid(),
    lower(auth.jwt() ->> 'email'),
    coalesce(nullif(btrim(p_page), ''), 'inconnue'),
    -- Borné : un filtre est une recherche, un numéro de page, un identifiant.
    -- Rien de ce qui pourrait servir à faire passer un contenu par ce chemin.
    left(coalesce(p_filtre, ''), 500)
  );
end;
$$;

comment on function public.la_porte_de_la_console(text, text) is
  'Vérifie la porte et journalise l''accès. Lève si l''appelant n''est pas administrateur, et ne journalise alors rien.';

revoke all on function public.la_porte_de_la_console(text, text) from public;
grant execute on function public.la_porte_de_la_console(text, text) to authenticated;

-- ── La liste des comptes, par pages ────────────────────────────────────────
--
-- Pourquoi par pages, en base, et non tout d'un coup : la liste des comptes
-- grossit sans limite, et rendre dix mille lignes pour en montrer vingt-cinq
-- coûte à chaque ouverture d'écran. Le total voyage avec chaque ligne, par une
-- fonction de fenêtrage : sans lui, l'écran ne sait pas combien de pages il y a
-- et n'ose pas proposer la suivante.

create or replace function public.les_comptes_de_mdall(
  p_page integer default 1,
  p_par_page integer default 25,
  p_cherche text default null
)
returns table (
  identifiant uuid,
  courriel text,
  prenom text,
  nom text,
  societe text,
  entre_le timestamptz,
  derniere_trace timestamptz,
  projets_possedes bigint,
  projets_collabores bigint,
  combien_en_tout bigint
)
language plpgsql
-- **`volatile`, et c'est une affirmation, pas un réglage.** Une fonction qui
-- journalise son propre accès écrit : la déclarer `stable` la ferait tourner en
-- lecture seule, et Postgres refuserait l'insertion du journal — l'écran
-- marcherait, le journal serait vide. C'est exactement le genre de panne
-- silencieuse que ce journal existe pour ne pas avoir.
volatile
security definer
set search_path = public, auth
as $$
declare
  v_par_page integer := least(greatest(coalesce(p_par_page, 25), 1), 100);
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_cherche text := nullif(btrim(coalesce(p_cherche, '')), '');
begin
  -- **La porte d'abord, et elle journalise.** Sans elle, `security definer`
  -- rendrait l'annuaire des comptes à n'importe quelle session authentifiée.
  perform public.la_porte_de_la_console(
    'utilisateurs/comptes',
    format('page=%s par_page=%s cherche=%s', v_page, v_par_page, coalesce(v_cherche, ''))
  );

  return query
  with comptes as (
    select
      au.id,
      nullif(btrim(au.email), '') as courriel,
      nullif(btrim(p.first_name), '') as prenom,
      nullif(btrim(p.last_name), '') as nom,
      nullif(btrim(p.company), '') as societe,
      au.created_at,
      -- `last_sign_in_at` et non une activité : c'est la seule trace que Mdall
      -- garde sans la fabriquer. « Dernière trace » le dit comme tel.
      au.last_sign_in_at
    from auth.users au
    left join public.user_public_profiles p on p.user_id = au.id
    where au.deleted_at is null
      and (
        v_cherche is null
        or au.email ilike '%' || v_cherche || '%'
        or coalesce(p.first_name, '') ilike '%' || v_cherche || '%'
        or coalesce(p.last_name, '') ilike '%' || v_cherche || '%'
        or coalesce(p.company, '') ilike '%' || v_cherche || '%'
      )
  ),
  -- **On coupe la page avant de compter ses projets.** Les deux comptes sont des
  -- sous-requêtes corrélées : calculées sur l'ensemble filtré, elles
  -- s'exécuteraient pour dix mille comptes afin d'en afficher vingt-cinq. Le
  -- total, lui, se prend **dans** la page par fenêtrage, qui compte avant la
  -- coupe — sans lui l'écran ne saurait pas combien de pages il reste.
  la_page as (
    select c.*, count(*) over () as combien_en_tout
    from comptes c
    -- Les derniers entrés d'abord : c'est la question qu'on se pose en ouvrant
    -- l'écran — qui vient d'arriver.
    order by c.created_at desc nulls last, c.courriel asc
    offset (v_page - 1) * v_par_page
    limit v_par_page
  )
  select
    c.id,
    c.courriel,
    c.prenom,
    c.nom,
    c.societe,
    c.created_at,
    c.last_sign_in_at,
    (select count(*) from public.projects pr
      where pr.owner_id = c.id) as projets_possedes,
    -- **Possédé n'est pas collaboré.** Le propriétaire est inscrit comme
    -- collaborateur de son propre chantier par un déclencheur
    -- (`ensure_project_owner_collaborator`) : les compter ensemble dirait que
    -- chacun collabore à tout ce qu'il possède, ce qui n'apprend rien.
    (select count(distinct pc.project_id) from public.project_collaborators pc
      join public.projects pr on pr.id = pc.project_id
      where pc.collaborator_user_id = c.id
        and pr.owner_id is distinct from c.id
        and lower(coalesce(pc.status, 'actif')) <> 'retiré') as projets_collabores,
    c.combien_en_tout
  from la_page c
  order by c.created_at desc nulls last, c.courriel asc;
end;
$$;

comment on function public.les_comptes_de_mdall(integer, integer, text) is
  'Une page de comptes pour la console : identité, entrée, dernière trace, combien de projets. Jamais un contenu.';

revoke all on function public.les_comptes_de_mdall(integer, integer, text) from public;
grant execute on function public.les_comptes_de_mdall(integer, integer, text) to authenticated;

-- ── Le détail d'un compte ──────────────────────────────────────────────────
--
-- Ses projets — ceux qu'il possède, ceux où il collabore —, ses sujets, et ce
-- que l'IA lui a coûté en tout. Les projets viennent en `jsonb` : un appel, une
-- ligne de journal, et l'écran n'a pas à recoller trois lectures qui pourraient
-- revenir dans le désordre.

create or replace function public.le_compte_de_mdall(p_compte uuid)
returns table (
  identifiant uuid,
  courriel text,
  prenom text,
  nom text,
  societe text,
  entre_le timestamptz,
  derniere_trace timestamptz,
  sujets bigint,
  appels bigint,
  jetons bigint,
  premier_appel timestamptz,
  dernier_appel timestamptz,
  projets jsonb
)
language plpgsql
-- Journalise son accès : donc `volatile` (voir `les_comptes_de_mdall`).
volatile
security definer
set search_path = public, auth
as $$
begin
  perform public.la_porte_de_la_console('utilisateurs/compte', format('compte=%s', p_compte));

  if p_compte is null then
    return;
  end if;

  return query
  select
    au.id,
    nullif(btrim(au.email), ''),
    nullif(btrim(pr.first_name), ''),
    nullif(btrim(pr.last_name), ''),
    nullif(btrim(pr.company), ''),
    au.created_at,
    au.last_sign_in_at,
    -- **Les sujets qu'il a créés**, et non ceux de ses chantiers : c'est ce
    -- qu'il a fait, pas ce qui s'est fait autour de lui. Le titre d'un sujet
    -- n'entre pas ici — on compte, on ne lit pas.
    (select count(*) from public.subjects s where s.created_by = au.id),
    (select count(*) from public.ai_usages u where u.owner_id = au.id),
    (select coalesce(sum(coalesce(u.input_tokens, 0) + coalesce(u.output_tokens, 0)), 0)::bigint
       from public.ai_usages u where u.owner_id = au.id),
    (select min(u.created_at) from public.ai_usages u where u.owner_id = au.id),
    (select max(u.created_at) from public.ai_usages u where u.owner_id = au.id),
    coalesce((
      select jsonb_agg(ligne order by ligne ->> 'cree_le' desc)
      from (
        select jsonb_build_object(
          'id', p.id,
          'nom', p.name,
          'role', 'proprietaire',
          'cree_le', p.created_at,
          'archive_le', p.archived_at,
          'sujets', (select count(*) from public.subjects s where s.project_id = p.id)
        ) as ligne
        from public.projects p
        where p.owner_id = au.id

        union all

        select jsonb_build_object(
          'id', p.id,
          'nom', p.name,
          'role', 'collaborateur',
          'cree_le', p.created_at,
          'archive_le', p.archived_at,
          'sujets', (select count(*) from public.subjects s where s.project_id = p.id)
        ) as ligne
        from public.projects p
        where p.owner_id is distinct from au.id
          and exists (
            select 1 from public.project_collaborators pc
            where pc.project_id = p.id
              and pc.collaborator_user_id = au.id
              and lower(coalesce(pc.status, 'actif')) <> 'retiré'
          )
      ) lignes
    ), '[]'::jsonb)
  from auth.users au
  left join public.user_public_profiles pr on pr.user_id = au.id
  where au.id = p_compte
    and au.deleted_at is null;
end;
$$;

comment on function public.le_compte_de_mdall(uuid) is
  'Le détail d''un compte pour la console : ses projets, ses sujets comptés, ce que l''IA lui a coûté. Jamais un contenu.';

revoke all on function public.le_compte_de_mdall(uuid) from public;
grant execute on function public.le_compte_de_mdall(uuid) to authenticated;

-- ── La consommation d'un compte, groupée ───────────────────────────────────
--
-- POURQUOI LE GROUPEMENT EST ICI, ET POURQUOI IL NE DOUBLE RIEN
--
-- L'écran de l'utilisateur lit ses appels un par un et les groupe dans
-- `services/consommation-ia.js` : c'est là que vivent l'axe, les pas vides, les
-- libellés et le tarif. Rien de cela ne descend ici, et il ne faut surtout pas
-- l'y recopier (règle 4) : un second barème diverge de la facture au premier
-- tarif relevé.
--
-- Ce qui est ici est une **réduction de volume**, pas une seconde définition :
-- `date_trunc` ramène chaque appel au début de son pas, et l'on somme les
-- jetons par pas et par modèle. L'axe reste au JavaScript, qui reçoit alors des
-- lignes déjà au bon pas — et les regrouper une seconde fois au même pas ne
-- change rien, puisque le début d'un pas se tronque en lui-même. C'est ce que
-- vérifie l'épreuve des deux bouts.
--
-- **Par modèle, et c'est nécessaire.** Le coût dépend du modèle ; sommer les
-- jetons de deux modèles rendrait un total qu'aucun tarif ne sait convertir.

create or replace function public.la_consommation_dun_compte(
  p_compte uuid,
  p_du date,
  p_au date,
  p_pas text default 'day'
)
returns table (
  le timestamptz,
  model text,
  entree bigint,
  sortie bigint,
  combien bigint
)
language plpgsql
-- Journalise son accès : donc `volatile` (voir `les_comptes_de_mdall`).
volatile
security definer
set search_path = public, auth
as $$
declare
  v_pas text := lower(btrim(coalesce(p_pas, 'day')));
begin
  perform public.la_porte_de_la_console(
    'utilisateurs/consommation',
    format('compte=%s du=%s au=%s pas=%s', p_compte, p_du, p_au, v_pas)
  );

  -- **Trois pas, et pas un de plus.** `date_trunc` accepte bien d'autres mots,
  -- et laisser passer celui qu'on reçoit reviendrait à laisser l'appelant
  -- choisir une granularité que l'axe du JavaScript ne sait pas dessiner.
  if v_pas not in ('day', 'month', 'year') then
    raise exception 'pas inconnu : %', v_pas;
  end if;

  if p_compte is null or p_du is null or p_au is null then
    return;
  end if;

  return query
  select
    date_trunc(v_pas, u.created_at) as le,
    coalesce(u.model, '') as model,
    -- **`null` n'est pas zéro.** Un appel dont le fournisseur n'a rien annoncé
    -- ne vaut pas zéro jeton : il vaut « on ne sait pas », et l'écran le dit à
    -- part. Un pas où aucun appel n'a de décompte rend donc `null`, et non 0.
    sum(u.input_tokens)::bigint as entree,
    sum(u.output_tokens)::bigint as sortie,
    count(*)::bigint as combien
  from public.ai_usages u
  where u.owner_id = p_compte
    and u.created_at >= p_du::timestamptz
    and u.created_at < (p_au + 1)::timestamptz
  group by 1, 2
  order by 1 asc;
end;
$$;

comment on function public.la_consommation_dun_compte(uuid, date, date, text) is
  'Les jetons d''un compte, groupés par pas et par modèle. Le tarif et l''axe restent au JavaScript : ici, une réduction de volume.';

revoke all on function public.la_consommation_dun_compte(uuid, date, date, text) from public;
grant execute on function public.la_consommation_dun_compte(uuid, date, date, text) to authenticated;
