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

## Étape 1 — La variable « Régime de sécurité incendie » *(faite)*

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

## Étape 2 — Chaque outil incendie déclare le régime qu'il sert *(faite)*

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

## Étape 3 — L'orchestration n'offre que ce qui s'applique *(faite)*

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

## Étape 4 — Ce qu'on ne sait pas, on le demande *(faite)*

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

## Étape 5 — La portée, et le défaut qu'elle révèle *(faite)*

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

## Étape 6 — Ce que l'écran dit *(faite)*

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

## Ce qui est fait, et où c'est écrit

**Étapes 1 et 2.** Elles se livrent ensemble parce que la seconde est inerte
sans la première : un agent qui déclare servir l'habitation ne sert à rien tant
qu'aucun projet ne dit de quel régime il relève.

| ce que c'est | où |
|---|---|
| le vocabulaire des régimes, en un seul endroit | `supabase/functions/_shared/utilitaires/regime-incendie.js` |
| sa copie au navigateur, au build | `scripts/prepare-utilitaires.mjs`, liste `PUBLICS` |
| le versement depuis l'étude habitation | `apps/web/js/services/incendie-versement.js`, `regimeVersable()` |
| le régime que l'agent habitation sert | `supabase/functions/_shared/utilitaires/catalogue.js`, champ `regimeIncendie` |
| la liste des agents incendie, **déduite** | `agentsIncendie()`, `regimeDeLAgent()`, même fichier |

**Le vocabulaire vit au serveur et se copie au navigateur.** Deux côtés en ont
besoin : le catalogue, qui dit quel régime chaque agent sert, et l'écran de
l'étude, qui verse la valeur et affichera ses choix. Écrit des deux côtés, il
divergerait au premier régime ajouté — et la divergence serait muette : un agent
déclaré `erp` que personne ne trouve, parce que l'écran écrit `ERP`.

**La valeur se lit sur le champ d'application, pas sur la famille.** L'article
1er tranche avant le classement : plancher bas du logement le plus haut à 50 m
au plus, l'arrêté s'applique ; au-delà, c'est un immeuble de grande hauteur.
C'est une qualification, elle est justifiée par un article, et elle est en amont
— exactement ce qu'il faut pour choisir un référentiel. Le classement, lui, est
la *sortie* du référentiel.

**Le régime part même quand le classement ne part pas.** « Hors champ — IGH » ne
dit rien d'une famille, mais il dit tout d'un référentiel : c'est précisément le
cas où savoir de quel texte le bâtiment relève change la suite du travail.

**Et un champ qu'on n'a pas su lire ne verse rien.** Un « hors champ » dont on
ignore la raison n'est pas un IGH — ce pourrait être un ERP, un lieu de travail,
ou une lecture qu'on n'a pas encore écrite (règle 5).

### Les gardes posées, et ce qu'on a cassé pour les voir tomber

Chacune a été vérifiée en cassant le code :

| la garde | ce qu'on a cassé | ce qui est tombé |
|---|---|---|
| un régime inconnu n'est pas rapproché du plus proche | `regimeValide` rapproche par préfixe | 2 tests |
| l'IGH se lit sur le champ d'application | la branche `igh` retirée | 2 tests |
| un champ illisible ne se range pas au plus proche | retour par défaut `"habitation"` | 1 test |
| hors champ, le régime part quand même | retour `[]` comme avant | 1 test |
| le régime se lit sur le champ, jamais sur la famille | déduction depuis le classement | 2 tests |
| le régime versé porte sa zone | portée vidée | 1 test |
| un agent qui parle d'incendie déclare son régime | `regimeIncendie` retiré du catalogue | 1 test |
| la liste des agents incendie est déduite, jamais écrite | liste d'identifiants en dur | 1 test |
| un régime illisible n'écarte rien | filtre strict sur une valeur vide | 3 tests |

