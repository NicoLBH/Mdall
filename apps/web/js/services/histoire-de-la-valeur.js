/**
 * L'histoire d'une valeur : pourquoi elle vaut ça, et comment on y est arrivé.
 *
 * ## La question à laquelle ce fichier répond
 *
 * « Profondeur hors gel = 0,466 m », versée il y a vingt-huit mois par quelqu'un
 * qui n'est plus sur le projet. **Pourquoi ?** Sans la réponse, la valeur est un
 * nombre : on ne peut ni s'appuyer dessus, ni la contester, ni la confirmer — on
 * ne peut que la croire ou la refaire.
 *
 * C'est la vraie mémoire d'un projet. Pas la valeur : le chemin.
 *
 * ## Rien n'est résumé, tout est **lu**
 *
 * On aurait pu demander à un modèle d'écrire ce récit. Ce serait une faute, et
 * pour deux raisons qui tiennent toutes seules :
 *
 * **Tout est déjà écrit, exactement.** La règle appliquée, ce qu'elle a lu, la
 * citation du texte et sa page, la question tranchée et les possibles écartés,
 * qui a signé et quand, qui a examiné depuis, ce que la valeur valait avant.
 * Résumer ce qui est exact, c'est le rendre approximatif.
 *
 * **Un récit produit serait une seconde vérité** (règle 4), et celle qu'on lit
 * plutôt que l'autre. Le jour où la règle change, la mémoire suit et le résumé
 * non — et personne ne s'en aperçoit, parce que c'est le résumé qu'on lit.
 *
 * ## Ce qui manque se nomme
 *
 * Une valeur dont rien ne dit l'origine n'est pas une valeur dont l'origine va
 * de soi : c'est une valeur dont personne n'a écrit l'origine, et les deux ne se
 * relisent pas pareil (règle 5). `lacunes` les nomme, et l'écran les montre —
 * une histoire trouée qu'on assume vaut infiniment mieux qu'une histoire
 * plausible qu'on a fabriquée.
 *
 * C'est aussi ce qui fait progresser un projet : on ne complète que ce qu'on
 * voit manquer.
 *
 * ## Il est pur
 *
 * Il reçoit la mémoire, les lectures, les actes et les points. Il ne va rien
 * chercher — c'est ce qui permet de l'exécuter et de regarder ce qui sort.
 */

import { NATURE, classifyAssertion, natureIndefinie } from "./assertion-taxonomy.js";
import { PROVENANCE } from "./memoire-en-texte.js";
import { zonesLisibles, histoireDeLaLigne } from "./memoire-blame.js";
import { ceQuiCouvre } from "./ce-qui-couvre.js";
import { leDebatQuiATranche } from "./point-a-tranche.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une histoire peut ne pas dire, et qui se compte. */
export const LACUNE_DE_LHISTOIRE = {
  ORIGINE: "origine",
  POURQUOI: "pourquoi",
  AUTEUR: "auteur",
  PORTEE: "portee"
};

/**
 * Ce qu'on dit d'un trou.
 *
 * Jamais « inconnu » tout court : chaque phrase dit **ce qui manque**, pour
 * qu'on sache quoi aller écrire. « Origine inconnue » n'aide personne ; « rien
 * ne dit d'où vient cette valeur » se répare.
 */
export const LACUNES_DE_LHISTOIRE_DITES = {
  [LACUNE_DE_LHISTOIRE.ORIGINE]: "rien ne dit d'où vient cette valeur",
  [LACUNE_DE_LHISTOIRE.POURQUOI]: "rien ne dit pourquoi elle a été retenue",
  [LACUNE_DE_LHISTOIRE.AUTEUR]: "on ne sait pas qui l'a versée",
  [LACUNE_DE_LHISTOIRE.PORTEE]: "rien ne dit sur quelle partie de l'ouvrage elle porte"
};

/** Les genres d'origine, du plus précis au plus vague. */
export const ORIGINE = {
  REGLE: "regle",
  CALCUL: "calcul",
  DECISION: "decision",
  DOCUMENT: "document",
  TEXTE: "texte",
  HYPOTHESE: "hypothese",
  ATELIER: "atelier",
  RIEN: "rien"
};

