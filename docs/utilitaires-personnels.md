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

## Lot B — L'établi : garder un utilitaire

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

- « Enregistrer dans l'Atelier », dans le menu de la ligne du titre — l'entrée
  est déjà là, éteinte, et dit ce qu'elle attend.
- Une fenêtre : le nom, la description, et ce que le brouillon prend et rend,
  **montré** avant d'enregistrer. On voit ce qu'on signe.
- Sur un utilitaire déjà enregistré : « Enregistrer » monte d'une version, et
  l'écran dit laquelle.

---

## Lot C — Le retrouver, le rouvrir, le reprendre

- L'onglet **« Mon établi »** dans l'Atelier, à droite de « Ajouté récemment ».
- Une ligne par utilitaire : son nom, sa description, sa version, ce qu'il prend
  et ce qu'il rend, et quand il a bougé pour la dernière fois.
- Il paraît **dans tous mes projets**, à l'identique : c'est le même établi.
- Le rouvrir remet ses fichiers dans « Écrire du Mdall », et l'écran dit qu'on
  reprend `v3` de tel utilitaire — pas un brouillon anonyme.
- L'historique des versions se lit, et une version se relit telle qu'elle était.

---

## Lot D — Le proposer à un projet

Le bouton existe et fait déjà ce qu'il faut : « Proposer au projet » ouvre une
proposition portant les fichiers, relue ligne à ligne et signée. Ce lot n'ajoute
qu'une chose : **la proposition dit d'où elle vient** — « utilitaire *Volets en
bois*, `v3`, de votre établi » —, comme une proposition issue d'un PDF dit de
quel PDF elle sort.

Une fois versée, la règle est **au projet** : elle vit dans sa mémoire, elle se
relit, se compare, se rejoue, et elle se capitalise comme les autres. L'établi
en garde sa copie, et les deux peuvent diverger — c'est voulu : le projet a
signé une version, mon établi continue sa vie.

---

## Lot E — Le Copilote sait qu'elle est là

> « Quels impacts si les volets passent de PVC à bois ? »
> — « Alors la couleur devra être violette. »

Rien de spécial à écrire : une règle versée au projet est **une règle du
projet**, et le Copilote interroge déjà la mémoire du projet. Ce lot est donc
surtout une épreuve : on verse l'utilitaire des volets, on pose la question, et
l'on vérifie que la réponse cite la règle et sa provenance.

Ce qui reste à faire pour de vrai : que la trace de la réponse dise **de quelle
proposition** la règle est venue, pour qu'on remonte de la réponse à ce qu'on a
signé.

---

## Lot F — Dire qu'une version plus récente existe

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

## Ce qui reste à trancher

- **Deux utilisateurs, la même règle.** L'entreprise voudra un jour un étage
  au-dessus de l'établi — un fonds commun. Ce n'est pas ce plan, et l'établi ne
  doit rien faire qui l'empêche.
- **Quand ouvrir l'établi hors projet ?** Quand quelqu'un en aura besoin : la
  porte est gardée ouverte, elle ne coûte rien à laisser fermée.
