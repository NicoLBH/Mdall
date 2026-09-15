# L'objet de la connaissance

**À quoi sert cette page :** Mdall a deux moitiés qui ne se parlent pas. D'un
côté des calculs — altitude, zone climatique, cote hors gel, assise minimale —
avec leurs règles, leurs dépendances et leurs conclusions. De l'autre des
sujets : un problème, une discussion, une fermeture. Entre les deux, rien.

Le réflexe serait de construire un pont. Cette page dit pourquoi ce serait la
mauvaise réponse, et quelle est la bonne : **il manque un objet auquel les deux
côtés se rattachent**, et sans lui un pont ne relie rien.

Elle dit ce qui existe — et il en existe beaucoup plus qu'on ne croyait —, les
quatre trous qui restent, l'ordre dans lequel les combler, et surtout ce qu'on
ne fera jamais.

Elle a été écrite en vérifiant le code, pas de mémoire.

---

## Le constat

Les deux moitiés ne sont pas séparées par une technique. Elles le sont par **ce
qu'elles font d'une raison**.

Du côté du calcul, la raison est de première classe : une valeur porte sa règle,
ses entrées, ses lectures enregistrées, sa citation. Elle se remonte, elle se
rejoue, elle se fait varier.

Du côté des sujets, la raison est du texte. `rationale`, `closure_reason`, un fil
de commentaires. Lisible une fois par un humain, lue ensuite par personne. Rien
ne s'y appuie, rien ne tombe quand elle change.

C'est d'autant plus gênant que **c'est là que vit ce qui a le plus de valeur**.
Un projet ne se rend unique ni par ses calculs ni par ses valeurs — n'importe
quel projet en Haute-Savoie trouvera la même zone de neige. Il se rend unique par
ce que des gens ont engagé dessus, et par ce qu'ils ont écarté en le faisant.

### Le bon modèle mental

Le projet ne fonctionne pas comme deux domaines indépendants :

```
                         PROJET
                            │
                 ┌──────────┴──────────┐
                 │                     │
          CE QUI EST TENU         CE QUI EST
             POUR VRAI            EN DISCUSSION
                 │                     │
            affirmations             points
                 │                     │
                 └──────────┬──────────┘
                            │
                     TRANSFORMATIONS
                            │
                  ┌─────────┴─────────┐
                  │                   │
               calcul              décision
                  │                   │
                  └─────────┬─────────┘
                            ↓
                   nouvelle affirmation
```

**Un calcul et une discussion sont deux manières de produire, de modifier ou de
contester une connaissance du projet.** Ce ne sont pas deux domaines : ce sont
deux mécanismes agissant sur la même matière.

---

## L'état des lieux, vérifié

### Ce qui existe déjà, et qu'on ne refera pas

| ce qui existe | où | ce que ça donne |
| --- | --- | --- |
| l'objet de connaissance, **versionné** | `assertions`, chaîne `supersedes` / `superseded_by` | une valeur a une histoire, et ce qui l'a remplacée est identifiable |
| la **nature** d'une affirmation, et son discriminant | `services/assertion-taxonomy.js` — `NATURE` × `SETTLED_BY` | non pas « d'où ça vient » mais **« qu'est-ce qui la trancherait ? »** : un tiers, une mesure, une observation, le projet, un arbitrage |
| la provenance par **calcul** | `payload.regle`, et les lectures de chaque conclusion (`services/memoire-applications.js`) | on sait quelle valeur chaque règle a lue, et on peut remonter |
| la provenance par **décision** | `NATURE.DECISION`, écrite par `services/decision-versement.js` | une ligne à part, avec la **question**, les **possibles écartés** et le motif ; la valeur la cite |
| le **graphe aval** | `assertion_dependencies`, `services/memoire-variante.js` | on sait déjà dire ce qu'un changement atteint, de proche en proche |
| l'**engagement** sur une version | `assertion_acts`, `services/couverture.js`, `services/ce-qui-couvre.js` | couvre / à reporter / ne couvre plus — accroché à une version, jamais à un nom |
| **fermer un sujet prépare une décision** | `views/project-subjects/project-subjects-actions.js`, `proposerLaDecisionDuSujet` | le sujet devient une proposition portant question, écartés, motif, auteur, date |

C'est beaucoup. **La provenance polymorphe existe déjà**, et elle est écrite en
données plutôt qu'en commentaire — `SETTLED_BY` est une définition qu'on peut
interroger, ce qui est la seule façon qu'elle reste appliquée.

### Ce qui manque, et c'est peu

