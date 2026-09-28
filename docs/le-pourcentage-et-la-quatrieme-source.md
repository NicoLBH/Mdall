# Le pourcentage qui ne traversait pas un nom, et la quatrième source

**À quoi sert cette page :** deux défauts qui n'ont rien à voir l'un avec
l'autre, sauf qu'ils empêchaient tous les deux de **réutiliser** ce qu'on avait
déjà écrit — l'un dans une expression, l'autre dans un projet.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. Le pourcentage, et le barème qui perdait son unité

### Le symptôme

```
fonction Taux de TVA(zones, Type de travaux) {
   selon (Type de travaux)
   | rénovation   | 10% |
   | construction | 20% |
}

fonction Prix TTC(zones, Prix HT) {
   calcule TVA = Prix HT * Taux de TVA;
   calcule Prix TTC = Prix HT + TVA;
   …
}
```

Mille euros donnaient **onze mille euros**. Rien ne refusait, rien ne prévenait.
C'est la seule faute que cette langue ne pardonne pas : un résultat plausible et
faux.

### Deux causes, et la seconde est la plus large

**Le barème perdait l'unité de ce qu'il conclut.** `| rénovation | 20 € |`
concluait `20`. Ce n'était pas un défaut du pourcentage : **toute** ligne de
barème qui conclut une mesure perdait ce qu'elle mesure — un prix, une longueur,
un taux. `lireUneValeur` sépare le nombre de son unité, et le lecteur du barème
n'en gardait que le nombre.

Une ligne de barème conclut désormais **ce qui est écrit**, exactement comme
`alors (20 €)` : les guillemets d'un texte tombent, l'unité d'une mesure reste.

**Et `%` n'était pas une unité quand il est collé.** `couperLUnite("20%")`
rendait « 20% » comme un tout, non mesuré — au motif, écrit dans le code, que
« `%` est un suffixe du calcul avant d'être une unité ».

C'était vrai dans une expression : `Prix HT * 20%` se tokenise très bien. Et
faux partout ailleurs — **un pourcentage ne pouvait pas être lu depuis un nom.**

Pire : `lireUneValeur`, lui, coupait `20%` sans difficulté. **Deux lectures de la
même chaîne ne disaient pas la même chose**, et c'est toujours celle qui se tait
qui gagne (règle 4).

`%` se colle donc au nombre, comme `°`. Pour la même raison, d'ailleurs : aucun
sujet du projet ne commence par un signe de pourcentage. `120€` reste non
coupé — l'euro s'écrit avec son espace partout, et il est seul dans ce cas.

### Ce que cela change pour ce qui est déjà versé

**Rien de ce qui est écrit, ni de ce qui s'affiche** : `20%` reste `20%` à
l'écran, et aucune valeur stockée ne bouge. Une valeur **textuelle** qui
s'écrirait `20%` se lira désormais comme une mesure ; c'est la même ambiguïté que
porte déjà `26 m`, et elle se tranche comme toujours par les guillemets.

## 2. La quatrième source : ce que le projet a signé

### Le verrou

Une fonction versée était **la seule chose du projet qu'on ne pouvait pas
réutiliser.** On relit sa règle dans l'écran des fichiers, on la voit conclure,
on la voit dérouler son tableau — et en ouvrant « Écrire du Mdall » pour s'en
servir, elle n'existait plus : ni dans la liste sous le curseur, ni dans le
catalogue qu'on parcourt.

Il fallait la recopier. Et une fonction recopiée cesse d'avoir **un seul
domicile** : corrigée ici, elle reste fausse là-bas (règle 10).

Le catalogue avait trois sources — le brouillon, le langage, l'établi. La
quatrième manquait depuis le début, et c'est celle qui compte le plus : **ce que
ce projet-ci a signé.**

### Elle se lit d'ici, et c'est ce qui la distingue de l'établi

Un utilitaire de l'établi se parcourt et **ne se propose pas** : il vit dans un
autre brouillon, et le nommer ferait écrire une règle que personne ne conclut.

Une fonction versée, elle, **conclut vraiment** — dans ce projet, sur les
valeurs de ce projet. La nommer marche, et le bac d'essai le montre.

### Le bac la rejoue, il ne lit pas sa valeur

C'est le point qui décide de tout. Deux façons de faire :

- **lire la valeur que le projet tient** pour `Prix unitaire du volet` — et
  c'est faux, parce que c'est la valeur d'une autre couleur que celle qu'on est
  en train d'essayer. On lirait un résultat qui ne correspond pas à ce qu'on a
  tapé ;
- **rejouer la règle versée** sur les réponses du formulaire. C'est la seule
  honnête, et c'est aussi la plus simple : une fonction versée est une fonction,
  et les passes du bac résolvent une chaîne mi-brouillon mi-mémoire comme une
  chaîne entière — parce que c'en est une.

### Le formulaire suit, dans les deux sens

**Ce que le projet déduit cesse d'être demandé** : taper la couleur du volet à
la main reviendrait à répondre soi-même la question qu'on avait signée.

**Ce que la fonction versée lit devient une entrée** : sans ce second temps, le
formulaire n'offrirait aucun moyen de faire varier ce qu'on essaie, et le
verdict ne bougerait jamais.

Les deux moitiés comptent, et une seule des deux serait pire que rien.

### Ce qu'on ne prend pas

**Pas toute la mémoire.** Trois cents règles versées rendraient trois cents
verdicts, et celui qu'on cherchait serait quelque part au milieu. On part de ce
que le brouillon lit, on prend les règles qui le concluent, puis ce que
celles-là lisent — de proche en proche.

**Pas ce que le brouillon conclut déjà.** On écrit peut-être une nouvelle
version de cette fonction-là, et c'est celle qu'on essaie qui doit répondre.
Reprendre celle d'hier ferait un bac d'essai qui ignore ce qu'on vient de taper.

### Un verdict qu'on n'a pas écrit dit d'où il vient

Le panneau des résultats le marque, et la liste sous le curseur dit « fonction
du projet » plutôt que « nom du projet ». Présenté comme les siens, il ferait
chercher dans son propre texte une ligne qui n'y est pas — et c'est aussi une
bonne nouvelle à montrer : le projet sait déjà faire cela, on n'a pas à le
réécrire.

## Comment ça se vérifie

**Les fonctions versées viennent d'un vrai versement**, jamais d'objets façonnés
dans l'épreuve : une charge écrite à la main prendrait les hypothèses du code
pour des faits, et ne pourrait pas voir qu'un champ du versement ne voyage pas.

**Une épreuve relit le source**, et c'est l'exception qui la justifie : un
service parfait que personne n'appelle rend exactement l'écran d'avant — le
formulaire redemande ce que le projet déduit, le catalogue ne montre rien de
plus, et il n'y a pas un caractère de différence à l'écran.

**Et deux gardes existantes ont attrapé les oublis** : une origine ajoutée au
catalogue sans sorte se serait dite « nom du projet » — plausible, donc
indiscernable —, et une origine sans pictogramme aurait laissé un bouton vide.
Toutes deux étaient écrites avant ce lot, pour exactement ce cas.
