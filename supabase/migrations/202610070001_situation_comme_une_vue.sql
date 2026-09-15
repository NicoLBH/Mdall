-- Une situation est une vue : une icône, une couleur, une requête.
--
-- ## Deux fois la même chose
--
-- L'écran des situations a grandi seul. Il a son vocabulaire — « mode manuel »,
-- « mode automatique », un `filter_definition` en jsonb — pendant que l'onglet
-- Sujets se dotait de vues qu'on épingle avec une icône et une couleur, et
-- d'une grammaire de requête qu'on lit et qu'on corrige au clavier.
--
-- **Ce sont deux fois la même chose.** Le « mode automatique » est une requête
-- qui n'ose pas dire son nom, et le « mode manuel » une liste qu'on tient à la
-- main. Deux écrans qui font la même chose divergent — on l'a vu à chaque étape
-- du plan précédent : un compte qui ment ici et pas là, un filtre réparé d'un
-- côté seulement.
--
-- Voir `docs/le-carnet-prend-la-forme-des-sujets.md`, étape 1.
--
-- ## Le même geste qu'avec les recherches épinglées
--
-- Elles sont devenues des vues exactement ainsi (`202609270001`) : une colonne
-- pour l'icône, une pour la couleur. On reprend les mêmes noms de colonnes, et
-- les mêmes jeux fermés de valeurs — celles de `vues-des-sujets.js`.
--
-- Ni l'icône ni la couleur ne sont contraintes en base : ce sont des clés d'un
-- jeu qui vit dans le code, et une contrainte ici obligerait à migrer la base
-- pour ajouter une icône. C'est la décision prise pour les vues ; elle vaut ici
-- pour la même raison.
--
-- ## `mode` et `filter_definition` restent
--
-- Un constat ne devient pas faux (règle 6) : des situations s'en servent
-- aujourd'hui. La requête les remplacera quand elle saura dire ce qu'ils
-- disent — c'est l'étape 4 du plan. D'ici là elle est ce qu'on lit en premier,
-- et le reste sert de repli.
--
-- Une situation qui perdrait son filtre sans que sa requête le reprenne
-- changerait de contenu sans que personne l'ait demandé.
--
-- Strictement additive : trois colonnes, aucune touchée.

alter table public.situations
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists requete text;

comment on column public.situations.icon is
  'La clé d''une icône du jeu fermé du code (vues-des-sujets.js) — bookmark, people, clock-fill… Vide : celle par défaut.';

comment on column public.situations.color is
  'La clé d''une couleur de la liste fermée du code — gris, bleu, vert… Vide : celle par défaut.';

comment on column public.situations.requete is
  'Ce que la situation retient, dans la grammaire des sujets : « assigné:moi label:cr-chantier ». Remplace filter_definition, qui reste tant que la requête ne sait pas tout dire.';
