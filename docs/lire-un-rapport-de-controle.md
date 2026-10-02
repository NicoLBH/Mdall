# Lire un rapport de contrôle technique

Trois lectures du corpus de suite ont dit la même chose : **4 223 affirmations sur
9 488 sont des intitulés d'avis**, et aucune ne porte de mot de liaison. Le
raisonnement d'un bureau de contrôle n'est pas dans l'étiquette « Avis 146 — Giron
des marches ≥ 28 cm » : il est dans le texte écrit **sous** elle, et ce texte
n'était pas en mémoire.

C'est la plus grande réserve de matière du produit, et elle était inatteignable.

## Pourquoi l'utilitaire ne l'atteignait pas

Il lisait ces rapports **par motifs** — des expressions régulières sur le texte
extrait, réglées à la main dans un champ de l'écran. Deux conséquences, et la
seconde est la plus lourde.

### Rien n'était conservé

On repayait l'extraction pour revoir ce qu'elle avait trouvé, et l'on ne comparait
deux réglages qu'en gardant deux captures d'écran. Ajuster une consigne sans
pouvoir comparer avant et après, c'est régler à l'aveugle — exactement ce que le
lecteur de comptes rendus avait réglé en novembre, et qu'on n'avait pas porté ici.

### Un motif ne lit pas une légende

C'est le point qui condamnait la méthode. Un rapport de contrôle **n'écrit pas ses
avis en toutes lettres** : il pose « F », « D », « SO », « ○ », « ● » dans une
colonne étroite, et explique une seule fois, souvent en page 2 ou en dernière
page, ce que chaque marque veut dire.

Un motif qui cherche « favorable » dans le corps ne trouve rien, parce que le mot
n'y est pas. Et deviner est pire que ne rien trouver : « S » vaut « suspendu »
chez un bureau et « sans objet » chez un autre. Une légende devinée rend des avis
faux avec l'aplomb des vrais.

## Le chemin, désormais celui du compte rendu

    reconnaître la structure et la légende
      → transcrire en Markdown
        → relever les avis

### La légende est reconnue avec la structure

Et non à l'analyse. Pour la même raison que les colonnes d'un tableau : **la
question n'a qu'une réponse par document**, et la poser douze fois en donnerait
douze. Une transcription page par page décide page par page — le même tableau
gagne dix colonnes à la page 1 et huit à la page 2.

La reconnaissance regarde six pages au plus et ne rend qu'un squelette. C'est
l'appel le moins cher des trois, et celui qui décide le plus.

Cette étape existait déjà : son commentaire d'origine disait qu'elle servirait
« un rapport de bureau de contrôle, un CCTP, une notice de sécurité », qui ont
tous le même défaut — ce sont des tableaux déguisés dont la forme ne se devine
qu'en voyant plusieurs pages à la fois. Il ne manquait que la légende, et elle
sert les deux : un compte rendu qui n'en a pas rend une liste vide, **qui est une
réponse**.

### La légende se recopie, elle ne se résout pas

La tentation était de remplacer « F » par « Avis favorable » dans tout le
document. Ce serait réécrire le document au lieu de le transcrire — et une
légende mal lue se propagerait à deux cents lignes **sans laisser de trace**.

La consigne dit donc l'inverse : la table restituée une fois, sous `## Légende`,
et les marques laissées telles quelles dans le corps. L'analyse les résout, et
l'écran montre les deux côte à côte. Une marque du corps absente de la table se
voit alors d'un coup d'œil.

## Ce que l'écran montre, et dans quel ordre

À l'accueil, la zone de dépôt puis **le tableau des rapports déjà analysés** — on
arrive ici pour reprendre une analyse bien plus souvent que pour en lancer une
première. Une ligne par rapport, et non par lecture : relire pour ajuster une
consigne est le geste le plus fréquent, et un tableau par lecture montrerait huit
fois le même rapport.

