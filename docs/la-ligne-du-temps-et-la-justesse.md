# La ligne du temps, et la justesse des analyses

> Deux questions posées ensemble, et ce n'est pas un hasard : la seconde est la
> condition de la première. Un moteur qui remet les faits dans l'ordre ne vaut
> que ce que valent les faits qu'on lui donne.

Ce document répond. **Il ne construit rien** : il dit ce qui existe aujourd'hui,
exactement, et ce qu'il faudrait pour aller plus loin. Les décisions sont à
prendre avant d'écrire une ligne.

---

## 1. La chronologie — ce qui existe réellement

> « On a déjà, je crois, un petit moteur qui remet les rapports dans le bon
> ordre chronologique pour les rapports de BC. Qu'en est-il pour les CR
> chantier ? pour les mails ? »

Il y a **trois mécanismes**, et ils ne se connaissent pas.

### Les rapports de bureau de contrôle — `lesRapportsEnOrdre`

Dans `services/le-devenir-dun-avis.js`. Il trie les lectures conservées par
`etabli_le` — **la date d'émission du rapport, et non celle de la lecture** —, et
met à part celles qu'on n'a pas su dater plutôt que de les insérer au hasard.

C'est un vrai tri chronologique, et il sert à une seule chose : suivre un avis
d'un rapport au suivant (soulevé, redit, levé, rouvert). Il ne révise rien dans
la mémoire du chantier, et n'a donc aucune règle sur ce qu'un rapport ancien a le
droit de changer.

### Les comptes rendus — `la-chronologie-des-sources.js`

C'est de loin le plus abouti des trois, et c'est **la doctrine du produit sur
cette question**. Il a été écrit pour un défaut précis et grave : un compte rendu
qui ne parle plus d'un sujet le ferme ; déposez le n° 20 après le n° 57, et tous
les sujets nés entre les deux sont absents du n° 20 — non parce qu'ils sont
réglés, mais parce qu'ils n'existaient pas. **Le dépôt d'une archive suffisait à
vider un projet.**

Il tient quatre places — `EN_TETE`, `RETROSPECTIVE`, `SANS_DATE`, `SANS_REPERE` —
et surtout la distinction qui décide de tout :

| Ce que le document fait | Depuis le passé |
| --- | --- |
| Il ouvre un sujet | **oui** — un point qu'on ne suivait pas reste à suivre |
| Il dit « fait », avec sa date | **oui** — c'est un fait daté |
| Il n'en parle plus | **non** — c'est une déduction sur *maintenant*, et un document du passé ne sait rien de maintenant |

**Un fait daté traverse le temps ; une déduction, non.** C'est la bonne règle, et
elle est déjà écrite.

Mais elle n'est câblée qu'à `fermeture-du-cr.js` : elle répond à « ce compte rendu
a-t-il le droit de fermer par absence », et à rien d'autre.

### Les mails — rien, au-delà du fil

`le-fil-des-mails.js` ordonne les messages **à l'intérieur d'un fil** par leur
date, reconstitue l'arbre des réponses, et signale les trous. C'est du bon
travail, et c'est tout ce qu'il y a.

**Aucun mécanisme ne place un fil dans le temps du chantier.** Un fil lu ne se
compare à aucun autre ; ses prises de position n'ont aucune règle de révision, et
rien ne dit qu'un fil de mars arrivé après un fil de septembre est une
rétrospective.

### Le diagnostic

| | Ordre interne | Place dans le chantier | Règle de révision |
| --- | --- | --- | --- |
| Rapports BC | oui, par `etabli_le` | non | sans objet (ne révise rien) |
| Comptes rendus | oui | **oui** | **oui**, mais seulement pour la fermeture |
| Mails | oui, dans le fil | **non** | **non** |
| *Un capteur, demain* | — | — | — |

Trois familles, trois réponses différentes à la même question. C'est exactement
la situation que le registre des familles a résolue pour la **lecture** — et qui
n'a pas encore été résolue pour le **temps**.

---

## 2. Ce que je propose — une ligne du temps du chantier

### Le principe : l'unité n'est pas le document, c'est le fait daté

Un document n'a pas *une* date : il a la sienne, et il parle d'événements qui ont
chacun la leur. Un compte rendu du 12 mars peut dire « le ferraillage a été coulé
le 3 mars » et « la reprise est prévue semaine 11 ». Trois dates, trois natures.

