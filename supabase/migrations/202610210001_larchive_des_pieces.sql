-- L'archive des pièces : garder ce qu'on ne pourra pas reprendre.
--
-- ## Pourquoi on garde des octets qu'on ne sait pas encore exploiter
--
-- > « Je veux que l'on extraie et que l'on conserve les PDF joints. Quand nous
-- > saurons comment en exploiter la valeur, nous n'aurons pas besoin de
-- > recommencer la distribution de carburant. »
--
-- Le versoir de la console sait ouvrir un `.msg`, en sortir les pièces et dire
-- ce qu'elles pèsent — puis il les oublie à la fermeture de l'onglet. Chaque
-- essai recommence donc le décorticage de cent archives, et le jour où l'on
-- saura tirer quelque chose d'un plan, il faudra tout relire.
--
-- **Ce qui est irrattrapable se prend maintenant.** C'est le même raisonnement
-- que pour le journal des refus et pour les écartés : une archive qu'on n'a pas
-- ouverte aujourd'hui, on ne l'aura plus dans trois ans.
--
-- ## Le nom d'une pièce est son empreinte, et cela n'est pas un détail
--
-- Chaque pièce est rangée sous `pieces/<empreinte SHA-256>`. Trois conséquences,
-- et les trois comptent :
--
-- 1. **Le dédoublonnage est gratuit et définitif.** Le même plan attaché à
--    quinze réponses d'un fil est un seul objet. Sur cent historiques de
--    chantier, c'est l'essentiel du volume qui disparaît sans qu'on ait rien à
--    décider.
-- 2. **Le chemin ne porte rien.** Ni nom de fichier, ni chantier, ni personne :
--    soixante-quatre caractères hexadécimaux. Qui obtiendrait la liste des
--    objets n'apprendrait rien de ce qu'ils contiennent.
-- 3. **Deux versements du même fichier ne peuvent pas diverger**, puisqu'ils
--    écrivent au même endroit le même contenu (règle 4).
--
-- ## Ce que cette archive n'est pas
--
-- **Ce n'est pas la mémoire d'un projet, et elle n'y touche pas.** Les pièces
-- déposées ici viennent d'archives que l'administrateur ouvre lui-même pour
-- nourrir la prédiction — un traitement qui vit à côté de l'interface des
-- utilisateurs (`docs/nourrir-mdall.md`). Aucune politique de projet ne connaît
-- ce casier, et ce casier ne connaît aucun projet.
--
-- La règle absolue vaut ici comme partout : **les conversations avec le copilote
-- ne traversent jamais**, dans aucun sens, sous aucun prétexte.
--
-- ## Qui peut lire, qui peut écrire
--
-- Les administrateurs, et personne d'autre. La question « en suis-je un ? » a
-- déjà sa réponse (`202610200001_qui_tient_la_console.sql`) ; on lui donne ici
-- une forme appelable depuis une politique.
--
-- Additive : nouvelle fonction, nouveau casier, nouvelle table. Aucune colonne
-- existante n'est modifiée, aucune politique existante n'est retouchée.

-- ── La porte, sous une forme qu'une politique peut appeler ──────────────────
--
-- **`security definer`, et c'est délibéré.** La table des administrateurs ne
-- rend à personne autre chose que sa propre ligne ; une politique qui
-- l'interrogerait directement dépendrait de cette subtilité pour être juste.
-- Cette fonction contourne la politique de lecture — et ne peut rendre qu'un
-- **booléen sur l'appelant lui-même**. Elle ne peut donc pas servir à obtenir
-- la liste, qui reste hors de portée de tout le monde.
create or replace function public.est_administrateur()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.administrateurs
    where courriel = lower(auth.jwt() ->> 'email')
  );
$$;

comment on function public.est_administrateur() is
  'Vrai si l''appelant est administrateur. Ne rend jamais qui sont les autres.';

revoke all on function public.est_administrateur() from public;
grant execute on function public.est_administrateur() to authenticated;

-- ── Le casier ──────────────────────────────────────────────────────────────
--
-- **Privé.** Un casier public servirait ses objets à qui connaît l'empreinte, et
-- une empreinte se devine pour un fichier qu'on possède déjà : il suffirait
-- d'avoir le même PDF pour savoir qu'il est ici.
insert into storage.buckets (id, name, public)
values ('archives', 'archives', false)
on conflict (id) do nothing;

drop policy if exists storage_archives_administrateur_select on storage.objects;
create policy storage_archives_administrateur_select
on storage.objects
for select
to authenticated
using (bucket_id = 'archives' and public.est_administrateur());

drop policy if exists storage_archives_administrateur_insert on storage.objects;
create policy storage_archives_administrateur_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'archives' and public.est_administrateur());

-- **Aucune politique de modification ni de suppression.** Un objet nommé par son
-- contenu n'a rien à modifier : un autre contenu est un autre objet. Et ce qu'on
-- a pris pour ne pas avoir à le reprendre ne s'efface pas d'un clic dans un
-- écran (règle 6).

-- ── Le registre ────────────────────────────────────────────────────────────
--
-- Le casier dit quels octets existent ; il ne dit pas ce qu'ils sont. Le nom du
-- fichier, son type et son poids vivent ici — dans une table, où ils se lisent
-- sans télécharger cinq mégaoctets pour afficher une ligne.
create table if not exists public.pieces_archivees (
  -- L'empreinte SHA-256 de ses octets, en hexadécimal. C'est **la** clé : le nom
  -- d'un fichier ne vaut rien (« Plan.pdf » désigne quinze plans sur un
  -- chantier), sa taille non plus.
  empreinte text primary key
    constraint pieces_archivees_empreinte_forme check (empreinte ~ '^[0-9a-f]{64}$'),

  -- Le nom tel que le message le portait. Il sert à reconnaître une pièce sans
  -- l'ouvrir, et c'est la seule raison pour laquelle il est là.
  nom text,

  -- Le type déclaré par le message. Il décide de ce que la console sait
  -- afficher — un PDF s'ouvre, le reste se télécharge.
  type_mime text,

  taille bigint,

  versee_le timestamptz not null default now(),

  -- Posé par la base, jamais par l'appelant. **Nullable, et à dessein** : le
  -- jour où ce compte est effacé, la pièce reste. Une archive prise pour ne pas
  -- avoir à la reprendre ne s'en va pas avec celui qui l'a déposée.
  versee_par uuid default auth.uid() references auth.users(id) on delete set null
);

-- « Qu'est-ce qui est arrivé dernièrement ? » est la question qu'on pose à un
-- registre, et toujours du plus récent.
create index if not exists pieces_archivees_recentes_idx
  on public.pieces_archivees (versee_le desc);

alter table public.pieces_archivees enable row level security;

drop policy if exists pieces_archivees_administrateur_select on public.pieces_archivees;
create policy pieces_archivees_administrateur_select
on public.pieces_archivees
for select
to authenticated
using (public.est_administrateur());

drop policy if exists pieces_archivees_administrateur_insert on public.pieces_archivees;
create policy pieces_archivees_administrateur_insert
on public.pieces_archivees
for insert
to authenticated
with check (public.est_administrateur() and versee_par = auth.uid());

-- **Aucune politique de modification ni de suppression**, pour la même raison
-- que le casier : ce qu'on a pris pour ne pas avoir à le reprendre reste.

comment on table public.pieces_archivees is
  'Ce que porte le casier « archives » : l''empreinte des octets, le nom du fichier, son type, son poids. Réservé aux administrateurs. Sans rapport avec la mémoire d''un projet.';
