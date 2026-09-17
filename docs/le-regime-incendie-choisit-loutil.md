# Le régime incendie choisit l'outil — plan de fabrication

## Le problème

Le Copilote sait déjà appeler l'agent « Incendie — Habitation ». Il le
choisit parce que sa description dit *bâtiment d'habitation* et que la question
posée parle d'habitation. Cela tient tant qu'il n'y a **qu'un** outil incendie.

Il en viendra d'autres : établissements recevant du public, code du travail,
immeubles de grande hauteur. Leurs descriptions commenceront toutes par « la
sécurité incendie d'un bâtiment », et le choix deviendra un tirage au sort sur
la formulation de la question.

Plus grave : **le régime applicable est une qualification réglementaire**, pas
une intuition de rédaction. « Ce bâtiment relève-t-il de l'arrêté du 31 janvier
1986 ou du règlement ERP ? » se tranche sur la destination des locaux et se
justifie. Laisser un modèle de langage la deviner, c'est exactement ce que le
catalogue interdit partout ailleurs :

> le modèle **choisit** l'outil et **rassemble** ses entrées ; l'outil
> **calcule**, seul ; le modèle **raconte** le résultat, sans le retoucher.

Choisir l'outil est légitime. Choisir le régime ne l'est pas : c'est une valeur,
et une valeur que personne n'a posée est une valeur inventée.

## Ce qu'on refuse d'écrire

Trois raccourcis se présenteront, et il faut les nommer pour ne pas les prendre :

- **`if (question.includes("incendie"))`** — la question ne dit pas le régime.
  « Quel degré coupe-feu pour les planchers ? » est la même phrase dans les
  trois référentiels.
