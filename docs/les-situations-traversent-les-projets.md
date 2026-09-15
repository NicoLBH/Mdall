# Les situations traversent les projets

**À quoi sert cette page :** le plan de fabrication pour qu'une situation cesse
d'appartenir à un projet et devienne ce qu'elle est — **le carnet d'une
personne**, qui suit ce qu'elle a à faire, où que ce soit.

Elle prolonge [`la-hierarchie-dun-compte-rendu.md`](la-hierarchie-dun-compte-rendu.md)
§ 6, où la direction avait été notée sans être instruite.

---

## 1. Le constat

Une situation est aujourd'hui une ligne d'un projet : `situations.project_id` est
`not null`, et la règle de lecture la rend à tous les collaborateurs. Deux
conséquences, et elles tirent dans des directions opposées.

**Elle est trop étroite.** L'entreprise GILETTO travaille sur quatre chantiers.
Ce qu'elle a à faire est réparti entre quatre projets, et il faut ouvrir les
quatre pour savoir ce qui l'attend cette semaine. Le bureau de contrôle, le
maître d'œuvre, le conducteur de travaux : tous ont ce problème, et c'est
exactement celui que `Projects` résout chez GitHub — une situation traverse les
dépôts.

**Et elle est trop large.** Une situation dit ce qu'une personne se donne à
faire, dans quel ordre, et ce qu'elle laisse de côté. C'est une **façon de
travailler**, pas un fait du projet. Aujourd'hui tout le monde la voit — et
c'est ce qui fait qu'on n'en crée pas : personne n'a envie d'exposer son
organisation de la semaine à douze collaborateurs.

Les deux se corrigent du même geste, parce que c'est le même malentendu : on
avait rangé dans le projet une chose qui appartient à une personne.

---

## 2. Ce qu'on retient

**Une situation appartient à quelqu'un, et à personne d'autre.**

- Elle porte un **propriétaire**, et la base ne la rend qu'à lui.
- Elle porte un **périmètre** : un projet, plusieurs, ou tous ceux où je suis.
- Elle n'apparaît plus dans le projet. L'onglet Situations d'un projet disparaît
  au profit d'un écran qui est à moi et qui les montre toutes.

> **Ce n'est pas un réglage de confidentialité, c'est un changement de nature.**
> Un réglage se coche et se décoche, et il finit par être coché de travers.
> Ici, une situation n'a **jamais** de lecteur autre que son auteur : il n'y a
> pas d'état du système dans lequel quelqu'un d'autre la voit.

### Les sujets, eux, ne changent pas de main

Une situation **désigne** des sujets ; elle ne les possède pas. Un sujet reste
du projet, visible de tous, avec son fil et son histoire. Ce qui devient privé
est **le fait que je l'aie mis dans mon carnet** — et rien d'autre.

C'est la distinction à ne jamais perdre : rendre la situation privée ne doit
pas rendre le sujet invisible à son assigné.

---

## 3. Le garde-fou, et pourquoi il est le sujet de ce plan

Le confinement des lectures d'Atelier a déjà appris une chose, et elle vaut ici
au centuple : **la séparation est tenue par la base, ou elle n'est pas tenue.**
Un écran qui filtre est une politesse d'affichage ; il suffit d'une requête
oubliée, d'un export, d'un écran neuf écrit six mois plus tard.

Trois exigences, et aucune n'est négociable.

1. **`owner_id` posé par la base**, jamais par le client. Demander à celui-ci de
   l'envoyer, c'est accepter qu'il envoie celui d'un autre.
2. **La règle de lecture ne rend que les siennes.** Pas de « ou bien si l'on est
   collaborateur du projet » : la première exception en appellerait une seconde.
3. **La règle d'écriture aussi.** Sans elle, on ne lit pas les situations des
   autres mais on peut leur en écrire une, ou modifier la leur en devinant un
   identifiant.

Et une quatrième, qui est celle qu'on oublie : **`situation_subjects` porte la
même règle**. La table de liaison dit « ce sujet est dans cette situation » ;
laissée ouverte, elle raconte le carnet de quelqu'un ligne par ligne, sans
jamais lire la situation elle-même.

