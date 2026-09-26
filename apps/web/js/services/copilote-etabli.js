/**
 * Lancer un utilitaire de l'établi depuis une conversation.
 *
 * ## Pourquoi ici, et pas au serveur
 *
 * Du Mdall se lance **sans réseau et sans modèle** : le lecteur du langage et
 * l'évaluateur sont déjà dans cette page, et le bac d'essai s'en sert à chaque
 * frappe. Porter cela au serveur demanderait d'y copier le lecteur entier, et
 * la copie divergerait au premier mot ajouté au langage (règle 4).
 *
 * Ce que le serveur fait, il est seul à savoir le faire : décider qu'il faut
 * appeler l'outil, et lequel.
 *
 * ## Ce qui se dit dans le fil
 *
 * Le nom de l'utilitaire et sa version, **avant** de lancer. Une réponse
 * obtenue avec un outil personnel doit dire lequel : sans cela, on ne sait plus
 * si le chiffre vient d'une règle qu'on a écrite soi-même ou du modèle, et les
 * deux ne se vérifient pas de la même façon (fondamental 13).
 */

import { reponseDeLutilitaire, utilitaireDeLoutil } from "./etabli-du-copilote.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Le titre de l'exécution, tel que le fil l'affiche. */
export const TITRE_DE_LETABLI = "Utilitaire de votre établi";

/**
 * @param {object} options
 * @param {string} options.nom le nom d'outil que le serveur a fait appeler
 * @param {object} options.entrees ce que le modèle a rempli
 * @param {object[]} options.etabli l'établi tel qu'il a été déclaré pour ce tour
 * @param {Function} [options.onEtape]
 */
export async function executerUnUtilitaireDeLetabli({
  nom = "", entrees = {}, etabli = [], onEtape = null
} = {}) {
  const dire = (dit, detail = "") => {
    if (typeof onEtape === "function") onEtape({ texte: dit, detail });
  };

  const utilitaire = utilitaireDeLoutil(nom, etabli);

  /**
   * **Un outil qu'on ne retrouve pas se dit, il ne s'invente pas.**
   *
   * Le cas existe pour de vrai : on retire un utilitaire de son établi dans un
   * onglet pendant qu'une conversation est ouverte dans l'autre. Lancer « le
   * plus proche » rendrait un chiffre calculé par une règle que personne n'a
   * demandée.
   */
  if (!utilitaire) {
    dire("Utilitaire introuvable", nom);
    return {
      resultat: {
        statut: "refus",
        titre: TITRE_DE_LETABLI,
        message: "Cet utilitaire n'est plus sur votre établi. Rien n'a été lancé."
      },
      pourLeModele: { lance: false, raison: "utilitaire-introuvable" }
    };
  }

  const version = texte(utilitaire.version) || "1";
  dire(`${TITRE_DE_LETABLI} : ${texte(utilitaire.nom)} v${version}`);

  const rendu = reponseDeLutilitaire(utilitaire, entrees);

  // **Ce qui manque n'est pas un échec** : c'est une question à poser. Le dire
  // « refus » ferait annoncer une panne là où il suffit de demander un prix.
  const dit = rendu.manque.length
    ? `Il manque : ${rendu.manque.join(", ")}.`
    : rendu.conclusions
      .filter((une) => texte(une.valeur))
      .map((une) => `${une.sujet} : ${une.valeur}`)
      .join(" · ");

  dire(rendu.manque.length ? "Il manque une entrée" : "Lancé", dit);

  return {
    resultat: {
      statut: "fait",
      titre: `${TITRE_DE_LETABLI} — ${texte(utilitaire.nom)} v${version}`,
      message: dit || "Aucune règle n'a conclu."
    },
    /**
     * Ce que le modèle lit, avec **le nom de l'outil dedans**.
     *
     * La consigne lui demande de citer l'utilitaire ; le résultat le lui rend
     * sous la main, pour qu'il n'ait pas à s'en souvenir. Une consigne qu'on
     * peut suivre sans effort se suit plus souvent (règle 12).
     */
    pourLeModele: {
      lance: true,
      utilitaire: rendu.utilitaire,
      conclusions: rendu.conclusions,
      manque: rendu.manque,
      rappel: "Cite cet utilitaire et sa version dans ta réponse : le calcul vient de lui, pas de toi."
    }
  };
}
