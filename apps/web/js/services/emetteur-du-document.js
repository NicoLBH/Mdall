/**
 * Qui a émis ce document.
 *
 * ## Pourquoi ce fichier existe
 *
 * L'étape précédente demandait le nom de l'organisme à l'utilisateur, au motif
 * qu'il « ne se lit pas dans le PDF de façon fiable ». C'était faux, et il
 * suffit d'ouvrir un rapport pour le voir : le nom y est imprimé en pied de
 * chaque page, dans la raison sociale complète, dans l'adresse du siège, et
 * dans le domaine de l'adresse électronique du responsable d'affaire. Un outil
 * qui demande à quelqu'un de retaper ce qui est écrit six fois sous ses yeux
 * passe pour un idiot.
 *
 * ## Ce qui rend la reconnaissance sûre
 *
 * Pas la fréquence : un rapport de contrôle technique nomme le maître
 * d'ouvrage autant que son auteur, et compter les occurrences accrocherait un
 * jour le client. Ce sont des **signaux de nature différente**, classés par ce
 * qu'ils prouvent :
 *
 *  1. **le domaine d'une adresse électronique** — `…@socotec.com`. Personne
 *     n'écrit le domaine d'un autre : un destinataire porte le sien ;
 *  2. **la raison sociale** — « SOCOTEC Construction - S.A.S. au capital de
 *     … - RCS Versailles ». La mention légale ne se met qu'au pied de ses
 *     propres pages ;
 *  3. **le nom, simplement écrit.** Le plus faible : un compte rendu de
 *     chantier cite le bureau de contrôle sans en être l'œuvre.
 *
 * Les deux premiers valent certitude. Le troisième seul ne vaut que
 * vraisemblance, et se dit comme tel.
 *
 * ## Pourquoi la liste est courte, et pourquoi elle ne suffit pas
 *
 * Les bureaux de contrôle agréés ne sont pas nombreux. Les nommer n'est pas
 * une heuristique : une raison sociale s'écrit d'une seule façon, et rien ne
 * s'apprend d'un corpus qu'on n'aurait pas. C'est la différence avec un pack
 * de mise en page (`spikes/ct-continuity/packs/`), qui, lui, ne s'écrit pas
 * sans avoir vu les documents de l'organisme : ce module dit **qui**, un pack
 * dit **comment c'est composé**.
 *
 * Mais la liste ne fermera jamais la question, et demain les documents ne
 * seront plus des rapports normalisés : des comptes rendus de réunion, des
 * courriels, des notes. Un émetteur inconnu doit donc se **proposer** plutôt
 * que de se taire (règle 5) : la mention légale se lit sans connaître le nom
 * qu'elle porte, et c'est de là que sortent les candidats.
 *
 * ## Ce qu'il ne fait pas
 *
 * Il ne devine pas. Deux organismes connus avec un signal fort chacun — un
 * rapport qui cite le rapport d'un confrère — ne se départagent pas ici : il
 * le dit, et quelqu'un tranche. Et il ne lit jamais qui a *signé* : un nom de
 * personne n'est pas un émetteur, et la mémoire n'a que faire de savoir qui
 * tenait le stylo.
 */

import { aplati } from "./recherche-de-valeur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qui prouve un émetteur, du plus fort au plus faible.
 *
 * L'ordre compte : c'est lui qui départage deux organismes présents dans le
 * même document.
 */
export const SIGNAL = {
  /** Une adresse électronique au domaine de l'organisme. */
  DOMAINE: "domaine",
  /** Le nom dans une mention légale : raison sociale, capital, RCS, SIREN. */
  RAISON_SOCIALE: "raison-sociale",
  /** Le nom, simplement écrit quelque part. */
  NOMME: "nomme"
};

const FORCE = { [SIGNAL.DOMAINE]: 3, [SIGNAL.RAISON_SOCIALE]: 2, [SIGNAL.NOMME]: 1 };

/** Un signal fort suffit à nommer l'émetteur ; le nom seul ne suffit pas. */
const FORT = 2;

export const PHRASES_DU_SIGNAL = {
  [SIGNAL.DOMAINE]: "une adresse électronique à son domaine",
  [SIGNAL.RAISON_SOCIALE]: "sa raison sociale, en mention légale",
  [SIGNAL.NOMME]: "son nom, écrit dans le document"
};

/**
 * Ce qu'on sait de l'émetteur.
 *
 * Quatre états et non un booléen : « je ne sais pas » et « il y en a deux » ne
 * se traitent pas pareil à l'écran, et ni l'un ni l'autre ne se traite comme
 * un champ vide.
 */
export const EMETTEUR = {
  /** Un seul organisme, avec un signal fort. */
  CERTAIN: "certain",
  /** Un seul organisme, seulement nommé. */
  PROBABLE: "probable",
  /** Plusieurs organismes se disputent le document. */
  PLUSIEURS: "plusieurs",
  /** Aucun organisme connu ; des candidats, peut-être. */
  INCONNU: "inconnu"
};

