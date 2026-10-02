/**
 * Ce que devient un avis de bureau de contrôle, d'un rapport au suivant.
 *
 * ## Ce qu'on récupère, et d'où
 *
 * L'utilitaire « Suivi des avis BC » répond à cette question depuis un an, et il
 * y répond bien — mais il la pose à un moteur qui relit le corpus entier à
 * chaque fois. Le détail d'un rapport, lui, montrait les avis **de ce
 * rapport-là** et s'arrêtait là : on voyait « 23 avis suspendus » sans savoir si
 * c'étaient les mêmes que le mois dernier, ni lesquels avaient été levés depuis.
 *
 * Ce module reconstruit cette suite à partir des **lectures déjà conservées** —
 * celles que l'écran d'analyse a produites et rangées. Rien n'est relu, rien
 * n'est redemandé à un modèle : la chronologie et le devenir de chaque avis se
 * déduisent de ce qui est déjà en base.
 *
 * ## Les trois vocabulaires, et pourquoi on ne les mélange pas
 *
 * C'est la leçon de l'ancien écran, et elle est reprise telle quelle :
 *
 *  - **l'appréciation** — favorable, suspendu, défavorable — est le jugement du
 *    bureau de contrôle, et n'appartient qu'au document qui l'a écrit ;
 *  - **ce qu'un rapport apporte** — neuf, rappel, levé, rouvert — ne vaut que
 *    pour ce rapport-là, et se lit étape par étape sur la frise ;
 *  - **la vie de l'avis** — ouvert, fermé, rouvert — dit s'il reste quelque
 *    chose à faire, et c'est le vocabulaire des sujets Mdall.
 *
 * ## Ce qu'il refuse de conclure
 *
 * Un rapport **dont les avis n'ont pas été relevés** ne dit rien d'aucune
 * référence : il ne fait pas taire un avis, il n'a pas été interrogé. Le
 * confondre avec un rapport qui a été lu et qui n'en parle plus ferait dire
 * « sans nouvelles depuis mars » à un dossier dont on n'a simplement pas lu la
 * suite (règle 5).
 *
 * Et un avis **sans nouvelles n'est pas un avis levé**. Personne ne l'a refermé ;
 * il a cessé de paraître, ce qui est une question, pas une réponse.
 */

import { leSensDeLaMarque } from "./la-lecture-dun-rapport.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/**
 * Ce qu'une marque implique, par son code.
 *
 * **Ces tables viennent de l'écran de suivi**, où elles vivaient ; les deux
 * écrans les tiennent maintenant d'ici. Les mots rendus — `ok`, `pending`… —
 * sont ceux de ses modificateurs de style : les traduire ici aurait demandé de
 * retoucher sa feuille de style pour une question qui n'est pas la sienne.
 */
const CE_QUE_VAUT_LE_CODE = {
  F: "ok",
  C: "ok",
  SO: "neutral",
  HM: "neutral",
  PM: "info",
  S: "pending",
  D: "danger",
  NC: "danger"
};

/** Un rapport lu ligne à ligne écrit le libellé en toutes lettres, sans code. */
const CE_QUE_VAUT_LE_LIBELLE = {
  FAVORABLE: "ok",
  CONFORME: "ok",
  "SANS OBJET": "neutral",
  "HORS MISSION": "neutral",
  "POUR MEMOIRE": "info",
  SUSPENDU: "pending",
  DEFAVORABLE: "danger",
  "NON CONFORME": "danger"
};

/**
 * Ce qu'implique une appréciation : `ok`, `neutral`, `info`, `pending`,
 * `danger`, ou `unknown` quand on ne sait pas.
 *
 * **`unknown` est une réponse**, et non un défaut à combler : une marque qu'aucune
 * légende ne déclare ne doit pas être rangée du côté rassurant parce qu'il fallait
 * bien la ranger quelque part (règle 5).
 */
