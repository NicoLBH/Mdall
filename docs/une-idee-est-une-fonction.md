# Une idée est une fonction, et deux idées qui composent sont un raisonnement

La console déroulait les termes que les chantiers emploient : « plafonds »,
« dispositions », « passage », « portes ».

> « Et alors ? Ça ne sert à rien, on n'est pas là pour refaire un lexique du
> vocabulaire de construction. Où sont les idées, les raisonnements, les
> fonctions ? Comment est-ce que ça s'enchaîne ? »

Et alors rien, en effet. **Un terme nomme une chose.** Il ne dit pas ce qu'elle
fait, ni ce qu'elle entraîne, ni ce qu'elle interdit. Compter des termes, c'est
inventorier un chantier ; on ne décide sur aucun inventaire.

## Ce qu'est une idée, ici

**Une fonction.** Quelque chose entre, quelque chose sort, et un lien nommé dit
de quelle façon :

    terrain argileux   ──entraîne──▶   plancher beton
    nappe phreatique   ──conditionne──▶   cuvelage renforce
    desenfumage        ──empêche──▶    faux plafond

C'est la définition la plus pauvre qui tienne, et c'est voulu : **elle se
vérifie**. Une idée a deux côtés et un lien. Si l'un des trois manque, ce n'en
est pas une, et elle est refusée plutôt qu'affichée en moitié de phrase.

## Les six sortes de liens, et pourquoi elles ne sont pas interchangeables

| Sorte | Verbe | Ce qu'elle affirme |
|---|---|---|
| `cause` | entraîne | ce qui est à droite **arrive**. Le seul lien qui autorise à prévoir. |
| `condition` | conditionne | ce qui est à droite ne vaut **que si** la gauche est tenue. |
| `obligation` | impose | ce qui est à droite devient **obligatoire**. Cela se décide, cela n'arrive pas seul. |
| `permet` | permet | ce qui est à droite devient **possible** — et rien de plus. |
| `but` | vise | ce qui est à droite est **cherché**. Une intention, jamais un résultat. |
| `empechement` | empêche | ce qui est à droite est **retiré**. La seule sorte qui enlève. |

Les confondre ferait passer une intention pour un fait (règle 12). « A afin de
B » ne dit pas que B arrive ; « A entraîne B » le dit. Ce n'est pas une nuance
de vocabulaire, c'est la différence entre une prévision et un souhait.

## Comment elles sont trouvées, et pourquoi sans modèle

Par les **mots de liaison que la phrase écrit elle-même** : « donc », « car »,
« à condition que », « faute de ». Le mot coupe l'affirmation en deux ; de chaque
côté on garde le terme de tête — le même découpage que les sujets, donc la même
granulométrie.

La liste vit à un seul endroit, dans la base (`les_mots_de_liaison()`), avec le
découpage qui s'en sert. Le navigateur n'en tient aucune copie : il ne connaît
que les **sortes** de liens, qu'il doit nommer à l'écran. Une épreuve confronte
les deux, parce qu'une sorte ajoutée d'un côté et pas de l'autre afficherait une
flèche sans verbe sans que rien ne tombe (règle 4).

Ce n'est **pas de l'apprentissage**, et c'est volontaire : cela ne dépend d'aucun
modèle, d'aucun service et d'aucune clé, cela se vérifie ligne à ligne, et cela
marche le jour où on le déploie. Un modèle lirait mieux — il est là pour rendre
la vie plus confortable, pas pour qu'on en dépende.

### Le sens de la flèche

« A **donc** B » va de A vers B. « A **car** B » va de B vers A. Chaque mot de
liaison porte donc, avec sa sorte, le sens dans lequel il relie. C'est la seule
erreur qui rende un raisonnement **exactement faux** plutôt qu'approximatif, et
c'est celle qu'une épreuve du banc PostgreSQL surveille : les deux phrases
ci-dessus doivent rendre **la même** idée.

### Ce que ce découpage ne sait pas lire, et qui est dit

**Les liaisons de tête.** « Si le sol est argileux, les fondations descendent »
commence par son lien : à gauche, il n'y a rien à couper. Seules les liaisons
placées **entre** les deux membres sont lues. Deviner la coupure sur une virgule
rendrait des idées fausses avec l'aplomb des vraies — et dans une chaîne, un
maillon mal coupé contamine tout ce qui suit.

**Les idées qu'aucun mot n'annonce.** « L'étanchéité de la toiture n'est pas
reprise » énonce bien quelque chose, et aucune liaison ne le signale. C'est là,
précisément, qu'un modèle apporterait ce que le comptage n'apporte pas.

