# Ce que le corpus réel raconte

Neuf mille quatre cent quatre-vingt-huit affirmations en mémoire, et **deux
idées** en sortent. Les deux sont fausses. Ce document dit pourquoi, mesure par
mesure, parce que la réponse ne se devine pas et qu'elle change ce qu'il faut
construire ensuite.

Il a été écrit en lisant le corpus pour de vrai, par la porte du mode
développement. Les chiffres sont ceux du fichier lu le 1ᵉʳ octobre 2026 ; aucune
phrase de chantier n'est recopiée ici.

## Le fichier lu n'était pas le corpus

Première chose, et elle invalide tout le reste si on l'ignore : le fichier
emporté portait **mille lignes, pas neuf mille quatre cent quatre-vingt-huit**.

Mille n'est pas un nombre de hasard. C'est `db-max-rows`, le plafond que
PostgREST applique à toute réponse en lignes. Il s'applique au transport, après
la fonction, et la fonction ne le voit pas — sa propre limite de vingt mille n'y
changeait rien.

Le fichier n'en disait rien. Il annonçait « 1 000 affirmations, dont 998 dont le
découpage ne tire rien » : une phrase juste sur un corpus faux. Et comme le tri
groupait par chantier, les mille lignes venaient toutes du **premier** — de quoi
conclure qu'un seul chantier écrit, ce qui est faux aussi.

Le défaut n'était pas la troncature. C'était son silence (règle 12). La fonction
rend maintenant un seul document, qui dit ce qu'il porte et ce que la base
porte ; l'écart se lit au lieu de se subir.

**Conséquence pour la suite de ce document** : les proportions ci-dessous sont
celles de l'échantillon de mille, qui est le début alphabétique d'un seul
chantier. Elles décrivent ce chantier-là avec certitude, et le corpus par
vraisemblance. C'est dit ici pour qu'on ne les cite pas comme le corpus entier.

## Le corpus se répète dix fois

Sur ces mille lignes : **quatre-vingt-quatorze textes distincts**. Dix virgule
six copies par texte en moyenne, et jusqu'à **trente-quatre** copies du même.

Cela change le sens de tous les chiffres de la console. « 68 affirmations sur
9 488 énoncent un lien » se lit comme « 68 phrases sur 9 488 phrases ». Si le
corpus porte quelques centaines de phrases distinctes, le dénominateur compte
des copies et la proportion ne mesure pas ce qu'elle dit mesurer.

Trois causes, et elles n'appellent pas le même travail :

- **L'histoire.** Une affirmation remplacée reste en base, et c'est voulu : une
  exécution qui a eu lieu ne devient pas fausse (règle 6). Mais une lecture qui
  compte l'histoire comme le présent compte un sujet autant de fois qu'il a été
  tranché. Rien à corriger dans la base ; c'est la lecture qui doit choisir.
- **Le ré-versement.** L'unicité porte sur `(proposition, nature, sujet)`. Elle
  empêche une proposition de verser deux fois le même sujet ; elle n'empêche pas
  dix propositions de verser le même.
- **L'intitulé partagé.** Deux sujets différents peuvent porter la même
  étiquette. Là, ce n'est pas un défaut : c'est le corpus qui n'est pas de la
  prose.

`la_repetition_du_corpus()` mesure les trois séparément. Elles ne s'additionnent
pas : une même ligne relève souvent de deux d'entre elles, et les sommer rendrait
un nombre plus grand que le corpus.

## Le corpus n'est pas de la prose : c'est un formulaire

C'est la vraie raison pour laquelle rien ne sort, et aucun découpage n'y changera
rien.

Sur les mille lignes :

- **964 sont des intitulés d'avis** — une étiquette suivie de rien, ou d'un mot.
  Soixante-six étiquettes distinctes, recopiées.
- **35 sont de la forme `étiquette : valeur`** — vingt-sept distinctes.
- La médiane fait **huit mots**.
- **1 texte sur 94 porte un verbe conjugué.**
- **2 textes sur 94 portent un mot de liaison**, où que ce soit dans la phrase.

Un découpage qui cherche « donc », « car », « à condition que » entre deux
membres de phrase ne peut rien tirer d'une liste de cases cochées. Ce n'est pas
une limite de méthode qu'on repousserait avec un meilleur modèle : il n'y a pas
d'énoncé à lire. **La matière est ailleurs** — dans le texte écrit *sous* ces
étiquettes, que le versement n'a pas gardé.

## Et les deux idées qui sortaient étaient fausses

Les deux, et pour deux raisons différentes. Les nommer vaut mieux que les
compter.

**La première** venait d'une phrase du genre « Accès des véhicules lourds :
interdit au-delà de 3,5 t », et rendait :

    accès  —empêchement→  delà

Le découpage avait bien travaillé : « interdit » est un empêchement, et il est
bien entre les deux membres. C'est le terme de droite qui est un morceau de
locution. `le_terme_de_tete` normalise le trait d'union en espace — « au-delà »
devient « au dela » —, écarte les mots de moins de quatre lettres, donc « au »,
puis les mots-outils. « dela » faisait quatre lettres et n'était pas dans la
liste : il passait.

Les morceaux de locution de lieu y sont maintenant : « dela », « deca »,
« dessus », « dessous », « dedans », « dehors ». On s'arrête là, et c'est
volontaire : un mot-outil retiré de trop est un terme technique qu'on ne verra
plus jamais, et cela ne se rattrape pas en regardant l'écran — l'idée manquante
ne s'affiche pas. « joint » vient de « ci-joint » aussi souvent que d'un joint
de dilatation, et il reste.

**La seconde** venait d'une phrase du genre « Alarme aux usagers du parc :
exigé ». Le mot de liaison était le **dernier mot** : à sa droite, il n'y avait
rien. L'idée sortait avec `apres` vide.

Sur deux idées, donc, **zéro** qui tienne. Et c'est une meilleure nouvelle qu'un
chiffre de deux : un chiffre faux qu'on croit vrai arrête le travail.

## Ce que cela dit de la suite

1. **Le suivi des avis du bureau de contrôle devient la priorité.** Les 9 488
   sont pour l'essentiel des étiquettes d'avis ; le texte qui porte un
   raisonnement est celui écrit *sous* l'étiquette, et il n'est pas en mémoire.
   C'est le troisième lecteur à construire, et il a maintenant une raison
   chiffrée.
2. **Les dénominateurs de la console doivent choisir** entre l'histoire et le
   présent. La mesure existe ; l'arbitrage reste à faire, et il se fera en
   voyant les deux chiffres côte à côte.
3. **Un découpage meilleur n'est pas le prochain travail.** Il l'aurait été si
   le corpus était de la prose mal lue. Il est un formulaire bien lu, et ce
   n'est pas le même chantier.
