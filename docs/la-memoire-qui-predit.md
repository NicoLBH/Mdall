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
Mdall est le seul à la collecter. Le web est plein de bonnes réponses ; il est
vide de *mauvaises réponses avec la raison de leur rejet*. Un modèle ne peut pas
savoir que l'évidence était fausse sur ce chantier-là.

Et elle ne se **demande** pas : elle se **constate**. Une valeur remplacée, un
document arrivé après coup, une ligne refusée en revue avec son motif — quatre
traces que le travail normal laisse derrière lui, et que personne n'a saisies
(`docs/ce-quon-a-ecarte.md`).

**L'ordre dans lequel les questions se sont posées.** Les livres donnent les
réponses, jamais la **séquence** : après « profondeur hors gel » vient « type de
fondation », puis « reprise en sous-œuvre du voisin ». Cette suite n'est écrite
nulle part ailleurs que dans la chronologie d'une mémoire de projet.

**Ce qui s'est révélé faux après coup.** Le rejeu compare déjà ce qu'une
fonction conclut aujourd'hui à ce que le projet affirme, et dit « différente ».
Ce verdict-là est **calculé**, pas rédigé — aucun modèle ne le produit.

**Du contexte structuré, donc interrogeable.** On ne prompte pas deux cents
pages : on demande « les projets dont le vecteur de contexte est à distance *d* ».

Et l'on peut le remplir **sans brûler de modèle** : la séquence vit dans les
dates, les intitulés et les rôles, pas dans les corps de texte
(`docs/nourrir-mdall.md`).

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

> **Récolter les traces gratuites.**

Le champ « ce qui a été examiné » est vide partout, et c'est la donnée que
personne d'autre n'a. La première version de cette page en concluait qu'il
fallait le rendre « facile à remplir et impossible à sauter ». C'était une
erreur, et elle a été corrigée avant d'écrire une ligne :

> « Personne ne veut être le professeur d'une application qui va enrichir
> d'autres personnes grâce à l'effort qu'on lui demande de porter. »

Un champ dont le coût est immédiat et le bénéfice différé — et pour quelqu'un
d'autre — ne se remplit nulle part, dans aucun logiciel, jamais. Le rendre
obligatoire ne l'aurait pas rempli : il l'aurait rempli **de faux**, ce qui est
pire (règle 5).

> **Ce qui a été écarté se constate ; ce qui manque au constat se demande une
> fois, par lot, à celui qui vient d'en souffrir, et sous forme de clic.**

Mdall enregistre déjà des écartements, comme sous-produits du travail normal :
une valeur qu'un versement plus récent a remplacée, un document arrivé après
coup qui n'a pas fait foi, une ligne sortie du projet, et surtout **un item de
proposition refusé en revue — signé, daté, motivé**. Aucune interface, aucun
effort : du calcul sur ce qui existe (`services/ecarts-observes.js`,
`docs/ce-quon-a-ecarte.md`).

**Le champ cesse d'être vide sans que personne n'ait rien tapé.**

Et ce que le calcul ne peut pas voir — ce qui s'est passé dans une réunion — se
demande autrement : la raison d'un possible écarté se **choisit** dans un
domaine fermé de douze raisons du métier. C'est un clic ; et une liste fermée se
**compte**, ce que du texte libre ne fera jamais. Un moteur qui doit dire « 7
projets sur 10 ont écarté l'ardoise pour le délai » ne peut rien faire de cent
formulations du même refus.

C'est aussi pour cela que le tri de la mémoire fait remonter les sujets dont le
raisonnement ne dit pas tout (`docs/un-sujet-une-ligne.md`) : la première brique
du moteur de prédiction n'est pas un prédicteur, c'est **le fait de remarquer ce
qui manque**.

## 9. L'ordre dans lequel construire

1. **Récolter les traces gratuites** — les quatre gisements d'écartés que la
   mémoire porte déjà, et le domaine fermé des raisons. Rien d'autre n'a la même
   urgence, parce que rien d'autre n'est irrattrapable. *(fait —
   `docs/ce-quon-a-ecarte.md`)*
2. **La demande par lot** — la raison manquante se demande sur la ligne qui
   vient de dire « écarté en chemin » sans dire pourquoi, cinq d'un coup, et
   d'un clic. Rien ne relance, et laisser vide est une réponse.
   *(fait — `services/demande-par-lot.js`)*
3. **L'épisode et son vecteur de contexte** — une structure, pas un moteur. Elle
   se remplit rétroactivement sur les projets existants.
4. **La mesure** — « prédire dans le passé », avec la ligne de base. Avant tout
   prédicteur : sinon on ne saura pas si le premier vaut quelque chose.
5. **La fréquence globale** — le prédicteur bête, qui est la référence.
6. **Le voisinage de contexte** — le premier qui puisse battre la référence.
7. **La porte du fonds commun** — une proposition signée, d'un projet vers le
   fonds. Pas avant : tant qu'il n'y a rien à offrir, il n'y a pas de porte à
   surveiller.
8. **La rédaction par le modèle** — en dernier, et jamais au cœur.

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
