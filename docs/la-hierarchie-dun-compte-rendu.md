# La hiérarchie d'un compte rendu

**À quoi sert cette page :** le plan de fabrication pour que les sujets tirés d'un compte
rendu de chantier cessent d'être à plat. Ce qu'on retient, dans quel ordre on le fabrique, et
comment on saura que ça marche.

Elle prolonge [`lire-un-compte-rendu.md`](lire-un-compte-rendu.md), qui décrit la chaîne du
PDF à la proposition. Cette chaîne est faite ; ce qui suit porte sur ce qu'elle produit.

---

## 0. Avant tout : pourquoi le journal de la fusion ne s'affiche pas

Le code est en place — `journal-de-la-fusion.js`, `project-runs-supabase.js`, la lecture dans
`syncProjectActionsFromSupabase`. Il manque donc une des deux choses suivantes, et il faut
savoir laquelle **avant** de chercher ailleurs :

1. **La migration `202610020001_project_runs.sql` n'a pas été appliquée.** C'est le cas le
   plus probable. La table n'existe pas, l'écriture échoue en silence — et la fusion affiche
   alors la phrase prévue pour ce cas : « Le journal de cette fusion n'a pas pu être conservé :
   la fusion est faite, mais l'onglet Actions ne la retrouvera pas après un rechargement. » Si
   cette phrase est apparue, c'est elle.

2. **La lecture est refusée.** `project_runs` porte une politique ouverte en lecture ; si la
   requête tombe, la console du navigateur porte `[actions] project_runs illisible`.

Rien à réparer dans le code tant que l'un des deux n'est pas constaté. Ce point est en tête du
plan parce qu'il **bloque la vérification de tout le reste** : sans le journal, on ne voit pas
ce qu'une fusion a fait.

---

## 1. Le constat

Le compte rendu n° 19 des Gets porte cinquante points. Il les range, et son rangement est
la moitié de son information :

```
A) OBSERVATIONS SUR COMPTE RENDU PRECEDENT
B) DISPOSITIONS GENERALES & ADMINISTRATIVES
   1. Marché de travaux
   2. Installation de chantier
   3. Situation de travaux
   4. Coordonnateur SPS          ── un intervenant
   5. Contrôle technique         ── un intervenant
   6. Echange de documents
   7. Documents exécutions
C) PREPARATION / AVANCEMENT / OBSERVATIONS
   Lot n° 1 : Démolition / Gros Œuvre : Entreprise GILETTO
     ❑ Structure coffrage dalle R+1 réalisé à 30 %
     ❑ Engager dès semaine prochaine reprise embrasure du RDC
     ❑ …
   Lot n° 2 : CHARPENTE : Entreprise PRAWOOD
   …
   Lot n° 12 : VENTILATION TRAITEMENT D'AIR : Entreprise MEYER
     ❑ /                          ── rien à cette réunion
   Lot n° 14 : ECHAFAUDAGE : Entreprise LUGDUNUM
E) DIVERS
   Maître d'Ouvrage · CIL · PROJECTEC · GRISAN   ── des intervenants
```

Mdall en tire aujourd'hui cinquante sujets **côte à côte**. « Structure coffrage dalle R+1
réalisé à 30 % » et « Mettre en place les inspections communes » sont au même niveau, dans une
liste qui compte déjà quarante-cinq lignes ouvertes. Le rangement du document est perdu à la
lecture, et personne ne le retrouve ensuite.

Deux conséquences, et la seconde est la plus coûteuse :

- **on ne peut plus naviguer.** Quatre-vingt-treize sujets à plat ne se parcourent pas ;
- **l'assignation devient une devinette.** `aQuiRevientLePoint` lit le `qui` du point, puis
  son lot, et tranche au plus proche. Elle se trompe, et l'on ne sait pas dire pourquoi.

---

## 2. Ce qu'on retient

**Une rubrique du document devient un sujet père.** Les points qu'elle contient deviennent ses
fils.

```
Sujet père   « Lot n° 1 : Démolition / Gros Œuvre : Entreprise GILETTO »   label LOT
  ├─ fils    « Structure coffrage dalle R+1 réalisé à 30 % »
  ├─ fils    « Engager dès semaine prochaine reprise embrasure du RDC »
  └─ fils    « Le sciage de l'embrasure biaise : retour tableau de 12 cm »
```

Trois raisons, et aucune n'est cosmétique.

**L'entreprise épingle un sujet, et un seul.** GILETTO épingle son père. Elle voit au-dessus
de la liste combien de points lui restent ouverts, sans lire les quatre-vingt-douze autres.

