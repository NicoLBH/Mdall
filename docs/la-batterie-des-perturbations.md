# La batterie de perturbations

> **On mute le document, pas le code.**
>
> Première pierre de ce que `la-ligne-du-temps-et-la-justesse.md` appelait le
> point 4 : mesurer la justesse des analyses sans écrire d'oracle.

---

## 1. Pourquoi une batterie de mutations ne suffisait pas

Une batterie de mutations casse le code et regarde si une épreuve tombe. Elle
répond à « mon filet verrait-il le défaut », ce qui est une question sur le
filet. Elle ne peut rien dire de « ce constat est-il juste », parce que la
réponse n'est pas dans le code : elle est dans le document.

Déplacer la mutation sur le **document** rend la même vertu, et sans oracle. On
ignore quelle est la bonne lecture ; on sait quelle **relation** doit tenir entre
la lecture d'un document et celle du même document perturbé.

| Perturbation | Ce qui doit se passer | État |
| --- | --- | --- |
| Le format des dates (`18/04/26` → `18 avril 2026`) | rien ne change | fait |
| Deux paragraphes de prose échangent leur place | rien ne change | fait |
| Un saut de page coupe un tableau en son milieu | rien ne change | fait |
| Une référence renommée partout | tout suit, à la référence près | fait |
| **Une phrase niée** (prose **et** verdict) | **le constat s'inverse** | fait |
| La légende retirée | les marques cessent de se résoudre, et ça se dit | fait |
| Dégrader la qualité du PDF | les constats restent, la fidélité baisse | **pas fait** |

La dernière ligne ne s'écrit pas sur du texte : il faut refaire l'image et
repasser l'extraction. Elle viendra quand la batterie saura partir d'un PDF.
C'est dit ici plutôt que laissé croire que la liste est complète.

---

## 2. Ce que la négation attrape, et pourquoi c'est la plus précieuse

Une analyse qui rend **le même constat sur un document et sur sa négation** ne
lit pas le document : elle devine à partir du reste — l'intitulé, la section, ce
qu'un document de cette nature dit d'habitude. C'est le survivant au sens exact
d'une batterie de mutations, et c'est le seul défaut d'analyse qu'on sache
attraper sans connaître la bonne réponse.

La preuve que la batterie l'attrape est dans ses propres épreuves. Deux lecteurs
de carton y servent de sujets : l'un lit la colonne du verdict, l'autre rend
toujours « F » sans la regarder.

```
                                        lit    devine
le format des dates                      ✓       ✓
l'ordre de deux paragraphes              ✓       ✓
une coupure de page dans un tableau      ✓       ✓
une référence renommée                   ✓       ✓
une phrase niée                          ✓       ✗   ← le seul endroit où il se trahit
la légende retirée                       ✓       ✓
```

Sur cinq perturbations, le menteur est indiscernable. Sur la sixième, il tombe.
**C'est ce qui fait de cet outil un instrument de mesure et non une décoration** :
on l'a vu tomber, exprès, sur un défaut qu'on avait fabriqué.

### Pourquoi la négation retourne aussi le verdict

Nier la seule prose laisserait un document qui se contredit : la colonne dit
« F », le texte dit « non conforme ». **Un document contradictoire n'a pas de
bonne lecture**, donc aucune relation ne peut être déclarée à son sujet —
mesurer une analyse contre une question sans réponse ne mesure rien (règle 5).
La perturbation produit donc un document cohérent qui dit le contraire.

Et là où rien ne s'oppose, elle **ne s'applique pas**. Un compte rendu porte des
états qui se suivent — « à faire », « en cours », « soldé » — et non des verdicts
qui s'opposent. La table `LES_MARQUES_OPPOSEES` dit où la négation a un sens, et
nulle part ailleurs : inventer un contraire fabriquerait la question.

---

## 3. Les trois pièges, et comment chacun est fermé

Un outil de mesure ne peut mentir que d'une façon : **rendre du vert sur un
travail qu'il n'a pas fait**. Trois chemins y mènent, chacun fermé par un refus,
et chaque refus est gardé par une épreuve qui le casse exprès.

### Une perturbation qui ne perturbe rien

Si `applique` rend le document inchangé en prétendant avoir agi, la lecture sera
identique **par construction** : la relation tiendra toujours. `passerUneEpreuve`
compare donc le texte rendu au texte reçu et refuse l'épreuve plutôt que de la
compter — `POURQUOI_PAS.SANS_EFFET`.

