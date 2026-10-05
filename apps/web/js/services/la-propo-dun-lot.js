/**
 * Une seule proposition pour tout un lot de lectures.
 *
 * ## La question posée
 *
 * > « L'idée est d'y mettre tout le contenu depuis les derniers documents
 * >   précédemment transformés en propositions. Donc, si entre temps, j'en ai
 * >   analysé 12, une seule proposition pour 12. »
 *
 * `ce-qui-attend-une-proposition.js` répond à « lesquels, et dans quel ordre ».
 * Ce module répond à **« et qu'est-ce que chacun donne à proposer »** : il prend
 * une lecture conservée et rend les affirmations qu'une proposition porterait.
 *
 * ## Rien de neuf n'est transcrit ici
 *
 * C'est la décision qui tient tout le reste. Les deux transcriptions existent
 * et sont employées ailleurs :
 *
 *   un compte rendu  → `itemsDuCompteRendu`, celle de l'écran **et** celle de
 *                      la fonction de bord qui lit dix-neuf comptes rendus ;
 *   un rapport de BC → `avisDuRapport`, celle de l'onglet « Ce que nous avons
 *                      compris » et celle du suivi des avis.
 *
 * Ce module **appelle** ces deux-là. En écrire une troisième aurait proposé
 * autre chose que ce que l'écran annonce, sur les mêmes documents, sans que
 * rien ne le dise (règle 4) — et c'est la pire divergence possible, parce
 * qu'elle porte sur ce qui entre dans la mémoire.
 *
 * ## Il part de la lecture gelée, et non de l'écran
 *
 * Un lot se compose de documents lus **il y a des jours**, souvent sur une
 * autre machine, parfois par le serveur. L'état d'écran n'existe plus ; la
 * lecture gelée, si. `laVueDuneLecture` et `laVueDunRapport` la rouvrent
 * exactement comme le détail d'un document la rouvre, et c'est pourquoi ce qui
 * sera proposé est ce qu'on a vu.
 *
 * ## Ce qu'il ne porte pas, et qui se dit
 *
 * **Les lots nommés, les labels, les jalons.** Ils dépendent de ce que le
 * projet connaît *aujourd'hui* — ses lots ouverts, ses objectifs datés —, que la
 * lecture gelée ne porte pas. La fonction de bord qui lit dix-neuf comptes
 * rendus ne les porte pas non plus, pour la même raison, et un lot n'allait pas
 * inventer ce que le chemin voisin n'a jamais su faire. Ils restent accessibles
 * document par document, depuis l'écran du document.
 *
 * **Les fils de messagerie.** Leur lecture garde des prises de position, et
 * rien ne les transcrit encore en affirmations. Un fil ne peut donc pas entrer
 * dans un lot, et cela se **compte** plutôt que de se taire : un fil escamoté
 * ferait croire que le lot a tout emporté (règle 5).
 *
 * ## Il est pur
 *
 * Une ligne de base entre, des affirmations sortent. Aucune requête : ce qui
 * lit les lectures et écrit la proposition est dans `-supabase.js`.
 */

import { FAMILLE, ceQueDitLaFamille } from "./les-familles-de-document.js";
import { laVueDuneLecture } from "./la-lecture-conservee.js";
import { laVueDunRapport } from "./la-lecture-dun-rapport.js";
import {
  introDuCompteRendu, itemsDuCompteRendu, titreDeLaProposition
} from "./proposition-du-cr.js";
import { avisDuRapport } from "./avis-versement.js";
import { lePluriel } from "./lexploitation-de-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/* ── Ce que chaque famille sait donner à une proposition ───────────────────── */

/**
 * Quelles familles se transcrivent, et ce que chacune donne.
 *
 * **Déclaré, et confronté au registre des familles dans l'épreuve.** Une
 * famille ajoutée là-bas et oubliée ici entrerait dans un lot sans transcription
 * et n'y donnerait rien, en silence. L'épreuve exige donc une entrée par
 * famille — `transcrit: false` est une réponse, l'absence n'en est pas une.
 */
