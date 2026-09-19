/**
 * Séparer, dans un message, ce que son auteur a écrit de ce qu'il recopie.
 *
 * ## Pourquoi c'est le morceau difficile
 *
 * Chaque message d'un fil porte **son propre texte, plus la copie de tout ce
 * qui précède**. Déposer huit mails d'une même discussion, c'est déposer huit
 * fois le même texte, imbriqué de huit façons. Sans cette séparation, le
 * relevé (étape 5) verrait huit fois le même constat et croirait à huit
 * constats ; la même phrase serait attribuée à huit personnes.
 *
 * ## Deux marques, de nature très différente
 *
 * **Le préfixe `>`** est une convention, et elle est fiable : `>` pour le
 * message cité, `>>` pour ce qu'il citait lui-même. Rien à deviner.
 *
 * **Les bandeaux des messageries** ne le sont pas. « Le 12 mars 2026 à 09:14,
 * X a écrit : », `De : … Envoyé : … À :`, `-----Message d'origine-----`, une
 * ligne de tirets bas : ils dépendent de la langue, du logiciel et de sa
 * version, et **aucune liste n'est complète**. Celle d'ici couvre ce qui
 * arrive en français et en anglais, et rien de plus.
 *
 * ## La règle qui découle des deux
 *
 * On reconnaît ce qu'on reconnaît, et **ce qu'on n'a pas su couper reste dans
 * le message, visiblement**. Couper trop perdrait du propos ; couper au jugé
 * sans le dire ferait croire qu'on a tout vu. Les deux manières de se tromper
 * n'ont pas le même prix, et c'est pourquoi le doute penche toujours du même
 * côté : **dans le doute, c'est du propos**, et un trou le signale (règle 5).
 *
 * Deux conséquences se voient à l'œil :
 *
 * - **une ligne isolée qui commence par `>` n'est pas une citation.** Un devis
 *   qui écrit `> 50 m²` n'a cité personne. Il faut à une citation le contexte
 *   d'un bloc — au moins deux lignes qui se suivent, ou un bandeau qui l'ouvre.
 * - **un bandeau reconnu n'emporte pas le message entier par accident.** Une
 *   ligne de tirets bas ne coupe que si des en-têtes de message la suivent ;
 *   « a écrit : » ne coupe qu'en fin de ligne, jamais au milieu d'une phrase.
 *   Sans cela, le trait qu'un auteur trace au-dessus de sa signature ferait
 *   disparaître tout ce qu'il a écrit.
 *
 * ## Ce qu'il en reste et ce que ça ne fait pas
 *
 * Il ne reconstitue pas le fil : rapprocher les messages, reconnaître les
 * doublons et les ordonner, c'est l'étape 3. Il rend d'un message ses blocs,
 * leur profondeur, et ce que les bandeaux nomment — de quoi la nourrir.
 *
 * Les dates et les noms qu'un bandeau porte sortent **en texte**, tels
 * qu'écrits. Les lire en vraies dates serait deviner : ce sont des libellés
 * d'affichage, localisés, que la messagerie a fabriqués pour un lecteur humain.
 * L'étape 1 lit les vraies dates dans les en-têtes, et ce ne sont pas les mêmes
 * — deux façons de savoir, deux degrés de certitude, et on ne les confond pas.
 *
 * ## Il est pur
 *
 * Du texte entre, des blocs sortent. Aucun réseau, aucun écran.
 */

import { TROU, unTrou } from "./trous-dun-mail.js";

/** Ce qu'une portion de message est. */
export const NATURE = {
  PROPOS: "propos",
  BANDEAU: "bandeau",
  CITATION: "citation",
  SIGNATURE: "signature"
};

/** La forme du bandeau qui a ouvert une citation — utile pour dire ce qu'on a reconnu. */
export const FORME_DE_LA_MARQUE = {
  A_ECRIT: "a-ecrit",
  SEPARATEUR: "separateur",
  EN_TETES: "en-tetes",
  TIRETS: "tirets"
};

