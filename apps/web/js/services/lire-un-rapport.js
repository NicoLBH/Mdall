/**
 * Faire les trois étapes de la lecture d'un rapport, dans l'ordre.
 *
 * ## Ce qui manquait, et pourquoi l'écran paraissait inchangé
 *
 * Le round précédent a livré la moitié qui **relit** : la table des lectures,
 * leur service pur, le tableau de l'accueil, le détail au clic. Il n'a pas livré
 * celle qui **lit** — rien n'appelait les trois étapes, et rien n'écrivait de
 * ligne. Le tableau était donc vide à jamais, et un tableau vide ne se voit pas.
 *
 * C'est exactement ce que la maison interdit : ne jamais livrer de code que rien
 * n'appelle. Le voici appelé.
 *
 * ## Ce module n'appelle le réseau nulle part
 *
 * Les trois appels lui sont **passés**. Il décide de l'ordre, de ce qu'un échec
 * laisse passer, et de ce que la lecture devient — rien d'autre. C'est ce qui
 * permet d'éprouver le parcours entier, échecs compris, sans serveur : un test
 * qui ne peut pas faire échouer la deuxième étape ne vérifie pas que la première
 * est conservée quand elle échoue.
 *
 * Les trois vrais appels vivent dans `structure-par-le-modele.js`,
 * `markdown-par-le-modele.js` et `avis-par-le-modele.js` — ceux du compte rendu
 * et ceux du suivi, inchangés. Une seconde version aurait lu un rapport
 * autrement sans que rien ne le dise (règle 4).
 *
 * ## Ce qu'un échec coûte, étape par étape
 *
 * | l'étape qui tombe | ce qui reste | pourquoi |
 * |---|---|---|
 * | la structure | tout le reste | la transcription se fait sans squelette : on perd la cohérence entre pages, pas la lecture |
 * | la transcription | **rien** | une lecture sans Markdown n'est pas une lecture : il n'y a rien à rouvrir |
 * | le relevé | la transcription | le document transcrit vaut d'être gardé, et l'écran dit que les avis n'ont pas été relevés — jamais qu'il n'y en a aucun (règle 5) |
 */

import { assemblerLeMarkdown } from "./reconstitution-markdown.js";
import {
  laLegendeComplete, laLegendeDuRapport, leLecteurDunRapport, lesMesuresDunRapport
} from "./la-lecture-dun-rapport.js";
import { ETAPE } from "./le-parcours-dun-rapport.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** Pourquoi une lecture n'a pas eu lieu. Nommés : l'écran doit pouvoir le dire. */
export const REFUS_DE_LECTURE = {
  /** Le document ne porte aucun texte : il n'y a rien à transcrire. */
  SANS_TEXTE: "sans-texte",
  /** La transcription n'a pas abouti, et c'est elle qui fait la lecture. */
  SANS_MARKDOWN: "sans-markdown"
};

export const PHRASES_DU_REFUS_DE_LECTURE = {
  [REFUS_DE_LECTURE.SANS_TEXTE]: "ce document ne porte aucun texte extractible : "
    + "il n'y a rien à transcrire, et une lecture vide ne se garde pas",
  [REFUS_DE_LECTURE.SANS_MARKDOWN]: "la transcription n'a pas abouti : sans elle, "
    + "il n'y a pas de lecture à rouvrir"
};

export function phraseDuRefusDeLecture(motif) {
  return PHRASES_DU_REFUS_DE_LECTURE[texte(motif)] ?? "";
}

/**
 * La légende telle que le **relevé** la rapporte, dans le vocabulaire des
 * lectures.
 *
 * Le serveur du relevé l'écrit `{code, libelle}` depuis le premier jour, et la
 * reconnaissance de structure l'écrit `{marque, signification}`. Renommer l'un
 * des deux côté serveur ferait taire un appelant qui, lui, n'a pas changé : la
 * traduction se fait donc ici, à l'endroit qui connaît les deux.
 */
export function laLegendeDuReleve(brutes) {
  return laLegendeDuRapport(
    liste(brutes).map((une) => ({
      marque: texte(une?.marque ?? une?.code),
      signification: texte(une?.signification ?? une?.libelle),
      ou: texte(une?.ou)
    }))
  );
}

/**
 * Un avis relevé, ramené à ce qu'une lecture garde.
 *
 * ## `teneur` devient `marque`
 *
 * Le serveur du relevé nomme `teneur` ce que le document pose dans la colonne —
 * « F », « SO », « D ». Les lectures l'appellent `marque`, parce que c'est ce
 * mot que la légende emploie, et qu'une marque qui ne se résout pas se cherche
 * dans la légende. Deux noms pour une chose se seraient séparés (règle 10) ; la
 * traduction est donc faite une fois, ici.
 *
 * ## Le constat est gardé
 *
 * C'est ce que le bureau a écrit **en plus** du verdict — « Région A2, altitude
 * 260 m ». C'est précisément ce que la lecture par motifs perdait, et sans quoi
 * un engagement ne se vérifie pas. Le jeter en chemin aurait refait le défaut
 * qu'on vient de corriger.
 */
