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
    dit("`sauf si` borne la règle — une exception qui reprend la main sur la "
      + "conclusion :"),
    code(
      "fonction Famille du bâtiment(zones, Hauteur du plancher bas) {",
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
    dit("**Les unités se composent, ou se refusent.** Il n'y a pas de troisième issue :"),
    table(["ce qu'on écrit", "ce qu'on obtient"], [
      ["`3 m + 2 m`", "`5 m`"],
      ["`3 m + 2`", "refus — ces deux unités ne se composent pas"],
      ["`3 m * 2 m`", "`6 m²`"],
      ["`6 m² / 2 m`", "`3 m`"],
      ["`2 m * 3 €`", "refus — personne n'a demandé des mètres-euros"],
      ["`10 / 0`", "refus — on ne divise pas par zéro"]
    ]),
    dit("Et un nom sans valeur reste **indécidable**, jamais zéro. Une altitude à zéro "
      + "se calcule sans broncher jusqu'à une cote de fondation fausse.")
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
      + "verbe d'affichage à écrire, et il n'y en aura pas.")
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

  section("limites", "Ce que le langage ne sait pas écrire", [
    dit("Une documentation qui ne dit que ce qui marche apprend à se méfier d'elle."),
    liste(
      "**Pas de boucle**, et pas de liste à parcourir : une moyenne sur trente "
        + "poteaux ne s'écrit pas ;",
      "**pas de condition imbriquée** : `si` … `alors` … et c'est tout. Une "
        + "arborescence de décisions se découpe en plusieurs fonctions ;",
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