**1. L'arête amont n'existe pas.** Rien, nulle part, ne dit sur quelle
affirmation un point **porte**. Vérifié : aucun `assertion_id` n'approche la
table `subjects`.

**2. `NATURE.RAISONNEMENT` est déclarée et vide.** Personne ne l'écrit. Et sa
définition dans le code est exactement l'objet qui manque : *« rien ne le
tranche : il ne dit pas ce qui est vrai, il dit par où l'on y est arrivé — et
par quelles décisions on est passé. »*

**3. Le retour ne se remonte pas.** `proposerLaDecisionDuSujet` écrit bien
`reference: "sujet:<id>"` dans la charge. Cette chaîne n'est lue nulle part. On
va du point vers la mémoire ; on ne revient jamais.

**4. Un point ne peut pas naître d'une valeur.** `subjects.document_id` et
`subjects.analysis_run_id` sont `not null`, et la fonction qui crée les sujets
refuse explicitement une observation sans document. **Dans le schéma, un point
est l'enfant d'un document analysé, pas du projet.** C'est le premier obstacle,
et il est physique.

---

## Six décisions, et pourquoi

### 1. Une seule chose est l'objet de la connaissance : l'affirmation

Tout le reste — un document, un calcul, un point, une décision — est une
**manière de la produire ou de la contester**. Ce n'est pas une refonte : c'est
admettre que le point n'est pas un silo parallèle mais un producteur, au même
titre qu'une règle.

Créer un second objet « connaissance » à côté de l'affirmation ferait deux
vérités du même fait, et c'est celle qu'on ne regarde pas qui finirait par avoir
raison (règle 4).

### 2. Un point n'est pas la mémoire du projet, c'est la mémoire de sa résolution

La distinction n'est pas de vocabulaire. La mémoire du projet garde ce que le
projet tient pour vrai ; le point garde **comment on y est arrivé** — la
question, les objections, ce qu'on a examiné, ce qu'on a écarté.

```
                    MÉMOIRE DU PROJET
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       sources         affirmations     raisonnements
          │                │                │
      documents         valeurs         règles, lectures
      comptes rendus    décisions       dépendances
          │                │
          └────── points ──┘
                    │
          discussions, objections, décisions
```

Les points ne sont pas une mémoire parallèle aux calculs : ils sont l'un des
mécanismes par lesquels la mémoire évolue.

### 3. Deux arêtes, et surtout ne pas les confondre

| l'arête | ce qu'elle dit | ce qu'elle donne |
| --- | --- | --- |
| **porte sur** (amont) | ce point met en question cette affirmation-ci | quand une valeur bouge, on sait quels débats ouverts portaient dessus — et une valeur en débat cesse de se présenter comme acquise |
| **décidé dans** (aval) | cette affirmation vient de ce point-là | la chaîne du raisonnement remonte jusqu'à une conversation datée, avec des noms dedans |

Un seul champ pour les deux ferait couvrir une valeur par le débat qui la
conteste.

Comme pour l'avis de bureau de contrôle, **l'arête porte sur une version, jamais
sur un nom**. C'est ce qui rend la péremption gratuite : la chaîne des
remplacements *est* le mécanisme, et il n'y a rien à écrire pour elle.

### 4. Une décision ne remplace pas une conclusion — ou alors elle le dit

C'est la décision la plus importante de cette page, et celle qu'on peut rater
sans s'en apercevoir.

Soit un calcul qui rend `hors gel = 0,80 m`, et quelqu'un qui tranche « on
retient 0,60 ». Écrire la décision par-dessus la conclusion casse la règle 2 —
*ce qui est dérivé se recalcule, ce qui a été décidé se conserve* — et les deux
issues sont mauvaises :

- le prochain recalcul écrase la décision : l'humain perd, **en silence** ;
- le recalcul est supprimé : la règle ment, **en silence**. Le moteur continue
  d'« expliquer » 0,60 par un raisonnement qui produit 0,80.

Deux formes honnêtes, et une seule est fréquente :

**La décision porte sur une entrée.** « On retient 742,30 » : l'altitude change,
le hors gel se recalcule tout seul, la chaîne reste entière. Rien à inventer, et
c'est la grande majorité des cas.

**La décision porte sur la conclusion elle-même.** « On retient 0,60 malgré la
règle. » La valeur **cesse d'être dérivée** et le dit : elle change de nature,
elle devient une décision, et **la valeur calculée reste affichée à côté d'elle
avec l'écart**. Le projet porte alors visiblement une valeur qui contredit sa
propre règle — ce qui est la vérité, et ce qu'on veut voir en réunion.

