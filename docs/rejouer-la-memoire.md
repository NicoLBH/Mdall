# Rejouer la mémoire

**À quoi sert cette page :** Mdall promet de rendre le raisonnement visible, et
de dire ce qu'un changement entraîne. Tant qu'on ne sait pas **rejouer** le
raisonnement, cette promesse tient à la parole de celui qui la fait. Cette page
dit ce qui existe aujourd'hui, ce qui manque, et dans quel ordre le construire.

Elle a été écrite en vérifiant le code, pas de mémoire. Chaque affirmation de
l'état des lieux est vérifiable en ouvrant le fichier cité.

**Où en est le plan :** les six étapes sont faites. L'état des lieux ci-dessous
décrit le point de départ et n'a pas été réécrit — le relire à côté de ce qui
existe aujourd'hui est la meilleure façon de mesurer ce qui a changé. Chaque
étape porte sa mention *fait*, et ce qui reste dehors est dit à la fin.

---

## L'état des lieux, vérifié

### Ce qui existe

| ce qui existe | où | ce que ça donne |
| --- | --- | --- |
| Les conditions de chaque règle appliquée | `payload.regle.conditions` | le **texte** de ce que la règle a testé |
| La déclaration des entrées d'une fonction | `ligneDImport` dans `memoire-en-texte.js` | où la fonction va lire — le bon crochet, inexploité |
| Des arêtes reconstruites à la lecture | `dependancesDeLaMemoire()` | un graphe déduit **par nom**, zone par zone |
| La remontée d'une chaîne | `chaineDuRaisonnement()` | l'amont **d'un sujet**, et son schéma |
| Une table de dépendances | `assertion_dependencies` | `assertion_id → depends_on_assertion_id`, qui nourrit le drapeau « à revérifier » |
| Un index des variables | `variablesDeLaMemoire()` | qui déclare et qui cite chaque nom, **dédupliqué** |

### Ce qui n'existe pas

**Aucun enregistrement à la source.** Le graphe est reconstitué *par nom*
(`cleDuSujet`) à chaque lecture. Un sujet renommé, une faute de frappe, et le
lien disparaît sans bruit. La table qui pourrait porter la vérité n'est remplie
que par une déclaration manuelle que plus personne ne fait — c'est pourquoi le
formulaire a été retiré.

**Aucun compte.** `unique (assertion_id, depends_on_assertion_id)` interdit
littéralement d'écrire « employée trois fois ». Et `variablesDeLaMemoire`
déduplique : « 4 usages » veut dire quatre **fonctions**, pas quatre emplois.

**Aucun ordre.** Il n'y a pas un seul tri topologique dans le dépôt.
`chaineDuRaisonnement` ordonne l'amont d'un nœud ; rien n'ordonne l'ensemble.

**Aucun évaluateur.** `OPERATEUR` ne sert qu'à **écrire** et à **colorer** du
texte. Rien n'évalue `si Hauteur du plancher bas ≤ 28 m`. Le seul moteur du
dépôt est `supabase/functions/incendie-habitation/moteur.js`, écrit à la main
pour un domaine.

**Aucun index sur les données de base.** Ce qui a été fait pour
`variables-du-projet.ref` — savoir qui emploie chaque nom — n'a pas été fait
pour `données-de-base.ddb`.

> Une règle en mémoire est **l'instantané d'une exécution passée**, pas un
> programme. On sait la lire, la dessiner, la remonter. On ne sait pas la
> rejouer.

---

## Le recadrage : on ne rejoue pas la mémoire, on rejoue le calque dérivé

« Rejouer la mémoire en entier » est la mauvaise cible.

La mémoire contient des **constats**, des **décisions**, des **arbitrages**, des
documents. Ils ne se rejouent pas : ils ont eu lieu. Les rejouer voudrait dire
re-décider ce que des gens ont décidé.

Ce qui se rejoue, c'est le **calque dérivé** : le sous-graphe des affirmations
qu'une règle ou un agent a produites à partir d'autres affirmations. C'est
un ensemble fermé, fini, et le seul où le mot « rejouer » a un sens.