/** Ce que chaque genre d'origine se dit, en français. */
const ORIGINES_DITES = {
  [ORIGINE.REGLE]: "déduite par la règle",
  [ORIGINE.CALCUL]: "calculée par",
  [ORIGINE.DECISION]: "tranchée par un humain",
  [ORIGINE.DOCUMENT]: "lue dans",
  [ORIGINE.TEXTE]: "posée par le texte",
  [ORIGINE.HYPOTHESE]: "supposée, en attendant mieux",
  [ORIGINE.ATELIER]: "posée depuis",
  [ORIGINE.RIEN]: ""
};

/** La provenance enregistrée, ramenée à un genre d'origine. */
const GENRE_DE_LA_PROVENANCE = {
  [PROVENANCE.REGLE]: ORIGINE.REGLE,
  [PROVENANCE.CALCUL]: ORIGINE.CALCUL,
  [PROVENANCE.DECISION]: ORIGINE.DECISION,
  [PROVENANCE.DOCUMENT]: ORIGINE.DOCUMENT,
  [PROVENANCE.TEXTE]: ORIGINE.TEXTE,
  [PROVENANCE.HYPOTHESE]: ORIGINE.HYPOTHESE
};

/**
 * D'où sort cette valeur.
 *
 * La **provenance enregistrée** d'abord : c'est ce que celui qui a versé a dit,
 * et il en savait plus que nous. À défaut seulement, on lit la forme de la
 * charge — une règle instantanée, un agent appelé, l'atelier d'où venait le
 * geste. Deviner ne vient jamais : sans rien de tout cela, `RIEN`, et l'écran
 * le dit.
 */
export function origineDeLaValeur(assertion = null) {
  const charge = assertion?.payload ?? {};
  const provenance = charge.provenance;

  const genre = GENRE_DE_LA_PROVENANCE[texte(provenance?.type)];
  if (genre) {
    return { genre, quoi: texte(provenance?.quoi), par: texte(provenance?.par), le: texte(provenance?.le) };
  }

  if (charge.regle) return { genre: ORIGINE.REGLE, quoi: texte(charge.subject), par: "", le: "" };
  if (charge.agent || charge.utilitaire) {
    return { genre: ORIGINE.CALCUL, quoi: texte(charge.agent?.nom) || texte(charge.utilitaire), par: "", le: "" };
  }
  if (charge.decision) return { genre: ORIGINE.DECISION, quoi: texte(charge.decision.question), par: "", le: "" };
  if (texte(charge.source)) return { genre: ORIGINE.DOCUMENT, quoi: texte(charge.source), par: "", le: "" };
  if (texte(charge.atelier)) return { genre: ORIGINE.ATELIER, quoi: texte(charge.atelier), par: "", le: "" };

  return { genre: ORIGINE.RIEN, quoi: "", par: "", le: "" };
}

/**
 * L'origine, en une phrase. Vide quand rien ne la dit — l'écran nomme le trou.
 *
 * ## Une décision se signe, elle ne se complète pas
 *
 * Sa provenance porte déjà une **signature entière** — « Quelle profondeur
 * retenir ? — tranché par Ourdine Ferrand, le 12 mars » — et l'accoler au mot
 * générique donnait « tranchée par un humain tranché ». Vu à l'écran. Elle dit
 * donc qui et quand, qu'on a **structurés** à côté, et elle retombe sur le mot
 * seul quand on ne les a pas.
 *
 * Une hypothèse ne prend pas de complément non plus : « supposée, en attendant
 * mieux » se suffit, et ce qu'elle attend n'est pas dans sa provenance.
 */
export function phraseDeLOrigine(origine = null) {
  const genre = texte(origine?.genre);
  const mot = ORIGINES_DITES[genre] ?? "";
  if (!mot) return "";

  if (genre === ORIGINE.DECISION) {
    const signature = [texte(origine?.par), texte(origine?.le)].filter(Boolean).join(", le ");
    return signature ? `tranchée par ${signature}` : mot;
  }
  if (genre === ORIGINE.HYPOTHESE) return mot;

  return [mot, texte(origine?.quoi)].filter(Boolean).join(" ");
}

