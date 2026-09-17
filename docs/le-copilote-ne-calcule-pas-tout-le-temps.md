# Le copilote ne calcule pas tout le temps, et sait montrer ce qu'il sait

## Le défaut, tel qu'il se lisait

Extrait d'une conversation réelle, trois messages de suite :

1. le pré-dimensionnement part, sur une contrainte de sol donnée à la main ;
2. « explique-moi comment tu as trouvé ce résultat » → **l'agent est relancé**,
   l'écran redemande la contrainte de sol, et la réponse affirme que « la
   contrainte admissible du sol a été trouvée dans la note de calcul » ;
3. « explique-moi comment fonctionne l'application » → **l'agent est relancé
   encore**, et la réponse se termine par « il manque la contrainte admissible
   du sol ».

Trois affirmations contradictoires sur une même valeur, dans trois messages
consécutifs, dont deux ne demandaient aucun calcul. Sur un chantier, c'est le
genre de contradiction qui fait refermer l'outil : si l'écran ne sait pas où il
a pris une valeur, que valent les cotes qu'il en tire ?

## Deux causes, et la seconde était la nôtre

**Les consignes ne disaient pas quand *ne pas* appeler un agent.** Elles
disaient « dès qu'une question demande une valeur qu'un agent sait calculer,
appelle-le », et rien d'autre. Or la moitié des questions d'une conversation ne
demandent aucun calcul : elles portent sur un résultat déjà là, sur l'outil
lui-même, ou ne sont qu'une remarque.

**Et le rappel de la note jointe était un ordre.** Il disait « appelle l'agent,
il l'y trouvera » — et il repartait avec **chaque** message tant que la note
était jointe, pas seulement avec celui qui demandait un calcul. Une note reste
attachée à la conversation ; elle ne redemande pas un dimensionnement à chaque
phrase. Le rappel décrit donc, maintenant, au lieu d'ordonner.

S'y ajoute une règle qui manquait, et qui vaut pour elle-même : **quand un agent
rend une demande de précision, la réponse ne contient aucun résultat, parce
qu'il n'y en a pas**. Ne jamais raconter un calcul qui n'a pas eu lieu, et ne
jamais dire où une valeur a été trouvée si l'agent ne l'a pas dit.

## « Utilitaire » devient « agent »

Le mot est remplacé partout où il se lit — à l'écran, dans les consignes du
modèle, dans la documentation. Ce qui garde son ancien nom est ce qui n'est pas
du vocabulaire : les chemins de fichiers, les identifiants de code, la colonne
`payload.utilitaire` de la base et la fonction `executer-utilitaire`. Les
renommer demanderait une migration et un redéploiement, pour un mot que personne
ne lit. **C'est une dette, et elle est assumée** : le jour où l'on touchera à
cette colonne, elle changera de nom avec.

## Le cerveau se lit depuis la conversation

### Ce qui manquait

On demandait au copilote comment l'application fonctionne, et il répondait
quelque chose de juste et de creux : « elle utilise une mémoire de projet »,
« elle intègre des agents spécialisés ». La même phrase vaut pour un projet
vide.

Il ne pouvait pas faire mieux : **il n'a pas le graphe**. Il reçoit la mémoire en
prose — pas les liens, pas leur couleur, pas la profondeur des chaînes. Tout ce
qu'il aurait dit du dessin aurait été deviné.

### Un agent qui lit, et qui ne calcule rien

`lire_le_cerveau` s'exécute **au navigateur**, comme le moteur de variante et
pour la même raison : le graphe y est déjà, c'est le dessin qu'on ouvre depuis la
Mémoire. Le porter au serveur en ferait un second calcul du même dessin, et deux
dessins d'un même projet finissent par ne plus se ressembler (règle 4).

Ils sont deux, désormais, à tourner au navigateur. C'est le **serveur** qui dit
lequel, par un rôle — `cerveau` ou `variante` : router sur le nom apprendrait au
navigateur un nom d'outil, ce que ce champ existait pour éviter, et l'écrire des
deux côtés le ferait diverger au premier renommage.

