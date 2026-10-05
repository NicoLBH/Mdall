# La dérive des analyses

> **Ce qui a changé entre deux lectures du même document.**
>
> Point 3 de `la-ligne-du-temps-et-la-justesse.md` : « relire les mêmes documents
> avec la consigne du jour et comparer au gelé ». Il s'est avéré qu'il n'y avait
> rien à relire — c'était déjà écrit.

---

## 1. Elle ne coûte rien, et c'est la migration qui l'avait prévu

> « Une ligne par lecture, jamais mise à jour. Une lecture qui a eu lieu ne
> devient pas fausse (règle 6). Relire le même rapport est une seconde lecture,
> avec sa propre ligne — **et c'est précisément ce qu'on veut comparer quand on
> ajuste une consigne**. »
>
> — `202611210001_une_lecture_de_rapport_se_garde.sql`

La suite des lectures d'un document est donc **déjà écrite**. La dérive se lit,
elle ne se fabrique pas : pas un appel au modèle, pas une facture. C'est ce qui
permet de la regarder souvent — et un indicateur qu'on ne regarde pas ne sert à
rien.

Relire tout un corpus pour mesurer ce que la base porte déjà aurait été le plus
cher moyen de ne rien apprendre de plus.

### Pour ajouter un point à la série

On relit le document **depuis l'Atelier**, avec le bouton du produit. Ce n'est
pas un manque de cet outil : une relecture lancée par un script de mesure serait
une lecture que rien ne trace — ni file, ni journal, ni coût visible dans
Actions — et **la trace est précisément ce qu'on mesure ici**.

---

## 2. La distinction qui fait tout : dérive ou instabilité

`lu_par` porte « le modèle, et la version du procédé ». Le même écart ne dit donc
pas la même chose selon qu'il a changé ou non.

| `lu_par` | le relevé | ce que c'est | ce que ça appelle |
| --- | --- | --- | --- |
| a changé | a changé | **une dérive** | regarder : est-ce ce que vous vouliez ? |
| le même | a changé | **une instabilité** | un défaut : le procédé ne se répète pas |
| l'un des deux ne dit rien | a changé | **on ne tranche pas** | remplir `lu_par` |
| n'importe | identique | **stable** | rien |

C'est la seule chose que cet outil apporte qu'un `diff` n'apporterait pas. Les
confondre ferait prendre un réglage voulu pour une panne — ou, bien pire, une
panne pour un réglage.

### Pourquoi « on ne tranche pas » est un verdict

`lu_par` a une valeur par défaut vide, et les lectures écrites avant qu'on la
remplisse la portent. Ranger ces passages en « instable » accuserait le procédé
d'une faute qu'on ne peut pas lui imputer ; les ranger en « dérive » le
dédouanerait tout aussi gratuitement. On dit ce qu'on voit, et pas plus
(règle 5).

Seule l'**instabilité** fait sortir la commande en échec. Une dérive est
attendue : on a touché à la consigne, et l'on vient voir ce que ça change.

---

## 3. Ce qu'elle ne dit pas

**Si c'est mieux.** Deux lectures peuvent différer et la seconde être meilleure ;
elles peuvent différer et la seconde être pire. Rien ici ne le dit, et rien ici
ne doit prétendre le dire : il faudrait savoir quelle est la bonne réponse, et
c'est le jeu de référence — point 4 du document de stratégie, le plus coûteux et
le seul qui mesure la justesse.

L'outil dit **ce qui a bougé, nommément**. C'est vous qui savez ce que vous aviez
voulu, et un changement qu'on n'a pas voulu est une régression.

---

## 4. Ce qui est comparé

La même empreinte que la batterie de perturbations, et c'est voulu : les deux
outils posent la même question de deux façons, et l'écrire deux fois aurait donné
deux réponses différentes à la même question selon l'outil qui la pose
(règle 10). Le socle commun vit dans `scripts/la-mesure-des-analyses/` :

| | |
| --- | --- |
| `lempreinte-dune-lecture.js` | ce qui ne varie pas, et ce qui a le droit de varier |
| `ce-qui-separe.js` | l'écart, **dit en mots** — « A-23 a disparu », jamais `false` |
| `les-invariants.js` | ce qui doit tenir sur une lecture seule |
| `un-lecteur-du-serveur.js` | la vraie lecture, pour la batterie |

### Rapprocher deux lectures du même document

L'identifiant de Fichiers d'abord, parce que c'est le seul qui ne mente jamais.
À défaut — un document déposé à la main, jamais rangé — le repère que le document
déclare **et** sa date : deux rapports du même numéro à la même date sont le même
rapport.

Et rien du tout quand il n'y a ni l'un ni l'autre. **On ne devine pas sur le nom
de fichier** : « RICT-03.pdf » et « RICT-03 (1).pdf » peuvent être deux documents
différents, et les confondre fabriquerait une dérive entre deux rapports qui
n'ont rien à voir — c'est-à-dire une alerte sur une panne qui n'existe pas.

