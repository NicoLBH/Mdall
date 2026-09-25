# Le langage Mdall

Un langage de **traçabilité du raisonnement de projet**. Pas un langage de
règles : les règles ne sont qu'une des sources de raisonnement qu'un projet
capitalise, à côté des décisions, des relevés, des calculs et des hypothèses.

Il s'adresse à des contrôleurs techniques, des architectes, des maîtres
d'ouvrage, des conducteurs de travaux, et **tout se tape au clavier**.

Les seuls mots empruntés à un langage de programmation vivent dans les fichiers
`.ref` : `fonction` ouvre une règle, `soit` déclare ce qui la fonde, `const`
définit un nom du projet, et `//` ouvre un commentaire. Ils le sont parce qu'un
`.ref` **s'exécute**, et parce qu'un raisonnement composé de trois conditions ne
se relit pas sans bornes. Le reste du langage vient de l'écrit technique et
juridique, et les autres extensions n'en portent aucun.

Les **verbes**, eux, sont propres au métier : `importe`, `enregistre`,
`décision humaine assumée`. Voir « Les verbes du langage ».

---

## Les cinq objets, et pourquoi ils ne se mélangent pas

| l'objet | ce qu'il est | où il s'écrit |
| --- | --- | --- |
| la **donnée** | « Hauteur du plancher bas du logement le plus haut » | le sujet, en tête de ligne |
| la **valeur** | « 26 m » | après le `=` |
| la **règle** | `fonction … si … alors …` | un fichier `.ref` |
| la **preuve** | la provenance, puis sa citation | `soit texte = …` puis `soit parce que = …` |
| le **statut** | « retenu », « supposé » | `statut:`, sur sa ligne |

Et un sixième, qui n'est aucun des cinq : la **déclaration de variable**. Elle
ne dit pas ce qu'un nom vaut, elle dit ce qu'il **est** — voir « Une déclaration
de variable doit être explicite ».

---

## Les trois lois de lecture

1. **L'indentation est l'appartenance.** Une ligne indentée détaille la ligne
   pleine qui la précède. Trois espaces, jamais une tabulation : la largeur
   d'une tabulation dépend de qui la lit, et une mémoire qui se lit
   différemment selon l'écran n'est pas une mémoire.
2. **Un mot-clé ne compte qu'en tête de ligne**, après le retrait. « Habitation
   individuelle **ou** collective » est un sujet, pas une disjonction.
3. **Une valeur textuelle porte des guillemets, une valeur mesurée n'en porte
   pas.** `= "3e famille B"` contre `= 26 m`. Sans cette différence, on ne
   saurait pas relire `= 3` : le chiffre trois, ou la catégorie « 3 » ?

---

## Tout se tape au clavier

`§`, `¶`, `←`, `≤`, `≥`, `≠` étaient jolis et intapables. Un langage qu'un
architecte doit pouvoir écrire à la main ne peut pas exiger une table de
caractères : chaque marque est devenue un **mot suivi de deux points**, qui dit
en plus ce qu'elle voulait dire.

```
fichier: memoire/incendie.ctr             le chemin du fichier
note: écriture Mdall v4.4                 une note, jamais interprétée

Sujet = valeur {                          une affirmation qui vaut partout
   le: 12 mars 2026                       quand — pour un constat
   texte: arrêté …, article 3, 3°)        d'où cela vient, typé par le mot-clé
   décision humaine assumée (…)           ou : quelqu'un a tranché, et il signe
      parce que: "citation exacte"        la preuve, sous sa provenance
   statut: retenu                         l'état du raisonnement ici
}

Sujet = [                                 la même, valeur par valeur
   Bâtiment A: "CF 1 h" { … },            une entrée par partie d'ouvrage
   Bâtiment B: "CF 1/2 h" { … }
];

fonction Sujet(zones, entrée) {           la tête d'une règle, portée d'abord
   // à quoi elle sert                    dedans, pour qu'elle se copie entière
   importe (variable: entrée,             d'où vient chaque entrée, et pour
            depuis: donnees-de-base.ddb,  quelle zone
            zones: zones);
   soit texte = "…";                      d'où elle sort, déclaré en tête
   soit parce que = "…";                  la citation qui la fonde
   si (Sujet <= 28 m)                     une condition
   et (Sujet = "collective")
   ou (Sujet parmi "a" ou "b")
   non (Sujet = "x")
   sauf si (Sujet = oui)                  ce qui la borne
   alors (                                ce que la règle pose…
      enregistre (
         Sujet: "3e famille B",
         dans: incendie.ctr,              …et où cela s'écrit
         zones: zones
      )
   );
   sinon ("3e famille A");                ou : conclure sans rien écrire
}
```

### Les accolades bornent, elles ne parlent pas

L'indentation suffisait à la machine, pas à l'œil : un bloc de sept lignes dont
la fin ne se marque que par un retour au niveau zéro se relit mal, et se relit
très mal quand deux blocs se suivent.

Ce n'est pas un mot de programmeur, c'est une **borne**. Elle rend en outre le
**pliage** possible, qui est ce qui rend un fichier de cent affirmations
lisible : replié sur ses têtes, il en fait cent au lieu de cinq cents.

On ne dépend donc plus de la seule mise en forme du rendu : le texte brut, collé
dans un éditeur quelconque, garde sa structure.

Une ligne vide sépare deux blocs. Sans elle, l'accolade fermante de l'un et la
tête du suivant se collent, et l'œil ne voit plus où l'un finit. Une affirmation
qui ne porte rien d'autre que sa valeur ne s'entoure pas de bornes : une paire
autour de rien serait du bruit.

La lecture, elle, **pardonne l'absence d'accolades** : un bloc ouvert sans borne
se ferme à la première ligne non indentée. Un architecte qui tape à la main n'en
ajoutera pas toujours.

**Les comparateurs** : `=` `!=` `<=` `>=` `<` `>` `parmi` `renseigné`
`non renseigné`. La lecture accepte aussi `≤`, `≥`, `≠`, `<>`, `==` : personne
ne doit être refusé pour une raison de clavier, et une mémoire ne refuse pas ce
qu'elle a elle-même écrit hier.

**Les six provenances** : le mot-clé **est** le type, et le type **est**
l'origine de la valeur. Rien de plus à déclarer.

| mot-clé | ce qu'il dit |
| --- | --- |
| `texte:` | un texte réglementaire, une norme, un DTU |
| `document:` | une pièce du projet : plan, note, compte rendu |
| `calcul:` | un calcul, avec ce qu'il a lu |
| `règle:` | une règle d'un référentiel |
| `décision:` | quelqu'un a tranché |
| `hypothèse:` | on suppose, en attendant mieux |

Les deux dernières sont les seules qui ne se déduisent de rien, et les seules
qui engagent quelqu'un.

**Les sept statuts** : `retenu` · `supposé` · `contesté` · `remplacé` ·
`écarté` · `sans objet` · `en attente`. Le statut n'est pas une propriété de la
valeur ni de la règle : c'est ce que **ce projet** en fait aujourd'hui.

---

## À quoi sert tout ceci

Mdall code la **mémoire d'un projet** : les données factuelles, et surtout les
raisonnements. Capitaliser, et rendre explicite ce qui d'ordinaire reste
implicite.

