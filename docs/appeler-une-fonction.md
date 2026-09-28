# Appeler une fonction, et le copilote qui ne voyait pas les fonctions

**À quoi sert cette page :** elle revient sur une décision de langage, et dit
pourquoi. Et elle raconte un défaut voisin : le copilote répondait « la mémoire
n'en dit rien » sur une question à laquelle la mémoire répondait.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## 1. Une fonction attachée à ses noms n'est pas une fonction

### L'objection, telle qu'elle a été posée

> Je veux pouvoir passer des arguments dans une fonction existante
> `Couleur des volets(zones, Matériau)`, même si à la base ce n'était pas
> Matériau mais Nature des volets. Une fonction doit être détachée de ses
> arguments d'entrée sinon ça va être impossible à gérer, non ?

Oui. La ronde précédente défendait l'inverse, et se trompait — pas sur les
faits, sur la portée du choix.

### Ce que l'absence d'appel coûtait vraiment

`Couleur des volets` déclare lire `Nature des volets`. Elle ne savait lire que
ce nom-là, dans tout le projet. Une seconde série de volets, nommée autrement —
`Matériau des volets du lot B` —, demandait **une seconde fonction qui dit la
même chose**.

À dix noms, le projet tient dix copies d'un même raisonnement. Neuf
vieilliront, et rien ne le dira : chacune est versée, signée, cohérente. C'est
exactement la maladie que cette langue existe pour empêcher (règle 4), et
l'absence d'appel la rendait obligatoire.

Une fonction détachable des noms sur lesquels on l'a écrite est une fonction.
Attachée, c'est un cas particulier.

### Ce que l'ancien argument avait de juste, et où il s'arrêtait

L'argument était : une fonction à arguments s'appelle depuis dix endroits avec
dix valeurs, et l'on ne sait plus laquelle le projet tient pour vraie.

Il reste vrai — **pour la mémoire**. Il ne dit rien du calcul. La réponse n'est
donc pas d'interdire l'appel, elle est de séparer les deux :

- une fonction **conclut** sous son seul nom, et c'est ce qui se verse ;
- un appel **évalue**, et son résultat va dans la locale qui le reçoit.

Un appel n'ajoute pas une seconde vérité : il répond à une question de passage.
La règle 10 tient toujours, exactement où elle doit tenir.

### Ce que ça donne

```
fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}

fonction Teinte du lot B(zones, Matériau) {
   calcule teinte = Couleur des volets(zones, Matériau);
   si (teinte = "violet")
   alors ("conforme au nuancier");
   sinon ("à valider");
}
```

**L'ordre est celui de la signature**, et la portée vient toujours en premier :
c'est la ligne qu'on lit avant de s'en servir, et l'appel la mire. Le mauvais
nombre de valeurs se dit avec la signature attendue.

**On ne substitue que ce qui est déclaré.** Une fonction qui lit trois noms et
n'en déclare qu'un garde les deux autres : ils se lisent là où on l'appelle.

**Pas de récursion.** Une fonction qui se rappelle, directement ou par une
autre, reste sans réponse. Un langage qui n'en a pas besoin n'a pas à inventer
une pile et des cas d'arrêt.

### Trois choses ont dû changer autour

**Une locale pouvait ne porter qu'une mesure.** « violet » n'en est pas une, et
l'arithmétique déclarait la ligne indécidable. Toute fonction qui conclut un
mot — une couleur, un classement, un degré coupe-feu, c'est-à-dire la moitié
d'un projet — était inutilisable dans un `calcule`, **y compris sans appel**, et
rien ne le disait. Un calcul qui ne fait que nommer ne calcule rien : il
reprend.

**Une fonction appelée n'est pas une entrée.** Un appel lit trois noms — la
fonction, la portée, la matière — et un seul est une entrée. Sans cet écart, la
vérification réclamait `Teinte du lot B(zones, Couleur des volets, zones,
Matériau)`, et le formulaire demandait de taper à la main une fonction que le
projet possède déjà. C'est la différence entre « de quoi ai-je besoin ? » et
« que dois-je annoncer ? », et elle n'existait pas tant que rien ne s'appelait.

**La portée ne se tape pas.** `zones` est le premier argument de tout appel, et
le bac d'essai n'a pas de zone : on y essaie une fonction, pas un ouvrage. Elle
est donc toujours connue, et vide veut dire « toutes zones ».

---

## 2. Le copilote ne voyait pas les fonctions

### Le symptôme

> Quel impact si la nature des volets change de bois à alu ?

> La mémoire du projet ne dit rien sur la nature des volets ni sur l'impact
> d'un changement de bois à aluminium.

### Ce qu'il recevait vraiment

Une seule ligne :

```
- **regle:couleur-des-volets** · Couleur des volets : violet · …
```

La **réponse**, jamais la question. Une règle versée tombait dans « Non
classé », réduite à sa conclusion : ni ce qu'elle lit, ni sous quelle condition
elle conclut cela. Aucune question qui commence par « et si » n'était donc
répondable — et le briefing lui dit par ailleurs, à raison, de ne pas répondre
à la place du projet. Il a obéi.

### Ce qu'il reçoit maintenant

Une section à lui, avec le texte entier de chaque fonction — le **même**
écrivain que celui de l'écran des fichiers, pour qu'une réponse se vérifie ligne
à ligne dans ce qu'un humain relit (règle 10). Le commentaire de la fonction en
fait partie : c'est ce qui dit à quoi elle sert.

Une règle n'est pas une nature : c'est un texte qui dit **comment** une valeur
se déduit. La ranger avec ce qu'on n'a pas su classer disait au copilote qu'on
ne savait pas ce que c'était.

---

## Ce que la ronde a appris

**Un choix de langage se juge sur ce qu'il oblige à écrire.** « Une fonction ne
prend rien » était défendable en principe et intenable en pratique : il
obligeait à recopier un raisonnement dès que deux parties d'ouvrage ne
nommaient pas leurs données pareil. On ne l'a pas vu en raisonnant ; on l'a vu
quand quelqu'un a essayé de s'en servir deux fois.

**Une doctrine renversée se date, elle ne se réécrit pas.**
`docs/il-ny-a-pas-dappel-de-fonction.md` reste en place, avec un avertissement
en tête. Trois des quatre défauts qu'elle décrit sont toujours corrigés ; le
quatrième n'était pas une faute, c'était une forme qui manquait. Corriger la
page en silence effacerait ce sur quoi on s'est trompé.

**« La mémoire n'en dit rien » peut être une réponse honnête et fausse.** Le
copilote disait vrai sur ce qu'on lui donnait. C'est le deuxième défaut de ce
genre en deux rondes — et à chaque fois, la mémoire portait la réponse, et le
chemin jusqu'au lecteur la perdait.
