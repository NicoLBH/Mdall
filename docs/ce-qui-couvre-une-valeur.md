# Ce qui couvre une valeur

**À quoi sert cette page :** un projet ne se rend unique ni par ses calculs ni
par ses valeurs — n'importe quel projet en Haute-Savoie trouvera la même zone de
neige. Il se rend unique par **ce que des gens ont engagé dessus**. Un avis
favorable d'un bureau de contrôle sur « zone de neige A1 » n'est pas une donnée
de plus : c'est un engagement daté, signé, opposable, et qui a coûté des
semaines à obtenir.

Aujourd'hui Mdall sait dire qu'un déplacement du projet fait passer la zone de
neige de A1 à E. Il ne sait pas dire que **l'avis du bureau de contrôle ne
couvre plus rien**. C'est pourtant la seule phrase qui décide de quoi que ce
soit en réunion.

Cette page dit ce qui existe, ce qui manque, dans quel ordre le construire — et
surtout **ce qu'on ne fera jamais**.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## L'exemple qui commande tout le reste

Un projet à Montholon. Le bureau de contrôle a rendu son rapport :

| ce qu'il a examiné | son avis |
| --- | --- |
| Zone de neige A1 | F |
| Zone de vent 3 | F |
| Zone de sismicité 3 | F |
| Note de calcul des fondations | F |

Quelqu'un demande : *« et si on déplaçait le projet à Chamonix ? »*

Mdall répond aujourd'hui : zone de neige A1 → E, vent 3 → 1, sismicité 3 → 4,
cote hors gel 0,47 m → 0,95 m, assise mini 0,60 m → 0,95 m. C'est juste, c'est
calculé, c'est vérifiable.

Et c'est **la moitié de la réponse**. L'autre moitié :

> Quatre avis du bureau de contrôle portaient sur des valeurs qui changent. Ils
> ne couvrent plus le projet. Il faut redéposer.

C'est cette phrase-là qui fait décider. Pas les chiffres.

---

## L'état des lieux, vérifié

### Ce qui existe déjà, et qu'on ne refera pas

| ce qui existe | où | ce que ça donne |
| --- | --- | --- |
| le genre `constat` nomme déjà l'avis de BC | `services/assertion-taxonomy.js` | l'avis a sa place dans la doctrine, et sa propriété : *« un constat ne devient jamais faux : il reste vrai à sa date »* |
| les **actes** sur une hypothèse — émise, validée, contestée | `services/memoire-actes.js` | le dernier acte fait foi ; l'état est **déduit, jamais stocké** ; personne n'est filtré par sa qualification |
| la chaîne `supersedes` / `superseded_by` | la mémoire | une affirmation remplacée est identifiable, et ce qui l'a remplacée aussi |
| les **lectures** de chaque conclusion, et leur index | `services/memoire-applications.js` | on sait quelle valeur chaque calcul a lu, et on peut remonter |
| la marche dans le graphe d'une variante | `services/memoire-variante.js` | on sait déjà dire ce qu'un changement atteint, de proche en proche |
| l'extraction des avis d'un rapport de BC | `services/ct-lab-engine.js` (spike) | les avis sont lus, numérotés, suivis d'un rapport à l'autre |

C'est beaucoup. Presque tout, en fait.

### Ce qui manque, et c'est peu

**Une arête.** Rien, nulle part, ne dit *sur quoi* un constat porte. L'avis du BC
et la zone de neige vivent dans la même mémoire sans se connaître. Le suivi des
avis lit les rapports et s'arrête là.

**Et cette arête doit porter sur une version.**

### Une limite que le code avait déjà vue

`memoire-actes.js` porte ceci, écrit avant cette page :

> *« Cinq personnes d'accord ne rendent pas un sol plus porteur : tant que la
> distinction n'est pas faite, le compteur de corroboration donne du poids à ce
> qui n'en a pas. »*

