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

### Étape 0 — trancher le mot *(faite)*

`sujet` désigne déjà deux choses : dans le langage, le **nom d'une donnée**
(« Hauteur du plancher bas du logement le plus haut ») ; dans le suivi, un fil de
discussion. Le jour où il faut écrire l'arête, `le sujet porte sur le sujet` est
illisible et l'on s'arrête.

**Tranché : la mémoire garde « sujet »** — c'est le mot du langage, il est dans
les `.ref` et les `.ctr`, il est presque contractuel — et **le code appelle
« point »** l'objet du suivi. C'est le mot natif du métier : un point de compte
rendu, un point ouvert, un point soldé.

**À l'écran, rien ne change : on écrit « sujet ».** Le vocabulaire des écrans a
son histoire et ses habitudes, et le renommer coûterait cher — écrans,
raccourcis, tests — pour ne régler qu'une gêne de lecture du code. La gêne, elle,
était réelle : « le sujet porte sur le sujet » ne s'écrit pas.

La frontière est donc nette. `services/point-porte-sur.js` la porte : ses
fonctions parlent de points, **tout ce qu'il rend à lire dit « sujet »**, et le
mot de l'écran est écrit une seule fois. Un test le vérifie dans les deux sens —
il tombe si une phrase se met à dire « point », et il tombe si une variable de ce
fichier se remet à s'appeler `sujet`. C'est d'ailleurs lui qui en a trouvé une,
écrite deux minutes plus tôt.

### Étape 1 — un point peut naître d'une valeur *(faite)*

C'est le trou 4, et il bloque tout le reste. Aujourd'hui un point est l'enfant
d'un document analysé ; il doit pouvoir naître d'une affirmation, d'une
conclusion de calcul, ou de rien.

Migration additive : les deux colonnes deviennent facultatives. Ce qui les porte
aujourd'hui les garde — un point venu d'un compte rendu cite toujours sa page.

### Étape 2 — un point dit sur quoi il porte *(faite)*

L'arête amont, vers une **version** d'affirmation. Posée par un geste humain, ou
proposée par reconnaissance **exacte sur mots entiers** — c'est la prudence
qu'`avis-liaison.js` a déjà écrite, et pour la même raison : un point mal
accroché contesterait en silence une valeur que personne n'a mise en doute.

Ce que ça donne dès cette étape, sans rien d'autre : sur une valeur, « deux
points ouverts portent dessus » ; et dans une variante, un rang « encore en
débat » à côté de « ne couvre plus ».

### Étape 3 — le retour se remonte *(faite)*

`reference: "sujet:<id>"` est une arête lisible dans les deux sens. La chaîne du
raisonnement ne s'arrête plus à une règle : elle continue jusqu'au débat qui a
tranché, avec sa date et ses noms.

C'est ici que la question « pourquoi les fondations sont-elles à cette
profondeur ? » trouve sa réponse complète.

**Il n'y a rien eu à créer en base.** La chaîne était écrite depuis le premier
jour, et **personne ne la lisait** — une chaîne écrite et jamais lue n'est pas
une arête, c'est un commentaire dans une colonne. Le défaut n'était pas
l'absence d'un champ : c'était que la forme s'inventait à l'écriture, dans un
écran, et qu'aucun lecteur ne la connaissait. `referenceDuPoint` et
`pointDeLaReference` sont maintenant côte à côte dans le même fichier, et
l'écran appelle le premier au lieu d'écrire la chaîne à la main.

`payload.reference` sert à tout le monde : c'est la marque `sujet:` qui
distingue la nôtre, et une référence qui ne la porte pas n'est pas un point. Le
mot de la marque est celui de la mémoire et il ne se renomme pas — il est déjà
écrit dans les propositions des projets, et le changer rendrait illisible ce qui
a été enregistré (règle 6).

### Étape 4 — `NATURE.RAISONNEMENT` se remplit *(faite)*

La case était déclarée depuis longtemps et vide. Elle porte le petit graphe du
raisonnement humain :

```
POINT        « Quelle profondeur de fondation retenir ? »
PORTE SUR    altitude = 742,30 · nature du sol = moraine · bâtiment chauffé
EXAMINE      étude géotechnique · plan de niveau · échange architecte / BC
DÉCISION     hors gel = 0,80 m
PRODUIT      affirmation : hors gel = 0,80 m
```

Un point n'est plus une boîte de commentaires : il produit quelque chose que le
moteur sait consommer.

**Les cinq étapes sont lues, aucune n'est déduite.** PORTE SUR vient de l'arête
amont, PRODUIT de l'arête aval — c'est le seul endroit où les deux se
rencontrent, et chacune y arrive par son fichier. DÉCISION est la ligne que le
point a produite et qui porte la question ; elle est retirée de PRODUIT, sans
quoi on lirait deux fois la même chose.

