/**
 * Le deuxième reconnaisseur : un compte rendu de chantier.
 *
 * ## Pourquoi il fallait commencer par là
 *
 * Déposer un PDF ne menait nulle part. Un seul reconnaisseur existait — celui
 * des livrables de bureau de contrôle —, et tout le reste retombait sur
 * « aucun émetteur reconnu ». Un compte rendu de chantier déposé n'était donc
 * pas *mal* traité : il n'était **pas traité du tout**.
 *
 * Reconnaître ce qu'est un document est ce qui décide de ce qu'on en fait :
 * un livrable de bureau de contrôle part vers les avis, un compte rendu de
 * chantier part vers les sujets. Sans cette réponse, il n'y a pas d'aiguillage,
 * et sans aiguillage il n'y a qu'un seul chemin — celui d'avant.
 *
 * ## Ce qu'il lit, et ce qu'il refuse de deviner
 *
 * **Le titre tranche.** « Compte rendu de réunion de chantier », « CR de
 * chantier n° 12 », « procès-verbal de chantier » : un document qui se nomme
 * ainsi est ce qu'il dit être. C'est la seule marque qui vaille à elle seule.
 *
 * **Le reste ne vaut qu'ensemble.** Une réunion de chantier mentionnée, plus
 * une structure de compte rendu — les présents, la diffusion, la prochaine
 * réunion, les lots —, donne un probable, jamais un certain. Un rapport de
 * bureau de contrôle cite lui aussi des réunions de chantier, et le prendre
 * pour un compte rendu l'enverrait vers le mauvais atelier.
 *
 * **L'auteur ne se devine pas.** Le maître d'œuvre rédige le compte rendu, mais
 * un compte rendu nomme tout le monde — maître d'ouvrage, entreprises, bureau
 * de contrôle. Choisir le premier nom venu attribuerait un document sur deux au
 * mauvais auteur. On ne le nomme donc que lorsqu'**une seule** mention légale
 * figure au document : on ne met la sienne qu'au pied de ses propres pages.
 * Sinon, rien — ne pas savoir se dit (règle 5).
 *
 * ## Exploitable veut dire : il y a des observations à en tirer
 *
 * Une convocation à réunion est un compte rendu de chantier au sens du titre,
 * et il n'y a rien dedans. Elle est donc reconnue **sans contenu** plutôt que
 * rejetée : ce n'est pas un défaut du document, et le confondre avec un rejet
 * ferait écarter une pièce légitime du dossier.
 */

import { CONFIDENCE } from "./document-recognition.js";
import { candidatsDuDocument } from "./emetteur-du-document.js";

const FAMILY = "cr_chantier";
const FAMILY_LABEL = "Compte rendu de chantier";
const FAMILY_LABEL_PLURAL = "Comptes rendus de chantier";

/**
 * Le titre, et lui seul, suffit.
 *
 * Les trois formes que le métier écrit vraiment, avec les abréviations et les
 * traits d'union qu'une extraction de PDF laisse passer. « Réunion de chantier
 * n° 12 » en fait partie : un document qui se numérote ainsi en tête est le
 * compte rendu de cette réunion, pas une allusion à celle-ci.
 */
const TITRES = [
  /\bcomptes?[\s-]*rendus?\s+(?:n[°ºo]\s*\S+\s+)?(?:de\s+|des\s+|du\s+)?(?:r[ée]unions?\s+(?:de\s+|du\s+)?)?chantier/i,
  /\bproc[èe]s[\s-]*verbal\s+(?:de\s+|du\s+)?(?:r[ée]union\s+(?:de\s+|du\s+)?)?chantier/i,
  /\bc\.?\s?r\.?\s+(?:de\s+)?chantier\b/i,
  /\br[ée]unions?\s+(?:de\s+|du\s+)?chantier\s*n[°ºo]/i
];

/**
 * Ce qui fait la forme d'un compte rendu, sans en être le titre.
 *
 * Aucun de ces indices ne vaut seul : un rapport de bureau de contrôle porte
 * lui aussi une liste de diffusion, et un devis porte des lots.
 */
