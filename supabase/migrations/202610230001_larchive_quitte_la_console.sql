-- L'archive quitte la console : les trois tables et leur casier s'en vont.
--
-- POURQUOI ON RETIRE CE QU'ON VIENT D'ÉCRIRE
--
-- La console avait construit sa propre chaîne : déposer des `.msg`, en tirer
-- des messages et des pièces, les ranger dans trois tables à elle, et lire un
-- épisode de cet ensemble. C'était une **seconde application**, avec ses
-- écrans, son casier et sa mémoire — et l'application, elle, savait déjà tout
-- faire. Ce qui manquait n'était pas un atelier : c'était de pouvoir verser
-- deux cents mails d'un coup dans un projet (`docs/nourrir-mdall.md`, § 8
-- quinquies).
--
-- Le dépouillement rejoint donc Fichiers, et l'épisode rejoint les
-- Indicateurs. Ces trois tables n'ont plus personne pour les lire, et une table
-- que rien ne lit finit par contenir une vérité qu'on croit encore.
--
-- ON NE VÉRIFIE PAS QU'ELLES SONT VIDES, ET C'EST UNE DÉCISION PRISE
--
-- La note du § 8 quinquies prévoyait de le vérifier. Le propriétaire de la base
-- a levé la réserve : lui seul y a versé, quelques messages d'essai, sans
-- valeur. Un `drop` conditionnel aurait ici laissé la migration échouer sur des
-- lignes dont on sait déjà qu'on n'en veut pas, et une migration qui échoue à
-- moitié laisse un schéma qu'on ne sait plus décrire.
--
-- CE QUE CETTE MIGRATION N'EST PAS
--
-- Elle n'est pas additive, et c'est assumé : elle **retire**. La règle
-- additive protège une donnée dont quelqu'un dépend. Ici personne n'en dépend,
-- et la garder coûterait plus que de la perdre — un casier ouvert de plus à
-- surveiller, trois tables de plus à expliquer.

-- 1. Le lien d'abord. Il pointe vers les deux autres : le supprimer en dernier
--    obligerait à une cascade, et une cascade emporte ce qu'on n'a pas nommé.
drop policy if exists pieces_des_messages_administrateur_select on public.pieces_des_messages;
drop policy if exists pieces_des_messages_administrateur_insert on public.pieces_des_messages;
drop table if exists public.pieces_des_messages;

drop policy if exists messages_archives_administrateur_select on public.messages_archives;
drop policy if exists messages_archives_administrateur_insert on public.messages_archives;
drop table if exists public.messages_archives;

drop policy if exists pieces_archivees_administrateur_select on public.pieces_archivees;
drop policy if exists pieces_archivees_administrateur_insert on public.pieces_archivees;
drop table if exists public.pieces_archivees;

-- 2. Le casier. Les objets d'abord : un casier ne se supprime pas tant qu'il
--    porte quelque chose, et l'erreur qu'on obtiendrait alors ne dirait pas
--    quoi.
delete from storage.objects where bucket_id = 'archives';

drop policy if exists storage_archives_administrateur_select on storage.objects;
drop policy if exists storage_archives_administrateur_insert on storage.objects;

delete from storage.buckets where id = 'archives';

-- 3. `est_administrateur()` part aussi, et il a fallu le vérifier pour le dire.
--
--    Elle avait l'air d'un bien commun — « la porte de la console s'en sert ».
--    Non : la porte se lit en JavaScript par un `select` borné sur la table des
--    administrateurs (`la-porte-de-la-console-supabase.js`), et les quatre
--    politiques de l'archive étaient ses seuls appelants. Elle n'en a plus
--    aucun.
--
--    Une fonction `security definer` que rien n'appelle est le pire des deux
--    mondes : elle ne sert à personne, et elle contourne une politique de
--    lecture. Le jour où quelqu'un la retrouvera, il la croira éprouvée. Sa
--    définition est dans l'historique ; la table des administrateurs, elle,
--    reste intacte.
drop function if exists public.est_administrateur();
