-- D'où vient une pièce jointe.
--
-- CE QUI MANQUAIT, ET QUI MANQUAIT DEUX FOIS
--
-- Une pièce jointe est rangée à plat dans « Mails / Pièces jointes », et rien ne
-- disait de quel message elle venait. Deux écrans butaient sur le même manque :
--
--   * la lecture d'un échange nomme les pièces de chaque message, et ne peut pas
--     les ouvrir — elle n'a aucun moyen de retrouver le document correspondant ;
--   * la galerie des pièces veut les montrer **avec la date du mail** qui les
--     portait, et ne l'a pas.
--
-- Le rapprochement par le nom et la taille aurait marché « la plupart du
-- temps », ce qui est la pire des deux façons de se tromper : on ne sait jamais
-- lesquelles sont fausses.
--
-- POURQUOI UNE COLONNE, ET PAS UNE TABLE DE LIAISON
--
-- Parce qu'une pièce est **un fichier**, et qu'elle est dédoublonnée par ses
-- octets : le même plan attaché à quinze réponses n'entre qu'une fois. Une
-- table de liaison dirait les quinze messages ; la colonne ne dit que le
-- premier — celui qui l'a fait entrer.
--
-- C'est assumé, et c'est le bon compromis : ce qu'on veut savoir d'une pièce,
-- c'est **quand elle est arrivée et par qui**, pas la liste de tous les
-- messages qui l'ont recopiée. Le jour où cette liste servira, elle se
-- reconstituera en relisant les messages — aucune information n'est perdue,
-- elle est seulement dans les fichiers plutôt que dans une table.
--
-- CE QU'ELLE NE PORTE PAS
--
-- Aucun contenu, aucun nom, aucune adresse : un identifiant de document, dans
-- le même projet, sous la même politique de lecture. Une pièce et son message
-- sont visibles par la même personne — leur déposant — ou par personne.
--
-- Strictement additive : deux colonnes qui acceptent le vide, et un index.

alter table public.documents
  add column if not exists piece_du_message uuid references public.documents(id) on delete set null,
  add column if not exists piece_dans_le_texte boolean;

comment on column public.documents.piece_du_message is
  'Le message qui a fait entrer cette pièce jointe. Vide partout ailleurs. Le même fichier attaché à plusieurs messages ne pointe que vers le premier : c''est lui qui l''a fait entrer.';

comment on column public.documents.piece_dans_le_texte is
  'Vrai quand la pièce est une image du corps du message — une signature, un bandeau — et non un document. Vide quand ce n''est pas une pièce jointe.';

-- `on delete set null` : supprimer un mail ne doit pas emporter le plan qu'il
-- portait. La pièce perd sa provenance, et le dit.

create index if not exists documents_piece_du_message_idx
  on public.documents(piece_du_message)
  where piece_du_message is not null;