**Le maître d'œuvre ouvre une vue.** `label:LOT` rend une vingtaine de lignes — une par
intervenant —, chacune avec son compte de fils ouverts et fermés. On entre dans un lot, on en
sort, on ne se perd pas.

**L'assignation cesse d'être devinée.** Un fils revient à l'entreprise de son père, sauf si le
document dit autre chose. C'est structurel, donc vérifiable : ce n'est plus une comparaison de
chaînes, c'est une position dans le document.

### Un père est un contenant, pas une tâche

Il n'a pas d'échéance, pas d'état propre, et **son état se déduit de ses fils** : ouvert dès
qu'un fils est ouvert, fermé quand aucun ne l'est. C'est la règle 2 — ce qui est dérivé se
recalcule.

C'est aussi ce qui règle le Lot n° 12, qui ne porte que « / » à cette réunion : le père se
crée fermé, et le premier point du compte rendu suivant le rouvrira tout seul. On n'a rien à
décider, et rien à défaire.

> **Une exception nommée.** Partout ailleurs, fermer est une décision qui se signe. Ici, c'est
> un calcul — parce qu'un contenant vide ne dit rien d'autre que « il n'y a rien dedans », et
> qu'une décision humaine sur ce point serait une décision sur rien.

---

## 3. Le socle qui existe déjà

Presque rien à créer. Il s'agit d'alimenter ce qui est là.

| Ce qu'il faut | Où c'est | État |
| --- | --- | --- |
| Le lot lu pour chaque point | `SCHEMA_DES_SUJETS.sujets[].lot` | ✅ déjà rendu par le modèle |
| Hiérarchie père/fils | `subjects.parent_subject_id` | ✅ colonne et index |
| Le vocabulaire du lien | `liens-du-cr.js` — `LIEN.PARENT`, `estHierarchique` | ✅ nommé |
| Les lots du chantier | `lots-du-cr.js`, `project_lots` | ✅ numéro, nom, comparaison |
| Les labels | `label-du-cr.js`, `project_labels`, `subject_labels` | ✅ mécanisme |
| Le compteur de fils | `views/ui/subissues-counts.js` | ✅ composant partagé |
| L'épingle | `subject_pins`, `epingles-des-sujets.js` | ✅ |
| Les vues enregistrées | `vues-des-sujets.js`, recherches épinglées | ✅ |
| **Une rubrique comme objet de lecture** | — | ❌ à faire |
| **Un sujet père proposé, puis appliqué** | — | ❌ à faire |

Autrement dit : **le modèle voit déjà le rangement, et la base sait déjà le porter.** Ce qui
manque est entre les deux.

---

## 4. Les étapes, dans l'ordre

Une étape par livraison. Chacune se vérifie seule, et aucune ne suppose la suivante.

### Étape 1 — Le journal de la fusion s'affiche

Constater lequel des deux cas du § 0 s'applique, et le corriger. Rien d'autre.

**Comment on le vérifie :** on fusionne, on va dans Actions, on lit les onze étapes et leurs
durées. Tant que ce n'est pas vrai, les étapes qui suivent ne se vérifient qu'à l'œil.

---

### Étape 2 — La lecture rend des rubriques

Le schéma de `extract-sujets` gagne un tableau `rubriques`, et chaque point dit **sous
laquelle** il a été lu.

```jsonc
{
  "rubriques": [
    { "ordre": 1, "intitule": "Marché de travaux",                          "genre": "administrative" },
    { "ordre": 4, "intitule": "Coordonnateur SPS",                          "genre": "intervenant"    },
    { "ordre": 8, "intitule": "Lot n° 1 : Démolition / Gros Œuvre : Entreprise GILETTO",
                  "genre": "lot", "numero": "1", "societe": "GILETTO" }
  ],
  "sujets": [
    { "rubrique": 8, "titre": "Structure coffrage dalle R+1 réalisé à 30 %", … }
  ]
}
```

**Trois genres, et pas deux.** Un lot porte un numéro et une entreprise. Une rubrique
d'intervenant en désigne un sans numéro de lot — le SPS, le contrôle technique, l'architecte
de la section « DIVERS ». Une rubrique administrative ne désigne personne : « Échange de
documents » n'est à personne en particulier. Les confondre ferait assigner des points à une
procédure.

**Le point pointe la rubrique par son `ordre`, pas par son intitulé.** Un intitulé recopié
deux fois finit par différer d'un espace, et le rattachement se perd sans rien dire (règle 10).

