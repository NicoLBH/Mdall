# Restituer un document, et pourquoi c'est le modèle qui le fait

**À quoi sert cette page.** Mdall relit des comptes rendus de chantier, des rapports de
bureau de contrôle et des CCTP. Avant d'en tirer quoi que ce soit, il faut savoir si le
document a été **lu**. Cette page dit comment on le regarde, ce qu'on a essayé d'autre, et
pourquoi on ne l'a pas gardé.

---

## 1. Le procédé

    PDF  →  restitution en Markdown  →  un seul appel au modèle  →  les points

**La restitution vient d'abord, et c'est elle que le modèle relit.** Les points ne sont pas
tirés du texte brut du PDF : ils sont tirés du document restitué, que l'on a sous les yeux
dans l'onglet *Restitution*. On sait donc exactement sur quoi le modèle s'est fondé — et
quand un relevé déçoit, on peut dire si le document a été mal lu, ou bien lu et mal exploité.

Les citations sont vérifiées contre **ces mêmes pages**. Quand la restitution n'aboutit pas,
le relevé se fait sur le texte brut plutôt que de ne pas se faire — et l'écran l'écrit.

### Ce que la restitution coûte

**Deux centimes pour onze pages**, relevé des points compris. Le prix s'affiche en pastille
sur la restitution elle-même, au moment où l'on décide si elle valait la peine — le compteur
mensuel dit ce qu'un mois a coûté, il ne dit pas ce que celle-ci a coûté (fondamental 13).

### Cinq mesures, et ce qu'elles disent

| Mesure | Ce qu'elle attrape |
| --- | --- |
| **Mots retrouvés** | ce qui a survécu du PDF |
| **Mots ajoutés** | ce que le modèle a écrit et que le document ne portait pas |
| **Titres inventés** | un titre absent du document — il organise, donc il se propage |
| **Phrases découpées** | du texte coupé en colonnes : la citation ne sera pas vérifiable |
| **Blocs déplacés** | l'ordre changé : ce qui suit quoi dit ce qui répond à quoi |

Les deux dernières lignes de la consigne — ne pas inventer de titre, ne pas déplacer — ont
été ajoutées après mesure. **Une consigne qu'on ne vérifie pas est une intention, pas une
règle** (règle 12) : elles sont donc mesurées, pas seulement écrites.

Aucune de ces mesures ne dit si les tableaux ont tenu. Cela se juge à l'œil, et c'est pour
cela que le document s'affiche.

---

## 2. Ce qu'on a essayé d'autre, et pourquoi c'est fini

Une seconde restitution, **sans modèle**, par un outil de mise en page — OpenDataLoader PDF,
Apache-2.0, Java. L'idée : l'outil en piste principale, le modèle en secours. Pour le prix,
et pour ne pas dépendre d'un fournisseur payant.

Construite, déployable, essayée sur un compte rendu réel de onze pages. **Abandonnée.** Le
code est dans l'historique du dépôt si le sujet revient.

### Ce qui a été mesuré

Ce qui tenait : les onze pages dans l'ordre, la hiérarchie des lots sans exception, les
tableaux de contacts corrects, les généralités intactes.

Ce qui cassait : les blocs de remarques par lot, quand la cellule débordait. L'outil croyait
voir six colonnes là où il n'y en avait qu'une, et **coupait les phrases à la verticale** :

    |Remarques :  04/03 : Point travau|ux devant l'hôtel en lien avec|c le voisin :|

    page  6 |  20 %      10 % des caractères
    page  7 |  36 %      20 % des points datés   ← le chiffre qui décide
    page  8 |  41 %
    les huit autres pages : 0 %

**Aucun réglage ne le corrigeait.** `--table-method default`, `cluster` et
`--use-struct-tree` produisaient des fichiers **identiques au caractère près**.
`--markdown-with-html` donnait le même découpage, plus un bug d'échappement.

**Recoudre ne marchait pas non plus.** La couture fait zéro, un ou deux caractères selon
l'endroit de la coupe, et une coupe à zéro ne se distingue pas d'une vraie frontière de
colonne. C'eût été une règle par mise en page, pour une infinité de mises en page.

### Ce qui a tranché

Le modèle fait mieux sur exactement cette partie — et pas seulement mieux : il **reconstruit
la structure**.

    - 04/03 : Point à faire avec MO concernant l'enlèvement de la cuve de fioul
      - 30/03 : Nous notons que le dépose se fera dans la foulée

Un point ouvert le 4 mars, sa mise à jour le 30, imbriqués. Ce n'est pas de la transcription,
c'est de la compréhension — et c'est exactement la relation que Mdall passe son temps à
reconstituer d'une réunion à l'autre. Aucun outil de mise en page ne la donnera.

Et l'arithmétique du prix, qui était le premier argument, s'effondre : **quarante euros par
an** pour mille comptes rendus. Moins qu'un hébergement, et beaucoup moins que le temps
passé à en chercher un gratuit.

Restait la **solidité** — ne pas dépendre d'un fournisseur. Elle a une meilleure réponse :
voir §4.

---

## 3. Ce que la mesure du découpage est devenue

