# Lire un fichier de texte, et en tirer un compte rendu

## Deux manques, et ils se tenaient

On savait **écrire** un fichier à la main dans Fichiers ; on ne savait pas le
**relire**. Un `.md` collé y restait une ligne dans un tableau, et le seul moyen
de voir ce qu'il portait était de le télécharger pour l'ouvrir ailleurs.

Et la lecture d'un compte rendu partait forcément d'un PDF. Coller une notice
depuis un traitement de texte, puis vouloir en relever les points, obligeait à
repasser par un PDF qu'on n'avait pas.

Les deux manques n'en faisaient qu'un : **rien ne reconnaissait qu'un document
puisse déjà être du texte**.

> « je dois pouvoir me passer de l'ia et du llm, qui ne sont là que pour me
> rendre la vie plus confortable »

## Lire un fichier, dans Fichiers

Un fichier dont l'extension est acceptée — `.md`, `.txt`, `.csv`, `.ref`,
`.ddb`, `.ctr`, `.json` — s'ouvre au clic, comme un PDF.

**Deux lectures**, et ce sont les mots de la Mémoire : « Aperçu » et « Code ».

- **Code** dit ce que le fichier porte *vraiment* : un titre est un `#`, un
  tableau est fait de barres. Numéroté, il se cite — « ligne 42 » désigne un
  endroit.
- **Aperçu** dit ce que le fichier *veut dire* : le document rendu, comme il se
  lira. C'est la lecture qu'on veut après avoir collé trois cents lignes, pour
  vérifier qu'elles sont entières.

Aucune ne remplace l'autre, et c'est pourquoi il y en a deux.

**L'aperçu n'est offert que s'il veut dire quelque chose.** Un `.ref` ou un
`.json` rendus en Markdown donnent le même texte sans ses retours à la ligne :
un bouton qui mène à cela se clique une fois, et l'on cesse de regarder la barre
entière. Ces fichiers n'ont donc qu'une lecture, et c'est la bonne.

**Trois états, et ils ne se confondent pas** : en cours de lecture, lu, pas su
lire. Un fichier vide est un quatrième cas — c'est une réponse, elle se dit
(règle 5).

### Le nom vit dans le fil d'Ariane

Il était aussi dans la barre d'outils, à côté des lectures : deux endroits pour
un même nom, dont l'un redisait ce que l'autre montrait déjà (règle 10). Le fil
dit en plus **où** est ce fichier — « Fichiers / Documents / Incendie /
notice.md » —, ce que la barre ne disait pas.

### Le crayon a remplacé « Fermer »

Fermer se fait déjà par le fil d'Ariane et par l'arbre, qui sont là et qui
disent en plus où l'on va. Un bouton qui ne fait que défaire ce qu'on vient de
faire prenait la place du seul geste qui manquait : **corriger**.

Le crayon ouvre la modification. Le texte passe dans la même zone de saisie que
la création d'un fichier neuf, et **le nom repasse en champ dans le fil**, au
même endroit — écrire un fichier et renommer celui qu'on modifie sont le même
geste, et deux champs dessinés séparément auraient fini par ne plus se
ressembler.

Trois choses méritent d'être dites :

- **On travaille sur une copie.** Annuler doit rendre le fichier tel qu'il est
  en base ; si l'on retouchait le contenu lu, il n'y aurait plus rien à quoi
  revenir.
- **Le fichier qu'on modifie ne se compte pas parmi les noms pris.** Il porte
  déjà le sien : l'y compter refuserait de le garder, et l'on ne pourrait plus
  enregistrer sans renommer.
- **Le contenu monte à un chemin neuf.** Le stockage refuse d'écraser : il n'y
  a pas de « poser par-dessus ». Chaque enregistrement monte un objet nouveau,
  dont le chemin porte le moment — deux versions du même fichier portent le même
  nom, et sans quoi les distinguer la seconde échouerait sur un conflit. Le
  précédent reste dans le seau, orphelin : c'est le prix, et il est dit plutôt
  que découvert plus tard.

Un enregistrement qui échoue **garde le texte à l'écran**. Le perdre ferait
recommencer une saisie de trois cents lignes pour une panne de réseau.

### Aller ailleurs referme

Trois gestes mènent ailleurs — l'arbre, le fil d'Ariane, le nom d'un dossier
dans le tableau — et chacun refermait pour son compte : l'arbre fermait
l'aperçu d'un PDF, les deux autres ne fermaient rien. C'est ainsi qu'un fichier
ouvert serait resté à l'écran sous le chemin d'un autre dossier. Ce qu'une
navigation referme est maintenant dit à un seul endroit (règle 10).

