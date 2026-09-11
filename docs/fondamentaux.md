# Les fondamentaux

Ce qui suit ne se discute pas au cas par cas. Ce sont les règles dont tout le
reste dépend, et une fonctionnalité qui en contredit une est fausse même si elle
marche.

---

## 1. Rien n'entre jamais directement dans la mémoire du projet

**Aucun écran, aucun utilitaire, aucun calcul, aucun modèle n'écrit dans la
mémoire du projet.** La seule voie est une **proposition**, et c'est un humain
qui la signe.

Ce n'est pas une précaution de plus : c'est ce qui donne sa valeur à la mémoire.
Une écriture directe perdrait quatre choses d'un coup.

- **L'histoire.** Une proposition dit ce qui a changé, et par rapport à quoi.
  Une écriture directe laisse une valeur nouvelle sans rien pour la comparer à
  l'ancienne.
- **La responsabilité.** Quelqu'un assume le changement, avec son nom et sa
  date. « L'utilitaire l'a écrit » n'est pas une réponse en réunion.
- **Les conflits.** Une proposition se confronte à ce que le projet a déjà
  décidé, et les contradictions se règlent **avant** d'entrer, pas après.
- **Le retour en arrière.** On pourra défaire une proposition — *on avance en
  défaisant, on ne recule jamais*. On ne défait pas une écriture qui n'a jamais
  été un acte.

### Le chemin, et il n'y en a pas d'autre

```
Copilote            l'Atelier              la Proposition            la Mémoire
on discute,   →   on entre dans le    →   ce qui a changé,      →   ce que le
on échange,       détail, on produit      qui l'assume, les         projet tient
on réfléchit      de la matière           conflits arbitrés,        pour vrai
                  exploitable             la signature humaine
```

Une étape intermédiaire existe et compte autant : **le sujet**. On y débat avec
l'équipe du projet avant de proposer quoi que ce soit.

> L'architecte : « Socotec, j'ai mis 2 niveaux sous le niveau de référence,
> pouvez-vous confirmer ? »
> Socotec : « Non, le premier niveau n'est pas comptabilisé, les secours peuvent
> y accéder : un seul niveau de sous-sol. »
> L'architecte : « Ok, je modifie, je ferme le sujet et je fais une proposition
> dans ce sens. »

Il met alors ses données à jour dans l'utilitaire, il recalcule, **puis** il
transforme en proposition — et c'est là que les tests, la détection de conflits,
leur arbitrage et la signature ont lieu.

### Défaire, c'est proposer de plus

Une proposition fusionnée se **défait**, depuis la ligne qui raconte sa fusion.
Rien n'est effacé et rien n'est rejoué à l'envers : le geste prépare **une
proposition de plus** — celle qui remet ce qui valait avant — et quelqu'un la
signe. La mémoire portera l'aller *et* le retour, ce qui est exactement ce qu'on
veut relire six mois plus tard.

Deux cas, et le second compte autant que le premier :

- l'affirmation en remplaçait une autre → on remet **celle d'avant**, telle
  qu'elle était écrite ;
- elle n'en remplaçait aucune → elle est **écartée**. Elle reste lisible ; un
  refus est une information.

Ce qu'on ne défait pas : une affirmation qu'une décision **plus récente** a déjà
remplacée. La défaire ressusciterait une valeur périmée par-dessus un choix
postérieur que personne n'a demandé d'annuler. La proposition le dit, plutôt que
de laisser croire à un retour en arrière complet qui n'a pas eu lieu.

### Un retrait est un refus

Sortir un document du corpus, écarter une affirmation : c'est le même geste, et
le vocabulaire existait déjà. Un **item refusé** — un document refusé passe hors
corpus, une affirmation refusée entre en mémoire comme écartée. Rien n'est
effacé : le fichier reste en base, visible et marqué, et l'on sait quand et par
qui.

C'est ce qui manquait pour oser déposer. Un document ajouté par erreur n'avait
aucune correction, et la seule issue était de vivre avec.

### On ne signe pas sans savoir ce que le projet dit déjà