Ce cas doit être visible et un peu coûteux, jamais fluide. Ce que Mdall ne fera
jamais, c'est laisser une décision prendre la place d'une conclusion **sans dire
qu'elle l'a fait**.

### 5. Trois niveaux, et la frontière du mutualisable est entre le deuxième et le troisième

| niveau | exemple | ce que c'est dans Mdall | où ça vit |
| --- | --- | --- | --- |
| **1 — information** | « L'architecte indique +742,30. » | `DONNEE_BASE` ou `CONSTAT`, selon ce qui la trancherait | la mémoire du projet |
| **2 — décision contextualisée** | « Après vérification avec l'architecte et le géomètre, nous retenons +742,30. » | `DECISION`, avec ses écartés | la mémoire du projet |
| **3 — connaissance généralisable** | « Dans cette configuration, lorsque X et Y sont vrais, retenir Z. » | **ce n'est plus une affirmation** : c'est une règle `.ref` | le langage |

**La décision appartient au projet. La règle peut appartenir à Mdall.**

Cette frontière est exactement celle du privé et du partageable, et c'est ce qui
rend la mutualisation défendable sans toucher au cloisonnement : un point fermé
contient une discussion entre collaborateurs d'un projet, et la partager serait
une fuite (règle 3).

Ce qui se mutualise n'est donc pas le débat, c'est **la règle qu'il fait naître**.
Un point qui tranche la même question pour la troisième fois est le signal qu'une
fonction `.ref` manque. Le passage du niveau 2 au niveau 3 est un geste humain,
jamais une promotion automatique.

### 6. La priorité d'un point se dérive — mais le graphe seul ne suffit pas

Aujourd'hui `priority` est un champ qu'on coche : une opinion saisie à la main,
pendant qu'à côté la marche dans le graphe sait exactement ce qu'un point bloque.

La liste des points ouverts doit donc se trier par **coût de ne pas trancher**.
Avec une réserve, et elle compte : **la profondeur n'est pas l'importance**.
Quatorze conclusions en aval dont aucune n'est engagée coûtent moins qu'une seule
sur laquelle un bureau de contrôle s'est prononcé. Le tri croise le graphe avec
le rang qualitatif déjà écrit :

```
rien  <  relu en interne  <  tranché avec l'équipe  <  visé par la maîtrise
      d'œuvre  <  avis d'un bureau de contrôle  <  acté contractuellement
```

« Tranché avec l'équipe » est l'échelon que les points apportent, et il manquait.

Le champ saisi reste — quelqu'un l'a écrit, un constat ne devient pas faux
(règle 6) — mais il cesse d'être la seule chose qu'on regarde.

---

## Ce que l'écran dit, et ce qu'il ne dira jamais

