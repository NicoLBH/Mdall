# L'Atelier, l'extraction visible, et le coût de l'IA

**À quoi sert cette page :** elle porte le plan qui remplace celui de
l'extraction des comptes rendus, interrompu en chemin. Elle dit ce qu'on fait,
dans quel ordre, et **pourquoi cet ordre-là**.

---

## Ce qui a été interrompu, et pourquoi

L'extraction des points d'un compte rendu marchait à moitié, et chaque tour
corrigeait un maillon sans qu'on voie le résultat. La cause n'était pas dans le
code : **on ne peut pas améliorer ce qu'on ne voit pas**. Une extraction qui
rend directement des sujets est une boîte noire — quand le résultat déçoit, on
ne sait pas si le document a été mal lu, mal structuré, ou bien lu et mal
exploité.

Deux utilitaires extraient déjà d'un PDF, chacun à sa manière. Un troisième
allait s'ajouter. C'est le moment de fixer la démarche plutôt que de la
répéter.

---

## Les quatre principes qui décident de l'ordre

**1. On rend l'Atelier extensible avant d'y ajouter des outils.** La sidebar
actuelle ne tiendra pas deux cents utilitaires : on n'a pas deux cents icônes
distinctes, une liste déroulante de deux cents entrées ne se parcourt pas, et
— le plus grave — **elle occupe la gauche de l'écran, donc aucun utilitaire ne
peut avoir sa propre barre latérale**. C'est une limite de structure, pas de
confort : elle plafonne ce que chaque utilitaire pourra être. Elle passe donc
en premier.

**2. On rend l'extraction visible avant de l'améliorer.** On extrait, on
structure, et **on doit pouvoir tout reconstruire à l'écran** : la structure du
document, ses tableaux, ses rubriques. C'est la seule façon de faire monter la
qualité par cycles, en versionnant chaque palier. Et cela apporte autre chose
que du diagnostic : la capacité de copier-coller un extrait d'un compte rendu
ou d'un rapport de bureau de contrôle.

**3. Ce que l'IA fait, un humain doit pouvoir le faire à la main.** L'IA
accélère et donne du confort. Elle n'est jamais une boîte noire, et elle n'est
jamais le seul chemin. Ce principe entre aux fondamentaux, et il vaut pour tout
ce qui vient ensuite.

**4. Le coût de l'IA se voit, à la requête près.** Chaque requête montre sa
consommation ; chaque projet la totalise ; l'utilisateur la retrouve sur une
page à lui. Un coût invisible est un coût qu'on subit.

---

## Étape 1 — L'Atelier devient un marketplace

**Le problème.** Une sidebar de deux cents entrées ne se parcourt pas, et elle
prend la place dont les utilitaires ont besoin.

**Ce qu'on fait.**

- Un **bandeau d'accueil** avec une recherche qui interroge le catalogue : par
  domaine, par nom, par type de fonctionnalité, par donnée d'entrée, par nom de
  variable produite.
- Une **barre de navigation** — le composant existe, il se réutilise — et à
  droite les utilitaires les plus employés, six en responsive : Copilote et
  Variante en tête.
- Une seconde barre, « Recommandé » / « Ajouté récemment », puis les
  utilitaires **sur deux colonnes**, chacun avec une **icône d'application**
  plutôt qu'un pictogramme : une image est plus facile à distinguer qu'un trait,
  et surtout plus facile à produire deux cents fois.
- Chaque fiche porte sa **version**, ses **données d'entrée**, ce qu'il fait, ses
  **données de sortie**.

**Ce que cela débloque.** Un utilitaire ouvert occupe **toute la largeur** : il
peut avoir sa propre barre latérale, ses propres onglets, sa propre mise en
page. C'est la raison principale de cette étape.

**Le catalogue vit à un seul endroit** (règle 10), comme une donnée et non
comme du dessin : la recherche, les fiches, les compteurs et la navigation le
lisent tous.

## Étape 2 — Un raccourci vers le Copilote dans la barre du haut

À gauche de l'avatar. Le Copilote est le point d'entrée de tout le reste ; le
chercher dans un onglet à chaque fois est un péage qu'on paie cent fois par
jour.

## Étape 3 — L'extraction devient visible

**Un utilitaire de lecture de document**, avant toute exploitation. Il rend ce
qu'il a lu : la structure, les rubriques imbriquées, les tableaux, le texte —
et l'on peut en copier n'importe quel morceau.

**Ce qu'il faut chercher d'abord.** Une recherche approfondie sur ce qui existe
déjà, gratuitement, pour restituer la structure d'un PDF. Écrire ce qui existe
est le meilleur moyen de le maintenir moins bien.

**La version, à chaque palier.** L'extraction se juge à l'œil sur des documents
réels ; chaque montée de qualité est une version, et l'on peut comparer.

## Étape 4 — Le contexte perdu des rubriques

**Le défaut, tel qu'il se constate.** Un avis rangé sous
`structure métallique > dimensionnement` devient « Dimensionnement — F ». Un
autre, sous `structure béton armé > dimensionnement`, devient « Dimensionnement
— D ». Les deux ont perdu ce qui les distinguait : l'intitulé seul est
illisible, inexploitable, et **faux**.

Même chose sur un compte rendu : `contrôle technique > assister au prochain
rendez-vous` et `charpente, entreprise X > assister au prochain rendez-vous`
sont deux points différents qui s'écrivent pareil.

**Ce que cela demande.** Que l'extraction rende l'**arbre** des rubriques, et
que chaque élément garde le chemin qui y mène. C'est l'étape 3 qui le rend
possible : sans structure restituée, il n'y a pas de chemin à garder.

## Étape 5 — Le compteur de consommation

- **À la requête** : chaque appel montre ce qu'il a coûté.
- **Au projet** : le total dans l'onglet Insights.
- **À l'utilisateur** : une entrée « Abonnement et consommation » dans le menu
  de l'avatar, vers une page qui montre tout, sans rien arrondir.

## Étape 6 — Le principe aux fondamentaux

« Tout ce que l'IA fait dans l'application, un humain doit pouvoir le faire à la
main. L'IA accélère et donne du confort ; elle n'est jamais une boîte noire. »

Ce n'est pas une note de bas de page : c'est ce qui décide de la forme de
chaque écran où l'IA intervient.

## Étape 7 — On reprend l'extraction des comptes rendus

Comme **un utilitaire**, d'abord. Branché ensuite dans le dépôt de document.
Et cette fois le résultat se voit à l'écran avant de devenir quoi que ce soit.

Ce qui reste à trancher sur le rapprochement d'un point d'une réunion à l'autre
est dans [`a-traiter-plus-tard.md`](a-traiter-plus-tard.md) : le titre aplati ne
reconnaît que ce qui est repris mot pour mot, donc jamais ce qui a bougé.

---

## Ce que cet ordre refuse

**Reprendre l'extraction tout de suite.** Elle serait meilleure et toujours
invisible : on recommencerait à corriger à l'aveugle, et le prochain palier se
jugerait encore au ressenti.

**Ajouter le compteur d'IA avant l'Atelier.** Il se pose sur des écrans
d'utilitaires qui vont tous être repris. Le poser deux fois serait le faire
diverger (règle 4).
