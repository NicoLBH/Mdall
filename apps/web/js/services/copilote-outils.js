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

import { getSeismicSizingValues } from "./seismic-spectrum.js";
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
export function executerOutil({ id = "", entrees = {}, assertions = [] } = {}) {
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
    ecarts: comparerALaMemoire(outil, resultat.valeurs, assertions)
  };
}

/** Les entrées vides ne comptent pas : elles écraseraient la mémoire par du vide. */
function nettoyer(entrees = {}) {
  return Object.fromEntries(
    Object.entries(entrees ?? {}).filter(([, valeur]) => valeur !== null && valeur !== undefined && texte(valeur) !== "")
  );
}