C'est exactement la question posée ici, déjà nommée comme un défaut ouvert. La
réponse est plus bas, au chapitre du poids.

---

## Six décisions, et pourquoi

### 1. L'arête porte sur une **version**, jamais sur un sujet

Le `visa` — mot de code, voir plus bas — pointe vers l'**identifiant d'une
affirmation**, pas vers « Zone de neige ».

C'est ce qui rend l'invalidation gratuite : quand la valeur est remplacée, le
visa ne suit pas. Il reste accroché à ce qui a réellement été examiné. Il n'y a
aucun mécanisme de péremption à écrire — **la chaîne des remplacements *est* le
mécanisme**, la même qui fait déjà qu'un rejeu ignore les lignes remplacées.

Pointer vers le sujet ferait exactement l'inverse : l'avis suivrait la valeur et
couvrirait éternellement n'importe quoi.

### 2. Un avis ne devient jamais faux — il **cesse de couvrir**

La taxonomie le dit du constat : *il reste vrai à sa date*. Le 12 mars, le BC
**a** émis un avis F sur « zone de neige A1 ». Ce fait est acquis pour toujours.

Ce qui tombe n'est pas l'avis, c'est sa **couverture** : il ne couvre plus le
projet tel qu'il est aujourd'hui.

Ce n'est pas une nuance de vocabulaire. Marquer un avis « invalide » effacerait
une pièce contractuelle de la mémoire ; dire qu'il **ne couvre plus** nomme ce
qui s'est passé et laisse l'avis lisible dans l'histoire. Et ça donne la bonne
phrase à l'écran.

| on n'écrit jamais | on écrit |
| --- | --- |
| avis invalidé, périmé, annulé | l'avis **ne couvre plus** la valeur d'aujourd'hui |
| visa cassé | il **portait sur** A1 ; la valeur est E |

### 3. Trois états, pas deux

La chaîne des remplacements ne distingue pas « la valeur a changé » de « la
ligne a été réécrite ». Quelqu'un qui reverse une affirmation pour corriger une
faute dans sa description ne devrait pas faire tomber un avis.

| état | quand | ce qu'on en fait |
| --- | --- | --- |
| **couvre** | l'affirmation visée est en vigueur | rien |
| **à reporter** | remplacée, mais la valeur est **identique** | un geste humain, un clic, tracé |
| **ne couvre plus** | remplacée par une valeur **différente** | dit, jamais effacé |

Reporter est un geste humain et non un automatisme : c'est quelqu'un qui dit
« oui, c'est la même valeur, l'avis tient ». La machine ne décide pas qu'un
engagement se transporte.

### 4. Deux façons de couvrir, à ne jamais confondre

- **Sur une valeur** — « avis F sur la zone de neige ». Le BC a vérifié que la
  zone est la bonne. La zone change → l'avis **ne couvre plus**. Direct.
- **Sur une conclusion qui a lu la valeur** — « avis F sur la note de calcul des
  fondations ». Le BC a vérifié le calcul *sachant* la zone. C'est le cas le
  plus fréquent, et de loin le plus coûteux à refaire.

Le second se propage par les **lectures**, exactement comme le reste : c'est la
même marche dans le graphe que la variante fait déjà. Aucun moteur à écrire.

Mais le mot n'est pas le même, et c'est important :

| ce qui a bougé | l'avis direct | l'avis indirect |
| --- | --- | --- |
| la valeur visée | ne couvre plus | — |
| une valeur **lue par** la conclusion visée | — | **à revérifier** |

Une note de calcul dont une entrée a bougé n'est pas forcément fausse : elle
peut ne pas bouger. Crier « caduc » à chaque variante ferait ignorer l'alerte au
bout de trois fois.

### 5. Le système dit ce qui tombe, **jamais ce qui tient**

Tentation à laquelle il faut résister : deviner qu'un changement est favorable
et garder l'avis. *« La cote hors gel descend, donc l'avis sur les fondations
tient toujours. »*

