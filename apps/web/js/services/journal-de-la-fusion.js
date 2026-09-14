/**
 * Ce qu'une fusion fait, étape par étape, et ce que chacune a pris.
 *
 * ## Ce qu'on ne savait pas dire
 *
 * Fusionner une proposition n'est pas un geste : c'en est une douzaine. On
 * gèle, on fait entrer les documents, on écrit la mémoire, on ouvre les lots,
 * les sociétés, les sujets, on pose les labels et les jalons, on enregistre les
 * reprises, on ferme ce qui est soldé, on réécrit le suivi des avis. Sur un
 * compte rendu de chantier, cela prend une minute et demie.
 *
 * Pendant cette minute et demie, l'écran affichait une roue et une phrase. Et
 * après, plus rien : aucune trace de ce qui avait eu lieu, ni de ce qui avait
 * échoué en chemin. Une fusion qui ne laisse pas de journal demande qu'on la
 * croie sur parole — sur le geste le plus lourd de tout le procédé.
 *
 * ## Ce que ce module est, et ce qu'il n'est pas
 *
 * Un **chronomètre à carnets**. Chaque étape ouvre le sien, y consigne ce
 * qu'elle fait, et le referme en disant si elle a tenu. Il n'écrit nulle part,
 * n'appelle rien, ne connaît ni la base ni l'écran : des appels entrent, des
 * étapes sortent — `{id, label, ms, statut, lignes}`, exactement la forme que
 * l'onglet Actions sait déjà lire.
 *
 * C'est la même forme que celle d'une analyse, et c'est délibéré : deux
 * journaux de formes différentes auraient demandé deux écrans pour les lire
 * (`docs/fondamentaux.md`, règle 4).
 *
 * ## Une étape qui échoue n'arrête pas le chronomètre
 *
 * Parce qu'une fusion ne s'arrête pas non plus : les documents sont entrés, le
 * reste se rattrape. Le journal enregistre l'échec, le dit dans son étape, et
 * la suite continue de se mesurer. Marquer « non atteinte » ce qui a bel et
 * bien eu lieu serait un mensonge de plus.
 *
 * Un journal qui ferait échouer la fusion qu'il observe serait pire que pas de
 * journal du tout : rien ici ne lève d'exception.
 */

import { NIVEAU, STATUT, journal } from "./run-journal.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une exécution de ce genre fait au projet. Une fusion, aujourd'hui. */
export const GESTE = {
  FUSION: "fusion"
};

/**
 * Les étapes d'une fusion, dans l'ordre où elles se produisent.
 *
 * **Nommées ici, et pas au fil du code.** Elles se lisent dans l'onglet Actions
 * comme un chemin d'exécution : une étape renommée à un endroit et pas à
 * l'autre ferait deux histoires du même geste. Les identifiants, eux, ne
 * bougent plus — ce sont eux qu'un journal déjà écrit porte.
 */
export const ETAPES_DE_LA_FUSION = [
  ["gel", "Proposition gelée"],
  ["corpus", "Documents entrés au corpus"],
  ["rattachements", "Rattachements versés"],
  ["memoire", "Mémoire du projet écrite"],
  ["lots", "Lots ouverts"],
  ["intervenants", "Sociétés ajoutées"],
  ["sujets", "Sujets ouverts"],
  // Les reprises d'un compte rendu s'écrivent avec les sujets qu'elles
  // concernent : elles n'ont pas d'étape à elles, et en inventer une qui ne se
  // produit jamais ferait un chemin d'exécution plus long que le vrai.
  ["secretariat", "Ce que le compte rendu dit"],
  ["suivi", "Suivi des avis réécrit"],
  ["tableau", "Avant / après relu"]
];

const LIBELLES = new Map(ETAPES_DE_LA_FUSION);

/**
 * Un chronomètre qui tient un carnet par étape.
 *
 * @param {{horloge?: () => number}} [options] `horloge` rend des millisecondes.
 *   Injectée pour que la mesure se vérifie sans attendre : un test qui
 *   dormirait pour mesurer une durée mesurerait le sommeil.
 */
