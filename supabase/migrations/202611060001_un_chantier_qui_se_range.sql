-- Un chantier qui se range, plutôt qu'un chantier qu'on supprime.
--
-- POURQUOI ARCHIVER, ET NON SUPPRIMER
--
-- Un chantier livré ne disparaît pas : on y revient pour la garantie de parfait
-- achèvement, pour une reprise de désordre, pour un litige. Ce qu'on veut, ce
-- n'est pas l'effacer — c'est qu'il cesse d'encombrer la liste de ceux qui
-- tournent.
--
-- Et c'est précisément ce que la mémoire du projet vaut : supprimer un chantier
-- détruirait la matière dont la prédiction se nourrit (règle 6 — une exécution
-- qui a eu lieu ne devient pas fausse).
--
-- CE QU'ON ÉCRIT, ET RIEN DE PLUS
--
-- Une date, pas un booléen. « Archivé le 12 mars » se lit, se trie et se
-- défait ; « archivé = vrai » ne dit pas quand, et il faudrait une seconde
-- colonne le jour où l'on voudra le savoir (règle 5).
--
-- `null` veut dire « en cours ». C'est l'état de tous les chantiers
-- existants, et c'est ce qu'ils sont.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS
--
-- Elle ne touche à aucune politique. Un chantier archivé reste **le chantier de
-- son propriétaire** : il se lit, il s'écrit, et il se désarchive. Le ranger
-- n'est pas le fermer — sinon ce serait une suppression sous un autre nom.
--
-- Additive : une colonne qui n'existait pas, et rien d'autre.

alter table public.projects
  add column if not exists archived_at timestamptz;

comment on column public.projects.archived_at is
  'Quand ce chantier a été rangé. null : il est en cours. Un chantier archivé reste lisible et modifiable par son propriétaire — ranger n''est pas supprimer.';

-- La liste demande « les miens, non archivés » à chaque ouverture : sans cet
-- index, elle parcourt tous les chantiers de la table pour en écarter deux.
create index if not exists projects_archived_at_idx
  on public.projects (owner_id, archived_at);
