/**
 * Ce qu'un lot de rapports donne à verser dans la mémoire.
 *
 * ## Ce qui manquait
 *
 * Le chemin d'un avis vers la mémoire était complet et testé de bout en bout —
 * la liaison, le versement, l'engagement écrit à la fusion —, mais **aucun
 * écran ne l'appelait**. Il manquait ce fichier : la glu entre ce que le
 * laboratoire a lu et ce que `avis-versement.js` sait proposer.
 *
 * ## Pourquoi un lot ne se traite pas comme un rapport
 *
 * Trois choses ne se voient qu'à l'échelle du lot, et chacune ferait une faute
 * si on l'ignorait :
 *
 * **Un document, un émetteur.** Un lot contient plusieurs rapports, parfois de
 * bureaux différents. Reconnaître l'organisme sur le lot entier attribuerait
 * les avis de l'un à l'autre. On reconnaît donc **par document**, sur ses pages
 * à lui.
 *
 * **Un avis déjà versé ne se reverse pas.** Le laboratoire se relance ; sans
 * cela, chaque exécution reproposerait les quarante mêmes lignes. Ce qui est
 * déjà en mémoire au même sujet et à la même teneur est écarté, et compté.
 *
 * **Un avis qui a changé, si.** Même sujet, autre teneur — un avis suspendu
 * devenu favorable — : c'est une valeur nouvelle, elle se verse par-dessus
 * (règle 11), et la mémoire garde les deux à leurs dates.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne verse rien. Il prépare ce qu'une proposition portera, et quelqu'un
 * signe (règle 1). Et il n'écarte aucun avis qu'il n'aurait pas su accrocher :
 * un avis escamoté parce qu'on ne savait pas quoi en faire est exactement ce
 * qu'on ne veut pas.
 */

import { avisDuRapport } from "./avis-versement.js";
import { cleDuSujet } from "./memoire-identifiants.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le nom d'un document, tel qu'on le lit à l'écran. */
function nomDuDocument(source = null) {
  return texte(source?.metadata?.filename) || texte(source?.title) || texte(source?.source_id);
}

/**
 * Ce que la mémoire porte déjà, par sujet et par teneur.
 *
 * Sur les lignes **en vigueur** seulement : un avis remplacé n'empêche pas son
 * remplaçant d'entrer, et une teneur périmée ne fait pas écran à la nouvelle.
 */
function dejaEnMemoire(assertions = []) {
  const vues = new Set();

  for (const assertion of Array.isArray(assertions) ? assertions : []) {
    if (texte(assertion?.superseded_by)) continue;

    const sujet = texte(assertion?.payload?.subject);
    if (!sujet) continue;
    vues.add(`${cleDuSujet(sujet)} ${texte(assertion?.payload?.value)}`);
  }

  return vues;
}

/**
 * Tout ce qu'un lot donne à proposer, document par document.
 *
 * @param {object} options
 * @param {object[]} options.sources les documents du lot, avec leurs pages
 * @param {object[]} options.avis les avis lus, chacun avec sa provenance
 * @param {object[]} options.assertions la mémoire du projet
 * @returns {{documents: object[], versables: object[], accroches: number,
 *   sansLiaison: number, dejaVerses: number, sansEmetteur: number}}
 */
