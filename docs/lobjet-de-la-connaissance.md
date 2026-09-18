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

#### Un identifiant n'est pas un nom, un numéro n'est pas un titre

Sur le même écran de vrai projet, la ligne d'identité disait :

```
le 11 septembre 2026 · par caf479f5-60a8-4803-8250-c57402aca26a · #P69 · …
```

Deux fois rien. « caf479f5-… » ne se reconnaît pas, et « #P69 » ne dit pas ce
qu'on faisait ce jour-là. L'écran ne passait pas de `nommer` — l'histoire
rendait donc l'identifiant brut, ce qui est pire que le silence : on croit lire
une information.

L'écran lit maintenant les profils (`loadAuthors`) et les versements
(`listPropositions`), et l'histoire dit **« Relevé topographique et zone
climatique » #P69** : le titre se lit, le numéro se cite. À défaut de titre le
numéro suffit — il ne s'invente pas (règle 5) — et à défaut de nom l'auteur
compte parmi les trous et l'écran le dit.

Le titre retenu est `merge_title` avant `title` : c'est sous celui-là que le
versement a été accepté, donc celui qui décrit ce qui est réellement entré dans
la mémoire.

#### Un refus se relit, il ne se redemande pas

Écarter une arête la retirait de ce que le sujet porte — c'est ce que le geste
promet — et le refus disparaissait avec elle. Six mois plus tard personne ne
sait que la question a été tranchée : on la rouvre en réunion, et le travail de
celui qui avait dit non est perdu. Un constat ne devient pas faux (règle 6).

`ceQueCePointAEcarte` les rend, dans un troisième bloc :

| ce qu'on voit | ce que ça dit | ce qu'on peut faire |
|---|---|---|
| **Ce sujet porte sur** | ce qui est confirmé | Écarter |
| **Ces valeurs portent le même nom** | ce qui est proposé | Oui, celle-ci · Non |
| **Ces valeurs ont été écartées** | ce qui a été refusé | rien |

**Aucun bouton** sur ces lignes-là : il n'y a plus rien à décider, seulement à
savoir. Une pastille dit qui a écarté et quand — « Écartée le 12 mars 2026 par
… » —, et « Écartée » tout court quand on ignore l'un ou l'autre : c'est peu,
mais c'est vrai, et cela suffit à ne pas recommencer.

Cela ne rouvre rien : `portageAProposer` compte toujours les écartées parmi les
connues, et ne les repropose pas. Les montrer est une lecture.

#### « Ça avance à quoi de faire tout ça ? »

La question est la bonne, et l'écran n'y répondait pas. On clique « Oui,
celle-ci », la ligne change de bloc, le titre dit « Ce sujet porte sur », le
bouton dit « Écarter » — et **on ne voit même pas qu'on a confirmé**.

Ce que ça avance était pourtant tout l'intérêt du rapprochement, et le
mécanisme existait déjà de bout en bout :

```
reconnaissance  →  « Oui, celle-ci »  →  la valeur est EN DÉBAT
                                           (Mémoire · cerveau)
                                              ↓
                                    fermer le sujet « réalisé »
                                              ↓
                              « qu'est-ce qui a été tranché ? »
                                              ↓
                            la décision se PROPOSE, puis se signe
                                              ↓
                       la valeur dit dans quel sujet elle a été tranchée
```

Rien de tout cela n'était dit. Le bloc le dit maintenant, en trois endroits :

| où | ce que ça dit |
|---|---|
| le titre | « Ce sujet met ces valeurs en débat » — il ne constate plus, il nomme l'état |
| la pastille | **en débat**, sur chaque ligne, dans la couleur du halo du cerveau |
| la phrase de fin | fermer le sujet demandera ce qui a été tranché, et la décision remplacera |

Et le geste s'appelle par son effet : **« Retirer du débat »**, pas
« Écarter ». « Non » reste au bloc d'en dessous — là on répond à une question,
ici on défait un geste.

#### Ce que le débat a à trancher, côte à côte

Quatre lignes « Profondeur hors gel » dans l'ordre de la base : il faut lire les
quatre et comparer de tête. `ce-qui-se-debat.js` les range par nom et met les
valeurs distinctes en regard de leurs portées :

```
2 valeurs différentes portent le nom « Profondeur hors gel ». Sur des parties
différentes de l'ouvrage elles peuvent être justes toutes les deux — c'est ce
que ce sujet a à trancher.

Profondeur hors gel
  0,69 m      Bâtiment A
  0,466 m     Préau · Bâtiment B
```

**Il montre, il ne conclut pas.** « Elles se contredisent » ne se vérifie pas :
deux parties différentes de l'ouvrage peuvent porter deux valeurs justes. La
portée est là précisément parce que c'est elle qui décide, et c'est le projet
qui tranche, pas l'outil.

La même valeur versée deux fois pour deux zones n'est donc pas un débat : c'est
la même réponse à deux endroits, et elle se range sur une seule ligne avec ses
deux portées. Le tableau ne s'écrit pas du tout quand aucun nom n'en porte
plusieurs — il répéterait la liste d'en dessous (règle 4).

La couleur du débat vit maintenant dans `--debat`, lue par la légende du cerveau
et par la pastille : un seul état, une seule couleur (règle 10). Le halo du
canevas la recopie — un dessin sur canevas ne lit pas une variable CSS —, et
c'est le seul endroit où elle se répète.

### Étape 1 de la capitalisation — lire les trois endroits, et tous les noms

#### Ce que la reconnaissance lisait vraiment

```js
intituleDuPoint = point.title || point.titre || point.description
```

Le titre **ou** la description : donc le titre seul, la description ne venant
qu'à défaut de titre. Et dans ce titre, `reconnaitre` gardait `reconnus[0]` —
**un** nom, le plus long — et jetait les autres. Les commentaires n'étaient
jamais lus.

Or les variables d'un projet ne sont presque jamais dans le titre. Un compte
rendu s'appelle « CR chantier n°25 » : il ne nomme rien. Pour le cas le plus
fréquent, la reconnaissance rendait **zéro**.

#### Elle lit les trois, et dit où

`ce-que-le-point-nomme.js` compose les textes d'un point — titre, description,
commentaires — et `nomsDunTexte` y trouve **tous** les noms. Chaque nom garde
**où** il a été vu, et l'écran l'écrit sous la valeur : « Son nom apparaît dans
la description de ce sujet. »

On ne confirme pas un rapprochement dont on ignore d'où il sort ; et un nom
trouvé dans le titre ne se relit pas comme un nom venu d'une discussion.

Vérifié au navigateur sur le cas réel — titre « CR chantier n°25 », deux noms
dans la description, un dans un commentaire : **trois** propositions là où il y
en avait zéro.

#### Les échanges avec le copilote ne sont jamais lus

`visibility = 'ephemeral'` marque les conversations avec le copilote, privées
par construction. `messageLisible` les refuse, ainsi que les messages effacés
(`deleted_at`).

Le refus vit dans le **service**, pas dans la requête : une garde de
confidentialité qui vivrait dans le SQL serait invisible aux tests, et une garde
qui dépend de qui appelle n'est pas une garde. Elle est cassée et vue tomber
comme les autres, et elle tient même sur une casse inattendue — `messageLisible`
est exportée, et une ligne peut lui venir d'un export relu ou d'une future
fonction du serveur.

La phrase dit l'**endroit**, jamais le texte : recopier un commentaire dans cet
écran le sortirait de la conversation où il a été écrit.

#### Deux prudences conservées, une limite assumée

**Un nom contenu dans un autre est écarté.** Si la mémoire porte « Profondeur »
et « Profondeur hors gel », un texte qui dit la seconde ne propose pas la
première. Le prix est connu — un texte qui cite les deux à deux endroits perd la
plus courte — et il est le bon sens : un rapprochement manqué se voit et se
rattrape, un rapprochement faux couvre en silence.

**Les mots entiers valent toujours.** « Vent » ne se reconnaît pas dans
« éventuel », ni « Sol » dans « solive ». C'est la même fonction qui le tient
pour un avis de contrôle et pour un compte rendu.

**Une valeur écrite dans le texte ne reconnaît pas son nom.** « À Chamonix »
nomme la *valeur* de la localisation, pas la localisation. La reconnaissance
porte sur les noms de la mémoire et s'arrête là : lire les valeurs accrocherait
« Chamonix » sur une rue, un nom de personne ou une marque. C'est une limite
**assumée et testée**, pas un oubli — et c'est elle qu'il faudra lever pour lire
« à Chamonix » comme une localisation.

#### Ce qui a été trouvé en cassant

Deux morceaux de code mort, retirés : `nomsDunTexte` refiltrait les versions
remplacées alors que l'index de la mémoire les écarte déjà (règle 4), et la
garde du texte vide était tenue par `nommeEntierement` — elle ne fait qu'épargner
la construction de l'index, et le commentaire le dit maintenant.

Et une convention violée, attrapée par sa propre garde : le fichier s'appelait
`ce-que-le-sujet-nomme.js`. « Sujet » est le mot de l'écran ; le code dit
« point ». Le test qui tient cette ligne est tombé sur la ligne d'import.

### Étape 2 de la capitalisation — le cul-de-sac devient une porte

#### Ce qu'on ne peut pas deviner

Reconnaître un nom, c'est le trouver **dans la mémoire**. Un nom qui n'y est pas
est donc introuvable par construction : le système ne peut pas signaler une
valeur manquante, seulement offrir de la nommer.

Et c'est justement le moment le plus intéressant. « Profondeur hors gel :
l'entreprise annonce 0,60 m » n'accroche rien précisément parce que la mémoire
ne sait pas encore ce qu'est une profondeur hors gel. L'écran disait « aucun nom
de la mémoire reconnu » et s'arrêtait là.

#### La porte, et pourquoi elle reste ouverte

Elle est sous la liste des propositions, et elle y est **toujours** — pas
seulement quand la reconnaissance échoue. Un sujet peut nommer trois valeurs
connues et en apporter une quatrième ; n'offrir le geste qu'en cas d'échec le
ferait dépendre d'un hasard.

```
Ce sujet apporte-t-il une valeur que la mémoire ne connaît pas encore ?
                                                   [ Proposer une valeur ]
```

#### Supposée, jamais acquise

Ce qu'un sujet ouvert avance n'est pas un fait du projet : c'est ce que
quelqu'un dit, et le débat n'est pas tranché. La ligne entre en
`NATURE.HYPOTHESE` / `STATUT.SUPPOSE`, et sa provenance dit d'où elle vient — le
sujet, son auteur, sa date.

La faire entrer comme acquise ferait l'inverse de ce que ce sujet existe pour
faire : elle réglerait le débat en l'ouvrant.

