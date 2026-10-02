# Les documents du chantier

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

## Ce qui n'est pas fait, et c'est dit à l'écran

**La lecture n'a pas encore déménagé.** Cet écran réunit ce qui a été *analysé* ;
lancer une lecture de fil ou de rapport se fait encore depuis l'utilitaire de
chaque famille. Sous « Mails » et « Bureau de Contrôle », la zone de dépôt des
comptes rendus s'efface donc et dit où aller : la laisser contredirait le rail, et
déposer un rapport y lancerait une lecture de compte rendu — pire qu'un bouton
absent.

C'est le round suivant, et c'est le plus gros : il faudra que les trois lectures
partagent un même chemin — choisir dans Fichiers, lire, conserver — avant de
pouvoir se lancer d'ici.

**Rien n'entre en mémoire depuis cet écran.** Le chemin reste copilote → atelier →
proposition → mémoire (règle 1).
