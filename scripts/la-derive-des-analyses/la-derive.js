/**
 * La dérive — **ce qui a changé entre deux lectures du même document.**
 *
 * ## Ce que cela mesure, et ce que cela ne mesure pas
 *
 * **Pas la justesse.** Deux lectures peuvent différer et la seconde être
 * meilleure ; elles peuvent différer et la seconde être pire. Rien ici ne le
 * dit, et rien ici ne doit prétendre le dire : il faudrait savoir quelle est la
 * bonne réponse, et c'est le jeu de référence, qui coûte cher.
 *
 * Ce que cela mesure est le **changement**. Et un changement qu'on n'a pas voulu
 * est une régression — mais c'est vous qui savez ce que vous avez voulu. L'outil
 * dit ce qui a bougé, nommément ; il ne range pas « mieux » et « moins bien ».
 *
 * ## La distinction qui fait tout : dérive ou instabilité
 *
 * `lu_par` porte « le modèle, et la version du procédé ». Deux lectures qui
 * diffèrent ne disent donc pas la même chose selon qu'il a changé ou non :
 *
 *   * **`lu_par` a changé** → c'est une **dérive**. Elle est attendue : vous avez
 *     touché à la consigne, voici ce que ça change. C'est exactement ce qu'on
 *     veut voir avant de garder un ajustement ;
 *   * **`lu_par` est le même** → c'est une **instabilité**. Le même procédé rend
 *     deux réponses sur le même document, et c'est un défaut en soi : on ne peut
 *     rien conclure d'un procédé qui ne se répète pas.
 *
 * Les confondre ferait prendre un réglage voulu pour une panne, ou une panne
 * pour un réglage. C'est la seule chose que cet outil apporte qu'un simple
 * `diff` n'apporterait pas.
 *
 * ## Et le silence est un résultat
 *
 * Deux lectures identiques se comptent, et se disent. Une courbe de stabilité
 * qui ne compterait que les écarts ne dirait jamais « rien ne bouge » — qui est
 * la réponse qu'on espère.
 */

import { lempreinteDuneLecture, combienDeReleves }
  from "../la-mesure-des-analyses/lempreinte-dune-lecture.js";
import { ceQuiSepare } from "../la-mesure-des-analyses/ce-qui-separe.js";
import { lesInvariantsDUneLecture } from "../la-mesure-des-analyses/les-invariants.js";
import { lesSuitesDeLecture } from "./les-analyses-gelees.js";
// L'accord du projet, et non un `s` posé à la main : « 1 écarts » se lit, et
// ce qui se lit mal cesse d'être lu (règle 10).
import { lePluriel } from "../../apps/web/js/services/lexploitation-de-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** Ce qu'un passage d'une lecture à la suivante raconte. */
export const CE_QUI_SEST_PASSE = {
  /** Rien n'a bougé. C'est la réponse qu'on espère, et elle se compte. */
  STABLE: "stable",
  /** Le procédé a changé, et le relevé avec. Attendu — reste à le vouloir. */
  DERIVE: "derive",
  /** Le même procédé a rendu deux réponses. Un défaut en soi. */
  INSTABLE: "instable",
  /**
   * Elles diffèrent, et **rien ne dit si le procédé a changé**.
   *
   * `lu_par` a une valeur par défaut vide, et les lectures d'avant qu'on le
   * remplisse la portent. Les ranger en « instable » accuserait le procédé d'une
   * faute qu'on ne peut pas lui imputer ; les ranger en « dérive » le dédouanerait
   * tout aussi gratuitement. On dit ce qu'on voit, et pas plus (règle 5).
   */
  PROCEDE_INCONNU: "procede_inconnu",
  /**
   * Il n'y avait rien à comparer. **Pas une réussite** : une lecture muette
   * rend une empreinte vide, et toute comparaison y tient par construction.
   */
  SANS_OBJET: "sans_objet"
};

/**
 * Le passage d'une lecture à la suivante.
 *
 * @param {object} avant la lecture d'alors, déjà rangée par `uneGelee`
 * @param {object} apres celle qui la suit
 */
