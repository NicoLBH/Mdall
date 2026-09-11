/**
 * Ce qu'un compte rendu de chantier propose d'ouvrir, et ce qu'il redit.
 *
 * ## Le problème que ce fichier existe pour résoudre
 *
 * Un compte rendu de chantier **reporte**. La douzième réunion reprend les
 * points de la onzième, qui reprenait ceux de la dixième — c'est sa raison
 * d'être : un point reste écrit tant qu'il n'est pas soldé. Verser tout ce
 * qu'un compte rendu porte ouvrirait donc, à la douzième réunion, douze fois le
 * même sujet.
 *
 * Et l'inverse est pire : écarter un point parce qu'il ressemble à un autre
 * ferait taire une observation nouvelle sur un ouvrage déjà discuté.
 *
 * ## Trois façons de reconnaître qu'un point est déjà là, dans cet ordre
 *
 * 1. **Son numéro.** « 12.02.1 » désigne le même point d'un compte rendu à
 *    l'autre — c'est ce que la numérotation du métier veut dire. C'est la
 *    reconnaissance la plus sûre, et la seule qui survive à une reformulation.
 * 2. **Un sujet du projet qui porte le même titre.** Le compte rendu
 *    d'aujourd'hui redit ce qu'on a déjà ouvert hier, à la main ou autrement.
 * 3. **Le lot lui-même.** Deux comptes rendus déposés ensemble se recouvrent.
 *
 * ## Ce qui est écarté se compte et se dit
 *
 * Un point mis de côté parce qu'il est déjà suivi n'est pas un point qui
 * n'existe pas : rendre une liste courte sans dire ce qu'on en a retiré ferait
 * croire à un compte rendu maigre (règle 5). Les deux listes reviennent donc
 * ensemble, et l'écran les montre toutes les deux.
 *
 * ## Rien n'est créé ici
 *
 * Ce module rend des **propositions**. Ouvrir un sujet engage quelqu'un à le
 * traiter : c'est une décision, elle se prend par une proposition que quelqu'un
 * signe, jamais par un dépôt de fichier (règle 1).
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Un titre réduit à ce qui se compare.
 *
 * Un compte rendu recopie ses points d'une réunion à l'autre, à la ponctuation
 * près : un point final de plus ne fait pas un point nouveau.
 */
