-- Le vocabulaire de la mémoire : ce qu'une affirmation **est**, et de quoi elle parle.
--
-- La mémoire ne connaissait qu'une chose : d'où vient une affirmation — un avis,
-- un document, un rattachement. Elle ignorait **comment elle se comporte**, et
-- c'est ce qui empêche d'y ranger un CCTP ou une étude de sol : un article du
-- PLU et une réserve de chantier ne se lèvent pas, ne se datent pas et ne se
-- remplacent pas de la même façon.
--
-- `nature` répond à « comment cette affirmation se comporte-t-elle ? ». Quatre
-- valeurs, et chacune se conduit autrement :
--
--   constat     — un avis, une remarque de CR, un désordre : daté, ponctuel,
--                 il se lève ou il s'aggrave ;
--   hypothese   — zone de neige, portance du sol, classement incendie : **une
--                 seule valeur à la fois**, et ce qui en découle devient faux
--                 quand elle change ;
--   contrainte  — un article du PLU, une règle PMR, une clause de notice :
--                 permanente, datée par un tiers, elle se **vérifie** et ne se
--                 lève pas ;
--   intendance  — un document entré au corpus, une affaire rattachée : ce que
--                 le projet a rangé, pas ce qu'il affirme.
--
-- `domain` répond à « de quoi parle-t-elle ? ». Les domaines viennent du métier,
-- pas de nous : structure, incendie, acoustique, thermique, accessibilite, sol,
-- urbanisme, environnement. Ils sont stables depuis trente ans et communs à tous
-- les intervenants — c'est ce qui en fait une hiérarchie utilisable.
--
-- **Les deux colonnes sont nullables, et c'est la décision centrale.** Un
-- domaine deviné est pire qu'un domaine absent : si le rattrapage classait les
-- affirmations existantes au jugé, une lecture « tout l'incendie » aurait l'air
-- complète en étant fausse, et personne ne pourrait s'en apercevoir. Ce qu'on ne
-- sait pas s'écrit `null`, se lit « non classé », et se compte comme tel à
-- l'écran.
--
-- La nature, elle, se déduit sans rien inventer : un avis est un constat, un
-- document et un rattachement relèvent de l'intendance. Cette déduction se fait
-- **à la lecture**, sur les lignes déjà écrites, plutôt que par une reprise en
-- base : ce qui se recalcule n'a pas à être conservé, et une reprise qui touche
-- trois cents lignes pour y écrire ce qu'on sait déjà dire est une occasion de
-- se tromper sans retour.
--
-- Additive : aucune colonne existante n'est modifiée ni supprimée, et les
-- affirmations déjà versées restent lisibles telles quelles.

alter table public.project_assertions
  add column if not exists nature text;

alter table public.project_assertions
  add column if not exists domain text;

-- Filtrer par domaine est le geste de l'écran : on le rend possible sans
-- parcourir toute la mémoire d'un projet.
create index if not exists project_assertions_domain_idx
  on public.project_assertions (project_id, domain);

create index if not exists project_assertions_nature_idx
  on public.project_assertions (project_id, nature);