L'avant-dernière ligne est **le test d'acceptation du plan** : pour chacun des
régimes du vocabulaire, le filtre se compare à ce que les agents déclarent. Une
liste d'identifiants écrite en dur donne le même résultat aujourd'hui — il n'y a
qu'un agent incendie —, mais elle rend cet agent-là pour `erp` aussi, et le test
le voit. Le jour où l'agent ERP arrivera, il suffira donc d'un fichier de plus.

### Un détail de construction que ça a révélé

`incendie-versement.js` importe désormais un module **copié au build**. Or
l'intégration continue lançait `npm test` avant `npm run build:web` : sur un
dépôt fraîchement cloné, le module n'existait pas encore et le fichier de tests
ne s'importait même pas. `package.json` porte donc un `pretest` qui prépare les
copies. Vérifié en supprimant `apps/web/vendor/utilitaires/` : sans lui, le
fichier tombe avec `ERR_MODULE_NOT_FOUND` ; avec lui, toute la suite passe.

---

## Étapes 3 et 4 : ce qui est fait, et la ligne qui attend

| ce que c'est | où |
|---|---|
| le régime que la mémoire du projet porte | `regime-incendie.js`, `regimeDeLaMemoire()` |
| les agents que ce projet peut appeler | `catalogue.js`, `agentsPourCeProjet()` |
| le filtre de la déclaration au modèle | `declarationsPourModele({ regimeIncendie })` |
| le régime transmis par la page | `copilote-service.js`, champ `fire_regime` |
| l'entrée `regimeIncendie` sur l'agent | `catalogue.js`, agent `incendie_habitation` |
| le refus quand le texte ne correspond pas | `regimeQuiNeCorrespondPas()` |

**Le modèle ne voit pas le mauvais agent.** Ce n'est pas une consigne dans le
prompt — une consigne se contourne —, c'est une liste plus courte. Les agents
sans régime ne sont jamais concernés, et rien n'est écarté quand on ne sait pas.

**D'où vient le régime, et pourquoi de là.** Le plan disait « la mémoire du
projet, que `project-copilot/index.ts` charge déjà ». C'était faux : la fonction
reçoit la mémoire **en prose**, pas les affirmations. La lire au serveur aurait
demandé une requête de plus à chaque question ; la parser dans le texte aurait
été fragile. La page, elle, a déjà les affirmations — elle vient de les envoyer.
Elle transmet donc le régime par le même canal et au même titre : une **valeur**
du projet, jamais un nom d'agent. C'est toujours le serveur qui décide ce qu'il
déclare.

**Une seule valeur, ou rien.** Deux zones qui se contredisent et une mémoire
muette rendent la même chose, et c'est voulu : les deux appellent la même suite —
on n'écarte aucun agent. Choisir l'un des deux régimes ferait répondre sur le
rez-de-chaussée une exigence calculée pour les étages (règle 5). La différence
entre les deux cas se lit sur `regimesDeLaMemoire`, qui rend la liste : c'est
elle qu'affichera l'étape 6.

### Le bon référentiel, ou rien

Un agent incendie déclare le régime qu'il sert ; l'entrée `regimeIncendie` dit
celui dont le bâtiment relève. Quand les deux diffèrent, le calcul aurait lieu et
rendrait une exigence juste, vérifiable, **tirée du mauvais texte** — le pire des
résultats. Le contrôle est dans `executerOutil`, et non dans chaque agent :
l'ajouter à chacun serait l'oublier au troisième.

L'entrée n'est **pas** une entrée d'aiguillage, contrairement à ce que le plan
prévoyait. `exigence` en est une parce qu'elle dit ce que le modèle est allé
chercher ; le régime, lui, **est** une donnée du bâtiment — une qualification
réglementaire. Il passe donc par le garde-fou des valeurs fabriquées comme les
autres : proposé sans appui, il est écarté et le calcul a lieu sans lui.

### Ce qui n'est pas fait : la question