export function ceQueVautLappreciation(code, libelle = null) {
  const parLeCode = CE_QUE_VAUT_LE_CODE[String(code ?? "").toUpperCase()];
  if (parLeCode) return parLeCode;

  const cle = String(libelle ?? code ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
  return CE_QUE_VAUT_LE_LIBELLE[cle] ?? "unknown";
}

/** Les trois états de la vie d'un avis. Ceux des sujets, pour la même notion. */
export const LA_VIE_DUN_AVIS = {
  OUVERT: { label: "ouvert", tone: "open" },
  FERME: { label: "fermé", tone: "closed" },
  ROUVERT: { label: "réouvert", tone: "open" }
};

/**
 * Où en est un avis, qu'il porte un numéro ou non.
 *
 * Un avis favorable, sans objet, hors mission ou pour mémoire n'appelle aucune
 * action : il est clos dès sa première écriture. Seuls suspendu, défavorable et
 * non conforme laissent quelque chose d'ouvert. Un avis sans nouvelles, lui,
 * n'a jamais été refermé : personne n'en a rien dit, et il reste ouvert.
 */
export function laVieDunAvis(code, libelle, etat = null, rouvert = false) {
  if (etat === "RESOLVED") return LA_VIE_DUN_AVIS.FERME;
  if (etat === "OPEN" || etat === "NO_NEWS") {
    return rouvert ? LA_VIE_DUN_AVIS.ROUVERT : LA_VIE_DUN_AVIS.OUVERT;
  }

  const vaut = ceQueVautLappreciation(code, libelle);
  const tranche = vaut !== "pending" && vaut !== "danger" && vaut !== "unknown";
  return tranche ? LA_VIE_DUN_AVIS.FERME : LA_VIE_DUN_AVIS.OUVERT;
}

/** Ce qu'un rapport apporte à un avis. Ne vaut que pour ce rapport-là. */
export const CE_QUE_LE_RAPPORT_APPORTE = {
  NEUF: "neuf",
  RAPPEL: "rappel",
  LEVE: "levé",
  ROUVERT: "rouvert"
};

/**
 * Une lecture ramenée à ce qui sert à suivre un avis.
 *
 * `avis: null` — et non `[]` — quand l'étape n'a pas eu lieu. Toute la suite en
 * dépend : c'est ce qui distingue « ce rapport n'en parle plus » de « on n'a pas
 * lu ses avis ».
 */
function uneLecture(ligne) {
  const gelee = ligne?.analyse_gelee?.lecture ?? null;
  const avis = Array.isArray(ligne?.avis) ? ligne.avis
    : Array.isArray(gelee?.avis) ? gelee.avis
    : null;

  return {
    id: texte(ligne?.id),
    document: texte(ligne?.document) || texte(gelee?.nom),
    numero: texte(ligne?.numero_de_rapport),
    etabliLe: texte(ligne?.etabli_le),
    legende: liste(ligne?.legende).length ? ligne.legende : liste(gelee?.legende),
    avis
  };
}

/**
 * Les lectures dans l'ordre où les rapports ont été émis.
 *
 * **Par la date d'émission, et non par celle de la lecture.** On relit un vieux
 * rapport après un récent tous les jours ; suivre l'ordre des lectures ferait
 * « lever » un avis par un rapport antérieur à celui qui l'avait soulevé.
 *
 * Une lecture sans date d'émission ne peut pas se placer : elle est écartée de la
 * frise et comptée à part — l'insérer au hasard fabriquerait une suite fausse, et
 * la taire ferait croire que le dossier est complet (règle 5).
 */
export function lesRapportsEnOrdre(lignes = []) {
  const lues = liste(lignes).map(uneLecture);

  return {
    dates: lues.filter((une) => une.etabliLe)
      .sort((une, autre) => une.etabliLe.localeCompare(autre.etabliLe)),
    sansDate: lues.filter((une) => !une.etabliLe)
  };
}

/** La clé qui suit un avis d'un rapport au suivant. */
function laReference(un) {
  return texte(un?.reference);
}

/**
 * Ce qu'un rapport apporte à un avis qu'on suivait déjà.
 *
 * @param {boolean} ouvertAvant l'avis restait-il ouvert avant ce rapport
 * @param {boolean} ouvertApres l'est-il encore après
 */
function ceQuApporte(ouvertAvant, ouvertApres) {
  if (ouvertAvant && !ouvertApres) return CE_QUE_LE_RAPPORT_APPORTE.LEVE;
  if (!ouvertAvant && ouvertApres) return CE_QUE_LE_RAPPORT_APPORTE.ROUVERT;
  return CE_QUE_LE_RAPPORT_APPORTE.RAPPEL;
}

/**
 * La suite de chaque avis, à travers les lectures conservées d'un chantier.
 *
 * @param {object[]} lignes les lectures de rapports, dans n'importe quel ordre
 * @returns {{rapports, avis, sansReference, sansDate, muets}}
 */
export function laSuiteDesAvis(lignes = []) {
  const { dates: rapports, sansDate } = lesRapportsEnOrdre(lignes);

  /** Les rapports dont on a bien relevé les avis : eux seuls peuvent faire silence. */
  const interroges = rapports.filter((un) => Array.isArray(un.avis));

  const suivis = new Map();
  let sansReference = 0;

  for (const rapport of interroges) {
    for (const un of rapport.avis) {
      const reference = laReference(un);
      // **Un avis sans numéro ne se suit pas**, et on ne le suit donc pas par son
      // intitulé : deux lignes qui se ressemblent dans deux rapports ne sont pas
      // la même question, et les confondre inventerait une levée.
      if (!reference) { sansReference += 1; continue; }

      const marque = texte(un?.marque);
      const sens = leSensDeLaMarque(marque, rapport.legende);
      const ouvertApres = laVieDunAvis(marque, sens) === LA_VIE_DUN_AVIS.OUVERT;

      const deja = suivis.get(reference);
      if (!deja) {
        suivis.set(reference, {
          reference,
          intitule: texte(un?.intitule),
          ouvert: ouvertApres,
          rouvert: false,
          etapes: [{
            rapportId: rapport.id,
            document: rapport.document,
            numero: rapport.numero,
            etabliLe: rapport.etabliLe,
            marque,
            sens,
            vaut: ceQueVautLappreciation(marque, sens),
            constat: texte(un?.constat),
            ou: texte(un?.ou),
            apporte: CE_QUE_LE_RAPPORT_APPORTE.NEUF
          }]
        });
        continue;
      }

      const apporte = ceQuApporte(deja.ouvert, ouvertApres);
      if (apporte === CE_QUE_LE_RAPPORT_APPORTE.ROUVERT) deja.rouvert = true;
      deja.ouvert = ouvertApres;
      // L'intitulé le plus récent gagne : un rapport reformule, et c'est sa
      // formulation d'aujourd'hui qu'on va retrouver dans le document.
      if (texte(un?.intitule)) deja.intitule = texte(un.intitule);

      deja.etapes.push({
        rapportId: rapport.id,
        document: rapport.document,
        numero: rapport.numero,
        etabliLe: rapport.etabliLe,
        marque,
        sens,
        vaut: ceQueVautLappreciation(marque, sens),
        constat: texte(un?.constat),
        ou: texte(un?.ou),
        apporte
      });
    }
  }

  const dernier = interroges[interroges.length - 1] ?? null;

  const avis = [...suivis.values()].map((un) => {
    const derniereEtape = un.etapes[un.etapes.length - 1];
    /**
     * **Sans nouvelles, et non levé.** Un avis que le dernier rapport ne reprend
     * pas n'a été refermé par personne. C'est la distinction qui fait tout le
     * suivi : un dossier « 0 avis ouvert » obtenu par oubli n'est pas un dossier
     * soldé (règle 5).
     */
    const sansNouvelles = Boolean(dernier)
      && derniereEtape.rapportId !== dernier.id
      && un.ouvert;

    return {
      reference: un.reference,
      intitule: un.intitule,
      etapes: un.etapes,
      sansNouvelles,
      depuis: sansNouvelles ? derniereEtape.etabliLe : "",
      vie: laVieDunAvis(
        derniereEtape.marque, derniereEtape.sens,
        un.ouvert ? "OPEN" : "RESOLVED", un.rouvert
      )
    };
  });

  // L'ordre de lecture : ce qui reste ouvert d'abord, puis par référence. Un
  // tableau trié par numéro noierait les trois avis à traiter dans deux cents
  // lignes closes.
  avis.sort((une, autre) => {
    const ouverte = une.vie !== LA_VIE_DUN_AVIS.FERME;
    const ouvertAutre = autre.vie !== LA_VIE_DUN_AVIS.FERME;
    if (ouverte !== ouvertAutre) return ouverte ? -1 : 1;
    return une.reference.localeCompare(autre.reference, "fr", { numeric: true });
  });

  return {
    rapports,
    avis,
    sansReference,
    sansDate,
    /** Les rapports datés dont les avis n'ont pas été relevés : ils ne disent rien. */
    muets: rapports.filter((un) => !Array.isArray(un.avis))
  };
}

/**
 * Ce que la suite dit en une phrase, ou `""` quand il n'y a rien à dire.
 *
 * **Les sans-nouvelles ne se noient pas dans les ouverts.** Ce sont eux qu'on
 * vient chercher : un avis ouvert dont le dernier rapport parle est suivi, un
 * avis ouvert dont plus personne ne parle est perdu de vue.
 */
export function phraseDeLaSuite(suite = null) {
  const avis = liste(suite?.avis);
  if (!avis.length) return "";

  const ouverts = avis.filter((un) => un.vie !== LA_VIE_DUN_AVIS.FERME).length;
  const perdus = avis.filter((un) => un.sansNouvelles).length;

  return [
    `${avis.length} avis suivi${avis.length > 1 ? "s" : ""} sur ${
      liste(suite?.rapports).length} rapport${liste(suite?.rapports).length > 1 ? "s" : ""}`,
    `${ouverts} encore ouvert${ouverts > 1 ? "s" : ""}`,
    perdus ? `${perdus} sans nouvelles` : ""
  ].filter(Boolean).join(" · ");
}