export function avisDuLot({ sources = [], avis = [], assertions = [] } = {}) {
  const connus = dejaEnMemoire(assertions);
  const lus = Array.isArray(avis) ? avis : [];

  // Ce que le lot a déjà proposé. Deux rapports du même lot disent souvent la
  // même chose du même point — c'est un seul fait, et deux lignes du même sujet
  // dans une même proposition se disputeraient la même clé.
  const proposes = new Set();

  const documents = (Array.isArray(sources) ? sources : []).map((source) => {
    const sourceId = texte(source?.source_id);
    const groupe = lus.filter((entree) => texte(entree?.provenance?.source_id) === sourceId);

    const { versables, emetteur } = avisDuRapport({
      avis: groupe,
      assertions,
      rapport: nomDuDocument(source),
      documentId: sourceId,
      le: texte(source?.issued_at),
      pages: Array.isArray(source?.pages) ? source.pages : []
    });

    // Ce qui est déjà en mémoire au même sujet et à la même teneur sort ici, et
    // se compte : le taire ferait croire que le rapport n'avait rien à donner.
    const aVerser = versables.filter((versable) => {
      const cle = `${cleDuSujet(versable.sujet)} ${versable.valeur}`;
      if (connus.has(cle) || proposes.has(cle)) return false;
      proposes.add(cle);
      return true;
    });

    return {
      sourceId,
      nom: nomDuDocument(source),
      emetteur,
      versables: aVerser,
      lus: versables.length,
      dejaVerses: versables.length - aVerser.length,
      sansLiaison: aVerser.filter((versable) => !versable.porteSur.length).length
    };
  });

  const versables = documents.flatMap((document) => document.versables);

  return {
    documents,
    versables,
    accroches: versables.filter((versable) => versable.porteSur.length).length,
    // Ceux qui couvrent plusieurs parties de l'ouvrage. Se dit **avant** la
    // signature : personne ne doit découvrir après coup qu'un avis en couvrait
    // quatre lignes.
    surPlusieursPortees: versables.filter((versable) => versable.porteSur.length > 1).length,
    sansLiaison: versables.filter((versable) => !versable.porteSur.length).length,
    dejaVerses: documents.reduce((total, document) => total + document.dejaVerses, 0),
    // Les documents dont l'organisme n'est pas certain. Leurs avis entrent
    // quand même — un avis est un fait du projet —, mais sans nom d'émetteur,
    // et l'écran doit pouvoir le dire avant qu'on signe.
    sansEmetteur: documents.filter(
      (document) => document.versables.length && !texte(document.versables[0]?.emisPar)
    ).length
  };
}

/**
 * Le titre d'une proposition d'avis, et sa description.
 *
 * Le titre nomme le lot, jamais un avis : une proposition en porte quarante.
 * La description dit ce qu'elle contient **et ce qu'elle ne contient pas** —
 * ce qui n'a pas été accroché s'y lit, parce que c'est cela qu'on relit avant
 * de signer.
 */
export function titreDuLot(lot = null, { le = "" } = {}) {
  const documents = (lot?.documents ?? []).filter((document) => document.versables.length);
  const organismes = [
    ...new Set(documents.map((document) => texte(document.emetteur?.organisme?.label)).filter(Boolean))
  ];

  const quoi = organismes.length === 1 ? `Avis ${organismes[0]}` : "Avis de contrôle technique";
  const combien = lot?.versables?.length ?? 0;
  const quand = texte(le);

  return {
    titre: [quoi, combien ? `— ${combien} avis` : "", quand ? `(${quand})` : ""].filter(Boolean).join(" "),
    description: [
      `${combien} avis lus dans ${documents.length} document${documents.length > 1 ? "s" : ""}.`,
      lot?.accroches
        ? `${lot.accroches} ${lot.accroches > 1 ? "portent" : "porte"} sur une valeur de la mémoire `
          + `et ${lot.accroches > 1 ? "cesseront" : "cessera"} de la couvrir le jour où elle change.`
        : "",
      lot?.sansLiaison
        ? `${lot.sansLiaison} n'${lot.sansLiaison > 1 ? "ont" : "a"} pas été `
          + `${lot.sansLiaison > 1 ? "accrochés" : "accroché"} à une valeur : `
          + `${lot.sansLiaison > 1 ? "ils entrent" : "il entre"} quand même, sans rien couvrir.`
        : "",
      lot?.surPlusieursPortees
        ? `${lot.surPlusieursPortees} ${lot.surPlusieursPortees > 1 ? "portent" : "porte"} sur un sujet `
          + "que plusieurs parties de l'ouvrage se partagent : "
          + `${lot.surPlusieursPortees > 1 ? "ils les couvrent" : "il les couvre"} toutes.`
        : "",
      lot?.dejaVerses
        ? `${lot.dejaVerses} ${lot.dejaVerses > 1 ? "étaient" : "était"} déjà en mémoire à l'identique `
          + `et n'y ${lot.dejaVerses > 1 ? "reviennent" : "revient"} pas.`
        : ""
    ].filter(Boolean).join(" ")
  };
}