Le plan veut que l'agent **demande** le régime quand le projet ne le porte pas.
L'entrée n'est pas encore `requis`, et c'est une décision :

1. **la réponse ne se verserait pas.** Seul l'écran de l'étude verse en mémoire.
   La question se reposerait à chaque conversation, indéfiniment — l'inverse de
   ce que promet le plan (« et la question ne se repose plus ») ;
2. **l'étude ne répond pas à cette entrée.** Le formulaire s'ouvrirait pour un
   bâtiment entièrement décrit dans l'Atelier, ce que `prefillDepuisLEtude`
   existe précisément pour éviter — trois gardes du dépôt le disent ;
3. **il n'y a qu'un référentiel.** La question n'a aujourd'hui qu'une réponse qui
   mène quelque part.

Ce qui protège déjà sans elle : le filtre n'offre pas l'agent d'un autre régime,
et le refus ci-dessus arrête le calcul quand le bâtiment relève d'un autre texte.
La rendre requise sera **un mot à changer**, le jour où la réponse donnée dans le
formulaire se verse — c'est-à-dire avec l'étape 5.

### Les gardes posées, et ce qu'on a cassé pour les voir tomber

| la garde | ce qu'on a cassé | ce qui est tombé |
|---|---|---|
| filtré, le modèle voit un seul agent incendie | le filtre les garde tous | 1 test |
| les agents sans régime ne sont jamais écartés | le filtre les écarte aussi | 1 test |
| un régime illisible n'écarte rien | il vide la liste | 1 test |
| le mauvais référentiel ne calcule pas | le refus est court-circuité | 1 test |
| l'entrée n'est pas un aiguillage | elle en devient un | 2 tests |
| la portée ne change pas le sujet | elle est lue comme un autre sujet | 2 tests |
| deux zones contradictoires ne tranchent pas | la première gagne | 1 test |
| une valeur remplacée ne route plus | elle route de nouveau | 1 test |
| la page envoie le régime | elle ne l'envoie plus | 1 test |
| le serveur le lit | il l'ignore | 1 test |

S'y ajoutent deux **vérifications croisées à l'exécution** : la clé de mémoire
est bien celle que `normalizeSubjectKey` produit du sujet, et le filtre des
valeurs remplacées fait bien ce que `currentAssertions` fait — deux règles
réécrites faute de pouvoir traverser la cloison, et tenues ensemble par un test.

Et la garde n° 3 du plan est posée : **aucun identifiant d'agent n'est écrit dans
l'orchestration**. On lit `project-copilot/index.ts` et
`executer-utilitaire/index.ts`, et l'on vérifie qu'aucun `id` du catalogue n'y
figure — le test refuse aussi de passer si le fichier n'a pas été lu.

---

## Étape 5 : la portée, et ce qu'elle a révélé

Ce défaut existait pour **toutes** les valeurs par zone, pas seulement pour le
régime incendie : `prefillDepuisMemoire` rangeait les affirmations par
`subject_key.split("@")[0]` et gardait **la première trouvée**. Deux classes de
sol en mémoire, et l'agent calculait sur celle qui se trouvait être arrivée
d'abord. Rien à l'écran ne disait qu'il y en avait une autre.

| ce que c'est | où |
|---|---|
| la portée remonte avec la valeur | `catalogue.js`, `prefillDepuisMemoire()` |
| la zone que la question désigne | `porteeDeLaQuestion()` |
| ce qu'on dit quand la mémoire répond deux choses | `phraseDesContradictions()` |
| la portée jusqu'à l'écran | `views/studio/copilote/provenance-lisible.js` |

**Trois règles, et la troisième est celle qui compte.**

1. **La portée remonte avec la valeur.** Sans elle, une réponse ne peut pas dire
   de quelle zone elle parle — et une réponse qu'on ne peut pas situer ne se
   conteste pas. Elle s'écrit désormais à côté de l'origine :
   « mémoire du projet · Escalier B ».
