# Les fondamentaux

Ce qui suit ne se discute pas au cas par cas. Ce sont les règles dont tout le
reste dépend, et une fonctionnalité qui en contredit une est fausse même si elle
marche.

---

## 1. Rien n'entre jamais directement dans la mémoire du projet

**Aucun écran, aucun utilitaire, aucun calcul, aucun modèle n'écrit dans la
mémoire du projet.** La seule voie est une **proposition**, et c'est un humain
qui la signe.

Ce n'est pas une précaution de plus : c'est ce qui donne sa valeur à la mémoire.
Une écriture directe perdrait quatre choses d'un coup.

- **L'histoire.** Une proposition dit ce qui a changé, et par rapport à quoi.
  Une écriture directe laisse une valeur nouvelle sans rien pour la comparer à
  l'ancienne.
- **La responsabilité.** Quelqu'un assume le changement, avec son nom et sa
  date. « L'utilitaire l'a écrit » n'est pas une réponse en réunion.
- **Les conflits.** Une proposition se confronte à ce que le projet a déjà
  décidé, et les contradictions se règlent **avant** d'entrer, pas après.
- **Le retour en arrière.** On pourra défaire une proposition — *on avance en
  défaisant, on ne recule jamais*. On ne défait pas une écriture qui n'a jamais
  été un acte.

### Le chemin, et il n'y en a pas d'autre

```
Copilote            l'Atelier              la Proposition            la Mémoire
on discute,   →   on entre dans le    →   ce qui a changé,      →   ce que le
on échange,       détail, on produit      qui l'assume, les         projet tient
on réfléchit      de la matière           conflits arbitrés,        pour vrai
                  exploitable             la signature humaine
```

Une étape intermédiaire existe et compte autant : **le sujet**. On y débat avec
l'équipe du projet avant de proposer quoi que ce soit.

> L'architecte : « Socotec, j'ai mis 2 niveaux sous le niveau de référence,
> pouvez-vous confirmer ? »
> Socotec : « Non, le premier niveau n'est pas comptabilisé, les secours peuvent
> y accéder : un seul niveau de sous-sol. »
> L'architecte : « Ok, je modifie, je ferme le sujet et je fais une proposition
> dans ce sens. »

Il met alors ses données à jour dans l'utilitaire, il recalcule, **puis** il
transforme en proposition — et c'est là que les tests, la détection de conflits,
leur arbitrage et la signature ont lieu.

### Défaire, c'est proposer de plus

Une proposition fusionnée se **défait**, depuis la ligne qui raconte sa fusion.
Rien n'est effacé et rien n'est rejoué à l'envers : le geste prépare **une
proposition de plus** — celle qui remet ce qui valait avant — et quelqu'un la
signe. La mémoire portera l'aller *et* le retour, ce qui est exactement ce qu'on
veut relire six mois plus tard.

Deux cas, et le second compte autant que le premier :

- l'affirmation en remplaçait une autre → on remet **celle d'avant**, telle
  qu'elle était écrite ;
- elle n'en remplaçait aucune → elle est **écartée**. Elle reste lisible ; un
  refus est une information.

Ce qu'on ne défait pas : une affirmation qu'une décision **plus récente** a déjà
remplacée. La défaire ressusciterait une valeur périmée par-dessus un choix
postérieur que personne n'a demandé d'annuler. La proposition le dit, plutôt que
de laisser croire à un retour en arrière complet qui n'a pas eu lieu.

### Un retrait est un refus

Sortir un document du corpus, écarter une affirmation : c'est le même geste, et
le vocabulaire existait déjà. Un **item refusé** — un document refusé passe hors
corpus, une affirmation refusée entre en mémoire comme écartée. Rien n'est
effacé : le fichier reste en base, visible et marqué, et l'on sait quand et par
qui.

C'est ce qui manquait pour oser déposer. Un document ajouté par erreur n'avait
aucune correction, et la seule issue était de vivre avec.

### On ne signe pas sans savoir ce que le projet dit déjà

Une proposition qui n'affiche que ce qu'elle apporte demande de connaître par
cœur l'état de la mémoire. Personne ne le connaît. L'onglet **Changements**
montre donc les deux valeurs côte à côte, une ligne par sujet — ce que le projet
dit aujourd'hui, ce que la proposition en dirait — et l'écart se lit sans rien
ouvrir.

Quatre lectures, et une seule demande une décision :

| Ce qu'on voit | Ce que ça veut dire |
| --- | --- |
| la colonne de gauche est vide | une **entrée nouvelle** |
| les deux diffèrent | une **correction** — c'est pour elle que le tableau existe |
| la colonne de droite est vide | un **retrait** |
| les deux disent la même chose | rien ne change, et on l'affiche quand même |

Sur une proposition **fusionnée**, « aujourd'hui » mentirait : la mémoire porte
déjà ce que la proposition a écrit, et les deux colonnes afficheraient la même
valeur. On lit alors ce qu'elle a réellement écrit et ce que cette écriture
remplaçait — l'histoire est en base, il suffit de la lire au bon endroit.

Et si la mémoire n'a pas pu être lue, aucune ligne ne se prétend nouvelle : une
lecture ratée qui afficherait « le projet ne dit rien » ferait signer douze
corrections prises pour douze ajouts (règle 5).

### Ce que cela impose au code

- Un écran d'Atelier propose un bouton **« Transformer »**, jamais un bouton qui
  écrit. Ses deux issues sont *ouvrir un sujet* et *faire une proposition*.
- Le système **prépare** la proposition à partir de la matière produite dans
  l'Atelier : il la remplit, il ne la signe pas. Elle reste ouverte jusqu'à ce
  que quelqu'un la fusionne.
- `rememberProposition` est la porte de la mémoire. Les chemins
  `rememberHypothesis` et `rememberBaseDatum` restent réservés à la déclaration
  faite **à la main** dans l'écran Mémoire, où l'auteur est présent et signe par
  son geste. Aucun utilitaire ne les appelle.

---

## 2. Ce qui est dérivé se recalcule, ce qui a été décidé se conserve

Un degré coupe-feu se recalcule tant qu'il sert à décider : le référentiel
progresse, et une valeur gelée deviendrait fausse sans le dire. Le jour où
quelqu'un le **retient** — il l'écrit dans la notice, il l'annonce au maître
d'ouvrage —, ce n'est plus une lecture, c'est une décision : elle passe par une
proposition, et elle se conserve.

Corollaire : une base ne conserve jamais un résultat de calcul. Elle conserve
les **réponses** qui l'ont produit, et le calcul se refait.

---

## 3. Une conversation avec le copilote est privée

Elle appartient à qui l'a ouverte, dans les deux sens, et aucun collaborateur du
projet ne la voit. Ce n'est pas un réglage : c'est une propriété de la
construction — la table le refuse.

Ce qu'on veut partager se **transforme** : « Créer un sujet à partir de la
discussion » ouvre un sujet visible par l'équipe, dont les messages deviennent
des commentaires. Le geste est explicite, et c'est ce qui permet de parler
librement au copilote le reste du temps.

---

## 4. Une valeur écrite à deux endroits finit par diverger

Quand deux fichiers doivent porter la même liste et ne peuvent pas s'importer
l'un l'autre, **un test les compare**. Une divergence casse la construction
plutôt que de se découvrir six mois plus tard.

---

## 5. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien

Un écran qui n'a pas pu lire dit qu'il n'a pas pu lire. Il n'affiche pas une
liste vide, il ne remplit pas un champ d'une valeur plausible, et un modèle
n'invente jamais une entrée de calcul : il la demande, ou il s'en passe et le
dit.