const FORMES = [
  { cle: "prochaine-reunion", motif: /\bprochaine\s+r[ée]union\b/i, dit: "la prochaine réunion y est annoncée" },
  { cle: "presents", motif: /\b(?:pr[ée]sents?|absents?\s+excus[ée]s?|excus[ée]s?)\s*[:\n]/i, dit: "il porte une liste de présents" },
  { cle: "diffusion", motif: /\bdiffusion\s*[:\n]/i, dit: "il porte une liste de diffusion" },
  { cle: "lots", motif: /\blots?\s*n?[°ºo]?\s*\d{1,2}\b/i, dit: "il est découpé en lots" },
  { cle: "maitrise", motif: /\bma[îi]tr(?:e|ise)\s+d(?:'|’)?(?:œuvre|oeuvre|ouvrage)\b/i, dit: "il nomme la maîtrise d'œuvre ou d'ouvrage" }
];

/** Une réunion de chantier évoquée : nécessaire au doute, jamais suffisante. */
const REUNION = /\br[ée]unions?\s+(?:de\s+|du\s+)?chantier\b/i;

/**
 * Ce qui donne à un compte rendu de quoi remplir des sujets.
 *
 * Soit des rubriques de lot — c'est la découpe habituelle —, soit des
 * observations numérotées « 12.02.4 », qui est la façon dont un compte rendu
 * reporte un point d'une réunion à la suivante.
 */
const RUBRIQUE_DE_LOT = /^[\t ]*lot\s*n?[°ºo]?\s*\d{1,2}\b.*$/im;
const OBSERVATION_NUMEROTEE = /^[\t ]*\d{1,3}[.\-/]\d{1,3}(?:[.\-/]\d{1,3})?\s+\S/m;

/** La ligne où un motif se lit, et la page où elle se trouve. Un verdict sans preuve n'est qu'une intuition. */
function preuve(motif, pages = [], texte = "") {
  for (const page of Array.isArray(pages) ? pages : []) {
    const contenu = String(page?.text ?? page?.texte ?? "");
    const ligne = ligneQuiPorte(motif, contenu);
    if (ligne) return { text: ligne, page: Number(page?.page) || null };
  }

  const ligne = ligneQuiPorte(motif, texte);
  return ligne ? { text: ligne, page: null } : null;
}

function ligneQuiPorte(motif, contenu) {
  for (const ligne of String(contenu ?? "").split(/\r?\n/)) {
    if (motif.test(ligne)) return ligne.trim().slice(0, 200);
  }
  return null;
}

export function createCrChantierRecognizer() {
  return {
    id: "cr-chantier",
    version: 1,

    recognize({ text, pages }) {
      const titre = TITRES.find((motif) => motif.test(text)) ?? null;
      const formes = FORMES.filter((forme) => forme.motif.test(text));

      // Le titre suffit. Sinon il faut une réunion de chantier **et** deux
      // marques de forme : une seule se trouve dans trop de documents qui n'en
      // sont pas.
      let confidence = null;
      if (titre) confidence = CONFIDENCE.CERTAIN;
      else if (REUNION.test(text) && formes.length >= 2) confidence = CONFIDENCE.PROBABLE;

      if (!confidence) return null;

      const aDesLots = RUBRIQUE_DE_LOT.test(text);
      const aDesObservations = OBSERVATION_NUMEROTEE.test(text);
      const exploitable = aDesLots || aDesObservations;

      // Une seule mention légale au document : c'est celle de celui qui l'a
      // rédigé. Plusieurs, et l'on ne sait plus — un compte rendu les nomme
      // tous.
      const candidats = candidatsDuDocument({ texte: text, pages });
      const auteur = candidats.length === 1 ? candidats[0] : null;

      return {
        kind: FAMILY,
        kindLabel: FAMILY_LABEL,
        kindLabelPlural: FAMILY_LABEL_PLURAL,
        // L'identifiant d'un organisme connu, et il n'y en a pas ici : la liste
        // des organismes est celle des bureaux de contrôle. Le libellé, lui, se
        // lit.
        author: null,
        authorLabel: auteur?.label ?? null,
        confidence,
        declaredReference: null,
        issuedAt: null,
        // Un compte rendu ne porte pas de numéro d'affaire de bureau de
        // contrôle. Il ne se rattache donc pas par marqueur, et prétendre le
        // contraire ferait poser une question à laquelle rien ne répond.
        markers: [],
        evidence: titre
          ? preuve(titre, pages, text)
          : preuve(REUNION, pages, text),
        exploitable,
        note: exploitable
          ? `Reconnu comme compte rendu de chantier${
              auteur ? ` rédigé par ${auteur.label}` : ""
            }${aDesLots ? ", découpé en lots" : ""}.`
          : `Reconnu comme compte rendu de chantier, mais il ne porte ni rubrique de lot ` +
            `ni observation numérotée : il n'y a pas de sujet à en tirer.`
      };
    }
  };
}

/** La famille, pour qui doit aiguiller sur elle sans réécrire la chaîne. */
export const CR_CHANTIER_KIND = FAMILY;
