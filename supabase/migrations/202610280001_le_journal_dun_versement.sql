-- Le journal d'un versement, et le journal des exécutions qui se ferme.
--
-- DEUX CHOSES, ET LA PREMIÈRE EST UN TROU
--
-- 1. `project_runs` était ouvert à tout le monde, y compris aux visiteurs non
--    connectés :
--
--        create policy project_runs_open_all
--        on public.project_runs for all to anon, authenticated
--        using (true) with check (true);
--
--    Tout le journal des exécutions de tous les chantiers se lisait donc avec la
--    seule clé publique, et s'écrivait de même. Ce n'est pas une fuite de
--    documents — la table ne porte que des titres, des résumés et des durées —,
--    mais un titre de fusion nomme une proposition, et un résumé dit ce qu'elle
--    a changé. C'est l'histoire d'un chantier, et elle n'appartient pas au
--    public.
--
--    La règle devient celle de tout le reste : on lit et l'on écrit le journal
--    des projets dont on est propriétaire.
--
-- 2. Un dépôt de mails n'avait aucun endroit durable. Sa ligne n'existait qu'en
--    mémoire de l'onglet, et l'onglet Actions relit la base à chaque venue : la
--    ligne disparaissait donc au moment même où l'on allait la regarder. C'est
--    ce qui a fait dire, à juste titre, qu'« aucune ligne ne s'affiche dans
--    Actions ». Seule une exécution *en cours* survivait à la relecture, parce
--    qu'on la garde exprès (`run-partition.js`) ; une exécution finie non écrite
--    n'existait plus.
--
--    Un versement est un geste lourd du projet : il se range donc dans
--    `project_runs`, avec les fusions, et non dans une table à lui. « D'autres
--    gestes lourds viendront s'y ranger plutôt que d'inventer une table par
--    geste » — c'est ce que disait sa migration, et c'est le jour.
--
-- POURQUOI UNE COLONNE, ET PAS UNE RÈGLE SUR LE GESTE
--
-- Un versement ne se lit que par celui qui l'a fait : la correspondance d'un
-- chantier n'est pas partagée, et l'onglet le dit. Une fusion, elle, est lue par
-- tout le projet.
--
-- On pourrait écrire cette différence sur `geste` : « sauf quand geste vaut
-- versement ». Ce serait faire dire deux choses à une colonne qui en dit une, et
-- c'est exactement le défaut qu'on vient de retirer des dossiers
-- (`202610240001_...`) : `prive` portait deux règles, et la seconde a fini par
-- bloquer un dépôt. On ajoute donc `personnelle`, qui ne dit qu'une chose : qui
-- la lit.
--
-- L'ABSENCE DE PROPRIÉTAIRE FERME, ELLE N'OUVRE PAS
--
--     personnelle = false or owner_id = auth.uid()
--
-- Pas de `owner_id is null or …`. Deux fois déjà, une absence a ouvert au lieu
-- de fermer, et les deux fois c'était un silence qui publiait. Une exécution
-- personnelle sans auteur connu n'est donc lue par personne — ce qui est juste :
-- personne ne peut la revendiquer. Le cas ne se présente pas : `owner_id` a
-- `auth.uid()` pour défaut, posé par la base.
--
-- Les lignes existantes ne changent pas de régime : `personnelle` vaut `false`,
-- la clause ne les touche pas, et les fusions restent lues par le projet.
--
-- Strictement additive : une colonne neuve, une politique remplacée par une plus
-- étroite. Aucune donnée n'est effacée.

alter table if exists public.project_runs
  add column if not exists personnelle boolean not null default false;

comment on column public.project_runs.personnelle is
  'Cette exécution ne se lit que par son auteur (owner_id). Un versement de mails l''est ; une fusion ne l''est pas. Cette colonne ne dit que cela : qui la lit.';

-- « Qu'est-ce que j'ai versé dans ce projet ? » est la question de l'onglet
-- Versements, et elle se pose à chaque ouverture.
create index if not exists project_runs_personnelles_idx
  on public.project_runs (project_id, owner_id, started_at desc)
  where personnelle = true;

drop policy if exists project_runs_open_all on public.project_runs;
drop policy if exists project_runs_by_project on public.project_runs;
create policy project_runs_by_project
on public.project_runs
for all
to authenticated
using (
  project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
  and (personnelle = false or owner_id = auth.uid())
)
with check (
  project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
  and (personnelle = false or owner_id = auth.uid())
);

comment on table public.project_runs is
  'Une ligne par exécution lourde du projet — une fusion, un versement de mails —, avec son chemin d''exécution : étapes, durées, journaux. Lue par le propriétaire du projet, sauf les exécutions personnelles, lues par leur seul auteur. Les analyses de corpus vivent dans ct_analysis_runs.';
