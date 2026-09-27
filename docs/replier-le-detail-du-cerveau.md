# Replier le détail du cerveau

**À quoi sert cette page :** un graphe de quatre cents nœuds qui comptent tous
pareil est une image, pas un instrument. Cette page dit ce qu'on cache, pourquoi
le cacher ne coupe aucune chaîne, et ce que le pliage ne montre pas.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Ce qui manquait au dessin

Le cerveau encode le **nombre de liens** — une topologie. C'est ce qu'il faut
pour voir les équilibres et la complexité ; ce n'est pas ce qu'il faut pour
savoir où regarder. Un graphe devient lisible à l'instant où on l'autorise à
cacher, et il lui fallait pour cela un poids qu'il n'avait pas.

Il l'a depuis deux lots : **ce que chaque nœud rouvre s'il change**. Le pliage
n'est donc pas un réglage d'affichage, c'est l'application d'une définition déjà
posée — *est important ce qui, s'il change, oblige un humain à rouvrir un choix*.

## Replier ne coupe aucune chaîne, et ce n'est pas une chance

C'est le point qui rend ce pliage honnête, et il se démontre.

`ceQueCaRouvre` part des valeurs débattues et **remonte** le graphe. Ce qui porte
est donc exactement l'ensemble des **ancêtres** des choix humains — et un tel
ensemble est **fermé vers l'amont** : si un nœud est gardé, tout ce dont il
découle l'est aussi, par construction.

Aucun chemin entre deux nœuds gardés ne peut donc passer par un nœud plié. On
filtre les liens sur leurs deux bouts, comme on l'a toujours fait pour les
isolés, **sans rien relier à travers**. Un dessin qui cacherait un maillon en
laissant le trait par-dessus mentirait sur la forme du raisonnement, et c'est
exactement ce que cet écran refuse ailleurs.

On ne s'en remet pas à ce paragraphe : une épreuve le mesure sur le graphe
dessiné (règle 12).

## Ce que le pliage ne montre pas, et il le dit

**L'onde suit l'aval, et l'aval est justement ce qu'on vient de plier.** Cliquer
un nœud gardé lance une onde qui sort du dessin. Ce n'est pas un défaut du
pliage — on regarde ce qui porte, pas ce qui suit —, mais se taire ferait croire
à une onde qui s'arrête, c'est-à-dire à un projet où rien ne découle de rien.

La ligne du bas le dit donc, tant que la case est cochée.

## Le geste ne s'offre que s'il y a quelque chose à garder

Sur un projet sans débat versé, **rien ne porte**. Une case « ne montrer que ce
qui porte » y effacerait tout le dessin, et l'on chercherait longtemps ce qu'on a
cassé. Elle n'apparaît donc pas — même convention que les isolés, qui ne se
proposent que s'il y en a.

Et son libellé porte les deux nombres : *« Ne montrer que les 3 qui portent le
projet — 5 pliées : elles ne rouvrent aucun choix humain »*. « Ne montrer que 3 »
ne dit pas la même chose selon qu'on en plie cinq ou trois cents, et c'est
justement ce qu'on vient chercher.

## Le trou que ce lot a bouché, et il était plus gros que le lot

Deux décisions de cet écran vivaient dans une **fermeture** que rien ne pouvait
appeler : ce qu'on dessine, et ce que la ligne du bas raconte.

On l'a mesuré. Une mutation qui faisait ignorer au dessin les deux gestes —
replier, remettre les isolés — **traversait les six mille épreuves sans en faire
tomber une**. C'est pourtant la seule décision de ce dessin qui change *ce qu'on
voit*. Toutes les pièces qu'elle assemble étaient pures et éprouvées ; c'était
l'assemblage qui ne l'était pas.

> *Une fonction pure s'éprouve par son résultat ; un câblage ne s'éprouve que par
> le code qui le porte.*

Les deux sont sorties de la fermeture : `composerLeCerveau` dans le service,
`phraseDeCeQuOnRegarde` au module de l'écran. `recomposer()` n'est plus qu'un
appel, et les mutations tombent.

Le second trou s'est d'ailleurs vu **en cochant la case dans un navigateur** : le
dessin se repliait et la phrase continuait d'expliquer l'onde. Elle était écrite,
et rien ne la redemandait.

## Ce qui reste vérifié au clavier, et pas par la suite

**Un seul geste** : le fait que cocher la case appelle bien la recomposition. Une
mutation qui vide le gestionnaire survit à la suite — aucune épreuve de Node ne
coche une case. Il est vérifié dans Chromium, en mesurant l'encre du canevas
avant et après : le dessin maigrit. C'est dit ici plutôt que caché.

## Où ça vit

| ce qu'on cherche | où |
| --- | --- |
| ce qui porte le projet | `apps/web/js/services/memoire-cerveau.js` — `ceQuiPorte` |
| ce qu'on dessine, les deux gestes appliqués | `memoire-cerveau.js` — `noeudsDessines` |
| l'assemblage : places, liens, domaines, hémisphères | `memoire-cerveau.js` — `composerLeCerveau` |
| ce que la ligne du bas raconte | `apps/web/js/views/ui/cerveau-du-projet.js` — `phraseDeCeQuOnRegarde` |
| ce qu'une valeur rouvre | `apps/web/js/services/ce-que-ca-rouvre.js` |
| ce qui compte dans une mémoire | `docs/ce-qui-compte-dans-une-memoire.md` |
| la note qui dit où regarder | `docs/la-note-de-la-memoire.md` |
