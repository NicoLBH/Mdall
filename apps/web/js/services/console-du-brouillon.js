/**
 * La console du bac d'essai : tout ce que l'écran a à dire, au même endroit.
 *
 * ## Le défaut que ça répare
 *
 * Les messages étaient éparpillés en quatre blocs, chacun dans sa forme et à sa
 * place : les remarques de la vérification sous les volets, ce que le modèle
 * n'a pas su écrire sous la zone de gauche, ce qu'une fonction ne sait pas dans
 * le bac, ce qui reste dehors sous « Proposer au projet ». Quatre fois la même
 * question — **qu'est-ce qui ne va pas ?** — et quatre endroits où chercher.
 *
 * On lisait donc l'écran de haut en bas pour savoir si quelque chose clochait,
 * et l'on ratait celui des quatre qu'on n'avait pas déplié.
 *
 * ## Une console, et elle se lit comme celle d'un navigateur
 *
 * Une ligne par message, la plus grave en tête, chacune avec **où** (le fichier
 * et la ligne, quand on les connaît), **quoi** en un mot, et ce qui se dit. Le
 * reste de l'écran garde ce qui n'est pas un message : les valeurs, les
 * verdicts, les boutons.
 *
 * ## Ce module ne sait rien de l'écran
 *
 * Des états entrent, des lignes sortent. Il ne dessine rien, ne lit ni le DOM
 * ni le réseau, et se vérifie sans navigateur.
 */

import { MOTS_DE_LENNUI, verifierLeBrouillon } from "./verification-du-brouillon.js";
import { ISSUE, lancerLeBrouillon } from "./bac-dessai.js";
import { PHRASES_DU_REFUS } from "./le-mdall-rendu.js";
import { ECARTE, aProposerDuBrouillon, phraseDeLEcart } from "./proposition-du-brouillon.js";
import { FICHIERS_DU_BROUILLON } from "./brouillon-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce que pèse une ligne de console.
 *
 * **Trois niveaux, pas cinq.** Un écran qui distingue « avertissement » de
 * « information » fait trier au lecteur une nuance qu'il n'a pas demandée ; ce
 * qu'il veut savoir, c'est ce qui l'empêche d'avancer, ce qui l'attend, et ce
 * qui est fait.
 */
export const NIVEAU = {
  /** Rien ne s'est passé, et il faut faire quelque chose. */
  REFUS: "refus",
  /** Ça marche, mais quelque chose manque ou ne se lit pas. */
  REMARQUE: "remarque",
  /** Ce qui a eu lieu, et qu'on garde pour la trace. */
  FAIT: "fait"
};

/** L'ordre de lecture : le plus grave d'abord. */
const RANG = { [NIVEAU.REFUS]: 0, [NIVEAU.REMARQUE]: 1, [NIVEAU.FAIT]: 2 };

/** D'où vient une ligne. C'est ce qui permet de la retrouver dans l'écran. */
export const SOURCE = {
  VERIFICATION: "verification",
  TRANSCRIPTION: "transcription",
  LANCEMENT: "lancement",
  PROPOSITION: "proposition"
};

export const MOTS_DE_LA_SOURCE = {
  [SOURCE.VERIFICATION]: "lecture",
  [SOURCE.TRANSCRIPTION]: "coder",
  [SOURCE.LANCEMENT]: "lancer",
  [SOURCE.PROPOSITION]: "proposer"
};

/** Une ligne de console, dans la forme que l'écran dessine. */
function ligne({ niveau, source, quoi = "", dit = "", fichier = "", rang = 0 }) {
  return {
    niveau,
    source,
    /** Le mot qui dit ce que c'est. Jamais un code : personne ne lit un code. */
    quoi: texte(quoi),
    dit: texte(dit),
    /** Où cela se passe, quand on le sait. Vide sinon — on n'invente pas. */
    fichier: texte(fichier),
    ligne: Number(rang) || 0
  };
}

/**
 * Ce que la vérification a relevé.
 *
 * Des remarques, jamais des refus : un brouillon à demi juste se corrige, et
 * rien ne bloque. C'est déjà ce que la vérification dit d'elle-même.
 */
function lignesDeLaVerification(fichiers) {
  return verifierLeBrouillon(fichiers).map((remarque) => ligne({
    niveau: NIVEAU.REMARQUE,
    source: SOURCE.VERIFICATION,
    quoi: MOTS_DE_LENNUI[remarque.quoi] ?? remarque.quoi,
    dit: remarque.dit,
    fichier: remarque.fichier,
    rang: remarque.ligne
  }));
}

/**
 * Ce que la transcription a donné — et ce qu'elle n'a pas su écrire.
 *
 * **Les lacunes sont la moitié de ce qu'on vient chercher.** Une phrase du
 * français qui disparaît sans un mot laisse croire qu'elle a été codée.
 */
