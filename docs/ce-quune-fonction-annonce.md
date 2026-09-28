# Ce qu'une fonction annonce, et ce qui le vérifie

**À quoi sert cette page :** la signature d'une fonction ne liait rien, et
personne ne disait ce qu'une fonction rend. Cette page dit pourquoi les deux
sont désormais **déclarés et vérifiés**, et pourquoi chaque refus donne la
ligne à écrire plutôt que le nom de la faute.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le point de départ : trois écrans qui ne disaient rien

Un utilisateur écrit ceci, pour se servir d'une fonction que son projet a déjà
signée :

```
fonction Test(zones, Matériau) {
   // Choix du matériau parmi bois, alu ou pvc, puis lecture de la couleur des volets.
   Couleur des volets(Matériau);
}
```

Le bac d'essai répondait :

> Rien à remplir : ce brouillon ne lit aucune entrée.
> **Aucune fonction à lancer : le brouillon ne raisonne pas encore.**

Trois choses fausses ou muettes, à la suite.

**« Le brouillon ne raisonne pas encore » était faux.** Il raisonnait : il
portait une ligne que la lecture avait refusée. On lisait « il n'y a rien » là
où il fallait lire « il y a quelque chose, et je ne l'ai pas compris ». On
cherchait donc ce qu'on avait oublié d'écrire, au lieu de regarder la ligne qui
clochait (règle 5).

**Le refus existait, et il n'était pas là.** La lecture avait bien dit « aucun
mot de la langue n'ouvre cette ligne », et la vérification avait bien ajouté
« Test est nommé et ne dit rien ». Les deux partaient à la **console** — un
autre panneau, qu'on n'avait pas ouvert. Le seul endroit où l'on regarde après
avoir cliqué ne portait rien.

**Et le message n'apprenait rien.** « Aucun mot de la langue n'ouvre cette
ligne » est vrai, et fait relire la grammaire en cherchant le mot qui manque —
alors que c'est la phrase entière qui est de la mauvaise forme.

## Ce qui a été fait

Le bac dit maintenant **« Rien ne se lance : 1 ligne n'a pas été comprise »**, et
montre la ligne, avec son fichier, son numéro et sa raison — là où l'on regarde.

Et une ligne écrite comme un appel avait alors son propre refus :

> il n'y a pas d'appel de fonction : « Couleur des volets » se nomme, comme
> n'importe quel nom. Écrivez « calcule … = Couleur des volets; » ou « si
> (Couleur des volets …) » selon ce que vous voulez en faire.

*(Cette phrase n'existe plus : une fonction s'appelle depuis. Ce qui reste vrai
est qu'un appel seul sur sa ligne ne conclut rien, et le refus le dit —
`docs/appeler-une-fonction.md`.)*

C'est la faute que la forme appelle — on connaît les fonctions des autres
langages — et le message donne la ligne à écrire.

## La signature : elle ne liait rien

`fonction Test(zones, Matériau)` dont le corps lit autre chose **fonctionnait
très bien**. La signature était de la décoration : lue, puis jetée — le bloc ne
gardait même pas ce qu'elle annonçait.

C'est un problème d'une espèce particulière : **rien ne le révèle jamais.** Les
exemples tournent, les résultats sont justes, et le fichier versé annonce une
fonction qui n'existe pas. Le seul moyen de le savoir est de relire tout le
corps — ce que la signature existe précisément pour éviter.

Elle est donc **gardée, puis vérifiée**, dans les deux sens :

- **une entrée lue sans être annoncée** fait lire une fonction plus simple
  qu'elle n'est : on croit savoir ce qu'il faut lui donner, et il faut autre
  chose ;
- **une entrée annoncée dont rien ne se sert** fait relire le corps trois fois
  pour la chercher, et l'on finit par douter de sa propre lecture ;
- **une portée absente** : `zones` s'écrit, et toujours en premier. C'est sous
  ce nom qu'une fonction reçoit les parties d'ouvrage auxquelles elle
  s'applique.

### On annonce tout ce qu'on lit, déduit ou non

Première version de la règle : écarter les noms qu'une autre fonction conclut,
au motif qu'ils ne se saisissent pas. **C'était une invention**, et le langage
lui-même disait le contraire — il écrit `fonction Prix TTC(zones, Prix HT, Taux
de TVA)` partout, y compris quand le taux vient d'à côté.

Et il a raison : ce qu'une fonction lit ne dépend pas de ce que quelqu'un a
écrit à côté. Une signature qui changerait de sens parce qu'on a ajouté une
fonction ailleurs ne voudrait plus rien dire.

Ce qui se **saisit** est une autre question, et c'est le formulaire qui y
répond — jamais la signature.

### Ce que la vérification a trouvé tout de suite

**Deux signatures fausses dans la documentation du projet**, dont une écrite au
lot précédent. Elles tournaient parfaitement, et personne ne les avait vues —
c'est exactement la famille de défaut qu'un lancement ne peut pas attraper.
Une épreuve relit désormais chaque exemple du wiki et de la consigne du modèle.

## `rend:` : ce qu'on obtient en la nommant

Une fonction disait ce qu'elle **lit**, jamais ce qu'elle **rend**. On nommait
« Couleur des volets » sans savoir si l'on obtiendrait une couleur, une
épaisseur en centimètres ou un vrai/faux.

```
fonction Couleur des volets(zones, Matériau) {
   rend: "gris" ou "blanc"

   si (Matériau = "bois")
   alors ("gris");
   sinon ("blanc");
}
```

**Deux formes, et ce sont celles d'une déclaration de nom** : un domaine fermé
entre guillemets, ou une unité sans guillemets. Une seconde grammaire pour la
même idée ferait deux façons d'énoncer un domaine (règle 10).

**Il est facultatif.** L'exiger ferait crier sur toutes les fonctions écrites
avant qu'il existe — et une promesse qu'on ne sait pas tenir vaut mieux absente.

**Il est vérifié**, sinon ce serait une intention (règle 12) : chaque conclusion
écrite doit la tenir. Une fonction qui annonce `rend: kN` et conclut
`"3e famille B"` est refusée, avec la phrase qui dit comment s'écrit une mesure.

**Une conclusion qui nomme un `calcule` ne se compare pas.** Sa valeur dépend
des réponses, et on ne la connaît qu'au lancement : la refuser ici interdirait
`alors (Prix TTC)`, qui est la forme la plus courante du langage.

Et il voyage : réécrit, relu, versé, remonté — l'aide à la signature le montre,
parce que c'est la question qu'on se pose juste avant de nommer une fonction.

## Refuser **et** expliquer

Nos lecteurs ne sont pas des professionnels du code. « Signature invalide »
n'apprend rien ; il faut la ligne à écrire :

> « F » lit « Matériau », mais sa signature ne l'annonce pas.
> **Écrivez : F(zones, Matériau).**

C'est la même règle pour les cinq refus de ce lot : dire ce qui cloche, puis ce
qu'il faut écrire à la place.

## Comment ça se vérifie

**Les entrées d'un bloc vivent à un seul endroit** (`entreesDuBloc`) : ce que le
formulaire demande, ce que l'aide annonce et ce qu'une signature doit déclarer
sont la même question. Écrite trois fois, elle aurait donné trois réponses.

**Chaque exemple du wiki et de la consigne est relu** par la vérification, parce
qu'un exemple faux est pire qu'une absence : le modèle le copie, et le brouillon
est refusé par la documentation qui le lui a montré.

**Et l'on a rejoué le cas des captures**, avant et après — c'est lui qui dit si
le produit répond enfin.
