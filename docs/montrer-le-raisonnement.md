# Montrer le raisonnement

> « Mon concept est simpliste : l'ingrédient de base c'est du pdf, le système
> transcrit ça en Mdall et les raisonnements sautent aux yeux. »

Ce document est le plan de bataille pour y arriver. Il sert deux fins à la fois,
et c'est voulu : **expliquer le produit à quelqu'un qui n'a jamais codé**, et
**permettre de voir soi-même où le système est bon et où il est faible**. Les
deux demandent exactement la même chose — que la chaîne soit visible de bout en
bout —, et c'est pourquoi il n'y a pas deux chantiers mais un seul.

---

## 1. Le concept, reformulé en six lignes

1. On verse des PDF : comptes rendus de chantier, rapports de contrôle, mails.
2. Le système les **transcrit en Mdall** — un langage spécialisé qui nomme les
   constats, les hypothèses, les fonctions et les raisonnements.
3. La transcription isole, dans cet ordre : les **données**, les **contraintes**,
   les **fonctions implicites**, puis les **chemins entre fonctions** — et ce
   sont ces chemins qui *sont* les raisonnements.
4. Avant de signer, on voit **le code qui sera versé** et **les vérifications
   faites sur ce code**.
5. On signe. Cela entre en mémoire, et se retrouve dans la mémoire.
6. La mémoire **prédit**, parce qu'elle a été écrite dans une langue qui
   s'exécute.

Et la promesse qui tient tout : *« ce langage est facile à lire, même pour
quelqu'un qui n'a jamais codé de sa vie et qui n'en a absolument pas envie. »*

### Pourquoi c'est compliqué, et comment le dire sans s'excuser

La question qui vient — *« mais pourquoi avez-vous construit un truc aussi
compliqué ? »* — a une réponse courte, et elle ne s'excuse pas :

> Parce que prédire demande d'avoir écrit. Un PDF ne prédit rien ; une phrase
> française ne prédit rien. Pour qu'un projet dise « ceci va arriver », il faut
> que ses idées soient devenues des **fonctions** — et une fonction se lit ou ne
> se lit pas. Nous avons choisi qu'elle se lise.

La complexité n'est donc pas dans le produit : elle est dans le métier, et le
produit la **montre** au lieu de la cacher. C'est l'argument, et il ne tient que
si l'on montre vraiment.

---

## 2. Ce qui existe déjà, et qu'il faut arrêter de redévelopper

Le plan serait trois fois plus long sans cela. Tout ce qui suit est **écrit,
éprouvé et en service** :

| | ce que c'est | où |
| --- | --- | --- |
| le langage | cinq objets, trois lois de lecture, tout au clavier | `docs/langage-mdall.md` |
| le coloriseur | un seul, partagé par Mémoire, Changements et le bac d'essai | `views/ui/code-mdall.js` |
| **le transcripteur** | **le Mdall qu'une proposition écrira, sans aucun appel au modèle** | `views/ui/mdall-de-la-proposition.js` |
| le panneau | les blocs Mdall, repliés sauf les règles | `views/ui/mdall-a-proposer.js` |
| les trois étapes | reconnaître la structure · transcrire · relever | `services/le-parcours-dun-rapport.js` |
| les quatre mesures | perturbations · dérive · jeu de référence · invariants | `scripts/`, et la console |

**Le point décisif, et il est déjà acquis :** `mdall-de-la-proposition.js`
transcrit une proposition en Mdall **de façon déterministe, sans appeler aucun
modèle**. Le raisonnement n'a donc pas à être reconstitué, ni deviné, ni payé :
il est déjà là, dans la structure, et il ne manquait qu'une langue pour le lire.

Cela veut dire que **ce plan n'invente presque rien**. Il déplace, il relie, et
il rend visible ce qui est déjà calculé.

---

## 3. Le diagnostic : pourquoi « on ne voit pas bien la traduction »

Six défauts, du plus coûteux au moins coûteux. Chacun a sa réparation plus bas.

**D1 — Le Mdall arrive après le diff, et replié.** Dans *Changements*, on lit
d'abord un tableau avant/après, puis, en dessous, des blocs fermés. L'ordre dit
ce qui compte : le tableau d'abord, le raisonnement ensuite. C'est l'inverse de
la promesse. Et quarante blocs fermés font une page qu'on fait défiler sans la
lire.

**D2 — La chaîne n'est jamais montrée comme une chaîne.** On voit le PDF, puis
on voit du Mdall. Les quatre crans entre les deux — donnée, contrainte, fonction
implicite, chemin entre fonctions — ne sont nommés nulle part à l'écran. Or
c'est *exactement* ce que l'utilisateur doit comprendre pour dire « wahoo, je
comprends ». Sans les crans, la transcription a l'air d'un tour de magie, et un
tour de magie n'est pas rassurant : il est inquiétant.