### Une relation qui tient sur du vide

Deux relevés vides sont identiques. Une lecture qui ne trouve rien passerait
« rien ne change » sans avoir rien lu. `SANS_OBJET` est donc un verdict à part
entière, posé avant toute comparaison dès que la lecture d'origine ne relève
rien.

### Un bilan qui mêle les deux aux réussites

Un taux de réussite qui compterait les sans-objet avec les réussites **monterait
quand la batterie cesse de fonctionner** — la pire propriété possible pour un
indicateur. Le bilan les compte à part, détaille leurs motifs, et donne le
dénominateur des épreuves qui ont **eu lieu** :

```
═══ 9 tiennent, 0 tombent, sur 9 épreuves qui ont eu lieu ═══
    3 épreuves n'ont pas eu lieu : inapplicable 3
```

---

## 4. Ce qui est comparé, et ce qui a le droit de varier

C'est la décision la plus lourde de l'outil : trop permissive, l'empreinte laisse
passer de vrais défauts ; trop stricte, elle crie à chaque lecture et l'on cesse
de la regarder. Elle est donc écrite une fois,
dans `lempreinte-dune-lecture.js`.

| Ne varie pas | A le droit de varier |
| --- | --- |
| l'ensemble des références relevées | l'ordre |
| la marque de chacun — c'est le verdict | le numéro de page |
| | les mots du constat |

**Toutes les relations sont à l'ordre près**, et aucune ne le compare. Une
première version gardait les clés « dans l'ordre du document, pour le comparer à
part », et rien ne les lisait : un champ livré avec la promesse d'une
comparaison qui n'existe pas se lit comme une comparaison faite. Il est parti, et
la limite est dite ici.

La clé d'un relevé est sa référence, ou son intitulé à défaut, **normalisée** :
sans cela, un changement de casse ferait disparaître un relevé et en apparaître
un autre — deux défauts annoncés là où il n'y en a aucun. Un relevé sans clé se
compte à part : qu'on ne sache pas le rapprocher n'est pas qu'il ait disparu.

### Le défaut que ce principe a lui-même produit

La relation « tout suit » comparait la clé **normalisée** de l'empreinte — `a 23`
— à la référence **brute** de la perturbation — `A-23`. Elle ne rapprochait donc
jamais rien : sur une lecture parfaitement juste, la batterie annonçait une
disparition et une apparition.

Trouvé en la lançant, pas en la relisant. **Un instrument qui accuse la lecture
de son propre défaut est pire qu'un instrument absent**, et c'est la raison pour
laquelle la batterie s'éprouve elle-même avant de mesurer quoi que ce soit.

---

## 5. Les invariants, posés dans le même geste

Une perturbation compare deux lectures ; un invariant juge une lecture seule. On
vient de payer deux lectures — il serait absurde de ne poser qu'une question.

* **toute citation se retrouve dans le document d'où elle sort.** C'est le
  meilleur indicateur du produit et il ne coûte rien : une citation absente est
  une phrase que personne n'a écrite, présentée avec l'aplomb d'une phrase lue ;
* **toute marque employée est déclarée dans la légende.**

La recherche d'une citation normalise **trois choses, nommées une par une** :
l'apostrophe, le tiret et l'espace. Ni la casse, ni les accents, ni la
ponctuation — ils portent du sens, et une liste qu'on allonge sans y penser finit
par rendre vraie n'importe quelle citation.

Un invariant qui tombe n'entre pas dans le verdict de la relation : une citation
introuvable est un défaut **en soi**, qu'une relation qui tient ne rachète pas.

---

## 6. Le corpus

Deux documents, écrits de bout en bout. **Aucune matière de chantier n'entre
dans le dépôt** : ni nom de personne, ni entreprise, ni commune, ni référence
d'affaire. VERIFAS, NOVACLIM, BERTRAND, GLOBALIS et Montholon (89110) n'existent
pas. Ce n'est pas une précaution de confort : un corpus de mesure se lit, se
copie, se cite dans un rapport ; un document réel qui y entre en sort.

