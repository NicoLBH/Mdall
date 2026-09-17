# La note se regarde, et la Mémoire se range

## Grossir et pivoter, dans l'en-tête de la fenêtre

Une page A4 ramenée à la largeur d'une fenêtre se **reconnaît** — c'est un plan,
c'est une note — mais elle ne se **lit** pas toujours : une cote au huitième de
sa taille imprimée est un trait. L'aperçu d'une note jointe porte donc ce que
porte n'importe quel lecteur : réduire, le taux, agrandir, un filet, pivoter.
Puis le recours — ouvrir la note dans un onglet.

Trois choix, et le premier explique les deux autres :

- **les pages sont repeintes, pas transformées.** Une page grossie par
  `transform` est une image étirée : les traits d'un plan s'épaississent et les
  cotes deviennent illisibles — c'est-à-dire qu'on grossit précisément ce qu'on
  voulait lire, et qu'on le perd. Une page tournée par `transform` garde en plus
  la place de la page droite : le cadre reste haut et étroit autour d'un
  paysage, et la barre de défilement mesure une hauteur qui n'existe plus ;
- **le quart de tour s'ajoute à celui du fichier.** Un plan enregistré en
  paysage porte déjà `rotate: 90` ; écrire la rotation *à la place* de la sienne
  le remettrait droit, c'est-à-dire de travers ;
- **cent pour cent, c'est la largeur de la fenêtre**, et non la taille imprimée.
  Une A4 à sa taille réelle serait plus étroite que la fenêtre sur un grand
  écran, et « ajuster » l'aurait rétrécie. Le taux est un bouton, parce que
  c'est là qu'on revient au repos et que c'est là qu'on regarde déjà.

Les crans — 50, 75, 100, 150, 200, 300, 400 % — plutôt qu'un pas continu : on
veut « un peu plus grand », pas régler un curseur au centième. Aux bornes, le
bouton s'éteint : un bouton qui répond en ne faisant rien se lit comme un bouton
cassé.

## Le lecteur détruisait les octets qu'on lui donnait

Mesuré au navigateur, et invisible autrement : **pdf.js prend possession du
tampon et le détache.** Le `Uint8Array` qu'on lui a passé devient vide, et la
lecture suivante des mêmes octets lève `DataCloneError` — au fond d'un `try`,
donc sans rien à l'écran.

Le premier grossissement vidait donc la fenêtre. La barre continuait de
répondre, le taux passait à 150 %, et la page avait simplement disparu. Aucun
test ne pouvait le voir : le détachement demande un vrai navigateur, et la
sonde ne l'a trouvé qu'en cliquant deux fois.

Un lecteur qui détruit ce qu'on lui donne est un piège pour chacun de ses
appelants. La copie se fait donc **une fois, chez lui** (règle 4) — et c'est une
copie du contenu, pas du tampon entier : les octets d'une note lue par morceaux
arrivent parfois comme une fenêtre sur un tampon plus grand, et lui donner ce
qu'il y a autour serait lui donner autre chose que le document.

Chaîne remesurée dans Chromium, sur le vrai code : 100 % → 1288 × 858, 150 % →
1932 × 1288, 200 % → 2576 × 1717, ajuster → 1288 × 858, pivoter → 1288 × 1932,
pivoter deux fois → 1288 × 858, 50 % → 644 × 429 et le bouton « réduire »
éteint. Zéro erreur.

## Les gestes du contenu d'une fenêtre

`ui/fenetre-de-details.js` prête `#detailsModal` à qui en a besoin ; il lui
manquait de quoi écouter ce que ce contenu porte. L'écoute est sur la coque, qui
ne bouge pas, et elle appelle **celui du moment** : le contenu se réécrit — une
barre d'outils dont un bouton change d'état, un corps repeint —, et des
écouteurs posés sur ses nœuds mourraient avec eux. Refermée, la fenêtre n'écoute
plus personne : sinon un aperçu fermé recevrait les clics de la fenêtre suivante,
et tournerait une note qui n'est plus là.

## Le fil compacte enfin le bandeau d'onglets