C'est un jugement d'ingénieur. Se tromper garde en vie un avis mort — le pire
résultat possible, parce qu'on le citera en réunion.

Règle 5, appliquée ici : on dit *« cet avis portait sur une valeur qui a
changé »*, et quelqu'un tranche.

### 6. Croire n'est pas couvrir

`memoire-actes.js` dit, à juste titre, qu'une zone de neige n'est pas une
hypothèse : c'est une contrainte, tranchée par un texte. Un module d'actes n'y
avait rien à faire. Et pourtant l'avis F du BC porte bien sur une zone de neige.

La contradiction se lève en séparant deux actes qui ont la même forme et pas le
même sens :

| sur une **hypothèse** | sur une **contrainte** |
| --- | --- |
| « je crois cette valeur » | « j'ai vérifié cette valeur et je m'engage dessus » |
| se conteste | ne se conteste pas : elle se corrige, ou elle cesse d'être couverte |
| l'état se calcule par le dernier acte | l'état se calcule par la chaîne des remplacements |

Un acte sur une contrainte ne la rend pas plus vraie — un texte la fixe, personne
ne vote. Il dit que quelqu'un a engagé sa responsabilité sur le fait que **c'est
la bonne pour ce projet-ci**. C'est tout autre chose, et c'est ce qui a de la
valeur.

---

## Le poids : une liste, jamais un nombre

Une valeur vérifiée par cinq personnes n'est pas une valeur que personne n'a
regardée. C'est vrai. Mais **un nombre est la mauvaise abstraction**, pour trois
raisons :

1. Cinq signatures du même bureau ne font pas cinq vérifications. `memoire-actes.js`
   le dit déjà : *« la répétition n'est pas une validation »*.
2. Un nombre appelle une arithmétique qui n'a aucun sens — « poids 5 > poids 3,
   donc on garde ». C'est exactement le faux plausible que le projet refuse
   partout ailleurs.
3. Ce dont un ingénieur a besoin n'est pas « combien », c'est **ce que ça coûte
   de le casser**.

On ne stocke donc aucun poids. On **dérive** deux choses :

**La liste** — « avis F du bureau de contrôle (rapport n° 4, 12 mars) ; vérifié
par M. le 3 avril ». Actionnable, vérifiable, citable.

**Un rang qualitatif**, tiré de la qualité de celui qui s'est engagé — un
vocabulaire ordonné, comme `NATURE` et `RESERVE` le sont déjà :

```
rien  <  relu en interne  <  visé par la maîtrise d'œuvre
      <  avis d'un bureau de contrôle  <  acté contractuellement
```

Le rang sert à **l'affichage** : une nuance dans la liste de la mémoire, une
densité dans le cerveau du projet. Il ne sert **jamais** à arbitrer un calcul,
ni à départager deux valeurs.

---

## Ce que l'écran dit, et ce qu'il ne dira jamais

C'est le chapitre le plus important de cette page, et il est de stratégie avant
d'être de technique. Il est repris comme **règle 12 des fondamentaux**.

Les petits et moyens projets — notre marché — sont allergiques aux procédures.
Il existe d'excellents outils de gestion de visas ; Mdall n'en sera jamais un.

**Mdall ne réclame jamais rien à personne.** Il enregistre ce qui a été dit, et
en tire les conséquences. Un outil de visa *sollicite* : file d'attente,
relances, statuts, circuits d'approbation. Mdall ne sollicite pas. C'est la
ligne, et elle ne se franchit pas.