**Une étape vide se dit.** Un point dont personne n'a noté ce qu'il avait
examiné n'est pas un point qui n'a rien examiné. Les cinq lignes sont toujours
rendues, et celles qui manquent portent leur manque en toutes lettres (règle 5).
Un graphe qui perd ses lignes creuses se lit comme un raisonnement complet, et
c'est précisément ce qu'il n'est pas.

**Sa valeur est sa question, jamais le résultat.** Rien ne tranche un
raisonnement : c'est sa définition dans la taxonomie. Le résultat vit sur la
ligne qu'il a produite, et le recopier ici en ferait deux vérités — c'est celle
qu'on ne regarde pas qui finirait par avoir raison (règle 4).

Et comme tout le reste, il **ne s'écrit pas** : il sort par la proposition que
la fermeture du sujet prépare déjà, à côté de la décision et de la valeur. Trois
lignes, un seul geste, une seule signature.

### Étape 5 — la priorité se dérive *(faite)*

Les arêtes étant en place, ce qu'un point bloque se calcule : on part de ce sur
quoi il porte, on descend le graphe des dépendances, et l'on croise avec le rang
qualitatif.

**La profondeur n'est pas l'importance, et c'est ce qui commande le tri.**
Quatorze conclusions en aval dont aucune n'est engagée coûtent moins qu'une
seule sur laquelle un bureau de contrôle s'est prononcé. Le rang passe donc
avant la portée, toujours ; la portée ne départage qu'à engagement égal. Un tri
par nombre d'aval aurait mis en tête exactement ce qu'il ne faut pas regarder en
premier.

**L'engagement peut venir de l'aval.** Une valeur nue dont dépend une conclusion
couverte par un avis coûte cher à casser. Ne peser que ce sur quoi le point
porte manquerait tout le prix — un test le tient, et le retirer fait tomber
quatre assertions.

**Un point sans arête n'est pas un point qui ne bloque rien.** C'est la
distinction que cette étape pouvait rater. Il n'a pas un coût nul, il n'a pas de
coût **mesuré**, et écrire « ne bloque rien » serait affirmer une absence qu'on
n'a pas vérifiée (règle 5). Il ne se mêle donc pas aux points pesés — ni devant,
ce qui serait faux, ni au milieu, ce qui ferait croire qu'on l'a regardé : il
vient après, rangé par le champ saisi.

**Aucun poids n'est fabriqué.** Pas de « poids 5 > poids 3 ». Il y a un rang —
un mot dont la place dans une échelle fait tout le sens — et des choses qu'on
nomme : trois conclusions, un avis. Compter des conclusions qu'on peut énumérer
n'est pas fabriquer une note : la première se vérifie en ouvrant la liste, la
seconde ne se vérifie nulle part.

Ce que l'écran lit :

> ce sujet porte sur une valeur dont dépendent 3 conclusions, dont l'une est
> examinée par un bureau de contrôle

L'engagement se dit **au singulier**, quel qu'en soit le nombre : c'est le plus
coûteux qui compte, et en annoncer deux ferait croire qu'ils s'additionnent.

### L'échelon que les points apportent

« Tranché avec l'équipe » manquait à l'échelle de l'engagement, et il manquait
parce que **rien ne l'établissait** : un débat entre gens du projet ne laissait
aucune trace qu'une valeur pouvait citer. L'arête aval le donne — une valeur
produite par un point fermé a été tranchée en réunion, avec sa date et ses noms.

Il se place au-dessus d'une relecture interne — une personne qui relit n'engage
qu'elle, une équipe qui tranche engage le projet — et au-dessous de la maîtrise
d'œuvre, dont la signature engage au-delà du projet. Le déplacer d'un cran
changerait ce qu'il coûte de casser la valeur qu'il couvre, et un test tient
cette place.

**Le vocabulaire n'a qu'un domicile** : `services/ce-qui-couvre.js`, comme les
cinq autres rangs. Ce qui l'établit vit ailleurs — exactement comme le contrôle
technique, qui ne vit pas dans l'acte mais dans l'organisme que sa note nomme.

Un point encore ouvert ne monte rien, et un point qu'on ne connaît pas non plus :
le supposer fermé ferait dire « tranché avec l'équipe » d'un débat en cours.

### Les écrans, branchés

**Les six étapes sont faites, et l'écran les montre.** L'ordre était celui que
cette page s'était donné : poser l'écran avant le modèle aurait obligé à
deviner, et l'on aurait fini avec deux idées de ce que « contesté » veut dire.

