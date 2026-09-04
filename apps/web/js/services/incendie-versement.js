/**
 * Ce qu'une étude incendie verse dans la mémoire du projet.
 *
 * ## Pourquoi verser, alors que tout se recalcule
 *
 * Les conclusions du référentiel se refont à chaque ouverture : elles servent à
 * décider, elles ne sont pas décidées. Mais il arrive un moment où quelqu'un
 * **retient** un degré — il l'écrit dans la notice, il le dit au maître
 * d'ouvrage, l'acousticien et le structure s'en servent. À ce moment-là, ce
 * n'est plus une lecture de l'arrêté, c'est une décision du projet, et « ce qui
 * a été décidé se conserve ».
 *
 * Le versement est donc un geste, jamais un effet de bord : rien ne part en
 * mémoire parce qu'on a répondu à une question.
 *
 * ## Une contrainte, et pas une hypothèse
 *
 * Le test de la taxonomie : *si je ne suis pas d'accord, ai-je un recours ?*
 * Non — c'est l'arrêté qui décide. Elle est même nommée dans la définition :
 * « zones neige, vent et sismique, **classement incendie**, article du PLU ».
 *
 * ## Ce qui ne se verse pas
 *
 * Un « sans objet » n'affirme rien sur l'ouvrage : « aucune circulation
 * horizontale protégée n'est exigée » n'est pas un degré à respecter, c'est
 * l'absence d'exigence. Le verser remplirait la mémoire de lignes qui ne
 * décident de rien et rendraient les vraies moins visibles.
 *
 * Les **reformulations du cas** non plus. Le référentiel conclut sur cent
 * quatre points, et « le bâtiment comporte un sous-sol » ou « le classement
 * retient trois étages » en font partie : il les écrit parce que la suite en
 * dépend, mais elles ne demandent rien à personne. C'est le référentiel qui
 * marque la différence, module par module — la deviner à la forme de la
 * question serait faux quelque part sans qu'on sache où.
 *
 * ## Et l'on montre ce que la mémoire dit déjà
 *
 * Verser ce qu'elle porte déjà à l'identique est du bruit ; verser ce qui la
 * contredit est le geste le plus important de l'écran, et il ne doit pas se
 * faire sans le voir. Les trois cas sont donc affichés avant le clic.
 */

import { normalizeSubjectKey } from "./project-memory.js";
import { currentAssertions } from "./project-memory.js";
import { zonesOf } from "./project-zones.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les conclusions qu'on peut verser.
 *
 * Celles qui ont conclu **et** qui disent quelque chose. Un module en attente
 * n'a pas de valeur ; un « sans objet » en a une qui n'affirme rien.
 */
export function conclusionsVersables(vue) {
  const modules = Array.isArray(vue?.modules) ? vue.modules : [];

  return modules
    .filter((module) => module?.statut === "conclu" && module.exigence === true && !module.sansObjet
      && module.valeur !== null && module.valeur !== undefined && texte(module.valeur) !== "")
    .map((module) => ({
      id: texte(module.id),
      sujet: texte(module.titre),
      valeur: texte(module.valeur),
      mention: texte(module.mention),
      article: texte(module.pourquoi?.article
        ? `article ${module.pourquoi.article}${module.pourquoi.paragraphe ? `, ${module.pourquoi.paragraphe}` : ""}`
        : module.article ? `article ${module.article}` : ""),
      citation: texte(module.pourquoi?.citation)
    }))
    .filter((conclusion) => conclusion.sujet && conclusion.valeur);
}

/** La clé sous laquelle une conclusion se range, portée comprise. */
export function cleDuVersement(conclusion, zone = "") {
  const base = normalizeSubjectKey(conclusion?.sujet ?? "");
  const portee = texte(zone);
  return portee ? `${base}@${portee}` : base;
}

/**
 * Ce que la mémoire dit déjà de chaque conclusion.
 *
 * Trois états, et ils n'appellent pas le même geste : `absente` s'ajoute,
 * `identique` ne sert à rien, `differente` mérite qu'on la regarde avant de
 * cliquer — c'est une correction, et corriger une contrainte veut dire qu'on a
 * calculé faux quelque part.
 */
export function etatDuVersement(conclusions = [], assertions = [], zone = "") {
  const enVigueur = currentAssertions(Array.isArray(assertions) ? assertions : []);
  const portee = texte(zone);

  // On compare **à portée égale** : le degré du bâtiment A ne dit rien de celui
  // du bâtiment B, et les confondre ferait périmer l'un par l'autre.
  const parCle = new Map();
  for (const assertion of enVigueur) {
    const cle = texte(assertion?.subject_key);
    if (!cle) continue;
    const portees = zonesOf(assertion);
    const sienne = portees.length ? portees.join("+") : "";
    if (sienne !== portee) continue;
    if (!parCle.has(cle)) parCle.set(cle, assertion);
  }

  return conclusions.map((conclusion) => {
    const cle = cleDuVersement(conclusion, portee);
    const deja = parCle.get(cle) ?? null;
    const valeurConnue = texte(deja?.payload?.value);

    return {
      ...conclusion,
      cle,
      deja,
      valeurConnue,
      etat: !deja ? "absente" : (valeurConnue === conclusion.valeur ? "identique" : "differente")
    };
  });
}

/**
 * Ce qui est coché quand le panneau s'ouvre.
 *
 * Ce que la mémoire ignore, et ce qu'elle dit autrement. Pas ce qu'elle porte
 * déjà à l'identique : réécrire une ligne pour la même valeur périme la
 * précédente et fait remonter une décision d'il y a trois mois à aujourd'hui,
 * ce qui est faux.
 */
export function retenuesParDefaut(lignes = []) {
  return new Set(lignes.filter((ligne) => ligne.etat !== "identique").map((ligne) => ligne.id));
}

/** Ce que le bouton va faire, en une phrase. */
export function phraseDuVersement(lignes = [], retenues = new Set()) {
  const prises = lignes.filter((ligne) => retenues.has(ligne.id));
  if (!prises.length) return "Rien à verser : aucune conclusion retenue.";

  const neuves = prises.filter((ligne) => ligne.etat === "absente").length;
  const corrigees = prises.filter((ligne) => ligne.etat === "differente").length;
  const morceaux = [];
  if (neuves) morceaux.push(`${neuves} nouvelle${neuves > 1 ? "s" : ""}`);
  if (corrigees) morceaux.push(`${corrigees} qui corrige${corrigees > 1 ? "nt" : ""} la mémoire`);
  const reecrites = prises.length - neuves - corrigees;
  if (reecrites) morceaux.push(`${reecrites} réécrite${reecrites > 1 ? "s" : ""} à l'identique`);

  return `${prises.length} contrainte${prises.length > 1 ? "s" : ""} — ${morceaux.join(", ")}.`;
}
