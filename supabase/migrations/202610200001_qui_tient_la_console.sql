-- Qui tient la console d'administration.
--
-- ## Ce que cette table n'est pas
--
-- Ce n'est **pas** une liste d'utilisateurs privilégiés que l'application
-- consulterait pour décider quoi afficher. C'est une **porte**, et elle ne
-- s'ouvre que pour celui qui la pousse.
--
-- La différence est entière. Une table qu'un navigateur peut lire en entier
-- dit à chacun qui administre Mdall — donc qui démarcher, qui hameçonner, qui
-- mettre sous pression. Ici, la politique de lecture ne rend **que sa propre
-- ligne** : un administrateur sait qu'il en est un, et n'apprend rien sur les
-- autres. Personne d'autre n'apprend rien du tout, pas même qu'il existe des
-- administrateurs.
--
-- C'est le même principe qu'ailleurs dans Mdall : ce qui ne doit pas sortir ne
-- sort pas parce que **la forme l'empêche**, et non parce qu'un écran a pensé
-- à ne pas le dessiner.
--
-- ## Ce qu'elle ne porte pas, et pourquoi c'est volontaire
--
-- Aucun rôle, aucun niveau, aucun périmètre. Administrateur ou pas. Un
-- échelonnement se conçoit le jour où deux personnes font deux métiers
-- différents dans la console ; l'inventer maintenant reviendrait à écrire un
-- vocabulaire que rien ne vérifie (règle 12), et à devoir le défaire.
--
-- ## Ce qu'elle ne donne pas
--
-- **Elle ne donne aucun accès aux données des projets.** Les politiques qui
-- protègent la mémoire, les conversations avec le copilote et les mails ne
-- connaissent pas cette table et ne la connaîtront pas : un administrateur de
-- Mdall n'est pas un collaborateur de tous les chantiers. Ce qu'ouvre cette
-- porte, c'est une console qui lit des **comptes** — combien d'utilisateurs,
-- combien de sujets, quelles fonctions tombent en panne —, jamais des contenus
-- (`docs/la-console-de-ladministrateur.md`).
--
-- ## L'adresse, et pas l'identifiant
--
-- On reconnaît l'administrateur à l'adresse portée par son jeton. C'est ce qui
-- permet de poser la porte **avant** que la personne n'ait de compte : elle
-- s'inscrit, et la porte est déjà là. Avec un identifiant, il aurait fallu
-- créer le compte d'abord, puis revenir écrire la ligne — deux gestes, dont le
-- second s'oublie.
--
-- L'adresse se compare en minuscules, des deux côtés : une majuscule de frappe
-- fermerait la porte sans dire pourquoi.
--
-- Additive : nouvelle table, aucune colonne existante n'est modifiée.

create table if not exists public.administrateurs (
  -- L'adresse, rangée en minuscules par la contrainte elle-même : une valeur
  -- écrite de deux façons finit par ne plus se retrouver (règle 4).
  courriel text primary key
    constraint administrateurs_courriel_minuscule check (courriel = lower(courriel)),

  -- À quoi sert cette porte, en clair. Pour que celui qui relira la table dans
  -- deux ans sache pourquoi cette adresse y est.
  pourquoi text,

  ouvert_le timestamptz not null default now()
);

alter table public.administrateurs enable row level security;

-- **On ne voit que sa propre ligne.** Aucune politique ne rend les autres, donc
-- aucun navigateur — pas même celui d'un administrateur — ne peut obtenir la
-- liste. La question à laquelle cette table répond est « suis-je
-- administrateur ? », et c'est la seule.
drop policy if exists "administrateurs_je_ne_vois_que_moi" on public.administrateurs;
create policy "administrateurs_je_ne_vois_que_moi"
on public.administrateurs
for select
to authenticated
using (courriel = lower(auth.jwt() ->> 'email'));

-- **Aucune politique d'écriture, de modification ni de suppression.** La porte
-- ne s'ouvre pas depuis l'application : elle s'ouvre dans la console Supabase,
-- par quelqu'un qui tient déjà les clés de la base. Une table de droits que son
-- propre titulaire peut étendre ne protège rien.

insert into public.administrateurs (courriel, pourquoi)
values ('nicolas.lebihan@yahoo.fr', 'auteur de Mdall')
on conflict (courriel) do nothing;

comment on table public.administrateurs is
  'La porte de la console d''administration. Chacun n''y voit que sa propre ligne : la liste des administrateurs n''est lisible par aucun navigateur. Aucune écriture depuis l''application — elle se tient dans la console Supabase.';
