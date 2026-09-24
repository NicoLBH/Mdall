# Écrire en Mdall

Plan de fabrication d'un **écrivain unique de Mdall** : un seul endroit qui
transforme en langage du projet tout ce que le système produit — ce qu'un
compte rendu a donné, ce que le Copilote propose, ce qu'un utilisateur dicte en
français — et un bac d'essai pour **lancer** ce qui a été écrit.

---

## D'où vient ce besoin, et il y en a deux

**Le premier est un manque d'écriture.** Mdall sait relire un raisonnement, le
rejouer, le remonter jusqu'aux données de base. Il ne sait pas l'aider à naître :
poser une règle demande aujourd'hui de connaître `fonction`, `importe`, `soit`,
`enregistre` et l'indentation à trois espaces. C'est peu pour un développeur et
beaucoup pour un contrôleur technique à qui l'on promet que tout se tape au
clavier.

**Le second est un manque de lecture**, et c'est le plus urgent :

> « on va s'en servir pour améliorer la présentation de propositions, surtout
> l'onglet "changements" qui est beaucoup trop pauvre en écriture, il ne permet
> pas encore à l'utilisateur de comprendre comment la machine fonctionne »

L'onglet **Changements** montre aujourd'hui un tableau à deux colonnes :
« Altitude du site · 490 m → 890 m ». C'est un diff de valeurs. Il ne dit pas
d'où vient 890, quelle règle l'a conclu, ce qu'elle a lu pour le conclure, ni
sur quelle citation elle s'appuie. **On signe donc une décision sans voir le
raisonnement qui l'a produite** — ce qui est exactement ce que la règle 1
cherchait à empêcher.

Or ce raisonnement existe déjà, entièrement, dans ce que la proposition porte.
Il n'est simplement écrit nulle part dans une langue qui se lise.

---

## La découverte qui change l'ordre des lots

Il y a **deux façons d'écrire du Mdall**, et les confondre coûterait cher.

### Voie A — depuis une structure : c'est déterministe, et c'est déjà écrit

`memoire-en-texte.js` sait déjà transformer une affirmation en lignes de Mdall
colorées : `lignesDeLAssertion()` rend la valeur, sa provenance, sa citation,
son statut ; une règle avec ses conditions ; une fonction native avec son appel
et sa version. C'est ce qui dessine tout l'onglet Mémoire.

**Le Copilote, la lecture des comptes rendus et la lecture des mails ne rendent
pas de la prose : ils rendent des structures.** Un sujet, une valeur, une
citation, une provenance, une date. Les faire passer par un modèle pour obtenir
du Mdall serait payer une transcription d'une chose qu'on possède déjà — et
troquer un rendu certain contre un rendu plausible.

**Donc : l'onglet Changements n'a besoin d'aucun modèle.** Il lui faut le
même écrivain déterministe que la Mémoire, branché sur les lignes de la
proposition. C'est le lot 1, il est bon marché, et il répond au besoin le plus
pressant.

### Voie B — depuis du français : c'est là que le modèle sert

Quand l'entrée est de la prose libre — « la zone de vent vaut 1, 2, 3 ou 4 ; si
elle vaut 3, la vitesse de référence est 120 km/h » — il n'y a aucune structure
à convertir : il faut en **inventer** une. C'est le seul endroit où un modèle
apporte quelque chose, et c'est le bouton « Coder » du nouvel écran.

### Ce que les deux voies partagent, et c'est l'essentiel

**La vérification.** Quelle que soit la voie, ce qui a été écrit est **relu par
le lecteur du projet** avant d'être montré. `lireUnFichier()` rend ses refus
ligne à ligne ; rien ne s'affiche comme du Mdall valable sans avoir été relu.

C'est gratuit pour la voie A — elle le passera toujours, et une épreuve le
prouve, ce qui ferme la boucle `lire(écrire(G)) = G` sur un chemin de plus. Et
c'est indispensable pour la voie B : un modèle qui écrit du code écrit du code
**plausible**, et rien dans sa réponse ne distingue une fonction juste d'une
fonction dont le `importe` nomme un fichier qui n'existe pas.

