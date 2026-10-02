-- ════════════════════════════════════════════════════════════════════════════
--  Une lecture de rapport de contrôle se garde, et se rouvre
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## Pourquoi cette table, et pourquoi maintenant
--
--  Le corpus entier l'a montré trois rounds de suite : **4 223 affirmations sur
--  9 488 sont des intitulés d'avis**, et aucune ne porte de mot de liaison. Le
--  raisonnement d'un bureau de contrôle n'est pas dans l'étiquette « Avis 146 —
--  Giron des marches ≥ 28 cm » : il est dans le texte écrit **sous** elle, et ce
--  texte n'est pas en mémoire.
--
--  L'utilitaire qui lit ces rapports travaillait par motifs — des expressions
--  régulières sur le texte extrait. Il perdait son travail à chaque
--  rechargement : rien n'était conservé, donc rien n'était comparable, donc on
--  réglait les motifs à l'aveugle d'une séance à l'autre.
--
--  Cette table fait pour les rapports ce que `cr_lectures` fait pour les comptes
--  rendus et `fil_lectures` pour les fils de messagerie : **une ligne par
--  lecture**, avec ce qu'elle a valu et de quoi la rouvrir entière.
--
--  ## Privée, comme les deux autres, et pour une raison de plus
--
--  Une lecture d'Atelier est un brouillon : elle n'appartient qu'à qui l'a
--  faite. Celle-ci porte en outre le verdict d'un tiers sur l'ouvrage — un avis
--  défavorable mal relu, montré à l'entreprise concernée avant d'avoir été
--  vérifié, est exactement ce qui discréditerait l'outil.
--
--  Un écran qui oublierait de filtrer ne pourrait pas montrer ce qu'il ne doit
--  pas : la séparation est tenue par la base, ou elle n'est pas tenue.
--
--  ## Une ligne par lecture, jamais mise à jour
--
--  Une lecture qui a eu lieu ne devient pas fausse (règle 6). Relire le même
--  rapport est une seconde lecture, avec sa propre ligne — et c'est précisément
--  ce qu'on veut comparer quand on ajuste une consigne.
--
--  Strictement additive : nouvelle table, aucune colonne existante touchée.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.rapport_lectures (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.projects(id) on delete cascade,

  -- Le nom du fichier lu, tel qu'il a été déposé.
  document text not null default '',
  -- La ligne de Fichiers quand le rapport y est déjà rangé. `null` sinon : une
  -- chaîne vide n'est pas un identifiant absent, c'est un identifiant invalide.
  document_id uuid references public.documents(id) on delete set null,

  -- Ce que le rapport déclare de lui-même : son numéro de rapport et sa date.
  -- C'est par là qu'on reconnaît, six lectures plus tard, de quelle visite il
  -- s'agissait.
  numero_de_rapport text not null default '',
  etabli_le text not null default '',
  -- La nature que la reconnaissance de structure a rendue — « rapport initial
  -- de contrôle technique », « rapport de visite ». Elle dit si l'on compare
  -- deux documents comparables.
  nature text not null default '',

  -- **La légende, telle qu'elle a été reconnue.** C'est la pièce sans laquelle
  -- les avis ne se lisent pas : un rapport écrit « F », « D », « SO », et
  -- n'explique qu'une fois. Gelée avec la lecture, et non relue plus tard : la
  -- légende d'un autre rapport du même bureau n'est pas celle-ci.
  legende jsonb not null default '[]'::jsonb,

  -- Ce que la lecture vaut : combien d'avis relevés, combien rattachés à un
  -- ouvrage, combien sans marque lisible, combien de pages. Telle quelle.
  mesures jsonb not null default '{}'::jsonb,

  -- Par quoi ce rapport a été lu — le modèle, et la version du procédé. Sans
  -- lui, comparer deux lectures ne dit pas si c'est le document qui a changé ou
  -- la façon de le lire.
  lu_par text not null default '',

  -- **La lecture entière, gelée.** C'est ce que l'écran redessine au clic sur
  -- une ligne du tableau : la structure reconnue, le Markdown transcrit, les
  -- avis relevés. `analyse_gelee` et non `analyse` : ANALYSE est un mot réservé
  -- de PostgreSQL, et la migration qui l'employait a été refusée au déploiement.
  analyse_gelee jsonb,

  -- La proposition ouverte depuis cette lecture, s'il y en a une. Rien n'entre
  -- en mémoire sans elle (règle 1).
  proposition_id uuid references public.propositions(id) on delete set null,

  -- Qui l'a faite. Posé par la base : demander au client de l'envoyer
  -- reviendrait à accepter qu'il envoie celui d'un autre.
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),

  created_at timestamptz not null default now()
);

-- « Quels rapports ai-je déjà lus sur ce chantier ? » est la question que
-- l'accueil de l'écran pose, et la seule.
create index if not exists rapport_lectures_projet_date_idx
  on public.rapport_lectures (project_id, created_at desc);

create index if not exists rapport_lectures_owner_idx
  on public.rapport_lectures (owner_id);

alter table public.rapport_lectures enable row level security;

-- **Privée.** Une lecture d'Atelier n'appartient qu'à qui l'a faite.
drop policy if exists rapport_lectures_privee on public.rapport_lectures;
create policy rapport_lectures_privee
on public.rapport_lectures
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid() or owner_id is null);

comment on table public.rapport_lectures is
  'Une ligne par lecture de rapport de controle technique dans l''Atelier, avec sa legende reconnue et ce qu''elle a valu. Privee : elle n''appartient qu''a qui l''a faite.';
