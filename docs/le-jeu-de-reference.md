# Le jeu de référence

> **Le seul qui dise « juste ».**
>
> Point 4 de `la-ligne-du-temps-et-la-justesse.md`, et le plus coûteux.

---

## 1. Pourquoi il n'y a pas d'échappatoire

| Outil | Ce qu'il attrape | Ce qu'il ne peut pas dire |
| --- | --- | --- |
| Les invariants | ce qui ne **peut pas** être juste | si c'est juste |
| Les perturbations | une lecture qui **devine** | si ce qu'elle rend est juste |
| La dérive | ce qui a **changé** | si le changement est une amélioration |
| **Le jeu de référence** | **la justesse** | — |

Pour dire « ce constat est juste », il faut que quelqu'un ait écrit une fois ce
qu'était la bonne réponse. Les trois autres outils existent précisément pour
retarder ce moment aussi longtemps que possible, parce qu'il coûte cher. Il ne
s'évite pas.

**Et ce que cela demande est moins qu'il n'y paraît** : une cinquantaine de
documents bien choisis — *dont les cas difficiles, pas les faciles* — suffisent à
mesurer une précision et un rappel par étape. Un million de documents sans
réponse attendue ne mesure rien ; cinquante documents annotés mesurent beaucoup.

**Deux sont livrés**, les mêmes que le corpus des perturbations. C'est un
démarrage, pas un jeu de référence.

---

## 2. La faute qui viderait l'exercice de son sens

**Annoter en regardant ce que le modèle a rendu.** L'annotation certifierait
alors la lecture au lieu de la juger, et le jeu rendrait 100 % pour toujours —
en restant parfaitement vert le jour où tout se dégrade.

Chaque annotation déclare donc d'où elle vient, et le jeu **refuse** celle qui ne
le dit pas :

```json
"ecritePar": "du document, à la main, sans lire ce que le modèle rend"
```

Une déclaration qu'on peut oublier ne protège de rien : elle est exigée, pas
suggérée, et une annotation mal formée fait lever la lecture du jeu entier.

---

## 3. Les pièges, qui sont la moitié qu'on oublie

Ce que la lecture ne doit **pas** relever compte autant que ce qu'elle doit
relever. Tout relever donne un rappel parfait.

| Le piège | Pourquoi c'en est un |
| --- | --- |
| « l'accessibilité des locaux R-1 » | une observation générale, sans référence ni marque — et le document dit que cette absence ne vaut pas avis favorable, ce qu'une lecture pressée transforme en « F » |
| « RICT-02 » | une référence de **document**, citée en introduction, pas une référence d'avis |
| les quatre lignes de la légende | même forme qu'un relevé : une colonne courte, une qui l'explique |
| « la prochaine réunion fixée au 07/05 » | une ligne de « Divers », avec une date et un verbe au futur — la candidate idéale à un sixième point qui n'engage personne |

Chaque piège dit **pourquoi** c'en est un. Un piège sans raison est un piège
qu'on retirera au premier désaccord, faute de savoir pourquoi il était là.

---

## 4. Par étape, et jamais un score

« Qualité : 87 % » ne dit pas quoi réparer, et mélange une structure non reconnue
avec une marque fausse — qui n'appellent ni le même diagnostic ni la même
correction.

| Étape | Ce qu'elle mesure |
| --- | --- |
| structure | reconnue ou non, comme attendu |
| légende — **rappel** | combien des marques attendues ont été lues |
| légende — **précision** | combien de ce qu'elle a lu était attendu |
| relevés — **rappel** | ce qu'on a trouvé sur ce qu'il fallait trouver |
| relevés — **précision** | ce qui était juste sur ce qu'on a rendu |
| marques | justes, **sur les relevés trouvés seulement** |
| pièges | évités |

**Le rappel et la précision ne se résument pas l'un l'autre.** Tout relever donne
un rappel parfait ; ne rien relever donne une précision parfaite. Ils ne se
réduisent donc pas à un nombre, et ce module n'en propose aucun.

**La marque ne se juge que sur ce qui a été trouvé.** La compter fausse sur un
relevé manqué compterait deux fois le même défaut.

**Jamais un taux sans son assiette.** « 100 % » sur un relevé n'est pas « 100 % »
sur quatre cents, et `null` — « sans objet » — n'est pas `0 %`.

