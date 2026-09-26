# L'établi : les utilitaires qu'on écrit soi-même

> « Je veux que tous les volets en bois de tous mes projets soient violets. »

Ce plan répond à cette phrase-là. Elle est volontairement idiote, et elle dit
tout : une règle qu'on porte **d'un projet à l'autre**, qu'on écrit soi-même,
qu'on garde par-devers soi, et qu'on verse dans un projet **quand on le décide**
— par une proposition signée, comme tout le reste.

---

## D'où vient ce besoin

L'écran « Écrire du Mdall » sait déjà écrire, colorer, vérifier et lancer. Ce
qu'il ne sait pas, c'est **garder**. On ferme l'onglet, le brouillon reste dans
ce navigateur, et il meurt avec lui. Un contrôleur technique qui a passé vingt
minutes à écrire une règle sur les volets ne va pas la réécrire au projet
suivant : il la copiera dans un fichier texte, et six mois plus tard personne ne
saura laquelle des trois copies fait foi (règle 4).

Il y a une seconde raison, moins visible et plus importante. Les fonctions
issues d'un PDF ou d'un fil de mails **se capitalisent** : elles entrent dans la
mémoire d'un projet, l'entreprise les relit, les corrige, les réemploie. Une
fonction écrite à la main par un utilisateur n'a aucune raison d'y échapper. La
seule différence tient au **moment** : elle vit d'abord sur l'établi de celui
qui l'a écrite, et elle rejoint un projet quand il le veut.

---

## Ce que ce plan n'est pas

- **Pas un second langage.** Un utilitaire personnel est du Mdall, lu par le
  même lecteur, lancé par le même bac, versé par la même proposition. Le jour
  où il faudrait un second dialecte, le plan serait mauvais.
- **Pas une seconde mémoire.** L'établi ne raisonne pas, il **garde**. Rien
  n'en sort vers un projet sans une proposition signée : « on ne doit RIEN
  verser DIRECTEMENT dans la mémoire, JAMAIS ».
- **Pas un partage.** Ce qui est sur mon établi est à moi. Il paraît dans tous
  **mes** projets ; il ne paraît chez personne d'autre tant que je ne l'ai pas
  proposé quelque part.

---

## Lot A — Ce qui se demande, et ce qui se déduit *(fait)*

C'est le préalable, et il a été livré avec ce plan. Sans lui, un utilisateur ne
peut pas obtenir l'écran qu'il décrit — et c'est exactement ce qui s'est vu :

> « On écrit le prix hors taxe, on choisit entre existant ou neuf, selon le cas
> on calcule la TVA. » Et le bac affichait un champ **taux**, non déclaré, à
> remplir à la main.

### Le diagnostic, et pourquoi ce n'était pas un défaut d'écran

Le modèle avait écrit `calcule taux = Taux de TVA(zones, Type de TVA);` — un
**appel de fonction**, que le langage ne connaît pas et ne connaîtra pas. La
ligne était refusée à la lecture ; `taux` restait donc un nom que le brouillon
lit et que personne ne pose ; et le formulaire, qui demande précisément ce que
personne ne pose, en faisait un champ.

La tentation était d'ajouter au langage un vocabulaire d'affichage — « déclarer
les inputs qu'on veut montrer ». C'est ce que le plan d'origine avait déjà
refusé, et pour la bonne raison : « Zone de vent » serait alors déclaré une fois
comme variable et une fois comme étiquette, et le jour où la description change,
l'une des deux ne suivra pas (règle 10).

### Ce qui manquait vraiment : le chaînage

Le lecteur portait la réponse depuis toujours, dans `grapheDesBlocs` : **un
sujet qu'aucun bloc ne produit est une entrée**. Le formulaire ne s'en servait
pas, et le bac non plus.

- **La conclusion d'une fonction vaut pour son nom**, et les autres fonctions du
  lancement la lisent — exactement comme la mémoire du projet, où la conclusion
  d'une règle est versée et relue par les suivantes. Aucun mot nouveau.
- **Ce qu'une règle conclut ne se demande pas.** Le formulaire ne porte plus que
  les vraies entrées.
- **L'unité déclarée part avec la réponse.** On tape « 120 » dans un champ qui
  montre « € » : la valeur vaut désormais `120 €`, et le verdict aussi.
- **Un pourcentage lu vaut un pourcentage écrit.** `alors (20 %)` relu dans
  `Prix HT * Taux de TVA` donne bien un cinquième du prix.