Une proposition qui n'affiche que ce qu'elle apporte demande de connaître par
cœur l'état de la mémoire. Personne ne le connaît. L'onglet **Changements**
montre donc les deux valeurs côte à côte, une ligne par sujet — ce que le projet
dit aujourd'hui, ce que la proposition en dirait — et l'écart se lit sans rien
ouvrir.

Quatre lectures, et une seule demande une décision :

| Ce qu'on voit | Ce que ça veut dire |
| --- | --- |
| la colonne de gauche est vide | une **entrée nouvelle** |
| les deux diffèrent | une **correction** — c'est pour elle que le tableau existe |
| la colonne de droite est vide | un **retrait** |
| les deux disent la même chose | rien ne change, et on l'affiche quand même |

Sur une proposition **fusionnée**, « aujourd'hui » mentirait : la mémoire porte
déjà ce que la proposition a écrit, et les deux colonnes afficheraient la même
valeur. On lit alors ce qu'elle a réellement écrit et ce que cette écriture
remplaçait — l'histoire est en base, il suffit de la lire au bon endroit.

Et si la mémoire n'a pas pu être lue, aucune ligne ne se prétend nouvelle : une
lecture ratée qui afficherait « le projet ne dit rien » ferait signer douze
corrections prises pour douze ajouts (règle 5).

### Ce que cela impose au code

- Un écran d'Atelier propose un bouton **« Transformer »**, jamais un bouton qui
  écrit. Ses deux issues sont *ouvrir un sujet* et *faire une proposition*.
- Le système **prépare** la proposition à partir de la matière produite dans
  l'Atelier : il la remplit, il ne la signe pas. Elle reste ouverte jusqu'à ce
  que quelqu'un la fusionne.
- `rememberProposition` est la porte de la mémoire. Les chemins
  `rememberHypothesis` et `rememberBaseDatum` restent réservés à la déclaration
  faite **à la main** dans l'écran Mémoire, où l'auteur est présent et signe par
  son geste. Aucun utilitaire ne les appelle.

---

## 2. Ce qui est dérivé se recalcule, ce qui a été décidé se conserve

Un degré coupe-feu se recalcule tant qu'il sert à décider : le référentiel
progresse, et une valeur gelée deviendrait fausse sans le dire. Le jour où
quelqu'un le **retient** — il l'écrit dans la notice, il l'annonce au maître
d'ouvrage —, ce n'est plus une lecture, c'est une décision : elle passe par une
proposition, et elle se conserve.

Corollaire : une base ne conserve jamais un résultat de calcul. Elle conserve
les **réponses** qui l'ont produit, et le calcul se refait.

---

## 3. Une conversation avec le copilote est privée

Elle appartient à qui l'a ouverte, dans les deux sens, et aucun collaborateur du
projet ne la voit. Ce n'est pas un réglage : c'est une propriété de la
construction — la table le refuse.

Ce qu'on veut partager se **transforme** : « Créer un sujet à partir de la
discussion » ouvre un sujet visible par l'équipe, dont les messages deviennent
des commentaires. Le geste est explicite, et c'est ce qui permet de parler
librement au copilote le reste du temps.

---

## 4. Une valeur écrite à deux endroits finit par diverger

Quand deux fichiers doivent porter la même liste et ne peuvent pas s'importer
l'un l'autre, **un test les compare**. Une divergence casse la construction
plutôt que de se découvrir six mois plus tard.

---

## 5. Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien

Un écran qui n'a pas pu lire dit qu'il n'a pas pu lire. Il n'affiche pas une
liste vide, il ne remplit pas un champ d'une valeur plausible, et un modèle
n'invente jamais une entrée de calcul : il la demande, ou il s'en passe et le
dit.

---

## 6. Une mémoire de projet ne garde pas que des valeurs

Un projet ne se souvient pas d'une liste de chiffres. Il se souvient de ce qu'on
a **décidé**, de ce qu'on **suppose** en attendant mieux, de la **règle** qui a
produit une valeur, de la **preuve** qui la fonde, et de l'**état** de tout cela
aujourd'hui.