- **une liste d'identifiants d'outils dans l'orchestrateur** — `["incendie_habitation",
  "incendie_erp", …]`. Elle serait juste le jour où on l'écrit, et fausse au
  troisième outil : c'est la liste des ancêtres du Copilote, qui a déjà coûté
  une barre de défilement.
- **le régime en paramètre d'appel, rempli par le modèle** — il le remplirait,
  et personne ne saurait d'où il sort.

Le choix doit **se déduire d'une valeur du projet**. C'est tout le plan.

## Ce qui existe déjà, et qu'on ne refait pas

- **Le catalogue** (`supabase/functions/_shared/agents/catalogue.js`)
  déclare chaque outil : ce qu'il tranche, ses entrées, ses sorties. La
  déclaration sert trois fois — décrire l'outil au modèle, construire le
  formulaire, vérifier les entrées.
- **`depuisMemoire`** : une entrée nomme la ou les clés sous lesquelles la
  mémoire du projet porte déjà cette valeur. `prefillDepuisMemoire` la remplit
  toute seule, avec sa provenance.
- **Ce qui manque ne s'invente pas** : un outil dont une entrée requise manque
  **ne s'exécute pas**, il demande. Le formulaire se construit depuis la
  déclaration de l'entrée.
- **« Classement du bâtiment »** est déjà versé en mémoire par l'étude
  habitation (`incendie-versement.js`, `donneesDeBaseVersables`).

**Attention au contresens** : le classement — 1re, 2e, 3e A, 3e B, 4e famille —
est la **sortie** du référentiel habitation. Il présuppose le régime. Il ne peut
donc pas servir à le choisir : ce serait demander à la conclusion de désigner la
prémisse.

Ce qu'il faut est **en amont** du classement.

---

## Étape 1 — La variable « Régime de sécurité incendie »

Une donnée de base du projet, au même titre que la zone de sismicité :

| | |
|---|---|
| **sujet** | `Régime de sécurité incendie` |
| **référence** | `regimeIncendie` |
| **nature** | `DONNEE_BASE` |
| **domaine** | `INCENDIE` |
| **valeurs** | `habitation`, `erp`, `code-du-travail`, `igh`, `hors-champ` |
| **portée** | par zone, comme le classement |

Ce que la déclaration doit dire d'elle-même (`docs/langage-mdall.md`) :

- **quoi** — « Le corps de règles de sécurité incendie dont relève le bâtiment,
  ou la partie de bâtiment, au sens de sa destination. »
- **utilisation** — « Détermine quel référentiel s'applique : arrêté du
  31 janvier 1986 pour l'habitation, règlement de sécurité contre l'incendie
  pour les ERP, code du travail pour les lieux de travail. C'est le nom que
  l'orchestration cite pour choisir l'outil. »

**Par zone, et ce n'est pas un raffinement.** Un rez-de-chaussée commercial sous
des logements relève de deux régimes dans un seul ouvrage — la taxonomie des
affirmations le dit déjà (`assertion-taxonomy.js`). Une variable posée sans
portée y répondrait faux la moitié du temps.

*Livrable :* la déclaration dans `variables-du-projet.ref`, et son versement
depuis l'écran de l'étude (§ 5).

---

## Étape 2 — Chaque outil incendie déclare le régime qu'il sert

Un champ, sur l'outil, dans le catalogue :

```js
{
  id: "incendie_habitation",
  regimeIncendie: "habitation",
  …
}
```

C'est **la seule chose** que l'orchestration lit pour router. Aucun fichier ne
porte la liste des outils incendie : elle se déduit de ceux qui déclarent un
régime.

**Le test d'acceptation de tout le plan** : ajouter l'ERP doit se réduire à un
fichier d'outil de plus, portant `regimeIncendie: "erp"`. Rien d'autre ne
change. Si une seconde ligne doit être éditée ailleurs, le plan est raté.

---

## Étape 3 — L'orchestration n'offre que ce qui s'applique

`declarationsPourModele()` rend aujourd'hui **tous** les outils. Elle prend un
argument :

```js
declarationsPourModele({ regimeIncendie })
```

et écarte les outils dont le régime déclaré ne vaut pas celui du projet. Les
outils sans régime — spectre sismique, fondations — ne sont jamais concernés.

**Le modèle ne voit pas le mauvais outil.** Ce n'est pas une consigne dans le
prompt, c'est une liste plus courte. Une consigne se contourne ; une absence,
non — et le catalogue porte déjà cette leçon écrite : *« le garde-fou est dans
le code, pas dans la consigne »*.

Le régime vient de la mémoire du projet, que `project-copilot/index.ts` charge
déjà pour construire son contexte. Aucune lecture nouvelle.

---

## Étape 4 — Ce qu'on ne sait pas, on le demande

Trois cas, et aucun ne se devine :

| ce que la mémoire dit | ce qui se passe |
|---|---|
| un régime, pour la zone en question | l'outil correspondant est offert, et lui seul |
| rien | **tous** les outils incendie sont offerts, et le premier appelé demandera le régime |
| deux zones, deux régimes, et la question ne dit pas laquelle | idem : on demande |

Le « on demande » n'est pas à écrire : chaque outil incendie porte une entrée

```js
{
  cle: "regimeIncendie",
  libelle: "Régime de sécurité incendie",
  type: "choix", valeurs: [...],
  requis: true,
  aiguillage: true,
  depuisMemoire: "Régime de sécurité incendie"
}
```

`aiguillage: true` la dispense du garde-fou des valeurs fabriquées — comme
`exigence` aujourd'hui : ce n'est pas une donnée du bâtiment, c'est ce qu'on
cherche. `depuisMemoire` la remplit quand le projet la porte. Et quand il ne la
porte pas, le mécanisme existant fait exactement ce qu'il faut : **l'outil ne
s'exécute pas, il rend le formulaire**, avec sa liste de choix.

La réponse donnée là se verse ensuite comme la variable de l'étape 1 — et la
question ne se repose plus.

---

## Étape 5 — La portée, et le défaut qu'elle révèle

`prefillDepuisMemoire` range les affirmations par `subject_key.split("@")[0]` :
**la portée est écartée, et la première trouvée gagne**. Pour une valeur unique
au projet — la zone de sismicité — c'est sans conséquence. Pour une valeur par
zone, c'est un défaut muet : deux régimes en mémoire, et l'outil prend celui qui
a été écrit en premier.

Il faut donc, dans le même mouvement :

1. faire remonter la **portée** avec la valeur ;
2. quand la question désigne une zone, ne retenir que les affirmations de cette
   zone ou de l'ouvrage entier ;
3. quand plusieurs portées répondent avec des valeurs **différentes**, ne rien
   pré-remplir et laisser la question se poser.

Le troisième point est le plus important : c'est le seul qui distingue « je
n'ai pas trouvé » de « j'ai trouvé deux choses contradictoires ». Les confondre
ferait répondre sur le rez-de-chaussée une exigence calculée pour les étages.

---

## Étape 6 — Ce que l'écran dit

Une réponse du Copilote qui s'appuie sur un régime doit le **nommer**, avec sa
portée et sa provenance : « pour le régime *habitation* (zone R+1 à R+4, tranché
le 12 mars), l'article 7 demande… ».

Sans cela, le fond du problème reste entier — on ne saurait pas sur quelle
qualification la réponse repose, et l'on ne pourrait pas la contester. C'est la
même exigence que pour l'étude citée par son titre (`etude-incendie.js`) : *une
réponse s'appuierait sur une hypothèse que la personne croyait abandonnée, et
rien ne le dirait*.

---

## Étape 7 — Les gardes

Toutes exécutables, dans `catalogue.test.mjs` sauf mention :

1. **Chaque outil incendie déclare un régime.** Un outil dont la description
   parle de sécurité incendie et qui n'en déclare pas est un outil qu'aucun
   projet ne pourra choisir — ou que tous choisiront.
2. **Deux outils ne servent pas le même régime.** Sinon le filtre en rend deux
   et l'on retombe sur le tirage au sort.
3. **Aucun identifiant d'outil n'est écrit dans l'orchestration.** On lit
   `project-copilot/index.ts` et `executer-agent/index.ts` et l'on vérifie
   qu'aucun `id` du catalogue n'y figure. C'est la garde qui empêche le
   raccourci de revenir.
4. **Filtrée sur un régime, la liste offerte contient exactement un outil
   incendie** — et tous les outils sans régime.
5. **Sans régime en mémoire, elle les contient tous.** On ne choisit pas à la
   place de quelqu'un.
6. **Deux zones contradictoires ne pré-remplissent rien** (`prefillDepuisMemoire`).
7. **Un régime inconnu n'écarte rien** : une valeur qu'on ne sait pas lire ne
   doit pas vider la liste — ce serait un Copilote muet sur l'incendie, sans que
   rien ne dise pourquoi (règle 5).

Chaque garde se vérifie en cassant le code et en la regardant tomber.

---

## L'ordre de fabrication

| | étape | ce qu'on peut livrer seul |
|---|---|---|
| 1 | la variable et son versement (§ 1, § 5 pour l'écran) | oui — elle enrichit la mémoire même sans routage |
| 2 | le champ `regimeIncendie` sur l'outil habitation (§ 2) | oui — inerte tant que § 3 n'est pas là |
| 3 | le filtre de `declarationsPourModele` (§ 3) et l'entrée `regimeIncendie` (§ 4) | oui — c'est le routage lui-même |
| 4 | la portée dans `prefillDepuisMemoire` (§ 5) | oui, et **indépendamment** : c'est un défaut qui existe déjà |
| 5 | la provenance à l'écran (§ 6) | oui |

Chaque ligne est une PR. La quatrième n'attend pas les autres : le défaut de
portée est là aujourd'hui, pour toutes les valeurs par zone.

## Comment on saura que c'est fait

Le jour où l'on ajoute l'agent ERP : un fichier, une ligne
`regimeIncendie: "erp"`, et **aucune autre modification**. Un projet classé ERP
voit le Copilote l'appeler sans qu'on ait rien dit ; un projet qui ne porte pas
la variable s'entend demander laquelle, une fois, et ne l'entend plus jamais.