export const CE_QUE_LA_FAMILLE_TRANSCRIT = {
  [FAMILLE.CR]: {
    transcrit: true,
    quoi: "les points relevés, les rubriques qui les accueillent, et le document",
    pourquoiPas: ""
  },
  [FAMILLE.CONTROLE]: {
    transcrit: true,
    quoi: "les avis dont on lit l'objet vérifié ou la remarque de contrôle",
    pourquoiPas: ""
  },
  [FAMILLE.MAIL]: {
    transcrit: false,
    quoi: "",
    /**
     * **Et non « un fil n'apporte rien ».** Il apporte des prises de position —
     * un accord, un refus, une offre — que la lecture garde et que l'écran
     * montre. Ce qui manque est la transcription en affirmations, qui n'existe
     * nulle part : un fil ne produit encore aucun fait daté
     * (`docs/a-traiter-plus-tard.md`).
     */
    pourquoiPas: "un fil de messagerie garde des prises de position, et rien ne "
      + "les transcrit encore en affirmations : il n'y a pas de quoi composer une "
      + "ligne de proposition"
  }
};

/** Cette famille sait-elle donner des affirmations ? */
export function laFamilleSeTranscrit(famille) {
  return CE_QUE_LA_FAMILLE_TRANSCRIT[texte(famille)]?.transcrit === true;
}

/** Pourquoi une famille ne se transcrit pas, ou `""` quand elle se transcrit. */
export function pourquoiLaFamilleNeSeTranscritPas(famille) {
  const ce = CE_QUE_LA_FAMILLE_TRANSCRIT[texte(famille)];
  if (!ce) {
    // Une famille qu'on ne connaît pas du tout : on ne prétend pas savoir ce
    // qu'elle donnerait, et on ne la fait pas entrer pour autant.
    return "cette famille de document n'est pas connue de la composition d'un lot";
  }
  return ce.transcrit ? "" : ce.pourquoiPas;
}

/* ── Ce qu'une lecture donne ───────────────────────────────────────────────── */

/**
 * Pourquoi une lecture ne donne rien.
 *
 * Quatre motifs, et ils appellent quatre gestes différents : attendre une
 * version qui transcrive, relire le document, aller voir ce que la porte a
 * jeté, ou rien du tout parce que le document ne portait rien.
 */
export const POURQUOI_RIEN_A_PORTER = {
  /** Sa famille ne se transcrit pas encore. */
  SANS_TRANSCRIPTION: "sans_transcription",
  /** Sa lecture n'a pas d'analyse gelée : écrite avant la colonne, ou vide. */
  SANS_ANALYSE: "sans_analyse",
  /** La transcription a tourné et n'a rien rendu. */
  RIEN_DE_TRANSCRIPTIBLE: "rien_de_transcriptible"
};

export const CE_QUE_LE_MOTIF_DIT = {
  [POURQUOI_RIEN_A_PORTER.SANS_TRANSCRIPTION]:
    "sa famille ne se transcrit pas encore",
  [POURQUOI_RIEN_A_PORTER.SANS_ANALYSE]:
    "sa lecture ne porte pas d'analyse : il faudrait la relire",
  [POURQUOI_RIEN_A_PORTER.RIEN_DE_TRANSCRIPTIBLE]:
    "ce document n'apporte rien que la mémoire écrirait"
};

/**
 * Les affirmations qu'une lecture conservée donne à proposer.
 *
 * @param {object} options
 * @param {object} options.ligne une ligne de `cr_lectures` ou `rapport_lectures`
 * @param {string} options.famille la famille de la lecture
 * @param {object[]} [options.assertions] la mémoire du projet. Elle ne sert
 *   qu'aux avis de bureau de contrôle, et seulement à proposer la liaison —
 *   sur quelles lignes l'avis porte.
 * @returns {{affirmations, titre, intro, source, pourquoiPas, dit}}
 */
export function lesAffirmationsDuneLecture({ ligne = null, famille = "", assertions = [] } = {}) {
  const rien = (pourquoiPas) => ({
    affirmations: [], titre: "", intro: "", source: "",
    pourquoiPas, dit: CE_QUE_LE_MOTIF_DIT[pourquoiPas] ?? ""
  });

  const quelle = texte(famille);
  if (!laFamilleSeTranscrit(quelle)) return rien(POURQUOI_RIEN_A_PORTER.SANS_TRANSCRIPTION);

  const porte = quelle === FAMILLE.CR
    ? ceQuUnCompteRenduDonne(ligne)
    : ceQuUnRapportDonne(ligne, assertions);

  if (!porte) return rien(POURQUOI_RIEN_A_PORTER.SANS_ANALYSE);
  if (!porte.affirmations.length) return rien(POURQUOI_RIEN_A_PORTER.RIEN_DE_TRANSCRIPTIBLE);

  return { ...porte, pourquoiPas: "", dit: "" };
}