### Des nombres, et un récit déjà écrit

L'agent rend deux choses. Des **nombres** : affirmations, règles, liens et
combien passent par une règle, profondeur, domaines qui pèsent, ce qui est
signalé, ce qui pend. Et un **récit**, écrit dans le dépôt, pas par le modèle.

Le récit porte une grammaire visuelle, et une grammaire se cite — elle ne se
paraphrase pas. Un modèle qui traduirait « cube » en « carré » ou « orange » en
« rougeâtre » ferait chercher à l'écran quelque chose qui n'y est pas. Les
consignes lui disent donc de le reprendre **tel quel** et d'écrire autour.

Il est **générique dans sa forme et exact dans son contenu** : les phrases sont
écrites une fois, les nombres viennent du projet. Un projet de sismique et un
projet d'incendie ne lisent donc pas la même chose, sans qu'on ait eu à écrire
deux textes qui divergeraient.

### Ce que le récit explique

- **Les ronds** sont les affirmations. Leur taille dit leur poids — combien de
  raisonnements passent par elles —, leur forme dit leur nature : plein pour le
  socle, cerclé pour ce qui se rejoue, creux pour l'opaque.
- **Les cubes** sont les règles, posées entre leurs entrées et leur conclusion.
  Leurs crans disent leur complexité, qui n'est pas leur poids : une règle
  compliquée dont rien ne dépend est un coût, une règle simple dont tout dépend
  est un risque.
- **Un lien bleu** passe par une règle du projet : il se rejoue, donc une valeur
  changée en amont recalcule ce qui en découle.
- **Un lien orange** ne passe par aucune règle — un agent l'a déduit, ou il vient
  d'un rapprochement de noms. La dépendance est connue, mais elle ne se refait
  pas toute seule : il faut rouvrir l'agent, relancer, reverser.
- **Le rouge est hors de l'échelle** : il ne dit pas que c'est chaud, il dit que
  l'audit a relevé quelque chose.

D'où la phrase qui compte, et qui n'est pas une question de goût : **un dessin
plus bleu vaut mieux parce qu'il est plus rejouable**, pas parce qu'il est plus
joli.

### Deux endroits décident d'une couleur, et ils doivent s'accorder

Le dessin calcule la couleur d'un lien dans sa boucle d'animation, pour peindre,
et n'en garde rien. Ce module la recompte pour l'écrire. C'est exactement le cas
où deux réponses à une même question divergent sans que personne le voie : le
dessin resterait juste, le texte deviendrait faux. Un test construit donc le
**vrai** graphe et vérifie que le compte tombe sur le critère du dessin.

### La carte, dans le fil

Le cerveau est une toile animée qui prend l'écran. Le poser dans une bulle de
conversation en ferait une vignette illisible — et une boucle d'animation par
message, qui tournerait encore trois écrans plus haut.

La carte dit donc **ce que le dessin contient**, en trois chiffres, et l'ouvre en
grand d'un bouton : ce que le projet sait, ce qu'il sait refaire, et ce qui se
rejoue. Le dernier est celui qu'on regarde. Le bouton rouvre **le matériau que
l'agent a lu**, pas une relecture : sur un projet qui bouge, la différence se
voit au premier versement.

## Trois réglages d'écran

- **Fondations** : « ← Tableau de l'étude » monte sur la ligne du titre, avant
  « Fondations superficielles », en gris, comme un fil d'Ariane. Il était dans la
  barre de la semelle, entre la désignation, le nombre de massifs, le volume et
  les flèches — noyé au milieu de ce qui décrit la semelle ouverte, alors que
  c'est le seul geste qui n'en parle pas. « — calcul » et la phrase sur le
  serveur s'en vont avec.
- **Les titres de filtre d'en-tête** passent à quatorze pixels. Ils en faisaient
  douze, comme un libellé de formulaire — sauf qu'un filtre n'est pas un
  libellé : c'est le nom de la colonne qu'on restreint, et il se lit à côté des
  titres de colonnes.
- **La Mémoire** dit de nouveau « Déclarer une hypothèse ».