| ce qu'on voit | où | ce qui le calcule |
| --- | --- | --- |
| « un sujet ouvert porte sur cette valeur » | ligne de la Mémoire | `phraseDesPointsOuverts` |
| « le sujet « … » **porterait** sur cette valeur », et deux réponses | ligne de la Mémoire | `portagesSurLaValeur` |
| « tranché dans le sujet « … » — Ourdine Ferrand, le 12 mars » | ligne de la Mémoire | `leDebatQuiATranche` |
| « Sur quoi ce sujet porte », avec les mêmes deux réponses | détail d'un sujet | `surQuoiCePointPorte` |
| « Par où l'on est passé », les cinq étapes | détail d'un sujet fermé | `etapesDuRaisonnement` |
| l'ordre par ce que ça coûte de ne pas trancher | tableau des sujets | `ordreDesPointsOuverts` |

**Le conditionnel n'est pas une coquetterie.** Une arête proposée se dit
« porterait » et porte deux boutons ; une arête posée se dit « porte » et n'en
porte qu'un. Les mêler ferait contester une valeur que personne n'a mise en
doute, et le compte — « 2 sujets ouverts portent dessus » — ne prend que les
confirmées.

**Deux réponses, jamais une.** N'offrir que « confirmer » ferait de la seule
réponse possible un acquiescement : une reconnaissance fausse resterait affichée
pour toujours, et l'on apprendrait à ne plus la lire. Écarter sert aussi à
retirer une arête confirmée — se tromper en confirmant doit rester rattrapable.

**Le chemin n'apparaît qu'une fois le sujet fermé.** Un raisonnement dit par où
l'on est arrivé ; devant un débat qui court encore, on n'est arrivé nulle part,
et quatre lignes creuses sous une question ouverte feraient passer une
discussion en cours pour un travail bâclé.

**Rien n'est retiré de l'écran avant que la base ait pris.** Un retrait
optimiste qui échoue laisserait croire qu'une valeur n'est plus contestée alors
qu'elle l'est toujours, et personne ne reviendrait vérifier.

**Ce que ça coûte de ne pas trancher ne se propose que dans un projet.** Le
calcul lit la mémoire de ce projet-là, son graphe et ses engagements ; l'offrir
sur un écran qui traverse quarante projets ferait quarante fois cinq lectures
pour ranger une page, et un bouton qui promet un rangement qu'il ne peut pas
tenir est pire que pas de bouton. Les cinq lectures ne partent qu'au clic, une
fois par projet ; tant qu'elles ne sont pas revenues, **la liste ne bouge pas**.

### Quand la reconnaissance se déclenche

Un point naît de bien plus que d'un compte rendu : `run-analysis` →
`generate-observations` → `resolve-observations` en crée depuis **n'importe quel
document analysé**, `create_manual_subject` depuis la main, et depuis l'étape 1
un point peut naître d'une valeur ou de rien. La reconnaissance ne regarde que
l'**intitulé** — elle se moque de savoir d'où il vient.

Il n'y a que deux instants où un rapprochement nouveau peut naître, et ce sont
les deux côtés de la même arête : **un point naît** — on confronte son intitulé
à la mémoire — et **une affirmation entre en mémoire** — on confronte son nom
aux points ouverts. Plus un rattrapage **à la demande**, qui est le seul moyen
d'atteindre les points déjà ouverts aujourd'hui, et le seul qui serve quand un
intitulé vient d'être corrigé.

**Jamais de balayage périodique.** Un travail de fond qui redécouvre chaque nuit
les mêmes rapprochements est la façon la plus sûre de faire ignorer l'alerte —
c'est déjà la raison pour laquelle on ne crie pas « caduc ».

#### Écarter se souvient, et c'était le préalable

Écarter **effaçait la ligne**. Rien ne gardait donc trace du refus : à la
reconnaissance suivante, le même rapprochement se reproposait à l'identique.
Proposer sans mémoire du refus est **pire que ne pas proposer** — au troisième
« le sujet « … » porterait sur cette valeur » qu'on a déjà refusé, on cesse
d'ouvrir la Mémoire.

Un refus est une information — qui, quand — et un constat ne devient pas faux
(règle 6). La ligne reste donc, marquée par `ecarte_le` : elle ne se lit plus, et
elle **occupe la place**. `unique (subject_id, assertion_id)` fait le reste — une
reconnaissance qui repasse envoie ses lignes en `ignore-duplicates`, et celle-là
est ignorée sans qu'elle ait à consulter quoi que ce soit.

`declared_by` reste : « posée par Ourdine Ferrand le 12 mars, écartée le 3
avril » se relit, et effacer l'auteur en écartant ferait disparaître le fait
qu'elle avait été confirmée.

Un même mot pour le même acte, enfin : « Écarter » sur une arête proposée comme
sur une arête confirmée. « Retirer » et « Écarter » auraient fait deux gestes à
apprendre pour une seule intention.