export function leFranchissement(avant = null, apres = null) {
  const famille = texte(avant?.famille);
  const socle = {
    famille,
    document: texte(avant?.document) || texte(avant?.repere),
    de: { luPar: texte(avant?.luPar), lueLe: texte(avant?.lueLe) },
    vers: { luPar: texte(apres?.luPar), lueLe: texte(apres?.lueLe) }
  };

  const empreinteAvant = lempreinteDuneLecture(avant?.lecture, famille);
  const empreinteApres = lempreinteDuneLecture(apres?.lecture, famille);

  /**
   * **Aucune des deux ne relève rien n'est pas « rien n'a changé ».** Deux
   * empreintes vides sont identiques, et la stabilité qu'on en conclurait serait
   * celle du silence (règle 5).
   */
  if (!combienDeReleves(empreinteAvant) && !combienDeReleves(empreinteApres)) {
    return { ...socle, quoi: CE_QUI_SEST_PASSE.SANS_OBJET,
      ecarts: [], dit: "ni l'une ni l'autre ne relève quoi que ce soit" };
  }

  const ecarts = ceQuiSepare(empreinteAvant, empreinteApres);
  const ditSonProcede = Boolean(socle.de.luPar) && Boolean(socle.vers.luPar);
  const memeProcede = ditSonProcede && socle.de.luPar === socle.vers.luPar;

  /**
   * **Deux lectures identiques sont stables, quoi qu'on sache du procédé.**
   *
   * C'est le seul cas où l'ignorance ne gêne pas : rien n'a bougé, il n'y a
   * personne à mettre en cause.
   */
  if (!ecarts.length) {
    const combien = lePluriel(empreinteAvant.parCle.size, "relevé identique", "relevés identiques");
    return { ...socle, quoi: CE_QUI_SEST_PASSE.STABLE, ecarts: [],
      dit: memeProcede ? `${combien}, même procédé`
        : (ditSonProcede ? `${combien} malgré le changement de procédé`
          : `${combien}, procédé non dit`) };
  }

  /**
   * **Le procédé n'a pas changé, et la réponse si.** Ce n'est pas un réglage,
   * c'est un procédé qui ne se répète pas — et l'on ne peut rien conclure d'une
   * mesure qui ne se répète pas.
   */
  const combien = lePluriel(ecarts.length, "écart");

  if (!ditSonProcede) {
    return { ...socle, quoi: CE_QUI_SEST_PASSE.PROCEDE_INCONNU, ecarts,
      dit: `${combien}, et l'une des deux ne dit pas par quoi elle a été lue : `
        + `${ecarts.join(" · ")}` };
  }

  if (memeProcede) {
    return { ...socle, quoi: CE_QUI_SEST_PASSE.INSTABLE, ecarts,
      dit: `même procédé (« ${socle.de.luPar || "non dit"} »), `
        + `et ${combien} : ${ecarts.join(" · ")}` };
  }

  return { ...socle, quoi: CE_QUI_SEST_PASSE.DERIVE, ecarts,
    dit: `« ${socle.de.luPar || "non dit"} » → « ${socle.vers.luPar || "non dit"} », `
      + `${combien} : ${ecarts.join(" · ")}` };
}

/**
 * La dérive de tout ce qui est gelé.
 *
 * **Les invariants se posent au passage, sur chaque lecture.** Ils ne coûtent
 * rien — le Markdown est gelé avec l'analyse — et ils répondent à une question
 * que la dérive ne pose pas : « cette lecture-là, prise seule, tient-elle
 * debout ? ». Deux lectures peuvent être parfaitement stables et toutes deux
 * citer des phrases qui ne figurent pas dans le document.
 */
export function laDeriveDesGelees(gelees = []) {
  const { suites, seules, sansCle } = lesSuitesDeLecture(gelees);

  const franchissements = [];
  for (const { lectures } of suites) {
    for (let rang = 1; rang < lectures.length; rang += 1) {
      franchissements.push(leFranchissement(lectures[rang - 1], lectures[rang]));
    }
  }

  const invariants = liste(gelees).map((une) => ({
    document: texte(une?.document) || texte(une?.repere),
    luPar: texte(une?.luPar),
    /**
     * **Contre le Markdown gelé avec elle**, et non contre le document
     * d'aujourd'hui : c'est ce texte-là que cette lecture a lu, et la citation
     * qu'elle rend doit s'y trouver. Le fichier a pu être remplacé depuis.
     */
    poses: lesInvariantsDUneLecture(
      lempreinteDuneLecture(une?.lecture, texte(une?.famille)),
      texte(une?.lecture?.markdown))
  }));

  return {
    franchissements,
    invariants,
    bilan: leBilanDeLaDerive(franchissements, invariants, { seules, sansCle })
  };
}

/**
 * Le bilan.
 *
 * **Ce qui n'a pas été mesuré se dit aussi fort que ce qui l'a été.** Un
 * chantier dont 90 % des documents n'ont été lus qu'une fois n'a pas une dérive
 * nulle : il a une dérive qu'on n'a pas mesurée, et c'est tout autre chose.
 */
export function leBilanDeLaDerive(franchissements = [], invariants = [], reste = {}) {
  const tous = liste(franchissements);
  const combien = (quoi) => tous.filter((un) => un?.quoi === quoi).length;

  const tombes = liste(invariants)
    .flatMap((un) => liste(un?.poses))
    .filter((un) => un?.tient === false);

  return {
    franchis: tous.length,
    stables: combien(CE_QUI_SEST_PASSE.STABLE),
    derives: combien(CE_QUI_SEST_PASSE.DERIVE),
    instables: combien(CE_QUI_SEST_PASSE.INSTABLE),
    /** Ceux qui diffèrent sans qu'on sache si le procédé a changé. */
    procedeInconnu: combien(CE_QUI_SEST_PASSE.PROCEDE_INCONNU),
    sansObjet: combien(CE_QUI_SEST_PASSE.SANS_OBJET),
    /** Les documents lus une seule fois : la part du corpus qui échappe encore. */
    luesUneFois: liste(reste?.seules).length,
    /** Ceux qu'on ne sait pas rapprocher — ni identifiant, ni repère daté. */
    sansCle: liste(reste?.sansCle).length,
    lecturesEprouvees: liste(invariants).length,
    invariantsTombes: tombes.length
  };
}