L'objectif tient en une scène. Je lis dans `incendie.ctr` :

```
Blocs-portes des ensembles celliers ou caves = "CF 1/2 h"
```

Très bien — mais **comment est-on arrivé là ?** La mémoire doit répondre sans
qu'on aille demander à quelqu'un :

```
données de base employées  →  enchaînement des fonctions, et leurs fichiers  →  résultat
```

C'est cette chaîne que la forme d'une fonction rend lisible. Tout ce qui suit
en découle.

---

## Une fonction est auto-portée

Une fonction qu'on lit seule doit se comprendre seule. Sans cela, il faut ouvrir
les autres fichiers pour reconstituer la chaîne — et c'est précisément ce que la
mémoire existe pour éviter.

```
fonction Accès des véhicules lourds(zones, Champ d'application du titre VI) {
   // Définit si un parc de stationnement d'habitation, non soumis aux règles
   // ERP PS, peut accueillir des véhicules de plus de 3,5 t.

   importe (variable: Champ d'application du titre VI, depuis: memoire/donnees-de-base.ddb, zones: zones);

   soit texte = "arrêté du 31 janvier 1986 modifié, article 79";
   soit parce que = "L'accès des parcs est interdit aux véhicules de plus de 3,5 t de poids total en charge.";

   si (Champ d'application du titre VI = "dans le champ")
   alors (
      enregistre (
         Accès des véhicules lourds: "interdit au-delà de 3,5 t",
         dans: incendie.ctr,
         zones: zones
      )
   );
}
```

Six obligations, et une seule raison derrière chacune : **qu'on n'ait pas à
chercher ailleurs**.

### 1. Un commentaire dit à quoi elle sert — **dans** la fonction

Première ligne du corps, jamais au-dessus de la tête. Au-dessus, il appartient
au fichier : copier la fonction pour la porter dans un autre projet — ce qu'on
fait, et ce qu'on fera de plus en plus — laisserait l'explication derrière.

C'est la règle générale, dont tout ce qui suit découle : **une fonction ne
dépend pas de son contexte.** On la cherche, on la lit, on la copie, on
reconstruit le raisonnement qui a mené à un résultat — et à chacun de ces
gestes, elle doit se suffire.

Sans commentaire, il faut lire les conditions pour deviner l'objet — et sur
douze mille fonctions, personne ne le fera. Une fonction qui n'en a pas porte
donc, à sa place, une ligne qui **appelle** : `// À DÉCRIRE — à quoi sert
« … » ?`. Une absence qui se voit vaut mieux qu'une absence silencieuse.

### 2. La portée est un paramètre, jamais un rangement

`zones` est le premier paramètre, presque toujours. Une règle est le **capital
de raisonnement** du projet : la même recopiée dans trois zones ferait trois
versions à corriger le jour où l'arrêté bouge, et deux d'entre elles resteraient
en arrière.

Un fichier `.ref` ne se découpe donc pas par zone, et n'y répète pas une
fonction. Ce sont les **valeurs** qui portent une zone, pas les raisonnements.

### 3. `importe` dit d'où vient chaque entrée, et pour quelle zone

Un import par ligne : ajouter une entrée ajoute exactement une ligne, et le diff
dit « une entrée de plus » plutôt que de redessiner un bloc. Le fichier nommé
est celui qui **déclare** la variable ; à défaut, `variables-du-projet.ref`, qui
les liste toutes — et c'est là qu'on verra qu'elle manque.

`zones:` en fait partie. Une variable n'a pas *une* valeur, elle en a une par
partie d'ouvrage : emprunter sans dire laquelle reviendrait à en prendre une au
hasard.

### 4. `soit` déclare ce qui la fonde

Comme les `const` d'une fonction, en tête. Le nom de la locale **est** le type
de provenance : `soit texte = …`, `soit document = …`, `soit règle = …`. Plus
`soit parce que = …` pour la citation. En bas, après la conclusion, on ne les
cherchait plus.

### 5. `enregistre` dit où va le résultat

C'est la question qui vient toujours après « alors quoi ? ». Le bloc y répond
sur place : le sujet posé, le fichier qui reçoit, la portée sur laquelle cela
vaut. Trois lignes plutôt qu'une, parce que chacun de ces trois champs peut
changer seul.

Une règle peut conclure sans rien écrire — `alors ("2e famille");` — quand elle
produit une valeur intermédiaire que d'autres reprennent.

### 6. Les commentaires sont du langage

`// …` et `/* … */`, en gris. Ils ne posent rien, ne conditionnent rien : dire
*pourquoi* une condition existe est autre chose que dire ce qu'elle teste, et
une règle de quinze lignes en a besoin.

---

## Les verbes du langage

Un langage de métier a des **verbes** : les gestes qui reviennent dans tous les
projets. Les écrire en prose à chaque fois donnerait mille formulations pour une
seule chose.

| verbe | ce qu'il fait |
| --- | --- |
| `importe (variable: X, depuis: f)` | dit d'où vient une entrée, et où aller la lire |
| `enregistre (X: v, …, dans: f, zones: z)` | écrit une ou plusieurs valeurs dans un fichier, sur une portée |
| `agent-D (agent: X, version: V)` | un agent déterministe fait le travail — mêmes entrées, même sortie |
| `agent-IA (agent: X, version: V)` | un agent qui juge ou rédige — sa sortie peut varier à entrées égales |
| `décision humaine assumée (quoi, par: X, le: d)` | quelqu'un a tranché, et il signe |

`décision humaine assumée` remplace la ligne `décision:` dès qu'on sait qui a
tranché et quand. La différence n'est pas cosmétique : une hypothèse **se lève**
quand la donnée arrive, une décision **se conteste** devant celui qui l'a prise.
Sans nom ni date, une valeur choisie à la main se relit six mois plus tard comme
un fait établi, et personne ne sait plus que c'était un choix.

**La liste est fermée**, et c'est ce qui en fait un langage : un verbe inventé au
fil de l'eau ne se relirait nulle part. Ceux que le besoin nommera ensuite :

- `constate (X: v, le: d, document: f)` — une observation datée ;
- `suppose (X: v, jusqu'à: ce qui la lèverait)` — une hypothèse et sa sortie ;
- `sans objet (raison)` — le référentiel ne s'applique pas, ce qui n'est **pas**
  une condition fausse : « aucune exigence » et « exigence non satisfaite » sont
  deux phrases différentes ;
- `à vérifier (question, pour: qui)` — la machine s'arrête et appelle quelqu'un,
  plutôt que de conclure à sa place.

---

## Une fonction s'écrit en entier ; un agent s'appelle

Une règle porte sa loi : `si (Hauteur ≤ 28 m) alors ("3e famille B")`. C'est
possible parce que cette loi est un arrêté — publique, opposable, citable.

Certains agents n'ont pas cette loi-là : un pré-dimensionnement de
fondations **est** sa loi. On ne peut ni la donner, ni la taire. Le langage a
donc un verbe pour cela — mais **pas** un second genre de fonction :