La cible est donc : **rendre le calque dérivé recalculable, et rendre sa
frontière visible.** Tout le reste est un point fixe — une entrée, ou une
décision. Ce recadrage rend le problème fini : au lieu de « 460 emplois, dans
quel ordre ? », la question devient « quel est le sous-graphe dérivé, est-ce un
graphe sans cycle, et chaque nœud est-il réévaluable depuis ses parents ? ».

### Les trois natures de nœud

| nature | ce que c'est | ce qu'on en fait |
| --- | --- | --- |
| **Socle** | donnée de base, hypothèse, constat, décision | on le **change** ; il ne se recalcule pas |
| **Dérivé rejouable** | une règle Mdall ou un agent déterministe dont on a le code **et** les entrées | il se **recalcule** |
| **Dérivé opaque** | le référentiel serveur, une extraction PDF, un jugement | on sait qu'il **dépend** ; on ne sait pas le refaire — **nommé, jamais recalculé** |

La troisième catégorie est de plein droit, pas une exception : elle ne
disparaîtra jamais. Son compte est la mesure honnête de la promesse —
« sur 460 nœuds dérivés, 380 sont rejouables, 80 ne le sont pas, les voici » —
et ce chiffre s'affiche.

---

## Les six étapes

### 1. Enregistrer l'application, pas sa description — *fait*

Aujourd'hui on stocke la *description* d'un appel. Il faut stocker l'**appel** :

```
règle (nom + version) · zone · quand · par quel versement
  entrées : [{ sujet, assertion_id, valeur, rang }]
  sortie  :  { sujet, assertion_id, valeur }
```

#### Ce que « enregistré » veut dire, exactement

Une précision qu'il a fallu faire en écrivant l'étape, et qui corrige la
première formulation de ce document.

Le moteur qui applique les règles **ne travaille pas sur la mémoire** : il
travaille sur un questionnaire, et il rend des conditions portant des **noms**
(`supabase/functions/incendie-habitation/conditions.js`). Il n'a donc aucun
identifiant à nous donner, et cette étape ne prétend pas le contraire.

Ce qui change est ailleurs, et c'est l'essentiel : le nom est résolu **une fois,
au moment du versement**, contre la mémoire contemporaine de la règle — les
valeurs qu'elle a réellement vues —, puis conservé. Après quoi il ne bouge plus.
Une lecture faite en mars continue de désigner ce que mars affirmait, même si le
sujet est renommé en juin, même si la valeur est remplacée en juillet.

C'est exactement la sémantique que `assertion_dependencies` documente déjà :
*« la note repose sur la valeur A2 telle qu'elle était affirmée le 12 août »*.

#### Ce que cela donne

Une arête par identifiant, **rangée** et **zonée**, donne d'un coup le **compte**
(comptez les lignes), le **sens**, l'**ordre**, et **qui emploie chaque donnée de
base** — la même requête prise par l'autre bout.

Une **table nouvelle**, `assertion_applications`, pas un élargissement de
`assertion_dependencies` : son unicité empêche le comptage, et son rôle actuel —
nourrir le drapeau « à revérifier » — reste bon. Une table de plus est
strictement additive ; élargir une contrainte d'unicité ne l'est pas.

Une lecture dont le nom ne désigne rien s'écrit quand même, avec un
`input_assertion_id` nul : c'est le **trou du raisonnement**, et il se compte
comme le reste. Ne rien écrire le ferait disparaître.

#### Les deux résolutions, qui ne se valent pas

| `resolution` | quand | ce que ça vaut |
| --- | --- | --- |
| `enregistre` | au versement | résolu contre la mémoire que la règle a vue ; survit à un renommage |
| `reconstruit` | après coup | résolu contre la mémoire d'aujourd'hui ; une approximation, et l'écran le dit |

La reconstruction — *Mémoire › Verser › Reconstruire les liens du raisonnement* —
rattrape tout ce qui a été versé avant la table. Elle **ne touche jamais** une
lecture enregistrée en son temps : un lien figé contre la mémoire d'alors vaut
mieux qu'un rapprochement de noms fait aujourd'hui.

Les liens de dépendance suivent la même hiérarchie : `listAssertionDependencies`
sert d'abord les lectures enregistrées, et ne déduit par nom que pour les
affirmations qui n'en ont pas. Le graphe déduit **recule** à mesure qu'on
enregistre.