**D3 — Le Mdall au moment de l'analyse : il existe, et il manque là où on le
cherche.**

> **Correction.** La première version de ce document affirmait qu'« on ne voit le
> Mdall qu'au moment de signer ». C'est faux, et il faut le dire plutôt que de
> construire dessus : `la-synthese.js` le montre déjà au moment de l'analyse,
> pour un **compte rendu** et pour un **fil de mails**, sous l'onglet *Synthèse*
> de leur détail. Ce que j'avais pris pour un trou était un écran que je n'avais
> pas lu.

Ce qui manque vraiment est plus précis, et plus facile à réparer :

- il est **l'item 3 de 4** d'une section nommée *Synthèse* — un mot qui ne dit
  pas « voici le code qui sera versé » ;
- un **rapport de bureau de contrôle n'a pas de Synthèse du tout.** Son détail a
  deux onglets, et le commentaire du code dit pourquoi : « un rapport de contrôle
  ne relève pas d'idées : son analyse gelée n'en porte pas ». C'est vrai de ses
  idées, et ce n'est pas vrai de ses avis — un avis est un constat, et un constat
  s'écrit en Mdall.

Et la demande explicite reste entière : *« avant d'envisager une proposition, on
a envie de voir aussi les vérifications, et le code qui sera versé si jamais on
décide d'en faire une proposition. »* Les vérifications, elles, ne sont nulle
part — c'est D4.

**D4 — « Vérifications » ne vérifie pas le code.** L'onglet dit ce que l'analyse
a lu, ce qu'elle en tire et ce qu'elle n'a pas pu lire. C'est de la
**métrologie de lecture**, pas de la vérification de raisonnement. Personne n'y
voit « cette fonction a été passée sur ces cas, et voici ce qu'elle a rendu ».

**D5 — Les mots de l'écran ne sont pas ceux du concept.** *Vérifications*,
*Changements*, *Dépôts* sont les mots de GitHub, et ils sont bons pour un
développeur. Ils ne disent pas « voici ce que nous avons compris de vos
documents » ni « voici la preuve que nous l'avons bien compris ».

**D6 — Les tests sont invisibles côté utilisateur, et c'est un gâchis.** On a
quatre outils de mesure, des bancs, des batteries de mutations, un corpus annoté
— un travail considérable qui ne sert aujourd'hui qu'à nous. *« Les tests ne
doivent pas échapper à la règle »* : montrer qu'on s'est éprouvé est le meilleur
argument de confiance qui existe, et il dort dans un terminal.

---

## 4. Le principe qui organise tout : trois questions, trois endroits

C'est la décision d'architecture du plan, et elle règle au passage une erreur de
raisonnement que j'ai commise au tour précédent.

J'avais soutenu que les mesures de justesse n'avaient leur place que dans la
console : agrégées, elles ne concernent que l'exploitant. **C'est vrai pour les
agrégats et faux comme principe.** Il y a trois questions, pas une, et elles
n'ont ni le même lecteur, ni le même endroit, ni la même réponse :

| la question | qui la pose | où elle se répond |
| --- | --- | --- |
| **Q1 — Ce document a-t-il été bien lu ?** | l'utilisateur, à chaque lecture | le détail du document |
| **Q2 — Ce qui va entrer dans ma mémoire est-il juste, et comment le sais-je ?** | l'utilisateur, avant de signer | la proposition |
| **Q3 — Le procédé tient-il, dans le temps et sur tout le corpus ?** | l'exploitant | *Console › La justesse* |

Q3 est faite (ce tour-ci). Q1 existe en partie — les avis écartés, la citation
retrouvée, la structure non reconnue sont déjà affichés. **Q2 n'existe pas**, et
c'est elle que le plan ouvre.

La règle de non-duplication qui en découle : **un chiffre se calcule à un seul
endroit et se montre à un seul niveau.** Q1 montre *ce document*, Q2 montre *ce
versement*, Q3 montre *le procédé*. Aucun écran ne reprend le chiffre d'un
autre ; chacun renvoie à celui du dessus par un lien, jamais par une copie.

---

## 5. Le plan : six tours

Chaque tour est une PR, livrable seule, utile seule. L'ordre n'est pas
indifférent : chaque tour rend le suivant plus court.

### Tour 1 — Les quatre crans de la traduction, nommés