> **Ce qui existe déjà ne se perd pas en silence.** Les situations écrites avant
> ce changement n'ont pas de propriétaire. Les cacher rétroactivement ferait
> disparaître le travail de gens qui l'ont sous les yeux aujourd'hui. Elles
> restent donc visibles **à leur projet**, et l'écran le dit — « créée avant le
> cloisonnement ». Mieux vaut une exception nommée qu'un trou silencieux.

---

## 4. Le socle qui existe déjà

| Ce qu'il faut | Où c'est | État |
| --- | --- | --- |
| La table et son mode | `situations` — `mode`, `filter_definition` | ✅ manuel ou automatique |
| Le lien vers les sujets | `situation_subjects` | ✅ table de liaison |
| Un filtre écrit, qui se rejoue | `filter_definition` jsonb | ✅ déjà une requête |
| La grammaire de recherche des sujets | `sujets-filtres.js` | ✅ champs, opérateurs |
| Le cloisonnement par propriétaire | `ct_analysis_runs`, `cr_lectures` | ✅ **le modèle à suivre** |
| Un propriétaire sur une situation | `situations.owner_id` | ✅ étape 1 |
| Un périmètre de projets | `perimetre` jsonb | ✅ étape 2 |
| **Chercher un projet dans un filtre** | — | ❌ à faire |

---

## 5. Les étapes, dans l'ordre

Une étape par livraison. L'ordre n'est pas négociable : **le garde-fou vient
avant tout ce qui s'en sert.** Élargir la portée d'abord, cloisonner ensuite,
ce serait publier pendant l'intervalle le carnet de tout le monde.

### Étape 1 — Une situation appartient à quelqu'un · *faite*

`owner_id`, posé par la base, et la règle de lecture qui ne rend que les
siennes. Idem pour `situation_subjects`, par jointure sur sa situation.

La portée ne bouge pas encore : `project_id` reste obligatoire, et une situation
reste celle d'un projet. **On ne fait que fermer la porte**, et l'on vérifie
qu'elle est fermée avant de changer quoi que ce soit derrière.

Les lignes existantes gardent leur visibilité et l'écran le dit : les cacher
ferait disparaître le travail de gens qui l'ont sous les yeux aujourd'hui.

**Comment on le vérifie :** deux comptes, deux situations. Chacun voit la
sienne ; aucun ne voit ni ne modifie celle de l'autre, y compris en visant son
identifiant. Cela se vérifie contre la base, pas à l'écran.

**Ce qui a été livré :**

| Où | Quoi |
| --- | --- |
| `supabase/migrations/202610040001_situations_privees.sql` | `owner_id` avec son défaut `auth.uid()`, quatre règles à la place de `situations_open_all`, et RLS sur `situation_subjects` par jointure |
| `apps/web/js/services/situations-privees.js` | ce que l'écran dit d'une situation : à qui elle est, ce qu'on peut en faire, et pourquoi pas |
| `apps/web/js/services/project-situations-supabase.js` | `owner_id` demandé dans la lecture et rangé dans la ligne — jamais envoyé |
| `apps/web/js/views/project-situations/project-situations-table.js` | la mention « créée avant le cloisonnement », avec la pastille des autres écrans |

Trois vérifications lisent le texte du code, et c'est assumé : une colonne
absente d'un `select`, une clé glissée dans un corps de requête et une règle de
base restée ouverte ne lèvent rien à l'exécution. Une migration postérieure qui
poserait une règle sans `auth.uid()` sur ces deux tables casse la construction —
on peut toujours décider de le faire, plus distraitement.

---

### Étape 2 — Le périmètre remplace le projet · *faite*

`project_id` devient facultatif, et une colonne dit ce que la situation
regarde :

```jsonc
{ "portee": "projet",  "projets": ["…"] }   // un seul, comme aujourd'hui
{ "portee": "choisis", "projets": ["…", "…"] }
{ "portee": "tous" }                         // tous ceux où je suis
```

**Pourquoi une liste et pas un booléen.** « Tous mes projets » et « ces trois-là »
ne sont pas la même intention, et un jour on voudra les distinguer à l'écran :
la première suit une personne, la seconde une affaire.

