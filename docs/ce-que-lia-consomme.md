# Ce que l'IA consomme, et ce que ça coûte

**À quoi sert cette page :** elle porte l'étape 5 du plan de l'Atelier — le
compteur de consommation — et dit comment il se construit, dans quel ordre, et
ce qui est délibérément absent.

---

## Pourquoi ce compteur existe

Le fondamental 13 le dit : *« on n'accepte pas d'un modèle ce qu'on
n'accepterait pas d'un calcul — qu'il donne un résultat sans dire ce qu'il a
coûté ni sur quoi il s'est fondé »*.

Un coût invisible est un coût qu'on subit. Tant que Mdall n'était fait que
d'utilitaires déterministes, la question ne se posait pas : un calcul ne coûte
rien. Un appel de modèle, si — et cela change ce qu'on décide d'en faire.

## Les quatre endroits où le coût doit se voir

1. **À la requête** — chaque appel montre ce qu'il a consommé.
2. **Au projet** — l'onglet Indicateurs totalise ce que le projet a dépensé,
   tous collaborateurs confondus, **et** ce que celui qui regarde y a dépensé
   lui-même.
3. **À l'utilisateur** — *Profil › Factures et abonnement* montre sa
   consommation à lui, jour par jour, et sa répartition par projet.
4. **Dans la facture** — hors sujet pour l'instant, mais les trois précédents
   doivent additionner exactement ce qu'elle dira, faute de quoi personne ne
   leur fera confiance.

## Ce qu'on enregistre, et ce qu'on n'enregistre pas

**Une ligne par appel** : le projet, la personne, le modèle, les jetons entrés,
les jetons sortis, l'instant. Rien d'autre.

**Ni la question, ni la réponse.** Le compteur dit *combien*, jamais *quoi*.
Garder le contenu des échanges pour faire une addition serait un troc
inacceptable — et la règle de discrétion des conversations du copilote
l'interdit de toute façon.

**Les jetons sont repris tels que le fournisseur les annonce, jamais estimés.**
Un compteur approché est un compteur faux, et l'on lit un compteur pour décider
d'un usage. Quand le champ manque, on écrit `null` : « 0 jeton » serait une
affirmation, l'absence est un aveu (règle 5).

## Qui écrit, et pourquoi pas le navigateur

**Le serveur.** C'est lui qui appelle le modèle, lui qui reçoit le décompte, et
lui seul qui peut garantir que la ligne correspond à un appel réel. Laisser le
navigateur écrire son propre compteur reviendrait à demander à chacun de
déclarer sa consommation.

## Le prix

Il vit **à un seul endroit**, avec la date à partir de laquelle il s'applique.
Un tarif recopié dans l'écran et dans le calcul finit par diverger de lui-même
(règle 4), et l'on ne saurait plus lequel des deux la facture suit.

Le coût affiché est **une estimation, et le dit**. Elle se calcule à partir de
jetons réels et d'un tarif public ; elle n'est pas la facture, qui peut porter
des remises, des paliers ou des taxes. Présenter une estimation comme un montant
dû serait exactement le genre de précision fausse que Mdall refuse ailleurs.

---

# Les étapes

## Étape 1 — Le registre

Une table `ai_usages` : une ligne par appel. Chacun voit les siennes ; les
collaborateurs d'un projet voient celles du projet, parce que le total du projet
doit s'expliquer.

Un module partagé côté serveur, qu'un appel de modèle utilise pour déposer sa
ligne. **Il ne fait jamais échouer l'appel** : un compteur qui casse une
réponse ferait payer l'essentiel par l'accessoire.

## Étape 2 — Le prix et les totaux

Un service **pur** : le tarif par modèle, la conversion en euros, le total par
jour, la répartition par projet, la part de chacun. Aucun réseau, aucun DOM —
c'est de l'arithmétique, et elle se vérifie.

## Étape 3 — Les deux écrans

**Profil › Factures et abonnement** : la consommation journalière du mois en
courbe, une carte qui donne les jetons entrés, les jetons sortis, leur somme, le
tarif appliqué et le montant en euros, puis la répartition par projet.

**Projet › Indicateurs** : la même chose pour ce projet — le total de tous les
collaborateurs, et en dessous la part de celui qui regarde.

Le graphique est **celui qui existe déjà** (`utils/svg-line-chart.js`, celui de
l'évolution des sujets). Un second composant de courbe divergerait du premier au
premier ajustement.

## Étape 4 — À la requête *(reste à faire)*

Le décompte, à côté de la réponse, au moment où elle arrive. C'est la place la
plus utile et la plus difficile : il doit se voir sans encombrer la lecture.

## Étape 5 — Les autres appels de modèle *(faite)*

Onze natures d'appel déposent désormais leur ligne : le copilote, la lecture des
comptes rendus, celle des rapports de contrôle, celle des figures, celle des
notes de calcul, la transcription manuscrite, le relevé et la levée
d'observations, la note de dépôt, le titre de proposition, l'échange dans un
sujet.

**Deux garde-fous, et ils mordent tous les deux.** Un test relit les fonctions
et refuse qu'une seule appelle un modèle sans compter ; un autre refuse qu'une
nature déposée n'ait pas son nom à l'écran — sans quoi elle s'afficherait sous
son code brut, et personne ne saurait de quoi il s'agit.

## Étape 6 — Où va l'argent *(faite)*

**C'est la question qui fait décider**, et elle passe donc en premier sur les
deux écrans. Un total par projet dit *combien*, jamais *pour quoi faire* : on ne
change pas ses habitudes en apprenant qu'un chantier coûte douze euros, on les
change en apprenant que dix de ces douze partent dans la lecture de PDF. Et
l'inverse vaut autant — voir que la rédaction des titres coûte trois centimes
dispense de s'en priver.

Chaque ligne nomme **le geste**, pas la fonction : « Lecture des comptes
rendus », et non « extract-sujets ». Le nom technique n'apprend rien sur ce
qu'on pourrait faire autrement.

---

## Ce que cet ordre refuse

**Afficher avant d'enregistrer.** Un écran qui montrerait une consommation
calculée à la volée depuis les conversations serait faux le jour où l'on change
de modèle, et impossible à recouper avec une facture.

**Estimer les jetons quand le fournisseur ne les donne pas.** Mieux vaut un
total qui dit « trois appels n'ont pas rendu leur décompte » qu'un total rond
qu'on ne peut pas défendre.
