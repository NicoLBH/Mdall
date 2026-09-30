-- Les vingt-six portes qui restaient ouvertes.
--
-- CE QU'ON FERME, ET CE QUE C'ÉTAIT
--
-- L'initialisation a posé, table par table :
--
--     create policy "<table>_open_all" on public.<table>
--     for all to anon, authenticated using (true) with check (true);
--
-- `anon` est le rôle de **la clé publique du navigateur** — celle qui est dans
-- le code de la page, lisible par quiconque ouvre les outils de développement.
-- Ces vingt-six tables se lisaient et s'écrivaient donc sans aucun compte : les
-- affirmations de la mémoire, les propositions, les comptes rendus, les
-- collaborateurs et leurs adresses.
--
-- Le tour d'octobre (`202610290001_...`) en a fermé huit — celles qui portaient
-- déjà une règle complète à côté. Les vingt-six autres n'avaient **que** la
-- porte : les fermer sans rien écrire les aurait rendues muettes d'un coup,
-- c'est-à-dire aurait cassé les écrans qui les lisent sans que rien dise
-- pourquoi. Elles demandaient une règle chacune. Les voici.
--
-- LA RÈGLE, POUR VINGT-DEUX D'ENTRE ELLES
--
--     project_id in (select id from public.projects where owner_id = auth.uid())
--
-- La même que `documents_by_project` et `subjects_by_project`, mot pour mot.
-- Une seconde formulation pour dire la même chose finirait par ne pas dire la
-- même chose (règle 4).
--
-- `with check` autant que `using` : sans lui, une table se lit correctement et
-- refuse toute écriture — c'est le défaut qu'on a trouvé sur `subject_history`
-- au tour d'octobre, et il ne s'était jamais vu parce que la porte ouverte
-- acceptait tout à côté.
--
-- CE QUI PROTÈGE ICI N'EST PAS `to authenticated`
--
-- La battue de mutations l'a montré : rouvrir l'une de ces vingt-deux règles à
-- `anon` ne rouvre rien. Sans jeton, `auth.uid()` vaut `null`, la sous-requête
-- ne rend aucun projet, et la règle est fausse pour tout le monde. C'est **la
-- condition** qui ferme, pas la liste des rôles.
--
-- On l'écrit quand même, parce qu'elle dit à qui la table s'adresse — et parce
-- que sur les deux tables communes, plus bas, c'est elle et elle seule qui
-- protège : leur condition est `true`.
--
-- LES QUATRE QUI NE SE RANGENT PAS AINSI
--
-- Elles sont traitées une par une, plus bas, et chacune dit pourquoi.
--
-- CE QUE CETTE MIGRATION NE PRÉTEND PAS FAIRE
--
-- Elle ne rend pas la base partageable. Aujourd'hui un projet appartient à une
-- personne — `projects.owner_id` —, et ces règles disent exactement cela. Le
-- jour où un collaborateur devra lire le projet d'un autre, c'est **cette
-- liste** qu'il faudra reprendre, et c'est bien pour cela qu'elle est écrite
-- une seule fois, sous la même forme partout.
--
-- Additive au sens où aucune donnée n'est touchée : on supprime des politiques
-- et on en crée. Rejouable.