export function chronoDeLaFusion({ horloge = () => Date.now() } = {}) {
  const etapes = [];
  const debutTotal = horloge();

  /**
   * Ouvre une étape et rend son carnet.
   *
   * L'étape est ajoutée **dès l'ouverture** : une fusion interrompue laisse
   * ainsi voir où elle en était, plutôt qu'un journal qui s'arrête sans dire
   * qu'il s'arrête.
   */
  function etape(id, label = "") {
    const cle = texte(id);
    const carnet = journal();
    const debut = horloge();

    const ligne = {
      id: cle,
      label: texte(label) || LIBELLES.get(cle) || cle,
      // `null` n'est pas zéro : tant qu'elle n'est pas finie, elle n'a pas de
      // durée, et l'écran affiche un tiret plutôt qu'un « 0 ms » faux.
      ms: null,
      statut: STATUT.OK,
      lignes: null
    };
    etapes.push(ligne);

    const fini = (statut = STATUT.OK) => {
      ligne.ms = Math.max(0, horloge() - debut);
      ligne.lignes = carnet.lignes();
      // Le statut se déduit de ce qui a été écrit, comme pour un groupe : une
      // étape qui a consigné un échec est en échec, quoi qu'en dise l'appelant.
      ligne.statut = ligne.lignes.some((l) => l?.niveau === NIVEAU.ECHEC) ? STATUT.ECHEC : statut;
      return ligne;
    };

    return {
      dire: (quoi) => { carnet.dire(quoi); },
      avertir: (quoi) => { carnet.avertir(quoi); },
      echouer: (quoi) => { carnet.echouer(quoi); },
      groupe: (titre, remplir) => { carnet.groupe(titre, remplir); },
      fini,
      /** Ce qu'on écrit quand une étape a jeté : le message, puis l'échec. */
      rate: (erreur) => {
        carnet.echouer(texte(erreur?.message ?? erreur) || "La base n'a pas répondu.");
        return fini(STATUT.ECHEC);
      }
    };
  }

  return {
    etape,
    /** Les étapes telles qu'elles seront conservées. */
    etapes: () => etapes.map((ligne) => ({ ...ligne })),
    /** Le temps total, du premier appel à maintenant. */
    ms: () => Math.max(0, horloge() - debutTotal)
  };
}

/**
 * Ce qu'une fusion a valu, en un mot.
 *
 * `echec` dès qu'une étape n'a pas tenu — et non « partiel » : les documents
 * sont bien entrés, mais quelque chose n'a pas été écrit, et c'est cela qu'on
 * doit voir dans la liste sans ouvrir le détail.
 */
export function statutDeLaFusion(etapes = []) {
  const toutes = Array.isArray(etapes) ? etapes : [];
  return toutes.some((etape) => etape?.statut === STATUT.ECHEC) ? STATUT.ECHEC : STATUT.OK;
}

/**
 * Ce que la fusion a fait, en une phrase.
 *
 * **Ce qui a été écrit, pas ce qui a été tenté.** La ligne de l'onglet Actions
 * est ce qu'on lit avant d'ouvrir : elle doit dire le résultat, et nommer
 * l'échec quand il y en a un.
 */
export function resumeDeLaFusion(etapes = []) {
  const toutes = Array.isArray(etapes) ? etapes : [];
  const rates = toutes.filter((etape) => etape?.statut === STATUT.ECHEC);

  if (toutes.length === 0) return "Aucune étape enregistrée.";

  if (rates.length > 0) {
    return `${rates.length} étape${rates.length > 1 ? "s" : ""} sur ${toutes.length} `
      + `n'${rates.length > 1 ? "ont" : "a"} pas abouti : ${
        rates.map((etape) => texte(etape.label)).filter(Boolean).join(", ")}.`;
  }

  return `${toutes.length} étapes, toutes abouties.`;
}

/**
 * Le nom d'une exécution de fusion, dans la liste des actions.
 *
 * Il porte le numéro de la proposition : c'est par lui qu'on remonte du journal
 * à la décision qui l'a produit, et « Fusion » tout court ne distinguerait pas
 * deux fusions du même jour.
 */
export function nomDeLaFusion(proposition = null) {
  const numero = Number(proposition?.number);
  return Number.isFinite(numero) && numero > 0
    ? `Fusion de la proposition #${numero}`
    : "Fusion d'une proposition";
}
