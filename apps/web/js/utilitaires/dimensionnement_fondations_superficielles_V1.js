/**
 * Le pré-dimensionnement des fondations superficielles, déclaré — jamais écrit.
 *
 * ## Ce fichier ne calcule rien, et c'est le sujet
 *
 * Les autres utilitaires du catalogue disent ce qu'ils lisent **et** comment ils
 * concluent : `deduire(fait)` reprend la valeur du serveur et la met en forme,
 * et le `.ref` versé porte les conditions de l'arrêté. C'est possible parce que
 * leur loi est publique — un décret, une table du DTU, un zonage. L'écrire est
 * ce qui rend la mémoire vérifiable.
 *
 * Celui-ci n'est pas de cette famille. Descente de charge, combinaisons
 * pondérées, portance, glissement, renversement, ferraillage : la loi **est** le
 * produit. L'écrire dans le fichier d'un projet reviendrait à la donner, et un
 * projet exporté la donnerait à qui l'ouvre.
 *
 * On ne peut pas non plus le taire. Une fois employé, il a décidé de cotes que
 * le client paiera en béton ; les cacher ferait de la moitié du raisonnement un
 * trou, et « ne pas savoir n'autorise pas à prétendre qu'il n'y a rien ».
 *
 * D'où sa forme : une **fonction native du langage** (voir
 * `docs/fondamentaux.md`, règle 9). Ce fichier déclare son nom, sa version, ce
 * qu'elle lit et ce qu'elle écrit. Le calcul, lui, vit dans
 * `supabase/functions/fondations-stabilite-externe`, et n'en descend pas.
 *
 * ## Pourquoi elle lit la profondeur hors gel
 *
 * C'est la seule entrée du projet qui **commande** une cote. Le NF DTU 13.1
 * impose que l'assise descende au moins à cette profondeur ; au-dessus, le sol
 * gèle sous la semelle et la soulève, et aucun des calculs de stabilité ne le
 * verrait. Elle était jusqu'ici lue pour **alerter** — l'écran disait « l'assise
 * est trop haute » et attendait qu'on corrige à la main. La déclarer comme
 * entrée est ce qui referme la chaîne : l'altitude du projet change, la
 * profondeur hors gel se recalcule, et les fondations avec elle.
 */

import { DOMAIN } from "../services/assertion-taxonomy.js";
import { SENS, COMPARAISON } from "../services/tableau-structure.js";
import { PRODUIT, LOI } from "./vocabulaire.js";

/** Le sujet du projet qui commande l'assise. Il est nommé une fois, ici. */
export const SUJET_HORS_GEL = "Profondeur hors gel";

/**
 * Le tableau des massifs à dimensionner, tel que le projet le porte.
 *
 * ## Pourquoi il entre dans la mémoire
 *
 * C'est ce qui rend la reprise possible. Tant que les massifs vivaient dans
 * l'étude privée de l'Atelier, changer l'altitude du projet ne pouvait que
 * **marquer** les fondations à refaire : rien de ce qu'il fallait pour les
 * refaire n'était accessible. Le calcul est au serveur, ses entrées sont au
 * projet, et c'est ainsi qu'un appel se rejoue.
 *
 * Il entre donc comme n'importe quelle donnée de base — par une proposition que
 * quelqu'un signe —, et il devient visible de l'équipe. C'est le prix, et c'est
 * le bon : une cote que personne ne peut relire n'est pas une cote du projet.
 */
export const SUJET_DONNEES = "Données d'entrée des fondations superficielles";

/** Ce que l'appel rend, et range. Un seul nom, pour un tableau entier. */
export const SUJET_RESULTAT = "Résultat du calcul des fondations superficielles";

/**
 * La forme d'une ligne du tableau d'entrée.
 *
 * ## Pourquoi la déclarer
 *
 * « type: tableau » ne dit rien. Une fonction qui attend « les données d'entrée
 * des fondations superficielles » ne s'appelle pas tant qu'on ignore ce qu'il
 * faut mettre dans une ligne — et personne n'ira lire le code du serveur pour
 * le savoir.
 *
 * Elle dit la **forme**, jamais la loi : savoir qu'un massif porte un angle de
 * frottement n'apprend rien de la façon dont la portance s'en déduit.
 */