**Ce qui ne bouge pas :** les situations existantes deviennent
`{portee: "projet", projets: [leur project_id]}`. Rien ne change pour elles, et
c'est le but : une migration qui déplacerait du travail au passage serait
impossible à contrôler.

**Ce qui a été livré :**

| Où | Quoi |
| --- | --- |
| `supabase/migrations/202610050001_situations_perimetre.sql` | la colonne, son remplissage, la contrainte de forme, l'index, et `project_id` qui cesse d'être obligatoire |
| `apps/web/js/services/perimetre-dune-situation.js` | ce qu'une situation regarde : le lire, l'écrire, le dire |
| `apps/web/js/services/colonnes-dune-situation.js` | la liste des colonnes, pour tout le monde |
| `apps/web/js/views/project-situations/project-situations-table.js` | ce que la situation regarde, quand ce n'est pas seulement ce projet-ci |

**Le piège, nommé une fois pour toutes :** `tous` ne liste aucun projet, et cela
ne veut pas dire « aucun ». Qui compterait la liste pour savoir ce qu'une
situation regarde lirait « zéro » sur celle qui regarde le plus large — la seule
qu'il fallait montrer (règle 5). C'est pour cela que `regardeToutMonTravail`
existe : personne n'a à tester une longueur.

**Et une valeur écrite deux fois : `portee` et la longueur de la liste disent la
même chose.** Quand elles se contredisent, c'est la liste qui a raison — elle
nomme des projets, la portée ne fait que la résumer (règle 4). Seul `tous` est
une intention que la liste ne peut pas porter.

**Un trou d'étape 1 refermé au passage.** Deux modules lisaient les situations,
chacun avec sa propre chaîne de `select` — et un seul avait reçu `owner_id`.
L'écran servi par l'autre affichait « créée avant le cloisonnement » sur chacune
de ses situations, y compris celles écrites la veille. Rien n'avait levé. La
liste des colonnes vit désormais à un seul endroit, et un lecteur qui
reconstruirait la sienne casse la construction.

---

### Étape 3 — L'écran des situations quitte le projet · *faite*

L'onglet Situations d'un projet disparaît. Il est remplacé par un écran à moi,
atteignable de partout, qui montre **toutes** mes situations, chacune avec les
projets qu'elle regarde.

**Ce qui se perd, et qu'il faut remplacer.** Depuis un sujet, on voyait « ce
sujet est dans telle situation ». Cela reste vrai, mais seulement pour moi : la
ligne dit « vous l'avez mis dans *Ma semaine* », et personne d'autre ne la voit.

**Ce qui a été livré :**

| Où | Quoi |
| --- | --- |
| `apps/web/js/services/mon-carnet.js` | d'où l'on regarde, le nom de l'écran, son adresse, et ce qu'un sujet en dit |
| `apps/web/js/views/mon-carnet.js` · `mon-carnet-coquille.js` | l'écran, et sa mise en page — celle du projet, sans projet |
| `apps/web/js/router.js` · `global-nav.js` · `global-header.js` | la route `#situations`, l'entrée de menu, l'en-tête et son fil d'Ariane |
| `apps/web/js/constants.js` · `project-layout.js` · `project-parametres-general.js` | l'onglet du projet, et son interrupteur, retirés |
| `project-situations-persistence.js` | ce que l'écran va chercher, selon d'où on le regarde |

**Le même tableau, monté ailleurs.** Ce n'est pas un second écran des
situations : c'est le même, avec les classes de la coquille d'un projet. En
refaire une obligerait à recalibrer les deux à chaque retouche, et l'une des
deux finirait en retard sur l'autre.

**Ce qui décide, c'est la route.** `currentProjectId` nul veut dire « pas
d'écran de projet à regarder », donc le carnet. `projectScopeId`, posé par le
chargement, pouvait répondre à la même question : les laisser répondre toutes
les deux, c'était accepter qu'elles se contredisent le jour où l'une est mise à
jour et pas l'autre (règle 4).

**Un ancien lien ne se perd pas en silence.** `#project/<id>/situations` mène au
carnet. Sans cela, il retombait sur Fichiers sans rien dire — on aurait demandé
ses situations et obtenu autre chose (règle 5).