**Un module pur, `services/les-crans-de-la-traduction.js`**, qui déclare les
quatre crans entre un PDF et du Mdall, et pour chacun : son nom, sa question, ce
qu'il produit, **ce qu'il ne sait pas faire**.

```
1. les données        « qu'est-ce que ce document affirme ? »     → un sujet, une valeur
2. les contraintes    « qu'est-ce qui limite ces valeurs ? »      → un seuil, une exigence
3. les fonctions      « quelle règle implicite relie les deux ? » → fonction … si … alors
4. les chemins        « quelle fonction en nourrit une autre ? »  → le raisonnement
```

Rien de neuf n'est calculé : les quatre crans **existent déjà** dans ce que
`mdall-de-la-proposition.js` produit — une valeur avec sa provenance est un
cran 1, une règle avec ses conditions est un cran 3. Le module les *nomme*, et
range chaque bloc Mdall sous son cran.

Pourquoi en premier : c'est le vocabulaire que les cinq tours suivants emploient.
Écrit après, il aurait été écrit cinq fois.

> **Tranché : le cran 4 se montre en liste.** « On verra si nécessaire pour un
> graphe après. » Une liste se lit sans avoir appris à lire un graphe, et c'est
> le lecteur qu'on vise. Le graphe reste possible : la liste et lui se
> calculeraient depuis les mêmes paires.

### Tour 2 — Le Mdall passe devant, dans *Changements*

Trois gestes, aucun module neuf :

- les blocs Mdall **au-dessus** du tableau avant/après ;
- les blocs **groupés par cran**, avec le nom du cran en tête de groupe ;
- les blocs de **cran 3 et 4 ouverts**, les autres repliés. Une valeur se lit
  déjà ailleurs ; un raisonnement ne se lit nulle part — c'est déjà la règle du
  panneau, elle devient celle de l'écran.

Le tableau avant/après reste, en dessous, sous un titre qui dit ce qu'il est :
« Ce qui bouge, valeur par valeur ».

### Tour 3 — Le Mdall au moment de l'analyse

C'est D3, et c'est le tour le plus important du plan.

Dans *Atelier › Analyse de documents*, au détail d'un document lu, une section
**« Ce que nous avons compris »** : les blocs Mdall que ce document produirait,
groupés par cran, avec en tête une phrase sans ambiguïté —

> *Rien n'est encore écrit. Voici ce qui serait versé si vous en faisiez une
> proposition.*

Techniquement, c'est `blocsAProposer` appliqué à une lecture plutôt qu'à une
proposition. Le transcripteur est déterministe et gratuit : **aucun appel au
modèle, aucune facture.** C'est ce qui rend ce tour possible, et c'est ce qui le
rend sûr — on ne montre pas une prévision, on montre le résultat.

### Tour 4 — Les vérifications deviennent celles du code

L'onglet *Vérifications* gagne deux sections, et l'ancienne garde sa place.

**a) Ce que nous avons vérifié sur cette lecture** (Q1, rassemblé). Les quatre
contrôles existent déjà, dispersés ; ils se rassemblent sous une phrase chacun :

- chaque valeur relevée porte-t-elle sa citation, retrouvée dans le document ?
- chaque marque employée est-elle dans la légende du document ?
- la structure a-t-elle été reconnue, et sinon où a-t-on buté ?
- chaque date relevée existe-t-elle dans le document ?

Chacun avec son compte **et son assiette** — « 31 valeurs sur 33 » et jamais
« 94 % » seul. Ce sont les mêmes invariants que la batterie de perturbations
pose ; le même module les écrit (règle 4).

**b) Ce que nous avons vérifié sur le code** (Q2, neuf). Pour chaque bloc de
cran 3 — chaque règle —, les cas sur lesquels elle a été passée et ce qu'elle a
rendu :

```
fonction Famille du bâtiment
   passée sur 3 cas lus dans ce document
      hauteur = 26 m, logements = 42  →  "3e famille B"   ✓ conforme au document
      hauteur = 8 m,  logements = 4   →  "2e famille"     ✓ conforme au document
      hauteur = 51 m                  →  "4e famille"     ✓ conforme au document
```

Et quand ça ne va pas, ça se dit en premier :

```
      hauteur = 26 m, logements = 42  →  "3e famille A"   ✗ le document dit « 3e famille B »
```

> **Tranché : les deux premières sources, ensemble.** Les cas viennent du
> document *et* des bornes de la règle :
> 1. **du document lui-même** — chaque valeur relevée est un cas, et la règle
>    doit retrouver ce que le document conclut. Gratuit, honnête, et c'est le
>    cas le plus parlant pour l'utilisateur ;
> 2. **des bornes de la règle** — une règle avec un seuil à 28 m se passe à
>    27,99 et à 28,01. Gratuit, déterministe, et c'est ce qui attrape l'erreur
>    de comparaison stricte, la plus fréquente de toutes ;
> 3. de cas écrits à la main — à ne pas faire : c'est demander à un architecte
>    d'écrire des tests.

