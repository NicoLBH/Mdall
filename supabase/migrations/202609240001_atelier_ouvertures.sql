-- Combien de fois chaque utilitaire de l'Atelier a été ouvert.
--
-- ## Le problème
--
-- La vitrine met six utilitaires en avant. Lesquels ? Ils étaient **déclarés**
-- dans le code : quelqu'un décidait une fois pour toutes ce qui compte, et la
-- liste vieillissait sans que personne ne s'en aperçoive. Un utilitaire ajouté
-- et beaucoup employé restait invisible ; un utilitaire mis en avant et jamais
-- ouvert gardait sa place.
--
-- Les vedettes se **comptent** donc, sur tous les projets et tous les
-- utilisateurs : ce que la profession ouvre le plus est une donnée, pas une
-- opinion.
--
-- ## Ce qu'on ne garde pas, et c'est délibéré
--
-- **Ni qui, ni quand, ni sur quel projet.** Un compteur par utilitaire, et rien
-- d'autre. Savoir que telle personne a ouvert tel outil douze fois cette
-- semaine n'est utile à aucune décision de Mdall, et ce serait une donnée de
-- surveillance qu'il faudrait ensuite protéger, expliquer et justifier.
--
-- On garde le strict nécessaire au classement : une cible, un nombre. Une ligne
-- de cette table ne peut désigner personne.
--
-- ## Pourquoi un compteur et pas une ligne par ouverture
--
-- Une ligne par ouverture donnerait des millions de lignes pour produire treize
-- nombres, et il faudrait les agréger à chaque affichage de la vitrine. Le
-- compteur se lit en une requête de treize lignes.
--
-- La contrepartie — on perd l'historique — est ici un avantage : sans dates, il
-- n'y a rien à recouper avec autre chose.
--
-- ## Pourquoi une fonction, et pas un `update` depuis le navigateur
--
-- Incrémenter demande de lire puis d'écrire. Deux clients qui ouvrent le même
-- utilitaire en même temps liraient la même valeur et l'écriraient tous les
-- deux : une ouverture serait perdue. `+ 1` fait par la base est atomique.
--
-- Et la fonction **n'accepte que l'incrément** : le navigateur ne peut pas
-- poser un compteur à mille, ce qu'un `update` ouvert permettrait.
--
-- Additive : nouvelle table, nouvelle fonction, aucune colonne existante
-- n'est modifiée.

create table if not exists public.atelier_ouvertures (
  -- La cible de navigation de l'utilitaire, telle que le catalogue la nomme.
  -- C'est déjà son identifiant partout ailleurs ; en inventer un second ici
  -- ferait deux noms pour une seule chose.
  cible text primary key,

  ouvertures bigint not null default 0,

  -- Quand le compteur a bougé pour la dernière fois. Ce n'est pas une trace
  -- d'usage — elle ne dit ni qui ni quoi — mais elle permet de voir qu'un
  -- utilitaire n'est plus ouvert du tout.
  derniere_le timestamptz not null default now()
);

alter table public.atelier_ouvertures enable row level security;

-- **Tout le monde lit.** Le classement est le même pour tous : c'est ce que la
-- profession ouvre le plus, et le cacher à celui qui le nourrit n'aurait aucun
-- sens. Il n'y a rien de personnel dans ces lignes.
drop policy if exists "atelier_ouvertures_lecture" on public.atelier_ouvertures;
create policy "atelier_ouvertures_lecture"
on public.atelier_ouvertures
for select
to authenticated
using (true);

-- **Personne n'écrit directement.** L'écriture passe par la fonction, qui ne
-- sait qu'ajouter un. Sans cette restriction, un client pourrait poser
-- n'importe quel nombre et le classement ne voudrait plus rien dire.

/**
 * Noter qu'un utilitaire vient d'être ouvert.
 *
 * `security definer` parce que la table n'accepte aucune écriture directe :
 * c'est la fonction qui détient le droit, et elle ne fait qu'ajouter un.
 */
create or replace function public.atelier_noter_ouverture(p_cible text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Une cible vide ou absurde ne crée pas de ligne : le compteur ne doit pas
  -- se remplir d'entrées que le catalogue ne connaît pas.
  if p_cible is null or length(trim(p_cible)) = 0 or length(p_cible) > 120 then
    return;
  end if;

  insert into public.atelier_ouvertures (cible, ouvertures, derniere_le)
  values (trim(p_cible), 1, now())
  on conflict (cible) do update
    set ouvertures = public.atelier_ouvertures.ouvertures + 1,
        derniere_le = now();
end;
$$;

revoke all on function public.atelier_noter_ouverture(text) from public;
grant execute on function public.atelier_noter_ouverture(text) to authenticated;

comment on table public.atelier_ouvertures is
  'Combien de fois chaque utilitaire de l''Atelier a été ouvert, tous projets et tous utilisateurs confondus. Ni qui, ni quand, ni sur quel projet : une ligne ne peut désigner personne.';
