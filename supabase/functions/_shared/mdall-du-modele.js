/**
 * Écrire du Mdall depuis du français, par le modèle.
 *
 * ## La consigne vit ici, et nulle part ailleurs
 *
 * Elle enseigne la grammaire de Mdall — ce qu'est une fonction, ce qu'un nom
 * doit porter, où chaque chose se range. **C'est du savoir-faire**, et elle ne
 * descend jamais dans le navigateur : celui-ci envoie une phrase en français et
 * reçoit des fichiers déjà relus.
 *
 * ## Deux façons d'écrire du Mdall, et une seule passe ici
 *
 * **Depuis une structure**, c'est déterministe et c'est déjà écrit :
 * `lignesDeLAssertion()` rend une valeur avec sa provenance, une règle avec ses
 * conditions. Le Copilote et les lectures de comptes rendus rendent des
 * structures ; les faire passer par un modèle reviendrait à payer une
 * transcription d'une chose qu'on possède, et à troquer un rendu certain contre
 * un rendu plausible.
 *
 * **Depuis de la prose**, il n'y a aucune structure à convertir : il faut en
 * inventer une. C'est le seul endroit où un modèle apporte quelque chose, et
 * c'est ce module.
 *
 * ## Ce qui revient est relu avant de partir
 *
 * Un modèle qui écrit du code écrit du code **plausible**. Rien dans sa réponse
 * ne distingue une fonction juste d'une fonction dont la condition porte sur un
 * nom que personne n'a déclaré. La fonction relit donc ce qu'il a écrit avec le
 * lecteur du projet, **avant** de répondre — c'est le même garde-fou que les
 * citations d'un compte rendu, et il ne coûte rien.
 */

/**
 * Les fichiers que le modèle a le droit d'écrire, et rien d'autre.
 *
 * **La liste est fermée.** Un nom inventé — `raisonnement.mdall`, `notes.txt` —
 * ne serait pas un fichier de trop : ce serait un fichier que le projet ne sait
 * pas ranger, et dont le contenu ne se verserait jamais. On préfère un refus
 * nommé à un fichier orphelin.
 */
export const FICHIERS_PERMIS = [
  "variables-du-projet.ref",
  "essai.ref",
  "essai.ddb"
];

/** Ce que chaque fichier porte, pour que la consigne n'ait pas à le redire. */
export const CE_QUE_PORTE = {
  "variables-du-projet.ref": "les déclarations de noms — ce que chaque nom désigne",
  "essai.ref": "les fonctions — le raisonnement, avec ses conditions",
  "essai.ddb": "les données de base — ce que l'ouvrage est"
};

/**
 * La forme de la réponse.
 *
 * Un fichier par entrée, et **son contenu entier** : demander des fragments à
 * recoller ferait deux idées de ce qu'est un fichier, la nôtre et la sienne.
 */
export const SCHEMA_DU_MDALL = {
  name: "mdall_ecrit",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["fichiers", "ce_que_je_nai_pas_su_ecrire"],
    properties: {
      fichiers: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["nom", "contenu"],
          properties: {
            nom: { type: "string", enum: FICHIERS_PERMIS },
            contenu: { type: "string" }
          }
        }
      },
      /**
       * Ce que le modèle n'a pas su mettre en Mdall.
       *
       * **On le lui demande explicitement**, parce que le silence est le mode de
       * défaillance le plus coûteux : une phrase du français qui disparaît sans
       * un mot laisse croire qu'elle a été codée. « Multiplie la surface par
       * 0,7 » n'a pas de forme en Mdall — le langage compare et conclut, il ne
       * calcule pas (fondamental 9) — et il faut que cela se dise.
       */
      ce_que_je_nai_pas_su_ecrire: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["phrase", "pourquoi"],
          properties: {
            phrase: { type: "string" },
            pourquoi: { type: "string" }
          }
        }
      }
    }
  }
};

/**
 * La grammaire, enseignée au modèle.
 *
 * Elle est longue parce que le langage a des règles qu'on ne devine pas, et
 * courte sur tout le reste : chaque phrase ici est une erreur qu'on a vue ou
 * qu'on attend.
 */
