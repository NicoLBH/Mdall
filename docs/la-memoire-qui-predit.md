# La mémoire qui prédit

**À quoi sert cette page :** poser la logique, la théorie et la mécanique d'un
moteur de prédiction — **avant** d'en écrire une ligne. Ce n'est pas un plan de
développement : c'est la liste des décisions qu'il faut avoir prises pour que le
premier bout de code compte.

Elle a été écrite en vérifiant le code existant, pas de mémoire.

> **Elle ne décrit rien qui existe.** Tout ce qui suit est à faire. Ce qui
> existe est nommé comme tel, et sert de fondation.

---

## 1. Le risque, d'abord

> *« Je crois que tout sera basé sur la puissance du contexte, sinon un simple
> meilleur LLM fera aussi bien ; il faut trouver le moyen de se démarquer. »*

C'est la bonne question, et elle doit rester en tête de cette page. Un moteur
qui prédirait **par** le modèle serait remplaçable par le modèle suivant. Il
faut donc, d'emblée, savoir répondre à : *qu'est-ce que nous saurons que le
meilleur LLM du monde ne saura pas ?*

La réponse n'est pas « plus de données ». C'est **une autre nature de données**.

## 2. Ce que Mdall a, et que personne d'autre n'aura

Tous les modèles ont lu les Eurocodes. Aucun n'a jamais vu ceci :

**Ce qui a été écarté, et pourquoi.** C'est la donnée la plus rare du monde, et
Mdall est le seul à la collecter : le champ `EXAMINE` d'un raisonnement. Le web
est plein de bonnes réponses ; il est vide de *mauvaises réponses avec la raison
de leur rejet*. Un modèle ne peut pas savoir que l'évidence était fausse sur ce
chantier-là.

**L'ordre dans lequel les questions se sont posées.** Les livres donnent les
réponses, jamais la **séquence** : après « profondeur hors gel » vient « type de
fondation », puis « reprise en sous-œuvre du voisin ». Cette suite n'est écrite
nulle part ailleurs que dans la chronologie d'une mémoire de projet.

**Ce qui s'est révélé faux après coup.** Le rejeu compare déjà ce qu'une
fonction conclut aujourd'hui à ce que le projet affirme, et dit « différente ».
Ce verdict-là est **calculé**, pas rédigé — aucun modèle ne le produit.

**Du contexte structuré, donc interrogeable.** On ne prompte pas deux cents
pages : on demande « les projets dont le vecteur de contexte est à distance *d* ».

> **Un meilleur LLM prédit ce qui est écrit dans les livres. Mdall prédit ce qui
> arrive sur les chantiers.**

## 3. Le grain : l'épisode, pas le document

L'unité de capitalisation n'est ni le projet, ni le document, ni la réponse.
C'est **l'épisode** :

```
épisode = (contexte, suite des sujets ouverts, constats rencontrés, issues)
```

Un projet en produit un, qui s'allonge. Un épisode est **daté de bout en bout** :
c'est ce qui rendra la mesure possible (§ 7).

### Le vecteur de contexte

C'est là que vit « la puissance du contexte ». Il doit être **structuré et
court** : structuré pour être calculable, court pour être comparable.

| ce qu'on garde | pourquoi | ce qu'on ne garde **pas** |
|---|---|---|
| nature d'ouvrage | c'est le premier discriminant | le nom du projet |
| procédés (béton, bois, mixte…) | ce qui décide des questions à venir | le maître d'ouvrage |
| phase | on ne rencontre pas les mêmes problèmes en APS et en EXE | les intervenants nommés |
| zone climatique / sismique / de neige | le classement, jamais la commune | la commune, l'adresse |
| ordre de grandeur (surface, niveaux, portée) | par tranches, jamais la valeur | les cotes réelles |
| rôles présents (BE structure, BCT, géotechnicien…) | qui est là change ce qui se dit | qui exactement |

**Aucune valeur de projet n'entre dans un vecteur de contexte.** C'est la règle,
et elle se vérifie par construction (§ 6).