Elle **ne cite pas** le sujet comme l'ayant tranchée. `reference` porte l'arête
aval — « cette valeur vient de ce débat-là » — et le débat est ouvert : l'écrire
ferait lire la valeur comme tranchée par un sujet qui n'a rien tranché (règle 6).

#### Le lien se fait après, et par le nom

Une fois la proposition signée, le nom est dans la mémoire. Si le sujet le porte
dans son titre, sa description ou un commentaire, **la reconnaissance de l'étape
1 l'accroche d'elle-même** — c'est pour cela que la fenêtre invite à reprendre
les mots du sujet, et c'est le seul mécanisme, pas un second.

#### Elle propose, elle ne verse pas

`preparerUneProposition`, la même porte que la décision d'une fermeture. Rien
n'entre dans la mémoire sans une proposition signée (règle 1), et le service qui
prépare les lignes ne parle pas à la base.

Un refus dit **pourquoi** : « sans nom, la valeur ne se retrouvera jamais dans la
mémoire », jamais « champ obligatoire » — un refus qu'on ne comprend pas se
contourne au lieu de se corriger. Et la fenêtre **ne se ferme pas** sur un champ
vide : ici le geste *est* la valeur, et renoncer en silence ferait croire qu'on a
proposé.

#### Un nom de signature, un seul endroit

Fermer un sujet signait « par Ourdine Ferrand » depuis une fonction locale à
`project-subjects-actions.js`. Proposer une valeur devait signer pareil — et
reconstruire ce nom ailleurs en aurait fait deux, qui auraient fini par ne pas
tomber sur le même repli (règle 10). Il vit maintenant dans
`services/nom-de-qui-parle.js`, pur, et les deux écrans le lisent.

### Étape 3 de la capitalisation — le raisonnement porte enfin ses entrées

#### Ce qui s'écrivait déjà, et ce qu'il taisait

Fermer un sujet « comme réalisé » verse **deux** choses depuis longtemps : la
décision, et un `NATURE.RAISONNEMENT` qui porte les cinq étapes du chemin. Le
mécanisme était complet ; deux étapes sur cinq partaient vides, et le code de
fermeture l'avouait en commentaire :

> Ce qu'on ne sait pas d'ici — sur quelles valeurs le débat portait, ce qu'il a
> regardé — reste vide et **se dit**.

Sauf qu'on le savait. Les arêtes amont étaient là, confirmées une par une par
des humains, et le raisonnement s'enregistrait en disant « on ne sait pas sur
quelles valeurs il portait ».

```
Avant                                   Après
SUJET      Profondeur hors gel : …      SUJET      Profondeur hors gel : …
PORTE SUR  on ne sait pas…              PORTE SUR  Altitude = 742,30
EXAMINE    on ne sait pas…                         Nature du sol = moraine
DÉCISION   … = 0,69 m                   EXAMINE    on ne sait pas…
PRODUIT    … = 0,69 m                   DÉCISION   … = 0,69 m
                                        PRODUIT    … = 0,69 m
```

Ce sont les **entrées** du raisonnement — ce que ma réponse de stratégie appelait
« les noms » —, et c'est ce qui manquait pour qu'un raisonnement se relise, puis
se rapproche d'un autre.

#### Confirmées seulement

`ceQueCePointMetEnDebat` ne rend que les arêtes qu'un humain a déclarées.
`surQuoiCePointPorte` rend aussi les **proposées**, et c'est ce qu'il faut à
l'écran — qui les montre justement pour qu'on réponde. Mais un raisonnement qui
dirait « ce débat portait sur ces quatre valeurs » en comptant deux
rapprochements de mots que personne n'a relus enregistrerait, pour toujours, une
machine à la place d'un humain (règle 1).

Une garde le tient dans les deux sens : ce qui est proposé n'entre pas, et la
fermeture n'a pas le droit d'importer `surQuoiCePointPorte`.

#### Lues au moment de fermer

Et pas gardées d'avant : entre l'ouverture de l'écran et la fermeture, quelqu'un
a pu confirmer ou retirer une arête, et un raisonnement qui enregistrerait l'état
d'il y a dix minutes serait faux pour toujours (règle 6).

Une lecture ratée ne retient pas la fermeture : le raisonnement dira alors qu'il
ne sait pas — ce qui est exact — plutôt que de faire échouer un geste demandé.

#### Ce qui reste creux, et pourquoi

**`EXAMINE`** — ce qui a été regardé — reste vide et nommé. Ce seraient les
documents joints à la discussion, et les lire demande de traverser les messages :
un document joint à un échange `ephemeral` appartient à une conversation avec le
copilote, et son seul **nom de fichier** ne doit pas reparaître devant les
collaborateurs. C'est faisable, avec la même garde qu'à l'étape 1, et c'est la
prochaine étape plutôt qu'un oubli.

#### Une garde sur le texte de la source, et pourquoi c'est légitime ici

Un champ qu'on oublie de passer ne se voit **nulle part** : le raisonnement
s'écrit, la proposition part, l'étape reste creuse, et rien ne tombe. C'est
exactement le défaut invisible pour lequel lire la source vaut quelque chose.

La première version de cette garde cherchait la présence du bon nom — un alias à
l'import la laissait passer. Elle vérifie maintenant l'**absence** de l'autre
lecture, ce qui est la chose qu'on veut vraiment savoir.

### Étape 4 de la capitalisation — voir les raisonnements, et ce qui leur ressemble

#### Les voir

Le filtre **Mémoire → Raisonnements** existait et se remplissait déjà — la
fermeture d'un sujet en verse un depuis longtemps. Mais il rendait des lignes
**ordinaires**, et deux choses n'allaient pas.

Un raisonnement n'affirme rien : sa seule valeur possible est sa question. La
règle générale du titre écrivait donc :

```
Quelle profondeur retenir ? : Quelle profondeur retenir ?
```

**Une ligne ne se dit pas deux fois** : quand la valeur répète le sujet, seul le
sujet s'écrit. La correction est générale et pas particulière aux
raisonnements — une ligne qui se redit n'apprend rien, quelle que soit sa nature.

Et tout ce que la fermeture enregistre — sur quoi le débat portait, ce qu'il a
tranché, ce qu'il a posé — restait dans la charge, invisible. La ligne dessine
maintenant **le chemin des cinq étapes**, celui du détail d'un sujet et pas un
second (règle 10).

#### Ce qui leur ressemble

`raisonnements-qui-se-ressemblent.js` compare des **noms**, jamais du texte ni
des valeurs.

Une question est du texte libre : deux personnes n'écriront jamais la même, et un
modèle qui les rapprocherait produirait une ressemblance qu'on ne peut ni
vérifier ni expliquer. Ce qui est stable, c'est ce qu'un raisonnement **met en
jeu** : les noms de ses entrées, les noms de ce qu'il pose.

```
signature = { entrées: {altitude, nature du sol}, conclusions: {profondeur hors gel} }
```

« Altitude » compte ; « 742,30 » ne compte pas. Deux projets ne partagent jamais
leurs valeurs, ils partagent leurs **formes de raisonnement** — et c'est très
exactement la frontière de l'anonymat : la structure se réutilise, les valeurs ne
sortent jamais du projet.

#### Exact, ou rien

| degré | ce que c'est |
|---|---|
| **le même** | mêmes entrées, mêmes conclusions |
| **le même départ** | mêmes entrées, conclusions différentes |

Pas de « partage deux noms sur trois » : un seuil est un chiffre qu'on ne sait
pas justifier, et un rapprochement qu'on ne sait pas expliquer est un
rapprochement qu'on cesse de lire. La même doctrine que la reconnaissance des
noms, sur un autre objet.

Trois refus tiennent :

- **un raisonnement sans entrée ne se rapproche de rien** — deux signatures vides
  se déclareraient identiques, ce qui est le faux rapprochement type (règle 5) ;
- **une version remplacée ne se propose pas** — elle se relit dans l'histoire de
  la ligne, pas comme un rapprochement à faire aujourd'hui ;
- **la phrase dit le fait** — « part des mêmes valeurs » —, jamais « c'est le
  même raisonnement » : ce qui est vérifié, ce sont les noms mis en jeu, pas
  l'intention de celui qui l'a écrit.

#### « L'ancien était…, il a été remplacé par… »

Rien de nouveau : la chaîne `supersedes` marche pour un raisonnement comme pour
une valeur, et la ligne porte déjà « remplacée le … ». C'était le but de tout ce
qui précède, et cela ne demandait aucune mécanique de plus.

### Le chemin n'a plus de trou — « Examine » se remplit

#### L'étape qu'on avait laissée creuse

Le raisonnement portait quatre étapes sur cinq. La cinquième — **ce qui a été
regardé** — restait vide et le disait. C'était exact, et c'était dommage : quand
on débat d'une profondeur de fondation, l'étude géotechnique est jointe au fil,
et c'est précisément ce qu'on est allé lire.

```
Avant                                   Après
PORTE SUR  Altitude = 742,30            PORTE SUR  Altitude = 742,30
           Nature du sol = moraine                 Nature du sol = moraine
EXAMINE    on ne sait pas…              EXAMINE    etude-geotechnique.pdf
DÉCISION   … = 0,69 m                              releve-topographique.pdf
PRODUIT    … = 0,69 m                   DÉCISION   … = 0,69 m
                                        PRODUIT    … = 0,69 m
Ce raisonnement ne dit pas tout : …     (plus rien : le graphe est entier)
```

#### Trois refus, et le premier est celui qui compte

**Une pièce jointe à un échange avec le copilote ne se montre jamais.** Ces
conversations sont privées par construction, et le **seul nom de fichier** d'un
document qu'on y a déposé suffirait à trahir ce qui s'y est dit. C'est la règle
de l'étape 1, et c'est la **même fonction** qui la tient — `messageLisible` :
une seconde lecture de la confidentialité finirait par ne pas refuser la même
chose (règle 10).

**Un dépôt que personne n'a posté ne compte pas.** Une pièce sans `message_id`
est un envoi en cours : le fichier existe, personne ne l'a mis dans la
discussion. Dire « on a examiné ceci » d'un brouillon serait faux.

**Un message qu'on n'a pas lu ne se juge pas.** Si les messages manquent, on ne
peut pas savoir lesquels étaient privés — et montrer dans le doute est exactement
ce qu'on ne fait pas. L'étape reste alors creuse et le dit (règle 5).

#### La confidentialité ne descend pas dans le SQL

