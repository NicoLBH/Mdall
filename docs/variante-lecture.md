# Lire une variante

*Ce que l'écran d'une variante doit montrer, et pourquoi il ne le montre pas
encore. Écrit après un essai où l'auteur du projet a mal lu son propre écran.*

---

## Le défaut, et il est grave

Un essai à 80 m de profondeur hors gel a été fait sur un projet réel. Le calcul
a répondu juste : les douze massifs du bâtiment A basculent en défaut, le plus
sollicité à seize fois sa limite. L'écran l'a affiché. **Et il a été lu de
travers** — par la personne qui a conçu l'outil, qui savait exactement ce
qu'elle testait, et qui a conclu que les fondations n'avaient pas été
recalculées.

Ce n'est pas une inattention. C'est un défaut de l'écran, et il se nomme :

- **il montre le mécanisme, jamais la conclusion.** « Résultat du calcul des
  fondations superficielles : … 12 en défaut » est une ligne dans une liste. Ce
  que cela veut dire — *le projet ne tient plus sous cette hypothèse* — n'est
  écrit nulle part ;
- **il aplatit la chaîne.** Altitude, profondeur hors gel, fondations
  s'affichaient l'une sous l'autre, du même poids, sans qu'on voie que la
  deuxième découle de la première et la troisième de la deuxième. Le lien de
  cause est l'information principale, et c'était la seule qui manquait ;
- **il colorait en vert une mauvaise nouvelle.** « 12 vérifiées → 12 en
  défaut » s'écrivait en vert, parce que le vert marquait « la valeur nouvelle »
  et non « la bonne nouvelle ». La couleur disait le contraire du mot ;
- **il alertait à vide.** Un rang ambre « À revérifier », avec son triangle,
  s'affichait au-dessus d'une phrase disant qu'il n'y avait rien à revérifier.
  Une alarme qui rassure apprend à ne plus la regarder.

Le calcul, lui, fonctionne. Un second essai le montre de bout en bout :
altitude 13,22 m → 800 m, la profondeur hors gel passe de 0,47 m à 0,66 m par
`deduction_profondeur_hors_gel_altitude_V1`, la zone de neige est relue et ne
bouge pas, puis `dimensionnement_fondations_superficielles_V1` redescend dix
massifs de six centimètres. **Tout le problème est de le faire voir.**

---

## Ce qui est livré

Trois choses, toutes vérifiées sur les deux exports réels.

**Le tableau est ouvert.** Une fonction native ne rend pas une valeur mais douze
massifs, et sa phrase peut mentir par omission : « 12 vérifiées » avant comme
après, alors que dix arases ont bougé. Replié, ce détail se lisait comme une
option ; il est ce qu'on est venu voir. Il s'ouvre dès qu'une ligne bouge, et
reste fermé quand il n'a rien à dire.

**La colonne passe avant la ligne.** Dix massifs qui descendent tous de six
centimètres, ce n'est pas dix informations : c'en est une. Ce qui change à
l'identique partout se dit une fois, en tête ; les lignes ne portent plus que ce
qui leur est propre ; celles qui n'ont plus rien à ajouter sont comptées et
nommées. Sur l'essai à 800 m, on passe de dix lignes identiques à ceci :

```
▾ 10 lignes du tableau ont bougé sur 12
    arase supérieure  -0,10 m → -0,16 m     sur 10 lignes
    Portique courant file A   ratio déterminant 0,888 → 0,846
    Portique courant file B   ratio déterminant 0,929 → 0,890
    …
    1 ligne ne change que par ce qui précède : semelle 12.
    2 lignes n'ont pas bougé : Semelle 1, Semelle 2.
```

**La couleur ne ment plus.** Le vert quitte la valeur d'après : rien dans le
code ne sait si une valeur nouvelle est une bonne nouvelle. Il reste où il veut
dire quelque chose — une réserve qui se lève. L'ambre reste où il alerte
vraiment, et le rang « À revérifier » ne s'habille en alerte que s'il a quelque
chose à signaler.