### Un fichier de texte n'a pas de pages, sauf s'il en porte

Un compte rendu rangé par l'Atelier garde ses marqueurs `<!-- page n -->` :
c'est ce qui permet de le confronter au PDF page à page. Un fichier écrit à la
main n'en a pas. Il ne faut pas lui en inventer, et il ne faut pas non plus le
déclarer illisible pour autant : il est **un seul bloc**, et c'est tout le
document.

`pagesDuFichierMarkdown` rend une liste vide sur un texte sans marqueurs, et
elle a raison — une restitution sans pagination ne se confronte plus au PDF, et
la donner pour une page 1 ferait croire à un document d'une page. Ici, il n'y a
pas de PDF : le document *est* le texte, et « une page » ne prétend rien de
faux. La ligne d'en-tête ne dit « 1 page » que pour un fichier réellement
paginé ; sinon elle se tait, parce qu'un « 1 page » se lirait comme une mesure
alors que c'est une absence.

## Lire un compte rendu sans extraction

Le parcours d'un PDF est :

    extraire les pages → faire refaire le document par le modèle →
    relever les points sur ce qu'il a refait → confronter au projet

Les deux premières étapes existent pour **fabriquer du Markdown à partir d'une
image de page**. Un document déjà écrit en texte en est déjà. Les lui faire
subir serait payer deux appels pour retrouver le texte qu'on avait.

Son parcours est donc :

    ouvrir → relever les points → confronter au projet

Deux ouvertures, une seule suite : ce qui vient après ne connaît pas la
différence. La zone de dépôt accepte les deux, et un bouton
**« Choisir depuis Fichiers »** ouvre l'arborescence des documents du projet.

### Ce qui disparaît avec l'extraction, et qu'on n'invente pas

C'est la partie qui demandait le plus d'attention. Trois choses cessent d'avoir
un sens, et il aurait été facile de les remplacer par des zéros :

| Ce qui disparaît | Pourquoi, et ce qu'on fait |
|---|---|
| Les mesures de fidélité | Il n'y a rien à comparer. « 100 % du document retrouvé » serait une tautologie présentée comme un résultat. Les cartes ne s'affichent pas. |
| La lecture « Origine » | Elle met chaque ligne en regard de la page dont elle sort. Sans PDF, la colonne « p. 1 » se lirait comme une information et n'en serait pas une. Le bouton n'existe pas. |
| Le prix de l'appel | Aucun appel n'a eu lieu. La pastille grise des décomptes manquants ferait croire à un prix qu'on ignore : elle dit **« 0 € — déjà du texte »**, ce qui n'est ni « 0 € — relue » ni « coût inconnu ». Trois situations, trois phrases. |
| Le rangement | Ranger consiste à poser une transcription sur la ligne d'un PDF. Il n'y en a pas, et recopier le texte sur sa propre ligne ferait deux vérités qui divergeraient à la première correction (règle 4). L'écran le dit en vert : rien n'a été extrait, rien n'a été restitué, il n'y a rien à ranger. |

## Ce qui a demandé à être défait

### Le drapeau vivait au mauvais endroit

« Ce document était déjà du texte » a d'abord été posé sur l'état de l'écran.
L'écran de la lecture se dessine à partir d'une **vue qu'on lui passe** — c'est
ce qui permet de le tester pour de vrai — et deux de ses fonctions auraient donc
lu le drapeau depuis le module pendant que tout le reste venait de la vue. Deux
sources pour un même écran (règle 4), et un test qui aurait montré autre chose
que l'application.

Il vit maintenant sur la restitution, dont il est une propriété : *celle-ci n'a
pas eu lieu*.

### Un troisième champ de fichier qu'on ne voyait pas

Le garde-fou qui vérifie que les champs `<input type="file">` acceptent bien ce
que l'écran accepte en a trouvé **trois**, et non deux : la zone de dépôt,
l'en-tête, et celui de l'écran de panne. Le troisième serait resté sur
`application/pdf`, et le sélecteur de fichiers aurait montré un dossier vide à
qui vient d'y déposer un `.md` — sans erreur, sans rien à lire.

C'est exactement le genre de défaut pour lequel relire du code comme du texte se
justifie : un attribut manquant ne lève pas, n'affiche rien, et le geste ne fait
simplement rien.

