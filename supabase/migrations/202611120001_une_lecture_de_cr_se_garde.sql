-- Une lecture de compte rendu se garde **entière**, et se rouvre.
--
-- ## Le problème, et il est arrivé en déplaçant la file au serveur
--
-- L'écran de l'Atelier montrait tout : le document refait, les points relevés,
-- la confrontation au projet, les lots, les labels, les fermetures proposées.
-- Puis la lecture est passée au serveur — pour que dix-neuf comptes rendus ne
-- bloquent plus l'écran une heure —, et **cet affichage a disparu avec elle**.
-- Le serveur lit, pose une proposition, et ne rend rien à regarder.
--
-- Avant cela, il y avait déjà une perte, plus ancienne et moins visible : une
-- fois le compte rendu transformé en proposition, son analyse était perdue. On
-- ne pouvait plus revenir voir ce que la lecture avait vu, ni pourquoi tel
-- point avait été rapproché de tel sujet.
--
-- ## Ce que cette migration ajoute
--
-- `cr_lectures` gardait ce qu'une lecture **valait** — ses nombres, pour la
-- comparer à la précédente. Elle garde maintenant ce qu'elle **a vu**.
--
-- ## Une lecture est une photographie, et elle ne se retouche pas
--
-- `analyse` est gelée au moment de la lecture : les points tels qu'ils ont été
-- relevés, et la confrontation telle qu'elle s'est faite **ce jour-là**, contre
-- les sujets qui existaient **ce jour-là**.
--
-- C'est ce qui répond à la question des sujets ouverts et fermés. Un sujet
-- rapproché en mars et fermé depuis ne rend pas la lecture de mars fausse :
-- elle a eu lieu, et ce qu'elle a vu reste vrai de mars (règle 6). L'écran lit
-- l'état d'aujourd'hui **à côté**, en direct, dans `subjects` — jamais dedans.
--
-- Deux colonnes à l'écran, donc, et aucune confusion possible : « vu le 12/03 »
-- et « aujourd'hui ». Recalculer la photographie à chaque ouverture aurait fait
-- l'inverse : une lecture qui change toute seule, et qu'on ne peut plus opposer
-- à personne.
--
-- Et c'est aussi ce qui permet d'ajouter le compte rendu n° 12 après avoir lu
-- les n° 15 et 16 : chaque lecture ne dit que ce qu'elle a vu, rien ne dépend
-- de l'ordre où on les a lues, et la liste se range sur la date du compte rendu
-- — pas sur celle de son analyse.
--
-- ## Strictement additive
--
-- Trois colonnes et un index. Aucune colonne existante n'est touchée, aucune
-- ligne existante n'est réécrite : les lectures déjà conservées gardent leurs
-- nombres et portent simplement une analyse nulle, c'est-à-dire « d'avant ».

alter table if exists public.cr_lectures
  -- Le document du projet qui a été lu, quand il y en a un.
  --
  -- Il n'y en a pas toujours : on dépose encore un PDF depuis le disque, et il
  -- n'est alors rangé nulle part. `document` garde son nom dans les deux cas.
  --
  -- `on delete set null` : effacer le document ne doit pas effacer ce qu'on a
  -- lu de lui. La lecture a eu lieu (règle 6).
  add column if not exists document_id uuid references public.documents(id) on delete set null,

  -- La proposition que cette lecture a nourrie, quand elle en a nourri une.
  --
  -- Dix-neuf comptes rendus ne font **qu'une** proposition : dix-neuf lignes
  -- porteront donc le même identifiant, et c'est juste — c'est ainsi qu'on
  -- retrouve ce qui a été lu pour arriver à cette proposition-là.
  add column if not exists proposition_id uuid references public.propositions(id) on delete set null,

  -- Ce que la lecture a vu, gelé.
  --
  -- Telle que `lanalyseAConserver` la rend : les points, la confrontation au
  -- projet, les rubriques du document, ce sur quoi on a lu. La raboter ici
  -- reviendrait à garder un détail en base pour ne jamais pouvoir le rouvrir.
  --
  -- `null` pour les lignes d'avant cette migration : elles ont leurs nombres,
  -- pas leur analyse, et l'écran le dit plutôt que de dessiner une lecture vide.
  --
  -- **`analyse_gelee`, et non `analyse`.** `ANALYSE` est un mot **réservé** de
  -- PostgreSQL — l'orthographe britannique d'`ANALYZE` —, et le déploiement a
  -- été refusé : « syntax error at or near "analyse" ». On pourrait l'écrire
  -- entre guillemets, mais chaque requête devrait alors y penser, et la
  -- première qui l'oublierait tomberait au même endroit.
  --
  -- Le suffixe dit aussi ce que la colonne porte : une photographie, qui ne se
  -- recalcule pas.
  add column if not exists analyse_gelee jsonb;

-- « Les comptes rendus de ce projet, dans l'ordre des réunions. »
--
-- C'est la question de l'écran d'accueil, et elle ne se pose pas sur
-- `created_at` : un compte rendu tenu en mars et lu en septembre est de mars.
-- Sans cet index, la liste se trie en mémoire sur une table qui grandit d'une
-- ligne par compte rendu et par relecture.
create index if not exists cr_lectures_par_reunion_idx
  on public.cr_lectures (project_id, tenue_le desc, created_at desc);

comment on column public.cr_lectures.analyse_gelee is
  'Ce que la lecture a vu, gelé au moment où elle a eu lieu : points, confrontation, rubriques. Ne se recalcule jamais — l''état d''aujourd''hui des sujets se lit à côté, en direct.';
