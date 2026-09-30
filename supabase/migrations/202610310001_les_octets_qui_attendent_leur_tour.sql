-- Les octets qui attendent leur tour, et que le serveur ne pouvait pas lire.
--
-- CE QUI S'EST PASSÉ AU PREMIER VRAI DÉPÔT
--
-- Six mails déposés. L'écran a dit « 6 fichiers envoyés », la file a montré
-- « Versement de 6 fichiers de messagerie — En cours », puis le journal a
-- affiché, tout en vert :
--
--     Versement de 0 fichier de messagerie — Réussi
--     Rien n'a été versé.
--
-- Aucun mail dans « Fichiers / Mails ». Le serveur n'avait rien reçu.
--
-- LA CAUSE, ET ELLE EST DE MOI
--
-- Depuis `202610230002_le_casier_des_documents_se_garde.sql`, on ne lit un
-- objet du casier `documents` que s'il existe une ligne `documents` qui le
-- désigne :
--
--     using (
--       bucket_id = 'documents'
--       and exists (select 1 from public.documents d
--                    where d.storage_path = storage.objects.name …)
--     )
--
-- C'était juste tant que tout objet du casier était un document rangé. La file
-- a créé une autre sorte d'objet : **des octets bruts qui attendent d'être
-- dépliés**, et qui n'ont, par construction, aucune ligne `documents` — ils
-- n'en auront une qu'après avoir été lus.
--
-- L'écriture passait (elle ne regarde que le premier dossier du chemin), la
-- lecture était refusée. Le serveur téléchargeait six fichiers, recevait six
-- refus, et versait ce qu'il avait : rien. Le dépôt disait vrai — zéro fichier
-- — et c'est l'écran qui mentait en le peignant en vert.
--
-- CE QU'ON OUVRE, ET CE QU'ON N'OUVRE PAS
--
-- Un chemin de file est reconnaissable, et il ne ressemble à rien d'autre :
--
--     <qui dépose>/<projet>/versements/<le versement>/<nom du fichier>
--
-- On autorise donc la lecture d'un objet **dont le premier dossier est le sien**
-- et **dont le troisième dossier est `versements`**. C'est-à-dire : ses propres
-- octets en attente, et rien d'autre.
--
-- Pas « tout ce qui est chez moi » : le reste du casier garde la règle qu'on a
-- posée en octobre — un document ne se lit qu'à travers sa ligne, qui porte
-- elle-même la règle du dossier privé. Ouvrir plus large ici reviendrait à
-- défaire cela pour réparer autre chose.
--
-- Ces octets sont ceux qu'on vient d'envoyer soi-même : les rendre lisibles à
-- leur propre déposant n'ouvre rien qu'il ne possède déjà.
--
-- Strictement additive : une politique remplacée par une qui accorde un cas de
-- plus, nommément.

drop policy if exists storage_documents_select on storage.objects;
create policy storage_documents_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and (
    -- Un document rangé : il se lit à travers sa ligne, qui porte la règle du
    -- dossier privé. C'est la règle d'octobre, et elle ne bouge pas.
    exists (
      select 1
      from public.documents d
      where d.storage_bucket = storage.objects.bucket_id
        and d.storage_path = storage.objects.name
        and d.deleted_at is null
    )
    -- Ou des octets à soi qui attendent d'être versés.
    or (
      (storage.foldername(name))[1] = auth.uid()::text
      and (storage.foldername(name))[3] = 'versements'
    )
  )
);

-- Une fois versés, les octets bruts n'ont plus de raison d'être : leur contenu
-- vit dans les documents rangés. Les effacer demande la même règle que les lire,
-- et la suppression la portait déjà (`storage_documents_delete`, chemin chez
-- soi) : rien à ajouter ici.
