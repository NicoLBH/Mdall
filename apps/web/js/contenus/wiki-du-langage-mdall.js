/**
 * Le wiki du langage Mdall : son contenu, et rien d'autre.
 *
 * ## Pourquoi un module, et non un `.md` qu'on va chercher
 *
 * Le contenu devait vivre dans **un fichier du dépôt**, qu'on relit et qu'on
 * corrige sans toucher à l'écran qui le montre. Un Markdown chargé au vol
 * remplissait cette condition, et en ajoutait trois qu'on n'a pas demandées :
 * un aller-retour réseau avant de pouvoir lire la documentation du produit, un
 * rendu Markdown de plus à calibrer, et un écran vide le jour où la requête
 * échoue. La documentation d'un langage ne peut pas manquer.
 *
 * C'est donc une **donnée**, pas un texte à interpréter : des sections, des
 * paragraphes, des exemples. L'écran ne fait que la mettre en page, et les
 * exemples se colorent avec le peintre du langage — le même que la zone de
 * saisie, si bien qu'un exemple du wiki et la même ligne tapée à la main
 * prennent exactement les mêmes couleurs.
 *
 * ## Ce que ce fichier promet
 *
 * Chaque exemple est **du Mdall qui se lit**. Une épreuve les relit tous avec
 * `lireUnFichier` et refuse un wiki qui enseignerait une syntaxe que le langage
 * ne connaît pas — c'est arrivé à assez de documentations pour qu'on ne fasse
 * pas confiance à la relecture humaine (règle 12).
 */

/** Une section du wiki : un titre, ce qu'elle dit, et ce qu'elle montre. */
const section = (id, titre, blocs) => ({ id, titre, blocs });
/** Un paragraphe. Le gras se marque `**ainsi**`, et rien d'autre ne se marque. */
const dit = (texte) => ({ quoi: "texte", texte });
/** Un exemple de Mdall, coloré comme dans l'éditeur. */
const code = (...lignes) => ({ quoi: "code", code: lignes.join("\n") });
/** Un tableau : une ligne d'en-tête, puis les autres. */
const table = (entetes, lignes) => ({ quoi: "table", entetes, lignes });
/** Une liste à puces. */
const liste = (...points) => ({ quoi: "liste", points });