### ~~Tour 5 — Les mots de l'écran~~ — retiré

Il proposait de renommer *Changements* en « La traduction » et *Vérifications*
en « Les preuves ».

> **Tranché : on ne renomme pas.** « Les mots actuels sont suffisamment justes et
> corrects. » Et c'était le tour le plus discutable du plan : *Changements* et
> *Vérifications* ont l'avantage d'être les mots de tout le monde. Ce que le
> renommage cherchait à obtenir — qu'on sache ce qu'on regarde — s'obtient par
> ce que les onglets **contiennent**, c'est-à-dire par les tours 2 et 4.

### Tour 6 — Le parcours de démonstration

Un chemin unique, qui se fait en cinq minutes sur un corpus inventé, et qui
raconte la chaîne entière dans l'ordre : verser un PDF → voir les quatre crans →
lire le Mdall → lire les preuves → signer → retrouver dans la mémoire → voir la
prédiction qui en découle.

Ce n'est pas une démo scriptée : ce sont les écrans réels, sur le corpus de
démonstration, avec à chaque étape une phrase qui dit *où l'on en est dans la
chaîne*. C'est ce qui permet de répondre à la question difficile en montrant
plutôt qu'en argumentant.

---

## 6. Les quatre règles que tous ces écrans partagent

Les mêmes que celles de *Console › La justesse*, portées par les mêmes modules
purs — un seul endroit, pour qu'ils ne divergent pas (règle 4) :

1. **Jamais un score unique.** « Justesse : 94 % » mélange une structure non
   reconnue avec une marque fausse, qui n'appellent ni le même diagnostic ni la
   même correction.
2. **Jamais un taux sans son assiette.** « 100 % » sur une valeur n'est pas
   « 100 % » sur quatre cents.
3. **Ce qui n'a pas été vérifié, aussi lisible que ce qui l'a été.** Un écran
   qui montre trois contrôles verts et taît le quatrième se lit « tout va bien ».
4. **La date à côté du chiffre**, et le procédé avec. Une lecture faite par un
   procédé qu'on a changé depuis ne dit pas l'état du système.

Et une cinquième, propre à ces écrans-ci :

5. **Rien n'est écrit tant qu'on n'a pas signé, et l'écran le dit en toutes
   lettres.** C'est la contrepartie de tout montrer : plus on montre, plus on
   risque de laisser croire que c'est déjà fait.

---

## 7. Ce que ce plan ne fait pas

Nommé, parce qu'un plan dont on ignore les trous se présente comme complet.

- **Il ne rend pas le Mdall modifiable à l'écran.** On voit, on signe ou on
  refuse. Éditer du Mdall dans un navigateur est un autre produit.
- **Il ne montre pas les tests du produit à l'utilisateur.** Les batteries de
  mutations, les bancs, le corpus annoté restent internes : ce sont des preuves
  *sur Mdall*, pas *sur votre chantier*. L'écran montre les vérifications faites
  **sur les données du projet** — c'est ce qui intéresse celui qui signe, et
  c'est aussi le seul qu'il puisse juger.
- **Il ne traite pas la prédiction.** Le point 6 du concept — « le système me
  propose des prédictions grâce au travail fait avant » — a ses propres écrans,
  et son propre tour. Il demande que les crans 3 et 4 soient visibles d'abord :
  une prédiction dont on ne voit pas la fonction est une divination.
- **Il ne dit pas comment la traduction s'améliore quand elle se trompe.** On
  verra que ça se trompe, et ce sera déjà beaucoup. Corriger depuis l'écran est
  une question ouverte.

---

## 8. L'ordre recommandé, et pourquoi

```
Tour 1  les crans nommés            ✔ livré  ← le vocabulaire de tous les autres
Tour 2  le Mdall devant le diff     ✔ livré  ← et groupé par cran partout d'un coup
Tour 3  le Mdall à l'analyse        ✔ livré  ← le rapport BC, et le cadrage
Tour 4  les preuves                 ✔ livré  ← celles de la lecture, et celles du code
Tour 6  le parcours                          ← en dernier : il raconte ce qui existe
```

**Les tours 1 et 2 sont allés ensemble, et le 2 est passé devant le 3.** Deux
raisons, découvertes en les écrivant :

1. Le tour 1 seul aurait livré un module que rien n'appelle. Le tour 2 est son
   premier emploi, et le plus court.