/**
 * Le cas de charge d'une combinaison, tel qu'on le fait varier.
 *
 * **L'effort vertical, et lui seul.** Onze cas par cinq composantes feraient
 * cinquante-cinq champs, et « le moment My du séisme vertical » n'est pas une
 * question qu'un concepteur se pose devant une variante. Celle qu'il se pose est
 * « et si la neige montait de trente pour cent » : c'est un effort vertical, et
 * c'est ce qu'on offre. Les efforts horizontaux et les moments restent une
 * saisie de l'Atelier, où ils se lisent en face de leur schéma.
 */
const casDeCharge = (code, nom, quoi) => ({
  nom, cle: `entrees.charges.${code}.V`, type: "nombre",
  quoi: `${quoi} Effort vertical du cas ${code}, dans l'unité d'efforts choisie pour la ligne.`
});

/** Une nappe d'armatures : combien de barres, et de quel diamètre. */
const nappe = (code, nom, ou) => ([
  { nom: `${nom} — nombre de barres`, cle: `entrees.ferraillage.${code}.nombre`, type: "nombre",
    quoi: `Combien de barres l'ingénieur propose ${ou}. C'est une proposition, pas un `
      + `résultat : l'agent dit ce qu'elle vaut face à ce que le calcul exige, il ne la choisit pas.` },
  { nom: `${nom} — diamètre`, cle: `entrees.ferraillage.${code}.barre`,
    valeurs: ["HA6", "HA8", "HA10", "HA12", "HA14", "HA16", "HA20", "HA25", "HA32", "HA40"],
    quoi: `Le diamètre des barres ${ou}. Passer au diamètre au-dessus met plus d'acier `
      + `avec le même nombre de barres, et libère de la place entre elles.` }
]);