Le Copilote désignait son fil comme source de défilement ; l'Atelier désignait sa
propre coque. **Deux endroits décidaient de la même chose**, et le dernier arrivé
gagnait selon le chemin par lequel on était entré : par le rail des discussions,
le fil l'emportait ; en arrivant sur l'écran, la coque. Or la coque du Copilote
ne défile pas — elle tient dans la hauteur, c'est le fil qui défile à
l'intérieur. Le bandeau ne voyait donc rien bouger et restait déplié.

Le panneau qui défile autrement le **déclare** (`data-defilement-du-panneau`), et
l'Atelier le lit. Les deux ascenseurs sont enregistrés : celui qui bouge devient
la source, sans que personne ait à trancher d'avance. Et la déclaration se lit
**après** la bascule de panneau, pas avant — sinon c'est le panneau d'avant qui
répond.

Le panneau du Copilote réservait par ailleurs quarante pixels sous lui, le
retrait d'un écran qui défile — juste partout ailleurs dans l'Atelier. Ici la
saisie est déjà en bas : c'était du vide sous le composeur, pris sur la seule
chose qu'on fait sur cet écran.

## La Mémoire : une largeur, deux menus

### La largeur de travail d'un onglet

Elle était écrite à la main dans chaque écran — le bandeau des onglets, les
Fichiers, le détail d'une discussion, la lecture d'un compte rendu — et la
Mémoire, seule, en avait gardé une autre : mille douze pixels sous un bandeau
qui en fait mille deux cent quatre-vingts. On voyait le décrochement en passant
d'un onglet à l'autre. Une valeur écrite à plusieurs endroits finit par diverger
(règle 4) : c'est `--largeur-donglet`, et les cinq écrans la lisent.

### Le titre passait sous le rail

Il était posé **avant** la disposition à rail, donc calé sur le bord gauche de la
coque — c'est-à-dire sous la barre latérale, qui flotte par-dessus. « Toute la
mémoire du projet » commençait derrière le rail, et le bouton de droite
s'alignait sur une colonne que plus rien d'autre ne suivait. Mesuré : le titre à
176 px pour un rail large de 248. Il est dans le contenu maintenant, il part où
part le tableau et finit où finit la recherche — 424 px, comme tout le reste.

### Un menu qui écrit, un menu qui regarde

Ils étaient quatre sur la ligne du titre : Exporter, Verser, la bascule
Liste/Cerveau et la déclaration. Le titre d'une lecture filtrée peut faire trente
caractères, et les boutons changeaient de place selon la lecture ouverte — on
cherchait chaque fois celui qu'on venait d'utiliser.

**« + Ajouter » porte tout ce qui écrit ou sort la mémoire**, parce que c'est un
seul geste sous plusieurs formes : faire entrer quelque chose, ou l'en faire
sortir. Déclarer une hypothèse · verser les contraintes du site · reconstruire les
liens du raisonnement · exporter en JSON, en CSV, copier le dossier de contexte.
Son bouton principal ouvre le menu au lieu de déclarer : on n'ajoute pas, on
choisit quoi ajouter. Trois boutons obligeaient à savoir d'avance lequel portait
ce qu'on cherchait, et la reconstruction des liens dormait sous « Verser », où
personne ne la trouvait.

**« Affichage » ne fait que regarder**, et va donc avec la recherche : on
cherche, on filtre, et l'on choisit sous quelle forme lire ce qui reste. « Liste »
y est éteinte — c'est ce qu'on regarde déjà ; elle dit qu'il y a deux façons de
lire et laquelle est ouverte. Le cerveau s'ouvre par-dessus et se referme sur
elle : il n'y a pas de troisième écran.

Les deux listes vivent dans `views/project-memoire-gestes.js`, qui ne parle à
rien et s'exécute donc dans un test. Ce n'est pas un détail de rangement : **une
entrée qui disparaît d'un menu ne laisse aucune trace**. L'écran se dessine, le
menu s'ouvre, il a l'air complet — et « Reconstruire les liens du raisonnement »,
qu'on utilise trois fois par an, n'existe plus. On ne s'en aperçoit que le jour
où l'on en a besoin, c'est-à-dire trop tard pour savoir quelle modification l'a
emportée.

## Les lignes en défaut : le doute, pas l'alerte

Le tableau des massifs mettait ses lignes en défaut au rouge de l'alerte. Un
massif qui ne passe pas n'est pas un incident : c'est un point à trancher. Il
prend l'ambre du doute, comme tout ce qui attend une décision dans
l'application.
