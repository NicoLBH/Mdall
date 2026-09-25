-- L'établi : les utilitaires qu'on écrit soi-même, et qu'on garde.
--
-- ## Le problème
--
-- L'écran « Écrire du Mdall » savait écrire, colorer, vérifier et lancer. Il ne
-- savait pas garder : on fermait l'onglet, et une demi-heure de travail restait
-- dans ce navigateur jusqu'à ce que quelqu'un vide les données du site.
--
-- Personne ne réécrit au projet suivant la règle qu'il vient d'écrire. Il la
-- recopie dans un fichier texte, et six mois plus tard on ne sait plus laquelle
-- des trois copies fait foi (`docs/fondamentaux.md`, règle 4).
--
-- ## Il n'appartient à aucun projet, et c'est la décision
--
-- **Aucune colonne `project_id`, nulle part.** Ce n'est pas un oubli : un
-- utilitaire de l'établi paraît dans tous les projets de son propriétaire,
-- parce qu'il est à lui et non au chantier. Le rattacher à un projet
-- l'enfermerait dans celui où il a été écrit, et il faudrait ensuite le
-- « copier » d'un projet à l'autre — c'est-à-dire refaire à la main ce que
-- l'établi existe pour éviter.
--
-- C'est aussi ce qui laisse la porte ouverte : le jour où l'on voudra ouvrir
-- l'établi hors de tout projet, il n'y aura rien à défaire. `atelier_ouvertures`
-- est le précédent — une table de l'Atelier qui ne sait ni qui, ni quand, ni
-- sur quel projet.
--
-- **Le seul chemin vers un projet reste la proposition.** Rien d'ici n'entre
-- dans la mémoire d'un chantier : « Proposer au projet » ouvre une proposition,
-- relue ligne à ligne et signée (règle 1).
--
-- ## Il est personnel, et cela se garantit ici
--
-- Un utilitaire écrit à la main dit comment quelqu'un travaille. La politique
-- est celle des recherches épinglées, mot pour mot : **propriétaire seul**,
-- dans les deux sens.
--
--   using       — on ne lit que les siens ;
--   with check  — on n'en écrit que pour soi.
--
-- Sans `with check`, on ne verrait pas l'établi des autres mais on pourrait
-- leur y poser des outils.
--
-- ## Deux tables, parce qu'une version ne se réécrit pas
--
-- L'identité d'un utilitaire bouge — son nom, sa description, son rayon. Son
-- **texte**, non : une version est ce qu'elle était le jour où on l'a
-- enregistrée. C'est ce qui permet de relire la `v1` après avoir écrit la `v3`,
-- et de dire à un projet qui a signé la `v2` que l'établi a avancé.
--
-- Écrire les fichiers dans la table d'identité aurait effacé l'histoire à chaque
-- enregistrement, et « monter de version » n'aurait plus voulu dire grand-chose.
--
-- ## Pourquoi une fonction, et pas deux `insert` depuis le navigateur
--
-- Enregistrer, c'est comparer le texte au précédent, puis écrire dans les deux
-- tables. Fait en trois appels, un échec au milieu laisse un utilitaire dont la
-- version annoncée n'existe pas. La fonction fait le tout ou rien.
--
-- Elle est **`security invoker`** : la politique s'applique à elle comme au
-- reste, et elle ne peut donc pas servir à écrire sur l'établi d'un autre. Une
-- fonction `security definer` aurait été une seconde porte, qu'il aurait fallu
-- garder séparément.
--
-- Additive : deux tables nouvelles, une fonction nouvelle, aucune table ni
-- colonne existante n'est modifiée.

create table if not exists public.etabli_utilitaires (
  id uuid primary key default gen_random_uuid(),

  -- Le seul qui puisse lire cet utilitaire. `default auth.uid()` évite qu'un
  -- appelant distrait écrive une ligne au nom d'un autre : la valeur par défaut
  -- est déjà la bonne, et `with check` refuse toute autre.
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Le nom sous lequel on le retrouve.
  nom text not null check (length(btrim(nom)) > 0),

  -- Ce qu'il fait, en une phrase. Dans six mois, le nom seul ne le dira plus.
  resume text not null default '',

  -- Le rayon de l'Atelier où il se range, tel que le catalogue les nomme.
  rayon text not null default 'exploration',

  -- La version courante : celle de la dernière ligne de `etabli_versions`.
  -- Elle est ici aussi pour qu'une liste d'établi se lise en une requête.
  version integer not null default 1 check (version >= 1),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Deux outils du même nom sur le même établi ne se distinguent plus, et l'on
  -- ne sait pas lequel on rouvre.
  unique (owner_id, nom)
);

comment on table public.etabli_utilitaires is
  'Les utilitaires qu''une personne a écrits en Mdall. Aucun projet : ils sont à elle, et paraissent dans tous ses projets. Rien n''entre dans la mémoire d''un chantier sans une proposition signée.';

create index if not exists etabli_utilitaires_owner_idx
  on public.etabli_utilitaires (owner_id, updated_at desc);

