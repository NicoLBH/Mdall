# Lire un compte rendu de chantier

**À quoi sert cette page :** la chaîne complète, du PDF déposé aux sujets tenus à jour. Ce
qui est fait, ce qui vient, dans quel ordre et pourquoi celui-là.

---

## Le procédé, en trois appels

```
PDF  ──►  1. TRANSCRIPTION            gpt-4.1        ~9 c.
          fidèle, structurée, rangée dans Fichiers
             │
             ▼
          .md  ──►  2. SECRÉTARIAT    gpt-4.1-mini   ~2 c.
                    sujets, lots, labels, objectifs, fermetures
                       │
                       ▼
                    3. RAISONNEMENT   modèle cher    ~5 c.
                    hiérarchie et liens entre sujets
                       │
                       ▼
                    UNE PROPOSITION  ──►  la mémoire du projet
```

**Trois appels, et non un seul, pour trois raisons.**

Le premier transcrit ; il ne juge rien, et c'est pourquoi il peut être vérifié mot pour mot
contre le PDF. Le deuxième fait du secrétariat sur un document propre ; il n'a pas besoin
d'un modèle cher, et son travail se relit ligne à ligne. Le troisième raisonne sur des
relations, ce qui demande davantage — et n'est appelé que si le deuxième a produit de quoi
raisonner.

Séparer permet aussi de **payer chaque chose à son prix**, et de changer un maillon sans
toucher aux autres.

## Ce qui ne change pas

**Rien n'entre directement dans la mémoire.** Chaque appel produit des *propositions* :
sujets à ouvrir, à compléter, à fermer, lots à ajouter, labels à créer, objectifs à poser,
liens à établir. Quelqu'un tranche, ligne par ligne (règle 1).

**Ce que l'IA produit s'affiche avant d'être exploité**, et son coût se voit à la requête
près (fondamental 13).

---

## Le socle existe déjà

Presque rien à créer côté base. Il s'agit d'alimenter ce qui est là :

| Ce qu'il faut | Où c'est |
| --- | --- |
| Labels | `project_labels`, `subject_labels` |
| Hiérarchie père/fils | `subjects.parent_subject_id`, `reorder_subject_children` |
| Liens fonctionnels | `subject_links`, `link_type = 'blocked_by'` |
| Objectifs et échéances | `objectives`, `milestones.due_date` |
| Lots du projet | `project_lots` |
| Situation par filtre | `situations.filter_definition` |
| Dossiers de fichiers | `project_document_folders` |

---

## Les étapes, dans l'ordre

### Étape 1 — La transcription monte en gamme *(faite)*

`gpt-4.1` au lieu de `gpt-4.1-mini` pour le premier appel, et trois règles de plus :

- **un tableau reste un tableau** — en particulier celui des contacts du projet, qui est le
  seul endroit où les coordonnées d'un intervenant sont réunies ;
- **la mise en page peut être clarifiée, les mots non** : le modèle peut ajouter des titres
  Markdown, des listes, des niveaux d'imbrication pour rendre visible une structure que le
  document porte implicitement — il ne peut pas ajouter un mot, ni changer l'ordre ;
- **faire émerger la structure implicite** : une remarque datée et ses mises à jour des
  semaines suivantes forment un fil ; le document les écrit à la suite, la restitution les
  imbrique.

Ce dernier point est le plus important pour la suite. Un compte rendu de chantier n'est pas
une liste de phrases, c'est une **arborescence implicite** : lot → entreprise → remarque →
mises à jour successives. Plus elle est explicite dans le `.md`, moins les appels suivants
ont à deviner.

**Ce que ça coûte :** environ neuf centimes au lieu de deux, pour onze pages. Le tarif est
relevé, la pastille l'affiche.

**Ce qui le vérifie :** les cinq mesures déjà en place — mots retrouvés, mots ajoutés, titres
inventés, phrases découpées, blocs déplacés. La règle « la mise en page peut changer » ouvre
une porte ; les mesures disent si le modèle en profite pour ajouter du texte.

### Étape 2 — Le `.md` se range dans Fichiers

Un dossier portant le nom du PDF, contenant le PDF et le `.md`.

**Ce que ça débloque, et c'est plus que du rangement :**

- la restitution devient **durable** : redéposer le même document ne la refait plus, donc ne
  la repaie plus ;
- elle devient **relisable** par un humain, dans l'onglet Fichiers, avec le PDF à côté ;
- les appels suivants lisent **un fichier**, pas une variable d'écran — ce qui les rend
  rejouables sans le PDF.

Aucune migration : `project_document_folders` existe.

### Étape 3 — Le secrétariat, sur le `.md` seul

Deuxième appel, `gpt-4.1-mini`, nourri du `.md` et de **ce que le projet sait déjà** : ses
sujets ouverts portant le label « CR chantier », ses lots, ses labels, ses intervenants.

Il propose :