Chaque ligne dit **lequel** (numéro, date, nature), **si la légende a été lue**
(le nombre de marques) et **s'il y a de quoi comparer** (le nombre de lectures).
Le clic ouvre le détail, qui remplace l'écran au lieu de s'y ajouter.

Le détail suit ce qu'on vient y chercher :

1. ce que la lecture a valu — pages, caractères, avis, **marques illisibles** ;
2. les trois étapes, et laquelle a été sautée s'il y a lieu ;
3. la légende, avec les marques employées qu'elle ne déclare pas ;
4. les avis, avec leur marque **et ce qu'elle veut dire ici** ;
5. la transcription, repliée — la plus longue, et celle qu'on déroule quand les
   quatre premières ne suffisent pas.

## Les trois distinctions qui tiennent tout

Elles reviennent à chaque écran de ce produit, et elles sont ici ce qui sépare un
outil utilisable d'un outil qui ment.

**« On n'a pas relevé » n'est pas « il n'y en a aucun ».** `null` et `0` mènent à
des gestes opposés — relancer l'étape, ou conclure que le rapport ne porte rien —
et `Number(null)` vaut zéro, qui est fini (règle 5).

**« Le rapport ne tranche pas » n'est pas « la marque est illisible ».** Un avis
sans marque est un document qui n'a pas statué ; un avis dont la marque n'est pas
déclarée est une légende mal lue, ou un rapport qui emploie une marque qu'il
n'annonce pas. Les trois se corrigent à trois endroits différents.

**« La structure n'a pas été reconnue » n'est pas « la lecture a échoué ».** La
transcription se fait alors sans squelette : on perd la cohérence entre pages, pas
la lecture. Le taire ferait relire une transcription faite sans squelette en
croyant lire une transcription faite avec.

## Privée, et pour une raison de plus que les autres

`rapport_lectures` est privée comme `cr_lectures` et `fil_lectures` : une lecture
d'Atelier est un brouillon, elle n'appartient qu'à qui l'a faite.

Celle-ci porte en outre **le verdict d'un tiers sur l'ouvrage**. Un avis
défavorable mal relu, montré à l'entreprise concernée avant d'avoir été vérifié,
est exactement ce qui discréditerait l'outil. La séparation est tenue par la base,
ou elle n'est pas tenue.

## Le geste qui manquait, et ce qu'il a appris

Le premier round de ce lecteur a livré la moitié qui **relit** — la table, le
service pur, le tableau de l'accueil, le détail au clic — et pas celle qui **lit**.
Rien n'appelait les trois étapes, rien n'écrivait de ligne. Le tableau était donc
vide à jamais, et un tableau vide ne se voyait pas du tout : `renderLesRapportsLus`
rendait une chaîne vide quand il n'y avait aucune lecture. L'écran était
rigoureusement inchangé, et une épreuve l'exigeait même explicitement.

Trois choses en sont sorties, et elles valent plus que le bouton lui-même.

**Un tableau vide se dit.** « Aucun rapport n'a encore été lu sur ce chantier » est
une information ; une section absente n'en est pas une. L'épreuve qui demandait la
chaîne vide a été réécrite : elle encodait le défaut.

**Un banc refuse ce que personne n'appelle.** `scripts/rien-que-personne-nappelle.test.mjs`
lit les modules du lecteur comme du texte — ce qu'on ne s'autorise que pour les
défauts invisibles autrement — et refuse un export dont le nom n'apparaît nulle
part ailleurs, pas même chez lui. C'est la forme exacte du défaut payé :
`conserverUneLectureDeRapport` était écrit, éprouvé, et appelé par personne.

Un export **employé dans son propre module** passe : `renderLesAvisReleves` n'est
appelé que par `renderLeDetailDunRapport`, qui l'est par l'écran. Exiger un
appelant extérieur condamnerait tout découpage d'un gros rendu en pièces
éprouvables, qui est ce qu'on veut encourager.