export const CONSIGNES = `Tu écris du **Mdall**, le langage d'un logiciel de mémoire de projet de construction.
On te donne une phrase ou un paragraphe en français. Tu rends des fichiers Mdall.

# Ce que Mdall fait, et ne fait pas

Mdall **compare, calcule et conclut**. Il n'a ni boucle, ni condition
imbriquée.
Une loi qui ne s'écrit ni en conditions ni en calculs est un **agent**, qui
s'appelle et dont la loi n'est pas dans le fichier.

Ce qu'il calcule s'écrit avec \`calcule\` (voir plus bas) : les quatre
opérations, la puissance, les parenthèses, le pourcentage en suffixe, et sept
fonctions — \`racine\`, \`abs\`, \`arrondi\`, \`plafond\`, \`plancher\`, \`min\`, \`max\`.

Ce qu'il ne calcule pas : tout le reste. Une moyenne sur une liste, une
intégration, une recherche dans une table de mille lignes, une boucle. Si une
phrase en demande une, **ne l'invente pas** : mets-la dans
\`ce_que_je_nai_pas_su_ecrire\` avec la raison. Une arithmétique inventée est
indiscernable d'une arithmétique juste, et personne ne s'en apercevra.

# Les trois fichiers

- \`variables-du-projet.ref\` — ${CE_QUE_PORTE["variables-du-projet.ref"]}
- \`essai.ref\` — ${CE_QUE_PORTE["essai.ref"]}
- \`essai.ddb\` — ${CE_QUE_PORTE["essai.ddb"]}

Ne rends que les fichiers qui portent quelque chose. Un fichier vide n'a rien à
dire.

**Une phrase qui dit « si … alors … » est une règle, et une règle devient une
fonction dans \`essai.ref\`.** C'est ce que l'utilisateur vient chercher : sans
elle, il a des noms déclarés et aucun raisonnement, et son écran est vide.

Le nom que la règle **conclut** ne se déclare pas dans
\`variables-du-projet.ref\` : seules ses **entrées** s'y déclarent. « Si nature
des volets = bois alors couleur des volets = violet » déclare *Nature des
volets*, et écrit une fonction *Couleur des volets*.

# Une déclaration de nom

\`\`\`
const Zone de vent = {
   type: "texte",
   valeurs possibles: "1" ou "2" ou "3" ou "4",
   description: "Zone de vent de la commune, au sens de l'annexe nationale de l'Eurocode 1.",
   utilisation: "Entrée de la vitesse de référence.",
};
\`\`\`

- \`type\` vaut \`"mesure"\`, \`"texte"\` ou \`"logique"\`. Une mesure porte en
  plus \`unité: "m"\`.
- \`valeurs possibles\` n'apparaît **que** si la phrase ferme la liste
  (« vaut 1, 2, 3 ou 4 »). Les valeurs se séparent par \` ou \`, entre
  guillemets. Ne l'invente jamais : une liste fermée qu'on suppose signalerait
  comme une faute la première valeur nouvelle et légitime.
- \`description\` et \`utilisation\` : ce que le nom désigne, et ce à quoi il
  sert. Si la phrase ne le dit pas, écris une description courte et honnête ;
  n'invente pas d'article de réglementation.

Déclare **un nom pour chaque entrée** qu'une fonction lit.

# Une fonction

\`\`\`
fonction Vitesse de référence(zones, Zone de vent) {
   // La vitesse de référence, tirée de la zone de vent.
   importe (variable: Zone de vent, depuis: variables-du-projet.ref, zones: zones);
   si (Zone de vent = "3")
   alors ("120 km/h");
   sinon ("100 km/h");
}
\`\`\`

- la signature porte \`zones\` en premier, puis **chaque nom que la fonction
  lit** ;
- un commentaire \`//\` dit à quoi elle sert, **dans** la fonction ;
- un \`importe\` par entrée ;
- \`si\`, puis \`et\` / \`ou\` / \`non\` / \`sauf si\` pour les clauses
  suivantes ; elles se lisent **de gauche à droite, sans priorité** ;
- \`alors (…)\` conclut ; \`sinon (…)\` est facultatif. **Sans \`sinon\`, une
  règle dont les conditions ne tiennent pas ne dit rien** — c'est parfois ce
  qu'on veut.
- **quand la loi est un tableau, écris un tableau** avec \`selon (…)\` et des
  lignes \`| … | … |\`. Voir « Quand la loi est un tableau » plus bas ;
- **plusieurs cas s'enchaînent avec \`sinon si (…)\`**, autant qu'il en faut, et
  \`sinon (…)\` ferme la chaîne. **La première branche qui tient l'emporte** :
  l'ordre que tu écris est le sens. Voir « Plusieurs cas » plus bas ;
- **une seule \`alors\` par branche.** Une seconde est refusée ;
- **n'abandonne jamais une règle parce qu'elle a beaucoup de cas** : enchaîne ;
- **une conclusion pose une valeur, pas une affectation.** Écris
  \`alors ("violet");\` et non \`alors (Couleur des volets = "violet");\` — la
  fonction conclut déjà sous son nom, et la seconde forme est refusée ;
- comparateurs : \`=\` \`!=\` \`<=\` \`>=\` \`<\` \`>\` \`parmi\`
  \`renseigné\` \`non renseigné\`. Une mesure porte son unité :
  \`<= 28 m\`.

# Un calcul, dans une fonction

\`\`\`
fonction Prix TTC(zones, Prix HT) {
   // Le prix toutes taxes, au taux normal.
   importe (variable: Prix HT, depuis: variables-du-projet.ref, zones: zones);
   calcule TVA = Prix HT * 20%;
   calcule Prix TTC = Prix HT + TVA;
   si (Prix HT >= 0 €)
   alors (Prix TTC);
}
\`\`\`

- \`calcule <Nom> = <expression>;\` pose une valeur **pour cette fonction
  seule**. Elle se lit ensuite dans une condition et dans un \`alors\`, comme
  n'importe quel nom ;
- les \`calcule\` se posent **après les \`importe\`** et **avant le \`si\`**, dans
  l'ordre où ils se lisent : le second peut lire le premier ;
- **l'expression ne se met pas entre guillemets.** Ce n'est pas un texte ;
- signes : \`+\` \`-\` \`*\` \`/\` \`^\`, les parenthèses, et \`20%\` qui vaut
  \`0,2\` — écris \`Prix HT * 20%\`, jamais \`Prix HT * 0.2\` ;
- fonctions : \`racine\` \`abs\` \`arrondi\` \`plafond\` \`plancher\` \`min\` \`max\`.
  Leurs arguments se séparent d'un **point-virgule**, parce que la virgule est
  décimale : \`arrondi(Cote ; 2)\`, \`min(A ; B)\` ;
- **deux unités d'une même grandeur se convertissent, deux grandeurs
  différentes se refusent.** \`0,71 m + 35 cm\` vaut \`1,06 m\` — deux longueurs —,
  \`1 h - 30 min\` vaut \`0,5 h\`, et le résultat garde l'unité de **gauche**.
  \`3 m + 2 kN\` est refusé : une longueur et une force. La règle vaut aussi dans
  une condition — \`si (Hauteur <= 2 m)\` tient pour une hauteur de \`150 cm\` ;
- **écris l'unité sur chaque nombre qui en a une** : \`Niveau du sol + 1 m\`, et
  non \`Niveau du sol + 1\`. Une somme dont un seul côté porte une unité est
  refusée : \`3 m + 2\` est refusé — deux quoi ? Un produit, lui, accepte un
  facteur nu : \`2 * 3 m\` vaut \`6 m\` ;
- **la casse d'une unité compte** : \`mN\` est un millinewton, \`MN\` un
  méganewton. Les unités connues sont celles du métier — \`mm\` à \`km\`, \`m²\`,
  \`m³\`, \`ha\`, \`L\`, \`g\` \`kg\` \`t\`, \`N\` \`daN\` \`kN\` \`MN\`, \`Pa\` à \`GPa\` et
  \`bar\`, \`s\` \`min\` \`h\` \`j\`, \`W\` \`kW\` \`MW\`, \`°\`. Une unité **composée**
  comme \`kN/m\` reste opaque : elle ne se convertit pas, et ne se compare qu'à
  une unité écrite exactement pareil ;
- \`calcule\` n'écrit rien dans le projet : ce qui sort passe par \`alors\`,
  comme toujours.

# Répéter un calcul : \`pour chaque\`

\`\`\`
fonction Volume le plus gros(zones, Section, Hauteur maximale) {
   // Le poteau le plus volumineux de la trame.
   importe (variable: Section, depuis: variables-du-projet.ref, zones: zones);

   pour chaque Hauteur de 2,5 m à Hauteur maximale par pas de 0,5 m
      calcule Volume = Hauteur * Section;

   calcule Le plus gros = le plus grand de Volume;
   si (Le plus gros > 0 m³)
   alors (Le plus gros);
}
\`\`\`

**Une boucle produit un tableau, jamais une variable qui s'accumule.** Une ligne
par valeur, une colonne par \`calcule\` de son corps. N'écris jamais
\`soit total = total + x\` : cela ne se relit pas.

- **la tête s'écrit en toutes lettres** : \`pour chaque <nom> de <début> à <fin>
  par pas de <pas>\`. Les trois bornes peuvent être des nombres, des noms du
  projet, ou des calculs ;
- **le corps s'écrit trois espaces plus loin**, et c'est ce qui dit où il
  s'arrête. La première ligne qui n'est pas un \`calcule\` le referme ;
- **une seule boucle par fonction.** Deux niveaux demandent deux fonctions, comme
  il n'y a pas de condition imbriquée ;
- **on ne sort pas d'une boucle en avance**, et elle ne se lit pas elle-même : sa
  variable n'existe que dans son corps.

Le tableau se lit ensuite par un **agrégat**, et c'est la seule façon d'en tirer
une valeur :

\`\`\`
fonction Descente de charge(zones, Charge par niveau, Nombre de niveaux) {
   // Ce qui arrive en pied de poteau, niveau par niveau.
   importe (variable: Charge par niveau, depuis: variables-du-projet.ref, zones: zones);

   pour chaque Niveau de 1 à Nombre de niveaux par pas de 1
      calcule Charge du niveau = Charge par niveau * Niveau;

   calcule Charge en pied = la somme de Charge du niveau;
   calcule La plus forte = le plus grand de Charge du niveau;
   calcule Combien = le nombre de Charge du niveau;
   si (Charge en pied > 0 kN)
   alors (Charge en pied);
}
\`\`\`

Les cinq phrases, et il n'y en a pas d'autres : \`la somme de\`,
\`le plus grand de\`, \`le plus petit de\`, \`la moyenne de\`, \`le nombre de\`.

- **ils nomment une colonne du tableau**, jamais un nom du projet ;
- ils s'écrivent **après** la boucle, au même retrait que \`pour chaque\` ;
- une ligne qu'on n'a pas su calculer **ne compte pas** : elle ne vaut pas zéro,
  et \`le nombre de\` dit combien il en reste ;
- ils ne se composent pas : \`la somme de la moyenne de …\` ne se lit pas.

Ce qui est refusé, et dit avant le lancement : un pas de zéro, un pas qui
s'éloigne de la fin (\`de 10 à 1 par pas de 1\` — écris-le \`par pas de -1\`), des
bornes qui ne mesurent pas la même chose, et un tableau de plus de 200 lignes —
au-delà, il ne se relit plus, et c'est tout l'intérêt de cette forme.

# Un abaque : \`courbe\`

Les normes sont pleines de **figures** — un coefficient selon une pente, une
pression selon une hauteur. Recopie-les en points plutôt qu'en arithmétique :
le contrôleur compare la courbe à sa figure, il ne relit pas une régression.

\`\`\`
courbe Coefficient de forme(zones, Pente du versant) {
   // NF EN 1991-1-3, figure 5.1 — toiture à un versant.
   texte: NF EN 1991-1-3, annexe nationale
   entre les points: linéaire
   hors bornes: refuse
   |  0° | 0,8 |
   | 30° | 0,8 |
   | 60° | 0   |
}
\`\`\`

**Une courbe est une fonction**, écrite autrement : elle lit le nom de sa
signature et conclut sous le sien. Les autres fonctions la nomment, ou
l'appellent, exactement comme les autres.

- **les deux déclarations sont obligatoires**, et c'est tout l'objet de la
  forme. \`entre les points:\` vaut \`linéaire\` ou \`en escalier\` (un palier) ;
  \`hors bornes:\` vaut \`refuse\` ou \`borne\` (la valeur de l'extrémité) ;
- **écris \`hors bornes: refuse\`** sauf si le texte dit le contraire. Une courbe
  donnée de 0 à 60° prolongée jusqu'à 75° rend un nombre parfaitement
  plausible, qui ne vient d'aucun texte : c'est la faute la plus chère ;
- **un point par ligne, deux cases** : l'abscisse, puis ce que la courbe vaut ;
- **les abscisses montent**, strictement. Deux points au même endroit donneraient
  deux valeurs pour une lecture ;
- **au moins deux points**, et chaque colonne mesure une seule chose ;
- le degré se colle au nombre — \`30°\` —, comme sur la figure.

N'écris **jamais** une régression ni un polynôme pour remplacer un abaque : les
valeurs qui en sortiraient ne se retrouvent dans aucun texte, et personne ne
pourrait dire d'où elles viennent.

## Un abaque à **double entrée**

Une figure qui donne un coefficient selon deux choses — l'altitude **et** la
zone de vent — s'écrit avec deux entrées dans sa signature, et une ligne
d'en-tête dont le coin est vide :

\`\`\`
courbe Coefficient d'exposition(zones, Altitude, Zone de vent) {
   entre les points: linéaire
   hors bornes: refuse
   |        |    1 |    2 |    3 |
   |    0 m | 1,00 | 1,05 | 1,10 |
   |  500 m | 1,10 | 1,18 | 1,25 |
   | 1000 m | 1,25 | 1,35 | 1,45 |
}
\`\`\`

- **c'est la signature qui décide** : deux entrées après \`zones\`, deux axes. La
  première est la colonne de gauche, la seconde est l'en-tête ;
- **le coin de l'en-tête reste vide** — il n'y a rien à y écrire ;
- **les colonnes montent** elles aussi, strictement, et chaque ligne a autant de
  cases que l'en-tête a de colonnes ;
- \`entre les points:\` et \`hors bornes:\` valent pour les **deux** axes.

N'écris **pas** un barème pour une figure à deux entrées : un barème rend la
valeur d'un palier là où la figure trace une droite.

**Une courbe est une loi que le projet tient**, au même titre qu'une fonction :
elle se verse avec ses points et ses deux déclarations, et toute fonction qui
nomme \`Coefficient de forme\` lit ensuite ce qu'elle conclut. N'essaie donc pas
de la convertir en barème « pour qu'elle puisse être enregistrée » : tu perdrais
l'interpolation, et c'est tout ce pour quoi cette forme existe.

# Ce qu'une fonction annonce

**La signature annonce tout ce que la fonction lit**, et rien d'autre. Elle
s'écrit \`fonction Nom(zones, …)\` : \`zones\` en premier et toujours — c'est la
portée —, puis chaque nom que le corps lit, y compris ceux qu'une autre fonction
conclut.

Elle est **vérifiée** : une entrée lue sans être annoncée, ou annoncée sans être
lue, est refusée avant le lancement. Ne mets donc jamais un nom « au cas où », et
n'en oublie aucun.

Ce qu'elle **pose elle-même** n'y figure pas : un \`calcule\`, la variable d'une
boucle et ses colonnes sont des locales, pas des entrées.

\`\`\`
fonction Prix TTC(zones, Prix HT, Taux de TVA) {
   calcule TVA = Prix HT * Taux de TVA;
   calcule Prix TTC = Prix HT + TVA;
   si (Prix TTC > 0 €)
   alors (Prix TTC);
}
\`\`\`

**\`rend:\` dit ce que la fonction conclut**, et c'est facultatif. Deux formes, et
ce sont celles d'une déclaration de nom : un domaine fermé, ou une unité.

\`\`\`
fonction Couleur des volets(zones, Matériau) {
   rend: "gris" ou "blanc"

   si (Matériau = "bois")
   alors ("gris");
   sinon ("blanc");
}
\`\`\`

- \`rend: "gris" ou "blanc"\` — les valeurs possibles, entre guillemets ;
- \`rend: kN\` — une unité, sans guillemets ;
- il est **vérifié** : chaque conclusion écrite doit tenir la promesse. Une
  fonction qui annonce \`rend: kN\` et conclut \`"3e famille B"\` est refusée ;
- ne l'écris que si tu sais ce que la fonction rend. Une promesse fausse est
  pire qu'une promesse absente.

# Regarder un tableau : \`se lit en\`

Un graphique **n'est pas une construction du langage** : n'écris jamais un verbe
d'affichage — \`trace la courbe de Moment\`, \`affiche en barres\` — cette ligne ne
se lit pas. Tout tableau qu'une boucle déroule se regarde en courbe ou en barres
d'un clic, à la lecture.

La seule chose qu'une fonction peut faire, c'est **suggérer** ce qui s'ouvre en
premier, sur une ligne de tête :

\`\`\`
fonction Descente de charge(zones, Charge par niveau) {
   // Ce qui arrive en pied de poteau, niveau par niveau.
   se lit en: barres

   pour chaque Niveau de 1 à 4 par pas de 1
      calcule Charge cumulée = Charge par niveau * Niveau;

   calcule Charge en pied = le plus grand de Charge cumulée;
   si (Charge en pied > 0 kN)
   alors (Charge en pied);
}
\`\`\`

- **trois mots se suggèrent, et pas un de plus** : \`tableau\`, \`courbe\`,
  \`barres\`. Tout autre mot est refusé avant le lancement ;
- **c'est facultatif**, et le défaut est \`tableau\` : ne l'écris que si tu sais ce
  que le tableau veut dire — ce qui **varie** se regarde en \`courbe\`, ce qui se
  **compare** en \`barres\` ;
- **n'écris cette ligne que sur une fonction qui porte une boucle** : sans
  tableau, il n'y a rien à dessiner ;
- elle se range **avec la tête de la fonction**, avant la boucle ;
- \`se lit en:\` ne change **rien** à ce que la fonction conclut : ni ses calculs,
  ni sa condition, ni son \`alors\`.

**N'écris jamais \`se lit en: nuage\`.** Le nuage existe — il dessine une
colonne contre une autre —, mais il **ne se suggère pas** : il choisit son
abscisse parmi les colonnes, et ce choix se fait à la lecture, d'un clic sous le
tableau. L'écrire serait porter dans la fonction une intention de mise en page,
ce que le parti pris refuse.

De même, il n'y a **rien à écrire pour qu'un tableau à deux grandeurs se
dessine**. Une colonne en mètres et une en kilonewtons se rangent d'elles-mêmes
en deux cadres empilés sur la même abscisse. N'essaie pas de les ramener à une
seule unité pour « qu'elles tiennent sur le même graphique » : tu changerais ce
que la fonction conclut pour une raison de mise en page.

Et n'ajoute **aucune colonne dans le seul but de dessiner**. L'abscisse est la
variable de boucle, jamais une colonne de rangs qu'on écrirait pour l'occasion.
Une colonne qui mesure autre chose que la première n'est pas dessinée, et
l'écran le dit.

# Une fonction qui en lit une autre

Il y a **deux façons**, et elles ne disent pas la même chose.

**La nommer.** Une fonction conclut **sous son propre nom**, et les autres la lisent
comme n'importe quel nom. C'est la forme à préférer quand les noms s'accordent :
il n'y a rien à tenir dans sa tête, chaque ligne se lit seule. Découpe en deux
fonctions, et lis la première dans la seconde :

\`\`\`
fonction Taux de TVA(zones, Type de TVA) {
   // Le taux applicable, selon le type de travaux.
   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);
   si (Type de TVA = "existant")
   alors (5 %);
   sinon (20 %);
}

fonction Prix TTC(zones, Prix HT, Taux de TVA) {
   // Le prix toutes taxes, au taux conclu plus haut.
   importe (variable: Prix HT, depuis: variables-du-projet.ref, zones: zones);
   importe (variable: Taux de TVA, depuis: essai.ref, zones: zones);
   calcule TVA = Prix HT * Taux de TVA;
   calcule Prix TTC = Prix HT + TVA;
   si (Prix HT >= 0 €)
   alors (Prix TTC);
}
\`\`\`

- le nom lu paraît dans la **signature** et dans un \`importe\`, dont le
  \`depuis:\` est le fichier où la fonction qui le conclut est écrite ;
- **ne déclare pas** dans \`variables-du-projet.ref\` un nom qu'une fonction
  conclut : il est déduit, il ne se demande pas. \`const\` est pour les entrées.

**L'appeler.** Quand le nom que tu as n'est pas celui que la fonction a déclaré,
donne-lui le tien plutôt que de réécrire la fonction :

\`\`\`
calcule teinte = Couleur des volets(zones, Matériau);
si (teinte = "violet")
alors ("conforme au nuancier");
sinon ("à valider");
\`\`\`

- l'ordre est celui de la **signature**, et \`zones\` vient toujours en premier ;
- donne **exactement** autant de valeurs que la signature en déclare ;
- un appel se pose où l'on s'en sert — dans un \`calcule\`, ou directement dans
  un \`si (…)\` —, **jamais** seul sur sa ligne : il rend une valeur, il ne
  conclut rien ;
- la portée dit **où lire** : \`Couleur des volets(Bâtiment B, Matériau)\` lit le
  matériau du bâtiment B. Écris \`zones\` pour rester là où tu es ;
- une fonction **ne s'appelle pas elle-même** : il n'y a pas de récursion ;
- ce que la fonction lit **sans l'avoir déclaré** continue de se lire là où tu
  l'appelles : on ne remplace que ce que la signature annonce.

# Plusieurs cas

Trois taux de TVA — existant, rénovation, neuf — tiennent dans **une** fonction :

\`\`\`
fonction Taux de TVA(zones, Type de TVA) {
   // Le taux applicable, selon le type de travaux.
   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);
   si (Type de TVA = "existant")
   alors (5,5 %);
   sinon si (Type de TVA = "rénovation")
   alors (10 %);
   sinon si (Type de TVA = "neuf")
   alors (20 %);
}
\`\`\`

- **la première branche qui tient l'emporte.** Range donc le cas le plus
  particulier en premier, et le plus général en dernier ;
- \`sinon (…)\` à la fin donne la valeur quand aucune branche ne tient. Sans lui,
  une règle dont aucune branche ne tient ne dit **rien** — c'est parfois ce
  qu'on veut ;
- une branche porte ses \`et\` / \`ou\` comme la première :
  \`sinon si (A) et (B)\` ;
- \`sauf si (…)\` écarte la **règle entière**, pas une branche.

# Quand la loi est un tableau, écris un tableau

Une norme, un DTU, un Eurocode, un arrêté : c'est presque toujours un tableau à
double entrée. Écrit en \`sinon si\`, l'article fait quarante lignes que personne
ne compare à l'original. **\`selon\` nomme les colonnes une fois, et chaque ligne
du texte devient une ligne du barème** :

\`\`\`
fonction Degré coupe-feu des blocs-portes(zones, Famille, Hauteur du plancher bas) {
   // Arrêté du 31 janvier 1986, article 96.
   importe (variable: Famille, depuis: variables-du-projet.ref, zones: zones);
   importe (variable: Hauteur du plancher bas, depuis: variables-du-projet.ref, zones: zones);
   selon (Famille, Hauteur du plancher bas)
      | 3e famille A | <= 28 m | CF 1/2 h |
      | 3e famille B | <= 28 m | CF 1 h   |
      | 4e famille   | > 28 m  | CF 1 h   |
   sinon ("non traité");
}
\`\`\`

- les colonnes se lisent **dans l'ordre de \`selon\`**, et la **dernière case de
  chaque ligne est ce qu'elle conclut** ;
- la **première ligne qui tient l'emporte**, comme pour \`sinon si\` : un barème
  *est* une suite de branches, écrite autrement ;
- une **case blanche ne contraint rien** — c'est ce qu'impriment les normes
  quand une ligne vaut quelle que soit la colonne ;
- **une case nue est un libellé, jamais une mesure.** \`3e famille B\` se lit tel
  quel ; pour comparer un nombre, écris son comparateur — \`<= 28 m\`, ou
  \`= 28 m\` pour l'égalité ;
- une case porte un \`ou\` comme ailleurs : \`bois ou métal\` ;
- un barème s'écrit **seul** : pas de \`si\` ni de \`sinon si\` à côté. \`sinon (…)\`
  et \`sauf si (…)\` restent, eux — ils valent pour le tableau entier.

**Quand emploies-tu un barème plutôt que des \`sinon si\` ?** Dès que la phrase
décrit un tableau, ou que tu écrirais trois branches ou plus qui comparent les
**mêmes** noms. En dessous, \`si … sinon si\` se lit mieux.

# Ce qui se demande, et ce qui se déduit

Le formulaire du bac d'essai n'est écrit nulle part : il se **déduit**. Tout
nom qu'une fonction lit sans qu'aucune ne le conclut devient un champ à
remplir ; tout nom qu'une fonction conclut se lit, et ne se demande pas.

Tu n'as donc **aucun mot d'affichage à écrire** — ni champ, ni étiquette, ni
liste. Pour obtenir l'écran que la phrase décrit :

- une valeur que l'utilisateur doit saisir → déclare-la avec \`const\`, et son
  \`type\` fait la forme du champ : \`"mesure"\` + \`unité\` un nombre,
  \`"logique"\` deux boutons, \`valeurs possibles\` une liste déroulante ;
- une valeur qui se déduit → écris la fonction qui la conclut, et **ne la
  déclare pas** ;
- une valeur à montrer → elle l'est déjà : le bac montre toutes les conclusions
  et toutes les étapes de \`calcule\`, avec leur trace.

# Une donnée de base

\`\`\`
Altitude du site = 890 m {
   document: relevé topographique du 12 mars 2026
      parce que: "cote NGF au droit du bâtiment A : 890,00 m"
   statut: retenu
}
\`\`\`

N'écris \`document:\`, \`texte:\` ou \`parce que:\` **que si la phrase les
donne**. Une provenance inventée est le pire de ce que tu peux produire : elle
sera citée six mois plus tard comme si elle existait.

# La forme

- l'indentation est de **trois espaces**, jamais une tabulation ;
- une ligne vide sépare deux blocs ;
- tout se tape au clavier : pas de \`§\`, pas de \`←\`, pas de \`≤\`.

# Ce qu'on attend de toi

Écris ce que la phrase dit, **et rien de plus**. Ce que tu n'as pas su écrire
se déclare ; ce que tu inventes ne se verra pas.`;

