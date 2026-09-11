-- Une personne peut être connue sans adresse électronique.
--
-- ## Ce qui manquait, et ce que ça coûtait
--
-- `directory_people.email` était obligatoire. C'était juste tant qu'une seule
-- porte existait : on ajoute quelqu'un au projet en tapant son adresse, pour
-- l'inviter à se connecter.
--
-- Les comptes rendus de chantier ouvrent une seconde porte, et elle ne donne
-- pas d'adresse. Un compte rendu nomme les entreprises et les personnes —
-- « Lot 02 — GROS ŒUVRE — SARL Alpha », « Présents : M. A. » — et c'est tout.
-- Il n'écrit pas de courriel, et quand il en écrit un, ce n'est pas le nôtre à
-- prendre.
--
-- Sans cette relaxation, il ne restait que deux voies, toutes deux mauvaises :
--
-- - **inventer une adresse** — `alpha@chantier.invalid`. Une identité fausse
--   dans un annuaire de personnes réelles, qui finirait par recevoir du
--   courrier ou par entrer en collision avec une vraie ;
-- - **ne pas les ajouter du tout**, et laisser les sujets sans destinataire —
--   c'est-à-dire renoncer à suivre un point d'une réunion à l'autre, ce qui est
--   la raison d'être de toute cette chaîne.
--
-- ## Ce qu'une personne sans adresse peut, et ne peut pas
--
-- Elle existe dans la liste du projet, on lui assigne des points, on filtre sur
-- ce qui lui revient. Elle **ne peut pas** être invitée à se connecter : il n'y
-- a nulle part où envoyer l'invitation, et c'est très bien — elle n'a rien
-- demandé. Le jour où elle ouvre un compte, son adresse s'ajoute et la ligne se
-- rattache.
--
-- Ne pas savoir n'autorise pas à prétendre le contraire (règle 5) : une adresse
-- absente s'écrit `null`, jamais une adresse plausible.
--
-- ## L'unicité tient toujours
--
-- `directory_people_email_normalized_unique` reste en place. PostgreSQL
-- considère deux `null` comme distincts dans un index unique : plusieurs
-- personnes sans adresse cohabitent, et deux personnes qui en ont une ne
-- peuvent toujours pas partager la même.
--
-- Additive : aucune colonne n'est ajoutée, supprimée ni renommée, et aucune
-- ligne existante ne devient invalide — toutes portent déjà une adresse.

alter table public.directory_people
  alter column email drop not null;

comment on column public.directory_people.email is
  'L''adresse de la personne, ou null quand on ne la connaît pas — une personne relevée dans un compte rendu de chantier en est dépourvue. Une adresse absente ne s''invente pas.';
