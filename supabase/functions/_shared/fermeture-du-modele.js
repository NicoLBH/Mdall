/**
 * Le brouillon de fermeture écrit par le modèle, et ce qui le rend acceptable.
 *
 * ## Ce que le modèle fait ici
 *
 * Fermer un sujet demande d'écrire ce qu'on a tranché : la question, ce qu'on
 * retient, les possibles écartés, le motif. Tout est déjà dit dans le fil — le
 * titre, la description, les commentaires — et personne n'a envie de le
 * recopier à la main à la fin d'une journée. C'est exactement le travail d'un
 * modèle : **relire et remettre en forme**.
 *
 * Ce qu'il rend est un **brouillon**, jamais une décision. Il tombe dans les
 * champs d'une fenêtre qu'un humain relit et corrige, et ce qui en sort n'est
 * encore qu'une **proposition** que quelqu'un signera. Deux portes humaines
 * avant la mémoire, et la règle 1 tient.
 *
 * ## Ce qui le rend acceptable : aucun chiffre venu de lui
 *
 * C'est la seule faute fatale. « Profondeur hors gel = 0,80 m » écrit par un
 * modèle est indiscernable d'une valeur du projet, et personne ne va vérifier
 * un champ pré-rempli à 19 h. Une consigne est un vœu ; un contrôle est une
 * garantie — et le contrôle est ici, testé en Node, pas dans l'instruction.
 *
 * **Tout groupe de caractères contenant un chiffre** doit se retrouver tel quel
 * dans la matière envoyée : « 0,69 m », « R+2 », « C25/30 », « 3e famille ». Ce
 * qui ne s'y retrouve pas fait tomber le brouillon.
 *
 * ## Et le refus porte sur le brouillon entier
 *
 * Vider le seul champ fautif laisserait les autres en place — or on vient de
 * découvrir que le modèle invente, et l'on n'a aucune raison de croire qu'il
 * n'a inventé qu'une fois. Pire : un champ vide au milieu d'un brouillon
 * rempli invite à le compléter de mémoire, c'est-à-dire avec ce que le modèle
 * venait d'écrire.
 *
 * ## Ce qu'on ne lui demande pas
 *
 * **De trancher.** Il n'écrit que ce que le fil dit. Un sujet où personne n'a
 * conclu doit produire un brouillon sans conclusion — et c'est une information,
 * pas un échec.
 *
 * ## Il est pur
 *
 * Aucun appel réseau, aucune clé : il reçoit ce que le modèle a rendu et la
 * matière qu'on lui avait donnée, et il dit si cela tient. C'est ce qui permet
 * de l'exécuter en Node et de casser ses gardes pour les voir tomber.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi un brouillon est écarté. */
export const ECART = {
  CHIFFRE_INVENTE: "chiffre-invente",
  SANS_QUESTION: "sans-question",
  ILLISIBLE: "illisible"
};

export const ECARTS_DITS = {
  [ECART.CHIFFRE_INVENTE]: "le copilote a écrit un chiffre qui ne figure nulle part dans ce sujet",
  [ECART.SANS_QUESTION]: "le copilote n'a pas su dire quelle question était tranchée",
  [ECART.ILLISIBLE]: "le copilote n'a pas répondu dans la forme attendue"
};

/**
 * Les groupes de caractères qui portent un chiffre.
 *
 * On découpe sur les espaces et la ponctuation de phrase — **pas** sur la
 * virgule ni sur le point, qui sont dans les nombres français (« 0,69 »,
 * « 2.50 ») et dans les références (« 12.02.1 »). Découper dessus rendrait
 * « 0 » et « 69 » séparément, et « 0,69 » inventé passerait parce que « 69 »
 * figure ailleurs.
 */
export function jetonsChiffres(valeur) {
  return texte(valeur)
    .split(/[\s;:!?()[\]«»"']+/)
    .map((jeton) => jeton.replace(/^[.,]+|[.,]+$/g, ""))
    .filter((jeton) => /\d/.test(jeton));
}

/** Tout ce qu'un brouillon écrit, mis bout à bout. */
function toutCeQuIlEcrit(brouillon) {
  return [
    texte(brouillon?.question),
    texte(brouillon?.retenu),
    texte(brouillon?.motif),
    ...(Array.isArray(brouillon?.ecartes) ? brouillon.ecartes : [])
      .flatMap((ecarte) => [texte(ecarte?.quoi), texte(ecarte?.pourquoi)])
  ].filter(Boolean).join(" ");
}

/**
 * Le brouillon, s'il tient — et sinon, pourquoi.
 *
 * @param {object} brut ce que le modèle a rendu
 * @param {object} options
 * @param {string} options.matiere le fil qu'on lui avait donné, tel quel
 * @returns {{brouillon: object|null, ecarts: string[], inventes: string[]}}
 */
export function brouillonVerifie(brut = null, { matiere = "" } = {}) {
  const refus = (quoi, inventes = []) => ({ brouillon: null, ecarts: [quoi], inventes });

  // Un tableau est un objet pour JavaScript, et ce n'en est pas un ici : un
  // modèle qui rend `[{...}]` au lieu de `{...}` doit s'entendre dire qu'il n'a
  // pas répondu dans la forme attendue, pas qu'il a oublié la question.
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return refus(ECART.ILLISIBLE);

  const question = texte(brut.question);
  if (!question) return refus(ECART.SANS_QUESTION);

  const ecartes = (Array.isArray(brut.ecartes) ? brut.ecartes : [])
    .map((ecarte) => ({ quoi: texte(ecarte?.quoi), pourquoi: texte(ecarte?.pourquoi) }))
    .filter((ecarte) => ecarte.quoi);

  const brouillon = { question, retenu: texte(brut.retenu), ecartes, motif: texte(brut.motif) };

  // La matière est comparée telle quelle : c'est le texte qu'on lui a donné, et
  // le replier des deux côtés laisserait passer « 0,69M » pour « 0,69 m ». Un
  // chiffre se recopie à l'identique ou ne se recopie pas.
  const donnee = String(matiere ?? "");
  const inventes = [...new Set(jetonsChiffres(toutCeQuIlEcrit(brouillon)))]
    .filter((jeton) => !donnee.includes(jeton));

  if (inventes.length) return refus(ECART.CHIFFRE_INVENTE, inventes);

  return { brouillon, ecarts: [], inventes: [] };
}

/** Ce qu'on dit d'un refus, pour que l'écran n'ait pas à le rédiger. */
export function phraseDesEcarts(ecarts = [], inventes = []) {
  const dits = (Array.isArray(ecarts) ? ecarts : []).map((quoi) => ECARTS_DITS[quoi]).filter(Boolean);
  if (!dits.length) return "";

  const preuve = inventes?.length ? ` (${inventes.join(", ")})` : "";
  return `Brouillon écarté : ${dits.join(" ; ")}${preuve}.`;
}
