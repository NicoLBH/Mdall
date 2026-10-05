# La ligne du temps d'un chantier

> **L'unité n'est pas le document, c'est le fait daté.**
>
> Point 5 de `la-ligne-du-temps-et-la-justesse.md`.

---

## 1. Ce qui existait, et ce que cela ne faisait pas

`la-chronologie-des-sources.js` tient la doctrine du produit, et elle reste
entière : quatre places (`EN_TETE`, `RETROSPECTIVE`, `SANS_DATE`,
`SANS_REPERE`), et la distinction qui décide de tout —

| Ce que le document fait | Depuis le passé |
| --- | --- |
| Il ouvre un sujet | **oui** |
| Il dit « fait », avec sa date | **oui** — c'est un fait daté |
| Il n'en parle plus | **non** — c'est une déduction sur *maintenant* |

Elle ordonnait les **documents**, et cela suffisait pour décider d'une fermeture.
Ordonner les **faits** est ce qu'il faut pour chercher un enchaînement
reproductible, parce que c'est entre les faits que l'enchaînement se produit.

La ligne du temps **réemploie** `cequElleRevise` plutôt que de réécrire la règle
(règle 4). Ce qui monte d'un étage, c'est l'unité.

---

## 2. `quand` et `dou.quand` sont deux choses

Un document n'a pas *une* date. Un compte rendu du 30 avril peut dire :

* « le ferraillage a été coulé le **22 avril** » → un **constat**, daté du 22 ;
* « la reprise est prévue le **15 mai** » → un **engagement**, daté du 15 ;
* et son point sans date propre est un constat du **30**, jour de la réunion.

```
un fait = {
  quand,      // la date de l'événement
  dit,
  nature,     // constat · engagement · avis
  reference,
  dou: { document, famille, quand }   // ← et la date du document
}
```

**La seconde date explique les délais de réaction.** Un fait du 22 appris le 30
dit pourquoi personne n'a bougé avant le 30 — ce qui est souvent la vraie
question. Les confondre perdrait exactement ce que la ligne existe pour voir.

### La nature n'est pas une étiquette de classement

Un constat dit ce qui a eu lieu, un engagement dit ce qui *devrait* avoir lieu.
Les ranger ensemble ferait lire une promesse comme un fait accompli — la
confusion la plus chère du bâtiment. Le bilan les compte donc à part : « 14 faits
en mai » n'est pas la même phrase que « 14 choses promises pour mai ».

---

## 3. Deux lignes, et jamais une seule

| | Ce que c'est | À quoi elle sert |
| --- | --- | --- |
| **la vécue** | l'ordre du dépôt | ce qu'on savait, quand — elle explique les décisions prises |
| **la reconstituée** | l'ordre des faits | ce qui s'est passé |

Elles diffèrent dès qu'une archive est déposée après coup, et **la différence
n'est pas une erreur à corriger**. Si le document A (mars) arrive après le
document B (septembre), la reconstituée dira « A puis B », et ce sera juste. Mais
personne, sur ce chantier, n'a réfléchi dans cet ordre : les décisions de
septembre ont été prises sans A.

Une prédiction entraînée sur la reconstituée apprend des enchaînements
**logiques** ; sur la vécue, des enchaînements **vécus**. Les deux sont utiles et
ne répondent pas à la même question — le module rend les deux et refuse d'en
élire une.

`ceQuiSepareLesDeuxLignes` chiffre l'écart. **C'est lui qui dit si la distinction
sert** : sur un chantier arrivé dans l'ordre, il vaut zéro et il n'y a rien à
arbitrer. Le jour où une archive est déposée, il saute.

### Et l'ordre n'est pas la cause

« A puis B, quatorze fois » ne dit pas que A entraîne B. C'est la limite que la
rubrique « Ce qui s'enchaîne » de la console nomme déjà, et cette ligne-ci la
rendra **plus tentante, pas moins**. Elle est donc redite dans le code qui la
produit, et non seulement dans l'écran qui la montre.

---

## 4. Les trois règles

1. **L'ordre du dépôt reste la vérité de ce qu'on savait.** Il ne bouge jamais.
   La reconstituée est une *seconde* lecture, et non une correction de la
   première. C'est pourquoi une lecture se place parmi celles **déjà lues**, et
   non parmi celles qui existaient.
2. **Un fait daté traverse, une déduction non.** La règle vient de
   `la-chronologie-des-sources.js` ; chaque fait porte ce qu'il a le droit de
   réviser, depuis là où son document se place.
3. **Ce qu'on ne sait pas dater se dit, et ne s'insère pas.** `unFaitDate` rend
   `null` plutôt qu'un fait sans date : une suite fausse est pire qu'une suite
   incomplète (règle 5). Le compte de ce qui n'a pas pu être daté voyage avec la
   ligne.

**Chaque famille se place dans la sienne.** Un rapport de contrôle ne recule pas
parce qu'un compte rendu plus récent existe : ils ne révisent pas les mêmes
sujets, et les mêler ferait reculer tout ce qui n'est pas de la famille la plus
bavarde.

---

## 5. L'extensibilité, qui était la vraie question

Une famille déclare **ce qu'elle date**, dans `les-faits-dates.js` :

| Famille | Ce qu'elle produit |
| --- | --- |
| Rapports de contrôle | un **avis** par ligne, daté du rapport |
| Comptes rendus | un **constat** (à `faitLe`, sinon à la date de réunion) et, s'il y a une échéance, un **engagement** |
| *Un capteur, demain* | un **constat** par relevé, sans aucune déduction — le cas le plus simple |
| *Une messagerie, demain* | comme un fil de mails : à écrire |

Une famille absente **lève**. Un moteur qui saute en silence ce qu'il ne sait pas
lire rend une chronologie sur un corpus qu'il n'a pas lu.

### Pourquoi ce n'est pas dans le registre des familles

Le document de stratégie disait que ces déclarations devaient vivre dans
`les-familles-de-document.js`, « et nulle part ailleurs ». Elles n'y sont pas, et
c'est un choix qu'il faut assumer plutôt que taire :

* le registre est chargé par **tous** les écrans ; l'extraction des faits ne sert
  qu'à la ligne du temps, et l'y mettre alourdirait le navigateur de tous ;
* la même décision avait déjà été prise pour l'empreinte d'une lecture, et deux
  conventions pour la même question coûtent plus que la seconde place.

Ce qui rend la seconde place tenable est qu'elle **refuse**.

---

## 6. Ce qui n'est pas fait

* **Les fils de mails ne produisent aucun fait daté.** `le-fil-des-mails.js`
  ordonne les messages dans le fil, mais rien ne place un fil dans le temps du
  chantier. C'est le trou que le diagnostic avait nommé, et il reste entier.
* **Aucun écran.** La ligne du temps est un service ; rien ne la dessine.
* **Rien n'est conservé.** Elle se calcule à partir des lectures qu'on lui donne,
  à chaque appel.
* **Elle ne sert encore à aucune prédiction.** Le prédicteur travaille sur les
  sujets, pas sur les faits datés. Les brancher est un tour à part, et il faudra
  d'abord choisir **laquelle des deux lignes** on lui donne — ce que ce module se
  refuse à faire à sa place.
