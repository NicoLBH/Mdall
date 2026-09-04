/**
 * Les utilitaires déterministes, rendus appelables par le copilote.
 *
 * ## Le partage du travail, et pourquoi il tient
 *
 * Un modèle de langage ne calcule pas : il **rédige un calcul plausible**, ce
 * qui est une tout autre chose et beaucoup plus dangereux — un spectre faux au
 * dixième près se relit sans qu'on le voie. Les utilitaires de l'Atelier, eux,
 * calculent : mêmes entrées, mêmes sorties, une version inscrite.
 *
 * Le partage est donc net, et il n'est pas négociable :
 *
 *   le modèle  **choisit** l'outil et **rassemble** ses entrées ;
 *   l'outil    **calcule**, seul, sans que le modèle voie sa mécanique ;
 *   le modèle  **raconte** le résultat, sans le retoucher.
 *
 * Tout ce que le modèle produit entre ces deux bornes est une phrase, jamais un
 * nombre. C'est ce qui permet de répondre « TB = 0,10 s » avec la même
 * assurance que l'écran de l'Atelier : c'est **le même code** qui a répondu.
 *
 * ## Où le calcul a lieu
 *
 * Dans le navigateur, pas dans la fonction serveur. Les utilitaires sont ici,
 * en JavaScript, testés, et affichés par les écrans de l'Atelier. Les porter
 * dans la fonction en ferait une seconde implémentation — et « une valeur
 * écrite à deux endroits finit par diverger ». La fonction orchestre : elle
 * demande au modèle quel outil appeler, rend la demande au navigateur, qui
 * exécute et lui renvoie le résultat.
 *
 * ## Ce qui n'a pas été dit ne se devine pas
 *
 * Une consigne dans le prompt ne suffit pas : à « quelles conséquences si on
 * change la classe de sol ? », le modèle a répondu « si elle passe de B à A… ».
 * Personne n'avait dit A. La réponse était fausse **tout en ayant l'air
 * juste** — un chantier ne la relit pas.
 *
 * Le garde-fou est donc dans le code, pas dans la consigne. **Toute** valeur
 * d'entrée que le modèle fournit doit venir de quelque part, et il n'y a que
 * trois provenances légitimes :
 *
 *   - la mémoire du projet la porte déjà ;
 *   - elle figure dans les mots de l'utilisateur — « passer en catégorie **IV** » ;
 *   - quelqu'un l'a confirmée à l'écran, en cliquant une pastille.
 *
 * En dehors de ces trois-là, le modèle l'a fabriquée, et l'outil ne calcule
 * pas : il demande.
 *
 * **La première version ne surveillait que les remplacements** — une valeur
 * différente de celle de la mémoire. Elle laissait donc passer le cas le plus
 * dangereux : celui où le projet ne sait rien, où il n'y a donc rien à
 * remplacer, et où une valeur inventée entre sans rencontrer personne. C'est
 * exactement là qu'un garde-fou sert.
 *
 * Le doute penche du côté de la question, jamais du calcul — se tromper en
 * demandant coûte un clic, se tromper en calculant coûte une reprise de
 * fondations.
 *
 * ## Ce qui manque ne s'invente pas
 *
 * Un outil dont une entrée requise manque **ne s'exécute pas**. Il rend la
 * liste des champs manquants, et l'écran en fait un formulaire — **construit à
 * partir de la déclaration de l'outil, jamais à partir des mots du modèle**. Un
 * formulaire dicté par le modèle inventerait des champs que le calcul
 * n'attend pas, et l'utilisateur remplirait consciencieusement du vide.
 *
 * Ce que la mémoire du projet sait déjà est pré-rempli : c'est là tout
 * l'intérêt d'un copilote qui a lu la mémoire avant de demander.
 *
 * ## Ce que le résultat n'est pas
 *
 * Il n'entre pas en mémoire. « L'Atelier propose, la Mémoire enregistre — une
 * seule porte. » Un calcul fait au fil d'une conversation est une exploration,
 * pas une décision ; le verser reviendrait à laisser une question devenir une
 * vérité du projet parce que personne n'a dit non.
 *
 * En revanche il **se compare** à ce que le projet tient pour vrai, et l'écart
 * se dit avec le vocabulaire de la maison : un conflit, décrit, sans que la
 * machine désigne le fautif.
 */

import { buildElasticResponseSpectrumTable, getSeismicSizingValues } from "./seismic-spectrum.js";
import { currentAssertions } from "./project-memory.js";

function texte(valeur) {
  return String(valeur ?? "").trim();
}

function nombre(valeur) {
  if (valeur === null || valeur === undefined || texte(valeur) === "") return null;
  const lu = Number(String(valeur).replace(",", "."));
  return Number.isFinite(lu) ? lu : null;
}

/**
 * Le nombre qu'une phrase de la mémoire porte.
 *
 * La mémoire écrit « 0,99 m », pas « 0.99 » : un `Number()` dessus rend `NaN`,
 * et le pré-remplissage se taisait. On y prend le premier nombre écrit, virgule
 * décimale comprise.
 */
function nombreEcrit(brut) {
  const trouve = String(brut).replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0];
  return trouve === undefined ? null : trouve;
}

/**
 * Les clés de mémoire d'une entrée ou d'une sortie, toujours sous forme de liste.
 */
function clesDeMemoire(champ) {
  const declarees = champ?.depuisMemoire;
  if (!declarees) return [];
  return (Array.isArray(declarees) ? declarees : [declarees]).map(texte).filter(Boolean);
}

/**
 * Le catalogue des outils appelables.
 *
 * Chacun déclare **ce qu'il tranche**, ses entrées et ses sorties. La
 * déclaration sert trois fois, et c'est voulu : elle décrit l'outil au modèle,
 * elle construit le formulaire à l'écran, et elle vérifie les entrées avant le
 * calcul. Trois descriptions séparées auraient divergé au premier ajout.
 *
 * `depuisMemoire` nomme la ou les clés sous lesquelles la mémoire du projet
 * porte déjà cette valeur. C'est ce qui évite de demander à quelqu'un ce que son
 * propre projet a déjà tranché. Plusieurs clés parce qu'un même fait s'écrit
 * sous plusieurs noms selon qui l'a établi : l'utilitaire de Géorisques déclare
 * « Zone de sismicité », une saisie à la main écrira « Zone sismique », et la
 * clé se dérive du libellé. N'en attendre qu'une, c'est ne rien trouver.
 *
 * `lireMemoire` en extrait le jeton attendu : la mémoire parle en phrases
 * — « 4 — Moyenne », « Catégorie d'importance III » — et une liste déroulante
 * attend « 4 » et « III ». Sans elle, le pré-remplissage posait une valeur que
 * la liste ne propose pas, donc ne pré-remplissait rien, sans le dire.
 */

/**
 * Les exigences du titre VI, et pourquoi elles se distinguent des autres.
 *
 * Tout le reste du référentiel incendie pend au classement : décrire le
 * bâtiment est le préalable de n'importe quelle réponse. Le parc, lui, se juge
 * sur ses propres axes — sa surface, ses niveaux au-dessus et au-dessous du
 * niveau de référence, sa contiguïté. Exiger le nombre d'étages du bâtiment
 * avant de dire à quel degré le parc doit être stable, ce serait refuser de
 * répondre à une question qui a pourtant tout ce qu'il faut.
 *
 * Le classement reparaît à un seul endroit — l'isolement d'un parc contigu —
 * et là, c'est le moteur qui réclamera ce qui lui manque, nommément.
 */
const EXIGENCES_DU_PARC = [
  "parcDansLeChamp", "accesVehiculesLourds", "reactionAuFeuParc", "stabiliteParc",
  "isolementParcContigu", "sasCommunicationParc", "facadesParc", "recoupementParc",
  "boxesDansLeParcVerdict", "couvertureParc", "revetementCouvertureParc",
  "distanceIssuesParc", "escaliersParc", "protectionEscaliersParc",
  "conduitsParc", "ventilationParc", "solsParc", "circulationsParc",
  "eclairageSecuriteParc", "detectionParc", "alarmeUsagersParc",
  "moyensDeLutteParc", "colonneSecheParc", "extinctionAutomatiqueParc"
];

/** Vrai quand la question posée relève du parc, et non du bâtiment. */
const porteSurLeParc = (entrees = {}) => EXIGENCES_DU_PARC.includes(texte(entrees.exigence));