#### Les deux déclenchements, et ils tombent au même endroit

**Fusionner une proposition fait les deux choses à la fois** : des noms entrent
en mémoire, et des sujets s'ouvrent — c'est là, et nulle part ailleurs, qu'un
sujet naît d'un document. Les deux moments se branchent donc au même endroit, en
**deux confrontations** dont chacune est bornée par ce qui vient de se produire :

| ce qu'on confronte | à quoi |
| --- | --- |
| les sujets qui viennent de naître | la mémoire entière — ils n'ont jamais rien rencontré |
| les sujets déjà ouverts | les seules affirmations qui viennent d'entrer |

Les passer tous contre toute la mémoire serait un balayage déguisé : il
redécouvrirait les mêmes rapprochements pour des sujets que cette fusion n'a pas
touchés. Un sujet neuf face à une valeur neuve est dans les deux confrontations,
et les paires se dédoublonnent avant d'être écrites — la base tient
`(subject_id, assertion_id)` pour unique, et l'envoi entier serait refusé.

La reconnaissance vient **après le secrétariat et après les pères** : elle lit un
intitulé, et un sujet dont le titre vient d'être réécrit ne doit pas être
rapproché sur l'ancien. Elle a son étape dans le journal de la fusion —
« Rattachements cherchés » —, et ce qu'elle a trouvé s'y lit après coup.

**Elle ne défait jamais ce qui l'appelle.** La mémoire est versée, les sujets
sont ouverts : manquer un rapprochement ne doit pas remettre cela en cause.
L'échec se **dit** dans le journal — le taire ferait croire qu'il n'y avait rien
à rattacher — et la recherche à la demande le rattrape.

L'autre naissance est **humaine** : un sujet créé depuis l'onglet Sujets, ou
depuis une conversation du Copilote. Là, la reconnaissance part tout de suite :
l'intitulé vient d'être écrit, celui qui l'a écrit est devant l'écran, et c'est
le moment où un rapprochement a le plus de chances d'être juste — et où il coûte
le moins cher à écarter. Muette en cas d'échec, pour la même raison.

Elle ne part **pas** depuis la fusion, où quarante sujets naissent d'un coup :
les confronter un par un ferait quarante lectures de la mémoire, là où une seule
confrontation suffit.

#### Chercher, à la demande

Un bouton dans le détail d'un sujet : **Chercher dans la mémoire**. C'est le
déclenchement qui coûte le moins cher à se tromper — quelqu'un a cliqué, il
regarde, il répond — et c'est celui qui dira, sur de vrais projets, si la
prudence de la reconnaissance est au bon niveau avant qu'on l'automatise.

Le bloc s'affiche maintenant **même vide**, et ce n'est pas une contradiction
avec la règle qu'il portait. Il porte un **geste**, et un endroit où agir
n'affirme rien : le titre et le bouton se lisent « voilà où cela se passe », pas
« ce sujet ne porte sur rien ».

**« Rien » est trois choses**, et l'écran les distingue (règle 5) :

| ce qu'on lit | ce que ça veut dire |
| --- | --- |
| *(rien)* | personne n'a encore cherché |
| « Aucun nom de la mémoire n'apparaît dans l'intitulé de ce sujet. » | la reconnaissance a tourné, et n'a rien reconnu |
| « Les noms reconnus sont déjà rattachés, ou ont déjà été écartés. » | elle a reconnu, et tout était déjà su |

Les confondre ferait croire qu'elle ne marche pas, et l'on cesserait de s'en
servir.

### Le cerveau montre où le projet discute encore

Le cerveau dessinait **la moitié calcul, toute seule** — c'est le constat
d'ouverture de cette page, et il valait encore pour lui : il recevait les
affirmations, les lectures et les actes, et ne savait rien des sujets.

Deux marques l'en font sortir, et **aucune n'ajoute de nœud**. Un sujet n'est pas
une affirmation : en faire une boule dans le graphe recréerait exactement la
mémoire parallèle que cette page refuse. Le sujet **qualifie** la valeur, il ne
la remplace pas.

| la marque | ce qu'elle dit |
| --- | --- |
| un **halo pointillé**, dehors | un sujet ouvert porte sur cette valeur |
| l'**anneau d'équipe** | cette valeur a été tranchée en réunion |

**Le halo est dehors, et pointillé.** Dehors, parce qu'une valeur peut très bien
être examinée par un bureau de contrôle **et** remise en question : les deux
marques doivent se lire ensemble, pas l'une à la place de l'autre. Pointillé,
parce qu'il dit l'inachevé — un anneau plein annoncerait quelque chose d'acquis,
et c'est justement ce qui ne l'est pas.