---

## L'onglet Changements, ce qu'il montrera

Sous le tableau avant / après, qui reste — il répond très bien à « qu'est-ce qui
bouge » —, **le Mdall que la proposition écrira**, bloc par bloc, rendu comme
dans la Mémoire :

```
Altitude du site = 890 m {
   document: relevé topographique du 12 mars 2026, p. 4
      parce que: "cote NGF au droit du bâtiment A : 890,00 m"
   statut: retenu
}

fonction Profondeur hors gel(zones, Altitude du site) {
   // La cote hors gel, tirée de l'altitude et de la table départementale.
   importe (variable: Altitude du site, depuis: donnees-de-base.ddb, zones: zones);
   appelle (agent: deduction_profondeur_hors_gel_altitude_V1);
   enregistre (Profondeur hors gel: "1.09 m", dans: fondations.ctr, zones: zones);
}
```

Trois choses que le tableau ne disait pas y sont, et aucune n'est inventée :
**d'où vient la valeur** (le document, la page, la citation), **ce que la règle
a lu** pour conclure, et **où le résultat ira**.

C'est aussi, accessoirement, la meilleure façon d'apprendre le langage : on le
voit écrit sur son propre projet, avant de l'écrire soi-même.

---

## Le bac d'essai

Un écran de l'Atelier, rayon **Développements**, cible `dev-ecrire-en-mdall`.

```
┌─ Écrire en Mdall ────────────────────────────────────────────────────────┐
│  ┌─ Ce que vous voulez dire ────┐ │ ┌─ Ce que cela donne ──────────────┐ │
│  │                              │ │ │ [essai.ref] [variables] [.ddb]   │ │
│  │  La zone de vent vaut 1, 2,  │ │ │                       ▶ Lancer   │ │
│  │  3 ou 4. Si elle vaut 3, la  │◀▶│ ├──────────────────────────────────┤ │
│  │  vitesse de référence est    │ │ │  1  fonction Vitesse de réf…     │ │
│  │  120 km/h.                   │ │ │  2     // La vitesse de réf…     │ │
│  └──────────────────────────────┘ │ │  3     importe (variable: …      │ │
│  [ Coder ]                        │ └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Le volet droit est modifiable** — c'est `saisie-de-code.js`, celle qui sert
déjà à écrire un fichier à la main. On corrige la transcription sans repasser
par le modèle, et l'on peut se servir de l'écran **sans jamais cliquer
« Coder »** (fondamental 13).

### « Lancer » n'exécute pas du JavaScript

Le langage y ressemble et n'en est pas. `memoire-evaluateur.js` existe depuis
l'étape 3 du rejeu : il est pur, et il interprète une règle **déjà lue**.

```
texte  →  lireUnFichier()  →  blocs  →  evaluerLaRegle()  →  verdict + trace
```

Ni `eval`, ni `Function`, ni bac à sable à construire. Un fichier qui
contiendrait du code ne serait pas dangereux : il serait **refusé à la lecture**,
comme une ligne qu'on ne sait pas lire. C'est le seul modèle de sécurité
nécessaire, et il est déjà en place.

**Ce que cela interdit, et il faut le dire.** Pas de boucle, pas de variable
locale, pas d'arithmétique arbitraire. Mdall compare et conclut ; il ne calcule
pas. Ce qui calcule est une fonction native, elle s'appelle, et sa loi n'est pas
dans le fichier (fondamental 9). Un utilisateur qui écrit « multiplie la surface
par 0,7 » recevra un refus qui le dit, pas une arithmétique inventée.

### Les trois valeurs de vérité sont l'intérêt de l'écran

`vrai`, `faux`, et **`indécidable`**. Une condition dont l'entrée manque n'est
pas fausse. On écrit une règle, on ne remplit pas un champ, et l'écran répond
« je ne sais pas » au lieu de conclure `sinon`. Un utilisateur apprend le
langage par cette réponse-là, pas par une documentation.

---

## Le formulaire ne s'écrit pas, il se déduit

C'est un écart assumé par rapport à la demande initiale, et il est **retenu**.

Prise au mot, « écrire du code qui affiche des inputs, labels, listes
déroulantes » ajoute au langage un vocabulaire d'affichage à côté de celui du
raisonnement. « Zone de vent » serait alors déclaré une fois comme variable et
une fois comme étiquette, et le jour où la description change, l'une des deux ne
suivra pas (règle 10).

Une variable porte déjà son type, son unité, sa description et son usage. Il lui
manque une seule chose : **le domaine de ses valeurs**.

| la déclaration porte | le formulaire en fait |
| --- | --- |
| le **nom** | l'étiquette du champ |
| la **description** | l'aide au survol |
| `type: "mesure"` + `unité` | un champ de saisie, l'unité à droite |
| `type: "logique"` | deux boutons, oui / non |
| `valeurs possibles: [1, 2, 3, 4]` | **une liste déroulante** |

```
const Zone de vent = {
   type: "texte",
   description: "Zone de vent de la commune, au sens de l'annexe nationale de l'Eurocode 1.",
   utilisation: "Entrée de la vitesse de référence.",
   valeurs possibles: [1, 2, 3, 4]
};