export const OUTILS = [
  {
    id: "profondeur_hors_gel",
    version: "V1",
    titre: "Profondeur hors gel des fondations",
    aQuoiCaSert:
      "Calcule la cote hors gel minimale des fondations selon le NF DTU 13.1 : H = H0 + (altitude − 150) / 4000, "
      + "où H0 est la valeur départementale retenue et l'altitude celle du site. "
      + "À appeler dès qu'une question porte sur la profondeur des fondations vis-à-vis du gel, "
      + "ou sur l'effet d'un changement d'altitude ou de valeur H0. "
      + "Ne dimensionne pas la fondation elle-même et ne dit rien de la portance.",
    source: "NF DTU 13.1",
    entrees: [
      {
        cle: "h0",
        libelle: "H0 retenu pour le département",
        type: "nombre",
        unite: "m",
        requis: true,
        depuisMemoire: ["h0-hors-gel", "h0"],
        lireMemoire: nombreEcrit,
        aide: "Valeur départementale. Quand le département en offre plusieurs, c'est une décision, pas une déduction."
      },
      {
        cle: "altitude",
        libelle: "Altitude du site",
        type: "nombre",
        unite: "m",
        requis: true,
        depuisMemoire: ["altitude", "altitude-du-site"],
        lireMemoire: nombreEcrit,
        aide: "Altitude du terrain naturel, en mètres."
      }
    ],
    sorties: [
      { cle: "H", libelle: "Profondeur hors gel H", unite: "m", decimales: 3, depuisMemoire: "profondeur-hors-gel" },
      { cle: "correctionAltitude", libelle: "Correction d'altitude", unite: "m", decimales: 3 }
    ],

    executer(entrees = {}) {
      const h0 = nombre(entrees.h0);
      const altitude = nombre(entrees.altitude);

      // `Number(null)` vaut zéro : lire l'altitude sans écarter l'absence
      // d'abord ferait entrer une cote calculée à 150 m par défaut, ce qui
      // n'est vrai nulle part en particulier. Le même défaut a déjà coûté une
      // « Profondeur hors gel : 0,00 m » dans les déductions.
      if (h0 === null || altitude === null) {
        return { ok: false, raison: "H0 et l'altitude sont tous deux nécessaires : sans eux, la formule ne dit rien." };
      }

      const correction = (altitude - 150) / 4000;

      return {
        ok: true,
        valeurs: arrondir(this, { H: h0 + correction, correctionAltitude: correction })
      };
    }
  },
  {
    id: "spectre_elastique_ec8",
    version: "V1",
    titre: "Spectre de réponse élastique (EC8)",
    // La phrase que lit le modèle pour décider s'il appelle. Elle dit ce que
    // l'outil tranche, et surtout ce qu'il ne tranche pas.
    aQuoiCaSert:
      "Calcule les paramètres du spectre de réponse élastique selon l'Eurocode 8 : "
      + "accélération de calcul ag, paramètre de sol S, périodes TB, TC, TD et correction d'amortissement. "
      + "À appeler dès qu'une question porte sur le dimensionnement sismique, sur l'effet d'un changement "
      + "de catégorie d'importance, de zone sismique, de classe de sol ou d'amortissement. "
      + "Ne dimensionne aucun élément de structure et ne dit rien des efforts.",
    source: "NF EN 1998-1 et son annexe nationale",
    entrees: [
      {
        cle: "zoneSismique",
        libelle: "Zone de sismicité",
        type: "choix",
        valeurs: ["1", "2", "3", "4", "5"],
        requis: true,
        depuisMemoire: ["zone-de-sismicite", "zone-sismique", "sismicite"],
        lireMemoire: (brut) => String(brut).match(/[1-5]/)?.[0] ?? null,
        aide: "1 très faible à 5 forte, au sens du zonage réglementaire français."
      },
      {
        cle: "importanceCategory",
        libelle: "Catégorie d'importance",
        type: "choix",
        valeurs: ["I", "II", "III", "IV"],
        requis: true,
        depuisMemoire: ["categorie-d-importance", "categorie-importance", "importance"],
        lireMemoire: (brut) => String(brut).toUpperCase().match(/(?<!\p{L})(IV|III|II|I)(?!\p{L})/u)?.[1] ?? null,
        aide: "I à IV au sens de l'arrêté du 22 octobre 2010."
      },
      {
        cle: "soilClass",
        libelle: "Classe de sol",
        type: "choix",
        valeurs: ["A", "B", "C", "D", "E"],
        requis: true,
        depuisMemoire: ["classe-de-sol", "type-de-sol", "categorie-de-sol", "sol-ec8"],
        lireMemoire: (brut) => String(brut).toUpperCase().match(/(?<!\p{L})([A-E])(?!\p{L})/u)?.[1] ?? null,
        aide: "Classe de sol EC8, généralement issue de l'étude géotechnique."
      },
      {
        cle: "dampingRatio",
        libelle: "Amortissement",
        type: "nombre",
        unite: "%",
        requis: false,
        defaut: 5,
        aide: "5 % par défaut, valeur usuelle du béton armé."
      }
    ],
    sorties: [
      { cle: "ag", libelle: "Accélération de calcul ag", unite: "m/s²", decimales: 3 },
      { cle: "agr", libelle: "Accélération de référence agr", unite: "m/s²", decimales: 3 },
      { cle: "gl", libelle: "Coefficient d'importance γI", unite: "", decimales: 2 },
      { cle: "S", libelle: "Paramètre de sol S", unite: "", decimales: 2 },
      { cle: "TB", libelle: "Période TB", unite: "s", decimales: 2 },
      { cle: "TC", libelle: "Période TC", unite: "s", decimales: 2 },
      { cle: "TD", libelle: "Période TD", unite: "s", decimales: 2 },
      { cle: "eta", libelle: "Correction d'amortissement η", unite: "", decimales: 3 }
    ],

    /**
     * La courbe, quand l'outil en dessine une.
     *
     * Les points sortent du **même calcul** que ceux de l'écran Parasismique —
     * `buildElasticResponseSpectrumTable`. Un graphique tracé à part finirait
     * par montrer autre chose que l'écran, et personne ne saurait lequel croire.
     *
     * Elle ne rend que des données : c'est l'écran qui trace. Un module de
     * calcul qui fabriquerait du HTML ne serait plus vérifiable par un test.
     */
    figure(entrees = {}) {
      const lignes = buildElasticResponseSpectrumTable({
        zoneSismique: texte(entrees.zoneSismique),
        importanceCategory: texte(entrees.importanceCategory),
        soilClass: texte(entrees.soilClass),
        dampingRatio: nombre(entrees.dampingRatio) ?? 5
      });

      const points = (Array.isArray(lignes) ? lignes : [])
        .filter((ligne) => Number.isFinite(ligne?.T) && Number.isFinite(ligne?.Se))
        .map((ligne) => ({ x: ligne.T, y: ligne.Se }));

      if (points.length < 2) return null;

      return {
        titre: "Spectre de réponse élastique Se(T)",
        xLabel: "Période T (s)",
        yLabel: "Se(T) (m/s²)",
        xDomain: [0, 4],
        points
      };
    },

    executer(entrees = {}) {
      const valeurs = getSeismicSizingValues({
        zoneSismique: texte(entrees.zoneSismique),
        importanceCategory: texte(entrees.importanceCategory),
        soilClass: texte(entrees.soilClass),
        dampingRatio: nombre(entrees.dampingRatio) ?? 5
      });

      // `ag` nul veut dire que la zone ou la catégorie n'est pas au catalogue.
      // Rendre un spectre sans accélération serait rendre un spectre faux.
      if (!Number.isFinite(valeurs.ag)) {
        return {
          ok: false,
          raison:
            "Ce couple zone / catégorie d'importance n'est pas au catalogue réglementaire : "
            + "aucune accélération de calcul n'en découle."
        };
      }

      return {
        ok: true,
        valeurs: arrondir(this, {
          ag: valeurs.ag,
          agr: valeurs.agr,
          gl: valeurs.gl,
          S: valeurs.S,
          TB: valeurs.TB,
          TC: valeurs.TC,
          TD: valeurs.TD,
          eta: valeurs.eta
        })
      };
    }
  },
  {
    id: "incendie_habitation",
    version: "V1",
    titre: "Incendie — Habitation (arrêté du 31 janvier 1986)",
    aQuoiCaSert:
      "Classe un bâtiment d'habitation en famille (1re, 2e, 3e A, 3e B, 4e) selon l'article 3 de l'arrêté "
      + "du 31 janvier 1986 modifié, puis en déduit l'exigence demandée : degré coupe-feu des planchers, "
      + "stabilité au feu des porteurs verticaux, murs de recoupement, parois, blocs-portes palières, "
      + "celliers, parements de façade, couverture, conduits et gaines, ainsi que les dégagements — "
      + "escaliers, parois de cage, désenfumage, circulations horizontales protégées et dégagements "
      + "protégés des articles 17 à 43, et les conduits et gaines des articles 44 à 64 — gaines gaz, "
      + "colonnes montantes électriques, conduits de ventilation et vide-ordures, les logements-foyers "
      + "des articles 65 à 76, et les dispositions diverses des articles 97 à 99 — ascenseurs, colonnes "
      + "sèches, circulation des piétons. "
      + "Traite aussi les parcs de stationnement couverts annexes des articles 77 à 96, qui ne se jugent "
      + "pas sur la famille mais sur leurs propres axes — surface, niveaux au-dessus et au-dessous du "
      + "niveau de référence, contiguïté : stabilité au feu, isolement et sas, façades, recoupement, "
      + "boxes, couverture, issues et escaliers, ventilation et désenfumage, détection, alarme, "
      + "colonnes sèches et extinction automatique. "
      + "À appeler dès qu'une question porte sur la sécurité incendie d'un bâtiment d'habitation : "
      + "« en quelle famille ce bâtiment est-il classé ? », « quel est le degré coupe-feu des planchers "
      + "à respecter ? », « quelle stabilité au feu pour les porteurs ? », « le parc doit-il être "
      + "recoupé ? ». "
      + "Ne traite ni les parcs de plus de 6 000 m², ni les bâtiments existants, ni les établissements "
      + "recevant du public, ni les immeubles de grande hauteur.",
    source: "arrêté du 31 janvier 1986 modifié, complété des commentaires SOCOTEC",
    entrees: [
      {
        cle: "exigence",
        libelle: "Exigence recherchée",
        // Ce n'est pas une donnée du bâtiment : c'est ce que le modèle est allé
        // chercher. Le garde-fou contre les valeurs fabriquées ne s'y applique pas.
        aiguillage: true,
        type: "choix",
        valeurs: [
          "classement", "planchersCoupeFeu", "porteursVerticauxStabilite",
          "murRecoupementCoupeFeu", "paroisEnveloppeCoupeFeu", "paroisSeparativesCoupeFeu",
          "blocPortePaliereResistance", "celliersParoisCoupeFeu", "parementExterieurClasse",
          "couvertureClassePenetration", "conduitsExigence", "escaliersAEncloisonner",
          "colonnesSechesExigees", "voieEnginsConforme", "voieEchellesConforme",
          // Titre III — dégagements
          "typeEscalierExige", "paroisEscalierFacade", "eloignementBaiesEscalier",
          "paroisEscalierHorsFacade", "porteEscalierCirculation", "escalierMateriaux",
          "revetementsCageEscalier", "communicationSousSol", "desenfumageCageEscalier",
          "circulationProtegeeExigee", "allegeBaieVitreeCirculation", "distanceCirculationVerdict",
          "revetementsCirculation", "conduitsDesenfumageResistance", "bouchesDesenfumage",
          "commandeDesenfumage", "degagementsProteges3B", "solutionDegagements4e",
          // Titre IV — conduits et gaines
          "conduitEntreNiveaux", "trappesDeGaine", "traverseeDeParoi",
          "gaineGazAccessibilite", "paroisGaineGaz", "traverseeGazParcStationnement",
          "colonneMontanteElectricite", "conduitsVentilation", "solutionVentilation",
          "localVentilateurInverse", "videOrduresConduit", "localReceptacleOrdures",
          // Titre V — logements-foyers, et titre VII — dispositions diverses
          "regimeLogementFoyer", "escaliersLogementFoyer", "hallLogementFoyer",
          "alarmeLogementFoyer", "enceinteUniteDeVie", "degagementsUniteDeVie",
          "escaliersServicesCollectifs", "niveauMaximalFoyerPersonnesAgees",
          "paroisCageAscenseur", "sasAscenseurSousSol", "appelPrioritairePompiers",
          "colonneSeche", "circulationPietons",
          // Titre VI — parcs de stationnement couverts. La même liste sert de
          // partage à l'exécution : une valeur écrite à deux endroits finit par
          // diverger.
          ...EXIGENCES_DU_PARC
        ],
        requis: true,
        aide: "Ce que l'on cherche. « classement » rend la famille elle-même ; les autres rendent "
          + "l'exigence qui en découle, avec son article."
      },
      {
        cle: "logementsSuperposes",
        libelle: "Logements superposés",
        type: "choix", valeurs: ["oui", "non"], requis: true, requisSaufSi: porteSurLeParc,
        aide: "Une habitation individuelle, au sens de l'arrêté, est un bâtiment sans logements superposés."
      },
      {
        cle: "etagesSurRdc",
        libelle: "Nombre d'étages sur rez-de-chaussée",
        type: "nombre", unite: "étages", requis: true, requisSaufSi: porteSurLeParc,
        aide: "Le rez-de-chaussée n'est pas compté : un R+1 vaut 1."
      },
      {
        cle: "hauteurPlancherBasLogementLePlusHaut",
        libelle: "Hauteur du plancher bas du logement le plus haut",
        type: "nombre", unite: "m", requis: true, requisSaufSi: porteSurLeParc,
        depuisMemoire: ["hauteur-du-plancher-bas-du-logement-le-plus-haut", "plancher-bas-logement-le-plus-haut"],
        lireMemoire: nombreEcrit,
        aide: "Au-dessus du sol utilement accessible aux engins des services de secours — c'est le "
          + "niveau d'accès des secours, pas le terrain naturel."
      },
      {
        cle: "hauteurPlancherBasNiveauLePlusHaut",
        libelle: "Hauteur du plancher bas du niveau le plus haut",
        type: "nombre", unite: "m", requis: false,
        depuisMemoire: ["hauteur-du-plancher-bas-du-niveau-le-plus-haut", "plancher-bas-niveau-le-plus-haut"],
        lireMemoire: nombreEcrit,
        aide: "Depuis l'arrêté du 7 août 2019, la quatrième famille se mesure au niveau le plus haut et "
          + "non au logement. Sans duplex en partie haute, c'est la même valeur que ci-dessus."
      },
      {
        cle: "implantation",
        libelle: "Implantation de l'habitation individuelle",
        type: "choix", valeurs: ["isolee", "jumelee", "bande"], requis: false,
        aide: "Ne concerne que les habitations individuelles."
      },
      {
        cle: "structuresIndependantes",
        libelle: "Structures indépendantes de l'habitation contiguë",
        type: "choix", valeurs: ["oui", "non"], requis: false,
        aide: "Décisif pour une maison en bande à un étage : c'est ce qui sépare la première famille de la deuxième."
      },
      {
        cle: "duplexOuTriplexAuDernierEtage",
        libelle: "Duplex ou triplex à l'étage le plus élevé",
        type: "choix", valeurs: ["oui", "non"], requis: true, requisSaufSi: porteSurLeParc,
        aide: "Le 5°) de l'article 3 ne compte alors que le niveau bas de ces logements. Sans cette "
          + "réponse, le nombre d'étages retenu reste indéterminé et rien ne peut être classé."
      },
      {
        cle: "sousSol",
        libelle: "Le bâtiment comporte un sous-sol",
        type: "choix", valeurs: ["oui", "non"], requis: false,
        aide: "En première famille, l'article 6 ne vise que le plancher haut du sous-sol."
      },
      // Le parc ne se juge pas sur la famille : il a ses propres axes. Ces
      // entrées ne servent qu'aux exigences du titre VI, et restent vides
      // partout ailleurs.
      {
        cle: "parcDeStationnement",
        libelle: "Le bâtiment comporte un parc de stationnement couvert annexe",
        type: "choix", valeurs: ["oui", "non"], requis: false,
        aide: "À renseigner pour toute exigence du titre VI (articles 77 à 96)."
      },
      {
        cle: "surfaceParc",
        libelle: "Surface du parc de stationnement",
        type: "nombre", unite: "m²", requis: false,
        aide: "Le titre VI ne s'applique qu'au-dessus de 100 m² et jusqu'à 6 000 m² inclus."
      },
      {
        cle: "niveauxParcAuDessus",
        libelle: "Niveaux du parc au-dessus du niveau de référence",
        type: "nombre", unite: "niveaux", requis: false,
        aide: "Sans compter le niveau de référence : un parc à simple rez-de-chaussée en compte zéro."
      },
      {
        cle: "niveauxParcAuDessous",
        libelle: "Niveaux du parc au-dessous du niveau de référence",
        type: "nombre", unite: "niveaux", requis: false,
        aide: "Sans compter le niveau de référence. C'est ce compte qui commande le recoupement, la "
          + "ventilation mécanique, la détection, les colonnes sèches et l'extinction automatique."
      },
      {
        cle: "hauteurPlancherBasDernierNiveauParc",
        libelle: "Hauteur du plancher bas du dernier niveau du parc",
        type: "nombre", unite: "m", requis: false,
        aide: "Par rapport au niveau de référence, au-dessus ou au-dessous : c'est l'écart, pas "
          + "l'altitude signée. L'article 81 s'arrête à 28 m."
      },
      {
        cle: "parcContiguAImmeuble",
        libelle: "Le parc est contigu à un immeuble d'habitation",
        type: "choix", valeurs: ["oui", "non"], requis: false,
        aide: "« Contigu » inclut le parc situé en dessous de l'immeuble. C'est le seul endroit où le "
          + "classement commande une exigence du parc : 2 heures en 3ᵉ ou 4ᵉ famille, 1 heure en 2ᵉ."
      }
    ],
    sorties: [
      { cle: "reponse", libelle: "Exigence" },
      { cle: "classement", libelle: "Classement du bâtiment" },
      { cle: "article", libelle: "Article" },
      { cle: "citation", libelle: "Phrase du texte qui décide" }
    ],

    /**
     * Le raisonnement n'est pas ici : il tourne dans la fonction
     * `incendie-habitation`, côté serveur.
     *
     * L'import est différé exprès. Le catalogue d'outils est lu par des tests
     * qui n'ont ni réseau ni session ; un import statique du service ferait
     * échouer le chargement du module entier pour un utilitaire qu'ils
     * n'appellent jamais.
     */
    async executer(entrees = {}) {
      const produit = texte(entrees.exigence);
      if (!produit) return { ok: false, raison: "Il faut dire quelle exigence est recherchée." };

      const oui = (valeur) => {
        const v = texte(valeur).toLowerCase();
        if (v === "oui" || v === "true") return true;
        if (v === "non" || v === "false") return false;
        return undefined;
      };
      const reponses = {};
      const poser = (cle, valeur) => { if (valeur !== undefined && valeur !== null && valeur !== "") reponses[cle] = valeur; };
      poser("logementsSuperposes", oui(entrees.logementsSuperposes));
      poser("structuresIndependantes", oui(entrees.structuresIndependantes));
      // Le référentiel compte les niveaux enterrés plutôt que de cocher un
      // sous-sol : c'est le même sous-sol que celui du parc, et le compter deux
      // fois en faisait deux. Le modèle, lui, continue de répondre par oui ou
      // par non — c'est ici que l'un devient l'autre.
      const sousSol = oui(entrees.sousSol);
      poser("niveauxEnSousSol", sousSol === undefined ? undefined : (sousSol ? 1 : 0));
      poser("implantation", texte(entrees.implantation) || undefined);
      poser("etagesSurRdc", nombre(entrees.etagesSurRdc));
      // La hauteur du logement le plus haut ne se distingue de celle du niveau
      // le plus haut qu'en présence d'un duplex de dernier étage : c'est là, et
      // là seulement, que le référentiel la demande.
      poser("hauteurPlancherBasLogementLePlusHautSiDuplex", nombre(entrees.hauteurPlancherBasLogementLePlusHaut));
      poser("hauteurPlancherBasNiveauLePlusHaut",
        nombre(entrees.hauteurPlancherBasNiveauLePlusHaut) ?? nombre(entrees.hauteurPlancherBasLogementLePlusHaut));
      // Un duplex de dernier étage change le compte des niveaux : ne rien en
      // dire serait supposer qu'il n'y en a pas. On le demande au copilote
      // seulement quand le référentiel bute dessus.
      poser("duplexOuTriplexAuDernierEtage", oui(entrees.duplexOuTriplexAuDernierEtage));
      poser("parcDeStationnement", oui(entrees.parcDeStationnement));
      poser("parcContiguAImmeuble", oui(entrees.parcContiguAImmeuble));
      poser("surfaceParc", nombre(entrees.surfaceParc));
      poser("niveauxParcAuDessus", nombre(entrees.niveauxParcAuDessus));
      poser("niveauxParcAuDessous", nombre(entrees.niveauxParcAuDessous));
      poser("hauteurPlancherBasDernierNiveauParc", nombre(entrees.hauteurPlancherBasDernierNiveauParc));

      const { demanderIncendie } = await import("./incendie-service.js");
      const rendu = await demanderIncendie(produit, reponses);

      if (!rendu?.ok) {
        // « Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien » : on rend
        // ce qui manque, nommément, plutôt qu'une valeur par défaut.
        const manque = (rendu?.manque ?? []).map((q) => q.libelle).join(" ; ");
        return { ok: false, raison: manque
          ? `${rendu.raison} Il faut savoir : ${manque}.`
          : (rendu?.raison || "Le référentiel n'a pas pu conclure.") };
      }

      const classement = (rendu.chemin ?? []).find((etape) => etape.id === "classement");
      return {
        ok: true,
        valeurs: {
          reponse: [rendu.valeur, rendu.sansObjet, rendu.mention].filter(Boolean).join(" — ") || "sans objet",
          classement: classement?.valeur ?? "",
          article: rendu.pourquoi?.article ? `article ${rendu.pourquoi.article}${rendu.pourquoi.paragraphe ? `, ${rendu.pourquoi.paragraphe}` : ""}` : "",
          citation: rendu.pourquoi?.citation ?? ""
        }
      };
    }
  },
  {
    id: "fondations_predimensionnement",
    version: "V1",
    titre: "Pré-dimensionnement des fondations d'après une note de calcul",
    aQuoiCaSert:
      "Lit une note de calcul de charpente déposée en pièce jointe, en extrait les descentes de charges "
      + "non pondérées appui par appui, calcule la profondeur hors gel, puis cherche pour chaque appui "
      + "la plus petite semelle carrée qui vérifie glissement, basculement, contrainte et surface "
      + "comprimée, sans jamais remonter au-dessus du hors gel. Rend un tableau : un massif par appui, "
      + "ses cotes, ce qui le gouverne et son volume de béton. "
      + "À appeler dès qu'une note de calcul est jointe et qu'on demande un pré-dimensionnement, un "
      + "dimensionnement ou un avant-métré des fondations. Appelle-le sans attendre : il lit la note "
      + "lui-même, et ce qu'elle contient ne te manque pas. "
      + "Ne remplis que ce que quelqu'un a dit. L'altitude du site se lit sur la note, l'arase a une "
      + "valeur par défaut, et les cotes imposées ne se remplissent que si on a demandé cette cote-là : "
      + "proposer un chiffre pour l'une d'elles ne fait pas avancer le calcul, cela l'arrête. "
      + "Ne ferraille pas la semelle, ne traite pas les fondations profondes, et ne remplace pas une "
      + "note de calcul de béton armé : il donne les cotes par lesquelles on commence.",
    source: "utilitaire « Fondations — calcul » et NF DTU 13.1",
    entrees: [
      {
        cle: "contrainteLimite",
        libelle: "Contrainte admissible du sol",
        type: "nombre",
        unite: "bar",
        requis: true,
        depuisMemoire: ["contrainte-admissible-du-sol", "contrainte-sol", "contrainte-limite"],
        lireMemoire: nombreEcrit,
        aide: "À l'ELS, en bars. C'est une donnée du rapport de sol, jamais une hypothèse de la note de "
          + "charpente : sans elle, aucune semelle ne se dimensionne."
      },
      {
        cle: "h0",
        libelle: "H0 retenu pour le département",
        type: "nombre",
        unite: "m",
        requis: true,
        depuisMemoire: ["h0-hors-gel", "h0"],
        lireMemoire: nombreEcrit,
        aide: "Valeur départementale du NF DTU 13.1. Quand le département en offre plusieurs, c'est une "
          + "décision, pas une déduction."
      },
      {
        cle: "altitude",
        libelle: "Altitude du site",
        type: "nombre",
        unite: "m",
        depuisMemoire: ["altitude", "altitude-du-site"],
        lireMemoire: nombreEcrit,
        aide: "L'utilitaire la lit sur la note — les hypothèses de neige la portent presque toujours. "
          + "Elle ne se saisit que si la note n'en dit rien."
      },
      {
        cle: "araseSuperieure",
        libelle: "Arase supérieure du massif",
        type: "nombre",
        unite: "m",
        defaut: -0.1,
        aide: "Cote du dessus du massif par rapport au niveau extérieur fini. Négative s'il est enterré."
      },
      {
        cle: "imposerPour",
        libelle: "Appui dont on impose les cotes",
        type: "texte",
        // Ce n'est pas une donnée du projet : c'est ce que l'utilisateur vient
        // de désigner. Le garde-fou contre les valeurs fabriquées ne s'y
        // applique pas — il refuserait un nom d'appui lu dans le tableau.
        aiguillage: true,
        aide: "Le nom exact de l'appui, tel qu'il figure dans le tableau. Vide pour imposer à tous."
      },
      { cle: "imposerLx", libelle: "Largeur imposée", type: "nombre", unite: "m",
        aide: "Ne se remplit que si quelqu'un a demandé cette cote." },
      { cle: "imposerLy", libelle: "Longueur imposée", type: "nombre", unite: "m",
        aide: "Ne se remplit que si quelqu'un a demandé cette cote." },
      { cle: "imposerLz", libelle: "Hauteur imposée", type: "nombre", unite: "m",
        aide: "Ne se remplit que si quelqu'un a demandé cette cote." }
    ],
    sorties: [
      { cle: "appuis", libelle: "Massifs pré-dimensionnés" },
      { cle: "horsGel", libelle: "Profondeur hors gel", unite: "m", decimales: 3 },
      { cle: "volumeTotal", libelle: "Volume de béton", unite: "m³", decimales: 2 }
    ],

    /**
     * L'orchestration, écrite ici et non laissée au modèle.
     *
     * Le modèle choisit d'appeler cet outil ; tout ce qui suit est du code. Il
     * ne décide ni de l'ordre des étapes, ni de la correspondance des cas de
     * charge, ni des cotes essayées — trois choses qu'un modèle rendrait
     * plausibles et qu'un chantier paierait.
     *
     * L'extraction, elle, est bien un appel au modèle : deux notes de calcul ne
     * se ressemblent pas, et recopier des nombres d'un tableau est exactement ce
     * qu'il sait faire sans rien décider.
     */
    async executer(entrees = {}, contexte = {}) {
      const piece = (contexte.piecesJointes ?? []).find((p) => p?.mediaType === "application/pdf" && p?.donnees);
      if (!piece) {
        return { ok: false, raison:
          "Aucune note de calcul n'est jointe. Déposez le PDF de la note dans la conversation, "
          + "puis redemandez le pré-dimensionnement." };
      }

      const contrainte = nombre(entrees.contrainteLimite);
      const h0 = nombre(entrees.h0);
      const arase = nombre(entrees.araseSuperieure) ?? -0.1;

      const [{ lireLaNoteDeCalcul }, { chargesPourLUtilitaire, unitesDeLaNote },
        { predimensionner, volumeTotal }, { entreesParDefautDans, contrainteDepuisBars },
        { calculerLesSemelles }] = await Promise.all([
        import("./note-de-calcul-service.js"),
        import("./note-de-calcul.js"),
        import("./predimensionnement-fondations.js"),
        import("./fondations-declaration.js"),
        import("./fondations-service.js")
      ]);

      let note;
      try {
        note = await lireLaNoteDeCalcul(piece);
      } catch (erreur) {
        return { ok: false, raison: erreur instanceof Error ? erreur.message : "La note n'a pas pu être lue." };
      }

      if (!note.appuis.length) {
        return { ok: false, raison:
          "Aucune descente de charges n'a été trouvée dans ce document. Une note de calcul de charpente "
          + "en donne un tableau par portique ; sans lui, il n'y a rien à dimensionner." };
      }

      const unites = unitesDeLaNote(note);
      if (!unites) {
        return { ok: false, raison:
          "L'unité des descentes de charges n'a pas pu être lue sur la note. Une note en tonnes prise "
          + "pour des daN donnerait des semelles mille fois trop petites, et le calcul dirait que tout "
          + "va bien : dites l'unité employée." };
      }

      // L'altitude vient de la note quand elle la porte — les hypothèses de
      // neige la donnent presque toujours. Ce qui a été répondu à l'écran passe
      // devant : quelqu'un l'a alors décidé.
      const altitude = nombre(entrees.altitude) ?? note.altitude;
      if (altitude === null) {
        return { ok: false, raison:
          "L'altitude du site n'est ni sur la note ni dans la mémoire du projet, et le hors gel en "
          + "dépend. Dites l'altitude, et le calcul reprend." };
      }

      // Le hors gel n'est pas recalculé ici : c'est le même utilitaire que
      // partout ailleurs, et « une valeur écrite à deux endroits finit par
      // diverger ».
      const gel = outilParId("profondeur_hors_gel").executer({ h0, altitude });
      if (!gel?.ok) return { ok: false, raison: gel?.raison || "La profondeur hors gel n'a pas pu être calculée." };
      const horsGel = gel.valeurs.H;

      // Les valeurs par défaut sont écrites en daN. Prises telles quelles dans
      // une note en tonnes, elles sont fausses d'un facteur mille : le béton
      // pèserait 2 500 T/m³ et aucune semelle ne passerait — sans que rien ne
      // dise pourquoi, parce que le calcul, lui, resterait juste.
      const base = {
        ...entreesParDefautDans(unites),
        contrainteLimite: contrainteDepuisBars(contrainte, unites),
        araseSuperieure: arase,
        // La butée se mobilise sur la hauteur enterrée réelle : la laisser aux
        // cotes par défaut compterait un appui de terre qui n'existe pas.
        buteeZi: arase,
        buteeZf: arase - 1
      };

      const appuis = note.appuis.map((appui) => {
        const { charges, correspondances } = chargesPourLUtilitaire(appui);
        return { nom: appui.nom, quantite: appui.quantite, charges, correspondances, commentaire: appui.commentaire };
      });

      const impose = {
        pour: texte(entrees.imposerPour),
        Lx: nombre(entrees.imposerLx), Ly: nombre(entrees.imposerLy), Lz: nombre(entrees.imposerLz)
      };

      let sortie;
      try {
        sortie = await predimensionner(appuis, {
          base,
          horsGel,
          calculer: (liste) => calculerLesSemelles(liste.map((e) => ({ entrees: e })))
        });
      } catch (erreur) {
        return { ok: false, raison: erreur instanceof Error ? erreur.message : "Le calcul n'a pas abouti." };
      }

      const reprises = await reprendreLesCotesImposees(sortie, impose, calculerLesSemelles, base, horsGel);

      return {
        ok: true,
        valeurs: {
          appuis: reprises.map((appui) => ({
            nom: appui.nom, quantite: appui.quantite, tenue: appui.tenue,
            Lx: appui.sectionLx ?? null, Ly: appui.sectionLy ?? null, Lz: appui.hauteurLz ?? null,
            ratio: Number.isFinite(appui.ratio) ? Number(appui.ratio.toFixed(3)) : null,
            gouverne: appui.gouverne ?? null,
            combinaison: appui.combinaison ?? null, volume: appui.volume ?? null,
            impose: appui.impose === true, message: appui.message ?? null,
            // Le détail voyage avec le résultat : « aucune semelle jusqu'à 4 m »
            // sans les charges retenues ni les quatre ratios est une réponse
            // qu'on ne peut ni vérifier ni corriger. On ne saurait pas si la
            // note a été mal lue, si l'unité est fausse, ou si le sol est
            // réellement trop faible.
            coteMaxTentee: appui.coteMaxTentee ?? null,
            ratios: appui.ratios ?? [],
            charges: appui.charges ?? {},
            correspondances: appui.correspondances ?? []
          })),
          horsGel,
          volumeTotal: volumeTotal(reprises),
          unites,
          affaire: note.affaire,
          altitude,
          correspondances: appuis[0]?.correspondances ?? []
        }
      };
    }
  }
];