/**
 * Ce que cette conclusion a lu, avec ce que chaque entrée valait **alors**.
 *
 * C'est le cœur du « comment on y est arrivé » : une cote hors gel de 0,466 m
 * ne veut rien dire ; « déduite d'une altitude de 742,30 m » se discute.
 *
 * L'entrée est rendue même quand on ne la retrouve pas : `input_subject` dit son
 * **nom**, et un nom sans valeur reste une information — « elle a lu l'altitude,
 * et l'altitude n'est plus dans la mémoire » est justement ce qu'il faut voir.
 */
export function entreesDeLaValeur(assertion = null, applications = []) {
  const id = texte(assertion?.id);
  if (!id) return [];

  return (Array.isArray(applications) ? applications : [])
    .filter((ligne) => texte(ligne?.output_assertion_id) === id)
    .map((ligne) => ({
      sujet: texte(ligne?.input_subject),
      valeurId: texte(ligne?.input_assertion_id),
      valeur: ""
    }))
    .filter((entree) => entree.sujet);
}

/**
 * Le versement qui a posé cette valeur : son numéro, et **son titre**.
 *
 * « #P69 » ne dit rien à personne. Le titre, lui, dit ce qu'on faisait ce
 * jour-là — « Analyse du compte rendu du 12 mars » — et c'est cela qu'on
 * cherche en relisant une valeur qu'on n'a pas posée.
 *
 * Le numéro reste : c'est lui qu'on cite entre gens du projet, et c'est le seul
 * qui reste quand le versement n'est pas dans ce qu'on a lu. Un titre absent ne
 * s'invente pas — il manque, et le numéro suffit alors (règle 5).
 */
function leVersement(assertion, versements = []) {
  const numero = Number.isFinite(Number(assertion?.proposition_number))
    ? Number(assertion.proposition_number)
    : null;
  const id = texte(assertion?.proposition_id);

  const versement = id
    ? (Array.isArray(versements) ? versements : []).find((ligne) => texte(ligne?.id) === id)
    : null;

  // `merge_title` d'abord : c'est le titre sous lequel le versement a été
  // accepté, et donc celui qui décrit ce qui est entré dans la mémoire.
  const titre = texte(versement?.merge_title) || texte(versement?.title);

  return numero === null && !titre ? null : { numero, titre };
}

/** Ce que ces entrées valaient, retrouvé dans la mémoire qu'on a sous la main. */
function garnirLesEntrees(entrees, assertions) {
  const parId = new Map(
    (Array.isArray(assertions) ? assertions : []).map((row) => [texte(row?.id), row])
  );

  return entrees.map((entree) => {
    const lue = parId.get(entree.valeurId);
    return { ...entree, valeur: texte(lue?.payload?.value) || texte(lue?.statement) };
  });
}

/**
 * Tout ce que la mémoire sait de cette valeur, rangé pour se lire.
 *
 * @param {object} assertion la version dont on raconte l'histoire
 * @param {object} options
 * @param {object[]} [options.assertions] la mémoire du projet
 * @param {object[]} [options.applications] les lectures enregistrées
 * @param {object[]} [options.actes] les examens portés sur les valeurs
 * @param {object[]} [options.points] les sujets, pour le débat qui a tranché
 * @param {object[]} [options.versements] les propositions, pour les nommer
 * @param {(id: string) => string} [options.nommer] comment afficher un identifiant
 */
