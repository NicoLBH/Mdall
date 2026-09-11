/**
 * Le deuxième reconnaisseur : un compte rendu de chantier.
 *
 * ## Pourquoi il existe
 *
 * Déposer un PDF ne menait nulle part. Un seul reconnaisseur existait — celui
 * des livrables de bureau de contrôle —, et tout le reste retombait sur
 * « aucun émetteur reconnu ». Un compte rendu de chantier déposé n'était pas
 * *mal* traité : il n'était **pas traité du tout**.
 *
 * Reconnaître ce qu'est un document est ce qui décide de ce qu'on en fait :
 * un livrable de bureau de contrôle part vers les avis, un compte rendu de
 * chantier part vers les sujets. Sans cette réponse, il n'y a pas d'aiguillage.
 *
 * ## La leçon du premier essai : deux questions, pas une
 *
 * La première version cherchait un titre qui dise « compte rendu de chantier »,
 * d'un seul tenant. Aucun compte rendu réel ne s'appelle ainsi. Ils s'appellent
 * **« compte rendu de réunion n° 14 »**, et c'est une ligne plus bas, dans un
 * tableau d'en-tête, qu'on lit « Objet : suivi de chantier ». Le document
 * déposé pour l'essai a donc été rejeté, alors qu'il est exactement ce que
 * cette famille désigne.
 *
 * On pose donc **deux questions séparées**, et c'est leur conjonction qui
 * tranche :
 *
 *  1. **Le document se nomme-t-il compte rendu ?** — « compte rendu de
 *     réunion », « procès-verbal », « CR n° 14 ».
 *  2. **Parle-t-il d'un chantier ?** — le mot lui-même, ou une rubrique de lot
 *     (« Lot n° 1 : Démolition / Gros œuvre »), qui est la façon dont un compte
 *     rendu de chantier est **toujours** découpé.
 *
 * Les deux ensemble ne laissent guère de place au doute. Prises isolément, ni
 * l'une ni l'autre ne suffit : un compte rendu de commission de sécurité répond
 * oui à la première, un devis répond oui à la seconde.
 *
 * ## Ce qu'il refuse de deviner
 *
 * **L'auteur.** Le maître d'œuvre rédige le compte rendu, mais un compte rendu
 * nomme tout le monde — maître d'ouvrage, entreprises, bureau de contrôle,
 * coordonnateur. Choisir le premier nom venu attribuerait un document sur deux
 * au mauvais auteur. On ne le nomme donc que lorsqu'**une seule** mention
 * légale figure au document. Sinon, rien — ne pas savoir se dit (règle 5).
 *
 * ## Exploitable veut dire : il y a des observations à en tirer
 *
 * Une convocation est un compte rendu au sens du titre, et il n'y a rien
 * dedans. Elle est donc reconnue **sans contenu** plutôt que rejetée : ce n'est
 * pas un défaut du document, et le confondre avec un rejet ferait écarter une
 * pièce légitime du dossier.
 */

import { CONFIDENCE } from "./document-recognition.js";
import { candidatsDuDocument } from "./emetteur-du-document.js";

const FAMILY = "cr_chantier";
const FAMILY_LABEL = "Compte rendu de chantier";
const FAMILY_LABEL_PLURAL = "Comptes rendus de chantier";

/* ── Première question : le document se nomme-t-il compte rendu ? ─────────── */

/**
 * Les formes sous lesquelles un compte rendu se nomme lui-même.
 *
 * Toutes sont attestées. « Compte rendu de réunion n° 14 » est la plus
 * fréquente et c'est celle que la première version manquait ; « compte rendu de
 * chantier » existe aussi, et se suffit à elle-même (voir plus bas).
 */
const SE_NOMME = [
  /\bcomptes?[\s-]*rendus?\b/i,
  /\bproc[èe]s[\s-]*verbal\b/i,
  /\bc\.?\s?r\.?\s*n[°ºo]\s*\d/i
];

