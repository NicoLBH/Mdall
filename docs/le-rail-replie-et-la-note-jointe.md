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

L'icône est **grise**, comme dans les Fichiers — dans l'en-tête de l'aperçu aussi,
et dans le fil une fois la note partie avec la question. Le rouge d'un PDF est la
couleur d'une alerte partout ailleurs dans l'écran, et une note jointe n'en est
pas une.

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

## `assertions is not defined`

Une régression, et la plus coûteuse de la série : `assertions` — les affirmations
de la mémoire du projet — avait été déclaré dans la branche qui les **annonce à
l'écran**, et non au niveau de la fonction d'envoi. Elles servent bien plus bas :
les agents s'en pré-remplissent, et le moteur de variante les compare à ce
que le projet tient pour vrai.

Le résultat est une ligne rouge sous la zone de saisie, **au premier appel
d'outil** — c'est-à-dire sur la question la plus chère de l'écran, celle qui
vient avec une note de calcul. La question partait, la réponse ne venait jamais,
et le message ne disait rien de la cause.

Rien ne pouvait le voir : la syntaxe est valide, le dépôt n'a pas de linter, et
`copilote-service.js` ne s'importe pas dans un test — l'authentification tire son
client d'un CDN, et l'import lève avant la première ligne.
`copilote-portee.test.mjs` relève désormais la profondeur d'accolades de chaque
déclaration de la fonction d'envoi, et refuse qu'une valeur employée par la
boucle des outils soit déclarée dans une branche.

## L'aperçu est dessiné par l'application, plus par le navigateur

C'était un cadre pointant sur la note en mémoire, et le navigateur y mettait son
propre lecteur. Il sait le faire — **mais il peut aussi refuser** : « toujours
télécharger les PDF » est un réglage courant de Chrome, et le cadre affichait
alors son écran de téléchargement, avec l'identifiant de l'objet en guise de nom
et un bouton « Ouvrir ». Une note qu'on vient de joindre et qu'on ne peut pas
regarder d'un coup d'œil fait douter de tout ce qui suit : si l'écran ne sait pas
montrer le PDF, que vaut ce qu'il en tirera ?

Les pages sont donc dessinées par **le lecteur de l'application** —
`services/ct-lab-pdf-view.js`, celui de l'onglet Documents. Le moteur est vendu
dans le dépôt, le rendu ne dépend d'aucun réglage de navigateur, et c'est le même
que partout ailleurs.

Trois conséquences, toutes voulues :

- le décodage du base64 vit dans `piece-jointe.js` (`octetsDeLaPiece`), d'où
  sortent aussi bien les octets du lecteur que l'adresse du recours : deux
  décodages du même base64 finiraient par ne plus rendre le même document ;
- **l'adresse d'objet ne sert plus qu'au recours** — « Ouvrir dans un onglet »,
  pour imprimer ou garder la note à côté ;
- **l'aperçu dit où il en est** : en lecture, lu, ou en panne. Un cadre vide, un
  cadre qui lit et un cadre en panne se regardent exactement pareil (règle 5).

Les pages se repeignent après chaque rendu, et **seulement si le conteneur est
vide** : l'écran se redessine entièrement, les canevas partent avec lui, mais
repeindre à chaque frappe relirait le document. La page prend la largeur du
conteneur, et non une largeur écrite en dur — sinon la fenêtre s'agrandit et la
page reste étroite au milieu.

## L'aperçu emprunte la fenêtre de l'application

Il tenait entre le fil et la saisie, dans quatre cent vingt pixels où une page A4
arrivait illisible. Or la seule chose qu'on demande à un aperçu est de pouvoir
**jeter un œil** : s'il faut plisser les yeux, autant ouvrir le fichier ailleurs,
et le geste n'a servi à rien.

J'en avais d'abord dessiné une à lui : sa coque, son voile, son en-tête et sa
croix. C'était une erreur, et de la classe que la règle 10 nomme — deux fenêtres à
recalibrer l'une contre l'autre, qui divergent au premier réglage. Mdall en a une,
`#detailsModal`, qui attend dans le document depuis toujours et que le détail d'un
sujet remplit déjà de son contenu.

`ui/fenetre-de-details.js` la prête à qui en a besoin. On lui donne trois
morceaux — le titre, ce qui se pose à droite de l'en-tête, le corps —, elle rend
le corps pour qu'on y peigne, et on lui confie de quoi défaire ce qu'on retenait.
La croix, le voile et Échap y mènent tous les trois, et le Copilote n'en porte
plus aucun.