Ordonner les **documents** suffisait pour décider d'une fermeture. Ordonner les
**faits** est ce qu'il faut pour chercher un enchaînement reproductible.

### La forme

```
un fait = {
  quand,     // la date de l'événement, pas celle du document
  dit,       // ce qui est affirmé
  dou,       // le document qui le rapporte, et sa propre date
  nature,    // constat | engagement | décision | mesure | …
  revise     // ce que ce fait a le droit de changer dans le présent
}
```

**`quand` et `dou.quand` sont deux choses**, et c'est tout l'intérêt : un fait du
3 mars rapporté le 12 mars entre dans l'histoire à sa place, et l'on sait aussi
quand on l'a appris. La seconde date explique pourquoi personne n'a réagi avant
le 12.

### Les trois règles qui tiennent

1. **L'ordre du dépôt reste la vérité de ce qu'on savait.** Il ne bouge jamais,
   il est journalisé, et c'est lui qui explique les décisions prises. La ligne du
   temps est une **seconde** lecture, et non une correction de la première.
2. **Un fait daté traverse, une déduction non.** La règle est déjà écrite dans
   `la-chronologie-des-sources.js` ; elle monte d'un étage et vaut pour toutes
   les familles.
3. **Ce qu'on ne sait pas dater se dit, et ne s'insère pas.** `SANS_DATE` existe
   déjà, et pour la bonne raison : une suite fausse est pire qu'une suite
   incomplète (règle 5).

### L'extensibilité, qui est votre vraie question

Un système de messagerie instantanée, des capteurs de chantier : ils n'ont pas à
changer le moteur. Ce qu'une famille déclare tient en deux fonctions :

- **d'où vient la date d'un document de cette nature** ;
- **quelle nature de fait elle produit** — et donc ce qu'il peut réviser.

Le registre `les-familles-de-document.js` est déjà ce point d'extension unique
pour la lecture. C'est là que ces deux déclarations doivent vivre, et nulle part
ailleurs (règle 10).

Un relevé de capteur est, de ce point de vue, le cas le plus simple : **un fait
daté sans aucune déduction**. Il ne ferme rien, ne contredit rien, il mesure. Un
fil de messagerie instantanée se comporte comme un fil de mails. Aucune des deux
ne demande un moteur de plus.

### Les deux pièges, dits avant de commencer

**Reconstituer l'ordre vrai fabrique des enchaînements que personne n'a vécus.**
Si le document A (mars) arrive après le document B (septembre), la ligne du temps
dira « A puis B » — et c'est juste. Mais personne, sur ce chantier, n'a réfléchi
dans cet ordre : les décisions de septembre ont été prises sans A. Une prédiction
entraînée sur la chronologie reconstituée apprend des enchaînements **logiques**,
pas des enchaînements **vécus**. Les deux sont utiles et ne répondent pas à la
même question ; il faudra choisir laquelle on cherche, et probablement garder les
deux lignes.

**L'ordre n'est pas la cause.** « A puis B, quatorze fois » ne dit pas que A
entraîne B. C'est la limite que la rubrique « Ce qui s'enchaîne » de la console
nomme déjà, et la ligne du temps la rendra plus tentante, pas moins.

---

## 3. La justesse des analyses — mesurer, et comment

> « Toute la valeur du moteur prédictif commence par des analyses les plus justes
> possibles ; mais comment vérifier que ce travail est bien fait ? comment le
> mesurer ? […] on pourrait s'inspirer des batteries de mutations ? »

### D'abord, une réponse franche sur les mutations

**Une batterie de mutations mesure les épreuves, pas les analyses.** Elle répond
à « mon épreuve verrait-elle le défaut si le code était faux » — une question sur
le filet, pas sur ce qu'on y attrape. Elle ne peut rien dire de « ce constat
est-il juste », parce que la réponse n'est pas dans le code : elle est dans le
document.

Transposée telle quelle, elle ne donnerait rien.

**Mais l'idée se transpose, et bien** — en déplaçant la mutation. Voir le point 4
ci-dessous : c'est, à mon sens, la meilleure chose à construire.

### Les quatre choses, de la moins chère à la plus chère