Un corpus de documents faciles mesure une lecture facile. Ceux-ci portent donc ce
qui casse : une marque « SO » qui ne veut rien dire hors de sa légende, une
observation qui dit explicitement qu'une absence ne vaut pas avis favorable, des
dates au format court, des tableaux assez longs pour qu'une coupure tombe en leur
milieu.

Chaque document déclare sa famille en tête — `<!-- famille: rapports -->`. Un
fichier sans elle **fait lever** la lecture du corpus : un corpus qui rétrécit en
silence rend un bilan sur moins de documents qu'on ne croit.

---

## 7. Comment on la lance

```bash
# L'auto-épreuve : la batterie se mesure elle-même. Aucune de vos analyses.
node scripts/la-batterie-des-perturbations.mjs

# La vraie lecture. Deux lectures par épreuve, trois appels par lecture.
SUPABASE_URL=… SUPABASE_JETON=… MDALL_PROJET=… \
  node scripts/la-batterie-des-perturbations.mjs --serveur
```

**L'auto-épreuve est le passage par défaut**, et elle répond à la question qui
vient avant toutes les autres : *cet instrument mesure-t-il quelque chose ?* Elle
passe la batterie sur les deux lecteurs de carton, et sort en échec si le lecteur
fidèle tombe **ou** si celui qui devine n'est pas attrapé :

```
═══ 9 tiennent, 0 tombent, sur 9 épreuves qui ont eu lieu ═══
    3 épreuves n'ont pas eu lieu : inapplicable 3

── le lecteur qui devine (on lui a fabriqué le défaut exprès)
 ✗ rict-03-verifas.md  une phrase niée   « A-07 » : le document dit maintenant « D »,
                                         la lecture dit toujours « F » — elle ne lit
                                         pas la ligne, elle la devine

═══ L'INSTRUMENT MESURE : le lecteur fidèle passe, celui qui devine est attrapé 1 fois ═══
```

L'écran dit en toutes lettres que ce passage ne mesure aucune analyse : **un
outil qu'on croit avoir lancé sur ses données alors qu'il tournait à vide est
pire qu'un outil absent**. Un identifiant manquant pour `--serveur` fait lever —
retomber en silence sur le carton rendrait un bilan vert qu'on prendrait pour le
sien.

La batterie sort en échec (`1`) dès qu'une relation tombe : ce qu'elle trouve
n'est pas une panne d'elle-même, et un enchaînement doit pouvoir s'en apercevoir.

**Ses propres épreuves tournent dans `npm test`** ; elle-même, non. Mesurer les
analyses coûte des appels, et l'intégration continue n'a pas à les payer à chaque
poussée.

---

## 8. Ce qui n'est pas fait

* **Le lecteur du serveur n'a jamais tourné pour de vrai.** Son câblage est
  éprouvé avec un appelant de carton — les trois fonctions demandent la bonne
  chose et traduisent la réponse comme la fonction de bord le fait — mais
  l'aller-retour HTTP demande une URL et un jeton que les épreuves n'ont pas. La
  première fois qu'il tournera sera la première fois.
* **Il recopie `lesAppelsDuServeur`** de `lire-les-rapports/index.ts`, parce que
  l'original est du TypeScript Deno que Node ne charge pas. Une épreuve confronte
  les deux copies sur les noms de fonctions et de champs — c'est le cas exact où
  lire la source comme du texte se justifie, puisque la divergence serait
  invisible autrement.
* **Seuls les rapports de contrôle passent par la vraie lecture.** Les comptes
  rendus et les fils de mails ont leur propre orchestrateur ; le lecteur du
  serveur les refuse plutôt que de rendre un résultat faux.
* **Les mails ne se projettent pas du tout.** `lempreinteDuneLecture` lève sur
  leur famille, et c'est voulu : une batterie qui ignore poliment ce qu'elle ne
  sait pas faire rend du vert sur un corpus qu'elle n'a pas lu.
* **Trois des douze épreuves du corpus n'ont pas lieu** — le compte rendu n'a ni
  légende, ni verdict qui s'oppose, ni deux paragraphes de prose voisins. C'est
  une mesure de couverture, et elle s'affiche.
* **Rien n'est gelé, rien n'est suivi dans le temps.** La batterie dit l'état du
  jour. La dérive contre les `analyse_gelee` — point 3 du document de stratégie —
  reste à faire, et c'est elle qui permettra de toucher à une consigne sans peur.