/**
 * Ce qu'un compte rendu donne — **par la fonction de la fonction de bord**.
 *
 * `itemsDuCompteRendu` est appelée ici avec exactement les mêmes arguments que
 * dans `lire-les-comptes-rendus`, qui compose déjà une proposition pour
 * dix-neuf comptes rendus. Deux appels de la même fonction : il n'y a rien à
 * faire diverger.
 *
 * Ni `lots`, ni `labels`, ni `objectifs` : ils demandent ce que le projet
 * connaît aujourd'hui, et la lecture gelée ne le porte pas. C'est dit en tête
 * de fichier, et c'est la même limite que celle du serveur.
 */
function ceQuUnCompteRenduDonne(ligne) {
  const vue = laVueDuneLecture(ligne);
  if (!vue?.lecture) return null;

  const { lecture } = vue;

  /**
   * **Le document tel quel, sans garde ici.**
   *
   * `itemsDuCompteRendu` ne le porte que s'il a un identifiant — `doc?.id ? …`
   * —, et c'est le bon endroit : une ligne de proposition qui nomme un document
   * sans identifiant promettrait une provenance qu'on ne peut pas suivre.
   *
   * La même garde écrite ici en plus ne pouvait pas tomber : la batterie l'a
   * coupée et rien n'a bougé, parce que l'autre la tenait déjà. Un garde qu'on
   * ne peut pas casser exprès n'est pas un garde (règle 4).
   */
  const document = { id: texte(ligne?.document_id), title: texte(ligne?.document) };

  return {
    affirmations: liste(itemsDuCompteRendu({
      confrontes: vue.confrontes ?? [],
      document,
      rubriques: liste(lecture.rubriques),
      idees: liste(lecture.idees),
      identite: lecture.identite ?? null,
      luPar: texte(lecture.luPar)
    })),
    titre: titreDeLaProposition({ nom: texte(lecture.nom), identite: lecture.identite }),
    intro: introDuCompteRendu({ confrontes: vue.confrontes ?? [], nom: texte(lecture.nom) }),
    source: texte(lecture.nom) || "compte rendu de chantier"
  };
}

/**
 * Ce qu'un rapport de bureau de contrôle donne — **par la fonction de l'onglet
 * « Ce que nous avons compris »**.
 *
 * Mêmes arguments que `les-rapports-lus.js`, à une près : `assertions` est
 * passée ici. L'écran s'en dispense parce qu'il ne montre que le Mdall, où la
 * liaison n'entre pas ; une proposition, elle, propose la liaison — sur
 * quelles lignes de la mémoire l'avis porte — et a donc besoin de la mémoire.
 *
 * `ditDesAvisSansCouple` remonte : ce que la porte a jeté se compte, sans quoi
 * l'on croirait le rapport plus pauvre qu'il n'est (règle 5, et la doctrine du
 * tour précédent — mieux vaut ne rien verser que du bruit, mais pas en silence).
 */
function ceQuUnRapportDonne(ligne, assertions) {
  const vue = laVueDunRapport(ligne);
  if (!vue?.lecture) return null;

  const { lecture } = vue;
  const nom = texte(lecture.nom) || texte(ligne?.document);

  const { versables, ditDesAvisSansCouple } = avisDuRapport({
    avis: liste(lecture.avis),
    assertions: liste(assertions),
    emisPar: texte(lecture.emisPar) || texte(lecture?.emetteur?.nom),
    rapport: nom,
    documentId: texte(ligne?.document_id),
    le: texte(lecture.le) || texte(ligne?.etabli_le),
    legende: lecture.legende ?? null
  });

  return {
    affirmations: liste(versables),
    titre: leTitreDunRapport(lecture, nom),
    intro: lintroDunRapport({ nom, combien: liste(versables).length, ditDesAvisSansCouple }),
    source: nom || "rapport de bureau de contrôle",
    /** Ce que la porte a jeté, pour que le lot puisse le dire. */
    laisses: texte(ditDesAvisSansCouple)
  };
}

