# Ce qu'une fonction attend, dit pendant qu'on l'écrit

**À quoi sert cette page :** pourquoi l'écran d'écriture doit répondre à
« de quoi cette fonction a-t-elle besoin ? » sans qu'on quitte la ligne qu'on
tape, et pourquoi il répond à **deux** questions plutôt qu'une.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le verrou

On nomme une fonction, et **l'on ne sait plus ce qu'elle lit.**

« Couleur des volets » demande-t-elle la matière ? l'exposition ? Et quelles
matières existe-t-il — bois, pvc, alu ? La réponse est au catalogue, à trois
clics. Trois clics au milieu d'une ligne qu'on est en train de taper, c'est une
réponse qu'on ne va pas chercher : on tape un nom plausible, et la règle reste
indécidable sans qu'un mot dise pourquoi.

C'est l'aide à la signature des éditeurs de code. Elle est banale partout
ailleurs, et elle manquait ici — dans un langage dont tout l'objet est de
**composer** en nommant.

## Deux endroits, deux questions

### Dans la signature : « qu'est-ce que j'écris entre les parenthèses ? »

```
fonction Couleur des volets(
```

La réponse est **`zones` d'abord, puis ce que le corps lit.**

`zones` toujours en premier : c'est la portée, et une fonction qui l'oublie ne
s'applique à rien de nommé. C'est la première question qu'on se pose devant une
parenthèse ouverte, et elle n'avait aucune réponse à l'écran.

La case où l'on écrit se marque, et elle avance avec les virgules.

**La signature ne lie rien** — une fonction dont le corps lit un nom absent de
sa signature fonctionne quand même. C'est de la documentation, et c'est
justement pour cela qu'il faut aider à l'écrire juste : rien ne la corrigera
plus tard.

### Sur un nom, ailleurs : « de quoi cette fonction a-t-elle besoin ? »

Dans une condition, dans un `calcule`, l'aide dit ce que la fonction **lit** —
avec le **domaine** de chaque entrée quand il est fermé.

C'est le point qui compte : savoir qu'il faut « la matière du volet » ne sert à
rien si l'on ignore qu'elle vaut « bois », « pvc » ou « alu ». C'est justement
le moment où l'on s'apprête à taper l'une des trois.

Une entrée **mesurée** dit son unité ; une entrée **qu'une autre fonction
conclut** se dit déduite, plutôt que de laisser chercher un champ qui ne
paraîtra jamais au formulaire.

## Elle nomme la faute que la forme appelle

```
calcule Prix = Nombre * Couleur des volets(
```

On connaît les fonctions des autres langages : on tape le nom, une parenthèse,
et l'on attend une liste d'arguments. **Mdall n'appelle pas — il nomme.**

Jusqu'ici, cette ligne donnait « ce qui suit ne se rattache à rien — ( », puis,
au lancement, « personne n'a versé de valeur pour ce sujet ». Les deux sont
vrais et aucun ne dit la chose utile.

L'aide la dit **là où la faute se commet** :

> Il n'y a pas d'appel de fonction : écrivez « Couleur des volets » seul, sans
> parenthèses.

Et elle continue d'afficher ce que la fonction lit — c'est ce qu'on était venu
chercher.

**Une parenthèse ordinaire ne se prend pas pour un appel.** `si (`, `alors (`,
`2 * (` en ouvrent toute la journée : les dénoncer ferait un écran qui crie à
tort, et l'on cesserait de le lire.

## Ce qu'elle ne fait pas

**Elle ne paraît pas sur chaque nom.** Un nom qui n'est pas une fonction n'a
rien à annoncer ; une aide qui clignoterait à chaque frappe s'apprend à ne plus
se lire.

**Elle ne parle pas dans un commentaire.** Le langage n'a rien à y faire.

**Elle ne se clique pas.** Elle recouvre le texte : un clic dedans déplacerait
le curseur là où l'on croyait viser la ligne du dessus.

**Elle monte, la liste descend.** C'est la place qu'elles occupent dans tous les
éditeurs, et pour une raison : posées du même côté elles se recouvrent, et c'est
toujours celle qu'on ne regardait pas qui passe devant. La ligne qu'on écrit
reste visible entre les deux.

**Elle paraît même sans proposition** — et c'est tout son intérêt : on vient
d'écrire le nom en entier, la liste n'a plus rien à proposer, et c'est
exactement l'instant où l'on se demande ce que la fonction attend.

## Une seule écoute

L'aide passe par **la même écoute que la liste**, et ce n'est pas une économie :
une seconde écoute serait un second endroit à se rappeler de rebrancher. Le
panneau des résultats a déjà coûté ce défaut-là une fois, et une épreuve compte
maintenant les écoutes sur la frappe.

## Comment ça se vérifie

**Les catalogues viennent d'un vrai brouillon lu**, jamais d'entrées façonnées
dans l'épreuve — sans quoi elles porteraient les hypothèses du code plutôt que
ce que l'écran tient vraiment.

**Une épreuve relit le source**, et c'est l'exception qui la justifie : une aide
parfaitement écrite que rien ne montre laisse exactement l'écran d'avant.

**Et les exemples du wiki sont lancés pour de vrai.** La page annonce « 72 kN »,
« 0,4 », « 1100 € » à quelqu'un qui va copier trois lignes pour vérifier que le
produit marche. Une promesse qui vieillit fait le contraire de ce pour quoi on
l'a écrite : on croit avoir mal recopié, et l'on cesse de faire confiance à
l'écran plutôt qu'à la page (règle 12).