**Un seul halo, quel qu'en soit le nombre.** Trois débats ne se dessinent pas
trois fois plus fort : ce qu'un ingénieur a besoin de voir est qu'il y en a, et
le compte se lit dans la bulle — « 2 sujets ouverts portent sur cette valeur ».
Fabriquer une intensité serait refaire le poids que tout cet écran refuse.

**La couleur est celle de l'attention, jamais celle de l'alerte.** Une valeur en
débat n'est pas une valeur fausse. Le rouge de l'audit dit que quelque chose ne
va pas ; ici tout va bien, des gens discutent.

Et `null` n'est pas zéro : sans les arêtes, aucun halo, mais aucune affirmation
non plus — dessiner tout le projet comme apaisé parce qu'on n'a pas regardé
serait exactement l'erreur que cette arête existe pour empêcher.

#### L'anneau qui n'était allumé par rien

L'échelon « tranché avec l'équipe » avait reçu son anneau en même temps qu'il
entrait dans l'échelle. Mais le rang du cerveau se tirait des **seuls actes** :
une valeur produite par un sujet fermé s'y dessinait comme une valeur que
personne n'a examinée. L'anneau existait, et rien ne l'allumait.

Le cerveau passe donc par `rangDeLaVersion`, qui croise l'acte et le débat —
c'est déjà lui qui décide partout ailleurs, et le recalculer ici en aurait fait
un second endroit qui décide ce qu'un engagement vaut.

### L'histoire d'une valeur, sous la valeur

Sur un vrai projet, le bloc des arêtes montrait **cinq lignes identiques** :

```
Profondeur hors gel = 0,466 m     [Confirmer] [Écarter]
Profondeur hors gel = 0,466 m     [Confirmer] [Écarter]
Profondeur hors gel = 0,466 m     [Confirmer] [Écarter]
…
```

Elles n'étaient pas un doublon : la même valeur existait pour plusieurs parties
de l'ouvrage, versée à des dates différentes, par des chemins différents. Rien
ne les distinguait, et **on ne confirme pas ce qu'on ne distingue pas**.

Distinguer ne suffisait d'ailleurs pas. Une valeur versée il y a deux ans par
quelqu'un qui a quitté le projet ne se confirme que si l'on sait **pourquoi elle
vaut ça** : la règle appliquée et ce qu'elle a lu, la citation du texte et sa
page, la question tranchée et les possibles écartés. C'est cela, la mémoire d'un
projet — pas la valeur, le chemin qui y mène.

`services/histoire-de-la-valeur.js` rassemble ce chemin. Il est pur : il reçoit
la mémoire, les lectures, les actes et les points, et ne va rien chercher.

#### Rien n'est résumé, tout est lu

On aurait pu demander à un modèle d'écrire ce récit. Deux raisons de ne pas le
faire, et chacune tient toute seule.

**Tout est déjà écrit, exactement.** Résumer ce qui est exact, c'est le rendre
approximatif — et c'est précisément sur l'exactitude qu'on s'appuie pour
confirmer.

**Un récit produit serait une seconde vérité** (règle 4), et celle qu'on lit
plutôt que l'autre. Le jour où la règle change, la mémoire suit et le résumé
non ; personne ne s'en aperçoit, parce que c'est le résumé qu'on lit.

#### Deux niveaux, et le premier suffit souvent

La **ligne d'identité** — la portée, la date, l'auteur, l'origine — ne se replie
pas : c'est elle qui sépare cinq lignes d'un coup d'œil, et la cacher
obligerait à ouvrir cinq volets pour en comparer deux. Le **reste** se déplie,
parce que cinq histoires entières feraient une page qu'on ne lit pas.

Ce que la mémoire ne dit pas est **nommé**, jamais comblé : « rien ne dit d'où
vient cette valeur » se répare, « origine inconnue » n'aide personne (règle 5).

#### Le bloc pose une question, il ne constate plus

Un seul titre — « Sur quoi ce sujet porte » — coiffait les arêtes confirmées
**et** les valeurs que personne n'avait encore regardées. Le titre affirmait ce
que les boutons demandaient. Ce sont maintenant deux blocs :

| ce qu'on voit | ce que ça dit |
|---|---|
| **Ce sujet porte sur** | ce qui est confirmé — et rien du tout quand il n'y a rien |
| **Ces valeurs portent le même nom** | d'où sortent ces lignes, ce qu'on demande, ce que ça fait |

Les boutons répondent à la question posée juste au-dessus : « Oui, celle-ci » et
« Non », au lieu de « Confirmer » et « Écarter », qui demandaient de connaître un
mécanisme. Sur une arête déjà confirmée il n'y a plus de question, et le geste
s'appelle « Écarter ».

Le nom annoncé se lit **sur les lignes qu'il annonce**, pas ailleurs : une
confirmée d'à côté peut s'appeler tout autrement, et un même titre peut contenir
deux noms de la mémoire. Dès que les lignes ne s'accordent pas sur un nom, la
phrase générique — vraie, elle — reprend la place.

