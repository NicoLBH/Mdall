-- Les expéditeurs déjà écrits, et l'identifiant d'annuaire qui leur tenait lieu
-- d'adresse.
--
-- CE QU'ON LIT DANS LA LISTE DES MAILS
--
--     Nicolas Lebihan (/O=EXCHANGELABS/OU=EXCHANGE ADMINISTRATIVE GROUP
--     (FYDIBOHF23SPDLT)/CN=RECIPIENTS/CN=2130423FA9EF43C6B5B78421F4C7D6A2-NICOLAS.LEB)
--
-- Trois lignes de titre pour un nom de trois syllabes. C'est une adresse X.500,
-- l'identifiant interne d'un annuaire Exchange : Outlook la met à la place de
-- l'adresse de messagerie quand l'expéditeur est du même annuaire que le
-- lecteur — donc, sur un chantier, pour tous les messages qu'on a écrits
-- soi-même.
--
-- POURQUOI UNE MIGRATION, ET PAS SEULEMENT UN ÉCRAN
--
-- `mail_de` est écrit **au dépôt**, une fois, et ne se recalcule jamais : c'est
-- ce qui permet de dessiner deux cents lignes sans rapatrier deux cents
-- fichiers. Corriger la lecture ne corrige donc pas ce qui est écrit, et l'on
-- garderait une colonne dont personne ne peut se servir — celle sur laquelle on
-- cherche et on trie.
--
-- L'écran nettoie aussi, de son côté (`une-adresse-lisible.js`) : un écran qui
-- dépend d'une migration pour ne pas afficher d'horreur affichera l'horreur le
-- jour où quelque chose y échappe.
--
-- CE QU'ELLE COUPE, ET CE QU'ELLE NE COUPE PAS
--
-- La parenthèse finale, **et seulement si elle ouvre sur `/O=`**. Un nom qui
-- porte des parenthèses pour une autre raison — « Société GLOBALIS (Savoie) » —
-- n'y ressemble pas et n'est pas touché.
--
-- Ce qui reste est le nom, que l'annuaire fournit presque toujours. Quand il
-- n'y a pas de nom, la ligne garde son identifiant : le remplacer par du vide
-- effacerait la seule chose qu'on sache de l'expéditeur, et ne rien savoir ne
-- s'écrit pas en effaçant (règle 5).
--
-- Ce n'est pas additif, et c'est dit : l'instruction réécrit une colonne
-- existante. Elle ne touche que les lignes qui portent la marque, et elle est
-- rejouable — une ligne déjà nettoyée ne correspond plus au motif.

update public.documents
   set mail_de = trim(regexp_replace(mail_de, '\s*\(/[Oo]=.*\)\s*$', ''))
 where mail_de is not null
   and mail_de ~ '\(/[Oo]=.*\)\s*$'
   -- Un nom doit rester : sinon on effacerait tout ce qu'on sait de lui.
   and trim(regexp_replace(mail_de, '\s*\(/[Oo]=.*\)\s*$', '')) <> '';

comment on column public.documents.mail_de is
  'Qui a écrit ce message, tel qu''on l''affiche. Écrit au dépôt, une fois : la liste s''en sert pour dessiner deux cents lignes sans rapatrier deux cents fichiers. Ne porte jamais d''identifiant d''annuaire Exchange — depuis 202611010001, et à l''écriture depuis une-adresse-lisible.js.';
