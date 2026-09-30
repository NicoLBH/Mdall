-- Ce qu'il faut savoir d'un mail sans l'ouvrir.
--
-- POURQUOI ON EXTRAIT, ALORS QU'ON AVAIT ÉCRIT QU'ON N'EXTRAYAIT RIEN
--
-- La console dit, depuis un tour : « rien n'est extrait : le mail est gardé tel
-- quel, et relu à chaque lecture ». C'était vrai, et c'était tenable tant que la
-- seule chose qu'on montrait d'un mail était son nom de fichier.
--
-- Une liste à la manière d'une messagerie — expéditeur, objet, trombone, date —
-- ne l'est plus : il faudrait **rapatrier et déplier deux cents fichiers pour
-- dessiner deux cents lignes**. Ce n'est pas une liste, c'est une attente.
--
-- CE QUE CES COLONNES SONT, ET CE QU'ELLES NE SONT PAS
--
-- Un **index de ses propres fichiers**, au même titre que `mime_type` ou
-- `file_size_bytes`. Ce n'est pas la mémoire du projet : rien de ce qui est ici
-- n'est un constat, n'a été signé, ni n'entre dans ce que le chantier sait
-- (règle 1). La porte de la mémoire reste une proposition signée.
--
-- Et rien ne sort : ces colonnes vivent sur la ligne `documents`, donc sous
-- `documents_by_project`, donc **ne se lisent que par le déposant du mail**.
-- L'adresse d'un tiers n'est pas plus exposée qu'elle ne l'était dans le
-- fichier — elle devient seulement lisible sans le télécharger.
--
-- > La base légale de la conservation des mails de tiers reste à confirmer par
-- > un juriste (art. 6-1-f et art. 14). Ces colonnes ne la changent pas : elles
-- > ne conservent rien de plus que ce que le fichier contient déjà.
--
-- LE FIL, ET POURQUOI IL EST CALCULÉ ICI PLUTÔT QUE DEMANDÉ
--
-- `mail_fil` porte l'objet **débarrassé de ses « RE : » et « TR : »** — ce que
-- `objetNu` calcule déjà pour nommer un fichier. C'est ce qui permet de montrer
-- une chronologie de réponses sans relire deux cents messages. Il est écrit par
-- le dépôt, qui vient justement de déplier le message : le recalculer à la
-- lecture ferait deux endroits où l'on décide ce qu'est un fil (règle 4).
--
-- Strictement additive : cinq colonnes qui acceptent le vide, et un index.

alter table public.documents
  add column if not exists mail_de text,
  add column if not exists mail_objet text,
  add column if not exists mail_quand timestamptz,
  add column if not exists mail_pieces integer,
  add column if not exists mail_fil text;

comment on column public.documents.mail_de is
  'L''expéditeur du mail, tel qu''il s''écrit. Vide pour tout ce qui n''est pas un mail déposé.';
comment on column public.documents.mail_objet is
  'L''objet du mail, avec ses RE: et TR:, tel qu''il a été envoyé.';
comment on column public.documents.mail_quand is
  'Quand le message a été envoyé — pas quand il a été déposé, que created_at porte déjà.';
comment on column public.documents.mail_pieces is
  'Combien de pièces jointes le message portait. Zéro se distingue de vide : vide veut dire « ce n''est pas un mail ».';
comment on column public.documents.mail_fil is
  'L''objet débarrassé de ses RE: et TR:, pour retrouver les messages d''un même échange sans les relire.';

-- Retrouver un fil dans un projet, et l'ordonner. Partiel : la colonne est vide
-- partout ailleurs, et l'index reste petit.
create index if not exists documents_mail_fil_idx
  on public.documents(project_id, mail_fil, mail_quand)
  where mail_fil is not null;