La liste des intitulés est celle de la Mémoire, `.memory-facts`, telle quelle :
la même chose se montre pareil d'un écran à l'autre.

### Ce qui reste

Les deux rangs déclarés que rien n'atteint — le rôle d'un signataire, la nature
contractuelle d'une pièce. Chacun demande **une** chose, nommée dans
`services/ce-qui-couvre.js`, et le jour où elle existe une ligne suffit.

Et une question qui ne se tranche qu'en regardant : **la reconnaissance est-elle
au bon niveau ?** Elle est exacte, sur mots entiers — elle trouvera donc très
peu. C'est voulu : un sujet mal accroché contesterait en silence une valeur que
personne n'a mise en doute. Si elle ne trouve jamais rien sur de vrais intitulés,
c'est elle qu'il faudra desserrer, pas les moments où elle tourne.

---

## Ce qui est posé, et où

| ce que c'est | où |
|---|---|
| les deux colonnes deviennent facultatives | `202610130001_un_point_porte_sur_une_affirmation.sql` |
| l'arête « porte sur » | table `subject_assertion_links`, même migration |
| plus de faux document | `create_manual_subject`, réécrite |
| la reconnaissance, mutualisée | `services/avis-liaison.js`, `liaisonDunIntitule()` |
| ce sur quoi un point porte | `services/point-porte-sur.js` |
| ce qu'un point a tranché | `services/point-a-tranche.js` |
| le graphe du raisonnement humain | `services/raisonnement-du-point.js` |
| la clé préfixée, et la charge transportée | `services/atelier-proposition.js` |
| les trois lignes que la fermeture propose | `views/project-subjects/project-subjects-actions.js` |
| ce qu'un point bloque, et l'ordre des ouverts | `services/ce-que-bloque-un-point.js` |
| l'échelle de l'engagement, « tranché avec l'équipe » compris | `services/ce-qui-couvre.js` |
| les arêtes **dessinées**, sans rien qui parle à la base | `views/memoire/portage-rendu.js` |
| la porte de l'arête amont — lire, poser, confirmer, retirer | `services/point-porte-sur-supabase.js` |
| les deux mentions et les deux gestes, sur une ligne de mémoire | `views/project-memory.js` |
| les deux encadrés du détail d'un sujet | `views/project-subjects/aretes-du-sujet.js` |
| l'ordre du tableau, et les cinq lectures qu'il demande | `views/project-subjects/ordre-du-blocage.js` |
| une arête écartée se souvient | `202610140001_une_arete_ecartee_se_souvient.sql` |
| ce qu'il reste à proposer pour un point | `portageAProposer`, dans `services/point-porte-sur.js` |
| la recherche à la demande | `chercherSurQuoiCeSujetPorte`, dans `views/project-subjects/aretes-du-sujet.js` |
| ce qu'on confronte à quoi | `portagesDeCesPoints`, dans `services/point-porte-sur.js` |
| la reconnaissance et ses trois appelants | `services/portage-reconnaissance.js` |
| les deux confrontations de la fusion | `proposerLesPortagesDeLaFusion`, dans `views/project-propositions.js` |
| les débats par valeur, en une passe | `pointsOuvertsParValeur`, dans `services/point-porte-sur.js` |
| ce que le cerveau sait d'un débat | `enDebat` et `rang`, dans `services/memoire-cerveau.js` |
| le halo et sa légende | `views/ui/cerveau-du-projet.js` |

### Le faux document, et pourquoi il existait

`subjects.document_id` et `subjects.analysis_run_id` étaient **obligatoires** :
dans le schéma, un point était l'enfant d'un document analysé, pas du projet. Le
code s'en accommodait en **fabriquant** un `manual-subjects-system.json` et une
analyse fictive « réussie » pour chaque projet, uniquement pour satisfaire deux
contraintes. Un document que personne n'a déposé, dans la table des documents,
avec une analyse qui n'a jamais tourné.

Les deux colonnes sont relâchées, la fonction ne fabrique plus rien. Les faux
documents déjà créés **restent** : ils sont cités par les points qui les portent,
et les effacer romprait cette citation. Une ligne fausse qu'on assume vaut mieux
qu'une suppression qui casse.

### Les deux arêtes ne se rencontrent qu'à un seul endroit

C'est la décision 3 de cette page, et c'est celle qu'on peut rater sans s'en
apercevoir : **un seul champ pour les deux ferait couvrir une valeur par le
débat qui la conteste**.

La cloison est donc physique, pas conventionnelle. `point-porte-sur.js` ne lit
aucune référence de charge ; `point-a-tranche.js` ne lit aucun lien. Ni l'un ni
l'autre ne reçoit même de quoi voir ce que l'autre porte — un mélange ne
s'écrirait pas par distraction, il faudrait changer une signature pour y arriver.

