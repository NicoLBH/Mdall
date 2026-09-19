/**
 * Ce qu'un fil de mails devient dans la chaîne existante : des points, puis une
 * proposition.
 *
 * ## Rien de neuf, et c'est voulu
 *
 * Confronter à ce que le projet suit déjà, écrire une proposition, l'appliquer
 * à la fusion : tout cela existe et sert au lecteur de comptes rendus. En
 * écrire un second jeu ferait deux chaînes à tenir d'accord, et la seconde
 * serait toujours la moins soigneuse (règle 4).
 *
 * Ce module est donc **un adaptateur**, et rien d'autre : des prises de
 * position entrent, des points sortent dans la forme que `confrontation` et
 * `itemsDuCompteRendu` attendent.
 *
 * ## Ce qui change entre un compte rendu et un fil
 *
 * **Le label.** Un compte rendu porte « CR chantier » ; un fil porte
 * « Échange ». Ce n'est pas cosmétique : c'est par lui qu'on retrouvera, dans
 * six mois, ce qui vient d'une correspondance plutôt que d'une réunion.
 *
 * **L'identité.** Un compte rendu s'appelle « n° 14 du 3 mars ». Un fil n'a pas
 * de numéro : il s'appelle par son objet et sa période.
 *
 * **La provenance.** Un point issu d'un mail pointe vers un document que les
 * autres ne peuvent pas ouvrir, puisque le dossier « Mails » n'est pas partagé.
 * Cela ne se tait pas : le point porte **« issu d'un échange privé »**, et
 * celui qui le relit sait qu'il ne remontera pas à la source. C'est une
 * asymétrie assumée, pas un oubli (règle 5).
 *
 * ## Cinq natures ouvrent un sujet, deux n'en ouvrent pas
 *
 * Le tableau du plan le dit nature par nature, et c'est lui qu'on suit :
 *
 * - **demande, engagement, décision, question sans réponse, désaccord** →
 *   un sujet ;
 * - **constat** → une valeur en mémoire, si elle est signée. Ce n'est pas un
 *   sujet, et ce n'est pas cette chaîne-ci : la mémoire s'écrit autrement ;
 * - **source** → ce qui fonde un constat. La provenance, pas le constat.
 *
 * En ouvrir un sixième et un septième donnerait un sujet par phrase du fil, et
 * l'on cesserait de lire la liste. Ce qui n'est pas porté **se compte** et
 * s'affiche : taire ce qu'on laisse serait promettre ce qu'on ne fait pas.
 *
 * ## Il est pur
 *
 * Des prises entrent, des points sortent. Aucun réseau, aucune horloge.
 */

import { NATURE, nomDeLaNature } from "./prises-de-position.js";

/** Le label d'un fil, là où un compte rendu porte « CR chantier ». */
export const LABEL_DU_FIL = "Échange";

/** Ce qu'un point issu d'un mail porte, et que personne ne pourra ouvrir. */
export const ORIGINE_PRIVEE = "Issu d'un échange privé";

/**
 * Les natures qui ouvrent un sujet.
 *
 * Fermée, et lue à un seul endroit : la liste des points, le compte de ce qui
 * n'est pas porté et la phrase qui l'explique en dépendent tous les trois.
 */
export const OUVRENT_UN_SUJET = [
  NATURE.DEMANDE, NATURE.ENGAGEMENT, NATURE.DECISION, NATURE.SANS_REPONSE, NATURE.DESACCORD
];

/** Pourquoi une prise ne devient pas un point. */
export const NON_PORTEE = {
  /** Un constat va en mémoire, pas dans un sujet — et la mémoire s'écrit autrement. */
  VA_EN_MEMOIRE: "va-en-memoire",
  /** Une source fonde un constat : c'est sa provenance, pas un sujet. */
  FONDE_UN_CONSTAT: "fonde-un-constat"
};

const PHRASES_DE_LA_NON_PORTEE = {
  [NON_PORTEE.VA_EN_MEMOIRE]:
    "les constats ne deviennent pas des sujets : ce sont des valeurs, et la mémoire s'écrit "
    + "par un autre chemin",
  [NON_PORTEE.FONDE_UN_CONSTAT]:
    "les sources ne deviennent pas des sujets : elles fondent un constat, elles ne demandent rien"
};

const texte = (valeur) => String(valeur ?? "").trim();

/** Pourquoi cette prise n'ouvre pas de sujet, ou rien si elle en ouvre un. */
export function pourquoiPasPortee(prise) {
  const nature = texte(prise?.nature);
  if (OUVRENT_UN_SUJET.includes(nature)) return "";
  if (nature === NATURE.SOURCE) return NON_PORTEE.FONDE_UN_CONSTAT;
  return NON_PORTEE.VA_EN_MEMOIRE;
}

/** La phrase d'une non-portée. Elle vit ici : l'écran et la proposition la diront pareil. */
export function phraseDeLaNonPortee(motif) {
  return PHRASES_DE_LA_NON_PORTEE[texte(motif)] ?? "";
}

function qui(prise) {
  return texte(prise?.qui) || "auteur inconnu";
}

/**
 * Ce qu'un point raconte de lui-même.
 *
 * **La citation d'abord, la provenance ensuite.** Un sujet ouvert par une
 * lecture automatique doit pouvoir se contester, et cela ne se fait qu'en
 * relisant la phrase d'où il sort. La mention de l'échange privé vient après,
 * parce qu'elle explique pourquoi on ne pourra pas aller plus loin que cette
 * phrase.
 */