export function unAvisReleve(brut = null) {
  const intitule = texte(brut?.intitule);
  const reference = texte(brut?.reference);
  if (!intitule && !reference) return null;

  const page = Number(brut?.page);

  return {
    reference,
    intitule,
    marque: texte(brut?.teneur ?? brut?.marque),
    /** Où il se lit. `ou` est le mot des listes de l'écran, partout ailleurs déjà. */
    ou: Number.isFinite(page) && page > 0 ? `page ${page}` : "",
    constat: texte(brut?.constat),
    /** La ligne d'où il sort, déjà confrontée au document par le serveur. */
    citation: texte(brut?.citation),
    page: Number.isFinite(page) && page > 0 ? page : null
  };
}

/** Les avis d'un relevé, dans l'ordre du document. */
export function lesAvisReleves(brutes) {
  return liste(brutes).map(unAvisReleve).filter(Boolean);
}

/**
 * Lire un rapport : les trois étapes, puis la vue que l'écran redessine.
 *
 * Les pages viennent du navigateur, qui a déjà extrait le texte du PDF à son
 * dépôt — la lecture ne repaye donc pas l'extraction.
 *
 * @param {object} rapport le document déposé : `{nom, pages, sourceId}`
 * @param {object} outils les trois appels, passés
 * @param {function} outils.reconnaitreLaStructure
 * @param {function} outils.refaireLeDocument
 * @param {function} outils.relireLesAvis
 * @param {function} [outils.onEtape] appelé à chaque étape : `{quoi, nom}`
 * @returns {Promise<{ok: true, vue: object}|{ok: false, motif: string, etape: string}>}
 */
/**
 * Les pages d'un rapport qui portent quelque chose à lire.
 *
 * **Écrit une fois, et c'est tout le sujet.** La règle « ce rapport est-il
 * lisible ? » vivait à deux endroits : l'écran comptait les rapports déposés sans
 * erreur pour écrire « Lire 1 rapport », et la lecture, elle, écartait ceux qui ne
 * portent aucun texte. Un PDF scanné — une image, sans couche de texte — passait
 * donc le premier compte et tombait au second : le bouton s'affichait, le clic ne
 * faisait rien, et rien ne le disait (règle 4).
 */
export function lesPagesLisibles(rapport = null) {
  return liste(rapport?.pages).filter((page) => texte(page?.text ?? page?.texte));
}

/**
 * Le lot partagé en deux : ce qui peut être lu, et ce qui ne le peut pas.
 *
 * **Les muets ne sont pas une erreur.** Le fichier s'est ouvert, ses pages ont été
 * comptées ; il n'y a simplement pas un mot à transcrire, parce que c'est une
 * image. Les ranger avec les illisibles ferait croire à un dépôt raté, et les
 * taire ferait un bouton qui ne fait rien.
 */
export function leLotALire(rapports = []) {
  const lisibles = [];
  const muets = [];

  for (const rapport of liste(rapports)) {
    (lesPagesLisibles(rapport).length ? lisibles : muets).push(rapport);
  }
  return { lisibles, muets };
}

/** Ce que l'écran dit des rapports qu'il ne peut pas lire. */
export function phraseDesRapportsMuets(muets = []) {
  const combien = liste(muets).length;
  if (!combien) return "";

  const noms = liste(muets)
    .map((un) => texte(un?.nom) || texte(un?.filename) || "un document")
    .join(", ");

  return `${combien} rapport${combien > 1 ? "s" : ""} ne port${combien > 1 ? "ent" : "e"} `
    + `aucun texte extractible et ne ser${combien > 1 ? "ont" : "a"} pas lu${
      combien > 1 ? "s" : ""} : ${noms}. `
    + "C'est le cas d'un PDF scanné — une image, sans couche de texte. "
    + "Il faudrait le passer par une reconnaissance de caractères avant de le déposer.";
}