---

## Ce qui manque — par rangs de lecture

L'ordre compte : **la conclusion, puis la chaîne, puis le détail.** Aujourd'hui
l'écran commence par le détail.

### Rang 0 — la phrase de tête

Une carte, en haut, dans la couleur de son verdict, qui dit en une phrase ce que
la variante fait au projet. Sur les deux essais réels :

> **Le projet ne tient plus.** Avec une profondeur hors gel de 80 m au lieu de
> 0,466 m, les 12 massifs du bâtiment A passent en défaut. Le plus sollicité
> atteint 16,05 fois sa limite. Une valeur du projet a été recalculée, aucune
> n'est restée en suspens.

> **Le projet tient.** Avec une altitude de 800 m au lieu de 13,22 m, la
> profondeur hors gel passe à 0,66 m et 10 massifs sur 12 descendent de 6 cm.
> Les 12 restent vérifiés ; la marge la plus faible passe de 0,978 à 0,925.

**Chaque nombre de ces phrases vient du calcul, aucun n'est produit par
l'écran.** C'est la seule règle qui compte ici : la phrase assemble, elle ne
conclut pas à la place des agents. Le matériau existe déjà — nombre de
valeurs qui bougent, verdicts qui basculent, pire ratio — sauf le mot « limite »,
qui demande que l'agent dise ce qu'est sa colonne de marge (voir plus bas).

### Rang 1 — la cascade, pas la liste

Ce qui aurait évité la mélecture. La profondeur indentée dit le rang de
propagation ; l'agent qui a recalculé est au bout de la ligne, pas en
dessous.

```
Altitude du site                 13,22 m → 800 m       ce que vous essayez
 ├── Profondeur hors gel           0,47 m → 0,66 m     deduction_profondeur_hors_gel_altitude_V1
 │    └── Résultat des fondations  assise 0,60 → 0,66 m   ·  12 vérifiées → 12 vérifiées
 └── Zone de neige                 A1 → A1  (relue, sans changement)
```

L'information est disponible : `lecturesDeLaRegle`, `sortiesDeLaFonction` et le
`lit` de chaque agent donnent déjà les arêtes, et l'ordre du rejeu suit
déjà la chaîne. Il ne manque que le rang et le trait.

### Rang 2 — l'écart, pas seulement les deux valeurs

`0,978 → 0,925` demande une soustraction mentale ; `0,978 → 0,925 (−5 %)` ne la
demande pas. Sur une colonne dont l'agent déclare l'unité — `structure` la
donne déjà : `{nom: "arase supérieure", type: "nombre, en m"}` — l'écart se
calcule et s'écrit : `−0,06 m`. Sur une colonne sans unité, rien : mieux vaut
pas d'écart qu'un écart faux.

### Rang 3 — dire pourquoi une ligne n'a pas bougé

Sur l'essai à 800 m, **Semelle 1 et Semelle 2 n'ont pas bougé**, et c'est une
information de premier ordre : elles étaient déjà assez profondes. La phrase
existe dans les données :

> Semelle 1 et Semelle 2 n'ont pas bougé : leur assise est à −1,10 m, déjà plus
> bas que les 0,66 m exigés.

`arase supérieure` + `hauteur` donnent l'assise ; l'assise exigée est dans la
phrase du résultat. Rien à inventer, seulement à écrire.

### Rang 4 — une coupe, dessinée à partir des cotes

Un schéma vaut ici tout le tableau : le terrain naturel, la cote hors gel avant
et après en deux traits, et les massifs à leur profondeur, ceux qui remontent
au-dessus du trait marqués. Sur l'essai à 80 m, on verrait immédiatement que les
massifs sont à −79 m et que la ligne de gel est à −80 m.

**Dessiné à partir des cotes, jamais d'un modèle.** Un schéma produit par une
machine à texte serait une image de calcul, ce que Mdall refuse par principe.