| jamais à l'écran | à l'écran |
| --- | --- |
| le mot « visa » | rien — la chose se dit par son auteur et sa date |
| « à viser », « en attente de visa » | *(n'existe pas)* |
| un circuit d'approbation, une file | *(n'existe pas)* |
| une pastille « VALIDÉ » | « Avis F — bureau de contrôle, 12 mars » |
| « niveau de validation : 3 » | « vérifié par M. le 3 avril » |
| une relance | *(n'existe pas)* |

**Un visa n'ajoute jamais un état à une valeur, il ajoute une ligne à son
histoire.** Pas de cycle *en attente → approuvé → refusé*. La valeur ne change
pas d'état ; seule son histoire s'allonge. C'est ce qui rend la chose
non-intrusive : on peut ne jamais s'en servir et Mdall marche pareil.

Le geste, quand il existe, est le plus léger possible : sur une valeur, une
action discrète — **« j'ai vérifié »** — qui écrit une ligne et ne demande rien
à personne. Aucune notification ne part. Personne n'est bloqué.

Et le mot `visa` reste dans le code, pour une raison précise : c'est le mot juste
du métier, il évite d'en inventer un mauvais, et le nommer dans le code permet de
**l'interdire à l'écran par un test**.

---

## Un piège à ne pas manquer

Un avis de bureau de contrôle est **versé par** un utilisateur Mdall et **émis
par** un organisme extérieur.

Si le visa ne porte que le `decided_by` que toutes les affirmations portent
déjà, la mémoire dira que le stagiaire a signé un avis F. Les deux champs sont
distincts dès le premier jour :

- `versé par` — qui a saisi, dans Mdall ;
- `émis par` — qui engage sa responsabilité, dehors ;
- et la **pièce** d'où ça sort, quand il y en a une.

`émis par` ne se **déduit** de rien — aucun champ de la mémoire ne le porte —,
mais il se **lit** : le document le dit lui-même (étape 2 bis).

---

## Les étapes

### Étape 1 — l'engagement existe, et la variante l'emporte · *fait*

Elle a coûté moins que prévu : **l'arête existait déjà**. La table
`assertion_acts` lie un acte à un `assertion_id` — donc à une version — et porte
même sa source et sa page. Ce qui manquait tenait en trois choses.

**Un verdict qui couvre.** `memoire-actes.js` (ex-`hypothesis-acts.js`, renommé
parce qu'il ne parle plus que d'hypothèses) gagne `ACT.COUVRE`. La colonne
`verdict` est du texte libre en base : **aucune migration**.

Il refusait jusqu'ici tout acte sur une contrainte, et c'était juste pour les
trois autres — on ne *croit* pas une zone de neige. Examiner, si : c'est
exactement ce que fait un bureau de contrôle, et c'est le seul acte qu'on
accepte partout. Les actes qui couvrent sont par ailleurs **exclus du compte de
corroboration** : un avis n'est pas une voix de plus dans un débat qui n'a pas
lieu.

**La lecture.** `services/couverture.js`, pur, sans aucune écriture : il suit la
chaîne des remplacements jusqu'à ce qui vaut aujourd'hui et rend l'un des trois
états. Rien n'est stocké.

**La variante l'emporte.** `couvertureDeLaVariante` prend le rendu d'une
variante et dit ce qu'elle ferait tomber. Calculé **à côté** de
`consequencesDeLaVariante`, qu'on ne touche pas : elle répond à « qu'est-ce qui
change », et lui faire répondre aussi à « qu'est-ce que ça coûte » ferait une
fonction qui mêle deux questions.

À l'écran, le rang « Ce qui ne couvre plus » passe **devant** « Recalculé » —
un test vérifie l'ordre. Et il montre ce que la valeur **deviendrait**, pas sa
valeur d'aujourd'hui : une variante n'écrit rien, l'affirmation examinée est
encore en vigueur, et « A1 → A1 » se lisait comme une contradiction.

Le copilote reçoit `neCouvrentPlus` et `aRevoirCote` dans son résumé, avec la
consigne de commencer par là.

**Aucun geste manuel.** Il n'y a nulle part de bouton « j'ai vérifié » : les
engagements entreront par les rapports de bureau de contrôle à l'étape 2. Le
moteur est donc en place avant ce qui le nourrit — c'est voulu, et c'est
l'inverse qui aurait été risqué.

Un test refuse que l'écran parle comme un outil de visa : ni « visa », ni
« viser », ni « à valider », ni « en attente », ni « approbation ».

### Étape 2 — les avis du bureau de contrôle s'accrochent · *fait*

L'avis était **lu et restait dehors** : le moteur d'extraction sait depuis
longtemps tirer d'un rapport le numéro, l'intitulé, la teneur et la page de
chaque avis, et tout cela vivait dans une analyse — un tableau qu'on consulte,
que rien ne cite, et dont rien ne dépend.

**L'avis entre maintenant en mémoire comme un `constat`**, versé par une
proposition comme le reste (règle 1). C'était le prérequis manquant : sans lui,
un engagement n'aurait eu qu'un numéro de page à citer.

#### La reconnaissance refuse plus souvent qu'elle n'accepte

`services/avis-liaison.js` propose sur quoi un avis porte, en rapprochant son
**intitulé** des sujets de la mémoire. La reconnaissance est **exacte et sur des
mots entiers** :

| l'intitulé | ce qu'on en fait |
| --- | --- |
| « Zone de neige » | accroché |
| « Vérification de la Classe de sol EC8 retenue » | accroché — le nom est noyé, il reste reconnu |
| « Zonage climatique » | rien : aucun sujet ne porte ce nom |
| « Solives du plancher haut » | rien : `sol` n'est pas un mot de cette phrase |
| « Zone de neige », mais deux bâtiments la portent | rien : il faudrait dire lequel |

Pas de distance approchée, pas de « à peu près », pas de premier de la liste. Un
avis mal accroché couvrirait **en silence** une valeur que personne n'a
examinée, et la variante dirait « couvert par un avis favorable » sur une valeur
que le bureau de contrôle n'a jamais regardée. C'est la seule façon de rendre
tout ce mécanisme dangereux.

La **référence** du rapport — « 2.1.3 » — ne sert jamais à reconnaître : elle
numérote une place dans un document, elle ne nomme rien du projet.

Et la **teneur** de l'avis n'entre pas non plus dans la reconnaissance : un avis
défavorable s'accroche exactement comme un favorable. C'est même celui-là qu'on
veut voir tomber.

#### La signature est la confirmation

Il n'y a **pas de second geste**. La liaison proposée voyage dans la proposition
qui verse l'avis ; quelqu'un lit la liste et signe ; la fusion écrit
l'engagement. Ni file d'attente, ni écran de validation, ni relance (règle 12).

Un avis qu'on n'a pas su accrocher entre **quand même** — c'est un fait du
projet — et n'écrit aucun engagement. On le voit alors en mémoire sans qu'il
couvre rien, ce qui est la vérité. Ce qui n'a pas été reconnu se **compte**.

Un avis **écarté** à la revue n'écrit rien : ce que quelqu'un a refusé ne couvre
rien.

#### Le piège s'est refermé

`emisPar` n'est **pas** `decided_by`. L'un est l'organisme qui engage sa
responsabilité, l'autre l'utilisateur Mdall qui a signé la proposition. Sans
cette séparation, la mémoire aurait dit que le stagiaire a rendu un avis
favorable. Aucune migration : le champ vit dans la charge de l'avis.

#### Un maillon qui se serait cassé sans un mot

La charge d'un item de proposition est une **liste blanche** — « ce qu'on n'a
pas déclaré ne voyage pas ». `porteSur` s'y perdait silencieusement, et
l'engagement n'aurait jamais été écrit sans que rien ne le dise. Les quatre
champs de l'avis y sont donc déclarés, et un test traverse la chaîne entière —
rapport, versable, item, affirmation, engagement, puis la variante qui le fait
tomber.

#### L'écran qui déclenche : « Suivi des avis BC »

Le chemin partait de nulle part. Il part maintenant de l'onglet **Avis** du
suivi, là où la liste est déjà — et c'est le bon endroit parce que c'est celui
où l'on relit.

Le panneau montre, avant de proposer quoi que ce soit :

- **l'organisme, et la ligne qui le prouve**, qui ouvre le PDF à sa page. Le
  lecteur est déjà là : on vérifie l'émetteur comme on vérifie une citation ;
- **ce qui n'a pas été accroché.** Ces avis entrent quand même — un avis est un
  fait du projet — mais ils ne couvrent rien, et cela se voit **avant** la
  signature ;
- **ce qui est déjà en mémoire**, sans quoi un lot sans rien de nouveau
  ressemblerait à un lot vide.

`services/avis-du-lot.js` fait la glu, et trois choses ne se voient qu'à
l'échelle du lot :

1. **un document, un émetteur.** Reconnaître l'organisme sur le lot entier
   attribuerait les avis de l'un à l'autre ;
2. **un avis déjà versé ne revient pas.** Le laboratoire se relance ; sans cela,
   chaque exécution reproposerait les mêmes quarante lignes ;
3. **un avis dont la teneur a changé, si** — suspendu devenu favorable : c'est
   une valeur nouvelle, elle se verse par-dessus (règle 11).

#### Ce que le rapport réel a montré, et que les tests ne montraient pas

Le sujet d'un avis était son **numéro**, au motif que rien d'autre ne le suit
d'un rapport à l'autre. Passé sur un vrai rapport, le mécanisme n'a rien versé
d'utile — et la raison tient en une phrase :

> **Un bureau de contrôle ne numérote que ce qui reste ouvert.**

Sur le rapport d'essai, deux avis sur vingt-quatre portent un numéro, et ce sont
les deux **suspendus**. « Neige — Favorable », « Vent — Favorable », « Taux de
travail — Favorable » n'en ont aucun. Ce sont pourtant **exactement ceux qui
couvrent une valeur** : un avis suspendu ne couvre rien, il demande.

S'en tenir au numéro faisait donc entrer les points ouverts et laissait dehors
tout ce qui avait été examiné. L'intitulé sert maintenant d'identité à défaut de
numéro — deux lignes d'un même rapport ne portent pas le même, et s'il y en
avait deux, ce serait le même point examiné deux fois. Ce qui n'a **ni numéro ni
intitulé** n'entre toujours pas : sans identité, deux avis anonymes se
périmeraient l'un l'autre.

Sur le même rapport : 23 avis sur 24 entrent, l'organisme est reconnu avec
certitude, et « Neige » et « Vent » s'accrochent aux valeurs de la mémoire.

### Étape 2 bis — l'organisme se lit dans le document · *fait*

#### Ce qui était écrit ici, et qui était faux

> *le nom de l'organisme, que personne ne peut deviner : il ne se lit pas dans le
> PDF de façon fiable, et il ne se déduit de rien. Quelqu'un le tape une fois par
> rapport.*

C'était la deuxième chose qui manquait à l'étape 2, et c'était une erreur. Il
suffit d'ouvrir un rapport pour la voir : le nom y est imprimé en pied de chaque
page, dans la raison sociale complète, dans l'adresse du siège, et dans le
domaine de l'adresse électronique du responsable d'affaire. Un outil qui demande
de retaper ce qui est écrit six fois sous les yeux de son utilisateur ne passe
pas pour prudent : il passe pour un idiot.

Les bureaux de contrôle agréés ne sont d'ailleurs pas nombreux — SOCOTEC, APAVE,
Bureau Veritas, Qualiconsult, Alpes Contrôle, Dekra, Batiplus —, et une raison
sociale ne s'écrit que d'une façon.

#### Ce qui rend la lecture sûre : des signaux, pas une fréquence

Compter les occurrences accrocherait le client : un rapport nomme son maître
d'ouvrage autant que son auteur. Ce sont des signaux de **nature** différente,
classés par ce qu'ils prouvent :

| Signal | Ce qu'il prouve | Force |
| --- | --- | --- |
| le domaine d'une adresse électronique | personne n'écrit le domaine d'un autre | certitude |
| la raison sociale en mention légale | on ne met la sienne qu'au pied de ses pages | certitude |
| le nom, simplement écrit | un compte rendu cite le contrôleur sans être de lui | vraisemblance |

Sur le rapport d'essai, les trois convergent et se lisent en page 1. Et le
domaine du **destinataire**, qui figure deux fois sur la même page, n'accroche
rien : un domaine ne compte que s'il est celui d'un organisme de la liste.

#### Une liste courte qui ne ferme pas la question

Demain les documents ne seront plus des rapports normalisés : des comptes rendus
de réunion, des courriels, des notes. Un émetteur que la liste ignore se
**propose** donc au lieu de se taire (règle 5) — et il se propose par sa mention
légale, jamais par une adresse électronique, pour la raison ci-dessus.

#### Ce qui n'entre pas dans la mémoire

Seul un organisme **certain**. « Probablement SOCOTEC » n'est pas une signature :
un avis porte la responsabilité de qui l'a rendu. Ce qui est seulement
vraisemblable se dit à l'écran, avec ses preuves — la ligne lue et sa page —, et
quelqu'un signe (règle 1).

Deux organismes qui signent le même document ne se départagent pas non plus : le
système le dit et s'arrête.

### Étape 3 — le poids se voit · *fait*

`services/ce-qui-couvre.js` dérive des actes les deux choses annoncées plus
haut — **la liste** et **le rang** —, et rien n'est stocké.

#### Le rang se voit, il ne se lit jamais

Nulle part le rang ne s'écrit en toutes lettres. Il donne sa **nuance** à ce qui
se lit déjà :

| où | ce qu'on voit | ce qu'on lit |
| --- | --- | --- |
| la mémoire | une mention discrète, jamais une pastille | « Examinée par SOCOTEC le 12 mars » |
| la variante | ce qui coûte le plus cher, en tête de liste | « Tous viennent d'un bureau de contrôle. » |
| le cerveau | un anneau autour du nœud, plus franc s'il coûte plus | *(rien — c'est un dessin)* |