- **La consigne du modèle l'enseigne**, interdit l'appel inventé, et dit ce qui
  se déclare (les entrées) et ce qui ne se déclare pas (les conclusions).

C'est la réponse de fond à « je ne sais pas comment lui faire comprendre que je
veux une TVA déduite » : on n'a rien à lui faire comprendre de plus — **on écrit
la règle qui la déduit**, et le champ disparaît de lui-même.

Ce lot a une conséquence qu'on n'avait pas cherchée, et qui décide du reste :
**le cœur du brouillon est pur**. Il lit des fichiers, il rend des champs et des
conclusions, et il ne connaît ni projet, ni base, ni magasin. C'est ce qui rend
l'établi possible sans rien reprendre — voir « Ce qui a été tranché ».

---

## Lot B — L'établi : garder un utilitaire *(fait)*

### Le nom

« Personnel » n'est pas terrible, et l'écran s'appelle déjà **l'Atelier**. Dans
un atelier, l'**établi** est la table où l'on pose ses propres outils : ceux
qu'on a faits, qu'on reprend, et qu'on ne prête pas. C'est le mot retenu, et
l'onglet s'appellera **« Mon établi »**, à droite de « Ajouté récemment ».

*Écartés : « Personnel » (dit le contraire de ce qu'on veut — on veut dire « de
ma main », pas « privé »), « Mes utilitaires » (juste, et plat), « Brouillons »
(faux : un utilitaire enregistré n'est plus un brouillon).*

### Ce qu'on enregistre

Un utilitaire de l'établi porte ce qu'un utilitaire natif porte, parce qu'il
sera lu par les mêmes écrans :

| ce qu'il porte | d'où ça vient |
| --- | --- |
| un **nom** | demandé à l'enregistrement |
| une **description** | demandée, et c'est elle qu'on lira dans six mois |
| ce qu'il **prend** | déduit du brouillon : les entrées du formulaire |
| ce qu'il **rend** | déduit : les conclusions de ses fonctions |
| ses **fichiers** | le brouillon, tel quel |
| une **version** | `v1`, puis `v2` à chaque enregistrement qui change le texte |

« Ce qu'il prend » et « ce qu'il rend » **ne se saisissent pas** : ils se
déduisent du code, par le graphe du lot A. Une entrée recopiée à la main
divergerait du code au premier ajout d'une condition.

### Il entre dans le catalogue, il n'en fabrique pas un second

Un utilitaire de l'établi se lit sur les mêmes écrans que les autres : la
vitrine, la recherche, la fiche. Il doit donc rendre **exactement la forme
qu'une entrée du catalogue porte** (`catalogue-de-latelier.js`), sans quoi il
faudrait une seconde grille, une seconde fiche et une seconde recherche, et les
trois divergeraient au premier réglage (règle 10) :

| le champ du catalogue | d'où il vient, pour un utilitaire de l'établi |
| --- | --- |
| `cible` | la route qui rouvre le brouillon — son identifiant, comme ailleurs |
| `nom` | demandé à l'enregistrement |
| `resume` | la description demandée |
| `rayon` | choisi à l'enregistrement, dans la liste existante |
| `entrees` | **déduit** : `champsDuBrouillon` |
| `sorties` | **déduit** : ce que ses fonctions concluent |
| `version` | `1`, puis `2` à chaque enregistrement qui change le texte |
| `intelligence` | `false` : le Mdall d'un brouillon ne fait qu'appeler et calculer ; `true` le jour où il appelle un agent |
| `aussiALaMain` | le code lui-même — il est lisible, c'est tout l'objet du langage |
| `mots` | les noms que ses règles lisent et concluent, déduits eux aussi |
| `ajouteLe` | la date du premier enregistrement |

La vitrine devra donc lire **deux sources** au lieu d'une constante — le
catalogue du dépôt, et l'établi de celui qui regarde. C'est le seul endroit du
lot B qui touche à l'existant, et c'est une couture, pas une refonte.

### Le magasin

Une table par utilitaire et une table par version — le texte d'une version ne
change jamais, on en ajoute une. Migration **strictement additive**, RLS sur le
propriétaire : personne d'autre ne lit l'établi de quelqu'un.

Un utilitaire de l'établi n'est **dans aucun projet**. Il ne paraît pas dans la
mémoire, pas dans le cerveau, pas dans les recherches du projet.

### L'écran

- « Enregistrer dans l'Atelier », dans le menu de la ligne du titre.
- Une fenêtre : le nom, la description, le rayon — et **ce que le code dit de
  lui**, montré avant d'enregistrer. On voit ce qu'on signe.
- Sur un utilitaire déjà posé : « Enregistrer » monte d'une version, et l'écran
  dit laquelle **avant** de le faire — « il passera de v1 à v2 », ou « le texte
  n'a pas changé : il restera en v1 ».
- Le titre de l'écran dit sur quel utilitaire on travaille, et dans quelle
  version. Sans cette ligne, on revient le lendemain et rien ne dit qu'on
  réécrit un outil déjà posé : on en fabrique un second du même nom.
- « Reprendre un utilitaire… », dans le même menu, ouvre l'établi et remet ses
  fichiers dans l'écran. Il demande avant d'écraser un brouillon en cours.

### Ce qu'on n'avait pas vu, et qui s'est vu à l'usage

**Un nom déjà pris n'est pas une panne.** La table porte `unique (owner_id,
nom)` ; enregistrer un second utilitaire du même nom rendait donc un `409` que
le module avalait, et l'écran disait « il n'a pas pu être enregistré,
réessayez ». Réessayer échouait exactement pareil : on cherchait une panne de
réseau là où il suffisait de changer trois lettres.

Trois choses en découlent, et elles valent au-delà de l'établi :

- **Ce que la base refuse se rapporte, il ne s'avale pas.** L'appel emporte le
  corps de l'erreur avec l'échec, et l'enregistrement rend un refus **nommé** :
  « ça n'a pas marché » n'est pas une réponse.
- **On regarde quelle unicité a été heurtée**, pas seulement le code `23505`.
  Deux existent : le nom, et le numéro d'une version. La seconde ne se heurte
  qu'en cas de course, et dire « ce nom est pris » enverrait renommer un outil
  dont le nom n'a rien fait (règle 5).
- **On le dit avant le clic quand on le sait.** L'établi se lit pendant qu'on
  remplit la fiche, et le nom pris s'annonce dès la frappe. À `null` — pas
  encore lu, ou lecture ratée — on ne bloque rien : la base tranchera, c'est
  elle qui porte la contrainte. Et la comparaison est la sienne : le nom rogné,
  la casse comprise, sinon l'écran refuserait un nom que la base accepte.

**Un refus ne se dit pas deux fois.** Le clic échoue, l'établi est relu dans la
foulée, et la fiche sait désormais le dire d'elle-même : garder les deux
phrases faisait chercher deux problèmes là où il n'y en a qu'un. Et après un
enregistrement réussi, l'écran cesse de parler du prochain clic.

### Ce que ce lot a appris

**Le numéro de version ne se calcule pas dans le navigateur.** Lu puis écrit
ici, deux enregistrements simultanés produiraient le même numéro, et la
contrainte d'unicité ferait échouer le second sans que personne sache pourquoi.
C'est la base qui décide, dans une fonction `security invoker` — donc soumise à
la même politique que le reste, et qui ne peut pas servir à écrire sur l'établi
d'un autre. L'écran **annonce** ce qui va se passer ; il ne le décide pas.

**Une lecture ratée ne se lit pas comme un établi vide.** La première dit qu'on
ne sait pas, la seconde qu'il n'y a rien : confondre les deux ferait réécrire
un outil qu'on possède déjà (règle 5).

**Ce qu'il prend suit le texte, et c'est vérifiable à l'écran.** En ajoutant
une affirmation au brouillon — « Matière du volet = "bois" » —, l'outil cesse
de demander cette entrée : il la pose lui-même. Un champ recopié à la main
dirait encore qu'il la prend.

---

## Lot C — Le retrouver depuis l'Atelier *(fait)*

La vitrine lit **deux sources** au lieu d'une constante : le catalogue du dépôt,
et l'établi de celui qui regarde. Ce n'est pas une greffe — un utilitaire de
l'établi porte exactement les champs d'une entrée du catalogue, et une épreuve
le tient champ par champ.

- L'onglet **« Mon établi »**, à droite de « Ajouté récemment ». Ce n'est pas
  un rangement de plus, c'est une **origine** : il ne réordonne pas la même
  liste, il ne garde que ce qu'on a écrit soi-même.
- **Ce qui est à soi passe en tête.** On cherche ce qu'on a écrit en le sachant
  là ; le dépôt, on le parcourt.
- La recherche le trouve sous ce qu'il lit et ce qu'il conclut, comme le reste.
- Un rayon que **seul** l'établi occupe paraît dans le rail : sinon on range un
  outil là où l'on ne peut pas l'ouvrir.
- Sa cible est `etabli:<id>` — confondable avec aucune cible du dépôt. Le
  routeur ouvre « Écrire du Mdall » **dessus**, avec l'entrée qu'il a déjà lue.

### Ce que ce lot a appris

**Un utilitaire de l'établi n'entre jamais en vedette, et ce n'est pas une
question de rang.** Les vedettes se comptent dans `atelier_ouvertures`, que
**tout le monde lit**, et dont la table promet qu'« une ligne ne peut désigner
personne ». Y compter l'ouverture d'un outil personnel y écrirait
`etabli:<id>` : l'existence de ce que quelqu'un garde pour lui, et la fréquence
à laquelle il s'en sert. Le routeur sort donc **avant** le comptage, et une
épreuve relit ce chemin — aucun rendu ne peut voir ce défaut, il est dans ce
qu'on envoie.

**Les vedettes s'effacent sur « Mon établi »**, comme elles s'effacent déjà sur
une recherche : six outils du dépôt au-dessus de son propre établi mettent en
avant exactement ce qu'on n'a pas demandé.

**L'établi se relit à chaque venue**, contrairement aux compteurs. Un compteur
bouge d'une unité et une rangée qui se réordonne sous le doigt cesse d'être un
repère ; l'établi, lui, vient peut-être de gagner l'outil qu'on a enregistré
dans l'onglet d'à côté — et ne pas le montrer ferait croire que
l'enregistrement a échoué.

### Ce qui reste de ce lot

L'historique des versions est porté à **À faire plus tard**, en bas de ce plan.

---

## Lot D — Le proposer à un projet *(fait)*

Le bouton existait et faisait déjà ce qu'il faut : « Proposer au projet » ouvre
une proposition portant les fichiers, relue ligne à ligne et signée. Ce lot
n'ajoute qu'une chose : **la proposition dit d'où elle vient**, comme celle d'un
compte rendu nomme son document et celle d'un fil nomme son objet.

Le champ existait aussi — `source`, celui des comptes rendus et des mails — et
se rend déjà en italique sous la description. En écrire un second aurait fait
deux lignes de provenance, dont l'une aurait fini par mentir (règle 10).

- Le **titre** nomme l'outil quand il y en a un : dans une liste de
  propositions, « 3 lignes écrites en Mdall » ne distingue pas deux outils
  proposés le même jour.
- L'**intro** dit de quel utilitaire et de quelle version les lignes viennent,
  et qu'il est gardé hors de tout projet.
- La ligne de **provenance** porte le tout : « Écrire en Mdall · utilitaire
  « X » v2 ». Un brouillon anonyme dit au moins « Écrire en Mdall » — il ne
  disait rien du tout jusqu'ici.

### Le piège qu'il fallait voir

On reprend la `v2`, **on modifie le texte**, on propose. Annoncer « v2 » serait
faux : ce qui entre dans le projet n'est pas la `v2`, et la comparer plus tard à
celle de l'établi ne dirait rien de juste. La provenance dit donc « repris et
modifié depuis » — et la question « le texte a-t-il bougé ? » se répond au
même endroit qu'à l'enregistrement, jamais deux fois.

### La trace que du code peut lire *(faite)*

La phrase de provenance se relit par un humain ; pour que le projet sache plus
tard que l'établi a avancé, il fallait une trace **structurée**.

**Aucune migration n'a été nécessaire** : la charge d'une affirmation est du
`jsonb`, et elle porte déjà `agent`, `regle`, `decision`, `utilitaire`. Elle
gagne `etabli` — l'identifiant, la version, le nom —, filtré plutôt que
recopié comme les autres : les trois, ou aucune.

**Pourquoi un champ à elle, et pas `utilitaire`.** Celui-là porte la référence
d'un outil **du dépôt** — `nom_V1` —, et tout ce qui la lit la cherche dans le
catalogue. Y glisser `etabli:<id>` en ferait un nom que le catalogue ne connaît
pas : chaque lecteur y verrait un utilitaire inconnu, et non un outil personnel.
Un champ qui porte deux sens finit par n'en porter aucun (règle 10).

**Elle n'y est que si le texte est bien celui de cette version** : une ligne
reprise d'une `v2` puis modifiée ne porte aucune marque — la même règle que la
phrase, décidée sur la même réponse.

Et elle **se lit déjà** : l'histoire d'une valeur porte une ligne de plus,
« Écrite avec « Volets en bois » v2 — un utilitaire écrit à la main », juste
après son origine. C'est la même question, posée un cran plus près.

Une fois versée, la règle est **au projet** : elle vit dans sa mémoire, elle se
relit, se compare, se rejoue, et elle se capitalise comme les autres. L'établi
en garde sa copie, et les deux peuvent diverger — c'est voulu : le projet a
signé une version, mon établi continue sa vie.

---

## Lot E — Le Copilote et l'établi *(fait)*

### Deux Copilotes, deux accès — et c'est la décision

**Le Copilote d'un projet n'a accès à un utilitaire de l'établi que s'il y a été
versé.** Une règle versée est une règle **du projet** : il la lit comme les
autres, avec sa provenance et la proposition qui l'a fait entrer. Un utilitaire
qui n'a pas été versé ne le concerne pas, et le lui donner ferait répondre sur un
chantier avec un outil que personne n'y a signé (règle 1).

**Le Copilote de tous les projets a l'établi entier.** Il ne parle d'aucun
chantier : il parle à son propriétaire, de son travail. Son établi y a sa place,
et c'est même ce qu'il a de plus utile à offrir.

### Il ne les cite pas : il les lance

C'était le point à trancher. « Connaître » l'établi n'aurait servi à rien — le
Copilote aurait répondu « vous avez un utilitaire de TVA, allez le lancer ». Ce
qu'on veut, c'est la réponse.

Chaque utilitaire devient donc un **outil** offert au modèle, et le navigateur
l'exécute. C'est possible parce que du Mdall se lance **sans réseau et sans
modèle** : le lecteur du langage et l'évaluateur sont déjà dans la page, et le
bac d'essai s'en sert à chaque frappe. Le serveur ne fait que ce qu'il est seul à
savoir faire — décider qu'il faut l'appeler, et lequel.

> « Si mon prix de travaux dans l'existant est de 3 200 €, combien en TTC ? »
> — « 3 376 €, avec un taux de 5,5 % et 176 € de TVA, calculé par votre
> utilitaire **Calcul de TVA v3**. »

### Il dit lequel, et dans quelle version

Une réponse obtenue avec un outil personnel doit dire lequel. Sans cela, on ne
sait plus si le chiffre vient d'une règle qu'on a écrite soi-même ou du modèle —
et les deux ne se vérifient pas du tout de la même façon (fondamental 13).

Le nom et la version sont donc dans trois endroits qui se renforcent : la
**description de l'outil**, lue au moment de choisir ; le **profil de travail**,
lu au moment de rédiger ; et le **résultat lui-même**, qui les rend sous la main
avec le rappel de les citer. Une consigne qu'on peut suivre sans effort se suit
plus souvent (règle 12).

Le fil de la conversation l'affiche aussi, dans « ce que le copilote a fait » :
« Utilitaire de votre établi — Calcul de TVA v3 ».

### La cloison tient sur deux listes, pas sur une consigne

Le site et le serveur ne se déploient pas ensemble : une garantie qui tient sur
un seul des deux n'en est pas tout à fait une.

1. **le navigateur** ne déclare l'établi que sur une discussion sans projet — et
   le contexte d'un projet ne le lit même pas ;
2. **le serveur** ignore ces déclarations dès qu'un projet est nommé, et refuse
   celles dont le nom ne porte pas le préfixe de la famille — sans quoi une
   déclaration nommée comme un agent natif le masquerait pour ce tour-là.

`copilote-cloison.test.mjs` lit les deux codes et casse la construction quand une
porte s'ouvre.

### Ce qui manque se demande, et ne s'invente pas

Aucune entrée d'un outil de l'établi n'est déclarée « requise ». Un schéma qui
exige tout fait **remplir** tout : le modèle met une valeur plausible pour que
l'appel parte. Laissées libres, les entrées manquantes reviennent dans « ce qui
manque », et le modèle a de quoi poser la question au lieu d'y répondre à la
place de la personne (règle 5).

### Ce qui reste

Que la trace de la réponse dise **de quelle proposition** une règle versée est
venue, pour qu'on remonte de la réponse à ce qu'on a signé.

---

## Lot F — Dire qu'une version plus récente existe *(fait)*

### Où cela se dit, et pourquoi là

**Dans la mémoire du projet**, sur la ligne « Écrite avec » que le lot D avait
posée — celle qui déplie l'histoire d'une valeur :

> **Écrite avec** — « Volets en bois » v2 — un utilitaire écrit à la main ·
> votre établi est en v3 — rien n'a été changé ici

**Sur la même ligne, et non une seconde** : c'est la même chose qu'on lit —
d'où vient cette valeur, et où en est l'outil qui l'a écrite. Deux lignes
feraient chercher deux faits.

La phrase dit que **rien n'a bougé ici**. Sans cela, on lit « votre établi est
en v3 » et l'on se demande laquelle des deux le projet tient — alors que c'est
précisément ce que la ligne vient de dire.

### On signale, on ne met jamais à jour

Ce qui est dans la mémoire d'un projet y est entré par une proposition signée.
Le remplacer parce qu'un numéro a bougé serait écrire dans la mémoire sans que
personne l'ait décidé (règle 1). L'écran dit ; l'utilisateur décide ; et ce
qu'il décide repasse par le chemin de tout le monde — rouvrir l'outil depuis
l'Atelier, et le proposer.

### Trois façons de ne pas savoir, et aucune ne se dit « à jour »

L'établi qu'on n'a pas pu lire, la marque sans version, l'outil retiré de
l'établi : dans les trois cas on **ignore** où la lignée en est, et l'écran se
tait. Répondre « non » ferait passer pour à jour ce qu'on n'a pas regardé
(règle 5). Un sujet s'ouvre, qu'on ait pu lire l'établi ou non.

`v10` se compare bien à `v2`, comme au catalogue du dépôt : comparés comme du
texte, une montée de version passerait pour un retour en arrière, en silence.

### Ce que ce lot n'a pas eu à faire

Le service écrit puis retiré au lot D est revenu **tel quel** : il attendait son
écran, il l'a. C'est la preuve que le retirer était juste — on ne perd rien à
attendre un appelant, et l'on évite d'entretenir du code dont personne ne sait
plus s'il est encore vrai.

### Ce qui n'existe pas encore, et qu'on croyait acquis

« On procède comme avec les autres utilitaires : on indique la version, on
signale qu'elle a changé, on propose de mettre à jour, l'utilisateur décide. »

Les deux premiers tiers sont vrais, le troisième **n'existe nulle part**, et il
faut le dire avant de bâtir dessus :

- une contrainte déduite cite bien **son utilitaire et sa version** ; la fiche
  de l'Atelier affiche bien `v1` ;
- `derniereVersion(lignée)` et `numeroDeVersion()` sont écrits et éprouvés
  (`apps/web/js/utilitaires/catalogue.js`) — la lignée est le nom sans sa
  version, et `V10` s'y compare correctement à `V2` ;
- mais **personne ne les appelle**. Aucun écran ne dit aujourd'hui « cette
  valeur a été déduite par la `V1`, la `V2` existe ». On monte une version, et
  ce que la précédente a conclu reste à l'écran sans un mot.

### Ce que ce lot fait, et pour tout le monde

Un seul service pur répond à la question, quelle que soit la provenance :
*cette chose a été produite par tel utilitaire en telle version ; une plus
récente existe-t-elle, et laquelle ?* Un seul endroit décide (règle 10), et il
sert les trois cas :

| ce qui porte une version | ce qu'on signale |
| --- | --- |
| une contrainte déduite par un utilitaire natif | sa ligne de provenance dit que la lignée a avancé |
| une règle versée depuis l'établi | le projet dit que l'établi a une version de plus |
| un utilitaire de l'établi qu'on rouvre | l'écran dit sur quelle version on repart |

**On signale, on ne met jamais à jour tout seul.** Le geste est proposé ;
l'utilisateur décide, et ce qu'il décide passe par le chemin de tout le monde —
une proposition relue et signée. Rien ne se réécrit dans la mémoire d'un projet
parce qu'un numéro a bougé, et rien ne se réécrit dans l'établi de quelqu'un
parce qu'un projet a corrigé sa copie.

C'est la réponse à « que devient l'établi quand une version versée est ensuite
corrigée au projet ? » : les deux gardent leur version, **les deux se le
disent**, et chacun reprend celle de l'autre quand il le veut.

---

## Ce qui a été tranché

### L'établi ne s'ouvre que depuis un projet — et cela n'endette rien

La question posée était la bonne : *si l'on n'ouvre l'écran que depuis un projet
aujourd'hui, se prive-t-on de l'ouvrir hors projet demain, ou faudra-t-il tout
reprendre ?*

**Non, et ce n'est pas une opinion.** Trois constats :

1. **Le cœur est déjà sans projet.** Écrire, relire, déduire le formulaire,
   lancer, proposer une complétion : quatre portes, quinze modules en tout, et
   **aucun** ne touche le magasin, la base, l'authentification ni le projet
   courant. Le bac est une fonction pure de ses fichiers et de ses réponses.
   C'est la partie qui coûterait cher à défaire ; elle est déjà faite.
2. **Un écran sans projet n'est pas une nouveauté.** Sept en vivent déjà —
   `dashboard`, `projects`, `situations`, tous les sujets, toutes les
   propositions, le Copilote transversal, le référentiel —, et ils se
   reconnaissent tous à la même marque : `currentProjectId` nul. Ouvrir l'établi
   ailleurs, c'est une route de plus sur un patron éprouvé.
3. **Le magasin ne portera aucun projet.** C'est déjà ce que ce plan dit, et
   `atelier_ouvertures` en est le précédent : une table de l'Atelier qui ne sait
   ni qui, ni quand, ni sur quel projet.

Ce qui est, et restera, lié au projet : **« Proposer au projet »**, qui a besoin
d'un projet par définition, et le cadre de l'Atelier dans lequel l'écran est
posé. Rien d'autre.

**Le garde-fou.** Une épreuve marche le graphe des importations depuis les
quatre portes du cœur et refuse qu'aucune d'elles atteigne le magasin, la base,
l'authentification ou un module de projet — fût-ce trois modules plus loin. Elle
tient aussi le cœur sous trente modules. C'est elle qui garde la porte ouverte :
sans elle, la première ligne écrite « parce que c'est pratique » la refermerait
sans que personne s'en aperçoive avant d'essayer (règle 12).

### Une version versée puis corrigée au projet

On fait comme pour les autres utilitaires : **les deux gardent leur version, et
les deux se le disent**. Rien ne remonte tout seul dans l'établi de quelqu'un,
rien ne se réécrit tout seul dans la mémoire d'un projet ; l'écran signale que
les deux ont divergé et propose le geste, l'utilisateur décide, et ce qu'il
décide passe par une proposition signée.

La machinerie est à écrire : c'est le lot F, et il servira d'abord aux
utilitaires natifs, qui en manquent depuis le début.

---

## À faire plus tard

Ce qui est décidé, qui ne bloque personne, et qu'on fera quand il gênera.

### L'historique des versions

La table les porte **toutes** : `etabli_versions` garde le texte de chaque
version, et une version ne se réécrit jamais. Rien ne les montre encore.

Ce qu'il faudra : lire la `v1` après avoir écrit la `v3`, et comparer deux
versions ligne à ligne — le diff du Mdall existe déjà, c'est celui des
propositions. Cela dira aussi à un projet qui a signé la `v2` **ce que** la `v3`
a changé, là où l'écran ne dit aujourd'hui que **qu'elle** a changé.

Rien n'est perdu en attendant : le texte est gardé, et c'est le plus dur.

---

## Ce qui reste à trancher

- **Deux utilisateurs, la même règle.** L'entreprise voudra un jour un étage
  au-dessus de l'établi — un fonds commun. Ce n'est pas ce plan, et l'établi ne
  doit rien faire qui l'empêche.
- **Quand ouvrir l'établi hors projet ?** Quand quelqu'un en aura besoin : la
  porte est gardée ouverte, elle ne coûte rien à laisser fermée.

---

## L'écran d'un utilitaire : s'en servir, ou l'ouvrir

**On ouvre un outil de son établi pour lui poser une question**, pas pour lire
son code. Tomber sur le code quand on venait poser une question, c'est ouvrir le
capot pour démarrer — et c'est ce que l'écran faisait.

L'écran a donc deux façons de se tenir, et non deux écrans : deux écrans
auraient deux titres, deux barres de gestes et deux calibrages à refaire l'un
contre l'autre au premier réglage (règle 10). C'est le même brouillon, le même
bac, les mêmes gestes ; ce qui change, c'est ce qu'on montre en grand.

| | à l'écriture | à l'essai |
| --- | --- | --- |
| ce qu'on voit | le français à gauche, les fichiers à droite | le formulaire et ce que les règles concluent |
| sur la ligne du titre | « Lancer » | « Faire une proposition » |
| dans le menu | « Revenir à l'essai », « Faire une proposition » | « Modifier » |
| la console | en bas ou à droite | aucune |

**Un geste ne paraît qu'une fois.** « Faire une proposition » était en bouton
*et* dans le menu : deux chemins pour une porte, et l'un des deux finit par ne
plus ressembler à l'autre. À l'écriture il reste dans le menu ; à l'essai il
passe en bouton, parce que c'est le geste qui engage — et il quitte le menu.

**Et l'on ne lance pas ce qui est lancé.** À l'essai, la réponse se refait à
chaque champ rempli : un bouton « Lancer » dirait de faire ce qui est fait.

**L'aller-retour se fait par le menu, dans les deux sens.** On avait d'abord
laissé le retour à l'Atelier : rouvrir l'outil depuis la vitrine le remet à
l'essai, et c'était vrai. C'était aussi un détour de trois clics hors de l'écran
pour revenir à l'écran d'à côté, et cela s'est vu à l'usage — en faisant
l'aller-retour vingt fois. « Revenir à l'essai » est donc dans le menu, en face
de « Modifier ».

Il ne paraît que pour un utilitaire de l'établi : un brouillon qu'on n'a jamais
enregistré n'a pas d'essai à retrouver, l'écriture est chez lui, et « Lancer »
ouvre déjà son bac dans une fenêtre.

## Le cahier des charges se garde avec le code

La zone de français de l'écran s'appelait « Ce que vous voulez dire » ; elle
s'appelle maintenant « Ce que vous voulez dire, **ou faire** ». Le mot manquait,
et il disait tout : on n'y rédige pas une phrase, on y écrit **ce que l'outil
doit faire**. C'est le cahier des charges de l'utilitaire.

L'établi ne le gardait pas. Trois cent cinquante lignes écrites une après-midi,
l'utilitaire enregistré, l'onglet fermé : au retour, la zone était vide. Et comme
le seul bouton qui sache réécrire du Mdall — « Coder » — part de cette zone-là,
rouvrir pour modifier laissait deux choix : réécrire de mémoire ce qu'on avait
mis des heures à formuler, ou ne plus toucher à l'outil.

**Il se pose sur la version, non sur la fiche.** Il aurait été plus court de le
ranger à côté du résumé, dans l'identité de l'outil. Ç'aurait été dire qu'il
décrit l'outil en général, alors qu'il décrit ce qu'on a écrit ce jour-là : la
`v3` répond à son cahier des charges, pas à celui de la `v5`.

Conséquence assumée : **corriger le cahier des charges sans toucher au Mdall
monte d'une version.** C'est juste — ce qu'on a écrit a changé, et une version ne
se réécrit jamais. Sans cette montée, le seul moyen de corriger le cahier des
charges d'une version déjà posée serait de l'écraser.

**En revanche, cela ne se propose pas comme un code modifié.** Ce qui entre dans
la mémoire d'un projet, c'est le Mdall. Dire « v2 modifiée » pour une phrase de
français corrigée décrirait un code différent de celui qu'on verse, et le
comparer plus tard à l'établi ne dirait rien de juste. Les deux questions se
posent au même endroit, et se distinguent par ce qu'on lui donne à comparer.

### Ce que la batterie a trouvé, et le motif qu'elle dessine

Vingt-six mutations, vingt et une attrapées. **Les cinq qui sont passées étaient
toutes du câblage** — pas une seule dans la logique pure :

- le profil ne poussait plus la section de l'établi ;
- le contexte transverse ne lisait plus l'établi ;
- une lecture ratée se lisait comme un établi vide ;
- l'exécuteur ne recevait plus le nom de l'outil à lancer ;
- ni l'établi du tour, dans lequel le chercher.

Chaque pièce était éprouvée chez elle : `sectionDeLetabli` rend bien le texte,
`reponseDeLutilitaire` calcule bien, l'exécuteur annonce bien la version. Les
**coutures** entre elles ne l'étaient pas, et il suffisait d'en défaire une pour
que le Copilote ne sache plus rien de l'établi — sans qu'une épreuve bronche.

C'est le même motif que deux rondes plus tôt, quand le cahier des charges se
perdait entre le service pur, la base et l'écran. La leçon se répète assez pour
être écrite : **une fonction pure s'éprouve par son résultat ; un câblage ne
s'éprouve que par le code qui le porte.** Quand le module ne se charge pas — il
parle à la base, ou il vit au serveur —, c'est l'exception qui justifie de relire
le source.