**Créer depuis le carnet.** Il n'y a pas de projet courant, et il ne faut
surtout pas en inventer un : la clé du navigateur retomberait sur le dernier
chantier ouvert, et l'on rangerait le carnet de quelqu'un au hasard. Une
situation créée là naît donc **en regardant tout** — ce que le périmètre sait
dire depuis l'étape 2. La restreindre se fera à l'étape 4.

---

#### Ce que cette étape ne fait pas encore : les sujets ne traversent pas

Les sujets d'une situation sont résolus contre **les sujets du projet courant**,
et le carnet n'en a pas. La suite en découle, et elle est dite plutôt que
maquillée :

- une situation **manuelle** se compte quand même : sa liste est écrite en base,
  et la longueur d'une liste ne demande pas de savoir ce qu'elle contient ;
- une situation **automatique** est une requête ; sans les sujets, elle n'a pas
  de réponse. Elle n'entre donc pas dans le compte, et la colonne dit « — ».

**Zéro aurait été un mensonge** — une situation dont personne n'a compté les
sujets n'en a pas zéro : on ne sait pas. « 0 » se lit comme un chantier sans
travail, et l'on va chercher la panne dans le filtre, dans la base, partout sauf
là où elle est (règle 5). Le tableau affichait « 0 » dans ce cas, **sur les deux
écrans** ; il dit maintenant « — ».

Ouvrir une situation dans le carnet montre pour la même raison une liste de
sujets vide. **Charger les sujets d'un périmètre est l'étape suivante**, et elle
n'appartient pas à celle-ci : elle touche la pagination, la sélection et le
cache des sujets, c'est-à-dire tout autre chose que déménager un écran.

---

### Étape 3 bis — Les sujets d'un périmètre · *faite*

Le carnet montre les situations ; il ne montre pas encore ce qu'elles
contiennent. Les sujets sont chargés **par projet courant**, et le carnet n'en a
pas.

Ce qu'il faut : charger les sujets des projets qu'un périmètre désigne, pour que
le compte d'une situation automatique soit un chiffre plutôt qu'un tiret, et
qu'ouvrir une situation dans le carnet montre ses sujets.

**Le piège :** ce chargement porte aujourd'hui la pagination, la sélection et le
cache des sujets d'un projet. L'élargir sans y toucher est le travail ; le
refaire au passage serait deux changements dans le même, et l'on ne saurait plus
lequel des deux a cassé quoi.

Cette étape est séparée pour cette raison, et non parce qu'elle serait
secondaire : tant qu'elle n'est pas faite, le carnet **dit** ce qu'il ne sait
pas, ce qui est tenable — mais il ne le sait pas.

**Ce qui a été livré :**

| Où | Quoi |
| --- | --- |
| `apps/web/js/services/charge-du-perimetre.js` | réunir les charges de plusieurs chantiers en une |
| `apps/web/js/services/project-subjects-supabase.js` | `chargerLesSujetsDesChantiers` — le chargeur, une fois par chantier |
| `apps/web/js/services/ce-que-porte-un-sujet.js` | ce qu'un sujet porte, lu là où c'est écrit |
| `project-situations-persistence.js` | les situations se résolvent contre ces sujets, dans le carnet comme dans un projet |

Le chargeur n'a pas été élargi : il tourne **une fois par chantier**, et les
résultats se réunissent. Aucune règle nouvelle n'est écrite — recalculer les
index aurait fait une seconde façon de les produire, qui aurait fini par ne plus
dire la même chose que la première (règle 10). Et rien de ce qui appartient à
l'écran d'un projet — pagination, sélection, cache — n'a été touché : c'était la
raison de séparer cette étape.

#### La panne qu'on a trouvée en chemin

Pour répondre à une situation automatique, il faut savoir ce que chaque sujet
porte : ses labels, ses objectifs, ses assignés. **On le lisait au mauvais
endroit** — dans `bucket.subjectMeta.sujet`, la surcouche où l'écran note ce
qu'on vient de changer avant que la base ne le confirme.

Aucun chargeur ne la remplit. Tant qu'on n'avait rien modifié à la main, elle
était vide : une situation automatique filtrant par label, par objectif ou par
assigné ne trouvait **aucun sujet**, et s'affichait vide. **Sur l'écran d'un
projet aussi**, depuis toujours.