2. Le groupement par cran a été posé dans **le panneau partagé**
   (`views/ui/mdall-a-proposer.js`), qui est le seul : l'onglet Changements, le
   Copilote, la lecture des comptes rendus et celle des fils de mails
   l'emploient tous les quatre. Les quatre ont donc gagné les crans **par ce
   seul changement**, sans qu'aucun soit retouché (règle 4) — et le tour 3 s'est
   trouvé à moitié fait avant d'être commencé.

Ce qui restait du tour 3 était donc plus étroit qu'annoncé, et c'est ce qui a été
fait : le **rapport de bureau de contrôle** a son onglet *Ce que nous avons
compris*, et le Mdall d'un compte rendu passe en tête de sa Synthèse, dans le
cadre titré qui dit que rien n'est encore écrit.

---

## 10. Le tour 4, et une correction qui compte

### Les preuves de la lecture (Q1), rassemblées

Quatre contrôles, chacun avec son assiette, au même endroit — sur un compte rendu
comme sur un rapport, par le même composant :

| | le contrôle | ce qu'il attrape |
| --- | --- | --- |
| 1 | la forme du document a été reconnue | tout le reste se fait sur la forme reconnue |
| 2 | chaque citation figure dans le document | une phrase que personne n'a écrite |
| 3 | chaque marque employée est dans la légende | un « F » dont on ignore le sens |
| 4 | chaque date relevée figure dans le document | **le contrôle qui n'existait nulle part** |

Le quatrième est le plus important pour la suite : une date range un constat dans
le temps, et c'est là que la prédiction commence. Une date inventée déplace un
fait sans que rien ne le montre — la chronologie reste plausible, et elle est
fausse.

**Un contrôle sans objet n'est ni un succès ni un échec**, et c'est la
distinction qui décide de tout : une lecture dont aucun relevé ne porte de
citation n'a pas « 100 % de citations retrouvées », elle n'a aucune citation à
retrouver.

Les deux premiers sont **exactement ceux que la batterie de perturbations pose**,
et c'est le produit qui les tient désormais : la batterie les lui demande. Deux
écritures de « cette citation figure-t-elle dans le document » auraient fini par
ne plus répondre la même chose, et l'écran aurait dit vert là où la mesure disait
rouge (règle 4) — sur l'indicateur que le produit met en avant.

### Les preuves du code (Q2), sous chaque fonction

Deux sources de cas, aucune écrite à la main :

**Du document.** Chaque nom que la fonction lit prend la valeur que le document
en dit ; on rejoue, et l'on compare à ce que le document conclut. Un écart est un
vrai défaut. Le rejeu passe par `evaluerLaRegle` — celui du rejeu de la mémoire
et du bac d'essai —, donc la preuve est celle du moteur et non d'un second
évaluateur.

**Des bornes.** Un seuil écrit `<= 28 m` s'essaie à 28 et à 29, et l'on montre ce
que la fonction fait de chaque côté.

> **Correction importante.** Le plan annonçait que la borne « attrape l'erreur de
> comparaison stricte, un `<` écrit pour un `<=` ». **C'est faux**, et c'est la
> batterie de mutations qui l'a montré : l'attente d'une borne était dérivée de
> l'opérateur lui-même. Une règle écrite `< 28` s'essayait donc à 27 et 28, et
> passait — en se donnant raison toute seule.
>
> Ce qu'une borne fait vraiment est plus utile, et honnête : elle montre, en deux
> nombres concrets, **où la fonction bascule**. Celui qui lit sait, lui, si 28
> doit être dedans — c'est son métier. **L'oracle est le lecteur**, et c'est tout
> le propos de cet écran.
>
> Une borne ne compte donc ni dans les conformes ni dans les écarts. Les y mettre
> gonflerait un taux avec des cas que personne n'a jugés, ce qui est la façon la
> plus commode de se rassurer.

Et ce que ces essais **ne** prouvent pas est écrit sous eux, une fois : une
fonction fausse, recopiée fidèlement d'un document faux, les passe tous.

---

## 11. Les trois décisions, et ce qu'elles ferment

| | la question | tranché |
| --- | --- | --- |
| 1 | le cran 4 en liste ou en graphe ? | **en liste** d'abord ; le graphe si la liste ne suffit pas |
| 2 | d'où viennent les cas de test ? | **du document et des bornes de la règle**, les deux |
| 3 | les onglets se renomment-ils ? | **non** — les mots actuels sont justes |

Plus rien n'est en attente d'une décision pour avancer. Le tour 6 — le parcours
de démonstration — est le dernier, et il ne fait que raconter ce qui existe.