```
fonction Prédimensionnement des fondations superficielles(zones, Profondeur hors gel, Données d'entrée des fondations superficielles) {
   // Dimensionne les massifs superficiels d'une zone : descente de charge,
   // combinaisons, portance du sol, glissement, renversement et ferraillage.
   // La loi de calcul appartient à l'agent — elle ne s'écrit pas ici.

   const Profondeur hors gel à retenir;
   si (Profondeur hors gel renseigné)
   alors (Profondeur hors gel à retenir = Profondeur hors gel)
   sinon (Profondeur hors gel à retenir = importe (variable: Profondeur hors gel, depuis: sol.ctr, zones: zones));

   résultat = agent-D (
      agent: dimensionnement_fondations_superficielles,
      version: V1,
      zones: zones,
      Profondeur hors gel: Profondeur hors gel à retenir,
      Données d'entrée des fondations superficielles: Données d'entrée des fondations superficielles à retenir
   );

   enregistre (
      Résultat du calcul des fondations superficielles: résultat,
      dans: structure.ctr,
      zones: zones
   )
}
```

**Une fonction s'écrit toujours en entier.** Tout est lisible sauf une ligne :
l'appel. C'est la différence entre « le corps de cette fonction est secret » —
faux, et décourageant — et « cette fonction appelle un tiers, le voici nommé » —
vrai, et vérifiable.

**La portée s'écrit `zones`, jamais le nom d'une zone.** Une version antérieure
écrivait `fonction …(batiment-a, …)` et `zones: batiment-a` dans le corps : c'est
confondre le paramètre et l'argument. Une déclaration qui porte la zone du jour
se lit comme une fonction propre à ce bâtiment, alors qu'elle vaut pour tous — et
un projet de trois bâtiments montrerait trois fonctions identiques, toutes à
corriger séparément. Ce qu'une fonction a réellement traité se lit dans le
`.ctr`, zone par zone.

Une version antérieure écrivait `fonction native NOM(…)`, ce qui confondait les
deux. Le mot a disparu de la tête.

### Deux agents, une seule façon de les appeler

| verbe | ce qui répond | ce qu'on peut en faire |
| --- | --- | --- |
| `agent-D` | un enchaînement déterministe | le rejouer suffit à vérifier |
| `agent-IA` | un modèle qui juge, rédige, interprète | conserver ce qu'il a rendu, et quand |

La différence n'est pas technique, c'est la **reproductibilité**. Un `agent-D` se
rejoue et l'on compare ; un `agent-IA` ne se rejoue pas pour vérifier — le
rejouer donnerait peut-être autre chose sans que le projet ait bougé, et l'écran
annoncerait un changement qui n'en est pas.

Les deux s'appellent de la même façon, et pourront travailler côte à côte dans
une même fonction. C'est ce que le mot rend possible.

### `calcul natif` n'existe plus

« Calcul » était trop étroit : un agent calcule, un autre cherche dans une
table, un troisième lit un document et n'en extrait qu'une date. Le point commun
n'est pas le calcul, c'est qu'un tiers fait le travail et rend un résultat.

### `const X à retenir` : la variante, écrite dans le langage

```
const Profondeur hors gel à retenir;
si (Profondeur hors gel renseigné)
alors (Profondeur hors gel à retenir = Profondeur hors gel)
sinon (Profondeur hors gel à retenir = importe (variable: Profondeur hors gel, depuis: sol.ctr, zones: zones));
```

Un **paramètre passé à l'appel l'emporte sur ce que la mémoire porte**. C'est
exactement ce qu'une variante fait, et c'est ce qu'un lecteur doit comprendre
pour savoir comment se servir de la fonction.

`renseigné` est le mot que le langage a déjà pour « n'est pas vide » : la liste
des opérateurs est fermée, et en ajouter un synonyme aurait donné deux façons
d'écrire la même chose.

### Un `enregistre`, un résultat

Une règle conclut sur une valeur ; un agent qui dimensionne rend un **tableau**.
Il porte donc **un** nom, et ce que ce nom contient se lit là où il est rangé.

Sur la ligne, `résultat` est une **référence**, pas une valeur : c'est ce que
l'agent vient de rendre. Les guillemets font la différence — sans eux
« résultat » serait un texte que le projet affirme.

### `structure attendue` : ce qu'il y a dans une ligne

`type: "tableau"` ne dit rien. La déclaration de la variable porte donc sa forme,
une fois, à l'endroit où l'on cherche déjà le nom :

```
const Données d'entrée des fondations superficielles = {
   type: "tableau",
   description: "L'ensemble des données d'entrée nécessaires au calcul de plusieurs massifs…",
   utilisation: "Entrée du prédimensionnement. C'est ce que le projet conserve pour refaire le calcul…",
   structure attendue: [
      désignation: "texte",
      nombre de massifs: "nombre",
      hypothèses réglementaires: [
         règlement: "Fascicule 62" ou "DTU 13.12" ou "EC - NF P94-261" ou "EC8-5 Annexe F",
         répartition des contraintes: "Meyerhoff" ou "Constante"
      ]
   ],
   déjà utilisé dans: [
      Prédimensionnement des fondations superficielles (structure.ref)
   ]
};
```

Elle s'imbrique, parce qu'un champ peut être un groupe. Un champ à choix fermé
dit ses **valeurs** plutôt que son type — « texte » n'apprend rien quand seuls
deux mots sont admis. Et elle ne dit que la **forme** : ce qu'un projet met
dedans vit dans le fichier où le tableau est rangé.

### Un tableau s'écrit, il ne se résume pas

Une affirmation dont la valeur est un tableau écrit ses lignes sous elle :

```
Résultat du calcul des fondations superficielles = "11 massifs, 8,74 m3 de béton, assise mini 0,60 m — 11 vérifiées" {
   calcul: Prédimensionnement des fondations superficielles — dimensionnement_fondations_superficielles_V1
   statut: retenu
   tableau: [
      {
         désignation: "Semelle 1",
         nombre de massifs: 1,
         section Lx: 1,20 m,
         vérification: "vérifiée",
         entrées: {
            araseSuperieure: -0,1,
            hauteurLz: 1
         }
      }
   ]
}
```

Sans lui, le fichier ne portait que la phrase de résumé, et deux choses en
découlaient — chacune suffit :

- **le diff ne disait plus rien.** Une semelle dont la section passe de 1,20 à
  1,60 m ne change pas la phrase si le volume total tombe juste : le fichier
  était identique et le projet avait bougé ;
- **on ne pouvait plus refaire le calcul.** Ce qui est entré dans l'appel
  n'était nulle part lisible, donc pas vérifiable.

Chaque ligne porte les **entrées que le calcul a reçues** — ce n'est pas le
tableau d'entrée redit une seconde fois : c'est ce qui a été envoyé, après les
corrections que l'appel applique. L'écart entre les deux est précisément ce
qu'on veut voir.

Les valeurs s'écrivent comme partout ailleurs — un texte porte des guillemets,
une mesure n'en porte pas, une valeur qu'on n'a pas s'écrit `—` — et se relisent
telles quelles. La **forme attendue** du tableau, elle, se déclare une fois dans
`variables-du-projet.ref`, sous `structure attendue`.

---

## Les couleurs disent la grammaire

Un `.ref` s'exécute : il se colore donc comme du code, et chaque couleur dit un
rôle. Ce n'est pas une décoration — c'est ce qui permet de voir, sans lire, si
un nom appartient au projet ou à la fonction qu'on regarde.