export function histoireDeLaValeur(assertion = null, {
  assertions = [], applications = [], actes = null, points = [], versements = [], nommer = null
} = {}) {
  if (!assertion) return null;

  const charge = assertion.payload ?? {};
  const origine = origineDeLaValeur(assertion);
  const qui = nommer ? texte(nommer(texte(assertion.decided_by))) : texte(assertion.decided_by);
  const portees = zonesLisibles(assertion);

  const entrees = garnirLesEntrees(entreesDeLaValeur(assertion, applications), assertions);
  const examens = Array.isArray(actes) ? ceQuiCouvre(assertion.id, { actes, nommer }) : null;

  // Ce que la valeur valait avant, dans l'ordre du plus récent au plus ancien.
  // Une valeur qui a bougé trois fois se relit autrement qu'une valeur posée une
  // fois et jamais touchée — et c'est souvent là qu'est l'histoire.
  const avant = histoireDeLaLigne(assertions, assertion)
    .slice(1)
    .map((version) => ({
      valeur: texte(version?.payload?.value) || texte(version?.statement),
      quand: texte(version?.decided_at),
      qui: nommer ? texte(nommer(texte(version?.decided_by))) : texte(version?.decided_by)
    }));

  const histoire = {
    quoi: { sujet: texte(charge.subject) || texte(assertion.subject_key), valeur: texte(charge.value) },
    ou: portees,
    quand: texte(assertion.decided_at),
    qui,
    proposition: leVersement(assertion, versements),
    nature: classifyAssertion(assertion).nature,
    origine,
    // L'extrait, et de quoi y retourner. C'est ce qui permet de **vérifier**
    // plutôt que de croire : sans lui, la phrase d'origine est une affirmation
    // de plus.
    parceQue: {
      source: texte(charge.source),
      article: texte(charge.article),
      citation: texte(charge.citation),
      page: Number.isFinite(Number(charge.page)) ? Number(charge.page) : null
    },
    entrees,
    regle: charge.regle ?? null,
    decision: charge.decision ?? null,
    debat: leDebatQuiATranche({ assertion, points }),
    examens,
    avant
  };

  // **Plusieurs versions du même nom se comptent ici**, et pas chez l'appelant.
  // C'est ce qui décide si l'absence de portée est un trou : une valeur seule
  // vaut pour l'ouvrage entier, et c'est une lecture complète ; cinq valeurs du
  // même nom dont aucune ne dit où elle porte, on ne peut plus en choisir une.
  const plusieursVersions = (Array.isArray(assertions) ? assertions : [])
    .filter((autre) => !texte(autre?.superseded_by))
    .filter((autre) => texte(autre?.payload?.subject) === histoire.quoi.sujet)
    .length > 1;

  return { ...histoire, plusieursVersions, lacunes: lacunesDeLHistoire(histoire, { plusieursVersions }) };
}

/**
 * Ce que cette histoire ne dit pas.
 *
 * Dans l'ordre où cela manque : d'où elle vient, pourquoi, qui l'a posée, et sur
 * quoi elle porte. Une valeur sans portée vaut pour l'ouvrage entier — ce n'est
 * pas un trou tant qu'il n'y a qu'une version ; dès qu'il y en a plusieurs du
 * même nom, ne pas savoir laquelle est ici est exactement ce qui empêche de
 * choisir.
 */
export function lacunesDeLHistoire(histoire = null, { plusieursVersions = false } = {}) {
  if (!histoire) return [];

  const manque = [];
  if (histoire.origine?.genre === ORIGINE.RIEN) manque.push(LACUNE_DE_LHISTOIRE.ORIGINE);

  const dit = histoire.parceQue ?? {};
  const explique = texte(dit.citation) || texte(dit.source) || texte(dit.article)
    || histoire.regle || histoire.decision || (histoire.entrees ?? []).length;
  if (!explique) manque.push(LACUNE_DE_LHISTOIRE.POURQUOI);

  if (!texte(histoire.qui)) manque.push(LACUNE_DE_LHISTOIRE.AUTEUR);
  if (plusieursVersions && !(histoire.ou ?? []).length) manque.push(LACUNE_DE_LHISTOIRE.PORTEE);

  return manque;
}