#### 1. Les invariants — gratuits, et ils tournent sur tout

Des propriétés qui doivent tenir sur **n'importe quel** document, sans connaître
la bonne réponse. Elles ne mesurent pas la justesse, elles attrapent les fautes
qui ne peuvent pas être justes :

- toute **citation** doit se retrouver mot pour mot dans la transcription — c'est
  déjà fait pour les avis (`avisEcartes`), et c'est le meilleur indicateur du
  produit ;
- toute **marque** employée doit être déclarée dans la légende (déjà mesuré) ;
- toute **date relevée** doit tomber dans la fenêtre du document ;
- un **relevé ne doit pas contredire sa propre négation** — « non conforme » déjà
  traité, et c'est la famille de défauts la plus dangereuse ;
- **idempotence** : relire le même document deux fois doit rendre la même
  structure. Deux lectures qui diffèrent disent un procédé instable, et le dire
  ne coûte qu'un second appel sur un échantillon.

C'est le meilleur rapport entre ce que ça coûte et ce que ça attrape, et une
partie existe déjà sans être agrégée nulle part.

#### 2. La dérive — presque gratuite, et vous l'avez déjà

Les analyses sont **gelées** en base (`analyse_gelee` dans `cr_lectures`,
`fil_lectures`, `rapport_lectures`). Relire les mêmes documents avec la consigne
du jour et **comparer au gelé** ne demande aucun oracle humain : cela ne mesure
pas la justesse, cela mesure le **changement**. Et un changement qu'on n'a pas
voulu est une régression.

C'est ce qui permet de toucher à une consigne sans avoir peur.

#### 3. Le jeu de référence — le seul qui mesure vraiment la justesse

Il n'y a pas d'échappatoire : pour dire « ce constat est juste », il faut que
quelqu'un ait écrit une fois ce qu'était la bonne réponse.

Ce que cela demande est **moins qu'il n'y paraît** : une **cinquantaine** de
documents bien choisis — dont les cas difficiles, pas les faciles — suffisent à
mesurer une précision et un rappel par étape. Pas un million : un million de
documents sans réponse attendue ne mesure rien du tout, et cinquante documents
annotés mesurent beaucoup.

Deux contraintes, et la première est la vôtre :

- **aucun contenu de chantier réel** n'entre dans le dépôt. Donc : des documents
  inventés qui portent les difficultés réelles, ou des documents réels
  anonymisés et gardés **hors du dépôt**, avec seulement les mesures publiées ;
- l'annotation se fait **une fois**, et se révise quand on découvre qu'on s'était
  trompé — ce qui arrive, et qui est une information en soi.

#### 4. La batterie de perturbations — votre idée, déplacée

**On ne mute pas le code, on mute le document.** Et l'on n'a pas besoin de savoir
la bonne réponse : on sait seulement quelle **relation** doit tenir entre la
lecture de l'original et celle du perturbé.

| Perturbation | Ce qui doit se passer |
| --- | --- |
| Changer le format d'une date (`12/03/26` → `12 mars 2026`) | **rien ne change** |
| Réordonner deux paragraphes indépendants | **rien ne change** |
| Dégrader la qualité du PDF | les constats restent, la fidélité baisse |
| Couper un tableau par un saut de page | **rien ne change** — c'est le défaut classique |
| Renommer une référence `A-12` → `B-77` partout | tout suit, à la référence près |
| **Nier une phrase** (« conforme » → « non conforme ») | **le constat s'inverse** — et s'il ne bouge pas, la lecture ne lisait pas |
| Retirer la légende | les marques cessent de se résoudre, et cela se dit |

Les deux dernières lignes sont les plus précieuses : elles attrapent une lecture
qui **devine** au lieu de lire. Une analyse qui rend la même chose sur un
document et sur sa négation ne lit rien — c'est le survivant d'une batterie de
mutations, exactement au sens où vous l'entendez.

C'est, à mon avis, **ce qu'il faut construire en premier après les invariants** :
pas d'oracle à écrire, un coût d'appel maîtrisé (deux lectures par perturbation,
sur un échantillon), et chaque survivant est un défaut réel.

### Ce que je ne recommande pas

