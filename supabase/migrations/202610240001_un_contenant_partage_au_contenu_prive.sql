-- « Mails » devient un contenant partagé au contenu privé.
--
-- LE DÉFAUT QU'ON A TROUVÉ EN RÉPONDANT À UNE QUESTION D'ÉCRAN
--
-- La question était : « ne faudrait-il pas, dès la racine de Fichiers, un
-- dossier Mails avec un cadenas ? ». En vérifiant comment le dossier naît, une
-- collision est apparue — et elle bloquerait purement et simplement le dépôt le
-- jour où un projet aura deux collaborateurs.
--
--     constraint project_document_folders_unique_name_per_parent
--       unique nulls not distinct (project_id, parent_folder_id, name)
--
-- Il ne peut donc exister **qu'un seul** dossier « Mails » à la racine d'un
-- projet. Or la politique posée en octobre ne rend un dossier privé qu'à son
-- créateur. Donc :
--
--   * A dépose ses mails : « Mails » est créé, privé, `created_by = A` ;
--   * B dépose les siens : il ne voit rien, tente de créer « Mails », et la
--     contrainte d'unicité refuse. **B ne peut plus déposer un seul mail**, et
--     rien à l'écran ne lui dit pourquoi.
--
-- `prive` DISAIT DEUX CHOSES, ET C'EST LA RACINE DU PROBLÈME
--
-- Une seule colonne portait deux règles, appliquées par deux politiques :
--
--   1. « ce dossier n'est visible que de son créateur »  (politique des dossiers)
--   2. « les documents qu'il porte ne sont visibles que de leur déposant »
--      (politique des documents)
--
-- C'est la seconde qu'on voulait. La première est arrivée avec elle, sans avoir
-- été demandée, et c'est elle qui coince. Une valeur qui dit deux choses finit
-- par en imposer une qu'on n'a pas choisie (règle 4).
--
-- CE QUE CETTE MIGRATION RETIRE, ET CE QUE CELA NE COÛTE PAS
--
-- La politique des dossiers cesse de regarder `prive`. Un dossier est visible
-- par le projet ; ce qu'il contient reste gardé document par document, et c'est
-- la règle qu'on avait écrite pour la correspondance.
--
-- **Aucun dossier privé n'a jamais été créé par un utilisateur.** `prive: true`
-- n'est posé qu'à deux endroits du code, tous deux dans le dépôt de mails
-- (`deposer-un-mail-supabase.js`, `le-depouillement-supabase.js`) ; la création
-- de dossier de l'écran ne le passe pas. Cette moitié de règle n'a donc jamais
-- protégé un dossier que quelqu'un aurait choisi de cacher : on ne retire pas
-- une garde, on retire un effet de bord.
--
-- Et rien n'est observable aujourd'hui : un projet n'a qu'un propriétaire
-- (`projects_owner_only`). Comme la migration d'octobre, celle-ci est écrite
-- **avant** le partage, pour la même raison — le jour où il arrive, il est trop
-- tard pour s'apercevoir que le second déposant ne peut pas déposer.
--
-- CE QUE CELA DONNE, ET C'EST EXACTEMENT CE QU'ON VOULAIT
--
--   | ce qu'on regarde        | qui le voit                          |
--   |-------------------------|--------------------------------------|
--   | le dossier « Mails »    | toute l'équipe du projet             |
--   | les mails à l'intérieur | chacun les siens, et rien d'autre    |
--
-- Le cadenas du dossier change donc de sens, et les écrans le disent : il ne
-- veut plus dire « vous seul y avez accès », il veut dire « chacun n'y voit que
-- les siens ».
--
-- CE QU'ELLE NE TOUCHE PAS
--
-- **La politique des documents ne bouge pas d'une ligne.** C'est elle qui garde
-- la correspondance, elle a été éprouvée, et la réécrire pour la déplacer
-- n'aurait ajouté qu'un risque. `prive` garde son nom et sa valeur sur les
-- dossiers existants ; seule la seconde de ses deux significations lui reste.
--
-- `created_by` reste aussi, et se remplit toujours : il ne décide plus d'aucun
-- accès, il dit qui a créé le dossier. Une provenance qu'on efface ne revient
-- pas.

drop policy if exists project_document_folders_by_project on public.project_document_folders;
create policy project_document_folders_by_project
on public.project_document_folders
for all
using (
  project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
)
with check (
  project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
);

comment on column public.project_document_folders.prive is
  'Les documents de ce dossier ne sont visibles que de leur déposant. Le dossier lui-même, lui, est visible par le projet : c''est un contenant partagé au contenu privé. Une seule règle, et c''est celle des documents (documents_by_project).';

comment on column public.project_document_folders.created_by is
  'Qui a créé ce dossier. Provenance seulement : depuis 202610240001, cette colonne ne décide plus d''aucun accès.';