export const STRUCTURE_DES_ENTREES = [
  { nom: "désignation", type: "texte" },
  { nom: "nombre de massifs", type: "nombre" },

  { nom: "hypothèses réglementaires", champs: [
    { nom: "règlement", cle: "entrees.reglement",
      valeurs: ["Fascicule 62", "DTU 13.12", "EC - NF P94-261", "EC8-5 Annexe F"],
      quoi: "La règle du jeu. Les trois premiers vérifient la portance courante ; « EC8-5 Annexe F » "
        + "est le seul qui vérifie la portance sous séisme, et c'est le seul qui lit les "
        + "hypothèses sismiques plus bas." },
    { nom: "répartition des contraintes", cle: "entrees.repartition",
      valeurs: ["Meyerhoff", "Constante"],
      quoi: "Comment la pression se répartit sous la semelle quand la charge est excentrée. "
        + "Meyerhoff ne compte que la partie du massif réellement comprimée — une semelle "
        + "peut décoller d'un côté. « Constante » suppose une pression uniforme, ce qui est "
        + "plus optimiste." },
    { nom: "drainage", cle: "entrees.drainage",
      valeurs: ["Sol drainé", "Sol non drainé"],
      quoi: "Si l'eau du sol a le temps de s'évacuer sous la charge. Un sol non drainé — une "
        + "argile chargée vite — tient moins bien à court terme." },
    { nom: "inclinaison", cle: "entrees.inclinaison",
      valeurs: ["Sans objet", "Sol cohérent", "Sol frottant"],
      quoi: "Une charge inclinée appuie moins bien qu'une charge verticale, et le calcul en "
        + "tient compte différemment selon la nature du sol. « Sans objet » ne réduit rien." },
    { nom: "unités", cle: "entrees.unites",
      valeurs: ["{ T ; Tm }", "{ kN ; kNm }", "{ daN ; daNm }"],
      quoi: "L'unité dans laquelle toute la ligne est écrite : les charges, les lests et les "
        + "poids volumiques. En changer sans réécrire les valeurs multiplierait la ligne par "
        + "mille, ou la diviserait." }
  ] },

  { nom: "géométrie", champs: [
    { nom: "arase supérieure", cle: "entrees.araseSuperieure", type: "nombre, en m",
      quoi: "La cote du dessus du massif, comptée sous le niveau de référence. C'est elle que la "
        + "profondeur hors gel commande : le massif descend, il ne s'épaissit pas." },
    { nom: "hauteur Lz", cle: "entrees.hauteurLz", type: "nombre, en m",
      quoi: "L'épaisseur du massif, du dessus à l'assise. Elle décide du bras de levier des "
        + "aciers, donc du ferraillage, et elle pèse : un massif plus épais lutte mieux contre "
        + "le soulèvement." },
    { nom: "section Lx", cle: "entrees.sectionLx", type: "nombre, en m",
      quoi: "Le côté du massif dans le sens x. Élargir répartit la charge sur plus de sol : "
        + "c'est le premier remède quand la portance est en défaut." },
    { nom: "section Ly", cle: "entrees.sectionLy", type: "nombre, en m",
      quoi: "Le côté du massif dans le sens y." },
    { nom: "hauteur du fût", cle: "entrees.hauteurFut", type: "nombre, en m",
      quoi: "Le poteau court en béton entre le dessus du massif et le point où la structure "
        + "s'appuie. À zéro, il n'y en a pas : la platine repose directement sur le massif. "
        + "C'est lui qui rattrape la hauteur quand on enterre la semelle, et il pèse." },
    { nom: "côté du fût suivant x", cle: "entrees.futA", type: "nombre, en m",
      quoi: "La largeur du fût dans le sens x. Un fût trop mince pour la charge poinçonne le "
        + "massif ; trop large, il mange de la place et du béton." },
    { nom: "côté du fût suivant y", cle: "entrees.futB", type: "nombre, en m",
      quoi: "La largeur du fût dans le sens y." },
    { nom: "excentrement charge/fût suivant x", cle: "entrees.excentrementChargeX", type: "nombre, en m",
      quoi: "De combien la charge tombe à côté de l'axe du fût, dans le sens x. Une charge "
        + "décalée fait basculer : elle crée un moment que la semelle doit reprendre, et "
        + "c'est souvent ce décalage — plus que la charge elle-même — qui décide sa taille." },
    { nom: "excentrement charge/fût suivant y", cle: "entrees.excentrementChargeY", type: "nombre, en m",
      quoi: "Le même décalage dans le sens y." },
    { nom: "excentrement fût/semelle suivant x", cle: "entrees.excentrementFutX", type: "nombre, en m",
      quoi: "De combien le fût est décalé du centre du massif, dans le sens x. C'est le cas "
        + "classique de la semelle en limite de propriété : on ne peut pas centrer le massif "
        + "sous le poteau, on le décale, et le sol travaille plus d'un côté que de l'autre." },
    { nom: "excentrement fût/semelle suivant y", cle: "entrees.excentrementFutY", type: "nombre, en m",
      quoi: "Le même décalage dans le sens y." }
  ] },

  { nom: "sol et matériaux", champs: [
    { nom: "poids volumique du sol", cle: "entrees.poidsVolumiqueSol", type: "nombre",
      quoi: "Le poids des terres au-dessus du massif, par mètre cube, dans l'unité choisie plus "
        + "haut. Elles lestent la fondation contre le soulèvement, et elles participent à ce "
        + "qui la retient." },
    { nom: "contrainte limite à l'ELS", cle: "entrees.contrainteLimite", type: "nombre",
      quoi: "La pression que le sol accepte en service, sans tasser plus que de raison. C'est "
        + "le chiffre qu'un rapport géotechnique donne, et celui qu'on fait varier pour "
        + "voir ce qu'un sol meilleur ou moins bon changerait au projet." },
    { nom: "angle de frottement", cle: "entrees.angleFrottement", type: "nombre, en degrés",
      quoi: "Ce qui empêche la semelle de glisser sur son assise. Un sable dense frotte bien, "
        + "une argile molle beaucoup moins. Trente degrés est une valeur courante de sable." },
    { nom: "cohésion non drainée", cle: "entrees.cohesionNonDrainee", type: "nombre",
      quoi: "Ce qui fait tenir une argile toute seule, sans compression. Elle ne sert qu'en sol "
        + "non drainé : dans un sable, elle est nulle." },
    { nom: "poids volumique du béton de la semelle", cle: "entrees.densiteSemelle", type: "nombre",
      quoi: "Le poids du béton du massif, par mètre cube, dans l'unité choisie plus haut. Il "
        + "compte deux fois : il charge le sol, et il lest le massif contre le soulèvement." },
    { nom: "poids volumique du béton du fût", cle: "entrees.densiteFut", type: "nombre",
      quoi: "Le même, pour le fût. On les distingue parce qu'un fût peut être coulé autrement — "
        + "ou remplacé par de l'acier." }
  ] },

  { nom: "butée mobilisée", champs: [
    { nom: "part de butée mobilisée", cle: "entrees.buteeMobilisee", type: "nombre, en %",
      quoi: "Ce que les terres devant la semelle retiennent quand elle veut glisser, et "
        + "quelle part on ose en compter. Soixante pour cent est prudent : mobiliser toute la "
        + "butée demanderait que le massif bouge de plusieurs centimètres, ce qu'un bâtiment "
        + "n'accepte pas. La descendre à zéro revient à ne compter que le frottement sous "
        + "l'assise — l'hypothèse la plus sévère, et parfois la seule honnête si une fouille "
        + "peut être rouverte." },
    { nom: "angle de frottement de la butée", cle: "entrees.angleButee", type: "nombre, en degrés",
      quoi: "La qualité des terres de remblai devant la semelle, qui n'est pas forcément celle "
        + "du sol d'assise." },
    { nom: "poids volumique des terres de butée", cle: "entrees.poidsVolumiqueButee", type: "nombre",
      quoi: "Le poids de ces terres-là, dans l'unité choisie plus haut : c'est lui qui donne à "
        + "la butée sa force." },
    { nom: "cote haute de la butée", cle: "entrees.buteeZi", type: "nombre, en m",
      quoi: "À partir d'où l'on croit aux terres. Ce qui est au-dessus ne compte pas : remblai "
        + "récent, tranchée de réseaux, fouille qu'on rouvrira." },
    { nom: "cote basse de la butée", cle: "entrees.buteeZf", type: "nombre, en m",
      quoi: "Jusqu'où l'on y croit — au plus bas, l'assise du massif." }
  ] },

  { nom: "béton armé", champs: [
    { nom: "enrobage de la semelle", cle: "entrees.enrobageSemelle", type: "nombre, en cm",
      quoi: "L'épaisseur de béton qui protège les aciers de la corrosion. Cinq centimètres "
        + "contre la terre. En rajouter protège mieux mais rapproche les aciers du milieu du "
        + "massif, donc réduit leur bras de levier : il en faut alors davantage." },
    { nom: "enrobage du fût", cle: "entrees.enrobageFut", type: "nombre, en cm",
      quoi: "Le même, pour le fût." },
    { nom: "résistance du béton", cle: "entrees.resistanceBeton", type: "nombre, en MPa",
      quoi: "La classe du béton : 25 pour un C25/30 courant. Monter en classe aide surtout au "
        + "poinçonnement et à l'effort tranchant — pas à la portance du sol, qui ne dépend "
        + "que du terrain." },
    { nom: "limite d'élasticité de l'acier", cle: "entrees.limiteAcier", type: "nombre, en MPa",
      quoi: "La nuance des barres : 500 pour du HA courant." },
    { nom: "armatures minimales imposées", cle: "entrees.armaturesMinimales",
      valeurs: ["OUI", "NON"],
      quoi: "Imposer la section minimale d'un tirant, même si le calcul en demande moins. C'est "
        + "une prudence de constructeur : une semelle sans aciers de couture est fragile aux "
        + "aléas de chantier." },
    { nom: "fissuration admise", cle: "entrees.fissuration",
      quoi: "Combien on accepte que le béton se fende en service. Plus on est sévère, plus on "
        + "plafonne la contrainte dans l'acier, donc plus il en faut. Un local humide ou une "
        + "pièce enterrée demande davantage qu'un massif à l'abri." }
  ] },

  { nom: "charges", champs: [
    casDeCharge("G", "permanentes (G)",
      "Le poids de ce qui ne bouge jamais : structure, planchers, revêtements."),
    casDeCharge("Q", "exploitation (Q)",
      "Ce qu'on met dedans : gens, mobilier, stockage."),
    casDeCharge("Sn", "neige (Sn)",
      "La neige, telle que la carte et l'altitude la donnent."),
    casDeCharge("W1", "vent 1 (W1)", "Le vent, première direction étudiée."),
    casDeCharge("W2", "vent 2 (W2)", "Le vent, deuxième direction."),
    casDeCharge("W3", "vent 3 (W3)", "Le vent, troisième direction."),
    casDeCharge("W4", "vent 4 (W4)", "Le vent, quatrième direction."),
    casDeCharge("Sx", "séisme suivant x (Sx)", "Le séisme, secousse horizontale dans le sens x."),
    casDeCharge("Sy", "séisme suivant y (Sy)", "Le séisme, secousse horizontale dans le sens y."),
    casDeCharge("Sz", "séisme vertical (Sz)", "Le séisme, composante verticale."),
    casDeCharge("Fa", "accidentelle (Fa)",
      "Un accident : choc de véhicule, explosion, perte d'un appui. Elle n'entre que dans les "
        + "combinaisons accidentelles, sans coefficient — on la subit telle quelle."),
    { nom: "lest minimal", cle: "entrees.lestMin", type: "nombre",
      quoi: "Le poids qu'on ajoute exprès sur la fondation pour l'empêcher de se soulever, dans "
        + "l'hypothèse la plus défavorable — c'est-à-dire en n'en comptant que le minimum "
        + "garanti. Un hangar léger sous le vent tient souvent par son lest." },
    { nom: "lest maximal", cle: "entrees.lestMax", type: "nombre",
      quoi: "Le même lest, compté au maximum : c'est le cas où il charge le sol au lieu de "
        + "le soulager. Les deux valeurs servent, chacune dans le sens qui la rend défavorable." },
    { nom: "type d'exploitation", cle: "entrees.typeExploitation",
      valeurs: ["Exploitation", "Archives / stockage", "Température"],
      quoi: "Ce que la charge d'exploitation représente vraiment. Un stockage d'archives se "
        + "rétracte moins souvent qu'un bureau : le règlement lui donne des coefficients "
        + "d'accompagnement plus sévères." }
  ] },

  { nom: "ferraillage proposé", champs: [
    ...nappe("AIX", "nappe inférieure axe X", "en bas du massif, dans le sens x"),
    ...nappe("AIY", "nappe inférieure axe Y", "en bas du massif, dans le sens y"),
    ...nappe("ASX", "nappe supérieure axe X", "en haut du massif, dans le sens x"),
    ...nappe("ASY", "nappe supérieure axe Y", "en haut du massif, dans le sens y")
  ] },

  // Ces sept-là ne servent qu'au règlement « EC8-5 Annexe F ». Sous les trois
  // autres, les faire varier ne change rien — et c'est une information : l'écran
  // le montrera en ne recalculant rien.
  { nom: "capacité portante sismique", champs: [
    { nom: "zone sismique", cle: "entrees.zoneSismique", valeurs: ["2", "3", "4", "5"],
      quoi: "La zone du zonage français, de 2 (faible) à 5 (forte). Elle ne se choisit pas : "
        + "elle se lit sur la commune. La faire varier répond à « et si ce projet était "
        + "ailleurs », ou à un zonage révisé." },
    { nom: "catégorie d'importance", cle: "entrees.categorieImportance", valeurs: ["II", "III", "IV"],
      quoi: "Ce que l'on accepte de perdre. II est un bâtiment courant, IV un bâtiment qui doit "
        + "rester debout après le séisme — hôpital, secours, salle de crise. Monter d'une "
        + "catégorie majore l'action sismique de façon très sensible." },
    { nom: "classe de sol EC8", cle: "entrees.typeSolEc8", valeurs: ["A", "B", "C", "D", "E"],
      quoi: "Comment le terrain amplifie la secousse. A est un rocher, D un sol mou qui la "
        + "démultiplie. Deux projets identiques sur A et sur D ne se ferraillent pas pareil." },
    { nom: "catégorie de sol", cle: "entrees.categorieSol", valeurs: ["Sol cohérent", "Sol frottant"],
      quoi: "Argile ou sable, en somme : les deux ne perdent pas leur résistance de la même "
        + "façon sous une secousse répétée." },
    { nom: "sous-catégorie de sol", cle: "entrees.sousCategorieSol",
      valeurs: ["Sable dense", "Sable lâche sec", "Sable lâche saturé", "Argile non sensible", "Argile sensible"],
      quoi: "Le détail qui change tout sous séisme : un sable lâche saturé peut se liquéfier, "
        + "et le calcul lui applique une pénalité bien plus lourde qu'à un sable dense." },
    { nom: "nature du cisaillement", cle: "entrees.natureCisaillement",
      valeurs: ["Cisaillement non drainé", "Cisaillement cyclique"],
      quoi: "Sous quelle forme on mesure la résistance du sol au cisaillement pendant la "
        + "secousse." },
    { nom: "résistance au cisaillement", cle: "entrees.resistanceCisaillement", type: "nombre, en kPa",
      quoi: "La valeur elle-même, celle que l'essai donne." }
  ] }
];