Une **mention** et non une pastille : une pastille se lit comme un statut, et un
statut appelle un circuit. Un **anneau** et non une couleur de nœud : la couleur
dirait ce que la valeur *est*, l'anneau dit ce qui l'entoure — qui s'est engagé
dessus. C'est la métaphore juste, et c'est la règle 12 : un examen n'ajoute pas
un état à une valeur, il ajoute une ligne à son histoire.

#### Le geste, et il est unique

**« J'ai vérifié »** sur une valeur. Il écrit une ligne, aucune notification ne
part, personne n'est bloqué, aucune file ne se remplit. Pas de note demandée : la
demander ferait un formulaire, et un formulaire fait une procédure. On peut ne
jamais s'en servir et Mdall marche pareil.

Il vaut sur **toute** valeur, et pas seulement sur les hypothèses : une zone de
neige n'est pas une hypothèse, et un bureau de contrôle porte pourtant bien un
avis sur elle. Se *prononcer*, en revanche, n'a de sens que sur une hypothèse —
c'est l'autre panneau, et il ne change pas.

#### Deux rangs déclarés que rien n'atteint

Le vocabulaire est ordonné en entier parce que **l'ordre est son sens**. Mais
trois niveaux seulement sont dérivables aujourd'hui, et le dire vaut mieux que de
laisser croire que les autres ne se rencontrent jamais (règle 5) :

