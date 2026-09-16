# Les écrans qui traversent les projets

## Le problème

Mdall range presque tout par projet : ses documents, ses sujets, ses
propositions, sa mémoire. C'est juste — un projet est une unité de travail, et
ce qui s'y décide n'a pas de sens ailleurs.

**Mais on ne travaille pas un projet à la fois.** On arrive le matin en se
demandant ce qu'il y a à faire, pas sur quel chantier le faire. « Qu'est-ce qui
est bloqué ? », « qu'est-ce qui attend une décision ? », « qu'est-ce qui porte le
label critique ? » sont des questions qui traversent les projets — et l'on ne va
pas ouvrir quinze onglets pour y répondre.

Les situations l'ont montré les premières : elles sont sorties du giron d'un
projet parce qu'une situation dit ce qu'une **personne** se donne à faire. Les
sujets et les propositions se lisent de la même façon.

## Les trois entrées du menu

`services/ecrans-transversaux.js` tient leur nom, leur adresse et leur icône.
Chaque entrée est dite à trois endroits au moins — le menu, la route, le titre de
l'écran — et recopiée, elle finit par différer de l'une des trois (règle 10).

**« Tous les projets », et non « Projets ».** L'entrée menait déjà à la liste de
tous les projets ; son nom se lisait comme une catégorie plutôt que comme une
destination. Les trois commencent maintenant par le même mot, et l'on comprend
d'un coup d'œil que ce sont trois façons de tout regarder.

## Tous les sujets

**Cet écran n'ajoute aucune règle.** C'est tout le point.

- la **grammaire** de la barre est celle que les situations emploient déjà
  (`vocabulaire-du-carnet.js`) : elle connaît les labels, les objectifs, les gens
  et les projets de tous mes projets ;
- les **menus de filtre** de l'en-tête sont ceux de l'onglet Sujets d'un projet ;
- le **tableau** est celui que le formulaire d'une situation montre déjà —
  labels, auteur, blocage, fil, et le projet en colonne.

Une requête écrite ici retient donc exactement ce qu'elle retiendrait ailleurs
(règle 4). L'ordre des menus est en revanche le sien : le **projet d'abord**,
puisque c'est la première chose qu'on restreint quand on les traverse — et la
seule qu'un écran de projet ne peut pas offrir.

**Il n'ouvre pas un sujet.** Un sujet se lit, se commente et se ferme là où il
est, avec son fil, ses pièces et son arborescence. Chaque ligne mène à l'onglet
Sujets de son projet.

**Ce que la lecture coûte.** Une charge de sujets assemble cinq lectures par
projet — labels, objectifs, assignés, liens, signaux. Quinze projets font donc
soixante-quinze requêtes, lancées en parallèle. C'est le même coût que l'écran
des situations, et le réduire touche le chargeur, pas cet écran.

## Toutes les propositions

**Une proposition est une ligne**, pas une charge : `in.(…)` les prend toutes
d'un coup, et le compte des documents avec. Quinze projets font **deux**
requêtes, pas trente. C'est pourquoi `listPropositionsDesProjets` ne boucle pas
sur `listPropositions`.

La recherche y est en **texte libre**, et non la grammaire des sujets : une
proposition n'a ni label, ni assigné, ni objectif, et lui poser cette barre
promettrait des filtres qui ne retiendraient jamais rien. Elle cherche dans le
titre et dans le nom du projet — les deux choses à l'écran sur chaque ligne.

**Il n'ouvre pas une proposition.** Elle se lit, se discute et se tranche là où
son corpus est. Un détail monté ici montrerait la moitié de ce qu'elle est, et la
moitié qui manque est celle où l'on décide.

## Ce que ces écrans partagent

**Leur coquille.** `mon-carnet-coquille.js` sert les trois : c'est une coquille
de projet, sans projet. En écrire une seconde pour les nouveaux aurait fait deux
calages à retoucher ensemble, dont l'un finirait en retard sur l'autre.

**Leur marque.** `currentProjectId` nul, comme le carnet. C'est la seule chose
qui distingue « tous mes projets » de « celui-ci », et elle vit dans le magasin —
un second drapeau dirait un jour autre chose que le premier (règle 4).