/**
 * La forme d'une ligne du tableau de résultat.
 *
 * Ce que l'appel rend, et donc ce qu'on peut lire de lui sans rouvrir l'Atelier.
 * Le détail du calcul — les trois cent quatre-vingt-huit combinaisons, les
 * ratios intermédiaires — n'en fait pas partie : il se relit dans l'étude, et il
 * ne décide de rien.
 */
export const STRUCTURE_DU_RESULTAT = [
  { nom: "désignation", type: "texte" },
  { nom: "nombre de massifs", type: "nombre" },
  { nom: "section Lx", type: "nombre, en m" },
  { nom: "section Ly", type: "nombre, en m" },
  { nom: "hauteur", type: "nombre, en m" },
  { nom: "arase supérieure", type: "nombre, en m" },
  { nom: "volume de béton", type: "nombre, en m3" },
  // **Le sens, et pas seulement le mot.** « en défaut » ne veut rien dire à un
  // écran : il faut le lui apprendre, ou le laisser neutre. Le lui apprendre par
  // un dictionnaire de mots français serait une machine à deviner, qui se
  // tromperait un jour sans le dire ; c'est donc l'utilitaire qui déclare, une
  // fois, et n'importe quel écran s'en sert. Voir `services/tableau-structure.js`.
  { nom: "vérification", valeurs: [
    { nom: "vérifiée", sens: SENS.TENU },
    { nom: "en défaut", sens: SENS.ROMPU },
    { nom: "non calculée", sens: SENS.INCONNU }
  ] },
  // Sans limite déclarée, « 16,050 » est un nombre sans échelle : on ne sait pas
  // si c'est seize fois trop ou seize fois la marge restante. Le ratio est un
  // taux de travail — il doit rester **au plus** à 1.
  { nom: "ratio déterminant", type: "nombre", marge: { limite: 1, comparaison: COMPARAISON.AU_PLUS } }
];