| jamais à l'écran | à l'écran |
| --- | --- |
| « valeur invalidée », « périmée » | « un point ouvert porte sur cette valeur » |
| un point ouvert automatiquement à chaque variante | un signal ; quelqu'un ouvre |
| « point bloquant », un circuit, une relance | *(n'existe pas)* — règle 12 |
| « importance : 3 » | « ce point porte sur une valeur dont dépendent quatre conclusions, dont une couverte par un avis » |
| une valeur qui change selon l'état d'un point | la valeur, et à côté ce qui la conteste |

---

## Ce qu'on ne fera jamais

**Fermer un point parce qu'un calcul a changé.** Un point est un débat humain ;
le solder par un recalcul, c'est décider à la place des gens.

**Ouvrir un point à chaque variante.** Crier au loup fait ignorer l'alerte au
bout de trois fois — c'est déjà la raison pour laquelle on ne crie pas « caduc ».

**Faire dépendre un calcul de l'état d'un point.** 0,47 m si le point est fermé
et 0,95 m s'il est ouvert, ce serait deux vérités (règle 4). Le point
**qualifie** la valeur, il ne la change pas.

**Compter.** Pas de « poids 5 > poids 3 ». Ce qu'un ingénieur a besoin de savoir
n'est pas combien, c'est **ce que ça coûte de le casser**.

**Promouvoir une décision en règle automatiquement.** Trois projets qui tranchent
pareil ne font pas une règle ; ils font un signal, et quelqu'un écrit la règle.

**Écrire dans la mémoire depuis un point.** La seule voie reste la proposition,
et c'est un humain qui la signe (règle 1). Ce que ces étapes ajoutent, ce sont des
arêtes — jamais une seconde porte.

---

## Les étapes

### Étape 0 — trancher le mot

`sujet` désigne déjà deux choses : dans le langage, le **nom d'une donnée**
(« Hauteur du plancher bas du logement le plus haut ») ; dans le suivi, un fil de
discussion. Le jour où il faut écrire l'arête, `le sujet porte sur le sujet` est
illisible et l'on s'arrête.

**Proposition : la mémoire garde « sujet »** — c'est le mot du langage, il est
dans les `.ref` et les `.ctr`, il est presque contractuel — et l'objet du suivi
devient **« point »**. C'est le mot natif du métier : un point de compte rendu,
un point ouvert, un point soldé. Il est court, et il ne promet aucune procédure.

Le coût est réel — écrans, vocabulaire, tests — et il n'a pas à être payé tout de
suite. La décision, elle, se prend avant l'étape 2 : c'est elle qui nomme l'arête.

### Étape 1 — un point peut naître d'une valeur

C'est le trou 4, et il bloque tout le reste. Aujourd'hui un point est l'enfant
d'un document analysé ; il doit pouvoir naître d'une affirmation, d'une
conclusion de calcul, ou de rien.

Migration additive : les deux colonnes deviennent facultatives. Ce qui les porte
aujourd'hui les garde — un point venu d'un compte rendu cite toujours sa page.

### Étape 2 — un point dit sur quoi il porte

L'arête amont, vers une **version** d'affirmation. Posée par un geste humain, ou
proposée par reconnaissance **exacte sur mots entiers** — c'est la prudence
qu'`avis-liaison.js` a déjà écrite, et pour la même raison : un point mal
accroché contesterait en silence une valeur que personne n'a mise en doute.

Ce que ça donne dès cette étape, sans rien d'autre : sur une valeur, « deux
points ouverts portent dessus » ; et dans une variante, un rang « encore en
débat » à côté de « ne couvre plus ».

### Étape 3 — le retour se remonte

`reference: "sujet:<id>"` devient une arête lisible dans les deux sens. La chaîne
du raisonnement ne s'arrête plus à une règle : elle continue jusqu'au débat qui a
tranché, avec sa date et ses noms.

C'est ici que la question « pourquoi les fondations sont-elles à cette
profondeur ? » trouve sa réponse complète.

### Étape 4 — `NATURE.RAISONNEMENT` se remplit

La case est déclarée depuis longtemps et vide. Elle porte le petit graphe du
raisonnement humain :

```
POINT        « Quelle profondeur de fondation retenir ? »
PORTE SUR    altitude = 742,30 · nature du sol = moraine · bâtiment chauffé
EXAMINE      étude géotechnique · plan de niveau · échange architecte / BC
DÉCISION     hors gel = 0,80 m
PRODUIT      affirmation : hors gel = 0,80 m
```

À ce moment-là un point n'est plus une boîte de commentaires : il produit quelque
chose que le moteur sait consommer.

### Étape 5 — la priorité se dérive

Une fois les arêtes en place, ce qu'un point bloque se calcule. Reste à croiser
avec le rang qualitatif, comme dit plus haut.

---

## Ce que cet ordre refuse

**De construire un pont entre deux moitiés.** Un pont suppose deux rives ; il
n'y en a qu'une, et le reste sont des affluents.

**De poser l'écran avant le modèle.** Afficher « contesté » sur une valeur avant
que l'arête existe obligerait à le deviner, et l'on aurait deux idées de ce que
« contesté » veut dire.

**D'écrire le raisonnement avant les arêtes.** `NATURE.RAISONNEMENT` sans
`porte sur` ni `décidé dans` serait un récit qui ne s'accroche à rien — ce que
`closure_reason` est déjà.

**De remplacer `closure_reason`.** Il porte ce que des gens ont écrit. Un constat
ne devient jamais faux (règle 6) : on ajoute à côté, on n'efface pas.

---

## Où c'est écrit

| ce qui existe | fichier |
| --- | --- |
| la nature d'une affirmation et son discriminant | `apps/web/js/services/assertion-taxonomy.js` |
| ce qu'une décision doit dire | `apps/web/js/services/decision-versement.js` |
| la fermeture d'un sujet qui prépare une décision | `apps/web/js/views/project-subjects/project-subjects-actions.js` |
| les lectures d'une conclusion | `apps/web/js/services/memoire-applications.js` |
| la marche dans le graphe | `apps/web/js/services/memoire-variante.js` |
| ce qui couvre une valeur, et ce qui ne la couvre plus | `apps/web/js/services/couverture.js`, `docs/ce-qui-couvre-une-valeur.md` |
| ce qui ne se rejoue pas, et pourquoi | `docs/rejouer-la-memoire.md` |
| les cinq objets du langage | `docs/langage-mdall.md` |
| les règles dont tout dépend | `docs/fondamentaux.md` |