Ce que la base sait est dans la charge. La surcouche reste devant — un label
coché doit se voir sans attendre le rechargement —, mais elle n'est plus la
seule consultée. Et une surcouche absente n'est pas une liste vide : elle dit
« rien n'a changé ici ».

#### Une lecture qui a échoué n'est pas une absence

Si les labels d'un chantier n'ont pas pu être lus, son index revient vide.
Fusionné sans précaution, ce vide devient indiscernable d'un chantier sans
labels — et la situation s'affiche vide, ce qui se lit comme « rien à faire
ici ». `labelsHydrated` et `objectivesHydrated` ne valent donc vrai que si
**tous** les chantiers ont répondu (règle 5).

---

### L'onglet Situations, une porte dans la barre du projet

Les situations ne sont plus du projet — c'est tout l'objet de l'étape 3. Mais
c'est **d'un chantier** qu'on pense à son carnet, et l'y chercher dans un menu
qu'on n'ouvre jamais revient à ne pas l'avoir.

Une entrée « Situations » se tient donc dans la barre, à droite d'« Actions »,
et **elle mène dehors** : son adresse est celle du carnet, pas
`#project/<id>/situations`. On sort du projet en la franchissant, et l'en-tête
cesse d'en nommer un — garder « Untel / Résidence Bertrand » au-dessus du carnet
ferait croire qu'on y lit les situations de ce chantier-là.

Si elle menait à une vue de ce projet, on aurait deux listes des situations —
celle du projet, qui filtre, et le carnet, qui ne filtre pas — et un écran qui
existe à deux endroits finit par différer d'un des deux.

---

### Étape 4 — Chercher un projet dans le filtre · *faite*

Un filtre trans-projets a besoin d'un champ que la grammaire n'a pas :
`projet:`. Et il a besoin de le **chercher**, parce qu'on ne retient pas les
identifiants de quinze chantiers.

- Le champ `projet:` accepte le nom, pas l'identifiant — c'est ce qu'on connaît.
- La saisie propose les projets où je suis, filtrés à la frappe.
- Un nom qui ne désigne rien **se dit** : un filtre qui rend zéro parce qu'on a
  mal tapé se lit comme un chantier sans travail (règle 5).

C'est cette étape que vous avez nommée en premier, et elle vient après les
autres pour une raison : chercher un projet n'a de sens qu'une fois qu'une
situation peut en regarder plusieurs.

**Ce qui a été livré :**

| Où | Quoi |
| --- | --- |
| `apps/web/js/services/projets-du-filtre.js` | chercher un chantier par son nom, et dire ce qu'on n'a pas reconnu |
| `project-situations-supabase.js` | `filter_definition.projectIds`, et le filtre qui l'applique |
| `project-situations-form.js` · `-state.js` · `-events.js` | le champ « Chantiers », en noms, proposé à la frappe |
| `query-bar.js` · `champs-des-sujets.js` | le champ `projet:` dans la grammaire, et les valeurs inconnues qui remontent |

**Des noms, pas des identifiants.** Les autres champs du formulaire se
saisissent en identifiants ; celui-ci ne le peut pas — on ne retient pas les
identifiants de quinze chantiers. Les noms se retraduisent à l'enregistrement.

**La liste se propose à la frappe** par une `datalist` : c'est le navigateur qui
filtre, et rien de neuf n'est dessiné. Inventer un menu ici aurait obligé à le
recalibrer à côté des autres champs, qui sont des `input` ordinaires.

**Un chantier qu'on ne sait plus nommer reste écrit tel quel.** L'effacer
retirerait du filtre une condition que personne n'a retirée, et la situation
changerait de contenu sans que rien ne le dise (règle 6).

#### Ce qui ne désigne rien se dit — et c'est plus large que les chantiers

Un nom mal tapé donne un filtre qui ne retient aucun sujet, et **une situation
vide se lit comme un chantier sans travail**, pas comme une faute de frappe. On
chercherait la panne dans le filtre, dans les sujets, partout sauf là où elle
est (règle 5).

Deux endroits en tiennent compte :