2. **Quand la question nomme une zone**, on ne retient que les affirmations de
   cette zone-là et celles de l'ouvrage entier. Les autres ne répondent pas à la
   question posée. La zone se lit dans la question parmi **les portées que la
   mémoire porte** : la liste des zones vit à l'écran, les portées des
   affirmations sont là, sous les yeux, et ce sont les seules qui puissent
   répondre. Accents et casse ne comptent pas ; une portée de deux lettres ne
   désigne rien, parce qu'un « A » se retrouverait dans la moitié des phrases.
3. **Quand plusieurs portées répondent des choses différentes, on ne pré-remplit
   rien — et on le dit.** C'est la seule règle qui distingue « je n'ai pas
   trouvé » de « j'ai trouvé deux choses contradictoires ». Le silence ferait
   passer la seconde pour la première, et l'on ressaisirait une valeur que le
   projet porte déjà, sans savoir qu'on tranche.

**Une zone ne l'emporte pas sur l'ouvrage entier**, et c'est délibéré. Le plus
spécifique gagne dans un fichier de styles ; sur un chantier, deux affirmations
qui se contredisent sont une question à poser, pas une priorité à appliquer.

Deux portées **d'accord** ne sont pas une contradiction : elles tranchent, et la
provenance les nomme toutes les deux — lire une seule ferait croire qu'on n'a lu
qu'une affirmation.

### Les gardes posées, et ce qu'on a cassé pour les voir tomber

| la garde | ce qu'on a cassé | ce qui est tombé |
|---|---|---|
| deux portées contradictoires ne pré-remplissent rien | la première trouvée gagne | 4 tests |
| la portée remonte avec la valeur | elle reste vide | 3 tests |
| la question sert à lire la zone | elle ne sert plus | 2 tests |
| l'ouvrage entier répond toujours | il est écarté | 1 test |
| deux portées d'accord tranchent | elles comptent pour une contradiction | 2 tests |
| une portée de deux lettres ne désigne rien | elle désigne | 1 test |
| ce qui manque dit pourquoi | le message se tait | 1 test |
| la portée s'écrit à l'écran | elle disparaît de la phrase | 3 tests |
| le séparateur ne s'écrit pas sans portée | il s'écrit quand même | 3 tests |
| une origine inconnue se dit telle quelle | elle disparaît | 1 test |
| toute origine du catalogue sait se dire | l'une perd son mot | 2 tests |

*Vérifié au navigateur* : les quatre provenances s'affichent sur une ligne, avec
et sans portée, avec la vraie feuille de style.

---

## Étape 6 : sur quoi la réponse repose, écrit une fois pour toutes

Un agent rend « CF 1 h » et le modèle l'écrit. Personne ne voit sur quelle
**qualification** ce degré a été calculé : quel classement, quel régime, pour
quelle zone, tranché quand. La réponse s'appuie alors sur une hypothèse que la
personne croyait peut-être abandonnée, et rien ne le dit. Sans cette étape, tout
le plan reste à moitié fait : le bon agent est choisi, mais on ne peut pas
**contester** le choix, faute de lire sur quoi il s'est fait.

Le résultat porte donc une phrase toute prête :

> Cette réponse repose sur ce que le projet affirme — Régime de sécurité
> incendie : habitation (Étages R+1 à R+4, tranché le 1er mars 2026) ; Nombre
> d'étages sur rez-de-chaussée : 3 (d'après l'étude du projet).

### Pourquoi une phrase, et pas des champs à recomposer

Le modèle recevait déjà `provenances` : il pouvait, en théorie, écrire cette
phrase. En théorie seulement — il la résumait, oubliait la portée, datait de
travers. C'est la leçon du récit du cerveau : **ce qui doit être dit exactement
se rend tout écrit**, et la consigne dit de le reprendre tel quel. Une phrase
qu'on paraphrase n'est plus une provenance.

