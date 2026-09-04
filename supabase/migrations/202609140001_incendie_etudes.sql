-- Les études incendie d'un projet : ce qui a été répondu, et rien d'autre.
--
-- ## Pourquoi elles n'existaient pas
--
-- Le questionnaire vivait dans la page. Fermer l'onglet, changer de projet,
-- recharger : quarante réponses perdues, et il fallait tout refaire pour poser
-- la question suivante. Un travail qu'on n'ose pas interrompre est un travail
-- qu'on ne reprend pas.
--
-- ## Plusieurs études, et c'est le sujet
--
-- Un même projet se traite rarement d'une seule façon : on regarde ce que
-- donne une 3e famille B, puis la même opération en 2e famille avec un escalier
-- de plus. Ce ne sont pas deux versions d'une étude, ce sont deux hypothèses
-- qu'on veut pouvoir comparer et garder côte à côte. La table en accepte donc
-- autant qu'on en ouvre, chacune avec son nom.
--
-- ## Les réponses se conservent, les conclusions se recalculent
--
-- C'est la règle de la maison, et elle vaut ici plus qu'ailleurs : « ce qui est
-- dérivé se recalcule tant qu'il sert à décider ; ce qui a été décidé se
-- conserve ». Un degré coupe-feu enregistré serait une vérité gelée le jour où
-- on l'a lue ; le référentiel progresse — une règle mieux dépouillée, un
-- commentaire ajouté — et l'écran afficherait encore l'ancienne conclusion sans
-- que rien ne le dise. Ce qui a été **décidé**, ce sont les réponses : le
-- nombre d'étages, la présence d'un sous-sol, la nature de la façade. Elles
-- seules sont conservées, et le verdict se refait à chaque ouverture.
--
-- ## Ce que l'empreinte sert à savoir
--
-- Recalculer sans rien garder laisserait passer en silence le cas qui compte :
-- le référentiel a changé, et **cette étude-ci** ne conclut plus la même chose.
-- On garde donc, à côté des réponses, la version du référentiel et une
-- empreinte des conclusions — une chaîne courte, dérivée d'elles, qui ne permet
-- pas de les relire. Elle ne fait jamais foi ; elle permet seulement de dire
-- « trois conclusions ont changé depuis votre dernier passage », ce qu'un
-- ingénieur a le droit de savoir avant de signer.
--
-- ## Privé, comme le reste de l'atelier
--
-- Une étude est un brouillon : on essaie une famille, on recule, on recommence.
-- Publier ces essais aux collaborateurs du projet reviendrait à montrer le
-- brouillon de quelqu'un, et la première conséquence serait qu'on cesse
-- d'essayer. **Propriétaire seulement**, dans les deux sens, comme les semelles
-- de fondations et les discussions du copilote. Le projet est rattaché pour
-- ranger et pour compter, jamais pour ouvrir un droit.

create table if not exists public.incendie_etudes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Le nom que l'ingénieur lui donne : « Bâtiment A — 3e famille B ». Vide au
  -- départ : l'écran en propose un, il ne l'impose pas.
  titre text not null default '',

  -- Les réponses au questionnaire, telles qu'elles ont été données. C'est la
  -- seule chose que cette table tient pour vraie.
  reponses jsonb not null default '{}'::jsonb,

  -- La version du référentiel au moment du dernier enregistrement, et une
  -- empreinte des conclusions d'alors. Ni l'une ni l'autre ne fait foi : elles
  -- servent à dire que quelque chose a bougé.
  referentiel text not null default '',
  empreinte text not null default '',

  -- L'ordre dans la liste. Il se décide à la main : celui du chantier n'est ni
  -- alphabétique ni chronologique.
  rang integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incendie_etudes_projet_idx
  on public.incendie_etudes (project_id, owner_id, rang, updated_at desc);

alter table public.incendie_etudes enable row level security;

-- `with check` autant que `using` : sans lui, on pourrait écrire une ligne au
-- nom d'un autre.
create policy incendie_etudes_owner_only on public.incendie_etudes
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.touch_incendie_etudes()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_incendie_etudes_updated_at on public.incendie_etudes;
create trigger trg_incendie_etudes_updated_at
  before update on public.incendie_etudes
  for each row execute function public.touch_incendie_etudes();