La requête rend **tout**, y compris les pièces des échanges privés ; c'est le
service qui refuse. Une garde écrite en SQL serait invisible aux tests, et une
garde qu'on ne peut pas voir tomber n'est pas une garde. Un test vérifie que la
requête ne filtre pas elle-même — c'est le seul moyen d'empêcher cette prudence
de glisser au mauvais endroit à la prochaine correction.

Et la porte ne demande que ce qui sert : le nom du fichier et les deux marques
qui décident. **Pas le chemin de stockage** — il n'est pas une information de
projet, et le faire voyager jusqu'à un écran qui ne l'ouvre pas serait le sortir
sans raison.

#### Une ceinture qui n'en est qu'une

En cassant, `messages === null` dans l'orchestrateur de la fermeture s'est révélé
redondant : le service refuse déjà une liste de messages absente, et c'est **là**
que la ligne tient. La vérification reste — une seconde ceinture ne coûte rien —
mais le test dit maintenant où vit la prudence, et il éprouve `null` autant que
`[]`.

### Avant de trancher, ce qu'on a déjà raisonné

#### Une phrase trop optimiste, corrigée

L'étape 4 disait que « l'ancien raisonnement était…, remplacé par… » ne demandait
rien de plus, la chaîne `supersedes` marchant déjà. C'était vrai en principe et
faux en pratique : la clé d'un raisonnement est `raisonnement:<question>`, et
**deux sujets n'écrivent jamais la même question**. Le remplacement ne se
déclenche donc jamais.

Et il ne faut pas le forcer. Faire périmer un raisonnement par un autre de même
**signature** serait destructeur : « profondeur hors gel au bâtiment A » et « au
pignon nord » partent des mêmes valeurs et sont vrais tous les deux. Une
signature partagée est une invitation à regarder, pas une péremption.

#### Le moment où la capitalisation sert vraiment

Ce n'est pas en relisant la mémoire — c'est **en fermant un sujet**. On sait
alors sur quoi le débat portait, et on ne sait pas encore ce qu'on va trancher.
Une fois la décision écrite, il est trop tard pour en tenir compte.

```
Qu'avez-vous tranché ?

  ┌──────────────────────────────────────────────────────────────┐
  │ Le projet a déjà raisonné 2 fois à partir des mêmes valeurs : │
  │ Quelle profondeur hors gel au bâtiment A ?                   │
  │   → Profondeur hors gel = 0,69 m      12 mars 2026           │
  │ Profondeur de fondation au pignon nord ?                     │
  │   → Profondeur hors gel = 0,50 m      4 novembre 2025        │
  └──────────────────────────────────────────────────────────────┘

La question tranchée   [ Profondeur hors gel : l'entreprise annonce 0,60 m ]
Ce qu'on retient       [                                                  ]
```

C'est la question que la stratégie annonçait : « votre raisonnement se
rapproche-t-il de celui-ci ? Voici ce qui avait été retenu… ».

#### Il informe, il ne pré-remplit rien

**Aucun champ** n'est rempli à partir de ce qu'on montre. Reprendre d'un clic la
décision d'avant ferait signer une décision que personne n'a reprise, et une
décision recopiée est pire qu'une décision absente (règle 1). Une garde compte
les champs pré-remplis : il y en a **un**, le titre du sujet, comme avant.

#### Le départ, et seulement le départ

Les conclusions ne sont pas encore prises : on ne peut comparer que les entrées.
`ceQuiLesRapproche` dirait « le même » dès que les deux n'aboutissent à rien —
une ressemblance fabriquée par le calendrier. `raisonnementsPartisDeCesValeurs`
ne compare donc que le départ, et le dit.

Deux signatures vides ne se répondent pas : c'est le seul cas où le refus des
entrées vides tient tout seul, et la garde l'éprouve précisément là.

#### Ce qu'on ne montre pas

L'auteur du raisonnement d'avant. Le nommer demanderait une lecture des profils
de plus, au moment précis où l'on retient quelqu'un devant une fenêtre. La date
suffit à situer ; la ligne complète se lit dans la Mémoire.

### Reconnaître une valeur, pas seulement un nom

#### La limite qu'on lève

L'étape 1 avait posé une limite, assumée et testée : « à Chamonix » nomme la
**valeur** de la localisation, pas la localisation, et la reconnaissance ne
lisait que les noms. C'est pourtant la manière la plus naturelle d'écrire un
compte rendu — personne n'écrit « Localisation : Chamonix » dans une phrase.

```
« Dans la ville de Montholon (89110), les fondations ont une profondeur
  hors gel de 0,69 m. »   (description)
« Le sol est une moraine compacte. »   (commentaire)

→ Profondeur hors gel   Son nom apparaît dans la description de ce sujet.
→ Localisation          Sa valeur « Montholon (89110) » apparaît dans la description.
→ Nature du sol         Sa valeur « moraine » apparaît dans un commentaire.
```

#### C'est la reconnaissance la plus dangereuse

Un nom de la mémoire est un nom : « Profondeur hors gel » ne se trouve pas par
hasard dans un texte. Une valeur, si — « C », « 3 », « A2 » sont partout, et
« Montholon » peut être une rue. Un rapprochement faux couvre en silence, et
c'est ici qu'on risquerait d'en produire beaucoup.

D'où **quatre refus**, tous exacts, aucun réglable au jugé :

| refus | ce qu'il écarte |
|---|---|
| trop courte | « C », « A2 », « XF3 » — les codes, qui sont partout |
| portée par plusieurs noms | « C » pour « Classe de sol » **et** « Classe d'exposition » : vraie ambiguïté |
| qui est aussi un nom | elle se reconnaît déjà par l'autre porte, la seconde fois serait fausse |
| sur des mots entiers | « argile » ne se reconnaît pas dans « argileux » |

Le seuil de longueur n'est pas un chiffre nouveau : `sujetQuiContient` en portait
déjà un, avec exactement la même justification — « CF », « L », « S » sont des
codes de mission, pas des noms. Il est maintenant **exporté** et lu aux deux
endroits : deux seuils finiraient par ne pas protéger de la même chose
(règle 10).

#### Le nom l'emporte sur sa valeur

« Localisation : Chamonix » nomme deux fois la même chose. Le proposer deux fois
ferait répondre deux fois à une seule question — et le nom est la reconnaissance
la plus sûre.

#### Seules les versions qui portent cette valeur

Pas toutes celles du nom : le texte a écrit une valeur, et proposer les autres
reviendrait à mettre en débat ce dont il n'a pas parlé.

Et la valeur s'affiche **telle que la mémoire l'écrit** — « Montholon (89110) »,
pas « montholon (89110) ». Le repli sert à comparer, pas à montrer.

#### Le bloc n'annonce plus rien, parce que chaque ligne le dit

Il a porté successivement « le nom X apparaît dans le titre », puis « dans ce
sujet ». Les deux sont devenus faux, et pour la même raison : une annonce qui
vaut pour tout le bloc ne peut plus dire vrai de chaque ligne, dès lors que
celles-ci sont reconnues de deux façons différentes.

Chacune porte donc sa propre phrase, exacte — « Son nom apparaît… » ou « Sa
valeur « Montholon » apparaît… » —, et le bloc se contente de dire où regarder :
**« La mémoire se reconnaît dans ce sujet. Chaque ligne dit ce qui l'a fait
remonter. »**

`nomCommun` a disparu avec l'annonce : il répétait ce que les lignes disent mieux
(règle 4). C'est la troisième fois que cette phrase de tête ment ; elle ne dit
plus rien qu'une ligne puisse contredire.

### Ce qui peut sortir du projet

#### La seule chose qui se capitalise vraiment

Deux projets ne partagent jamais leurs valeurs. L'altitude du collège est
742,30 ; celle de la médiathèque ne l'est pas, ne le sera jamais, et savoir la
première n'aide en rien sur la seconde.

Ce qu'ils partagent, c'est la **forme** du raisonnement :

```
altitude + nature du sol  >  profondeur hors gel
```

Celle-là se retrouve sur cent chantiers. Elle s'apprend, elle se cherche, elle
dit à quelqu'un qui n'a jamais ouvert ce projet : *quand tu auras à trancher une
profondeur hors gel, va chercher l'altitude et la nature du sol.* C'est le
référentiel de formes de raisonnement, et il n'emporte aucune valeur.

#### La frontière est dans la structure, pas dans un filtre

**Les noms voyagent. Les valeurs, jamais.** « Altitude » est le vocabulaire du
métier ; « 742,30 » est ce projet-ci.

Cette ligne ne se tient pas par un nettoyage — un nettoyage s'oublie, se contourne,
et laisse passer ce qu'il n'a pas prévu. Elle se tient parce que
`services/forme-dun-raisonnement.js` **ne lit que des noms**. Il n'y a pas de
chemin, dans ce fichier, par lequel une valeur pourrait sortir : il n'en prend
aucune.

Et **la question ne voyage pas non plus**. « Quelle profondeur hors gel au
bâtiment A du collège de Montholon ? » est du texte libre : elle porte un lieu,
un ouvrage, parfois une personne. C'est la chose la plus tentante à emporter —
elle se lit si bien — et la plus dangereuse. C'est celle qu'une garde surveille
nommément.

#### Ce qu'aucune règle ne peut garantir, et ce qu'on fait à la place

Un nom **peut** être propre à un projet : « Hauteur sous plafond du bureau de la
directrice » est un nom, et il ne doit pas sortir. Aucune règle mécanique ne
distingue cela d'un nom de métier, et prétendre le contraire serait le genre de
promesse qui discrédite un produit une seule fois.

Le fichier ne décide donc pas seul. Il **prépare une forme et la montre en
entier**, pour qu'un humain voie exactement ce qui partirait avant que quoi que
ce soit parte. C'est la règle 1 appliquée à la sortie du projet : *rien ne sort
sans une proposition signée*, comme rien n'entre sans elle.

Les trois refus ci-dessous ne sont donc pas la sécurité. Ils allègent le travail
de celui qui signe.

| refus | ce qu'il écarte | pourquoi |
|---|---|---|
| un nom qui est une partie de l'ouvrage | « Bâtiment A », « Pignon nord » | ils ne veulent rien dire ailleurs |
| un nom qui est une valeur du projet | « moraine » comme nom d'entrée | il désignerait ici ce qu'il vaut là-bas |
| sans entrée, ou sans conclusion | une forme qui part de rien | « on n'a rien conclu » ne se réutilise pas |

Et le refus porte sur **la forme entière**, jamais sur le seul nom fautif :
retirer un nom en silence donnerait une forme qui n'a jamais existé, et personne
ne pourrait plus la relire pour la corriger.

#### L'empreinte se lit