export const PHRASES_DE_LEMETTEUR = {
  [EMETTEUR.CERTAIN]: "le document le porte",
  [EMETTEUR.PROBABLE]: "le document le nomme, sans le signer",
  [EMETTEUR.PLUSIEURS]: "plusieurs organismes y figurent : il faut dire lequel l'a émis",
  [EMETTEUR.INCONNU]: "aucun organisme connu n'y figure"
};

/**
 * Les organismes que nous savons nommer.
 *
 * Restreinte et ouverte : restreinte parce qu'un nom faux est pire qu'un nom
 * manquant, ouverte parce que `candidats` rend ce qu'elle ne connaît pas.
 *
 * `noms` s'écrit en clair et se compare sur le texte aplati : les rapports
 * écrivent « SOCOTEC », « Socotec », « Bureau Véritas » et « Bureau Veritas »
 * indifféremment.
 */
export const ORGANISMES = [
  { id: "socotec", label: "SOCOTEC", noms: ["socotec"], domaines: ["socotec.com", "socotec.fr"] },
  { id: "apave", label: "APAVE", noms: ["apave"], domaines: ["apave.com", "apave.fr"] },
  {
    id: "bureau-veritas",
    label: "Bureau Veritas",
    noms: ["bureau veritas", "veritas"],
    domaines: ["bureauveritas.com", "fr.bureauveritas.com"]
  },
  { id: "qualiconsult", label: "Qualiconsult", noms: ["qualiconsult"], domaines: ["qualiconsult.fr"] },
  {
    id: "alpes-controle",
    label: "Alpes Contrôle",
    noms: ["bureau alpes controle", "alpes controle"],
    domaines: ["alpes-controle.fr"]
  },
  { id: "dekra", label: "Dekra", noms: ["dekra"], domaines: ["dekra.com", "dekra.fr"] },
  { id: "batiplus", label: "Batiplus", noms: ["batiplus"], domaines: ["batiplus.fr"] }
];

/** Ce qui signale une mention légale, et donc les pages de son propre auteur. */
const MENTION_LEGALE = /(au capital de|\bR\.?C\.?S\.?\b|\bSIREN\b|\bSIRET\b|\bAPE\s*\d|n°\s*tva)/i;

/**
 * La raison sociale d'un émetteur qu'on ne connaît pas.
 *
 * Ce qui précède la forme juridique, sur la même ligne : « Untel Construction
 * - S.A.S. au capital de … ». On ne retient que ce qui ressemble à un nom
 * d'entreprise — des mots capitalisés — et jamais plus de quatre, pour ne pas
 * emporter la phrase entière.
 */
const FORME_JURIDIQUE = /([^\n,;]{3,60}?)\s*[-–,]?\s*(S\.?A\.?S\.?U?|S\.?A\.?R\.?L\.?|S\.?A\.?|SNC|SCOP)\b[^\n]{0,40}au capital/gi;

/**
 * Les pages d'un document, sous une forme unique.
 *
 * Un appelant a des pages numérotées (un PDF), un autre n'a qu'un texte (un
 * courriel, un compte rendu collé). Les deux entrent ici, et la suite du
 * fichier ne sait plus lequel c'était.
 */
function pagesDuDocument({ texte: contenu = "", pages = [] } = {}) {
  const numerotees = (Array.isArray(pages) ? pages : [])
    .map((page, rang) => ({ page: Number(page?.page ?? rang + 1), texte: texte(page?.text ?? page?.texte) }))
    .filter((page) => page.texte);

  if (numerotees.length) return numerotees;

  const entier = texte(contenu);
  return entier ? [{ page: null, texte: entier }] : [];
}

/**
 * La ligne qui porte une preuve, et la page où elle se lit.
 *
 * Une preuve sans son extrait ne se vérifie pas : quelqu'un doit pouvoir lire
 * ce que le système a lu, sans rouvrir le PDF.
 */
function preuveDansLesPages(pages, correspond, dejaVues = []) {
  for (const page of pages) {
    for (const ligne of page.texte.split(/\r?\n/)) {
      const extrait = ligne.trim().slice(0, 160);
      // Une preuve déjà comptée sous un signal plus fort ne compte pas deux
      // fois : on cherche ailleurs, ou on n'ajoute rien.
      if (dejaVues.includes(extrait)) continue;
      if (correspond(ligne)) return { extrait, page: page.page };
    }
  }
  return null;
}

