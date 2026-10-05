/**
 * Ce qui sépare deux empreintes — **en mots, et non en booléen.**
 *
 * ## Pourquoi c'est au socle commun, et non dans une relation
 *
 * Les deux outils de mesure posent la même question de deux façons. La batterie
 * de perturbations compare la lecture d'un document à celle du même document
 * perturbé ; la dérive compare la lecture d'alors à celle d'aujourd'hui. Dans
 * les deux cas, ce qu'on veut lire est : **qu'est-ce qui a bougé, exactement ?**
 *
 * L'écrire deux fois aurait donné deux réponses différentes à la même question
 * selon l'outil qui la pose (règle 10). Et l'un des deux aurait eu raison.
 *
 * ## Et en mots
 *
 * « A-23 a disparu » se lit ; « false » se cherche. Un écart qu'on ne sait pas
 * nommer ne se corrige pas, et un outil de mesure dont la sortie demande qu'on
 * rouvre le code n'est pas lu.
 */

import { laCleDunReleve } from "./lempreinte-dune-lecture.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qui sépare deux empreintes, clé par clé.
 *
 * Rendu en mots, et non en booléen : « A-23 a disparu » se lit, « false » se
 * cherche. Un écart qu'on ne sait pas nommer ne se corrige pas.
 */
export function ceQuiSepare(avant = null, apres = null, { substitution = null } = {}) {
  /**
   * **La substitution se normalise comme les clés.**
   *
   * Elle vient de la perturbation, qui parle la langue du document — « A-23 ».
   * Les clés de l'empreinte, elles, sont normalisées — « a 23 ». Comparer les
   * deux formes ne rapprochait jamais rien : la référence d'origine « avait
   * disparu » et la nouvelle « était apparue », sur une lecture parfaitement
   * juste. La batterie accusait la lecture de son propre défaut, ce qui est le
   * pire résultat qu'un instrument de mesure puisse rendre.
   */
  const ancienne = substitution ? laCleDunReleve({ reference: substitution.de }) : "";
  const nouvelle = substitution ? laCleDunReleve({ reference: substitution.vers }) : "";
  const clefDe = (cle) => (ancienne && cle === ancienne ? nouvelle : cle);
  const ecarts = [];

  for (const [cle, un] of (avant?.parCle ?? new Map())) {
    const attendue = clefDe(cle);
    const autre = apres?.parCle?.get(attendue);
    if (!autre) { ecarts.push(`« ${cle} » a disparu`); continue; }
    if (texte(un.marque) !== texte(autre.marque)) {
      ecarts.push(`« ${cle} » : marque ${texte(un.marque) || "(vide)"} → ${texte(autre.marque) || "(vide)"}`);
    }
  }

  const connues = new Set([...(avant?.parCle ?? new Map()).keys()].map(clefDe));
  for (const cle of (apres?.parCle ?? new Map()).keys()) {
    if (!connues.has(cle)) ecarts.push(`« ${cle} » est apparu`);
  }

  return ecarts;
}