## 4. Trois prédicteurs, du plus bête au plus fin

On les construit **dans cet ordre**, et on les mesure l'un contre l'autre.

**1. La fréquence globale.** « Après X, 62 % ouvrent Y. » C'est la **ligne de
base qu'il faut battre**. Si le moteur ne la bat pas, ce n'est pas un moat,
c'est une décoration — et il vaut mieux le savoir au premier mois qu'à la
troisième année.

**2. Le voisinage de contexte.** Les *k* projets les plus proches, et ce qu'ils
ont fait. **Sans modèle du tout** : c'est du comptage sur des vecteurs. C'est
là, et seulement là, que vit l'avantage.

**3. Le modèle.** Il ne prédit rien. **Il rédige.** Il met en français la
recommandation que les deux premiers ont calculée, et il cite les épisodes sur
lesquels elle s'appuie.

> **Le LLM ne prédit jamais ; il phrase.**

C'est le fondamental *« je dois pouvoir me passer de l'IA et du LLM »* appliqué
au moteur. Un moteur qui prédirait par le modèle serait exactement ce qu'on
craint : remplaçable par le prochain.

## 5. Trois prédictions, par difficulté croissante

| prédiction | ce qu'on dit | ce qu'il faut |
|---|---|---|
| **le sujet suivant** | « ouvrez *type de fondation* — 7 projets de même forme l'ont fait dans les 3 semaines » | la séquence, rien d'autre |
| **le constat qui vient** | « il est assez probable que le prochain problème soit la mitoyenneté » — **avec le remède**, puisque Mdall garde comment il a été levé | les constats **et leur issue** |
| **la divergence** | « cette fonction conclura autre chose que ce que vous affirmez » | le rejeu, qui existe déjà |

La troisième est celle qu'aucun concurrent ne peut copier : elle est
**arithmétique**. Les deux premières sont statistiques ; celle-là est un calcul
sur des fonctions signées.

## 6. La confidentialité, par construction

**Les conversations avec le copilote ne traversent jamais.** C'est une règle
absolue du produit, elle n'a pas d'exception, et le moteur de prédiction n'en
est pas une.

Plus largement :

> **La forme traverse, le contenu reste.**

« Profondeur hors gel = 0,60 m à Montholon » reste dans le projet. « Après
*profondeur hors gel*, 7 projets sur 10 ont ouvert *type de fondation* »
traverse.

Ce n'est pas une anonymisation **par nettoyage** — celle-là fuit toujours, sur
du texte libre, et il suffit d'une fois. C'est une anonymisation **par
construction** : la couche inter-projets ne tient ni document, ni nom, ni
commune, ni valeur. Elle ne tient que des **formes** et des **comptes**.

Et elle passe par **la même porte** que tout le reste : rien ne traverse sans une
signature (règle 1). Un projet **offre** au fonds commun, il n'y déverse pas. Ce
qui se verse d'un projet vers le fonds est une proposition comme une autre —
relue, signée, et refusable.

## 7. Comment on mesure les progrès

C'est la partie que tout le monde saute, et c'est celle qui décide si le reste
vaut quelque chose.

> **Une prédiction qu'on ne note pas est une intention** (règle 12).

### Prédire dans le passé

Mdall a des assertions **datées et ordonnées**. On peut donc rejouer : à la date
*T* du projet *P*, avec **seulement** ce qu'on savait alors, qu'aurait dit le
moteur ? Et qu'est-il arrivé après *T* ?

Cela donne des chiffres réels **avant d'avoir un seul utilisateur du moteur** :

- **précision@3** sur le sujet suivant, comparée à la ligne de base. Un moteur
  qui ne bat pas « le sujet le plus fréquent » n'a rien appris ;
- **le délai d'avance** sur un constat : combien de jours avant son ouverture
  l'aurait-on signalé ? Un moteur qui prévient la veille ne sert à rien ;
- **le taux de fausse alerte**, qui est le vrai coût. Trois recommandations
  fausses, et plus personne ne les lit — on a alors détruit ce qu'on met trois
  ans à construire.

