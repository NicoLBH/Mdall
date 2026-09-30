-- L'annuaire des personnes, rendu à ceux qui l'ont écrit.
--
-- CE QUE LE TOUR PRÉCÉDENT A LAISSÉ OUVERT, ET L'A DIT
--
-- `202611040001_...` a fermé vingt-six tables à la clé publique du navigateur.
-- `directory_people` n'a reçu que la moitié du traitement : `anon` en est
-- sorti, mais **tout compte connecté y lit encore le nom, l'adresse et la
-- société de toutes les personnes de tous les chantiers**.
--
-- La raison était une contrainte : `email_normalized` est unique **sur toute la
-- table**. Ajouter un collaborateur consiste à chercher son adresse et à ne
-- créer la ligne que si personne ne l'a déjà créée. Restreindre la lecture sans
-- toucher à l'unicité casse exactement ce geste : on ne voit pas la ligne d'un
-- autre, on essaie de l'écrire, et l'on heurte la contrainte sans comprendre
-- pourquoi.
--
-- C'est donc la **forme du registre** qu'il faut changer, et c'est ce que fait
-- cette migration.
--
-- 1. CHAQUE PERSONNE EST RENDUE À QUELQU'UN
--
-- `created_by_user_id` existe depuis mai et le code le remplit. Les lignes plus
-- anciennes sont à `null` ; fermer sans rien faire les rendrait invisibles à
-- tout le monde, y compris à celui qui s'en sert.
--
-- On les rend donc à leur propriétaire, et on ne le devine pas : on le lit. Si
-- toutes les collaborations qui citent cette personne appartiennent à des
-- chantiers d'un **seul** utilisateur, c'est le sien. S'il y en a zéro ou
-- plusieurs, on ne touche à rien — la troisième clause de la règle, plus bas,
-- les rattrape par le chantier.
--
-- Ce n'est pas additif, et c'est dit : l'instruction écrit dans une table
-- existante. Elle ne remplit que ce qui est vide, et elle est rejouable.
--
-- 2. L'UNICITÉ DEVIENT CELLE D'UN ANNUAIRE, PAS D'UN FICHIER CENTRAL
--
-- Deux personnes différentes peuvent tenir chacune la fiche de la même adresse.
-- C'est le propre d'un carnet d'adresses, et c'est ce qui permet de fermer la
-- lecture sans casser l'écriture.

update public.directory_people dp
   set created_by_user_id = seul.qui
  from (
    select pc.person_id, (array_agg(distinct p.owner_id))[1] as qui
      from public.project_collaborators pc
      join public.projects p on p.id = pc.project_id
     where p.owner_id is not null
     group by pc.person_id
    having count(distinct p.owner_id) = 1
  ) seul
 where dp.id = seul.person_id
   and dp.created_by_user_id is null;

alter table public.directory_people
  drop constraint if exists directory_people_email_normalized_unique;

-- `null` n'égale pas `null` : les lignes qu'on n'a pas su attribuer ne se
-- gênent pas entre elles, et ne bloquent personne.
create unique index if not exists directory_people_par_proprietaire
  on public.directory_people (created_by_user_id, email_normalized);

-- 3. LA RÈGLE
--
-- Quatre façons d'avoir affaire à une personne, et **il les faut toutes** :
-- fermer aux trois dernières rendrait muets des écrans qui marchent
-- aujourd'hui, ce qui est le défaut qu'on cherche à éviter depuis deux tours.
--
--   * je l'ai écrite ;
--   * c'est moi ;
--   * elle collabore à l'un de mes chantiers — sans quoi la vue des
--     collaborateurs, qui joint cette table, perdrait ses lignes ;
--   * elle est assignée à un sujet de l'un de mes chantiers — même raison.

drop policy if exists directory_people_connecte on public.directory_people;
drop policy if exists directory_people_a_moi on public.directory_people;
create policy directory_people_a_moi
on public.directory_people
for all
to authenticated
using (
  created_by_user_id = auth.uid()
  or linked_user_id = auth.uid()
  or exists (
    select 1
      from public.project_collaborators pc
      join public.projects p on p.id = pc.project_id
     where pc.person_id = directory_people.id
       and p.owner_id = auth.uid()
  )
  or exists (
    select 1
      from public.subject_assignees sa
      join public.projects p on p.id = sa.project_id
     where sa.person_id = directory_people.id
       and p.owner_id = auth.uid()
  )
)
-- **On n'écrit qu'en son propre nom.** Sans cela, on pourrait poser une fiche
-- au nom de quelqu'un d'autre — et la lire ensuite par la première clause.
with check (created_by_user_id = auth.uid());

comment on table public.directory_people is
  'Le carnet d''adresses de chacun. Une personne appartient à qui l''a écrite ; deux comptes peuvent tenir la fiche de la même adresse. Lisible aussi quand la personne est moi, collabore à l''un de mes chantiers, ou est assignée à l''un de mes sujets.';
