-- L'archive des messages : le fondement, et pas seulement les pièces.
--
-- ## Ce qui manquait, et qui se perdait chaque jour
--
-- Le casier garde les pièces, nommées par l'empreinte de leurs octets. Mais un
-- plan sans son message est un plan **sans provenance** : on ne sait plus qui
-- l'a envoyé, quand, en réponse à quoi, ni ce qu'il disait en l'envoyant.
--
-- Or c'est exactement la matière de l'épisode — « la suite des sujets ouverts,
-- les constats rencontrés, leurs issues » (`docs/la-memoire-qui-predit.md`,
-- § 3) —, et c'est **la partie qu'on ne reconstitue pas après coup**. Les
-- octets d'un plan, on les aura toujours ; l'ordre dans lequel les choses se
-- sont dites, non.
--
-- ## Deux façons de garder, et les deux servent
--
-- **Le fichier entier, dans le casier.** `messages/<empreinte de ses octets>`.
-- C'est l'original : le jour où l'on saura lire mieux qu'aujourd'hui — les
-- destinataires, les citations imbriquées, les propriétés qu'on ignore
-- encore —, on relit sans redistribuer le carburant. Un `.msg` pèse quelques
-- kilo-octets une fois ses pièces déjà rangées ailleurs.
--
-- **La forme lue, dans une table.** Ce qu'on sait exploiter aujourd'hui : qui,
-- quand, l'objet, le propos, la chaîne de réponses. C'est ce qui se cherche,
-- se trie et se compte sans télécharger cent mille fichiers.
--
-- L'un n'est pas la copie de l'autre : **le fichier est la source, la table est
-- la lecture**. Quand la lecture s'améliorera, on refera la table depuis les
-- fichiers — et c'est pour cela qu'on les garde.
--
-- ## Ce que la table ne porte pas, et pourquoi ce n'est pas une perte
--
-- **Les adresses des destinataires n'y sont pas.** Seulement leur nombre.
--
-- Ce n'est pas de la pudeur mal placée : c'est que rien, aujourd'hui, ne sait
-- s'en servir. Le vecteur de contexte raisonne sur des **rôles**
-- (`ROLES_QUI_COMPTENT`), pas sur des personnes ; l'épisode sur des dates et
-- des domaines. Une colonne qu'aucun code ne lit est une colonne qui finit par
-- fuir sans avoir jamais servi.
--
-- Et rien n'est perdu : **le fichier d'origine les porte toujours**. Le jour où
-- une raison précise de les lire apparaîtra, elles seront là — et ce jour-là on
-- écrira ce qu'on en fait avant d'écrire la colonne.
--
-- ## Ce que cette archive n'est pas
--
-- **Ce n'est pas la mémoire d'un chantier**, et elle n'y touche pas. Comme le
-- casier des pièces, elle sert à nourrir la prédiction, à côté de l'interface
-- des utilisateurs (`docs/nourrir-mdall.md`). Aucune politique de projet ne la
-- connaît, et elle ne connaît aucun projet.
--
-- La règle absolue vaut ici comme partout : **les conversations avec le
-- copilote ne traversent jamais**, dans aucun sens, sous aucun prétexte.
--
-- Additive : deux nouvelles tables, deux nouvelles politiques de casier. Aucune
-- colonne existante n'est modifiée.

-- ── Les messages ───────────────────────────────────────────────────────────

create table if not exists public.messages_archives (
  -- L'empreinte de **l'identité** du message — son `Message-ID` quand il en
  -- porte un, sinon la clé calculée sur qui, quand, l'objet et le propos
  -- (`services/le-dedoublonnage.js`), le tout condensé en SHA-256.
  --
  -- Condensé, et pas brut : un `Message-ID` fait trois caractères ou trois
  -- cents, et une clé primaire de longueur libre se compare mal. La forme est
  -- alors la même que celle des pièces, ce qui évite d'avoir deux façons de
  -- nommer une chose dans la même archive (règle 4).
  empreinte text primary key
    constraint messages_archives_empreinte_forme check (empreinte ~ '^[0-9a-f]{64}$'),

  -- L'identité telle qu'elle était, pour pouvoir y revenir et recouper un fil.
  identite text,

  -- L'empreinte des **octets du fichier** déposé, qui est son nom dans le
  -- casier. Deux exports du même message donnent deux fichiers différents et un
  -- seul message : ce sont bien deux colonnes, et non deux noms d'une seule.
  octets text
    constraint messages_archives_octets_forme check (octets ~ '^[0-9a-f]{64}$'),

  fichier text,
  objet text,
  qui_nom text,
  qui_adresse text,

  -- `null` quand le message n'en portait pas de lisible. **On n'invente pas une
  -- date** : elle placerait le message dans la suite à un moment qu'il n'a pas
  -- eu (règle 5).
  quand timestamptz,

  -- Le nombre, pas les adresses. Voir l'en-tête de cette migration.
  combien_de_destinataires integer not null default 0,

  -- Le propos, tel qu'il a été lu. C'est le fondement : un message sans son
  -- texte ne dit pas ce qui s'est passé.
  corps text,

  -- De quoi recoudre un fil sans relire les fichiers.
  en_reponse_a text,
  chaine text[],

  -- Ce que la lecture n'a pas su placer (`services/trous-dun-mail.js`), par
  -- leurs noms seulement. Un message lu de travers ne doit pas se relire comme
  -- un message lu droit.
  trous text[],

  versee_le timestamptz not null default now(),
  versee_par uuid default auth.uid() references auth.users(id) on delete set null
);