/**
 * Les cotes qu'on impose après coup, et ce qu'elles deviennent.
 *
 * Le pré-dimensionnement propose ; l'ingénieur dispose. Un module de coffrage,
 * une contrainte de chantier, une semelle qu'on veut aligner sur sa voisine :
 * on rejoue alors la vérification sur les cotes demandées, et l'on dit
 * franchement si elles passent. Ce qui n'est pas visé garde ce que la recherche
 * avait trouvé.
 */
async function reprendreLesCotesImposees(sortie, impose, calculerLesSemelles, base, horsGel) {
  const quelquesUnes = [impose.Lx, impose.Ly, impose.Lz].some((v) => v !== null);
  if (!quelquesUnes) return sortie.appuis;

  const vises = sortie.appuis.filter((appui) => !impose.pour || appui.nom === impose.pour);
  if (!vises.length) return sortie.appuis;

  const entrees = vises.map((appui) => ({
    entrees: {
      ...(appui.entrees ?? base),
      sectionLx: impose.Lx ?? appui.sectionLx,
      sectionLy: impose.Ly ?? appui.sectionLy,
      hauteurLz: impose.Lz ?? appui.hauteurLz
    }
  }));
  const resultats = await calculerLesSemelles(entrees);

  const { verificationGouvernante } = await import("./predimensionnement-fondations.js");
  const parNom = new Map(vises.map((appui, rang) => [appui.nom, { appui, resultat: resultats[rang], entrees: entrees[rang].entrees }]));

  return sortie.appuis.map((appui) => {
    const repris = parNom.get(appui.nom);
    if (!repris) return appui;
    const gouverne = verificationGouvernante(repris.resultat);
    return {
      ...appui,
      impose: true,
      tenue: repris.resultat?.bilan?.verifie === true,
      sectionLx: repris.entrees.sectionLx,
      sectionLy: repris.entrees.sectionLy,
      hauteurLz: repris.entrees.hauteurLz,
      ratio: repris.resultat?.bilan?.ratio ?? null,
      gouverne: gouverne?.quoi ?? null,
      combinaison: repris.resultat?.contrainte?.combinaison ?? null,
      volume: Math.round(repris.entrees.sectionLx * repris.entrees.sectionLy * repris.entrees.hauteurLz * 1000) / 1000,
      message: repris.resultat?.bilan?.verifie === true ? null
        : `Les cotes imposées ne vérifient pas cet appui${
          horsGel !== null && repris.entrees.hauteurLz + base.araseSuperieure < horsGel
            ? " et remontent au-dessus du hors gel" : ""}.`
    };
  });
}