#### Ce que cette étape ne couvre pas encore

Les contraintes déduites par un **agent** — zone de neige, profondeur hors
gel — lisent des faits de contexte, pas des affirmations : leurs entrées n'ont
pas d'identifiant à citer. La colonne `utility` et l'`input_assertion_id`
nullable leur laissent la place, et rien n'aura à changer ici le jour où l'outil
climatique nommera ses sources. En attendant, une donnée de base employée
*uniquement* par un agent n'apparaît pas encore dans le compte — celles que
les règles citent, si.

### 2. L'index dans les deux sens — *fait*

`données-de-base.ddb` gagne sa colonne **« employée par »** : le compte exact,
les fonctions, les zones, un lien vers chacune. `variables-du-projet.ref` gagne
le compte exact au lieu du nombre de fonctions.

Premier bénéfice visible, et il ne demande pas d'évaluateur.

### 3. L'évaluateur du `.ref` — *fait*

Sans lui, rien de ce qui précède ne rejouait quoi que ce soit.

Le langage a un vocabulaire fermé — `OPERATEUR`, `MOTS`, `si/alors/sinon/sauf`,
`importe`, `enregistre`. Un interpréteur de ce vocabulaire est un travail borné,
entièrement testable, et qui a une propriété rare : il se **vérifie contre
l'existant** (étape 5).

Une exigence non négociable : l'évaluateur ne donne à une règle **que ses entrées
déclarées**. Une règle qui lit ce qu'elle n'a pas déclaré échoue bruyamment au
lieu de diverger en silence. C'est ainsi qu'on **gagne** le droit d'écrire
« rejouable ».

#### Trois valeurs de vérité, et la troisième est celle qui compte

`vrai`, `faux`, et **`null` — indécidable**. Une condition dont l'entrée manque
n'est pas fausse : on ne sait pas. Les confondre ferait conclure `sinon` sur une
règle qu'on n'a pas pu évaluer, c'est-à-dire rendre un chiffre indiscernable
d'un chiffre calculé.

    faux et ?  = faux        vrai ou ?  = vrai
    vrai et ?  = ?           faux ou ?  = ?

Toutes les clauses sont évaluées, y compris celles qu'un court-circuit rendrait
inutiles : la trace sert à comprendre, et une trace qui s'arrête au premier faux
n'explique rien.

#### Quatre verdicts, et le quatrième a été une surprise

| verdict | ce que ça dit |
| --- | --- |
| **identique** | la règle rend ce que le projet affirme. On a regardé |
| **différente** | elle rend autre chose. Sur des entrées inchangées, c'est un défaut de la mémoire |
| **indécidable** | une entrée manque, une unité ne se compare pas. Nommé, jamais deviné |
| **sans objet** | « si A alors B », sans `sinon`, ne dit **rien** quand A est faux |

Le quatrième a failli manquer. Faire conclure une valeur vide à une règle qui ne
s'applique plus **effacerait** ce que le projet tient — et une valeur effacée se
lit comme une valeur. Ce n'est pas un recalcul, c'est la disparition du fondement
d'une valeur qui reste écrite : cela se dit avec d'autres mots, et cela va au
rang « à revérifier ».

#### Les unités ne se supposent pas

`si Hauteur ≤ 28 m` contre « 26 cm » : comparer 26 à 28 rendrait « vrai » par
accident. Deux unités différentes de part et d'autre rendent la comparaison
**indécidable**, nommément.

#### L'ordre des clauses : de gauche à droite, sans priorité

`si (A) et (B) ou (C)` se lit `((A et B) ou C)`. Il n'y a pas de parenthèses
entre clauses dans l'écriture, et inventer une priorité que le lecteur ne voit
pas serait la pire des libertés. Le mélange des deux joncteurs est **signalé** :
le référentiel n'en produit pas, et une règle écrite à la main qui en contient
mérite d'être relue.

#### Le rejeu : un point fixe, pas encore un plan

Les règles s'enchaînent. On repasse donc sur toutes tant qu'une valeur change, et
l'on s'arrête quand plus rien ne bouge — **par zone**, parce que le classement du
bâtiment A et celui du bâtiment B ne se mélangent pas.