### Rang 5 — ce qu'on fait de la variante

« Lire la mémoire avec cette variante » est la sortie d'un spike, pas d'un
produit. Ce que l'on veut à la fin d'une décision :

- **en faire une proposition** — c'est le § 4 du carnet, et c'est le chemin
  normal : Copilote → Atelier → Proposition → Mémoire. Une variante ne se verse
  jamais directement, mais elle peut ouvrir la proposition toute remplie ;
- **comparer deux variantes** — 0,466 m, 4 m, 80 m côte à côte, une colonne
  chacune. Reporté, comme convenu ;
- **emporter** — déjà là, et c'est ce qui a permis d'écrire ce document.

---

## Sur l'idée d'un LLM en fin de chaîne

Elle est juste, à une condition qui n'est pas négociable.

**Ce qu'un modèle peut faire ici :** redire en français ce que le calcul a
établi, avec le cadrage métier du lecteur — « une profondeur hors gel de 80 m
n'existe pas en France ; à cette cote vos massifs sont hors de tout domaine
d'emploi de la NF P94-261 ». C'est une **lecture**, pas un versement : rien
n'entre en mémoire, la règle 1 est respectée.

**Ce qu'il ne doit jamais faire :** produire un nombre, un verdict, ou un
schéma. Un chiffre dans Mdall se remonte à l'agent qui l'a calculé et à la
version de sa loi. Un chiffre qui viendrait d'un modèle serait indiscernable des
autres à l'écran et détruirait la seule promesse du produit. La contrainte
technique qui en découle : **on lui donne les faits calculés, et il n'a le droit
que de les redire.** Ce qu'il rend est du texte, marqué comme tel à l'écran.

**Dans quel ordre.** La phrase de tête du rang 0 se calcule, elle. Elle est
disponible hors ligne, sans latence, sans coût, et elle est vraie par
construction. C'est elle qu'il faut écrire d'abord — elle porte l'essentiel de
la valeur. Le modèle vient **après**, sur cette phrase, pour l'étoffer.

**Où il tourne.** Au serveur, jamais dans le navigateur — l'orchestration ne se
montre pas. Et une synthèse de variante reste privée à qui la demande, comme les
conversations avec le copilote.

---

## La démarche : la déclaration fait autorité

*Livré. C'est le mécanisme unique dont tout le reste dépend.*

Un écran doit savoir que « en défaut » est un défaut, et que `16,050` est seize
fois trop. Il y a deux façons de le lui apprendre.

**La mauvaise** : un dictionnaire de mots — « en défaut », « KO », « non
vérifié », « hors domaine d'emploi » — qu'on enrichirait à chaque agent
ajouté. C'est une machine à deviner le sens du français, qui se tromperait un
jour sans le dire, qui obligerait à toucher aux écrans pour chaque nouvel outil,
et qui ne saurait jamais répondre « je ne sais pas ». Un faux modèle de langue,
programmé à la main.

**La bonne** : **l'agent déclare, une fois, dans sa structure.** L'écran lit
la déclaration. Un agent qui ne déclare rien n'est pas un cas particulier à
traiter : l'écran reste neutre sur lui, ce qui est exact — personne ne lui a dit.

```js
{ nom: "vérification", valeurs: [
    { nom: "vérifiée",     sens: SENS.TENU },
    { nom: "en défaut",    sens: SENS.ROMPU },
    { nom: "non calculée", sens: SENS.INCONNU }
] }
{ nom: "ratio déterminant", type: "nombre", marge: { limite: 1, comparaison: "au plus" } }
{ nom: "arase supérieure",  type: "nombre, en m" }
```

Trois garde-fous, et ils sont ce qui empêche le dispositif de redevenir un
dictionnaire :

1. **Le vocabulaire des sens est fermé** — `tenu`, `rompu`, `inconnu`, et pas un
   de plus. Ouvert, chacun écrirait le sien et les écrans finiraient par les
   interpréter, c'est-à-dire par deviner. Ces trois mots ne parlent pas du
   métier : ils disent seulement ce qu'un lecteur doit ressentir. Le métier reste
   entier dans le libellé que l'agent a choisi, et c'est lui qu'on affiche.