| couleur | ce que c'est | exemples |
| --- | --- | --- |
| corail | un **mot-clé** | `fonction`, `native`, `const`, `si`, `alors`, `sinon`, `renseigné`, `importe` |
| violet | un **appel** | `agent-D`, `agent-IA`, `enregistre`, `décision humaine assumée` |
| bleu | une **variable du projet** | `Profondeur hors gel`, `Résultat du calcul…` |
| blanc | un **nom local** | `résultat`, `Profondeur hors gel à retenir` |
| jaune | un **champ du langage** | `agent:`, `version:`, `dans:`, `zones:`, `statut:`, `le:` |
| orange | un **paramètre**, une portée, un chemin | `batiment-a`, `structure.ctr` |
| gris italique | une **source** | le nom d'un agent, sa version |

Deux distinctions comptent plus que les autres.

**Une locale n'est pas un sujet.** `Profondeur hors gel à retenir` ne vit que
dans sa fonction ; `Profondeur hors gel` est un nom du projet, qu'on cherche,
qui a une déclaration quelque part et dont l'absence est une lacune. Les
confondre faisait souligner la locale comme un renvoi sans déclaration — à la
ligne même où elle est déclarée.

**`renseigné` est un mot, pas un signe.** En gris d'opérateur il se lisait comme
la fin du nom qui le précède.

---

### Ce qui reste commun

Le commentaire dans la fonction, `importe`, la portée en premier paramètre. Une
fonction native compte dans les fonctions, ses variables dans les variables, et
le cerveau la dessine comme une étape du raisonnement — parce qu'elle en est
une. Voir `docs/fondamentaux.md`, règle 9.

---

## Une variable, un bloc, ses valeurs par zone

Les fichiers de valeurs — `.ctr`, `.ddb`, `.hyp`, `.cst` — se découpaient par
zone, et le nom d'une variable se répétait dans chacune. Trois fois le même nom
à trois endroits différents, pour une seule chose. Chercher « degré coupe-feu
des planchers » donnait trois réponses sans dire qu'il s'agissait de la même
variable.

```
Degré coupe-feu des planchers = [
   Toutes zones: "CF 1 h" {
      règle: arrêté du 31 janvier 1986, article 6
      statut: retenu
   },
   Bâtiment A: "CF 1/2 h" {
      règle: arrêté du 31 janvier 1986, article 7
      statut: supposé
   }
];
```

**Une variable du projet, qui prend une valeur par partie d'ouvrage.** Et de ce
fait, la question devient impossible à éviter : *dans quelle zone ?* C'est
pourquoi `importe` porte lui aussi une portée.

Chaque entrée garde sa provenance et son statut : ce sont deux décisions
différentes, prises peut-être par deux personnes, à deux dates. Les mettre en
commun effacerait ce que la mémoire existe pour tenir.

Une valeur unique qui vaut partout n'ouvre pas de tableau — une paire de
crochets autour d'une seule entrée serait du bruit :

```
Colonne sèche = "exigée" {
   règle: Colonne sèche — arrêté du 31 janvier 1986, article 98
   statut: retenu
}
```

**Un `.ref` ne se groupe pas ainsi** : une fonction n'a pas de valeur par zone,
la portée est son paramètre. Elle n'y figure qu'une fois, quel que soit le
nombre de zones où elle a été appliquée.

---

## Une déclaration de variable doit être explicite

Dix-huit mois de chantier et douze mois d'études font des milliers de noms. Si
personne ne sait dire ce que fait celui-ci, **chacun en recréera un voisin** — et
la mémoire se remplira de synonymes qui ne se rejoignent jamais.

Une déclaration doit donc suffire à décider, seule, si l'on réutilise ce nom ou
si l'on en crée un autre. Six champs, et aucun n'est décoratif :

```
const Hauteur du plancher bas = {
   type: "mesure",
   unité: "m",
   description: "Hauteur du plancher bas du dernier niveau accessible au public, mesurée depuis le niveau du sol.",
   utilisation: "Entrée du classement en famille (article 3), et du désenfumage des locaux de grande surface selon l'IT 246.",
   déjà utilisé dans: [
      Classement du bâtiment (incendie.ref),
      Désenfumage des circulations (incendie.ref)
   ]
};
```

| champ | pourquoi il est obligatoire |
| --- | --- |
| **nom** | explicite, pas une abréviation : c'est lui qu'on cherchera |
| **type** | `mesure`, `texte`, `logique` — sinon on ne sait pas comparer |
| **unité** | une mesure sans unité n'est pas une mesure |
| **description** | ce que le nom **désigne**, exactement |
| **utilisation** | ce à quoi il **sert**, et selon quel texte |
| **déjà utilisé dans** | les fonctions qui l'emploient, et leurs fichiers |

### `valeurs possibles` : ce qu'un nom a le droit de valoir

Facultatif, et il ne se déduit de rien.

```
const Zone de vent = {
   type: "texte",
   valeurs possibles: "1" ou "2" ou "3" ou "4",
   description: "Zone de vent de la commune, au sens de l'annexe nationale de l'Eurocode 1.",
   utilisation: "Entrée de la vitesse de référence."
};
```

**Le même `ou` que partout ailleurs.** Les choix fermés d'un tableau s'écrivent
déjà ainsi (`structure attendue`), et une seconde façon d'énumérer — des
crochets, par exemple — ferait deux grammaires pour la même idée : celle qu'on
lit le moins finirait par ne plus être comprise.

**Il ne se devine pas.** Rassembler les valeurs déjà versées ferait une liste
fermée de ce qu'on a vu jusqu'ici, et la première valeur nouvelle et légitime se
signalerait comme une faute — on apprendrait vite à ne plus lire le signal. Il se
déclare, ou il n'existe pas (règle 5).

Deux choses en découlent :

- **une valeur hors du domaine se signale.** Une zone de vent à `7` passait
  jusqu'ici sans un mot. C'est la même famille de garde-fou que « deux unités ne
  se comparent pas ».
- **un écran peut en faire un choix.** Le bac d'essai en tire une liste
  déroulante, sans qu'un seul mot d'affichage entre dans le langage : le nom est
  l'étiquette, la description est l'aide, le domaine est la liste.

### Cette déclaration se relit

`variables-du-projet.ref` s'engendre depuis les autres fichiers, et personne ne
le reparsait : la lecture refusait donc chacune de ses lignes — `type` n'est pas
une provenance, `déjà utilisé dans` n'ouvre rien — sans que cela se voie, puisque
rien ne le lui demandait.

Un fichier qu'on vient de taper à la main et qui se fait refuser ligne à ligne
n'apprend rien : il dit que le langage se contredit. `lire(écrire(G)) = G` vaut
donc pour cette forme comme pour les autres, et **la liste des champs est
fermée** — `typo: "mesure"` se refuse, plutôt que de laisser une variable sans
type qu'on chercherait longtemps.

Les trois premiers se **déduisent** des valeurs déjà versées ; les deux suivants
ne se déduisent de rien et se versent avec l'affirmation ; le dernier se
recalcule à chaque nouvelle utilisation. Ce qui manque porte, à sa place, un
`À DÉCRIRE —` suivi de la question à laquelle il faut répondre. Un champ absent
ne se voit pas ; une question posée se voit.