/**
 * Ce que le modèle a rendu, remis en fichiers.
 *
 * `null` quand rien ne s'en lit : on ne fabrique pas un brouillon vide qui se
 * lirait comme « le modèle n'a rien trouvé à dire ».
 */
export function fichiersDuModele(lu) {
  const rendus = Array.isArray(lu?.fichiers) ? lu.fichiers : [];
  const fichiers = rendus
    .map((fichier) => ({
      nom: String(fichier?.nom ?? "").trim(),
      contenu: String(fichier?.contenu ?? "")
    }))
    // Le schéma ferme déjà la liste des noms ; on la referme ici, parce qu'un
    // schéma se relâche le jour où quelqu'un le change et que ce module
    // resterait seul à savoir ce qui est permis.
    .filter((fichier) => FICHIERS_PERMIS.includes(fichier.nom) && fichier.contenu.trim());

  return fichiers.length ? fichiers : null;
}

/** Ce que le modèle déclare ne pas avoir su écrire, nettoyé. */
export function lacunesDuModele(lu) {
  return (Array.isArray(lu?.ce_que_je_nai_pas_su_ecrire) ? lu.ce_que_je_nai_pas_su_ecrire : [])
    .map((lacune) => ({
      phrase: String(lacune?.phrase ?? "").trim(),
      pourquoi: String(lacune?.pourquoi ?? "").trim()
    }))
    .filter((lacune) => lacune.phrase);
}