export const WIKI_DU_LANGAGE = [
  section("quoi", "Ce qu'est Mdall", [
    dit("Mdall est la **langue dans laquelle un projet de construction se souvient**. "
      + "Pas un tableur, pas une base de données, pas un format d'échange : une langue "
      + "qu'un contrôleur technique peut lire, écrire et relire dix-huit mois plus tard "
      + "pour comprendre pourquoi une cote vaut ce qu'elle vaut."),
    dit("Trois choses s'y écrivent, et trois seulement : **ce qu'on sait** — une valeur, "
      + "avec d'où elle vient ; **ce qu'on en déduit** — une règle, avec ses conditions ; "
      + "et **ce qu'on ne sait pas** — car ne pas savoir n'autorise pas à prétendre "
      + "qu'il n'y a rien."),
    dit("Tout est du texte. Un fichier Mdall s'ouvre dans n'importe quel éditeur, se "
      + "compare ligne à ligne, se met dans un dépôt. Il n'y a pas de format binaire, "
      + "pas de base qu'on ne peut pas relire sans le logiciel, et c'est délibéré : "
      + "**on doit pouvoir se passer de l'outil**.")
  ]),

  section("pourquoi", "À quoi il sert", [
    dit("Un projet de construction oublie. La note de calcul qui justifiait une "
      + "fondation part avec le stagiaire qui l'a faite ; la réunion où l'on a tranché "
      + "sur la zone sismique n'a laissé qu'un compte rendu que personne ne relit. "
      + "Deux ans plus tard, la question revient, et l'on refait le calcul."),
    dit("Mdall garde **la valeur et son raisonnement ensemble**. Une cote de plancher "
      + "bas n'est pas un nombre dans une case : c'est un nombre, la règle qui l'a "
      + "produite, les entrées qu'elle a lues, le texte réglementaire cité, et la date. "
      + "Changez une entrée, et le logiciel sait tout ce qui bouge avec elle."),
    dit("C'est aussi ce qui permet de **rejouer** : reprendre une règle écrite il y a "
      + "un an, la relancer sur les valeurs d'aujourd'hui, et voir ce qu'elle conclut. "
      + "Une règle qu'on ne peut pas rejouer est une opinion.")
  ]),

  section("comment", "Comment il fonctionne", [
    dit("Trois extensions, et chacune porte une seule chose :"),
    table(["fichier", "ce qu'il porte"], [
      [".ddb", "des données de base : ce qu'on sait, avec sa provenance"],
      [".ref", "des règles et des noms : ce qui se raisonne"],
      [".ctr", "les conclusions du projet : ce que les règles ont produit"]
    ]),
    dit("**Rien n'entre dans la mémoire directement.** Jamais. Tout passe par une "
      + "**proposition** : un jeu de lignes qu'on relit une à une et qu'on signe — ou "
      + "qu'on refuse. Le Copilote propose, la lecture d'un compte rendu propose, cet "
      + "écran propose. Aucun d'eux n'écrit."),
    dit("C'est la première règle du projet, et elle n'a pas d'exception : une mémoire "
      + "où quelque chose peut entrer sans signature est une mémoire dont on ne peut "
      + "plus rien affirmer.")
  ]),

  section("affirmation", "Une affirmation : ce qu'on sait", [
    dit("La forme la plus simple. Un sujet, ce qu'il vaut, et d'où cela vient."),
    code(
      "Altitude du site = 890 m",
      "   texte: NF EN 1991-1-3, annexe nationale",
      "   statut: retenu",
      "   le: 12 mars 2026"
    ),
    dit("Une **mesure** s'écrit nue, avec son unité : `890 m`. Un **texte** s'écrit "
      + "entre guillemets : `\"3e famille B\"`. Sans cette différence, on ne saurait pas "
      + "relire `= 3` — trois quoi, ou la catégorie « 3 » ? La question se pose "
      + "vraiment : la famille d'un bâtiment est une catégorie, pas un nombre."),
    dit("La ligne qui suit dit **d'où** : `texte:` pour un règlement, `document:` pour "
      + "une pièce du projet, `calcul:`, `règle:`, `décision:`, `hypothèse:`. Six "
      + "provenances, et il faut en choisir une."),
    dit("`statut:` dit ce que **ce** projet en fait aujourd'hui : `retenu`, `supposé`, "
      + "`contesté`, `remplacé`, `écarté`, `sans objet`, `en attente`. Ce n'est pas une "
      + "propriété de la valeur — la même règle donne « retenu » ici et « contesté » là.")
  ]),

  section("nom", "Déclarer un nom", [
    dit("Un nom qu'une règle va lire se déclare, une fois, dans "
      + "`variables-du-projet.ref`. C'est ce qui permet à l'écran de savoir ce qu'il "
      + "peut vous demander, et dans quelle unité."),
    code(
      "const Zone de vent = {",
      "   type: \"texte\",",
      "   valeurs possibles: \"1\" ou \"2\" ou \"3\" ou \"4\",",
      "   description: \"Zone de vent de la commune, au sens de l'annexe nationale.\",",
      "   utilisation: \"Entrée de la vitesse de référence.\",",
      "};"
    ),
    dit("`valeurs possibles` **ferme le domaine** : l'écran en fait une liste "
      + "déroulante, et une valeur hors liste se voit. Une déclaration n'affirme rien — "
      + "elle explique. C'est pour cela qu'un nom déclaré sans valeur reste dehors "
      + "d'une proposition.")
  ]),

  section("fonction", "Une fonction : ce qu'on déduit", [
    dit("Une fonction porte un raisonnement. Elle déclare ce qu'elle lit, pose ses "
      + "conditions, conclut, et dit où sa conclusion irait."),
    code(
      "fonction Vitesse de référence(zones, Zone de vent) {",
      "   // La vitesse de référence du vent, par zone.",
      "   importe (variable: Zone de vent, depuis: vent.ddb, zones: zones);",
      "   soit texte = \"NF EN 1991-1-4, annexe nationale\";",
      "   si (Zone de vent = \"3\")",
      "   alors (",
      "      enregistre (",
      "         Vitesse de référence: \"120 km/h\",",
      "         dans: vent.ctr,",
      "         zones: zones",
      "      )",
      "   );",
      "   sinon (\"100 km/h\");",
      "}"
    ),
    dit("`importe` déclare d'où vient chaque entrée : le nom, le fichier, et la "
      + "portée. `soit` déclare d'où la règle tient sa loi — `soit texte`, "
      + "`soit document`, `soit règle` : **le nom de la locale est le type de "
      + "provenance**. `enregistre`, dans le `alors`, dit où la conclusion s'écrit : "
      + "le sujet, le fichier, la portée. Trois lignes plutôt qu'une, parce que "
      + "chacun des trois peut changer seul."),
    dit("`si` pose la condition, `alors` la conclusion, `sinon` ce qu'il advient "
      + "autrement. `et`, `ou` et `non` relient ; ils se lisent **de gauche à droite, "
      + "sans priorité**, et l'écran le signale quand une règle les mêle."),
    dit("**Plusieurs cas s'enchaînent avec `sinon si`**, autant qu'il en faut. La "
      + "**première branche qui tient l'emporte** : l'ordre écrit est le sens, et "
      + "le cas le plus particulier se range donc en premier."),
    code(
      "fonction Taux de TVA(zones, Type de TVA) {",
      "   // Le taux applicable, selon le type de travaux.",
      "   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);",
      "   si (Type de TVA = \"existant\")",
      "   alors (5,5 %);",
      "   sinon si (Type de TVA = \"rénovation\")",
      "   alors (10 %);",
      "   sinon si (Type de TVA = \"neuf\")",
      "   alors (20 %);",
      "}"
    ),
    dit("Une branche porte ses propres `et` et `ou`. Un `sinon (…)` final donne la "
      + "valeur quand aucune branche ne tient ; sans lui, la règle ne dit **rien** "
      + "— ce qui est parfois exactement ce qu'on veut. Et **une branche qu'on ne "
      + "sait pas trancher arrête la lecture** : si la première condition ne se "
      + "décide pas, on ne passe pas à la suivante, parce que ce serait supposer "
      + "qu'elle est fausse."),
    dit("**Quand la loi est un tableau, on écrit un tableau.** Une norme, un DTU, "
      + "un Eurocode, un arrêté : c'est presque toujours un tableau à double "
      + "entrée et trois notes. Écrit en `sinon si`, l'article fait quarante "
      + "lignes que personne ne compare à l'original. `selon` nomme les colonnes "
      + "une fois, et chaque ligne du texte devient une ligne du barème — la "
      + "fonction **ressemble au texte**, et se relit à côté de lui."),
    code(
      "fonction Degré coupe-feu des blocs-portes(zones, Famille, Hauteur du plancher bas) {",
      "   // Arrêté du 31 janvier 1986, article 96.",
      "   selon (Famille, Hauteur du plancher bas)",
      "      | 3e famille A | <= 28 m | CF 1/2 h |",
      "      | 3e famille B | <= 28 m | CF 1 h   |",
      "      | 4e famille   | > 28 m  | CF 1 h   |",
      "   sinon (\"non traité\");",
      "}"
    ),
    dit("Les colonnes se lisent dans l'ordre de `selon`, et **la dernière case de "
      + "chaque ligne est ce qu'elle conclut**. La première ligne qui tient "
      + "l'emporte, comme pour `sinon si` : un barème *est* une suite de branches, "
      + "écrite autrement. Une **case blanche ne contraint rien** — c'est ce "
      + "qu'impriment les normes quand une ligne vaut quelle que soit la colonne."),
    dit("Une règle, une seule : **une case nue est un libellé, jamais une mesure**. "
      + "`3e famille B` se lit tel quel ; pour comparer un nombre, on écrit son "
      + "comparateur — `<= 28 m`, ou `= 28 m` pour l'égalité. Sans cette règle, "
      + "`3e famille B` se lirait « 3 » suivi de l'unité « e famille B », et deux "
      + "lignes voisines porteraient la même valeur."),
    dit("Un barème s'écrit **seul** : pas de `si` ni de `sinon si` à côté, sinon on "
      + "ne peut lire la règle ni comme l'un ni comme l'autre. `sinon` et "
      + "`sauf si` restent, eux : ils valent pour le tableau entier."),
    dit("`sauf si` borne la règle — une exception qui reprend la main sur la "
      + "conclusion, **quelle que soit la branche** :"),
    code(
      "fonction Famille du bâtiment(zones, Hauteur du plancher bas, Nombre de logements) {",
      "   si (Hauteur du plancher bas > 8 m)",
      "   alors (\"3e famille\");",
      "   sauf si (Nombre de logements <= 2)",
      "}"
    ),
    dit("Une fonction **s'écrit toujours en entier**. Quand une loi ne peut pas "
      + "s'écrire en conditions — un calcul aux éléments finis, une recherche dans une "
      + "table de mille lignes —, une seule ligne de son corps ne se lit pas : "
      + "l'**appel d'agent**. Le reste s'écrit, se lit et se rejoue comme toujours.")
  ]),

  section("trois-valeurs", "Vrai, faux, et indécidable", [
    dit("C'est ce qui distingue Mdall d'un tableur, et ce qui apprend le plus vite."),
    dit("Une condition dont l'entrée manque n'est pas **fausse** : elle est "
      + "**indécidable**. On écrit une règle, on ne remplit pas un champ, et le "
      + "logiciel répond « je ne sais pas » au lieu de conclure `sinon`."),
    table(["ce qu'on lit", "ce que la règle conclut"], [
      ["Zone de vent = \"3\"", "vrai — la règle conclut son `alors`"],
      ["Zone de vent = \"2\"", "faux — la règle conclut son `sinon`"],
      ["Zone de vent n'a pas de valeur", "**indécidable** — la règle ne conclut rien"]
    ]),
    dit("Un tableur aurait mis zéro, conclu `sinon`, et personne n'aurait rien vu.")
  ]),

  section("calcul", "L'arithmétique", [
    dit("Mdall sait calculer, et il refuse de calculer ce qu'il ne sait pas "
      + "calculer. Le verbe est **`calcule`** : il pose une valeur **pour cette "
      + "fonction seule**, et cette valeur se lit ensuite comme n'importe quel "
      + "nom — dans une condition, et dans un `alors`."),
    code(
      "   calcule TVA = Prix HT * 20%;",
      "   calcule Prix TTC = Prix HT + TVA;",
      "   calcule Diagonale = racine(Largeur ^ 2 + Longueur ^ 2);",
      "   calcule Cote = arrondi(Niveau du sol + 1 m ; 2);"
    ),
    dit("Les `calcule` se posent après les `importe` et avant le `si`, **dans "
      + "l'ordre où ils se lisent** : le second peut lire le premier. C'est tout "
      + "l'intérêt — on décompose un calcul en étapes qu'on peut nommer, et "
      + "chaque étape se lit à l'écran quand on lance."),
    dit("**Ce n'est pas `soit`**, qui est pris : le nom d'un `soit` *est* un type "
      + "de provenance — `soit texte = …`, `soit règle = …`. Et **l'expression ne "
      + "se met pas entre guillemets** : ce n'est pas un texte, c'est une "
      + "arithmétique qui se rejoue."),
    dit("Une valeur calculée **ne sort pas toute seule** : elle vit dans sa "
      + "fonction, n'a pas de déclaration, et personne ne la cherche ailleurs. "
      + "Pour aller au projet, elle passe par `alors` et par `enregistre`, comme "
      + "toute conclusion — il n'y a pas de seconde porte vers la mémoire."),
    table(["ce qui s'écrit", "ce que cela veut dire"], [
      ["`+` `-` `*` `/`", "et `×` `÷` pour qui les a sous la main"],
      ["`^`", "la puissance : `2^3^2` vaut `2^9`, comme en mathématiques"],
      ["`20%`", "un **suffixe**, pas un opérateur : vaut `0,2`, sans unité"],
      ["`(` `)`", "les priorités ; sinon celles des mathématiques"],
      ["`racine` `abs` `arrondi`", "et `plafond`, `plancher`, `min`, `max`"]
    ]),
    dit("**La virgule est décimale** : on écrit `0,2`. Elle ne peut donc pas séparer "
      + "aussi les arguments d'une fonction — `min(1,5)` serait le minimum de un et "
      + "cinq, ou bien un et demi. Les arguments se séparent d'un **point-virgule** : "
      + "`min(1,5; 2)`."),
    dit("**Deux unités d'une même grandeur se convertissent ; deux grandeurs "
      + "différentes se refusent.** C'est toute la règle, et elle vaut aussi bien "
      + "dans un calcul que dans une condition — une cote en centimètres dans un "
      + "plan et un seuil en mètres dans une norme se comparent."),
    table(["ce qu'on écrit", "ce qu'on obtient"], [
      ["`3 m + 2 m`", "`5 m`"],
      ["`0,71 m + 35 cm`", "`1,06 m` — deux longueurs, et le résultat garde l'unité de gauche"],
      ["`1 h - 30 min`", "`0,5 h`"],
      ["`si (Hauteur <= 2 m)` avec `150 cm`", "vrai — 150 cm valent 1,50 m"],
      ["`3 m + 2 kN`", "refus — une longueur et une force"],
      ["`3 m + 2`", "refus — deux quoi ? Un produit accepte un facteur nu, pas une somme"],
      ["`3 m * 40 cm`", "`1,2 m²`"],
      ["`6 m² / 2 m`", "`3 m`"],
      ["`2 m * 3 €`", "refus — personne n'a demandé des mètres-euros"],
      ["`10 / 0`", "refus — on ne divise pas par zéro"]
    ]),
    dit("Les unités connues sont celles du métier : longueurs (`mm` à `km`), "
      + "surfaces et volumes (`m²`, `m³`, `ha`, `L`), masses (`g`, `kg`, `t`), "
      + "forces (`N`, `daN`, `kN`, `MN`), pressions (`Pa` à `GPa`, `bar`), durées "
      + "(`s`, `min`, `h`, `j`), puissances (`W`, `kW`, `MW`) et l'angle (`°`). "
      + "**La casse compte** : `mN` est un millinewton, `MN` un méganewton — un "
      + "facteur d'un milliard."),
    dit("Trois choses que le langage ne fait **pas**, et les dire vaut mieux que de "
      + "les faire à moitié : il ne compose pas `kN/m` avec `N/mm` — deux unités "
      + "composées ne se comparent que si elles s'écrivent pareil ; il ne convertit "
      + "pas les températures — `0 °C` ne vaut pas `0 K`, et le décalage n'est pas "
      + "un facteur ; et il ne devine aucun symbole — `dN` mal orthographié ne "
      + "devient pas `daN`, il reste inconnu."),
    dit("Et un nom sans valeur reste **indécidable**, jamais zéro. Une altitude à zéro "
      + "se calcule sans broncher jusqu'à une cote de fondation fausse.")
  ]),

  section("boucle", "Répéter un calcul : « pour chaque »", [
    dit("Beaucoup de ce qu'on écrit est la même formule appliquée à une suite de "
      + "valeurs : un moment pour chaque portée de 2 à 90 mètres, une descente de "
      + "charge niveau par niveau, un dimensionnement pour chaque diamètre. "
      + "**`pour chaque` répète, et ce qui en sort est un tableau.**"),
    code(
      "fonction Volume le plus gros(zones, Section, Hauteur maximale) {",
      "   // Le poteau le plus volumineux de la trame.",
      "   importe (variable: Section, depuis: variables-du-projet.ref, zones: zones);",
      "",
      "   pour chaque Hauteur de 2,5 m à Hauteur maximale par pas de 0,5 m",
      "      calcule Volume = Hauteur * Section;",
      "",
      "   calcule Le plus gros = le plus grand de Volume;",
      "   si (Le plus gros > 0 m³)",
      "   alors (Le plus gros);",
      "}"
    ),
    dit("**Une boucle produit un tableau, jamais une variable qui s'accumule.** "
      + "Un accumulateur — « total = total + x » — ne se relit pas : il faut "
      + "simuler l'exécution dans sa tête pour savoir ce qu'il vaut à la fin. Les "
      + "quarante-cinq lignes d'un tableau, elles, se **voient**, et se comparent "
      + "une à une à la note de calcul d'origine. C'est toute la différence entre "
      + "un langage qu'on relit et un langage qu'on exécute."),
    table(["ce qu'on écrit", "ce que cela veut dire"], [
      ["`pour chaque <nom> de <début> à <fin> par pas de <pas>`", "la tête, en toutes lettres"],
      ["les trois bornes", "un nombre, un nom du projet, ou un calcul"],
      ["le corps, **trois espaces plus loin**", "un `calcule` par colonne du tableau"],
      ["la première ligne qui n'est pas un `calcule`", "referme le corps"]
    ]),
    dit("Le tableau se lit ensuite par un **agrégat**, et c'est la seule façon "
      + "d'en tirer une valeur. Ils s'écrivent après la boucle, au même retrait "
      + "qu'elle :"),
    table(["la phrase", "ce qu'elle rend"], [
      ["`la somme de Volume`", "le total de la colonne"],
      ["`le plus grand de Volume`", "la plus grande valeur"],
      ["`le plus petit de Volume`", "la plus petite"],
      ["`la moyenne de Volume`", "la moyenne"],
      ["`le nombre de Volume`", "combien de lignes ont une valeur"]
    ]),
    dit("Ce sont `sum`, `max`, `min`, `moyenne` et `compte`, **et ils s'écrivent "
      + "en français exprès** : une fonction nommée `somme(…)` appelle à être "
      + "enchaînée, et cinq enchaînements plus loin plus personne ne relit la "
      + "ligne. Le mot choisi décide du style qu'on écrira pendant dix ans."),
    dit("**Une ligne qu'on n'a pas su calculer ne compte pas** — et elle ne vaut "
      + "pas zéro. Un total qui compterait les trous serait plus petit que la "
      + "réalité, et rien ne le dirait. La ligne reste au tableau, sa case vide, "
      + "pour qu'on voie **laquelle** des quarante-cinq a échoué."),
    dit("Quatre choses se refusent, et se disent **avant** le lancement : un pas "
      + "de zéro ; un pas qui s'éloigne de la fin — `de 10 à 1 par pas de 1` "
      + "s'écrit `par pas de -1` ; des bornes qui ne mesurent pas la même chose ; "
      + "et un tableau de plus de 200 lignes. Cette dernière n'est pas une limite "
      + "technique : au-delà, le tableau ne se relit plus, et c'est tout l'intérêt "
      + "de cette forme."),
    dit("**Une seule boucle par fonction**, comme il n'y a pas de condition "
      + "imbriquée : deux niveaux demandent deux fonctions. Et l'on ne sort pas "
      + "d'une boucle en avance — le tableau fait ce qu'il annonce, et l'on lit "
      + "la ligne qui compte.")
  ]),

  section("courbe", "Un abaque : « courbe »", [
    dit("Les normes sont pleines de **figures** : un coefficient de forme selon "
      + "la pente, un coefficient d'exposition selon l'altitude, une pression "
      + "selon la hauteur. Les transcrire en arithmétique donne une suite de "
      + "produits que **personne ne peut comparer à la figure d'origine** — un "
      + "contrôleur technique regarde une courbe, il ne relit pas une régression."),
    code(
      "courbe Coefficient de forme(zones, Pente du versant) {",
      "   // NF EN 1991-1-3, figure 5.1 — toiture à un versant.",
      "   texte: NF EN 1991-1-3, annexe nationale",
      "   entre les points: linéaire",
      "   hors bornes: refuse",
      "   |  0° | 0,8 |",
      "   | 30° | 0,8 |",
      "   | 60° | 0   |",
      "}"
    ),
    dit("**Une courbe est une fonction**, écrite autrement : elle lit le nom de "
      + "sa signature et conclut sous le sien. Les autres la lisent comme "
      + "n'importe quel nom — il n'y a pas d'appel, ici non plus. L'écran la "
      + "**dessine**, et montre entre quels deux points votre valeur est tombée."),
    dit("**Les deux déclarations sont obligatoires, et c'est tout l'objet de la "
      + "forme.** L'interpolation est déclarée, donc vérifiable :"),
    table(["ce qu'on écrit", "ce que cela veut dire"], [
      ["`entre les points: linéaire`", "une droite entre les deux points qui encadrent la valeur"],
      ["`entre les points: en escalier`", "la valeur du point atteint, jusqu'au suivant — un palier"],
      ["`hors bornes: refuse`", "au-delà des points écrits, la courbe ne conclut pas"],
      ["`hors bornes: borne`", "au-delà, la valeur de l'extrémité — quand le texte le dit"]
    ]),
    dit("**Écrivez `refuse` sauf si le texte dit le contraire.** C'est la faute "
      + "la plus chère : une courbe donnée de 0 à 60° prolongée jusqu'à 75° rend "
      + "un nombre parfaitement plausible, qui ne vient d'aucun texte — et "
      + "personne ne peut dire d'où il sort."),
    dit("Un point par ligne, deux cases : l'abscisse, puis ce que la courbe vaut. "
      + "**Les abscisses montent, strictement** — deux points au même endroit "
      + "donneraient deux valeurs pour une lecture, et une abscisse qui redescend "
      + "est une ligne recopiée dans le désordre. Il en faut au moins deux, et "
      + "chaque colonne mesure une seule chose."),
    dit("Le degré se colle au nombre — `30°` —, comme sur la figure. C'est la "
      + "seule unité qu'on écrit ainsi : `26 m` garde son espace."),
    dit("**Le langage n'ajuste aucune loi** : pas de régression, pas de spline, "
      + "pas de polynôme. Ce qui n'est pas entre deux points écrits n'existe pas. "
      + "Une courbe lissée rendrait des valeurs que le texte d'origine ne porte "
      + "pas, et c'est précisément ce qu'on refuse à un agent."),
    dit("**Un abaque se verse au projet**, comme une fonction : c'est une loi, "
      + "et le projet la tient avec ses points et ses deux déclarations. Toute "
      + "fonction qui nomme « Coefficient de forme » lit alors ce que la courbe "
      + "conclut pour la pente que le projet tient. Le recopier de projet en "
      + "projet lui donnerait plusieurs domiciles : corrigé ici, il resterait "
      + "faux là-bas, et rien ne dirait lequel fait foi."),
    dit("**Il ne conclut rien tant qu'on ne l'a pas lu**, et c'est normal : ce "
      + "que le projet tient d'un abaque, ce sont ses points. La valeur, elle, "
      + "naît de la lecture — et c'est la fonction qui le nomme qui la demande.")
  ]),

  section("graphique", "Regarder un tableau : « se lit en »", [
    dit("Une boucle rend un tableau, et quarante-cinq lignes de chiffres "
      + "répondent exactement à la question posée sans **rien montrer** : une "
      + "descente de charge qui double d'un niveau à l'autre, une pression qui "
      + "plafonne, ce sont des formes — et une colonne de nombres ne donne pas "
      + "de forme."),
    dit("**Un graphique n'est pas une construction du langage, c'est une façon "
      + "de regarder un tableau.** Rien ne s'écrit pour obtenir un dessin : "
      + "tout tableau qu'une boucle déroule se regarde en courbe ou en barres, "
      + "d'un clic, sous le tableau. Les fonctions écrites avant que cela "
      + "n'existe se dessinent aussi — il n'y en a aucune à rouvrir."),
    dit("La seule chose qu'une fonction peut faire, c'est **suggérer** ce qui "
      + "s'ouvre en premier :"),
    code(
      "fonction Descente de charge(zones, Charge par niveau) {",
      "   // Ce qui arrive en pied de poteau, niveau par niveau.",
      "   se lit en: barres",
      "",
      "   pour chaque Niveau de 1 à 4 par pas de 1",
      "      calcule Charge cumulée = Charge par niveau * Niveau;",
      "",
      "   calcule Charge en pied = le plus grand de Charge cumulée;",
      "   si (Charge en pied > 0 kN)",
      "   alors (Charge en pied);",
      "}"
    ),
    dit("`se lit en:` **ne dessine rien** : il dit laquelle des trois lectures "
      + "s'ouvre la première. Vous savez ce que votre tableau veut dire ; le "
      + "lecteur change d'avis d'un clic."),
    table(["ce qu'on écrit", "ce qu'on voit d'abord"], [
      ["`se lit en: tableau`", "les lignes en clair — c'est aussi le défaut"],
      ["`se lit en: courbe`", "une ligne brisée par colonne : ce qui **varie** se voit"],
      ["`se lit en: barres`", "une barre par ligne : ce qui se **compare** se voit"]
    ]),
    dit("**Sans cette ligne, c'est le tableau qui s'ouvre**, et ce n'est pas de "
      + "la timidité : c'est lui qui se compare au texte d'origine, et c'est la "
      + "vérification. Un dessin qui s'ouvrirait tout seul ferait croire qu'on a "
      + "vérifié parce qu'on a regardé."),
    dit("**L'abscisse ne se choisit pas** : c'est la variable de boucle, ce qui "
      + "change d'une ligne à l'autre. Les colonnes se dessinent contre elle, et "
      + "une colonne qui **mesure autre chose** que la première n'est pas "
      + "dessinée — deux grandeurs sur une grille se croisent là où elles ne se "
      + "croisent pas. L'écran nomme celles qu'il a écartées ; il ne les tait "
      + "pas."),
    dit("Le dessin n'a **pas d'axes chiffrés**, et c'est voulu : les nombres "
      + "sont dans le tableau, où ils se lisent exactement. Les répéter en "
      + "graduations ferait deux lectures du même fait, dont l'une "
      + "approximative — et c'est celle-là qu'on croirait."),
    dit("Un tableau d'une seule ligne n'offre pas de bouton : un dessin d'un "
      + "seul point n'est pas un dessin. Et un abaque écrit en `courbe` se "
      + "dessine aussi, sans rien déclarer — c'est le même dessin."),
    dit("**Une quatrième lecture ne se suggère pas** : le **nuage**, qui dessine "
      + "une colonne contre une autre. Les trois premières prennent l'abscisse "
      + "de la boucle, et il n'y a rien à demander ; un nuage choisit la sienne, "
      + "et ce choix ne peut venir que de vous. Il s'ouvre d'un clic, et "
      + "`se lit en: nuage` est refusé — ce serait porter dans la fonction une "
      + "intention de mise en page."),
    dit("Ses points **ne sont pas reliés**, et c'est le point : une ligne brisée "
      + "dit un ordre, un nuage montre une forme. Au survol, chaque point dit de "
      + "quelle ligne il vient — sans quoi on lirait un nuage sans savoir lequel "
      + "de ses points est la troisième ligne."),
    dit("**Attention à ce qu'un nuage n'est pas ici.** Dans un tableau Mdall, "
      + "chaque colonne est une fonction de la variable de boucle : il n'y a ni "
      + "bruit, ni échantillon, ni dispersion. Vous n'y lisez pas une "
      + "corrélation — vous y lisez une relation exacte entre deux colonnes qui "
      + "descendent du même paramètre.")
  ]),

  section("cadres", "Deux grandeurs : deux cadres, jamais deux échelles", [
    dit("Une colonne en mètres et une en kilonewtons ne tiennent pas sur la même "
      + "grille : elles se croiseraient là où elles ne se croisent pas. Elles se "
      + "rangent donc chacune dans **son cadre**, et les cadres s'empilent sur "
      + "**la même abscisse**. Vous n'avez rien à écrire pour cela."),
    dit("**Le second axe à droite aurait été la réponse habituelle, et c'est "
      + "justement ce qu'on refuse.** Deux échelles choisies séparément placent "
      + "le croisement des deux courbes exactement où l'on veut : décalez l'une "
      + "de vingt pour cent, elles se croisent vingt lignes plus loin. Le dessin "
      + "reste parfaitement lisible, et il ne dit plus rien de vérifiable — il "
      + "dit ce que son auteur a décidé."),
    dit("Empilés, les cadres ne se croisent jamais. Ce qu'on compare est ce qui "
      + "se compare vraiment : **la forme**, à la même abscisse — ce qui monte "
      + "pendant que l'autre descend. Les bornes se disent une fois, sous le "
      + "dernier cadre."),
    dit("C'est la même famille de faute que la barre qui ne part pas de zéro, en "
      + "plus difficile à voir : un graphique honnête ne laisse pas son auteur "
      + "choisir où deux courbes se croisent.")
  ]),

  section("rejeu", "Relire une fonction versée, et voir son tableau", [
    dit("Une fonction versée se relit dans la **Mémoire** du projet, avec sa "
      + "boucle, ses calculs et sa suggestion de lecture. Sous son texte, "
      + "l'écran **déroule son tableau** — sur les valeurs que le projet tient "
      + "aujourd'hui, et rien d'autre."),
    dit("**Ce n'est pas un bac d'essai** : on n'y répond à aucune question. "
      + "C'est une lecture. Une entrée qui change dans la mémoire change ce "
      + "tableau, et c'est tout l'intérêt — on voit ce que la fonction fait du "
      + "projet réel, sans la recopier ailleurs."),
    dit("**Un tableau par zone.** Une variable n'a pas une valeur, elle en a une "
      + "par partie d'ouvrage : la descente de charge du bâtiment A et celle du "
      + "bâtiment B ne sont pas le même travail."),
    dit("Et si le projet ne porte pas encore ses entrées, l'écran **dit ce qui "
      + "manque** plutôt que d'afficher quatre lignes de tirets — qui se "
      + "liraient comme « cette fonction ne produit rien ».")
  ]),

  section("annonce", "Ce qu'une fonction annonce : sa signature, et ce qu'elle rend", [
    dit("**La signature annonce tout ce que la fonction lit**, et rien d'autre. "
      + "`zones` en premier et toujours — c'est la **portée**, les parties "
      + "d'ouvrage auxquelles elle s'applique —, puis chaque nom que son corps "
      + "lit, y compris ceux qu'une autre fonction conclut."),
    code(
      "fonction Prix TTC(zones, Prix HT, Taux de TVA) {",
      "   calcule TVA = Prix HT * Taux de TVA;",
      "   calcule Prix TTC = Prix HT + TVA;",
      "   si (Prix TTC > 0 €)",
      "   alors (Prix TTC);",
      "}"
    ),
    dit("Ce qu'elle **pose elle-même** n'y figure pas : `TVA` et `Prix TTC` sont "
      + "des `calcule`, la variable d'une boucle et ses colonnes aussi. On "
      + "annonce ce qu'il faut lui **donner**, jamais ce qu'elle fabrique."),
    dit("**Elle est vérifiée, et les deux sens comptent.** Une entrée lue sans "
      + "être annoncée fait lire une fonction plus simple qu'elle n'est ; une "
      + "entrée annoncée dont rien ne se sert fait relire le corps trois fois "
      + "pour la chercher. L'écran refuse les deux, et vous donne la ligne à "
      + "écrire."),
    dit("**`rend:` dit ce qu'on obtient en la nommant**, et c'est facultatif. "
      + "Sans lui, on sait ce qu'une fonction lit sans savoir si elle rend une "
      + "couleur, une épaisseur en centimètres ou un vrai/faux."),
    code(
      "fonction Couleur des volets(zones, Matériau) {",
      "   rend: \"gris\" ou \"blanc\"",
      "",
      "   si (Matériau = \"bois\")",
      "   alors (\"gris\");",
      "   sinon (\"blanc\");",
      "}"
    ),
    table(["ce qu'on écrit", "ce que cela promet"], [
      ["`rend: \"gris\" ou \"blanc\"`", "les valeurs possibles, entre guillemets"],
      ["`rend: kN`", "une mesure, dans cette unité"],
      ["(rien)", "on ne sait pas, et l'écran ne l'invente pas"]
    ]),
    dit("**Il est vérifié lui aussi** : chaque conclusion écrite doit tenir la "
      + "promesse. Une fonction qui annonce `rend: kN` et conclut `\"3e famille "
      + "B\"` est refusée avant le lancement — une déclaration qu'on ne vérifie "
      + "pas est une intention."),
    dit("Une conclusion qui **nomme un `calcule`** ne se compare pas : sa valeur "
      + "dépend de vos réponses, et on ne la connaît qu'au lancement.")
  ]),

  section("catalogue", "Retrouver ce qu'on peut nommer", [
    dit("**Composer, c'est nommer ce qu'une autre fonction conclut** — et l'on "
      + "ne compose pas avec ce qu'on ne sait pas nommer. L'écran d'écriture "
      + "répond donc à cette question-là, à deux moments."),
    dit("**Pendant que vous écrivez**, une liste se déplie sous le curseur dès "
      + "qu'un nom est attendu : après `si (`, après un `=`, dans un `calcule`. "
      + "Les noms de votre brouillon passent en premier — ce sont eux qu'on "
      + "oublie —, puis les mots et les fonctions du langage. ↑ ↓ pour choisir, "
      + "Entrée pour poser, Échap pour refermer."),
    dit("**Quand vous cherchez sans savoir quoi**, le menu « … » de la ligne du "
      + "titre ouvre « Ce que je peux nommer… » : le même contenu, en panneau "
      + "qu'on parcourt rayon par rayon, avec une recherche. On y cherche par un "
      + "mot qu'on a en tête — « TVA », « portée » —, et il peut être dans ce "
      + "que l'entrée dit ou dans ce qu'elle lit."),
    dit("**Les deux lisent la même liste.** Deux réponses finiraient par "
      + "différer, et c'est la pire des divergences : celle où l'écran propose "
      + "un nom que le parcours ne montre pas."),
    dit("**Ce qu'on y trouve** : ce que les fonctions de votre brouillon "
      + "concluent, ce que vos `calcule` posent au-dessus du curseur, les noms "
      + "déclarés du projet avec leurs valeurs possibles, les fonctions du "
      + "langage, et ce que votre établi contient."),
    dit("**Un nom de l'établi se voit et ne se propose pas** : il vit dans un "
      + "autre brouillon, et il faut le **reprendre** pour s'en servir. Le taire "
      + "ferait écrire une fonction qui lit un nom que personne ne conclut, et "
      + "la règle resterait indécidable."),
    dit("**Une fonction ne se propose jamais à elle-même.** La nommer dans son "
      + "propre corps est une circularité : elle resterait indécidable, ou pire, "
      + "elle lirait ce que le projet tenait d'une version précédente d'elle-même. "
      + "La locale qui porte son nom, elle, reste offerte — c'est ainsi qu'elle "
      + "conclut."),
    dit("**Une fonction déjà versée dans la mémoire du projet s'y trouve aussi**, "
      + "au rayon « Versé dans la mémoire du projet ». Nommez-la comme n'importe "
      + "quel nom : il n'y a rien à importer, et surtout pas un `importe (fonction: …)` "
      + "— cette ligne n'existe pas. L'essai la **rejoue** sur les réponses que "
      + "vous donnez, et le formulaire vous demande ce qu'elle lit plutôt que ce "
      + "qu'elle conclut."),
    dit("C'est la différence avec l'établi : un utilitaire de l'établi se "
      + "parcourt et ne se propose pas, parce qu'il vit dans un autre brouillon. "
      + "Une fonction versée, elle, conclut dans **ce** projet.")
  ]),

  section("corriger", "Corriger une fonction déjà versée", [
    dit("**Une fonction versée se reprend, elle ne se récrit pas.** Vous avez "
      + "signé « Couleur des volets », et vous voulez lui ajouter ce qu'elle "
      + "rend. La retaper de mémoire en ferait une seconde du même nom : le "
      + "projet en tiendrait deux, et la plus ancienne continuerait de répondre "
      + "quelque part."),
    dit("**Le chemin** : menu « … » de la ligne du titre, puis « Reprendre une "
      + "fonction du projet… ». Le panneau liste ce que le projet a signé — le "
      + "nom, la phrase qui dit à quoi elle sert, ce qu'elle lit et ce qu'elle "
      + "rend. Cliquez : son texte entier revient dans `essai.ref`, tel qu'il "
      + "se relit."),
    dit("**Corrigez, puis reproposez.** C'est le chemin de tout le monde — une "
      + "proposition relue ligne à ligne, puis signée. Rien n'est modifié en "
      + "place, et tant que vous n'avez pas signé, c'est l'ancienne version qui "
      + "vaut. Une fois signée, la nouvelle remplace l'ancienne : même nom, même "
      + "portée, la dernière fait foi. L'ancienne reste lisible dans l'origine "
      + "de la ligne — c'est son histoire, pas une seconde vérité."),
    code("fonction Couleur des volets(zones, Matériau) {",
      "   // La couleur imposée par le fournisseur, selon la matière.",
      "   rend: \"gris\" ou \"blanc\"",
      "",
      "   selon (Matériau)",
      "      | bois | gris |",
      "      | pvc  | blanc |",
      "}"),
    dit("**Le premier commentaire revient avec elle**, parce que c'est lui qui "
      + "dit à quoi elle sert. Les suivants aussi : ils expliquent pourquoi telle "
      + "condition existe, et c'est à côté d'elle qu'ils ont un sens."),
    dit("**Ce qui ne revient pas** : les déclarations des noms qu'elle lit. "
      + "Elles vivent dans `variables-du-projet.ref`, pas dans la fonction. "
      + "Vous verrez donc « nom jamais déclaré » dans le volet des remarques — "
      + "elles ne bloquent rien, et l'essai tourne quand même.")
  ]),

  section("pas-dappel", "Il n'y a pas d'appel de fonction", [
    dit("**C'est la faute que tout le monde commet**, et elle vient d'ailleurs : "
      + "tous les autres langages écrivent `Couleur des volets(Matériau)`. Ici, "
      + "non. Une fonction ne **prend** rien : elle **lit** les noms qui "
      + "existent autour d'elle."),
    code("// FAUX — il n'y a pas d'appel, et aucune parenthèse après un nom",
      "calcule x = Couleur des volets(Matériau);",
      "",
      "// JUSTE — on la nomme, comme n'importe quel nom",
      "calcule x = Couleur des volets;"),
    dit("**Seules sept fonctions prennent des parenthèses**, et ce sont celles du "
      + "langage : `racine`, `abs`, `arrondi`, `plafond`, `plancher`, `min`, "
      + "`max`. Tout le reste est un nom, et un nom se nomme seul."),
    dit("**La conséquence, qui surprend au début** : on ne peut pas lui donner un "
      + "autre nom que celui qu'elle lit. Si « Couleur des volets » lit "
      + "« Nature des volets », c'est « Nature des volets » qui doit exister — "
      + "la déclarer, ou l'écrire dans le formulaire de l'essai. Lui passer "
      + "« Matériau » à la place n'a pas de forme, parce que cela n'a pas de sens : "
      + "la fonction dit elle-même ce qu'elle lit, une fois, dans sa signature."),
    dit("**C'est voulu.** Une fonction qui prend des arguments s'appelle depuis "
      + "dix endroits avec dix valeurs différentes, et l'on ne sait plus laquelle "
      + "le projet tient pour vraie. Ici, un nom vaut une chose à la fois, et "
      + "c'est tout ce qu'il y a à relire."),
    dit("Le volet des remarques le dit maintenant en toutes lettres, avec la "
      + "ligne qu'il fallait écrire — dans un `calcule`, dans un `si (…)`, ou "
      + "seule sur sa ligne.")
  ]),

  section("chainage", "Une fonction lit ce qu'une autre conclut", [
    dit("**Il n'y a pas d'appel de fonction dans Mdall.** `calcule taux = Taux de TVA(…)` "
      + "ne se lit pas, et n'existera pas : un langage où une fonction en appelle une autre "
      + "demande une pile, un ordre d'exécution et des cas d'arrêt — trois choses qu'on ne "
      + "relit pas dix-huit mois plus tard."),
    dit("Une fonction conclut **sous son propre nom**, et les autres la lisent comme "
      + "n'importe quel nom du projet. C'est déjà ce que fait la mémoire : la conclusion "
      + "d'une règle y est versée comme valeur de son sujet, et les règles suivantes la "
      + "relisent. Découpez donc en deux, et lisez la première dans la seconde."),
    code(
      "fonction Taux de TVA(zones, Type de TVA) {",
      "   // Le taux applicable, selon le type de travaux.",
      "   importe (variable: Type de TVA, depuis: variables-du-projet.ref, zones: zones);",
      '   si (Type de TVA = "existant")',
      "   alors (5 %);",
      "   sinon (20 %);",
      "}",
      "",
      "fonction Prix TTC(zones, Prix HT, Taux de TVA) {",
      "   // Le prix toutes taxes, au taux conclu plus haut.",
      "   importe (variable: Prix HT, depuis: variables-du-projet.ref, zones: zones);",
      "   importe (variable: Taux de TVA, depuis: essai.ref, zones: zones);",
      "   calcule TVA = Prix HT * Taux de TVA;",
      "   calcule Prix TTC = Prix HT + TVA;",
      "   si (Prix HT >= 0 €)",
      "   alors (Prix TTC);",
      "}"
    ),
    dit("Pour 120 € en neuf, le bac conclut **24 €** de TVA et **144 €** au total — et "
      + "il ne demande que deux choses : le prix, et le type de travaux."),
    dit("**C'est cela qui décide de ce qu'on vous demande.** Le formulaire du bac d'essai "
      + "n'est écrit nulle part : un nom qu'une fonction lit sans qu'aucune ne le conclut "
      + "devient un champ ; un nom qu'une fonction conclut se lit, et ne se demande pas. "
      + "Si le bac vous réclame une valeur que vous pensiez déduite, c'est qu'**aucune "
      + "fonction ne la conclut** — la règle manque, ou son nom ne s'écrit pas pareil des "
      + "deux côtés."),
    liste(
      "le nom lu paraît dans la **signature** et dans un `importe`, dont le `depuis:` est "
        + "le fichier où vit la fonction qui le conclut ;",
      "**ne déclarez pas** avec `const` un nom qu'une fonction conclut : `const` est pour "
        + "les entrées, et déclarer une conclusion en ferait une question ;",
      "un pourcentage conclu se lit comme un pourcentage écrit : `alors (20 %)` puis "
        + "`Prix HT * Taux de TVA` donne bien un cinquième du prix ;",
      "une chaîne circulaire ne tourne pas : le bac s'arrête et dit qu'il ne sait pas."
    ),
    dit("Rien ne se demande non plus pour **montrer** : le bac montre toutes les "
      + "conclusions et toutes les étapes de `calcule`, avec leur trace. Il n'y a pas de "
      + "verbe d'affichage à écrire, et il n'y en aura pas."),
    dit("**Et pour savoir ce qu'on peut nommer, on n'a rien à retenir.** Le menu de "
      + "l'écran d'écriture ouvre « Ce que je peux nommer » : ce que ce brouillon déclare, "
      + "conclut et pose, les fonctions du langage, et ce que votre établi garde — avec, "
      + "pour chaque fonction, **ce qu'elle lit**. Un clic pose le nom là où vous écriviez. "
      + "On ne compose pas avec ce qu'on ne sait pas nommer.")
  ]),

  section("exemple-vent", "Un exemple entier : la zone de vent", [
    dit("Deux fichiers, et le raisonnement tient. D'abord le nom, déclaré une fois "
      + "dans `variables-du-projet.ref` :"),
    code(
      "const Zone de vent = {",
      "   type: \"texte\",",
      "   valeurs possibles: \"1\" ou \"2\" ou \"3\" ou \"4\",",
      "   description: \"Zone de vent de la commune.\",",
      "};"
    ),
    dit("Puis la donnée, dans un `.ddb`, avec d'où elle vient :"),
    code(
      "Zone de vent = \"3\"",
      "   document: arrêté préfectoral du 3 mars 2026",
      "   statut: retenu"
    ),
    dit("Et la règle, dans un `.ref` :"),
    code(
      "fonction Vitesse de référence(zones, Zone de vent) {",
      "   importe (variable: Zone de vent, depuis: vent.ddb, zones: zones);",
      "   soit texte = \"NF EN 1991-1-4, annexe nationale\";",
      "   si (Zone de vent = \"3\")",
      "   alors (",
      "      enregistre (",
      "         Vitesse de référence: \"120 km/h\",",
      "         dans: vent.ctr,",
      "         zones: zones",
      "      )",
      "   );",
      "   sinon (\"100 km/h\");",
      "}"
    ),
    dit("L'écran déduit le formulaire de la déclaration : une liste déroulante à "
      + "quatre choix. On lance, la règle conclut, et elle montre ce qu'elle a lu "
      + "pour le conclure. Rien n'est écrit dans le projet : `enregistre` dit **où "
      + "cela irait**, et n'y va pas.")
  ]),

  section("exemple-tva", "Un exemple entier : la TVA", [
    dit("« Je veux une zone de saisie où l'on renseigne un prix, puis un calcul de "
      + "TVA à 20 %, on affiche le résultat du calcul en euros. »"),
    dit("Le nom d'abord, déclaré dans `variables-du-projet.ref` :"),
    code(
      "const Prix HT = {",
      "   type: \"mesure\",",
      "   unité: \"€\",",
      "   description: \"Prix hors taxes saisi par l'utilisateur.\",",
      "};"
    ),
    dit("Puis la règle :"),
    code(
      "fonction Prix TTC(zones, Prix HT) {",
      "   // Le prix toutes taxes, au taux normal.",
      "   importe (variable: Prix HT, depuis: prix.ddb, zones: zones);",
      "   calcule TVA = Prix HT * 20%;",
      "   calcule Prix TTC = Prix HT + TVA;",
      "   si (Prix HT >= 0 €)",
      "   alors (Prix TTC);",
      "   sinon (\"rien à facturer\");",
      "}"
    ),
    dit("Pour 1 200 € hors taxes, le bac d'essai conclut **1 440 €**, et montre les "
      + "deux étapes : `TVA = 240 €`, puis `Prix TTC = 1440 €`. Une règle qui rend "
      + "un nombre sans montrer d'où il vient n'apprend rien — c'est ce qu'on "
      + "refuse à un agent, et on ne l'accepte pas davantage d'un calcul écrit.")
  ]),

  section("exemple-inondable", "Un exemple entier : la zone inondable", [
    dit("« Si la situation du projet est en zone inondable, le plancher bas du "
      + "niveau le plus bas doit être 1 m au-dessus du niveau du sol. »"),
    code(
      "fonction Cote du plancher bas(zones, Zone inondable, Niveau du sol) {",
      "   importe (variable: Zone inondable, depuis: site.ddb, zones: zones);",
      "   importe (variable: Niveau du sol, depuis: site.ddb, zones: zones);",
      "   calcule Cote imposée = Niveau du sol + 1 m;",
      "   si (Zone inondable = \"oui\")",
      "   alors (Cote imposée);",
      "   sinon (\"sans exigence\");",
      "}"
    ),
    dit("Pour un sol à 108,2 m, la règle conclut **109,2 m** — un nombre qu'on peut "
      + "comparer à la cote du plan, et non une phrase qu'il faudrait relire."),
    dit("Remarquez ce que la phrase française ne disait pas, et que le Mdall oblige "
      + "à dire : **d'où vient** l'information « zone inondable », **où va** la "
      + "conclusion, et ce qui se passe **hors** zone inondable. Un raisonnement "
      + "qu'on écrit se révèle toujours plus précis que celui qu'on croyait avoir.")
  ]),

  section("editeur", "Écrire sans connaître la grammaire par cœur", [
    dit("Tout ce qui précède se tape à la main, et rien n'oblige à s'en souvenir : "
      + "dans « Écrire du Mdall », **une liste se déplie sous le curseur** dès les "
      + "premières lettres d'un mot. Trois suffisent — `fonc` propose `fonction` — et "
      + "la liste dit de chaque proposition ce qu'elle est : un mot du langage, un nom "
      + "du projet, une valeur possible, un fichier."),
    dit("Ce qu'elle propose dépend de **l'endroit de la ligne**, et non de ce que vous "
      + "avez tapé la veille :"),
    liste(
      "en début de ligne, les mots qui peuvent l'ouvrir — `fonction`, `soit`, "
        + "`calcule`, `si`, `alors`, `enregistre` ;",
      "après une parenthèse ou un opérateur, les **noms** que le projet déclare et "
        + "ceux que le brouillon vient de poser avec `calcule` ;",
      "après un `=`, les **valeurs possibles** du nom comparé, quand il en déclare ;",
      "après `importe` ou `enregistre`, les **fichiers** du brouillon."
    ),
    dit("Rien ne s'écrit sans que vous l'ayez choisi : la liste propose, elle ne "
      + "complète pas d'elle-même. Et si elle ne se montre pas — parce qu'aucun mot "
      + "n'est commencé —, **Ctrl+Espace** la demande."),
    table(["Touche", "Ce qu'elle fait"], [
      ["↑ ↓", "choisir dans la liste"],
      ["Entrée", "poser la proposition choisie"],
      ["Échap", "refermer la liste, et garder ce qui est tapé"],
      ["Ctrl+Espace", "demander la liste, même sans avoir rien commencé"],
      ["Tab", "poser un cran de retrait — trois espaces, ceux du langage"],
      ["Maj+Tab", "retirer un cran"]
    ]),
    dit("**Les touches de la liste ne sont prises que lorsqu'elle est ouverte.** Les "
      + "flèches déplacent le curseur le reste du temps, et Tab pose toujours un "
      + "retrait : la liste se referme et laisse passer la touche, faute de quoi un "
      + "second Tab poserait un mot au lieu du second cran qu'on venait chercher."),
    dit("Deux choses se dessinent en plus du texte, et ne s'écrivent pas : les "
      + "**couleurs**, qui distinguent un mot du langage d'un nom du projet, et les "
      + "**filets verticaux** qui relient une parenthèse ou une accolade à celle qui "
      + "la ferme. Ce sont les mêmes que dans la Mémoire : un brouillon se lit comme "
      + "un fichier du projet, et non comme du texte dans une zone grise."),
    dit("Le bac d'essai, lui, se rejoue **à chaque réponse** : on change un nombre, "
      + "et le verdict se réécrit sous le formulaire sans qu'il faille relancer. Rien "
      + "n'y est écrit dans le projet — un `enregistre` dit où irait la conclusion, "
      + "et n'y va pas.")
  ]),

  section("essayer", "Trois exemples à essayer, et ce qu'on doit voir", [
    dit("Copiez-les dans **Écrire du Mdall**, répondez au formulaire, et "
      + "comparez. Si ce que vous voyez ne correspond pas à ce qui est écrit "
      + "ici, c'est un défaut — et le dire est plus utile que de s'en "
      + "accommoder."),

    dit("**1. Un tableau, deux grandeurs, et les quatre façons de le regarder.**"),
    code(
      "fonction Descente de charge(zones, Charge par niveau) {",
      "   // Ce qui arrive en pied de poteau, niveau par niveau.",
      "   se lit en: barres",
      "",
      "   pour chaque Niveau de 1 à 6 par pas de 1",
      "      calcule Charge cumulée = Charge par niveau * Niveau;",
      "      calcule Hauteur atteinte = Niveau * 2,8 m;",
      "",
      "   calcule Charge en pied = le plus grand de Charge cumulée;",
      "   si (Charge en pied > 0 kN)",
      "   alors (Charge en pied);",
      "}"
    ),
    dit("Répondez **12 kN**. La fonction conclut **72 kN**."),
    liste(
      "**Quatre boutons** — tableau, courbe, barres, nuage — et « barres » "
        + "pressé : c'est `se lit en:` qui décide de ce qui s'ouvre.",
      "**Deux cadres empilés**, « Charge cumulée · une force » et « Hauteur "
        + "atteinte · une longueur », séparés d'un pointillé. Ils ne se "
        + "croisent jamais, et l'abscisse **1 → 6** ne s'écrit qu'une fois, "
        + "sous le second.",
      "Sous eux, la phrase qui dit pourquoi il y a deux cadres.",
      "**Nuage** ouvre une ligne « contre » : choisissez une colonne, les "
        + "points ne sont pas reliés, et chacun dit au survol de quel niveau "
        + "il vient.",
      "**Tableau** rend les six lignes, et le dessin disparaît : on choisit, "
        + "on ne montre pas les deux."
    ),

    dit("**2. Un abaque, et ce qu'il refuse.**"),
    code(
      "courbe Coefficient de forme(zones, Pente du versant) {",
      "   // NF EN 1991-1-3, figure 5.1 — toiture à un versant.",
      "   texte: NF EN 1991-1-3, annexe nationale",
      "   entre les points: linéaire",
      "   hors bornes: refuse",
      "   |  0° | 0,8 |",
      "   | 30° | 0,8 |",
      "   | 60° | 0   |",
      "}"
    ),
    dit("Répondez **45°**. La courbe conclut **0,4**."),
    liste(
      "Un palier de 0° à 30°, puis une descente jusqu'à 60°.",
      "Un **rond** posé entre 30° et 60°, et la phrase « lu entre 30° et 60° ».",
      "Les **deux lignes encadrantes surlignées** dans la table des points.",
      "Répondez **75°** : elle **refuse**. C'est `hors bornes: refuse`, et "
        + "c'est la faute la plus chère qu'un abaque évite — un nombre "
        + "plausible qui ne vient d'aucun texte."
    ),

    dit("**3. Une fonction qui en lit une autre, et un pourcentage.**"),
    code(
      "fonction Taux de TVA(zones, Type de travaux) {",
      "   // Le taux applicable, selon la nature des travaux.",
      "   selon (Type de travaux)",
      "   | rénovation   | 10% |",
      "   | construction | 20% |",
      "}",
      "",
      "fonction Prix TTC(zones, Prix HT, Taux de TVA) {",
      "   // Il n'y a pas d'appel : on nomme ce qu'une autre fonction conclut.",
      "   calcule TVA = Prix HT * Taux de TVA;",
      "   calcule Prix TTC = Prix HT + TVA;",
      "   si (Prix TTC > 0 €)",
      "   alors (Prix TTC);",
      "}"
    ),
    dit("Répondez **rénovation** et **1000 €**. Vous devez lire **1100 €** — et "
      + "**1200 €** en construction."),
    liste(
      "Le formulaire ne demande que « Type de travaux » et « Prix HT » : il a "
        + "compris que le taux se déduit.",
      "`Taux de TVA` conclut **10%**, avec son signe : un barème conclut ce "
        + "qui est écrit, unité comprise.",
      "Aucune parenthèse nulle part : `Taux de TVA` se **nomme**."
    )
  ]),

  section("limites", "Ce que le langage ne sait pas écrire", [
    dit("Une documentation qui ne dit que ce qui marche apprend à se méfier d'elle."),
    liste(
      "**Pas de boucle**, et pas de liste à parcourir : une moyenne sur trente "
        + "poteaux ne s'écrit pas ;",
      "**pas de condition imbriquée** : une branche ne contient pas une autre "
        + "branche. Les cas s'enchaînent à plat, avec `sinon si` — ou en barème, "
        + "avec `selon` ;",
      "**pas de fonction que vous définissez** : les sept sont celles-là ;",
      "**une conclusion ne nomme que ce que sa fonction a calculé** — `alors "
        + "(Niveau du sol)` rend le texte « Niveau du sol ». Pour conclure avec la "
        + "valeur d'un nom du projet, on la pose : `calcule Cote = Niveau du sol;`. "
        + "Sinon un fichier changerait de sens le jour où quelqu'un verse une "
        + "valeur pour ce sujet."
    ),
    dit("Une loi qui ne s'écrit ni en conditions ni en calculs est un **agent** : "
      + "elle s'appelle, sa loi n'est pas dans le fichier, et ce qu'elle rend se "
      + "conserve. C'est la frontière, et elle est franche.")
  ]),

  section("commentaire", "Les commentaires, et le reste", [
    dit("Un commentaire commence par `//` et vit **dans** la fonction, au plus près de "
      + "la ligne qu'il explique."),
    liste(
      "`parce que:` cite la preuve — un article, une phrase d'un règlement ;",
      "`écarté:` garde ce qu'une décision a laissé de côté, et pourquoi ;",
      "`zone` limite un bloc à une partie du projet ; sans lui, il vaut partout ;",
      "`le:` date un constat."
    ),
    dit("Ce qui n'est pas écrit n'existe pas dans la mémoire. Ce qui y est écrit se "
      + "relit, se compare et se rejoue — et c'est tout ce que la langue promet.")
  ])
];

/** Les sections, par leur nom, pour le sommaire. */
export function sommaireDuWiki() {
  return WIKI_DU_LANGAGE.map(({ id, titre }) => ({ id, titre }));
}

/** Tout le Mdall que le wiki montre : de quoi l'éprouver d'un coup. */
export function exemplesDuWiki() {
  return WIKI_DU_LANGAGE.flatMap((une) =>
    une.blocs.filter((bloc) => bloc.quoi === "code").map((bloc) => ({ section: une.id, code: bloc.code })));
}
