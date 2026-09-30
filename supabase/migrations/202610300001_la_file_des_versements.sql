-- La file des versements : on dépose, on rend la main, le serveur travaille.
--
-- CE QU'ON REMPLACE, ET POURQUOI CELA NE POUVAIT PAS TENIR
--
-- Le dépouillement se faisait dans l'onglet. Vingt-quatre mails avec leurs
-- pièces prennent des minutes, pendant lesquelles la zone de dépôt restait
-- bleue et l'écran demandait d'attendre. Fermer l'onglet perdait tout ; un
-- téléphone qui met l'écran en veille aussi.
--
-- Et rien de ce travail n'avait besoin du navigateur : déplier un `.msg`, lire
-- une archive, calculer une empreinte, écrire des lignes. C'était là parce que
-- les octets y étaient, pas parce que c'était la place.
--
-- Désormais : **le navigateur dépose les octets et pose une ligne ici**, puis
-- il a fini. Le serveur prend la ligne, la marque `en_cours`, travaille, et la
-- marque `fini`. L'onglet Actions lit cette table et montre où l'on en est.
--
-- POURQUOI UNE TABLE, ET PAS `project_runs`
--
-- `project_runs` consigne ce qui **a eu lieu** : « on n'écrit qu'une fois, à la
-- fin, et on ne met jamais à jour » — une exécution qui a eu lieu ne devient pas
-- fausse (règle 6). Une file est l'inverse : elle existe pour changer d'état.
--
-- Mélanger les deux obligerait `project_runs` à se laisser modifier, et l'on
-- perdrait la seule garantie qui rend son journal lisible. La file vit donc à
-- part, et **quand elle a fini, elle écrit une course** : la file dit ce qui se
-- passe, le journal dit ce qui s'est passé.
--
-- CE QUE LA FILE PORTE, ET CE QU'ELLE NE PORTE PAS
--
-- Les **chemins** des fichiers dans le casier, pas leur contenu. Le nom d'un
-- fichier de messagerie est souvent l'objet du mail — « RE_ Reprise des gaines
-- Ourdine Ferrand.msg » —, donc de la correspondance : il n'est écrit ici que
-- parce qu'il faut pouvoir dire lequel a résisté, et cette table ne se lit que
-- par son auteur.
--
-- QUI LA LIT
--
-- **Son auteur, et personne d'autre**, comme les mails qu'elle porte. Pas même
-- les autres membres du projet : c'est la règle de la correspondance depuis
-- octobre, et une file qui l'assouplirait dirait à l'équipe qui verse quoi.
--
-- L'absence d'auteur **ferme** : pas de `owner_id is null or`. Trois fois déjà
-- une absence a ouvert au lieu de fermer.
--
-- Strictement additive : une table neuve, rien d'existant n'est touché.

create table if not exists public.versements (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.projects(id) on delete cascade,

  -- Qui a versé. Posé par la base : demander au client de l'envoyer reviendrait
  -- à accepter qu'il envoie celui d'un autre.
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),

  -- `en_attente` → `en_cours` → `fini` | `echec`.
  --
  -- **`en_attente` et `en_cours` ne disent pas la même chose**, et c'est ce qui
  -- permet de reprendre : une ligne `en_cours` depuis une heure a été abandonnée
  -- en route — le serveur a été coupé, la fonction a expiré —, une ligne
  -- `en_attente` depuis une heure n'a jamais été prise. Les confondre rendrait
  -- l'une des deux irrattrapable (règle 5).
  statut text not null default 'en_attente',

  -- Les fichiers déposés : `[{nom, chemin, taille}]`. Le chemin est dans le
  -- casier `documents`, sous le dossier de celui qui verse.
  fichiers jsonb not null default '[]'::jsonb,

  -- Ce que le serveur en a fait, au fur et à mesure : `{fichiers, lus, verses,
  -- pieces, dejaLa, illisibles, refuses, accrocs}` — la forme du journal du
  -- convoi, pour que l'écran n'ait pas deux comptes à apprendre.
  avancement jsonb not null default '{}'::jsonb,

  -- Pourquoi cela s'est arrêté, en français. Vide quand tout a tenu.
  arrete text not null default '',

  -- La course écrite au journal quand c'est fini. `null` tant que ça tourne.
  course_id uuid references public.project_runs(id) on delete set null,

  cree_le timestamptz not null default now(),
  pris_le timestamptz,
  fini_le timestamptz
);

-- « Qu'est-ce qui m'attend, et qu'est-ce qui tourne ? » — la question de
-- l'onglet Actions, posée à chaque venue, et celle du serveur qui vide la file.
create index if not exists versements_a_faire_idx
  on public.versements (project_id, owner_id, cree_le desc)
  where statut in ('en_attente', 'en_cours');

create index if not exists versements_par_projet_idx
  on public.versements (project_id, cree_le desc);

alter table public.versements enable row level security;

drop policy if exists versements_par_leur_auteur on public.versements;
create policy versements_par_leur_auteur
on public.versements
for all
to authenticated
using (
  owner_id = auth.uid()
  and project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
)
with check (
  owner_id = auth.uid()
  and project_id in (select p.id from public.projects p where p.owner_id = auth.uid())
);

comment on table public.versements is
  'La file des dépôts de messagerie : ce qui attend, ce qui tourne. Le navigateur y pose une ligne et rend la main ; le serveur la prend et la finit. Ce qui a eu lieu se consigne dans project_runs — la file dit ce qui se passe, le journal dit ce qui s''est passé.';

comment on column public.versements.statut is
  'en_attente | en_cours | fini | echec. En_attente et en_cours ne se confondent pas : une ligne en_cours depuis une heure a été abandonnée en route, une ligne en_attente n''a jamais été prise.';
