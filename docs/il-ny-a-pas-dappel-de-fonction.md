# Il n'y a pas d'appel de fonction, et le dire trois fois ne suffisait pas

> **Cette page a été renversée par la ronde suivante.** Une fonction **s'appelle**
> désormais : voir `docs/appeler-une-fonction.md`. Ce qui suit reste vrai comme
> récit — les quatre défauts décrits ont existé et trois d'entre eux sont
> toujours corrigés (l'espace devant la parenthèse, les locales prises pour des
> noms inconnus, les messages qui ne nommaient pas la faute). Seul le premier a
> changé de nature : ce n'était pas une faute, c'était une forme qui manquait.
>
> On ne réécrit pas cette page. Une doctrine qu'on corrige en silence ne laisse
> pas voir sur quoi on s'est trompé, et c'est précisément ce qu'on veut pouvoir
> relire.

**À quoi sert cette page :** au troisième tour sur le même sujet, la question
a cessé d'être « pourquoi le modèle écrit-il un appel ? » pour devenir
**« pourquoi l'écran ne le dit-il pas ? »**. Les deux réponses sont ici.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le symptôme, au troisième tour

Sept remarques dans la console, et pas une ne nomme la faute :

```
fonction Couleur des volets selon Matériau(zones, Matériau) {
   calcule x = Couleur des volets(zones, Matériau);
   si(Couleur des volets(zones, Matériau) = "violet") alors "super";
}
```

> « x » ne se calcule pas : ce qui suit ne se rattache à rien — (.
> aucun mot de la langue n'ouvre cette ligne.

Les deux sont **vraies**, et n'apprennent rien. On relit sa ligne en cherchant
l'opérateur qui manque, alors que c'est la forme entière qui n'existe pas ici.

## Ce qu'on croyait avoir corrigé

La ronde précédente avait ajouté le refus qu'il fallait :

> il n'y a pas d'appel de fonction : « Couleur des volets » se nomme…

Il ne se déclenchait que sur un appel **seul sur sa ligne**. Or personne
n'écrit un appel seul sur sa ligne : on l'écrit dans un `calcule`, ou dans un
`si (…)`. Les deux formes où la faute se commet vraiment passaient à côté du
seul message qui l'expliquait — un garde écrit pour un cas qu'on ne rencontre
pas.

## Les quatre défauts, tous visibles sur une capture d'écran

**1. L'appel dans une expression.** `lireUnCalcul` rendait `reste — (` pour
tout nom suivi d'une parenthèse. C'est le refus le plus fréquent du langage, et
c'était le message le moins utile qu'il sache produire. Un motif de refus lui
est propre désormais, et il se dit au même endroit pour un `calcule`, un
`si (…)` et un `alors (…)` — un seul endroit, une seule phrase (règle 10).

La phrase nomme **les sept fonctions qui prennent vraiment des parenthèses**,
et elle les prend à leur définition : celle qu'on ajouterait au langage
manquerait sinon, sans que rien ne le dise.

**2. L'espace qui manque.** `si(Hauteur > 1 m)` se refusait par « aucun mot de
la langue n'ouvre cette ligne ». C'est faux : le mot est là, il manque une
espace. La ligne entière disparaissait du raisonnement pour une touche non
frappée. Un espace de moins n'est pas un autre sens — il n'y a rien à trancher,
donc rien à refuser. L'écriture, elle, pose toujours l'espace : la forme
canonique reste unique, c'est la **lecture** qui est indulgente.

Et cette tolérance a failli coûter cher : `si(Couleur des volets(M) = "gris")`
se lisait alors comme une condition portant sur un sujet nommé
`(Couleur des volets(M)`. Une condition **acceptée** sur un nom que personne
n'a écrit, indécidable pour toujours. Un nom ne porte pas de parenthèse, et
c'est maintenant dit là où les conditions se lisent.

**3. Une locale prise pour un nom inconnu.** `calcule x = …;` puis `si (x …)`
est la forme la plus courante de toute la langue, et elle portait « x n'est
déclaré nulle part » **à chaque fois**. La vérification du brouillon ne
connaissait ni les `calcule` d'une fonction, ni la variable de sa boucle.

C'est le défaut le plus coûteux des quatre, parce qu'il ne casse rien : il
**bruite**. Une console qui crie à tort cesse d'être lue, et les vraies
remarques se perdent avec les fausses. Les locales restent locales — les verser
dans les noms déclarés du brouillon laisserait la fonction d'à côté lire un `x`
qui n'existe pas chez elle.

**4. La consigne énonçait la règle sans montrer la forme.** « ne les appelle
pas — nomme-les » était déjà envoyé au modèle, et il a écrit l'appel quand
même. Une règle énoncée pèse moins qu'une forme montrée, surtout contre une
habitude qu'ont tous les autres langages. La consigne montre désormais la faute
**et** sa correction côte à côte, avec le nom d'une fonction **de ce
projet-là** :

```
- FAUX : `calcule X = Couleur des volets(zones, Matériau);`
- JUSTE : `calcule X = Couleur des volets;`
```

---

## Ce que le langage ne peut pas faire, et qu'il faut dire

**On ne peut pas donner à une fonction un autre nom que celui qu'elle lit.**

« Couleur des volets » lit « Nature des volets ». Vouloir la faire répondre sur
« Matériau » n'a pas de forme — et ce n'est pas un manque, c'est le choix
central de la langue. Une fonction qui prend des arguments s'appelle depuis dix
endroits avec dix valeurs différentes, et l'on ne sait plus laquelle le projet
tient pour vraie. Ici un nom vaut une chose à la fois.

La conséquence pratique : pour s'en servir, il faut que **« Nature des volets »
existe** — déclaré dans `variables-du-projet.ref`, ou rempli dans le formulaire
de l'essai. C'est tout, et personne ne le disait.

---

## Ce que la ronde a appris

**Un garde écrit pour un cas qu'on ne rencontre pas ne défend rien.** Le refus
« il n'y a pas d'appel » existait depuis une ronde, et ne s'est jamais
déclenché chez l'utilisateur : il attendait une ligne que personne n'écrit.
Entre écrire le garde et vérifier **où** la faute se commet, c'est le second
qui compte.

**Le bruit coûte plus cher que l'erreur.** La remarque fausse sur les locales
ne cassait rien — elle apprenait à ne plus lire la console. Le jour où une
vraie remarque est arrivée, elle était au milieu de six fausses.

**Une règle énoncée ne vaut pas une forme montrée.** Ni pour le modèle, ni pour
la personne. « Ne les appelle pas » a été ignoré ; « FAUX : … / JUSTE : … » est
une image qu'on recopie.