Ces cinq objets ne se mélangent pas — la donnée, sa valeur, la règle, la preuve,
le statut. Le langage les sépare, et `docs/langage-mdall.md` en porte la
grammaire entière.

```
zone: Bâtiment A {
   Classement du bâtiment = "3e famille B" {
      règle: Classement du bâtiment — arrêté du 31 janvier 1986, article 3, 3°)
      statut: retenu
   }
}
```

Quatre conséquences pour le code :

1. **La règle a son propre fichier, et le projet en garde un instantané.** Une
   règle vaut pour mille bâtiments, une valeur pour un seul : les mêler
   produisait des règles fabriquées à partir des cotes du projet — `si hauteur =
   26` là où l'arrêté dit `<= 28 m`. Mais elle doit être **dans** le projet,
   dans un `.ref`, sans quoi le renvoi `règle: …` pointe vers rien, le graphe ne
   se reconstruit pas, et un arrêté modifié plus tard réécrirait l'histoire en
   silence — ce que la règle 2 interdit.
2. **Le mot-clé de provenance est l'origine.** `règle:` est déduite,
   `document:` est lue, `calcul:` est calculée. Un champ « origine » à côté
   redirait la même chose et finirait par la contredire (règle 4).
3. **Rien ne se recopie de ce qui se déduit.** Les dépendances sortent des
   conditions de la règle : les écrire aussi les laisserait diverger le jour où
   quelqu'un modifie la règle sans y penser.
4. **Rien ne s'invente.** Un « parce que » fabriqué serait pire que pas de
   « parce que », puisqu'on le citerait en réunion (règle 5). Un utilitaire qui
   ne sait pas pourquoi écrit la valeur, et c'est tout.

---

## 7. Le texte est la mémoire, dans les deux sens

```
lire(écrire(G)) = G
```

Chaque information du graphe apparaît une fois dans le texte, et rien de
déductible n'y apparaît. Un test le vérifie.

Cette loi n'est pas une élégance : c'est ce qui permet à un architecte d'écrire
trois lignes à la main et de les injecter, et c'est ce qui fait qu'un utilitaire
nouveau n'a rien à brancher — il écrit du mdall, comme tous les autres.

Elle interdit aussi quelque chose : **on n'ajoute au langage aucune information
qu'on ne saurait pas relire.** Toute construction nouvelle passe d'abord par ce
test.

Elle impose enfin que **tout se tape au clavier**. Un langage qu'un architecte
doit pouvoir écrire à la main ne peut pas exiger une table de caractères : les
marques `§`, `¶`, `←`, `≤` sont devenues des mots suivis de deux points. La
grammaire entière est dans `docs/langage-mdall.md`.

Ce qui n'est pas compris n'est jamais avalé en silence. La lecture rend la
ligne, son numéro et la raison du refus — un fichier amputé qui entrerait sans
bruit en mémoire serait pire qu'un fichier refusé.

---

## 8. Les sources vivent dans Fichiers, la mémoire s'exécute

L'onglet **Fichiers** porte les **sources** du projet, et elles sont de même
nature qu'elles viennent d'un PDF ou de l'application : un plan déposé, une
valeur relevée, une règle appliquée, une décision signée sont toutes des choses
à partir desquelles le projet se reconstruit. Deux racines, et pas une de plus :
`Mémoire/` pour ce que l'application écrit, `Documents/` pour ce que
l'utilisateur dépose.

L'onglet **Mémoire** ne stocke rien. Il *exécute* ces sources comme un
navigateur exécute le dépôt : il cherche, il croise, il remonte les
dépendances, il exporte. Tout ce qu'il montre se recalcule depuis les fichiers
— ce qui est exactement la règle 2, appliquée à l'écran.

Deux conséquences pour le code :

1. **Ce qui agit sur les documents ne s'affiche que sur les documents.** Le
   menu et le bouton « Déplacer » n'apparaissent pas dans `Mémoire/` : on ne
   déplace pas à la main un fichier que l'application écrit.