/**
 * Les valeurs, à la précision que la sortie déclare.
 *
 * `1.6 × 1.4` vaut `2.2399999999999998` en binaire. Ce n'est pas un détail
 * d'affichage : ce nombre part au modèle, qui le recopie dans sa réponse, et un
 * chantier lit alors une accélération à seize décimales. La précision est donc
 * déclarée par la sortie et appliquée **au calcul**, une seule fois, avant que
 * qui que ce soit ne voie la valeur — un arrondi fait à l'affichage laisserait
 * le modèle travailler sur l'autre nombre.
 */
function arrondir(outil, valeurs) {
  const decimales = new Map((outil?.sorties ?? []).map((sortie) => [sortie.cle, sortie.decimales]));

  return Object.fromEntries(
    Object.entries(valeurs).map(([cle, valeur]) => {
      const chiffres = decimales.get(cle);
      if (!Number.isFinite(valeur) || !Number.isFinite(chiffres)) return [cle, valeur];
      return [cle, Number(valeur.toFixed(chiffres))];
    })
  );
}

/** Un outil par son identifiant, ou rien. Rien n'est approché. */
export function outilParId(id) {
  const cle = texte(id);
  return OUTILS.find((outil) => outil.id === cle) ?? null;
}

/** L'identifiant complet : le nom et sa version, comme pour les déductions. */
export function referenceOutil(outil) {
  return outil?.version ? `${outil.id}_${outil.version}` : texte(outil?.id);
}

