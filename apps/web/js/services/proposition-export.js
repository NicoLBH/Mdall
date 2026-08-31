/**
 * Une proposition, en entier, hors de l'écran.
 *
 * L'écran montre une proposition par morceaux — quatre onglets, des blocs
 * qu'on déplie, des vignettes qu'on agrandit. C'est bien pour décider, c'est
 * mauvais pour **vérifier** : personne ne peut dire, en regardant l'écran, ce
 * que le système a réellement retenu d'un dépôt. Cet export le dit d'un bloc.
 *
 * Deux formes, pour deux usages :
 *
 *  - le **JSON** conserve la structure telle qu'elle est en mémoire — c'est la
 *    forme qu'on relit pour comprendre pourquoi l'écran affiche ce qu'il
 *    affiche, et celle qu'on joint à un rapport de défaut ;
 *  - le **CSV** met tout à plat, une ligne par élément, avec la section d'où
 *    elle vient. On le trie, on le filtre, on le compare à l'export d'une
 *    autre proposition.
 *
 * Deux règles tiennent tout le fichier :
 *
 *  - **rien n'est recalculé ici.** L'export lit ce que la revue tient déjà.
 *    Un export qui refait le travail exporterait autre chose que ce qui est à
 *    l'écran, et ne servirait plus à vérifier l'écran.
 *  - **`null` n'est pas `[]`.** Quand l'analyse n'a pas abouti, ses listes ne
 *    sont pas vides : elles sont inconnues. Les écrire vides ferait lire
 *    « aucun avis » là où il faut lire « on ne sait pas ».
 */

import { ITEM } from "./proposition-state.js";
import { ITEM_TYPE, STATUS_LABELS, describeAvisChange } from "./proposition-review.js";
import { toCsv } from "../utils/csv.js";

/** La version du format. Un export sans version ne se relit pas dans six mois. */
export const PROPOSITION_EXPORT_FORMAT = "mdall.proposition/1";

const DECISION_LABELS = {
  [ITEM.PROPOSED]: "à trancher",
  [ITEM.ACCEPTED]: "retenu",
  [ITEM.REFUSED]: "écarté"
};

const ITEM_TYPE_LABELS = {
  [ITEM_TYPE.DOCUMENT]: "Document",
  [ITEM_TYPE.ATTACHMENT]: "Rattachement",
  [ITEM_TYPE.AVIS]: "Avis"
};

function texte(value) {
  return String(value ?? "").trim();
}

function liste(value) {
  return Array.isArray(value) ? value : [];
}

/** `null` quand on ne sait pas, la liste quand on sait. */
function listeOuInconnue(value) {
  return Array.isArray(value) ? value : null;
}

/**
 * Le nom d'un auteur, jamais son identifiant.
 *
 * La table porte tantôt une chaîne, tantôt `{name, avatarUrl}` depuis qu'on
 * affiche les visages. Un export qui ne lirait qu'une des deux formes écrirait
 * « [object Object] », comme l'écran l'a déjà fait une fois.
 */
function nomDe(userId, names) {
  const entree = names?.get?.(String(userId ?? ""));
  if (!entree) return null;
  return texte(typeof entree === "string" ? entree : entree.name) || null;
}

function avisLigne(avis, mouvement) {
  return {
    mouvement,
    reference: texte(avis?.reference) || null,
    intitule: texte(avis?.title) || null,
    statut: texte(avis?.status) || null,
    statutLabel: STATUS_LABELS[texte(avis?.status)] ?? null,
    statutPrecedent: texte(avis?.previousStatus) || null,
    appreciation: texte(avis?.opinion_raw ?? avis?.opinion) || null,
    appreciationPrecedente: texte(avis?.previousOpinion) || null,
    extrait: texte(typeof avis?.evidence === "string" ? avis.evidence : avis?.evidence?.text) || null,
    document: texte(avis?.sourceId ?? avis?.documentId) || null,
    page: Number.isFinite(Number(avis?.page)) ? Number(avis.page) : null
  };
}

function documentLigne(row) {
  return {
    id: texte(row?.id) || null,
    nom: texte(row?.original_filename ?? row?.filename) || null,
    typeReconnu: texte(row?.detected_kind_label) || null,
    auteurReconnu: texte(row?.detected_author) || null,
    emisLe: texte(row?.issued_at) || null,
    raison: texte(row?.detection_reason) || null,
    doublonDe: texte(row?.duplicate_of_document_id) || null,
    reemissionDe: texte(row?.reissue_of_document_id) || null,
    deposeLe: texte(row?.created_at) || null,
    stockage: texte(row?.storage_path) || null,
    octets: Number.isFinite(Number(row?.size_bytes)) ? Number(row.size_bytes) : null
  };
}