---

## 5. Les invariants, posés au passage

Le Markdown est gelé avec l'analyse. Les deux invariants — **toute citation se
retrouve dans le document d'où elle sort**, **toute marque est déclarée dans la
légende** — se posent donc sur chaque lecture conservée, sans un appel.

C'est le point 1 du document de stratégie, livré pour de vrai : les invariants
tournent maintenant sur tout ce qui est en base, et leur compte s'affiche.

**Contre le Markdown gelé avec elle**, et non contre le document d'aujourd'hui :
c'est ce texte-là que cette lecture a lu, et le fichier a pu être remplacé depuis.

Un invariant qui tombe ne dit rien de la dérive, et réciproquement : **une lecture
peut être parfaitement stable et citer des phrases qui ne figurent pas dans le
document**. Deux questions, deux réponses, et les mêler ferait rater celle qui
compte.

---

## 6. Ce qui n'a pas été mesuré se dit aussi fort

Un chantier dont presque tous les documents n'ont été lus qu'une fois n'a pas une
dérive nulle : il a une **dérive qu'on n'a pas mesurée**, et c'est tout autre
chose. Le bilan compte donc à part :

```
═══ 0 stable, 1 dérive, 1 instabilité ═══
    0 document lu une seule fois — rien à comparer · 1 passage dont on ignore le procédé
```

* **les documents lus une seule fois** — la part du corpus qui échappe encore ;
* **les lectures qu'on ne sait pas rapprocher** — ni identifiant, ni repère daté ;
* **les passages sans objet** — ni l'une ni l'autre ne relève quoi que ce soit.
  Deux empreintes vides sont identiques, et la stabilité qu'on en conclurait
  serait celle du silence ;
* **les passages dont on ignore le procédé**.

Une famille dont la table est injoignable laisse la sienne de côté **et le dit** :
perdre la vue d'ensemble parce qu'une table est muette serait un mauvais échange ;
la taire serait pire — on mesurerait deux familles en croyant en mesurer trois.

---

## 7. Comment on la lance

```bash
# L'auto-épreuve : une base de carton où trois défauts ont été fabriqués exprès.
node scripts/la-derive-des-analyses.mjs

# Vos lectures conservées. Aucun appel au modèle.
SUPABASE_URL=… SUPABASE_JETON=… MDALL_PROJET=… \
  node scripts/la-derive-des-analyses.mjs --serveur
```

L'auto-épreuve est le passage par défaut, comme pour la batterie de
perturbations, et pour la même raison : **cet instrument distingue-t-il encore ce
qu'il prétend distinguer ?** Elle fabrique une dérive, une instabilité et un
passage dont le procédé n'est pas dit, et exige que les trois soient nommés
chacun par son nom.

```
── RICT-03.pdf
 ~ 2026-04-20 → 2026-05-02  « modèle A · v1 » → « modèle B · v2 », 1 écart : « a 23 » est apparu
 ! 2026-05-02 → 2026-05-09  même procédé (« modèle B · v2 »), et 1 écart : « a 07 » : marque F → D

── CR_14.pdf
 ? 2026-05-02 → 2026-05-16  1 écart, et l'une des deux ne dit pas par quoi elle a été lue

═══ L'INSTRUMENT DISTINGUE : une dérive, une instabilité, et un procédé sur lequel
    il ne tranche pas ═══
```

Un identifiant manquant pour `--serveur` fait sortir en échec — retomber en
silence sur la base de carton rendrait un bilan qu'on prendrait pour le sien, et
un bilan de dérive se lit comme une bonne nouvelle.

**Ses épreuves tournent dans `npm test`** ; elle-même, non : elle a besoin d'une
base, et l'intégration continue n'en a pas.

---

## 8. Ce qui n'est pas fait

* **L'aller-retour HTTP n'a jamais tourné.** La composition de la demande et la
  traduction de la réponse sont éprouvées avec un demandeur de carton ; l'appel
  réel demande une URL et un jeton que les épreuves n'ont pas.
* **Les fils de mails ne sont pas mesurés.** `fil_lectures` garde aussi une
  analyse gelée, mais l'empreinte ne sait pas projeter leur famille : elle
  **lève** plutôt que de les sauter, et la dérive ne les demande donc pas.
* **Une seule page de résultats.** La demande est bornée à 500 lectures par
  famille et par chantier. Au-delà, la mesure porte sur les plus anciennes et ne
  le dit pas encore — c'est le prochain défaut à fermer.
* **Rien n'est gardé d'une exécution à l'autre.** La dérive dit l'état du jour ;
  savoir si l'instabilité augmente demanderait de ranger ces bilans quelque part,
  et ce n'est pas fait.
* **Aucun écran.** Elle se lance à la main, dans un terminal. Elle n'a pas sa
  place dans la console tant qu'on ne sait pas quoi y montrer en continu.