export async function lireUnRapport(rapport = null, {
  reconnaitreLaStructure = null,
  refaireLeDocument = null,
  relireLesAvis = null,
  onEtape = null
} = {}) {
  const nom = texte(rapport?.nom) || texte(rapport?.filename);
  const pages = lesPagesLisibles(rapport);

  if (!pages.length) {
    return { ok: false, motif: REFUS_DE_LECTURE.SANS_TEXTE, etape: ETAPE.STRUCTURE };
  }

  /* ── 1. La structure, et la légende ─────────────────────────────────────── */

  await onEtape?.({ quoi: ETAPE.STRUCTURE, nom });
  const reconnue = await reconnaitreLaStructure?.({ pages });

  // **Une reconnaissance qui échoue ne bloque pas.** Elle se dit : `sansStructure`
  // est ce que l'écran lit pour marquer l'étape sautée, et ce qui explique que
  // les marques ne se résolvent pas.
  const structure = reconnue?.ok ? reconnue.structure ?? null : null;
  const legendeDeLaStructure = laLegendeDuRapport(structure?.legende);

  /* ── 2. La transcription ────────────────────────────────────────────────── */

  await onEtape?.({ quoi: ETAPE.MARKDOWN, nom });
  const refait = await refaireLeDocument?.({ pages, structure });

  /**
   * **Un seul refus, et non deux.**
   *
   * Il y avait ici deux gardes : l'une sur l'appel refusé, l'autre sur le
   * Markdown vide. La batterie a montré que la première ne pouvait pas tomber —
   * un appel refusé ne rapporte aucune page, donc la seconde l'attrapait de toute
   * façon, et aucune épreuve ne pouvait distinguer les deux chemins. Un garde
   * qu'on ne peut pas faire tomber n'en est pas un (règle 4).
   *
   * Le `?.` reste : `refait` peut être nul si l'appel n'a pas été fourni, et
   * `refait.pages` lèverait alors une erreur au lieu de rendre un refus nommé.
   */
  const assemble = refait?.ok ? assemblerLeMarkdown(refait.pages) : { texte: "" };
  if (!texte(assemble.texte)) {
    return { ok: false, motif: REFUS_DE_LECTURE.SANS_MARKDOWN, etape: ETAPE.MARKDOWN };
  }

  /* ── 3. Le relevé des avis ──────────────────────────────────────────────── */

  await onEtape?.({ quoi: ETAPE.AVIS, nom });
  const releve = await relireLesAvis?.({ sourceId: texte(rapport?.sourceId), pages });

  /**
   * **`null` et non `[]` quand le relevé n'a pas eu lieu.**
   *
   * `Array.isArray` est ce que l'écran et les mesures regardent pour dire « les
   * avis n'ont pas été relevés » plutôt que « ce rapport n'en porte aucun ». Un
   * tableau vide ferait dire la seconde phrase sur une étape qui a échoué
   * (règle 5).
   */
  const avis = releve?.ok ? lesAvisReleves(releve.avis) : null;

  const lecture = {
    nom,
    identite: {
      // Ce que le document déclare de lui-même. Le relevé le lit de la première
      // page ; la reconnaissance ne le cherche pas.
      numero: texte(releve?.referenceDuRapport),
      etabliLe: texte(releve?.emisLe)
    },
    structure,
    /**
     * **La légende de la structure d'abord, complétée par celle du relevé.**
     *
     * Les deux lisent **le même document**, donc compléter n'est pas emprunter.
     * Mais en cas de désaccord sur une marque, celle de la structure gagne : elle
     * est allée chercher la table exprès, sur six pages choisies pour cela, là où
     * le relevé la ramasse en passant.
     */
    legende: laLegendeComplete(legendeDeLaStructure, laLegendeDuReleve(releve?.legende)),
    markdown: assemble.texte,
    pages: liste(refait.pages),
    avis,
    lueSur: texte(releve?.organisme),
    luPar: leLecteurDunRapport(texte(refait.modele) || texte(reconnue?.modele)),
    sansStructure: !structure
  };

  return {
    ok: true,
    vue: {
      phase: "lue",
      etape: "",
      conservee: null,
      // La mesure se calcule une fois, sur la lecture achevée : la recalculer à
      // chaque ouverture la ferait changer avec le code qui la calcule, sur une
      // lecture qui, elle, n'a pas changé (règle 6).
      lecture: { ...lecture, mesure: lesMesuresDunRapport(lecture) }
    }
  };
}

/**
 * Lire plusieurs rapports, **en série**.
 *
 * Un lot de trente rapports lancé d'un coup se ferait limiter, et l'on perdrait
 * tout le lot pour avoir voulu aller vite. C'est déjà la règle de `relireLeLot`,
 * et elle vaut ici pour la même raison — en pire : chaque rapport coûte trois
 * appels au lieu d'un.
 *
 * Un rapport qui échoue n'arrête pas les suivants : son motif est gardé, et
 * l'écran dit lequel n'a pas été lu. Vingt-neuf lectures perdues parce que la
 * trentième n'a pas de texte serait le contraire de ce qu'on veut.
 */
export async function lireLesRapports(rapports = [], outils = {}) {
  const vues = [];
  const refus = [];

  for (const rapport of liste(rapports)) {
    const lu = await lireUnRapport(rapport, outils);
    if (lu.ok) vues.push(lu.vue);
    else {
      refus.push({
        nom: texte(rapport?.nom) || texte(rapport?.filename),
        motif: lu.motif,
        etape: lu.etape
      });
    }
  }

  return { vues, refus };
}

/** Ce que l'écran dit d'un lot qu'on vient de lire. */
export function phraseDuLotLu({ vues = [], refus = [] } = {}) {
  const lus = liste(vues).length;
  const manques = liste(refus).length;

  if (!lus) {
    return manques
      ? `Aucun rapport n'a pu être lu : ${manques} refus.`
      : "Aucun rapport à lire.";
  }

  const dit = `${lus} rapport${lus > 1 ? "s" : ""} lu${lus > 1 ? "s" : ""} et conservé${
    lus > 1 ? "s" : ""}`;
  return manques
    ? `${dit} — ${manques} non lu${manques > 1 ? "s" : ""}, et l'on dit pourquoi.`
    : `${dit}.`;
}