**Les parts s'additionnent sur leurs assiettes, et non entre elles.** La moyenne
de deux taux pèse autant un document de deux avis qu'un de quarante.

---

## 5. L'auto-épreuve

```bash
# Deux lecteurs de carton : l'un qui lit, l'autre qui devine.
node scripts/le-jeu-de-reference.mjs

# La vraie lecture. Un document annoté coûte trois appels.
SUPABASE_URL=… SUPABASE_JETON=… MDALL_PROJET=… \
  node scripts/le-jeu-de-reference.mjs --serveur
```

Le lecteur qui lit doit faire un **sans-faute sur chaque étape** ; celui qui
devine doit perdre **sur les marques, et là seulement** — il relève les mêmes
lignes, il se trompe sur le verdict :

```
── le lecteur qui lit              ── le lecteur qui devine
  structure reconnue   100 %         structure reconnue   100 %
  légende lue          100 %         légende lue          100 %
  relevés — rappel     100 %         relevés — rappel     100 %
  relevés — précision  100 %         relevés — précision  100 %
  marques justes       100 %         marques justes      11,1 % (1/9)  ←
  pièges évités        100 %         pièges évités        100 %
```

Un jeu de référence que personne n'a vu tomber certifie tout ce qu'on lui montre.

### Trois choses trouvées le premier jour

**L'auto-épreuve excluait l'étape qu'elle échouait.** Le sans-faute ne portait
que sur le rappel, la précision et les marques. Le lecteur fidèle faisait **4 sur
7** à la légende, et l'auto-épreuve passait quand même. Une épreuve qui exclut ce
qu'elle échoue ne garde rien. Le sans-faute porte maintenant sur **toutes** les
étapes.

**La légende n'était mesurée qu'en rappel.** La batterie de mutations l'a montré
sans équivoque : une lecture qui rendait une rubrique de plus gardait 100 %,
parce que rien ne regardait ce qu'elle rendait **en trop**. C'est la même leçon
que pour les relevés, et elle avait été oubliée une étape plus haut. La légende a
maintenant sa précision.

**Et le « 4 sur 7 » ne venait pas du lecteur — il venait de l'annotation.** C'est
la troisième trouvaille, et c'est la plus instructive des trois.

J'avais annoté les trois rubriques d'un compte rendu — « 02 — GROS ŒUVRE », etc.
— comme sa *légende*, et corrigé le lecteur pour qu'il les lise. Le jeu repassait
à 100 %. **C'est exactement la faute que cet outil existe pour empêcher** :
ajuster ce qu'on mesure jusqu'à ce que la mesure soit bonne.

L'erreur était dans l'annotation. Une **légende** est la table qui déclare le
sens des marques, et c'est sur elle que s'appuie l'invariant « toute marque
employée est déclarée ». Les rubriques d'un compte rendu ne déclarent rien de ses
états : ce sont deux classements sans rapport. Un compte rendu **ne déclare pas**
le sens de ses états, et c'est un fait du document, pas un manque de la lecture.

Ce qui l'a révélé n'est pas une relecture : c'est l'auto-épreuve de la **batterie
de perturbations**, qui s'est mise à compter six invariants tombés sur un corpus
qu'elle lisait parfaitement la veille. Deux outils de mesure qui se contredisent
disent qu'au moins un des deux a tort — et il faut aller voir lequel.

---

## 6. Ce qui n'est pas fait

* **Deux documents.** Il en faut une cinquantaine, et ce sont les cas difficiles
  qui manquent — un tableau coupé par une page, un avis dont le constat tient en
  deux phrases qui se contredisent si on les lit séparément, un rapport sans
  légende.
* **La vraie lecture n'a jamais tourné** : elle passe par le lecteur du serveur,
  dont l'aller-retour HTTP n'a pas d'identifiants dans les épreuves.
* **Seuls les rapports et les comptes rendus** s'annotent. Les fils de mails
  n'ont pas d'empreinte, et le jeu **refuse** d'annoter leur famille.
* **Aucune révision n'est tracée.** Quand on découvre qu'une annotation était
  fausse — ce qui arrive, et qui est une information en soi —, seul `git` le
  dit. Une colonne « révisée le, parce que » vaudrait mieux.
* **Aucun écran.** Voir `docs/ou-lire-les-mesures.md`.