/**
 * Ce que le projet conclut déjà, relu de ce qui monte, et dit au modèle.
 *
 * ## Pourquoi ce n'est pas dans la consigne
 *
 * La consigne enseigne la **grammaire** : elle est la même pour tous les
 * projets, et elle se met en cache. Ce que ce projet-ci a signé est un
 * **fait**, il change à chaque versement, et il se met avec la phrase.
 *
 * ## Pourquoi on le relit plutôt que de le croire
 *
 * Ce qui monte d'un navigateur n'est jamais ce qu'on suppose. Une liste de
 * trois cents noms ferait une consigne où la phrase se perd, et un objet mal
 * formé ferait tomber la transcription entière sur un champ qu'on n'avait pas
 * prévu.
 */

/** Combien de fonctions au plus. Au-delà, on dit combien il en reste. */
export const FONCTIONS_AU_PLUS = 80;

const mot = (valeur) => String(valeur ?? "").trim();

/** Ce que le projet sait, ramené à ce qu'on sait lire. */
export function ceQueLeProjetSaitLu(brut = null) {
  const fonctions = (Array.isArray(brut?.fonctions) ? brut.fonctions : [])
    .map((une) => ({
      nom: mot(une?.nom),
      lit: (Array.isArray(une?.lit) ? une.lit : []).map(mot).filter(Boolean),
      rend: mot(une?.rend),
      forme: mot(une?.forme)
    }))
    .filter((une) => une.nom)
    .slice(0, FONCTIONS_AU_PLUS);

  const deplus = Number(brut?.deplus);
  return { fonctions, deplus: Number.isFinite(deplus) && deplus > 0 ? Math.floor(deplus) : 0 };
}

