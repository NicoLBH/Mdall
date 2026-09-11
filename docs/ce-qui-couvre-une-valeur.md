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
| les **actes** sur une hypothèse — émise, validée, contestée | `services/hypothesis-acts.js` | le dernier acte fait foi ; l'état est **déduit, jamais stocké** ; personne n'est filtré par sa qualification |
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

`hypothesis-acts.js` porte ceci, écrit avant cette page :

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

`hypothesis-acts.js` dit, à juste titre, qu'une zone de neige n'est pas une
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

1. Cinq signatures du même bureau ne font pas cinq vérifications. `hypothesis-acts.js`
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

---

## Les étapes

### Étape 1 — le visa existe, et la variante l'emporte

Un genre d'affirmation de plus, **strictement additif**, versé par proposition
comme le reste (règle 1). Un geste manuel léger dans la mémoire. La couverture
**lue et jamais stockée**, dans un service pur.

Et la variante gagne sa section : *ce qui ne couvre plus* — à l'écran et pour le
copilote, qui sait déjà tester une variante.

Rien ne touche à l'extraction des avis. C'est démontrable de bout en bout en un
tour.

### Étape 2 — les avis du bureau de contrôle s'accrochent

Le suivi des avis lit déjà les rapports. Il lui manque de **proposer** la
liaison : « cet avis porte sur cette affirmation ».

Semi-automatique, et jamais autrement : l'extraction propose, un humain
confirme. Un avis mal accroché est pire qu'un avis non accroché — il couvrirait
une valeur que personne n'a examinée.

### Étape 3 — le poids se voit

La liste et le rang, dans la mémoire, dans la variante, dans le cerveau du
projet. C'est là que la notion de poids est vraiment utile : elle y est
visuelle, et non arithmétique. Un nœud couvert se dessine autrement.

### Étape 4 — le raisonnement jalonné

Un raisonnement n'est pas une suite de calculs : c'est une suite d'étapes dont
certaines ont été **actées**. Une fois les trois étapes précédentes en place, le
moteur n'a qu'une question à poser à chaque nœud — *ce nœud est-il couvert ?* —
et il sait s'il a le droit de le refaire en silence, ou s'il doit s'arrêter et le
dire.

C'est la raison de traiter tout ceci **avant** le raisonnement. Sans cela, un
moteur refait tout à chaque fois et perd la seule chose qui distingue Mdall d'une
feuille de calcul : la trace de ce que des gens ont engagé.

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