- **Faire juger le modèle par un modèle.** Un correcteur qui partage les biais de
  celui qu'il corrige donne un bon chiffre et aucune information. Au mieux, il
  sert à **trier** ce qu'un humain ira regarder — jamais à mesurer.
- **Un score unique.** « Qualité : 87 % » ne dit pas quoi réparer. Une mesure par
  étape — structure reconnue, transcription fidèle, avis relevés, marques
  résolues — dit où ça casse, et c'est ce qu'on veut savoir.

---

## 4. Ce que je ferais, dans cet ordre

1. **Les invariants, agrégés** — ils existent par morceaux ; les réunir et les
   afficher par étape coûte peu et donne la première courbe honnête.
2. **La batterie de perturbations** — pas d'oracle, et chaque survivant est réel.
3. **La dérive contre les analyses gelées** — pour pouvoir toucher aux consignes.
4. **Le jeu de référence** — le plus coûteux, et le seul qui dise « juste ».
5. **La ligne du temps**, une fois qu'on sait que les faits qu'on y range valent
   quelque chose. L'inverse — ordonner d'abord des faits dont on ne connaît pas la
   qualité — donnerait une belle chronologie de données fausses.

---

## 5. Où l'on en est

| | État |
| --- | --- |
| 1. Les invariants, agrégés | **faits** — deux posés, et ils tournent sur tout ce qui est en base |
| 2. La batterie de perturbations | **faite**, six perturbations · `docs/la-batterie-des-perturbations.md` |
| 3. La dérive contre les analyses gelées | **faite** · `docs/la-derive-des-analyses.md` |
| 4. Le jeu de référence | pas commencé |
| 5. La ligne du temps | pas commencé |

Le point 2 a été écrit en premier, avant le point 1, et c'était le bon ordre : les
invariants n'avaient nulle part où s'afficher tant qu'aucun outil ne lisait un
corpus. Ils sont donc posés **dans** la batterie, qui les pose sur les deux
lectures qu'elle paie déjà — deux pour l'instant, la citation retrouvée et la
marque déclarée.

**Elle attrape ce qu'elle promettait d'attraper.** Ses propres épreuves lui
donnent deux lecteurs : l'un lit la colonne du verdict, l'autre rend toujours la
même marque sans la regarder. Sur cinq perturbations, les deux sont
indiscernables ; sur « une phrase niée », le second tombe. C'est ce qui en fait un
instrument de mesure et non une décoration — on l'a vu tomber, exprès, sur un
défaut fabriqué.

Ce qui reste est dit au bout de son document : le lecteur du serveur n'a jamais
tourné pour de vrai, seuls les rapports de contrôle y passent, et rien n'est
encore suivi dans le temps.

### La dérive, et ce qu'elle a révélé en chemin

Le point 3 annonçait « relire les mêmes documents avec la consigne du jour et
comparer au gelé ». Il s'est avéré qu'**il n'y avait rien à relire** : la
migration des lectures conservées écrit une ligne par lecture, jamais mise à
jour, et son propre commentaire disait déjà pourquoi — « relire le même rapport
est une seconde lecture, avec sa propre ligne, et c'est précisément ce qu'on veut
comparer quand on ajuste une consigne ».

La dérive se **lit** donc dans ce qui est en base, sans un appel au modèle. Ce
qui change tout : un indicateur gratuit se regarde souvent, et un indicateur
qu'on ne regarde pas ne sert à rien.

Elle a aussi fait apparaître une distinction que le point 3 n'avait pas vue.
`lu_par` porte le modèle **et la version du procédé**, et le même écart ne dit
donc pas la même chose selon qu'il a changé :

* procédé changé, relevé changé → une **dérive**, attendue : reste à la vouloir ;
* **même procédé**, relevé changé → une **instabilité**, qui est un défaut en soi.
  Rien ne se conclut d'une mesure qui ne se répète pas ;
* procédé non dit → l'outil **ne tranche pas**, plutôt que d'accuser sans preuve.

Et les invariants du point 1 sont venus avec, sans rien coûter : le Markdown est
gelé avec l'analyse, ils se posent donc sur chaque lecture conservée. Le point 1
était à écrire en premier sur le papier ; il s'est trouvé livré en troisième,
parce qu'il n'avait nulle part où s'afficher avant qu'un outil lise un corpus.
