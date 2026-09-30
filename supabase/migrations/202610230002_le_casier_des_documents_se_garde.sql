-- Le casier des documents se garde comme sa table.
--
-- CE QU'ON A TROUVÉ EN CHERCHANT AUTRE CHOSE
--
-- La question posée était : « peut-on ranger les pièces jointes des mails au
-- même niveau de confidentialité que les mails ? ». La réponse est oui, et
-- gratuitement : la confidentialité est portée par le dossier, et
-- `documents_by_project` cache un document rangé dans un dossier privé
-- (`202610160001_le_dossier_des_mails_est_prive.sql`).
--
-- Mais la ligne n'est pas le fichier. Les politiques posées à l'initialisation
-- du casier disaient ceci :
--
--     create policy "storage_documents_select_open" on storage.objects
--     for select to anon, authenticated using (bucket_id = 'documents');
--
-- `to anon`, sans condition. La clé anonyme est dans le navigateur — elle y est
-- par construction. **Donc n'importe qui pouvait lister le casier et
-- télécharger tout ce qu'il contenait**, y compris les `.eml` déjà déposés. La
-- ligne était cachée, les octets étaient ouverts. Pour de la correspondance,
-- c'est exactement le défaut qui discrédite un produit.
--
-- `insert`, `update` et `delete` étaient ouvertes de la même façon : on pouvait
-- aussi bien effacer les fichiers d'un chantier.
--
-- CE QU'ON FAIT, ET POURQUOI C'EST LA TABLE QUI DÉCIDE
--
-- On aligne la lecture du casier sur **la table qui fait foi** : un objet n'est
-- lisible que si une ligne `documents` lisible le désigne. Le dépôt a déjà fait
-- ce choix pour les pièces jointes des sujets, et sa raison tient en une ligne
-- de son en-tête : *« avoids inferring authorization from path segments only »*
-- (`202606150012_..._storage_select_via_attachment_table.sql`).
--
-- Le point important est un détail de PostgreSQL, et c'est lui qui rend tout
-- l'édifice juste : **la sous-requête d'une politique subit les politiques de la
-- table qu'elle interroge.** Le `exists` ci-dessous passe donc par
-- `documents_by_project` — donc par la règle du dossier privé — sans qu'elle
-- soit réécrite ici. Une seule décision, à un seul endroit (règle 4) : le jour
-- où la règle du dossier privé changera, le casier suivra sans qu'on y pense.
--
-- L'ÉCRITURE : LE CHEMIN COMMENCE DÉJÀ PAR SON PROPRIÉTAIRE
--
-- `uploadDocumentToStorage` écrit sous `<identifiant>/<projet>/<portée>/<nom>`
-- (`document-deposit.js`). Le premier segment suffit donc à vérifier qu'on
-- n'écrit que chez soi, sans rien lire d'autre. Pour la modification et la
-- suppression, on demande les deux : le chemin **et** une ligne lisible.
--
-- CE QUE CETTE MIGRATION RETIRE, ET IL FAUT LE DIRE
--
-- Elle n'est pas additive : elle **restreint**. Un accès trop large n'est pas
-- une donnée dont quelqu'un dépend, c'est une porte ; la règle additive protège
-- la première, pas la seconde. Ce qui cesse de fonctionner :
--
--   * la lecture d'un objet auquel aucune ligne `documents` ne renvoie — un
--     résidu d'un dépôt interrompu. Il n'était atteignable par aucun écran ;
--   * toute lecture ou écriture **sans session**. Rien n'en fait : le dépôt et
--     le rapatriement passent par `uploadDocumentToStorage` et
--     `downloadDocumentFile`, qui envoient tous deux les en-têtes
--     d'authentification.

-- ── La lecture : la table décide ───────────────────────────────────────────

drop policy if exists "storage_documents_select_open" on storage.objects;
drop policy if exists storage_documents_select on storage.objects;
create policy storage_documents_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1
    from public.documents d
    where d.storage_bucket = storage.objects.bucket_id
      and d.storage_path = storage.objects.name
      and d.deleted_at is null
  )
);

-- ── L'écriture : chez soi, et nulle part ailleurs ──────────────────────────
--
-- À l'insertion, aucune ligne `documents` n'existe encore : elle s'écrit après
-- le téléversement. Le chemin est donc tout ce qu'on peut exiger — et il porte
-- l'identifiant de celui qui dépose.

drop policy if exists "storage_documents_insert_open" on storage.objects;
drop policy if exists storage_documents_insert on storage.objects;
create policy storage_documents_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_documents_update_open" on storage.objects;
drop policy if exists storage_documents_update on storage.objects;
create policy storage_documents_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "storage_documents_delete_open" on storage.objects;
drop policy if exists storage_documents_delete on storage.objects;
create policy storage_documents_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ── Le casier n'est pas public, et on le redit ─────────────────────────────
--
-- Il a été créé `public = false`, donc aucune adresse ne rend un objet sans
-- jeton. On le réaffirme parce qu'un casier basculé public par mégarde dans
-- l'interface de Supabase rendrait tout ce qui précède décoratif.
update storage.buckets set public = false where id = 'documents';
