-- Un document entré en mémoire cesse d'être privé.
--
-- LA QUESTION QUI L'A FAIT VOIR
--
-- « On peut garder "privé" à condition que quand un compte rendu est versé en
-- mémoire, ça passe bien à partagé et "dans la mémoire". »
--
-- C'est une condition, et elle est juste pour une raison plus forte que le
-- confort : **une mémoire dont la source est invisible n'est pas vérifiable.**
--
-- Tout l'édifice tient sur « chaque point se remonte au compte rendu dont il
-- sort ». Un collaborateur qui lit une affirmation en mémoire doit pouvoir
-- ouvrir le document qui la porte. Si ce document reste caché parce qu'il est
-- arrivé par le dossier des mails, l'affirmation devient une parole qu'on
-- croit sur parole — exactement ce que Mdall existe pour empêcher.
--
-- CE QUE LA RÈGLE DISAIT, ET CE QU'ELLE DIT MAINTENANT
--
-- Depuis octobre : un document rangé dans un dossier privé ne se lit que par
-- celui qui l'a déposé. C'est la règle de la correspondance, et elle ne bouge
-- pas — un mail reste un mail.
--
-- Elle gagne une **fin** : tant qu'il n'est pas entré en mémoire. Le jour où
-- quelqu'un signe une proposition qui porte ce document, son contenu devient
-- la connaissance du projet ; le cacher ensuite ne protège plus rien, et empêche
-- de vérifier ce qu'on vient d'accepter.
--
-- CE QUE CELA NE FAIT PAS
--
-- **Rien ne bascule tout seul.** `proposition_id` ne se pose que lorsqu'une
-- proposition est signée (règle 1) : il n'y a pas de chemin par lequel un
-- document devienne partagé sans que quelqu'un l'ait décidé.
--
-- Et cela ne touche **que** les documents qu'une proposition a fait entrer. Les
-- quatre-vingt-trois pièces jointes d'un dossier de mails qui n'ont jamais été
-- versées restent exactement où elles sont, et pour qui elles étaient.
--
-- NON ADDITIVE, ET C'EST DIT
--
-- Cette migration **élargit** une politique de lecture : des documents qu'un
-- collaborateur ne voyait pas lui deviennent visibles. C'est le but, et c'est
-- la seule chose de ce dépôt qu'on ne peut pas défaire d'un `revert` sans y
-- penser — ce qui a été vu a été vu.
--
-- Le cas est borné : un document dont `proposition_id` n'est pas nul, c'est-à-
-- dire un document que quelqu'un a explicitement fait entrer dans la mémoire
-- partagée du projet.

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
        -- **La fin de la règle.** Entré en mémoire, il se partage : sans quoi
        -- l'équipe lirait une affirmation sans pouvoir ouvrir ce qui la porte.
        and documents.proposition_id is null
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
        and documents.proposition_id is null
    )
  )
);

comment on column public.documents.proposition_id is
  'La proposition signée qui a fait entrer ce document dans la mémoire du projet. Elle décide aussi de sa visibilité : un document entré en mémoire cesse d''être privé, sans quoi l''équipe lirait des affirmations sans pouvoir ouvrir ce qui les porte.';