/**
 * La forme qui se suffit à elle-même : **le titre lui-même** dit « chantier ».
 *
 * Elle est rare, et elle reste : quand elle est là, il n'y a rien à conjuguer.
 *
 * Ce qui n'y est **pas**, et n'y sera pas : « réunion de chantier » tout court.
 * Un rapport de bureau de contrôle écrit « établi à la suite de la réunion de
 * chantier du 3 septembre », et le tenir pour un titre l'enverrait vers les
 * sujets au lieu des avis. C'est le piège de cette famille, et il a coûté un
 * essai.
 */
const SE_NOMME_DE_CHANTIER = [
  /\bcomptes?[\s-]*rendus?\s+(?:n[°ºo]\s*\S+\s+)?(?:de\s+|des\s+|du\s+)?(?:r[ée]unions?\s+(?:de\s+|du\s+)?)?chantier/i,
  /\bproc[èe]s[\s-]*verbal\s+(?:de\s+|du\s+)?(?:r[ée]union\s+(?:de\s+|du\s+)?)?chantier/i,
  /\bc\.?\s?r\.?\s+(?:de\s+|du\s+)?chantier\b/i,
  // **Numérotée**, et c'est toute la différence. Un document intitulé « Réunion
  // de chantier n° 3 » est le compte rendu de cette réunion ; un rapport qui
  // écrit « à la suite de la réunion de chantier du 3 septembre » n'en est pas
  // un. Le numéro sépare le titre de l'allusion.
  /\br[ée]unions?\s+(?:de\s+|du\s+)?chantier\s*n[°ºo]/i
];

/**
 * Une réunion de chantier évoquée. Un indice, jamais un titre.
 *
 * N'importe quelle pièce du chantier peut y faire allusion. Elle ne sert donc
 * qu'à lever un doute, en compagnie d'au moins deux marques de forme.
 */
const REUNION_DE_CHANTIER = /\br[ée]unions?\s+(?:de\s+|du\s+)?chantier\b/i;

/* ── Deuxième question : s'agit-il d'un chantier ? ────────────────────────── */

/**
 * Une rubrique de lot : « Lot n° 1 : Démolition / Gros œuvre ».
 *
 * C'est la marque la plus sûre des deux. Un compte rendu de chantier est
 * **toujours** découpé ainsi — c'est ce qui permet à chaque entreprise de lire
 * ce qui la concerne —, et rien d'autre ne se découpe de cette façon.
 */
const RUBRIQUE_DE_LOT = /^[\t ]*lots?\s*n?[°ºo]?\s*\d{1,2}\s*[:.–—-]/im;

/** Le mot lui-même, en toutes lettres. */
const MOT_CHANTIER = /\bchantiers?\b/i;

/**
 * Ce qui fait la forme d'un compte rendu, sans rien prouver seul.
 *
 * Aucune de ces marques ne vaut isolément : un rapport de bureau de contrôle
 * porte lui aussi une liste de diffusion et nomme la maîtrise d'œuvre. Elles ne
 * servent qu'à lever un doute, jamais à en créer une certitude.
 */