2. **Aucune inférence, jamais.** `sensDeLaValeur` sur une valeur non déclarée
   rend `""`. Un mot n'est pas un sens.
3. **La forme ancienne reste lue** — `valeurs: ["vérifiée", "en défaut"]` déclare
   les valeurs possibles sans leur sens, et l'écran reste neutre. Moins
   d'affichage, jamais d'affichage faux : c'est la bonne dégradation, et c'est ce
   qui rend la migration additive.

**Une légende n'est pas une donnée.** La déclaration lue est celle de
l'agent **d'aujourd'hui**, pas la copie figée au versement — la copie ne
sert que de recours. Pour une *valeur*, le gel est la règle même de Mdall : on
rejoue avec la loi de l'époque. Mais `sens` et `marge` ne changent pas ce que le
calcul a rendu ; ils changent ce qu'un lecteur en comprend. Les figer voudrait
dire qu'un projet versé hier ne profitera jamais d'une légende écrite demain, et
qu'il faudrait re-verser des années de mémoire pour gagner une couleur. La
correspondance se fait par nom de colonne : une colonne renommée ne trouve rien,
donc ne se colore pas — jamais un mauvais rapprochement.

Tout est dans `services/tableau-structure.js`, et **ajouter un agent ne
demande jamais de toucher à un écran.**

---

## Trouver une valeur, et faire varier ce qui est dans un tableau

*La description est livrée. La variante d'un champ interne reste à écrire.*

### Le défaut

Changer la contrainte de sol retenue pour le calcul est aujourd'hui hors de
portée. La valeur existe — c'est `contrainteLimite`, dans les `entrées` de chaque
massif de `Données d'entrée des fondations superficielles` — mais elle n'apparaît
nulle part dans « chercher une valeur », et l'on ne peut pas la trouver sans
connaître déjà son nom exact.

Et même parmi les valeurs listées, beaucoup sont obscures : « Altitude du site »
se comprend seul, « H0 retenu pour le département » non.

### Ce qui est livré : dire ce qu'une valeur est

La liste porte maintenant une phrase sous chaque valeur, prise dans l'ordre du
plus précis au plus général : ce que l'affirmation dit d'elle-même (`quoi`), à
quoi elle sert (`utilisation`), le libellé de l'agent qui l'a produite, la
norme dont elle vient. **Les quatre sont déclarées.** Quand les quatre se
taisent, la ligne ne dit rien : une phrase fabriquée ici serait indiscernable
d'une phrase versée.

### Livré : varier un champ interne d'un agent-D

Le mécanisme est le même que ci-dessus — **la déclaration fait autorité** — avec
un troisième ajout à `structure` : la **clé réelle** du champ.

```js
{ nom: "sol et matériaux", champs: [
    { nom: "contrainte limite à l'ELS", cle: "entrees.contrainteLimite", type: "nombre",
      quoi: "La contrainte que le sol admet à l'état-limite de service. C'est elle "
        + "qu'un rapport géotechnique donne…" }
] }
```

`STRUCTURE_DES_ENTREES` décrivait la **forme** pour un lecteur humain —
« contrainte limite à l'ELS » — sans dire que la valeur s'appelle
`entrees.contrainteLimite`. Le nom se lisait donc à l'écran sans qu'on puisse
l'atteindre. La `cle` fait le lien, et elle seule : **ce qui n'est pas déclaré ne
se propose pas.** Un champ qui recouvre plusieurs valeurs — « fût », qui est une
hauteur et deux côtés — n'a pas de clé et ne s'offre donc pas ; lui en inventer
trois reviendrait à nommer à la place de l'auteur.

Ce que cela donne, et pourquoi :

