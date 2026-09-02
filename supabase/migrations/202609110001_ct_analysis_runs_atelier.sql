-- Ce qui vient de l'Atelier n'appartient pas au projet.
--
-- Le journal des actions est lu par tous les collaborateurs, et c'est
-- normal : il raconte ce qui est arrivé au projet. Mais toutes les exécutions
-- n'ont pas cette nature. Dans l'Atelier on expérimente, on essaie un moteur,
-- on relance dix fois pour comprendre un écart : ce sont des gestes de travail
-- personnels, pas des actes du projet. Les afficher à tout le monde revient à
-- publier le brouillon de quelqu'un, et à décourager d'essayer.
--
-- La colonne `trigger_source` distinguait déjà l'origine — `atelier` contre
-- `proposition` ou `manual` — mais elle ne servait qu'à l'affichage : n'importe
-- qui voyait tout. Il manquait la seule chose qui fasse une séparation réelle :
-- **savoir à qui appartient l'exécution**, et le faire respecter par la base.
--
-- ## Ce que cette migration ajoute
--
-- Une colonne `owner_id`, renseignée toute seule à l'insertion, et une règle de
-- lecture qui écarte les exécutions d'Atelier des autres. La séparation est
-- donc tenue **par la base** : un écran qui oublierait de filtrer ne pourrait
-- pas montrer ce qu'il ne doit pas.
--
-- ## Ce qu'elle ne fait pas disparaître
--
-- Les lignes déjà écrites n'ont pas de propriétaire — la colonne n'existait
-- pas. Les cacher rétroactivement ferait disparaître du journal des exécutions
-- que des gens ont vues hier, sans que personne l'ait demandé. Elles restent
-- donc visibles, et l'écran le dit : « antérieure au cloisonnement ». Mieux
-- vaut une exception nommée qu'un trou silencieux.

alter table public.ct_analysis_runs
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- Le propriétaire se pose tout seul : demander au client de l'envoyer, ce
-- serait accepter qu'il envoie celui d'un autre.
alter table public.ct_analysis_runs
  alter column owner_id set default auth.uid();

create index if not exists ct_analysis_runs_owner_idx
  on public.ct_analysis_runs (owner_id);

-- La règle de lecture remplace l'ancienne, qui laissait tout passer. C'est le
-- seul endroit où elle peut être tenue : ailleurs, elle serait une politesse.
drop policy if exists ct_analysis_runs_open_all on public.ct_analysis_runs;

create policy ct_analysis_runs_lecture on public.ct_analysis_runs
  for select
  to anon, authenticated
  using (
    trigger_source is distinct from 'atelier'
    or owner_id is null
    or owner_id = auth.uid()
  );

-- L'écriture reste ce qu'elle était : cette migration cloisonne la lecture,
-- elle ne change pas qui a le droit d'exécuter une analyse.
create policy ct_analysis_runs_ecriture on public.ct_analysis_runs
  for insert
  to anon, authenticated
  with check (true);

create policy ct_analysis_runs_maj on public.ct_analysis_runs
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy ct_analysis_runs_suppression on public.ct_analysis_runs
  for delete
  to anon, authenticated
  using (true);