| | |
| --- | --- |
| **Sujets** | à ouvrir, à compléter d'une activité de relance, à fermer |
| **Lots** | ceux du compte rendu qui manquent au projet |
| **Labels** | « CR chantier » au minimum ; « Urgent », « Rappel », « Information générale » quand le document le dit — et il les crée s'ils n'existent pas |
| **Objectifs** | quand une échéance est indiquée : un objectif nommé, daté, rattaché au sujet |
| **Assignations** | l'entreprise ou la personne à qui le point revient |

Cette étape est **trop grosse pour un seul palier**. Elle se fait dans cet ordre, chacun
livrable et vérifiable seul : les sujets et le label « CR chantier » ; puis les lots ; puis
les labels de qualification ; puis les objectifs.

### Étape 4 — Fermer un sujet, et la question de fond

**C'est le point le plus délicat de tout le plan**, et il mérite d'être traité à part.

Comment sait-on qu'un point est réglé ? Trois signes, et ils ne se valent pas :

| Signe | Ce qu'il vaut |
| --- | --- |
| Le point porte « fait », « soldé », « levé » | **une réponse** — le document le dit |
| Le point est barré | **une réponse**, si la mise en forme a survécu à la transcription |
| Le point a disparu du compte rendu | **une question, pas une réponse** |

La disparition est traître. Un point peut sortir d'un compte rendu parce qu'il est réglé,
parce que le rédacteur l'a oublié, parce que le lot n'était pas convoqué cette semaine, ou
parce que le document a changé de trame. **Fermer sur ce seul signe perdrait des points
qu'on suit depuis des mois.**

La règle sera donc : une disparition ne ferme rien, elle **pose une question**. Elle
s'affiche comme telle dans la proposition — « ce sujet n'apparaît plus depuis deux comptes
rendus, est-il réglé ? » — et c'est quelqu'un qui répond. Les deux autres signes proposent
une fermeture, avec la phrase qui la justifie.

### Étape 5 — Les liens entre sujets

Troisième appel, sur un modèle plus capable, et **seulement s'il y a de quoi raisonner**.

- **La hiérarchie** : un compte rendu groupe ses points par lot et par entreprise. « Lot 10 —
  Charpente — LP CHARPENTE » est un sujet père, les points de ce lot sont ses fils.
- **Les liens fonctionnels** : « bloqué par », quand le document l'énonce — « en attente de
  la dépose de la dalle » .

Un appel à part, parce que raisonner sur des relations demande davantage que du secrétariat,
et qu'on ne veut pas payer ce prix-là sur tout le document.

### Étape 6 — La situation qui se crée toute seule

Dès qu'au moins deux sujets ouverts portent le label « CR chantier », une situation se crée,
fondée sur le filtre `label = CR chantier`.

C'est le premier endroit où la chaîne **rend quelque chose à l'humain sans qu'il l'ait
demandé** : un tableau de suivi apparaît, tenu à jour par les dépôts suivants.

### Étape 7 — L'écran des sujets, pour s'y retrouver

Rien de ce qui précède ne sert si le tableau des sujets ne sait pas filtrer.

- des filtres dans le tableau : assigné à, labels, lot, objectif ;
- un rail latéral avec les filtres les plus courants ;
- des recherches qu'on épingle — **le même bouton et la même logique d'affichage que
  l'onglet Mémoire**, qui les a déjà.

### Étape 8 — La proposition dit ce qui change vraiment

Une proposition qui liste trente sujets ne se relit pas. Elle doit dire **ce qui bouge** :
tant de sujets ouverts, tant fermés, tant de labels posés, un lot ajouté, deux objectifs
datés — et le détail derrière.

C'est la dernière étape parce qu'elle a besoin de connaître toutes les natures de changement
que les étapes précédentes produisent.

---

## Ce que cet ordre refuse

**De commencer par l'écran.** Les filtres et le rail latéral sont ce qu'on voit, donc ce
qu'on a envie de faire d'abord. Mais filtrer sur des labels qui n'existent pas ne sert à
rien.

**De tout mettre dans un seul appel.** Un appel qui transcrirait, classerait et raisonnerait
d'un coup coûterait le prix du plus cher des trois sur la totalité du document, et son
résultat serait invérifiable : on ne saurait plus si une erreur vient de la lecture ou du
jugement.

**De fermer un sujet automatiquement.** Voir l'étape 4.

---

## Ce qui reste ouvert

**La fiabilité de la structure implicite.** L'étape 1 demande au modèle de rendre explicite
ce que le document sous-entend. C'est un jugement, pas une transcription — et les mesures
actuelles ne le vérifient pas. Il faudra sans doute une mesure de plus : le nombre de niveaux
d'imbrication, comparé d'une version à l'autre.

**Le second fournisseur.** Trois appels, un seul fournisseur : voir
[`a-traiter-plus-tard.md`](a-traiter-plus-tard.md).

**Les modèles à venir.** Chaque étape se rejouera avec les mêmes documents et les mêmes
chiffres. Voir [`reconstituer-un-document.md`](reconstituer-un-document.md) §5.