### Ce qu'elle nomme, et ce qu'elle tait

Ce que le **projet** affirme : la mémoire, et l'étude de l'Atelier. Ce sont les
seules dont on puisse croire à tort qu'elles disent autre chose. Une valeur dite
dans la conversation est sous les yeux ; une valeur par défaut est déclarée ;
une valeur calculée en chemin est déjà dans `chaine`. Les nommer ici ferait
passer pour une affirmation du projet ce qui n'en est pas une — l'inverse du but.

L'étude se dit **comme une étude, et sans date** : une réponse d'étude n'a été
tranchée par personne, et lui donner une date la hausserait au rang de décision.

Et la **qualification d'abord** : le régime décide quel texte s'applique, donc il
décide de tout le reste. Le lire en troisième position le ferait lire en dernier.

### Le garde-fou reste dans le code

Une consigne se contourne : si le modèle omet la phrase, rien ne la dit. Ce qui
tient sans lui, c'est l'étape 5 — le tableau des entrées affiche la provenance
**et sa portée** pour chaque valeur, « mémoire du projet · Escalier B ». La
phrase est le complément rédigé ; le tableau est la garantie.

### Les gardes posées, et ce qu'on a cassé pour les voir tomber

| la garde | ce qu'on a cassé | ce qui est tombé |
|---|---|---|
| la phrase nomme la portée | elle disparaît | 2 tests |
| elle nomme le jour où c'était tranché | la date disparaît | 2 tests |
| la qualification vient en tête | le régime passe en dernier | 1 test |
| ce qui ne vient pas du projet n'y figure pas | tout y entre | 1 test |
| une étude se dit sans date | elle se date comme une décision | 1 test |
| une valeur absente ne se nomme pas | elle se nomme « ? » | 1 test |
| le premier du mois s'écrit « 1er » | il s'écrit « 1 » | 1 test |
| la phrase part au modèle | elle reste au serveur | 1 test |
| la consigne nomme le champ que le résultat porte | elle en nomme un autre, puis plus aucun | 2 fois 1 test |

La dernière est la garde du branchement : deux endroits écrivent ce nom — le
résultat qui le remplit, la consigne qui dit de le reprendre. Renommé d'un côté
seulement, il ne se voit nulle part : le modèle chercherait une clé absente et
rédigerait la provenance de mémoire, c'est-à-dire de travers.

---

## Le versement : ce que la conversation propose au projet

C'est ce qui manquait pour que le mot `requis` ait un sens. Un agent s'arrêtait
faute d'une valeur, l'écran la demandait, quelqu'un la donnait, le calcul avait
lieu — et puis **rien**. La valeur repartait avec la conversation, et la question
se reposait à la discussion suivante. On retapait la contrainte de sol, le
régime, la classe de sol, autant de fois qu'on ouvrait une discussion — et la
troisième saisie divergeait de la première.

| ce que c'est | où |
|---|---|
| ce que le projet pourrait retenir | `catalogue.js`, `aVerserAuProjet()` |
| ce qu'on en fait une proposition | `services/copilote-versement.js` |
| le bouton dans le fil | `views/studio/copilote/copilote.js` |

### Proposer, jamais verser

Rien n'entre dans la mémoire sans une proposition que quelqu'un relit et signe
(`docs/fondamentaux.md`, règle 1). Le bouton ouvre donc une proposition
**ouverte**, et l'on va là où la signature se donne. Une réponse de formulaire
écrite en douce serait une valeur de projet sans auteur — exactement ce que la
mémoire existe pour empêcher.

C'est aussi pourquoi la provenance est une **décision** : quelqu'un a tranché,
dans une conversation, à une date. Pas un calcul, pas une règle — une personne.

Un test lit le code et **casse la construction** si un chemin d'écriture y
apparaît, dans le service comme dans l'écran.

### Ce qui se propose, et ce qui ne se propose pas