`altitude + nature du sol > profondeur hors gel` se compare d'un projet à
l'autre aussi bien qu'un condensat, et se **relit**. Une empreinte qu'on ne sait
pas lire est une empreinte qu'on ne sait pas contrôler avant de la laisser
partir — et le seul moment où le contrôle est possible, c'est avant.

#### La phrase se passe d'articles

« altitude et nature du sol donnent profondeur hors gel » plutôt que « de
l'altitude et de la nature du sol ». Les articles demanderaient de connaître le
genre de chaque nom : les deviner les écrirait faux une fois sur trois, et les
tenir dans une liste ferait de ce fichier un dictionnaire à maintenir. Les noms
se posent tels que la mémoire les a, et la phrase se construit autour.

#### À l'écran, le même cadre que le chemin

L'encadré se replie, et porte le cadre partagé `details-bloc` — celui de « Par où
l'on est passé », juste au-dessus. Deux cadres différents feraient croire à deux
natures de choses, alors que ce sont deux lectures du même raisonnement.

Replié parce que c'est une lecture de contrôle, et non ce qu'on vient chercher.
Entier une fois ouvert, parce qu'on ne signe pas un résumé.

Quand la forme ne peut pas sortir, **l'encadré reste et dit pourquoi**. « Forme
non exportable » n'apprend rien et ne se corrige pas ; « un de ses noms est une
partie de l'ouvrage » se vérifie d'un coup d'œil. Un encadré qui disparaîtrait
en silence se lirait comme un raisonnement qui n'a rien à apporter.

#### Ce que cette étape ne fait pas encore

**Rien ne part.** Il n'y a ni table, ni export, ni recherche d'un projet à
l'autre. Ce qui est posé, c'est la forme et la preuve qu'elle ne contient rien
du projet — et c'était l'ordre à tenir : livrer un chemin de sortie avant que
l'anonymat soit prouvé aurait mis le produit en jeu sur une promesse invérifiée.

#### Les gardes, et ce qui tombe quand on les casse

| ce qu'on casse | ce qui tombe |
|---|---|
| la question part avec la forme | *rien du projet ne se retrouve dans ce qui part*, *la question ne voyage jamais* |
| les valeurs partent avec les noms | six gardes, dont les deux refus de noms |
| la portée part avec la forme | *rien du projet ne se retrouve dans ce qui part* |
| ce qui a été regardé part avec | *rien du projet ne se retrouve dans ce qui part* |
| l'encadré n'est jamais appelé | *la ligne d'un raisonnement montre ce qui pourrait voyager* |
| la forme est préparée sans la mémoire | la même — aucun refus ne serait plus possible |
| le refus se tait | *quand elle ne peut pas partir, l'écran dit pourquoi* |
| l'écran ajoute la question à l'encadré | la sonde de navigateur, `fuites` |

La dernière ligne dit la division du travail : la garde de service éprouve ce que
le service produit, la sonde éprouve ce que l'écran **affiche**. Ajouter un champ
à la forme ne change rien à l'écran — qui ne dessine que quatre lignes nommées —
et la sonde ne le voit pas ; c'est la garde de service qui le voit. Ajouter une
ligne à l'écran ne change rien à la forme, et c'est la sonde qui le voit. Aucune
des deux ne remplace l'autre.

### Le référentiel des formes : la sortie, et le retour

#### La question qui justifie tout

La forme existait et se montrait. Rien ne la faisait voyager, donc rien n'en
tirait encore le seul bénéfice qui compte :

> *J'ai à trancher une profondeur hors gel. Ailleurs, d'où part-on ?*

La réponse — « de l'altitude et de la nature du sol » — vaut pour quelqu'un qui
n'a jamais ouvert cet autre projet, parce qu'elle ne contient rien de cet autre
projet.

#### Deux tables, et c'est la séparation qui fait l'anonymat

`reasoning_forms` **n'a aucune colonne pour dire d'où elle vient.** Pas de
`project_id`, pas de `signed_by`, pas de `created_by`. Ce n'est pas une politique
qu'on pourrait desserrer un jour : c'est la forme de la table. Lire le
référentiel entier ne dit pas quel projet a versé quoi, parce que l'information
n'y est pas.

`reasoning_form_contributions` porte ce lien — projet, raisonnement, signataire —
et **ne se lit que par les membres du projet**, avec la politique des faits de
contexte, mot pour mot.

Une seule table qui aurait porté les deux aurait obligé à choisir : ouverte, et
le référentiel dit qui ; fermée, et il ne sert plus à personne.

#### L'empreinte est calculée par le serveur, jamais reçue

Le client envoie des noms ; un déclencheur les replie, les ordonne, les
dédoublonne et compose la chaîne. `leVersementDuneForme` **n'envoie pas
d'empreinte du tout**, et une garde le vérifie.

Trois raisons :

1. **Rien ne peut s'y cacher.** Un champ libre à côté des noms serait un endroit
   où glisser autre chose. Celui-ci est écrasé.
2. **Deux clients ne peuvent pas créer deux fois la même forme.** « Nature du sol
   + Altitude » et « altitude + nature du sol » se replient sur la même chaîne, et
   l'unicité les confond (règle 4).
3. Le repli est celui de `memoire-identifiants.js`. Le client envoie donc déjà
   des noms repliés, et le déclencheur ne fait rien — il est là pour ce qui n'est
   pas ce client-là.

#### Ce qui est versé ne se reprend pas, et on le dit avant

Une forme versée a pu être lue par un autre projet la seconde d'après. La
retirer ne la retirerait de la tête de personne. **Il n'y a donc pas de chemin de
suppression** — ni politique `delete` en base, ni fonction dans le transport, et
une garde vérifie qu'il n'en apparaît pas.

Ce qui se retire est la **signature** : « ce projet-ci l'a versée » est une
information privée, et elle s'efface. `retire_le` la marque plutôt que de
supprimer la ligne — un constat ne devient pas faux (règle 6), et l'unicité doit
continuer d'empêcher un second versement.

L'écran ne les confond pas : *« La forme, elle, reste : d'autres projets ont pu
la lire. »* Et la porte à sens unique se dit **avant** le clic, pas après.

#### Le geste est sous la forme entière, et nulle part ailleurs

Un bouton « verser » posé en haut d'une liste ferait signer sans regarder. Sa
place **est** la garantie : la signature se donne devant ce qu'on signe, déplié,
en entier. Une garde compte les endroits où le geste apparaît, et il y en a un.

Et la forme se **recalcule** au clic, à partir de l'affirmation. L'écrire dans
l'attribut du bouton en ferait une seconde vérité (règle 4) : elle vieillirait à
côté de celle qu'on a montrée, et l'on signerait pour ce qui n'est plus affiché.

#### « Ailleurs, on part aussi de… » ne se replie pas

Tout le reste de ce bloc est une lecture de contrôle, qu'on ouvre quand on veut
vérifier. Cette phrase-là est l'inverse : c'est **ce qu'on est venu chercher sans
le savoir**, et une phrase qu'il faut déplier pour lire est une phrase que
personne ne lit. Elle est donc sur la ligne, visible, avant l'encadré — et une
garde vérifie l'ordre des deux.

#### Elle dit un fait, jamais un reproche

« Ailleurs, on part aussi de la pente du terrain » se vérifie. « Vous avez oublié
la pente du terrain » serait un jugement sur un raisonnement que le référentiel
ne connaît pas : peut-être la pente a-t-elle été regardée puis écartée, peut-être
ne s'applique-t-elle pas ici. Le référentiel n'en sait rien, et il ne fait pas
semblant.

#### Rien ne redescend dans la mémoire

L'interdit fondateur, dans l'autre sens. **On ne verse RIEN directement dans la
mémoire**, et surtout pas ce qui vient d'un autre projet. Il n'existe donc, ni
dans le service, ni dans l'écran, aucune fonction qui produise une affirmation,
une proposition ou une valeur à partir d'une forme lue.

Ce qu'on apprend d'ailleurs, c'est **où regarder**. C'est au projet de regarder,
puis de proposer, puis de signer — comme pour tout le reste.

#### Ne pas savoir, et le dire

`view.formes` à `null`, c'est une lecture qui a échoué. Alors :

- la phrase « ailleurs » ne s'affiche pas — dessiner « rien ne se fait autrement »
  ferait d'une panne de réseau une affirmation sur le métier (règle 5) ;
- le geste ne se propose pas — offrir de verser sans savoir si c'est déjà fait
  ferait signer deux fois, la base refuserait la seconde, et l'on croirait la
  première perdue ;
- et l'encadré **dit pourquoi** : « Le référentiel n'a pas pu être lu. »

#### Ce que cette étape ne garantit pas

Qu'un nom soit anonyme. « Hauteur sous plafond du bureau de la directrice » est
un nom, il passera, et aucune règle en base ne peut l'en empêcher. C'est pourquoi
la sortie se signe devant la forme entière affichée : la garantie est là, et elle
est humaine. La base garantit seulement que **rien d'autre que des noms** ne peut
entrer.

#### Deux gardes qui ne sont pas tombées, et ce qu'on en a fait

**Un filtre mort.** `ceQuAilleursOnRegarde` écartait d'abord la forme elle-même
par son empreinte. Cassé, rien ne tombait — parce que ses entrées *sont* les
siennes, et que le retrait de ce qu'on regarde déjà les enlève de toute façon. Le
filtre est parti, et le commentaire dit ce qui protège vraiment.

**Une garde qui ne distinguait pas deux règles.** « Une forme se reconnaît par
son empreinte » passait encore quand on reconnaissait par les seules entrées : le
référentiel d'essai n'avait aucune paire capable de les départager. Une forme y a
été ajoutée — mêmes entrées, autre conclusion —, et la garde tombe.

#### Les gardes, et ce qui tombe quand on les casse

| ce qu'on casse | ce qui tombe |
|---|---|
| ce qu'on regarde déjà se propose comme nouveau | trois gardes, dont *ce qu'ailleurs on regarde* |
| ce qui aboutit ailleurs remonte quand même | trois gardes |
| un référentiel non lu devient un référentiel vide | *un référentiel non lu ne dit pas que personne ne fait autrement* |
| une signature retirée compte encore | *une signature retirée ne fait plus dire « versée »* |
| l'empreinte part avec le versement | deux gardes, dont *le serveur la compose* |
| on verse sans signataire | *rien ne sort sans signataire* |
| une forme creuse part quand même | *une forme vide ne part pas* |
| la reconnaissance ne lit plus que le départ | *une forme se reconnaît par son empreinte* |
| la phrase juge le raisonnement | *elle dit un fait, pas un reproche* |
| la phrase « ailleurs » n'est jamais appelée | *la ligne dit ce qu'ailleurs on regarde* |
| elle passe dans le bloc replié | la même — l'ordre est vérifié |
| le geste quitte la forme dépliée | *le geste est sous la forme entière* |
| la forme signée voyage dans le HTML | *elle se recalcule au clic* |
| on propose le geste sans avoir lu | *sans lecture, l'écran ne propose rien* |
| le transport sait supprimer une forme | *rien ne redescend du référentiel* |

