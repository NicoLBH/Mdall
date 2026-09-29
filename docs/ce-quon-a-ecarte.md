# Ce qu'on a écarté — constaté, pas demandé

**À quoi sert cette page :** le renversement qui fait cesser d'être vide le
champ le plus précieux de Mdall, sans demander un geste de plus à personne.
C'est la première brique du moteur de prédiction, et c'est la seule qu'on ne
pourra jamais rattraper après coup.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le défaut, et pourquoi ce n'était pas un défaut de discipline

Le champ « ce qui a été examiné » est vide partout. L'écran le dit lui-même —
« Ce raisonnement ne dit pas tout : on ne sait pas ce qui a été examiné » —, le
tri fait remonter les sujets concernés, et le champ reste vide.

On avait donc proposé de le rendre obligatoire. La réponse a fermé la question :

> « Si tu veux imposer à l'utilisateur de dire, à chaque fois, de manière
> explicite ce qu'il a écarté et pourquoi, alors c'est perdu d'avance : personne
> ne veut être le professeur d'une application qui va enrichir d'autres
> personnes grâce à l'effort qu'on lui demande de porter. »

C'est juste, et c'est rédhibitoire. Un champ dont le coût est immédiat et le
bénéfice différé — et pour quelqu'un d'autre — ne se remplit nulle part, dans
aucun logiciel, jamais. Ce n'était pas un défaut de discipline : **on demandait
de retaper ce que le système avait déjà vu faire.**

## Le renversement

> **Ce qui a été écarté se constate ; ce qui manque au constat se demande une
> fois, par lot, à celui qui vient d'en souffrir, et sous forme de clic.**

## Quatre gisements, et ils sont gratuits

Mdall enregistre déjà des écartements, comme **sous-produits du travail
normal**. Personne ne les a saisis, personne n'a rien à saisir : il n'y a que du
calcul sur ce qui existe (`services/ecarts-observes.js`).

| ce qu'on lit | ce que ça dit | d'où ça vient |
|---|---|---|
| une valeur remplacée | « 0,47 m a été écarté au profit de 0,60 m » | `valeursCorrigees` |
| un versement rétrospectif | un document arrivé après coup qui n'a pas fait foi | `versementsRetrospectifs` |
| une ligne sortie du projet | une zone retirée, une version d'utilitaire reprise | `horsPerimetre` |
| une ligne refusée en revue | un refus **signé, daté, motivé** | `status: "rejected"` |

Le quatrième est le plus riche, et c'est celui auquel on ne pensait pas. Un item
de proposition refusé **entre dans la mémoire** : `assertionsFromProposition` lui
donne `status: "rejected"` et met la raison du refus dans `detail`. Quelqu'un a
écrit pourquoi il refusait, **au moment où il refusait** — c'est exactement ce
qu'on s'apprêtait à redemander six mois plus tard.

## Deux axes, et les confondre serait mentir

**Comment Mdall l'a vu** n'est pas **pourquoi un humain l'a écarté**.

Un écart constaté a toujours le premier et presque jamais le second. « Une
valeur plus récente l'a remplacé » dit ce qu'on a observé ; cela ne dit rien de
ce qui était dans la tête de celui qui a reversé. Fabriquer un motif à partir
d'un constat serait exactement ce que la règle 5 interdit : *ne pas savoir
n'autorise pas à prétendre qu'il n'y a rien* — ni à prétendre qu'on sait.

Une seule des quatre traces porte un motif donné : le refus de revue.

## Ce qui se lit à l'écran

Sous une ligne de la mémoire, là où le sujet ne déclare aucun écarté :

```
Écarté en chemin — constaté par Mdall, jamais versé
   0,47 m   une valeur plus récente l'a remplacé — « 0,69 m » a pris sa place
```

**Rien là où la décision les a notés.** Une mention qui s'affiche partout
n'oriente plus — on l'a appris en retirant « a bougé récemment ». Et un constat
de machine par-dessus une phrase de projet ferait lire le second à la place de
la première.