Le banc a trouvé une seconde chose du même round : `lesLecturesDunMemeRapport`,
écrite et jamais appelée — alors que ce document promettait, en toutes lettres, que
« le détail d'un rapport montre ses lectures précédentes ». Une déclaration qu'on
ne vérifie pas est une intention (règle 12). Le détail les montre maintenant, avec
leur date, leur lecteur et leurs nombres, parce que c'est en comparant deux
lectures qu'on voit si une consigne a fait mieux — « 42 avis » ne dit rien tant
qu'on ne sait pas que la précédente en donnait 11.

## La porte, et la zone qui avait disparu

L'écran n'avait plus de zone de dépôt. Elle avait été retirée au nom d'**une
seule porte** : les documents entrent par l'onglet Documents, une proposition les
soumet, quelqu'un l'accepte.

La règle est juste — pour le **corpus**, qui devient la mémoire du chantier. Mais
lire un rapport n'est pas le verser. Sans zone, il fallait d'abord faire entrer un
rapport au corpus pour avoir le droit de le lire, c'est-à-dire l'inverse de
l'ordre naturel : on lit pour décider si cela vaut d'entrer. Le lecteur de comptes
rendus n'a jamais eu ce défaut, et les deux écrans font le même geste.

La zone est donc revenue, avec ses deux portes — **depuis l'ordinateur** pour le
rapport qu'on vient de recevoir, **depuis Fichiers** pour celui qui est déjà dans
le projet, qu'on descend chercher sans en remonter un second exemplaire. Et elle
dit ce qu'elle ne fait pas : les rapports sont lus ici, les déposer n'ajoute rien
au corpus, et rien n'entre en mémoire.

### Une seule zone pour les deux écrans

Elle était écrite trois fois dans le lecteur de comptes rendus, sous ses propres
classes `lecture-cr__depot*`. Tout autre écran devait donc emprunter les classes
d'un voisin, ou s'en refaire une qui aurait dérivé au premier ajustement
(règle 4).

Le dessin a rejoint le **branchement** du glisser-déposer, qui vivait déjà dans
`views/ui/zone-de-depot.js` : les deux moitiés d'une même chose au même endroit,
et les attributs nommés une fois — deux écrans qui écriraient le leur finiraient
par n'en traiter qu'un (règle 10).

Mettre les deux côte à côte a montré un défaut que ni l'un ni l'autre ne
montrait seul : l'aide, plus claire et plus dense que la consigne, se lisait comme
le titre, et la consigne comme une note de bas de page. Les deux écrans y gagnent.

Le composant de choix dans Fichiers a dû cesser de nommer un écran : son bouton
disait « Lire 19 comptes rendus » et sa phrase parlait de propositions à signer.
Le suivi des avis lit des **rapports** et n'ouvre **aucune** proposition. Les mots
viennent maintenant de qui appelle, et les valeurs par défaut sont neutres plutôt
que celles du premier arrivé — un défaut qui dit « compte rendu » se serait glissé
dans l'autre écran sans que rien ne le dise.

### Le défaut qu'aucun rendu ne peut dire

Une zone dessinée que personne ne branche se voit, s'ouvre au clic, et refuse le
glisser-déposer **en silence** : le navigateur ouvre alors le PDF dans un onglet,
et la page est perdue avec ce qui s'y écrivait. La batterie l'a montré — remplacer
l'attribut cherché par un ancien nom ne faisait tomber aucune épreuve.

Une épreuve lit donc le source des deux écrans et exige que chacun qui **dessine**
la zone la **branche**, par la constante et non par une chaîne. Elle compte aussi
les écrans qu'elle a lus : sans ce compte, une liste devenue fausse la rendrait
verte en ne vérifiant plus rien.

## Le bouton qui ne faisait rien

« Lire 1 rapport », un clic, et **rien** : ni appel, ni message, ni changement à
l'écran.

La cause est une règle écrite à deux endroits. Le bouton comptait les rapports
déposés **sans erreur** ; la lecture, elle, n'en gardait que ceux dont au moins
une page **porte du texte**. Un PDF scanné — une image, sans couche de texte —
passait le premier compte et tombait au second. Les deux moitiés étaient justes
séparément, et c'est pour cela qu'aucune épreuve de rendu ne pouvait le dire
(règle 4).