/**
 * Le titre d'une proposition de rapport.
 *
 * **Le numéro de rapport d'abord**, parce que c'est par là qu'un bureau de
 * contrôle désigne ses propres documents, et que c'est ce qu'on retrouvera dans
 * la correspondance. Le nom de fichier ne sert que faute de numéro.
 *
 * Le même partage que `titreDeLaProposition` pour un compte rendu — numéro, puis
 * fichier — et volontairement : deux propositions de familles différentes se
 * lisent dans la même liste.
 */
export function leTitreDunRapport(lecture = null, nom = "") {
  const numero = texte(lecture?.identite?.numero) || texte(lecture?.numero);
  const quand = texte(lecture?.identite?.etabliLe) || texte(lecture?.le);

  if (numero) return `Rapport n° ${numero}${quand ? ` du ${quand}` : ""}`;

  const fichier = texte(nom).replace(/\.pdf$/i, "");
  return fichier ? `Rapport de contrôle — ${fichier}` : "Rapport de bureau de contrôle";
}

/**
 * Ce qu'une proposition de rapport dit d'elle-même.
 *
 * **Avec ce qui n'y entre pas.** Un rapport de vingt avis dont huit ne portent
 * ni objet vérifié ni remarque donne douze lignes ; dire « douze » sans dire
 * « sur vingt » ferait chercher les huit autres dans la proposition, où elles ne
 * sont pas (règle 2).
 */
export function lintroDunRapport({ nom = "", combien = 0, ditDesAvisSansCouple = "" } = {}) {
  const lignes = [
    `Lecture de ${texte(nom) || "un rapport de bureau de contrôle"}.`,
    `Cette proposition porterait ${lePluriel(combien, "avis", "avis")}.`
  ];
  if (texte(ditDesAvisSansCouple)) lignes.push(texte(ditDesAvisSansCouple));
  return lignes.join("\n");
}

/* ── Le chemin du lot ──────────────────────────────────────────────────────── */

/**
 * Les étapes qu'un lot va parcourir, une par lecture.
 *
 * **L'écran les montre avant de commencer**, et c'est ce qui fait la différence
 * entre un geste qui dure quarante secondes et un geste qui a l'air bloqué. La
 * fonction est pure : elle ne fait que nommer ce qui va se passer.
 *
 * Le rang est dans l'étape parce que la phrase le porte — « 3 sur 12 » —, et
 * qu'un écran qui recompterait le rang à l'affichage se tromperait le jour où
 * le lot se filtre.
 */
export function lesEtapesDuLot(lot = []) {
  const siens = liste(lot);
  return siens.map((un, rang) => ({
    id: texte(un?.id),
    rang: rang + 1,
    sur: siens.length,
    titre: texte(un?.titre),
    famille: texte(un?.famille),
    dit: `${rang + 1} sur ${siens.length} · ${texte(un?.titre)}`
  }));
}

/**
 * Ce que la proposition d'un lot dit d'elle-même en tête.
 *
 * **Elle nomme ses documents**, parce que c'est la première question qu'on se
 * pose devant une proposition de cent quarante lignes : d'où est-ce que ça
 * vient ? Un titre qui dit « 12 documents » et une intro qui ne les nomme pas
 * obligeraient à ouvrir chaque ligne pour reconstituer la liste.
 *
 * **Et ce que la première lecture a laissé dehors y figure.** L'intro d'un
 * document ne survit nulle part ailleurs quand douze se rassemblent, et c'est
 * souvent elle qui dit ce que la porte a jeté (règle 5, et la doctrine du tour
 * précédent : mieux vaut ne rien verser que du bruit, mais jamais en silence).
 */
export function lintroDuLot(lot = [], premiere = null) {
  const siens = liste(lot);
  if (!siens.length) return "";

  const lignes = [
    `Cette proposition rassemble ${lePluriel(siens.length, "document lu", "documents lus")} `
      + "depuis la dernière proposition.",
    "",
    ...siens.map((un) => `· ${texte(un?.titre)}`)
  ];

  if (texte(premiere?.laisses)) lignes.push("", texte(premiere.laisses));

  return lignes.join("\n");
}

/* ── Ce que le lot a donné ─────────────────────────────────────────────────── */