2. **Aucun écran de la mémoire n'a d'état à lui.** Un pliage de bloc, un
   chemin, un mode de lecture sont des vues ; les effacer ne perd rien.

---

## 9. Une fonction s'écrit toujours en entier ; un agent s'appelle

Mdall écrit le raisonnement d'un projet en clair. Une règle d'incendie s'écrit
`si (Hauteur ≤ 28 m) alors ("3e famille B")`, avec son article et sa citation :
sa loi est publique — c'est un arrêté —, et l'écrire est ce qui permet de la
rejouer, de la contester et de la voir vieillir quand le texte change.

Certains utilitaires n'ont pas cette loi-là. Un pré-dimensionnement de fondations
superficielles parcourt trois cent quatre-vingt-huit combinaisons : **sa loi est
le produit**, et l'écrire dans le fichier d'un projet reviendrait à la donner. On
ne peut pas non plus la cacher — il a décidé de cotes que le client paiera en
béton, et « ne pas savoir n'autorise pas à prétendre qu'il n'y a rien ».

### L'amalgame qu'il fallait défaire

Une première version avait écrit `fonction native Prédimensionnement des
fondations superficielles(…) { … }`, comme si **la fonction** était opaque. Elle
ne l'est pas, et c'est la règle :

> Une fonction s'écrit **toujours** en entier. Son commentaire, ses entrées, ses
> branches, ce qu'elle enregistre : tout se lit. Ce qui ne se lit pas, c'est
> l'**agent** qu'elle appelle — et c'est la ligne d'appel qui le porte.

```
fonction Prédimensionnement des fondations superficielles(Bâtiment A, Profondeur hors gel, Données d'entrée des fondations superficielles) {
   // Dimensionne les massifs superficiels d'une zone : descente de charge,
   // combinaisons, portance du sol, glissement, renversement et ferraillage.
   // La loi de calcul appartient à l'utilitaire — elle ne s'écrit pas ici.

   const Profondeur hors gel à retenir;
   si (Profondeur hors gel renseigné)
   alors (Profondeur hors gel à retenir = Profondeur hors gel)
   sinon (Profondeur hors gel à retenir = importe (variable: Profondeur hors gel, depuis: sol.ctr, zones: Bâtiment A));

   résultat = agent-D (
      utilitaire: dimensionnement_fondations_superficielles,
      version: V1,
      zones: Bâtiment A,
      Profondeur hors gel: Profondeur hors gel à retenir,
      Données d'entrée des fondations superficielles: Données d'entrée des fondations superficielles à retenir
   );

   enregistre (
      Résultat du calcul des fondations superficielles: résultat,
      dans: structure.ctr,
      zones: Bâtiment A
   )
}
```

Tout est lisible sauf une ligne. C'est la différence entre « le corps de cette
fonction est secret » — faux, et décourageant — et « cette fonction appelle un
tiers, le voici nommé » — vrai, et vérifiable.

### Deux agents, et la différence n'est pas technique

« Calcul » était trop étroit : un utilitaire calcule, un autre cherche dans une
table, un troisième lit un document et n'en extrait qu'une date. Le point commun
n'est pas le calcul, c'est qu'**un tiers fait le travail et rend un résultat**
sans que sa loi descende dans le projet.

Ce qui les sépare est la **reproductibilité**, et une mémoire de projet ne peut
pas l'ignorer :

| | mêmes entrées | ce qu'on peut en dire |
| --- | --- | --- |
| `agent-D` | **même sortie, toujours** | le rejouer suffit à vérifier |
| `agent-IA` | sortie qui peut varier | il faut conserver ce qu'il a rendu |

Un `agent-D` se rejoue et l'on compare. Un `agent-IA` ne se rejoue **pas** pour
vérifier : le rejouer donnerait peut-être autre chose sans que le projet ait
bougé, et l'écran annoncerait un changement qui n'en est pas. Ce qu'il a répondu
**ce jour-là**, avec quel modèle et quelle version, est donc la seule vérité, et
se conserve.

