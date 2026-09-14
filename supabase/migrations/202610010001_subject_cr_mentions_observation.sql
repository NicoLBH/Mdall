-- Ce qu'un compte rendu **dit** du point qu'il reprend.
--
-- ## Le défilé de commentaires
--
-- Chaque reprise écrivait un commentaire dans le fil du sujet : « CR n° 11 du
-- 2025-08-06 reporte ce point », puis le n° 13, puis le n° 15. Sur un point qui
-- traîne depuis dix réunions, la discussion devient un journal de machine où
-- l'on ne retrouve plus ce que les gens, eux, ont écrit.
--
-- Un compte rendu qui reprend un point n'est pas quelqu'un qui prend la parole :
-- c'est un **fait**, et un fait se dit dans la ligne d'activité, pas dans la
-- conversation. C'est déjà ce que `subject_cr_mentions` enregistre.
--
-- ## Ce qui manquait pour s'en passer
--
-- La table savait *qu'il* y avait eu reprise, et dans quel état le point était.
-- Elle ne gardait pas **ce que le compte rendu en écrit**, mot pour mot — et
-- c'est précisément ce que le commentaire portait. Sans cela, remplacer le
-- commentaire par une ligne d'activité aurait perdu la seule chose qui s'y
-- lisait vraiment.
--
-- Avec l'observation, la ligne dit mieux que le commentaire ne disait : dix
-- reprises qui redisent la même phrase se lisent en une ligne — « observation
-- présente dans les comptes rendus n° 8, 9 et 10 » — au lieu de dix messages
-- identiques. Le regroupement se calcule à la lecture
-- (`services/reprise-sans-changement.js`) : figer la phrase ici ferait que le
-- jour où elle se dit mieux, les anciennes garderaient l'ancienne formulation
-- (`docs/fondamentaux.md`, règle 4).
--
-- ## `page` : pour pouvoir vérifier
--
-- Une ligne qu'on ne peut pas remonter à son document finit par n'être plus
-- crue. `document_id` disait déjà lequel ; la page dit **où**, et c'est elle qui
-- permet d'ouvrir le compte rendu à l'endroit exact. Nulle quand la lecture ne
-- l'a pas retenue : ne pas savoir se dit, et le lien mène alors au document
-- sans prétendre à une page (règle 5).
--
-- ## Strictement additive
--
-- Deux colonnes ajoutées avec une valeur par défaut. Les lignes déjà écrites
-- restent valides : leur observation est vide, et la ligne d'activité se
-- contente alors de dire que le compte rendu a repris le point — ce qu'elle
-- disait déjà.

alter table public.subject_cr_mentions
  add column if not exists observation text not null default '';

alter table public.subject_cr_mentions
  add column if not exists page integer;

comment on column public.subject_cr_mentions.observation is
  'Ce que le compte rendu écrit de ce point, mot pour mot, au moment de la reprise. Vide quand la lecture n''a rien retenu. La phrase affichée se calcule à la lecture : voir services/reprise-sans-changement.js.';

comment on column public.subject_cr_mentions.page is
  'La page du compte rendu où le point est repris, pour pouvoir l''y vérifier. Nulle quand la lecture ne l''a pas retenue.';