*Depuis l'étape 4, l'ordre vient du plan* : les règles se rejouent par strates,
et un seul tour suffit quand le graphe n'a pas de cycle. La boucle reste, bornée,
pour ce que le plan ne sait pas placer. Une zone qui ne se stabilise pas ne rend
**rien**, et se signale — ses valeurs intermédiaires ne sont pas des conclusions,
et en montrer une ferait passer un état de passage pour un résultat.

#### La variante ne rend plus seulement des noms

C'est le gain visible. Jusqu'ici, tout ce qui reposait sur ce qui bouge tombait
dans « à revérifier ». Maintenant :

    Altitude du site : 13 m → 2 000 m
    Profondeur hors gel    0.71 m → 1.21 m
    Fondations profondes   non exigées → exigées   règle rejouée · 1 condition relue
    Type de semelle        filante → sur pieux     règle rejouée · 1 condition relue
    À revérifier : rien

Chaque règle rejouée dit au survol ce qu'elle a lu pour conclure —
`Profondeur hors gel <= 1,00 → 1.21 m`. Une valeur nouvelle sans sa trace est une
affirmation qu'il faut croire sur parole.

**Deux rejeux, et c'est leur différence qui compte.** Une règle qui conclut déjà
autre chose que ce que le projet affirme est un défaut de la mémoire — l'audit le
dira — et non une conséquence de la variante. L'attribuer à la variante ferait
porter à celui qui essaie une valeur la dérive de ceux qui l'ont précédé.

### 4. Le plan de recalcul, en strates — *fait*

Le sous-graphe dérivé, trié topologiquement, montré non comme une liste de 460
étapes — illisible — mais comme des **niveaux** : strate 1, ce qui ne dépend que
du socle ; strate 2, ce qui dépend de la strate 1 ; et ainsi de suite. Un projet
à 460 nœuds a peut-être 8 strates. « La plus longue chaîne fait 8 pas » se
comprend ; 460 lignes, non.

Ce plan se **dérive**, il ne se stocke pas — *ce qui est dérivé se recalcule*. Un
ordre tenu à la main divergerait dès la règle suivante. Pour la même raison, pas
de septième extension : les fichiers sont ce que les gens écrivent et lisent ;
ceci est une vue.

### 5. Le rejeu à blanc — *fait*

Rejouer chaque règle sur ce que la mémoire dit **aujourd'hui**, sans rien écrire,
et comparer sa conclusion à ce que le projet affirme.

#### Une correction : l'audit est **local**, pas en cascade

Ce document disait « rejouer tout le calque dérivé **depuis le socle** ». En
l'écrivant, ce choix s'est révélé mauvais, et voici pourquoi.

La hauteur a été corrigée à 31 m ; le classement dit encore « 3ᵉ famille B » ;
le degré coupe-feu dit « CF 1 h » — ce qui est juste **pour une 3ᵉ famille B**.

- **En cascade** : deux signalements. Le classement, puis le degré. Le second
  n'est pas un défaut, c'est une **conséquence** du premier.
- **Localement** : un seul, exactement là où il est. Et ce qui en découlerait se
  lit dans l'étude d'impact, qui est faite pour ça.

Un audit qui multiplie les signalements s'apprend à être ignoré. Chaque règle est
donc évaluée contre les valeurs **stockées** de ses entrées, et sa conclusion
comparée à la valeur **affirmée** par le projet — pas à ce que la règle avait
elle-même conclu : une valeur retouchée à la main sur la ligne, sans que la règle
bouge, est exactement le défaut qu'on cherche, et comparer la règle à elle-même
le manquerait.

#### Quatre issues, qui n'appellent pas le même geste

| issue | ce que ça dit | ce que ça vaut |
| --- | --- | --- |
| **identique** | la règle rend ce que le projet affirme | comptée, pas listée — quatre-vingts lignes identiques noieraient les trois qui comptent |
| **a dérivé** | ce que le projet affirme n'est plus ce que sa règle conclut | le défaut |
| **a perdu son objet** | la règle ne s'applique plus, et n'a rien à dire à la place | la valeur reste écrite, son fondement a disparu |
| **n'a pas pu être vérifié** | une entrée manque, une unité ne se compare pas | une **lacune**, pas une contradiction |

