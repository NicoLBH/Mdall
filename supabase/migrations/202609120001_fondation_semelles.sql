-- Les semelles d'une étude de fondations, et à qui elles appartiennent.
--
-- Un projet ne se dimensionne pas semelle par semelle dans le vide : on en
-- vérifie une vingtaine — courants sud, courants centre, pignons, stabilités —
-- et ce qui compte à la fin, c'est le tableau qui les récapitule, avec le
-- nombre de massifs de chaque type et le volume de béton total. Sans cette
-- table, chaque vérification effaçait la précédente.
--
-- ## Privé, comme les discussions du copilote
--
-- C'est un travail d'atelier : on essaie, on fait varier une cote, on relance.
-- Publier ces essais reviendrait à afficher le brouillon de quelqu'un, et la
-- première conséquence serait qu'on cesse d'essayer. La règle est donc la même
-- que pour les conversations : **propriétaire seulement**, dans les deux sens,
-- et pour les comptes authentifiés uniquement.
--
-- ## Ce qui est conservé, et ce qui ne l'est pas
--
-- Les **entrées**, et rien d'autre. Le résultat est dérivé : le garder ferait
-- vivre côte à côte deux vérités qui divergeraient au premier progrès du
-- moteur, et l'on ne saurait plus laquelle fait foi. Il se recalcule à
-- l'ouverture, ce qui coûte un aller-retour et garantit que le tableau décrit
-- le projet tel que le calcul le voit aujourd'hui.
--
-- Le projet est rattaché pour pouvoir ranger et compter, pas pour ouvrir un
-- droit : appartenir au projet ne donne aucun accès à ces lignes.

create table if not exists public.fondation_semelles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Le nom que l'ingénieur lui donne : « Massifs courants Sud ».
  designation text not null default '',
  -- Combien de massifs de ce type le projet compte. C'est lui qui transforme
  -- une vérification en quantité de béton.
  nombre integer not null default 1 check (nombre >= 0),
  -- L'ordre dans le tableau. Il se décide à la main : celui du chantier n'est
  -- ni alphabétique ni chronologique.
  rang integer not null default 0,

  entrees jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fondation_semelles_projet_idx
  on public.fondation_semelles (project_id, owner_id, rang);

alter table public.fondation_semelles enable row level security;

-- Propriétaire seulement, en lecture comme en écriture. `with check` autant que
-- `using` : sans lui, on pourrait écrire une ligne au nom d'un autre.
create policy fondation_semelles_owner_only on public.fondation_semelles
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.touch_fondation_semelles()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_fondation_semelles_updated_at on public.fondation_semelles;
create trigger trg_fondation_semelles_updated_at
  before update on public.fondation_semelles
  for each row execute function public.touch_fondation_semelles();
