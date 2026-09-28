# L'abaque qui se verse, et le catalogue qu'on voit enfin

**À quoi sert cette page :** pourquoi une courbe ne pouvait pas entrer dans la
mémoire d'un projet, ce qu'il a fallu distinguer pour qu'elle le puisse, et
pourquoi le catalogue des noms — qui existait et fonctionnait — ne montrait
jamais ce qu'on venait y chercher.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. L'abaque qui ne se versait pas

### Le verrou

Une `courbe` proposée au projet était **écartée « sans valeur »**. Elle vivait
donc sur l'établi, et il fallait la recopier à la main dans chaque projet qui
s'en sert — c'est-à-dire exactement ce que cette langue existe pour éviter.

Le plus coûteux n'était pas le recopiage : c'est qu'une courbe recopiée cesse
d'avoir **un seul domicile**. Corrigée dans un projet, elle reste fausse dans
les six autres, et rien ne dit lequel fait foi (règle 10).

### La question était mal posée

Le versement demandait : **« ce bloc a-t-il une valeur ? »**

Il fallait demander : **« y a-t-il quelque chose à relire ? »**

Les deux se confondent pour tout le reste du langage, et pas pour un abaque. La
garde existe pour une bonne raison — un bloc qui nomme sans rien dire porterait
dans la mémoire une ligne vide que personne ne saurait relire ni refuser, et
c'est aussi ce que devient une phrase en français qu'on a oublié de coder. Mais
une courbe de onze points relevés dans une norme **dit énormément** : ses points
*sont* sa loi.

### Un abaque est une loi, au même titre qu'un barème

Il n'a pas de condition, et ce n'est pas une absence de raisonnement : c'est une
autre façon de l'écrire. Le ranger parmi les affirmations était l'erreur de
classement dont tout le reste découlait.

Versé, il porte donc :

- ses **points**, dans l'ordre ;
- ses **deux déclarations** — `entre les points:` et `hors bornes:` — sans
  lesquelles l'interpolation cesse d'être vérifiable ;
- **ce qu'il lit**, qui est dans sa signature et jamais dans une condition.

### Il ne conclut rien, et ce vide est une phrase

`value` reste vide, et c'est **voulu** : une courbe ne conclut rien tant qu'on
ne l'a pas lue. Lui inventer une valeur — son premier point, un résumé de ses
bornes — ferait tenir au projet une affirmation que personne n'a signée, et qui
serait fausse partout sauf en un point.

**Le faux signal qu'il fallait éviter.** Si le rejeu comparait la conclusion
recalculée à cette valeur vide plutôt qu'à ce que le projet tient, chaque abaque
de la mémoire s'annoncerait **dérivé pour toujours** — et l'on apprendrait à
ignorer l'écran qui signale les dérives, ce qui est bien pire que de n'en avoir
aucun. Ce n'est pas le cas : `rejouerLesRegles` compare à la valeur du projet,
et une épreuve le tient.

### Ce qu'on gagne

Une courbe versée est une **loi du projet**. Toute fonction qui nomme
`Coefficient de forme` lit ce qu'elle conclut pour la pente que le projet tient,
et le jour où cette pente change, la conclusion suit — ou se dénonce.

## 2. Le catalogue qu'on ne voyait pas

Le catalogue des noms existait, fonctionnait, et **ne montrait jamais ce qu'on
venait y chercher**. Deux défauts, et le premier suffisait.

### Les sept mots du langage prenaient six places sur huit

La liste sous le curseur en montre **huit**. À égalité de recherche — c'est-à-dire
tant qu'on n'a pas tapé de lettre — elle était triée **par ordre alphabétique
seul**. Or le langage porte sept fonctions dont six commencent par les premières
lettres de l'alphabet : `abs`, `arrondi`, `max`, `min`, `plafond`, `plancher`.

On ouvrait donc la liste, on y voyait six mots qu'on connaît par cœur, et la
fonction qu'on venait d'écrire trente lignes plus haut n'y figurait pas. On
apprenait à ne plus l'ouvrir.

**Ce qu'on ne retient pas, c'est ce que ce projet-ci contient.** `racine` et
`abs` sont sept et ne changent jamais ; ce que le brouillon conclut change à
chaque minute. Les noms du projet passent donc devant — et les mots du langage
restent offerts, derrière.

### Une fonction se proposait à elle-même

Écrivant `fonction Prix TTC`, la liste proposait `Prix TTC`.

Mdall n'a pas d'appel : une fonction conclut sous son nom, et le nommer dans son
propre corps est une **circularité**. La règle reste indécidable — ou, pire,
elle lit ce que le projet tenait d'une version précédente d'elle-même, et l'on
obtient un nombre parfaitement plausible qui ne vient de nulle part.

La liste menait donc droit dans ce piège, d'un clic.

**Et d'elle seulement.** Une fonction pose très souvent une locale qui porte son
propre nom — `calcule Prix TTC = …` puis `alors (Prix TTC)` —, et c'est ainsi
qu'elle conclut. Ce qu'on retire est le nom **qu'elle conclut**, c'est-à-dire
elle-même vue du dehors ; jamais ce qu'elle vient de poser. C'est la suite
d'épreuves qui l'a rappelé, en tombant sur la première version du filtre.

### Ce que le catalogue reste

Il se **déduit**, il ne se déclare pas : les noms sortent du texte qu'on a
écrit, des fonctions que le langage porte, et des utilitaires qu'on a gardés.
Et il n'invente aucun nom — une complétion inventée se tape plus vite qu'elle
ne se vérifie.

## Comment ça se vérifie

**Les courbes viennent d'un vrai texte lu, et les versements d'un vrai
versement.** Une charge écrite à la main prendrait les hypothèses du code pour
des faits — et c'est exactement ce qui aurait masqué le verrou, puisqu'une
épreuve qui fabrique elle-même un `payload.regle.courbe` ne peut pas voir que
personne ne l'écrit.

**L'aller-retour est éprouvé entier** : écrite, versée, réécrite, relue, puis
**interpolée** — 45° entre 30° (0,8) et 60° (0) valent 0,4, et ce nombre-là
n'est écrit nulle part.

**La garde assouplie est éprouvée dans les deux sens** : un abaque entre, et un
nom qui ne dit vraiment rien reste écarté. Assouplir une garde sans éprouver ce
qu'elle retenait encore revient à la retirer.

**Et l'on a regardé l'écran** — en pilotant la vraie zone de saisie dans un
navigateur, pas en lisant le code. C'est là qu'on a vu que la liste s'ouvrait
bien, qu'elle proposait bien, et qu'elle ne proposait que des mots qu'on
n'avait pas besoin qu'on lui rappelle.
