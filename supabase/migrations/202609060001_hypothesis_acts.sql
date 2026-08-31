-- Ce que les gens font à une hypothèse : l'émettre, la valider, la contester.
--
-- Une hypothèse n'est pas seulement une valeur : c'est une valeur **que
-- quelqu'un a posée**, et sur laquelle d'autres se prononcent. Dans les avis
-- des bureaux de contrôle se cachent des validations d'hypothèses, et c'est ce
-- que le modèle ignorait :
--
--   1. le BET émet « zone de neige : A1 » dans sa note de calcul ;
--   2. le BC émet un avis D — « A1 alors que le projet est en zone E » : ce
--      constat **conteste** l'hypothèse, et en avance une autre ;
--   3. la note indice 2 émet « zone E » ;
--   4. le BC émet un avis F : ce constat **valide** l'hypothèse en vigueur.
--
-- Le constat reste un constat. Ce qu'il fait à l'hypothèse est un **acte**, et
-- c'est l'acte qu'on enregistre ici. L'avis n'entraîne rien par lui-même ; il
-- change l'état d'une hypothèse, et c'est elle qui entraîne. La règle « seules
-- les hypothèses entraînent » tient donc toujours — elle était seulement
-- incomplète.
--
-- ## Trois décisions
--
-- **Tout le monde peut valider, comme tout le monde peut contester.** Aucune
-- qualification n'est vérifiée : l'acte porte qui l'a posé et quand, et c'est au
-- lecteur de juger ce que vaut la signature. Filtrer les valideurs demanderait
-- de décider qui est compétent sur quoi — une question qu'aucune table ne peut
-- trancher et qui, mal tranchée, ferait disparaître des actes vrais.
--
-- **Une contestation peut avancer une valeur.** C'est le cas ordinaire :
-- « A1 alors que le projet est en zone E ». Cette valeur concurrente vit sur
-- l'acte, pas comme une seconde hypothèse en vigueur : « une seule valeur à la
-- fois » reste vrai, et le doute se lit — « en vigueur : A1, contestée le 12
-- août par X, qui avance E » — au lieu d'être arbitré par la machine.
--
-- **Un acte peut citer l'affirmation qui le porte.** L'avis F du BC est un
-- constat de la mémoire : `source_assertion_id` le nomme. C'est ainsi qu'on
-- remonte d'une validation au document qui l'établit, plutôt que de la croire
-- sur parole.
--
-- ## Ce que cette table ne fait pas
--
-- Elle ne calcule aucun état. « Candidate », « validée », « contestée » se
-- **déduisent** des actes à la lecture : un état stocké finirait par contredire
-- les actes qui l'ont produit, et c'est toujours l'état qu'on croirait.
--
-- Elle ne convertit pas la répétition en validation. Une hypothèse reprise dans
-- quatre documents sans qu'aucun ne la valide reste non validée : trois
-- documents peuvent recopier l'erreur du premier. Le nombre se dit, il ne se
-- transforme pas.
--
-- Additive : aucune colonne existante n'est modifiée ni supprimée.

create table if not exists public.assertion_acts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,

  -- L'hypothèse sur laquelle l'acte porte.
  assertion_id uuid not null references public.project_assertions(id) on delete cascade,

  -- « emitted » | « validated » | « contested ».
  verdict text not null,

  -- Ce que la contestation avance, quand elle avance quelque chose.
  proposed_value text,

  -- Ce que celui qui se prononce en dit.
  note text,

  -- L'affirmation qui porte cet acte — l'avis du bureau de contrôle, le plus
  -- souvent —, et de quoi remonter au document.
  source_assertion_id uuid references public.project_assertions(id) on delete set null,
  source_document_id uuid,
  source_page integer,

  declared_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Les actes d'une hypothèse se lisent ensemble, dans l'ordre du temps : c'est
-- son histoire, et l'état courant s'en déduit.
create index if not exists assertion_acts_assertion_idx
  on public.assertion_acts (assertion_id, created_at);

create index if not exists assertion_acts_project_idx
  on public.assertion_acts (project_id);

alter table public.assertion_acts enable row level security;

-- La même politique que la mémoire dont ces actes font partie. En poser une
-- plus stricte montrerait des hypothèses sans leurs actes, c'est-à-dire des
-- valeurs qu'on croirait établies alors qu'elles sont contestées.
drop policy if exists "assertion_acts_open_all" on public.assertion_acts;
create policy "assertion_acts_open_all"
on public.assertion_acts
for all
to anon, authenticated
using (true)
with check (true);
