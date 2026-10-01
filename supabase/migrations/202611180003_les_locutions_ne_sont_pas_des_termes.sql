-- ════════════════════════════════════════════════════════════════════════════
--  « delà » n'est pas un terme — les morceaux de locution tombent
-- ════════════════════════════════════════════════════════════════════════════
--
--  ## L'idée fausse, et comment elle se fabriquait
--
--  Sur le corpus lu en entier, deux idées seulement sortaient. L'une était :
--
--      accès  —empêchement→  delà
--
--  Elle vient de « Accès des véhicules lourds : interdit au-delà de 3,5 t ».
--  Le découpage a bien travaillé : « interdit » est un empêchement, il est bien
--  entre les deux membres. C'est le terme de droite qui est faux.
--
--  `le_terme_de_tete` normalise d'abord : le trait d'union devient une espace,
--  « au-delà » devient « au dela ». Puis elle écarte les mots de moins de
--  quatre lettres — « au » tombe — et les mots-outils. « dela » fait quatre
--  lettres et n'était pas dans la liste : il passe, et devient un terme.
--
--  Ce n'est pas un détail d'affichage. Une idée fausse rendue avec l'aplomb des
--  vraies est pire qu'une idée manquante : celle-ci on la cherche, celle-là on
--  la croit. Sur deux idées, une était ce morceau-là.
--
--  ## Ce qu'on ajoute, et pourquoi pas plus
--
--  Les morceaux de locution de lieu que la normalisation laisse à quatre
--  lettres ou plus : « dela », « deca », « dessus », « dessous », « dedans »,
--  « dehors ». Ils viennent tous de « au-delà », « en-deçà », « ci-dessus »,
--  « par-dessous », « en dedans », « au dehors » — jamais d'un terme de
--  chantier.
--
--  On s'arrête là, et c'est volontaire. Un mot-outil retiré de trop est un
--  terme technique qu'on ne verra plus jamais, et cela ne se rattrape pas en
--  regardant l'écran : l'idée manquante ne s'affiche pas. « joint » vient de
--  « ci-joint » aussi souvent que d'un joint de dilatation, et il reste. La
--  liste se corrige en regardant ce que la console montre, pas en devinant.
--
--  Strictement additive : `create or replace` de même signature. Aucune table,
--  aucune colonne, aucune politique touchée. Les six lectures de la console
--  passent par `le_terme_de_tete`, qui lit cette liste : elles en profitent
--  sans être retouchées.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.les_mots_outils()
returns text[]
language sql
immutable
as $$
  select array[
    'avec','dans','pour','par','sur','sous','entre','vers','chez','depuis',
    'cette','cet','ces','les','des','une','aux','leur','leurs','notre','nos',
    'votre','vos','mon','ton','son','ses','que','qui','quoi','dont','donc',
    'mais','car','ainsi','alors','comme','plus','moins','tres','tout','tous',
    'toute','toutes','autre','autres','meme','memes','etre','avoir','fait',
    'faire','doit','doivent','peut','peuvent','sera','seront','etait','etaient',
    'est','sont','ont','pas','non','oui','selon','afin','lors','apres','avant',
    -- Les morceaux de locution de lieu. « au-delà » se normalise en
    -- « au dela » ; « au » tombe de lui-même à deux lettres, « dela » non.
    'dela','deca','dessus','dessous','dedans','dehors',
    'projet','chantier','dossier','document','page','partie','point','cas',
    'suite','objet','reunion','compte','rendu','courrier','mail','message',
    'monsieur','madame','bonjour','cordialement','merci','demande','reponse',
    'information','informations','element','elements','ensemble','niveau',
    'type','nature','etat','date','jour','semaine','mois','annee'
  ];
$$;

comment on function public.les_mots_outils() is
  'Les mots qui ne designent rien de technique, morceaux de locution compris. Ecrits une seule fois : c''est la liste qu''on corrigera en regardant ce que la console montre.';