function lignesDeLaTranscription(rendu) {
  if (!rendu) return [];

  if (!rendu.ok) {
    return [ligne({
      niveau: NIVEAU.REFUS,
      source: SOURCE.TRANSCRIPTION,
      quoi: "pas transcrit",
      // La phrase du motif, et la panne que le serveur a nommée quand il en a
      // nommé une. Vide sinon : on n'invente pas d'explication (règle 5).
      dit: [PHRASES_DU_REFUS[rendu.motif] ?? PHRASES_DU_REFUS.en_panne, texte(rendu.panne)]
        .filter(Boolean).join(" — ")
    })];
  }

  const lignes = (rendu.lacunes ?? []).map((lacune) => ligne({
    niveau: NIVEAU.REMARQUE,
    source: SOURCE.TRANSCRIPTION,
    quoi: "pas su écrire",
    dit: `« ${lacune.phrase} » — ${lacune.pourquoi || "sans raison donnée"}`
  }));

  if (rendu.coupee) {
    lignes.push(ligne({
      niveau: NIVEAU.REMARQUE,
      source: SOURCE.TRANSCRIPTION,
      quoi: "réponse coupée",
      dit: "La réponse a été coupée : il en manque, et ce qui est arrivé a été payé."
    }));
  }

  if (rendu.temperature === null) {
    lignes.push(ligne({
      niveau: NIVEAU.REMARQUE,
      source: SOURCE.TRANSCRIPTION,
      quoi: "pas reproductible",
      dit: "Le modèle a refusé qu'on lui fixe une température : la même phrase peut rendre autre chose."
    }));
  }

  /**
   * **Une transcription sans une seule fonction se dit.**
   *
   * Le défaut tel qu'il s'est vu : « Si nature des volets = bois alors couleur
   * des volets = violet ». Le modèle a rendu les deux déclarations, aucune
   * règle, et **n'a rien déclaré n'avoir su écrire**. La console annonçait
   * « 1 fichier écrit », ce qui se lit comme une réussite — et l'on cherchait
   * son raisonnement dans un onglet vide.
   *
   * Ce n'est pas toujours une faute : « l'altitude du site est 890 m » est une
   * donnée, pas une règle. La ligne le dit donc sans accuser, et laisse juge
   * celui qui vient d'écrire la phrase (règle 5).
   */
  const REGLES = FICHIERS_DU_BROUILLON[1].nom;
  if (!rendu.fichiers.some((un) => texte(un?.nom) === REGLES)) {
    lignes.push(ligne({
      niveau: NIVEAU.REMARQUE,
      source: SOURCE.TRANSCRIPTION,
      quoi: "aucune règle",
      ou: REGLES,
      dit: (rendu.lacunes ?? []).length
        ? `Aucune fonction écrite dans ${REGLES} : voyez ce que le modèle dit n'avoir pas su écrire.`
        : `Aucune fonction écrite dans ${REGLES}, et rien de déclaré comme non écrit.`
          + " Si votre phrase porte une règle, relancez « Coder » ou écrivez-la à la main."
    }));
  }

  lignes.push(ligne({
    niveau: NIVEAU.FAIT,
    source: SOURCE.TRANSCRIPTION,
    quoi: "transcrit",
    dit: `${rendu.fichiers.length} ${rendu.fichiers.length > 1 ? "fichiers écrits" : "fichier écrit"}`
      + " — relisez : rien n'est encore versé."
  }));

  return lignes;
}

/**
 * Ce que le lancement a répondu.
 *
 * **Les indécidables passent devant**, et c'est tout l'intérêt de l'écran : une
 * règle qui conclut a fait son travail, une règle qui ne sait pas dit qu'il
 * manque quelque chose.
 */
function lignesDuLancement(fichiers, reponses) {
  return lancerLeBrouillon(fichiers, reponses).map((resultat) => {
    if (resultat.issue === ISSUE.INDECIDABLE) {
      // Ce qui manque, nommé. « Ne sait pas » sans dire de quoi renverrait à
      // relire la règle pour trouver l'entrée vide.
      const manque = (resultat.manquants ?? []).map(texte).filter(Boolean);
      return ligne({
        niveau: NIVEAU.REMARQUE,
        source: SOURCE.LANCEMENT,
        quoi: "ne sait pas",
        dit: manque.length
          ? `« ${resultat.sujet} » : il manque ${manque.join(", ")}.`
          : `« ${resultat.sujet} » : ${(resultat.doutes ?? [])[0] || "une entrée manque."}`,
        fichier: resultat.fichier,
        rang: resultat.ligne
      });
    }

    if (resultat.issue === ISSUE.AU_SERVEUR) {
      return ligne({
        niveau: NIVEAU.FAIT,
        source: SOURCE.LANCEMENT,
        quoi: "appelle un agent",
        dit: `« ${resultat.sujet} » : sa loi n'est pas dans le texte, elle s'appelle.`,
        fichier: resultat.fichier,
        rang: resultat.ligne
      });
    }

    return ligne({
      niveau: NIVEAU.FAIT,
      source: SOURCE.LANCEMENT,
      quoi: resultat.issue === ISSUE.TIENT ? "conclut" : "conclut par défaut",
      dit: `« ${resultat.sujet} » ${resultat.valeur ? `= ${resultat.valeur}` : "ne dit rien"}`,
      fichier: resultat.fichier,
      rang: resultat.ligne
    });
  });
}