/**
 * La déclaration que lit le modèle, au format des fonctions d'OpenAI.
 *
 * Elle se dérive de la même source que le formulaire : décrire l'outil deux
 * fois, une fois pour le modèle et une fois pour l'écran, serait s'assurer
 * qu'un jour le modèle demande un champ que l'écran ne montre pas.
 */
export function declarationsPourModele() {
  return OUTILS.map((outil) => {
    const properties = {};
    const required = [];

    for (const entree of outil.entrees) {
      properties[entree.cle] = {
        type: entree.type === "nombre" ? "number" : "string",
        description: [entree.libelle, entree.unite ? `en ${entree.unite}` : "", entree.aide || ""]
          .filter(Boolean)
          .join(" — "),
        ...(entree.valeurs ? { enum: entree.valeurs } : {})
      };
      if (entree.requis) required.push(entree.cle);
    }

    return {
      type: "function",
      name: outil.id,
      description: `${outil.titre}. ${outil.aQuoiCaSert} Source : ${outil.source}.`,
      parameters: { type: "object", properties, required, additionalProperties: false }
    };
  });
}

/**
 * Ce que la mémoire du projet sait déjà des entrées d'un outil.
 *
 * On lit la valeur portée par l'affirmation, pas son énoncé : « Catégorie
 * d'importance : II » est une phrase, `II` est une valeur. Prendre la phrase
 * ferait entrer un paragraphe dans un champ qui attend une lettre.
 *
 * Seules les affirmations **en vigueur** comptent : pré-remplir avec une valeur
 * remplacée ferait calculer sur un état que le projet a quitté.
 */
