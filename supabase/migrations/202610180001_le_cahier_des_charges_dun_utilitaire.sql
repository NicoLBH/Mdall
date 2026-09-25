-- Le cahier des charges d'un utilitaire se garde avec son texte.
--
-- ## Le problème, tel qu'il s'est posé
--
-- L'écran « Écrire du Mdall » a deux zones : à gauche ce qu'on veut dire ou
-- faire, en français ; à droite le Mdall. La première est le **cahier des
-- charges** — c'est elle qu'on écrit d'abord, elle qu'on relit, elle qu'on
-- corrige quand le résultat ne convient pas.
--
-- L'établi ne gardait que la seconde. Trois cent cinquante lignes de cahier des
-- charges écrites une après-midi, l'utilitaire enregistré, l'onglet fermé : au
-- retour, la zone était vide. Rouvrir pour modifier ne rendait que le code, et
-- le seul bouton qui sache réécrire du Mdall — « Coder » — part de cette
-- zone-là. On y était donc renvoyé sans rien, avec le choix entre réécrire de
-- mémoire ce qu'on avait mis des heures à formuler, ou ne plus y toucher.
--
-- Ce n'était pas un oubli d'affichage : la valeur ne montait pas jusqu'à la
-- base, et il n'y avait rien à restituer.
--
-- ## Sur la version, et non sur la fiche
--
-- Il aurait été plus court de poser une colonne sur `etabli_utilitaires`, à
-- côté du résumé. Ç'aurait été dire que le cahier des charges décrit l'outil en
-- général, alors qu'il décrit **ce qu'on a écrit ce jour-là** : la `v3` répond à
-- son cahier des charges, pas à celui de la `v5`. Relire une version avec
-- l'intention d'une autre, c'est relire deux choses qui ne se correspondent pas
-- — et le croire.
--
-- Conséquence assumée : corriger le cahier des charges sans toucher au Mdall
-- monte d'une version. C'est juste. Ce qu'on a écrit a changé, et la version
-- précédente reste lisible telle qu'elle était.
--
-- ## Pourquoi la fonction est refaite, et non doublée
--
-- `etabli_enregistrer` prend un argument de plus. Ajouté avec une valeur par
-- défaut, il aurait fabriqué une **seconde fonction du même nom** : l'ancienne
-- à cinq arguments, la nouvelle à six, et un appel qui en nomme cinq aurait
-- convenu aux deux — PostgreSQL refuse alors de choisir, et l'enregistrement
-- aurait cessé de marcher sans qu'une ligne de code ait bougé.
--
-- On retire donc l'ancienne signature avant de poser la nouvelle. **Aucune
-- donnée n'est en jeu** : une fonction est du code, et les deux tables ne sont
-- pas touchées.
--
-- Additive : une colonne nouvelle avec sa valeur par défaut, une fonction
-- reposée. Aucune colonne existante n'est modifiée, aucune ligne n'est réécrite.

-- Le cahier des charges tel qu'il était quand cette version a été enregistrée.
-- `default ''` plutôt que `null` : les versions déjà posées n'en ont pas, et
-- « pas de cahier des charges » se lit comme une zone vide, non comme une
-- inconnue qu'il faudrait aller chercher ailleurs.
alter table public.etabli_versions
  add column if not exists dit text not null default '';

comment on column public.etabli_versions.dit is
  'Ce que l''auteur voulait dire ou faire, en français : le cahier des charges de cette version. Vide pour les versions enregistrées avant qu''on le garde.';

drop function if exists public.etabli_enregistrer(text, jsonb, uuid, text, text);

/**
 * Poser un utilitaire sur l'établi, ou l'y reprendre.
 *
 * Sans `p_id`, il entre en `v1`. Avec, sa fiche est reprise et — **seulement si
 * ce qu'on a écrit a changé** — il monte d'une version. Ce qu'on a écrit, c'est
 * le Mdall **et** le cahier des charges : enregistrer deux fois la même chose ne
 * fabrique pas deux versions, on relirait deux fois la même sans savoir laquelle
 * regarder.
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
  p_rayon text default 'exploration',
  p_dit text default ''
)
returns public.etabli_utilitaires
language plpgsql
security invoker
set search_path = public
as $$
declare
  ligne public.etabli_utilitaires;
  derniere jsonb;
  dernier_dit text;
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

    insert into public.etabli_versions (utilitaire_id, version, fichiers, dit)
    values (ligne.id, 1, p_fichiers, coalesce(p_dit, ''));

    return ligne;
  end if;

  select * into ligne from public.etabli_utilitaires u where u.id = p_id;
  if ligne.id is null then
    return null;
  end if;

  select v.fichiers, v.dit into derniere, dernier_dit
  from public.etabli_versions v
  where v.utilitaire_id = ligne.id
  order by v.version desc
  limit 1;

  if derniere is distinct from p_fichiers
     or coalesce(dernier_dit, '') is distinct from coalesce(p_dit, '') then
    update public.etabli_utilitaires u
       set nom = btrim(p_nom),
           resume = coalesce(p_resume, ''),
           rayon = coalesce(p_rayon, 'exploration'),
           version = u.version + 1,
           updated_at = now()
     where u.id = ligne.id
    returning * into ligne;

    insert into public.etabli_versions (utilitaire_id, version, fichiers, dit)
    values (ligne.id, ligne.version, p_fichiers, coalesce(p_dit, ''));
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

revoke all on function public.etabli_enregistrer(text, jsonb, uuid, text, text, text) from public;
grant execute on function public.etabli_enregistrer(text, jsonb, uuid, text, text, text) to authenticated;
