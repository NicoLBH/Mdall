/**
 * La porte vers les utilitaires de l'Atelier.
 *
 * ## Ce que ce fichier remplace
 *
 * Il y avait ici un catalogue de mille sept cents lignes : les utilitaires, les
 * phrases qui décident quand le modèle les appelle, l'enchaînement de l'un à
 * l'autre, la recherche déterministe des cotes, la correspondance des cas de
 * charge. Tout cela était servi au navigateur et lisible avec F12 — on protégeait
 * l'arithmétique et l'on publiait la méthode.
 *
 * Il n'en reste que ceci : poser la question sous notre identité, et rapporter
 * la réponse. Le navigateur ne sait plus quels utilitaires existent ; il sait
 * seulement afficher ce qu'on lui rend.
 *
 * ## Ce que la réponse contient, et pourquoi cela suffit
 *
 * Un formulaire qui demande une valeur manquante se construit depuis les champs
 * de la réponse — un intitulé, une unité, une aide, des choix. Ce sont les mots
 * qu'on lit à l'écran ; le catalogue qui les produit reste au serveur.
 *
 * La réponse porte aussi ce qui part au modèle (`pourLeModele`, allégé des
 * figures et du détail des massifs) : c'est le serveur qui l'allège, puisque
 * c'est lui qui sait ce qui compte.
 */

import { buildSupabaseAuthHeaders, getSupabaseUrl } from "../../assets/js/auth.js";
import { resolveCurrentBackendProjectId } from "./project-supabase-sync.js";
import { lireLeFlux } from "./flux-ndjson.js";

const URL_FONCTION = `${getSupabaseUrl()}/functions/v1/executer-utilitaire`;

/**
 * Exécuter un utilitaire, ou savoir pourquoi il ne s'est pas exécuté.
 *
 * ## Les étapes arrivent pendant, pas après
 *
 * Le serveur répond en NDJSON — un objet JSON par ligne : `{etape}` chaque fois
 * qu'il vient de faire quelque chose, `{fin}` avec le résultat, `{erreur}` si
 * rien n'a abouti. `onEtape` est donc appelé **au fil de l'appel**, et non à son
 * retour.
 *
 * C'était l'inverse au premier jour du déplacement au serveur : les étapes se
 * rassemblaient là-bas et repartaient toutes avec le résultat. L'écran les
 * affichait alors d'un coup, après huit secondes de rond qui tourne — treize
 * lignes de travail apparaissant en même temps que sa conclusion, ce qui ne
 * raconte plus rien.
 *
 * La lecture entière reste acceptée : une réponse d'un seul bloc — un serveur
 * plus ancien, un intermédiaire qui tamponne — se lit comme avant, et les
 * étapes qu'elle porte se rejouent à l'arrivée.
 *
 * @returns {Promise<{resultat: object, etapes: Array, pourLeModele: object}>}
 */
export async function executerUtilitaire({
  id = "",
  entrees = {},
  assertions = [],
  question = "",
  confirmees = [],
  piecesJointes = [],
  acquises = {},
  onEtape = null,
  signal = null
} = {}) {
  const reponse = await fetch(URL_FONCTION, {
    method: "POST",
    headers: await buildSupabaseAuthHeaders({
      "Content-Type": "application/json",
      Accept: "application/x-ndjson, application/json"
    }),
    cache: "no-store",
    signal,
    body: JSON.stringify({
      id, entrees, assertions, question, confirmees, piecesJointes, acquises,
      // De quel chantier on parle. Le serveur s'en sert pour reprendre ce que
      // l'Atelier a déjà recueilli — l'étude incendie du projet, par exemple —
      // et il la lit sous notre identité, pas sous la sienne. Ce fichier
      // n'apprend pas pour autant quelle entrée vient de quelle réponse : la
      // correspondance est de l'orchestration, et elle reste au serveur.
      projet: await resolveCurrentBackendProjectId().catch(() => "") || ""
    })
  });

  // Ce qui a échoué avant que le flux ne commence — le portail, un corps
  // illisible, une demande trop lourde — répond en JSON ordinaire, avec son
  // code. On le lit comme tel : un flux n'a pas de statut à mi-parcours.
  if (!reponse.ok) {
    const brut = await reponse.text().catch(() => "");
    const charge = analyser(brut);
    throw new Error(charge?.error || `L'utilitaire n'a pas répondu (HTTP ${reponse.status}).`);
  }

  const etapes = [];
  let fin = null;
  let erreur = "";

  const noter = (dit) => {
    if (!dit || typeof dit !== "object") return;
    etapes.push(dit);
    if (typeof onEtape === "function") onEtape(dit);
  };

  const morceaux = [];
  const enFlux = await lireLeFlux(reponse, (objet) => {
    if (objet.etape) noter(objet.etape);
    else if (objet.fin) fin = objet.fin;
    else if (objet.erreur) erreur = String(objet.erreur);
    // Une réponse d'un seul bloc arrive ici comme un unique objet : elle n'a ni
    // `etape`, ni `fin`, ni `erreur`, mais un résultat.
    else if (objet.resultat) morceaux.push(objet);
  });

  if (!enFlux) {
    const charge = analyser(await reponse.text().catch(() => ""));
    if (charge) morceaux.push(charge);
  }

  for (const bloc of morceaux) {
    for (const dit of Array.isArray(bloc.etapes) ? bloc.etapes : []) noter(dit);
    fin = { resultat: bloc.resultat, pourLeModele: bloc.pourLeModele ?? bloc.resultat };
  }

  if (erreur) throw new Error(erreur);
  if (!fin?.resultat) throw new Error("L'utilitaire a répondu, mais sans résultat.");

  return {
    resultat: fin.resultat,
    etapes,
    pourLeModele: fin.pourLeModele ?? fin.resultat
  };
}

function analyser(brut) {
  try { return brut ? JSON.parse(brut) : null; } catch { return null; }
}

/**
 * Ce qu'une conversation garde d'un résultat, d'un tour à l'autre.
 *
 * La contrainte admissible du sol et la cote hors gel sont des **décisions** :
 * on les prend une fois, elles valent pour toute la discussion. Les redemander
 * à chaque question ferait retaper quatre fois la même chose.
 *
 * Le tri — ce qui se garde, ce qui ne se garde pas — appartient au catalogue,
 * donc au serveur : il le met dans le résultat sous `aRetenir`, et l'écran
 * n'a plus qu'à s'en souvenir.
 */
export function aRetenirDuResultat(resultat) {
  const garde = resultat?.aRetenir;
  return garde && typeof garde === "object" ? garde : {};
}