Les deux sont écrits dans « Ce qui n'est pas fait », parce qu'une limite de
méthode qu'on tait se prend pour une absence dans le corpus (règle 5).

## Deux idées qui composent : un raisonnement

Deux fonctions composent quand la sortie de la première est l'entrée de la
seconde :

    terrain argileux ──entraîne──▶ plancher beton ──impose──▶ delai chantier

On n'a rien ajouté : les deux idées étaient déjà là, chacune dans son coin,
souvent dans deux documents qui ne se connaissent pas. Ce que la composition
donne est **la conséquence que personne n'a écrite**. C'est la seule chose de
toute cette chaîne qui ressemble à du raisonnement.

### Ce qu'un raisonnement vaut, et pas plus

**Son maillon le plus faible.** Une chaîne dont le premier lien est vu sur quatre
chantiers et le second sur deux est attestée par deux. Prendre la somme, ou le
premier, annoncerait une assise qu'elle n'a pas.

### Les cercles ne se taisent pas

« A entraîne B » et « B entraîne A » forment un cercle. Un parcours naïf y
tournerait sans fin ; celui-ci s'arrête au premier nœud déjà vu, **et le dit**.
Un cercle est une information : soit le corpus se contredit, soit il décrit une
boucle de rétroaction. Les deux méritent qu'on les regarde.

### Les chaînes s'arrêtent, et disent qu'elles sont coupées

Au-delà de six maillons, on arrête. Non par peur des boucles — les nœuds déjà
vus s'en chargent —, mais parce qu'une chaîne de douze maillons dont chacun peut
être faux n'est pas un raisonnement : c'est une suite de mots qui se tiennent par
la main. Une chaîne arrêtée par la borne le signale, parce qu'une chaîne finie et
une chaîne coupée ne s'interprètent pas de la même façon.

## Ce qui n'est pas fait, et qui est la suite

**Une idée relevée n'entre pas dans la mémoire d'un chantier.** Elle est mesurée
sur l'ensemble du corpus, dans la console, et elle s'arrête là.

C'est voulu, et c'est l'ordre des choses : une idée relevée est **une lecture,
pas une vérité**. Rien n'entre dans la mémoire sans une proposition signée
(règle 1). La marche suivante est donc l'affirmation d'idée dans une proposition
— on la relit, on la signe ou on la refuse, exactement comme un sujet ouvert par
la lecture d'un compte rendu. La forme existe ; le geste pas encore.

## Où cela vit

| Quoi | Où |
|---|---|
| Les mots de liaison, et le découpage | `supabase/migrations/202611130001_les_idees_du_systeme.sql` |
| La forme d'une idée, les six sortes de liens | `apps/web/js/services/une-idee.js` |
| La composition, les cercles, les bornes | `apps/web/js/services/un-raisonnement.js` |
| L'écran | rubrique « Les idées énoncées » de la console |
| Le découpage éprouvé sur un vrai PostgreSQL | `scripts/le-banc-des-politiques.test.mjs` |

## Ce que la batterie a trouvé

Chaque garde-fou de ces deux modules et de la migration a été cassé à la main,
une fois, pour regarder l'épreuve tomber — trente-huit fois. **Cinq mutations
ont survécu au premier passage**, et chacune disait quelque chose :

- **« le classement des raisonnements repart de la longueur »** survivait : les
  deux chaînes du jeu d'essai avaient la même longueur, et l'ordre ne pouvait
  donc pas changer. Un jeu d'essai qui recopie l'hypothèse du code n'éprouve
  rien. Il faut une chaîne longue et faible contre une courte et forte.
- **« les mots de liaison ne sont plus encadrés d'espaces »** survivait aussi :
  « car » se lisait bien dans « carrelage », mais le membre de gauche n'avait
  alors aucun terme, et l'idée tombait pour une raison qui n'était pas la bonne.
  L'épreuve passait **par accident**. La phrase du jeu d'essai porte maintenant
  un terme avant « carrelage ».
- **« un maillon sans verbe s'écrit quand même »** survivait parce que rien
  n'appelait `phraseDunRaisonnement` avec un lien inconnu. La fonction est
  publique : son contrat s'éprouve pour lui-même.
- **Deux survivantes étaient des garde-fous qui ne pouvaient pas tomber** : la
  borne du nombre de chaînes vérifiée à trois endroits, et « au moins deux
  maillons » vérifié deux fois. Elles ont été **retirées**, pas contournées
  (règle 4) — un garde-fou qui ne peut pas tomber n'en est pas un, il en a
  seulement l'air.

Au second passage : **38 mutations, 0 survivante**.