/** Les trous, en une phrase. Vide quand l'histoire est entière. */
export function phraseDesLacunesDeLHistoire(manques = []) {
  const dits = (Array.isArray(manques) ? manques : [])
    .map((clef) => LACUNES_DE_LHISTOIRE_DITES[clef])
    .filter(Boolean);
  if (!dits.length) return "";

  return `Ce que la mémoire ne dit pas : ${dits.join(", ")}.`;
}

/**
 * L'histoire, en lignes prêtes à lire.
 *
 * Chaque ligne porte **son intitulé** : « Parce que », « Elle a lu », « Écartés ».
 * Un paragraphe se survole ; des lignes intitulées se lisent en diagonale, et
 * c'est ainsi qu'on relit une valeur qu'on n'a pas posée.
 *
 * Ce qui manque n'y est pas — il se dit à part, pour qu'on ne le confonde pas
 * avec ce que la mémoire affirme.
 *
 * @returns {{quoi: string, dit: string}[]}
 */
export function lignesDeLHistoire(histoire = null, { dater = null } = {}) {
  if (!histoire) return [];

  const date = (quand) => (quand ? (dater ? dater(quand) : texte(quand).slice(0, 10)) : "");
  const lignes = [];

  const versement = histoire.proposition ?? null;
  const versee = [
    date(histoire.quand) ? `le ${date(histoire.quand)}` : "",
    texte(histoire.qui) ? `par ${histoire.qui}` : "",
    // Le titre parle, le numéro identifie. Les deux ensemble se lisent et se
    // citent ; le numéro seul ne se lit pas, et le titre seul ne se cite pas.
    texte(versement?.titre)
      ? [`« ${texte(versement.titre)} »`, versement.numero ? `#P${versement.numero}` : ""]
        .filter(Boolean).join(" ")
      : (versement?.numero ? `#P${versement.numero}` : "")
  ].filter(Boolean).join(" · ");
  if (versee) lignes.push({ quoi: "Versée", dit: versee });

  if ((histoire.ou ?? []).length) lignes.push({ quoi: "Porte sur", dit: histoire.ou.join(", ") });

  const origine = phraseDeLOrigine(histoire.origine);
  if (origine) lignes.push({ quoi: "Origine", dit: origine });

  if (histoire.debat?.phrase) lignes.push({ quoi: "Débat", dit: histoire.debat.phrase });

  const dit = histoire.parceQue ?? {};
  const extrait = [
    texte(dit.citation) ? `« ${texte(dit.citation)} »` : "",
    texte(dit.article),
    [texte(dit.source), dit.page ? `p. ${dit.page}` : ""].filter(Boolean).join(", ")
  ].filter(Boolean).join(" — ");
  if (extrait) lignes.push({ quoi: "Parce que", dit: extrait });

  if ((histoire.entrees ?? []).length) {
    lignes.push({
      quoi: "Elle a lu",
      dit: histoire.entrees
        .map((entree) => (entree.valeur ? `${entree.sujet} = ${entree.valeur}` : entree.sujet))
        .join(" · ")
    });
  }

  const ecartes = (histoire.decision?.ecartes ?? [])
    .map((ecarte) => texte(ecarte?.quoi)).filter(Boolean);
  if (histoire.decision?.question) lignes.push({ quoi: "Question", dit: texte(histoire.decision.question) });
  if (ecartes.length) lignes.push({ quoi: "Écartés", dit: ecartes.join(" · ") });

  if (histoire.examens?.couverte) {
    lignes.push({
      quoi: "Examinée",
      dit: histoire.examens.lignes
        .map((ligne) => [ligne.organisme || ligne.qui, date(ligne.quand)].filter(Boolean).join(", le "))
        .join(" · ")
    });
  }

  if ((histoire.avant ?? []).length) {
    lignes.push({
      quoi: "Elle valait",
      dit: histoire.avant
        .map((version) => [version.valeur, date(version.quand)].filter(Boolean).join(" jusqu'au "))
        .join(" · ")
    });
  }

  return lignes;
}

/** La nature, pour l'écran : « une contrainte », « une décision ». */
export function natureDeLHistoire(histoire = null) {
  return natureIndefinie(histoire?.nature);
}

export { NATURE };
