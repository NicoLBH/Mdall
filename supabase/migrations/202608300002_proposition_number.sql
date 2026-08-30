-- Le numéro d'une proposition, propre à son projet.
--
-- « #3 » se cite, se recherche, se dit à voix haute dans une réunion. Un uuid,
-- non. C'est la même raison qui fait que les pull requests en portent un.
--
-- Le numéro est attribué par la base et non par le navigateur : deux dépôts
-- simultanés y liraient le même maximum et fabriqueraient deux « #4 ». Le
-- déclencheur ferme cette porte définitivement, et la contrainte d'unicité la
-- verrouille — de sorte qu'aucun chemin, pas même une écriture directe, ne
-- puisse produire un doublon.
--
-- La numérotation repart de 1 dans chaque projet : c'est ce qu'on attend d'une
-- référence qu'on prononce, et deux projets n'ont jamais à comparer leurs
-- numéros.

alter table public.propositions
  add column if not exists number integer;

create or replace function public.assign_proposition_number()
returns trigger
language plpgsql
as $$
begin
  if new.number is null then
    select coalesce(max(number), 0) + 1
      into new.number
      from public.propositions
     where project_id = new.project_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_propositions_number on public.propositions;
create trigger trg_propositions_number
before insert on public.propositions
for each row execute function public.assign_proposition_number();

-- Les propositions déjà créées reçoivent leur numéro dans l'ordre où elles sont
-- nées : celles d'avant ce jour ne doivent pas rester sans référence.
update public.propositions as p
   set number = ordre.rang
  from (
    select id, row_number() over (partition by project_id order by created_at, id) as rang
      from public.propositions
     where number is null
  ) as ordre
 where p.id = ordre.id
   and p.number is null;

alter table public.propositions
  drop constraint if exists propositions_number_unique;
alter table public.propositions
  add constraint propositions_number_unique unique (project_id, number);
