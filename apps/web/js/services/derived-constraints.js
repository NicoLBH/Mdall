/**
 * Les contraintes que le site impose, déduites de l'adresse.
 *
 * Une zone de neige n'est pas une donnée du projet : c'est une **contrainte**,
 * fixée par un texte, et le fait qu'elle se déduise de la commune n'en fait pas
 * une supposition — cette déduction *est* sa définition. Il n'y a donc rien à
 * valider : au plus une entrée à corriger si l'adresse est fausse.
 *
 * C'est ce qui rend le versement automatique possible ici et impossible pour
 * une hypothèse. Personne n'a à « retenir » une zone de neige.
 *
 * ## La confiance porte sur les entrées, jamais sur la règle
 *
 * L'outil climatique écrivait `confidence: 1` sur chaque fait, y compris quand
 * il venait de calculer un avertissement qu'il jetait ensuite : canton courant
 * différent du canton réglementaire de 2014, plusieurs H0 possibles dans le
 * département. Une certitude fausse est pire qu'une absence.
 *
 * Le doute ne porte jamais sur le règlement — il est ce qu'il est. Il porte sur
 * **ce qu'on lui a donné à manger** : la bonne commune ? le bon canton ? une
 * altitude qui veut dire quelque chose ? Ce module nomme ces réserves, et la
 * confiance n'en est que le résumé.
 *
 * **La confiance ne se stocke pas.** Elle se recalcule des réserves à chaque
 * lecture, parce que ce qui est dérivé se recalcule — et parce qu'une seconde
 * copie d'une valeur finit toujours par diverger de la première. La mémoire de
 * ce projet en a déjà fait les frais avec une table de libellés recopiée.
 *
 * ## Chaque contrainte cite l'utilitaire qui l'a déduite, et sa version
 *
 * Une règle déduite n'est vraie que selon la méthode qui l'a déduite. Le jour où
 * la méthode change — un zonage révisé, une lecture d'API corrigée — la valeur
 * change sans que rien du projet n'ait bougé. Sans la version inscrite sur la
 * contrainte, on ne saurait pas laquelle des deux situations on regarde : le
 * site a changé, ou notre façon de le lire.
 *
 * Ce module ne connaît plus aucune règle métier : il parcourt le catalogue des
 * utilitaires. Ajouter une déduction, c'est ajouter un fichier et une ligne au
 * catalogue — rien ici ne bouge.
 *
 * ## Ce que Géorisques ne produit pas
 *
 * Géorisques répond **par commune**, ou dans un rayon d'un kilomètre autour du
 * point. « Un PPRi existe sur cette commune » n'est pas « votre parcelle est en
 * zone réglementée ». En faire une contrainte fabriquerait exactement le bruit
 * qu'on a passé trois versions à supprimer. Ces faits sont donc écartés ici,
 * volontairement et nommément : ils appellent une vérification, pas une règle.
 */

import { NATURE } from "./assertion-taxonomy.js";
import { deductionsDeContrainte, describeProvenance, referenceOf } from "../utilitaires/catalogue.js";
import { RESERVE, RESERVES, phraseDeReserve, reserveMetEnDoute } from "../utilitaires/reserves.js";

export { RESERVE, RESERVES };

/** La provenance d'une contrainte déduite du site. Ni un avis, ni une déclaration. */
export const DERIVED_CONSTRAINT_KIND = "site-constraint";

/** L'état des entrées d'une déduction. C'est de cela que parle la confiance. */
export const INPUTS = {
  /** Aucune réserve : la déduction a eu ce qu'il lui fallait. */
  SURES: "sures",
  /** Une réserve nommée pèse sur une entrée. */
  A_VERIFIER: "a-verifier",
  /** On ignore sur quoi le calcul repose. Ce n'est pas la même chose qu'un doute. */
  INCONNUES: "inconnues"
};

const CONFIDENCE = {
  [INPUTS.SURES]: 1,
  [INPUTS.A_VERIFIER]: 0.5,
  // Ne pas savoir n'autorise pas à annoncer un demi. `null` dit « non qualifiée ».
  [INPUTS.INCONNUES]: null
};

function texte(value) {
  return String(value ?? "").trim();
}

/**
 * La clé métier d'une contrainte du site.
 *
 * Elle porte la donnée lue — `site:snow_zone` — et **jamais la version de
 * l'utilitaire**. C'est ce qui fait qu'une `V2` périme ce que la `V1` avait
 * versé au lieu de coexister avec : deux clés donneraient deux règles en vigueur
 * pour un même sujet, ce qui est précisément l'écart qu'on veut éviter de
 * fabriquer soi-même.
 */
export function constraintSubjectKey(factKey) {
  return `site:${texte(factKey).toLowerCase()}`;
}

/**
 * L'état des entrées, déduit des seules réserves qui **doutent**.
 *
 * Une réserve qui situe la portée — « la valeur vaut pour la commune entière » —
 * s'affiche sans peser : c'est la portée réglementaire du zonage sismique, et la
 * compter comme un doute ferait baisser la confiance d'une valeur dont personne
 * ne doute.
 */
export function inputsStateOf(reserves = []) {
  const liste = (Array.isArray(reserves) ? reserves : []).filter(reserveMetEnDoute);
  if (liste.includes(RESERVE.ENTREES_INCONNUES)) return INPUTS.INCONNUES;
  return liste.length === 0 ? INPUTS.SURES : INPUTS.A_VERIFIER;
}

