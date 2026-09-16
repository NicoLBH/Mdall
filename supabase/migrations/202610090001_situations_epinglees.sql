-- Une situation qu'on épingle au rail, et les autres.
--
-- ## Le défaut que ça répare
--
-- Le rail du carnet montrait **toutes** mes situations, parce qu'il n'y avait
-- rien pour dire lesquelles. Sur un carnet qui en compte vingt-six, la barre de
-- gauche devient une liste qu'on ne parcourt plus — et c'est exactement ce que
-- le rail existe pour éviter : il est court, et une entrée de plus coûte une
-- place à celles qu'on regarde tous les jours.
--
-- C'est la règle que `memory_pinned_searches` porte déjà pour les vues de
-- l'onglet Sujets : *« une vue enregistrée vit sur son écran ; elle ne monte au
-- rail que lorsqu'on l'y met »*. Elle vaut ici mot pour mot.
--
-- ## Faux par défaut, et c'est un choix
--
-- Les situations qui existent aujourd'hui ne sont pas épinglées. On aurait pu
-- les épingler toutes pour ne rien changer à ce qu'on voit — mais ce qu'on voit
-- est précisément le défaut : un rail de vingt-six entrées que personne n'a
-- demandées. Le carnet garde ses situations, son tableau les montre toutes, et
-- le rail redevient court jusqu'à ce qu'on y mette quelque chose.
--
-- ## Pas de sens caché
--
-- `au_rail` ne dit rien de la situation elle-même : ni qu'elle est importante,
-- ni qu'elle est active. Elle dit **où on la trouve**. Lui faire porter autre
-- chose — une priorité, une mise en avant — ferait un attribut qui décide de
-- deux choses, et l'une des deux finirait par surprendre.
--
-- Strictement additive : une colonne avec un défaut. Aucune donnée déplacée,
-- aucune colonne retirée, aucune règle changée.

alter table public.situations
  add column if not exists au_rail boolean not null default false;

comment on column public.situations.au_rail is
  'Cette situation occupe-t-elle une place dans le rail du carnet ? Dit où on la trouve, et rien d''autre — ni son importance, ni son état. Faux par défaut : le rail est court, et une entrée de plus coûte une place à celles qu''on regarde tous les jours.';