/** Les signaux d'un organisme dans ce document, du plus fort au plus faible. */
function signauxDeLOrganisme(organisme, pages, plat) {
  const preuves = [];

  for (const domaine of organisme.domaines ?? []) {
    if (!plat.includes(`@${aplati(domaine)}`)) continue;
    const preuve = preuveDansLesPages(pages, (ligne) => aplati(ligne).includes(`@${aplati(domaine)}`));
    if (preuve) preuves.push({ signal: SIGNAL.DOMAINE, ...preuve });
    break;
  }

  for (const nom of organisme.noms ?? []) {
    const cherche = aplati(nom);
    if (!plat.includes(cherche)) continue;

    const legale = preuveDansLesPages(
      pages,
      (ligne) => aplati(ligne).includes(cherche) && MENTION_LEGALE.test(ligne)
    );
    if (legale) preuves.push({ signal: SIGNAL.RAISON_SOCIALE, ...legale });

    // Ailleurs que là où on l'a déjà lu : trois fois la même ligne ne prouve
    // pas trois fois, et une preuve de plus doit montrer un endroit de plus.
    const nomme = preuveDansLesPages(
      pages,
      (ligne) => aplati(ligne).includes(cherche),
      preuves.map((preuve) => preuve.extrait)
    );
    if (nomme) preuves.push({ signal: SIGNAL.NOMME, ...nomme });
    break;
  }

  return preuves.sort((gauche, droite) => FORCE[droite.signal] - FORCE[gauche.signal]);
}

/**
 * Ce que le document propose quand aucun organisme connu n'y figure.
 *
 * **Jamais les domaines des adresses électroniques.** Un rapport porte celle
 * de son destinataire autant que celle de son auteur, et le premier domaine
 * venu serait le client une fois sur deux. Seule la mention légale distingue :
 * on ne met la sienne qu'au pied de ses propres pages.
 */
export function candidatsDuDocument({ texte: contenu = "", pages = [] } = {}) {
  const lues = pagesDuDocument({ texte: contenu, pages });
  const vus = new Map();

  for (const page of lues) {
    for (const trouve of page.texte.matchAll(FORME_JURIDIQUE)) {
      const brut = texte(trouve[1]).replace(/^[-–,\s]+/, "");
      const mots = brut.split(/\s+/).filter(Boolean).slice(-4);
      const nom = mots.join(" ");
      if (!nom || nom.length < 3) continue;

      const cle = aplati(nom);
      if (vus.has(cle)) continue;
      vus.set(cle, {
        label: nom,
        signal: SIGNAL.RAISON_SOCIALE,
        extrait: texte(trouve[0]).slice(0, 160),
        page: page.page
      });
    }
  }

  return [...vus.values()];
}

/**
 * Qui a émis ce document.
 *
 * @param {object} options
 * @param {string} [options.texte] le document entier, quand il n'a pas de pages
 * @param {object[]} [options.pages] `{page, text}`, tel qu'un PDF les rend
 * @returns {{organisme: object|null, certitude: string, preuves: object[], candidats: object[]}}
 */
export function emetteurDuDocument({ texte: contenu = "", pages = [] } = {}) {
  const lues = pagesDuDocument({ texte: contenu, pages });
  const plat = aplati(lues.map((page) => page.texte).join("\n"));

  const presents = ORGANISMES
    .map((organisme) => ({ organisme, preuves: signauxDeLOrganisme(organisme, lues, plat) }))
    .filter((entree) => entree.preuves.length)
    .sort((gauche, droite) => FORCE[droite.preuves[0].signal] - FORCE[gauche.preuves[0].signal]);

  if (!presents.length) {
    return {
      organisme: null,
      certitude: EMETTEUR.INCONNU,
      preuves: [],
      candidats: candidatsDuDocument({ texte: contenu, pages })
    };
  }

  const [premier, second] = presents;
  const forts = presents.filter((entree) => FORCE[entree.preuves[0].signal] >= FORT);

  // Deux organismes signent le même document : un rapport qui cite celui d'un
  // confrère, un compte rendu qui reprend les deux. Rien ici ne peut trancher,
  // et en choisir un accrocherait les avis au mauvais nom.
  if (forts.length > 1 || (!forts.length && second)) {
    return {
      organisme: null,
      certitude: EMETTEUR.PLUSIEURS,
      preuves: presents.flatMap((entree) =>
        entree.preuves.slice(0, 1).map((preuve) => ({ ...preuve, id: entree.organisme.id }))),
      candidats: presents.map((entree) => ({
        id: entree.organisme.id,
        label: entree.organisme.label,
        signal: entree.preuves[0].signal,
        extrait: entree.preuves[0].extrait,
        page: entree.preuves[0].page
      }))
    };
  }

  return {
    organisme: { id: premier.organisme.id, label: premier.organisme.label },
    certitude: FORCE[premier.preuves[0].signal] >= FORT ? EMETTEUR.CERTAIN : EMETTEUR.PROBABLE,
    preuves: premier.preuves,
    candidats: []
  };
}

/**
 * Le nom à écrire dans la mémoire, ou rien.
 *
 * Rien, plutôt qu'un nom probable : un avis porte la responsabilité de qui l'a
 * rendu, et « probablement SOCOTEC » n'est pas une signature. Ce qui est
 * seulement vraisemblable se propose à l'écran et se signe (règle 1).
 */
export function organismeCertain(emetteur = null) {
  return emetteur?.certitude === EMETTEUR.CERTAIN ? texte(emetteur?.organisme?.label) : "";
}