Les deux ne se retrouvent que dans `raisonnementDuPoint`, où chacune tient son
rôle : l'amont dit sur quoi le débat portait, l'aval ce qu'il a posé. Les croiser
là fait tomber quatre tests.

### La reconnaissance n'est pas réécrite : elle est sortie

Un point doit s'accrocher à une valeur exactement comme un avis de bureau de
contrôle : **sur mots entiers, un sujet ou rien**. Deux reconnaissances écrites
séparément auraient divergé à la première correction. `liaisonDeLAvis` s'est donc
ouverte en deux : `liaisonDunIntitule()` fait la reconnaissance, et ce qui reste
dans l'avis est ce qui lui appartient — savoir où il range son intitulé.

### Ce que ça donne déjà

Sur une valeur : « 2 sujets ouverts portent sur cette valeur ». C'est le premier
effet visible de l'arête, et il vaut à lui seul l'étape — **une valeur en débat
cesse de se présenter comme acquise**.

Un point **fermé** ne compte pas : il a fait son travail, et le compter ferait
présenter comme en débat une valeur que plus personne ne discute. Un point qu'on
ne connaît pas ne compte pas non plus — on ne sait pas s'il est ouvert, et le
supposer ouvert ferait dire « en débat » à tort (règle 5).

### Une arête proposée n'a pas d'auteur

`declared_by` nul dit « reconnu, pas encore confirmé ». L'écran doit pouvoir le
distinguer d'un geste humain : un point mal accroché contesterait en silence une
valeur que personne n'a mise en doute.

### Les gardes posées, et ce qu'on a cassé pour les voir tomber