Les deux s'appellent de la même façon et pourront travailler côte à côte dans
une même fonction — orchestrés, en parallèle. C'est ce que le mot rend possible,
et c'est aussi ce qui rendra un jour lisible une fonction écrite par quelqu'un
d'autre : `agent-D` et `agent-IA` sont deux mots du langage, pas deux détails
d'implémentation.

### Quatre questions, et le bloc y répond dans l'ordre

1. **Que consomme-t-elle ?** La signature les nomme toutes.
2. **Comment l'appeler ?** L'appel montre ses arguments, un par ligne.
3. **Sous quelle forme sort le résultat ?** Il porte un nom, déclaré dans
   `variables-du-projet.ref` avec sa `structure attendue`.
4. **Où est-il rangé ?** L'`enregistre` le dit — le fichier, et la portée.

### Ce que cela n'autorise pas

Appeler un agent n'est pas une porte de sortie pour ce qu'on n'a pas eu le
courage d'écrire. Cela se justifie par **une** raison, et elle se dit en une
phrase : la loi est le produit. Une règle qu'on trouve fastidieuse à transcrire
reste une règle, et s'écrit.

### Une fonction pose ce qu'elle range, pas son propre nom

Une règle conclut sur son nom : « Classement du bâtiment » conclut le classement.
Une fonction qui appelle un agent conclut sur le nom qu'elle **range**, qui n'est
pas le sien. Trois endroits du code en dépendent, et le manquer coupait la chaîne
en silence :

| où | ce qu'il faut lire |
| --- | --- |
| `memoire-applications.js` | les lectures se rattachent à **chaque** sortie |
| `memoire-plan.js` | ce qu'elle pose est **dérivé**, pas du socle |
| `memoire-evaluateur.js` | elle est **indécidable** au navigateur : la loi de l'agent n'est pas dans le texte |

Ce dernier point est le garde-fou. Sans lui, une fonction sans conditions
s'évaluait sur zéro condition, donc « vraie », et le rejeu annonçait qu'elle tient
— sans avoir rien calculé. Une confirmation qu'on n'a pas obtenue est pire qu'un
silence : elle apprend à croire l'écran.

---

## 10. Un nom vit à un seul endroit

Deux fichiers déclarent « Profondeur hors gel » : l'utilitaire climat écrit dans
`sol.ctr`, celui des fondations dans `structure.ctr`. Les deux lignes vivent,
chacune a ses héritiers, et rien ne dit qu'elles parlent de la même chose.

C'est le défaut le plus coûteux qu'une mémoire puisse porter, et il grandit tout
seul : chaque nouvel utilitaire, chaque nouvel utilisateur peut en créer un.
Trois conséquences, et la troisième est la pire :

- **les valeurs divergent** — 0,466 m d'un côté, 0,47 m de l'autre ;
- **le raisonnement se coupe** — une règle lit l'une, une autre lit l'autre, et
  la chaîne qu'on croit suivre n'existe pas ;
- **une variante ment.** On change la valeur qu'on voit, l'autre ne bouge pas, et
  l'écran annonce des conséquences qui n'en sont pas — ou n'en annonce aucune.

### La règle

> Un nom du projet est déclaré **dans un seul fichier**. Le fichier est une
> propriété du **nom**, pas de celui qui l'écrit.

Aujourd'hui le fichier se déduit de `{nature, domaine}`, et le domaine est choisi
par l'utilitaire qui verse. Deux utilitaires donnent donc deux domaines au même
sujet, et le même nom atterrit à deux endroits sans que personne l'ait voulu.

### Comment on s'y prend — en trois temps

**1. Le voir.** C'est fait : un fichier qui déclare un nom déclaré ailleurs
l'affiche en tête, en rouge, avec l'autre fichier. Un défaut invisible ne se
corrige jamais ; un défaut nommé se corrige à la première relecture.

**2. Le registre fait autorité.** C'est fait. Le premier versement qui déclare
un nom fixe son **domicile** ; tout versement ultérieur du même nom écrit là,
quel que soit le domaine qu'il s'était donné. Un nom ne « choisit » plus son
fichier à chaque écriture — il en a un, une fois pour toutes.