/** Ce que la proposition emporterait, et ce qui reste dehors. */
function lignesDeLaProposition(fichiers, depot) {
  const { affirmations, sansRetour } = aProposerDuBrouillon(fichiers);

  const lignes = sansRetour
    // **Une ligne illisible est déjà dite par la vérification**, au même
    // endroit et mieux. La redire ici ferait deux lignes de console pour un
    // seul défaut, et c'est exactement l'éparpillement qu'on répare — il aurait
    // seulement changé de place.
    .filter((ecart) => ecart.motif !== ECARTE.ILLISIBLE)
    .map((ecart) => ligne({
    niveau: NIVEAU.REMARQUE,
    source: SOURCE.PROPOSITION,
    quoi: "reste dehors",
    dit: `« ${ecart.quoi} » : ${phraseDeLEcart(ecart)}`,
    fichier: ecart.fichier,
    rang: ecart.ligne
  }));

  if (depot) {
    lignes.push(ligne({
      niveau: depot.ok ? NIVEAU.FAIT : NIVEAU.REFUS,
      source: SOURCE.PROPOSITION,
      quoi: depot.ok ? "proposé" : "pas proposé",
      dit: depot.dit
    }));
  }

  return lignes.concat(affirmations.length && !depot
    ? [ligne({
      niveau: NIVEAU.FAIT,
      source: SOURCE.PROPOSITION,
      quoi: "prêt",
      dit: `${affirmations.length} ${affirmations.length > 1 ? "lignes prêtes" : "ligne prête"}`
        + " à proposer — rien n'entre sans signature."
    })]
    : []);
}

/**
 * Tout ce que l'écran a à dire, en une liste.
 *
 * L'ordre est celui de la gravité, et **stable à gravité égale** : les lignes
 * gardent l'ordre où on les a produites, donc celui de l'écran. Un tri qui
 * remonterait un message à chaque frappe ferait perdre celui qu'on lisait.
 *
 * @param {object} etat ce que l'écran porte à cet instant
 * @returns {{niveau, source, quoi, dit, fichier, ligne}[]}
 */
export function laConsole({
  fichiers = [], reponses = null, lance = false, rendu = null, depot = null
} = {}) {
  const remplis = Array.isArray(fichiers) ? fichiers : [];

  const lignes = [
    ...lignesDeLaTranscription(rendu),
    ...lignesDeLaVerification(remplis),
    // **Rien tant qu'on n'a pas lancé.** Annoncer qu'une fonction ne sait pas
    // avant qu'on le lui ait demandé serait reprocher une réponse qu'on n'a pas
    // demandée.
    ...(lance ? lignesDuLancement(remplis, reponses) : []),
    ...lignesDeLaProposition(remplis, depot)
  ];

  return lignes
    .map((une, rang) => ({ une, rang }))
    .sort((a, b) => (RANG[a.une.niveau] - RANG[b.une.niveau]) || (a.rang - b.rang))
    .map(({ une }) => une);
}

/** Ce que la console dit d'elle-même, en une ligne. */
export function phraseDeLaConsole(lignes = []) {
  const toutes = Array.isArray(lignes) ? lignes : [];
  if (!toutes.length) return "Rien à signaler.";

  const refus = toutes.filter((une) => une.niveau === NIVEAU.REFUS).length;
  const remarques = toutes.filter((une) => une.niveau === NIVEAU.REMARQUE).length;

  const dits = [];
  if (refus) dits.push(`${refus} ${refus > 1 ? "refus" : "refus"}`);
  if (remarques) dits.push(`${remarques} ${remarques > 1 ? "remarques" : "remarque"}`);

  // **Rien qui bloque se dit aussi.** Un compte sans qualificatif se lit comme
  // une liste d'erreurs, et le brouillon n'en est pas une.
  if (!dits.length) return `${toutes.length} ${toutes.length > 1 ? "lignes" : "ligne"} — rien à corriger.`;
  return `${dits.join(" · ")} — ${refus ? "il y a quelque chose à faire." : "rien ne bloque."}`;
}