export function prefillDepuisMemoire(outil, assertions = []) {
  const courantes = currentAssertions(Array.isArray(assertions) ? assertions : []);
  const parCle = new Map();

  for (const assertion of courantes) {
    // `sujet@portee` : la portée range l'affirmation, elle ne change pas le
    // sujet dont elle parle.
    const cle = texte(assertion?.subject_key).split("@")[0];
    if (cle && !parCle.has(cle)) parCle.set(cle, assertion);
  }

  const rempli = {};
  const provenance = {};

  for (const entree of outil?.entrees ?? []) {
    const cles = clesDeMemoire(entree);
    if (!cles.length) continue;

    const cleTrouvee = cles.find((cle) => parCle.has(cle));
    if (!cleTrouvee) continue;
    const assertion = parCle.get(cleTrouvee);

    // L'énoncé sert de repli : une affirmation déclarée à la main peut porter
    // sa valeur dans la phrase plutôt que dans le payload.
    const brut = texte(assertion?.payload?.value) || texte(assertion?.statement);
    if (!brut) continue;

    const valeur = texte(entree.lireMemoire ? entree.lireMemoire(brut) : brut);
    if (!valeur) continue;
    // Une valeur que la liste ne propose pas ne s'impose pas : elle rendrait le
    // formulaire invalide sans qu'on comprenne d'où ça vient.
    if (Array.isArray(entree.valeurs) && !entree.valeurs.includes(valeur)) continue;

    rempli[entree.cle] = valeur;
    provenance[entree.cle] = {
      cle: cleTrouvee,
      // Ce que la mémoire dit mot pour mot : « 4 » tout seul ne dit pas d'où
      // il sort.
      brut,
      enonce: texte(assertion?.statement),
      trancheeLe: texte(assertion?.decided_at)
    };
  }

  return { valeurs: rempli, provenance };
}

/**
 * Cette valeur figure-t-elle dans ce que l'utilisateur a écrit ?
 *
 * Une recherche par mot entier, et sensible à la casse pour les valeurs d'une
 * ou deux lettres : « A » ne doit pas se reconnaître dans « a » ni dans
 * « sol », sinon le garde-fou laisserait passer précisément ce qu'il surveille.
 * Les valeurs plus longues se cherchent sans la casse — « batiment a » et
 * « Bâtiment A » désignent la même chose.
 */
export function valeurCiteePar(question, valeur) {
  const cherchee = texte(valeur);
  const source = texte(question);
  if (!cherchee || !source) return false;

  // Personne n'écrit « 0.45 » en français. Une valeur reçue avec un point et
  // écrite avec une virgule est la **même valeur** : ne pas la reconnaître
  // faisait passer pour inventé ce que l'utilisateur venait de taper, et
  // l'écran le lui redemandait.
  const formes = new Set([cherchee]);
  if (cherchee.includes(".")) formes.add(cherchee.replace(".", ","));
  if (cherchee.includes(",")) formes.add(cherchee.replace(",", "."));
  // « 0,45 » se dit aussi « ,45 » sans son zéro, et « 2 » peut s'écrire « 2,0 ».
  const nombreLu = Number(cherchee.replace(",", "."));
  if (Number.isFinite(nombreLu)) {
    for (const decimales of [0, 1, 2, 3]) {
      const rendu = nombreLu.toFixed(decimales);
      if (Number(rendu) !== nombreLu) continue;
      formes.add(rendu);
      formes.add(rendu.replace(".", ","));
    }
  }

  // `\b` ne borne pas les accents ni les symboles : on borne à la main sur ce
  // qui n'est ni lettre ni chiffre.
  return [...formes].some((forme) => {
    const echappee = forme.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const drapeaux = forme.length <= 2 ? "" : "i";
    return new RegExp(`(^|[^\\p{L}\\p{N}])${echappee}($|[^\\p{L}\\p{N}])`, `u${drapeaux}`).test(source);
  });
}

/**
 * Les substitutions que rien ne justifie.
 *
 * Une entrée que le modèle donne différente de la mémoire, sans que
 * l'utilisateur l'ait écrite ni confirmée. C'est le cas de « change la classe
 * de sol » suivi d'un « A » venu de nulle part.
 */