Ces déclarations vivent dans `Mémoire/variables-du-projet.ref`, à la racine — le
dictionnaire du projet. Il s'engendre depuis les autres fichiers : le verser en
ferait une seconde vérité, qui divergerait au premier versement.

**Ce qu'il ne dit pas :** ce qu'une variable *vaut*. Elle prend plusieurs valeurs
au fil d'une étude, et une définition qui en porterait une cesserait d'être vraie
au premier versement. La valeur du jour, le fichier qui la déclare et le compte
des usages relèvent de l'analyse : c'est l'écran `Atelier › Développements ›
Suivre les variables mutualisées`, et le survol d'un nom dans n'importe quel
fichier.

---

## Deux racines, et une arborescence courte

L'onglet **Fichiers** porte les deux matières du projet, et elles sont de même
nature : ce sont les **sources**, celles à partir desquelles il se reconstruit.
Les PDF ne suffisent pas — qui a dit, quand, qui assume sont aussi des sources,
et l'application les produit.

```
Mémoire/
   donnees-de-base.ddb    ce que le bâtiment est
   hypotheses.hyp         ce qu'on suppose en attendant mieux
   corpus.crp             ce qui est entré au dossier
   incendie.ref           les règles appliquées
   incendie.ctr           ce qui s'impose
   incendie.cst           ce qui a été constaté, à une date
   structure.ctr
Documents/
   … rangés comme l'utilisateur veut
