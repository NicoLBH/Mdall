# La chronologie des sources

## Le problème

Un compte rendu qui ne parle plus d'un sujet le ferme. La règle se défend : un
point réglé cesse d'être rapporté, et rouvrir coûte un clic.

**Mais elle suppose que les documents arrivent dans l'ordre où ils ont été
écrits.** Déposez le compte rendu n° 20 après le n° 57, et tous les sujets nés
entre les deux sont absents du n° 20 — pas parce qu'ils sont réglés, mais parce
qu'ils n'existaient pas encore. La règle les ferme tous.

**Le dépôt d'une archive suffisait à vider un projet.**

Ce n'est pas un défaut du compte rendu : c'est un défaut de tout ce qui se
déduit d'une absence. Il touchera de la même façon la mémoire, les
raisonnements et les hypothèses, dès qu'une valeur ancienne arrivera après une
valeur récente.

## Deux dates, et les confondre est l'erreur

| | Ce que c'est | Ce qu'elle ordonne |
|---|---|---|
| **la date du document** | la réunion s'est tenue le 12 mars | **tout** |
| la date du dépôt | il est entré dans Mdall le 20 septembre | quand quelqu'un a eu le temps de classer |

La seconde ne dit rien du chantier. C'est la première qui compte, et c'est elle
qu'il faut lire — sur le document, jamais dans la base.

## La règle : le fait daté passe, la déduction non

| Ce que le document fait | Depuis le passé |
|---|---|
| Il ouvre un sujet | **oui** — un point qu'on ne suivait pas reste à suivre |
| Il dit « fait », avec sa date | **oui** — c'est un fait daté, et la proposition se signe avec cette date sous les yeux |
| Il n'en parle plus | **non** — c'est une déduction sur *maintenant*, et un document du passé ne sait rien de maintenant |

Une phrase du document est vraie au jour du document. Une absence, elle,
n'énonce rien : elle ne devient une fermeture que par un raisonnement sur l'état
présent — et ce raisonnement exige que le document **soit** le présent.

## Quatre places, et deux ignorances qu'on ne confond pas

- **`EN_TETE`** — rien de plus récent n'est connu. Elle révise tout. C'est aussi
  la place du premier document d'un projet.
- **`RETROSPECTIVE`** — une source plus récente est déjà connue.
- **`SANS_DATE`** — le document n'est pas daté.
- **`SANS_REPERE`** — on n'a pas pu lire l'histoire du projet.

Les deux dernières sont des ignorances **différentes**, et les confondre
enverrait chercher une date sur un document qui en porte une. Aucune des trois
dernières ne déduit.

**Le sens de l'erreur est choisi, et c'est la même asymétrie que partout
ailleurs** : un sujet laissé ouvert à tort se voit et coûte un clic ; un sujet
fermé à tort disparaît. Le défaut du paramètre est donc le refus de déduire —
un appelant qui oublie de dire où il se place ne récupère pas par omission la
seule révision qui efface des sujets.

## Le piège qui coûte quinze ans

La base range en ISO — `2026-09-11`. Le document est lu à la française —
`11 septembre 2026`, `11/09/2026`. **Les deux formes circulent.**

Or la lecture française retient `26-09-11` dans `2026-09-11` et rend
**`2011-09-26`**, sans rien signaler. Le compte rendu le plus récent du projet
passerait pour le plus ancien, et son silence fermerait tout.

L'ISO se reconnaît donc d'abord, **et à son ancrage au début** : la date d'un
compte rendu est souvent lue dans une phrase — « réunion du 11/09/2026,
réf. 2024-03-01 » — et sans l'ancrage, la référence l'emporterait.

## Ce qui est branché, et ce qui ne l'est pas

| Où | État |
|---|---|
| La fermeture d'un sujet absent d'un compte rendu | **fait** |
| La source et la date sur chaque fermeture proposée | **fait** |
| La date du constat sur une question restée sans réponse | **fait** |
| Les valeurs versées en mémoire | **fait** |
| Les raisonnements et leurs lectures enregistrées | **fait** |
| Les hypothèses et les variantes | **fait** |

## Le même moteur, transposé aux valeurs

`le-temps-des-valeurs.js` reprend la règle telle quelle, un cran plus bas. Deux
dates, la même hiérarchie :

- **la date du document** — `payload.provenance.le`. C'est elle qui ordonne.
- **la date du versement** — `decided_at`. Elle dit quand quelqu'un a eu le temps
  de saisir, et rien du chantier.

Et l'on dit toujours **laquelle des deux a servi** (`DATEE_PAR`). Une valeur dont
on ne connaît que la date de versement n'est pas une valeur datée de son
document : les deux ne se relisent pas pareil (règle 5).

### La dégradation est choisie, et sans surprise

Presque aucune valeur déjà en mémoire ne porte la date de son document. Si
l'ordre basculait d'un coup sur une date que personne n'a renseignée, toute la
mémoire changerait de sens en silence — le défaut même qu'on répare.

Donc : **tant qu'aucun candidat ne porte de date de document, on ordonne comme
avant**. Le comportement ne change que là où l'information existe.

### Les trois branchements

**La mémoire.** `memoire-valeurs.js` ne trie plus par date de saisie : ses trois
juges — ce qui est éclipsé, ce qui a été corrigé, ce qui vaut dans une zone —
passent tous par `ordreDesValeurs`, à un seul endroit (règle 4). Une valeur lue
dans un rapport de mars et saisie en septembre n'écrase plus celle de juin.

Et l'écran ne les confond pas : une valeur **corrigée** est un changement d'avis,
une valeur **arrivée après coup** est un décalage de saisie, qui se rattrape
autrement. `versementsRetrospectifs()` nomme les secondes ; le fichier les dit à
part, avec l'icône de l'histoire et non celle de l'alerte.

**Les raisonnements.** Une conclusion garde ce que ses entrées valaient alors —
c'est tout l'intérêt de la mémoire, et recalculer en douce déciderait à la place
de quelqu'un (règle 1). Mais une conclusion qui repose sur une valeur qu'un
document plus récent a revue **mêle deux instants** : elle a l'air d'être
d'aujourd'hui. L'histoire d'une valeur porte désormais une rubrique
« Revu depuis », juste sous « Elle a lu », et elle **nomme les sujets** — « repose
sur une valeur revue » sans dire laquelle envoie tout relire.

**Les hypothèses.** Une variante retient maintenant **de quand vient ce dont elle
part**, et d'où cette date sort. Le bandeau dit deux choses qu'il ne faut pas
confondre :

- « la mémoire a bougé » — il s'est passé quelque chose, n'importe quoi ;
- « cette variante part d'une valeur revue depuis par un document plus récent » —
  et c'est la seule des deux qui dise si l'hypothèse porte encore sur quelque
  chose.

On ne la refait pas d'office : elle répond à la question posée ce jour-là, et la
recalculer répondrait à une autre. Elle le dit, et on la refait d'un geste.

## Ce que ce moteur ne fait pas

Il ne range rien, ne ferme rien, n'ouvre rien. Il répond à une question : **où
cette source se place-t-elle, et qu'a-t-elle le droit de réviser ?** Ce sont les
appelants qui agissent.

Il ne consulte pas non plus l'horloge. Une règle qui dépendrait de l'heure où on
la lit ne se vérifierait pas deux fois de suite (règle 12) : « maintenant » est
toujours le document le plus récent qu'on connaisse, jamais le jour courant.
