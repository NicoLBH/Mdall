# Ce qui compte dans une mémoire

**À quoi sert cette page :** la liste dit *ce qu'il y a*, le cerveau dit *comment
c'est relié*, et aucun des deux ne dit **où regarder**. Cette page dit pourquoi,
quelle définition de « l'important » se dérive au lieu de se décréter, et ce
qu'on en a fait.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le constat

Un projet de quatre cents affirmations ne se lit ni par une liste, ni par un
graphe.

La **liste** est rassurante, et c'est son métier : elle prouve ce que la mémoire
contient, on y vérifie, on y corrige. Mais c'est un inventaire.

Le **cerveau** montre les équilibres et la complexité. Mais c'est une topologie,
et il encode tout à poids égal : quatre cents nœuds qui comptent tous pareil font
une image, pas un instrument.

Un inventaire et une topologie ne sont pas des jugements. Il manquait l'objet qui
transforme un contenu en attention.

## La définition, et pourquoi elle ne se décrète pas

Le réflexe serait un score : pondérer le nombre de liens, la fraîcheur, le
domaine. Ce serait arbitraire, donc faux, et invérifiable — le pire des trois. Un
score affiché ne se conteste pas, donc ne se corrige pas.

Il existe une définition qui se **dérive**, et elle sort du badge de rejeu livré
au lot précédent :

> **Est important ce qui, s'il change, oblige un humain à rouvrir un choix.**

Pas « ce qui a beaucoup de liens » — c'est une topologie. Pas « ce qui est
récent » — c'est un journal. **Ce que ça coûte de se tromper.**

Et le détail est son exact inverse : **ce qui ne rouvre rien**. Si la machine
peut le refaire en silence, l'humain n'a pas à le voir — il se compte, il ne se
liste pas.

C'est la même leçon que les trois axes, une couche plus haut : *on ne déclare pas
l'importance, on la déduit de la position dans la chaîne.*

## Les deux sens, et il faut les deux

| | la question | où elle se lit |
| --- | --- | --- |
| **en amont** | qu'est-ce qui me tient ? | la pastille **« Rejeu »** — *se recalcule seule*, ou *s'arrête sur une décision d'untel, le 12/03* |
| **en aval** | qu'est-ce que je tiens ? | la pastille **« Si ça change »** — *3 choix humains à rouvrir* |

Le premier dit ce qu'une valeur traverse pour exister. Le second dit ce qu'il
faudra reprendre si elle bouge. Ensemble, ils donnent l'important sans qu'aucun
poids n'ait été choisi par personne.

## Où est écrit ce qu'un choix humain tenait pour acquis

C'est le point dur, et la réponse existait déjà sans que personne la lise.

Une **décision** seule est un cul-de-sac. Elle dit ce qu'elle a écarté, elle ne
déclare aucune dépendance, et rien ne pourrait donc la rouvrir : dans le graphe,
c'est une source.

Mais la fermeture d'un sujet verse **trois** lignes, pas deux — la décision, la
valeur, et le **raisonnement**. Et le raisonnement porte `porteSur` : *sur
quelles valeurs le débat portait*. C'est exactement l'amont d'un choix humain,
écrit au moment où quelqu'un a tranché.

C'est aussi la nuance de la page précédente, devenue du code :

- « **quelque soit** ce qui s'est dit avant, je décide que » → `porteSur` vide.
  Rien ne rouvre ce choix, et c'est exact.
- « **compte tenu de** ce qui s'est dit avant, je décide que » → `porteSur`
  nommé. Tout ce dont ces valeurs découlent rouvre le débat.

Un raisonnement qui ne le sait pas le **dit** déjà — `raisonnement-du-point.js`
écrit « on ne sait pas sur quelles valeurs il portait ». Il ne rouvre alors rien,
et c'est la vérité : personne n'a noté sous quoi ce choix avait été fait (règle 5).

## Comment le compte se propage

On part des **choix**, jamais des valeurs. Un projet porte peu de choix humains
et beaucoup de valeurs : une remontée par choix coûte un parcours du graphe, une
descente par valeur en coûterait quatre cents.

Pour chaque raisonnement, on prend les sujets de son `porteSur`, on retrouve les
affirmations qui les portent, et l'on **remonte** le graphe des dépendances.
Changer la commune change la zone climatique, donc la valeur sur laquelle on a
débattu, donc le débat est à refaire.

**La fonction qui conclut une valeur débattue rouvre le choix, elle aussi**, et
c'est exact : on a débattu de « H1a » ; changer la règle qui le conclut change la
conclusion. C'est précisément ce qu'un humain ne tient pas de tête en modifiant
un référentiel.