Et quatre états à l'écran, éprouvés par une sonde de navigateur qui monte le vrai
module : à verser, versée, signature retirée, référentiel non lu. Aucune fuite du
projet dans le bloc, dans aucun des quatre.

### La fenêtre de fermeture sait ce qu'on sait

#### Le moment, et pourquoi c'est celui-là

Le référentiel n'était consulté qu'en relisant un raisonnement **déjà versé** —
c'est-à-dire trop tard. Le seul instant où il peut changer quelque chose est
celui où l'on n'a pas encore écrit : la fenêtre de fermeture.

#### On interroge par le départ, pas par la conclusion

La conclusion est ce qu'on s'apprête à écrire : on ne l'a pas. Le départ, si —
ce sont les valeurs que le sujet met en question, et les arêtes confirmées les
donnent. D'où `formesQuiPartentDe`, le miroir de `formesQuiAboutissentA`, et la
phrase qu'il porte :

> **En partant de ces valeurs, ailleurs, on a tranché classe d'exposition,
> profondeur hors gel.**

**Une seule valeur commune suffit.** Exiger toutes les entrées ne ferait remonter
que les raisonnements déjà identiques — c'est-à-dire ceux qui n'apprennent rien.

**Un départ vide ne remonte rien.** Un sujet dont aucune arête n'est confirmée ne
part de rien de connu ; répondre là ferait remonter le référentiel entier, ce qui
ne renseigne sur rien.

Et elle ne pré-remplit aucun champ. « Ailleurs on a tranché une classe
d'exposition » dit où regarder, pas quoi écrire : peut-être la question ne se
pose-t-elle pas ici.

### Le copilote écrit le brouillon de la fermeture

#### Pourquoi on pré-remplit ici, après avoir refusé de le faire ailleurs

Le rappel « voici comment on avait raisonné la dernière fois » ne remplit
délibérément rien : reprendre d'un clic **la décision de quelqu'un d'autre**
ferait signer une décision que personne n'a reprise.

Ce que le copilote écrit n'est pas cela. C'est **ce sujet-ci, relu** : son titre,
sa description, ses commentaires. Rien n'y est repris d'ailleurs, rien n'y est
décidé — c'est de la mise en forme de ce qui est déjà écrit. Et le recopier à la
main à la fin d'une journée est le meilleur moyen de ne pas le faire du tout,
donc de tout perdre.

#### Deux portes humaines, et le copilote n'en franchit aucune

Le brouillon tombe dans les champs d'une fenêtre qu'un humain relit et corrige.
Ce qui en sort est une **proposition**, que quelqu'un signe. La règle 1 tient
sans aménagement : le copilote remplit un brouillon devant quelqu'un.

#### Ce qui rendrait cela dangereux, et ce qui l'empêche

**Ne pas le voir.** Un champ pré-rempli sans marque se signe comme un champ qu'on
a écrit soi-même. Chaque champ rempli par le copilote porte donc un liseré tant
qu'on n'y a pas touché, et un bandeau le dit en toutes lettres. La marque tombe à
la première frappe : une ligne corrigée à la main ne vient plus du copilote, et
lui laisser l'aveu ferait relire deux fois ce qu'on a écrit soi-même.

#### La garantie n'est pas dans la consigne

« N'invente aucun chiffre » est un vœu. Le contrôle est dans
`_shared/fermeture-du-modele.js`, testé en Node : **tout groupe de caractères
portant un chiffre** doit se retrouver tel quel dans le fil. « 0,69 m », « R+2 »,
« C25/30 » — inventés, ils trompent tous de la même façon.

**Le découpage ne suit pas la ponctuation de nombre.** Couper sur la virgule
rendrait « 0 » et « 69 » séparément, et « 0,69 » inventé passerait parce que
« 69 » figure ailleurs. Seule la ponctuation de phrase coupe, et les points ou
virgules de fin sont retirés — sans quoi « 0,69. » ne se retrouverait pas.

**Le chiffre se cherche tel quel, jamais replié.** Replier les deux côtés ferait
de « 0,69 » la chaîne « 069 », qu'une matière parlant du repère « 1069 »
contient : un nombre jamais écrit passerait parce qu'un autre le contient.

**Et le refus porte sur le brouillon entier.** Vider le seul champ fautif
laisserait les autres en place — or on vient de découvrir que le modèle invente,
et rien ne dit qu'il n'a inventé qu'une fois. Pire : un champ vide au milieu d'un
brouillon rempli invite à le compléter de mémoire, c'est-à-dire avec ce que le
modèle venait d'écrire.

Quand il est écarté, **la fenêtre le dit** : « le copilote a écrit un chiffre qui
ne figure nulle part dans ce sujet (0,80) ». Le taire ferait croire qu'il n'a
rien trouvé, et l'on recommencerait.

#### La conversation avec le copilote ne part jamais

C'est l'interdit qui compte le plus. Un échange avec le copilote est **privé** :
il ne se montre pas aux collaborateurs du projet, et il ne s'envoie pas davantage
à un modèle pour qu'il en fasse un brouillon qu'ils liront.

La règle n'est pas recopiée dans `brouillon-de-fermeture.js` : la matière passe
par `textesDuPoint`, qui l'applique via `messageLisible` — lequel refuse aussi
les messages effacés. Une seconde copie finirait par ne plus dire la même chose
que la première (règle 10), et c'est la copie oubliée qui laisserait fuir. Une
garde vérifie que le mot `ephemeral` **n'apparaît pas** dans ce fichier.

#### L'instruction vit au serveur, et nulle part ailleurs

Elle est dans `supabase/functions/brouillon-de-fermeture/`. Le navigateur envoie
`{project_id, matiere}` et rien d'autre : ce qu'on demande au modèle ne se lit
pas avec F12, et une instruction envoyée par le client ferait de cette fonction
Edge un relais ouvert vers un modèle payant. Une garde cherche `instructions`,
`system`, `prompt`, « RÈGLE ABSOLUE » dans le fichier du navigateur, et exige
qu'ils n'y soient pas.

#### Les trois lectures se font ensemble

Le rappel du projet, le référentiel, le brouillon. En série, la fenêtre ferait
attendre trois fois, en fin de journée. Et chacune se tait toute seule : aucune
ne peut faire échouer les deux autres ni empêcher de fermer un sujet.

#### Deux gardes existantes ont fait leur travail

**Le compte des champs pré-remplis.** « Un seul champ est pré-rempli, et c'est le
titre » protégeait le rappel contre toute reprise. Le compte ne dit plus rien
depuis que le copilote remplit ; la garde a été **réécrite pour dire ce qu'elle
protégeait** — `dejaVus` n'est lu qu'à un seul endroit du corps de la fenêtre, et
cet endroit ne fabrique pas de champ.

**Le nom d'une nature de consommation.** « Toute nature déposée par une fonction a
son nom à l'écran » est tombée à la seconde où la fonction Edge a déposé
`brouillon-de-fermeture`. Elle a un nom.

#### Deux gardes neuves ne sont pas tombées, et ont été réparées

**Le pli des deux côtés.** Le jeu d'essai ne contenait aucun cas où un nombre
replié se retrouve dans un autre nombre. Ajouté — « 0,69 » contre « repère
1069 » —, la garde tombe.

**Un tableau au lieu d'un objet.** `[]` est un objet pour JavaScript : le modèle
rendant `[{...}]` s'entendait dire qu'il avait oublié la question, au lieu qu'il
n'avait pas répondu dans la forme attendue. Les deux motifs envoient chercher des
choses différentes ; ils sont maintenant distincts.

#### Les gardes, et ce qui tombe quand on les casse

| ce qu'on casse | ce qui tombe |
|---|---|
| le contrôle des chiffres disparaît | six gardes |
| seuls les champs « valeur » sont contrôlés | trois gardes |
| on coupe aussi sur la virgule et le point | quatre gardes |
| on vide le champ fautif au lieu de refuser | six gardes |
| on replie les deux côtés avant de comparer | *le chiffre se cherche tel quel* |
| une question vide passe | deux gardes |
| le refus ne montre plus le chiffre en cause | *le refus montre le chiffre* |
| un tableau devient un brouillon | *une réponse qui n'est pas un objet est dite illisible* |
| la matière lit les messages bruts | quatre gardes, dont *la conversation ne part jamais* |
| les étiquettes disparaissent | *le titre, la description et les commentaires partent, étiquetés* |
| le client compose l'instruction | *aucune consigne ne vit dans le navigateur* |
| le refus remonte sans sa raison | *le refus du contrôle remonte jusqu'à la fenêtre* |
| un champ rempli ne porte plus sa marque | *un champ rempli par le copilote porte sa marque* |
| la marque reste après correction | *la marque tombe dès qu'on touche au champ* |
| les trois lectures se font en série | *la fenêtre reçoit les trois lectures* |
| le référentiel se consulte par la conclusion | *il se consulte par le départ* |
| une lecture ratée devient une phrase | la même |
| la garde de confidentialité est recopiée | *elle n'est pas recopiée ici* |
| on exige toutes les entrées communes | *une seule valeur commune suffit* |
| un départ vide fait remonter tout le référentiel | *sans valeur de départ, la question ne se pose pas* |
| on lit le départ au lieu de la conclusion | deux gardes |

Et quatre états à l'écran, éprouvés par une sonde qui monte le vrai module : sans
rien, avec le référentiel, avec le brouillon, avec un brouillon écarté. Dans le
troisième, la correction d'un champ fait tomber **sa** marque et elle seule.

### Le référentiel se visite

#### Ce qui manquait

On le **rencontrait** — une phrase sur une ligne de mémoire, une phrase dans la
fenêtre de fermeture — et l'on ne pouvait pas le visiter. « Que sait-on
trancher ? » n'avait aucun endroit où se poser.

#### Un cinquième écran sans projet

Sous « Tous les sujets », « Toutes les propositions », « Tous les projets » et le
Copilote. C'est le seul des cinq qui ne rassemble pas ce qui existe dans chaque
chantier : il montre **ce qu'ils ont en commun**.

Son nom, sa route et son icône vivent dans `ecrans-transversaux.js`, comme les
quatre autres — une entrée est dite au menu, à la route et au titre, et recopiée
elle finit par différer de l'une des trois (règle 10).

#### L'index, pas la liste