Deux choses qu'elle ne fait pas, et qui comptent :

- **elle n'écrit pas dans le magasin.** Le détail d'un sujet retient son ouverture
  dans `store.*.detailsModalOpen`, parce que son écran se redessine et doit la
  rouvrir. L'aperçu d'une note est un geste : écrire ce drapeau ferait croire à
  l'écran des sujets que **sa** fenêtre est ouverte, et il la remplirait de son
  contenu au premier rendu ;
- **changer ce qu'elle montre ne la referme pas.** Une note qu'on lit puis qu'on
  n'a pas su dessiner était réaffichée en rouvrant la fenêtre — et rouvrir referme
  d'abord : le nettoyage partait, l'aperçu était oublié, et la fenêtre restait
  ouverte sur une note dont plus personne ne se savait propriétaire. La croix ne
  rendait plus les octets, et le clic suivant rouvrait au lieu de fermer. Rien à
  l'écran ne le disait.

Un réglage, et un seul, lui est propre : `#detailsMetaModal` est masqué par défaut,
et le lien « Ouvrir dans un onglet » y mesurait zéro pixel de large. Seule la
mesure au navigateur pouvait le voir — le HTML était juste, et l'élément était là.

## La note n'était plus ouvrable une fois la question partie

Elle se voyait dans la bulle où elle a servi, mais son nom n'y était qu'un texte.
On relit une réponse, on veut revoir la note sur laquelle elle s'appuie : il
fallait rouvrir le fichier ailleurs — **sortir de l'écran pour vérifier ce que
l'écran vient d'affirmer**. La pastille de la zone de saisie s'ouvrait, elle ;
la ligne du fil désignait la même note et ne s'ouvrait pas.

Les deux portent désormais le même repère, `data-copilote-apercu`, et la même
délégation les sert. Ce dessin est parti dans `note-jointe.js`, où il s'exécute
dans un test : l'écran du Copilote parle à la base, et ne s'importe pas.

On ne l'ouvre que si l'on a **encore ses octets**. Ce qu'une discussion
enregistre, ce sont le rôle et le texte : la note relue d'une session d'avant n'a
plus de contenu, et un bouton qui rendrait un cadre vide ferait croire que le PDF
l'est (règle 5). Le nom reste, puisqu'il dit toujours sur quoi la réponse
s'appuyait.

## La note est-elle vraiment dans le navigateur ?

La question valait d'être posée — un aperçu qui ne s'affiche pas ressemble
exactement à un lien mort vers un fichier resté ailleurs. Mesuré dans Chromium,
sur le vrai code servi en HTTP, du clic dans le fil jusqu'à la fermeture :

| Ce qu'on mesure | Ce qu'on lit |
| --- | --- |
| octets en mémoire | 552 |
| en-tête du fichier | `%PDF-` |
| pages lues par le lecteur | 1 |
| canevas dessiné | 1288 × 858 |
| lien « Ouvrir dans un onglet » | 167 px |
| **requêtes réseau pour la note** | **0** |
| à la fermeture | le nettoyage a joué une fois, le corps est vide |

Zéro requête : la note est lue par le navigateur au moment où on la dépose
(`lireLeFichier`), gardée en base64 dans l'état, décodée en octets pour le
lecteur. Il n'y a pas d'adresse d'origine, rien n'est demandé à personne, et
l'aperçu marche hors ligne.

## Le fil compacte les onglets, et le composeur a maigri

On désignait `null` comme source de défilement de l'écran : la coque du Copilote
ne défile pas — c'est le fil qui défile, à l'intérieur —, le bandeau du projet ne
voyait donc aucun mouvement et restait déplié. Sur un écran de conversation, ces
quarante-quatre pixels sont pris sur la seule chose qu'on y fait : lire.

La zone de saisie descend de trois lignes à deux, et garde ses marges basses. Elle
grandit avec le texte qu'on y met, jusqu'à quarante pour cent de la hauteur — ce
qui se perd est ce qui ne servait pas.

## Le chevron de l'épingle débordait lui aussi

Le bouton des vues épinglées porte une épingle **et** un chevron : cinquante-deux
pixels dans un rail qui en fait soixante-six, bord droit à soixante-dix. Replié,
le chevron s'en va avec les intitulés — dans une colonne d'icônes, plus rien ne
porte de libellé et c'est l'infobulle qui nomme : il n'a plus personne à
annoncer. Le bouton retombe à quarante pixels, comme les autres.