export function descriptionDuPoint(prise) {
  const morceaux = [];
  const nature = texte(prise?.nature);

  if (nature === NATURE.DESACCORD) {
    morceaux.push("Une position est contestée sur ce point.");
    for (const position of prise?.positions ?? []) {
      morceaux.push(`**${qui(position)}**${texte(position?.quand) ? ` — ${texte(position.quand)}` : ""} :`
        + ` « ${texte(position?.citation) || texte(position?.intitule)} »`);
    }
    const avant = (prise?.avant ?? []).filter(Boolean);
    // **Qui s'était exprimé avant, et non ce qui est contesté.** La phrase
    // visée n'est pas toujours dans le fil, et la désigner au jugé prêterait à
    // quelqu'un un propos qu'il n'a pas tenu.
    morceaux.push(avant.length
      ? `Se sont exprimés avant sur le même sujet : ${avant.join(", ")}.`
      : "Personne d'autre ne s'est exprimé sur ce sujet dans le fil.");
  } else {
    morceaux.push(`**${qui(prise)}**${texte(prise?.quand) ? ` — ${texte(prise.quand)}` : ""} :`
      + ` « ${texte(prise?.citation) || texte(prise?.intitule)} »`);
  }

  if (nature === NATURE.SANS_REPONSE) {
    const apres = Number(prise?.apresElle) || 0;
    morceaux.push(apres > 0
      ? `Aucun des ${apres} message${apres > 1 ? "s" : ""} qui suivent ne la reprend.`
      : "Aucun message ne la suit dans ce fil.");
  }

  morceaux.push(`_${ORIGINE_PRIVEE} : la source n'est pas ouvrable par les autres._`);
  return morceaux.join("\n\n");
}

/**
 * Les prises, dans la forme que la confrontation attend.
 *
 * `page` porte le rang du message, là où un compte rendu porte le numéro de
 * page : c'est le même geste — remonter à l'endroit exact d'où la ligne sort.
 *
 * Aucune `reference` n'est donnée : un fil ne numérote pas ses prises, et en
 * inventer une ferait une clé qui change à chaque relevé. La clé se fera donc
 * sur le titre, comme pour un point de compte rendu sans numéro — et le même
 * fil relu deux fois ne reproposera pas deux fois la même chose.
 */
export function pointsDuFil(prises = []) {
  return (Array.isArray(prises) ? prises : [])
    .filter((prise) => OUVRENT_UN_SUJET.includes(texte(prise?.nature)))
    .map((prise) => ({
      titre: texte(prise?.intitule),
      description: descriptionDuPoint(prise),
      lot: null,
      rubrique: null,
      reference: null,
      qui: texte(prise?.pourQui) || null,
      echeance: texte(prise?.echeance) || null,
      etat: null,
      labels: [],
      page: Number(prise?.message) || null,
      citation: texte(prise?.citation) || null,
      sujetExistant: null,
      /** La nature dont ce point sort. L'écran s'en sert, la fusion l'ignore. */
      natureDuFil: texte(prise?.nature),
      /** Le libellé de cette nature, pour ne pas le réécrire à l'écran. */
      natureDite: nomDeLaNature(texte(prise?.nature))
    }))
    .filter((point) => point.titre !== "");
}

/**
 * Ce que le fil ne porte pas dans la proposition, compté par motif.
 *
 * Taire ce qu'on laisse serait promettre ce qu'on ne fait pas. Un fil de trente
 * constats et deux demandes proposerait deux sujets, et l'on chercherait
 * longtemps les vingt-huit autres.
 */
export function ceQuiResteDehors(prises = []) {
  const comptes = new Map();
  for (const prise of Array.isArray(prises) ? prises : []) {
    const motif = pourquoiPasPortee(prise);
    if (!motif) continue;
    comptes.set(motif, (comptes.get(motif) ?? 0) + 1);
  }
  return [...comptes.entries()].map(([motif, combien]) => ({ motif, combien }));
}

/**
 * Le titre de la proposition.
 *
 * L'objet du fil et sa période — c'est son identité, et elle suffit à la
 * reconnaître dans une liste de propositions.
 */
export function titreDeLaProposition(fil) {
  const phrase = texte(fil?.phrase);
  return phrase ? `${LABEL_DU_FIL} · ${phrase}` : LABEL_DU_FIL;
}

/**
 * Ce que la proposition dit d'elle-même avant sa liste.
 *
 * **Elle dit ce qu'elle porte et ce qu'elle laisse.** Une introduction qui ne
 * parlerait que des sujets ouverts ferait croire que le fil n'a rien donné de
 * plus, alors que ses constats attendent ailleurs.
 */
export function introDuFil({ fil = null, points = [], prises = [] } = {}) {
  const combien = (Array.isArray(points) ? points : []).length;
  const dehors = ceQuiResteDehors(prises);

  const lignes = [
    `Relevé de l'échange « ${texte(fil?.objet) || "sans objet"} »`
    + `${texte(fil?.phrase) ? ` — ${texte(fil.phrase)}` : ""}.`,
    combien > 0
      ? `${combien} sujet${combien > 1 ? "s" : ""} à ouvrir ou à relancer, chacun avec la phrase `
        + "du message d'où il sort."
      : "Aucun sujet à ouvrir : ce fil ne porte ni demande, ni engagement, ni décision.",
    `${ORIGINE_PRIVEE} : le dossier « Mails » n'est pas partagé, et les citations ci-dessous ne `
    + "remontent donc à aucun document que l'équipe puisse ouvrir."
  ];

  for (const { motif, combien: nombre } of dehors) {
    lignes.push(`${nombre} prise${nombre > 1 ? "s" : ""} de position ne sont pas portées ici : `
      + `${phraseDeLaNonPortee(motif)}.`);
  }

  return lignes.join("\n\n");
}