fonction Vitesse de référence(zones, Zone de vent) {
   // La vitesse de référence tirée de la zone de vent.
   importe (variable: Zone de vent, depuis: donnees-de-base.ddb, zones: zones);
   si (Zone de vent = 3)
   alors (
      enregistre (Vitesse de référence: "120 km/h", dans: vent.ctr, zones: zones)
   );
}
```

L'écran montre une étiquette « Zone de vent », une liste `1 · 2 · 3 · 4`, et
lorsqu'on choisit 3, la fonction conclut « 120 km/h ». C'est exactement ce que
la demande décrivait, obtenu sans un mot d'affichage.

### `valeurs possibles` gagne sur deux autres tableaux

Ce champ n'est pas un artifice pour fabriquer une liste déroulante :

- **Il rend une valeur vérifiable.** Une zone de vent à `7` passe aujourd'hui
  sans un mot. Avec un domaine déclaré, elle se signale — même famille de
  garde-fou que « deux unités ne se comparent pas ».
- **Il ferme une liste que le modèle aurait ouverte.** C'est ce que la liste
  fermée des sujets a apporté à la lecture des comptes rendus : quatre sujets
  identiques sur trois passages, contre vingt-huit libellés libres.

### Pas de verbe `affiche`

Une fonction conclut déjà de deux façons : `enregistre (…)`, qui range dans un
fichier, et `sinon (…)`, qui conclut sans écrire. Un troisième verbe serait une
troisième façon de dire la même chose, et les trois divergeraient (règle 4).

**Le bac d'essai affiche toutes les conclusions, toujours** — c'est un bac
d'essai, rien n'y est écrit nulle part. Un `enregistre` y dit « ceci irait dans
`vent.ctr` » sans y aller. Le même fichier, versé au projet plus tard, écrira
pour de bon, sans avoir changé d'un caractère.

---

## Rien ne sort du bac d'essai sans une proposition signée

> « On ne doit RIEN verser DIRECTEMENT dans la mémoire, JAMAIS ! »

Le seul chemin vers le projet est celui de tout le monde : un bouton « Proposer
au projet » qui construit **une proposition** portant les fichiers du brouillon,
examinée et signée comme les autres. C'est le lot 7, et il vient tard exprès :
l'écran a une valeur entière sans lui.

Le brouillon lui-même devient **un fichier de `Documents/`**, par le chemin de
création à la main qui existe déjà — il se retrouve, se partage, se rouvre sur
une autre machine.

---

## Les lots

Un lot, une PR. L'ordre suit le service rendu, pas la difficulté.

### Lot 0 — Mutualiser le rendu du code

`renderJetons()` vit dans `project-memoire-fichiers.js` et n'en sort pas. Deux
écrans vont en avoir besoin — les Changements et le bac d'essai — et le recopier
ferait deux colorations qui divergeraient au premier mot-clé ajouté.

Extraction vers `views/ui/code-mdall.js`, sans le moindre changement de
comportement : une épreuve compare le balisage rendu avant et après, sur un
fichier de chaque extension.

> « il faut mutualiser ces classes, c'est pénible sinon de toujours tout
> recalibrer entre les différents écrans »

### Lot 1 — Les Changements montrent le Mdall que la proposition écrira

**Le lot qui répond au besoin le plus pressant, et il n'appelle aucun modèle.**

`mdall-de-la-proposition.js`, pur : des lignes de proposition entrent, des blocs
Mdall sortent, par `lignesDeLAssertion()`. Rendus sous le tableau avant / après,
repliés par défaut, dépliés d'un clic.

Trois épreuves qui comptent : le bloc rendu se **relit** sans refus
(`lire(écrire(G)) = G`) ; une citation absente laisse un trou nommé plutôt
qu'une ligne inventée ; un retrait s'écrit comme un retrait, jamais comme une
valeur vide.

### Lot 2 — Le bac d'essai, en deux volets

L'écran, la poignée, la saisie à gauche, les onglets à droite, le rendu coloré.
Ni modèle, ni exécution. **On peut déjà taper du Mdall à la main et le voir
prendre ses couleurs.**

### Lot 3 — La lecture vérifie, et dit ce qu'elle refuse

`verification-du-brouillon.js`, pur :

| ce qui est vérifié | avec quoi |
| --- | --- |
| chaque ligne se lit | `lireUnFichier().refus` |
| chaque variable comparée est déclarée | les `const` du brouillon |
| chaque `enregistre` nomme un fichier | le bloc lu |
| chaque valeur tient dans son domaine | `valeurs possibles` (lot 4) |
| l'extension correspond à la nature | `memoire-rangement.js` |

Ce qui ne passe pas **ne bloque pas l'écran** : il se montre, nommé, à côté de
sa ligne. Un brouillon à demi juste se corrige ; un brouillon refusé en bloc se
rejette, et l'on recommence à zéro.

À ce stade, l'écran est déjà **un correcteur de Mdall**, et il n'a besoin
d'aucun modèle.

### Lot 4 — `valeurs possibles` entre dans le langage

Strictement additif : l'écriture, la lecture, la coloration, la documentation
(`langage-mdall.md`, `extensions.md`). Une déclaration sans ce champ reste
valable et ne change pas de sens. Le garde-fou de domaine s'allume ici, et il
vaut pour **toute** la mémoire, pas seulement pour le bac d'essai.

### Lot 5 — Le formulaire déduit, et « Lancer »

`formulaire-du-brouillon.js` (pur) : des déclarations entrent, des champs
sortent. Puis le lancement, par `memoire-evaluateur.js` et `memoire-rejeu.js`.

Par fonction : son verdict, sa conclusion, et **sa trace** — ce qu'elle a lu, ce
que chaque clause valait. `indécidable` s'y dit comme tel, jamais comme un
`faux`.

### Lot 6 — « Coder » : la transcription, au serveur

> « ce script d'orchestration est-il bien côté serveur ? (non visible dans le
> navigateur), c'est très important de ne rien montrer. »

`supabase/functions/ecrire-en-mdall/`. La consigne — la grammaire de Mdall
enseignée au modèle, et c'est du savoir-faire — vit dans
`_shared/mdall-du-modele.js` et n'entre jamais dans le navigateur. Température à
0. Consommation déposée comme partout ailleurs.

**Le serveur relit ce que le modèle a écrit** avec `lireUnFichier`, avant de
répondre. Ce qui ne se lit pas part avec son refus attaché, jamais en silence.

### Lot 7 — Le brouillon se garde, et se propose

« Proposer au projet » ouvre une **proposition** portant ce que le brouillon
affirme : les données de base avec leur provenance et leur citation, les règles
avec leurs conditions et leur `sinon`. C'est l'inverse exact de
`memoire-en-texte.js`, et il se fait avec **le lecteur du projet** — écrire un
second analyseur donnerait deux grammaires du même langage.

Ce qui ne devient pas une affirmation se **nomme**, à côté du bouton et avant le
clic : un nom déclaré sans valeur, une ligne que la lecture refuse, une phrase
du français qu'on a oublié de coder et qui se lit comme un nom nu. Les laisser
disparaître ferait croire qu'on a proposé le brouillon entier.

**Ce qui sort d'ici est `supposé`**, règle comme valeur — sauf si le fichier
écrit son statut. Le donner pour acquis ferait entrer au projet, sous le même
mot que ce qui a été relu et signé, ce que quelqu'un vient de taper pour
essayer.

#### `Documents/` : ce qui a été fait à la place, et pourquoi

Le plan disait « par le chemin de création à la main qui existe déjà ». **Ce
chemin n'existe pas** : tout ce qui entre au corpus y entre par un fichier
déposé, inspecté et reconnu. Et il y a une raison de ne pas l'inventer pour
l'occasion — le corpus est fait de pièces qu'on **cite**, et citer un brouillon
comme preuve d'un raisonnement est exactement ce que `docs/fondamentaux.md`
interdit.

Le brouillon est donc gardé **dans le navigateur** : un rechargement ne perd
plus une demi-heure de travail. C'est un filet, pas une sauvegarde, et l'écran
ne fait pas semblant du contraire. Ce qui fait qu'un raisonnement se retrouve
ailleurs reste la proposition — elle porte un auteur, une date et une signature,
ce qu'un fichier dans un dossier n'a jamais eu.

**Tranché : le brouillon reste dans le navigateur.** Ce qui fait qu'un
raisonnement se retrouve ailleurs est la proposition, et elle seule.

#### Un redessin ciblé n'appelle jamais le redessin entier

Le panneau de proposition se redessinait seul à chaque frappe, et se rabattait
sur un redessin entier quand il n'existait pas encore. Or **redessiner
rebranche, et brancher déclenche un changement** : `brancherLaSaisieDeCode`
appelle `surChangement` une fois à la pose, pour que la gouttière parte avec le
bon nombre de lignes. L'écran s'appelait donc lui-même jusqu'à épuiser la pile.

Le cas fautif était le plus banal de tous — le brouillon vide, à l'ouverture —
et **aucune épreuve de rendu ne pouvait le voir** : le défaut n'est pas dans ce
qui se dessine, il est dans quand ça se rebranche.

La règle vaut pour tous les redessins ciblés de l'écran : ils posent,
remplacent, retirent, ou ne font rien. La décision est sortie dans
`poseDuPanneau`, qui est pure et s'éprouve ; et une épreuve relit le source pour
tenir la règle elle-même, ce qu'aucune épreuve de rendu ne sait faire.

### Lot 8 — Les trois producteurs passent par l'écrivain

Le Copilote, la lecture des comptes rendus, la lecture des mails. **Par la voie
A** — ils rendent des structures, pas de la prose. Ce lot ne consomme pas un
jeton de modèle : il fait converger trois façons d'écrire vers une seule.

C'est le lot le plus risqué du plan, parce qu'il touche trois chemins en
production. Il est donc découpé en **trois PR, une par producteur**, chacune
ajoutant un aperçu et ne retirant rien.

#### Ce que chacune des trois fait, et ne fait pas

Chaque producteur montre, **avant le clic**, le Mdall que sa proposition
écrira. Aucun d'eux ne change ce qu'il propose : le bouton, les affirmations, la
proposition ouverte sont exactement les mêmes. On ajoute ce qui se lit, on ne
touche pas à ce qui s'écrit — c'est ce qui rend ces trois PR relisables une par
une, et réversibles.

#### L'écrivain est celui des Changements, une porte plus tôt

`blocsAProposer()` ne répond pas à sa façon : elle met les affirmations dans la
forme que `blocsDeLaProposition()` attend, et **l'appelle**. Deux écrivains
diraient deux choses le jour où l'un gagne une ligne (règle 4) — et c'est
précisément ce que ce lot existe pour empêcher.

Elle passe par `itemsDeProposition()`, **l'appel même que le clic fera**. Écrire
l'aperçu depuis les affirmations brutes le ferait diverger de la proposition
réelle au premier champ que l'atelier filtre : on montrerait une chose et l'on
verserait l'autre, ce qui est pire que de ne rien montrer.

#### La boucle se ferme

`lire(écrire(G)) = G` : ce que la voie déterministe écrit est relu par
`lireUnFichier` — le lecteur du projet —, **sans un seul refus**, et ce qui en
ressort est ce qu'on avait mis. C'est l'épreuve que le plan annonçait comme
gratuite pour la voie A ; elle l'est, et elle est écrite.

| PR | ce qu'elle porte |
| --- | --- |
| 8a | `blocsAProposer` · `mdall-a-proposer.js` · le Copilote · les Changements repassent par le panneau partagé |
| 8b | la lecture des comptes rendus |
| 8c | la lecture des mails |

#### Ce que le lot 8b a trouvé : un compte rendu n'écrit rien dans la mémoire

**Toutes** les lignes qu'une lecture de compte rendu propose sont de
l'intendance — un document au corpus, des sujets à ouvrir ou à relancer, des
lots, des labels, des jalons, des fermetures. Aucune n'affirme quoi que ce soit
sur l'ouvrage, donc **aucune ne s'écrit en Mdall**. Ce n'est pas une pauvreté du
lot : un compte rendu fait du secrétariat.

Le plan supposait le contraire. Le taire serait pourtant le pire des deux
mondes : celui qui vient de voir le Copilote écrire du Mdall sous son bouton
croirait que le compte rendu en écrit aussi, et chercherait longtemps où. La
convergence pour ce producteur est donc **que l'écrivain le dise** — et il le
dit, en ne rendant aucun bloc et en nommant ce qui part malgré tout.

Au passage, le vrai défaut de cet écran : il annonçait « ce que ce compte rendu
apporterait » en recomptant lots, labels, jalons et fermetures **depuis les
points**, quand le clic les recomposait pour `itemsDuCompteRendu`. Deux comptes
pour la même question, et c'est celui qu'on ne regarde pas qui a raison
(règle 4). Les commentaires du site d'appel le disaient déjà, sans pouvoir
l'éviter. `matiereDuCompteRendu` est écrite une fois, et les deux l'appellent.

#### Le lot 8c : un fil de mails non plus

Même conclusion, et elle se prouve autrement : un fil de mails ne rend que des
`sujet` et des `relance`, et **les deux sorts sont de l'intendance**. Une
épreuve le tient sur l'un comme sur l'autre, donc quoi que la confrontation
décide au clic.

Ce qui ne se dit **pas** à l'écran, et c'est délibéré : le partage ouvrir /
relancer. Il demande de savoir ce que le projet suit déjà, ce qui se demande au
serveur au clic. Annoncer « 12 sujets à ouvrir » avant d'avoir confronté serait
une borne haute présentée comme un compte — on en ouvrirait trois, et neuf
relances passeraient pour des ouvertures perdues (règle 5).

#### Le bilan du lot 8, contre ce que le plan supposait

| producteur | ce qu'il écrit en Mdall |
| --- | --- |
| le Copilote | **des valeurs**, avec leur provenance et leur citation |
| la lecture des comptes rendus | rien — du suivi |
| la lecture des mails | rien — du suivi |

Le plan tenait les trois pour équivalents. Ils ne le sont pas, et la
convergence n'en est pas moins réelle : **le même écrivain répond aux trois**,
et pour deux d'entre eux sa réponse est « rien, et voici pourquoi ». Un écrivain
qui ne sait dire que ce qu'il écrit laisserait deux écrans sur trois muets.

---

## Ce qu'on réutilise, et ce qui reste à écrire

| on s'en sert tel quel | ce que c'est |
| --- | --- |
| `views/project-memoire-fichiers.js` › `lignesDeLAssertion` | écrire du Mdall depuis une structure |
| `services/memoire-en-texte.js` | comment chaque nature s'écrit |
| `services/memoire-en-lecture.js` | lire du Mdall, et refuser ce qui ne se lit pas |
| `services/memoire-evaluateur.js` | évaluer une règle, en ternaire, avec sa trace |
| `services/memoire-rejeu.js` | enchaîner les règles qui se lisent l'une l'autre |
| `services/memoire-rangement.js` | quelle extension pour quelle nature |
| `services/proposition-avant-apres.js` | le tableau qui reste au-dessus |
| `views/ui/saisie-de-code.js` | la zone de saisie avec sa gouttière |
| `views/ui/light-tabs.js` · `side-resizer.js` | les onglets, la poignée |
| `_shared/reglage-du-modele.js` · `consommation-ia.ts` | température 0, et ce que l'appel a coûté |

| à écrire | lot |
| --- | --- |
| `views/ui/code-mdall.js` | 0 |
| `services/mdall-de-la-proposition.js` | 1 |
| `views/studio/dev/ecrire-en-mdall.js` | 2 |
| `services/verification-du-brouillon.js` | 3 |
| `services/formulaire-du-brouillon.js` · `bac-dessai.js` | 5 |
| `_shared/mdall-du-modele.js` · `functions/ecrire-en-mdall/` | 6 |

**Aucune largeur nouvelle, aucune classe nouvelle sans nécessité.** Les deux
volets prennent les classes du rail ajustable ; les lignes de code prennent
`memoire-ligne` et `memoire-ligne__num`, comme partout.

---

## Ce qui reste à trancher

**Le bac d'essai lit-il la mémoire du projet ?** Aujourd'hui, non : un brouillon
se lance sur les seules valeurs qu'on lui donne, et c'est ce qui le rend
reproductible. Mais un utilisateur voudra vite « essayer cette règle sur mon
projet » — et cela existe déjà, c'est la variante. La frontière entre les deux
écrans mérite d'être posée avant de la franchir par accident.

**Jusqu'où le lot 1 déplie-t-il ?** Une proposition de quarante lignes ferait
quarante blocs Mdall. Repliés par défaut, ils tiennent ; mais il faudra
probablement choisir ce qui s'ouvre tout seul — les règles, peut-être, et pas
les valeurs simples, puisque c'est le raisonnement qu'on ne voit pas.


---

## Après le plan : l'écran, à l'usage

Les huit lots sont livrés. Ce qui suit vient de son usage réel, et ne figurait
dans aucun d'eux.

### « Coder » ne rendait rien, et le défaut n'était pas dans l'appel

L'Atelier **réécrit son routeur entier** à chaque redessin : le panneau de cet
écran est alors un élément neuf, et celui qu'un appel en cours tenait est
détaché. La transcription écrivait donc son résultat dans un élément que plus
personne ne regardait — `racine.isConnected` était faux, et l'on ne dessinait
rien du tout. On cliquait « Coder », et il ne se passait jamais rien : ni
fichier, ni message, ni refus.

Le même défaut avait déjà coûté deux appels payés à la lecture des comptes
rendus, et son commentaire le dit depuis dans `project-studio.js`. La règle :
**on ne garde pas l'élément à travers un `await`** — on le retrouve par son
identifiant, qui lui ne change pas.

Le bouton tourne désormais pour de bon : un vrai rouet plutôt que trois points,
parce qu'un bouton qui change de libellé sans rien montrer laisse croire qu'il
n'a pas pris le clic — et l'on clique une seconde fois.

### Les messages se rassemblent dans une console

Ils vivaient en **quatre endroits** : les remarques de la lecture sous les
volets, ce que le modèle n'a pas su écrire sous la zone de gauche, ce qu'une
fonction ne sait pas dans le bac, ce qui reste dehors sous « Proposer au
projet ». Quatre fois la même question — *qu'est-ce qui ne va pas ?* — et quatre
endroits où chercher. On lisait l'écran de haut en bas pour savoir si quelque
chose clochait, et l'on ratait celui des quatre qu'on n'avait pas déplié.

`console-du-brouillon.js` les rassemble, les range par gravité, et n'en invente
aucun. Une ligne par message : **d'où** elle vient, **où** c'est, **quoi** en un
mot, et ce qui se dit. Elle se lit en bas, comme celle d'un navigateur ; d'un
clic elle passe en **troisième volet**, à droite du code, pour lire les deux
côte à côte. Un seul rendu pour les deux places — et jamais aux deux à la fois.

Une ligne illisible n'y paraît qu'une fois : la lecture la dit déjà, au même
endroit et mieux, et la proposition qui l'écarte n'a pas à la redire. Sinon
l'éparpillement aurait seulement changé de place.

### Le titre prend le format de la maison

`lecture-cr__entete` et ses classes, comme la lecture des comptes rendus et
celle des mails. **« Proposer au projet » monte sur la ligne du titre**, à
droite : c'est le geste qui engage, et le chercher en bas de page après trois
volets ferait manquer la seule porte vers la mémoire. Il ne paraît que
lorsqu'il y a quelque chose à proposer — un bouton éteint en permanence dans
l'en-tête devient un décor qu'on cesse de voir.


### L'éditeur colore au fil de la frappe, et « Rendu » s'en va

« Code » et « Rendu » montraient **le même fichier deux fois** : l'un pour
écrire, l'autre pour relire en couleur. On basculait donc pour voir ce qu'on
venait de taper, et l'on tapait en noir et blanc.

La couleur se pose maintenant **sous** la zone de saisie : une couche peinte des
mêmes jetons que la Mémoire, et le texte de la zone rendu transparent, curseur
gardé. Le collage, la sélection, l'annulation et le clavier des correcteurs
restent ceux du navigateur — reconstruire la saisie les aurait tous perdus, et
c'est le geste pour lequel cette zone existe.

Les deux couches tombent au caractère près : même police, même interligne, même
retrait, même `white-space`, et le défilement se cale dans les deux sens. Un
décalage d'un pixel se voit tout de suite.

La couleur est **facultative** dans le composant partagé : les autres écrans qui
s'en servent ne changent pas.

### Le bac d'essai passe en plein écran

Lancer, c'est regarder un résultat — le formulaire, ce que chaque fonction
conclut, et la trace de ce qu'elle a lu. Posé en bas de l'écran, cela passait
sous les volets : on faisait défiler pour voir la réponse à la question qu'on
venait de poser, en perdant de vue le code qui l'a produite.

Il vit dans `#detailsModal`, la fenêtre de l'application, qui sait déjà être une
fenêtre. Elle se remplit à nouveau à chaque réponse **sans se refermer** :
rouvrir refermerait d'abord, et l'on perdrait le défilement au milieu d'une
trace de vingt lignes.

### La console se fixe en bas

Dans le flux, elle descendait sous les volets : on faisait défiler la page pour
lire un message qui commente le code qu'on venait de perdre de vue. Fixée en bas
de la fenêtre, elle reste sous les yeux, et c'est elle qui défile quand elle est
longue — pas la page. Le corps de l'écran se réserve sa hauteur, sans quoi la
dernière ligne du code passerait dessous.

### « Coder » restait éteint après « Tout effacer »

Les boutons de la zone de français n'étaient redessinés qu'à un **redessin
entier**. Après « Tout effacer », « Coder » gardait l'état qu'il avait alors —
éteint —, et il le gardait quoi qu'on écrive ensuite : le clic ne faisait rien,
sans un mot pour le dire.

La rangée de gestes est maintenant un bloc à elle, redessiné à la frappe sans
toucher à la zone où le doigt est posé.