const FORMES = [
  { cle: "prochaine-reunion", motif: /\bprochaine\s+r[ée]union\b|\bprochain\s+r(?:endez-vous|dv)\b/i },
  { cle: "presents", motif: /\b(?:pr[ée]sents?|absents?|excus[ée]s?|convoqu[ée]s?)\s*[:\n]/i },
  { cle: "diffusion", motif: /\bdiffusion\b\s*(?:cr\b|du\s+compte|[:\n])/i },
  { cle: "lots", motif: /\blots?\s*n?[°ºo]?\s*\d{1,2}\b/i },
  { cle: "maitrise", motif: /\bma[îi]tr(?:e|ise)\s+d(?:'|’)?(?:œuvre|oeuvre|ouvrage)\b/i },
  { cle: "entreprise", motif: /\bentreprises?\s+[A-ZÉÈÀÂÊÎÔÛ]/ }
];

/* ── Y a-t-il de quoi en tirer des points à traiter ? ─────────────────────── */

/**
 * Les deux façons dont un compte rendu écrit ce qu'il y a à faire.
 *
 * Soit des points numérotés « 12.02.4 » — la façon de reporter un point d'une
 * réunion à la suivante —, soit des puces sous une rubrique de lot. La seconde
 * est de loin la plus répandue, et la première version ne la voyait pas : le
 * document de l'essai n'aurait été « exploitable » que par chance.
 */
const OBSERVATION_NUMEROTEE = /^[\t ]*\d{1,3}[.\-/]\d{1,3}(?:[.\-/]\d{1,3})?\s+\S/m;
const PUCE = /^[\t ]*[❑❏□■▪•·o*-]\s*\S/m;

/** La ligne où un motif se lit, et la page où elle se trouve. Un verdict sans preuve n'est qu'une intuition. */
function preuve(motif, pages = [], texte = "") {
  for (const page of Array.isArray(pages) ? pages : []) {
    const ligne = ligneQuiPorte(motif, page?.text ?? page?.texte);
    if (ligne) return { text: ligne, page: Number(page?.page) || null };
  }

  const ligne = ligneQuiPorte(motif, texte);
  return ligne ? { text: ligne, page: null } : null;
}

function ligneQuiPorte(motif, contenu) {
  // Le motif peut porter le drapeau `m` et s'ancrer en début de ligne : on le
  // relit donc ligne par ligne, ce qui vaut pour les deux formes.
  const seul = new RegExp(motif.source, motif.flags.replace("g", ""));
  for (const ligne of String(contenu ?? "").split(/\r?\n/)) {
    if (seul.test(ligne)) return ligne.trim().slice(0, 200);
  }
  return null;
}

export function createCrChantierRecognizer() {
  return {
    id: "cr-chantier",
    version: 2,

    recognize({ text, pages }) {
      const titreDeChantier = SE_NOMME_DE_CHANTIER.find((motif) => motif.test(text)) ?? null;
      const seNomme = SE_NOMME.find((motif) => motif.test(text)) ?? null;

      const aDesLots = RUBRIQUE_DE_LOT.test(text);
      const parleDeChantier = MOT_CHANTIER.test(text) || aDesLots;
      const formes = FORMES.filter((forme) => forme.motif.test(text));

      // Le titre qui dit déjà « chantier » se suffit. Sinon il faut les **deux**
      // réponses : le document se nomme compte rendu, et il parle d'un chantier.
      // Un compte rendu de commission de sécurité répond oui à la première
      // seule ; un devis, oui à la seconde seule.
      //
      // À défaut des deux, une réunion de chantier évoquée et deux marques de
      // forme donnent un probable — et jamais mieux : un rapport de bureau de
      // contrôle en dit parfois autant.
      let confidence = null;
      if (titreDeChantier) confidence = CONFIDENCE.CERTAIN;
      else if (seNomme && parleDeChantier) confidence = CONFIDENCE.CERTAIN;
      else if ((seNomme || REUNION_DE_CHANTIER.test(text)) && formes.length >= 2) {
        confidence = CONFIDENCE.PROBABLE;
      }

      if (!confidence) return null;

      // Une rubrique de lot ou un point numéroté, ou des puces : c'est ce dont
      // on tire des points à traiter. Les puces sont de loin la forme la plus
      // répandue, et les manquer rendrait « sans contenu » un compte rendu qui
      // en porte trente.
      const exploitable = aDesLots || OBSERVATION_NUMEROTEE.test(text) || PUCE.test(text);

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
        evidence: preuve(titreDeChantier ?? seNomme ?? REUNION_DE_CHANTIER, pages, text),
        exploitable,
        note: exploitable
          ? `Reconnu comme compte rendu de chantier${
              auteur ? ` rédigé par ${auteur.label}` : ""
            }${aDesLots ? ", découpé en lots" : ""}.`
          : `Reconnu comme compte rendu de chantier, mais il ne porte ni rubrique de lot ` +
            `ni point à traiter : il n'y a pas de sujet à en tirer.`
      };
    }
  };
}

/** La famille, pour qui doit aiguiller sur elle sans réécrire la chaîne. */
export const CR_CHANTIER_KIND = FAMILY;