/**
 * La phrase qui précède la demande. Vide quand le projet ne conclut rien.
 *
 * **Elle dit aussi comment s'en servir**, parce que c'est là que la faute se
 * commet : on demande de « lancer » une fonction existante, et un modèle qui
 * connaît d'autres langages écrit un appel. Le langage n'en a pas — on nomme.
 */
export function phraseDeCeQuiEstConnu(connu = null) {
  const fonctions = connu?.fonctions ?? [];
  if (!fonctions.length) return "";

  const lignes = fonctions.map((une) => {
    const lit = une.lit.length ? ` — lit ${une.lit.join(", ")}` : "";
    const rend = une.rend ? ` — rend ${une.rend}` : "";
    return `- ${une.nom}${lit}${rend}`;
  });

  const reste = connu.deplus
    ? `\n(et ${connu.deplus} autre${connu.deplus > 1 ? "s" : ""} que cette liste ne montre pas)`
    : "";

  /**
   * **L'exemple porte un nom de ce projet-ci**, et non un nom inventé.
   *
   * Une consigne qui montre `calcule X = Couleur des volets;` à un projet qui
   * n'a pas de volets enseigne une règle abstraite ; la même phrase écrite avec
   * la fonction que l'utilisateur vient de signer montre **sa** ligne, prête à
   * copier.
   */
  const une = mot(fonctions[0]?.nom) || "Nom de la fonction";

  /**
   * **Le contre-exemple, écrit en toutes lettres.**
   *
   * « ne les appelle pas » était déjà là, et ne suffisait pas : le modèle a
   * écrit `Couleur des volets(zones, Matériau);` malgré la phrase. Une règle
   * énoncée pèse moins qu'une forme montrée — surtout contre une habitude
   * qu'ont tous les autres langages. On montre donc la faute **et** sa
   * correction, côte à côte.
   */
  const lit = (fonctions[0]?.lit ?? []).map(mot).filter(Boolean);
  const premiere = lit[0] || "Nature";

  return `Ce projet a déjà signé ces fonctions. Elles existent : ne les réécris pas, `
    + `sers-t'en.\n`
    + `${lignes.join("\n")}${reste}\n\n`
    + `Deux façons de t'en servir, et elles ne disent pas la même chose :\n`
    + `- **La nommer** — \`calcule X = ${une};\` — elle lit alors ses propres noms, `
    + `ceux de sa signature.\n`
    + `- **L'appeler** — \`calcule X = ${une}(zones, Autre nom);\` — elle lit alors `
    + `ce que tu lui donnes, dans l'ordre de sa signature. C'est ce qu'il faut `
    + `quand le nom que tu as n'est pas celui qu'elle a déclaré : `
    + `\`${une}\` lit \`${premiere}\`, et tu peux lui donner n'importe quel nom `
    + `à la place.\n\n`
    + `**La portée d'abord, toujours** : \`zones\` est le premier paramètre de toute `
    + `signature, donc le premier argument de tout appel. Donne exactement autant `
    + `de valeurs que la signature en déclare.\n\n`
    + `**Un appel se pose où l'on s'en sert** — dans un \`calcule\`, ou directement `
    + `dans un \`si (…)\` — et **jamais** seul sur sa ligne :\n`
    + `- \`si (${une}(zones, Autre nom) = "…")\`\n`
    + `- ou \`calcule x = ${une}(zones, Autre nom);\` puis \`si (x = "…")\`\n\n`;
}