function figureLigne(row) {
  return {
    id: texte(row?.id) || null,
    document: texte(row?.document_id) || null,
    page: Number.isFinite(Number(row?.page)) ? Number(row.page) : null,
    rubrique: texte(row?.rubric) || null,
    // La lettre est l'évaluation portée par la ligne du tableau : « F », « S »…
    evaluation: texte(row?.avis_letter) || null,
    // Un avis favorable n'a pas de numéro imprimé : `null` le dit sans
    // prétendre qu'on l'a perdu.
    reference: texte(row?.avis_reference) || null,
    observation: texte(row?.observation) || null,
    largeur: Number.isFinite(Number(row?.width)) ? Number(row.width) : null,
    hauteur: Number.isFinite(Number(row?.height)) ? Number(row.height) : null,
    tauxEncre: Number.isFinite(Number(row?.ink_ratio)) ? Number(row.ink_ratio) : null,
    empreinte: texte(row?.sha256) || null,
    legende: texte(row?.caption) || null,
    legendeModele: texte(row?.caption_model) || null,
    stockage: texte(row?.storage_path) || null
  };
}

function itemLigne(entry) {
  const payload = entry?.payload ?? {};
  const base = {
    nature: texte(entry?.itemType),
    natureLabel: ITEM_TYPE_LABELS[texte(entry?.itemType)] ?? texte(entry?.itemType),
    cle: texte(entry?.itemKey),
    decision: texte(entry?.status) || ITEM.PROPOSED,
    decisionLabel: DECISION_LABELS[texte(entry?.status) || ITEM.PROPOSED] ?? texte(entry?.status),
    motif: texte(entry?.reason) || null
  };

  if (entry?.itemType === ITEM_TYPE.AVIS) {
    const { label, detail } = describeAvisChange(payload);
    return { ...base, libelle: texte(payload.title) || texte(payload.reference), mouvement: label, detail, payload };
  }

  if (entry?.itemType === ITEM_TYPE.ATTACHMENT) {
    return {
      ...base,
      libelle: texte(payload.label) || base.cle,
      mouvement: texte(payload.verdict) || null,
      detail: texte(payload.reason) || null,
      payload
    };
  }

  return {
    ...base,
    libelle: texte(payload.name) || base.cle,
    mouvement: texte(payload.kindLabel) || null,
    detail: texte(payload.reason) || null,
    payload
  };
}

/**
 * Tout ce qu'une proposition tient, en un objet.
 *
 * `review` est l'état de l'écran, pas la base : c'est voulu. Ce qu'on exporte
 * doit être ce qu'on voit, sinon l'export ne prouve rien.
 */