**Jamais versé.** Un écart constaté n'est pas une affirmation du projet : c'est
une lecture de la mémoire, refaite à chaque affichage. Le verser ferait entrer
en mémoire une chose que personne n'a signée (règle 1), et figerait un calcul
qui doit suivre la mémoire quand elle bouge.

Et la note de la mémoire cesse d'être un reproche :

```
1 décision enregistrée — une ne dit pas ce qu'elle a écarté, et Mdall en a constaté 2
```

## L'autre moitié : un clic, pas une phrase

Ce que le calcul ne peut pas voir s'est passé dans une réunion, et il faut bien
le demander. Mais on le demande **autrement**.

La raison d'un possible écarté se **choisit** dans un domaine fermé de douze
raisons du métier (`RAISON`, dans `memoire-en-texte.js`) : trop cher ·
incompatible avec le délai · non conforme à la norme · refusé par la maîtrise
d'ouvrage · incompatible avec l'existant · avis défavorable du contrôleur
technique · contrainte d'emprise · aucune entreprise ne sait le faire ici · hors
garantie décennale · produit indisponible · retour d'expérience défavorable ·
surdimensionné pour le besoin.

Trois raisons à la liste fermée, et la troisième décide :

- **c'est un clic** — écrire « pourquoi pas de l'ardoise » en fin de journée ne
  se fait pas ; choisir « trop cher » se fait ;
- **ça se relit** — douze raisons se reconnaissent d'un coup d'œil, là où cent
  formulations du même refus se relisent une par une ;
- **ça se compte** — « 7 projets sur 10 ont écarté l'ardoise pour le délai » est
  un chiffre ; sur du texte libre, ce n'est rien.

Le texte libre reste à côté : on se rappelle parfois un argument qui n'est dans
aucune case, et le perdre serait perdre la réponse à « pourquoi pas de
l'ardoise ? ». **La raison se compte, la phrase se lit.**

## Le défaut que l'écran a révélé

Cette page n'aurait pas existé sans un coup d'œil à Chromium. La première
capture montrait, sous une question fermée :

```
Quelle est la profondeur hors gel… ?   une valeur plus récente l'a remplacé
```

La **question** aurait été écartée au profit de sa propre réponse. En remontant :
une question fermée verse trois lignes qui **portent le même nom** — c'est ce
qui permet de les relier —, et `porteUneValeur` lisait ce nom dans
`payload.subject`, où les trois écrivent la question.

Les trois passaient donc pour trois versements du même nom, et deux se
faisaient éclipser par la troisième. **La décision et le raisonnement d'une
valeur disparaissaient de leur fichier**, sans que rien ne le dise — le seul
défaut qu'une mémoire ne doive jamais avoir.

Ce qui les distingue est le préfixe de leur clé, et `faceDe` est le seul endroit
qui sache ce qu'un préfixe veut dire (règle 10). `porteUneValeur` le lui demande
désormais.

> **Regarder l'écran trouve encore ce qu'aucune épreuve n'a trouvé.**

## Ce que cela prépare

La donnée la plus rare du monde commence à s'accumuler **sans que personne n'ait
rien tapé**. C'est l'étape 1 de `docs/la-memoire-qui-predit.md`, et c'est la
seule qui soit irrattrapable : on n'ira jamais redemander à quelqu'un ce qu'il
avait écarté en 2026, ni pourquoi.

Ce qui reste à faire, dans l'ordre :

1. **La demande par lot** — un écran qui montre les écartés constatés d'un
   projet et n'en demande que la raison, d'un clic, à celui qui vient de
   chercher l'information. Une fois, jamais à chaque décision.
2. **L'épisode et son vecteur de contexte**, puis la mesure, puis les
   prédicteurs (`docs/la-memoire-qui-predit.md`).