/**
 * Le bilan d'un lot porté.
 *
 * ## Trois comptes, et jamais un seul
 *
 * « 12 documents portés » mélangerait trois choses qui n'appellent pas la même
 * suite : ceux qui ont donné des lignes, ceux qui ont été lus et n'avaient rien
 * à donner, et ceux dont le portage a échoué. Les deux premiers sont finis ; le
 * troisième est à refaire.
 *
 * ## Ce qui n'a rien donné est quand même porté
 *
 * C'est le choix le moins évident de ce module, et il se défend. Une lecture qui
 * n'apporte rien **a bien été passée dans le lot** : la laisser « en attente »
 * la ferait revenir à chaque lot suivant, pour ne rien donner chaque fois, et le
 * compteur de l'écran ne descendrait jamais.
 *
 * `proposition_id` dit donc « cette lecture est passée par une proposition », et
 * non « elle y a mis une ligne ». Le bilan dit la différence, et c'est là qu'elle
 * doit se lire.
 */
export function leBilanDuLot(portees = []) {
  const toutes = liste(portees);

  const donnantes = toutes.filter((une) => Number(une?.affirmations) > 0);
  const muettes = toutes.filter((une) => !une?.motif && !(Number(une?.affirmations) > 0));
  const ratees = toutes.filter((une) => texte(une?.motif));

  return {
    combien: toutes.length,
    donnantes: donnantes.length,
    muettes: muettes.length,
    ratees: ratees.length,
    affirmations: donnantes.reduce((total, une) => total + (Number(une.affirmations) || 0), 0),
    /** Ce que la proposition a écarté parce qu'elle le portait déjà. */
    ecartees: toutes.reduce((total, une) => total + (Number(une?.ecartees) || 0), 0),
    /** Les motifs des ratées, pour que l'écran les nomme une par une. */
    motifs: ratees.map((une) => ({ titre: texte(une?.titre), motif: texte(une.motif) })),
    dit: phraseDuBilan({
      donnantes: donnantes.length,
      muettes: muettes.length,
      ratees: ratees.length,
      affirmations: donnantes.reduce((total, une) => total + (Number(une.affirmations) || 0), 0)
    })
  };
}

/**
 * Ce que l'écran dit du bilan.
 *
 * **Les trois comptes, séparés, et les verbes accordés.** `lePluriel` accorde
 * les noms et porte déjà le nombre ; les verbes s'écrivent côte à côte, c'est la
 * seule façon de ne pas en oublier un.
 */
export function phraseDuBilan({
  donnantes = 0, muettes = 0, ratees = 0, affirmations = 0
} = {}) {
  const bouts = [];

  if (donnantes) {
    bouts.push(`${lePluriel(donnantes, "document", "documents")} ${
      donnantes > 1 ? "ont porté" : "a porté"} ${
      lePluriel(affirmations, "ligne", "lignes")}`);
  }
  if (muettes) {
    bouts.push(`${lePluriel(muettes, "document", "documents")} ${
      muettes > 1 ? "n'apportaient rien" : "n'apportait rien"}`);
  }
  if (ratees) {
    bouts.push(`${lePluriel(ratees, "document", "documents")} ${
      ratees > 1 ? "n'ont pas pu être portés" : "n'a pas pu être porté"}`);
  }

  // **Et non « rien à dire ».** Un lot qui n'a rien porté du tout est un
  // résultat, et il faut pouvoir le lire.
  return bouts.length ? bouts.join(" · ") : "Aucun document n'a été porté.";
}

/**
 * Les familles que le lot n'a pas su transcrire, nommées comme l'écran les nomme.
 *
 * **Par famille, et non en bloc.** « 3 documents non transcrits » n'apprend
 * rien ; « 3 fils de messagerie » dit lesquels, et la phrase de la famille dit
 * pourquoi.
 */
export function lesFamillesSansTranscription(documents = []) {
  const compte = new Map();

  for (const un of liste(documents)) {
    const famille = texte(un?.famille);
    if (!famille || laFamilleSeTranscrit(famille)) continue;
    compte.set(famille, (compte.get(famille) ?? 0) + 1);
  }

  return [...compte.entries()]
    .map(([famille, combien]) => ({
      famille,
      combien,
      nom: texte(ceQueDitLaFamille(famille)?.nom) || famille,
      pourquoiPas: pourquoiLaFamilleNeSeTranscritPas(famille)
    }))
    .sort((gauche, droite) => droite.combien - gauche.combien);
}