create table if not exists public.etabli_versions (
  id uuid primary key default gen_random_uuid(),

  utilitaire_id uuid not null references public.etabli_utilitaires(id) on delete cascade,

  version integer not null check (version >= 1),

  -- Les fichiers du brouillon, tels qu'ils étaient : `[{nom, contenu}, …]`,
  -- triés par nom. Le tri vient du navigateur et compte : c'est sur cette
  -- valeur qu'on décide si le texte a changé, et deux enregistrements du même
  -- travail dans un ordre différent monteraient une version pour rien.
  fichiers jsonb not null check (jsonb_typeof(fichiers) = 'array'),

  created_at timestamptz not null default now(),

  unique (utilitaire_id, version)
);

comment on table public.etabli_versions is
  'Le texte d''un utilitaire de l''établi, une ligne par version. Une version ne se réécrit jamais : on en ajoute une.';

alter table public.etabli_utilitaires enable row level security;
alter table public.etabli_versions enable row level security;

drop policy if exists "etabli_utilitaires_owner_only" on public.etabli_utilitaires;
create policy "etabli_utilitaires_owner_only"
on public.etabli_utilitaires
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Une version appartient à qui possède l'utilitaire. Elle ne porte pas de
-- propriétaire à elle : deux colonnes pour une seule vérité finiraient par ne
-- plus dire la même chose (règle 4).
drop policy if exists "etabli_versions_owner_only" on public.etabli_versions;
create policy "etabli_versions_owner_only"
on public.etabli_versions
for all
to authenticated
using (
  utilitaire_id in (select u.id from public.etabli_utilitaires u where u.owner_id = auth.uid())
)
with check (
  utilitaire_id in (select u.id from public.etabli_utilitaires u where u.owner_id = auth.uid())
);

/**
 * Poser un utilitaire sur l'établi, ou l'y reprendre.
 *
 * Sans `p_id`, il entre en `v1`. Avec, sa fiche est reprise et — **seulement si
 * son texte a changé** — il monte d'une version. Enregistrer deux fois le même
 * texte ne fabrique pas deux versions : on relirait deux fois la même chose
 * sans savoir laquelle regarder.
 *
 * Le numéro de version se décide **ici et nulle part ailleurs**. Lu puis écrit
 * par le navigateur, deux enregistrements simultanés produiraient deux fois le
 * même numéro, et la contrainte d'unicité ferait échouer le second sans que
 * personne sache pourquoi.
 *
 * Rend la ligne de l'utilitaire, ou rien si `p_id` ne désigne aucun des siens —
 * la politique le cache, et un utilitaire caché n'est pas une erreur à lever,
 * c'est un utilitaire qu'on n'a pas.
 */
create or replace function public.etabli_enregistrer(
  p_nom text,
  p_fichiers jsonb,
  p_id uuid default null,
  p_resume text default '',
  p_rayon text default 'exploration'
)
returns public.etabli_utilitaires
language plpgsql
security invoker
set search_path = public
as $$
declare
  ligne public.etabli_utilitaires;
  derniere jsonb;
begin
  if p_nom is null or length(btrim(p_nom)) = 0 then
    raise exception 'un utilitaire de l''établi porte un nom';
  end if;

  if p_fichiers is null or jsonb_typeof(p_fichiers) <> 'array' or jsonb_array_length(p_fichiers) = 0 then
    raise exception 'un utilitaire de l''établi porte du Mdall';
  end if;

  if p_id is null then
    insert into public.etabli_utilitaires (nom, resume, rayon, version)
    values (btrim(p_nom), coalesce(p_resume, ''), coalesce(p_rayon, 'exploration'), 1)
    returning * into ligne;

    insert into public.etabli_versions (utilitaire_id, version, fichiers)
    values (ligne.id, 1, p_fichiers);

    return ligne;
  end if;

  select * into ligne from public.etabli_utilitaires u where u.id = p_id;
  if ligne.id is null then
    return null;
  end if;

  select v.fichiers into derniere
  from public.etabli_versions v
  where v.utilitaire_id = ligne.id
  order by v.version desc
  limit 1;

  if derniere is distinct from p_fichiers then
    update public.etabli_utilitaires u
       set nom = btrim(p_nom),
           resume = coalesce(p_resume, ''),
           rayon = coalesce(p_rayon, 'exploration'),
           version = u.version + 1,
           updated_at = now()
     where u.id = ligne.id
    returning * into ligne;

    insert into public.etabli_versions (utilitaire_id, version, fichiers)
    values (ligne.id, ligne.version, p_fichiers);
  else
    update public.etabli_utilitaires u
       set nom = btrim(p_nom),
           resume = coalesce(p_resume, ''),
           rayon = coalesce(p_rayon, 'exploration'),
           updated_at = now()
     where u.id = ligne.id
    returning * into ligne;
  end if;

  return ligne;
end;
$$;

revoke all on function public.etabli_enregistrer(text, jsonb, uuid, text, text) from public;
grant execute on function public.etabli_enregistrer(text, jsonb, uuid, text, text) to authenticated;
