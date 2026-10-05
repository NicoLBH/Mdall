/**
 * Le lecteur du serveur — **la vraie lecture, celle qu'on cherche à mesurer.**
 *
 * ## Ce qu'il réutilise, et ce qu'il n'invente pas
 *
 * `lireUnRapport` est l'orchestrateur du produit : les trois étapes, leurs
 * refus nommés, la règle du relevé qui n'a pas eu lieu. Il est **pur**, ses
 * appels lui sont passés — c'est exactement ce qui permet de le brancher ici
 * sans en écrire un second (règle 4). Une batterie qui mesurerait une lecture
 * réécrite pour elle ne mesurerait rien de ce qui tourne en production.
 *
 * ## Ce qui est injecté, et pourquoi
 *
 * `appeler` fait l'aller-retour HTTP. Passé en paramètre, le câblage entier
 * s'éprouve sans réseau ni facture : les épreuves lui donnent un appelant de
 * carton et vérifient que les trois fonctions demandent la bonne chose et
 * traduisent la réponse comme le serveur le fait.
 *
 * **Ce qui reste non éprouvé est l'aller-retour lui-même**, et c'est dit plutôt
 * que laissé croire : il demande une URL Supabase et un jeton, que les épreuves
 * n'ont pas. La première fois qu'il tournera pour de vrai sera la première fois.
 *
 * ## Les pages
 *
 * Les documents du corpus sont du Markdown ; la lecture attend des pages, parce
 * qu'un PDF en a. La coupure déclarée du corpus les sépare — et c'est bien le
 * même découpage que la perturbation « une coupure de page » vient déranger.
 */

import { lireUnRapport } from "../../apps/web/js/services/lire-un-rapport.js";
import { FAMILLE } from "../../apps/web/js/services/les-familles-de-document.js";
import { LA_COUPURE } from "../la-batterie-des-perturbations/les-perturbations.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Les pages d'un document du corpus, séparées par la coupure déclarée. */
export function lesPagesDuDocument(doc = "") {
  return String(doc ?? "")
    .split(LA_COUPURE)
    .map((page, rang) => ({ page: rang + 1, text: page.trim() }))
    .filter((une) => une.text);
}

/**
 * Un appelant qui tape les fonctions de bord.
 *
 * @param {object} ou `{url, jeton}` — l'URL du projet Supabase et le jeton porteur
 */
export function parLeReseau({ url = "", jeton = "" } = {}) {
  const racine = texte(url).replace(/\/+$/, "");
  if (!racine || !texte(jeton)) {
    throw new Error("Le lecteur du serveur demande une URL Supabase et un jeton.");
  }

  return async (fonction, corps) => {
    const rendu = await fetch(`${racine}/functions/v1/${fonction}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${texte(jeton)}` },
      body: JSON.stringify(corps)
    });
    if (!rendu.ok) {
      throw new Error(`${fonction} a répondu ${rendu.status} ${texte(await rendu.text()).slice(0, 200)}`);
    }
    return rendu.json();
  };
}

/**
 * Les trois appels, **dans la forme que l'orchestrateur attend**.
 *
 * C'est la transposition de `lesAppelsDuServeur` de la fonction de bord
 * `lire-les-rapports`. Elle est recopiée plutôt qu'importée parce que l'original
 * est du TypeScript Deno, que Node ne charge pas — et c'est une dette qu'il faut
 * dire : si le serveur change la forme d'une réponse, cette copie-ci ne le
 * saura pas, et la batterie mesurera une lecture qui n'est plus celle du produit.
 */
export function lesAppelsDeLaBatterie(appeler, projectId = "") {
  return {
    reconnaitreLaStructure: async ({ pages }) => {
      try {
        const rendu = await appeler("structure-du-document", { project_id: projectId, pages });
        return rendu?.structure
          ? { ok: true, structure: rendu.structure, modele: texte(rendu?.modele) }
          : { ok: false, panne: "aucune structure rendue" };
      } catch (erreur) {
        // Une reconnaissance qui échoue ne bloque pas : la transcription se fait
        // sans squelette. C'est la règle du produit, et la batterie la mesure.
        return { ok: false, panne: texte(erreur?.message) };
      }
    },

    refaireLeDocument: async ({ pages, structure }) => {
      const rendu = await appeler("reconstituer-en-markdown", {
        project_id: projectId, pages, ...(structure ? { structure } : {})
      });
      const refaites = Array.isArray(rendu?.pages) ? rendu.pages : [];
      return refaites.length
        ? { ok: true, pages: refaites, modele: texte(rendu?.modele) }
        : { ok: false, motif: "rien-rendu" };
    },

    relireLesAvis: async ({ sourceId, pages }) => {
      try {
        const rendu = await appeler("extract-avis", {
          project_id: projectId, source_id: sourceId, pages
        });
        const avis = Array.isArray(rendu?.avis) ? rendu.avis : [];
        const ecartes = Array.isArray(rendu?.ecartes) ? rendu.ecartes.length : 0;

        // Un relevé où tout a été écarté n'est pas un relevé vide : le motif le
        // nomme, et la batterie compte l'épreuve comme n'ayant pas eu lieu.
        if (!avis.length) return { ok: false, motif: "rien-de-verifie", ecartes };

        return { ok: true, avis, ecartes,
          referenceDuRapport: texte(rendu?.reference_du_rapport),
          emisLe: texte(rendu?.emis_le), organisme: texte(rendu?.organisme),
          legende: Array.isArray(rendu?.legende) ? rendu.legende : [] };
      } catch (erreur) {
        return { ok: false, motif: texte(erreur?.message) };
      }
    }
  };
}

/**
 * Le lecteur à passer à la batterie.
 *
 * **Il refuse ce qu'il ne sait pas lire.** Seuls les rapports de contrôle
 * passent aujourd'hui par cet orchestrateur ; un compte rendu rendrait un
 * résultat, et il serait faux (règle 5).
 */
export function unLecteurDuServeur({ appeler = null, projectId = "" } = {}) {
  const outils = lesAppelsDeLaBatterie(appeler, projectId);

  return async ({ texte: doc = "", famille = "", nom = "" } = {}) => {
    if (famille !== FAMILLE.CONTROLE) {
      return { ok: false,
        motif: `le lecteur du serveur ne lit que « ${FAMILLE.CONTROLE} », pas « ${famille} »` };
    }

    const lu = await lireUnRapport(
      { nom, sourceId: "", pages: lesPagesDuDocument(doc) }, outils);

    return lu?.ok
      ? { ok: true, lecture: lu.vue.lecture }
      : { ok: false, motif: `${texte(lu?.motif) || "lecture refusée"} (${texte(lu?.etape)})` };
  };
}