- **Le formulaire refuse d'enregistrer** tant qu'un nom n'est pas reconnu. Le
  nom fautif est sous les yeux, dans le champ : le corriger est immédiat.
  Enregistrer en l'ignorant donnerait une situation qui ne retient rien.
- **La barre de recherche le dit.** `parseQuery` garde sa règle — un jeton non
  reconnu reste du texte, il n'est ni ignoré ni corrigé — mais elle nomme
  désormais les valeurs qu'un champ **déclaré** n'admet pas. Un champ inconnu ne
  compte pas : `http://exemple.fr` n'est pas une faute de frappe.

Cela vaut pour tous les champs, pas seulement `projet:` : `label:etancheitee` se
taisait de la même façon.

#### Un nom porté par deux chantiers ne se tranche pas tout seul

Rien n'interdit à deux chantiers de s'appeler pareil. Choisir le premier serait
un tirage au sort silencieux : on filtrerait sur un chantier sans savoir lequel.
L'ambiguïté se dit, et rien n'est retenu.

#### Où le champ `projet:` apparaît

Il ne se déclare que si la liste filtrée couvre **plusieurs** chantiers — et
seulement ceux qui y sont réellement présents. Proposer d'en filtrer un qui n'y
est pas promettrait un résultat vide, ce que le fichier interdit déjà pour les
autres champs. Sur l'écran d'un projet il ne paraît donc pas ; dans une liste
qui traverse les chantiers, si.

Son jeton est le nom en traits d'union, comme pour les labels : la barre coupe
sur les espaces, et « Résidence Bertrand » ne s'y écrit pas tel quel.

---

### Étape 5 — Les compteurs et l'avancement se recalculent sur le périmètre

`progress_percent` se calcule aujourd'hui sur les sujets d'un projet. Il devra
se calculer sur ceux du périmètre — et `refresh_situation_progress` avec lui.

**Le piège :** un sujet que je ne peux plus voir. Si je quitte un projet, les
sujets qu'il portait sortent de mon périmètre ; l'avancement doit alors baisser
plutôt que de compter des choses que je ne peux plus ouvrir.

---

## 6. Ce que cet ordre refuse

**D'élargir avant de cloisonner.** Une situation trans-projets encore visible de
tous publierait, pendant l'intervalle, l'organisation de chacun à travers tous
ses chantiers. Ce n'est pas un défaut d'affichage qui se corrige au palier
suivant : c'est une fuite, et elle ne se reprend pas.

**De cacher ce qui existe.** Les situations d'avant restent visibles à leur
projet, et l'écran le dit. Les faire disparaître pour être « propre » ferait
perdre du travail que personne n'a demandé à perdre.

**De rendre les sujets privés.** Une situation désigne des sujets ; elle ne les
possède pas. Le sujet reste du projet, avec son fil et son histoire — ce qui
devient privé est le fait que je l'aie mis dans mon carnet.

**De faire confiance à l'écran.** Toutes les règles de ce plan vivent dans la
base. Un écran qui filtrerait bien aujourd'hui filtrerait mal le jour où
quelqu'un ajoutera une requête, et personne ne s'en apercevrait.

---

## 7. Ce qui reste ouvert

**Partager une situation, un jour.** Deux personnes qui travaillent ensemble
voudront peut-être un carnet commun. Ce serait une **invitation explicite**, pas
un retour à l'état d'avant : un partage qu'on accorde, qu'on voit, et qu'on
retire. Rien dans ce plan ne l'empêche, et rien ne le prépare non plus — c'est
délibéré, on ne construit pas pour un besoin qu'on suppose.

**Les situations créées d'office.** Le projet en crée par défaut
(`ensure_default_project_situations`). Une situation sans propriétaire n'a plus
de sens ; il faudra décider si elle disparaît, ou si elle devient celle de qui
ouvre le projet. À trancher à l'étape 3, quand l'écran dira ce qu'il montre.

**Le coût d'un périmètre large.** « Tous mes projets » sur quinze chantiers
demande une requête qui les traverse tous. Rien ne dit aujourd'hui ce qu'elle
coûtera, et ce n'est pas une raison pour la refuser — c'est une raison pour la
mesurer à l'étape 5 plutôt que de la découvrir en production.
