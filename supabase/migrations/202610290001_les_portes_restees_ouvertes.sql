-- Les portes restées ouvertes, et le projet qui n'avait pas de propriétaire.
--
-- CE QUE CETTE MIGRATION RÉPARE, ET C'EST LA VRAIE CAUSE DU 403
--
-- Le dépôt de mails échouait sur :
--
--     project_document_folders insert failed (403) : {"code":"42501", …}
--
-- Le tour précédent a fait vérifier l'identifiant du projet avant d'écrire : on
-- ne rend plus un identifiant qu'après l'avoir **relu dans la base**. Le refus a
-- persisté — et il s'est étendu à `project_runs` et à la création d'un dossier à
-- la main. C'est donc que la relecture réussissait sur un projet où l'écriture
-- est refusée. Cela n'a qu'une explication.
--
--     drop policy if exists "projects_open_all" on public.projects;
--     create policy "projects_open_all"
--     on public.projects for all to anon, authenticated
--     using (true) with check (true);
--
-- Cette politique date de l'initialisation (`202604030003_...`). Elle n'y est
-- supprimée que juste avant d'y être recréée — c'est-à-dire jamais. Et
-- `202605030001_auth.sql`, qui a posé `projects_owner_only`, ne l'a pas
-- supprimée non plus : elle a **ajouté** une règle à côté d'une autre.
--
-- Or PostgreSQL combine les politiques permissives par un OU. Deux politiques
-- dont l'une dit « vrai » donnent « vrai » :
--
--     projects_open_all (true) OR projects_owner_only (owner_id = auth.uid())
--     = true
--
-- **`projects_owner_only` n'a donc jamais rien restreint.** Et l'on obtient
-- exactement ce qu'on a vu :
--
--   * lire un projet : permis pour tout le monde, quel que soit le propriétaire ;
--   * écrire dans une table fille : refusé, parce que sa politique à elle ne
--     demande pas « ce projet est-il lisible ? » mais « `owner_id` est-il le
--     mien ? » — et que ce projet-là n'a pas le bon propriétaire.
--
-- Les tables filles récentes (`project_document_folders`, `project_runs`) n'ont
-- jamais eu de jumelle ouverte : ce sont les seules qui mordaient vraiment. D'où
-- un refus qui semblait ne toucher que le dépôt de mails, alors qu'il désignait
-- un trou dans toute la base.
--
-- CE QUE CELA VOULAIT DIRE POUR LA CONFIDENTIALITÉ
--
-- **Tout projet, tout document, tout sujet se lisait avec la seule clé publique
-- du navigateur.** Et s'écrivait. Le cloisonnement des mails, posé en octobre,
-- reposait sur `documents_by_project` — qui était dans le même cas : une règle
-- juste, posée à côté d'une porte ouverte.
--
-- Une règle qu'on n'éprouve pas est une intention (règle 12). Celle-ci
-- s'écrivait dans les migrations depuis cinq mois, et personne — moi le premier,
-- en écrivant trois politiques par-dessus — n'a regardé ce qui restait à côté.
--
-- 1. LE PROJET SANS PROPRIÉTAIRE
--
-- `owner_id` est arrivé en mai. Les projets créés avant sont restés à `null`, et
-- la porte ouverte faisait qu'on ne s'en apercevait pas : on les lisait, on
-- écrivait dedans, tout paraissait normal. Fermer la porte sans rien faire
-- d'autre les rendrait **invisibles à celui qui les a créés**.
--
-- On les rend donc à leur auteur, et on ne le devine pas : on le lit. Si un seul
-- utilisateur a déposé des documents, ouvert des sujets ou agi dans l'histoire
-- d'un projet, c'est le sien. **S'il y en a zéro ou plusieurs, on ne touche à
-- rien** : se tromper de propriétaire donnerait un chantier à quelqu'un d'autre,
-- ce qui est pire que de ne rien faire.
--
-- Ce n'est pas additif, et c'est dit : cette instruction écrit dans une table
-- existante. Elle ne remplit que ce qui est vide, et elle est rejouable.
--
-- Si un projet reste sans propriétaire — aucun document, aucun sujet —, il se
-- réclame à la main dans l'éditeur SQL, connecté au compte qui doit le recevoir :
--
--     update public.projects
--        set owner_id = auth.uid()
--      where name = 'Le nom du projet' and owner_id is null;

-- `array_agg(distinct …)` et non `min(…)` : **il n'existe pas de `min(uuid)`**
-- en PostgreSQL, et le déploiement l'a refusé (SQLSTATE 42883). Le `having`
-- juste en dessous garantit qu'il n'y a qu'un seul candidat : on prend donc le
-- premier du tableau, qui est le seul.
update public.projects p
   set owner_id = seul.qui
  from (
    select agi.project_id, (array_agg(distinct agi.qui))[1] as qui
      from (
        select d.project_id, d.created_by as qui
          from public.documents d
         where d.created_by is not null
        union
        select s.project_id, s.created_by
          from public.subjects s
         where s.created_by is not null
        union
        select h.project_id, h.actor_user_id
          from public.subject_history h
         where h.actor_user_id is not null
      ) agi
     group by agi.project_id
    having count(distinct agi.qui) = 1
  ) seul
 where p.id = seul.project_id
   and p.owner_id is null;

-- 2. UNE RÈGLE QUI NE LAISSAIT PAS ÉCRIRE
--
-- `history_by_project` n'a qu'un `using` : sans `with check`, aucune ligne
-- d'histoire ne peut être écrite. Cela ne s'est jamais vu, parce que la porte
-- ouverte à côté acceptait tout. La fermer sans réparer ceci casserait
-- l'historique des sujets.

drop policy if exists history_by_project on public.subject_history;
create policy history_by_project
on public.subject_history
for all
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);

-- 3. LES PORTES QU'ON FERME AUJOURD'HUI
--
-- Celles-là, et pas d'autres : ce sont les huit tables qui portent **déjà** une
-- règle complète, éprouvée, couvrant les quatre commandes. Les fermer ne leur
-- retire rien qu'elles ne sachent faire autrement.
--
-- Fermer une table dont la seule politique est la porte ouverte la rendrait
-- muette d'un coup — c'est-à-dire casserait l'écran qui la lit, sans que rien
-- dise pourquoi. Il en reste vingt-six dans ce cas ; elles demandent une règle
-- chacune, écrite en regardant ce qui les lit, et c'est un travail à part.
-- Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien (règle 5) : elles
-- sont nommées dans `apps/web/js/services/les-portes-de-la-base.test.mjs`, qui
-- compte ce qui reste et refuse que le compte remonte.

drop policy if exists "projects_open_all" on public.projects;
drop policy if exists "documents_open_all" on public.documents;
drop policy if exists "subjects_open_all" on public.subjects;
drop policy if exists "subject_history_open_all" on public.subject_history;
drop policy if exists "ct_analysis_runs_open_all" on public.ct_analysis_runs;
drop policy if exists "situations_open_all" on public.situations;
drop policy if exists "situation_subjects_open_all" on public.situation_subjects;
drop policy if exists "project_runs_open_all" on public.project_runs;

comment on column public.projects.owner_id is
  'À qui appartient ce chantier. C''est le seul fait dont dépendent la lecture et l''écriture de tout ce qu''il porte — documents, sujets, dossiers, exécutions. Vide, le projet n''est à personne : depuis 202610290001, plus personne ne le lit.';