/**
 * La confiance, recalculée des réserves.
 *
 * `null` quand on ignore les entrées : c'est « non qualifiée », et ce n'est ni
 * un zéro ni un demi.
 */
export function confidenceOf(reserves = []) {
  return CONFIDENCE[inputsStateOf(reserves)];
}

/**
 * Les réserves dites en français, pour l'écran.
 *
 * Sans réserve, la phrase ne dit pas « sûr » : elle dit sur quoi elle se tait.
 * Prétendre à la certitude est ce qu'on est en train de corriger.
 */
export function describeReserves(reserves = []) {
  const liste = (Array.isArray(reserves) ? reserves : []).map(phraseDeReserve).filter(Boolean);
  if (liste.length === 0) return "Aucune réserve sur les entrées de ce calcul.";
  const tete = liste.length > 1 ? "Réserves sur les entrées" : "Réserve sur l'entrée";
  return `${tete} : ${liste.join(" ; ")}.`;
}

/**
 * Les contraintes que ces faits de contexte énoncent.
 *
 * Le catalogue commande : pour chaque déduction connue, on cherche le fait
 * qu'elle lit et on lui demande ce qu'elle en tire. Une déduction qui s'abstient
 * ne produit rien — pas une contrainte vide.
 *
 * Un fait qu'aucune déduction ne réclame ne produit rien non plus : c'est ainsi
 * que Géorisques reste dehors, par omission dans le catalogue plutôt que par une
 * liste noire qu'il faudrait tenir à jour.
 *
 * @returns {{factKey: string, subject: string, subjectKey: string, value: string,
 *   statement: string, domain: string, reserves: string[], inputsState: string,
 *   confidence: number|null, utilitaire: string, source: string,
 *   provenance: string, sourceRef: string|null, computedAt: string|null}[]}
 */
export function constraintsFromContextFacts(facts = []) {
  const lignes = Array.isArray(facts) ? facts : [];
  const candidats = [];

  for (const outil of deductionsDeContrainte()) {
    // Le fait le plus récent l'emporte : deux producteurs pour une même règle ne
    // font pas deux règles.
    const fait = lignes
      .filter((entry) => texte(entry?.fact_key) === outil.cleDonnee)
      .sort((gauche, droite) => texte(droite?.updated_at).localeCompare(texte(gauche?.updated_at)))[0];
    if (!fait) continue;

    const rendu = outil.deduire(fait);
    if (!rendu || !texte(rendu.valeur)) continue;

    const reserves = (Array.isArray(rendu.reserves) ? rendu.reserves : []).filter((code) =>
      RESERVES.includes(code)
    );

    candidats.push({
      factKey: outil.cleDonnee,
      subject: outil.sujet,
      subjectKey: constraintSubjectKey(outil.cleDonnee),
      value: texte(rendu.valeur),
      statement: `${outil.sujet} : ${texte(rendu.valeur)}`,
      domain: outil.domaine ?? null,
      reserves,
      inputsState: inputsStateOf(reserves),
      confidence: confidenceOf(reserves),
      utilitaire: referenceOf(outil),
      source: texte(outil.source),
      provenance: describeProvenance(outil),
      inputs: rendu.entrees ?? null,
      sourceRef: texte(fait?.source_ref) || null,
      computedAt: texte(fait?.updated_at) || null
    });
  }

  return candidats;
}

/**
 * Les lignes à écrire dans la mémoire pour ces contraintes.
 *
 * Une contrainte du site n'a pas de proposition : elle ne vient d'aucun dépôt.
 * Elle porte en revanche ses réserves et ses entrées dans son `payload`, faute
 * de quoi on ne saurait plus, dans six mois, sur quoi elle a été calculée — et
 * une contrainte dont on ignore l'origine ne se corrige pas, elle se subit.
 */
export function plannedConstraintRows({ projectId = "", candidates = [], declaredBy = null, at = "" } = {}) {
  const projet = texte(projectId);
  if (!projet) return [];

  const quand = texte(at) || new Date().toISOString();

  return (Array.isArray(candidates) ? candidates : [])
    .filter((candidat) => texte(candidat?.value))
    .map((candidat) => ({
      project_id: projet,
      kind: DERIVED_CONSTRAINT_KIND,
      subject_key: candidat.subjectKey,
      statement: candidat.statement,
      // Le détail se lit sous l'énoncé, sans ouvrir le payload : la provenance
      // d'abord — c'est elle qu'on va vérifier — puis ce dont on se réserve.
      detail: [candidat.provenance, describeReserves(candidat.reserves)]
        .filter(Boolean)
        .join(" — "),
      status: "assumed",
      nature: NATURE.CONTRAINTE,
      domain: candidat.domain ?? null,
      payload: {
        subject: candidat.subject,
        value: candidat.value,
        factKey: candidat.factKey,
        derived: true,
        reserves: candidat.reserves,
        inputsState: candidat.inputsState,
        // Qui a déduit, dans quelle version, d'après quelle source. Sans cela,
        // une valeur qui change ne dit pas si c'est le site qui a bougé ou notre
        // façon de le lire.
        utilitaire: candidat.utilitaire,
        source: candidat.source,
        inputs: candidat.inputs ?? null,
        sourceRef: candidat.sourceRef,
        computedAt: candidat.computedAt
      },
      proposition_id: null,
      proposition_number: null,
      source_document_id: null,
      decided_by: declaredBy ?? null,
      decided_at: quand
    }));
}
