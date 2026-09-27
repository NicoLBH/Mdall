# La note de la mémoire

**À quoi sert cette page :** la liste est un inventaire, le cerveau une
topologie. Cette page dit ce qu'on a mis entre les deux — cinq phrases qui disent
**où regarder** —, pourquoi ce n'est pas une quatrième vue, et pourquoi une seule
d'entre elles ne se clique pas.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Ce qui manquait

La **liste** est rassurante, et c'est son métier : elle prouve ce que la mémoire
contient. Mais on ne lit pas un projet de quatre cents affirmations par un
inventaire.

Le **cerveau** montre les équilibres et la complexité. Mais une topologie n'est
pas un jugement.

Le **copilote** sait répondre à une question. Il ne sait pas dire **laquelle
poser**.

Il manquait l'objet qui transforme un contenu en attention. C'est la note, et ce
n'est **pas un écran de plus** : c'est la porte d'entrée. La liste et le cerveau
redeviennent ce qu'ils sont — des instruments de vérification qu'on ouvre *depuis
une phrase*.

## Des phrases, pas des cases

Une grille de chiffres se parcourt sans se lire. Ce qu'on veut lire en trente
secondes avant une réunion ressemble à cela :

> **Ce qui tient le projet**
> 1 affirmation rouvre un choix humain si elle change
> 1 hypothèse : le projet bâtit dessus, et une mesure la tranchera
> 2 décisions enregistrées — une ne dit pas ce qu'elle a écarté
>
> **Ce qui demande quelque chose**
> 1 nom qu'une fonction lit et que personne n'a versé
> 1 constat attend d'être levé
>
> **Le détail**
> 5 affirmations ne rouvrent rien : elles se refont sans redemander à personne

Trois parties, et aucun poids choisi par personne : chaque nombre est dérivé de
ce que la mémoire porte.

## Chaque chiffre ouvre la liste — sauf un, et il le dit

Une phrase qui donne un nombre sans permettre d'aller voir est un cul-de-sac : on
la lit, on la croit, et l'on ne peut rien en faire. Chaque ligne porte donc la
**requête** qui ouvre la liste déjà filtrée dessus, et la requête est **écrite
dans la barre** — pas appliquée en coulisse. C'est ce qui permet de la corriger,
de l'étendre, de la copier ; et le rail se rallume tout seul en la relisant.

**Les noms qu'une fonction lit et que personne n'a versés font exception**, et ce
n'est pas un oubli : ils ne sont dans aucune liste — ils n'existent pas en
mémoire, c'est tout le problème. Cette ligne-là dit pourquoi elle ne mène nulle
part, plutôt que d'offrir un bouton qui ouvrirait le vide (règle 5).

Une épreuve relit l'écran pour cela, et c'est l'exception qui la justifie : une
requête dont le champ n'est pas déclaré ne lève rien. La barre la lit comme du
texte libre, la liste se vide, et **rien ne dit pourquoi**. On clique un chiffre,
l'écran se vide. Aucun rendu ne montre ce défaut-là.

## `rouvre:` — le chiffre de tête, ouvert dans la liste

Le champ se tape, et ses deux valeurs **partagent la mémoire en deux, sans
reste** : un lecteur qui additionne « ce qui rouvre » et « le détail » doit
retrouver ce qu'il a sous les yeux, sinon il cherche le manquant.

Il se calcule sur **le projet entier**, jamais sur ce que les filtres ont déjà
retenu. Ce qu'une valeur rouvre dépend de la chaîne du projet, pas de ce qu'on
regarde : posé sur la sélection, un domaine coché suffirait à faire dire « rien à
rouvrir », et le chiffre de la note ne se retrouverait plus dans la liste qu'il
vient d'ouvrir.

## Ce que la note ne fait pas

**Elle ne s'écrit pas à zéro.** « 0 hypothèse » se lit comme une mesure, alors
que c'est le plus souvent l'absence de versement. Une note faite de zéros apprend
à ne plus la regarder — exactement ce qu'on cherche à éviter. Une ligne sans
objet disparaît ; une partie vide disparaît aussi.

**Elle ne reste pas au-dessus d'une liste filtrée.** Dès qu'un filtre est posé on
ne cherche plus où regarder : on vérifie. Une note qui resterait affichée
compterait le projet entier au-dessus de douze lignes, et l'on croirait que ses
chiffres décrivent ce qu'on a sous les yeux.

**Elle ne pondère pas, ne classe pas, ne note pas.** Aucun « importance 7/10 » :
un score affiché ne se conteste pas, donc ne se corrige pas.

**Elle n'appelle aucun modèle.** Ces chiffres doivent tenir sans lui — l'IA
accélère, elle n'est jamais le seul chemin (fondamental 13). Un modèle pourra
reformuler cette note ; il ne doit jamais la produire.

**Elle ne rend pas de HTML.** L'écran décide de la forme ; une épreuve lit les
phrases sans traverser un rendu.

## Deux choses apprises en l'écrivant

**Le singulier et le pluriel vivent avec la phrase, pas avec l'écran.** La raison
de la ligne qui ne se clique pas était écrite dans l'écran, au pluriel : lue à
l'écran sous une phrase au singulier, elle disait « ils ne sont dans aucune
liste » sous « 1 nom ». Elle vit maintenant avec le nombre qu'elle explique
(règle 10). Ce défaut-là s'est vu en **regardant l'écran**, pas en lisant le code.

**Un nom se compte par sa clé, jamais par son écriture.** La casse et les accents
varient d'un référentiel à l'autre : compté sur le nom brut, « Altitude du site »
et « altitude du site » feraient deux lignes à verser pour une seule donnée, et
la note annoncerait deux trous là où il n'y en a qu'un.

## Où ça vit

| ce qu'on cherche | où |
| --- | --- |
| la note, ses phrases et ses requêtes | `apps/web/js/services/note-de-la-memoire.js` |
| ce qu'une valeur rouvre | `apps/web/js/services/ce-que-ca-rouvre.js` |
| ce qui manque à une décision | `apps/web/js/services/decision-versement.js` — `lacunes` |
| le filtre `rouvre:` | `apps/web/js/services/memoire-selection.js` |
| le rendu, et le geste qui ouvre la liste | `apps/web/js/views/project-memory.js` |
| ce qui compte dans une mémoire, et pourquoi | `docs/ce-qui-compte-dans-une-memoire.md` |
| les trois axes d'une affirmation | `docs/les-trois-axes-dune-affirmation.md` |
