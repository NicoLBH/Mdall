-- Une discussion peut n'être d'aucun projet.
--
-- ## Pourquoi
--
-- Le Copilote vit dans un projet, et c'est ce qui fait sa valeur : il hérite
-- d'une mémoire, il ne devine pas. Mais toutes les questions ne portent pas sur
-- un chantier — « où en suis-je ? », « comment je m'y prends pour une descente
-- de charges ? », « qu'est-ce que l'application sait faire ? » n'appartiennent à
-- aucun projet, et les poser obligeait à en ouvrir un au hasard. La réponse
-- arrivait alors chargée d'une mémoire qui n'avait rien à y voir.
--
-- Ces discussions-là existent donc sans chantier. Ce n'est pas une discussion
-- « globale » au sens d'une discussion partagée : elle reste **propriétaire
-- seul**, comme les autres. La politique de sécurité ne bouge pas d'une ligne —
-- elle n'a jamais regardé le projet, seulement le propriétaire.
--
-- ## Ce que ça change, et ce que ça ne change pas
--
-- `project_id` cesse d'être obligatoire. Rien n'est supprimé, aucune donnée
-- n'est réécrite, et le code qui écrivait un projet continue d'en écrire un :
-- une colonne qui accepte le vide accepte toujours ce qu'elle acceptait avant.
--
-- L'index, lui, est refait. `(owner_id, project_id, updated_at desc)` sert la
-- question « mes discussions sur ce projet » ; il ne sert pas « mes discussions
-- sans projet », qui est une recherche sur `project_id is null`. Un index
-- partiel la couvre, et l'ancien reste pour l'autre.
--
-- Additive : aucune colonne n'est supprimée, aucune contrainte n'est durcie.

alter table public.copilot_conversations
  alter column project_id drop not null;

-- Mes discussions qui ne sont d'aucun projet, la plus récemment touchée
-- d'abord : c'est l'ordre du rail de l'écran transverse.
create index if not exists copilot_conversations_sans_projet_idx
  on public.copilot_conversations (owner_id, updated_at desc)
  where project_id is null;

comment on column public.copilot_conversations.project_id is
  'Le chantier dont on parle, ou NULL pour une discussion qui ne porte sur aucun '
  'projet — celles de l''écran « Copilote » du menu général. Il range, il '
  'n''autorise pas : c''est owner_id qui décide, dans les deux cas.';