Une liste brute de formes est un fichier. Ce qu'on vient demander à un
référentiel, c'est **« que sait-on trancher, et avec quoi ? »** — donc la
conclusion est l'entrée de l'index, et les départs viennent sous elle.

**Les départs se réunissent, ils ne se comptent pas deux fois.** Trois projets
qui tranchent une profondeur hors gel en partant de l'altitude font *une* ligne
« altitude ». Le compte des formes reste dit à part : « 2 manières » se lit, et
ne se confond pas avec « 2 fois la même ».

**Le plus su d'abord, et à égalité l'ordre du nom.** Sans le second critère,
l'ordre serait celui de la lecture, et deux lectures de la même table ne
donneraient pas la même page.

#### La recherche cherche sur un morceau de nom

« profond » doit trouver « profondeur hors gel ». C'est l'inverse de la
reconnaissance d'un nom dans un texte, où chercher sur un morceau serait faux —
« argile » ne se reconnaît pas dans « argileux ». Ici quelqu'un tape ce dont il
se souvient, et exiger le mot entier d'un champ de recherche fait une recherche
qui ne trouve rien.

Elle lit les départs, les conclusions et les domaines — c'est-à-dire tout ce que
le référentiel contient. Ce qu'elle ne peut pas trouver, c'est ce qui n'y est
pas.

**Les domaines se comptent sur ce qui est montré**, pas sur le référentiel
entier : laisser « charpente · 2 » au-dessus d'une liste qui n'en porte aucune
ferait chercher une ligne qui n'y est pas.

#### L'écran ne verse rien et ne retire rien

Une forme sort d'un projet, devant le raisonnement dont elle est tirée, avec la
signature de quelqu'un : c'est là que le geste a un sens. Un bouton posé ici
ferait signer une forme qu'on ne regarde pas. Une garde vérifie que cet écran
n'appelle ni `verserUneForme`, ni `retirerMaSignature`, ni
`leVersementDuneForme`.

Et rien n'en redescend dans une mémoire. Ce qu'on apprend ici, c'est où regarder.

### La ressemblance se desserre, et se montre

#### Ce qui était refusé, et pourquoi on le rouvre

« Exact, ou rien » : mêmes entrées, ou rien. La raison était bonne — « partage
deux noms sur trois » est un seuil, et un rapprochement qu'on ne sait pas
expliquer est un rapprochement qu'on cesse de lire.

Le prix l'était moins : sur de vrais intitulés, l'égalité stricte ne trouve
presque jamais rien. Un outil qui ne rapproche jamais rien n'est pas prudent, il
est muet.

#### Ce qui le rend acceptable n'est pas le seuil

C'est que **la phrase nomme les valeurs communes** :

> Un autre raisonnement part de 2 des mêmes valeurs : altitude, nature du sol.

Cela se vérifie d'un coup d'œil, et se **réfute** d'un coup d'œil. Un
rapprochement qui dit sur quoi il repose ne couvre rien en silence : le lecteur
voit ce que l'outil a vu, et décide. C'est la seule raison pour laquelle ce
troisième degré est acceptable — sans les noms, « proche » est un verdict opaque.

#### Deux, et pas un

Un seul nom en commun est le cas ordinaire, pas le cas remarquable : presque tout
raisonnement de fondation part de la nature du sol. Le proposer ferait remonter
la moitié de la mémoire à chaque ligne, et l'on cesserait de lire la mention — y
compris les fois où elle dit « le même ».

Deux est le premier chiffre qui distingue. Il n'est pas juste dans l'absolu : il
est **le plus petit qui ne noie pas le reste**, et c'est tout ce qu'on lui
demande.

#### L'exact passe toujours devant

Le même, puis le même départ, puis les proches — les plus proches d'abord.
Mélangés, le seul rapprochement qui compte se perdrait au milieu des autres.

Et les valeurs communes **voyagent avec le rapprochement** : les recalculer à
l'écran ferait deux lectures de la même chose, et l'une finirait par ne plus dire
ce que l'autre dit (règle 4).

#### Une garde qui disait le contraire, et ce qu'on en a fait

« Une entrée de plus ou de moins ne se rapproche pas » énonçait la règle qu'on
vient de changer. Elle n'a pas été supprimée : elle a été **réécrite en deux**,
qui disent la nouvelle — l'une pour ce qui se rapproche désormais et le nomme,
l'autre pour ce qui ne se rapproche toujours pas, avec la raison du seuil. Une
garde qu'on efface parce qu'elle gêne est une garde qu'on n'avait pas comprise.

#### Les gardes, et ce qui tombe quand on les casse

| ce qu'on casse | ce qui tombe |
|---|---|
| le seuil tombe à une seule valeur | *une seule valeur en commun ne se rapproche pas* |
| l'approché passe devant l'exact | deux gardes |
| entre deux approchés, l'ordre est quelconque | *le plus proche d'abord* |
| la phrase ne nomme plus les valeurs communes | *un rapprochement approché nomme ce sur quoi il repose* |
| la phrase ne dit plus combien | la même |
| les valeurs communes ne voyagent plus | *entre deux approchés, le plus proche d'abord* |
| les valeurs communes ne sont plus triées | la même |
| l'index range par le départ | deux gardes |
| les départs se comptent en double | deux gardes |
| l'index ne trie que sur le compte | *à égalité, l'ordre du nom* |
| l'index range le moins su d'abord | *le plus su d'abord* |
| un référentiel non lu a un index vide | *il n'a pas un index vide* |
| la recherche exige le mot entier | *elle trouve sur un morceau de nom* |
| la recherche ne lit pas le domaine | *elle lit aussi le domaine* |
| une recherche vide cache tout | *une recherche vide ne cache rien* |
| chercher sans lecture rend une liste vide | *cela ne rend pas une liste vide* |
| un domaine absent devient un domaine | *l'absence de domaine ne s'invente pas* |
| la page range par le départ | deux gardes |
| la recherche ne restreint plus la page | deux gardes |
| ce qu'on tape ne reste pas dans le champ | *ce qu'on a tapé reste dans le champ* |
| la barre disparaît quand rien n'est trouvé | *la recherche reste à l'écran* |
| non lu devient vide | *un référentiel non lu ne se dit pas vide* |
| le compte se colle aux départs | *le compte se dit à part* |
| les domaines inventent leur pastille | *ils réutilisent celle de la Mémoire* |
| les domaines comptent tout le référentiel | *ils comptent sur ce qui est montré* |
| l'identifiant d'une forme s'affiche | *rien du projet n'est à l'écran* |
| l'écran du référentiel sait verser | *il ne verse rien et ne retire rien* |
| le routeur oublie le référentiel | *chaque adresse du menu a son écran* |
| l'entrée de menu disparaît | *le menu général ouvre le référentiel* |

Et cinq états à l'écran, en 1200 px et 640 px, éprouvés par une sonde qui monte
le vrai module de page : rempli, cherché, rien trouvé, non lu, vide. Aucune fuite
du projet, aucun débordement.

### « Examine » lit aussi ce qu'on cite sans le joindre

#### La dernière dette de l'étape 1

L'étape « ce qui a été examiné » ne voyait que les **pièces jointes**. Or un
document du corpus n'est presque jamais joint au fil : il y est **nommé**. « Cf.
l'étude géotechnique G2 » est la phrase ordinaire, et l'étape restait vide.

#### Un nom d'un seul mot ne se reconnaît pas

« Notes.pdf » a pour racine « notes », qui est un mot de la langue. Le
reconnaître dans « les notes de calcul de l'entreprise » produirait un
« examiné » que personne n'a fait — et un faux « on a regardé ceci » couvre en
silence, ce qui est la faute qu'on refuse partout ici.

Un nom d'un seul mot ne se cherche donc **qu'avec son extension** : personne
n'écrit « .pdf » par hasard. Deux mots suffisent à faire un nom — « étude
géotechnique » ne se rencontre pas par accident dans une phrase.

#### Sur des mots entiers, et jamais sur un fragment

« étude de sol » ne se reconnaît pas dans « étude de solidité ». C'est la règle
de toute reconnaissance de nom dans un texte, et le piège est celui-là : un nom
de document est souvent le début d'un autre. (C'est l'inverse de la recherche du
référentiel, qui cherche sur un morceau — on y tape ce dont on se souvient, ici
on lit un compte rendu.)

#### Deux documents du même nom ne se reconnaissent pas

Le texte en cite un, on ne sait pas lequel, et en désigner un serait un
rapprochement faux. Le même refus qu'ailleurs pour une valeur que deux noms
portent.

#### Il dit où il a été cité

« cité dans un commentaire », « cité dans la description ». C'est ce qui permet
de vérifier la reconnaissance d'un coup d'œil, en allant relire la phrase. « Au
corpus » n'apprendrait rien : on sait où est le corpus.

#### La conversation avec le copilote ne cite rien

La règle n'est pas réécrite : la lecture des textes passe par `textesDuPoint`,
qui l'applique par `messageLisible` — et qui refuse aussi les messages effacés.

#### Le corpus peut manquer sans que tout s'arrête

`null` donne `[]` chez l'appelant : on montre les seules pièces jointes, ce qui
est ce qu'on faisait, et l'on ne prétend nulle part que rien d'autre n'a été
regardé.

### L'année de travail, sur l'accueil

#### La question, et ce qu'on refuse d'en faire

« Qu'est-ce que j'ai fait cette année ? », posée à soi-même, sur son écran
d'accueil, et personne d'autre ne la lit. Ce n'est **pas** un indicateur de
performance, et le service n'a rien pour en devenir un : il ne compare personne à
personne, et il ne sort d'aucun compte.

#### Ce qui compte comme travail : un geste signé

Un geste qui **porte mon nom** et qui **laisse une trace que quelqu'un d'autre
peut relire**. Lire, naviguer, filtrer, chercher ne comptent pas : cela ne laisse
rien, personne ne peut le vérifier, et une mesure qu'on ne peut pas vérifier est
une mesure qu'on finit par ne plus croire.

| ce qui compte | pourquoi |
|---|---|
| une proposition que j'ai ouverte | elle porte mon nom, quelqu'un la relira |
| une **affirmation que j'ai signée** | c'est ce qui entre en mémoire — le geste le plus lourd |
| une discussion avec le Copilote | elle est mienne, et la base me la rend |
| une étude d'utilitaire remplie | idem |

**Aucune pondération.** Faire valoir une signature 3,5 discussions demanderait de
défendre le 3,5 ; on ne saurait pas, et l'on retoucherait le chiffre un jour au
hasard. Le même refus qu'ailleurs dans ce projet.