| rang | ce qui l'établit | atteignable |
| --- | --- | --- |
| rien | aucun acte | oui |
| relu en interne | quelqu'un du projet a signé | oui |
| visé par la maîtrise d'œuvre | le rôle du signataire | **non** — Mdall ne connaît pas les rôles |
| avis d'un bureau de contrôle | un organisme reconnu dans la pièce | oui |
| acté contractuellement | la nature contractuelle de la pièce | **non** — rien ne la porte |

Chacun des deux manquants demande **une** chose, nommée ci-dessus. Le jour où
elle existe, une ligne suffit. Un test garde le compte de ce qui est atteint :
il échouera le jour où l'on croira avoir ajouté un rang sans l'avoir fait.

#### Un document non attribué ne monte pas le rang

Un acte qui cite une pièce dont l'organisme n'a pas été reconnu reste « relu en
interne ». C'est délibéré : un rang qui reposerait sur une pièce qu'on n'a pas su
attribuer dirait « bureau de contrôle » sans pouvoir nommer lequel — exactement
le faux plausible que le projet refuse partout ailleurs. C'est aussi ce qui donne
sa valeur à l'étape 2 bis : mieux on reconnaît, plus le rang est juste.

#### Ce que le cerveau ne prétend pas savoir

Sans les actes, un nœud porte `rang: null` — **pas** « rien ». Dessiner tout le
projet comme non examiné parce qu'on n'a pas regardé serait affirmer une absence
qu'on n'a pas vérifiée. L'écran n'affirme rien dans les deux cas, mais le code
distingue, et c'est ce qui permettra de le dire un jour.

