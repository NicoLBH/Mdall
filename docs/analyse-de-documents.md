# Analyse de documents

## Une démarche, trois utilitaires

Les mails, les comptes rendus de chantier et les rapports de bureau de contrôle
font **la même démarche** :

```
aller les chercher dans Fichiers — c'est par les mails que presque tout arrive
  → choisir ceux qu'on veut analyser
    → lire
      → décider d'en faire une proposition, et verser en mémoire
```

Trois utilitaires pour une démarche, c'était trois accueils, trois tableaux, trois
façons de rouvrir une analyse. Et surtout : **aucune vue d'ensemble**. La question
« qu'est-ce qui a déjà été analysé sur ce chantier ? » n'avait de réponse nulle
part, alors que c'est la première qu'on se pose en arrivant.

## Le rail, et ce qu'il filtre

À gauche, la coque commune — celle des Actions, de la Mémoire, des Sujets et de
l'Accueil :

- **Tous les documents** — la vue d'ensemble, et celle sur laquelle on atterrit ;
- **Mails**
- **Bureau de Contrôle**
- **CR chantier**

Les trois familles viennent dans l'ordre par lequel les documents arrivent sur un
chantier : les mails d'abord. Ranger par ordre alphabétique mettrait le bureau de
contrôle en tête, ce qui ne correspond à rien de l'usage.

**Le compte va avec le nom.** « Mails 0 » dit, *avant* le clic, qu'il n'y a rien à
y voir — c'est la règle du rail des Actions, et elle vaut ici pour la même raison.

## Ce qui est commun, et ce qui ne l'est pas

Les trois familles se **listent** pareil : un titre, un repère, une date, ce que la
lecture a valu, et combien de fois on l'a relue. C'est ce que `les-documents-analyses.js`
normalise.

Elles ne se **lisent** pas pareil du tout, et c'est voulu :

| famille | ce que le détail montre |
|---|---|
| Mails | les prises de position — qui a constaté quoi, qui s'est engagé, pour quand — puis les idées, puis le fil replié |
| Bureau de Contrôle | les mesures, les trois étapes, la légende, les avis avec leur marque résolue, puis la transcription repliée |
| CR chantier | le chemin existant : la restitution en Markdown, les points relevés, leur confrontation aux sujets du chantier |

Une vue commune aurait dit « 3 éléments » des trois, ce qui ne renseigne sur
aucune. Un compte rendu a des points rapprochés des sujets ; un rapport a des avis
et une légende ; un fil a des prises de position, qui n'existent nulle part
ailleurs.

**Les mesures aussi restent propres à leur famille.** « 12 » ne dit rien ;
« 12 points » sous un compte rendu et « 12 avis » sous un rapport ne parlent pas de
la même chose, et une colonne qui dirait « 12 » pour les deux ferait croire
qu'elles se comparent.

## Trois décisions qui tiennent la liste

**La date est celle du document, pas celle de l'analyse.** On cherche « le compte
rendu du 16 avril », jamais « celui que j'ai lu mardi ». La date de lecture est
gardée à part — c'est elle qui ordonne la vue d'ensemble, parce que trois familles
dont les dates ne veulent pas dire la même chose ne se rangent pas autrement.

**Le groupement n'est pas refait ici.** Chaque famille arrive déjà groupée par
`lesFilsLus`, `lesComptesRendusLus` et `lesRapportsLus`, qui savent ce qu'« un même
document » veut dire chez elles — un fil par objet, un compte rendu par ligne de
Fichiers, un rapport par nom. En refaire une quatrième définition en aurait fait la
plus mal informée des quatre (règle 4).

**Un seul nom pour le nombre de lectures.** Les comptes rendus et les fils
comptaient `relectures`, les rapports `combien` : le même nombre sous deux noms,
dans trois modules écrits à trois rounds d'intervalle. Il s'appelle `combien`, une
fois (règle 10).

## Trois états, et non deux

« On n'a pas encore demandé », « on attend la réponse » et « on n'a pas su lire »
ne se disent pas pareil.

Rendre l'échec par défaut ferait clignoter une panne à chaque ouverture d'écran,
avant même que la demande parte. Rendre un tableau vide ferait croire que rien n'a
jamais été analysé, et l'on recommencerait une lecture déjà payée (règle 5).

Les trois listes sont demandées **en parallèle** : ce sont trois tables distinctes
et trois requêtes indépendantes, les enchaîner triplerait l'attente pour rien. Une
famille injoignable laisse la sienne à `null` et les deux autres s'affichent —
perdre la vue d'ensemble parce qu'une table est muette serait un mauvais échange.

