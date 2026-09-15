-- Une situation dit ce qu'elle retient par sa requête, et par elle seule.
--
-- ## Ce qu'on démonte
--
-- Une situation « automatique » retenait ses sujets par un `filter_definition` :
-- un objet jsonb avec des listes d'identifiants, lu par une fonction de
-- correspondance écrite pour lui seul. Une situation « manuelle » tenait une
-- liste à la main. À côté, l'onglet Sujets avait une grammaire de requête qu'on
-- lit, qu'on corrige et qu'on voit s'appliquer pendant qu'on l'écrit.
--
-- **C'étaient deux fois la même chose**, et c'est la seconde qu'on garde
-- (règle 10). `situations.requete`, posée à l'étape 1, est désormais la seule
-- chose qui dit ce qu'une situation retient.
--
-- Voir `docs/le-carnet-prend-la-forme-des-sujets.md`, étape 4.
--
-- ## Pourquoi les colonnes restent
--
-- Elles portent ce que des situations retiennent **aujourd'hui**. Les effacer
-- viderait des listes que des gens regardent tous les matins, sans que personne
-- l'ait demandé : un constat ne devient jamais faux (règle 6).
--
-- Elles ne sont plus écrites. `requete-dun-filtre.js` reprend un ancien filtre
-- en requête, **et vérifie sa reprise en la relisant** avec l'analyseur de la
-- barre : ce qui ne revient pas identique est nommé, et la situation continue
-- alors de passer par l'ancienne correspondance plutôt que par une requête qui
-- en dirait moins.
--
-- ## Pourquoi cette migration n'efface rien
--
-- Un `drop column` est irréversible et immédiat : la version du navigateur
-- déjà ouverte chez quelqu'un continuerait de demander ces colonnes, et
-- l'écran des situations tomberait en 400 au milieu de sa journée. Ce qui est
-- écrit ici est ce que la base sait d'elle-même — de quoi qu'un jour on les
-- retire en sachant ce qu'on retire.
--
-- Strictement additive : deux commentaires de colonne, et rien d'autre. Aucune
-- donnée déplacée, aucune colonne retirée, aucune règle changée.

comment on column public.situations.mode is
  'Obsolète depuis l''étape 4 : plus rien ne l''écrit. Une situation dit ce qu''elle retient par `requete`. Lu uniquement pour distinguer une situation d''avant qui portait un `filter_definition` (automatic) d''une qui tenait sa liste à la main (manual).';

comment on column public.situations.filter_definition is
  'Obsolète depuis l''étape 4 : plus rien ne l''écrit. Repris en requête par `requete-dun-filtre.js`, qui vérifie sa reprise en la relisant. Conservé parce que des situations le portent encore, et qu''une reprise incomplète les laisse passer par lui plutôt que par une requête qui en dirait moins.';

comment on column public.situations.requete is
  'Ce que la situation retient, dans la grammaire de recherche des sujets. Seule source depuis l''étape 4 : la requête et `filter_definition` ne s''appliquent jamais ensemble, sinon une situation retiendrait l''intersection de deux règles dont une seule est visible à l''écran.';