« Premier » se lit dans le temps, et à date égale par l'identifiant : il faut un
ordre **total**, sans quoi deux lectures des mêmes affirmations éliraient deux
premiers et les noms déménageraient d'un rendu à l'autre. Le registre ne se verse
pas : il se déduit des affirmations à chaque lecture, comme
`variables-du-projet.ref`. Un registre stocké serait une seconde vérité, et elle
divergerait au premier versement (règle 4).

**3. Verser ailleurs ouvre un conflit, jamais une seconde ligne.** C'est fait.
Un versement qui visait un autre fichier n'y crée rien : il rejoint le domicile
du nom, et le désaccord se **dit** — des deux côtés. Le fichier qui a reçu la
ligne annonce « ce nom vous a été versé ailleurs, il vit ici » ; celui qu'on
visait annonce « ce nom vous était destiné, il vit là-bas ». Sans les deux, on
chercherait longtemps pourquoi une valeur n'est pas là où l'utilitaire a cru
l'écrire.

Le conflit se compte par **nom**, pas par versement : ce qui se tranche est « où
vit ce nom », et le répéter pour chaque valeur ferait lire trente désaccords là
où il y en a un. Il se règle comme les autres — devant quelqu'un, par une
proposition. Ce qui est interdit, c'est le **silence**.

C'est la même réponse que partout ailleurs en informatique — *une seule source de
vérité par nom*, une clé unique, une résolution qui ne devine pas —, appliquée à
une mémoire de projet plutôt qu'à une base.

### Un écran qui montre autre chose que le fichier ment deux fois

La règle vaut au-delà du rangement : **tout ce qui parle d'une ligne doit en
parler pareil.** Trois écarts l'ont montré, et chacun était invisible :

- le **diff d'une proposition** nommait le fichier depuis le seul
  `{nature, domaine}` de la ligne, sans consulter le registre : il pouvait donc
  annoncer un fichier que la mémoire ne crée pas ;
- il **écrivait sa propre version** d'une fonction à agent — une tête sans
  signature, sans appel, sans `enregistre` — là où le fichier l'écrit en entier.
  On relisait deux textes de la même ligne, et c'est celui qu'on ne relit pas qui
  a raison le jour où l'on cherche ;
- le **graphe des dépendances** ne lisait que les conditions d'une règle. Une
  fonction qui appelle un agent n'en a pas : elle *déclare* ce qu'elle lit et ce
  qu'elle range, sous d'autres noms que le sien. Le graphe était donc vide, et
  une variante sur la profondeur hors gel annonçait « rien ne bouge » alors
  qu'elle refait toutes les fondations. C'est le mensonge le plus coûteux qu'un
  outil de ce genre puisse produire : il ne se voit pas, et l'on décide dessus.

Chacun se ferme de la même façon — non pas en corrigeant les deux textes, mais
en **supprimant le second** : un seul juge pour le rangement, un seul écrivain
pour la fonction, un seul endroit qui dit ce qu'une règle lit et ce qu'elle
produit.

### Où c'est écrit

`apps/web/js/services/memoire-domiciles.js` — le registre, les conflits, le
fichier d'un nom, et le texte d'une fonction à agent ; le rangement des
affirmations et le diff des propositions passent par lui.

### Ce qui reste

Rien du mécanisme. Reste l'usage : un domicile mal choisi au premier versement se
corrige aujourd'hui en versant une proposition, comme toute contradiction. Un
geste dédié — « déménager ce nom » — se justifiera le jour où l'on en fera assez
souvent pour que le détour se remarque.


## 11. On ne corrige pas la mémoire, on verse par-dessus

La question s'est posée devant un projet d'essai : *une donnée est mal écrite —
un utilitaire s'est trompé, ou quelqu'un a versé à la main. Je recommence un
projet ?*

Non. Recommencer serait avouer que la mémoire ne sait pas se corriger, et un
projet réel dure trois ans. La réponse tient en une phrase :

> Une affirmation ne se réécrit pas et ne s'efface pas. On **verse par-dessus**,
> et la précédente devient de l'histoire.

