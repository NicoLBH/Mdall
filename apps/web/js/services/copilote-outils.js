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
 * Le catalogue des outils appelables.
 *
 * Chacun déclare **ce qu'il tranche**, ses entrées et ses sorties. La
 * déclaration sert trois fois, et c'est voulu : elle décrit l'outil au modèle,
 * elle construit le formulaire à l'écran, et elle vérifie les entrées avant le
 * calcul. Trois descriptions séparées auraient divergé au premier ajout.
 *
 * `depuisMemoire` nomme la clé sous laquelle la mémoire du projet porte déjà
 * cette valeur. C'est ce qui évite de demander à quelqu'un ce que son propre
 * projet a déjà tranché.
 */
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
        depuisMemoire: "h0-hors-gel",
        aide: "Valeur départementale. Quand le département en offre plusieurs, c'est une décision, pas une déduction."
      },
      {
        cle: "altitude",
        libelle: "Altitude du site",
        type: "nombre",
        unite: "m",
        requis: true,
        depuisMemoire: "altitude",
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
        depuisMemoire: "zone-sismique",
        aide: "1 très faible à 5 forte, au sens du zonage réglementaire français."
      },
      {
        cle: "importanceCategory",
        libelle: "Catégorie d'importance",
        type: "choix",
        valeurs: ["I", "II", "III", "IV"],
        requis: true,
        depuisMemoire: "categorie-importance",
        aide: "I à IV au sens de l'arrêté du 22 octobre 2010."
      },
      {
        cle: "soilClass",
        libelle: "Classe de sol",
        type: "choix",
        valeurs: ["A", "B", "C", "D", "E"],
        requis: true,
        depuisMemoire: "classe-de-sol",
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
  }
];

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
    const cle = texte(assertion?.subject_key);
    if (cle && !parCle.has(cle)) parCle.set(cle, assertion);
  }

  const rempli = {};
  const provenance = {};

  for (const entree of outil?.entrees ?? []) {
    if (!entree.depuisMemoire) continue;
    const assertion = parCle.get(entree.depuisMemoire);
    const valeur = texte(assertion?.payload?.value);
    if (!valeur) continue;

    rempli[entree.cle] = valeur;
    provenance[entree.cle] = {
      cle: entree.depuisMemoire,
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

  const echappee = cherchee.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const drapeaux = cherchee.length <= 2 ? "" : "i";

  // `\b` ne borne pas les accents ni les symboles : on borne à la main sur ce
  // qui n'est ni lettre ni chiffre.
  return new RegExp(`(^|[^\\p{L}\\p{N}])${echappee}($|[^\\p{L}\\p{N}])`, `u${drapeaux}`).test(source);
}

/**
 * Les substitutions que rien ne justifie.
 *
 * Une entrée que le modèle donne différente de la mémoire, sans que
 * l'utilisateur l'ait écrite ni confirmée. C'est le cas de « change la classe
 * de sol » suivi d'un « A » venu de nulle part.
 */
export function substitutionsNonJustifiees(outil, { entrees = {}, depuisMemoire = {}, question = "", confirmees = [] } = {}) {
  const validees = new Set(Array.isArray(confirmees) ? confirmees : []);

  return (outil?.entrees ?? []).filter((entree) => {
    const proposee = texte(entrees?.[entree.cle]);
    if (!proposee) return false;

    // Trois façons légitimes pour une valeur d'arriver là. En dehors d'elles,
    // le modèle l'a fabriquée.
    if (validees.has(entree.cle)) return false;                       // quelqu'un l'a cliquée
    if (texte(depuisMemoire?.[entree.cle]) === proposee) return false; // le projet la porte
    if (valeurCiteePar(question, proposee)) return false;             // quelqu'un l'a écrite

    return true;
  });
}

/**
 * Les entrées requises qui manquent encore.
 *
 * Une valeur hors des choix déclarés compte comme manquante : accepter « 2b »
 * pour une zone sismique ferait calculer sur autre chose que ce qui a été
 * demandé, et le résultat aurait l'air d'un résultat.
 */
export function entreesManquantes(outil, entrees = {}) {
  return (outil?.entrees ?? []).filter((entree) => {
    if (!entree.requis) return false;

    const valeur = entrees?.[entree.cle];
    if (valeur === null || valeur === undefined || texte(valeur) === "") return true;
    if (entree.valeurs && !entree.valeurs.includes(texte(valeur))) return true;
    if (entree.type === "nombre" && nombre(valeur) === null) return true;

    return false;
  });
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
    if (!sortie.depuisMemoire) continue;

    const assertion = courantes.find((entree) => texte(entree?.subject_key) === sortie.depuisMemoire);
    if (!assertion) continue;

    const tenue = nombre(assertion?.payload?.value);
    const calculee = nombre(valeurs?.[sortie.cle]);
    if (tenue === null || calculee === null) continue;

    // Une comparaison de flottants au dixième près : deux valeurs qui ne
    // diffèrent qu'au quinzième chiffre ne sont pas un désaccord, c'est de
    // l'arithmétique binaire.
    if (Math.abs(tenue - calculee) < 1e-9) continue;

    ecarts.push({
      sujet: sortie.libelle,
      cleMemoire: sortie.depuisMemoire,
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
export function executerOutil({ id = "", entrees = {}, assertions = [], question = "", confirmees = [] } = {}) {
  const outil = outilParId(id);
  if (!outil) {
    return { statut: "inconnu", id: texte(id), message: `Aucun utilitaire ne porte le nom « ${texte(id)} ».` };
  }

  const { valeurs: depuisMemoire, provenance } = prefillDepuisMemoire(outil, assertions);
  // Ce que le modèle propose l'emporte sur la mémoire : c'est tout l'objet
  // d'une question comme « et si on passait en catégorie IV ? ». La provenance
  // n'est gardée que pour ce qui vient réellement de la mémoire.
  const fournies = avecDefauts(outil, { ...depuisMemoire, ...nettoyer(entrees) });
  const venuesDeLaMemoire = Object.fromEntries(
    Object.entries(provenance).filter(([cle]) => texte(entrees?.[cle]) === "")
  );

  // Avant de regarder ce qui manque : ce qui a été **remplacé sans raison**.
  // Une valeur inventée n'a pas l'air de manquer, et c'est bien le problème.
  const substituees = substitutionsNonJustifiees(outil, {
    entrees,
    depuisMemoire,
    question,
    confirmees
  });

  if (substituees.length > 0) {
    return {
      statut: "aConfirmer",
      outil: referenceOutil(outil),
      titre: outil.titre,
      // La mémoire, pas la proposition du modèle : c'est elle qui doit rester
      // affichée tant que personne n'a tranché autrement.
      connues: avecDefauts(outil, { ...depuisMemoire }),
      proposeParLeModele: Object.fromEntries(substituees.map((entree) => [entree.cle, texte(entrees[entree.cle])])),
      champs: substituees.map((entree) => ({ ...entree })),
      message:
        "Le calcul n'a pas eu lieu : une valeur a été remplacée sans que personne l'ait dite. "
        + "Il faut la demander avant de calculer."
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
      message: "Le calcul n'a pas eu lieu : il manque des entrées."
    };
  }

  const resultat = outil.executer(fournies);
  if (!resultat?.ok) {
    return {
      statut: "refus",
      outil: referenceOutil(outil),
      titre: outil.titre,
      entrees: fournies,
      message: resultat?.raison || "L'utilitaire n'a pas pu conclure."
    };
  }

  return {
    statut: "fait",
    outil: referenceOutil(outil),
    titre: outil.titre,
    source: outil.source,
    entrees: fournies,
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
  return figure ? { ...reste, figure_disponible: true } : reste;
}

/** Les entrées vides ne comptent pas : elles écraseraient la mémoire par du vide. */
function nettoyer(entrees = {}) {
  return Object.fromEntries(
    Object.entries(entrees ?? {}).filter(([, valeur]) => valeur !== null && valeur !== undefined && texte(valeur) !== "")
  );
}