drop policy if exists analysis_runs_by_project on public.analysis_runs;
create policy analysis_runs_by_project
on public.analysis_runs
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists assertion_acts_by_project on public.assertion_acts;
create policy assertion_acts_by_project
on public.assertion_acts
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists assertion_applications_by_project on public.assertion_applications;
create policy assertion_applications_by_project
on public.assertion_applications
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists assertion_dependencies_by_project on public.assertion_dependencies;
create policy assertion_dependencies_by_project
on public.assertion_dependencies
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists avis_figures_by_project on public.avis_figures;
create policy avis_figures_by_project
on public.avis_figures
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists ct_avis_by_project on public.ct_avis;
create policy ct_avis_by_project
on public.ct_avis
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists milestones_by_project on public.milestones;
create policy milestones_by_project
on public.milestones
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists project_assertions_by_project on public.project_assertions;
create policy project_assertions_by_project
on public.project_assertions
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists project_collaborators_by_project on public.project_collaborators;
create policy project_collaborators_by_project
on public.project_collaborators
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists project_identity_markers_by_project on public.project_identity_markers;
create policy project_identity_markers_by_project
on public.project_identity_markers
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists project_labels_by_project on public.project_labels;
create policy project_labels_by_project
on public.project_labels
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists project_lots_by_project on public.project_lots;
create policy project_lots_by_project
on public.project_lots
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists proposition_comments_by_project on public.proposition_comments;
create policy proposition_comments_by_project
on public.proposition_comments
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists proposition_items_by_project on public.proposition_items;
create policy proposition_items_by_project
on public.proposition_items
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists proposition_notes_by_project on public.proposition_notes;
create policy proposition_notes_by_project
on public.proposition_notes
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists propositions_by_project on public.propositions;
create policy propositions_by_project
on public.propositions
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists subject_assertion_links_by_project on public.subject_assertion_links;
create policy subject_assertion_links_by_project
on public.subject_assertion_links
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists subject_assignees_by_project on public.subject_assignees;
create policy subject_assignees_by_project
on public.subject_assignees
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists subject_evidence_by_project on public.subject_evidence;
create policy subject_evidence_by_project
on public.subject_evidence
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists subject_labels_by_project on public.subject_labels;
create policy subject_labels_by_project
on public.subject_labels
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists subject_links_by_project on public.subject_links;
create policy subject_links_by_project
on public.subject_links
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);
drop policy if exists subject_observations_by_project on public.subject_observations;
create policy subject_observations_by_project
on public.subject_observations
for all
to authenticated
using (
  project_id in (select id from public.projects where owner_id = auth.uid())
)
with check (
  project_id in (select id from public.projects where owner_id = auth.uid())
);

-- ── 1. `milestone_subjects` : elle passe par son jalon ─────────────────────
--
-- Table de liaison pure — un jalon, un sujet, rien d'autre. Elle n'a pas de
-- `project_id`, et lui en ajouter un ferait deux endroits où lire à quel projet
-- la ligne appartient (règle 4). On demande donc au jalon, qui le sait.

drop policy if exists milestone_subjects_by_milestone on public.milestone_subjects;
create policy milestone_subjects_by_milestone
on public.milestone_subjects
for all
to authenticated
using (
  milestone_id in (
    select m.id from public.milestones m
     where m.project_id in (select id from public.projects where owner_id = auth.uid())
  )
)
with check (
  milestone_id in (
    select m.id from public.milestones m
     where m.project_id in (select id from public.projects where owner_id = auth.uid())
  )
);

-- ── 2. `subject_cr_mentions` : elle passe par son sujet ────────────────────
--
-- Même cas : elle porte un sujet et un document, pas un projet.

drop policy if exists subject_cr_mentions_by_subject on public.subject_cr_mentions;
create policy subject_cr_mentions_by_subject
on public.subject_cr_mentions
for all
to authenticated
using (
  subject_id in (
    select s.id from public.subjects s
     where s.project_id in (select id from public.projects where owner_id = auth.uid())
  )
)
with check (
  subject_id in (
    select s.id from public.subjects s
     where s.project_id in (select id from public.projects where owner_id = auth.uid())
  )
);

-- ── 3. `lot_catalog` : un catalogue, pas un contenu ────────────────────────
--
-- Elle n'a aucun lien avec un projet, et c'est voulu : ce sont les codes de
-- lots du bâtiment — « GO : gros œuvre », « CVC : chauffage ventilation ».
-- La même liste pour tout le monde, comme un référentiel.
--
-- La fermer par projet la rendrait vide partout, et l'écran des lots avec elle.
-- Ce qu'on retire est donc l'écriture, et `anon` : un catalogue que n'importe
-- quelle clé publique peut réécrire n'est plus un référentiel. Il se modifie
-- désormais depuis l'éditeur SQL, ce qui est le bon endroit pour une liste que
-- personne ne doit changer en passant.

drop policy if exists lot_catalog_lisible on public.lot_catalog;
create policy lot_catalog_lisible
on public.lot_catalog
for select
to authenticated
using (true);