## Un seul chemin de lecture, et il passe par la file

Les trois familles lisaient de trois façons. Les comptes rendus et les mails
passaient par une **file au serveur** — on lance, on rend la main, Actions montre
où cela en est. Les rapports de contrôle se lisaient dans le navigateur : trois
appels au modèle enchaînés dans un onglet qu'il ne fallait pas fermer, un lot de
trente perdu en changeant d'écran, et rien dans Actions puisqu'il n'y avait pas de
ligne de file à montrer.

```
choisir dans Fichiers  →  une ligne dans `versements`, avec le geste de la famille
                       →  la fonction de bord de ce geste la prend
                       →  la lecture est conservée
```

**Le geste est la clé de la famille.** Celui qu'on écrit dans `versements`, celui
que la fonction de bord cherche, celui que le rail pose dans son attribut : un seul
mot, du clic jusqu'à la ligne de file. Il y en avait deux — l'écran disait `cr`, la
file disait `comptes_rendus` — et c'est la divergence qui attendait son tour
(règle 10).

### Le même orchestrateur des deux côtés

`lire-un-rapport.js` enchaîne les trois étapes et reçoit ses trois appels. L'écran
lui donnait les trois services du navigateur ; la fonction de bord lui donne les
trois fonctions de bord. Une seconde orchestration au serveur aurait lu un rapport
autrement sans que rien ne le dise (règle 4) — et celle-ci est éprouvée par
`npm test`, échecs d'étape compris.

## Ajouter une famille — un plan, un cartouche, une notice

C'est le point du registre `les-familles-de-document.js`. Il faut, et il suffit :

1. **une entrée** — un geste, un nom, un titre, une icône, le nom nu de ce qu'on
   lit, ce qu'elle accepte, et le nom de sa fonction de bord ;
2. **une fonction de bord** de ce nom, qui vide la file de ce geste.
   `lire-les-rapports` est le patron : elle prend la plus ancienne ligne qui
   attend, la marque avant de travailler, lit par paquets, s'arrête sur son budget
   et se rappelle elle-même ;
3. **une table** où sa lecture se garde, et un service pur qui dit ce qu'elle
   garde — comme `la-lecture-dun-rapport.js` le fait pour les rapports.

Rien à changer dans le rail, ni dans le tableau, ni dans le lancement : ils lisent
tous le registre. **La colonne `geste` de `versements` est un `text` libre, sans
contrainte : une famille de plus ne demande aucune migration de la file.**

Deux épreuves gardent ce chemin : l'une vérifie que chaque fonction déclarée
**existe pour de bon** — un réveil envoyé à un nom que personne ne sert ne rend
aucune erreur, il ne fait rien, et la file reste bloquée sans que l'écran sache
pourquoi —, l'autre que chaque icône existe dans la planche.

## Ce qui reste écrit deux fois, et c'est dit

La **mécanique de file** — prendre la plus ancienne ligne, la marquer, respecter un
budget, se rappeler, consigner le journal — est écrite dans
`lire-les-comptes-rendus` et de nouveau dans `lire-les-rapports`. Les décisions
pures sont partagées (`la-file-des-comptes-rendus.js`) ; c'est la plomberie
Supabase qui est en double, une centaine de lignes.

Elle n'a pas été extraite dans ce round parce que porter la lecture des comptes
rendus sur une mécanique neuve, sans pouvoir l'éprouver autrement qu'en production,
aurait risqué de casser ce qui marche pour éviter une duplication. **À la
troisième famille, elle s'extrait** — c'est là que le coût devient réel.

## Ce qui n'est pas fait, et c'est dit à l'écran

**Le dépôt depuis le disque reste au compte rendu.** Les autres familles n'offrent
que « Choisir depuis Fichiers », et c'est volontaire : ces documents sont déjà dans
le projet, les redéposer depuis l'ordinateur en ferait un second exemplaire — le
genre de doublon qu'on ne remarque qu'au vingtième.

**La lecture d'un fil de mails ne part pas encore d'ici.** Son geste est déclaré,
sa fonction de bord existe depuis octobre, et le registre la connaît ; ce qui
manque est que le dépôt de messagerie monte les octets, là où les deux autres
familles lisent des documents déjà rangés. C'est un round à part.

**Rien n'entre en mémoire depuis cet écran.** Le chemin reste copilote → atelier →
proposition → mémoire (règle 1).
