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
fermeture comprise, et dans le fil une fois la note partie avec la question. Le
rouge d'un PDF est la couleur d'une alerte partout ailleurs dans l'écran, et une
note jointe n'en est pas une.

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
les utilitaires s'en pré-remplissent, et le moteur de variante les compare à ce
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

## Et l'aperçu passe par-dessus l'écran

Il tenait entre le fil et la saisie, dans quatre cent vingt pixels où une page A4
arrivait illisible. Or la seule chose qu'on demande à un aperçu est de pouvoir
**jeter un œil** : s'il faut plisser les yeux, autant ouvrir le fichier ailleurs,
et le geste n'a servi à rien.

C'est donc une fenêtre sur un voile sombre, qui laisse voir la discussion autour —
on n'a pas quitté la conversation, on regarde une pièce. Elle se referme de quatre
façons : sa croix, la pastille qui l'a ouverte, le voile, et Échap. Un panneau qui
couvre l'écran et ne se referme que d'un côté se referme mal.

## Le chevron de l'épingle débordait lui aussi

Le bouton des vues épinglées porte une épingle **et** un chevron : cinquante-deux
pixels dans un rail qui en fait soixante-six, bord droit à soixante-dix. Replié,
le chevron s'en va avec les intitulés — dans une colonne d'icônes, plus rien ne
porte de libellé et c'est l'infobulle qui nomme : il n'a plus personne à
annoncer. Le bouton retombe à quarante pixels, comme les autres.