| la garde | ce qu'on a cassé | ce qui est tombé |
|---|---|---|
| l'écran écrit « sujet » | il se met à dire « point » | 2 tests |
| le mot est écrit une fois | il s'écrit en dur dans une phrase | 1 test |
| une variable du code ne s'appelle pas `sujet` | elle s'y remet | 1 test |
| un point fermé ne met plus rien en question | il compte encore | 1 test |
| un point inconnu ne se compte pas | il est supposé ouvert | 2 tests |
| une arête proposée n'a pas d'auteur | elle s'en donne un | 1 test |
| une version ne se lie pas deux fois | elle se lie deux fois | 1 test |
| la reconnaissance vient des avis | elle est réécrite ici | 1 test |
| le schéma laisse naître un point de rien | la contrainte revient | 1 test |
| une référence sans la marque n'est pas un point | toute référence en devient un | 2 tests |
| qui et quand viennent de la signature | ils vont se chercher dans le point | 1 test |
| l'aval ne lit que la charge | il retombe sur le nom du sujet de mémoire | 3 tests |
| l'amont ne rend pas ce qu'il ne connaît pas | il rend une coquille | 1 test |
| l'amont ne rend pas deux fois le même lien | il le rend deux fois | 1 test |
| l'amont ne rend pas les liens d'un autre point | il les rend | 1 test |
| les deux arêtes ne se croisent pas | elles se croisent | 4 tests |
| la décision ne se lit pas deux fois | elle reste dans « produit » | 4 tests |
| une étape vide dit son manque | elle disparaît | 2 tests |
| sa valeur est sa question | elle recopie le résultat | 1 test |
| sans question, pas de raisonnement | il passe quand même | 2 tests |
| la clé d'un raisonnement est préfixée | elle perd son préfixe | 1 test |
| la charge du raisonnement voyage | elle est oubliée | 2 tests |
| la charge voyage filtrée | elle est recopiée telle quelle | 1 test |
| le garde du mot couvre les deux fichiers d'arêtes | le nouveau écrit « sujet » en dur | 1 test |
| le rang passe avant la portée | la portée passe devant | 1 test |
| un point non pesé ne se mêle pas aux pesés | il s'y mêle | 1 test |
| l'écran n'écrit pas « ne bloque rien » | il l'écrit | 1 test |
| la valeur visée ne compte pas dans son aval | elle s'y compte | 1 test |
| l'aval porte l'engagement | seule la valeur visée le porte | 4 tests |
| un point ouvert n'a rien tranché | il est supposé fermé | 1 test |
| l'avis d'un bureau l'emporte sur l'équipe | l'équipe l'écrase | 1 test |
| la place de l'échelon d'équipe | il glisse d'un cran | 2 tests |
| aucun rang ne dit le mot d'un outil de visa | le nouveau le dit | 1 test |
| un point fermé ne se trie pas | il revient | 1 test |
| une fermeture est tout ce qui commence par `closed` | seul `closed` compte | 2 tests |
| le champ saisi départage encore | il cesse de départager | 1 test |
| les graphies anciennes restent reconnues | elles ne le sont plus | 1 test |
| proposé et confirmé ne se confondent pas | ils se confondent | 5 tests |
| une reconnaissance peut être écartée | le bouton disparaît | 3 tests |
| une étape vide reste dessinée | elle disparaît | 1 test |
| un intitulé ne passe pas en clair | il passe en clair | 1 test |
| l'écran dessiné écrit « sujet » | il écrit « point » | 2 tests |
| chaque phrase a son propre élément | elle repart en texte nu | 1 test |
| un lien sans auteur n'est pas confirmé | tout devient confirmé | 1 test |
| un auteur fait de blancs ne compte pas | il compte | 1 test |
| le compte des ouverts ne filtre pas sur l'auteur | il filtre | 3 tests |
| un sujet sans place reste derrière | il se mêle aux rangés | 1 test |
| l'écran transversal ne propose pas le troisième ordre | il le propose | 3 tests |
| une arête écartée ne se lit plus (amont) | elle se relit | 1 test |
| une arête écartée ne se lit plus (aval) | elle se relit | 1 test |
| un auteur sans date n'écarte rien | il écarte | 1 test |
| un refus bloque la reproposition | il cesse de bloquer | 1 test |
| le refus d'un autre sujet ne bloque pas celui-ci | il bloque | 1 test |
| « rien reconnu » et « déjà là » se disent différemment | ils se confondent | 1 test |
| le bloc s'affiche même vide, pour porter le geste | il redisparaît | 3 tests |
| un seul mot pour le même acte | deux mots | 1 test |
| chaque confrontation ne voit que sa réserve | les deux se fondent en une | 1 test |
| une arête ne se pose pas deux fois | le dédoublonnage saute | 2 tests |
| un point sans identifiant ne produit rien | il produit une ligne | 1 test |
| un sujet fermé n'entre pas dans la reconnaissance | il entre | 1 test |
| sans projet, elle ne cherche rien | elle cherche | 1 test |
| une paire vide ne coûte pas une requête | elle en ouvre une | 2 tests |
| une lecture ratée se dit dans le journal | elle passe pour un silence | 1 test |
| « rien reconnu » et « rien de nouveau » se distinguent | ils se confondent | 1 test |
| le journal dit « proposé », jamais « posé » | il dit « posé » | 1 test |
| l'étape de fusion est déclarée | elle ne l'est plus | 1 test |
| « pas regardé » ne se dessine pas comme « personne ne conteste » | les deux se confondent | 1 test |
| le rang du cerveau croise l'acte et le débat | il oublie les sujets | 1 test |
| sans rien, le rang reste inconnu | il se dit « rien » | 2 tests |
| un sujet fermé ne fait plus de halo | il en fait un | 1 test |
| une arête écartée ne fait plus de halo | elle en fait un | 1 test |
| un sujet inconnu ne fait pas de halo | il est supposé ouvert | 1 test |
| le même lien ne compte qu'une fois | il compte deux fois | 1 test |
| la provenance enregistrée l'emporte sur la charge | la charge l'emporte | 1 test |
| une entrée qu'on ne retrouve plus garde son nom | elle disparaît | 2 tests |
| les lectures d'une autre conclusion ne remontent pas | elles remontent | 1 test |
| les trous se nomment un par un | ils se taisent | 3 tests |
| une valeur seule ne se voit pas reprocher sa portée | elle se le voit | 1 test |
| une décision se signe et ne bégaie pas | elle bégaie | 2 tests |
| deux blocs, deux titres | un seul titre coiffe les deux | 2 tests |
| les propositions disent d'où elles sortent | la phrase disparaît | 1 test |
| une question dit sa conséquence | elle ne la dit plus | 1 test |
| les boutons répondent à la question | ils redisent le mécanisme | 1 test |
| le nom annoncé est celui des lignes annoncées | il vient d'à côté | 1 test |
| deux noms ne s'annoncent pas comme un seul | le premier parle pour tous | 2 tests |
| l'identité se lit sans rien ouvrir | elle descend dans le dépliant | 3 tests |
| l'identité ne se répète pas dans le dépliant | elle s'y redit | 1 test |
| les trous à eux seuls ouvrent le dépliant | il reste fermé | 1 test |
| l'histoire emprunte la grille de la Mémoire | elle réinvente la sienne | 1 test |
| une écriture en vol désarme tous les gestes | ils restent armés | 1 test |

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
| l'histoire d'une valeur, et ce qu'on n'en sait pas | `apps/web/js/services/histoire-de-la-valeur.js` |
| les cinq objets du langage | `docs/langage-mdall.md` |
| les règles dont tout dépend | `docs/fondamentaux.md` |