export function titreAplati(valeur) {
  return texte(valeur)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9'\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pourquoi un point lu n'est pas proposé. Nommés : l'écran doit pouvoir le dire. */
export const DEJA = {
  /** Le même numéro de compte rendu a déjà été versé. */
  MEME_NUMERO: "meme-numero",
  /**
   * Quelqu'un a déjà refusé ce point.
   *
   * Distinct du précédent, et pas par souci d'exactitude : « déjà versé » et
   * « déjà écarté » n'appellent pas la même réaction. Le premier se vérifie dans
   * les sujets ; le second demande de savoir **pourquoi** on a dit non, et
   * l'annoncer comme un versement ferait chercher un sujet qui n'existe pas.
   */
  DEJA_ECARTE: "deja-ecarte",
  /** Un sujet du projet porte déjà ce titre. */
  MEME_TITRE: "meme-titre",
  /** Deux documents du même dépôt portent ce point. */
  DANS_LE_LOT: "dans-le-lot"
};

export const PHRASES_DU_DEJA = {
  [DEJA.MEME_NUMERO]: "ce point a déjà été versé sous ce numéro",
  [DEJA.DEJA_ECARTE]: "ce point a déjà été écarté lors d'un dépôt précédent",
  [DEJA.MEME_TITRE]: "un sujet du projet porte déjà ce titre",
  [DEJA.DANS_LE_LOT]: "ce point figure deux fois dans ce dépôt"
};

export function phraseDuDeja(motif) {
  return PHRASES_DU_DEJA[texte(motif)] ?? "";
}

/**
 * Ce qu'un lot de comptes rendus propose d'ouvrir.
 *
 * @param {object} options
 * @param {object[]} options.lus les points vérifiés, tels que le serveur les rend
 * @param {object[]} [options.connus] les affirmations de la mémoire — on y
 *   cherche les points déjà versés, par leur clé
 * @param {object[]} [options.sujetsDuProjet] `{title}` — ce que le projet suit
 *   déjà, pour ne pas rouvrir à l'identique
 * @returns {{proposes: object[], deja: object[]}} les deux listes, toujours les
 *   deux : une liste courte sans ce qu'on lui a retiré ferait croire à un
 *   compte rendu maigre
 */
export function sujetsDuCompteRendu({ lus = [], connus = [], sujetsDuProjet = [] } = {}) {
  // Ce que la mémoire porte déjà sur ces points — **et la réponse qui a été
  // faite**. Un point versé et un point écarté sont tous deux « déjà répondus »,
  // et aucun des deux ne se repose ; mais ils ne se disent pas pareil.
  const repondus = new Map(
    (Array.isArray(connus) ? connus : [])
      .filter((ligne) => texte(ligne?.kind) === "sujet" && texte(ligne?.subject_key))
      .map((ligne) => [
        texte(ligne.subject_key),
        texte(ligne?.status) === "rejected" ? DEJA.DEJA_ECARTE : DEJA.MEME_NUMERO
      ])
  );

  const titresDuProjet = new Map(
    (Array.isArray(sujetsDuProjet) ? sujetsDuProjet : [])
      .map((sujet) => [titreAplati(sujet?.title ?? sujet?.titre), sujet])
      .filter(([cle]) => cle)
  );

  const vusDansLeLot = new Set();
  const proposes = [];
  const deja = [];

  for (const point of Array.isArray(lus) ? lus : []) {
    const titre = texte(point?.titre);
    if (!titre) continue;

    const cle = texte(point?.key) || `cr:${titreAplati(titre)}`;
    const aplati = titreAplati(titre);

    const repondu = repondus.get(cle);
    if (repondu) {
      deja.push({ ...point, motif: repondu });
      continue;
    }

    const dejaSuivi = titresDuProjet.get(aplati);
    if (dejaSuivi) {
      // Le sujet qui existe déjà voyage avec le motif : l'écran doit pouvoir y
      // renvoyer, sinon « déjà suivi » est une affirmation qu'on ne peut pas
      // vérifier.
      deja.push({ ...point, motif: DEJA.MEME_TITRE, sujet: dejaSuivi });
      continue;
    }

    if (vusDansLeLot.has(cle) || vusDansLeLot.has(aplati)) {
      deja.push({ ...point, motif: DEJA.DANS_LE_LOT });
      continue;
    }

    vusDansLeLot.add(cle);
    vusDansLeLot.add(aplati);
    proposes.push({ ...point, key: cle });
  }

  return { proposes, deja };
}

/**
 * Ce qu'un sujet ouvert depuis un compte rendu porte comme description.
 *
 * **Ce qu'elle contient, et pourquoi chaque morceau y est.** Ce que le compte
 * rendu dit, d'abord — dans ses mots. Puis la provenance : le document, le lot,
 * le numéro, la page. Puis la citation, entre guillemets.
 *
 * La citation n'est pas un ornement. Un sujet ouvert par une lecture
 * automatique se conteste, et il doit pouvoir se contester : celui qui le reçoit
 * doit pouvoir retrouver la ligne et juger si elle dit bien cela. Un sujet dont
 * on ne peut pas remonter à la phrase d'origine ne se discute plus, il
 * s'accepte — et c'est exactement ce qu'on ne veut pas d'une lecture par un
 * modèle.
 *
 * Ce que le document n'écrit pas n'apparaît pas. Un point sans échéance n'en
 * gagne pas une en devenant un sujet.
 */
export function descriptionDuPoint(point = null, { document = "" } = {}) {
  if (!point) return "";

  const situe = [
    texte(document) ? `Relevé dans ${texte(document)}` : "Relevé dans un compte rendu de chantier",
    texte(point.lot) ? `lot ${texte(point.lot)}` : "",
    texte(point.reference) ? `point n° ${texte(point.reference)}` : "",
    Number.isFinite(Number(point.provenance?.page)) ? `page ${Number(point.provenance.page)}` : ""
  ].filter(Boolean).join(" · ");

  const demande = [
    texte(point.qui) ? `Demandé à ${texte(point.qui)}` : "",
    texte(point.echeance) ? `échéance ${texte(point.echeance)}` : ""
  ].filter(Boolean).join(", ");

  const citation = texte(point.provenance?.excerpt);

  return [
    texte(point.description) || texte(point.titre),
    "",
    `${situe}.`,
    demande ? `${demande}.` : "",
    citation ? `\n> ${citation}` : ""
  ].filter((ligne) => ligne !== "").join("\n").trim();
}

/**
 * Ce qu'un point à traiter dit de lui-même, en une phrase.
 *
 * Le lot d'abord : c'est par lui qu'on cherche dans un compte rendu, et c'est
 * ce qui dit à qui la question se pose. Ce qui n'est pas écrit ne s'invente
 * pas — un point sans échéance se lit sans échéance, il ne devient pas urgent.
 */
export function phraseDuPoint(point = null) {
  if (!point) return "";

  const entete = [texte(point.lot), texte(point.reference)].filter(Boolean).join(" · ");
  const suite = [
    texte(point.qui) ? `pour ${texte(point.qui)}` : "",
    texte(point.echeance) ? `échéance ${texte(point.echeance)}` : ""
  ].filter(Boolean).join(", ");

  return [entete, texte(point.titre), suite].filter(Boolean).join(" — ");
}
