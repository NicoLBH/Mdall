-- Un dossier privé, et la garde qui le tient.
--
-- Un compte rendu de chantier est un document contractuel qui circule ; un mail
-- est de la correspondance. Un fil déposé va donc dans un dossier « Mails » qui
-- n'est pas partagé : seul celui qui l'a déposé y a accès.
--
-- La garde vit ici, pas dans l'écran. Un écran qui masque est un écran qu'on
-- contourne : l'API est là, et elle répond. L'écran ne fait que montrer ce que
-- la base autorise déjà — s'il oubliait le cadenas, personne ne verrait rien de
-- plus.
--
-- CE QUE CETTE MIGRATION NE PROUVE PAS, ET IL FAUT LE DIRE
--
-- Aujourd'hui, un projet n'a qu'un propriétaire : `projects_owner_only`, et les
-- politiques des documents et des dossiers s'y raccrochent. Personne d'autre ne
-- lit quoi que ce soit, donc la restriction ajoutée ici ne change rien
-- d'observable, et aucune épreuve ne peut la faire tomber (règle 12).
--
-- Elle est écrite quand même, et maintenant, parce que l'ordre inverse est
-- celui qui coûte : le jour où le partage arrive, la correspondance serait
-- lisible par l'équipe pendant tout l'intervalle. Un garde-fou posé après la
-- porte n'a jamais gardé personne.
--
-- Strictement additive : une colonne avec sa valeur par défaut, une autre qui
-- accepte le vide, et des politiques qui remplacent les précédentes sans rien
-- retirer à qui y avait droit. Un dossier existant reste partagé.

-- 1. Un dossier peut être privé. Par défaut, il ne l'est pas.
alter table public.project_document_folders
  add column if not exists prive boolean not null default false;

comment on column public.project_document_folders.prive is
  'Un dossier privé n''est lisible que par celui qui l''a créé, même quand le projet est partagé.';

-- 2. Un document sait qui l'a déposé. Vide pour tout ce qui existe déjà : on ne
--    réécrit pas l'histoire, et `created_by` n'existait pas sur les documents.
alter table public.documents
  add column if not exists deposant uuid null references auth.users(id);

comment on column public.documents.deposant is
  'Qui a déposé ce document. Vide pour les documents antérieurs à cette colonne.';

create index if not exists idx_documents_deposant
  on public.documents(deposant);

-- 3. Un dossier privé ne se lit que par celui qui l'a créé.
--
--    `created_by is null` garde les dossiers d'avant : ils ne sont pas privés
--    (défaut `false`), donc la seconde branche ne les concerne pas — mais un
--    dossier privé sans créateur connu resterait autrement invisible à tous,
--    y compris au propriétaire du projet, ce qui serait une perte, pas une garde.
drop policy if exists project_document_folders_by_project on public.project_document_folders;
create policy project_document_folders_by_project
on public.project_document_folders
for all
using (
  project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
  and (prive = false or created_by is null or created_by = auth.uid())
)
with check (
  project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
  and (prive = false or created_by is null or created_by = auth.uid())
);

-- 4. Un document rangé dans un dossier privé ne se lit que par celui qui l'a
--    déposé. Un document à la racine, ou dans un dossier ordinaire, ne change
--    pas de régime.
drop policy if exists documents_by_project on public.documents;
create policy documents_by_project
on public.documents
for all
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
  and (
    folder_id is null
    or not exists (
      select 1
      from public.project_document_folders f
      where f.id = documents.folder_id
        and f.prive = true
        and documents.deposant is not null
        and documents.deposant <> auth.uid()
    )
  )
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
  and (
    folder_id is null
    or not exists (
      select 1
      from public.project_document_folders f
      where f.id = documents.folder_id
        and f.prive = true
        and documents.deposant is not null
        and documents.deposant <> auth.uid()
    )
  )
);
