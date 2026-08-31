-- La mémoire du projet, enfin quelque part.
--
-- Jusqu'ici on disait « on compare le nouveau dépôt à la mémoire du projet »,
-- et c'était vrai — mais cette mémoire n'existait nulle part comme objet. Elle
-- était éparpillée : les marqueurs d'identité dans une table, les avis dans le
-- suivi, les décisions dans les propositions closes, le reste dans des sujets.
-- Aucun écran ne pouvait la montrer, et rien ne pouvait la transmettre.
--
-- Cette table est **la couche des affirmations**. Une affirmation est une chose
-- que le projet tient pour vraie, et elle porte tout ce qu'il faut pour en
-- répondre : ce qu'elle dit, d'où elle vient, qui l'a tranchée, quand, et ce
-- qu'elle remplace.
--
-- Quatre propriétés se lisent dans sa forme, et chacune répond à une question
-- qu'on se posera dans six mois.
--
-- 1. **Elle est en ajout seul.** Rien n'est modifié, rien n'est effacé. Une
--    affirmation qui cesse d'être vraie n'est pas corrigée : une autre la
--    remplace, et le lien entre les deux se garde. « Qui a dit ça, et quand
--    a-t-on cessé de le croire ? » doit avoir une réponse.
--
-- 2. **Elle porte sa source.** La proposition qui l'a versée, son numéro, le
--    document d'où elle vient. Une mémoire sans provenance est une rumeur.
--
-- 3. **Elle porte sa décision.** `status` dit si le projet l'assume ou l'a
--    écartée, `decided_by` et `decided_at` disent qui et quand. C'est ce qui
--    distingue cette table d'un corpus de documents : un modèle à grand
--    contexte sait tout ce qui a été dit, Mdall sait ce qui a été décidé.
--
-- 4. **Elle a une clé métier stable.** `subject_key` est le numéro d'avis, la
--    valeur d'affaire, l'identifiant de document — jamais un rang ni une date.
--    C'est par elle qu'une affirmation d'aujourd'hui retrouve celle d'hier, et
--    la seule qui survive à un recalcul complet du moteur.
--
-- Ce que cette table **n'est pas** : une liste de sujets. Un sujet est ce qu'un
-- humain a décidé de suivre ; une affirmation est un fait daté. Un sujet par
-- avis noierait le projet — dix-sept documents font quarante et un avis, et la
-- liste des sujets, seul endroit où quelqu'un regarde, deviendrait illisible.
-- C'est le partage de GitHub : tous les commits sont la mémoire, seuls
-- quelques-uns deviennent des issues.

create table if not exists public.project_assertions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,

  -- La nature et la clé métier : `avis` / « A12 », `attachment` / « affaire:13861 ».
  kind text not null,
  subject_key text not null,

  -- Ce qu'elle dit, en français, et sa précision. Le texte est écrit au moment
  -- où l'on tranche : le reformuler plus tard réécrirait ce qui a été signé.
  statement text not null,
  detail text,

  -- Ce que le projet en fait.
  status text not null,

  -- Le contenu brut de l'affirmation, tel que la revue le portait.
  payload jsonb,

  -- D'où elle vient.
  proposition_id uuid references public.propositions(id) on delete set null,
  proposition_number integer,
  source_document_id uuid references public.documents(id) on delete set null,

  -- Qui l'a tranchée, et quand.
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz not null default now(),

  -- Ce qu'elle remplace, et ce qui la remplace. Les deux sens se gardent : on
  -- lit une mémoire aussi bien en avant qu'en arrière.
  supersedes uuid references public.project_assertions(id) on delete set null,
  superseded_by uuid references public.project_assertions(id) on delete set null,
  superseded_at timestamptz,

  created_at timestamptz not null default now(),

  constraint project_assertions_status_check check (status in ('assumed', 'rejected')),
  -- Une proposition ne verse qu'une fois chaque affirmation. C'est aussi ce qui
  -- rend le rattrapage des propositions déjà fusionnées rejouable sans dégât.
  constraint project_assertions_unique unique (proposition_id, kind, subject_key)
);

create index if not exists project_assertions_project_idx
  on public.project_assertions (project_id, decided_at desc);

-- L'état courant se lit par cette clé : la dernière affirmation non remplacée.
create index if not exists project_assertions_current_idx
  on public.project_assertions (project_id, kind, subject_key)
  where superseded_by is null;

alter table public.project_assertions enable row level security;

drop policy if exists "project_assertions_open_all" on public.project_assertions;
create policy "project_assertions_open_all"
on public.project_assertions
for all
to anon, authenticated
using (true)
with check (true);
