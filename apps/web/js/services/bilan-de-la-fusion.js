/**
 * Ce qu'une fusion **va faire**, et ce qu'elle **a fait**.
 *
 * ## Le défaut : promettre, ne pas faire, ne pas le dire
 *
 * Une proposition annonçait trente-quatre sujets à fermer. La fusion en a fermé
 * cinq. Les vingt-neuf autres avaient été écartés — c'était une décision, et
 * elle était juste —, mais **rien ne l'a dit** : ni avant de signer, où la
 * question se posait encore, ni après, où l'écart entre l'annonce et le résultat
 * restait à découvrir en rouvrant une proposition close.
 *
 * L'effet sur qui s'en sert n'est pas « il manque une phrase » : c'est « ce
 * logiciel ne fait pas ce qu'il dit ». Et il a raison de le penser, parce que
 * du dehors les deux situations sont identiques.
 *
 * ## Deux moments, deux phrases
 *
 * **Avant** : le formulaire de fusion dit ce qui n'entrera pas. C'est là que la
 * question se pose encore — on peut décocher, recocher, revenir en arrière. Une
 * proposition qui annonce trente-quatre fermetures et n'en applique que cinq
 * doit le dire **pendant qu'on peut encore changer d'avis**.
 *
 * **Après** : le bilan compare ce qui a été tenté à ce qui a abouti. Une
 * écriture qui échoue se dit déjà ; ce qui manquait est le rapprochement — « 5
 * fermetures sur 34 » — sans lequel on ne sait pas si le chiffre est celui
 * qu'on attendait.
 *
 * ## Écarté n'est pas raté
 *
 * La distinction est tout le sujet, et elle doit se lire d'un coup d'œil :
 *
 * - **écarté** : quelqu'un a refusé la ligne. Le logiciel a fait exactement ce
 *   qu'on lui a demandé, et il n'y a rien à réparer ;
 * - **raté** : la ligne était retenue et l'écriture n'a pas abouti. Là, il y a
 *   quelque chose à reprendre.
 *
 * Les confondre ferait chercher une panne là où il y a eu une décision — ou,
 * pire, prendre une panne pour une décision.
 *
 * Rien ici n'appelle quoi que ce soit : des lignes entrent, des comptes sortent.
 */

import { ITEM_TYPE } from "./proposition-review.js";
import { ITEM } from "./proposition-state.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Comment chaque nature se nomme quand on la compte. */
export const MOTS_DE_LA_NATURE = {
  [ITEM_TYPE.DOCUMENT]: ["document", "documents"],
  [ITEM_TYPE.ATTACHMENT]: ["rattachement", "rattachements"],
  [ITEM_TYPE.AVIS]: ["avis", "avis"],
  [ITEM_TYPE.SUJET]: ["sujet à ouvrir", "sujets à ouvrir"],
  [ITEM_TYPE.RELANCE]: ["sujet à relancer", "sujets à relancer"],
  [ITEM_TYPE.FERMETURE]: ["sujet à fermer", "sujets à fermer"],
  [ITEM_TYPE.INTERVENANT]: ["société à ajouter", "sociétés à ajouter"],
  [ITEM_TYPE.LOT]: ["lot à ouvrir", "lots à ouvrir"],
  [ITEM_TYPE.LABEL]: ["label à poser", "labels à poser"],
  [ITEM_TYPE.OBJECTIF]: ["jalon à poser", "jalons à poser"]
};

/** Les natures qui n'ont rien à annoncer : elles ne sont pas un geste sur le projet. */
const SANS_ANNONCE = new Set([ITEM_TYPE.ARBITRAGE]);

const mot = (nature, combien) => {
  const [singulier, pluriel] = MOTS_DE_LA_NATURE[nature] ?? [nature, nature];
  return combien > 1 ? pluriel : singulier;
};

/**
 * Ce que la proposition porte, par nature, avec ce qui est écarté.
 *
 * @param {object[]} items les lignes, avec leur statut
 * @returns {{nature: string, portees: number, ecartees: number, retenues: number}[]}
 */
