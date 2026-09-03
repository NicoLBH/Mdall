-- La notice descriptive de sécurité, et la bibliothèque qui se construit à
-- l'usage.
--
-- ## Deux tables, deux régimes, et ce n'est pas un détail
--
-- La **notice** est un document de projet : elle porte l'adresse, la maîtrise
-- d'ouvrage, les choix de conception. Elle suit donc la règle des autres
-- travaux d'atelier — propriétaire seulement, dans les deux sens.
--
-- La **bibliothèque de choix** est l'inverse : c'est elle qui fait remonter
-- « béton armé » en tête parce que c'est la réponse la plus fréquente. Pour
-- cela il faut compter à travers les projets, et donc laisser sortir quelque
-- chose. Ce qui sort a été pesé :
--
--   - le **libellé** du choix — « bardage bois », « poutrelles-hourdis » ;
--   - le **territoire**, réduit au département.
--
-- Et rien d'autre. Ni le projet, ni l'adresse, ni le compte, ni la date. On ne
-- peut donc pas remonter d'une ligne à un chantier ni à quelqu'un : la table
-- ne contient pas plus que ce qu'on apprendrait en se promenant dans la rue,
-- sauf pour ce qui ne se voit pas de l'extérieur — la nature d'un plancher,
-- d'une charpente. C'est ce qui a été retenu, en connaissance de cause : le
-- classement par fréquence n'a pas besoin de savoir qui a répondu.
--
-- Les lignes ne s'écrivent pas directement : elles passent par une fonction,
-- qui n'accepte que ces trois colonnes. Sans elle, il aurait suffi d'ajouter un
-- champ un jour pour que la promesse tombe.

create table if not exists public.incendie_notices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,

  -- Ce que l'utilisateur a ajouté aux phrases : la matière, le procédé, le
  -- dispositif. Les phrases elles-mêmes ne sont pas conservées — elles se
  -- rédigent à l'ouverture, et se rédigent juste même si le référentiel a
  -- progressé entre-temps.
  complements jsonb not null default '{}'::jsonb,
  -- L'en-tête administratif : dénomination, adresse, maîtrise d'ouvrage…
  entete jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (project_id, owner_id)
);

alter table public.incendie_notices enable row level security;

create policy incendie_notices_owner_only on public.incendie_notices
  for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create or replace function public.touch_incendie_notices()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_incendie_notices_updated_at on public.incendie_notices;
create trigger trg_incendie_notices_updated_at
  before update on public.incendie_notices
  for each row execute function public.touch_incendie_notices();

-- ------------------------------------------------------------------ --
-- La bibliothèque, mutualisée
-- ------------------------------------------------------------------ --

create table if not exists public.incendie_choix (
  -- « planchers.materiau », « facade.systeme » : sous quelle question le choix
  -- a été fait.
  rubrique text not null,
  -- Ce qui a été retenu, tel qu'il s'écrit dans la notice.
  libelle text not null,
  -- Le département, ou la chaîne vide. C'est la seule granularité retenue :
  -- « en montagne c'est du bardage bois » se lit à cette échelle, et une
  -- commune serait déjà presque un chantier.
  territoire text not null default '',
  -- Combien de fois ce choix a été retenu. C'est tout ce qu'on garde.
  poids integer not null default 0 check (poids >= 0),

  primary key (rubrique, libelle, territoire)
);

create index if not exists incendie_choix_rubrique_idx
  on public.incendie_choix (rubrique, poids desc);

alter table public.incendie_choix enable row level security;

-- Lecture pour tous les comptes authentifiés : c'est le sens même d'une
-- bibliothèque qui se construit à l'usage.
create policy incendie_choix_lecture on public.incendie_choix
  for select to authenticated using (true);

-- Aucune écriture directe. La seule porte est la fonction ci-dessous, et elle
-- n'accepte que trois valeurs : sans cela, il aurait suffi d'ajouter une
-- colonne un jour pour que la promesse tombe.
create or replace function public.incendie_retenir_choix(
  p_rubrique text,
  p_libelle text,
  p_territoire text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rubrique text := nullif(btrim(p_rubrique), '');
  v_libelle text := nullif(btrim(p_libelle), '');
  v_territoire text := coalesce(substring(btrim(p_territoire) from '^[0-9AB]{2,3}'), '');
begin
  if auth.uid() is null then
    raise exception 'authentification requise';
  end if;
  if v_rubrique is null or v_libelle is null then
    return;
  end if;
  -- Un libellé trop long n'est plus un choix, c'est une phrase : on ne compte
  -- pas des phrases, et on ne veut pas qu'un texte libre finisse mutualisé.
  if length(v_libelle) > 120 then
    return;
  end if;

  insert into public.incendie_choix (rubrique, libelle, territoire, poids)
  values (v_rubrique, v_libelle, v_territoire, 1)
  on conflict (rubrique, libelle, territoire)
  do update set poids = public.incendie_choix.poids + 1;
end;
$$;

revoke all on function public.incendie_retenir_choix(text, text, text) from public;
grant execute on function public.incendie_retenir_choix(text, text, text) to authenticated;