L'affirmation signée **manquait** aux traces : le classement des projets s'en
passe — signer se fait par à-coups, et compter des jours suffisait — mais une
carte de l'année ne peut pas ignorer le seul geste qui engage.

#### Ce qu'on ne compte pas, et qu'on dit

**Les dépôts de documents** : la table ne dit pas qui a déposé, et « le projet a
bougé » n'est pas « j'y ai travaillé ». **Les commentaires écrits sur un sujet** :
ils comptent, mais la colonne qui les rattache à un compte est facultative, et un
compte partiel se lirait comme un compte. On le dit plutôt que de faire semblant.

#### La teinte d'un jour : la décision, et sa révision

Un seuil fixe — 1 à 2, 3 à 5, 6 à 10, 11 et plus — est un chiffre qu'on ne sait
pas justifier, et il ne veut pas dire la même chose pour quelqu'un qui écrit vingt
commentaires par jour et pour quelqu'un qui signe une proposition par semaine.

La première règle écrite coupait les **jours actifs** en quatre groupes égaux.
Elle est fausse au bord, et c'est une garde cassée qui l'a montré : avec deux
jours actifs, **aucun des deux n'atteint jamais le dernier groupe**, et la légende
ment.

La règle retenue répartit les quatre teintes sur **les niveaux de charge** — les
nombres de gestes que les journées ont réellement pris, sans les doublons. Trois
propriétés en découlent, toutes trois éprouvées :

- le jour le plus chargé porte **toujours** la teinte la plus claire ;
- **répéter un jour ne change aucune teinte** — neuf journées à un geste puis une
  à deux, ce sont *deux* niveaux, pas dix ;
- **un seul niveau fait une seule teinte** : qui pose un geste par jour n'a pas de
  jour chargé, et la carte n'en invente pas.

Les jours à zéro ne comptent pas : les inclure ferait de quelqu'un qui travaille
deux jours par semaine un niveau de charge à zéro geste, et l'échelle se
tasserait sur le vide.

#### La forme : des semaines, parce qu'on y lit un rythme

Une colonne par semaine, sept lignes, **lundi en haut** — la semaine ISO, celle
que `activite-des-projets.js` découpe déjà. C'est la seule disposition où l'on
voit un rythme : une bande sombre en bas dit d'un coup d'œil qu'on ne travaille
pas le dimanche. Un ruban de 365 carrés à la file ne dirait rien de cela.

La première colonne se **troue en haut** quand la fenêtre ne commence pas un
lundi. La boucher en décalant les jours ferait passer un mercredi pour un lundi,
et la carte mentirait sur le rythme — ce qu'elle existe pour montrer.

#### Trois noms de jour à gauche

Sans eux, on voit un rythme sans savoir lequel : une bande sombre en bas peut
être le week-end, ou deux jours de la semaine où l'on ne fait rien. Lundi,
mercredi, vendredi suffisent à situer les quatre autres — sept étiquettes sur des
lignes de onze pixels se touchent, et l'on ne lit plus laquelle va où.

**Les sept lignes sont posées, y compris les muettes.** Ne rendre que les trois
nommées ferait remonter mercredi contre lundi : les noms désigneraient les
mauvaises lignes, et un repère faux est pire que pas de repère.

**Le nom entier et sa forme courte sont tous deux dans le balisage**, et c'est la
feuille qui choisit selon la largeur. L'écrire dans le CSS par `content:` ferait
vivre un nom de jour à deux endroits (règle 10) ; le calculer en JavaScript
demanderait de mesurer à chaque redessin ce qu'une requête de média sait déjà. Le
seuil est celui que la feuille emploie déjà ailleurs — aucune largeur nouvelle.

**La colonne des noms est hors du cadre qui défile.** Dedans, elle partirait avec
les semaines au premier geste de la souris, et l'on se retrouverait devant une
grille anonyme — ce que les noms existent pour éviter. Son retrait du haut est
celui des étiquettes de mois, pour que « lundi » tombe en face de sa ligne et non
du nom du mois : la sonde relit l'écart entre chaque nom et le centre de sa
rangée de carrés, et il est nul sur les sept.

#### La tête dit le total **et** les jours

« 1 478 gestes » ne dit pas si c'est trois jours ou trois cents, et c'est
précisément la différence qu'on veut lire. La carte dit aussi **ce qu'elle
compte**, en toutes lettres, sous le total.

#### Une année qu'on n'a pas lue n'est pas une année vide

`null`, et la carte dit « votre année n'a pas pu être lue » sans dessiner de
grille. Une grille toute grise dirait « je n'ai rien fait de l'année », ce qui est
une information — et fausse (règle 5). L'écran garde donc la lecture **brute** des
traces à côté de celle qui retombe sur `[]` pour le classement.

#### Une variable de style qui n'existait pas

Les quatre verts ont d'abord été écrits sur `--succes`. Le jeton s'appelle
`--success` : quatre carrés transparents, aucun test de Node pour le voir, et la
sonde de navigateur qui relit les **couleurs calculées** l'a attrapé. C'est la
deuxième fois qu'un jeton inventé passe la revue de code et tombe au navigateur.

#### Les gardes, et ce qui tombe quand on les casse

| ce qu'on casse | ce qui tombe |
|---|---|
| un nom d'un seul mot devient cherchable | deux gardes |
| la reconnaissance ne tient plus aux mots entiers | *sur des mots entiers* |
| un nom porté par deux documents est arbitré | *deux documents du même nom ne se reconnaissent pas* |
| un document retiré du corpus se reconnaît encore | *un document retiré ne se reconnaît plus* |
| les textes se lisent bruts (copilote compris) | quatre gardes |
| un nom trop court se cherche quand même | *les noms cherchables se disent* |
| la citation ne dit plus où elle a été vue | deux gardes |
| un document joint ET cité compte deux fois | *il ne compte qu'une fois, et garde sa place* |
| on répartit sur les jours, pas les niveaux | *répéter un jour ne change aucune teinte* |
| les jours vides entrent dans l'échelle | *les jours à zéro ne comptent pas* |
| les doublons restent dans l'échelle | *les niveaux retirent les doublons* |
| une échelle d'un seul niveau prend la dernière teinte | *une année d'un seul rythme est d'une seule teinte* |
| un jour sans geste prend une teinte | deux gardes |
| la fenêtre ne pose que les jours vus | cinq gardes |
| ce qui est hors fenêtre compte quand même | *ce qui tombe hors de la fenêtre est ignoré* |
| une année non lue devient une année vide | *une année non lue n'est pas une année vide* |
| la phrase ne dit plus le nombre de jours | deux gardes |
| la fenêtre devient l'année civile | sept gardes |
| la carte n'est pas appelée | deux gardes |
| la carte passe au-dessus de la question | *l'accueil la montre sous la question* |
| l'année sort de traces relues à part | *elle sort des mêmes traces que le reste* |
| « pas lu » devient « rien fait » | la même |
| la première colonne se décale au lieu de se trouer | deux gardes |
| la semaine commence le dimanche | deux gardes |
| le mois entamé de la 1re colonne s'étiquette | deux gardes |
| un mois s'écrit à chaque colonne | *un mois n'écrit son nom qu'une fois* |
| un jour vide n'a pas d'infobulle | *un jour vide se dit vide au survol* |
| la légende oublie la teinte grise | *la légende montre les cinq teintes* |
| une couleur est écrite dans le dessin | *aucune couleur n'est écrite dans le dessin* |
| une année non lue dessine sa grille | *elle ne dessine pas de grille* |
| seules les trois lignes nommées sont posées | *les sept lignes sont posées* |
| les noms passent dans le cadre qui défile | *ils sont hors du défilement* |
| la forme entière disparaît du balisage | *chaque nom est là en entier et en abrégé* |
| la forme courte disparaît du balisage | la même |
| on nomme mardi et jeudi | *trois jours sont nommés, un sur deux* |
| les noms passent après les semaines | *ils précèdent les semaines* |
| la colonne des noms perd son retrait de mois | la sonde, décalage de −14 px sur les sept lignes |
| le nom entier ne s'affiche jamais | la sonde, forme courte à 1400 px |

