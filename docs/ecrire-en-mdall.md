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
┌──────────────────────────────────────────────────────────────────────────┐
│  Écrire en Mdall      [Proposer au projet] [▶ Lancer] [⋯]                │
│  Dites ce que vous voulez poser, en français. Le code s'écrit à droite.  │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌─ Ce que vous voulez dire ────┐ │ ┌─ essai.ref ──────────────────────┐ │
│  │                              │ │ │ [essai.ref] [variables] [.ddb]   │ │
│  │  La zone de vent vaut 1, 2,  │ │ ├──────────────────────────────────┤ │
│  │  3 ou 4. Si elle vaut 3, la  │◀▶│ │  1  fonction Vitesse de réf…     │ │
│  │  vitesse de référence est    │ │ │  2     // La vitesse de réf…     │ │
│  │  120 km/h.                   │ │ │  3     importe (variable: …      │ │
│  └──────────────────────────────┘ │ └──────────────────────────────────┘ │
│                       [ Coder ]   │                                      │
├──────────────────────────────────────────────────────────────────────────┤
│  ✓ 2 lignes — rien à corriger.                        [ À droite ]       │
└──────────────────────────────────────────────────────────────────────────┘
```

Les trois gestes se tiennent sur la **ligne du titre**, comme sur les autres
écrans de l'Atelier ; le menu `⋯` porte « Tout effacer ». La console est la
dernière rangée, et se range en troisième volet d'un clic.

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


### L'écran tient dans la fenêtre, et ce sont ses zones qui défilent

La page défilait, et tout partait de travers : on faisait défiler pour lire une
ligne de code, et l'en-tête, les onglets et la console s'en allaient avec.

Le cadre tient donc dans la fenêtre, et **trois zones défilent chacune chez
elle** : le français, le code, la console. Sa hauteur est mesurée au rendu
depuis sa position réelle — une hauteur calculée à l'avance se trompe dès que la
chrome du projet se replie — et elle se remesure quand la fenêtre change de
taille.

La console était `position:fixed`, ce qui la sortait du cadre : le corps devait
alors se réserver sa hauteur en rembourrage, et ce rembourrage restait là même
quand elle n'avait qu'une ligne — un grand vide sans bordure sous le code. Elle
est maintenant simplement **la dernière rangée**.

### On écrivait en noir sur noir

Le rendu posait bien la couche colorée, mais l'appelant **ne passait pas son
coloreur au branchement** : rien ne la repeignait à la frappe. Or le texte de la
zone est transparent — c'est ce qui permet de voir la couleur dessous — et l'on
tapait donc dans le vide, visiblement.

Une épreuve relit le source pour tenir le branchement : le défaut ne se voit pas
dans le rendu, puisque la couche y est bien posée. Il est dans ce qui la repeint
ensuite, et ne se voit qu'avec un navigateur — ou là.

### Trois détails de forme

- **Le bouton de place est toujours là.** Il ne paraissait qu'avec un message :
  on ne pouvait donc ranger la console à droite qu'au moment où elle avait
  quelque chose à dire, c'est-à-dire au pire moment. C'est un réglage de
  l'écran, pas une réaction à son contenu.
- **« Tout effacer » est monté dans le menu du titre.** Un geste qui détruit
  tout le brouillon ne se range pas à côté du geste qu'on répète : il se range
  où l'on va le chercher exprès.
- **La leçon sous les boutons s'en va.** Une phrase de trois lignes se lit une
  fois, puis jamais — et elle occupait la place que les boutons demandaient.

### La gouttière s'arrêtait au milieu du code

La couche colorée enveloppait chaque ligne dans un `<span>` rendu
`display:block`, et joignait les spans d'un `\n`. Dans un `<pre>`, cela fait
**deux** lignes : le bloc, puis le retour. Le code s'affichait donc à double
interligne, tandis que la gouttière — qui compte les lignes du **texte**, elle —
s'arrêtait à la moitié du fichier.

Mesuré dans un navigateur, sur cent vingt-deux lignes : la couche faisait
4 656 px pour un texte de 2 338 px, soit exactement le double. Il n'y a plus de
span par ligne ; c'est le `<pre>` qui fait les lignes, comme il les fait dans la
zone de saisie, et les deux couches tombent d'aplomb au pixel.

### La page défilait encore, et la zone de code plus du tout

L'Atelier dessine **tous** ses panneaux au montage, y compris ceux qu'on ne
regarde pas. Le nôtre était donc caché quand il s'est mesuré, et
`getBoundingClientRect().top` valait `0` : on en tirait la hauteur de la fenêtre
entière. Ouvert deux cents pixels plus bas, le cadre dépassait d'autant — la
page défilait de 192 px, et la zone de code, plus grande que la fenêtre, n'avait
plus de raison de défiler chez elle.

Deux corrections, et la seconde est celle qui manquait :

- `hauteurDuCadre` rend **`null`** quand la position ne veut rien dire. Ne pas
  savoir n'autorise pas à prétendre qu'on sait (règle 5) : le repli du CSS tient
  jusqu'à la première mesure honnête.
- **L'écran remesure à chaque venue**, même déjà monté. Il ne se *redessine* pas
  à la venue — son brouillon vit au niveau du module, et le refaire effacerait
  ce qu'on écrit —, si bien que rien ne remesurait jamais : le cadre gardait
  pour toujours la hauteur qu'il avait prise caché.

### La console atterrissait à gauche, sous la zone de français

Le troisième volet était en `display:contents`, pour tomber dans la troisième
colonne tout en restant **un seul élément** à poser et à retirer. Mais alors ses
enfants deviennent les cases de la grille : sa poignée est absolue et n'en prend
aucune, son **guide** — que le sélecteur `.brouillon__corps > .side-resizer__guide`
ne voyait pas, puisqu'il n'est plus un enfant direct — restait un bloc en flux
et prenait la troisième case. Le volet passait quatrième, c'est-à-dire à la
ligne : mesuré à `x=0, y=648` au lieu de `x=1060, y=271`.

Il est maintenant **une case à lui**, positionnée pour que sa poignée s'accroche
à son bord gauche — plus d'arithmétique à tenir quand la largeur change —, et le
sélecteur du guide couvre les deux poignées au lieu d'une (règle 10).

### On ne pouvait ranger la console à droite qu'au moment où elle parlait

Le volet ne paraissait qu'avec un message, et le cadre ne déclarait sa troisième
colonne que dans ce cas. Or on range son écran d'abord et l'on écrit ensuite :
à l'ouverture, où le brouillon est vide, le bouton de place ne faisait rien du
tout. C'est un réglage de l'écran, pas une réaction à son contenu : il ne dépend
plus que de `volet`, et un volet vide dit qu'il n'a rien à signaler — ce que la
console du bas disait déjà pour la même raison.

### « Lancer » était inopérant

Il ne s'armait que si le brouillon portait une **fonction** — une règle avec des
conditions, ou un agent. Un brouillon qui ne pose que des affirmations, ce qui
est le cas du premier qu'on écrit, laissait donc un bouton éteint qu'on croyait
cassé.

Il s'arme maintenant dès qu'il y a du Mdall à lire, et **c'est le bac qui dit ce
qu'il trouve** : « Aucune fonction à lancer : le brouillon ne raisonne pas
encore » est une réponse, pas un silence (règle 5). La phrase existait déjà dans
`phraseDuLancement` ; le rendu la taisait quand la liste était vide.

Il a aussi changé de place : il vivait dans la barre d'onglets du volet de
droite, c'est-à-dire au milieu de l'écran, dans une barre qui sert à choisir un
fichier et non à agir. Il est sur la ligne du titre, et le **kebab** est à sa
droite — `renderGhActionButton` en `menuOnly`, celui de l'en-tête de Documents et
du titre d'une situation. Un second menu écrit ici aurait son idée de
l'ouverture, du survol et de la fermeture au clavier.

### Ce que la mise en page se laisse mesurer

Les trois défauts ci-dessus sont invisibles à une épreuve de rendu : ils sont
dans ce que le moteur de style fait du balisage. Ils ont été mesurés dans un
Chromium — page montée à deux cents pixels du haut, fenêtre de 1440×900, un
fichier de cent vingt-deux lignes — avant et après, dans les deux positions de
la console : débord de la page, hauteur de la couche colorée contre celle du
texte, et la case de la grille où le troisième volet atterrit.

### Ce qui passait pour un défaut de clavier

Rapporté ainsi : « on ne peut pas se déplacer avec les flèches du clavier,
parfois des doubles guillemets s'affichent et il n'est pas possible d'écrire
entre les guillemets… idem pour les retours à la ligne, pas toujours
possibles ».

Le clavier marchait. La **couche colorée** ne peignait pas ce qui était écrit.

Elle était peinte par `jetonsDeLaLigne`, qui lit une ligne, la comprend et la
**recompose** dans sa forme canonique. C'est exactement ce qu'il faut pour
relire la mémoire : la ligne qu'on montre est celle que le projet tient pour
vraie, quelle que soit la façon dont elle a été tapée. Sous une zone de saisie,
c'est un défaut, et il est grave — la couche se pose **sous** un texte rendu
transparent, et le curseur va où le texte est pendant que l'œil vise où la
peinture est.

| ce qu'on tape | ce qui se peignait |
| --- | --- |
| `si (A = "3")` | `si (A = 3)` — les guillemets disparaissent |
| `si (A = "3` (on tape) | `si (A = ""3"` — **des guillemets apparaissent** |
| `fonction P` (on tape) | `fonction P()` — **des parenthèses apparaissent** |
| `alors ("120 km/h");` | `alors (120 km/h);` |
| `importe (variable: X);` | `importe (variable: X, depuis: inconnu, zones: zones);` |
| `soit TVA = Prix HT * 0,2` | `soit TVA = "Prix HT * 0,2";` |
| `si (x = 1)` + espaces | l'espace final est mangé |
| `}` | coloré en nom de sujet |

Mesuré au clavier dans un Chromium, sur une fonction de cinq lignes : **62
frappes sur 110 peignaient autre chose que ce qui venait d'être tapé**. Après :
zéro.

#### Un second peintre, et une seule loi

`services/mdall-en-ecriture.js` — `jetonsEcrits(ligne)`. Sa loi tient en une
phrase : **ce qui est peint est exactement ce qui est écrit**. La concaténation
des jetons rend la ligne, caractère pour caractère, y compris à moitié tapée, y
compris fausse, y compris vide. Rien n'est ajouté, rien n'est retiré, rien n'est
normalisé — un caractère qu'il ne sait pas nommer est peint neutre plutôt
qu'abandonné, parce qu'un trou dans la couche est exactement le défaut qu'on
répare.

Il ne comprend rien, et c'est voulu : dire si la ligne est juste est le travail
de la console, qui lit le fichier pour de bon. Un colorateur qui refuserait de
peindre ce qu'il ne comprend pas laisserait sans couleur la moitié de ligne en
train de naître, c'est-à-dire au moment où l'on en a le plus besoin.

Les couleurs, elles, restent celles de la Mémoire : mêmes types de jetons, et un
vocabulaire pris aux listes partagées — `MOTS`, `VERBES`, `PROVENANCES`,
`AGENTS` — plutôt qu'à une copie qui divergerait au premier mot ajouté au
langage (règles 4 et 10).

Deux nuances de contexte, que la recomposition n'avait pas à trancher :

- **Les mots qui ouvrent une ligne ne comptent qu'en tête.** « le », « note »,
  « zone », « si » sont des mots français ordinaires ; les colorer partout ferait
  clignoter « Hauteur de la note de calcul ». Ceux qui **relient** — « et »,
  « ou », « non » — valent partout, parce qu'ils font le sens au milieu d'une
  condition comme d'une liste de valeurs possibles.
- **Une unité se reconnaît à sa place** : elle suit un nombre. « 890 m » en a
  une, « 3 ou 4 » n'en a pas.

#### L'épreuve, c'est la frappe

Une épreuve rejoue la saisie d'un fichier d'essai **du premier au dernier
caractère** et exige l'égalité à chaque frappe — six cent quatre fois. Une autre
fait la même chose sur le rendu de l'écran, balises ôtées : le texte de la
couche doit être celui de la zone. C'est la loi, écrite au seul endroit où elle
se casse.

### La forme de l'écran : cinq retouches

- **La leçon sous le titre s'en va.** « Dites ce que vous voulez poser, en
  français… » se lisait une fois, puis jamais, et elle disait à un écran vide ce
  qui ne compte qu'une fois qu'on a écrit. Ce que la doctrine impose — rien
  n'entre sans signature — est dit par la **console**, au moment où il y a
  quelque chose à verser : « 1 ligne prête à proposer — rien n'entre sans
  signature ». C'est le seul moment où on l'entend.
- **La console emporte ses commandes.** Rangée à droite, il en restait en bas la
  tête seule, pour qu'on puisse la ramener : une bande de plus, qui répétait le
  compte que le volet affichait déjà. Le bouton qui la ramène est maintenant
  dans sa tête à elle, là où elle se trouve.
- **Une seule tête pour ses deux places.** `renderTeteDeLaConsole` : le nom, le
  compte, le bouton. Deux têtes écrites séparément auraient divergé à la
  première ligne ajoutée, et le bouton qui ramène la console aurait fini par ne
  plus ressembler à celui qui l'envoie (règle 10).
- **Elle porte son nom**, `console`, comme un volet porte celui de son fichier.
  Une bande de messages sans titre en bas d'un écran se lit comme un pied de
  page, et l'on n'y cherche rien.
- **Le retrait passe du panneau au titre.** Le panneau du routeur met tous les
  écrans de l'Atelier en retrait de 32 px ; ici, cela mettait aussi en retrait
  les trois volets et la console, qui sont des zones de travail. Un fichier de
  code perdait trente-deux pixels de ligne de chaque côté. Le panneau de cet
  écran n'a plus de retrait — comme la vitrine —, et c'est son titre qui le
  porte, à la même valeur que les autres.

Les deux places de la console naissent et meurent maintenant par la même pose —
`poserLePanneau`, adossée à `poseDuPanneau` —, l'une paraissant quand l'autre
s'en va. Mesuré dans un Chromium : le cadre va de 0 à 1440 comme son panneau, et
le titre garde ses 32 px.

### Le wiki du langage, dans le menu du titre

« Langage Mdall », au-dessus de « Tout effacer ». Il ouvre en pleine fenêtre ce
que le langage fait, à quoi il sert, comment il fonctionne, puis sa syntaxe et
deux exemples entiers.

**C'est la porte sans modèle.** On écrit du Mdall à la main sur cet écran ;
encore faut-il savoir comment il s'écrit, et le chercher dans le dépôt pendant
qu'on tape n'est pas une réponse. L'IA accélère ; elle n'est jamais le seul
chemin (fondamental 13) — et une documentation qu'on n'a pas sous la main fait
de l'IA le seul chemin.

#### Le contenu est une donnée, pas un texte à interpréter

`js/contenus/wiki-du-langage-mdall.js` : des sections, des paragraphes, des
tableaux, des exemples. Corriger une phrase ne touche pas l'écran qui la montre,
et ajouter une section ne demande pas de le relire.

Un Markdown chargé au vol remplissait la même condition et en ajoutait trois
qu'on n'a pas demandées : un aller-retour réseau avant de pouvoir lire la
documentation du produit, un rendu Markdown de plus à calibrer, et un écran vide
le jour où la requête échoue. La documentation d'un langage ne peut pas manquer.

#### Les exemples sont du Mdall que la lecture accepte

Une épreuve les relit **tous** avec `lireUnFichier` et refuse un wiki qui
enseignerait une syntaxe que le langage ne connaît pas. Elle a servi
immédiatement : la première version montrait `enregistre (sujet: …, vers: …);`
sur une ligne et `soit TVA = Prix HT * 20%;` dans une fonction — deux formes que
la lecture refuse, la seconde parce que `soit` est déjà pris : **il déclare une
provenance**, et le nom de la locale *est* le type. Une documentation fausse est
pire que pas de documentation : on recopie l'exemple, il est refusé, et l'on
cesse de croire l'écran.

Une seconde épreuve vérifie les **résultats** que le wiki annonce : il promet
1 440 € pour 1 200 € hors taxes, et c'est le moteur de calcul qui le confirme.
Une promesse écrite dans une prose que rien ne relit vieillit toute seule.

Les exemples se colorent avec `jetonsEcrits`, le peintre de la **saisie** — et
non celui de la mémoire, qui recompose. On recopie un exemple du wiki dans la
zone de code, et il garde exactement le même aspect sous les doigts.

#### Il dit aussi où le langage s'arrête

Une section entière, « Ce que le langage ne sait pas encore écrire », reprend
mot pour mot deux phrases qu'on aimerait poser — la TVA et le plancher bas en
zone inondable — et montre ce que le Mdall en fait aujourd'hui. Une
documentation qui ne montre que ce qui marche apprend à se méfier d'elle.

### L'arithmétique entre dans le langage : `calcule`

Le moteur de calcul existait, pur et éprouvé, mais ne se branchait sur rien.
Voici le verbe qui le porte.

```
fonction Prix TTC(zones, Prix HT) {
   importe (variable: Prix HT, depuis: prix.ddb, zones: zones);
   calcule TVA = Prix HT * 20%;
   calcule Prix TTC = Prix HT + TVA;
   si (Prix HT >= 0 €)
   alors (Prix TTC);
}
```

Pour 1 200 € hors taxes, le bac conclut **1 440 €** et montre ses deux étapes.
Et la seconde phrase d'essai — « si la situation du projet est en zone
inondable, le plancher bas doit être 1 m au-dessus du niveau du sol » — conclut
**109,2 m** pour un sol à 108,2 m : un nombre qu'on peut comparer à la cote du
plan, et non une phrase qu'il faudrait relire.

Voir `docs/langage-mdall.md` pour la grammaire, et le wiki de l'écran pour la
version qu'on lit en travaillant.

#### Ce que ce lot touche, et pourquoi si peu

- **la lecture** — un mot de tête de plus, une branche, `bloc.calculs`. Une
  expression qui ne se lit pas est **refusée à la lecture**, avec sa raison : la
  laisser passer jusqu'au lancement ferait une règle qui ne conclut rien sans
  qu'on sache pourquoi ;
- **l'évaluateur** — `poserLesLocales` calcule les locales dans l'ordre et rend
  un lecteur augmenté. `evaluerLaRegle` ne change pas de forme : il lit ce
  lecteur-là au lieu de l'autre, si bien que **tout ce qui évalue une règle** en
  profite, le rejeu compris ;
- **la couleur** — une seule ligne : le peintre de la saisie prend la ligne
  entière. Lui seul découpe une expression au caractère près, et il le fait déjà
  pour la zone de code ;
- **le formulaire** — il demande ce qu'un calcul lit, et jamais ce qu'il pose ;
- **la consigne du modèle** — elle interdisait l'arithmétique mot pour mot.

Rien dans la mémoire, rien dans les propositions, rien dans les migrations : une
valeur calculée sort par `alors`, comme toute conclusion.

#### Ce que le banc de mutations a trouvé

Quatre gardes muettes sur seize, et chacune était un vrai trou :

- une locale posée à **zéro** quand le calcul n'aboutit pas — aucune épreuve ne
  la voyait, parce qu'aucune ne faisait porter une condition sur une locale
  indécidable ;
- ce qu'un calcul lit **et qu'aucune condition ne nomme** ne remontait pas au
  formulaire ;
- une expression **citée** passait pour une expression ;
- un calcul refusé qui ne se dit pas.

Une cinquième correction est venue du même banc : le filtre qui empêche de
demander une locale existait à **deux** endroits, et l'un des deux ne faisait
tomber aucun cas. Il n'en reste qu'un (règles 10 et 12).

### L'auto-complétion

On écrit du Mdall à la main sur cet écran ; personne ne connaît la grammaire par
cœur, et la chercher dans le wiki à chaque ligne reviendrait à dire que seul le
modèle sait écrire.

Ce n'est pas un environnement de développement, et c'est délibéré. Quatre
situations, et rien de plus :

| là où l'on est | ce qui se propose |
| --- | --- |
| en tête de ligne, une lettre tapée | les mots du langage — `fonction`, `calcule`, `sauf si`… |
| dans une condition, un `calcule`, un `alors` | les noms **déclarés** et les locales calculées plus haut |
| derrière un comparateur | les **valeurs possibles** du nom comparé, et elles seules |
| derrière `depuis:`, `dans:`, `statut:` | les fichiers du brouillon, les statuts du langage |

Chaque proposition de plus est une chose à apprendre et à documenter, et un
écran qui propose tout ne propose rien.

#### Trois choses qu'elle ne fait jamais

**Elle ne propose pas ce qui n'existe pas.** Un nom qui n'est déclaré nulle part
et qu'aucun brouillon ne pose ne se propose pas : une complétion inventée se
tape plus vite qu'elle ne se vérifie, et l'on écrirait des renvois vers rien.

**Elle ne parle pas dans une chaîne ni dans un commentaire.** Ce qu'on écrit là
est du texte, et le langage n'a rien à y dire.

**Elle n'intercepte aucune touche quand elle est fermée.** ↑ ↓ pour choisir,
Entrée et Tab pour poser, Échap pour refermer — et uniquement si la liste est
ouverte. Ctrl+Espace la demande sans avoir rien tapé. La zone de code a déjà
passé pour cassée une fois parce qu'une couche d'affichage ne rendait pas ce
qu'on tapait ; on ne va pas recommencer en mangeant des flèches.

#### Ce qui décide, et ce qui montre

`services/mdall-completion.js` décide : une ligne, une colonne, ce que le projet
déclare, ce que la fonction pose — et une liste sort. Il est **pur**, donc il se
casse et se répare sans navigateur.

`views/ui/propositions-de-saisie.js` montre. Il place la liste **au caractère** :
la zone est à chasse fixe et son interligne est une longueur, pas un facteur, si
bien que la colonne du curseur fois la largeur d'un caractère donne la position
exacte — sans reconstruire un miroir du texte. La largeur se mesure une fois,
sur la zone elle-même : la déduire de la police écrite dans le CSS ferait deux
vérités pour une seule chose.

Le contexte est redemandé **à chaque frappe** : on vient peut-être d'écrire la
déclaration qu'on veut voir proposée.

#### Ce que le navigateur a trouvé

Un vrai défaut, que les épreuves de rendu ne pouvaient pas voir : la liste
**restait à l'écran** quand il n'y avait plus rien à proposer. `montrer` remettait
la liste des propositions à vide *avant* d'appeler `fermer`, et la garde « si
rien n'est ouvert, ne rien faire » croyait donc n'avoir rien à fermer. On tapait
`//` au milieu d'une ligne, et trois noms du projet restaient affichés sous un
commentaire.

### La tabulation, et les filets de retrait

#### Tab pose un cran, Maj+Tab en retire un

**Jamais une tabulation** : le langage s'indente de trois espaces, et une zone
qui en poserait une ferait un fichier que la lecture ne compte pas pareil.

Le cran se pose **en tête de ligne**, jamais au curseur : trois espaces là où
l'on est couperaient le mot qu'on écrit. Une sélection qui traverse plusieurs
lignes les décale toutes — c'est ce qu'on attend en déplaçant un bloc — et une
sélection qui s'arrête au tout début d'une ligne ne la prend pas. Maj+Tab sur
une ligne sans retrait ne mange pas le premier mot, et le curseur ne remonte
jamais avant le début de sa ligne.

**La liste des propositions a rendu Tab.** Elle le prenait pour choisir, et cela
créait un piège : la liste se rouvre après chaque retrait, si bien qu'un second
Tab posait une proposition au lieu du second cran qu'on venait chercher. Entrée
et le clic posent ; Tab indente, toujours. Le contrat entre les deux écouteurs
tient en un mot : la tabulation ne fait rien si quelqu'un l'a **déjà arrêtée**.

#### Les filets, mutualisés

Les deux fonctions vivaient dans l'espace de raisonnement — le détail d'une
proposition, « comment on en est arrivé là » — et n'en sortaient pas. On lit du
Mdall à **cinq** endroits :

| où | ce qu'il montre |
| --- | --- |
| la **Mémoire** | tous les fichiers, toutes les extensions |
| les **Changements** d'une proposition | ce que la machine écrira |
| le **wiki** du langage | ses exemples |
| la **zone d'écriture** | ce qu'on tape |
| l'**espace de raisonnement** | le raisonnement d'une valeur |

`services/mdall-retrait.js` porte maintenant les trois calculs, purs :
`profondeursDuRetrait` — un cran par ligne, les lignes vides héritant du niveau
qui les contient —, `niveauxDesPaires` — une ouverture et sa fermeture de la
même teinte, une fermeture orpheline d'aucune —, et `poserUnRetrait`, la
tabulation.

Une **seule** règle CSS les trace : `.code-retrait`, avec `--mdall-crans` pour
le nombre de crans et `--mdall-cran` pour leur largeur. Cinq dégradés recopiés
auraient divergé au premier réglage, et c'est celui qu'on ne regarde pas qui
aurait raison (règle 4).

Au passage, l'espace de raisonnement avait aussi **son propre `renderJetons`**,
recopié du mutualisé avec la teinte des paires en plus. Il n'en a plus : c'est
le rendu partagé qui sait apparier, et les classes `raison-paire` sont devenues
`mdall-paire`, comme tout ce qui colore ce langage.

#### La zone d'écriture a une couche de plus

Les filets ne peuvent pas vivre dans la couche colorée : c'est un `<pre>` où
chaque ligne occupe exactement une ligne, et y poser un bloc par ligne en ferait
deux — c'est le défaut du double interligne qu'on a réparé.

Une couche à part, donc, **sans aucun texte** : une division par ligne, haute
d'un interligne, portant le nombre de crans de sa ligne. Les lignes ne se
replient pas et l'interligne est une longueur, si bien qu'une pile de divisions
tombe exactement en face du texte — mesuré dans un Chromium : 19 px pour 19 px.

Et la loi de la zone tient toujours : **ce qui est peint est exactement ce qui
est écrit**. Une teinte se pose sur un jeton ; elle n'en crée pas.

#### L'épreuve qui tient la mutualisation

Elle ne vérifie pas qu'un écran porte les filets : elle vérifie que **les quatre
rendus annoncent exactement les mêmes crans** et apparient les bornes de la même
façon, contre une liste écrite en dur. Le jour où l'on ajoute un écran qui
montre du code, c'est là qu'on s'apercevra qu'il a été oublié.

### Le bac d'essai se rejoue à la frappe

#### Le défaut, et ce qu'il révélait

On ouvrait le bac, on tapait un prix — et le champ perdait le focus au premier
caractère, pendant que le verdict disparaissait. Il fallait refermer la fenêtre,
relancer, et lire alors un résultat calculé sur la réponse d'avant.

Les deux symptômes n'en faisaient qu'un. Chaque frappe éteignait `lance`, puis
remplaçait **tout le contenu de la fenêtre** par un bac fraîchement rendu : le
champ où le doigt était posé mourait avec le reste, et le verdict, rendu sous
condition de `lance`, n'était pas réécrit.

Le raisonnement d'origine tenait pourtant debout : *une réponse change ce que
les fonctions concluraient, donc un verdict laissé à l'écran décrirait l'essai
d'avant.* La conclusion était fausse d'une marche : il ne fallait pas **retirer**
le verdict, il fallait le **rejouer**.

#### Ce qu'on redessine désormais, et rien d'autre

Le formulaire porte déjà ce qu'on a tapé — c'est le navigateur qui le tient —,
et le réécrire ne lui apprendrait rien. Seul le bloc `.bac-resultats` dépend de
la réponse : il se pose, se remplace ou se retire comme n'importe quel panneau
ciblé, à l'intérieur du corps de la fenêtre.

Les deux boutons d'un champ logique se marquent **en place** : le voisin se
dépresse sans que le formulaire soit refait, parce que le refaire emporterait le
curseur du champ de texte d'à côté.

#### Trois gardes, et ce qu'elles interdisent

- **La marque du bouton se nomme une seule fois.** Elle se pose au rendu et au
  clic ; écrite deux fois, elle divergerait au premier réglage (règle 4). Une
  épreuve vérifie en plus que la feuille de style connaît bien ce nom-là.
- **Le bloc du verdict est le même des deux côtés.** Le bac entier et le
  redessin ciblé rendent exactement la même chose — sinon le redessin
  empilerait un second verdict au lieu de remplacer le premier.
- **La fenêtre est prêtée.** Le wiki du langage s'ouvre dans la même, à un clic
  du bac dans le même menu : on ne pose un verdict que si le bac y est.

#### Le drapeau qui retombait

`ouvrirLeBac` levait `lance` avant d'ouvrir. Or ouvrir referme ce qui l'était, et
la fermeture rend ce qu'elle retenait : `surFermeture` remettait `lance` à faux
juste après. La fenêtre montrait alors un verdict que l'état disait n'avoir
jamais lancé, et la première réponse tapée le retirait. On referme d'abord, on
lève ensuite.

#### L'épreuve relit le source, et c'est l'exception qui le justifie

Le défaut n'est pas dans ce qui se dessine : le formulaire était juste, le
verdict était juste. Il est dans **ce qu'on réécrit**. Aucune épreuve de rendu ne
peut voir cela, et il est parti en production. Une épreuve relit donc le corps de
`brancherLeBac` et refuse qu'il rende le bac entier, remplace le contenu de la
fenêtre, ou éteigne `lance` ; une autre relit `ouvrirLeBac` et vérifie l'ordre
des deux lignes.

Un banc de dix mutations a remis chacun de ces défauts un par un : les dix sont
vus. Un essai au clavier, dans Chromium, tape quatre caractères et vérifie à
chaque frappe que le focus et le curseur n'ont pas bougé, que le verdict se
refait, et qu'il n'y en a jamais deux.

### Le wiki dit comment l'éditeur aide

L'auto-complétion, Ctrl+Espace, les flèches, Tab et Maj+Tab, les couleurs et les
filets : rien de tout cela n'était écrit nulle part, et l'on ne devine pas une
liste qui ne se montre qu'après trois lettres. Le wiki du langage porte donc une
section de plus — **Écrire sans connaître la grammaire par cœur** —, avec le
tableau des six touches et ce que la liste propose selon l'endroit de la ligne.

Elle dit aussi ce que l'éditeur ne fait **pas** : il ne complète rien de
lui-même, et les touches de la liste ne sont prises que lorsqu'elle est ouverte.
C'est la porte sans modèle du fondamental 13 : on tape tout à la main, et la
liste ne fait que rappeler ce qu'on aurait pu chercher dans cette page.