export function substitutionsNonJustifiees(outil, { entrees = {}, depuisMemoire = {}, question = "", confirmees = [] } = {}) {
  // Deux façons de confirmer, et elles ne valent pas la même chose.
  //
  // « contrainteLimite » seul est ce qu'on vient de cliquer : la valeur sort du
  // formulaire, il n'y a rien à comparer. « contrainteLimite=1.5 » est ce que
  // la conversation a déjà établi : la confirmation ne vaut alors **que pour
  // cette valeur-là**. Sans cette distinction, une valeur confirmée une fois
  // rendrait la clé libre pour toujours, et le modèle pourrait y glisser 3 bars
  // au tour suivant sans que personne ne le voie.
  const validees = new Set();
  const valideesPourUneValeur = new Map();
  for (const brut of Array.isArray(confirmees) ? confirmees : []) {
    const dit = texte(brut);
    const rang = dit.indexOf("=");
    if (rang < 0) { validees.add(dit); continue; }
    const cle = dit.slice(0, rang);
    if (!valideesPourUneValeur.has(cle)) valideesPourUneValeur.set(cle, new Set());
    valideesPourUneValeur.get(cle).add(dit.slice(rang + 1));
  }

  return (outil?.entrees ?? []).filter((entree) => {
    const proposee = texte(entrees?.[entree.cle]);
    if (!proposee) return false;

    // Une entrée d'aiguillage n'est pas une donnée du projet : elle dit
    // seulement ce que le modèle est allé chercher — « le degré coupe-feu des
    // planchers » plutôt que « la stabilité des porteurs ». La réclamer dans la
    // question de l'utilisateur reviendrait à lui demander de nommer les clés
    // internes de l'utilitaire, et bloquerait tout appel.
    if (entree.aiguillage) return false;

    // Trois façons légitimes pour une valeur d'arriver là. En dehors d'elles,
    // le modèle l'a fabriquée.
    if (validees.has(entree.cle)) return false;                       // quelqu'un l'a cliquée
    if (valideesPourUneValeur.get(entree.cle)?.has(proposee)) return false; // et c'est bien celle-là
    if (texte(depuisMemoire?.[entree.cle]) === proposee) return false; // le projet la porte
    if (valeurCiteePar(question, proposee)) return false;             // quelqu'un l'a écrite

    return true;
  });
}

/**
 * Ce qu'on dit quand une valeur a été fabriquée.
 *
 * Deux phrases, parce qu'il s'est passé deux choses : on demande ce sans quoi
 * le calcul n'a pas lieu, et l'on annonce ce qu'on a écarté sans le demander.
 * Taire le second laisserait croire que le modèle avait raison sur l'altitude
 * du site ; en faire une question ferait six questions pour une décision.
 */
export function phraseDesSubstitutions(aDemander = [], ecartees = []) {
  const noms = aDemander.map((entree) => entree.libelle).filter(Boolean);
  const demande = noms.length === 1
    ? `Le calcul n'a pas eu lieu : ${noms[0]} a été proposé sans que personne l'ait dit. Il faut le demander avant de calculer.`
    : `Le calcul n'a pas eu lieu : ${noms.length} valeurs ont été proposées sans que personne les ait dites. Il faut les demander avant de calculer.`;

  if (!ecartees.length) return demande;

  return `${demande} Écarté sans être demandé, parce que le calcul le trouve ailleurs — dans la mémoire du projet, dans la note jointe, ou dans la valeur par défaut : ${ecartees.join(", ")}.`;
}

/**
 * Les entrées requises qui manquent encore.
 *
 * Une valeur hors des choix déclarés compte comme manquante : accepter « 2b »
 * pour une zone sismique ferait calculer sur autre chose que ce qui a été
 * demandé, et le résultat aurait l'air d'un résultat.
 *
 * ## Une entrée peut être requise pour une partie du travail seulement
 *
 * Un outil qui grandit finit par répondre à deux familles de questions qui ne
 * partent pas du même endroit — le référentiel incendie classe un bâtiment,
 * mais juge un parc de stationnement sur ses propres axes. Réclamer les étages
 * du bâtiment avant de dire à quel degré le parc doit être stable, ce serait
 * refuser de répondre à une question qui a tout ce qu'il faut. `requisSaufSi`
 * dit quand la question ne porte pas là-dessus. Ce qui manque alors vraiment,
 * le calcul le dira lui-même, nommément.
 */
export function entreesManquantes(outil, entrees = {}) {
  return (outil?.entrees ?? []).filter((entree) => {
    if (!entree.requis) return false;
    if (entree.requisSaufSi?.(entrees)) return false;

    const valeur = entrees?.[entree.cle];
    if (valeur === null || valeur === undefined || texte(valeur) === "") return true;
    if (entree.valeurs && !entree.valeurs.includes(texte(valeur))) return true;
    if (entree.type === "nombre" && nombre(valeur) === null) return true;

    return false;
  });
}

/**
 * Ce qu'une conversation garde d'un tour à l'autre, une fois le calcul fait.
 *
 * La contrainte admissible du sol et la valeur départementale du hors gel sont
 * des **décisions** : on les prend une fois, elles valent pour tous les massifs
 * et pour toute la discussion. Les redemander à chaque question ferait retaper
 * quatre fois la même chose.
 *
 * Ce qui n'est ni requis ni tiré de la mémoire ne se garde pas — une cote
 * imposée à un massif ne doit pas se réimposer à la question suivante — et une
 * entrée d'aiguillage encore moins : elle dit ce que le modèle cherchait, pas
 * ce que le projet vaut.
 */
export function aRetenirDeLaConversation(outil, entrees = {}) {
  const garde = {};
  for (const entree of outil?.entrees ?? []) {
    if (entree.aiguillage) continue;
    if (!entree.requis && !entree.depuisMemoire?.length) continue;
    const valeur = texte(entrees?.[entree.cle]);
    if (valeur) garde[entree.cle] = valeur;
  }
  return garde;
}

/** Les valeurs par défaut déclarées, pour ce qui n'a pas été fourni. */
function avecDefauts(outil, entrees = {}) {
  const complet = { ...entrees };
  for (const entree of outil?.entrees ?? []) {
    if (entree.defaut !== undefined && (complet[entree.cle] === undefined || texte(complet[entree.cle]) === "")) {
      complet[entree.cle] = entree.defaut;
    }
  }
  return complet;
}

/**
 * Ce que le projet tient pour vrai sur les sorties d'un outil.
 *
 * On compare **valeur à valeur**, sur la clé de mémoire déclarée par la sortie.
 * Sans clé déclarée, aucune comparaison : rapprocher « TB » d'une affirmation
 * qui parle d'autre chose fabriquerait un conflit qui n'existe pas, et un
 * conflit inventé coûte plus cher qu'un conflit manqué.
 */
export function comparerALaMemoire(outil, valeurs = {}, assertions = []) {
  const courantes = currentAssertions(Array.isArray(assertions) ? assertions : []);
  const ecarts = [];

  for (const sortie of outil?.sorties ?? []) {
    const cles = clesDeMemoire(sortie);
    if (!cles.length) continue;

    const assertion = courantes.find((entree) => cles.includes(texte(entree?.subject_key).split("@")[0]));
    if (!assertion) continue;

    // « 0,99 m » est un nombre écrit en français, pas une absence de nombre.
    const tenue = nombre(nombreEcrit(texte(assertion?.payload?.value) || texte(assertion?.statement)));
    const calculee = nombre(valeurs?.[sortie.cle]);
    if (tenue === null || calculee === null) continue;

    // Une comparaison de flottants au dixième près : deux valeurs qui ne
    // diffèrent qu'au quinzième chiffre ne sont pas un désaccord, c'est de
    // l'arithmétique binaire.
    if (Math.abs(tenue - calculee) < 1e-9) continue;

    ecarts.push({
      sujet: sortie.libelle,
      cleMemoire: texte(assertion?.subject_key).split("@")[0],
      valeurTenue: tenue,
      valeurCalculee: calculee,
      unite: sortie.unite || "",
      trancheeLe: texte(assertion?.decided_at)
    });
  }

  return ecarts;
}

/**
 * Exécuter un outil, ou dire pourquoi on ne l'a pas fait.
 *
 * Trois issues, et elles se distinguent :
 *
 *   `inconnu`   — le modèle a nommé un outil qui n'existe pas ;
 *   `manquant`  — il faut demander des valeurs à quelqu'un ;
 *   `fait`      — le calcul a eu lieu, avec ses entrées et ses écarts.
 *
 * Les confondre reviendrait à faire dire au modèle « je n'ai pas pu calculer »
 * dans trois situations qui n'appellent pas la même suite.
 */