-- ── 4. `directory_people` : un registre, et un problème qui reste ──────────
--
-- Elle porte les personnes — nom, adresse, société — avec une **contrainte
-- d'unicité globale sur l'adresse**. C'est un registre commun par
-- construction : ajouter un collaborateur consiste à chercher son adresse, et à
-- ne créer la ligne que si personne ne l'a déjà créée.
--
-- La restreindre à son auteur casserait exactement ce geste : quelqu'un qui ne
-- voit pas la ligne d'un autre essaie de l'écrire, et se heurte à la contrainte
-- d'unicité — sans pouvoir comprendre pourquoi.
--
-- **Ce qu'on ferme ici est donc `anon`, et rien de plus, et c'est dit.** Les
-- noms et adresses des personnes restent lisibles par tout compte connecté.
-- Ce n'est pas satisfaisant, et ce n'est pas un oubli : c'est la même question
-- que la base légale pour les mails de tiers, et elle se règle en changeant la
-- forme du registre — un annuaire par propriétaire, sans unicité globale —, pas
-- en posant une règle par-dessus celle-ci.
--
-- Une déclaration qu'on ne vérifie pas est une intention (règle 12) : celle-ci
-- est vérifiée plus bas par le banc, qui constate ce qu'elle laisse ouvert
-- autant que ce qu'elle ferme.

drop policy if exists directory_people_connecte on public.directory_people;
create policy directory_people_connecte
on public.directory_people
for all
to authenticated
using (true)
with check (true);

-- ── Et l'on ferme ──────────────────────────────────────────────────────────
--
-- Après, et seulement après : une porte fermée avant que la règle existe rend
-- la table muette entre les deux instructions.

drop policy if exists "analysis_runs_open_all" on public.analysis_runs;
drop policy if exists "assertion_acts_open_all" on public.assertion_acts;
drop policy if exists "assertion_applications_open_all" on public.assertion_applications;
drop policy if exists "assertion_dependencies_open_all" on public.assertion_dependencies;
drop policy if exists "avis_figures_open_all" on public.avis_figures;
drop policy if exists "ct_avis_open_all" on public.ct_avis;
drop policy if exists "milestones_open_all" on public.milestones;
drop policy if exists "project_assertions_open_all" on public.project_assertions;
drop policy if exists "project_collaborators_open_all" on public.project_collaborators;
drop policy if exists "project_identity_markers_open_all" on public.project_identity_markers;
drop policy if exists "project_labels_open_all" on public.project_labels;
drop policy if exists "project_lots_open_all" on public.project_lots;
drop policy if exists "proposition_comments_open_all" on public.proposition_comments;
drop policy if exists "proposition_items_open_all" on public.proposition_items;
drop policy if exists "proposition_notes_open_all" on public.proposition_notes;
drop policy if exists "propositions_open_all" on public.propositions;
drop policy if exists "subject_assertion_links_open_all" on public.subject_assertion_links;
drop policy if exists "subject_assignees_open_all" on public.subject_assignees;
drop policy if exists "subject_evidence_open_all" on public.subject_evidence;
drop policy if exists "subject_labels_open_all" on public.subject_labels;
drop policy if exists "subject_links_open_all" on public.subject_links;
drop policy if exists "subject_observations_open_all" on public.subject_observations;
drop policy if exists "milestone_subjects_open_all" on public.milestone_subjects;
drop policy if exists "subject_cr_mentions_open_all" on public.subject_cr_mentions;
drop policy if exists "lot_catalog_open_all" on public.lot_catalog;
drop policy if exists "directory_people_open_all" on public.directory_people;

-- ── La vingt-septième porte : une vue ──────────────────────────────────────
--
-- CE QU'ON NE VOIT PAS EN COMPTANT LES POLITIQUES
--
-- `project_collaborators_view` n'est pas une table : c'est une vue, et elle
-- portait `grant select … to anon`. Or une vue PostgreSQL ordinaire s'exécute
-- **avec les droits de son propriétaire** et ne consulte pas les politiques de
-- ses tables de base. Fermer `project_collaborators` et `directory_people` sans
-- toucher à la vue n'aurait donc rien fermé du tout : la clé publique du
-- navigateur aurait continué d'y lire le nom, l'adresse et la société de tous
-- les collaborateurs de tous les chantiers.
--
-- C'est exactement le genre de trou que la liste des portes ne pouvait pas
-- montrer — elle compte des politiques, et une vue n'en a pas.
--
-- `security_invoker = true` la fait lire **avec les droits de celui qui
-- interroge** : les règles posées plus haut s'appliquent enfin à travers elle.
-- Et `anon` perd le droit de la lire, comme partout ailleurs.

alter view public.project_collaborators_view set (security_invoker = true);

revoke all on public.project_collaborators_view from anon;
grant select on public.project_collaborators_view to authenticated;

comment on view public.project_collaborators_view is
  'Les collaborateurs d''un projet, avec leur identité. security_invoker : elle lit avec les droits de celui qui interroge, donc sous les politiques de ses tables de base. Sans cela, une vue contourne RLS.';