**Quel graphe ?** Celui qu'on a. La règle est écrite une fois, dans le module :
ce qui est enregistré l'emporte, le déduit prend le relais. C'est la même règle
que `liensDuRaisonnement`, et elle compte vraiment — une cote produite par un
**utilitaire** n'a aucune dépendance déduite des règles, et seule la lecture
enregistrée dit de quelle altitude elle découle. Un écran qui aurait oublié le
repli aurait annoncé « rien à rouvrir » sur toute une mémoire, sans que rien ne
le dise.

## Ce que le cerveau en fait, et la dette qu'il payait

**Le cerveau disait « Nature », et ce n'était pas le mot.** Socle, rejouable,
opaque ne disent pas ce qu'une affirmation *est* — ils disent si on sait la
refaire. La liste de la Mémoire, elle, emploie « nature » pour la colonne de la
base : constat, hypothèse, contrainte. Deux écrans, un mot, deux sens : on lisait
« Nature » ici, on cochait « Nature » là-bas, et l'on obtenait autre chose.

C'est **le rejeu**, et c'est le mot que la liste emploie déjà pour la même idée.
Un vocabulaire, deux écrans.

Le bandeau du cerveau gagne alors la seule phrase qui dise où regarder : *« 3 en
rouvrent un choix humain si elles changent »*. Les autres comptent ce qu'il y a ;
celle-ci dit ce que se tromper coûte. Et la bulle d'un nœud nomme qui a tranché.

**Zéro ne s'écrit pas.** « 0 affirmation n'en rouvre aucune » se lit comme une
mesure, alors que c'est le plus souvent l'absence de débat versé. Deux choses
différentes, et l'écran n'en affirme qu'une.

## Un défaut trouvé en chemin

**Un raisonnement versé se chipait « Décidé ».** Il porte `provenance: décision`
— c'est bien un humain qui a débattu et signé —, et l'autorité se lisait donc
avant sa nature. Le chemin et son aboutissement portaient le même mot, et l'on
revenait exactement à la confusion qu'on venait de retirer.

Or deux natures déclarent que **rien ne les tranche**, et ce n'est pas une
absence d'information : c'est une affirmation sur elles. Une nature qui l'affirme
passe donc devant sa provenance, et c'est la **forme** qui parle pour ces deux-là
— « Déduite ». Le dessin suit la même échelle que le mot.

## Ce qu'on n'a pas fait

**Pas de score, pas de rang, pas de classement.** Le module rend un nombre et les
choix qui le composent ; ce que l'écran en fait lui appartient.

**Pas de quatrième vue.** La suite est une note de synthèse — du texte, des
chiffres qui se cliquent —, et ce sera l'assemblage de ce nombre et de ce qui
existe déjà. La liste et le cerveau redeviennent alors ce qu'ils sont : des
instruments de vérification qu'on ouvre *depuis une phrase*.

**Pas de résumé écrit par un modèle.** Ces chiffres doivent tenir sans lui. Le
modèle pourra reformuler la note ; il ne doit jamais la produire (fondamental 13).

## Une limite d'épreuve, nommée

La remontée s'arrête sur ce qu'elle a déjà vu — sans quoi un graphe qui se lit en
rond la ferait tourner sans fin. **Ce garde-là ne s'éprouve pas par une
assertion** : sans lui, la remontée ne rend pas un mauvais compte, elle pend, et
la boucle est synchrone, donc aucun délai d'épreuve ne peut l'interrompre. Le cas
existe et il est écrit ; il est dit ici pour qu'on ne le prenne pas un jour pour
un cas qui garde quelque chose.

## Où ça vit

| ce qu'on cherche | où |
| --- | --- |
| ce qu'une valeur rouvre, et les choix qui le composent | `apps/web/js/services/ce-que-ca-rouvre.js` |
| ce qu'un choix tenait pour acquis | `apps/web/js/services/raisonnement-du-point.js` — `porteSur` |
| ce qui tient une valeur, en amont | `apps/web/js/services/axes-de-la-memoire.js` — `rejeuDuSujet` |
| le graphe des dépendances, déduit des règles | `apps/web/js/services/memoire-raisonnement.js` |
| le nombre, sur les nœuds du dessin | `apps/web/js/services/memoire-cerveau.js` |
| le bandeau, la bulle, le mot « Rejeu » | `apps/web/js/views/ui/cerveau-du-projet.js` |
| la pastille « Si ça change » | `apps/web/js/views/project-memory.js` |
| les trois axes d'une affirmation | `docs/les-trois-axes-dune-affirmation.md` |