Ce que quelqu'un a **dit** — dans le formulaire ou dans la question — et que le
projet **sait ranger**. Le reste n'a rien à faire là : ce qui vient de la
mémoire, le projet le porte déjà ; l'étude et l'enchaînement ont leur propre
chemin ; une valeur par défaut, personne ne l'a choisie ; une entrée
d'aiguillage dit ce que le modèle cherchait, pas ce que le bâtiment vaut.

Le tri appartient au **serveur**, comme `aRetenir` : c'est la déclaration des
entrées qui dit ce qui est une valeur de projet, et l'écran ne connaît plus les
agents.

### Le nom doit mener à la clé, et l'on dit quand il n'y mène pas

La proposition range un sujet sous `normalizeSubjectKey(sujet)` ; l'agent relit
sous la clé qu'il déclare. Quand les deux ne coïncident pas, la valeur entre en
mémoire **et la question se repose quand même** — le projet s'enrichit d'un sujet
que personne ne relit.

Deux entrées du catalogue sont dans ce cas : « H0 retenu pour le département »
se range sous `h0-retenu-pour-le-departement`, alors que l'agent relit
`h0-hors-gel`. Elles ne se proposent donc pas, et l'écran **le dit** : une valeur
écartée en silence se lit comme une valeur qui n'avait rien à donner (règle 5).

### Sans portée : l'ouvrage entier

Personne n'a désigné de zone en répondant à la question, et en choisir une à sa
place poserait la valeur là où elle n'a pas été dite. Si le projet en porte une
qui diffère, la lecture par portée — l'étape 5 — le verra et reposera la
question.

L'étude de l'Atelier, elle, demande la zone avant de proposer : elle en propose
quarante d'un coup, et la portée y change tout. Ici on propose une valeur ou
deux qu'on vient de dire ; deux fenêtres pour deux lignes feraient renoncer, et
l'on retaperait la valeur à la discussion suivante.

### Les gardes posées, et ce qu'on a cassé pour les voir tomber

| la garde | ce qu'on a cassé | ce qui est tombé |
|---|---|---|
| seul ce que quelqu'un a dit se propose | tout se propose | 3 tests |
| une entrée d'aiguillage ne se propose jamais | la règle saute | 1 test |
| ce qu'on ne sait pas ranger ne se propose pas | il se propose | 1 test |
| la liste part au navigateur | elle reste au serveur | 2 tests |
| le nom doit mener à la clé | il n'y mène plus | 1 test |
| la provenance est une décision | elle devient un calcul | 1 test |
| l'unité colle à la valeur | elle se perd | 1 test |
| aucun chemin ne mène à une écriture | le service nomme la porte de la base | 1 test |
| l'écran passe par une proposition | il n'en ouvre plus | 1 test |

*Vérifié au navigateur* : le bouton et la phrase de ce qu'on ne sait pas ranger,
avec la vraie feuille de style.

### Et `requis` ?

Une des trois raisons de ne pas le poser tombe : **la réponse se verse**, une
fois signée, et la question ne se repose plus. Les deux autres tiennent encore —
l'étude de l'Atelier ne répond pas à cette entrée, et il n'y a qu'un référentiel
incendie. La première se lèvera en dérivant le régime du **champ d'application**
que l'étude conclut déjà ; c'est la prochaine ligne.

---

## Le mot `requis` est posé : le plan est fini

Trois choses manquaient pour que la question soit tenable. Elles sont là.

**1. La réponse se verse.** Donnée dans le formulaire, elle se **propose** au
projet ; signée, elle entre en mémoire, et la question ne revient plus.

**2. L'étude répond à cette entrée.** L'article 1er tranche sur deux hauteurs que
le questionnaire de l'Atelier recueille déjà. On ne les relit pas à la main : on
**rejoue le module du référentiel**, qui porte la règle et son article. Recopier
le seuil ici en aurait fait une seconde version, et la seconde version est
toujours celle qu'on oublie de corriger (règle 4).