-- « Qu'est-ce qui s'est passé, et dans quel ordre ? » est la seule question
-- qu'on pose à cette table.
create index if not exists messages_archives_chronologie_idx
  on public.messages_archives (quand desc nulls last);

create index if not exists messages_archives_recents_idx
  on public.messages_archives (versee_le desc);

alter table public.messages_archives enable row level security;

drop policy if exists messages_archives_administrateur_select on public.messages_archives;
create policy messages_archives_administrateur_select
on public.messages_archives
for select
to authenticated
using (public.est_administrateur());

drop policy if exists messages_archives_administrateur_insert on public.messages_archives;
create policy messages_archives_administrateur_insert
on public.messages_archives
for insert
to authenticated
with check (public.est_administrateur() and versee_par = auth.uid());

-- ── Le lien, qui est le point de tout cet effort ───────────────────────────
--
-- **C'est cette table qui rend une pièce utile.** Sans elle, l'archive est un
-- tas de PDF ; avec elle, chaque plan sait de quel message il venait, donc à
-- quelle date, dans quel fil, et à la suite de quoi.
--
-- Un message porte plusieurs pièces, et la même pièce revient dans plusieurs
-- messages : c'est une table de liens, et elle ne peut pas être une colonne.

create table if not exists public.pieces_des_messages (
  message text not null references public.messages_archives(empreinte) on delete cascade,
  piece text not null references public.pieces_archivees(empreinte) on delete cascade,

  -- Le nom que **ce message-là** donnait à la pièce. Le même fichier voyage
  -- sous trois noms selon qui le renvoie, et c'est parfois le nom qui date la
  -- révision d'un plan.
  nom text,

  -- Ce que le message déclarait d'elle : une image collée dans le texte, ou un
  -- document. La réponse appartient au message, pas à la pièce — la même image
  -- est une signature ici et un document ailleurs.
  dans_le_texte boolean not null default false,

  primary key (message, piece)
);

create index if not exists pieces_des_messages_par_piece_idx
  on public.pieces_des_messages (piece);

alter table public.pieces_des_messages enable row level security;

drop policy if exists pieces_des_messages_administrateur_select on public.pieces_des_messages;
create policy pieces_des_messages_administrateur_select
on public.pieces_des_messages
for select
to authenticated
using (public.est_administrateur());

drop policy if exists pieces_des_messages_administrateur_insert on public.pieces_des_messages;
create policy pieces_des_messages_administrateur_insert
on public.pieces_des_messages
for insert
to authenticated
with check (public.est_administrateur());

-- **Aucune politique de modification ni de suppression**, sur aucune des deux
-- tables : ce qu'on a pris pour ne pas avoir à le reprendre reste (règle 6).

-- ── Le casier accueille aussi les fichiers d'origine ───────────────────────
--
-- Les politiques du casier `archives` portent déjà sur tout le casier, sans
-- distinguer les dossiers : `messages/` y entre sans rien ajouter. C'est écrit
-- ici pour que personne n'aille chercher une politique manquante.

comment on table public.messages_archives is
  'La forme lue des messages archivés : qui, quand, l''objet, le propos, la chaîne. Le fichier d''origine est dans le casier « archives », sous messages/<octets>. Réservé aux administrateurs. Sans rapport avec la mémoire d''un projet.';

comment on table public.pieces_des_messages is
  'Quel message portait quelle pièce, et sous quel nom. C''est ce lien qui donne une provenance aux pièces de l''archive.';
