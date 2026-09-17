# Le rail replié, et la note jointe

## Les discussions ne disparaissent plus au repli

Replié, le rail fait soixante-six pixels : un titre de discussion n'y tient pas,
et la feuille de style masquait l'historique. C'était honnête — mieux vaut rien
qu'une colonne de lignes vides — mais cela rendait les fils **inatteignables** :
pour en rouvrir un, il fallait déplier le rail, cliquer, puis le replier. Trois
gestes pour un.

Ils passent dans un menu, ouvert au clic sur la seule icône qui reste. « Nouvelle
discussion » y est **en tête**, parce que c'est ce que l'icône faisait avant : le
geste qu'on connaît ne disparaît pas, il change de place.

Le menu s'ouvre **à côté du rail**, et non sous l'icône : calé sur le bord droit
d'une entrée de quarante pixels, il sortirait de l'écran par la gauche.

Il se réécrit avec l'historique, ce qui n'allait pas de soi : il n'est pas dans
le groupe de l'historique, il est accroché à l'entrée du Copilote. Ne rafraîchir
que l'historique laissait, rail replié, un menu figé sur les discussions d'il y a
une heure — la question qu'on venait de poser n'y figurait pas.

## Le fond du survol débordait du rail

Une entrée qui porte un geste à droite — le kebab d'une discussion, l'épingle
d'une recherche mémorisée — réserve trente-quatre pixels pour lui. **Repliée,
l'action est masquée mais le retrait restait** : le fond du survol faisait
soixante-deux pixels dans un rail qui en fait soixante-six, il débordait sur le
trait de séparation et mordait sur l'écran.

Mesuré au navigateur : le fond s'arrêtait à 80 px pour un rail large de 66. Il en
fait maintenant 40, et s'arrête à 58 — centré sur l'icône, comme sur les entrées
qui ne portent aucun geste.

Les trois endroits que cela touchait sont exactement ceux qui portent une action :
le Copilote d'un projet, le Copilote transverse, et les recherches épinglées de la
Mémoire. Une seule règle les couvre — c'est le même composant.

## La note jointe : une pastille, pas un bandeau

Elle prenait toute la largeur de la zone de saisie : une seule note faisait une
barre, et deux n'auraient pas pu tenir côte à côte. Elle prend maintenant la
largeur de son texte, croix comprise, dans une rangée qui saura en aligner
plusieurs le jour où l'on en joindra deux.

L'icône est **grise**, comme dans les Fichiers — dans l'aperçu aussi, croix de
fermeture comprise. Le rouge d'un PDF est la couleur d'une alerte partout ailleurs
dans l'écran, et une note jointe n'en est pas une.

## Les gestes de la note passent par délégation

Ils étaient branchés sur les nœuds eux-mêmes, un par un. Or ces nœuds naissent et
meurent à chaque rendu — et la pastille vit dans la zone de saisie, qui se
redessine dès qu'un message arrive, qu'une note est jointe ou que l'aperçu
s'ouvre. Un écouteur posé sur le nœud d'avant ne tient plus sur celui d'après, et
**rien ne le dit** : le clic ne fait simplement rien.

L'écoute est posée sur la coque, qui ne bouge pas, et **une seule fois** : le
branchement court après chaque rendu, et une écoute de plus à chaque fois ferait
retirer la note autant de fois qu'on a redessiné.

Deux boutons portaient par ailleurs le même identifiant `copiloteRetirerPiece` —
celui de la pastille et celui de la barre d'outils. Un identifiant écrit deux fois
dans une page n'en désigne plus qu'un, le premier. Les deux étant exclusives, le
défaut attendait tranquillement de cesser de l'être ; ce sont désormais deux
repères, et un seul geste les sert.

## Et un cadre qui n'affiche rien le dit

Le lecteur du navigateur peut refuser une note — un base64 tronqué, un fichier qui
n'est pas le PDF qu'il annonce. Le cadre restait alors vide, et rien ne
distinguait « ce PDF est vide » de « ce PDF n'a pas pu s'ouvrir » : les deux se
regardent pareil, et l'un fait rejoindre la note pour rien.
