-- Une vue **enregistrée** et une vue **épinglée** ne sont pas la même chose.
--
-- ## Ce qui n'allait pas
--
-- Toute vue enregistrée apparaissait au rail. Le rail est haut de dix entrées
-- avant de devoir défiler ; l'écran des vues, lui, en montre cinquante sans
-- gêne. Les deux confondus, enregistrer une vue coûtait une place dans la
-- barre de gauche — si bien qu'on finissait par ne plus en enregistrer, ce qui
-- est exactement l'inverse de ce qu'on voulait.
--
-- Ce sont donc deux gestes : on **enregistre** une recherche pour la retrouver
-- sur son écran, et on **épingle** celles auxquelles on revient tous les jours
-- pour les avoir sous la main.
--
-- ## Pourquoi une colonne, et pas une seconde table
--
-- C'est un attribut de la vue, pas une chose de plus. Une seconde table aurait
-- dupliqué la politique de sécurité — propriétaire seul dans les deux sens —,
-- et c'est sur la sécurité que deux écritures finissent par diverger
-- (`docs/fondamentaux.md`, règle 10).
--
-- ## Faux par défaut, et c'est un choix
--
-- Une vue qu'on vient d'enregistrer ne s'impose pas au rail : on la met là
-- quand on a constaté qu'on y revient. Les lignes déjà écrites prennent donc
-- `false` — elles restent lisibles sur l'écran des vues, où elles ont toujours
-- été, et leur propriétaire épingle celles qu'il veut voir.
--
-- Les épingles de la Mémoire ne lisent pas cette colonne : leur surface n'a pas
-- d'écran de vues, et leur rail les montre toutes comme avant.
--
-- Strictement additive : aucune colonne existante n'est modifiée.

begin;

alter table public.memory_pinned_searches
  add column if not exists rail boolean not null default false;

comment on column public.memory_pinned_searches.rail is
  'Cette vue est-elle épinglée au rail ? Enregistrer et épingler sont deux gestes distincts.';

commit;
