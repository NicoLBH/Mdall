-- Une situation appartient à quelqu'un, et à personne d'autre.
--
-- ## Ce qu'on avait rangé au mauvais endroit
--
-- Une situation dit ce qu'une personne se donne à faire, dans quel ordre, et ce
-- qu'elle laisse de côté. C'est une **façon de travailler**, pas un fait du
-- projet. Elle était pourtant une ligne du projet, lue par tous ses
-- collaborateurs — et c'est ce qui fait qu'on n'en crée pas : personne n'a envie
-- d'exposer son organisation de la semaine à douze personnes.
--
-- ## Ce que cette migration fait, et ce qu'elle ne fait pas encore
--
-- Elle **ferme la porte**, et rien d'autre. La portée ne bouge pas :
-- `project_id` reste obligatoire, une situation reste celle d'un projet. C'est
-- délibéré — élargir avant de cloisonner publierait, pendant l'intervalle,
-- l'organisation de chacun à travers tous ses chantiers. Ce n'est pas un défaut
-- d'affichage qui se corrige au palier suivant : c'est une fuite, et elle ne se
-- reprend pas.
--
-- Voir `docs/les-situations-traversent-les-projets.md`, étape 1.
--
-- ## Pourquoi la base, et pas l'écran
--
-- Un écran qui filtre est une politesse d'affichage : il suffit d'une requête
-- oubliée, d'un export, d'un écran neuf écrit six mois plus tard. C'est la leçon
-- du cloisonnement des exécutions d'Atelier, et elle vaut ici au centuple —
-- il s'agit du carnet de quelqu'un.
--
-- Trois règles, et aucune n'est décorative :
--
-- 1. **Le propriétaire est posé par la base.** Demander au client de l'envoyer,
--    c'est accepter qu'il envoie celui d'un autre.
-- 2. **La lecture ne rend que les siennes.** Pas de « ou bien si l'on est
--    collaborateur du projet » : la première exception en appellerait une
--    seconde.
-- 3. **L'écriture aussi.** Sans elle, on ne lit pas les situations des autres,
--    mais on peut leur en écrire une — ou modifier la leur en devinant un
--    identifiant.
--
-- ## `situation_subjects` porte la même règle, et c'est celle qu'on oublie
--
-- La table de liaison dit « ce sujet est dans cette situation ». Laissée
-- ouverte, elle raconte le carnet de quelqu'un ligne par ligne, sans jamais
-- lire la situation elle-même.
--
-- ## Ce qui existe déjà ne disparaît pas en silence
--
-- Les situations écrites avant ce jour n'ont pas de propriétaire : la colonne
-- n'existait pas. Les cacher rétroactivement ferait disparaître le travail de
-- gens qui l'ont sous les yeux aujourd'hui, sans que personne l'ait demandé.
-- Elles restent donc lisibles, et l'écran le dit — « créée avant le
-- cloisonnement ». Mieux vaut une exception nommée qu'un trou silencieux.
--
-- **Mais elles ne se modifient plus par n'importe qui** : une situation sans
-- propriétaire se lit, elle ne se réécrit pas au nom d'un autre. Qui veut la
-- reprendre la reprend en la marquant sienne.
--
-- Strictement additive : une colonne, des règles remplacées. Aucune donnée
-- déplacée, aucune colonne retirée.

alter table public.situations
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- Posé tout seul. C'est la seule façon qu'il soit vrai.
alter table public.situations
  alter column owner_id set default auth.uid();

create index if not exists situations_owner_idx
  on public.situations (owner_id);

-- La règle d'avant laissait tout passer, dans les deux sens.
drop policy if exists "situations_open_all" on public.situations;

-- **Lecture.** Les miennes, et celles d'avant le cloisonnement — qui n'ont pas
-- de propriétaire et que personne n'a demandé à perdre.
drop policy if exists situations_lecture on public.situations;
create policy situations_lecture
on public.situations
for select
to anon, authenticated
using (owner_id is null or owner_id = auth.uid());

-- **Création.** À mon nom, ou sans nom du tout — le défaut le remplit, et un
-- client qui l'omettrait ne crée pas pour autant la situation d'un autre.
drop policy if exists situations_creation on public.situations;
create policy situations_creation
on public.situations
for insert
to authenticated
with check (owner_id = auth.uid() or owner_id is null);

-- **Modification.** Les miennes seulement. Une situation d'avant le
-- cloisonnement se lit mais ne se réécrit pas : qui veut la reprendre la
-- reprend en la marquant sienne, et c'est une décision, pas un effet de bord.
drop policy if exists situations_modification on public.situations;
create policy situations_modification
on public.situations
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists situations_suppression on public.situations;
create policy situations_suppression
on public.situations
for delete
to authenticated
using (owner_id = auth.uid());

-- ## La liaison suit sa situation
--
-- Elle n'a pas de propriétaire à elle : elle en hérite. Lui en donner un second
-- ferait deux vérités du même fait, et c'est celle qu'on ne regarde pas qui
-- finirait par avoir raison.

alter table public.situation_subjects enable row level security;

drop policy if exists "situation_subjects_open_all" on public.situation_subjects;
drop policy if exists situation_subjects_par_la_situation on public.situation_subjects;
create policy situation_subjects_par_la_situation
on public.situation_subjects
for all
to anon, authenticated
using (
  exists (
    select 1 from public.situations s
    where s.id = situation_subjects.situation_id
      and (s.owner_id is null or s.owner_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.situations s
    where s.id = situation_subjects.situation_id
      and s.owner_id = auth.uid()
  )
);

comment on column public.situations.owner_id is
  'À qui appartient ce carnet. Posé par la base. Null = créée avant le cloisonnement : lisible par son projet, mais non modifiable tant que personne ne l''a reprise.';
