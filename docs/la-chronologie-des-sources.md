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
| Les valeurs versées en mémoire | à faire |
| Les raisonnements et leurs lectures enregistrées | à faire |
| Les hypothèses et les variantes | à faire |

### Ce que les trois branchements restants demandent

**La mémoire.** Une valeur versée porte déjà sa provenance ; il lui manque la
date **du document** d'où elle vient, distincte de celle du versement. Deux
valeurs contradictoires ne se départagent aujourd'hui que par l'ordre d'arrivée,
qui est justement celui dont on vient de montrer qu'il ment.

**Les raisonnements.** Une règle lit des valeurs ; si l'une d'elles vient d'un
document antérieur à une autre déjà lue, la conclusion mêle deux instants. Le
rejeu à blanc existe et saurait le dire : il lui manque de savoir **à quelle
date il rejoue**.

**Les hypothèses.** Une variante suppose un état du projet. Elle devrait porter
la date à laquelle elle a été posée, et se signaler quand une source plus
récente l'a périmée — plutôt que de rester vraie indéfiniment.

## Ce que ce moteur ne fait pas

Il ne range rien, ne ferme rien, n'ouvre rien. Il répond à une question : **où
cette source se place-t-elle, et qu'a-t-elle le droit de réviser ?** Ce sont les
appelants qui agissent.

Il ne consulte pas non plus l'horloge. Une règle qui dépendrait de l'heure où on
la lit ne se vérifierait pas deux fois de suite (règle 12) : « maintenant » est
toujours le document le plus récent qu'on connaisse, jamais le jour courant.