export const DIMENSIONNEMENT_FONDATIONS_SUPERFICIELLES_V1 = {
  nom: "dimensionnement_fondations_superficielles",
  version: "V1",
  libelle: "Prédimensionnement des fondations superficielles",
  source: "NF P94-261, EN 1997-1, EN 1992-1-1",
  produit: PRODUIT.DIMENSIONNEMENT,
  // Ce qui change tout le reste : la loi ne descend pas.
  loi: LOI.SECRETE,
  domaine: DOMAIN.STRUCTURE,

  /**
   * Ce qu'elle explique d'elle-même, dans le fichier du projet.
   *
   * C'est le commentaire qui ouvrira la fonction. Il dit **ce qu'elle fait**, et
   * s'arrête là où commence le comment : une phrase de plus et l'on aurait
   * commencé à décrire la loi.
   */
  quoi: "Dimensionne les massifs superficiels d'une zone : descente de charge, "
    + "combinaisons, portance du sol, glissement, renversement et ferraillage. "
    + "La loi de calcul appartient à l'agent — elle ne s'écrit pas ici.",

  /**
   * Ce qu'elle lit du projet.
   *
   * Une seule entrée pour l'instant, et elle est déclarée pour la même raison
   * que dans les autres utilitaires : `entree` dit **par quel champ de l'appel**
   * ce sujet entre dans le calcul, donc lequel on peut faire varier. Sans elle,
   * une variante d'altitude s'arrêterait à la profondeur hors gel et les
   * fondations resteraient celles d'avant, sans que rien ne le dise.
   *
   * Les entrées propres à chaque massif — charges, cotes, sol — ne sont pas ici :
   * ce ne sont pas des faits du projet mais la saisie de l'Atelier, et les
   * déclarer ferait attendre à la mémoire des sujets que personne ne verse.
   */
  lit: [
    { sujet: SUJET_HORS_GEL, entree: "profondeurHorsGel", nombre: true, unite: "m" },
    {
      sujet: SUJET_DONNEES,
      entree: "semelles",
      tableau: true,
      quoi: "L'ensemble des données d'entrée nécessaires au calcul de plusieurs massifs "
        + "de fondations superficielles : un massif par ligne, avec sa géométrie, son sol, "
        + "ses charges et les hypothèses réglementaires retenues.",
      utilisation: "Entrée du prédimensionnement des massifs superficiels. C'est ce que le "
        + "projet conserve pour pouvoir refaire le calcul le jour où l'une de ses données "
        + "de base change — l'altitude, donc la profondeur hors gel, par exemple.",
      structure: STRUCTURE_DES_ENTREES
    }
  ],

  /**
   * Ce que l'appel rend, et range.
   *
   * **Un seul nom pour un tableau entier**, et c'est la correction la plus
   * importante de cette version. La première dépliait les sorties : sept sujets
   * par massif, quatre-vingts lignes de cotes dans le fichier de **code**. On
   * n'y lisait plus ni ce que la fonction consommait ni comment l'appeler, et
   * le `.ref` portait les données du projet — ce qu'un `.ctr` existe pour
   * porter.
   */
  rend: {
    sujet: SUJET_RESULTAT,
    quoi: "Le tableau de synthèse du prédimensionnement : un massif par ligne, ses cotes, "
      + "son volume de béton et son verdict, plus le volume total de l'ensemble.",
    utilisation: "Ce que le projet retient des fondations superficielles : les cotes qui "
      + "partent aux plans et au quantitatif, et le volume de béton à commander.",
    structure: STRUCTURE_DU_RESULTAT
  },

  /**
   * Comment se rejouer : le même calcul au serveur, sur les mêmes massifs.
   *
   * Pas de formule recopiée — il n'y en a pas à recopier, c'est tout le propos.
   * Le rejeu redemande, et c'est aussi ce qui garantit qu'une reprise six mois
   * plus tard emploie la loi d'aujourd'hui plutôt qu'une copie de celle d'hier.
   */
  rejeu: { outil: "fondations" }
};
