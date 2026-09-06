/**
 * Ce qu'une étude incendie propose à la mémoire du projet.
 *
 * ## Elle ne verse rien
 *
 * Ce fichier s'appelait « versement » quand l'écran écrivait directement dans
 * la mémoire. Il ne le fait plus, et ne le fera plus : **rien n'entre jamais
 * directement dans la mémoire du projet** (voir `docs/fondamentaux.md`). Ce qui
 * sort d'un utilitaire passe par un sujet — pour en débattre — ou par une
 * proposition — que quelqu'un signe.
 *
 * Ce qui reste ici est le **choix** : quelles conclusions partiront, sur quelle
 * portée, et ce que la mémoire en dit déjà.
 *
 * ## Pourquoi montrer la mémoire avant de transformer
 *
 * Une proposition confronte de toute façon ses lignes à ce que le projet a
 * décidé — c'est son travail. Mais on n'a pas envie de le découvrir à la
 * signature : voir tout de suite qu'une conclusion contredit ce qui est en
 * mémoire, c'est souvent la raison d'ouvrir un sujet plutôt qu'une proposition.
 *
 * ## Ce qui ne part pas
 *
 * Un « sans objet » n'affirme rien sur l'ouvrage : « aucune circulation
 * horizontale protégée n'est exigée » n'est pas un degré à respecter, c'est
 * l'absence d'exigence.
 *
 * Les **reformulations du cas** non plus. Le référentiel conclut sur cent
 * quatre points, et « le bâtiment comporte un sous-sol » ou « le classement
 * retient trois étages » en font partie : il les écrit parce que la suite en
 * dépend, mais elles ne demandent rien à personne. C'est le référentiel qui
 * marque la différence, module par module — la deviner à la forme de la
 * question serait faux quelque part sans qu'on sache où.
 */
import { normalizeSubjectKey } from "./project-memory.js";
import { currentAssertions } from "./project-memory.js";
import { zonesOf } from "./project-zones.js";
import { raisonnementDuModule } from "./incendie-en-texte.js";

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
      citation: texte(module.pourquoi?.citation),
      // Sous quelle condition la valeur vaut, pourquoi le texte le dit, et de
      // quoi elle dépendrait si l'une de ces entrées changeait. Une contrainte
      // versée sans cela n'est plus qu'un chiffre : on ne peut ni la contester
      // ni savoir quoi refaire quand le classement change.
      raisonnement: raisonnementDuModule(module, vue)
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
 * déjà à l'identique : proposer une ligne pour une valeur déjà décidée ferait
 * une proposition qui, une fois signée, remonterait à aujourd'hui une décision
 * d'il y a trois mois.
 */
export function retenuesParDefaut(lignes = []) {
  return new Set(lignes.filter((ligne) => ligne.etat !== "identique").map((ligne) => ligne.id));
}

/** Ce qu'une transformation emportera, en une phrase. */
export function phraseDuVersement(lignes = [], retenues = new Set()) {
  const prises = lignes.filter((ligne) => retenues.has(ligne.id));
  if (!prises.length) return "Rien à proposer : aucune conclusion retenue.";

  const neuves = prises.filter((ligne) => ligne.etat === "absente").length;
  const corrigees = prises.filter((ligne) => ligne.etat === "differente").length;
  const morceaux = [];
  if (neuves) morceaux.push(`${neuves} nouvelle${neuves > 1 ? "s" : ""}`);
  if (corrigees) morceaux.push(`${corrigees} qui corrige${corrigees > 1 ? "nt" : ""} la mémoire`);
  const reecrites = prises.length - neuves - corrigees;
  if (reecrites) morceaux.push(`${reecrites} réécrite${reecrites > 1 ? "s" : ""} à l'identique`);

  return `${prises.length} contrainte${prises.length > 1 ? "s" : ""} partiront — ${morceaux.join(", ")}.`;
}