Le détecteur de phrases découpées, écrit pour juger l'outil, **est resté** : il mesure la
restitution du modèle exactement pareil. Supposer le modèle exempt de ce défaut serait une
affirmation qu'on n'a pas vérifiée (règle 5).

Le signe : une cellule qui commence par une minuscule juste après une cellule qui finit par
une lettre. Aucune langue n'écrit cela dans deux colonnes voisines. Sur le compte rendu
d'essai, la règle trouvait les trois pages abîmées et **aucune** des huit pages saines.

C'est `apps/web/js/services/degats-de-la-restitution.js`, avec les deux mesures ajoutées
depuis : les titres inventés et les blocs déplacés.

---

## 4. La solidité : un second fournisseur, pas un second procédé

L'outil devait protéger d'une panne d'OpenAI. Il protégeait mal — il changeait la qualité en
même temps que le fournisseur, et il fallait l'héberger.

**La bonne réponse est un second modèle, chez un autre fournisseur.** Même consigne, même
schéma, même vérification des citations : seule l'adresse change. On bascule quand le premier
ne répond pas, et la qualité reste du même ordre au lieu de s'effondrer.

Rien n'est engagé. C'est dans `a-traiter-plus-tard.md`, avec ce qu'il faudrait vérifier
d'abord.

---

## 5. Les modèles s'améliorent — et comment en profiter

La question s'est posée : les approximations d'aujourd'hui existeront-elles encore dans six
ou douze mois ?

Probablement pas les mêmes. Mais **une amélioration ne se constate pas au ressenti**, et
c'est tout l'enjeu : « ça a l'air mieux » ne permet aucune décision. Ce qui permet d'en
profiter, c'est de pouvoir **comparer deux versions sur les mêmes documents**.

C'est déjà en place, et c'est ce à quoi servent les mesures :

- les cinq de la restitution — mots retrouvés, ajoutés, titres inventés, phrases découpées,
  blocs déplacés ;
- les cinq du relevé — points relevés, citations retrouvées, sans citation, sans lot, écartés
  au serveur ;
- le prix, à la requête.

Changer de modèle est une ligne — `MODELE` dans la fonction. Passer de `gpt-4.1-mini` à
`gpt-4.1` sur un document difficile coûterait cinq fois plus, soit **dix centimes**, et
pourrait déjà régler ce qui reste. Le levier existe aujourd'hui ; ce qui manquait, c'était de
quoi mesurer le résultat. Ce n'est plus le cas.

**Le carnet ne se referme donc pas.** Il se relit à chaque nouveau modèle, avec les mêmes
documents et les mêmes chiffres.

---

## 6. Le `.md` en base, et la moitié qui manquait

**Elle était écrite, et personne ne la relisait.** `documents.transcription_markdown` existe
depuis `202609300001`, et l'Atelier l'écrit en rangeant le compte rendu. Mais aucun écran ne
la lisait : on repayait une restitution pour revoir ce qu'on avait déjà lu, et déjà payé.
Une donnée en base que rien n'affiche coûte exactement autant qu'une donnée absente.

La lecture existe maintenant, dans **Fichiers**, sur le document lui-même.

### Comme un fichier de code, et non comme un document

C'est le point, et il n'est pas décoratif. Une transcription est **ce que le modèle a compris
du PDF**, et on l'ouvre pour la comparer à la page. Rendue en HTML, elle se lit comme un
document du projet — un titre devient un titre, un tableau devient un tableau — et l'on ne
voit plus ce qui a été **ajouté, déplacé ou inventé**. C'est exactement ce qu'on vient
vérifier, et c'est ce que les cinq mesures du §1 comptent.

Numérotée, elle se cite : « ligne 214 » désigne un endroit. Une page rendue ne le permet pas.

### Elle se bascule, elle ne se juxtapose pas

Deux lectures du même document, et non deux documents : on passe de l'une à l'autre. Côte à
côte, on aurait deux demi-colonnes où ni la page ni le texte ne se lisent.

**On arrive sur la page**, jamais sur la transcription : ouvrir sur ce que le modèle a lu
ferait lire le modèle avant d'avoir regardé le document.

### Ce qui descend, et ce qui ne descend pas

Le listing d'un dossier prend `transcribed_at` et **pas** `transcription_markdown` : une date
dit qu'il y a quelque chose à lire, sans le lire. Quarante comptes rendus feraient quarante
fichiers Markdown au chargement d'un dossier qu'on ouvre pour en lire un seul.

Le texte se lit à la demande, une seule fois par ouverture — il ne change pas tant qu'on n'a
pas refait de restitution.

### Les classes sont celles de la Mémoire

`memoire-ligne`, `memoire-ligne__num`. Deux écrans dessinent déjà des lignes numérotées ; en
écrire un troisième jeu aurait fait **trois calages à recaler ensemble**, dont deux
finiraient en retard sur le premier. Aucune largeur nouvelle.

### Ce qui reste

**La bascule ne s'affiche que sur un document transcrit.** Un PDF déposé directement dans
Fichiers n'en a pas : il faut le passer par l'Atelier. Ouvrir une restitution depuis Fichiers
serait la suite naturelle, et elle n'est pas écrite.