export function cequiEstPorte(items = []) {
  const par = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const nature = texte(item?.itemType ?? item?.item_type);
    if (!nature || SANS_ANNONCE.has(nature)) continue;

    if (!par.has(nature)) par.set(nature, { nature, portees: 0, ecartees: 0, retenues: 0 });
    const compte = par.get(nature);
    compte.portees += 1;
    if (texte(item?.status) === ITEM.REFUSED) compte.ecartees += 1;
    else compte.retenues += 1;
  }

  return [...par.values()];
}

/**
 * Ce qui ne sera pas fait, dit **avant** de signer.
 *
 * **Le silence quand rien n'est écarté.** Une phrase qui annonce « 0 écarté » à
 * chaque fusion finit par ne plus être lue, et celle qui compte se perd avec
 * elle.
 *
 * @returns {string} vide quand tout ce que la proposition porte est retenu
 */
export function phraseDeCeQuOnEcarte(items = []) {
  const ecartes = cequiEstPorte(items).filter((compte) => compte.ecartees > 0);
  if (ecartes.length === 0) return "";

  const dits = ecartes.map((compte) =>
    `${compte.ecartees} ${mot(compte.nature, compte.ecartees)} sur ${compte.portees}`
  );

  return `Écarté, et donc non appliqué : ${dits.join(" · ")}.`;
}

/**
 * Ce que la fusion a fait, rapproché de ce qu'elle portait.
 *
 * **Le rapprochement est tout.** « 5 sujets fermés » ne dit pas si c'est le
 * chiffre attendu ; « 5 sujets fermés sur 34 portés — 29 écartés » le dit.
 *
 * @param {object} options
 * @param {object[]} options.items les lignes de la proposition, avec leur statut
 * @param {object} [options.rapport] ce que `appliquerLeCompteRendu` a rendu
 * @returns {{lignes: object[], ecartees: number, ratees: number}}
 */
export function bilanDeLaFusion({ items = [], rapport = null } = {}) {
  const portees = cequiEstPorte(items);
  // Une nature dont une écriture a échoué : c'est le seul cas où il reste
  // quelque chose à faire.
  const ratees = (Array.isArray(rapport?.manques) ? rapport.manques : []).length;

  const faites = {
    [ITEM_TYPE.FERMETURE]: Number(rapport?.fermetures) || 0,
    [ITEM_TYPE.RELANCE]: Number(rapport?.relances) || 0,
    [ITEM_TYPE.LABEL]: Number(rapport?.labels?.crees?.length) || 0,
    [ITEM_TYPE.OBJECTIF]: Number(rapport?.objectifs?.crees?.length) || 0
  };

  return {
    lignes: portees.map((compte) => ({
      ...compte,
      mot: mot(compte.nature, compte.portees),
      // `null` quand l'application ne compte pas cette nature : ne pas savoir
      // n'autorise pas à écrire zéro (règle 5).
      faites: compte.nature in faites ? faites[compte.nature] : null
    })),
    ecartees: portees.reduce((total, compte) => total + compte.ecartees, 0),
    ratees
  };
}

/**
 * Le bilan en une phrase, quand il y a un écart à signaler.
 *
 * Elle ne se déclenche que si l'annonce et le résultat diffèrent : une fusion
 * qui fait exactement ce qu'elle portait n'a rien à expliquer, et le dire
 * quand même userait la phrase qui compte.
 */
export function phraseDuBilan(bilan = null) {
  const lignes = Array.isArray(bilan?.lignes) ? bilan.lignes : [];
  const ecarts = lignes.filter((ligne) => ligne.ecartees > 0);
  if (ecarts.length === 0) return "";

  const dits = ecarts.map((ligne) => {
    const fait = ligne.faites === null ? ligne.retenues : ligne.faites;
    return `${fait} ${mot(ligne.nature, fait)} sur ${ligne.portees} — ${ligne.ecartees} écarté${
      ligne.ecartees > 1 ? "s" : ""}`;
  });

  return `${dits.join(" · ")}. Écarté n'est pas raté : ces lignes ont été refusées, `
    + "et la fusion a fait exactement ce qui restait.";
}
