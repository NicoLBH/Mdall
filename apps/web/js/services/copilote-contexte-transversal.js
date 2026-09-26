/**
 * Le contexte d'une discussion qui n'est d'aucun projet.
 *
 * ## Pourquoi un module à part
 *
 * `copilote-context.js` construit le contexte **d'un projet** : il lit une
 * mémoire, un formulaire, une sélection de sujets. Aucune de ces trois choses
 * n'existe ici — et les envoyer vides ne dirait pas « il n'y en a pas », cela
 * dirait « il n'y a rien dedans », ce qui est une autre phrase.
 *
 * Ce qui part à la place est décrit dans `profil-de-travail.js` : une façon de
 * travailler, et la liste de ce qu'on ne sait pas.
 *
 * ## Ce qui n'est pas envoyé, et c'est voulu
 *
 * Ni `subjects` ni `project_form`. L'état d'écran d'un projet n'a pas de sens
 * sur une discussion transverse, et le laisser passer ferait répondre sur le
 * dernier projet ouvert — celui dont le magasin garde encore les filtres.
 */

import { store } from "../store.js";
import { fetchMesChantiers } from "./project-situations-supabase.js";
import { lireMesTraces } from "./projets-actifs-supabase.js";
import { profilDeTravail } from "./profil-de-travail.js";

/**
 * Ce que le copilote reçoit quand la discussion ne porte sur aucun chantier.
 *
 * Les deux lectures partent ensemble : elles ne dépendent pas l'une de
 * l'autre, et les enchaîner ferait attendre deux allers-retours pour rien.
 *
 * **Une lecture qui échoue ne fait pas échouer l'envoi.** Le profil se
 * construit avec ce qui reste, et il dit déjà, en toutes lettres, qu'il ne
 * porte aucune valeur de projet : une liste de projets incomplète ne peut donc
 * pas s'y faire passer pour une vérité.
 *
 * @returns {Promise<{memoire: {lue: boolean, texte: string, assertions: never[]},
 *   app: {scope: string, hash: string, current_tab: string}}>} la même forme
 *   que `buildAssistContext()` là où l'appelant la lit.
 */
export async function contexteTransversal() {
  /**
   * **L'établi se lit ici, et pas dans le contexte d'un projet.**
   *
   * C'est la cloison, et elle est structurelle : le contexte d'un projet ne
   * lit pas l'établi, donc il n'a rien à en envoyer. Un utilitaire personnel
   * n'entre dans la mémoire d'un chantier que par une proposition signée, et
   * le Copilote d'un projet le lit alors comme une règle **du projet**.
   *
   * `null` quand la lecture a échoué : on ne dit pas « votre établi est vide »
   * à quelqu'un qui y a posé douze outils (règle 5). La section ne paraît
   * alors pas, et rien ne prétend l'avoir regardé.
   */
  const lireLetabli = async () => {
    const module = await import("./etabli-supabase.js");
    return module.listerLetabli();
  };

  const [projets, traces, etabli] = await Promise.all([
    fetchMesChantiers().catch(() => []),
    lireMesTraces(store.user?.id || "").catch(() => null),
    lireLetabli().catch(() => null)
  ]);

  const outils = Array.isArray(etabli) ? etabli : [];

  const memoire = profilDeTravail({
    nom: store.user?.name || "",
    projets: Array.isArray(projets) ? projets : [],
    traces: Array.isArray(traces) ? traces : [],
    etabli: outils
  });

  return {
    /**
     * L'établi tel qu'il a servi à écrire le profil.
     *
     * Il repart avec la question, pour déclarer les outils **et** pour les
     * exécuter : relu au moment de l'appel, il pourrait rendre autre chose que
     * ce que le modèle a vu.
     */
    etabli: outils,
    memoire: {
      lue: memoire.lue,
      texte: memoire.texte,
      // Aucune affirmation : les utilitaires qui s'en servent pour se
      // pré-remplir ne trouveront rien, et c'est exact — il n'y a pas de
      // projet d'où les tirer.
      assertions: []
    },
    app: {
      scope: "global",
      hash: typeof location === "undefined" ? "" : (location.hash || ""),
      current_tab: "copilote"
    }
  };
}