**Leur découpe.** Un module qui parle à la base ne s'importe pas dans un test :
l'authentification tire son client d'un CDN, et l'import lève avant la première
ligne. Le **dessin** de chaque écran vit donc à part (`*-page.js`), précisément
pour qu'un test le monte et regarde ce qui sort. C'est la leçon du carnet, où un
nom employé sans être déclaré est passé trois tours sans bruit : seule
l'exécution le voit.

---

## Ouvrir, paginer, et ce qui manquait à la charge

### Une ligne mène quelque part

Les deux écrans listaient sans ouvrir : une ligne menait à l'onglet du projet,
et il fallait y retrouver à la main ce qu'on venait de désigner. C'était un lien
à moitié mort.

L'adresse porte maintenant l'identifiant :
`#project/<projet>/sujets/<sujet>` et `#project/<projet>/propositions/<proposition>`.
Elle se copie, elle se partage, et elle survit à un rechargement.

Trois modules se passent la main, et **explicitement** : le routeur lit le
quatrième morceau, la mise en page le transmet à l'onglet, l'onglet l'ouvre. Une
boîte aux lettres partagée aurait été un canal caché ; trois paramètres se lisent.

**On ouvre après la lecture, et pas avant.** `selectSubject` cherche le sujet
dans ce que l'écran a chargé : appelé tout de suite, il ne trouve rien et
s'arrête sans un mot — la ligne cliquée mènerait alors à la liste, ce qui se lit
comme un lien mort. Côté propositions, le mécanisme existait déjà
(`pendingPropositionId`, pour un sujet qui cite une proposition) : l'adresse
passe devant, et c'est le même endroit qui exécute le geste (règle 4).

### Le tableau sous un formulaire ne mène nulle part

C'est la même fonction de rendu, et elle sert à deux choses différentes. Sous le
formulaire d'une situation, on regarde ce que la requête retient **pendant qu'on
l'écrit** : un lien y ferait quitter une page non enregistrée, et l'on perdrait
ce qu'on venait de composer.

`ouvrable` tranche, et il vaut `false` par défaut — un appelant qui n'y pense pas
ne casse rien.

### Paginer

Huit cents sujets et mille deux cents propositions ne tiennent pas sur une page :
le navigateur met une seconde à poser le document, et l'on ne le parcourt pas de
toute façon — on cherche, on ne feuillette pas. Vingt-cinq par page, la taille
qu'emploient déjà les autres tableaux.

Deux choses importent, et toutes deux se lisent dans l'en-tête :

- **le compte est celui de tout ce que la recherche retient**, pas celui de la
  page. « 25 sujets » au-dessus d'une liste qui en retient huit cents ferait
  croire que la recherche a tout écarté ;
- **changer la recherche ramène à la première page.** Rester à la page douze
  d'une liste qui n'en fait plus trois montre un tableau vide, et l'on croit que
  la recherche ne retient rien.

Sans pagination demandée, tout est rendu : c'est le cas du formulaire, où la
liste est courte par construction.

### Ce qui manquait à la charge transversale

`chargeDunChantier` lisait les liens, les assignés, les labels et les objectifs.
Elle ne lisait **ni le compte des fils, ni les signaux** — et rien ne
l'échouait. Trois choses s'en trouvaient fausses, en silence :

- le **compteur de fils** restait vide sur toutes les lignes, ce qui se lit comme
  « aucune discussion » alors que c'est « je n'ai pas demandé » ;
- **« Mentions »** se déclarait et ne retenait jamais rien : l'index était absent,
  `undefined` devient une liste vide, et un sujet qui ne porte rien sort de tous
  les filtres — exactement la panne que `charge-des-sujets.js` porte écrite
  au-dessus d'elle ;
- **« Activité récente »** retombait sur `updated_at`, et manquait donc tout ce
  qui se passe dans le fil de discussion, c'est-à-dire l'essentiel de la vie d'un
  sujet.

`signauxLus` dit enfin la vérité : `false` n'est pas « aucun signal », c'est « on
ne sait pas », et les lectures qui en dépendent ne se proposent alors pas plutôt
que de rendre une liste vide (règle 5).

Cela touche aussi l'écran des situations, qui emploie la même charge : le défaut
y était depuis le début.