Et quatre états au navigateur, couleurs calculées relues : année chargée, année
d'un seul rythme, année vide, année non lue. Aucune teinte transparente, aucune
teinte confondue avec sa voisine, aucun débordement.

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
| la forme qu'un raisonnement peut emporter, et ses refus | `services/forme-dun-raisonnement.js` |
| l'encadré qui la montre en entier, replié | `renderCeQuiPourraitVoyager`, dans `views/project-memory.js` |
| les deux tables, et l'empreinte composée par le serveur | `202610150001_le_referentiel_des_formes.sql` |
| ce que le référentiel répond, et ce qu'il tait | `services/referentiel-des-formes.js` |
| les allers-retours, sans porte de suppression | `services/referentiel-des-formes-supabase.js` |
| « Ailleurs, on part aussi de… », visible sur la ligne | `renderCeQuAilleursOnRegarde`, dans `views/project-memory.js` |
| le geste de sortie, sous la forme entière | `renderLaSignatureDeLaForme` et `verserLaForme`, même fichier |
| la question posée par le départ | `formesQuiPartentDe` et `ceQuAilleursOnEnTire`, dans `services/referentiel-des-formes.js` |
| ce que le contrôle refuse d'un brouillon | `supabase/functions/_shared/fermeture-du-modele.js` |
| l'instruction au modèle, au serveur et nulle part ailleurs | `supabase/functions/brouillon-de-fermeture/index.ts` |
| le fil mis sous les yeux du copilote, sans sa conversation | `services/brouillon-de-fermeture.js` |
| les trois lectures, et la fenêtre qui les reçoit | `views/project-subjects/project-subjects-actions.js`, `views/ui/decision-du-sujet.js` |
| l'index de ce qu'on sait trancher, et la recherche | `ceQueLeReferentielSaitTrancher`, `formesQuiMentionnent`, `domainesDuReferentiel` |
| l'écran du référentiel, et sa page éprouvable | `views/le-referentiel.js`, `views/le-referentiel-page.js` |
| la cinquième façon de tout regarder | `LE_REFERENTIEL`, dans `services/ecrans-transversaux.js` |
| le troisième degré de ressemblance, et ce qui le rend lisible | `RESSEMBLANCE.PROCHE` et `valeursCommunes`, dans `services/raisonnements-qui-se-ressemblent.js` |
| les documents du corpus cités dans un texte | `documentsCitesParLePoint`, dans `services/ce-que-le-point-a-examine.js` |
| le corpus, réduit à ce qu'une reconnaissance demande | `services/corpus-du-projet-supabase.js` |
| ce qu'on compte comme travail, et la teinte d'un jour | `services/mon-annee-de-travail.js` |
| l'affirmation signée, quatrième trace | `GENRE.AFFIRMATION`, dans `services/projets-actifs.js` |
| la grille des cinquante-trois semaines, et ses noms de jour | `JOURS_NOMMES`, dans `views/ui/carte-de-lannee.js` |

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
| un versement se dit par son titre | il ne dit que son numéro | 1 test |
| le titre de la fusion l'emporte sur celui du brouillon | le brouillon l'emporte | 1 test |
| un versement non lu garde son numéro et n'invente rien | il invente un titre | 1 test |
| le versement d'à côté ne prête pas son titre | il le prête | 1 test |
| un refus se relit, avec qui et quand | il disparaît | 2 tests |
| une arête vivante ne se lit pas comme un refus | les deux se confondent | 2 tests |
| le refus d'un autre sujet ne remonte pas | il remonte | 2 tests |
| un refus qui vise une version inconnue ne se rend pas | il rend une ligne vide | 1 test |
| le refus le plus récent se lit en premier | l'ordre se perd | 1 test |
| un refus ne s'offre pas : aucun bouton | un bouton revient | 1 test |
| une pastille sans date n'écrit pas de blancs | elle les écrit | 1 test |
| la date du refus se lit en français | elle reste en ISO | 1 test |
| sans refus, le bloc ne s'écrit pas | il s'écrit vide | 2 tests |
| deux valeurs du même nom se rangent côte à côte | chaque version fait une colonne | 1 test |
| la même valeur à deux endroits n'est pas un débat | elle compte pour une opposition | 1 test |
| une portée citée deux fois ne se répète pas | elle se répète | 1 test |
| les noms partagés viennent en premier | ils se noient dans les autres | 1 test |
| une valeur sans nom ne se range nulle part | elle fait un titre vide | 1 test |
| le compte des valeurs se lit sur les données | il est écrit d'avance | 1 test |
| la phrase ne conclut pas à la contradiction | elle y conclut | 1 test |
| l'absence d'opposition se dit | elle se tait | 1 test |
| confirmer se voit : la ligne dit « en débat » | rien ne change à l'écran | 1 test |
| le bloc dit ce que le débat fait, et comment il finit | il se tait | 1 test |
| le geste confirmé s'appelle par son effet | il reprend « Écarter » | 2 tests |
| le tableau du débat se dessine | il disparaît | 2 tests |
| sans opposition, aucun tableau ne redouble la liste | il redouble | 1 test |
| une valeur sans portée dit l'ouvrage entier | elle laisse la case vide | 1 test |
| un échange avec le copilote n'est jamais lu | il est lu | 3 tests |
| la marque du copilote tient quelle que soit sa casse | une autre casse passe | 1 test |
| un message effacé ne parle plus | il parle | 2 tests |
| les commentaires d'un autre point ne se mêlent pas | ils se mêlent | 1 test |
| la description est lue même avec un titre | elle redevient un repli | 4 tests |
| les commentaires sont lus | ils ne le sont plus | 2 tests |
| tous les noms d'un texte remontent | un seul remonte | 2 tests |
| un nom contenu dans un autre est écarté | il revient | 2 tests |
| les mots entiers valent aussi ici | `includes` suffit | 1 test |
| les noms sortent du plus long au plus court | l'ordre s'inverse | 2 tests |
| un nom vu à trois endroits ne compte qu'une fois | il se dédouble | 5 tests |
| la phrase ne répète pas le même endroit | elle le répète | 1 test |
| une proposition dit où son nom a été vu | elle se tait | 2 tests |
| cet endroit se lit sans rien ouvrir | il descend dans le dépliant | 2 tests |
| sans endroit connu, rien ne s'invente | une phrase vide s'écrit | 1 test |
| un nom sans valeur et une valeur sans nom se refusent | l'un des deux passe | 4 tests |
| rien d'autre n'est exigé | le motif devient obligatoire | 1 test |
| un refus dit pourquoi | il dit « champ obligatoire » | 1 test |
| ce qu'un débat avance entre comme supposé | il entre comme acquis | 1 test |
| la provenance dit qui et quand | elle les perd | 1 test |
| elle ne prétend pas avoir été tranchée | elle cite le sujet en aval | 1 test |
| une seule ligne, pas une décision | une décision s'écrit à côté | 1 test |
| un sujet sans intitulé n'écrit pas de guillemets vides | il en écrit | 1 test |
| le pourquoi ne s'invente pas | il se comble | 1 test |
| un titre ne s'écrit pas à moitié | il s'écrit quand même | 1 test |
| « rien reconnu » n'est plus une fin de course | la porte disparaît | 4 tests |
| la porte reste ouverte même quand on a reconnu | elle ne s'ouvre qu'en cas d'échec | 2 tests |
| la porte se ferme pendant une écriture | elle reste armée | 2 tests |
| la porte dit ce qu'elle ouvre | elle se tait | 2 tests |
| le nom de qui signe se lit à un seul endroit | chaque écran le reconstruit | 4 tests |
| une arête proposée n'entre pas dans le raisonnement | elle y entre | 4 tests |
| un auteur fait de blancs ne confirme rien | il confirme | 1 test |
| une écartée ne revient pas par cette porte | elle revient | 2 tests |
| les arêtes d'un autre sujet ne remontent pas | elles remontent | 1 test |
| le raisonnement porte ce que le sujet mettait en débat | l'étape reste creuse | 1 test |
| la fermeture passe bien ces entrées | elle les oublie, en silence | 1 test |
| la fermeture ne lit pas ce que l'écran montre | elle le lit sous un alias | 1 test |
| la signature porte les noms, jamais les valeurs | elle emporte les valeurs | 5 tests |
| les noms se replient comme la mémoire les replie | deux replis divergent | 2 tests |
| mêmes entrées et mêmes conclusions : le même | les conclusions ne comptent plus | 2 tests |
| une entrée de plus ou de moins ne rapproche pas | un seuil s'installe | 1 test |
| un raisonnement sans entrée ne se rapproche de rien | il se rapproche de tout | 1 test |
| un raisonnement ne se rapproche pas de lui-même | il se trouve lui-même | 4 tests |
| une version remplacée ne se propose pas | elle se propose | 1 test |
| le plus proche vient en premier | l'ordre se perd | 1 test |
| la phrase dit le fait, pas l'identité | elle conclut à l'identité | 1 test |
| une ligne ne se dit pas deux fois | la question se répète | 1 test |
| la ligne dessine le chemin et ce qui lui ressemble | rien ne s'appelle, en silence | 3 tests |
| le chemin est celui du détail d'un sujet | l'écran en redessine un second | 1 test |
| une pièce jointe au copilote ne se montre jamais | elle se montre | 2 tests |
| une pièce à un message effacé ne se montre pas | elle se montre | 1 test |
| un dépôt que personne n'a posté ne compte pas | il compte | 1 test |
| un message qu'on n'a pas lu ne se juge pas | on montre dans le doute | 3 tests |
| une pièce retirée ne parle plus | elle parle | 1 test |
| les pièces d'un autre sujet ne remontent pas | elles remontent | 1 test |
| le même document ne compte qu'une fois | il compte deux fois | 1 test |
| une pièce sans nom ne fait pas de ligne vide | elle en fait une | 1 test |
| l'ordre d'arrivée se tient | il se perd | 1 test |
| le raisonnement porte ce qu'il a regardé | l'étape reste creuse | 1 test |
| la fermeture va lire ce qu'il a regardé | elle passe une liste vide | 2 tests |
| la confidentialité ne descend pas dans le SQL | elle y descend | 1 test |
| on retrouve ce qui part des mêmes valeurs | rien ne remonte | 2 tests |
| un départ différent ne remonte pas | il remonte | 1 test |
| le plus récent d'abord | l'ordre s'inverse | 1 test |
| deux signatures vides ne se répondent pas | deux ignorances font une ressemblance | 1 test |
| une remplacée ne se propose pas à la fermeture | elle se propose | 1 test |
| la fermeture va chercher ce rappel | la fenêtre s'ouvre sans lui | 1 test |
| la fenêtre dessine le rappel | elle ne le dessine pas | 1 test |
| le rappel ne pré-remplit aucun champ | il en remplit un | 1 test |
| une valeur du texte désigne son nom | elle ne désigne rien | 3 tests |
| une valeur trop courte ne désigne rien | elle désigne | 1 test |
| le seuil des valeurs est celui des noms | les deux divergent | 2 tests |
| une valeur portée par deux noms ne désigne rien | elle désigne le premier | 1 test |
| une valeur qui est aussi un nom se laisse à l'autre porte | elle passe deux fois | 1 test |
| les mots entiers valent pour les valeurs | `includes` suffit | 1 test |
| seules les versions de cette valeur se proposent | toutes celles du nom | 1 test |
| la valeur s'affiche comme la mémoire l'écrit | elle s'affiche repliée | 2 tests |
| le nom l'emporte sur sa propre valeur | les deux se proposent | 2 tests |
| la phrase dit par où on a reconnu | elle dit toujours « son nom » | 3 tests |
| une reconnaissance sans trace se tait | elle parle | 1 test |
| le bloc n'annonce plus de nom | il en réannonce un | 2 tests |
| le titre ne parle plus du même nom | il y revient | 2 tests |

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
| ce qu'un sujet a écarté, et qui se relit | `apps/web/js/services/point-porte-sur.js` |
| ce qu'un sujet met vraiment en débat | `apps/web/js/services/point-porte-sur.js` — `ceQueCePointMetEnDebat` |
| ce qui rapproche deux raisonnements | `apps/web/js/services/raisonnements-qui-se-ressemblent.js` |
| ce qu'un sujet a regardé | `apps/web/js/services/ce-que-le-point-a-examine.js` |
| ce qu'un sujet met en débat, et ce qui s'y oppose | `apps/web/js/services/ce-qui-se-debat.js` |
| tout ce qu'un sujet nomme, et où | `apps/web/js/services/ce-que-le-point-nomme.js` |
| tous les noms d'un texte | `apps/web/js/services/avis-liaison.js` — `nomsDunTexte` |
| toutes les valeurs d'un texte | `apps/web/js/services/avis-liaison.js` — `valeursDunTexte` |
| une valeur qu'un sujet apporte | `apps/web/js/services/valeur-depuis-un-point.js` |
| la fenêtre qui la demande | `apps/web/js/views/ui/valeur-du-sujet.js` |
| le nom sous lequel on signe | `apps/web/js/services/nom-de-qui-parle.js` |
| les cinq objets du langage | `docs/langage-mdall.md` |
| les règles dont tout dépend | `docs/fondamentaux.md` |