**Ce qui se vérifie sans modèle :** `rubriques-du-cr.js`, pur et testé — l'identité d'une
rubrique (le numéro pour un lot, l'intitulé aplati sinon), la reconnaissance du genre, le
rattachement d'un point à sa rubrique, et le compte des **orphelins**.

> **Un point sans rubrique reste un sujet racine**, et il se compte. La section A —
> « observations sur compte rendu précédent » — n'en produit d'ailleurs aucun. Ce qui compte
> est de ne pas lui en inventer une : ne pas savoir n'autorise pas à ranger au hasard
> (règle 5).

---

### Étape 3 — Une rubrique devient une ligne de la proposition

Nouvelle nature `ITEM_TYPE.RUBRIQUE`. Elle porte l'intitulé tel que le document l'écrit, son
genre, son numéro et sa société le cas échéant, sa citation et sa page.

Elle se coche comme les autres : **rien n'entre directement dans la mémoire** (règle 1). Une
rubrique refusée ne crée pas de père, et ses points restent racines.

L'écran de la proposition les montre **en tête**, avant les sujets : c'est l'ordre dans lequel
on décide, puisque les fils en dépendent.

**Le label.** Un père de genre `lot` ou `intervenant` porte `LOT` — c'est le mot du métier, et
c'est lui qui fera la vue. Un père administratif porte `Dispositions générales`. Les deux
labels se proposent comme les autres, par `labelsAProposer`.

> **Pourquoi `LOT` sur le contrôle technique.** Parce que la question posée par la vue n'est
> pas « quels sont les lots du marché » mais « qui a quelque chose à faire ». Le SPS et le
> bureau de contrôle en ont. Si l'usage montre que les deux doivent se distinguer, un second
> label les séparera sans rien casser — un label s'ajoute, il ne se migre pas.

---

### Étape 4 — Le père s'ouvre à la fusion, et les fils s'y rattachent

Deux écritures, dans cet ordre.

1. **Le père.** Un sujet dont le titre est l'intitulé de la rubrique, avec ses labels. Son
   identité entre deux comptes rendus est le **numéro du lot**, jamais le nom de l'entreprise :
   « GILETTO » et « GILETO » sont la même société mal recopiée, et un père par orthographe
   ferait deux lots n° 1.
2. **Les fils.** `parent_subject_id` sur chaque sujet ouvert ou relancé sous cette rubrique.

Le journal de la fusion gagne une étape — `rubriques`, « Pères ouverts » —, et l'étape
`sujets` dit combien de fils ont été rattachés.

**Ce qu'un échec coûte :** un fils qui ne se rattache pas reste racine. Le sujet existe, son
contenu est juste, il est mal rangé. On le dit et l'on continue — refuser la fusion pour un
rangement serait faire payer l'essentiel par l'accessoire.

---

### Étape 5 — L'état d'un père se déduit de ses fils

Une fonction pure : `etatDuPere(fils)` → ouvert dès qu'un fils est ouvert.

Elle se calcule à trois moments : à la fusion, à la fermeture d'un fils, à l'ouverture d'un
fils. C'est ce qui ferme le Lot n° 12 le jour où il ne porte que « / », et le rouvre à la
réunion suivante.

**Comment on le vérifie :** deux comptes rendus successifs sur le même projet, dont le second
rouvre un lot resté vide. Cela se joue dans l'Atelier sans rien écrire.

---

### Étape 6 — L'assignation descend du père

`aQuiRevientLePoint` gagne un troisième recours, **et il passe devant les deux autres quand le
point ne nomme personne** : la société du père.

L'ordre devient : ce que le point dit (`qui`) → la société de la rubrique → rien. Le lot
numérique disparaît de la chaîne : c'était lui qui assignait « demandé à l'entreprise
GILETTO » au maître d'ouvrage.

**Comment on le vérifie :** le compte rendu n° 19, où les points du Lot 1 doivent tous revenir
à GILETTO, et « Confirmer à LABEVIERE la position des attentes » — écrit sous le Lot 11 —
rester chez MUFFAT, puisque c'est lui qui doit confirmer.

---

### Étape 7 — Rattraper les sujets déjà à plat

Le projet porte déjà quatre-vingt-treize sujets ouverts sans père. Les laisser ainsi ferait
deux moitiés de liste, l'une rangée et l'autre pas.

Un geste, dans l'Atelier, qui **propose** — il n'écrit pas : pour chaque sujet portant le
label `CR chantier` et un lot reconnaissable dans son titre ou sa description, un rattachement
au père correspondant. On coche, on signe, ils entrent.

**Ce qui ne se rattrape pas se dit** : les sujets dont le lot ne se lit pas restent racines, et
leur nombre s'affiche. C'est une lacune connue, pas un trou.

---

### Étape 8 — L'écran : le compteur, l'épingle, la vue

Rien à inventer, trois branchements.

- **Le compteur de fils** sur la ligne d'un père : `renderProblemsCountsIconHtml`, celui des
  sous-sujets. Il existe, il est partagé, on ne le refait pas.
- **L'épingle** : `subject_pins` est là. Ce qui manque est de la proposer d'un clic depuis la
  ligne d'un père.
- **La vue « Lots »** : une recherche `label:LOT`, enregistrée. Elle se **propose** comme tout
  le reste — une situation ne se crée pas d'office (règle 1).

---

### Étape 9 — Les mesures

L'écran de lecture de l'Atelier gagne trois chiffres, à côté de ceux de la restitution :

| Chiffre | Ce qu'il dit | Ce qu'on surveille |
| --- | --- | --- |
| Rubriques reconnues | 21 | Un écart avec le document se voit à l'œil |
| Points rattachés | 47 / 50 | Le taux de rattachement |
| **Orphelins** | 3 | **Le chiffre à surveiller** |

Un orphelin n'est pas une faute : la section A n'en produit pas, et « DIVERS » peut en
produire. Ce qu'on surveille est sa **variation** d'un compte rendu à l'autre : elle dit que
la lecture a dérivé.

---

## 5. Ce que cet ordre refuse

**De demander la hiérarchie à un modèle qui raisonne.** Le plan d'origine prévoyait un
troisième appel, cher, pour établir les liens entre sujets. Il reste utile pour les liens
fonctionnels — « bloqué par », « fait double emploi avec ». Mais **la hiérarchie n'est pas un
raisonnement : c'est une lecture.** Le document la porte, en toutes lettres, dans ses titres.
La faire déduire coûterait cher pour retrouver ce qu'il suffisait de recopier.

**De commencer par la vue.** C'est ce qu'on voit, donc ce qu'on a envie de faire d'abord. Une
vue `label:LOT` sur des pères qui n'existent pas ne montre rien.

**De rattraper l'existant avant de savoir produire du neuf.** L'étape 7 vient après la 4, parce
qu'un rattrapage qui rangerait mal quatre-vingt-treize sujets serait plus long à défaire qu'à
faire.

**De créer un père en silence.** Un père est un sujet : il apparaît dans les listes, il
compte, il s'assigne. Il se signe comme les autres.

---

## 6. Plus tard

Deux directions notées ici pour ne pas les perdre. Ni l'une ni l'autre n'est dans le plan
ci-dessus.

### Les situations sortent du périmètre d'un projet

Comme les `Projects` de GitHub, qui traversent les dépôts. L'entreprise GILETTO suivrait alors
tout ce qui lui est assigné **sur l'ensemble de ses chantiers** ; le bureau de contrôle
verrait ses tâches sans ouvrir les comptes rendus un par un.

Ce que cela suppose : `situations.project_id` cesse d'être obligatoire, une situation porte un
périmètre — un projet, plusieurs, tous ceux où je suis —, et la règle de lecture suit. C'est
un changement de la portée d'un objet, donc à traiter seul.

**Et c'est la hiérarchie qui le rend utile** : une situation trans-projets qui rendrait
quatre-vingt-treize lignes par chantier ne servirait à personne.

### Lire les documents côte à côte

Deux choses, dans cet ordre :

1. **Le `.md` de la restitution entre dans Fichiers** à la fusion, rangé sous le compte rendu
   dont il vient. C'est la dixième étape de [`lire-un-compte-rendu.md`](lire-un-compte-rendu.md),
   restée en suspens.
2. **Plusieurs PDF à l'écran, en onglets** — le plan de l'architecte à gauche, le rapport du
   bureau de contrôle à droite. C'est ce qu'on fait sur un chantier avec deux feuilles sur une
   table, et c'est ce qu'aucun écran ne permet aujourd'hui.

---

## 7. Ce qui reste ouvert

**Le mot du label.** `LOT` sur le contrôle technique et le SPS est un abus de langage assumé :
ce ne sont pas des lots du marché, mais des intervenants qui ont quelque chose à faire. La vue
les veut. Si l'usage montre qu'il faut les distinguer, un second label le fera — mais il faut
l'usage avant.

**Un point qui concerne deux lots.** « Contacter GILETTO pour dépose poutre étaiement » est
écrit sous le Lot 2, et engage les deux. Un sujet n'a qu'un père. Le second lien existe déjà —
`LIEN.LIE_A` — mais rien ne le pose aujourd'hui. À traiter quand le cas se présentera
vraiment : deux comptes rendus suffiront à le dire.

**La profondeur.** Deux niveaux, et pas trois. Un compte rendu range en deux niveaux ; en
autoriser un troisième ouvrirait une arborescence que personne n'a demandée, et qu'on ne
saurait plus afficher.