const SEPARATEUR = /^-{2,}\s*(?:message d['’]origine|original message|forwarded message|message transf[ée]r[ée]|mail original)\s*-{2,}$/i;
const TIRETS = /^[_=-]{5,}$/;
const DEBUT_DEN_TETE = /^(?:de|from|exp[ée]diteur)\s*:/i;
const SUITE_DEN_TETE = /^(?:de|from|exp[ée]diteur|envoy[ée]|sent|date|[àa]|to|cc|copie|objet|subject|r[ée]pondre [àa]|reply-to)\s*:/i;
const SIGNATURE = /^--\s?$/;

const FRANCAIS_DATE = /^le\s+(.+),\s*(.+?)\s+a\s+[ée]crit\s*:$/i;
const ANGLAIS_DATE = /^on\s+(.+),\s*(.+?)\s+wrote\s*:$/i;
const A_ECRIT = /^(.+?)\s+(?:a\s+[ée]crit|wrote|schrieb|escribi[óo])\s*:$/i;
const COUPE_EN_DEUX = /\sa$/i;
const SUITE_COUPEE = /^[ée]crit\s*:$/i;

/** Au-delà, une ligne est un paragraphe, pas un bandeau — même si elle finit par « a écrit : ». */
const LONGUEUR_DUN_BANDEAU = 200;

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les chevrons d'une ligne, et ce qu'il en reste.
 *
 * `>> La cote` porte deux niveaux et dit « La cote ». L'espace qui suit chaque
 * chevron est celui que la messagerie ajoute, pas celui de l'auteur : il part
 * avec le chevron, sinon chaque niveau de citation décalerait le texte d'un
 * cran de plus et une citation profonde finirait en escalier.
 */
export function chevronsDe(ligne) {
  let reste = String(ligne ?? "");
  let chevrons = 0;
  let entame = reste.match(/^[ \t]{0,3}>[ \t]?/);
  while (entame) {
    reste = reste.slice(entame[0].length);
    chevrons += 1;
    entame = reste.match(/^[ \t]{0,3}>[ \t]?/);
  }
  return { chevrons, reste };
}

function memeNiveau(nus, rang, chevrons) {
  return nus[rang] !== undefined && nus[rang].chevrons === chevrons;
}

function lesEnTetesDuBandeau(nus, rang, chevrons) {
  let fin = rang;
  while (memeNiveau(nus, fin, chevrons) && SUITE_DEN_TETE.test(texte(nus[fin].reste))) fin += 1;
  return fin - rang;
}

function ceQueLeBandeauNomme(lignes) {
  let texteQui = "";
  let texteQuand = "";
  for (const ligne of lignes) {
    const coupure = ligne.indexOf(":");
    if (coupure < 0) continue;
    const nom = ligne.slice(0, coupure).trim().toLowerCase();
    const valeur = texte(ligne.slice(coupure + 1));
    if (!texteQui && /^(de|from|exp[ée]diteur)$/.test(nom)) texteQui = valeur;
    if (!texteQuand && /^(envoy[ée]|sent|date)$/.test(nom)) texteQuand = valeur;
  }
  return { texteQui, texteQuand };
}

/**
 * Le bandeau qui commence au rang donné, s'il y en a un.
 *
 * Chacune des quatre formes porte sa propre exigence, et c'est là que se joue
 * la différence entre couper juste et couper tout :
 *
 * - **« a écrit : »** doit finir la ligne, et la ligne doit être courte. Une
 *   phrase qui contient « a écrit » en son milieu raconte quelque chose ; elle
 *   n'ouvre pas une citation. La forme coupée en deux lignes par la messagerie
 *   (`… a` puis `écrit :`) est recollée, parce qu'elle est très courante.
 * - **le séparateur nommé** (`-----Message d'origine-----`) se suffit : il ne
 *   veut dire que cela.
 * - **les en-têtes recopiés** doivent commencer par `De :` ou `From:` **et**
 *   être suivis d'au moins un autre en-tête. Une seule ligne `De : …` peut être
 *   une phrase.
 * - **la ligne de tirets** ne coupe que si des en-têtes la suivent. Seule, ce
 *   n'est qu'un trait tracé au-dessus d'une signature — et couper là ferait
 *   disparaître tout le message.
 */
export function laMarque(nus, rang) {
  const nu = nus[rang];
  if (nu === undefined) return null;
  const { chevrons } = nu;
  const ligne = texte(nu.reste);
  if (ligne === "") return null;

  if (SEPARATEUR.test(ligne)) {
    const suite = memeNiveau(nus, rang + 1, chevrons) && DEBUT_DEN_TETE.test(texte(nus[rang + 1].reste))
      ? lesEnTetesDuBandeau(nus, rang + 1, chevrons)
      : 0;
    const lignes = nus.slice(rang + 1, rang + 1 + suite).map((autre) => texte(autre.reste));
    return { forme: FORME_DE_LA_MARQUE.SEPARATEUR, lignes: 1 + suite, ...ceQueLeBandeauNomme(lignes) };
  }

  if (TIRETS.test(ligne)) {
    let suivant = rang + 1;
    while (memeNiveau(nus, suivant, chevrons) && texte(nus[suivant].reste) === "" && suivant <= rang + 3) {
      suivant += 1;
    }
    if (!memeNiveau(nus, suivant, chevrons) || !DEBUT_DEN_TETE.test(texte(nus[suivant].reste))) return null;
    const suite = lesEnTetesDuBandeau(nus, suivant, chevrons);
    const lignes = nus.slice(suivant, suivant + suite).map((autre) => texte(autre.reste));
    return {
      forme: FORME_DE_LA_MARQUE.TIRETS,
      lignes: suivant - rang + suite,
      ...ceQueLeBandeauNomme(lignes)
    };
  }

  if (DEBUT_DEN_TETE.test(ligne)) {
    const suite = lesEnTetesDuBandeau(nus, rang, chevrons);
    if (suite < 2) return null;
    const lignes = nus.slice(rang, rang + suite).map((autre) => texte(autre.reste));
    return { forme: FORME_DE_LA_MARQUE.EN_TETES, lignes: suite, ...ceQueLeBandeauNomme(lignes) };
  }

  const recolle = COUPE_EN_DEUX.test(ligne)
    && memeNiveau(nus, rang + 1, chevrons)
    && SUITE_COUPEE.test(texte(nus[rang + 1].reste));
  const entiere = recolle ? `${ligne} ${texte(nus[rang + 1].reste)}` : ligne;
  if (entiere.length > LONGUEUR_DUN_BANDEAU || !A_ECRIT.test(entiere)) return null;
  const francais = entiere.match(FRANCAIS_DATE);
  const anglais = entiere.match(ANGLAIS_DATE);
  const date = francais ?? anglais;
  return {
    forme: FORME_DE_LA_MARQUE.A_ECRIT,
    lignes: recolle ? 2 : 1,
    texteQui: date ? texte(date[2]) : texte(entiere.match(A_ECRIT)[1]),
    texteQuand: date ? texte(date[1]) : ""
  };
}

function apresLaMarque(nus, apres) {
  let regard = apres;
  while (regard < nus.length && texte(nus[regard].reste) === "" && nus[regard].chevrons === 0) {
    regard += 1;
  }
  return regard;
}

function lesMarques(nus) {
  const marques = new Map();
  let rang = 0;
  while (rang < nus.length) {
    const marque = laMarque(nus, rang);
    if (!marque) { rang += 1; continue; }
    marques.set(rang, marque);
    rang += marque.lignes;
  }
  return marques;
}

/** Les lignes qu'un bandeau vient d'ouvrir : ce qui y commence est cité. */
function lesOuvertures(nus, marques) {
  const ouvertures = new Set();
  for (const [rang, marque] of marques) ouvertures.add(apresLaMarque(nus, rang + marque.lignes));
  return ouvertures;
}

/**
 * Les suites de lignes chevronnées qui n'en forment pas une citation.
 *
 * Une seule ligne ne suffit pas : `> 50 m²` dans un devis n'a cité personne.
 * Il faut deux lignes qui se suivent, **ou un bandeau qui l'ouvre** — l'un ou
 * l'autre donne le contexte d'un bloc. « X a écrit : » suivi d'une seule ligne
 * citée est une citation d'une ligne, sans le moindre doute.
 *
 * Le prix de cette prudence se paie sur la réponse point par point, où l'on
 * intercale sa réponse sous chaque ligne citée : chacune de ces lignes reste
 * alors dans le propos, et porte sa marque. C'est le sens du choix — garder du
 * texte en trop se voit, perdre du propos ne se voit pas.
 */
function lesChevronsIsoles(nus, ouvertures) {
  const isoles = new Set();
  let rang = 0;
  while (rang < nus.length) {
    if (nus[rang].chevrons === 0) { rang += 1; continue; }
    let regard = rang;
    let compte = 0;
    let dernier = rang;
    while (regard < nus.length) {
      if (nus[regard].chevrons > 0) { compte += 1; dernier = regard; regard += 1; continue; }
      // Une ligne vide ne rompt pas un bloc : bien des messageries la laissent
      // sans chevron, et compter deux blocs d'une ligne là où il n'y en a qu'un
      // ferait passer une vraie citation pour un devis.
      if (texte(nus[regard].reste) === "") { regard += 1; continue; }
      break;
    }
    if (compte === 1 && !ouvertures.has(rang)) isoles.add(dernier);
    rang = dernier + 1;
  }
  return isoles;
}

/**
 * Un bandeau creuse-t-il un niveau de plus, ou les chevrons le font-ils déjà ?
 *
 * Les deux marques disent la même chose, et s'additionner les ferait compter
 * deux fois. Quand ce qui suit le bandeau porte un chevron de plus, ce sont
 * les chevrons qui portent la profondeur — et, surtout, la citation **se
 * referme** avec eux : les lignes sans chevron qui viennent après reviennent
 * au propos.
 *
 * C'est ce qui sauve la formule d'un auteur qui signe sous la citation. Sans
 * cela, un bandeau une fois franchi ferait de toute la fin du message une
 * citation, et le « Merci, à jeudi » d'après passerait pour le propos de
 * quelqu'un d'autre.
 */
function leBandeauCreuse(nus, apres, chevrons) {
  const regard = apresLaMarque(nus, apres);
  return regard >= nus.length || nus[regard].chevrons <= chevrons;
}

function unBloc(nature, profondeur, marque) {
  return marque ? { nature, profondeur, lignes: [], marque } : { nature, profondeur, lignes: [] };
}

function assembler(blocs) {
  return blocs
    .map((bloc) => ({ ...bloc, texte: bloc.lignes.join("\n").replace(/^\n+/, "").replace(/\s+$/, "") }))
    .filter((bloc) => bloc.texte !== "");
}

function joindre(blocs, nature) {
  return blocs.filter((bloc) => bloc.nature === nature).map((bloc) => bloc.texte).join("\n\n");
}

/**
 * Ce qu'un message ajoute, et ce qu'il recopie.
 *
 * Rend les blocs dans l'ordre du message, avec leur profondeur de citation :
 * 0 pour le propos de l'auteur, 1 pour ce qu'il cite, 2 pour ce que sa
 * citation citait. Plus le propos et les citations rassemblés, la signature
 * mise à part, et ce dont on n'est pas sûr.
 */
export function ceQuonCite(corps) {
  const trous = [];
  const lignes = String(corps ?? "").split(/\r\n|\n|\r/);
  const nus = lignes.map(chevronsDe);
  const marques = lesMarques(nus);
  const isoles = lesChevronsIsoles(nus, lesOuvertures(nus, marques));
  const bandeauxParChevron = new Map();
  const blocs = [];
  let signatureDepuis = nus.length;

  const poser = (nature, profondeur, ligne, marque) => {
    const dernier = blocs[blocs.length - 1];
    const memeBloc = dernier && !marque
      && dernier.nature === nature && dernier.profondeur === profondeur;
    if (!memeBloc) blocs.push(unBloc(nature, profondeur, marque));
    blocs[blocs.length - 1].lignes.push(ligne);
  };

  for (let rang = 0; rang < nus.length; rang += 1) {
    const { chevrons, reste } = nus[rang];
    const franchis = bandeauxParChevron.get(chevrons) ?? 0;
    const dansUneCitation = franchis > 0 || (bandeauxParChevron.get(0) ?? 0) > 0;
    const isole = isoles.has(rang) && !dansUneCitation;
    const profondeur = isole ? 0 : chevrons + franchis;
    const marque = marques.get(rang);

    if (marque) {
      const nomme = { forme: marque.forme, texteQui: marque.texteQui, texteQuand: marque.texteQuand };
      for (let pas = 0; pas < marque.lignes; pas += 1) {
        poser(NATURE.BANDEAU, profondeur, texte(nus[rang + pas].reste), pas === 0 ? nomme : undefined);
      }
      if (leBandeauCreuse(nus, rang + marque.lignes, chevrons)) {
        bandeauxParChevron.set(chevrons, franchis + 1);
      }
      rang += marque.lignes - 1;
      continue;
    }

    if (profondeur === 0 && rang < signatureDepuis && SIGNATURE.test(reste)) {
      // La marque elle-même n'est pas la signature : elle l'ouvre.
      signatureDepuis = rang;
      continue;
    }
    if (profondeur === 0 && rang > signatureDepuis) {
      poser(NATURE.SIGNATURE, 0, reste);
      continue;
    }

    if (isole) {
      trous.push(unTrou(TROU.CHEVRON_ISOLE, `la ligne ${rang + 1}`, texte(reste)));
      poser(NATURE.PROPOS, 0, lignes[rang]);
      continue;
    }
    if (profondeur === 0 && SUITE_DEN_TETE.test(texte(reste))) {
      trous.push(unTrou(TROU.BANDEAU_PROBABLE, `la ligne ${rang + 1}`, texte(reste)));
    }
    poser(profondeur === 0 ? NATURE.PROPOS : NATURE.CITATION, profondeur, reste);
  }

  const assembles = assembler(blocs);
  const propos = joindre(assembles, NATURE.PROPOS);
  const cite = joindre(assembles, NATURE.CITATION);
  if (propos === "" && cite !== "") trous.push(unTrou(TROU.RIEN_QUE_DES_CITATIONS, "le message"));

  return {
    blocs: assembles,
    propos,
    cite,
    signature: joindre(assembles, NATURE.SIGNATURE),
    profondeurMax: assembles.reduce((haut, bloc) => Math.max(haut, bloc.profondeur), 0),
    trous
  };
}
