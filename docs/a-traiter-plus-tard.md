# À traiter plus tard

**À quoi sert cette page :** un chantier qu'on repousse et qu'on n'écrit pas
revient sous forme de surprise. Ce carnet garde ceux qu'on a **vus, compris et
décidé de ne pas faire maintenant** — avec la raison, ce qu'ils débloqueraient,
et ce qui se passe si on les laisse.

Il ne remplace pas le plan : [`rejouer-la-memoire.md`](rejouer-la-memoire.md)
portait une suite d'étapes qu'on a faite, jusqu'au bout. Elle est close. **Le
plan qui vient est donc écrit ici**, en tête, et les sections numérotées qui
suivent gardent leur rôle : le détail, et ce qu'on a mis de côté en chemin.

Une ligne quitte cette page quand elle est faite, ou quand on décide qu'elle ne
se fera pas — et alors on écrit pourquoi.

---

# Le plan qui vient

## L'ordre, et pourquoi celui-là

Trois principes ont décidé de cet ordre, et ils valent d'être dits parce qu'ils
trancheront les hésitations à venir.

**On rend l'application lisible avant de l'agrandir.** Le premier besoin n'est
pas une fonction de plus : c'est de voir le parcours entier — copilote, atelier,
proposition, mémoire — et de se l'approprier. Les déplacements coûtent peu et
changent tout ce qu'on comprend de l'outil. Ils passent donc en premier.

**On finit une démonstration avant d'en commencer une autre.** La cascade
`localisation → altitude → hors gel → fondations` **et** `localisation → zone
sismique → spectre` est le meilleur argument que le produit possède. Elle demande
trois choses — la localisation versée, les utilitaires climatiques aux
standards, l'écran qui dessine un arbre plutôt qu'une file — et rien d'autre. On
les fait à la suite, on la montre, et on s'en sert pour juger le reste.

**On change le geste avant de changer le modèle.** Verser des décisions une par
une, dans une proposition par décision, referait exactement le défaut qu'on veut
corriger. La proposition-branche vient donc **avant** le modèle des décisions,
pas après.

## Les dix étapes

