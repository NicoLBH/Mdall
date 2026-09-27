# Le catalogue : on ne compose pas avec ce qu'on ne sait pas nommer

**À quoi sert cette page :** Mdall n'a pas d'appel de fonction. Composer, c'est
donc exactement une chose — **nommer ce qu'une autre fonction conclut**. Cette
page dit pourquoi cela ne se produisait jamais, ce que le catalogue met à
portée, et la seule réserve qu'il porte.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le verrou

Une fonction Mdall conclut **sous son propre nom**, et les autres la lisent comme
n'importe quel nom :

```
fonction Taux de TVA(zones, Type de TVA) {
   si (Type de TVA = "neuf")
   alors (20 %);
   sinon (5,5 %);
}

fonction Prix TTC(zones, Prix HT, Taux de TVA) {
   calcule TVA = Prix HT * Taux de TVA;
   …
}
```

C'est tout le mécanisme de composition du langage, et il tient en une ligne :
`Prix TTC` nomme `Taux de TVA`. Encore faut-il **savoir que `Taux de TVA`
existe**.

L'écran d'écriture proposait les mots du langage et les noms déclarés par un
`const`. Il ne proposait ni ce que les fonctions du brouillon concluent, ni ce
que l'établi garde. Écrire la seconde fonction demandait donc de se souvenir
qu'on avait écrit la première trente lignes plus haut — et rien à l'écran ne le
disait. Ce n'est pas une gêne : **c'est ce qui décide qu'un écosystème d'outils
démarre ou pas**, parce qu'on ne compose pas avec ce qu'on ne sait pas nommer.

## Ce que le catalogue met à portée

Six rayons, dans l'ordre de ce qui est le plus près de la main :

| rayon | ce que c'est |
| --- | --- |
| **Calculé dans cette fonction** | un `calcule` posé au-dessus du curseur |
| **Déclaré dans ce brouillon** | un `const`, avec son unité et son domaine fermé |
| **Conclu par une fonction d'ici** | ce qu'une autre fonction conclut — **et ce qu'elle lit** |
| **Posé par ce brouillon** | une affirmation, dite par sa valeur (« 28 m ») |
| **Les fonctions du langage** | `racine`, `arrondi`, `min`… avec un exemple d'écriture |
| **Sur votre établi** | ce que vos utilitaires gardés concluent, et ce qu'ils prennent |

**Ce qu'une fonction lit passe avant ce qu'elle dit.** La première question
devant une fonction qu'on n'a pas écrite soi-même est « de quoi a-t-elle
besoin ? » ; on a déjà son nom sous les yeux pour la seconde.

Un rayon vide ne paraît pas. Six titres dont quatre ne disent rien
apprendraient à ne plus lire les titres.

## Il se déduit, il ne se déclare pas

Aucune liste tenue à la main. Les noms sortent du texte qu'on a écrit, des
fonctions que le langage porte, et des utilitaires qu'on a gardés. Un nom qu'on
ajoute paraît sans qu'on y pense ; un nom qu'on efface disparaît. Une liste
recopiée aurait vieilli au premier renommage (règle 4).

C'est aussi pourquoi **les fonctions du langage disent maintenant ce qu'elles
font là où le langage les déclare** : ajouter une fonction sans dire à quoi elle
sert ferait un catalogue qui montre un nom sans savoir en dire quoi que ce soit.

## Une seule liste, deux lectures

La complétion à la frappe et le catalogue qu'on parcourt répondent à la **même**
question posée à deux moments : « que puis-je nommer ici ? ». Elles lisent donc
la même liste, assemblée à un seul endroit — `contexteDuBrouillon`. Deux
assemblages voisins finiraient par différer, et c'est la pire des divergences :
celle où l'écran propose un nom que le parcours ne montre pas, ou l'inverse
(règle 10).

**La seule différence tient en une phrase**, et elle est dite une fois dans le
code : *un nom de l'établi se parcourt, et ne se propose pas.* Un utilitaire
gardé vit dans un autre brouillon ; proposer son nom à la frappe ferait écrire
une fonction qui lit un nom que personne ne conclut ici, et la règle resterait
indécidable pour toujours sans qu'un mot dise pourquoi. Le rayon de l'établi le
dit sous son titre : *reprenez l'utilitaire pour vous en servir.*

## Chercher, et poser

On cherche rarement par le nom exact. On cherche par un mot qu'on a en tête, et
la recherche regarde donc tout ce que le catalogue sait d'une entrée : son nom,
ce qu'elle dit, **ce qu'elle lit**, son domaine fermé, et d'où elle vient. Taper
« prix ht » remonte `Prix TTC`, qui le lit ; taper « rénovation » remonte
`Type de TVA`, qui l'a dans son domaine.

Ce qui **commence** par ce qu'on tape passe devant ce qui le contient — sinon
« Altitude du bas » remonterait avant « bas de pente ». À rang égal, l'ordre du
catalogue tient : ce qui est le plus près du curseur reste le plus haut.

Un clic **pose le nom là où le curseur était** et referme. On vient chercher un
nom pour l'écrire : rendre puis laisser refermer à la main ferait deux gestes
pour un. La pose est celle de la complétion, et pas une seconde — le mot en
cours est remplacé, jamais complété par la fin (on a pu taper « vent » pour
trouver « Zone de vent »).

## Ce que ce lot ne fait pas

**Il ne lit pas la mémoire du projet.** Ce que le projet a signé est une
quatrième source, et elle demande d'aller la chercher en base : l'écran
d'écriture n'en tient aucune aujourd'hui. C'est écrit dans
`docs/a-traiter-plus-tard.md` plutôt que deviné.

**Il ne rend pas un nom de l'établi utilisable** — voir plus haut. Le dire est
tout l'intérêt.

## Où ça vit

| ce qu'on cherche | où c'est |
| --- | --- |
| ce qu'on peut nommer, et d'où ça vient | `apps/web/js/services/catalogue-des-noms.js` |
| l'assemblage, une fois, pour les deux lectures | `apps/web/js/services/mdall-completion.js` — `contexteDuBrouillon` |
| la fenêtre qu'on parcourt | `apps/web/js/views/ui/catalogue-de-lecriture.js` |
| ce qu'une fonction lit | `apps/web/js/services/memoire-en-lecture.js` — `nomsLusParLeBloc` |
| ce que fait une fonction du langage | `apps/web/js/services/mdall-calcul.js` — `FONCTIONS` |

## Deux défauts que ça a fait sortir

**Ce qu'une fonction lit était écrit à deux endroits en devenir.** Le parcours —
les conditions, les branches enchaînées, les exceptions, et les noms qu'un
`calcule` va chercher — vivait dans le formulaire du bac d'essai. Le catalogue
pose la même question par fonction ; l'écrire une seconde fois aurait fait deux
lectures qui cessent un jour de voir la même chose. Le jour où `sinon si` est
entré dans le langage, celui des deux qui l'oublie ne se trompe pas
bruyamment : il construit une liste où un nom lu par une branche n'apparaît pas
(règle 10).

**Une fonction qu'on tape passait pour une valeur posée.** Un corps encore vide —
`fonction X() {` suivi d'un `si (` qu'on n'a pas fini — n'a ni condition ni
calcul, et se rangeait donc parmi les affirmations : l'écran disait « Posé par
ce brouillon » sous le nom d'une fonction qu'on était en train d'écrire. Ce qui
tranche est la **valeur** : une affirmation en porte une, une fonction non — et
la question se pose là où le bac d'essai la pose déjà.