C'est la même réponse que le contrôle de version donne depuis quarante ans : on
ne récrit pas un commit, on en fait un autre. Ce qui a été cru compte — c'est
même la raison d'être de cette mémoire.

### Trois cas, et ce que chacun demande

**1. Une valeur fausse.** On reverse le même nom, pour la même portée. Le dernier
versement est ce que le projet tient pour vrai ; les précédents restent lisibles
dans l'origine de la ligne. Rien à faire de plus, et surtout rien à effacer.

Sans cette règle, deux versements du même nom et de la même zone vivaient côte à
côte, tous deux « retenu » — une pile où l'on ne savait plus ce qui valait. Et
quand la valeur a changé, le fichier le dit : passer de 0,47 m à 0,50 m sans un
mot ferait relire une valeur en croyant que c'est celle d'hier.

**2. Un nom rangé au mauvais endroit.** C'est la règle 10 : le domicile est fixé
par le premier versement, et verser ailleurs ouvre un conflit plutôt qu'une
seconde ligne. Se règle par une proposition, comme toute contradiction.

### Deux portées qui se recouvrent : la plus spécifique l'emporte

Poser une valeur pour tout le projet, puis la raffiner sur un bâtiment, est la
façon normale de travailler : une généralité, puis ses exceptions. Une valeur
qui **nomme** la zone l'emporte donc, pour cette zone-là ; ailleurs, c'est la
générale qui s'applique. La spécificité passe avant la date — sinon on ne
pourrait plus raffiner un projet sans que la première valeur générale versée
ensuite ne défasse tout.

Deux obligations en découlent, et elles ne sont pas facultatives :

- **le même juge partout.** Ce que le fichier affiche, ce que le rejeu consomme
  et ce qu'une variante fait bouger doivent être **la même ligne**. Les deux
  résolutions prenaient auparavant la première ligne du tableau — l'ordre où la
  base avait rendu ses lignes : l'écran montrait 42 m et le calcul tournait sur
  13 m. Une variante posée sur la valeur affichée ne changeait rien en aval, et
  rien ne le disait ;
- **une exception qui répète le général se signale.** Elle ne dit rien de plus
  aujourd'hui, et le jour où la générale change, cette zone reste sur l'ancienne
  valeur sans que personne l'ait décidé. On ne la retire pas — peut-être
  était-ce voulu — on la nomme, et quelqu'un décide.

**3. Des noms qui ne devraient plus exister du tout.** Une version d'un
utilitaire versait quatre-vingts cotes une par une — `Section Lx de la semelle
Portique courant file A`, et ainsi de suite ; la suivante range tout dans un seul
tableau. Les quatre-vingts noms restent, sans producteur et sans lecteur.

Il en existe une seconde forme, et c'est la même : on crée une « zone d'essai »,
on y calcule, les résultats s'écrivent, puis on retire la zone. Les valeurs
restent, portées par une zone qui n'existe plus.

Dans les deux cas la ligne **sort du présent** et **reste dans le passé**. Elle
quitte le code du fichier, elle garde son auteur, sa date et sa proposition, et
le fichier dit pourquoi elle est partie — au pied, dans une section « hors
périmètre ». C'est la différence entre « on ne s'en sert plus » et « ça n'a
jamais existé », et une mémoire qui les confond ne vaut plus rien.

Deux déclencheurs, et **rien ne se devine** :

- une version d'utilitaire qui a repris le travail d'une précédente, sur une
  portée donnée — chaque ligne porte l'utilitaire et la version qui l'ont
  produite ;
- une définition de zone remplacée ou écartée : c'est la trace du retrait.

Une zone dont aucune définition n'a jamais existé n'entre pas : personne ne l'a
retirée, personne ne l'a décrite non plus, et les lignes qui la portent restent
visibles — c'est ainsi qu'on verra qu'il manque une définition. Sans trace du
retrait, la ligne reste : mieux vaut une ligne de trop qu'une ligne escamotée
sans raison.

### Ce qui ne sera jamais offert