1. **Un champ, pas un champ par massif.** On change la contrainte de sol *de la
   zone*, pas celle du massif n° 7. Douze massifs par douze champs feraient cent
   quarante-quatre entrées dans une liste où l'on cherchait déjà mal. Un champ
   apparaît une fois, avec la valeur que ses lignes partagent — ou « 12 valeurs
   différentes » quand elles divergent, ce qui se dit plutôt que de montrer la
   première.
2. **Il se cherche par son groupe et par sa description.** Taper « sol » ramène
   « sol et matériaux · contrainte limite à l'ELS », avec la phrase qui dit ce
   qu'elle est. C'était le blocage : on ne pouvait pas la trouver sans connaître
   déjà son nom exact.
3. **L'identifiant est composite** — `<affirmation>#entrees.contrainteLimite` —
   et se lit dans un export. Les endroits qui raisonnent sur l'affirmation le
   résolvent jusqu'à sa base : un champ n'a pas d'aval à lui, c'est l'affirmation
   qui le porte que les autres lisent.
4. **La substitution réécrit le tableau avant le rejeu**, par une fonction pure
   appelée au seuil du rejeu et au seuil du calque de lecture. Tout le reste de
   la chaîne fonctionne sans changement : `tableauDuProjet` relit le tableau
   modifié, `reprendreLEtude` redemande le calcul, et aucun maillon n'a eu à
   connaître la notion de champ.
5. **La valeur de l'affirmation ne bouge pas.** « 12 lignes » reste vrai : c'est
   une colonne du tableau qui a changé, pas le nombre de lignes. La ligne est
   seulement marquée comme relevant de la variante.

### Les soixante-deux champs des fondations

Tous déclarés, avec pour chacun ce qu'il est et ce que le faire varier veut dire.
La liste vit **dans la déclaration de l'agent** et nulle part ailleurs —
`agents/dimensionnement_fondations_superficielles_V1.js`, `STRUCTURE_DES_ENTREES` —
parce qu'une seconde copie dans ce document divergerait au premier ajout
(règle 4). Sept groupes, dans l'ordre où un ingénieur lit une semelle :

| groupe | champs | ce qu'on y cherche |
|---|---|---|
| hypothèses réglementaires | 5 | quelle règle du jeu, et sous quelles conventions |
| géométrie | 11 | le massif, son fût, et de combien la charge tombe à côté |
| sol et matériaux | 6 | ce que le terrain accepte, ce que le béton pèse |
| butée mobilisée | 5 | ce que les terres de devant retiennent, et ce qu'on ose en compter |
| béton armé | 6 | enrobages, classes, et la sévérité qu'on s'impose |
| charges | 14 | onze cas de charge, les lests, le type d'exploitation |
| ferraillage proposé | 8 | quatre nappes, leur nombre de barres et leur diamètre |
| capacité portante sismique | 7 | ne servent qu'au règlement « EC8-5 Annexe F » |

Trois décisions à retenir :

- **Un cas de charge se fait varier par son effort vertical, et lui seul.** Onze
  cas par cinq composantes feraient cinquante-cinq champs, et « le moment My du
  séisme vertical » n'est pas une question qu'un concepteur se pose devant une
  variante. Celle qu'il se pose est « et si la neige montait de trente pour
  cent ». Les efforts horizontaux et les moments restent une saisie de l'Atelier,
  où ils se lisent en face de leur schéma.
- **Les paramètres d'expert ne se déclarent pas** — `gminElu`, `wElu`,
  `newmark`, `deSurB`, les coefficients de sécurité. Le calcul lui-même dit que
  « le classeur les laisse rarement bouger » ; les offrir dans une liste où l'on
  cherche invite l'accident.
- **Les valeurs énumérées viennent du calcul**, jamais d'une liste réécrite ici :
  règlements, répartitions, drainages, inclinaisons, unités, zones sismiques,
  catégories d'importance, classes de sol EC8, sous-catégories, natures de
  cisaillement, diamètres de barres. Une liste recopiée diverge (règle 4).