### Étape 4 — le raisonnement jalonné · *à faire*

Un raisonnement n'est pas une suite de calculs : c'est une suite d'étapes dont
certaines ont été **actées**. Une fois les trois étapes précédentes en place, le
moteur n'a qu'une question à poser à chaque nœud — *ce nœud est-il couvert ?* —
et il sait s'il a le droit de le refaire en silence, ou s'il doit s'arrêter et le
dire.

C'est la raison de traiter tout ceci **avant** le raisonnement. Sans cela, un
moteur refait tout à chaque fois et perd la seule chose qui distingue Mdall d'une
feuille de calcul : la trace de ce que des gens ont engagé.

---

## Ce qu'on a vu en construisant, et qui reste

1. **Le report est nommé, pas encore offert.** L'état *à reporter* se calcule et
   se dit ; le geste d'un clic qui reporte l'engagement sur la nouvelle version
   n'existe pas. Il arrivera avec l'étape 2, quand il y aura des engagements à
   reporter.
2. **La couverture indirecte a besoin des lectures enregistrées.** Sans l'index
   `assertion_applications`, on ne sait pas qu'une note de calcul a lu une zone.
   Le service le **dit** (`lecturesLues: false`) au lieu de conclure qu'il n'y a
   rien — mais un projet dont les lectures n'ont pas été enregistrées verra
   moins que les autres.
3. **La zone n'entre pas encore en compte.** Un avis peut ne couvrir que le
   bâtiment A ; le mécanisme des portées existe dans la mémoire, la couverture
   ne le lit pas. À faire quand un vrai rapport le demandera.
4. **`versé par` et `émis par` ne sont pas encore distingués.** La table porte
   `declared_by` — qui a saisi — et `source_assertion_id` — d'où ça vient. Le
   nom de l'organisme qui engage sa responsabilité n'a pas sa place : c'est le
   piège nommé plus haut, et il se referme à l'étape 2, pas avant.

---

## Ce qui ne sera jamais offert

- **Un circuit d'approbation.** Ni file d'attente, ni relance, ni « en attente
  de ». Mdall n'a rien à demander à personne.
- **Un état de validation sur une valeur.** Un visa allonge une histoire, il ne
  change pas un état.
- **Une revalidation automatique.** Le système dit ce qui tombe ; ce qui tient se
  dit par quelqu'un.
- **Un score de confiance.** Une liste de ce qui a été engagé, et rien qui se
  compare par un `>`.
- **Le mot « visa » à l'écran.** Il reste un mot de code, et un test le
  vérifiera.