export async function executerOutil({
  id = "", entrees = {}, assertions = [], question = "", confirmees = [], piecesJointes = [],
  acquises = {}
} = {}) {
  const outil = outilParId(id);
  if (!outil) {
    return { statut: "inconnu", id: texte(id), message: `Aucun utilitaire ne porte le nom « ${texte(id)} ».` };
  }

  const { valeurs: depuisMemoire, provenance } = prefillDepuisMemoire(outil, assertions);
  const dejaEtablies = nettoyer(acquises);

  // Avant de regarder ce qui manque : ce qui a été **remplacé sans raison**.
  // Une valeur inventée n'a pas l'air de manquer, et c'est bien le problème.
  const substituees = substitutionsNonJustifiees(outil, {
    entrees,
    depuisMemoire,
    question,
    confirmees
  });

  // Deux sorts pour une valeur fabriquée, et les confondre coûtait cher.
  //
  // Ce **sans quoi le calcul n'a pas lieu** se demande : la contrainte de sol,
  // le H0 du département. Le reste — l'altitude que la note porte, l'arase qui
  // a une valeur par défaut, une cote imposée que personne n'a imposée — s'en
  // va sans un mot de plus. L'écran le redemandait, et six questions
  // apparaissaient là où une seule était vraiment posée : on lisait cela comme
  // « ma note n'est pas arrivée », alors qu'elle attendait, lisible, deux
  // étapes plus loin.
  //
  // Écarter n'est pas laisser passer : la valeur n'entre pas dans le calcul.
  // Ce qui la remplace est ce que le projet dit, ce que la note porte, ou la
  // valeur par défaut déclarée — trois provenances qui ont un auteur.
  const aDemander = substituees.filter((entree) => entree.requis);
  const ecartees = substituees.filter((entree) => !entree.requis);
  const jetees = new Set(ecartees.map((entree) => entree.cle));
  const proposees = Object.fromEntries(
    Object.entries(entrees ?? {}).filter(([cle]) => !jetees.has(cle))
  );

  // Ce que le modèle propose l'emporte sur la mémoire : c'est tout l'objet
  // d'une question comme « et si on passait en catégorie IV ? ». La provenance
  // n'est gardée que pour ce qui vient réellement de la mémoire.
  //
  // Entre les deux, **ce que la conversation a déjà établi**. Sans cette
  // couche, le modèle rappelait l'outil sans arguments au tour suivant — il
  // n'invente pas, c'est la règle —, l'outil redemandait la contrainte de sol,
  // et l'on tournait en rond : le formulaire revenait à chaque échange sur la
  // même note. Une contrainte de sol se donne **une fois pour tous les
  // massifs**, et pour toute la conversation.
  const fournies = avecDefauts(outil, { ...depuisMemoire, ...dejaEtablies, ...nettoyer(proposees) });
  const venuesDeLaMemoire = Object.fromEntries(
    Object.entries(provenance).filter(([cle]) => texte(proposees?.[cle]) === "")
  );
  const nomsEcartes = ecartees.map((entree) => entree.libelle);

  if (aDemander.length > 0) {
    // Ce qui n'est pas suspect reste acquis. Ne rendre que la mémoire faisait
    // disparaître la valeur que l'utilisateur venait d'écrire dans sa question
    // — « avec une contrainte de sol à 1 bar » — et le tour suivant la
    // redemandait : deux questions au lieu d'une, sur une valeur déjà donnée.
    const suspectes = new Set(aDemander.map((entree) => entree.cle));
    const legitimes = Object.fromEntries(
      Object.entries(fournies).filter(([cle]) => !suspectes.has(cle))
    );
    return {
      statut: "aConfirmer",
      outil: referenceOutil(outil),
      titre: outil.titre,
      // Pour ce qui est suspect : la mémoire, pas la proposition du modèle.
      // C'est elle qui doit rester affichée tant que personne n'a tranché.
      connues: avecDefauts(outil, { ...legitimes, ...depuisMemoire }),
      proposeParLeModele: Object.fromEntries(aDemander.map((entree) => [entree.cle, texte(entrees[entree.cle])])),
      champs: aDemander.map((entree) => ({ ...entree })),
      ecartees: nomsEcartes,
      message: phraseDesSubstitutions(aDemander, nomsEcartes)
    };
  }

  const manquantes = entreesManquantes(outil, fournies);
  if (manquantes.length > 0) {
    return {
      statut: "manquant",
      outil: referenceOutil(outil),
      titre: outil.titre,
      connues: fournies,
      champs: manquantes.map((entree) => ({ ...entree })),
      ecartees: nomsEcartes,
      message: "Le calcul n'a pas eu lieu : il manque des entrées."
    };
  }

  // `await` sur un utilitaire qui calcule sur place ne coûte rien ; il permet
  // à ceux dont le raisonnement vit au serveur — le référentiel incendie — de
  // se déclarer dans le même catalogue que les autres.
  // Ce que la conversation porte et qui n'est pas une entrée : une note de
  // calcul déposée n'est pas une valeur, c'est une source. Elle ne passe donc
  // pas par le garde-fou des substitutions — il n'y a rien à y substituer.
  const resultat = await outil.executer(fournies, { piecesJointes });
  if (!resultat?.ok) {
    return {
      statut: "refus",
      outil: referenceOutil(outil),
      titre: outil.titre,
      entrees: fournies,
      ecartees: nomsEcartes,
      message: resultat?.raison || "L'utilitaire n'a pas pu conclure."
    };
  }

  return {
    statut: "fait",
    outil: referenceOutil(outil),
    titre: outil.titre,
    source: outil.source,
    entrees: fournies,
    // Ce que le modèle avait proposé et qu'on n'a pas retenu. Le calcul a eu
    // lieu sans ces valeurs : le dire évite qu'il les repropose au tour
    // suivant, et qu'on croie qu'elles ont servi.
    ecartees: nomsEcartes,
    venuesDeLaMemoire,
    valeurs: resultat.valeurs,
    unites: Object.fromEntries((outil.sorties ?? []).map((sortie) => [sortie.cle, sortie.unite || ""])),
    ecarts: comparerALaMemoire(outil, resultat.valeurs, assertions),
    // La courbe est pour l'écran, pas pour le modèle : `sansFigure` l'enlève
    // avant l'envoi. Quarante points de spectre n'apprennent rien à un modèle
    // qui a déjà TB, TC, TD — ils ne feraient que gonfler le contexte.
    figure: typeof outil.figure === "function" ? outil.figure(fournies) : null
  };
}

/**
 * Le résultat, allégé de ce qui ne sert qu'à l'écran.
 *
 * Un modèle lit « TB = 0,06 s » ; il ne tire rien de quarante couples de
 * coordonnées, sinon le risque de les recopier. La courbe reste donc à
 * l'écran, et le contexte reste lisible.
 */
export function sansFigure(resultat) {
  if (!resultat || typeof resultat !== "object") return resultat;
  const { figure, ...reste } = resultat;
  const allege = figure ? { ...reste, figure_disponible: true } : reste;
  return sansLeDetailDesMassifs(allege);
}

/**
 * Le détail d'un massif reste à l'écran, il ne part pas au modèle.
 *
 * Les charges retenues cas par cas et les quatre ratios de chaque appui font
 * quelques milliers de caractères, et ils n'apprennent rien à un modèle qui a
 * déjà les cotes, le ratio déterminant et ce qui gouverne. Ils lui feraient en
 * revanche courir le risque de les recopier dans sa réponse — c'est-à-dire de
 * réécrire à la main ce que le calcul vient de rendre.
 *
 * Ce qui est retiré ne disparaît pas : c'est l'écran qui le montre, sous le
 * tableau, et c'est là qu'on va le lire quand un massif ne passe pas.
 */
function sansLeDetailDesMassifs(resultat) {
  const appuis = resultat?.valeurs?.appuis;
  if (!Array.isArray(appuis)) return resultat;
  return {
    ...resultat,
    valeurs: {
      ...resultat.valeurs,
      appuis: appuis.map(({ charges, correspondances, ratios, ...garde }) => ({
        ...garde,
        detail_disponible: true
      }))
    }
  };
}

/** Les entrées vides ne comptent pas : elles écraseraient la mémoire par du vide. */
function nettoyer(entrees = {}) {
  return Object.fromEntries(
    Object.entries(entrees ?? {}).filter(([, valeur]) => valeur !== null && valeur !== undefined && texte(valeur) !== "")
  );
}
