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
      + "calculer. Une expression se lit ainsi :"),
    table(["l'expression", "ce qu'elle rend"], [
      ["`Prix HT * 20%`", "`240 €`, si le prix vaut 1 200 €"],
      ["`Prix HT + Prix HT * 20%`", "`1440 €`"],
      ["`racine(Largeur ^ 2 + Longueur ^ 2)`", "la diagonale, en mètres"],
      ["`arrondi(Niveau du sol + 1 m ; 2)`", "la cote, à deux décimales"]
    ]),
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

  section("limites", "Ce que le langage ne sait pas encore écrire", [
    dit("Une documentation qui ne dit que ce qui marche apprend à se méfier d'elle. "
      + "Voici, mot pour mot, deux phrases qu'on aimerait écrire et ce que le "
      + "langage en fait aujourd'hui."),
    dit("**« Un prix, puis un calcul de TVA à 20 %, on affiche le résultat en "
      + "euros. »** Les deux noms se déclarent, la donnée s'écrit, et le calcul "
      + "`Prix HT * 20%` se lit et se vérifie. Ce qui manque est le **mot** qui le "
      + "porte dans une règle : `soit` est pris — il déclare une provenance —, et "
      + "un `alors` ne reçoit aujourd'hui qu'une valeur écrite, non une expression."),
    dit("**« Si la situation du projet est en zone inondable, le plancher bas du "
      + "niveau le plus bas doit être 1 m au-dessus du niveau du sol. »** La "
      + "condition s'écrit sans peine ; la conclusion `Niveau du sol + 1 m` se "
      + "calcule, mais ne se pose pas encore dans le `alors`."),
    code(
      "fonction Plancher bas surélevé(zones, Zone inondable) {",
      "   importe (variable: Zone inondable, depuis: site.ddb, zones: zones);",
      "   si (Zone inondable = \"oui\")",
      "   alors (\"1 m au-dessus du niveau du sol\");",
      "   sinon (\"sans exigence\");",
      "}"
    ),
    dit("Écrit ainsi, le projet **retient l'exigence** et sait la retrouver — mais "
      + "la cote reste une phrase, et non un nombre qu'on peut comparer à celle du "
      + "plan. C'est exactement ce que le branchement du calcul viendra changer."),
    dit("Remarquez au passage ce que la phrase française ne disait pas, et que le "
      + "Mdall oblige à dire : **d'où vient** l'information « zone inondable », **où "
      + "va** la conclusion, et ce qui se passe **hors** zone inondable. Un "
      + "raisonnement qu'on écrit se révèle toujours plus précis que celui qu'on "
      + "croyait avoir.")
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
