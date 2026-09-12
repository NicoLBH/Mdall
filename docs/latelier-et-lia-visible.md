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
- Une **navigation verticale des rayons**, celle de Paramètres, réutilisée : une
  liste verticale tient trente rayons là où une rangée d'onglets en tient six
  avant de déborder.
- Les utilitaires **les plus employés**, six en cartes. **Ils se comptent, ils ne
  se déclarent pas** : sur tous les projets et tous les utilisateurs. Une liste
  écrite à la main vieillit sans que personne ne s'en aperçoive — un utilitaire
  ajouté et beaucoup employé y reste invisible, un utilitaire mis en avant et
  jamais ouvert y garde sa place. Le compteur ne retient **ni qui, ni quand, ni
  sur quel projet** : ce serait une donnée de surveillance qu'il faudrait
  ensuite protéger, et elle n'aide aucune décision de Mdall.
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

Il mène **au Copilote**, pas à la vitrine : déposer sur l'accueil laisserait un
second geste à faire, c'est-à-dire la moitié du péage qu'on voulait supprimer.

**On revient à la vitrine par l'onglet Atelier**, comme partout ailleurs dans
l'application. Une barre de retour propre à cet écran ajouterait un second
chemin pour un geste que l'application a déjà (règle 4).

## Étape 3 — L'extraction devient visible *(commencée)*

L'utilitaire **Lecture des comptes rendus** est dans l'Atelier, rayon
Développements. On y dépose un PDF, et l'écran reconstruit ce que le modèle a
compris : l'identité du document, ses rubriques, chaque point avec **la phrase
d'où il sort** et si cette phrase se retrouve mot pour mot dans le document.

Ce qui manque se voit — un point sans citation, une page qu'on ne retrouve pas,
un intitulé qui revient sous trois lots. Les masquer donnerait une extraction
qui a l'air parfaite et un résultat qui déçoit, sans rien pour relier les deux.

Cinq nombres rendent les paliers comparables : points relevés, citations
retrouvées, sans citation, sans lot, écartés au serveur. Sans eux, une
amélioration se juge au ressenti.

**La transformation en proposition n'est pas branchée** : l'écran sert d'abord à
juger la lecture. Rien n'est ouvert ni écrit depuis lui — le chemin reste
copilote → atelier → proposition → mémoire (règle 1).

## Ce qu'il reste de l'étape 3

**Le document refait — fait.** Le bouton « Afficher .md », sur la ligne de titre
de l'utilitaire, redemande le document au modèle **en transcription** — ni
résumé, ni reformulation — et l'affiche en trois lectures : *Aperçu*, *Code*,
*Origine*, les mêmes que celles de l'onglet Mémoire pour ses fichiers. La
troisième met chaque ligne en face de la page du PDF dont elle sort, et cette
provenance est **calculée** : une page déclarée par celui qu'on vérifie ne
vérifie rien.

Deux chiffres l'encadrent. Les **mots retrouvés** disent ce qui a survécu ; les
**mots ajoutés** disent ce que le modèle a écrit et que le document ne portait
pas — et c'est celui-là qui compte, car un document reformulé se lit
parfaitement. Aucun des deux ne dit rien de l'ordre ni de la forme des tableaux :
deux colonnes interverties gardent les mêmes mots. Cela se juge à l'œil, et c'est
pour cela que le document s'affiche.

C'est un **second appel**, au prix du premier : il ne part que sur le bouton, et
il se dépose au compteur sous sa propre nature.

**La recherche — faite.** Voir [`reconstituer-un-document.md`](reconstituer-un-document.md) :
ce qui existe déjà, gratuitement, pour restituer la structure d'un PDF, ce que
cela vaut sur des tableaux de chantier, et ce qu'aucune de ces bibliothèques ne
sait faire. En un mot : **OpenDataLoader PDF** (Apache-2.0, Java, sans GPU) est
le candidat à essayer si l'on décide un jour de ne plus payer un appel par
reconstitution. Rien n'est engagé.

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