```

**Ce qui est observé est transversal, ce qui est déduit est par domaine.** Une
mesure appartient au bâtiment, pas à une discipline : « nombre d'étages » sert
l'incendie, la structure et l'acoustique, et la dupliquer par domaine violerait
la règle 4. Une règle et une contrainte viennent d'un corpus, donc d'un domaine.
Un constat aussi : il observe un manquement **au regard d'une exigence**.

Pas de répertoire par domaine : trois fichiers ne méritent pas un dossier, et
`incendie.ref` à côté de `incendie.ctr` se lit comme `app.js` à côté de
`app.css`. Une quinzaine d'entrées pour un vrai projet.

## La zone est une facette, pas un répertoire

L'unité de production est le **domaine** : une étude incendie touche plusieurs
zones d'un coup. Avec la zone en répertoire, une seule étude se dispersait en
autant de fichiers, donc autant de groupes dans le diff, pour un seul acte.

La zone est une **facette**, pas un lieu. Dans les fichiers de **valeurs**, elle
ouvre une entrée du tableau d'une variable — voir « Une variable, un bloc, ses
valeurs par zone » —, et « Toutes zones » vient toujours en premier : ce qui vaut
partout se lit avant ce qui ne vaut qu'ici.

**Un `.ref` fait exception** : il ne se découpe pas par zone. Un raisonnement ne
s'applique pas « dans le bâtiment A », il s'applique — et la partie d'ouvrage
est un paramètre de la fonction. Voir « Une fonction est auto-portée ».

```
Classement du bâtiment = [
   Bâtiment A: "3e famille B" { … },
   Bâtiment B: "2e famille" { … }
];
```

Comparer le bâtiment A et le bâtiment B se fait donc **sur une seule ligne**, et
non en sautant d'une section à l'autre. Une affirmation qui vaut pour deux zones
ouvre les deux entrées : c'est la même, vue de deux endroits, avec le même
identifiant.

Une entrée copiée hors de son bloc perd son nom de variable — c'est le prix du
groupement, et il est acceptable : le diff transporte la zone dans le repère,
jamais dans le texte seul.

---

## Une extension par nature, et une forme par extension

Deux `incendie.mdall` à deux endroits de l'arborescence n'ont pas de sens, et
c'est dangereux : on ouvre l'un en croyant l'autre. Comme `app.html`, `app.css`
et `app.js` disent trois choses du même `app`, l'extension dit la nature — et
**chaque nature a sa forme**.

Chacune a sa page : [`extensions.md`](extensions.md) les prend une par une.

| extension | ce qu'elle contient | sa forme |
| --- | --- | --- |
| `.ref` | des règles | `fonction Sujet(entrées)` · `si (…)` · `alors (…);` · `texte:` · `parce que:` |
| `.ctr` | des contraintes | `Sujet = valeur` · `règle:` · `statut:` |
| `.ddb` | des données de base | `Sujet = valeur` · `document:` · `parce que:` |
| `.hyp` | des hypothèses | `Sujet = valeur` · `hypothèse:` · `statut: supposé` |
| `.cst` | des constats | `Sujet = valeur` · `le:` · `document:` · `parce que:` |
| `.crp` | le corpus | ce qui est entré au dossier |

`le:` est propre au constat, et indispensable à lui : « l'escalier n'était pas
encloisonné » — quand ? avant ou après la reprise ? Un constat sans date ne se
conteste ni ne se lève.

Un `.ref` ne porte **jamais** de statut : un référentiel n'a pas d'état dans un
projet, il est appliqué ou il ne l'est pas.

---

## Le diff est le fichier

Chaque champ comparé **est** une ligne du fichier, écrite dans la langue. Le
diff d'un `.ref` ressemble donc à un `.ref`, et celui d'un `.ctr` à un `.ctr` —
ce qui est la moindre des choses, puisque c'est le même fichier.

Les champs s'appelaient « Valeur », « Règle », « D'où », et le diff les rendait
tous sous la forme `Sujet = valeur`. Une règle s'y lisait exactement comme une
contrainte, et l'on ne voyait plus aucune règle.

**Le nom d'un champ est son identité, pas son rang.** Une condition se nomme par
son sujet : `si (Hauteur du plancher bas …)`. Deux conditions réordonnées ne
produisent donc aucun changement, et une condition ajoutée produit exactement
une ligne ajoutée.

---

## La réciprocité

```
lire(écrire(G)) = G
```

Chaque information du graphe apparaît **une fois** dans le texte, et rien de
déductible n'y apparaît. Un test le vérifie sur des blocs réels.

C'est cette loi qui autorise à dire que le texte **est** la mémoire, et pas une
vue de la mémoire. C'est elle aussi qui interdit d'ajouter au langage une
information qu'on ne saurait pas relire — et c'est elle qui permet au diff de
colorer une ligne en la relisant, plutôt que de transporter deux représentations
de la même ligne.

Ce qui n'est pas compris n'est jamais avalé en silence : la lecture rend la
ligne, son numéro et la raison du refus.

---

## Le graphe, sans en avoir l'air

`grapheDesBlocs()` tire du texte les producteurs, les liens et les **entrées** —
les sujets qu'aucune règle ne produit, et qu'il faudra donc demander ou relever.

`aRevoirSi("Hauteur du plancher bas du logement le plus haut")` répond alors à
la question qui fait tout l'intérêt d'une mémoire de projet :

> La hauteur passe de 26 à 28,40 m. Cela remet en cause le **classement du
> bâtiment**, et par lui la **colonne sèche**, la **circulation horizontale
> protégée**, le **type d'escalier** et le **désenfumage**.

---

## Remonter la chaîne jusqu'aux données de base

Un constat dit d'où il sort : « ← règle Blocs-portes des celliers ». Cela ne
suffit pas. La question qu'on se pose devant une valeur suspecte n'est pas
« quelle règle l'a produite », c'est **à quelle étape elle est devenue fausse**.

La chaîne se reconstruit donc de proche en proche : une règle produit un sujet,
ses conditions en citent d'autres, chacun de ceux-là est produit par une autre
règle — ou par rien, et c'est alors une **donnée de base**. On s'arrête là, et
cet arrêt est la garantie : si l'on n'y arrive pas, c'est qu'il manque quelque
chose, et cela se voit.

Rien n'est stocké. Le stocker en ferait une seconde vérité, qui divergerait au
premier versement (`docs/fondamentaux.md`, règle 4).

### Ce qu'un agent doit verser pour que la chaîne tienne

Trois choses, et il en manquait deux :

1. **Les règles qui posent une exigence** — elles partaient déjà.
2. **Les déductions** — « Habitation individuelle ou collective », « Classement
   du bâtiment ». Elles n'exigent rien de personne, et c'est pour cela qu'on les
   jetait ; mais tout le reste s'appuie dessus, et sans elles la chaîne s'arrête
   à sa première importation.
3. **Les réponses de l'étude** — ce qu'aucune règle ne sait déduire. Elles se
   versent en `.ddb` : c'est là que la chaîne doit s'arrêter, et sans elles
   chaque remontée finissait sur « personne ne l'a versée ».

Un maillon intermédiaire ne s'impose à personne : il n'entre ni dans les
contraintes, ni dans les données de base. Sa valeur se lit alors sur
l'instantané de la règle qui l'a conclue — et l'écran dit **déduit**, pour ne
pas la confondre avec un relevé.

### Les dépendances se déduisent, elles ne se déclarent plus

Un panneau demandait de cocher, affirmation par affirmation, sur quoi elle
repose. Personne ne le remplissait — et c'est normal : au moment où l'on verse
une conclusion, on n'a pas envie de re-décrire ce que la règle vient d'énoncer.

Or la règle **le dit déjà**. `si (Classement du bâtiment = "3e famille B")` est
un lien de dépendance, écrit une fois, à l'endroit où il compte.
`dependancesDeLaMemoire()` les lit ; le drapeau « à revérifier » et le compte
des dépendants s'en nourrissent, et rien ne se stocke.

Un lien relie des **lignes**, pas des noms, et jamais deux zones différentes :
le degré du bâtiment A ne dépend pas de la hauteur du bâtiment B.

### La zone se compare sur la clé, et s'affiche en clair

La colonne `zones` de la base range des clés — `batiment-a` ; le `payload` garde
le libellé — « Bâtiment A ». Les deux sont nécessaires : la clé compare et
range, le libellé se lit. Comparer l'une à l'autre ne trouve jamais rien, et
n'écrire que la clé perd le libellé pour toujours — rien d'autre ne le porte, et
`batiment-a` ne dit pas si l'auteur avait écrit « Bâtiment A » ou « bâtiment A ».

## Les variantes : essayer une valeur, sans jamais l'écrire

### Pourquoi pas des branches

L'instinct, venu du code, est de faire une branche : on y change l'altitude, on
regarde, et on fusionne si l'on est content. Trois raisons de ne pas le faire.

**Le bâtiment est un.** Deux vérités durables pour un même ouvrage, c'est le
risque de commander du béton d'après la mauvaise.

**Fusionner des décisions n'a pas d'algorithme.** Un dépôt de code sait
rapprocher deux textes ; personne ne sait rapprocher deux arbitrages. C'est
précisément ce qu'une proposition fait déjà, avec quelqu'un qui tranche.

**L'histoire n'est pas un arbre.** La mémoire est un flux où l'on n'efface
jamais : une affirmation nouvelle **remplace** la précédente, qui garde sa date
et la date où l'on a cessé d'y croire. Il n'y a pas d'instantané à bifurquer.

Une variante est autre chose : une **lecture**. On substitue une valeur, on
relit, on regarde, on ressort. Rien n'est écrit, rien ne coexiste.

### L'échelle : variante → hypothèse → donnée de base

Trois barreaux, un seul chemin :

| barreau | ce que c'est | ce que ça engage |
| --- | --- | --- |
| **variante** | une valeur qu'on essaie | rien — elle se lit, elle meurt |
| **hypothèse** | une valeur qu'on assume en attendant mieux | tout ce qui en découle devient suspect quand elle change |
| **donnée de base** | une valeur qu'on sait | le projet |

Adopter une variante, c'est donc la faire monter d'un barreau : la porter en
hypothèse **par une proposition**. Jamais directement — rien n'entre en mémoire
sans passer par la porte. Le barreau du milieu existe déjà : c'est l'étape E, et
elle prend le relais toute seule le jour où la vraie valeur arrive.

### Un « checkout » gratuit

Tous les écrans de la mémoire — la liste, le détail, les fichiers, la chaîne du
raisonnement, le schéma des dépendances — sont des **fonctions d'une liste
d'affirmations**. Leur en donner une autre suffit.

`memoireAvecLaVariante(assertions, variante)` rend cette autre liste : la même,
dans le même ordre, avec les objets substitués à leur place. Il n'y a pas un
seul écran à réécrire, et rien à stocker.

### Le geste part de la mémoire

Le bouton **éprouvette › Tester**, dans la barre de la Mémoire, porte les trois
usages du même moteur : **tester une variante**, **auditer la mémoire**,
**étude d'impact**. Les mettre sous un même bouton n'est pas une économie de
place — c'est dire qu'ils sont la même chose vue de trois côtés ; trois boutons
épars laisseraient croire à trois mécanismes.

On lit une mémoire, on en essaie une variante, on regarde ce que ça change, et
si c'est mieux on en fait une proposition — le circuit habituel reprend là.

Le bouton porte le cyan des variantes, pas le vert de la déclaration : deux
boutons verts côte à côte se liraient comme deux gestes de même poids, or l'un
écrit en mémoire et l'autre ne fait qu'ouvrir une lecture.

Un usage que le moteur ne sert pas encore est **éteint, et dit son étape** —
« Auditer la mémoire — étape 5 ». Le plan est dans
[`docs/rejouer-la-memoire.md`](rejouer-la-memoire.md), et l'avancer tient dans
une constante : `ETAPE_ATTEINTE`. Un bouton qui prétend faire ce qu'il ne fait
pas coûte plus cher que l'absence du bouton.

### L'écart se lit sur les lignes, ou la variante ne sert à rien

Relire la mémoire avec d'autres valeurs ne suffit pas : sans repère, on ne voit
pas ce qui a bougé, et c'est justement l'**écart** qu'on vient lire. Chaque
ligne touchée porte donc une étiquette et un filet coloré à sa gauche :

| étiquette | ce qu'elle dit |
| --- | --- |
| **Variante** | la valeur qu'on a soi-même substituée |
| **Recalculée** | un agent rejoué a rendu autre chose — la valeur d'avant est barrée à côté |
| **Supposée** | rejouée, mais en supposant l'altitude de départ (voir plus bas) |
| **Relue** | rejouée, et elle ne bouge pas — ce n'est pas la même chose que « pas regardée » |
| **À revérifier** | concernée, et nous ne savons pas la rejouer : la valeur affichée est celle d'avant, et le mot le dit |

Et en entrant dans une variante, la liste ne montre d'abord **que ce qu'elle
touche** : sur trois cents lignes, l'écart est introuvable autrement. Le bandeau
porte le bouton qui rouvre la mémoire entière.

### Ce qui n'a pas d'entrées se nomme, il ne disparaît pas

Le premier jet reconnaissait une contrainte concernée par l'altitude à ce
qu'elle **conservait** l'altitude sur laquelle elle avait été calculée. Toutes
celles versées avant qu'on conserve les entrées tombaient donc dans « inchangé »,
comptées comme sans rapport avec l'altitude — un silence, sur la déduction
phare. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien (règle 5).

Deux façons de savoir qu'une contrainte est concernée, et il faut les deux :
elle garde son altitude d'entrée, **ou** l'agent qui l'a déduite est d'une
lignée qui lit l'altitude — la lignée, pas la version. Concernée sans être
rejouable, elle est nommée avec sa raison exacte : « ce calcul ne dit pas sur
quelle altitude il a été fait », ou « nous ne savons pas rejouer
`…_V2` ».

### Supposer se demande, ne se prend jamais

À une contrainte qui ne manque que de son altitude de départ, on peut rendre un
chiffre — à condition de supposer qu'elle a été calculée sur celle que le projet
dit aujourd'hui. C'est probable ; ce n'est pas certain.

L'outil pose donc la question — « Supposer qu'elle a été calculée à 13 m, et la
relire » — et quelqu'un y répond. Accepté, le calcul est refait en entier, et la
condition **voyage avec le chiffre** : sur la ligne de la fenêtre, sur la ligne
de la mémoire, et dans la variante retenue. Une valeur supposée qui perdrait sa
mention en route serait exactement le chiffre indiscernable d'un chiffre calculé
qu'on refuse partout ailleurs.

### Les trois rangs de conséquence, et la faute à ne pas commettre

Une valeur nouvelle ne produit pas un seul genre de conséquence.

1. **Recalculé** — un agent déterministe a été rejoué avec la nouvelle
   entrée. On rend une vraie valeur, et son écart.
2. **À revérifier** — quelque chose en dépend, mais on ne sait pas le rejouer :
   le référentiel est au serveur et prend le questionnaire entier, pas un champ.
   On **nomme**, on ne devine pas.
3. **Inchangé** — compté, et dit. « Rien n'a bougé là » est une information :
   sans elle, on ne sait pas si l'outil a regardé.

La faute mortelle serait de présenter le deuxième rang comme le premier. Un
chiffre qui a l'air recalculé et qui n'était que propagé, une seule fois, et
plus personne ne fait confiance à l'écran. C'est pourquoi une relecture est
**refusée dès que l'agent cité n'est pas exactement celui dont on connaît
la loi** : une `V2` fait tomber la contrainte au rang « à revérifier » plutôt
que de la recalculer selon une règle qui n'est plus la sienne.

### La table départementale ne descend pas au navigateur

La profondeur hors gel vaut `H = H0 + (altitude − 150) / 4000`, et `H0` vient
d'une table départementale qui vit au serveur. Elle y reste : `H0` étant le même
pour les deux lectures, il se simplifie, et il ne reste que

    H' = H + (altitude' − altitude) / 4000

La contrainte en mémoire garde l'altitude sur laquelle elle a été calculée
(`payload.inputs.altitude`), et c'est tout ce qu'il faut.

### Les garde-fous

Le seul vrai danger d'une variante est **d'oublier qu'on y est**.

- Un bandeau cyan — une couleur qui ne sert à rien d'autre dans l'application —
  collé en haut de la mémoire, avec la sortie toujours visible.
- **Rien ne s'écrit.** Verser, déclarer et exporter disparaissent tant qu'une
  variante est ouverte : écrire depuis une lecture fausse était le seul moyen
  qu'une variante avait de salir le projet.
- **Elle meurt quand on quitte l'onglet Mémoire.** Le bandeau ne vit que là ;
  laisser la variante courir derrière un autre onglet ferait exactement ce qu'on
  veut interdire.
- **Elle meurt au rechargement.** Elle ne se range ni en base, ni dans le
  navigateur : sortir par accident est sans conséquence, y rester ne l'est pas.
- **Elle périme.** Elle porte l'état de la mémoire au moment du calcul, et le
  bandeau dit « la mémoire a bougé depuis ». Une variante périmée a exactement
  le même air qu'une variante fraîche.

## Où cela vit dans le code

| fichier | ce qu'il fait |
| --- | --- |
| `apps/web/js/services/memoire-en-texte.js` | écrit — graphe → texte |
| `apps/web/js/services/memoire-en-lecture.js` | lit — texte → graphe, et colore |
| `apps/web/js/services/memoire-rangement.js` | où un fichier vit, et sous quelle extension |
| `apps/web/js/services/incendie-en-texte.js` | branche l'agent incendie sur le tout |
| `apps/web/js/agents/dimensionnement_fondations_superficielles_V1.js` | déclare la fonction native des fondations — ce qu'elle lit, jamais comment |
| `apps/web/js/services/fondations-versement.js` | ce qu'une étude de fondations propose : ses entrées, l'appel, son résultat |
| `apps/web/js/agents/agents-climatiques.js` | les deux agents-D du climat : ce qu'ils lisent, ce qu'ils posent, et la localisation |
| `apps/web/js/services/climat-versement.js` | ce qu'une étude climatique propose : la localisation, les deux appels, les zones |
| `apps/web/js/agents/agent-spectre.js` | l'agent-D du spectre élastique : ce qu'il lit, et la ligne qu'il pose |
| `apps/web/js/services/spectre-versement.js` | ce qu'une étude de spectre propose : les choix du projet, l'appel, la courbe |
| `apps/web/js/services/spectre-reprise.js` | refait le spectre quand la zone, le sol ou l'importance changent |
| `apps/web/js/services/localisation-versement.js` | la ligne de la localisation et celle de l'altitude — deux écrans les posent, une seule construction |
| `apps/web/js/services/zones-versement.js` | définir, renommer ou retirer une zone : les lignes qu'une proposition porte |
| `apps/web/js/services/fondations-reprise.js` | refait l'étude quand la profondeur hors gel change — pur, le calcul lui est passé |
| `apps/web/js/services/memoire-recherche-texte.js` | chercher un mot et le montrer où il est — surlignage, voisinage, va-et-vient |
| `apps/web/js/services/zip.js` | emporter la mémoire en un fichier, sans dépendance |
| `supabase/functions/incendie-habitation/conditions.js` | publie les conditions de la branche empruntée |
| `apps/web/js/services/memoire-raisonnement.js` | remonte la chaîne, et en tire le schéma des dépendances |
| `apps/web/js/views/ui/graphe-liaisons.js` | dessine le schéma — il ne sait rien du feu ni de la mémoire |
| `apps/web/js/views/project-memoire-raisonnement.js` | l'espace de raisonnement : le schéma, le code et les valeurs en une grille |
| `apps/web/js/agents/lecture-fait.js` | ce que tout agent lit d'un fait, et les sujets du projet qu'il déclare lire |
| `apps/web/js/services/memoire-variante.js` | relit la mémoire sous une autre valeur du socle, et range les conséquences en trois rangs |
| `apps/web/js/services/memoire-cerveau.js` | range le raisonnement en strates, pour qu'il se dessine — nœuds, liens, natures |
| `apps/web/js/services/agents-rejeu.js` | redemande à un agent de se recalculer avec les valeurs essayées, sans rien écrire |
| `apps/web/js/services/variante-en-cours.js` | la variante essayée — en portée de module, jamais rangée nulle part |
| `apps/web/js/views/memoire/ecran-variante.js` | l'écran : ce qu'on essaie et ce que cela change, ensemble |
| `apps/web/js/views/ui/bandeau-variante.js` | le bandeau qui dit qu'on ne lit pas la mémoire du projet |
| `apps/web/js/services/usages-du-rejeu.js` | les quatre usages du moteur de rejeu, où chacun vit, et l'étape où il s'allume |
| `apps/web/js/views/studio/explorations/explorations.js` | les trois explorations de l'Atelier : variante, étude d'impact, audit |
| `apps/web/js/services/memoire-applications.js` | ce qu'une règle a lu, avec son rang et sa zone — une ligne par lecture |
| `apps/web/js/services/memoire-applications-supabase.js` | enregistre les lectures au versement, et reconstruit celles d'avant |
| `apps/web/js/views/ui/fenetre-impact.js` | ce qui repose sur une valeur, rangé par distance |
| `apps/web/js/services/memoire-evaluateur.js` | exécute une règle : trois valeurs de vérité, quatre verdicts |
| `apps/web/js/services/memoire-rejeu.js` | rejoue toutes les règles, zone par zone, dans l'ordre du plan |
| `apps/web/js/services/memoire-plan.js` | le plan de recalcul : strates, profondeur, couverture, cycles |
| `apps/web/js/views/ui/fenetre-plan.js` | montre le plan — la forme du raisonnement, et sa frontière |
| `apps/web/js/services/memoire-audit.js` | le rejeu à blanc : chaque règle contre ce que le projet affirme |
| `apps/web/js/views/ui/fenetre-audit.js` | le verdict d'ensemble, et les quatre issues |

---

## L'arithmétique

### Pourquoi elle n'existait pas

Mdall comparait et concluait ; il ne calculait pas. La consigne donnée au modèle
le disait mot pour mot — « ne l'invente pas » —, et pour une bonne raison :
**une arithmétique inventée est indiscernable d'une arithmétique juste**, et
personne ne s'en aperçoit. Tant qu'aucun calcul n'était écrit, la seule façon
d'en obtenir un était d'appeler un **agent**, dont la loi n'est pas dans le
fichier mais dont le résultat se rejoue.

Mais une TVA à 20 %, une surface, un plancher bas pris à un mètre au-dessus du
sol — ce sont les phrases les plus ordinaires d'un projet. Les renvoyer toutes à
un agent revient à dire que le langage ne sait pas écrire ce qu'on lui demande
le plus souvent.

L'interdit n'est donc pas levé : il est **déplacé**. Ce qui s'écrit en Mdall se
lit, se rejoue et se vérifie ligne à ligne, comme une condition. Ce qui ne s'y
écrit pas reste un agent.

### Ce qui s'écrit

| | |
| --- | --- |
| `+` `-` `*` `/` | et `×` `÷` pour qui les a sous la main |
| `^` | la puissance, associative à droite : `2^3^2` vaut `2^9` |
| `20%` | un **suffixe**, pas un opérateur : `20%` vaut `0,2`, sans unité |
| `(` `)` | les priorités, sinon celles des mathématiques |
| `racine` `abs` `arrondi` `plafond` `plancher` `min` `max` | les sept fonctions |

```
soit TVA = Prix HT * 20%;
soit Prix TTC = Prix HT + TVA;
soit Diagonale = racine(Largeur ^ 2 + Longueur ^ 2);
soit Cote = arrondi(Niveau du sol + 1 m ; 2);
```

**La virgule est décimale**, comme partout ailleurs dans la mémoire : on écrit
`0,2`. Elle ne peut donc pas séparer aussi les arguments d'une fonction —
`min(1,5)` serait le minimum de un et cinq, ou bien un et demi, sans qu'aucune
règle ne tranche. Les arguments se séparent d'un **point-virgule** :
`min(1,5; 2)`. Une virgule à cette place est refusée en le disant, plutôt que de
choisir au hasard entre deux lectures.

Le **modulo** n'existe pas. Il n'a pas d'emploi dans un projet de construction,
et il aurait ajouté une seconde lecture à un signe qui en a déjà une.

### Les trois choses qu'un calcul ne fait jamais

**1. Il ne devine pas une valeur qui manque.** Un nom sans valeur rend
`indécidable`, jamais zéro. `Number("")` vaut zéro, et une altitude à zéro se
calcule sans broncher jusqu'à une cote de fondation fausse.

C'est plus subtil qu'il n'y paraît : « 3e famille B » commence par un chiffre, et
la lecture des nombres gratte les chiffres de ce qu'on lui donne — elle en
tirerait **3**, et « Famille × 2 » vaudrait six. Une famille de bâtiment n'est
pas le nombre trois. C'est `estMesuree` qui tranche, le même jugement que la
mémoire porte déjà sur ses propres valeurs.

**2. Il ne compose pas une unité qu'il ne sait pas composer.**

| ce qu'on écrit | ce qu'on obtient |
| --- | --- |
| `3 m + 2 m` | `5 m` |
| `3 m + 2` | refus — *ces deux unités ne se composent pas* |
| `3 m * 2` | `6 m` |
| `3 m * 2 m` | `6 m²` |
| `6 m² / 2 m` | `3 m` |
| `2 m * 3 €` | refus — personne n'a demandé des mètres-euros |
| `3 m ^ 2` | `9 m²` |
| `8 m³ ^ (1/3)` | `2 m` |
| `4 m ^ 0,5` | refus — la racine d'un mètre n'a pas de nom |
| `120 km/h + 10 km/h` | `130 km/h` |
| `120 km/h * 2 km/h` | refus — une unité composée est opaque |

`m`, `m²`, `m³` sont la même unité à trois exposants ; les composer est donc de
l'addition d'exposants. Tout le reste — `km/h`, `MPa` — est **opaque** : on sait
l'ajouter à elle-même et la multiplier par un nombre nu, et l'on refuse le reste
plutôt que d'inventer une algèbre que personne n'a demandée.

**3. Il ne rend jamais l'infini ni `NaN`.** Une division par zéro est un refus
nommé, pas une valeur qui traverse trois écrans avant de se voir. Douze chiffres
significatifs à l'écriture : `0,1 + 0,2` s'écrit `0,3`, et non
`0,30000000000000004` — le bruit du binaire ferait douter d'un calcul juste.

### Les douze refus

Chacun a son nom et sa phrase : `vide`, `caractère inconnu`, `parenthèse`,
`membre manquant`, `reste`, `virgule d'argument`, `fonction inconnue`,
`arguments`, `unités`, `division par zéro`, `puissance et unité`,
`hors domaine`. Un calcul qui ne veut rien dire est **refusé**, jamais arrondi
vers quelque chose qui y ressemble.