Le partage vit maintenant dans `leLotALire`, et l'écran s'en sert **des deux
côtés** : ce qu'il compte est exactement ce qu'il lira. Ce qui ne peut pas être lu
est nommé avant le clic, avec ce qu'il faut en faire — un scan doit passer par une
reconnaissance de caractères avant d'être déposé. Et si l'on arrive malgré tout
sans rien à lire, on le dit : rendre la main en silence était le défaut lui-même
(règle 5).

Une épreuve lit le source de l'écran et refuse qu'une seconde règle de lisibilité
y réapparaisse.

## Pourquoi rien n'apparaît dans Actions

C'est voulu, et c'est la différence de fond avec le lecteur de comptes rendus.

Celui-ci réveille une **file au serveur** : la lecture s'inscrit dans
`versements`, et c'est cette table qu'Actions dresse. Le lecteur de rapports, lui,
appelle les trois fonctions de bord **depuis le navigateur** et garde sa lecture
dans `rapport_lectures` — aucune ligne de file, donc rien dans Actions.

La conséquence est réelle : fermer l'onglet pendant la lecture d'un lot l'arrête,
là où une file aurait continué. C'est acceptable pour un ou deux rapports, et ça ne
l'est plus pour trente. Le jour où ce lecteur passera au serveur, il entrera dans
Actions par la même porte que les autres.

## Ce que la lecture fait, et ce qu'un échec laisse

Les trois appels sont **passés** à l'orchestrateur, jamais faits par lui. C'est ce
qui permet d'éprouver le parcours entier, échecs compris, sans serveur : une
épreuve qui ne sait pas faire tomber la deuxième étape ne vérifie pas qu'une
lecture sans Markdown est refusée.

| l'étape qui tombe | ce qui reste | pourquoi |
|---|---|---|
| la structure | tout le reste | la transcription se fait sans squelette : on perd la cohérence entre pages, pas la lecture |
| la transcription | **rien** | une lecture sans Markdown n'est pas une lecture : il n'y a rien à rouvrir |
| le relevé | la transcription | le document transcrit vaut d'être gardé, et l'écran dit que les avis n'ont pas été relevés — jamais qu'il n'y en a aucun |

Un rapport qui échoue n'arrête pas les suivants, et les rapports se lisent **en
série** : trois appels chacun, un lot de trente lancé d'un coup se ferait limiter.

**La légende de la structure gagne, celle du relevé la complète.** Les deux lisent
le même document, donc compléter n'est pas emprunter la légende du voisin. Mais en
cas de désaccord sur une marque, la reconnaissance tranche : elle est allée
chercher la table exprès, sur six pages choisies pour cela, là où le relevé la
ramasse en passant. Prendre la plus récente ferait dépendre le sens de « S » de
l'ordre des appels.

**Le constat est gardé et montré** — « Région A2, altitude 260 m ». C'est ce que le
bureau a écrit en plus du verdict, ce que la lecture par motifs perdait, et sans
quoi un engagement ne se vérifie pas : on saurait que le bureau a dit
« favorable », pas sur quoi.

## Ce qui n'est pas fait

**Rien n'entre en mémoire depuis cet écran.** Le chemin reste copilote → atelier →
proposition → mémoire (règle 1). Ce round donne de quoi lire un rapport et
conserver ce qu'on en a lu ; porter les avis dans une proposition est le round
suivant, et c'est là que la matière des 4 223 intitulés deviendra des affirmations
qui disent quelque chose.

**L'analyse par motifs reste en place** à côté du nouveau chemin. La retirer dans
le même round aurait mêlé deux changements : le procédé de lecture, et ce qu'on
fait de ce qu'on a lu. Elle s'en ira quand le nouveau chemin aura lu assez de
rapports réels pour qu'on sache qu'il fait mieux — et ce « assez » se mesurera
dans le tableau, qui est précisément ce que ce round ajoute.