export function buildPropositionExport({
  proposition = null,
  review = null,
  project = {},
  generatedAt = ""
} = {}) {
  if (!proposition?.id) return null;

  const names = review?.authors;
  const analyseFaite = review !== null && review?.running !== true;

  const diff = review?.diff ?? null;
  const avis = diff
    ? {
        apparus: liste(diff.added).map((entry) => avisLigne(entry, "apparu")),
        modifies: liste(diff.changed).map((entry) => avisLigne(entry, "modifié")),
        // Un avis qu'aucun document du lot ne reprend n'est pas un mouvement :
        // il est ici pour être lu, pas pour être tranché.
        nonRepris: liste(diff.silent).map((entry) => avisLigne(entry, "non repris")),
        inchanges: Number.isFinite(Number(diff.unchanged)) ? Number(diff.unchanged) : null
      }
    : null;

  return {
    format: PROPOSITION_EXPORT_FORMAT,
    generatedAt: texte(generatedAt) || new Date().toISOString(),
    projet: {
      id: texte(proposition.project_id) || null,
      nom: texte(project?.name ?? project?.projectName) || null,
      reference: texte(project?.reference ?? project?.code) || null
    },
    proposition: {
      id: texte(proposition.id),
      numero: Number(proposition.number) || null,
      titre: texte(proposition.title) || null,
      etat: texte(proposition.status) || null,
      corps: texte(proposition.body) || null,
      ouverteLe: texte(proposition.created_at) || null,
      ouvertePar: nomDe(proposition.created_by, names),
      fusionneeLe: texte(proposition.merged_at) || null,
      fusionneePar: nomDe(proposition.merged_by, names),
      fermeeLe: texte(proposition.closed_at) || null,
      fermeePar: nomDe(proposition.closed_by, names),
      titreDeFusion: texte(proposition.merge_title) || null,
      noteDeFusion: texte(proposition.merge_note) || null
    },
    analyse: {
      // « Pas encore lue » et « lue, sans résultat » ne se disent pas pareil.
      faite: analyseFaite,
      figee: review?.frozen === true,
      erreur: texte(review?.error) || null,
      // Les livrables que le stockage n'a pas rendus : l'analyse a porté sur
      // moins de documents, et cela doit se lire dans l'export.
      livrablesIllisibles: analyseFaite
        ? liste(review?.unreachable).map((row) => texte(row?.original_filename ?? row) || null).filter(Boolean)
        : null
    },
    depots: analyseFaite
      ? liste(review?.deposits).map((groupe) => ({
          le: texte(groupe?.at) || null,
          par: texte(groupe?.who) || null,
          documents: liste(groupe?.documents).map((row) => texte(row?.original_filename ?? row?.filename) || null).filter(Boolean)
        }))
      : null,
    documents: analyseFaite ? liste(review?.documentRows).map(documentLigne) : null,
    avis,
    elements: analyseFaite ? liste(review?.items).map(itemLigne) : null,
    conflits: analyseFaite
      ? liste(review?.conflicts).map((conflit) => ({
          nature: texte(conflit?.kind) || null,
          cle: texte(conflit?.item?.itemKey) || null,
          element: texte(conflit?.item?.itemType) || null,
          avant: texte(conflit?.before) || null,
          maintenant: texte(conflit?.after) || null,
          motif: texte(conflit?.reason) || null,
          trancheeLe: texte(conflit?.decidedAt) || null,
          // Un conflit est réglé quand l'affirmation qu'il porte l'est : ce
          // sont les mêmes objets, et non deux copies qui divergeraient.
          regle: texte(conflit?.item?.status) !== ITEM.PROPOSED
        }))
      : null,
    figures: listeOuInconnue(review?.figures)?.map(figureLigne) ?? null,
    noteDeDepot: review?.note
      ? {
          markdown: texte(review.note.markdown) || null,
          modele: texte(review.note.model) || null,
          ecriteLe: texte(review.note.created_at) || null,
          empreinte: texte(review.note.fingerprint) || null,
          etat: texte(review?.noteState) || null,
          faits: review.note.facts ?? null
        }
      : null,
    conversation: liste(review?.story).map((event) => ({
      quand: texte(event?.at) || null,
      qui: texte(event?.who) || null,
      quoi: texte(event?.kind) || null,
      texte: texte(event?.text) || null,
      detail: texte(event?.detail) || null,
      message: texte(event?.body) || null,
      modifieLe: texte(event?.editedAt) || null,
      supprime: event?.deleted === true
    }))
  };
}

const CSV_COLUMNS = [
  { key: "section", label: "Section" },
  { key: "cle", label: "Clé" },
  { key: "libelle", label: "Libellé" },
  { key: "statut", label: "Statut" },
  { key: "detail", label: "Détail" },
  { key: "date", label: "Date" },
  { key: "qui", label: "Qui" },
  { key: "source", label: "Source" },
  { key: "page", label: "Page" }
];

function ligne(section, valeurs = {}) {
  return {
    section,
    cle: "",
    libelle: "",
    statut: "",
    detail: "",
    date: "",
    qui: "",
    source: "",
    page: "",
    ...valeurs
  };
}

/**
 * Le même export, mis à plat.
 *
 * Une proposition n'est pas un tableau : c'est un document, des avis, des
 * décisions, une conversation. Les forcer dans une seule grille demanderait
 * quarante colonnes vides. On garde donc une **forme longue** : une ligne par
 * élément, la colonne « Section » disant de quoi il s'agit. C'est la forme
 * qu'un tableau croisé sait reprendre, et celle qu'on peut trier.
 *
 * Ce qui est inconnu s'écrit, et se distingue de ce qui est vide : une section
 * absente laisse une ligne qui le dit.
 */