Quand le module ne conclut pas — une des deux hauteurs manque —, on ne rend
rien : un champ d'application qu'on n'a pas su établir ne se devine pas.

**3. Le libellé mène à une clé que l'agent relit.** C'était le défaut trouvé au
tour précédent : « H0 retenu pour le département » se rangeait sous
`h0-retenu-pour-le-departement`, et l'agent relisait `h0-hors-gel`. Les deux
entrées déclarent désormais cette troisième clé, et le navigateur accepte
**n'importe laquelle** des clés déclarées — un même fait s'écrit sous plusieurs
noms selon qui l'a établi, et l'agent les lit tous.

Un test balaie le catalogue et vérifie que **chaque** valeur qu'un agent relit se
propose sous un nom qu'il relit. Les douze entrées bouclent.

### Trois chemins remplissent la question avant qu'on la pose

La mémoire du projet, l'étude de l'Atelier, et ce que la conversation a déjà
établi. C'est ce qui fait qu'elle se pose **une fois** — et non à chaque
discussion, sur un bâtiment pourtant entièrement décrit.

### Ce que ça change pour un régime fabriqué

Il ne s'écarte plus en silence : l'écran le **demande**, avec ce que le projet
dit à côté de ce que le modèle propose. Écarté, le calcul se faisait sur le
régime de l'étude sans que personne ne voie qu'on avait proposé un autre texte.

### Deux fixtures complétées, aucune garantie affaiblie

L'étude de référence des tests porte maintenant les **deux** hauteurs de
l'article 1er : sans la seconde, le référentiel ne conclut pas son champ
d'application, et l'étude ne répond donc pas à tout ce qu'on lui demande. Et la
question de parc porte la qualification — qui ne décrit pas le bâtiment, mais dit
sous quel texte on calcule. Les assertions, elles, n'ont pas bougé.

### Les gardes posées, et ce qu'on a cassé pour les voir tomber

| la garde | ce qu'on a cassé | ce qui est tombé |
|---|---|---|
| le régime est requis | il redevient facultatif | 3 tests |
| le seuil vient du référentiel | il est recopié à la main | 1 test |
| l'étude remplit le régime | elle ne le remplit plus | 4 tests |
| toutes les clés partent au navigateur | une seule part | 1 test |
| le nom peut mener à n'importe laquelle | seule la première compte | 1 test |
| chaque entrée boucle | les deux libellés h0 ne bouclent plus | 1 test |

---

## L'ordre de fabrication

| | étape | ce qu'on peut livrer seul |
|---|---|---|
| 1 | ~~la variable et son versement (§ 1, § 5 pour l'écran)~~ **faite** | oui — elle enrichit la mémoire même sans routage |
| 2 | ~~le champ `regimeIncendie` sur l'outil habitation (§ 2)~~ **faite** | oui — inerte tant que § 3 n'est pas là |
| 3 | ~~le filtre de `declarationsPourModele` (§ 3) et l'entrée `regimeIncendie` (§ 4)~~ **faite** | oui — c'est le routage lui-même |
| 4 | ~~la portée dans `prefillDepuisMemoire` (§ 5)~~ **faite** | oui, et **indépendamment** : c'est un défaut qui existe déjà |
| 5 | ~~la provenance à l'écran (§ 6)~~ **faite** | oui |

Chaque ligne est une PR. La quatrième n'attend pas les autres : le défaut de
portée est là aujourd'hui, pour toutes les valeurs par zone.

## Comment on saura que c'est fait

Le jour où l'on ajoute l'agent ERP : un fichier, une ligne
`regimeIncendie: "erp"`, et **aucune autre modification**. Un projet classé ERP
voit le Copilote l'appeler sans qu'on ait rien dit ; un projet qui ne porte pas
la variable s'entend demander laquelle, une fois, et ne l'entend plus jamais.