Un bouton « supprimer cette ligne ». Une mémoire dont on peut retirer une
décision n'est plus une mémoire : c'est un tableau qu'on arrange, et personne ne
peut plus répondre à « depuis quand ne croit-on plus cela ? ».

### Où c'est écrit

`apps/web/js/services/memoire-valeurs.js` — la dernière valeur, le juge des
portées, et ce qu'une correction a remplacé.

`apps/web/js/services/memoire-perimetre.js` — ce qui a quitté le présent, et
pourquoi.

---

## 12. On enregistre ce qui a été vérifié ; on ne le réclame jamais

Un projet se rend unique par **ce que des gens ont engagé dessus**. N'importe
quel projet en Haute-Savoie trouvera la même zone de neige ; un seul a l'avis
favorable du bureau de contrôle daté du 12 mars. Cet engagement est la chose la
plus chère de la mémoire, et Mdall doit savoir ce qu'un changement lui fait.

Mais **Mdall n'est pas un outil de visa, et ne le sera jamais.** Il en existe
d'excellents. Notre marché — les petits et moyens projets de construction — est
allergique aux procédures, et une procédure de plus est une raison de plus de ne
pas se servir de l'outil.

La ligne tient en une phrase : **Mdall ne réclame rien à personne.** Un outil de
visa *sollicite* — file d'attente, circuits d'approbation, relances, statuts
d'avancement. Mdall **enregistre ce qui a été dit, et en tire les conséquences**.
Personne n'est jamais bloqué en attendant que quelqu'un valide.

### Trois conséquences pour le code

1. **Un engagement porte sur une version, jamais sur un sujet.** Il pointe vers
   l'identifiant d'une affirmation. Quand la valeur est remplacée, il ne suit
   pas : il reste accroché à ce qui a réellement été examiné. La chaîne des
   remplacements *est* le mécanisme de péremption — il n'y en a pas d'autre à
   écrire.

2. **Un engagement allonge une histoire, il n'ajoute pas un état.** Pas de cycle
   *en attente → approuvé → refusé* sur une valeur. La valeur ne change pas
   d'état ; seule son histoire s'allonge. C'est ce qui permet de ne jamais s'en
   servir sans que rien ne se bloque.

3. **Un avis ne devient jamais faux — il cesse de couvrir.** Un constat reste
   vrai à sa date (règle 6). Ce qui tombe est sa couverture, pas lui. On écrit
   « ne couvre plus la valeur d'aujourd'hui », jamais « invalidé ».

### Le mot `visa` est un mot de code

Il reste dans le code parce que c'est le mot juste du métier et qu'en inventer un
autre serait pire. Il **n'apparaît jamais à l'écran**, et un test le vérifie.

| jamais à l'écran | à l'écran |
| --- | --- |
| « visa », « à viser », « en attente de visa » | rien : la chose se dit par son auteur et sa date |
| une pastille « VALIDÉ », un niveau de validation | « Avis F — bureau de contrôle, 12 mars » |
| un circuit, une file, une relance | *(n'existe pas)* |

Le geste, quand il existe, est le plus léger possible : une action discrète sur
une valeur — **« j'ai vérifié »** — qui écrit une ligne et ne demande rien à
personne.

### Ce que le système ne décide jamais

Il dit **ce qui tombe**, jamais ce qui tient. Deviner qu'un changement est
favorable et garder l'avis serait un jugement d'ingénieur ; se tromper garderait
en vie un avis mort, qu'on citerait en réunion. C'est la règle 5 : on dit « cet
avis portait sur une valeur qui a changé », et quelqu'un tranche.

Il ne compte pas non plus les voix. Cinq signatures du même bureau ne font pas
cinq vérifications : on rend **la liste** de ce qui a été engagé, jamais un score
qui se comparerait par un `>`.

### Où c'est écrit

`docs/ce-qui-couvre-une-valeur.md` — le plan entier, ses six décisions et ses
quatre étapes.

`apps/web/js/services/hypothesis-acts.js` — les actes sur une hypothèse, dont
ceci est la généralisation : l'état déduit et jamais stocké, le dernier acte qui
fait foi, et la répétition qui ne vaut pas validation.
