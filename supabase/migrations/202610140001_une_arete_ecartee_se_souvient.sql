-- Une arête écartée se souvient qu'elle l'a été.
--
-- ## Le défaut, et pourquoi il se voit à la troisième fois
--
-- Écarter une arête reconnue **effaçait la ligne**. Rien ne gardait donc trace
-- du refus : à la reconnaissance suivante — un versement, un sujet qui naît —
-- le même rapprochement se reproposait, à l'identique, et il fallait l'écarter
-- de nouveau.
--
-- Crier au loup fait ignorer l'alerte au bout de trois fois. C'est déjà la
-- raison pour laquelle Mdall ne dit jamais « caduc », et c'est exactement ce
-- qui serait arrivé ici : au troisième « le sujet « … » porterait sur cette
-- valeur » qu'on a déjà refusé, on cesse d'ouvrir la Mémoire.
--
-- Proposer sans mémoire du refus est donc pire que ne pas proposer. C'est le
-- préalable technique à tout déclenchement automatique de la reconnaissance.
--
-- ## Écarter est un constat, pas une suppression
--
-- Un refus est une information : quelqu'un a regardé ce rapprochement et a dit
-- non, à une date. Un constat ne devient pas faux (`docs/fondamentaux.md`,
-- règle 6) — il se garde. La ligne reste donc, marquée.
--
-- Et elle garde `declared_by` : « posée par Ourdine Ferrand le 12 mars, écartée
-- le 3 avril » se relit ; effacer l'auteur en écartant ferait disparaître le
-- fait qu'elle avait été confirmée.
--
-- ## Deux colonnes, et l'unicité qui les rend utiles
--
-- `unique (subject_id, assertion_id)` existait déjà : une ligne écartée occupe
-- donc la place, et une reconnaissance qui repasse ne peut pas la remplacer.
-- Le refus tient tout seul, sans que la reconnaissance ait à consulter quoi que
-- ce soit — elle envoie ses lignes en `ignore-duplicates`, et celle-là est
-- ignorée.
--
-- Ce qui suit est **strictement additif** : deux colonnes facultatives. Rien de
-- ce qui existe ne change de forme, et une lecture qui ne les connaît pas
-- continue de fonctionner — elle montrera simplement des arêtes écartées, ce
-- qui est l'état d'avant cette migration.

alter table public.subject_assertion_links
  add column if not exists ecarte_le timestamptz;

alter table public.subject_assertion_links
  add column if not exists ecarte_par uuid references auth.users(id);

-- Ce qu'on lit presque toujours : les arêtes qui valent encore, pour un projet.
-- Un index partiel plutôt qu'un index sur la colonne : les écartées ne sont
-- jamais cherchées pour elles-mêmes, elles ne servent qu'à bloquer la place.
create index if not exists subject_assertion_links_vivantes_idx
  on public.subject_assertion_links (project_id)
  where ecarte_le is null;