| # | Étape | Ce qu'elle débloque | Section |
|---|---|---|---|
| 1 | Les explorations passent dans l'Atelier — *fait* | le parcours entier se lit d'un coup | [§ 14](#14-les-explorations-passent-dans-latelier) |
| 2 | Décisions et Raisonnements entrent dans la barre latérale — vides, et qui disent pourquoi — *fait* | l'intention devient visible, la lacune aussi | [§ 15](#15-ce-quest-une-décision) |
| 3 | Neige, vent et gel aux standards, puis le spectre — *fait* | la chaîne climatique devient rejouable | [§ 20](#20-neige-vent-et-gel-aux-standards-puis-le-spectre) |
| 4 | La localisation et les zones se changent par proposition — *fait* | la tête de la cascade existe, et se trace | [§ 19](#19-la-localisation-et-les-zones-se-changent-par-proposition) |
| 5 | La cascade parallèle — *faite pour la branche climatique* | l'arbre fourche : une valeur changée, plusieurs branches | [§ 21](#21-la-cascade-parallèle-la-démonstration) |
| 6 | La proposition devient une branche — *faite* | on peut enfin proposer plusieurs choses à la fois | [§ 17](#17-la-proposition-devient-une-branche) |
| 7 | Un modèle rédige le titre et le corps d'une proposition — *fait* | l'historique redevient lisible six mois plus tard | [§ 18](#18-le-titre-et-le-corps-dune-proposition) |
| 8 | Le modèle des décisions — *fait* | ce que Mdall avait oublié de garder | [§ 15](#15-ce-quest-une-décision) |
| 9 | Le modèle des raisonnements — *le rejeu s'arrête sur un choix* | ce qu'une donnée nouvelle remet en cause, nommément | [§ 16](#16-ce-quest-un-raisonnement) |
| 10 | Le cerveau, requalifié et filtré — *fait* | la mémoire et les raisonnements, vus ensemble | [§ 22](#22-le-cerveau-requalifié) |

[§ 23](#23-incendie-habitation-finir) — *incendie habitation* — ne dépend de rien
et ne bloque rien : elle se glisse entre deux étapes, quand on veut souffler.

**Les dix sont passées.** Chacune porte son **État** et, sous lui, ce qu'elle a
posé et **ce qui reste** — nommé, jamais tu. Ce qui reste n'est pas un reliquat
qu'on aurait laissé filer : ce sont les endroits où finir demandait une décision
qu'on n'avait pas encore prise, et chacun dit laquelle. Les plus gros, pour
mémoire : le copilote ne repère pas encore les décisions dans les comptes rendus
([§ 15](#15-ce-quest-une-décision)) ; un raisonnement ne se verse pas
([§ 16](#16-ce-quest-un-raisonnement)) ; la branche sismique ne se rejoue pas
([§ 21](#21-la-cascade-parallèle-la-démonstration)) ; et « verser les contraintes
du site » écrit encore directement ([§ 24](#24-verser-les-contraintes-du-site)).

---

## 1. Les utilitaires nommeront leurs sources — *fait*

**État :** fait, pour les outils climatiques · **Reste :** les utilitaires qui
lisent une API ou un document, et les entrées que la mémoire ne porte pas.

### Le problème, tel qu'il était

Une règle Mdall dit ce qu'elle lit : ses conditions portent des sujets, et depuis
l'étape 1 chaque lecture est enregistrée avec l'affirmation qu'elle désignait. Un
**utilitaire**, non.

`deduction_profondeur_hors_gel_altitude_V1` lit un *fait de contexte* —
`fact_value.inputs.altitude` — produit par `resolve-climate-tool` au serveur. La
contrainte qui en sortait gardait l'altitude **comme un nombre**, et rien dans ce
nombre ne disait qu'il venait de la donnée de base que le projet a versée.

Trois conséquences, et elles gangrenaient le reste : une donnée employée
uniquement par un utilitaire comptait « aucun emploi » ; l'étude d'impact disait
« rien ne repose sur l'altitude » à un projet dont la moitié des fondations en
dépendait ; et une altitude corrigée laissait la cote hors gel derrière elle, sans
un mot.

### Ce qui a été fait : l'utilitaire déclare ce qu'il lit

Une correction à ce qui était écrit ici. On proposait que le producteur écrive
`sources: { altitude: "<assertion_id>" }` à côté du nombre. **Ce n'était pas
faisable, et pour une raison de fond** : `resolve-climate-tool` ne voit jamais
d'affirmation. Il reçoit une adresse et une altitude depuis le navigateur, et la
donnée de base « Altitude du site » est versée *après lui*, depuis le même
résultat. Il n'a aucun identifiant à citer, et l'appelant n'en a pas non plus au
moment où il appelle.

Ce qui est faisable, et qui est fait : **l'utilitaire déclare ses entrées par
sujet**, dans son propre fichier et sous sa version.

```js
lit: [
  { sujet: "H0 retenu pour le département", lire: (fait) => fait?.fact_value?.h0_selected_m },
  { sujet: "Altitude du site", lire: (fait) => fait?.fact_value?.inputs?.altitude }
]
```

Ce n'est pas un rapprochement de noms fait après coup — c'est exactement ce que
fait une règle `.ref` quand elle écrit `sujet: "Profondeur hors gel"` dans une
condition. Elle ne cite pas d'identifiant non plus : elle **nomme un sujet**, et
le versement le résout une fois pour toutes, dans la zone, avec son rang. Les
lectures d'un utilitaire empruntent le même chemin et la même table.

À partir de là, tout est retombé dans le chemin commun sans que rien d'autre
change : l'index dans les deux sens, l'étude d'impact, le plan de recalcul et la
variante voient ce chemin. La colonne `utility` et l'`input_assertion_id` nullable
de `assertion_applications` avaient été posées pour ça.

Et une chose est apparue par-dessus le marché, qu'on n'avait pas prévue : l'audit
sait dire **« calculé sur une valeur qui a changé »**. La contrainte garde
l'altitude sur laquelle elle a été calculée ; le projet en affirme une autre ; on
ne recalcule pas — la table est au serveur — mais on dit que la valeur affichée ne
vaut plus. C'était le défaut le plus dangereux : une valeur d'apparence normale
dont l'entrée a bougé sous elle.

### Ce qui a été fait ensuite : les utilitaires se rejouent

Le carnet disait ici que rejouer un utilitaire était « un chantier serveur », et
que deux lois resteraient en dur dans le navigateur en attendant. **C'était une
mauvaise réponse**, et elle vidait la variante de son intérêt : sur un projet dont
le raisonnement passe surtout par des utilitaires, essayer une altitude ne rendait
que des noms « à revérifier », et il fallait recalculer à la main ce que l'outil
existe pour calculer.

Il manquait une chose, et une seule : le droit de **calculer sans écrire**. Sans
lui, il n'y avait que deux issues, toutes deux mauvaises — appeler l'outil et
écrire le fait de contexte, et une valeur essayée entrerait dans le projet sans
que personne l'ait décidée ; ou recopier la loi dans le navigateur, jusqu'à ce que
les deux copies divergent.

`resolve-climate-tool` accepte donc `dry_run`. Même table, même version, même loi ;
rien n'entre nulle part. Il rend en plus le **fait de contexte** qu'il aurait écrit,
si bien que l'utilitaire le relit avec sa propre fonction `deduire` — la même qu'au
versement. Une variante et un versement ne peuvent donc pas dire deux choses
différentes de la même situation.

Chaque utilitaire déclare comment se rejouer : `rejeu: { outil: "frost" }`, et sur
chaque entrée le champ de l'appel par lequel elle passe. Une entrée sans champ se
lit sans se faire varier — H0 en est une : le serveur le choisit dans sa table
départementale, et le lui imposer lui ferait dire autre chose que le DTU. La
variante le **dit** au lieu de rendre un chiffre.

`variante-utilitaires.js`, avec sa table `RELECTURES` et ses deux lois recopiées,
n'existe plus.

### Ce qui reste, et qui est vraiment serveur

**Les autres utilitaires.** Seuls les trois outils climatiques ont un mode « calcule
sans écrire ». Le zonage sismique et le retrait-gonflement lisent Géorisques, et
l'extraction d'avis lit des documents : ni l'un ni l'autre ne se rejoue avec une
valeur du projet. Ils se disent « à revérifier », avec leur nom.

**Nommer les entrées que la mémoire ne porte pas.** Le département, le canton, les
coordonnées : un utilitaire les lit et le projet ne les verse pas comme sujets. On
ne les déclare donc pas — déclarer un sujet que rien ne verse ferait un lien vers
rien. Le jour où le projet posera son adresse comme une donnée de base, ces
lectures-là se déclareront comme les autres, et se feront varier comme les autres.

**Un projet sans appel conservé.** Le rejeu repart du dernier appel de l'outil,
gardé dans `project_tool_results`. Un projet qui n'en a pas — parce que ses
contraintes ont été versées autrement — n'a rien à redemander, et le dit.

### Ce qu'il ne faut pas faire en attendant

**Rapprocher `inputs.altitude` d'une donnée de base par le nom.** « altitude »
n'est pas « Altitude du site ». Ce qui a été fait est l'inverse : l'utilitaire
**dit** le sujet, et c'est un sujet du projet, pas un nom de champ.

**Recopier une loi de calcul dans le navigateur.** C'est ce qu'on vient de
supprimer. Un utilitaire qu'on ne sait pas rejouer se **nomme** ; il ne se
réimplémente pas, fût-ce « juste pour ce cas-là ».

**Laisser passer une valeur qu'un champ ne sait pas lire.** L'appel attend un
nombre ; « à confirmer » n'en est pas un, et le passer quand même le ferait
retomber sur zéro — une cote de fondation calculée au niveau de la mer, énoncée
comme une règle. Le refus est nommé.

---

## 2. Supprimer `.project-view-header__bar`

**État :** ouvert · **Nature :** ménage.

Reste d'une barre de titre remplacée. Rien ne l'affiche plus, mais des règles la
visent encore. À enlever avec ses styles, dans une passe où l'on peut vérifier
qu'aucun écran ne la porte.

---

## 3. La cloison du fondations : le diff d'une proposition

**État :** en attente d'une décision du produit.

L'utilitaire fondations ne remplit plus le diff d'une proposition. C'est
volontaire — décidé en cours de route —, et cette ligne existe pour qu'on ne le
redécouvre pas comme un bug.

---

## 4. Adopter une variante en proposition

**État :** ouvert · **Nature :** produit, puis client. **Débloque :** le dernier
barreau de l'échelle.

> **Repris par le plan.** Ce qui manque ici est désormais l'étape 6 :
> [§ 17 — la proposition devient une branche](#17-la-proposition-devient-une-branche).
> La sortie d'une variante n'est plus « créer une proposition » mais « ajouter
> cet essai à une proposition ouverte », ce qui est mieux et plus simple. La
> variante elle-même a changé de place : [§ 14](#14-les-explorations-passent-dans-latelier).

### Ce qui manque

Une variante se lit, se compte et se referme. Si elle est meilleure, il n'y a
rien à faire d'elle : on note les chiffres à la main et on recommence ailleurs.
C'est le seul endroit où l'outil montre une réponse et laisse l'utilisateur la
recopier — ce qu'il existe précisément pour éviter.

### L'échelle, et pourquoi le barreau compte

Une **variante** est une valeur qu'on *essaie* : elle n'engage rien. Une
**hypothèse** est une valeur qu'on *assume* en attendant mieux. Une **donnée de
base** est une valeur qu'on *sait*. Adopter une variante, c'est la faire monter
d'un barreau — et jamais deux d'un coup.

### Ce qu'il faut faire

Un geste depuis l'écran de variante : *transformer en proposition*. Il ouvre une
proposition **ouverte**, portant la valeur essayée comme hypothèse, et le
circuit habituel reprend — quelqu'un relit, arbitre ce qui contredit ce que le
projet a déjà décidé, et signe. C'est la signature qui fait entrer la valeur en
mémoire, jamais l'écran de variante.

Rien d'autre n'y entre : **ni les valeurs recalculées, ni les rejouées**. Elles
se recalculeront d'elles-mêmes une fois la nouvelle entrée en mémoire, et les
verser serait écrire un résultat à côté de son calcul — deux copies d'une même
valeur, qui finiront par diverger.

Ce qui suit la variante dans la proposition n'est donc pas une valeur : c'est le
**dossier**. Ce qu'on a essayé, ce que ça changeait, ce qui restait à
revérifier, et l'état de la mémoire au moment du calcul. Sans lui, celui qui
relit six mois plus tard voit une hypothèse sans savoir d'où elle vient.

### Pourquoi ce n'est pas encore fait

Parce que c'est une décision de produit avant d'être du code : qui a le droit
d'adopter, ce qui se passe quand la mémoire a bougé depuis le calcul, et si une
variante à plusieurs substitutions fait une proposition ou plusieurs. La
mécanique, elle, est prête — `variantePourLEcran` porte déjà le dossier complet.

### Ce qui se passe si on le laisse

L'outil reste **honnête et inutilisable au bout** : il montre juste, et il faut
recopier. C'est le pire endroit où s'arrêter, parce que c'est celui où
quelqu'un, un jour, recopiera de travers.

---

## 5. Le cerveau du projet — *fait*

**État :** fait · **Reste :** rien de nommé. Ce qui viendra viendra de l'usage.

### Ce qui manquait

On ne voyait pas l'ensemble du raisonnement. On le **lisait** — un tableau, une
étude d'impact, un audit — et chacun répond à une question, posée une à une.
Aucun ne montrait la forme. Un projet de quatre cents affirmations se lisait par
le trou d'une serrure.

### Deux vues

**Les strates** rangent les nœuds en colonnes, une par pas depuis le socle : la
vue qui répond à *dans quel ordre*. **Le volume** met le socle au centre et
éloigne chaque strate en coquilles concentriques, réparties à la spirale d'or :
la vue qui répond à *où est la matière*. Le nœud le plus employé du socle est
exactement au centre — le centre névralgique.

### Trois modes, dont le cumul

**Vivant**, par défaut : le projet bat tout seul, s'arrête dès qu'on le survole,
repart quand on s'éloigne, et un clic lance l'onde. C'est le cumul des deux
autres, et il règle ce que chacun avait de gênant — le battement seul finit par
gêner au moment précis où l'on veut lire quelque chose, l'onde seule laisse un
écran mort tant qu'on n'a rien demandé.

**Onde au clic** et **Battement** restent disponibles pour qui veut l'un sans
l'autre.

### Deux couleurs

**Nature** : socle, rejouable, opaque — ce que chaque valeur *est*.

**Chaleur** : un dégradé d'orange selon ce qui passe par là. Le **poids** d'un
nœud réunit ses emplois et son degré, parce qu'une donnée lue dix fois par une
règle et une donnée lue une fois par dix règles ne pèsent pas pareil. La taille
suit le même poids, en racine — les poids d'un projet ne se répartissent pas
également, et une échelle linéaire ferait trois grosses billes au milieu d'une
poussière.

**Le rouge est hors de l'échelle**, et c'est le point qui compte. Il ne dit pas
« très chaud », il dit « l'audit signale ». Si le rouge était le bout du dégradé,
un nœud très employé se lirait comme un nœud malade, et l'on apprendrait à
ignorer la couleur qui compte. Un lien dont une extrémité est malade passe au
rouge aussi : c'est par lui que le défaut se propage.

### Le regroupement par domaine

Chaque domaine reçoit un secteur — un quartier du volume, une bande en strates —
avec un tiers de chevauchement entre voisins. On reconnaît une zone sans pouvoir
tracer la frontière, ce qui est exactement l'état de la réalité : une hauteur de
plancher sert l'incendie **et** l'accessibilité.

L'ordre des secteurs vient du vocabulaire, pas du projet : deux projets placent
l'incendie au même endroit, faute de quoi « la zone dense, là, c'est l'incendie »
ne voudrait rien dire d'un projet à l'autre.

**Le nom se pose au bord du secteur, pas au barycentre.** En volume, les nœuds
d'un domaine s'étalent de part et d'autre du centre et leur moyenne y retombe :
les cinq libellés s'empilaient au milieu de l'écran. On prend donc la direction
moyenne — une moyenne d'angles, sur le cercle — et l'on pose le nom là où la zone
se voit. Un domaine de moins de trois nœuds ne se nomme pas : trois points isolés
portant une étiquette feraient croire à une zone qui n'existe pas.

Et le regroupement ne touche **jamais** à la strate : c'est elle qui porte le
raisonnement. Grouper d'abord et stratifier ensuite casserait la lecture des
chaînes, qui est la raison d'être de l'écran.

### La navigation

Molette pour zoomer — sous le curseur. Glissé pour déplacer en strates, pour
tourner en volume. Un seuil de quatre pixels distingue le glissé du clic.

### Ce qui est masqué, compté, et récupérable

Les nœuds qu'aucun lien ne touche : la majorité sur un vrai projet. Masqués par
défaut, comptés dans la barre, une case les remet. Leur absence de lien a deux
causes qui ne se confondent pas — rien ne repose sur eux, ou leurs lectures n'ont
pas été enregistrées — et l'écran ne fait pas croire qu'il sait laquelle.

### Les garde-fous, tenus

**L'onde est `impactDe`** et **les signaux sont `auditerLaMemoire`**, sans une
ligne de plus. Si ce dessin ment, l'étude d'impact et l'audit mentent aussi, et
les trois se corrigent ensemble.

**Les liens disent d'où ils viennent** : sans lectures enregistrées, un bandeau
dit qu'ils sont déduits d'une ressemblance de noms. **Les étiquettes ne s'écrivent
que tant qu'elles se lisent**, et le seuil compte les nœuds visibles à l'écran —
c'est ce qui fait que zoomer en fait réapparaître.

### Le voile des domaines

Chaque zone porte un **voile** : l'enveloppe convexe de ses nœuds, écartée d'une
marge, dont la frontière respire. L'enveloppe n'invente aucun point — elle entoure
ceux qui existent ; un cercle posé sur le barycentre envelopperait du vide et
ferait croire à une zone là où il n'y a personne.

La frontière bouge parce qu'elle **n'en est pas une** : les secteurs se
chevauchent d'un tiers, une valeur sert souvent deux disciplines, et un trait net
dirait le contraire — que le raisonnement se range en cases. Une bordure qui
respire dit ce qu'il faut : « c'est par là », pas « ça s'arrête ici ».

Au survol d'une zone — en pointant **le vide entre ses valeurs**, le geste qu'on
fait en disant « ce paquet, là » —, le voile s'éclaire, son nom aussi, et une
bulle dit ce qu'elle contient : combien d'affirmations, ce qui y pèse le plus, ce
que l'audit y signale.

### Ce qui reste

Rien de nommé pour cet écran-ci. La suite est ailleurs, au § 6 : les fonctions
n'y sont pas encore des objets.

---

## 6. Les fonctions deviennent des nœuds — *fait*

**État :** fait · **Nature :** un modèle avant d'être un écran. **Débloque :**
la moitié manquante de la métaphore.

> **Ce qui a été livré.** Une règle appliquée est un **nœud**, dessiné en losange
> violet entre ses entrées et sa sortie, sous la case « Montrer les règles ».
> `lecturesAvecLesFonctions` déplie chaque lecture enregistrée en deux —
> `entrée → règle` puis `règle → sortie` — et le dessin **comme l'onde** lisent
> ces mêmes lectures dépliées : sans cela l'onde sauterait par-dessus les nœuds
> qu'on vient de dessiner. `complexiteDeLaRegle` compte ce qu'il faut tenir en
> tête pour la relire (conditions, sujets lus, exceptions comptées double, deux
> issues, zones) et l'écran la rend en **crans autour du losange**, jamais en
> taille : la taille reste le poids, comme pour tout le monde.
>
> **Les secteurs, ensuite.** La question posée ici — « deux systèmes de secteurs
> qui se battraient » — a trouvé sa réponse, et ce n'était pas celle qu'on
> attendait. On ne classe pas les règles par nature de fonction (réflexe,
> capteur) : on **plie l'axe libre en deux**, la mémoire d'un côté, le
> raisonnement de l'autre. La hauteur en strates, la latitude en volume ; les
> domaines gardent leur axe — la bande, le méridien — et ne se battent avec rien.
>
> Le pliage garde l'ordre : un domaine posé au tiers de la hauteur se retrouve au
> tiers de **chaque** moitié. Les mêmes lobes, dans le même ordre, dans les deux
> hémisphères — « la structure, côté mémoire » et « la structure, côté
> raisonnement » —, et un voile par lobe et par côté plutôt qu'un seul qui
> enjamberait l'équateur. **Chaque secteur porte son nom** : « INCENDIE ·
> mémoire » et « INCENDIE · raisonnement », dans les deux vues. Un seul nom pour
> les deux tomberait entre eux, c'est-à-dire nulle part. La part de cadre qui revient à chaque moitié suit la
> population : la forme du projet se lit dans l'épaisseur des deux bandes.
>
> L'équateur est **pointillé**, jamais plein : tout le traverse, puisqu'une règle
> lit une valeur d'un côté et en produit une autre de l'autre. Ce n'est pas une
> frontière, c'est un repère de lecture.
>
> **Ce qui n'a pas été fait, et pourquoi.** Les coquilles ne s'appellent pas
> « réflexe » et « capteur ». Un rang ne porte presque jamais *que* des règles —
> deux chaînes de longueurs différentes y mettent couramment une valeur à côté
> d'un mécanisme — et le nommer ainsi nierait ce qui s'y trouve. Un rang qui ne
> porte que des règles s'appelle « règles » ; les autres gardent leur compte de
> pas. La profondeur annoncée en tête reste celle du **raisonnement**
> (`pasDeRaisonnement`), jamais celle du dessin : le même projet ne change pas de
> profondeur selon un bouton d'affichage.
>
> **La seconde mesure est là aussi.** `avalDeLaRegle` fait partir l'onde de la
> règle elle-même et compte ce qu'elle atteint : « Ce qui en dépend : 4
> affirmations, sur 2 strates, par 1 règle. » C'est la **même fonction** que la
> phrase de l'onde au clic — `valeursDeLOnde` —, et non un second comptage qui
> finirait par ne plus dire la même chose. Elle se calcule au survol : la faire
> pour chaque règle à l'ouverture paierait un parcours qu'on ne regardera pas.
>
> **Les électrons, par-dessus.** Un sujet peut valoir plusieurs choses *à la
> fois* : le rez-de-chaussée est un ERP, les étages du logement, et la clé d'une
> donnée de base porte le sujet **et** ses portées pour que l'une ne périme pas
> l'autre. Ces valeurs restent **plusieurs nœuds** — les fondre ferait converger
> vers un point des liens qui n'existent pas, et l'onde propagerait la valeur
> d'une zone dans le raisonnement d'une autre. Chaque nœud sait seulement qu'il
> est l'un de plusieurs, et fait graviter un électron par valeur, le sien le plus
> vif. Ce n'est pas un effet : c'est exactement là qu'un lecteur se trompe, en
> retenant « la » valeur d'un sujet qui en a quatre. La bulle les nomme avec leur
> portée ; la légende compte les sujets concernés, pas les nœuds.

### Ce que le cerveau montre aujourd'hui, exactement

**Un nœud est une affirmation** : une valeur que le projet tient pour vraie —
« Altitude du site : 13 m », « Degré coupe-feu : CF 1 h ». Rien d'autre.

**Un lien est une lecture** : « pour conclure ceci, on a lu cela ». Une ligne par
lecture enregistrée, d'où son épaisseur.

**Et les fonctions ?** Elles sont **les liens**, pas des nœuds. Une règle `.ref`
n'apparaît nulle part : elle a été dissoute dans les flèches qu'elle produit. Le
choix était délibéré — les dessiner ferait un nœud de plus par sujet — mais il a
un coût, et il faut le dire : **on ne peut ni voir une fonction, ni la peser, ni
savoir laquelle est compliquée.**

Le cerveau montre donc aujourd'hui la **mémoire et ses dépendances**. Pas les
raisonnements comme objets. C'est une moitié de la métaphore.

### Ce qui est déjà là, et qu'il suffit de nommer

La structure d'un cerveau — mémoire au centre, réflexes autour, sens au bord —
est **déjà dessinée**. Elle n'est simplement pas dite avec ces mots-là.

**La mémoire, c'est le socle.** La strate 0, au centre du volume : ce que le
projet pose, suppose ou constate. Plus un projet porte de données, plus son noyau
est peuplé et chaud. Le secteur mémoire existe donc — c'est le cœur, et il n'y a
rien à construire pour cela.

**Les capteurs, ce sont les utilitaires.** Les nœuds opaques lisent le monde
extérieur : une table climatique départementale, Géorisques, un PDF extrait. C'est
exactement un organe sensoriel — il rapporte une mesure dont on ne peut pas
refaire le chemin de l'intérieur. La correspondance est juste, et déjà à l'écran :
creux, gris, halo ambre quand l'onde les traverse.

**Le réflexe, c'est la première strate.** Les règles qui ne lisent que le socle ne
dépendent d'aucun autre raisonnement : donnée → conclusion, sans intermédiaire.
C'est bien un « reptilien », et c'est la coquille la plus proche du centre.

### Ce qui manque vraiment

Que les fonctions soient des **objets** : visibles, situables, pesables. Un nœud
d'une autre forme — un losange, disons — placé entre ses entrées et sa sortie,
au lieu d'une flèche qui les court-circuite.

Attention à un piège : on aurait alors **deux systèmes de secteurs** qui se
battraient — les domaines métier (incendie, structure) et les natures de fonction
(réflexe, capteur). Il faut les mettre sur des axes différents, et l'écran le fait
déjà : **les domaines sur l'axe angulaire, la nature du raisonnement sur l'axe
radial**. Il n'y a rien à réinventer, seulement à nommer les coquilles avec ces
mots-là plutôt qu'avec « 1 pas, 2 pas ».

### Le poids d'une fonction : deux mesures, jamais un score

**La complexité seule serait un mauvais poids**, parce qu'elle mesure l'effort
d'écriture, pas l'importance. Il en faut deux, et elles ne se mélangent pas :

**Ce qu'elle demande pour être comprise.** Le nombre de conditions, le nombre de
sujets distincts lus, les exceptions (`sauf`), la présence d'un `sinon`, le nombre
de zones où elle s'applique. Tout est dans `payload.regle` : mesurable exactement,
sans rien inventer.

**Ce qui dépend d'elle.** Combien d'affirmations en aval de sa conclusion, sur
combien de strates — c'est `impactDe` sur sa sortie, la fonction que l'écran
emploie déjà.

Une fonction compliquée dont rien ne dépend est un **coût** : elle se relit mal
pour rien. Une fonction simple dont tout dépend est un **risque** : la corriger
remue le projet entier. Ce sont deux problèmes différents, on n'y répond pas de la
même façon, et un score unique les confondrait — ce qui est précisément ce que ce
projet refuse ailleurs, en séparant la chaleur (ce qui passe par là) du rouge (ce
qui ne tient plus).

### Ce qui se passait si on le laissait

Le cerveau restait juste, et incomplet : il disait tout de ce que le projet
**sait** et rien de ce qu'il **fait**. Sur un projet dont le raisonnement est riche, on voit
un nuage de valeurs reliées sans voir les mécanismes qui les relient — et l'on ne
peut pas répondre à « quelle règle est trop compliquée ? », qui est une vraie
question de relecture.

---

## 7. Les chaînes coupées : un index qui perdait le milieu — *fait*

**État :** fait · **Nature :** un défaut d'index, découvert par un chiffre qui ne
collait pas. **Débloque :** tout ce qui remonte une chaîne.

### Le symptôme

Un projet dont une contrainte s'établit en **six étapes** — données de base,
« Habitation individuelle ou collective », « Nombre d'étages retenu », « Classement
du bâtiment », « Famille », « Degré coupe-feu des planchers » — s'annonçait dans le
cerveau à **deux pas**. L'écran « Comment on en est arrivé là » montrait bien les
six ; le cerveau en voyait deux. Deux écrans du même projet, deux réponses.

Reconstruire les liens du raisonnement n'y changeait rien, ce qui était le bon
indice : ce n'était pas un index en retard, c'était un index qui reconstruisait
la même chose fausse.

### La cause, et elle était double

**Un.** `applicationsDeLaMemoire` résolvait le sujet d'une règle — son entrée
comme sa sortie — **uniquement parmi les valeurs**. Or un projet ne verse pas
toujours une valeur pour chaque conclusion : « Famille : 2 » peut n'exister que
dans la règle qui l'établit, sa valeur portée dans son propre bloc. Le sujet est
pourtant déclaré, et `sujetsDeclares` le compte depuis toujours.

Conséquence, deux fois : la règle qui conclut « Famille » n'avait **pas de sortie**
et *aucune* de ses lectures n'était enregistrée ; et chacune des soixante-huit
règles qui lisent « Famille » perdait son entrée. Sur la mémoire d'essai : 13
sujets dans ce cas, 45 liens perdus sur 114.

**Deux.** « La plus longue chaîne » se mesurait en **sauts d'une valeur à
l'autre**, ce qui suppose qu'entre deux règles il y ait toujours une valeur
versée. Toute chaîne traversant une conclusion sans valeur était coupée là.

Les deux fautes se renforçaient : la première creusait le trou, la seconde le
comptait comme une fin de chaîne.

### Ce qui a été fait

`resoudre` remonte à la **règle** qui conclut un sujet quand aucune valeur ne le
porte — en dernier recours seulement, une valeur versée étant plus proche de ce
que le projet affirme aujourd'hui que le bloc qui l'a produite. Une règle devient
alors sa propre sortie, ce qu'elle est déjà en fait.

Et le compte change d'unité : **un pas est une règle appliquée**, pas un saut de
valeur en valeur. Il se mesure sur le graphe déplié, avec ou sans les règles à
l'écran — le chiffre ne dépend plus d'un bouton d'affichage. Sur la mémoire
d'essai, il passe de 2 à 5, ce que l'écran des étapes annonçait depuis le début.

**Il faut relancer « Verser › Reconstruire les liens du raisonnement » une fois** :
les lignes déjà écrites restent valides, il en manquait.

### La leçon, qui vaut au-delà de ce cas

**Un index à moitié rempli est plus dangereux qu'un index vide.** Vide, on s'en
méfie ; à moitié plein, on lit ses chiffres comme s'ils décrivaient le projet.
L'écran ne se taisait que dans un cas — zéro lecture dans tout le projet — et
affichait sans réserve dès qu'il en existait une seule.

Deux lacunes se comptent donc et se disent, en haut de l'écran : les règles dont
**aucune entrée** n'est enregistrée, et les conclusions qu'**aucune valeur** ne
porte. La seconde n'est pas une faute — la valeur est là, dans le bloc —, mais
elle n'est ni auditable, ni rattachable à un document, ni comparable d'une version
à l'autre. C'est un choix de modèle, et il doit se voir.

### La suite, tranchée : chaque conclusion verse sa valeur

La question posée ici — faut-il verser une valeur pour chaque conclusion de
règle ? — a été tranchée : **oui**. `conclusionsDesDeductions` verse, à côté de
chaque déduction du référentiel, la valeur qu'elle établit. « Famille : 2 » est
désormais une affirmation du projet, pas une ligne dans un bloc.

Ce qu'on y gagne, et qui n'était pas rattrapable autrement : l'audit la relit ;
un document peut s'y rattacher ; elle se remplace, datée, comme n'importe quelle
autre valeur ; et une correction se voit à l'étape où elle a lieu.

La règle et sa conclusion sortent du **même module, au même instant** :
`module.valeur` est lu une fois et écrit dans les deux lignes. Ce n'est pas une
copie qu'on entretient — c'est un instantané, comme la règle elle-même en est un
(`docs/fondamentaux.md`, règle 4).

Un sujet déjà posé plus haut ne se repose pas : « Classement du bâtiment » partait
déjà comme donnée de base, et la base refuse l'envoi entier sur un doublon de clé.

### Ce qui reste, et qui n'est pas un défaut de l'outil

Sur la mémoire d'essai, cent vingt-trois lectures restent sans entrée après
reconstruction. Elles ne sont pas un bug : ce sont des **règles qui lisent un
sujet que leur zone ne porte pas**. Une règle du magasin lit « Famille » ; aucune
famille n'est déclarée pour le magasin. Emprunter celle du bâtiment A serait le
mensonge que le code refuse — elle se lirait comme la valeur d'ici.

Elles se comptent en haut de l'écran. C'est au projet d'y répondre, pas à l'outil.

---

## 8. Le volume cachait ses strates — *fait*

**État :** fait · **Nature :** un encodage qui ne pouvait pas marcher.

### Le symptôme

Huit strates, trois cents nœuds, et pas une strate visible : la vue Volume
montrait une boule. Les libellés des coquilles étaient là, la structure non.

### Pourquoi aucun espacement ne pouvait le corriger

Parce que le rayon **est** l'axe qu'on ne peut pas voir à travers. Des coquilles
concentriques se cachent les unes les autres par construction : la plus externe
masque tout ce qu'elle contient, et cela ne dépend ni de leur écartement, ni
d'une échelle logarithmique. Espacer les coquilles ne fait qu'écarter des voiles
qui continuent de se recouvrir.

L'échelle logarithmique avait d'ailleurs un défaut de plus : elle **déforme**. Un
pas vaut un pas, et rien ne justifie que la sixième étape paraisse plus loin de
la cinquième que la seconde ne l'est de la première.

### Ce qui a été fait : sortir la strate du rayon

Une troisième vue, **Éclatée**. Chaque strate devient un disque, les disques
s'empilent le long d'un axe qu'on voit, et la caméra les regarde presque de côté
— une élévation basse rend les ellipses fines, et des ellipses fines s'empilent
sans se confondre. On compte les étages du raisonnement comme les étages d'un
immeuble.

Le disque rétrécit quand les étages se multiplient : c'est la seule contrainte
géométrique de cette vue. Deux disques larges à des hauteurs voisines se
recouvrent à l'écran, et l'on retrouve la boule qu'on venait de quitter.

Rien d'autre ne change : le plan du disque est un plan `x`/`z`, et
`pencherVersLesDomaines` y tourne les nœuds vers le cap de leur domaine sans
toucher à la hauteur — exactement comme en volume. Un domaine reste un secteur,
une strate reste une strate.

Deux choses n'ont pas leur place ici, et pour la même raison — la hauteur est
prise : les **hémisphères**, qui s'en servaient pour séparer mémoire et
raisonnement (les règles ont de toute façon leurs propres étages dans la pile), et
les **voiles de domaine**, dont l'enveloppe traverserait tous les étages en une
bande verticale qui recouvre sans rien situer. Le nom du secteur suffit.

### Ce qui reste

La vue Volume ne bouge pas. Elle répond à une autre question — *où est la
matière* — et elle y répond bien tant qu'on ne lui demande pas de compter les
strates.

---

## 9. Le cerveau : la place, la prise, et un zoom qui se retournait — *fait*

**État :** fait · **Nature :** de l'usage, plus un défaut de projection trouvé en
route.

### La place

Barre de réglages, bandeau d'alerte et légende occupaient un tiers de la hauteur
— et c'est la hauteur qui manque à un graphe. Ils passent dans un **rail debout à
gauche**, qui se rétracte. Restent en tête, quoi qu'il arrive : le nom de
l'écran, la loupe, le recadrage, la fermeture — les gestes qu'on fait sans
réfléchir, et qu'on ne doit pas avoir à déplier pour retrouver.

Les compteurs, eux, **passent** d'un endroit à l'autre : dans le rail quand il
est ouvert, en tête quand il est replié. Les afficher aux deux endroits ferait
deux vérités à tenir d'accord, et l'une des deux finirait par mentir.

### La prise

**Des barres de défilement.** En volume, le glissé tourne — c'est le geste qu'on
attend d'un objet. Il ne restait donc rien pour se déplacer : on approchait un
détail, il sortait du cadre, et l'on ne pouvait plus aller le chercher. Le zoom
devenait inutilisable au moment précis où il servait.

Elles ne sont pas celles du navigateur : une toile n'a pas de contenu à faire
défiler, elle se redessine. Elles lisent **l'étendue réellement dessinée**,
relevée sur les points projetés à chaque image, et écrivent le décalage de la
caméra — le même que la molette et le glissé écrivent. Le facteur se fige au
moment où l'on saisit le pouce : le relire en cours de glissé le ferait varier
avec le déplacement qu'il vient de causer, et le pouce s'emballerait.

**Le clic sur un secteur.** Le survol éclaircissait un voile — assez pour dire
« c'est par là », pas assez pour lire ce qu'il contient. Le clic le **retient** :
tout ce qui n'en est pas s'efface à seize pour cent, sauf les liens qui le
touchent, par lesquels on voit ce qui y entre et ce qui en sort. Un secteur sans
lien serait un îlot, et le cerveau n'en a pas.

Les noms de secteur sont cliquables autant que les voiles : c'est la seule prise
de la vue éclatée, qui n'a pas de voile.

### Le quart de tour

Un bouton **Couché / Debout**. Couché, la mémoire est au-dessus du raisonnement
et les strates se lisent de gauche à droite. Debout, la mémoire est **à gauche**
du raisonnement et les strates descendent — la coupe sagittale d'un cerveau
plutôt que sa coupe horizontale.

Le quart de tour se prend **dans la projection**, une fois, et non sur les
positions : tout ce que l'écran dessine passe par cette fonction — les nœuds,
mais aussi les colonnes, les disques, l'équateur et les noms de secteur. Tourner
les positions seules aurait laissé les repères dans l'ancien sens, et le dessin
aurait dit une chose pendant que ses repères en disaient une autre.

### Le défaut trouvé en route

En volume, `recul = 3,2 / zoom` : la caméra s'approchait pour zoomer. Au-delà
d'un zoom de deux, elle **entrait dans le volume** — les nœuds passés derrière
l'œil projetaient des coordonnées aberrantes, l'image se retournait, et le dessin
disparaissait de l'écran au moment précis où l'on cherchait à le voir de près.

La caméra recule maintenant jusqu'à une **distance plancher**, après quoi c'est
le grossissement qui prend le relais — exactement ce que le recul ne fait plus, de
sorte que l'échelle apparente au centre est inchangée à tous les zooms.

Ce défaut ne s'était jamais vu : il fallait zoomer fort en volume, ce que rien
n'invitait à faire tant qu'il n'y avait pas de quoi se déplacer ensuite.

---

## 10. La reprise d'étude — faite, et ce qu'elle ne fait pas encore

L'utilitaire de fondations est une **fonction native du langage**
(`docs/fondamentaux.md`, règle 9), et la chaîne
`altitude → profondeur hors gel → résultat du calcul` se **refait** maintenant
toute seule : `fondations-reprise.js` relit le tableau d'entrée que le projet
porte, y applique la nouvelle profondeur — on enterre le massif, on ne
l'épaissit pas —, redemande le calcul au serveur et rend le tableau d'après.

Ce qui l'a rendue possible n'est pas du code : c'est que **les entrées entrent
dans la mémoire**. Tant que les massifs vivaient dans l'étude privée de
l'Atelier, il n'y avait rien à renvoyer.

### Ce qui reste ouvert

- **L'écran de la variante ne montre pas le tableau d'après.** La reprise le
  rend — il voyage sur la ligne recalculée — mais la fenêtre de variante affiche
  une phrase : « 13 massifs, 20,66 m³ de béton, assise mini 1,50 m — 2 vérifiées ».
  C'est déjà ce qu'il faut pour décider ; ce n'est pas ce qu'il faut pour
  vérifier ligne à ligne.
- **Seule la profondeur hors gel commande une reprise.** C'est la seule entrée
  du projet qui décide d'une cote de fondation. Le jour où la portance du sol
  sera une donnée de base versée, elle devra en commander une aussi — et le
  branchement est déjà là : il suffit de la déclarer dans `lit` avec son `entree`.
- **Le tableau d'entrée devient visible de l'équipe.** L'étude des fondations
  était privée ; le verser la partage. C'est le prix de la reprise, et c'est le
  bon — une cote que personne ne peut relire n'est pas une cote du projet — mais
  il faut le dire à qui verse, et l'écran ne le dit pas encore.
- **Le résultat est un tableau sous un seul nom.** La mémoire le porte dans
  `payload.tableau` et l'affiche par sa phrase. Aucun écran ne sait encore
  déplier un tableau de mémoire ligne à ligne ; c'est le même manque que pour le
  point 1, et ils se traiteront ensemble.

---

## 11. La variante : deux façons de changer la même valeur — expliqué

**C'était bien deux lignes.** Le projet porte deux « Profondeur hors gel » :

```
memoire/sol.ctr          Profondeur hors gel = 0.47 m { texte: NF DTU 13.1 }
memoire/structure.ctr    Profondeur hors gel = [ Toutes zones: 0.466 m {…}, batiment-a: 0.466 m {…} ]
```

L'une est du socle — posée à la main, donc substituable —, l'autre est déduite
par l'utilitaire climat. Chacune a ses héritiers, et le calcul lit celle que la
résolution choisit. Changer l'une ne touche pas l'autre : d'où deux résultats
pour ce qui ressemble au même geste.

Ce n'est pas un défaut du moteur de variante : c'est le défaut que la **règle
10** décrit — un nom qui vit à deux endroits. Le premier temps de la réponse est
livré : un fichier qui déclare un nom déclaré ailleurs l'affiche en tête, en
rouge, avec l'autre fichier. Les temps 2 et 3 — le registre qui fait autorité,
et le versement qui ouvre un conflit plutôt qu'une seconde ligne — restent à
écrire.

**Corrigé au passage.** Un utilitaire écrivait ses mesures avec un point —
`2.59 m` — quand tout le reste de la mémoire écrit `2,59 m`. La même valeur
s'écrivait de deux façons selon qui l'avait posée, et deux écritures ne se
comparent pas.

---

## 12. Ce qui reste sur les agents et la recherche

- **`agent-IA` n'a pas d'appelant.** Le verbe existe, se lit, s'écrit et se
  colore ; aucun utilitaire ne l'emploie encore. Le jour où l'un le fera, ce qu'il
  a rendu devra se conserver ligne à ligne — un `agent-IA` ne se rejoue pas pour
  vérifier.
- **L'orchestration n'existe pas.** Deux agents dans une même fonction, en
  parallèle, avec une reprise si l'un échoue : le langage le rendra lisible, le
  moteur ne le fait pas.
- **Le marché de fonctions** suppose deux choses qui manquent : une signature
  qu'on puisse vérifier avant d'exécuter, et une façon de dire d'où une fonction
  vient. Le second point est déjà à moitié là — `utilitaire` et `version` sont
  écrits sur chaque appel.
- **La recherche ne cherche que ce que l'écran montre.** Un fichier replié, une
  ligne écartée : ni l'un ni l'autre n'est parcouru. C'est cohérent — on cherche
  ce qu'on lit — mais cela se dira mieux le jour où un compte le rappellera.


---

## 13. Retirer ce qu'une ancienne version d'utilitaire a versé

Une version de l'utilitaire fondations versait quatre-vingts cotes une par une —
`Section Lx de la semelle Portique courant file A`, et ainsi de suite. La suivante
range tout dans un seul tableau, `Résultat du calcul des fondations
superficielles`. Les quatre-vingts noms restent en mémoire : plus rien ne les
produit, plus rien ne les lit, et ils se lisent pourtant comme l'état du projet.

Les deux premiers cas de la **règle 11** se règlent tout seuls — une valeur
fausse se reverse, un nom mal rangé ouvre un conflit. Celui-ci, non : il ne s'agit
pas de corriger une valeur mais de **retirer un nom**, et rien ne permet de le
faire sans effacer, ce qu'on refuse.

Ce qu'il faudrait : qu'un versement déclare ce qu'il remplace **par son origine**
plutôt que ligne à ligne — « `dimensionnement_fondations_superficielles` V2
remplace tout ce que V1 a versé sur ces zones ». Chaque ligne porte déjà
l'utilitaire et la version qui l'ont produite ; l'information est là, il manque
le verbe et l'écran qui le montre.

Deux précautions le jour où on l'écrira :

- **cela reste de l'histoire.** Les lignes retirées ne s'effacent pas ; elles
  cessent d'être l'état, comme une affirmation remplacée ;
- **cela se voit.** Un versement qui retire quatre-vingts lignes est un acte
  considérable : il se lit dans le fil du projet, avec son auteur et sa date, et
  il se refuse.

**Livré depuis.** Le mécanisme existe : `memoire-perimetre.js`. Une version
d'utilitaire qui reprend le travail d'une précédente, et une zone retirée du
projet, sortent leurs lignes du présent — au pied du fichier, avec leur motif.

**Le retrait délibéré est abandonné.** Un verbe pour retirer une ligne « parce
qu'on le veut », sans qu'un utilitaire ni une zone ne l'y oblige, a été écarté :
il n'y a pas de geste sans motif dans ce projet, et un motif qui n'est ni une
version reprise ni une zone partie n'a pas été trouvé. Ce qui sort du présent en
sort parce que quelque chose de nommable l'en a sorti.

Ce qui reste :

- **le versement qui déclare ce qu'il remplace.** Aujourd'hui la reprise se
  **déduit** des numéros de version. C'est juste, et c'est fragile : un
  utilitaire qui changerait de lignée en changeant de nom ne reprendrait rien.
  Le dire explicitement vaudrait mieux que de le calculer.

---

## 14. Les explorations passent dans l'Atelier

**État :** fait. Les trois explorations vivent dans l'Atelier, sous « Explorations », entre le
Copilote et la Solidité. Le cerveau est resté dans la Mémoire, sous un bouton simple.

**Décision : on revient sur une décision.** La variante avait été mise dans
l'onglet Mémoire. C'était une erreur, et elle se nomme : **une variante est une
exploration, pas une mémoire**. On essaie, on ajuste, on recommence — puis on en
fait une proposition, et c'est la proposition qui devient de la mémoire. Rien de
ce qu'on essaie n'a sa place dans ce qui est tranché.

Le même raisonnement vaut pour **Auditer la mémoire** et pour l'**Étude
d'impact** : les deux explorent, aucune ne verse.

### Le critère, pour ne plus se tromper

> **La Mémoire ne contient que des écrans de lecture. Tout ce qui prépare une
> proposition vit dans l'Atelier.**

Il est net, il se vérifie sans discuter, et il donne la réponse d'avance pour les
écrans qu'on n'a pas encore écrits.

### Ce que ça donne

L'Atelier, de haut en bas — les trois explorations sont **au-dessus** des
utilitaires parce qu'elles les englobent : elles portent sur tout le projet,
alors qu'un utilitaire porte sur un sujet.

```
Copilote
Variante
Étude d'impact
Auditer la mémoire
──────────────
Solidité
  Neige, Vent & Gel
  Risques Naturels & Technologiques
  Fondations superficielles
  Spectre
Sécurité incendie
  …
```

La Mémoire garde : les fichiers, la recherche, le cerveau, et la barre latérale
des lectures.

### Ce qu'il faut surveiller

- La variante en cours vit en portée de module et **meurt au rechargement**
  (`services/variante-en-cours.js`). Le bandeau qui la signale continue de
  s'afficher **dans la Mémoire** quand on y retourne : c'est là qu'on lit sous
  variante, même si c'est dans l'Atelier qu'on la fabrique. « Lire la mémoire
  avec cette variante » pose donc la variante, puis change d'onglet.
- L'entrée « Tester » de la Mémoire a disparu : ses trois premiers items sont
  partis, et un menu déroulant à une seule entrée n'est plus un menu. Le cerveau
  est devenu un bouton simple, et il n'y a pas de doublon.

### Comment c'est fait

- `services/usages-du-rejeu.js` — la liste des quatre usages porte désormais
  `ou` : `OU.ATELIER` ou `OU.MEMOIRE`. Les deux écrans lisent la même liste
  plutôt que d'en tenir chacun la sienne (règle 4). Le module a quitté `views/ui`
  pour `services` : il ne dessinait plus rien.
- `views/studio/explorations/explorations.js` — l'hôte des trois écrans dans
  l'Atelier, avec **une seule** lecture de la mémoire pour les trois : trois
  lectures donneraient trois états, et on comparerait un impact mesuré sur l'un à
  une variante calculée sur l'autre.
- Les deux fenêtres — impact, audit — acceptent un `hote` et se dessinent alors
  sans voile, sans rôle de dialogue et sans croix de fermeture. Ce sont les mêmes
  fenêtres : les recopier en panneaux en aurait fait deux qui divergent.
- Les explorations ne se dessinent **qu'à la visite** : elles lisent la mémoire,
  et l'étude d'impact pose le curseur dans son champ de recherche — dessinées au
  montage, elles voleraient le clavier au Copilote.

### Ce qui reste ouvert

- L'écran de variante n'accueille toujours qu'**une** valeur essayée à la fois.
  Le déplacement ne change rien à cela, et l'essai de plusieurs valeurs reste
  à faire.

---

## 15. Ce qu'est une décision

**État :** fait. Le modèle, le `.dec`, et la fermeture d'un sujet qui demande ce
qu'on a tranché. Le repérage par le copilote reste — voir « Ce qui reste ».

*C'est l'essentiel qu'on avait oublié. La réflexion tient en trois questions :
qu'est-ce qu'une décision, où vit-elle, comment la rend-on explicite.*

### Ce qu'une décision n'est pas

**Ce n'est pas une proposition fusionnée.** Une proposition est l'**acte
d'enregistrement** ; la décision, elle, a eu lieu avant, dans une réunion, et
personne ne l'a écrite. Confondre les deux revient à ne connaître que les
décisions que Mdall a lui-même provoquées — une fraction minuscule de celles qui
font le projet.

**Ce n'est pas une valeur.** « Toiture en bac acier » est une valeur. Elle ne
devient une décision que si l'ardoise et la membrane étaient sur la table.

### Ce qu'une décision est : quatre parties, et l'une manque partout

1. **Une question.** Ce sur quoi on a tranché. Sans elle, il reste une valeur,
   et une valeur n'engage personne.
2. **Les possibles écartés.** C'est ce qui distingue une décision de tout le
   reste, et c'est exactement ce que personne ne retrouve six mois plus tard.
   *Le plus grand service que Mdall peut rendre est de garder ce qui a été
   écarté.* Quand quelqu'un demande « pourquoi pas de l'ardoise ? », la réponse
   existe quelque part dans la tête de trois personnes — ou nulle part.
3. **Un auteur et une date.** Déjà là, pour tout ce que Mdall garde.
4. **Un motif — ou l'aveu qu'il n'y en a pas.** Certaines décisions sont
   arbitraires : le choix d'une couleur, d'une trame, d'un nom. Écrire « choix du
   maître d'œuvre, sans justification technique » est plus honnête, et plus
   utile, qu'une justification fabriquée après coup (règle 5).

### Où elle vit : une ligne à part, et la valeur la cite

Deux façons de la modéliser, et il faut trancher.

- **(a) Une marque sur une affirmation** — « cette valeur a été choisie par un
  humain ». Simple, mais la question et les écartés n'y tiennent pas : ce ne sont
  pas des attributs d'une valeur, c'est le contenu même de la décision.
- **(b) Une nature à part entière**, qui **produit** des valeurs. La décision est
  sa propre ligne ; la valeur reste une donnée de base ou une hypothèse, et elle
  **cite** la décision qui l'a fixée.

**Recommandation : (b).** Et pour une raison qui n'est pas seulement esthétique :
c'est exactement ce que Mdall fait déjà pour les **règles**. Une règle est une
ligne, sa conclusion en est une autre, et la seconde cite la première. Une
décision est le pendant humain d'une règle — même forme, même lien, même écran
de raisonnement. On ne réinvente rien, on étend.

Conséquences à écrire : une septième extension — `.dec` — dans
[`extensions.md`](extensions.md), et une entrée « Décisions » dans la barre
latérale, dans l'ordre demandé :

```
Tout · Contraintes · Décisions · Raisonnements · Constats · Hypothèses · Données de base
```

### Premier temps — *fait* : l'entrée vide qui dit pourquoi

Avant tout modèle, les deux entrées sont entrées dans la barre latérale et
affichent la vérité du moment : *« Le projet n'a encore enregistré aucune
décision. Ce n'est pas qu'il n'en a pas pris — c'est que Mdall ne savait pas
encore les garder. »* Une lacune nommée vaut mieux qu'une absence silencieuse
(règle 5), et c'est ce qui rend l'étape suivante évidente à tout le monde.

Le rail lit désormais, de haut en bas :

```
Tout · Contraintes · Décisions · Raisonnements · Constats · Hypothèses · Données de base
```

**Ce que l'étape a posé, et rien de plus.**

- `NATURE.DECISION` et `NATURE.RAISONNEMENT` sont **déclarées** dans le
  vocabulaire (`services/assertion-taxonomy.js`), avec ce qui les tranche : un
  **arbitrage** pour l'une — un cinquième `SETTLED_BY` —, rien pour l'autre, qui
  n'affirme pas, elle dit par où l'on est passé.
- **Rien ne les produit.** Aucun `kind` ne s'y rattrape, aucun écran ne les
  écrit : le rattrapage par provenance ne les invente pas, et un test le tient.
- Les deux lectures s'écrivent comme les autres — `nature:décision` se tape dans
  la barre et rend zéro ligne, ce qui est exact. Le jour où l'étape 8 en verse,
  elles se remplissent sans qu'on touche à un filtre.
- L'ordre du rail est **celui des natures** (`NATURES`), et il n'y en a qu'un :
  le menu des filtres suit le même. Deux ordres finiraient par ne plus se
  ressembler.
- Le dossier de contexte nomme le vocabulaire entier dans sa légende, décision
  comprise, mais **n'écrit aucun bloc vide** : un titre « Décision » sans ligne
  ferait croire que le projet n'a rien tranché.

Deux fautes de français dormaient à côté et sont parties avec : « on ne se
prononce pas sur *une* constat » — l'article vit maintenant avec le nom —, et la
phrase « rien ne *la* tranche : elle sert de matière », écrite pour l'intendance,
qui aurait été deux fois fausse sur le raisonnement.

**Ce qui n'est pas fait**, et qui est l'étape 8 : ce qui écrit une décision — le
`.dec`, la forme de sa charge (question, écartés, motif), le repérage par le
copilote, la signature. Les deux suffixes réservés sont nommés dans
[`extensions.md`](extensions.md) pour que personne n'en invente d'autres.

### Comment la rendre explicite : le copilote propose, un humain signe

Les décisions se cachent dans les comptes rendus de réunion de conception et de
chantier, dans les fils de sujets, dans les courriels. Le copilote sait les y
**repérer** ; il ne sait pas les trancher.

Le mécanisme respecte la règle 1 sans exception :

```
compte rendu → copilote propose des décisions candidates
             → l'atelier les met en forme (question, écartés, motif)
             → une proposition
             → la mémoire
```

Ce que le modèle produit est une **lecture proposée**, jamais une valeur. Il
souligne un paragraphe et dit « ceci ressemble à une décision : voici la
question, voici ce qui semble avoir été écarté, voici qui semble avoir tranché ».
Chacune de ces trois choses est **corrigeable**, et rien n'entre sans signature.

### Fermer un sujet est une décision — *tranché*

Aujourd'hui, fermer un sujet ne laisse qu'un état. C'est perdre exactement
l'information qu'on cherche. La fermeture doit demander : **qu'a-t-on tranché ?**
— et ce qu'on répond devient une décision, avec sa question et ses écartés.

**C'est acquis** : la question a été posée et la réponse est oui. Reste à
l'implémenter avec le modèle, à l'étape 8 — et à respecter la consigne
permanente : aucun sujet réel ne s'ouvre ni ne se ferme automatiquement.

### Ce que l'étape 8 a posé

**Une décision est une ligne, et la valeur la cite.** C'est le modèle (b), et il
n'a rien réinventé : chaque pièce est celle qu'une **règle** utilise déjà.

| la règle | la décision |
| --- | --- |
| `referentiel: true` | `nature: "decision"` |
| `regle: { conditions, sinon, sauf }` | `decision: { question, ecartes, motif }` |
| clé préfixée `regle:` | clé préfixée `decision:` |
| range en `.ref`, par domaine | range en `.dec`, par domaine |
| la conclusion cite `provenance: règle` | la valeur cite `provenance: décision` |
| ne fixe pas le domicile du nom | ne fixe pas le domicile du nom |

Les deux dernières lignes ne sont pas décoratives. Le **préfixe de clé** :
décision et valeur portent le même sujet — c'est ce qui permet de les relier par
le nom —, et sans lui elles partageraient un `item_key`, donc verser l'une
supprimerait l'autre. Le **domicile** : une décision produit la valeur sans la
porter, et la laisser fixer le domicile du nom emmènerait toutes ses valeurs
dans le `.dec` de son domaine. Un test le prouve dans le pire cas, celui où la
décision est plus ancienne que la valeur.

**Le `.dec` est décrit**, et il ne l'était pas : `extensions.md` réservait le
suffixe en disant qu'« écrire sa forme au jugé reviendrait à graver un choix
qu'on n'a pas fait ». Le choix est fait, la page est passée de six extensions à
sept, et `.rai` reste seul réservé.

**Deux lignes de langage nouvelles**, et rien de plus : `question:` ouvre le
bloc — c'est par elle qu'on lit une décision —, et `écarté:` se répète, une
ligne par possible, avec son `parce que:` optionnel dessous. La grammaire des
preuves est celle qui existait ; une décision énonce, elle ne s'exécute pas.

**Ce qui manque se nomme.** `lacunes()` dit ce qu'une décision ne dit pas — les
écartés d'abord, parce que c'est pour eux que la ligne existe. Une décision sans
écartés notés n'est pas une décision sans écartés, et les deux ne se relisent pas
pareil (règle 5).

**Une décision peut ne poser aucune valeur.** « On ne fera pas de sous-sol » a
une question, des écartés et un motif, et rien à écrire dans un `.ddb`. Lui
inventer une valeur pour respecter une symétrie ferait entrer en mémoire une
affirmation que personne n'a prise.

### Fermer un sujet demande ce qu'on a tranché — *fait*

La fenêtre s'ouvre **avant** la fermeture, pré-remplie du titre du sujet. Trois
issues, et chacune compte :

- **fermer et proposer la décision** — le sujet se ferme comme il se fermait, et
  ce qu'on a écrit part en proposition, que quelqu'un signera ;
- **fermer sans décision** — délibéré. Forcer une décision à chaque fermeture
  ferait écrire des décisions inventées pour passer l'écran, et une décision
  fabriquée après coup est pire qu'une décision absente ;
- **renoncer** — on renonce **à fermer**, pas seulement à la décision : on n'a
  encore rien fait, et fermer quand même agirait sur un geste annulé.

**Seulement « fermé comme réalisé ».** Un sujet fermé comme non pertinent ou
comme doublon ne tranche rien du projet : il dit que ce fil n'avait pas lieu
d'être. Y poser la question ferait entrer en mémoire des décisions sur l'outil
plutôt que sur l'ouvrage.

**La fermeture n'a pas changé d'un octet** — mêmes colonnes, même RPC, même
événement d'historique. La question s'ajoute avant, la proposition après, et une
proposition qui échoue laisse un sujet fermé sans sa décision : c'est l'état
d'avant cette étape, et on le **dit** plutôt que de rouvrir le sujet dans le dos
de quelqu'un. **Aucun sujet ne s'ouvre ni ne se ferme automatiquement**, à aucun
moment.

### Ce qui reste

**Le copilote ne repère pas encore les décisions.** Le chemin décrit plus haut —
compte rendu → candidates → atelier → proposition — demande un appel de modèle
sur des documents versés, avec ses garde-fous propres : ce que le modèle
souligne est une **lecture proposée**, jamais une valeur, et chacune des trois
choses qu'il avance doit rester corrigeable. C'est un travail distinct de la
mécanique posée ici, qui l'attendait sans en dépendre.

**Rien d'autre n'écrit de décision.** La fermeture d'un sujet est la seule porte
ouverte. Un écran d'Atelier « enregistrer une décision », sans sujet à fermer,
n'existe pas encore.

**Une décision ne porte pas encore de zone à la fermeture.** La portée d'une
décision prise dans un fil n'est presque jamais connue de celui qui ferme, et
une question de plus à ce moment ferait renoncer : elle vaut partout, et se
restreint dans la proposition.

**Les erreurs de l'écran des sujets ne se voient pas.** Le `showError` que cette
vue s'injecte ne fait qu'un `console.error` : une proposition de décision qui
échoue après une fermeture réussie ne le dit qu'à la console. Le défaut est
ancien et vaut pour toute la vue, pas seulement pour ce chemin ; il mérite un
vrai bandeau.

### Questions ouvertes, à trancher avant d'écrire du code

- Une décision peut-elle être **révisée** ? Oui — mais alors elle se reverse
  par-dessus (règle 11), et la première reste lisible avec sa date. Une décision
  révisée est une information de premier ordre.
- Une décision porte-t-elle une **zone** ? Oui, comme tout le reste.
- Que fait-on des décisions **anciennes** d'un projet en cours ? On ne les
  invente pas. Le copilote les propose à partir des documents versés, et le reste
  reste inconnu — et se dit.

---

## 16. Ce qu'est un raisonnement

**État :** le point dur est fait — un rejeu s'arrête sur un choix humain et dit à
qui s'adresser. Le versement d'un raisonnement reste : voir « Ce qui reste ».

### Ce qu'il n'est pas

Mdall sait deux choses aujourd'hui : la **règle** (`.ref`, conditions →
conclusion) et la **fonction native** (agent-D). Les deux sont **déterministes** :
mêmes entrées, même sortie, toujours. Un enchaînement de fonctions dépendantes
l'est aussi.

Or un raisonnement de projet ne l'est pas, et c'est tout le sujet.

### Ce qu'il est : une chaîne qui traverse des décisions

> **Un raisonnement est une suite d'étapes dont certaines sont des décisions
> humaines.**

Il avance logiquement, il bute sur un choix que rien ne détermine — une couleur,
une trame, une valeur retenue dans une fourchette —, quelqu'un tranche, et il
repart. C'est exactement la forme de l'enchaînement qu'on vient de dessiner pour
la variante, mais **versé** et **relu**, pas seulement affiché pour un essai.

### Le point dur, et c'est là que le produit vaut cher

**Un raisonnement qui traverse une décision ne se rejoue pas tout seul.**

Si l'altitude change, la chaîne se rejoue jusqu'à la décision — puis elle
s'arrête et dit :

> Ici, le 12 mars, Marie a retenu **H0 = 0,50 m** entre 0,45 et 0,55.
> Ce choix tenait sous une altitude de 13 m. Tient-il encore à 800 m ?

C'est le « à revérifier » d'aujourd'hui, mais avec **un nom, une date, une
question précise et les possibles d'origine**, au lieu d'un doute général. Savoir
quelles décisions humaines une donnée nouvelle remet en cause est probablement ce
que Mdall a de plus à offrir à un projet — et personne d'autre ne le fait.

### Ce qu'un raisonnement porte

- ses **étapes**, dans l'ordre : règle, fonction native, décision ;
- ses **liens** : ce que chaque étape lit et écrit — le composant
  `views/ui/enchainement.js` le dessine déjà ;
- pour chaque décision : **la question, les écartés, qui, quand** ;
- **où il s'est arrêté** la dernière fois qu'on l'a rejoué, et pourquoi.

Une huitième extension — `.rai` — et une entrée « Raisonnements » dans la barre
latérale.

**L'entrée existe depuis l'étape 2** ; elle est vide et le dit. Le reste — ce
qu'un `.rai` contient, comment un raisonnement se verse, comment il s'arrête sur
une décision quand on le rejoue — est l'étape 9.

### Ce que l'étape 9 a posé

**Le rejeu s'arrête sur un choix humain, et dit à qui s'adresser.** C'était le
point dur, et c'est fait. Là où l'écran disait « à revérifier » sans un mot —
un doute sans adresse —, il écrit maintenant :

> Le 12 mars 2026, Marie D. a retenu 0,50 m entre 0,45 m et 0,55 m.
> Ce choix tenait sous Altitude du site = 13 m. Tient-il encore à 800 m ?

**Chaque morceau de cette phrase est lu, aucun n'est déduit :** qui et quand
viennent de la provenance, ce qui a été retenu de la valeur, les possibles de
`payload.decision.ecartes`, et ce qui a bougé du départ de la variante. Ce qui
manque manque : une décision sans auteur ne se voit pas attribuer le dernier
connecté, une décision sans écartés notés ne s'en voit pas offrir de plausibles.
La phrase est alors plus courte, et l'écran le dit (règle 5).

**`par` et `le` n'arrivaient pas jusqu'à la base.** Le langage sait les écrire
depuis toujours — `décision humaine assumée (…, par: X, le: d)` — et
`provenanceRetenue` les jetait à deux lignes de la base : la provenance ne
gardait que son type et sa phrase. Sans eux, on ne pouvait aller demander à
personne si son choix tenait encore. C'était le maillon manquant de tout ce
mécanisme, et il tenait en deux champs.

**Un choix humain a sa propre étape dans la chaîne.** L'enchaînement de
l'étape 5 le sort du compte « n à revérifier » et lui donne un nœud, avec sa
question. La fondre dans un compte aurait perdu exactement ce pour quoi la
décision a été enregistrée — et la chaîne se serait lue comme si elle s'était
arrêtée toute seule.

**Les écartés se montrent tels qu'ils étaient**, barrés, avec leur motif quand il
y en avait un. C'est la réponse à « qu'est-ce qu'on avait envisagé ? », et sans
eux la question se poserait à l'aveugle.

**Une seule icône pour une décision.** Trois écrans la posent — le rail de la
mémoire, la chaîne d'une variante, le bloc d'un choix remis en question. Elle est
déclarée avec la nature, une fois (règle 10).

**`.rai` a sa place**, et il n'en avait aucune : `extensionDeRangement` rendait
`undefined` pour un raisonnement. Il est **transversal** — un raisonnement
traverse les disciplines par construction, et le ranger sous un domaine
reviendrait à choisir lequel de ses maillons le nomme.

### Ce qui reste

**Un raisonnement ne se verse pas encore.** Ce qu'un `.rai` contient — la suite
des étapes, leurs liens, où il s'est arrêté la dernière fois — n'est pas écrit,
et c'est délibéré : rien ne le produit. Le producteur naturel existe pourtant, et
il est identifié : `chaineDuRaisonnement` construit déjà la chaîne d'un sujet
jusqu'aux données de base, et l'onglet « Comment on en est arrivé là » l'affiche.
Le geste manquant est « verser ce raisonnement » depuis cet écran — et il
demande d'abord de décider ce qu'on fige d'une chaîne qui se recalcule.

**`chaineDuRaisonnement` ne voit pas les décisions.** Elle remonte par
`reglesQuiProduisent`, qui filtre sur `payload.referentiel === true` : une
décision n'y répond pas, et la chaîne s'arrête sur la valeur décidée comme sur
une donnée de base ordinaire — sans dire que quelqu'un l'a choisie. Il lui faut
un `decisionsQuiProduisent` jumeau. C'est ce qui manque pour qu'un raisonnement
**affiché** montre ses arbitrages, là où un raisonnement **rejoué** les montre
déjà.

### Ce qu'on ne fera pas

Deviner les raisonnements à partir du graphe de dépendances. Le graphe donne les
chaînes **déterministes** ; il ne saura jamais qu'entre deux d'entre elles
quelqu'un a choisi. Un raisonnement se **verse**, comme le reste.

---

## 17. La proposition devient une branche

**État :** fait, sauf la sortie de l'écran de variante — voir « Ce qui reste ».

### Ce qu'on cherchait vraiment

L'idée de branche revient — et le débat d'alors partait d'une mauvaise analogie.
**On n'a pas besoin de deux réalités parallèles** comme dans le développement
logiciel : une seule mémoire, une seule vérité, c'est le principe.

Ce dont on a besoin est plus simple et plus utile : **une proposition qui ne soit
pas mono-action**. On l'ouvre, on l'enrichit d'une modification, puis d'une
autre, et quand elle est complète on la fusionne. Une branche est donc **une
proposition ouverte à laquelle on attache des modifications**. Plusieurs peuvent
vivre en même temps.

### Le geste

Le bouton « Faire une proposition » se dédouble :

```
Faire une proposition ▾
  ├── Créer une proposition
  └── Ajouter à une proposition ouverte ▸  #58 Reprise des fondations
                                           #61 Mise à jour incendie
```

### Ce que ça entraîne, et qu'il faut traiter

- **Le diff devient cumulatif.** Une proposition montre l'écart entre la mémoire
  et l'ensemble de ce qu'elle porte, pas la dernière modification.
- **Deux branches qui touchent le même sujet.** Le conflit se **dit** avant la
  fusion — jamais résolu en silence. Le mécanisme existe déjà pour les domiciles
  de noms (`services/memoire-domiciles.js`) ; c'est la même discipline.
- **La variante alimente une branche.** « Ajouter cet essai à la proposition
  ouverte » est la sortie qui manquait à l'écran de variante.
- **Une branche est visible de l'équipe**, contrairement aux conversations avec
  le copilote qui restent privées, sans exception.
- **Une branche vieillit.** Une proposition ouverte depuis trois semaines sur une
  mémoire qui a bougé doit le dire — `laMemoireABouge` sait déjà répondre à cette
  question pour une variante.

### Ce que l'étape a posé

**La base l'accueillait déjà sans le savoir.** `proposition_items` est unique sur
`(proposition_id, item_type, item_key)` et le versement se fait en
`merge-duplicates` : y porter un deuxième lot ajoute ce qui est nouveau et
remplace ce qui porte la même clé. **Aucune migration.** Ce qui manquait était le
geste, et les trois choses qu'une branche doit dire.

**Le geste.** `renderTransformer` — le seul endroit où le bouton s'écrit — pose
maintenant une ligne par proposition ouverte, et chacune la **nomme** :
« Ajouter à #58 Reprise des fondations ». Un menu qui aurait dit « ajouter à une
proposition ouverte » sans dire laquelle aurait demandé un deuxième clic pour
savoir de quoi il parle. Les quatre écrans qui portent le bouton — climat,
fondations, spectre, incendie — y sont raccordés par une ligne chacun.

**La couture.** `preparerUneProposition` accepte un `propositionId` : au lieu
d'ouvrir une proposition de plus, elle porte le lot dans celle-là. Deux refus, et
ils comptent autant que le succès : une proposition qui n'est plus ouverte ne
reçoit rien, et une clé **déjà tranchée** n'est pas repoussée.

**Ce qu'on n'écrase pas.** Le versement remet chaque item à « proposé » et efface
`decided_by` et `decided_at`. Sur une clé encore proposée c'est exactement ce
qu'on veut ; sur une clé qu'un relecteur a acceptée ou refusée, ce serait effacer
sa décision sans le dire — et un refus effacé est un refus qu'on ne pourra pas
contester. Ces lignes sont retenues, et **dites à l'arrivée**, là où elles se
trouvent : les quatre écrans partent aussitôt vers la proposition, et la phrase
se serait lue sur un écran qu'on ne regarde plus.

**Le conflit se dit avant la fusion.** Deux propositions ouvertes sur le même
sujet affichaient chacune le même « avant », et rien ne disait qu'elles se
contredisaient. Un bandeau les nomme, au-dessus des onglets — au-dessus, et pas
*dans* un onglet, parce qu'un onglet qu'on n'ouvre pas ne dit rien.

**Une branche vieillit, et on le calcule.** On aurait pu figer un compte et une
date à l'ouverture, comme une variante le fait ; mais une proposition vit des
jours, et un compte figé aurait vieilli lui aussi. On compare donc, à la lecture,
la date d'ouverture à ce que la mémoire dit **des sujets que la branche touche** —
ce qui répond en plus à « lesquels », là où un compte n'aurait dit que « quelque
chose ». Rien n'entre en base : un registre serait faux dès la proposition
suivante (règle 4).

**Une ligne par sujet, jamais une par item.** C'est la discipline de
`versementsHorsDomicile`, reprise telle quelle : ce qui se règle, c'est le sujet,
et le répéter pour chaque branche qui le touche ferait lire trois conflits là où
il y en a un à trancher.

**`listPropositionItems` rendait `[]` en cas d'échec**, comme lorsqu'il n'y a
rien. Le garde-fou en aurait conclu « rien de tranché » sur une lecture ratée, et
repoussé le lot par-dessus un refus qu'il n'avait pas vu. Elle rend `null`, comme
`listPropositions` et `listProjectAssertions` le font depuis toujours.

**Le diff cumulatif n'a rien demandé.** `tableauAvantApres` prenait déjà
l'ensemble des items d'une proposition, une ligne de sortie par item : une
proposition qui en porte trois lots l'affiche cumulée, sans une ligne de code de
plus. Ce point de la liste ci-dessus était déjà tenu.

### Ce qui reste

**La variante n'alimente pas encore une branche.** « Ajouter cet essai à la
proposition ouverte » est la sortie qui manque toujours à l'écran de variante :
celui-ci ne produit pas d'affirmations versables — il rend des valeurs recalculées
qu'il faudrait d'abord transformer en lignes de proposition, avec leur appel et
leurs lectures. C'est un travail distinct de la mécanique posée ici, qui
l'attendait sans en dépendre.

**Une proposition dont les items n'ont pas pu être lus s'affiche vide.** Le défaut
est ancien ; il est seulement devenu *visible* maintenant que la lecture sait
distinguer l'échec de l'absence. L'écran aplatit encore `null` en liste vide aux
deux endroits où il ouvre une proposition, et devrait dire « lecture ratée »
plutôt que d'afficher une proposition sans lignes.

**L'écran du spectre ne dit pas pourquoi une proposition a échoué.** Il rend la
main en silence sur `!rendu.ok`, là où les trois autres écrivent la raison à côté
du bouton. Défaut ancien lui aussi, et sans rapport avec la branche.

---

## 18. Le titre et le corps d'une proposition

**État :** fait.

### Le défaut, mesurable

Vingt-cinq propositions intitulées « Fondations superficielles — dimensionnement »
ou « Incendie — étude du 6 septembre 2026 ». Six mois plus tard, la liste ne dit
plus rien, et retrouver *la* proposition qui a descendu les massifs demande de
les ouvrir une à une.

### Ce qu'un modèle fait ici, et ce qu'il ne fait pas

Il reçoit le **diff** — ce qui change, de quelle valeur à quelle valeur, dans
quelle zone — et il écrit un titre et un résumé. Trois garde-fous, les mêmes que
partout :

- **il ne produit aucune valeur.** Il redit ce que le diff contient ; un chiffre
  qui viendrait de lui serait indiscernable des autres à l'écran ;
- **il est éditable avant l'envoi**, et le titre proposé est marqué comme
  proposé ;
- **il tourne au serveur**, jamais dans le navigateur.

Le titre qu'on veut : *« Massifs du bâtiment A descendus à 0,66 m après relevé
d'altitude »*. Pas *« Fondations superficielles — dimensionnement »*.

### Ce que l'étape a posé

**La règle est vérifiée, pas seulement demandée.** « Il ne produit aucune
valeur » écrit dans une consigne est un vœu. `redaction.js`, au serveur, relève
tout nombre de ce que le modèle rend et le cherche dans ce qu'on lui a donné : un
seul chiffre absent refuse la rédaction **entière**, et l'écran garde le titre
d'origine en disant pourquoi. C'est la discipline de la cloison et des domiciles
de noms — on ne demande pas au code de bien se tenir, on casse quand il ne se
tient pas.

La comparaison porte sur les **nombres**, pas sur le texte : « 0,66 » et « 0.66 »
sont la même cote, et les refuser l'une pour l'autre écarterait une rédaction
juste. À l'inverse « 66 » n'est pas « 0,66 » — un modèle qui perd la virgule est
refusé, ce qu'une comparaison de chaînes aurait laissé passer.

**La consigne ne quitte pas le serveur**, et un test le tient. Contrairement à
celle de la note de dépôt — dupliquée dans le navigateur et comparée par un test
—, celle-ci n'existe qu'en un endroit. `verifie-cloison.test.mjs` lit les phrases
de la consigne **dans la fonction** et vérifie qu'aucun fichier servi ne les
porte : la liste ne peut pas se périmer, puisqu'elle est relue à sa source.

**La question arrive dans le geste**, juste après « à quelles zones ? » et pour la
même raison. Un titre qu'on corrigerait sur la proposition déjà ouverte serait un
titre qu'on ne corrige pas : on est passé à autre chose. La fenêtre s'ouvre
**sans attendre le modèle**, avec le titre de l'écran, et se met à jour quand la
rédaction arrive — attendre pour tout montrer d'un coup laisserait un écran figé
après un clic. Ce qu'on a commencé à taper n'est jamais écrasé.

**Le résumé devient l'introduction de la description**, qui garde ensuite sa
liste de valeurs : une phrase écrite à la main ne doit pas faire disparaître ce
que la proposition porte.

**On ne paie pas toujours.** Une seule ligne se nomme d'elle-même — « Zone de
neige : A1 → A2 » est déjà le meilleur titre possible —, et un diff dont la
mémoire n'a pas pu être lue n'a pas de « avant » : la phrase serait écrite sur la
moitié de l'information. Dans les deux cas l'écran garde son titre et le dit.

**Le diff est celui du relecteur.** `tableauAvantApres`, appelé avec une
proposition encore sans identifiant, donne exactement le tableau que l'onglet
Changements affichera ensuite. Deux calculs de diff auraient fini par ne plus
dire la même chose (règle 4), et le titre aurait décrit autre chose que le
tableau.

**Les lignes identiques ne partent pas au modèle**, leur nombre si. Une ligne
inchangée ne dit rien de ce qui change, et la citer dans un titre serait une
fausse piste ; le compte, lui, dit quelque chose du lot.

**Les deux chemins de nommage restent séparés.** `proposition-title.js` nomme un
lot de **documents** sans modèle, et il a raison de le dire : trois natures, un
émetteur et une période, la phrase s'assemble. Ce qui distingue deux propositions
d'**affirmations** n'est pas dénombrable, et c'est là que le modèle gagne son
coût. Aucun des deux n'a à devenir l'autre.

### Ce qui reste

**Le titre ne se corrige pas après coup.** Il se choisit avant l'ouverture, et
`propositions-supabase.js` n'a aucun chemin de mise à jour du `title` ni de la
`description` — seules les colonnes de cycle de vie se modifient. Rebaptiser une
proposition ouverte demanderait un `PATCH` de plus, et l'écran qui va avec.

**Une branche enrichie ne se renomme pas.** Quand on ajoute un lot à une
proposition ouverte ([§ 17](#17-la-proposition-devient-une-branche)), le titre
reste celui du premier lot — ce qui est correct tant qu'on ne sait pas
renommer, et discutable le jour où l'on saura.

---

## 19. La localisation et les zones se changent par proposition

**État :** fait.

La localisation du projet et son découpage en zones se changeaient **hors
proposition** — pire, ils s'écrivaient **directement** en mémoire. C'était une
exception à la règle 1 sur ce qui structure tout le reste, et on ne la voyait
pas : elle était dans un service qui s'appelait « verser une donnée de base ».

Trois conséquences, et la troisième est la pire :

- on perdait le **qui, quand, pourquoi** sur la donnée la plus structurante du
  projet ;
- le sujet versé par les Paramètres, « Adresse du projet », **n'était lu par
  personne** : les agents climatiques lisent « Localisation du projet », que seul
  l'Atelier posait. Deux sujets pour un même endroit, dont l'un ne servait à rien ;
- **rien ne se recalculait**, alors que changer la commune change la neige, le
  vent, le gel et la zone sismique — donc les fondations et le spectre.

### Ce que l'étape a posé

- **Un seul sujet pour un seul endroit.** « Adresse du projet » disparaît ; les
  deux écrans posent « Localisation du projet », la ligne à quatre colonnes que
  les agents lisent. Elle se construit dans `services/localisation-versement.js`,
  une fois : deux écrans la posent, et si chacun bâtissait la sienne les deux
  finiraient par ne plus décrire le même endroit (règle 4).
- **Le geste de mémoire est explicite.** Un bouton « Proposer à la mémoire » sur
  l'écran de localisation, distinct de l'enregistrement. L'enregistrement range
  l'adresse dans la fiche du projet — c'est lui qui dessine la carte et
  pré-remplit les utilitaires ; la proposition, elle, se relit avant d'être
  signée. Une proposition qui s'ouvrirait à chaque frappe ne se relirait jamais.
- **Définir, renommer, retirer une zone** ouvrent une proposition
  (`services/zones-versement.js`). Renommer en définit une autre **et** retire la
  première : la clé vient du nom, et sans le retrait le projet aurait un bâtiment
  de trop.
- **Retirer n'est pas refuser.** Un refus est le geste de celui qui relit — « ne
  l'applique pas ». Retirer une zone est une décision du projet : elle se verse
  comme une **définition de plus**, marquée `retiree`, qui périme la précédente.
  La zone quitte les listes et reste dans l'histoire, avec son motif. C'est la
  règle 11 : on ne corrige pas la mémoire, on verse par-dessus.
- **La proposition emporte ce qui fait une zone** — `zoneDefinition`, `zoneKey`,
  `retiree` — et lui donne la clé du projet, `zone:batiment-a`. Sans elle,
  redéfinir une zone laisserait les deux définitions valoir à la fois.
- `services/base-data-supabase.js` **est supprimé** : c'était le fichier qui
  écrivait directement, et le laisser en place invitait à s'en resservir.

### Ce qui reste, et qu'il faut nommer

- **L'adresse vit encore à deux endroits** : dans la mémoire, désormais, et dans
  la table `project_location` que l'écran édite. La seconde est le formulaire —
  ce qui dessine la carte et pré-remplit les utilitaires —, la première est la
  référence du raisonnement. Les réunir demande que tout ce qui lit
  `getEffectiveProjectLocation` lise la mémoire ; c'est un travail à part.
- **« Verser les contraintes du site »** écrit encore directement — c'est le
  dernier chemin qui contourne la proposition, et il a maintenant sa section :
  [§ 24](#24-verser-les-contraintes-du-site).

Une zone **retirée** était déjà traitée du côté de ce qu'elle emporte
([§ 13](#13-retirer-ce-quune-ancienne-version-dutilitaire-a-versé)) : ce qui ne
valait que pour elle quitte le présent, avec son motif.

---

## 20. Neige, vent et gel aux standards, puis le spectre

**État :** fait, spectre compris.

L'utilitaire « Neige, Vent & Gel » était antérieur aux standards actuels —
entrées déclarées, sorties déclarées, appel à un agent-D, rejeu. Il est découpé
en **deux agents**, et pas trois :

| agent | ce qu'il lit | ce qu'il pose |
| --- | --- | --- |
| **zones climatiques** | la localisation | zone de neige, zone de vent |
| **profondeur hors gel** | la localisation, l'altitude | la cote hors gel, le H0 retenu |

Le premier ne lit qu'une commune ; le second lit une altitude, et c'est lui seul
qu'une variante d'altitude concerne. Les tenir ensemble aurait rejoué les tables
communales à chaque mètre essayé, pour rien.

Le serveur, lui, garde ses **trois** clés — `snow`, `wind`, `frost` — et c'est
juste : les zonages neige et vent ne sont pas révisés ensemble, chacun a son
fichier et sa version. Un **agent** est un appel ; un **utilitaire** est la
lecture d'un des sujets que cet appel pose. Les confondre revenait soit à perdre
l'appel — c'est ce qui se passait —, soit à ne plus pouvoir monter la version
d'un seul zonage.

### Ce qui manquait, et que l'étape referme

L'écran calculait bien ; rien de ce qu'il faisait ne s'écrivait comme un
raisonnement.

- **L'appel n'existait nulle part.** Cinq valeurs entraient dans la mémoire,
  chacune seule, sans que rien dise qu'un même calcul les avait posées ensemble.
- **Son entrée non plus.** La commune vivait dans le formulaire du projet, pas
  dans sa mémoire : on ne pouvait ni la relire, ni la faire varier, ni savoir
  laquelle avait servi.
- **Rien ne se rejouait.** La reprise ne reconnaissait qu'un `kind` — celui du
  versement automatique depuis les faits de contexte — et laissait de côté tout
  ce qui entre par une **proposition**, c'est-à-dire le chemin normal. Une zone
  de neige signée citait pourtant son utilitaire, sa version et ce qu'elle avait
  lu : tout était là, et rien ne la reprenait. Ce qui décide est désormais ce
  dont on a besoin pour refaire — l'utilitaire cité, et ce qu'il sait faire.

### Ce que l'étape a posé

- `utilitaires/agents-climatiques.js` — les deux agents, leurs entrées, leurs
  sorties. Une sortie qui renvoie à un outil (`{ outil: "snow" }`) prend le sujet
  de l'utilitaire qui la déduit ; celles qu'aucun utilitaire ne déduit — le H0 de
  la table départementale — se déclarent en entier. **Chaque sortie déclare aussi
  la clé du résultat où elle se lit** : `frost_depth_m` n'est pas `frost_depth`,
  et deviner l'une depuis l'autre lisait un champ absent sans le dire.
- `services/climat-versement.js` — huit lignes, dans l'ordre de la chaîne : la
  localisation, l'altitude, l'appel des zones, ce qu'il pose, l'appel du gel, ce
  qu'il pose. C'est cette forme qui rend la chaîne rejouable.
- **La localisation se saisit**, sur l'écran, pré-remplie par le projet et
  modifiable. Le calcul refuse de partir sans le code INSEE et le dit à côté du
  champ : « code_insee is required » n'était une phrase pour personne.
- L'altitude cesse d'être versée comme un **produit** des zonages. Le serveur ne
  la calcule pas, il la reçoit ; l'écrire comme une sortie faisait de la chaîne
  climatique une boucle sur elle-même.
- Les cartes de l'écran écrivent leurs nombres **comme la mémoire les écrira** —
  virgule, unité : « 0.894 » d'un côté et « 0,89 m » de l'autre auraient fait
  chercher longtemps d'où venait la différence.

Les calculs restent au serveur, sans exception.

### Le spectre, aux mêmes standards

Un troisième agent-D — `agent_d_spectre_elastique_ec8_V1` —, qui lit quatre
sujets et pose une ligne.

| ce qu'il lit | d'où cela vient |
| --- | --- |
| **zone de sismicité** | déduite de la commune, par Géorisques |
| **classe de sol EC8** | un choix du projet |
| **catégorie d'importance** | un choix du projet |
| **amortissement visqueux** | un choix du projet |

Il pose **une seule ligne à huit colonnes** — agr, γI, ag, η, S, TB, TC, TD —
parce que ces huit décrivent une seule courbe et ne se lisent jamais séparément.
Chacune porte sa clé : une variante peut faire varier `…#S` sans toucher au
reste.

**La courbe ne se verse pas.** Ses quarante et un couples (T, Se) sont
entièrement déterminés par la ligne : les écrire serait écrire deux fois la même
chose, et la seconde copie divergerait au premier arrondi (règle 4). L'écran la
retrace depuis la ligne.

**La zone de sismicité n'est pas versée non plus.** Elle est *lue* :
`deduction_zone_sismique_georisques_V1` l'établit depuis la commune, et deux
écrans qui poseraient le même sujet en feraient deux valeurs concurrentes que
personne n'arbitrerait. L'appel enregistre en revanche la valeur avec laquelle il
a calculé — c'est ce qui dira, plus tard, que ce spectre a été tracé sur une zone
changée depuis.

#### Où le calcul vit — la question, et la réponse

Il reste **dans le navigateur**, et c'est une exception assumée à « les calculs
restent au serveur ». Trois raisons :

1. **Sa loi est un décret.** L'Eurocode 8 et son annexe nationale sont publics ;
   les cacher ne protégerait rien, contrairement à un pré-dimensionnement dont la
   loi *est* le produit (`LOI.SECRETE`).
2. **L'écran la trace.** La courbe se redessine à chaque frappe sur
   l'amortissement — un aller-retour réseau par pixel serait absurde. C'est
   d'ailleurs pourquoi le module figure déjà dans les `PUBLICS` de
   `scripts/prepare-utilitaires.mjs`.
3. **Le rejeu n'a donc pas de réseau à attendre.** Une variante de zone sismique
   recalcule le spectre sur place, immédiatement.

Il n'y a **qu'un fichier** —
`supabase/functions/_shared/utilitaires/seismic-spectrum.js` —, copié au
navigateur au moment du build : deux exécutions, aucune divergence possible. Si
la décision devait s'inverser, elle ne coûterait qu'un déplacement de l'appel :
la déclaration de l'agent ne changerait pas d'une ligne.

#### Ce que le rejeu a dû apprendre

Un agent peut désormais **déclarer sa propre reprise** (`rejeu: { outil }`), et
les deux cas se distinguent nettement :

- les agents climatiques n'en déclarent pas — chacune de leurs sorties cite
  l'utilitaire qui la déduit, et c'est cette ligne-là que la variante refait ;
- le spectre en déclare une — sa ligne ne cite que lui, et sans cette
  déclaration une variante de zone l'aurait laissée derrière elle.

La cascade est vérifiée de bout en bout : zone de sismicité 4 → 2 refait la ligne
et fait passer `ag` de 1,92 à 0,84 m/s².

---

## 21. La cascade parallèle, la démonstration

**État :** fait pour la branche climatique. La branche sismique se déclare et se
dit, mais ne se rejoue pas — voir « Ce qui reste » ci-dessous.

```
Localisation du projet
 ├── Altitude ──────► Profondeur hors gel ──────► Fondations
 └── Zone sismique ─► Spectre
```

Une seule valeur changée, deux chaînes qui partent, quatre utilitaires rejoués.
C'est la démonstration que le produit existe.

**Ce qui manquait était petit et précis :** l'enchaînement livré était une
**file**, et il fallait un **arbre**. Le composant savait dessiner une suite de
boîtes reliées ; il lui manquait le **rang** de propagation, pas seulement
l'ordre du rejeu. Les arêtes existaient déjà (`lecturesDeLaRegle`,
`sortiesDeLaFonction`, le `lit` de chaque utilitaire) ; il ne manquait que le
trait qui fourche.

### Ce que l'étape a posé

**Le rang se calcule, il ne se devine pas d'un ordre.**
`enchainementDeLaVariante` tient deux registres — qui a écrit quel sujet, et à
quel rang — et range chaque étape un cran sous le plus profond des sujets qu'elle
**déclare lire** et qu'une étape d'ici vient d'écrire. Deux étapes qui lisent la
même chose sont donc **sœurs**, du même rang : c'est exactement la fourche qu'on
cherchait à montrer. Une étape qui lit ce que rien d'ici n'a écrit va au rang 1 —
elle découle de ce qu'on essaie, par un chemin qu'on ne voit pas —, ce qui vaut
mieux que de la ranger sous une sœur qui ne la commande pas.

**Un seul dessin, deux formes.** `renderEnchainement` reste le composant unique
(règle 4). Sans rang il dessine une file, et c'est le bon dessin pour le chemin
d'une exécution — décision, corpus, lecture, avis se suivent vraiment. Avec des
rangs qui diffèrent, et à la verticale seulement, il indente comme un journal de
branches et **supprime les traits entre boîtes successives** : dans un arbre, la
boîte suivante n'est pas la suite de la précédente, et un trait entre elles dirait
le contraire de ce qui s'est passé.

**Le crochet est court, et de longueur fixe.** Un trait continu du haut de la
colonne jusqu'au coude serait plus joli, mais il devrait remonter jusqu'à la sœur
précédente, dont la hauteur n'est pas connue de la feuille de style : il se
rompait sous chaque boîte un peu haute, et un tronc rompu se lit comme une branche
qui s'arrête. Un crochet franc ne prétend rien — l'indentation dit la profondeur,
il dit l'attache.

**Les récapitulatifs reviennent au tronc.** « 3 à revérifier » ne découle
d'aucune étape en particulier : cela repose sur *tout* ce qui vient de bouger. Les
ranger au rang le plus profond les aurait dessinés sous la dernière branche, qui
ne les commande pas — le défaut même que l'étape ferme, rouvert en bas du schéma.
Au tronc, et venant en dernier, ils se lisent comme ce qu'ils sont : ce en quoi
l'ensemble des branches se rejoint.

**La localisation est devenue la tête de la cascade.** L'étape 4 en avait fait un
sujet de la mémoire ; il fallait encore que les utilitaires déclarent la lire. Les
trois utilitaires climatiques le déclarent maintenant — celui du vent ne déclarait
**rien du tout** —, et changer la commune fait donc partir trois branches à la
fois, dont l'une continue jusqu'aux fondations.

**Le zonage sismique déclare la commune, sans savoir se rejouer.** Il déclarait
lire le vide, au motif qu'il « se lit sur des coordonnées, que la mémoire ne porte
pas comme sujets ». Ce n'était pas vrai : le zonage est réglementairement
communal, et le fichier le dit lui-même en tête. Sa valeur vient de Géorisques et
il n'a pas de `rejeu` — il apparaît donc **à revérifier**, en disant pourquoi,
plutôt que d'être absent de la chaîne comme si rien n'en dépendait. Règle 5 : ne
pas savoir rejouer n'autorise pas à prétendre que rien ne dépend de la commune.

### Ce qui reste

**La branche sismique ne se rejoue pas.** Le spectre a bien son agent et sa
reprise ([§ 20](#20-neige-vent-et-gel-aux-standards-puis-le-spectre)), mais entre
la commune et lui la zone de sismicité ne se recalcule pas : sa valeur vient de
Géorisques, et `contraintesAReprendre` ne sait reprendre qu'un utilitaire portant
un `rejeu.outil`. Généraliser cela est un travail distinct — c'est aussi la
deuxième question de [§ 24](#24-verser-les-contraintes-du-site) —, et l'étape s'en
tient à le **dire** : la zone de sismicité se range à revérifier, avec sa raison,
au lieu de disparaître.

**Le titre d'une étape reste la référence de l'utilitaire**
(`deduction_zone_neige_commune_V1`). C'est délibéré ici — le libellé répéterait ce
que la ligne « écrit » dit déjà juste en dessous —, mais cela mérite d'être
retranché le jour où le schéma s'élargit.

---

## 22. Le cerveau, requalifié

**État :** fait pour le filtre et la bascule. Le cerveau ne connaît toujours pas
les natures — voir « Ce qui reste ».

Le cerveau a bien sa place dans la Mémoire, mais il est mal nommé dans les têtes :
ce n'est pas une vue de la mémoire, c'est **le cerveau du projet — mémoire plus
raisonnements**. Il prendra tout son sens quand les décisions et les
raisonnements y seront ([§ 15](#15-ce-quest-une-décision),
[§ 16](#16-ce-quest-un-raisonnement)) : une décision y sera un nœud d'un genre
nouveau, celui où la chaîne s'arrête et où quelqu'un a tranché.

Deux manques, et ils vont ensemble :

- **il ignore le filtre.** La barre latérale filtre la liste, pas le dessin. On
  doit pouvoir ne voir que les raisonnements, que les contraintes, que le domaine
  incendie ;
- **il n'y a pas de bascule.** La même sélection doit se lire en tableau ou se
  voir en cerveau — le tableau pour lire, le cerveau pour voir.

**Un seul état de filtrage, deux rendus.** Deux filtres finiraient par diverger
(règle 4), et l'on croirait voir la même chose sans la voir.

### Ce que l'étape a posé

**L'état unique existait déjà, et le cerveau l'ignorait.** `view.query` porte
tout le filtrage — `nature:`, `domaine:`, `provenance:`, `etat:`, le texte
libre —, et le rail de gauche n'est pas un second état : il **écrit** dans la
requête et se rallume en la relisant. Le cerveau, lui, recevait la mémoire
entière pendant que la liste juste derrière n'en montrait que douze lignes.
Deux rendus, deux contenus, et rien à l'écran pour dire lequel disait vrai.

`services/memoire-selection.js` écrit la sélection **une fois** ; la liste et le
cerveau la lisent. Le calque d'une variante reste dehors et se pose avant, sur la
liste qu'on donne en entrée : la liste lit une mémoire avec calque, le cerveau
lit la mémoire réelle — dessiner un raisonnement qu'on sait faux ne dirait rien
de vrai.

**Un champ mort est parti avec.** `view.reader` était déclaré, jamais lu, jamais
écrit : exactement le second état de filtrage que cette section interdit. Il
n'attendait qu'une main pour être « réutilisé ».

**Le cerveau dit ce qu'il montre.** Un dessin de douze nœuds sans prévenir qu'un
filtre est posé ferait croire à un projet de douze affirmations, et l'on
chercherait longtemps ce qui manque (règle 5). Les mots sont ceux de la barre de
recherche — une deuxième façon de nommer les mêmes filtres finirait par ne plus
dire la même chose.

**Le vide ne ment plus.** « Ce projet ne porte encore aucune affirmation » était
vrai tant que le cerveau recevait tout ; la même phrase sous un filtre aurait
fait chercher le défaut dans le projet plutôt que dans la requête. Il dit
maintenant à quoi rien ne répond.

**La bascule est une bascule, et non un bouton de plus.** Deux moitiés accolées,
celle qu'on regarde marquée : la liste pour lire, le cerveau pour voir. Un bouton
isolé entre Exporter et Verser le faisait lire comme un outil, et l'on ne
pouvait pas deviner que le dessin obéit au même filtre.

**Une phrase de l'usage était devenue fausse** : « voir le raisonnement **en
entier** » ne décrit plus ce que le bouton fait. Elle vit à un seul endroit —
`services/usages-du-rejeu.js` —, et c'est ce qui a permis de la corriger une
fois.

### Ce qui reste

**Le cerveau ne connaît pas les natures.** Il colore par `NOEUD.SOCLE /
REJOUABLE / OPAQUE` — la **provenance** d'une valeur — et sépare par
`GENRE.VALEUR / FONCTION`. Il n'a jamais entendu parler de `NATURE.DECISION` ni
de `NATURE.RAISONNEMENT` : un filtre les lui donne, il les dessine comme des
nœuds ordinaires. Ce que § 22 annonce — *« une décision y sera un nœud d'un genre
nouveau, celui où la chaîne s'arrête et où quelqu'un a tranché »* — demande de
faire entrer `classifyAssertion` dans le constructeur de nœuds, et **deux `nature`
s'y croiseraient** : celle du nœud et celle de la taxonomie. Il faut d'abord
renommer l'une des deux ; le faire au passage aurait mêlé une correction de
vocabulaire à une correction de filtrage.

**Le filtre ne se change pas depuis le cerveau.** Il se change dans la liste, et
le cerveau le dit. Y ajouter un rail de natures rouvrirait la porte au second
état que cette étape vient de fermer : il faudrait que ce rail écrive dans
`view.query`, ce qui suppose un rappel du cerveau vers l'écran — faisable, et
c'est un travail distinct.

---

## 23. Incendie habitation, finir

Reprendre l'utilitaire pour régler les détails et compléter les manques. Sans
dépendance avec le reste du plan : il se glisse entre deux étapes.

À faire d'abord, quand on l'ouvrira : lister ce qui manque, précisément, plutôt
que de le reprendre au fil de l'eau. Un manque nommé se corrige ; un manque
ressenti se repousse.

---

## 24. Verser les contraintes du site

Le bouton **Verser › Verser les contraintes du site**, dans la Mémoire, lit les
faits de contexte du projet et écrit les contraintes déduites **directement** en
base — `derived-constraints-supabase.js`, `writeAssertions`. Pas de proposition,
pas de signature.

C'est le dernier de son espèce. L'étape 4 a fermé les deux autres (la
localisation, le découpage) ; celui-ci est resté parce qu'il n'était pas nommé
dans le plan.

### Pourquoi ce n'est pas seulement une entorse à la règle 1

**Il est doublé.** Depuis l'étape 3, l'Atelier climatique propose les mêmes
sujets — zone de neige, zone de vent, cote hors gel — par une proposition qu'on
signe, avec l'appel de l'agent et ce qu'il a lu. Deux chemins pour la même
connaissance, dont l'un écrit sans qu'on relise, et rien à l'écran ne dit lequel
a produit la ligne qu'on regarde. C'est la règle 4 sur un chemin d'écriture plutôt
que sur une valeur, et cela finira par se voir sur un projet réel : deux zones de
neige de provenances différentes, l'une signée, l'autre non.

**Il n'est pas identique pour autant.** Il verse aussi ce que l'Atelier ne
propose pas : le zonage sismique et l'argile, qui viennent de Géorisques et n'ont
pas d'écran de proposition. Le supprimer sans les reprendre ferait disparaître
ces deux-là.

### Ce qu'il faut trancher avant d'écrire du code

1. **Le bouton disparaît-il, ou devient-il une proposition ?** Un « verser » qui
   ouvre une proposition portant tout ce que les faits de contexte établissent
   est le geste le plus simple, et il garde le service rendu : reprendre en une
   fois ce qui a été calculé avant que la mémoire existe.
2. **Que fait-on de Géorisques ?** Le zonage sismique et l'argile n'ont pas
   d'atelier. Soit ils en gagnent un — ce qui est aussi ce que demande la moitié
   sismique de la cascade ([§ 21](#21-la-cascade-parallèle-la-démonstration)) —,
   soit la proposition ci-dessus reste leur seule porte.
3. **Que deviennent les lignes déjà versées par ce chemin ?** Elles restent :
   rien ne s'efface. Mais elles ne citent pas de proposition, et un écran qui
   demandera « qui a signé ceci » n'aura pas de réponse. Il devra le dire plutôt
   que d'inventer un signataire (règle 5).

### Ce qu'on ne fera pas

Laisser les deux chemins coexister « en attendant ». C'est ainsi qu'on se
retrouve avec deux mémoires, et le jour où elles divergent personne ne sait
laquelle fait foi.

---

## 25. Une seule saisie d'adresse, et la popup qui manque encore

### Ce que l'étape a posé

Trois écrans demandaient une adresse, et chacun la demandait à sa façon.

| où | ce que c'était | ce qu'il en coûtait |
| --- | --- | --- |
| Paramètres > Localisation | une auto-complétion d'adresse écrite à la main, avec deux branches mortes (commune, code postal) | 280 lignes qu'aucun champ n'appelait plus |
| Atelier > Neige, Vent & Gel | quatre champs nus : commune, code INSEE, code postal, altitude | personne ne connaît le code INSEE de sa commune ; le taper de mémoire, c'est calculer la neige d'une homonyme |
| Atelier > Tester une variante | quatre entrées séparées, une par colonne de la localisation versée | on tapait « 05023 » à la main dans un champ libre |
| Atelier > ENR - PV hangar neuf | une **seconde** auto-complétion, recopiée, qui cherche des **communes** et non des adresses | ni rue, ni numéro, ni coordonnées de parcelle |

Le champ vit maintenant à un seul endroit — `views/ui/saisie-adresse.js` pour le
champ, `services/adresse-saisie.js` pour ce qui se teste — et les trois premiers
écrans l'emploient. L'écran climatique a perdu son bouton « Calculer » : choisir
une adresse recalcule, reprendre celle du projet recalcule, et il n'y a plus rien
à cliquer entre deux essais sur un écran fait pour essayer.

### Ce que l'exploration a trouvé au passage

Deux fois la même faute, et c'est celle qui coûte le plus cher dans ce dépôt :
**`Number(null)` vaut zéro.**

- `mesureEcrite(null, 2, "m")` rendait `"0,00 m"`. Ce n'était pas qu'un
  affichage : `altitudeVersable` ne verse une ligne que si l'écriture n'est pas
  vide, si bien qu'un projet dont l'altitude était inconnue **proposait à la
  mémoire** une altitude de zéro mètre. Un site au niveau de la mer et un site
  qu'on n'a pas relevé devenaient la même ligne.
- `getEffectiveProjectLocation` et la carte des Paramètres convertissaient de
  même. Un projet sans coordonnées demandait une carte satellite du point
  0°N 0°E — au large du golfe de Guinée — au lieu de montrer qu'il n'avait pas
  de localisation.

Les deux sont refermées. `nombreOuRien` rejette `null`, `undefined` et la chaîne
vide **avant** la conversion, et zéro dit reste zéro : il y a des projets au
niveau de la mer.

### Ce qui reste

**La popup d'avertissement, et elle vaut son étape.** Trois écrans modifient
aujourd'hui quelque chose que la mémoire devra apprendre, et les trois s'y
prennent différemment :

| l'écran | ce qu'il fait au clic |
| --- | --- |
| Paramètres > Localisation | « Valider » range dans la fiche ; un **second** bouton, « Proposer à la mémoire », ouvre la proposition |
| Paramètres > Découpage | « Ajouter » / « Retirer » part **directement** sur une nouvelle proposition |
| Atelier > Neige, Vent & Gel | « Transformer › Faire une proposition » ouvre la proposition, puis **quitte l'écran** pour l'onglet Propositions |

Ce qu'il faut, et qui vaut pour les trois :

1. au clic sur Valider — localisation, ajout ou retrait d'une zone — une popup
   qui explique que la modification entrera dans une **proposition**, et qu'elle
   ne sera effective en mémoire **qu'après fusion** ;
2. Annuler / Continuer ;
3. si Continuer : créer une proposition, **ou** verser dans une proposition déjà
   ouverte et non fusionnée — le choix des branches existe déjà
   (`services/branches-ouvertes.js`, `views/ui/transformer.js`) ;
4. le compteur « Propositions » de la barre d'onglets se rafraîchit ;
5. **on reste sur l'écran d'origine.** Basculer vers Propositions > détail fait
   perdre le fil de ce qu'on était en train de régler, et c'est ce que fait
   l'atelier climatique aujourd'hui.

### Ce qu'on ne fera pas

Écrire une quatrième popup à côté des trois gestes. C'est exactement l'histoire
du champ d'adresse : trois copies d'une même question, qui avaient déjà divergé
avant qu'on les regarde.

---

## 26. Changer d'adresse ne change pas de commune

### Ce que l'étape a posé

La popup d'avertissement de [§ 25](#25-une-seule-saisie-dadresse-et-la-popup-qui-manque-encore),
partagée par les trois gestes qui passent par une proposition : Paramètres >
Localisation (sur « Valider »), Paramètres > Découpage (ajout, renommage,
retrait) et Atelier > Neige, Vent & Gel (« Transformer »). Elle montre ce qui
va être proposé — ce que la mémoire dit aujourd'hui, ce qu'on propose —, rappelle
que rien n'entre avant la fusion, laisse annuler, et demande où porter le lot.
Les trois **restent sur l'écran d'origine** ; le compteur de la barre d'onglets
se repose depuis `services/branches-ouvertes.js`.

La description d'une proposition s'écrit en Markdown, avec le champ des sujets
(`views/ui/redaction-markdown.js` câble les briques déjà partagées).

### Ce qu'un essai de variante a révélé

Un export de variante — l'adresse du projet passée de Saint-Michel-Chef-Chef à
Chamonix — ne recalculait **rien** : `recalculees: []`, `rejouees: []`, et huit
lignes « à revérifier » dont sept disaient « l'outil n'a pas répondu ». Ni les
zonages, ni la cote hors gel, ni les fondations.

La cause n'était pas le réseau.

| ce qu'on croyait | ce qui se passait |
| --- | --- |
| les agents-D n'ont pas été appelés | ils l'ont été, avec `code_insee = "Place de la Gare 74400 Chamonix-Mont-Blanc"` |
| l'outil est en panne | le serveur répondait 400, faute de trouver cette commune |
| la chaîne s'arrête aux fondations | elle s'arrête au **premier** maillon : rien n'ayant bougé, rien ne se propage |

La localisation se verse comme **un tableau d'une ligne à quatre colonnes** —
commune, code INSEE, code postal, adresse — et une seule entre dans un calcul :
le code INSEE. `agents-climatiques.js` le déclarait déjà (`champ: "codeInsee"`),
mais **personne ne lisait cette déclaration**, et les trois déductions
climatiques recopiaient `entree: "code_insee"` chacune de leur côté sans elle.
Le rejeu envoyait donc la colonne variée, quelle qu'elle soit, dans le champ du
code INSEE.

C'est réparé : la colonne visée voyage avec la substitution, les trois
déductions reprennent la déclaration partagée, et varier une colonne qu'un
utilitaire ne lit pas rend un refus nommé — « cet utilitaire lit bien ce sujet,
mais par une autre de ses colonnes » — au lieu d'un appel voué à échouer.

### Ce qui reste, et qu'il faut trancher

**Changer l'adresse d'un projet, dans la tête de celui qui le fait, c'est le
déplacer.** Le modèle, lui, a raison de dire que l'adresse ne décide de rien :
c'est le code INSEE qui commande. Les deux se rejoignent mal, et le refus nommé
ne fait que rendre le désaccord lisible.

Trois réponses possibles, et il faut en choisir une :

1. **La variante d'une localisation porte la ligne entière.** On choisit une
   adresse dans le champ partagé ; le service rend commune, code INSEE, code
   postal et coordonnées ; les quatre colonnes se substituent d'un coup. C'est ce
   que l'utilisateur croit faire, et c'est la seule qui fasse repartir toute la
   chaîne. Il faut alors que `substitutions` accepte plusieurs colonnes d'un même
   sujet — aujourd'hui c'est une valeur par identifiant.
2. **L'écran n'offre que le code INSEE.** Les trois autres colonnes cessent
   d'être des valeurs qu'on fait varier. Honnête, et frustrant : on ne peut pas
   « essayer Chamonix » sans connaître son code INSEE.
3. **On laisse comme maintenant** : quatre colonnes, trois refus nommés. Le
   moins de code, et le plus d'explications à donner à chaque nouvel arrivant.

La 1 est la bonne, et elle demande de toucher au rejeu.

### Ce que l'essai a montré d'autre, et qui n'est pas ce défaut

- **L'altitude ne se rejoue pas avec la localisation.** Elle est un sujet à part
  (`Altitude du site`), versé par le même geste mais varié séparément. Déplacer
  un projet de 13 m à 1 035 m demande donc deux variantes. Si la réponse 1
  ci-dessus est retenue, l'altitude devrait suivre l'adresse choisie — le relief
  se lit aux coordonnées.
- **La mémoire de l'essai portait chaque zonage en double** : une ligne
  `base-datum` signée par la proposition 64, et une ligne `site-constraint` sans
  proposition. C'est exactement le doublon décrit en
  [§ 24](#24-verser-les-contraintes-du-site), constaté sur un projet réel.
- **`H0 retenu pour le département` est rangé « à revérifier » sans être
  rejoué**, alors que `agent_d_profondeur_hors_gel_V1` le pose. Sa ligne le cite
  comme lecture avec une valeur vide. À reprendre avec la réponse 1.

---

## 27. Une seule localisation, et un projet qui n'a pas d'adresse

### Ce que l'étape a posé

La **réponse 1** de [§ 26](#26-changer-dadresse-ne-change-pas-de-commune), et ce
qu'elle a entraîné.

**La localisation a six colonnes.** Les coordonnées entrent dans la ligne versée,
au même titre que la commune : `commune`, `codeInsee`, `codePostal`, `adresse`,
`latitude`, `longitude`. Ce n'est pas une colonne de confort — c'est ce qui
permet à un projet **sans adresse** d'exister en mémoire, et de dire qu'il a
bougé de cent mètres.

**La variante porte la ligne entière.** Choisir une adresse remplace les six
colonnes d'un coup, et l'écran les liste avant qu'on calcule. Changer l'adresse
d'un projet, c'est le déplacer.

**Le déplacement se mesure.** `services/localisation-mouvement.js` : Haversine,
seuil à 50 m, et quatre issues qui ne se confondent pas — changement de commune,
déplacement dans la commune, écriture corrigée, ou *on ne sait pas*. Le code
INSEE ne suffisait pas : Briançon fait vingt-huit kilomètres carrés et mille
mètres de dénivelé, et deux points de la même commune n'ont ni la même altitude
ni la même cote hors gel. À l'inverse, corriger « bât. B » dans une adresse ne
déplace rien, et rejouer toute la chaîne pour cela apprend à ignorer l'écran.

**On peut pointer sur la carte.** `ui/carte-a-pointer.js` : un voile transparent
sur la vue satellite, un glissement qui recentre, un appui long qui pose le
projet, un viseur au milieu. Le service d'adresses rend la commune **à l'envers**
depuis les coordonnées, si bien qu'un terrain au milieu d'un champ a un code
INSEE comme les autres. Il ne rend pas d'adresse : celle du voisin n'est pas
celle du projet (règle 5).

Le bouton **Calculer** revient, et pour ce cas seul : on repose le marqueur trois
fois avant de reconnaître la parcelle, et recalculer à chaque pose ferait trois
appels au serveur pour un seul endroit. Une adresse choisie, elle, recalcule
toujours d'elle-même.

**La recherche par les mots qu'on emploie.**
`services/recherche-de-valeur.js` : « localisation » n'est le nom d'aucune
colonne — c'est celui du tableau qui les porte —, et « GPS », « ville »,
« terrain », « où » ne sont écrits nulle part. Le tableau porteur se cherche
maintenant aussi, et les synonymes sont **déclarés**, pas devinés.

### Le doublon, ce qui en reste

« Une seule localisation doit vivre dans l'application. » La **définition** l'est
maintenant : une structure, un constructeur (`localisation-versement.js`), un
lecteur. Deux copies subsistent, et aucune n'a été retirée dans cette étape :

| la copie | où | pourquoi elle n'a pas sauté ici |
| --- | --- | --- |
| `projectForm.communeCp` | la fiche du projet | une chaîne « Annecy 74000 » qui redit `city` + `postalCode`, dérivée à deux endroits et **reparsée** à un troisième. Six lecteurs, dont le contexte du copilote et le lanceur d'analyses : la retirer se fait, mais pas au milieu d'une étape qui touche déjà au rejeu |
| les zonages en `site-constraint` | la mémoire | c'est le bouton « Verser les contraintes du site » de [§ 24](#24-verser-les-contraintes-du-site), qui écrit **directement**. Le doublon est celui des zonages, pas celui de la localisation, et il a son étape |

### Trois corrections d'usage

**La carte suit le doigt.** Le fond et les marqueurs sont déplacés en bloc
pendant qu'on tire ; le viseur ne bouge pas — il marque le centre de l'écran,
pas un endroit. Un défaut s'est révélé en le branchant : **un rendu au milieu
d'un glissement tue le geste**, parce qu'il remplace le voile et que la capture
du pointeur meurt sur un nœud détaché. Une lecture différée qui rappelle son
écran — les propositions ouvertes, une vue satellite qui arrive — suffisait à le
provoquer. La carte prévient donc son écran par `quandGeste`, et l'écran ne
redessine pas tant qu'un geste dure.

**Deux marqueurs ne se ressemblent plus.** Celui d'où l'on part passe en bleu,
plus petit, translucide ; celui qu'on vient de poser prend le rouge et la
taille. La carte se recentre dessus, et la consigne change de sens et de couleur
— « Nouvel endroit posé. Cliquez sur *Calculer ici* pour actualiser les
valeurs ». Deux rouges de la même taille sur une carte non centrée, avec une
consigne qui décrivait un geste déjà fait : on ne comprenait pas qu'il en
restait un.

**La localisation est *une* valeur dans la variante.** Elle s'y proposait en six
— commune, code INSEE, code postal, adresse, latitude, longitude — dont cinq
n'ont aucun sens seules. La structure déclare maintenant `enBloc`, et un tableau
dont toutes les colonnes le disent se propose comme une seule valeur qui se
remplace d'un coup. La déclaration voyage avec la ligne versée : l'écran n'a
aucun nom de sujet à connaître.

Le champ de la variante est alors le même que celui des Paramètres : une saisie
d'adresse, et le lien bleu vers la recherche approfondie — carte comprise.

### Ce qui reste

1. **`communeCp` disparaît.** Les six lecteurs prennent `city` et `postalCode`,
   et le champ de saisie de la création de projet garde son brouillon à lui.
2. **L'altitude suit la localisation.** Elle est encore un sujet à part, varié
   séparément : déplacer un projet de 13 m à 1 035 m demande deux variantes. Le
   relief se lit aux coordonnées ; l'altitude devrait entrer dans la ligne portée
   par une adresse choisie, comme le reste.
3. **`H0 retenu pour le département` ne se rejoue pas.** Il est rangé « à
   revérifier » alors que `agent_d_profondeur_hors_gel_V1` le pose, et sa lecture
   est citée avec une valeur vide.
4. **La carte se repose au relâchement.** Elle suit le doigt pendant qu'on tire
   — c'est un déplacement de ce qui est déjà chargé, et les bords découvrent du
   vide —, puis la vue est redemandée : une `iframe` se recharge à chaque
   changement de centre, et un rechargement par pixel donnerait un clignotement
   continu. Une vraie carte à tuiles ferait mieux, au prix d'une bibliothèque et
   d'un second fond de carte à côté de celui qu'on emploie partout.
5. **`enBloc` n'a qu'un usage.** La localisation. Le mécanisme est général — il
   se lit sur la structure, sans nom de sujet —, mais tant qu'un seul tableau le
   déclare, on ne sait pas s'il tiendra pour un autre.

---

## 28. Ce qui reste en cache finit par mentir

### Deux fraîcheurs, deux mensonges

**Le menu « Transformer » proposait une proposition fusionnée.** Le magasin des
propositions ouvertes gardait sa liste pour la vie de la page : un cache qui ne
se rafraîchit qu'au rechargement n'est pas un cache, c'est une photo. Sur un
projet où deux personnes travaillent en même temps — le cas ordinaire —, cela
veut dire offrir d'ajouter un lot à une branche qu'un collègue vient de fermer.

Le bouton scindé annonce maintenant l'ouverture de son menu
(`ghaction:menu-ouvert`), et le magasin relit à ce moment-là. C'est le seul
instant où la fraîcheur compte : un appel par clic, pas un par rendu.

**L'Atelier climatique affichait l'ancienne adresse.** On corrigeait la
localisation dans les Paramètres, on signait la proposition, on ouvrait
« Neige, Vent & Gel » — et l'adresse d'avant était encore dans le champ. Le
calcul serait parti sur celle-là. C'est le genre de chose qui coûte plus cher
qu'une panne franche : rien ne dit que c'est faux.

La cause était double : l'écran gardait sa localisation d'un montage à l'autre
« pour ne pas perdre une saisie en cours », et il la prenait de la **fiche** du
projet, qui n'est mise à jour qu'à l'entrée dans le projet. Il la relit
maintenant **dans la mémoire**, à chaque venue et sur « Reprendre la
localisation du projet » — voir `services/localisation-du-projet.js`. La mémoire
est la seule qui dise où le projet est aujourd'hui : c'est ce que quelqu'un a
signé.

### `communeCp` n'existe plus

Le doublon nommé en [§ 27](#27-une-seule-localisation-et-un-projet-qui-na-pas-dadresse) est
retiré. « Annecy 74000 » était écrit à côté de `city` et `postalCode`, dérivé à
deux endroits et **reparsé** à un troisième. Il se calcule là où on en a besoin
(`communeEtCodePostal`), et ne se range plus nulle part.

Une seule lecture reste, et c'est voulu : les Paramètres reprennent le champ
d'un projet enregistré **avant** ce changement, dont l'état local le porte
encore. L'ignorer lui ferait perdre sa commune.

### La carte, telle qu'on s'en sert

| ce qui a changé | pourquoi |
| --- | --- |
| on **tire le marqueur** au lieu d'appuyer longuement | rien à l'écran ne dit qu'un appui long existe, et l'on ne découvre un geste caché que si quelqu'un vous le montre |
| la roulette zoome, les crans s'accumulent | sans mémoire des crans, chacun repartirait du zoom de l'état — qui n'a pas encore bougé — et douze crans en feraient un |
| on charge 280 px **au-delà** du cadre | tirer la carte découvrait du vide : on ne voyait pas où l'on allait, ce qui est précisément ce qu'on cherche en la déplaçant |
| le viseur devient une lunette de 72 px | le `+` se confondait avec le bouton de zoom et disparaissait sur une parcelle claire |
| la consigne d'attente garde son fond noir | l'ambre passait derrière un texte en gris atténué, hérité du bloc porteur, et l'on ne lisait plus rien |
| les cartes d'information tiennent dans la hauteur de la vue | quatre cartes suffisaient à les faire déborder sous le bas, où elles flottaient sur le fond de l'écran |
| l'altitude ne s'écrit plus sous le code postal | la carte « Neige » la porte déjà, et deux fois la même mesure à trente centimètres l'une de l'autre fait chercher la différence |

### Ce qui reste

1. **La hauteur du bâtiment, et les coefficients qui en découlent.** L'objectif
   dit : une hauteur, une orientation des vents dominants, et les coefficients
   de rugosité et de direction qui s'en déduisent. Rien n'en est fait ici ; la
   carte a été dessinée en sachant qu'elle devra un jour porter un secteur
   angulaire par-dessus la parcelle.
2. **La carte se repose au relâchement.** Elle suit le doigt pendant qu'on tire,
   mais la vue est redemandée à la fin : une `iframe` se recharge à chaque
   changement de centre. La marge de 280 px repousse le problème, elle ne le
   supprime pas — au-delà, on tire dans du vide. Une vraie carte à tuiles ferait
   mieux, au prix d'une bibliothèque.
3. **Les zonages en `site-constraint`** restent le doublon de
   [§ 24](#24-verser-les-contraintes-du-site).

## 29. Une carte qu'on ne recrée pas

Le défaut se voyait à l'œil nu : on tirait la carte, on relâchait, et **une page
blanche s'allumait** avant que la vue satellite ne revienne. « Ça pique les
yeux. » L'API Google fonctionne pourtant très bien toute seule — c'est nous qui
cassions son fonctionnement.

### D'où venait le clignotement

L'écran redessinait son HTML à chaque changement d'état, et la carte était
dessinée *dans* ce HTML. Réécrire l'écran détruisait donc l'`iframe` de la vue
satellite ; le navigateur en recréait une, vide, et la rechargeait depuis zéro.
Trois quarts de seconde de blanc, à chaque relâchement de la souris.

Réinsérer le **même** nœud ne suffit pas : un navigateur recharge une `iframe`
qu'on détache et rattache. Il fallait donc qu'elle ne soit **jamais** détachée.

### Ce que ça change dans le composant

`views/ui/carte-a-pointer.js` ne rend plus une chaîne de caractères. Il se lit en
trois temps :

| ce que c'est | quand |
| --- | --- |
| `creerLaCarteAPointer` | **une fois** : elle rend un élément, que l'écran garde |
| `brancherLaCarteAPointer` | une fois, sur cet élément |
| `majCarteAPointer` | à chaque changement : elle **patche** ce qui a bougé |

La mise à jour ne touche à l'adresse de l'`iframe` **que lorsqu'elle change** :
la réécrire à l'identique la rechargerait tout autant. Le marqueur se déplace en
réécrivant sa transformation, les boutons de zoom s'allument ou s'éteignent, et
rien d'autre n'est recréé.

Les deux écrans qui la portent ont suivi la même règle : la coquille se dessine
une fois, et les zones qui changent se repeignent l'une après l'autre autour
d'une carte qui, elle, ne bouge pas de son conteneur. Réattacher **le même
nœud** ne suffit pas non plus : la carte n'est rattachée que si elle ne l'est
pas déjà, parce qu'un `appendChild` sur un enfant qu'on a déjà revient à le
retirer puis à le remettre.

### Une carte qu'on ne voyait pas, et un marqueur qu'on ne pouvait pas poser

Trois défauts sont sortis du même changement, et tous les trois se voyaient dès
l'ouverture de l'agent-d climatique.

| ce qu'on voyait | pourquoi |
| --- | --- |
| pas de carte du tout | la localisation d'un projet enregistré **avant** la ligne à six colonnes n'a pas de coordonnées, et la carte n'avait rien à centrer |
| deux marqueurs superposés | la vue était demandée en mode `place`, qui plante le marqueur de Google au point demandé — le sien, plus le nôtre |
| l'écran noir après un glissement | l'écran se redessinait entièrement, ce qui détachait la carte |

Le premier a demandé un appel de plus : le **centre de la commune**, d'après son
code INSEE. C'est un endroit d'où regarder, et rien d'autre — aucun marqueur ne
s'y pose, parce que le centre d'une commune n'est pas le projet (règle 5).

Ce qui a fait apparaître le quatrième : sans marqueur, « tirez le marqueur » est
une consigne qu'on ne peut pas suivre. Un **clic pose le premier**, et la
consigne le dit ; une fois posé, il se déplace, et un clic ailleurs ne le
téléporte plus par mégarde.

### La commune, résolue depuis un point

L'alerte « aucune commune trouvée à cet endroit » s'affichait presque toujours,
et elle était fausse : à part en mer, un point français est dans une commune.
On interrogeait la base **d'adresses** à l'envers — elle ne rend rien au milieu
d'un champ, ce qui est exactement le cas qu'on voulait couvrir.

La question se pose maintenant à la base des **communes**
(`geo.api.gouv.fr/communes?lat=…&lon=…`), qui répond par le découpage
administratif et non par le voisin le plus proche. Un projet dans un pré a donc
son code INSEE, donc ses zonages.

L'alerte, elle, n'est plus qu'une : elle s'affichait à la fois sur la carte, sous
le champ et dans le bandeau, pour un seul et même échec.

### Ce qui a été retiré

Les phrases d'explication que l'écran répétait — « ce avec quoi le calcul
part… », « un projet qui n'est pas encore construit n'a pas d'adresse… »,
« Nouvel endroit posé. Cliquez sur Calculer ici… » —, le bouton « Poser le
projet au centre », le marqueur bleu de l'ancien emplacement et la consigne
d'attente qui lui allait avec. Le geste est devenu assez direct pour se passer
de son mode d'emploi : on tire le marqueur, et le calcul suit.

### Ce qui reste

1. **La carte se repose toujours au relâchement.** Elle suit le doigt pendant
   qu'on tire, et la vue est redemandée à la fin. Ce n'est plus visible — la
   vue précédente reste à l'écran jusqu'à ce que la suivante soit prête —, mais
   c'est encore une image fixe qu'on déplace, avec ses 280 px de marge. Une
   vraie carte à tuiles ferait mieux, au prix d'une bibliothèque.
2. **La hauteur du bâtiment**, toujours, comme au
   [§ 28](#28-ce-qui-reste-en-cache-finit-par-mentir).

## 30. Quatre colonnes qui varient, une seule qu'on gardait

Changer l'adresse du projet, et **rien ne se recalculait**. L'écran de variante
rangeait les sept lignes de la chaîne climatique dans « à revérifier », toutes
avec le même motif : « cet utilitaire lit bien ce sujet, mais par une autre de
ses colonnes ». Un refus qui dit vrai sur ce qu'on lui montre, et faux sur ce
qu'on vient de faire — on venait précisément de changer de commune.

### Le rangement qui perdait trois colonnes sur quatre

Changer l'adresse d'un projet, c'est le déplacer : l'écran remplace donc la
ligne entière, ce qui fait **quatre substitutions sur le même sujet** —
commune, code INSEE, code postal, adresse.

Le rejeu les rangeait dans une table à **une entrée par sujet** :

```js
substituees.set(sujet, { valeur, colonne });   // la suivante écrase la précédente
```

Il n'en restait donc qu'une, la dernière dans l'ordre de la structure versée :
l'adresse. Or les zonages déclarent lire le code INSEE (`champ: "codeInsee"`).
Ils voyaient une variation sur l'adresse, la refusaient — à juste titre, c'est
le garde-fou du tour précédent —, et la chaîne s'arrêtait avant son premier
maillon.

Le sujet porte maintenant **toutes** ses colonnes variées, et chaque utilitaire
y prend celle qu'il déclare lire. À défaut, une substitution qui ne nomme pas de
colonne — c'est ainsi qu'on fait varier un sujet entier, et ce chemin existait
avant les colonnes. Sinon rien, et le refus retrouve son sens.

Les deux reprises — celle des utilitaires, celle des fonctions natives —
construisaient cette table chacune de leur côté. Elles partagent désormais
`sujetsSubstitues` : une valeur écrite à deux endroits finit par diverger
(règle 4), et celle-ci avait déjà commencé.

### La recopie qui avait perdu sa colonne

Le second défaut est le même que le premier, un étage plus bas.
`deduction_zone_sismique_georisques_V1` **recopiait** la déclaration de lecture
de la localisation au lieu de partager `LIT_LA_LOCALISATION`, et la copie avait
perdu `champ: "codeInsee"`. Sans colonne déclarée, la lecture prenait la
première substitution venue — le nom de la commune, dans le champ du code
INSEE. C'est exactement le 400 que `champ` existe pour empêcher, revenu par une
recopie.

Le test qui gardait les trois déductions climatiques ne la couvrait pas : elle y
est maintenant, et un second test vérifie l'autre face — que chacune reçoit bien
le code INSEE quand la ligne entière varie.

### Ce qui reste

1. **L'appel emporte encore l'ancienne commune.** Le rejeu réutilise la charge
   du dernier appel et n'y remplace que les champs déclarés : le code INSEE est
   le nouveau, `city` et `postal_code` sont ceux d'avant. Le serveur décide par
   le code INSEE, donc le calcul est juste ; c'est la phrase de provenance qu'il
   rend qui pourrait nommer la mauvaise commune. Les colonnes muettes n'ont pas
   d'`entree` par lequel entrer, et leur en donner un les ferait décider de
   quelque chose — ce qu'elles ne font pas.
2. **L'altitude ne suit pas la commune.** Déplacer un projet change son
   altitude, et la cote hors gel en dépend. La variante ne fait varier que ce
   qu'on lui donne : elle rejoue le hors gel avec la nouvelle commune et
   l'ancienne altitude. Il faudrait que la localisation entraîne l'altitude,
   comme elle entraîne les zonages.
3. **La zone de sismicité ne se rejoue toujours pas** : son calcul reste chez
   Géorisques, et elle le dit. C'est la règle 5, pas un défaut.

## 31. La chaîne sismique, et trois versions d'une même ligne

Deux choses dans ce tour : un rejeu qui comptait l'histoire pour du présent, et
la moitié manquante d'une démonstration.

### Rejouer ce qui vaut, et non ce qui a valu

« Profondeur hors gel, zone de neige et zone de vent se rejouent 4 fois. »
Elles ne se rejouaient pas quatre fois : **quatre lignes différentes se
rejouaient une fois chacune**, et trois d'entre elles ne décrivaient plus le
projet.

Le projet avait corrigé sa localisation trois fois. Chaque correction avait
remplacé la zone de neige, et les trois versions vivaient dans la mémoire —
c'est voulu, c'est ce qui permet de lire « le projet a cru A2 pendant six
mois ». Mais deux d'entre elles portaient `superseded_by`, et
`contraintesAReprendre` ne le regardait pas. `fonctionsAReprendre` le regardait
depuis toujours ; l'écart ne se voyait pas tant qu'un sujet n'avait pas été
corrigé deux fois.

Treize reprises sont redevenues sept.

### Ce qui reste double, et pourquoi

Sur ces sept, il y a encore **deux lignes par sujet** : une `base-datum` versée
par proposition, une `site-constraint` versée par l'ancien chemin automatique.
Ce n'est pas un défaut du rejeu — les deux existent vraiment dans la mémoire, et
les cacher à l'écran ferait mentir la variante sur ce que le projet porte. C'est
le doublon de [§ 24](#24-verser-les-contraintes-du-site), et il se règle en
cessant de verser le second, pas en le masquant.

### La zone de sismicité savait tout, sauf revenir

Le spectre déclare lire la zone de sismicité depuis le premier jour, et sait se
rejouer sans réseau. La zone, elle, répondait « cet utilitaire ne sait pas se
rejouer : son calcul reste au serveur ». Vrai, et inutile : la chaîne
**localisation → zone → spectre** s'arrêtait sur son premier maillon, alors que
c'est elle qui porte la démonstration entière — déplacer un projet change tout
ce qui se dimensionne au séisme.

Il manquait trois choses :

| ce qui manquait | ce qui a été fait |
| --- | --- |
| personne ne déclarait ces deux aléas | `utilitaires/agent-risques-naturels.js`, l'agent-D RNT |
| le rejeu ne savait parler qu'à l'outil climatique | un registre de services, `climat` par défaut, `georisques` en second |
| l'aléa argileux ne déclarait **rien** | il lit le point du projet, et le dit |

### Deux mailles, et c'est tout le sujet

Le zonage sismique est **communal** par décret ; l'aléa argileux se lit **au
point**. Ce sont donc deux lectures de la même ligne de localisation, par des
colonnes différentes — le code INSEE d'un côté, les coordonnées de l'autre.

La conséquence se vérifie : déplacer un projet de cent mètres dans sa commune
rejoue l'aléa argileux et **refuse** la zone sismique, en disant que la colonne
variée n'entre pas dans son calcul. Changer de commune fait l'inverse. C'est
exactement ce que `champ` sert à dire, et ce qui permet à un projet sans
coordonnées d'avoir sa zone sismique sans qu'on lui invente une exposition
argileuse (règle 5).

### Ce qui reste

1. **L'écran RNT verse encore directement.** Il interroge Géorisques et écrit
   ses faits de contexte sans passer par une proposition, ce qui est le chemin
   que `docs/fondamentaux.md` interdit (règle 1) et la source du doublon du
   § 24. L'agent est déclaré ; l'écran, lui, n'a pas encore été refait à la
   manière de « Neige, Vent & Gel ».
2. **L'interrogation Géorisques reste au navigateur.** C'est ce que l'écran fait
   déjà, et le service est public — aucune clé à protéger. Le jour où elle passe
   au serveur, seule l'entrée `georisques` du registre change.
3. **L'altitude ne suit toujours pas la commune**, comme au
   [§ 30](#30-quatre-colonnes-qui-varient-une-seule-quon-gardait).

## 32. La variante devient un geste qu'on demande

« Tester une variante » était un **écran** : on cherchait une valeur dans une
liste, on tapait la nouvelle, on cliquait. Tout le raisonnement était là — ce qui
dépend, ce qu'il faut rejouer, ce qui bouge et ce qui casse — et il fallait
savoir où cliquer pour l'atteindre.

Il devient un outil du copilote. « Quelles conséquences si je change l'adresse
pour avenue de l'Aiguille à Chamonix ? » se répond maintenant par des chiffres
calculés : la commune est résolue, les six colonnes de la localisation sont
remplacées, les zonages, la cote hors gel, la zone de sismicité, le spectre et
les fondations se rejouent, et le modèle raconte ce qui a bougé.

### Le même moteur, jamais un second

`rejouerLesUtilitaires` puis `consequencesDeLaVariante` : la suite exacte que
l'écran exécute, dans le même ordre, avec les mêmes services. Ce qui est neuf
n'est pas le calcul, c'est **la façon de le demander** — deux mots au lieu d'un
parcours d'écran :

| ce que fait `services/variante-demandee.js` | pourquoi c'était nécessaire |
| --- | --- |
| trouve dans la mémoire ce que « l'adresse du projet » désigne | le modèle parle en français, pas en identifiants d'affirmation |
| résout l'adresse avant de la substituer | « avenue de l'Aiguille » n'est pas une localisation tant qu'un service d'adresses n'en a pas fait un code INSEE |
| refuse quand deux valeurs se valent | choisir la première ferait varier l'altitude quand on parlait du sol |
| résume ce qui bouge | le rendu entier porte les lignes de mémoire complètes : vingt fois trop pour une réponse écrite |

### Où il s'exécute, et pourquoi ce n'est pas au serveur

C'est **la seule exception** à « les utilitaires s'exécutent au serveur », et elle
se défend en une phrase : le moteur de variante *est déjà* dans la page — c'est
l'écran que n'importe qui ouvre depuis l'Atelier. Le porter au serveur en ferait
une seconde implémentation du même raisonnement, et deux réponses à une même
question finissent par diverger (règle 4).

Ce qui reste au serveur est ce qui devait y rester : **la déclaration** de
l'outil et les consignes qui règlent quand le modèle l'appelle. Le navigateur
n'apprend même pas son nom — le serveur marque l'appel `ou: "navigateur"`, et la
boucle route dessus. Le garde-fou de `scripts/prepare-utilitaires.mjs` continue
de refuser que `variante-outil.js` descende dans la page.

### Une recherche qui lit une phrase

Elle comparait la requête **d'un bloc** : « adresse » répondait, « l'adresse du
projet » ne répondait rien. Tolérable dans un champ de recherche où l'on tape un
mot ; impossible quand la demande arrive en français. Les articles sont
maintenant retirés et chaque mot est essayé, le meilleur l'emporte — ce qui
corrige au passage la recherche de l'écran, où « la localisation » ne trouvait
rien non plus.

Et l'ambiguïté ne se déclare plus qu'entre **égaux** : chercher « altitude »
ramenait « Altitude du site », qui s'appelle ainsi, et « longitude », dont la
description mentionne l'altitude. Les mettre sur le même plan faisait demander de
choisir entre les deux.

### Ce qui reste

1. **La conversation ne garde pas la variante.** Le résumé part au modèle, le
   rendu complet reste dans l'exécution — mais rien ne permet encore d'ouvrir
   depuis la conversation la variante que le copilote vient de calculer, ni de
   la porter dans l'écran. C'est le lien qui manque entre les deux.
2. **Une seule variante à la fois.** Le modèle ne peut faire varier qu'une
   valeur par appel. « Et si on déplaçait le projet *et* qu'on montait d'un
   étage ? » demande deux appels, et leurs conséquences ne se composent pas.
3. **Le doublon du [§ 24](#24-verser-les-contraintes-du-site) se voit ici aussi** :
   le résumé rend « Zone de neige A1 → E » deux fois, parce que la mémoire porte
   deux lignes pour ce fait.

## 33. Le doublon du § 24 cesse de se voir, il ne cesse pas d'être

La variante annonçait deux fois « Zone de neige : A1 → E ». La cause est celle
du [§ 24](#24-verser-les-contraintes-du-site) : une même valeur porte deux lignes
en mémoire — celle versée par une proposition, et une ancienne contrainte de
site écrite **directement** par un écran, hors proposition, du temps où cela se
faisait. Les deux déclarent lire la localisation, donc les deux se rejouaient.

Le rejeu ne retient plus qu'une reprise **par sujet et par portée**, la plus
récemment décidée. Sur le projet d'essai, sept recalculs deviennent quatre, et
les trois écartés étaient des vestiges — l'un d'eux calculait encore d'après une
commune que le projet a quittée.

**Ce n'est pas la réparation.** La mémoire porte toujours deux lignes, et la
cause est toujours là : un écran verse encore directement, ce que la règle 1
interdit. Ce qui est corrigé, c'est qu'on ne le montre plus deux fois — autre
chose, et qui se dit franchement.

Deux portées d'un même sujet restent bien deux reprises : la zone de neige du
bâtiment A et celle du bâtiment B sont deux valeurs, et les fondre en perdrait
une.

### Ce qui le fermera

Refaire l'écran RNT et l'écran climat à la manière de « Neige, Vent & Gel » :
proposer au lieu de verser. Le jour où plus rien n'écrit directement, les lignes
`site:*` cessent d'apparaître et la déduplication devient sans objet — on la
retirera alors plutôt que de la garder par prudence.

## 34. Quarante-cinq extracteurs, ou un seul appel · *tranché, et fait*

Cette ligne quittait le carnet le jour où l'un des trois signaux qu'elle
nommait se produirait. **Deux se sont produits en même temps**, et un troisième
s'y est ajouté qu'elle n'avait pas prévu.

### Ce qui a tranché

**Le nombre de formes, et non le nombre d'organismes.** Un bureau de contrôle ne
produit pas un rapport, il en produit une famille : RICT, fiche d'examen de
document, fiche de travaux, rapport d'étape, RFCT, RVRAT. Le carnet comptait les
packs par organisme ; il fallait les compter par **forme × organisme**.

**Les maquettes changent.** SOCOTEC vient de refaire toutes les siennes. Un
extracteur calé sur une mise en page n'est pas un actif, c'est une dette dont
l'échéance est fixée par quelqu'un d'autre.

**Et surtout : l'extraction en dur perdait l'essentiel.** Sur « Neige —
Favorable », elle laissait tomber « Région A2, altitude 260 m ». Autrement dit
elle gardait le verdict et jetait **ce qui avait été examiné**. Un engagement
qu'on ne peut pas confronter à une valeur ne se vérifie pas, et tout le
mécanisme des étapes 1 à 4 repose là-dessus. Ce n'était plus une question de
maintenance : la lecture ne rendait pas la donnée dont le reste a besoin.

### Ce qui a été fait

`supabase/functions/extract-avis` — un appel par pièce, au serveur. La clé et la
consigne n'entrent jamais dans le navigateur : il envoie des pages, il reçoit
des avis.

Le schéma demande ce que l'extraction en dur ne rendait pas :

| champ | ce que c'est |
| --- | --- |
| `intitule` | ce qui a été examiné, tel qu'écrit |
| `teneur` | le code **tel qu'écrit** — F, S, A, R… jamais traduit |
| `teneur_libelle` | ce que la légende du document en dit |
| **`constat`** | ce que le bureau a écrit en plus du verdict |
| `citation` | la ligne d'où l'avis sort, recopiée mot pour mot |
| `legende` | les codes et leur sens, **lus dans le document** |

La légende lue dans le document est ce qui rend la lecture indépendante de
l'émetteur : « A : Acceptable » chez l'un, « F : Favorable » chez l'autre, et
rien à écrire dans le code pour le second.

### Le garde-fou, et il est mécanique

Un modèle peut inventer une ligne entière — un avis plausible sur un point
plausible —, et rien dans sa réponse ne le trahit. Ce qui le trahit, c'est le
**document** : chaque avis porte sa citation, et cette citation est recherchée
dans le texte de la page **au serveur, avant la réponse**. Ce qui ne s'y
retrouve pas est écarté, et le compte de ce qui a été écarté se dit à l'écran.

La comparaison ignore ce que la typographie d'un PDF fait aux chaînes — espaces
doublés, insécables, apostrophes courbes — sans quoi on jetterait de vrais avis
pour des raisons de mise en page. Et une page annoncée fausse ne fait pas perdre
l'avis : elle se corrige, parce qu'un lien vers la mauvaise page ferait échouer
la vérification humaine sur une ligne pourtant juste.

### Ce qui n'a pas été fait, et pourquoi

**L'extraction en dur reste.** Elle n'est pas retirée : elle sert encore quand la
relecture échoue, et elle est le point de comparaison. Le choix se fait
**document par document** — un lot dont un seul rapport a pu être relu garde
l'extraction en dur pour les autres.

**La relecture ne se lance pas d'office.** Un appel par pièce sur un lot qu'on ne
verse peut-être pas ferait payer une lecture que personne n'a demandée. Elle
s'offre, elle ne s'impose pas.

### Ce qui reste à décider, une fois qu'on aura mesuré

Faut-il retirer l'extraction en dur ? La réponse ne s'écrit pas d'avance : elle
demande de les avoir fait tourner côte à côte sur un vrai corpus, et de savoir ce
que chacune trouve que l'autre manque. C'est ce que le choix par document rend
possible.


## 35. Ce qu'une variable touche, sans montrer la plomberie

Devant un constat, la question est : **est-il raccroché à ce que je crois ?**
Elle vient d'être fermée là où elle se posait le plus — sur un avis, qui dit
maintenant ce qu'il couvre, par le nom du sujet et rien d'autre.

Elle reste ouverte ailleurs, et de trois façons qui ne se valent pas.

### Ce qu'on ne fera pas : dérouler les liens sur chaque détail

Montrer, sur chaque affirmation, les lectures enregistrées, les identifiants et
les règles qui la touchent, c'est exposer la mécanique. Cela ne répond pas à la
question — cela l'enterre sous ce qui n'est pas elle. Le cerveau du projet
existe pour ça, et c'est là que la forme du raisonnement se regarde.

### Ce qui vaut mieux : un filtre dans la Mémoire

« Montre-moi ce qui touche à *Zone de neige* » se demande une fois et se lit
d'un coup, au lieu de se reconstituer d'écran en écran. La requête sait déjà
filtrer par nature, par domaine et par état ; il lui manque **par variable**.
C'est peu de code et c'est le bon endroit — sous les données de base, comme
demandé.

### `variables-du-projet.ref` le dit maintenant · *fait*

Chaque variable porte un champ de plus :

```
const Zone de neige = {
   type: "texte",
   description: "…",
   utilisation: "…",
   ce que le projet en dit: "1 contrainte · 2 constats",
   déjà utilisé dans: [ … ]
};
```

**Par nature, jamais en un seul nombre.** Trois constats et une contrainte ne
sont pas quatre de la même chose : une contrainte tranchée par un texte pèse
autrement qu'une hypothèse que personne n'a confirmée. Et l'ordre suit ce poids
— c'est la plus lourde qu'on veut lire d'abord.

**Ce qui a été remplacé ne compte pas** : ce que le projet *dit* est ce qu'il
tient aujourd'hui.

**« Rien » est la réponse la plus utile**, et c'est pour elle que le champ
existe :

```
   ce que le projet en dit: "rien — aucune affirmation du projet ne porte ce nom",
```

Un nom qu'une règle cite et qu'aucune affirmation ne porte est un trou du
raisonnement : la règle s'appuie sur ce que personne n'a versé. Le taire
reviendrait à ne montrer que ce qui va bien (règle 5).

Le champ est **absent** — et non vide — quand la carte des natures n'a pas été
demandée : le fichier ne prétend pas répondre à une question qu'on ne lui a pas
posée.

### Reste le filtre

Le fichier était le premier à faire : lu par des humains **et** par le copilote,
il coûte le moins et rend la réponse exportable. Le filtre par variable dans la
Mémoire vient ensuite, quand on saura, en s'étant servi du fichier, ce qu'on y
cherche vraiment.

---

## 36. La phrase d'un engagement, et le rail qui restait en l'air · *fait*

Deux corrections d'écran, sans rapport entre elles sinon qu'on les a vues au
même moment.

### « Ce qui ne couvre plus » se lisait comme un enregistrement

La ligne juxtaposait ses champs :

```
Zone de vent — F — Région 2 — 2026-09-11
```

Exact, et illisible. Il fallait connaître l'ordre des champs pour la lire, et
surtout **rien n'y disait qui s'était engagé** — or c'est la première chose
qu'on cherche : un avis d'un bureau de contrôle se redemande en six semaines,
une relecture interne se refait dans l'heure. Devant une décision qui coûte, on
ne fait pas décoder une ligne à celui qui lit.

Elle se dit maintenant en deux phrases — `phraseDeLEngagement` :

> **SOCOTEC — 11/09/2026 : avis F sur Zone de vent = Région 2.**
> Cet avis ne couvre plus : la valeur passerait à Région 1.

**Qui a dit quoi**, puis **ce qu'il advient**. Courtes, parce qu'on en lit dix
d'affilée.

Trois choses qu'elle ne fait pas, et chacune pour une raison :

- **elle ne traduit pas le code.** Si le rapport écrit « F », la phrase écrit
  « F ». La légende du document est la seule chose qui sache ce que « F » veut
  dire chez cet émetteur-là, et deviner « favorable » serait faux chez le
  suivant ;
- **elle n'invente pas d'auteur** (règle 5). Sans organisme nommé dans la note,
  la phrase commence par la date. Un « Quelqu'un » ferait croire à un auteur
  qu'on n'a pas ;
- **elle ne juge pas.** Elle dit que la valeur change, jamais si c'est grave.

La colonne `A1 → E` qui suivait a disparu : les deux phrases portent déjà la
valeur examinée et celle qu'elle deviendrait, et la dire trois fois n'était pas
plus clair.

La date se met en français **dans l'écran**, pas dans le service : un service ne
connaît pas la locale de celui qui lit.

### Le rail restait calé à la hauteur qu'il avait au rendu

Dans l'Atelier, en défilant, le rail de gauche gardait son haut là où il était
au premier rendu pendant que les onglets du projet se repliaient au-dessus de
lui. Un blanc s'ouvrait entre les deux, et ne se refermait jamais.

La cause : `followRailScroll` écoutait `window`. Or **tous les onglets ne
défilent pas de la même façon** — la Mémoire défile la page, l'Atelier défile
*dans un conteneur* (`projectStudioRouterScroll`), et le défilement d'un élément
ne remonte pas jusqu'à la fenêtre.

Les événements `scroll` ne remontent pas, mais ils **descendent** : l'écoute
passe en capture sur le document, et voit désormais tous les conteneurs. Un
écran de plus se règlera tout seul, sans avoir à déclarer son conteneur. Un
`ResizeObserver` sur les onglets rattrape en outre la fin de la transition de
repli, que la mesure prise pendant l'image du défilement manquait.

---

## 37. Ce qui a suivi : une liste, là où il faut un graphe

**Demandé, pas fait.** « Ce qui a suivi » énumère les étapes du rejeu dans
l'ordre où elles se sont produites. Une liste ne dit pas **qui alimente quoi** :
deux branches parallèles s'y lisent comme une suite, et une bifurcation ne se
voit pas du tout.

Ce qu'il faut : des branches parallèles, des bifurcations aux nœuds, et le
pliage au caret des détails LIT / ÉCRIT de chaque étape — aujourd'hui toujours
déroulés, ce qui noie le peu qu'on cherche.

Deux choses existent déjà et devraient servir plutôt que d'être refaites :
`views/ui/enchainement.js`, qui dessine la suite, et le cerveau du projet, qui
sait déjà placer des nœuds et leurs liens. La question ouverte est de savoir
lequel des deux porte la forme.

**Ce qui se passe si on ne le fait pas :** on continue de lire un raisonnement
en le reconstituant de tête, et c'est exactement ce que Mdall prétend éviter.

---

## 38. Le dépôt d'un document ne mène plus nulle part · *fait*

**Ce qui n'allait pas.** Déposer un compte rendu de chantier n'ajoutait aucun
sujet, qu'on passe par une proposition ou par « déposer directement dans le
projet ». Un seul reconnaisseur existait — celui des livrables de bureau de
contrôle —, et tout le reste retombait sur « aucun émetteur reconnu ». Un
compte rendu déposé n'était pas *mal* traité : il n'était **pas traité du tout**.

### Ce qui a été retiré, et pourquoi ce n'est pas du nettoyage

Le réglage **Paramètres > Automatisations > « Déclencher l'analyse IA des sujets
après le dépôt d'un document »** produisait des sujets **à partir d'un PDF, sans
proposition**. Il contournait la règle 1 — rien n'entre directement — et c'est
la seule raison pour laquelle il s'en va.

Il avait deux autres défauts qui ne se rattrapaient pas : il ne traitait qu'un
seul document du lot, et il ne regardait pas ce que le document était — le même
traitement pour un rapport de bureau de contrôle et pour un compte rendu.

Quatre fichiers l'ont perdu : le catalogue (`services/project-automation.js`),
sa case (`views/project-parametres/project-parametres-automatisations.js`), son
déclenchement (`views/project-documents.js`) et l'état « automatique » du bouton
d'analyse (`views/project-situations-runbar.js`).

**La distinction qui comptait.** `runAnalysis` reste joignable à la main, depuis
l'écran d'analyse. Ce qui disparaît est son *déclenchement automatique au
dépôt*, pas l'écran : les confondre aurait retiré le seul chemin qui marchait
encore. Un test lit les fichiers pour que le raccourci ne se réintroduise pas —
il est commode, et c'est précisément le danger.

**Le réglage retenu chez ceux qui l'avaient coché n'est pas effacé.** Une clé
inconnue du catalogue est ignorée, et supprimer un réglage qu'on ne lit plus
n'apporte qu'un risque.

### L'aiguillage

Un reconnaisseur de plus, et c'est tout ce que le registre demandait :
`services/document-recognizer-cr.js`.

**Deux questions, pas une** — et c'est la leçon du premier essai, qui a rejeté
le premier vrai compte rendu qu'on lui a donné.

La première version cherchait un titre disant « compte rendu de chantier », d'un
seul tenant. **Aucun compte rendu réel ne s'appelle ainsi.** Ils s'appellent
« compte rendu de réunion n° 14 », et c'est une ligne plus bas, dans un tableau
d'en-tête, qu'on lit « Objet : suivi de chantier ».

On pose donc deux questions séparées, et c'est leur conjonction qui tranche :

1. **le document se nomme-t-il compte rendu ?** — « compte rendu de réunion »,
   « procès-verbal », « CR n° 14 » ;
2. **parle-t-il d'un chantier ?** — le mot lui-même, ou une rubrique de lot
   (« Lot n° 1 : Démolition / Gros œuvre »), qui est la façon dont un compte
   rendu de chantier est toujours découpé.

Prises isolément, ni l'une ni l'autre ne suffit : un compte rendu de commission
de sécurité répond oui à la première, un devis répond oui à la seconde.

Ce qui n'est **pas** un titre, et ne le sera pas : « réunion de chantier » tout
court. Un rapport de bureau de contrôle écrit « établi à la suite de la réunion
de chantier du 3 septembre », et le tenir pour un titre l'enverrait vers les
sujets au lieu des avis, en silence. Numérotée — « Réunion de chantier n° 3 » —
c'est un titre ; sans numéro, c'est une allusion. Le numéro sépare les deux.

Quand les deux familles réclament le même document, **c'est le bureau de
contrôle qui l'emporte** : ses avis sont ce qu'on vient y chercher. Ce n'est pas
au reconnaisseur des comptes rendus de s'en occuper — il redirait ce que l'autre
sait déjà (règle 10) ; c'est le registre qui tranche, par l'ordre
d'enregistrement.

**L'auteur ne se devine pas.** Un compte rendu nomme tout le monde. Il n'est
nommé que lorsqu'**une seule** mention légale figure au document ; sinon, rien
(règle 5).

Une convocation est reconnue **sans contenu** plutôt que rejetée : c'est un
compte rendu au sens du titre, et il n'y a rien dedans.

Et ce qui rend un compte rendu exploitable n'est pas seulement le point numéroté
« 12.02.4 » : c'est aussi, et bien plus souvent, **la puce sous une rubrique de
lot**. La manquer rendait « sans contenu » un compte rendu qui en porte trente.

De là, `services/proposition-analysis.js` aiguille :

| ce que le document est | où il part |
| --- | --- |
| `ct_report` | les avis — le chemin qui existait |
| `cr_chantier` | les points à traiter — le chemin neuf |
| autre chose | nulle part, **et il est nommé** |

La garde de portée ne s'applique plus que lorsque **les deux** chemins sont
vides : un dépôt qui n'apporte qu'un compte rendu a bien quelque chose à lire.
C'est ce point précis qui faisait ressortir un dépôt vide.

Le chemin des comptes rendus ne tourne qu'en portée **dépôt**. La réécriture du
suivi après une fusion repasse par la même fonction avec la portée *projet*, et
les comptes rendus y sont toujours attachés : les relire appellerait le modèle
une seconde fois sur chaque pièce, pour reproposer des points qu'on vient
d'ouvrir — un appel payant pour un résultat qu'on jetterait.

**L'aiguillage se dit au dépôt**, pas seulement à l'ouverture de la proposition :
« 2 livrables de bureau de contrôle partent vers les avis, 1 compte rendu de
chantier part vers les points à traiter. » Il se décide là, et c'est là qu'on
regarde. La phrase ne promet rien de ce qui en sortira — un compte rendu peut ne
porter aucun point neuf, et l'annoncer serait mentir avant d'avoir lu.

### La lecture d'un compte rendu, par le modèle

Même raison que pour les avis, en pire : un livrable de bureau de contrôle suit
au moins la maquette de son émetteur ; un compte rendu suit celle de son maître
d'œuvre, et il y en a autant que d'agences.

`supabase/functions/extract-sujets` lit, `_shared/sujets-du-modele.js` porte le
schéma et les consignes. La clé et les consignes restent au serveur : le
navigateur envoie des pages et reçoit des points vérifiés.

**Le garde-fou pèse plus lourd ici que pour un avis.** Un avis inventé porte un
code que la légende ne connaît pas ; un point inventé est *plausible* —
« Reprise d'étanchéité en toiture terrasse » pourrait figurer dans n'importe quel
compte rendu, et rien dans la réponse du modèle ne le distinguerait d'un vrai. Ce
qui l'en distingue est le document : chaque point porte sa ligne, cette ligne est
recherchée dans la page, et ce qui ne s'y retrouve pas est écarté — et compté.

Le garde-fou lui-même a déménagé dans `_shared/citation-verifiee.js` : il vaut
pour toute lecture par le modèle, et une règle recopiée diverge par le bas
(règle 4). Les avis s'y sont ramenés sans rien changer à leur contrat.

**On ne lui demande aucun jugement** — ni priorité, ni gravité, ni urgence. Un
compte rendu ne les écrit pas, et les deviner ferait classer un chantier sur une
intuition.

### Le report, qui est tout le problème

Un compte rendu **reporte** : la douzième réunion reprend les points de la
onzième, qui reprenait ceux de la dixième. C'est sa raison d'être — un point
reste écrit tant qu'il n'est pas soldé. Verser tout ce qu'il porte ouvrirait
douze fois le même sujet.

Et l'erreur inverse est pire : écarter un point parce qu'il ressemble à un autre
ferait taire une observation nouvelle sur un ouvrage déjà discuté.

`services/sujets-du-cr.js` reconnaît qu'un point est déjà là de trois façons,
dans cet ordre : **son numéro** (« 12.02.1 » désigne le même point d'un compte
rendu à l'autre — c'est ce que la numérotation du métier veut dire), **un sujet
du projet qui porte le même titre**, puis **le lot lui-même**, deux comptes
rendus déposés ensemble se recouvrant.

Un point **déjà écarté** ne se repose pas non plus — on ne repose pas une
question tranchée —, mais il ne se dit pas « déjà versé » : les deux n'appellent
pas la même réaction, et annoncer un refus comme un versement ferait chercher un
sujet qui n'existe pas.

Ce qui est écarté revient avec ce qui est proposé, toujours les deux : une liste
courte sans ce qu'on lui a retiré ferait croire à un compte rendu maigre
(règle 5). L'écran les montre sous « Déjà suivis », sans case à cocher — ce n'est
pas une question.

### Rien ne s'ouvre sans qu'on l'ait signé

Les points deviennent des affirmations de la proposition (`ITEM_TYPE.SUJET`),
cochables une par une. **Trois choses, et il faut les trois, pour qu'un sujet
s'ouvre** : le point a été lu dans un document (la citation le prouve), il a été
coché par quelqu'un, et la proposition a été signée. Retirer l'une des trois,
c'est revenir à l'ancienne pipeline.

La description du sujet porte ce que le compte rendu dit, sa provenance et **la
citation**. Ce n'est pas un ornement : un sujet ouvert par une lecture
automatique doit pouvoir se contester, et un sujet dont on ne peut pas remonter à
la phrase d'origine ne se discute plus, il s'accepte.

Un échec n'annule pas la fusion — les documents sont entrés, c'est fait —, et il
se dit plutôt que de se taire : on croirait le compte rendu traité. Les sujets
s'ouvrent un par un ; sur douze points, en perdre onze parce que le troisième a
échoué serait le pire des deux mondes.

### Ce qui reste à faire

- **La liaison d'un point à une valeur du projet.** Un avis se raccroche à ce
  qu'il examine ; un point de chantier, pas encore. « Le ferraillage du voile V12
  ne suit pas le plan BA-102 » ne dit rien à la mémoire tant que le plan BA-102
  n'y est pas un objet. C'est ce qui manque pour qu'un point de chantier compte
  dans une variante.
- **L'état d'un point suivi d'une réunion à l'autre.** Le modèle lit « soldé » et
  « en cours » quand le document les écrit, et on n'en fait rien : un point
  soldé devrait fermer le sujet qu'il a ouvert. C'est le § 39, et il faut
  d'abord trancher ce qu'ouvrir et fermer veulent dire en mémoire.
- **Le dépôt direct** · *tranché, et fait*. Ce n'est pas une lacune : c'est un
  usage, et il en a deux. Des équipes veulent se servir de Mdall comme d'une
  simple gestion documentaire — ranger, partager, sans rien de compliqué et sans
  consommer d'IA. Et l'on veut pouvoir échanger une pièce sans l'engager : un
  plan de travail, une version de lecture.

  Ces documents sont **hors mémoire** : rien de ce qu'ils disent n'est entré, et
  rien ne s'appuie dessus. Ce qui manquait n'était pas un chemin, c'était **que
  cela se lise**. Un fichier qui ressemble à tous les autres dans l'arborescence
  laisse croire qu'il compte comme les autres — quelqu'un dépose son rapport de
  contrôle directement, voit son nom dans la liste, et croit le projet au
  courant.

  La ligne porte donc un mot, et deux couleurs qui disent deux choses
  différentes : **« hors corpus »** en rouge pour ce qu'on a sorti,
  **« hors mémoire »** en gris pour ce qui n'y est jamais entré. Les peindre
  pareil ferait lire un choix comme un incident. Voir
  `services/etiquette-du-document.js`.

  Et le mot ne se dit **que si la requête a posé la question** : plusieurs
  lectures de la table des documents ne demandent pas la colonne du
  rattachement, et rabattre « je n'ai pas demandé » sur « il n'y a rien »
  étiquetterait un dossier entier à tort (règle 5).

---

## 39. Ouvrir, modifier, fermer un sujet sont des décisions

**Réflexion. Rien de ceci n'est codé.** Ce qui suit tranche là où l'on peut
trancher, et nomme ce qui reste ouvert.

Fermer un sujet, c'est prendre parti. Alors l'ouvrir l'est aussi — on a jugé
qu'il y avait là quelque chose à traiter — et le modifier peut l'être. Ces
gestes ne laissent aujourd'hui aucune trace en mémoire, et c'est pour cela
qu'aucun jalon ne peut dire « attention, cela contredit un sujet fermé le… ».

### L'idée à l'origine de cette section, et ce que j'en pense

> À chaque nouveau compte rendu de chantier, l'évolution ou non du point est
> ajoutée comme un commentaire dans la discussion du sujet.

**Sur le fond, oui, et pour une raison qui va plus loin que la commodité.** Un
compte rendu ne corrige pas le précédent : il en écrit un autre. Le point du
12 septembre disait ceci ; celui du 19 dit cela ; les deux sont vrais, chacun à
sa date. Une discussion est exactement la forme de cela — une suite d'énoncés
datés qui ne s'effacent pas. Mettre l'évolution à jour **dans** le sujet, en
remplaçant sa description, écraserait au contraire ce que le compte rendu
précédent avait dit, et c'est précisément ce que la règle 6 interdit : un
constat ne devient jamais faux.

Trois avantages de plus, et ils comptent : l'information se lit **là où l'on
travaille** — celui qui traite un sujet ouvre le sujet, il ne va pas fouiller
les documents ; la forme existe déjà, avec ses auteurs et ses dates ; et un
commentaire **ne décide rien**, ce qui est honnête, puisque le compte rendu
rapporte sans trancher.

**Sur le « ou non » : à moitié seulement, et la première rédaction se trompait
sur la moitié qui compte.** · *corrigé*

Elle disait : n'écrire un commentaire que lorsque quelque chose bouge, parce que
trente-quatre « aucune évolution » d'affilée enterrent les commentaires qui
disent quelque chose. C'est vrai — trente-quatre messages identiques sont du
bruit — et c'est tout ce qui était vrai.

Ce qu'elle manquait : **qu'un point soit relancé depuis trente-quatre réunions
sans que rien ne bouge est exactement l'information qu'on cherche.** C'est même
la seule qui distingue un chantier qui avance d'un chantier qui piétine. Jeter
le bruit avait jeté le signal avec lui.

Et une seconde perte, plus sournoise : sans trace, **on ne peut pas savoir si le
compte rendu suivant a été lu**. Un sujet muet peut vouloir dire « rien n'a
bougé » comme « personne n'a rien analysé ». Deux choses très différentes, et le
silence les confond.

La distinction n'est donc pas entre écrire et se taire, mais entre un
**journal** et un **compteur** :

| ce que le compte rendu fait du point | ce que Mdall en fait |
| --- | --- |
| il le reformule, en déplace l'échéance, en change le destinataire, en change l'état | **un commentaire**, daté, avec sa citation |
| il le reprend à l'identique | **une ligne d'activité, qui se réécrit** — pas un message de plus |
| il ne le mentionne plus | rien, et surtout pas « clos » — voir plus bas |

La ligne s'étend au lieu de se répéter (`services/reprise-sans-changement.js`) :

```
Pas de modification au compte rendu n° 15 du 12/11/2026.
Pas de modification des comptes rendus n° 15 à 16 — 2 réunions depuis le 12/11/2026.
Pas de modification des comptes rendus n° 15 à 23 — 9 réunions depuis le 12/11/2026.
```

Un journal qui grandit d'une ligne par réunion devient illisible ; un compteur
qui s'incrémente reste lisible et dit la même chose — **en mieux**, puisqu'il
donne la durée d'un coup d'œil.

Trois précautions, et chacune a son test :

- **elle repart du dernier mouvement.** Ce qui a changé a son propre
  commentaire, daté ; sans cela elle annoncerait « rien n'a bougé depuis la
  première réunion » sur un sujet qui a changé trois fois ;
- **les bornes et le compte peuvent ne pas concorder** — un compte rendu qui ne
  reprend pas le point. C'est une information, pas une incohérence ;
- **elle ne juge pas.** Neuf réunions sans mouvement peuvent être un point
  bloqué, ou un point dont l'échéance est en mars. Elle donne le compte ; c'est
  à celui qui lit de dire si c'est grave.

Le service est écrit et testé. **Il n'est branché à rien**, et ne peut pas
l'être : il lui faut la liste des comptes rendus qui mentionnent un point, donc
la clé du compte rendu sur le sujet — l'étape 1 ci-dessous.

**Et le commentaire doit être visiblement écrit par la machine, avec sa
citation.** Un commentaire automatique qui a l'air d'avoir été écrit par un
collègue est pire que pas de commentaire du tout.

### La question que l'idée ne pose pas, et c'est la plus importante

**Un point marqué « soldé » ferme-t-il le sujet ?**

Non. Pas tout seul, et c'est le cœur de cette section.

« Soldé » est ce que le maître d'œuvre écrit. Fermer le sujet est ce que **le
projet décide**. Ce ne sont pas le même acte, et les confondre coûterait deux
fois :

- une erreur de lecture fermerait un sujet réel ;
- la fermeture aurait lieu **sans que personne ne la signe**, ce qui est
  exactement l'automatisme qu'on vient de retirer du dépôt (§ 38).

Ce qui s'ensuit est simple, et tient dans ce qui existe déjà. Le compte rendu
qui porte « soldé » produit **deux choses** : un commentaire dans la discussion
du sujet (« le compte rendu n° 19 porte ce point comme soldé », avec la ligne
citée), et une **proposition de fermeture**. La proposition est le lieu de la
signature, et elle existe déjà : c'est celle que le dépôt du compte rendu ouvre.

Autrement dit, `ITEM_TYPE.SUJET` gagne un **mouvement** — ouvrir, fermer,
rouvrir — au lieu de ne savoir qu'ouvrir. Un même dépôt fait alors signer d'un
seul geste ce qu'il ouvre et ce qu'il ferme, sur le même écran.

### Ce qu'il faut d'abord, et qui manque

**Le sujet ne porte pas la clé du compte rendu.** À la fusion, il est créé avec
son titre et rien d'autre : la clé `cr:12.02.1`, qui est la seule identité
stable d'un point d'une réunion à l'autre, reste dans la mémoire et ne suit pas
jusqu'au sujet. Sans elle, « soldé au CR n° 19 » ne peut pas retrouver ce qui a
été ouvert au CR n° 14 — et l'on retomberait sur la comparaison des titres, qui
casse à la première reformulation.

**C'est la première chose à faire, et elle est petite.** Tout le reste en
dépend.

### Ce qui doit entrer en mémoire, et ce qui ne doit pas

Ouvrir laisse déjà une trace : la fusion verse une affirmation `sujet`. Fermer
doit la laisser aussi, et symétriquement — une **décision**, datée, signée,
portant le sujet et la raison. C'est elle, et rien d'autre, qui rend le jalon
possible.

**Modifier, en revanche, ne doit pas tout verser.** Corriger une faute dans un
titre n'est pas une décision ; changer ce que le sujet affirme — son échéance,
ce qu'il demande, à qui — peut en être une. Verser chaque frappe remplirait la
mémoire d'un bruit qui noierait ce qu'on y cherche, et une mémoire qu'on ne lit
plus ne protège plus rien.

Ma recommandation : **ne verser que ce qui peut être contredit**. Une fermeture,
une réouverture, et une modification de ce sur quoi le sujet s'appuie. Le reste
est de l'édition, et l'historique du sujet le porte déjà.

C'est la position que je défends ; c'est aussi celle où je peux me tromper, et
c'est pourquoi elle est écrite ici plutôt qu'appliquée.

### Le jalon, enfin

Le mécanisme existe (`services/raisonnement-jalonne.js`) et ne connaît
aujourd'hui que ce qu'un examen couvre. Lui donner les décisions à lire est la
même mécanique appliquée à une autre matière :

> Attention : cela contredit un sujet fermé le 12/03/2026.
> Attention : cela contredit une décision du 04/02/2026.

**Et la contradiction n'annule rien** (règle 6). Une variante qui contredit une
décision ne la rend pas fausse : elle signale qu'on revient sur quelque chose de
tranché, et à quelle date, et par qui. C'est au lecteur d'assumer.

Ce qui s'écrit alors, et c'est la réponse à la question laissée ouverte la
dernière fois : **rien, automatiquement**. Mais la variante, si elle devient une
proposition, porte « rouvrir le sujet n° 48 » comme un article de plus — signé
comme le reste. Une réouverture est une décision, au même titre que la fermeture
qu'elle défait, et les deux restent lisibles côte à côte.

### L'ordre

1. **Le sujet porte la clé du compte rendu.** Petit, et tout en dépend — y
   compris la ligne de reprise, qui a besoin de savoir quels comptes rendus ont
   mentionné le point.
2. **`ITEM_TYPE.SUJET` gagne son mouvement** — ouvrir, fermer, rouvrir.
3. **Fermer verse une décision** en mémoire, datée et signée.
4. **Le commentaire d'évolution** sur changement, et **la ligne de reprise**
   quand rien ne bouge. Le service de la seconde est écrit et testé
   (`services/reprise-sans-changement.js`) ; il attend l'étape 1.
5. **Le jalon** lit les décisions, et dit la contradiction sans l'annuler.

**Ce qui se passe si on ne le fait pas :** les sujets ouverts par un compte rendu
ne se referment jamais tout seuls, la douzième réunion les répète sans qu'on
sache lesquels sont vivants, et une variante continue de contredire en silence
des décisions que le projet a prises.

---

## 40. Sept corrections d'écran, et un doute qu'on n'a pas su lever

### Le dépôt quittait le dossier avant même d'avoir commencé

Déposer depuis un dossier renvoyait à la racine. La cause n'était pas dans le
dépôt : les deux boutons « Ajouter des documents » appelaient
`renderProjectDocuments`, qui est le chemin de **l'arrivée sur l'onglet** — il
repasse par `retourALAccueilDesFichiers`, qui oublie le dossier courant. On
partait donc à la racine avant même d'avoir choisi un fichier, et le dépôt y
atterrissait.

L'écran de dépôt porte en outre le **fil d'Ariane**, qu'il n'avait pas : on y
arrivait depuis un dossier sans plus rien pour voir où l'on était, ni pour en
sortir. Son dernier morceau est le dossier de destination — c'est exactement ce
qu'il faut lire avant de lâcher un fichier. Et le fil n'y quitte pas l'écran :
il **change la destination**, parce qu'en sortir ferait perdre les fichiers déjà
choisis.

Une réserve de 250 pixels en bas, enfin : le champ de description et les boutons
tombaient sous la ligne de flottaison sur un portable, et il fallait lutter
contre le défilement pour atteindre « Valider ».

### La page du tableau des sujets

Ouvrir un sujet de la cinquième page et revenir par l'onglet ramenait à la
première. La relecture des sujets conservait la sélection, les sujets dépliés et
`page` — mais remplaçait l'objet de pagination en entier, `currentPage: 1`
compris. La taille de page y passait aussi : c'est un réglage de l'écran, pas un
résultat de la requête.

### Une seule figure pour une seule attente

Trois écrans attendent quelque chose : le copilote pendant qu'il réfléchit, la
revue d'une proposition pendant que l'analyse tourne, la ligne des écritures
après une fusion. Trois attentes de même nature, et trois figures différentes —
le sablier du copilote d'un côté, une roue à deux flèches de l'autre.

Le sablier passe dans `views/ui/spinner.js` et les trois s'en servent. Il n'est
pas `renderSpinnerHtml` : celui-là est l'anneau des chargements de tableaux,
gros et centré dans un vide ; celui-ci se pose **en ligne**, à côté d'un mot, et
c'est ce qui le rend utilisable dans un bouton.

Le bouton d'état **dit aussi ce qu'on attend**. Il ne portait que la roue, au
motif qu'écrire « Analyse » à côté aurait dit deux fois la même chose. C'était
faux : une roue dit « ça tourne », elle ne dit pas *quoi* — et depuis que la
lecture d'un compte rendu passe par le modèle, elle tourne assez longtemps pour
qu'on croie l'écran figé.

### Qui parle dans le fil d'une proposition

L'écran montrait deux messages : un premier, de l'utilisateur, annonçant
« aucune description n'a été donnée » ; un second, de Mdall, portant la note de
dépôt — c'est-à-dire le texte que le premier prétendait absent. Deux voix pour
un seul acte, et la première muette.

Mdall **rédige** la note ; il ne la **dit** pas. Ouvrir une proposition est un
acte, et c'est une personne qui le pose : la note est ce que cette personne
dépose et soumet, et elle la signe. La note devient donc le corps du premier
message, sous la description quand il y en a une, séparée par un filet.

Ce qui reste dit, et doit le rester : **que le texte a été calculé, et quand**.
C'est la ligne de provenance, à l'intérieur du message. Le taire serait la seule
chose vraiment malhonnête ici.

### Le filtre « Fermés », troisième tentative · *non résolu*

**Ce qui a été fait, et qui est juste.** Le filtre vivait dans quatre cases
entretenues par des copies dans les deux sens, et l'ancienne case
`filters.status` était partagée avec le filtre des Situations. Il n'a plus qu'un
foyer, et un test lit deux fois de suite — c'est au second appel que le choix
disparaissait.

**Ce qui n'a pas été trouvé.** L'écran de l'utilisateur ne le suit toujours pas.
Les trois maillons ont été vérifiés un par un et sont justes isolément : l'état
se met à jour et survit aux relectures, le bouton porte bien son attribut, le
tableau applique bien le filtre et compte de la même façon qu'il liste. Sans
pouvoir ouvrir l'application, le dernier maillon reste hors de portée.

**Ce qui a été fait à la place, et qui vaut mieux qu'une troisième réparation à
l'aveugle.** Une liste vide dit désormais **pourquoi** elle est vide, et surtout
combien il y a de sujets de l'autre côté :

> **Aucun sujet fermé** — Aucun sujet de ce projet n'a encore été fermé. Les 63
> sujets qu'il porte sont ouverts.

C'est la règle 5 appliquée à un tableau : ne pas savoir pourquoi c'est vide
n'autorise pas l'écran à se taire. Et c'est ce qui tranche entre les deux
lectures possibles — un projet sans sujet fermé, ou un filtre en panne — sans
avoir à cliquer l'autre bouton. Si la phrase annonce un compte non nul et que
rien ne s'affiche, le défaut est dans le rendu ; si elle annonce zéro, le filtre
n'a jamais été en cause.

---

## 41. Une seule porte d'entrée, et de quoi diagnostiquer une liste

### Le dépôt direct s'en va · *tranché, et fait*

Le § 38 le tenait pour un usage légitime, et la § 40 lui avait donné son mot
dans l'arborescence. C'était une erreur, et elle a été tranchée dans l'autre
sens : **ce qui entre passe par le chemin habituel**, sans exception.

Trois raisons, et la troisième est la plus lourde :

- **elle complique la lecture.** Deux documents côte à côte, l'un lu et l'autre
  non, sans que rien ne l'explique au moment où on les regarde ;
- **elle fabrique des erreurs.** Déposer son rapport de contrôle par la mauvaise
  porte, voir son nom dans la liste, et croire le projet au courant ;
- **elle empêche d'automatiser l'entrée des documents.** Un dépôt qui vient du
  dehors — un courriel, un dossier surveillé — ne peut pas choisir entre deux
  portes. S'il n'y en a qu'une, il n'a rien à choisir. C'est la raison qui
  emporte les deux autres : elle ne parle pas de confort mais de ce que le
  produit pourra faire.

Il reste donc, sous la zone de dépôt, **ouvrir une proposition** ou **ajouter à
une proposition ouverte**.

**L'étiquette « hors mémoire » reste**, et ce n'est pas une hésitation : les
documents déposés directement avant ce jour existent, et rien de ce qu'ils
disent n'est en mémoire. Le taire maintenant que la porte est fermée ferait
mentir l'arborescence sur ce qui y est déjà. Elle ne se posera simplement plus
sur rien de nouveau.

### Le filtre « Fermés » : de quoi le diagnostiquer · *outil livré, cause non trouvée*

Le compteur annonce trois sujets fermés, et la liste n'en montre aucun. Trois
tours y ont été consacrés, et chaque maillon a été vérifié **isolément** :

| maillon | vérifié |
| --- | --- |
| l'état du filtre | se met à jour, survit aux relectures — testé |
| le bouton | porte son attribut, le gestionnaire l'atteint |
| le compte | `getFlatSubjects` + le même prédicat que la liste |
| la liste | `getFilteredFlatSubjects`, même prédicat, plus recherche et priorité |
| la pagination | page ramenée à 1 au clic, taille par défaut à 25 |
| le rendu d'une ligne | aucune sortie anticipée, toujours du HTML |

Chacun est juste. Ensemble, ils rendent une liste vide — ce qui veut dire que ce
qui manque n'est pas une idée de plus, mais **les nombres du moment**.

Le bouton de copie, à côté du filtre, les relève **au clic** : les comptes, les
longueurs à chaque étape, l'état de la pagination, les quatre cases où le filtre
a vécu, et — la question qui tranche — ce que portent réellement comme statut les
sujets que le compteur trouve fermés.

Il reste après le diagnostic. Une liste qui ne montre pas ce qu'elle compte est
le genre de défaut qui revient, et ce bouton permettra de dire en une fois ce
qu'il a fallu trois tours à ne pas deviner.

### Deux couleurs

L'icône de fusion passait au gris de secours pendant l'attente, sur son carré
vert — illisible, et lue comme un élément désactivé alors que c'est l'écran qui
travaille. Elle reste blanche : le carré dit déjà que rien n'est tranché.

Le sablier d'attente passe à l'ambre **sur cet écran seulement**. Une analyse en
cours n'est ni un succès ni une panne : c'est un état intermédiaire, et c'est la
couleur que Mdall emploie déjà pour « pas encore tranché ». Ailleurs — le
copilote — il garde la couleur du texte : là, l'attente est la seule chose qui
se passe, et la souligner ne dirait rien de plus.
