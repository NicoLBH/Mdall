-- Reprendre une situation que personne n'a.
--
-- ## La promesse qu'on avait faite, et jamais tenue
--
-- L'étape 1 du cloisonnement a laissé une exception nommée : les situations
-- écrites avant elle n'ont pas de propriétaire. Elles se lisent — leur projet
-- les voyait la veille — mais ne se réécrivent pas, et l'écran le dit depuis :
--
--   « Cette situation a été créée avant que les situations ne deviennent
--     personnelles : elle n'appartient à personne. **Reprenez-la** pour pouvoir
--     la modifier. »
--
-- Il n'y avait aucun moyen de la reprendre. La règle de modification exige
-- `owner_id = auth.uid()` **avant** l'écriture : une ligne sans propriétaire
-- n'est modifiable par personne, pas même pour se l'attribuer. Sur un carnet
-- qui ne contient que des situations d'avant, cela veut dire qu'aucun geste
-- n'est possible — ni épingler, ni effacer, ni modifier.
--
-- ## Pourquoi une fonction, et pas une règle élargie
--
-- On aurait pu relâcher la règle de modification — « les miennes, ou celles
-- sans propriétaire ». Elle aurait alors autorisé **toutes** les écritures sur
-- une ligne orpheline, du moment qu'on la marque sienne au passage : changer un
-- titre et se l'attribuer dans le même mouvement, par exemple.
--
-- Cette fonction n'autorise qu'**une seule transition** : de personne à moi.
-- Rien d'autre ne bouge — ni le titre, ni la requête, ni l'état. Reprendre est
-- une décision, pas une occasion.
--
-- Elle s'exécute avec les droits de son propriétaire pour pouvoir écrire là où
-- la règle refuse, et c'est pour cela que ses deux conditions sont dans le
-- corps : `owner_id is null` — on ne reprend pas celle d'un autre — et
-- `auth.uid() is not null` — on ne reprend pas au nom de personne.
--
-- Elle rend l'identifiant repris, ou rien : l'appelant sait si le geste a eu
-- lieu, plutôt que de le supposer.
--
-- Strictement additive : une fonction, et son droit d'exécution. Aucune donnée
-- déplacée, aucune colonne retirée, **aucune règle élargie**.

create or replace function public.reprendre_la_situation(situation uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  update public.situations
     set owner_id = auth.uid()
   where id = situation
     and owner_id is null
     and auth.uid() is not null
  returning id;
$$;

revoke all on function public.reprendre_la_situation(uuid) from public;
grant execute on function public.reprendre_la_situation(uuid) to authenticated;

comment on function public.reprendre_la_situation(uuid) is
  'Marque sienne une situation d''avant le cloisonnement, et rien d''autre. Seule transition permise : de personne à moi. Rend l''identifiant repris, ou rien.';