L'indécidable ne compte pas comme une dérive. Les confondre ferait crier au
défaut sur un projet simplement incomplet.

#### « La mémoire tient » se dit aussi fort que l'inverse

Un audit qui ne parlerait que lorsqu'il trouve quelque chose s'apprend à être
craint, et l'on cesse de le lancer. Savoir qu'on a regardé est une information —
c'est même la plus fréquente, et la plus rassurante.

#### Ce qu'il n'a pas regardé se dit

Les déductions d'un agent ne se rejouent pas ici, et les composantes qui se
lisent en rond non plus. Un bloc **hors de portée** les compte et les nomme :
les taire ferait passer « rien à signaler » pour « tout a été vérifié », ce qui
est le mensonge que tout ce chantier existe pour éviter.

#### Il ne corrige rien

Rien n'est écrit. L'écran constate ; corriger est une **décision**, et elle passe
par une proposition — `docs/fondamentaux.md`, règle 1.

C'est le cœur du chantier, et il vaut par lui-même :

> Un rejeu à blanc sur des entrées inchangées qui produit une différence est un
> **défaut de la mémoire**. Il dit que ce que le projet affirme n'est plus ce que
> ses propres règles concluent.

Une règle a changé de version, une entrée a bougé sans que l'aval suive,
quelqu'un a corrigé une valeur à la main. Aujourd'hui, personne ne peut le
savoir. C'est la question pour laquelle le produit existe, et elle mérite d'être
posée même si les variantes ne sortent jamais.

C'est aussi le banc d'essai de l'évaluateur : chaque écart est soit un défaut de
l'évaluateur, soit une dérive de la mémoire. On ne peut pas rêver mieux.

### 6. La variante, enfin triviale — *fait*

On change un nœud du socle, on rejoue les strates en aval, on affiche le diff. Le
mécanisme était déjà écrit et déjà éprouvé sur le cas dont on connaissait la
réponse ; il ne restait qu'à retirer ce qui tenait la variante debout avant lui.

Ce qui a été retiré, précisément : le sujet privilégié. La variante ne connaissait
que l'altitude — un service qui portait son nom, une fenêtre à un champ, un item de
menu qui s'éteignait faute d'altitude en mémoire. Il n'en reste rien.

`memoire-variante.js` ne sait plus quel sujet il fait varier. Il reçoit une table
`affirmation → valeur essayée`, appelle deux fois le rejeu — une fois la mémoire
telle qu'elle est, une fois avec les substitutions —, et n'attribue à la variante
que la **différence** entre les deux. Une règle qui concluait déjà autre chose que
ce que le projet affirme est un défaut de la mémoire, que l'audit dit ; l'imputer à
qui essaie une valeur lui ferait porter la dérive de ceux qui l'ont précédé.

Ce qui varie est **le socle, et lui seul** : ce que le projet pose, suppose ou
constate. Substituer une valeur dérivée réécrirait la conclusion sans toucher au
raisonnement, et l'écran montrerait une chaîne qui ne mène plus à ce qu'elle
affiche — exactement le défaut que l'audit cherche. La fenêtre s'ouvre donc sur la
question qui précède — *quelle valeur essaie-t-on ?* —, comme le fait l'étude
d'impact, et les valeurs les plus employées sont en tête.

Les deux relectures d'agents ont déménagé dans un fichier à part, où elles
étaient **l'exception, et se disaient comme telles**. Elles n'existent plus : les
agents se rejouent maintenant en redemandant à leur référentiel de calculer
sans écrire. Voir `docs/a-traiter-plus-tard.md`, § 1.

Et la variante n'est alors qu'**un** des usages du moteur, pas le plus précieux :

- **L'audit permanent** de la mémoire (étape 5) ;
- **L'étude d'impact** — « qu'est-ce qui casse si cette valeur bouge ? » —, qui
  est la vraie question qu'un ingénieur pose ;
- **La variante** — « et si ? ».

Trois usages pour un moteur : c'est ce qui justifie de le construire pour de bon
plutôt que de rejouer deux formules à la main.

---

## Les pièges, nommés d'avance

**Les cycles.** Un graphe écrit par des humains en contiendra un. Le détecter, le
nommer, refuser de rejouer cette composante. Un cycle est une erreur de modèle à
montrer, pas une boucle infinie.