### La transformation est sortie de l'écran

`laRestitutionDunTexte` vit dans le service pur. Écrite dans l'écran, elle ne se
serait vérifiée qu'en relisant du code, ou par un test qui recopie ses propres
hypothèses. Là, on lui donne un document et l'on regarde ce qui sort : le texte
entier, les lignes numérotées sans trou, la page d'où sort chaque ligne, et
aucun marqueur resté dans le document.

## Choisir depuis Fichiers, et pourquoi dans ce sens

Le premier essai faisait l'inverse : un bouton dans Fichiers posait le texte
dans une case partagée et envoyait vers l'Atelier. Deux défauts, et le second
est dirimant.

D'abord, **le geste était au mauvais endroit** : on ouvre un compte rendu dans
Fichiers pour le lire, pas pour décider de le faire analyser. La décision se
prend à l'Atelier, quand on y est venu pour ça.

Ensuite et surtout, **Fichiers chargeait alors l'Atelier**. Il fallait une case
partagée entre les deux écrans, donc une route, donc un morceau de l'écran de
lecture dans les dépendances d'un écran qui ne s'en sert pas. On alourdit le
navigateur de tous pour un bouton que peu utiliseront — et rien ne le disait :
l'écran marchait, il était seulement plus lourd à charger.

Ici, rien ne remonte. L'Atelier descend chercher, par le même service de lecture
de dossiers que l'onglet Fichiers, **chargé à la demande** : qui n'ouvre jamais
le choix ne le télécharge jamais. Fichiers, lui, ne sait pas que l'Atelier
existe, et une vérification s'en assure à chaque exécution.

### Ce que la liste montre, et ce qu'elle refuse

Les lignes sont celles de Fichiers — mêmes classes, même hauteur, même icône,
même gouttière. En redessiner une seconde arborescence aurait fait deux jeux à
recaler ensemble, et l'on ne reconnaîtrait pas ici le rangement fait là-bas.

Les dossiers d'abord, puis les fichiers, chacun dans l'ordre du **français** :
trié sur les codes de caractères, on aurait « Zinguerie », « atelier »,
« Étanchéité » dans cet ordre — majuscules d'abord, accents tout à la fin.

Ce qui ne se choisit pas **s'affiche quand même**, éteint, avec sa raison :
masquer les PDF ferait paraître vide un dossier qui porte douze comptes rendus,
et l'on chercherait une panne (règle 5). Deux raisons, et elles ne se confondent
pas :

| Raison | Ce qu'elle veut dire |
|---|---|
| pas du texte | Un PDF se lit très bien à l'Atelier, mais en le déposant : l'extraction part du fichier lui-même. |
| rien à lire | Aucun contenu n'est attaché à ce document — son dépôt ne s'est pas terminé. |

Et trois phrases pour un dossier qui n'offre rien : « ce dossier est vide »
quand il l'est, « aucun document de texte ici » quand il ne porte que des PDF,
« … ouvrez un dossier » quand il porte aussi des dossiers. La première invite à
déposer, les autres à chercher ailleurs.

## Ce que cela ne change pas

Rien n'entre dans la mémoire. Un fichier est de la matière première ; les points
relevés passent par une proposition signée, comme ceux d'un PDF. La seule chose
qui change, c'est **ce qu'on a payé pour les obtenir**.

## Où c'est écrit

`apps/web/js/services/lire-un-fichier-texte.js` — les extensions, les lectures,
les pages, et ce que l'Atelier reçoit sans appel. Pur.

`apps/web/js/services/choisir-depuis-fichiers.js` — ce qui se choisit, dans
quel ordre, et ce qu'on dit d'un dossier qui n'offre rien. Pur.

`apps/web/js/views/ui/choisir-un-fichier.js` — la liste, aux classes de Fichiers.

`apps/web/js/services/fichier-a-la-main.js` — `leFichierAReecrire` : ce qu'il
faut écrire pour réenregistrer un fichier modifié. Pur.

`apps/web/js/services/reconstitution-markdown.js` — `lecturesDeLaRestitution` :
« Origine » n'existe que face à un PDF.

`apps/web/js/views/project-documents.js` — le lecteur de Fichiers.

`apps/web/js/views/studio/dev/lecture-des-cr.js` — `ouvrirUnPdf` et
`ouvrirUnDocumentDeTexte`, les deux ouvertures d'un même parcours.