### Deux pièges à poser tout de suite

**La boucle de complaisance.** Si le moteur dit « ouvrez ce sujet » et qu'on
l'ouvre, il aura l'air d'avoir raison. Il faut séparer, **dès le premier jour**,
les ouvertures **suggérées** des ouvertures **spontanées**, et ne noter que les
secondes. Sans cela, le moteur mesure son propre écho — et l'on ne s'en aperçoit
jamais, parce que les chiffres montent.

**Le démarrage à froid.** Un projet, la première année : le moteur sera mauvais,
et il doit **le dire**. « Sur 2 projets comparables » n'est pas « sur 40 », et
afficher les deux de la même façon détruirait la confiance qu'on met trois ans à
bâtir. Une prédiction porte donc toujours **sur combien elle repose**, comme une
affirmation porte sa provenance.

### Le carnet de bord du moteur

Chaque prédiction montrée s'écrit avec sa date, ce sur quoi elle reposait, et —
plus tard — ce qui est arrivé. C'est la mesure, et c'est aussi le corpus pour
l'améliorer. Un moteur dont on ne peut pas relire les erreurs passées ne
s'améliore pas : il change.

## 8. Ce qu'il faut faire **maintenant**, avant tout moteur

> **Remplir « ce qui a été examiné ».**

L'écran le dit déjà lui-même : *« Ce raisonnement ne dit pas tout : on ne sait
pas ce qui a été examiné. »* Ce champ vide **est** le moteur de prédiction.

C'est la donnée que personne d'autre n'a, et c'est la seule qu'on **ne peut pas
rattraper après coup** : on n'ira jamais redemander à quelqu'un ce qu'il avait
écarté en 2026, ni pourquoi.

La chose la plus utile à faire aujourd'hui pour un moteur qui sortira dans deux
ans, c'est de rendre ce champ **facile à remplir et impossible à sauter**. Tout
le reste — vecteurs, voisinage, mesure — se construira plus tard sur des données
qu'on aura. Celui-là, non.

C'est pour cela que le tri de la mémoire fait désormais remonter les sujets dont
le raisonnement ne dit pas tout (`docs/un-sujet-une-ligne.md`) : la première
brique du moteur de prédiction n'est pas un prédicteur, c'est **le fait de
remarquer ce qui manque**.

## 9. L'ordre dans lequel construire

1. **Remplir `examine`** — l'écran le réclame, le tri le remonte. Rien d'autre
   n'a la même urgence, parce que rien d'autre n'est irrattrapable.
2. **L'épisode et son vecteur de contexte** — une structure, pas un moteur. Elle
   se remplit rétroactivement sur les projets existants.
3. **La mesure** — « prédire dans le passé », avec la ligne de base. Avant tout
   prédicteur : sinon on ne saura pas si le premier vaut quelque chose.
4. **La fréquence globale** — le prédicteur bête, qui est la référence.
5. **Le voisinage de contexte** — le premier qui puisse battre la référence.
6. **La porte du fonds commun** — une proposition signée, d'un projet vers le
   fonds. Pas avant : tant qu'il n'y a rien à offrir, il n'y a pas de porte à
   surveiller.
7. **La rédaction par le modèle** — en dernier, et jamais au cœur.

## 10. Ce que ce moteur ne sera pas

**Il ne décidera rien.** Il propose d'ouvrir un sujet ; il ne le tranche pas, il
ne verse rien, et il n'écrit pas dans une mémoire de projet. La règle 1 vaut
pour lui comme pour le copilote.

**Il ne sera jamais silencieux sur ce qu'il ignore.** « Sur 2 projets
comparables » se dit. Un chiffre de confiance qu'on cache est un mensonge par
omission, et c'est exactement ce que Mdall existe pour empêcher (règle 5).

**Il ne remplacera pas le raisonnement.** Il dit « voilà ce qui est arrivé
ailleurs ». C'est un collègue qui a vu quarante chantiers, pas un oracle — et la
différence tient dans le fait qu'on peut lui demander **lesquels**.
