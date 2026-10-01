-- La file lit aussi les comptes rendus, et le journal le montre pendant.
--
-- CE QUI NE POUVAIT PAS TENIR, ET C'EST LE MÊME DÉFAUT QU'EN OCTOBRE
--
-- Le tour précédent a livré une file de comptes rendus qui tourne **dans
-- l'onglet** : dix-neuf comptes rendus bloquent l'écran de l'Atelier pendant une
-- heure. Fermer l'onglet perd tout ; aller voir Fichiers aussi.
--
-- C'est exactement ce qu'on a retiré du dépôt de messagerie en octobre
-- (`202610300001_...`), et pour les mêmes raisons. On lance un travail long, on
-- fait autre chose, on est averti quand c'est fini.
--
-- ET DIX-NEUF COMPTES RENDUS NE FONT PAS DIX-NEUF SIGNATURES
--
-- Une proposition par compte rendu, c'était dix-neuf relectures pour un geste.
-- Celui qui met son chantier à niveau veut **une** proposition : il la relit une
-- fois, il signe une fois, et tout entre ensemble.
--
-- POURQUOI ON ÉTEND `versements` AU LIEU D'OUVRIR UNE SECONDE FILE
--
-- Les deux files ont le même cycle — `en_attente` → `en_cours` → `fini` |
-- `echec` —, le même besoin de reprise, le même journal à écrire à la fin, et
-- le même onglet qui les regarde. Une seconde table aurait recopié sept
-- colonnes et deux règles, et le jour où la reprise changerait, l'une des deux
-- serait restée en arrière (règle 4).
--
-- Ce qui diffère est le **contenu** : les mails portent des chemins d'octets
-- dans le casier, les comptes rendus portent des identifiants de documents déjà
-- rangés. Deux colonnes, et un `geste` qui dit laquelle lire.
--
-- CE QUE `documents` PORTE, ET CE QU'IL NE PORTE PAS
--
-- `[{id, nom}]` — l'identifiant de la ligne du document, et son nom pour
-- pouvoir dire lequel a résisté. **Pas d'octets, pas de chemin de stockage** :
-- ces documents sont déjà dans le projet, et la fonction de bord les relit par
-- leur ligne, sous l'identité de celui qui demande. Recopier un chemin ici
-- aurait fait un second endroit où l'on sait où vit un document.
--
-- Strictement additive : trois colonnes et un index, rien d'existant n'est
-- modifié.

alter table public.versements
  -- `mails` | `comptes_rendus`. Le défaut vaut `mails` : les lignes déjà
  -- posées sont des dépôts de messagerie, et leur donner le bon geste sans
  -- rien réécrire est tout l'intérêt d'un défaut.
  add column if not exists geste text not null default 'mails',

  -- Les documents à lire : `[{id, nom}]`. Vide pour un dépôt de messagerie.
  add column if not exists documents jsonb not null default '[]'::jsonb,

  -- **La proposition unique** qu'une lecture de comptes rendus a ouverte.
  -- `null` tant qu'elle n'existe pas — et elle n'existe qu'à la fin, quand on
  -- sait ce qu'il y a à proposer.
  add column if not exists proposition_id uuid
    references public.propositions(id) on delete set null;

comment on column public.versements.geste is
  'Ce que cette ligne demande : « mails » (des octets à dépouiller) ou « comptes_rendus » (des documents du projet à relire). C''est lui qui dit laquelle des deux colonnes de contenu lire.';

comment on column public.versements.documents is
  'Les documents à relire : [{id, nom}]. Des identifiants de lignes déjà rangées, jamais des octets ni des chemins — ces documents sont dans le projet, et la fonction de bord les relit par leur ligne.';

comment on column public.versements.proposition_id is
  'La proposition unique ouverte par une lecture de comptes rendus. Dix-neuf comptes rendus ne font pas dix-neuf signatures.';

-- « Qu'est-ce qui m'attend pour ce geste-là ? » — la question que chacune des
-- deux fonctions de bord pose en se réveillant. Sans le geste dans l'index,
-- celle des mails aurait pris une ligne de comptes rendus et n'aurait rien su
-- en faire.
create index if not exists versements_par_geste_idx
  on public.versements (geste, cree_le)
  where statut in ('en_attente', 'en_cours');
