# Écrire un fichier à la main, depuis Fichiers

## D'où vient ce besoin

Une notice incendie arrive au format d'un traitement de texte, ou en PDF
sélectionnable. Son texte est déjà là, propre, sélectionnable : le faire relire
par un modèle serait payer une transcription pour un texte qu'on possède.

> « je dois pouvoir me passer de l'ia et du llm, qui ne sont là que pour me
> rendre la vie plus confortable »

C'est le fondamental 13, dans les mots de celui qui s'en sert. Jusqu'ici, faire
entrer un texte dans un projet passait par un dépôt de fichier, puis par le
modèle. Il y a maintenant une porte qui ne passe par rien : on sélectionne, on
copie, on colle, on valide.

## Le geste

Dans **Fichiers**, le kebab ouvre « Créer un fichier ». Le fil d'Ariane ne
change pas de place : le nom du fichier s'y saisit **au bout du fil**, là où
tomberait le nom du fichier qu'on ouvrirait. On sait donc, sans le lire
ailleurs, dans quel dossier il va s'écrire.

Dessous, une zone de saisie présentée comme un fichier de code : une gouttière
de numéros à gauche, la première ligne numérotée même quand le fichier est
vide — c'est là qu'on va écrire, et une gouttière vide se lirait comme une zone
qui n'accepte rien.

## Pourquoi un `<textarea>`, et rien de plus savant

Un éditeur qui reconstruit la saisie — une `div` par ligne, les touches
interceptées — casse tout ce que le navigateur donne gratuitement : le
**collage**, la sélection, l'annulation, le clavier des correcteurs. Or le
geste pour lequel cette zone existe est précisément un collage de plusieurs
centaines de lignes.

C'est donc un `<textarea>`. Entrée fait un retour à la ligne parce qu'un
`<textarea>` fait cela ; on n'intercepte rien, et c'est la raison pour laquelle
ça marche. Le texte ne s'y replie pas (`white-space:pre`) : un tableau collé
depuis un traitement de texte garde ses colonnes, et c'est ainsi qu'on veut le
relire.

## La gouttière suit, elle ne commande pas

Les numéros se recalculent sur `input` — qui couvre la frappe **et** le
collage, là où `keyup` raterait un collage à la souris — et se calent sur le
défilement de la zone. Une gouttière qui ne suivrait pas se décalerait au
premier écran de texte, et l'on ne pourrait plus dire de quelle ligne on parle.

### Une hauteur de ligne est une longueur, pas un facteur

Les classes sont celles de la Mémoire (`memoire-ligne__num`) : le numéro d'une
ligne qu'on écrit et celui d'une ligne qu'on relit doivent tomber au même
endroit. Mutualiser a coûté deux pièges, tous deux invisibles sur la première
ligne :

- `memoire-ligne__num` porte `flex:0 0 40px`. Dans la Mémoire, ses lignes sont
  des **rangées**, et 40px est une largeur. Dans une gouttière en colonne,
  c'est devenu une **hauteur** : 40px par numéro contre 19px par ligne de
  texte. La gouttière est donc un bloc, et les numéros des blocs.
- Les numéros s'écrivent en 11px et le texte en 12px. Un `line-height:1.55`
  partagé vaut 17,05px d'un côté et 18,6px de l'autre : une ligne entière
  d'écart au bout de douze. La hauteur de ligne est fixée en pixels sur
  `.saisie-code`, et les deux colonnes la lisent.

**Ce qui a rattrapé les deux, et ce qui les avait laissés passer.** La sonde
mesurait l'écart de la *première* ligne, qui valait 0 dans les deux cas. Elle
mesure maintenant le **pas** des numéros contre la hauteur de ligne du texte,
et l'écart du **dernier** numéro à la dernière ligne : casser la règle donne un
pas de 40 contre 19, et 189px de dérive à la dixième ligne.

## Ce qu'on refuse, et pourquoi

`pourquoiOnNePeutPasLEcrire` rend les motifs, avant d'écrire quoi que ce soit :

| Motif | Ce que c'est |
|---|---|
| `SANS_NOM` | un fichier sans nom |
| `UN_CHEMIN` | un nom qui porte `/` ou `\` — ou qui n'est que des points |
| `PAS_DU_TEXTE` | une extension qui n'est pas du texte |
| `DEJA_PRIS` | le dossier a déjà un fichier de ce nom |

L'extension par défaut est `.md` : un nom saisi sans extension la reçoit. Les
extensions acceptées sont celles qu'on écrit et qu'on relit ici — `.md`,
`.txt`, `.csv`, et les extensions du langage Mdall `.ref`, `.ddb`, `.ctr`,
`.json`.

Un nom qui n'est que des points mérite un mot : la première version refusait
`..`, ce qui ne servait à rien — une remontée de dossier porte toujours un
séparateur, déjà refusé. Casser cette ligne ne faisait rien tomber. La règle
utile est « un nom qui n'est fait que de points n'est pas un nom ».

## Ce que la ligne du document dit

`document_kind: "ecrit_a_la_main"`. Ce n'est pas un détail d'affichage : un
texte écrit ici n'a pas de source qu'on pourrait rouvrir, pas d'empreinte de
PDF, pas d'« Origine » à consulter. Prétendre le contraire serait un mensonge
de plus, et le fondamental 5 l'interdit — ne pas savoir n'autorise pas à
prétendre qu'il n'y a rien.

## Ce que cela n'est pas

Ce n'est pas une écriture en mémoire. **On ne verse rien directement dans la
mémoire, jamais.** Un fichier est de la matière première ; ce qui en sortira —
des sujets, des valeurs, des objectifs — passera par une proposition signée,
comme tout le reste.

## Où c'est écrit

`apps/web/js/services/fichier-a-la-main.js` — le nom, les refus, la ligne à
écrire. Pur, vérifiable sans réseau.

`apps/web/js/services/fichier-a-la-main-supabase.js` — le dépôt : le contenu
devient un `File`, qui monte au stockage et reçoit sa ligne.

`apps/web/js/views/ui/saisie-de-code.js` — la zone et sa gouttière.

`apps/web/js/views/project-documents.js` — le kebab, le fil d'Ariane, les deux
boutons.

## Ce qui vient ensuite

Lire un compte rendu **à partir d'un fichier déjà dans Fichiers** — et donc, à
partir d'un fichier collé à la main, sans qu'un modèle ait jamais eu à lire le
PDF.