export function propositionExportRows(exported = null) {
  if (!exported) return { columns: CSV_COLUMNS, rows: [] };

  const rows = [];
  const { proposition, analyse, avis } = exported;

  rows.push(
    ligne("Proposition", {
      cle: `#P${proposition.numero ?? "?"}`,
      libelle: proposition.titre ?? "",
      statut: proposition.etat ?? "",
      detail: proposition.corps ?? "",
      date: proposition.ouverteLe ?? "",
      qui: proposition.ouvertePar ?? ""
    })
  );

  if (proposition.fusionneeLe) {
    rows.push(
      ligne("Proposition", {
        cle: `#P${proposition.numero ?? "?"}`,
        libelle: "Fusionnée",
        statut: "merged",
        detail: proposition.noteDeFusion ?? "",
        date: proposition.fusionneeLe,
        qui: proposition.fusionneePar ?? ""
      })
    );
  }

  if (analyse?.erreur) {
    rows.push(ligne("Analyse", { libelle: "L'analyse n'a pas abouti", detail: analyse.erreur }));
  }

  for (const nom of analyse?.livrablesIllisibles ?? []) {
    rows.push(ligne("Analyse", { libelle: nom, statut: "illisible" }));
  }

  for (const depot of exported.depots ?? []) {
    for (const nom of depot.documents) {
      rows.push(ligne("Dépôt", { libelle: nom, date: depot.le ?? "", qui: depot.par ?? "" }));
    }
  }

  for (const document of exported.documents ?? []) {
    rows.push(
      ligne("Document", {
        cle: document.id ?? "",
        libelle: document.nom ?? "",
        statut: document.typeReconnu ?? "",
        detail: document.raison ?? "",
        date: document.emisLe ?? document.deposeLe ?? "",
        qui: document.auteurReconnu ?? "",
        source: document.stockage ?? ""
      })
    );
  }

  const avisRows = (entrees, section) =>
    (entrees ?? []).forEach((entree) => {
      rows.push(
        ligne(section, {
          cle: entree.reference ?? "",
          libelle: entree.intitule ?? "",
          statut: [entree.statutLabel ?? entree.statut, entree.appreciation].filter(Boolean).join(" · "),
          detail: entree.extrait ?? "",
          source: entree.document ?? "",
          page: entree.page ?? ""
        })
      );
    });

  if (avis === null) {
    rows.push(ligne("Avis", { libelle: "Non calculés", detail: "L'analyse n'a pas produit de comparaison." }));
  } else {
    avisRows(avis.apparus, "Avis apparu");
    avisRows(avis.modifies, "Avis modifié");
    avisRows(avis.nonRepris, "Avis non repris");
    rows.push(
      ligne("Avis inchangés", {
        libelle: avis.inchanges === null ? "Nombre inconnu" : `${avis.inchanges}`,
        detail: "Repris à l'identique par le lot"
      })
    );
  }

  for (const element of exported.elements ?? []) {
    rows.push(
      ligne(`À trancher · ${element.natureLabel}`, {
        cle: element.cle,
        libelle: element.libelle ?? "",
        statut: element.decisionLabel ?? "",
        detail: [element.mouvement, element.detail, element.motif].filter(Boolean).join(" · ")
      })
    );
  }

  for (const conflit of exported.conflits ?? []) {
    rows.push(
      ligne("Conflit", {
        cle: conflit.cle ?? "",
        libelle: conflit.avant ?? "",
        statut: conflit.regle ? "réglé" : "à régler",
        detail: [conflit.nature, conflit.maintenant, conflit.motif].filter(Boolean).join(" · "),
        date: conflit.trancheeLe ?? ""
      })
    );
  }

  if (exported.figures === null) {
    rows.push(ligne("Figure", { libelle: "Non lues", detail: "Les figures n'ont pas pu être relues." }));
  } else {
    for (const figure of exported.figures) {
      rows.push(
        ligne("Figure", {
          cle: figure.reference ?? "",
          libelle: figure.rubrique ?? "",
          statut: figure.evaluation ?? "",
          detail: figure.legende ?? figure.observation ?? "",
          source: figure.document ?? "",
          page: figure.page ?? ""
        })
      );
    }
  }

  if (exported.noteDeDepot) {
    rows.push(
      ligne("Note de dépôt", {
        libelle: exported.noteDeDepot.modele ?? "",
        detail: exported.noteDeDepot.markdown ?? "",
        date: exported.noteDeDepot.ecriteLe ?? ""
      })
    );
  }

  for (const event of exported.conversation ?? []) {
    rows.push(
      ligne("Conversation", {
        libelle: event.texte ?? event.quoi ?? "",
        statut: event.quoi ?? "",
        detail: event.message ?? event.detail ?? "",
        date: event.quand ?? "",
        qui: event.qui ?? ""
      })
    );
  }

  return { columns: CSV_COLUMNS, rows };
}

/** La proposition en CSV, prête à écrire. */
export function propositionExportCsv(exported = null) {
  const { columns, rows } = propositionExportRows(exported);
  return toCsv(columns, rows);
}

/** Le nom du fichier : le numéro d'abord, il suffit à le retrouver. */
export function propositionExportFilename(exported = null, extension = "json") {
  const numero = exported?.proposition?.numero;
  const jour = texte(exported?.generatedAt).slice(0, 10) || "sans-date";
  return `proposition-P${numero ?? "inconnue"}-${jour}.${extension}`;
}