**Les zones.** Une arête est *par zone*. La même règle appliquée à trois zones,
ce sont trois appels. Compter « 460 emplois » sans les zones ne voudrait rien
dire.

**Le temps.** Une règle appliquée en mars n'est pas la règle d'aujourd'hui. Le
rejeu utilise les règles **d'aujourd'hui** ; la mémoire tient celles **du jour**.
L'écart entre les deux est une information — le `V1`/`V2` des agents,
étendu à tout le graphe. Il s'affiche, il ne se lisse pas.

**Les entrées cachées.** Une règle qui lit ce qu'elle n'a pas déclaré fait
diverger le rejeu en silence. D'où le bac à sable de l'étape 3.

**Le coût.** 460 nœuds ne sont rien. 460 nœuds × un référentiel serveur × N zones
peuvent faire des minutes. Les strates donnent le parallélisme — et les nœuds
coûteux sont justement les opaques, ce qui est une raison de plus de les nommer.

---

## Ce que l'écran montre, à chaque étape

La rubrique **Explorations** de l'Atelier porte les trois usages du moteur —
au-dessus des agents, parce qu'elles les englobent. Ils s'allument à mesure
que le plan avance. Le quatrième usage, **le cerveau du projet**, ne pose pas de
question : il montre la forme de ce qui est là, c'est une lecture, et il vit dans
la Mémoire. Voir `docs/a-traiter-plus-tard.md`, § 14.

| usage | s'allume à | ce qu'il fera |
| --- | --- | --- |
| **Tester une variante** | étape 6 — *allumé* | changer n'importe quelle valeur du socle, rejouer ce qui en découle, ne rien écrire |
| **Auditer la mémoire** | étape 5 — *allumé* | rejouer à blanc, et dire ce qui a dérivé. Rien n'est écrit |
| **Étude d'impact** | étape 2 — *allumé* | « qu'est-ce qui repose sur cette valeur ? », par strates, avec le compte exact |

Une entrée qui n'est pas encore servie par le moteur est **désactivée et dit son
étape**. Un bouton qui prétend faire ce qu'il ne fait pas coûte plus cher que
l'absence du bouton. Les trois sont servis depuis l'étape 5 ; l'étape 6 a rendu au
premier ce que les autres avaient déjà — de ne privilégier aucun sujet.

---

## L'état d'aujourd'hui, sans complaisance

### Ce que l'étape 3 a corrigé

La variante ne rejoue plus **deux formules** : elle exécute les **règles du
projet**, toutes, avec les valeurs nouvelles, et rend leurs conclusions avec la
trace de ce qu'elles ont lu. Ce n'est plus une démonstration sur deux cas.

### Ce qui reste, et qui ne disparaîtra pas là

Une correction à ce document : j'avais écrit que l'évaluateur ferait
**disparaître** la table `RELECTURES`. C'est faux, et la raison est structurelle.

`RELECTURES` ne relit pas des règles : elle relit des **agents** — la
profondeur hors gel, la zone de neige. Ils calculent au serveur, sur des faits de
contexte, et l'évaluateur du `.ref` ne sait rien d'eux. Deux mondes différents,
et le second ne se replie pas dans le premier.

Ce que l'étape 3 change pour elle est donc plus modeste, mais réel : la table
cesse d'**être** le mécanisme pour redevenir ce qu'elle aurait toujours dû être —
deux exceptions nommées au bord d'un moteur qui, lui, généralise. Elle ne
s'allongera pas d'un cas à chaque projet : les projets apportent des règles, et
les règles se rejouent.

**Et elle a disparu depuis.** Pas parce que l'évaluateur a fini par savoir lire un
agent — il ne le sait toujours pas — mais parce qu'on a cessé de vouloir le
lui faire faire. L'outil qui a produit la contrainte sait la refaire ; il lui
manquait le droit de calculer sans écrire. Voir `docs/a-traiter-plus-tard.md`,
§ 1.

Elle disparaîtra le jour où les agents **nommeront leurs sources** et
seront rejouables comme le reste. Ce n'est pas une étape de ce plan ; c'est un
chantier serveur, et il vaut d'être posé à part.
