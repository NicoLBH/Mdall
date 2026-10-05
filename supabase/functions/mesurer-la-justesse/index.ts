/**
 * Mesurer la justesse, **au serveur, à la demande de la console.**
 *
 * ## Ce qu'elle répare
 *
 * > « Il est hors de question de passer par le terminal pour obtenir des infos. »
 *
 * Les quatre outils de mesure tournaient dans une invite de commandes, avec
 * trois variables d'environnement. La console montrait leurs bilans quand il y
 * en avait, et « jamais lancé » sinon — sans aucun moyen de changer cela depuis
 * la page.
 *
 * ## Les quatre, et deux façons de les faire
 *
 * **Ceux qui lisent** — la dérive, les invariants — se font d'un seul coup : ils
 * parcourent les analyses déjà conservées, sans un appel au modèle, en quelques
 * millisecondes. Ce sont ceux qui mesurent le chantier de celui qui regarde.
 *
 * **Ceux qui relisent** — la batterie de perturbations, le jeu de référence —
 * refont des lectures avec le modèle sur un corpus de démonstration. La batterie
 * en demande douze, à trois appels chacune : une quarantaine d'appels, et
 * plusieurs minutes. Aucune fonction de bord ne vit aussi longtemps.
 *
 * Elle en fait donc **un morceau par réveil** — une épreuve, trois appels, une
 * quinzaine de secondes —, range ce qu'elle a obtenu dans la ligne, et se
 * rappelle. Le bilan ne se dépose qu'au dernier morceau. C'est la mécanique des
 * files de lecture, à la granularité que ce travail-là demande
 * (`les-morceaux-dune-mesure.js`).
 *
 * ## La porte
 *
 * `est_administrateur()`, vérifié **par la base** : la demande n'a pu être
 * posée que par la console, et la relecture des analyses se fait sous
 * l'autorisation de celui qui demande — les politiques s'appliquent donc
 * exactement comme dans le navigateur. Une fonction qui lirait sous la clé de
 * service irait chercher les chantiers de tout le monde.
 *
 * ## Elle n'invente aucune mesure
 *
 * `laDeriveDesGelees` et `lesInvariantsDUneLecture` sont ceux que `npm test`
 * exerce, et que l'outil en ligne de commande appelle. Une seconde mesure
 * écrite ici aurait donné deux justesses du même système sans que rien ne le
 * dise (règle 4).
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { requireUser } from "../_shared/require-user.ts";

// @ts-ignore — module JS partagé, descendu par `npm run prepare:versement`
import { laDeriveDesGelees } from "../_shared/versement/la-derive-des-analyses.js";
// @ts-ignore
import { OU_SONT_LES_GELEES, uneGelee } from "../_shared/versement/les-analyses-gelees.js";
// @ts-ignore
import { MESURE, leBilanAVerser } from "../_shared/versement/le-depot-dun-bilan.js";
// @ts-ignore
import {
  laFamilleDeclaree, leBilanDesMorceaux, leProchainMorceau, lesMorceauxDeLaMesure,
  ouEnEstLaMesure
} from "../_shared/versement/les-morceaux-dune-mesure.js";
// @ts-ignore
import { passerUneEpreuve } from "../_shared/versement/passer-la-batterie.js";
// @ts-ignore
import { confronter } from "../_shared/versement/la-confrontation.js";
// @ts-ignore
import { unLecteurDuServeur } from "../_shared/versement/un-lecteur-du-serveur.js";
// @ts-ignore
import { uneAnnotation } from "../_shared/versement/lannotation.js";
// @ts-ignore — fabriqué par `npm run prepare:versement` à partir du dépôt
import {
  LES_ANNOTATIONS_DESCENDUES, LE_CORPUS_DESCENDU
} from "../_shared/versement/le-corpus-descendu.js";
import { appelerUneFonction } from "../_shared/la-file-au-serveur.ts";

const entetes = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const texte = (valeur: unknown) => String(valeur ?? "").trim();

/** Par quoi le corpus de démonstration a été relu. */
const LE_PROCEDE_DU_CORPUS = "la console · corpus de démonstration v1";

/**
 * Les trois appels de la lecture, servis par les fonctions de bord du produit.
 *
 * **Ce sont celles qui tournent en production**, et c'est tout l'intérêt : une
 * batterie qui mesurerait une lecture réécrite pour elle ne mesurerait rien de
 * ce qui lit vos documents.
 */
function parLesFonctionsDeBord(autorisation: string) {
  return async (nom: string, corps: unknown) =>
    await appelerUneFonction(nom, corps, autorisation);
}

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...entetes, "Content-Type": "application/json" }
  });
}

/**
 * **Les deux outils que cette fonction sert.**
 *
 * Écrits ici et relus par l'écran : la liste de ce qui se lance d'ici vit des
 * deux côtés, et c'est une épreuve qui les tient d'accord (règle 10). Un outil
 * servi ici et éteint à l'écran serait une mesure qu'on ne peut pas demander ;
 * l'inverse serait une demande que rien ne vient prendre.
 */
const SERVIS = [
  MESURE.DERIVE, MESURE.INVARIANTS, MESURE.PERTURBATIONS, MESURE.JEU_DE_REFERENCE
];

/** Ceux qui se font d'un seul coup : ils lisent, ils ne relisent pas. */
const DUN_SEUL_COUP = [MESURE.DERIVE, MESURE.INVARIANTS];

/**
 * Le corpus de démonstration, tel que le dépôt le porte.
 *
 * **Fabriqué par la construction**, et non recopié : un corpus recopié aurait
 * divergé au premier document ajouté, et la mesure aurait porté sur un corpus
 * différent de celui qu'on croit, sans que rien ne le dise (règle 4).
 */
function leCorpusEtSesAnnotations() {
  const corpus = (LE_CORPUS_DESCENDU as any[]).map((un) => ({
    nom: texte(un?.nom),
    famille: laFamilleDeclaree(texte(un?.contenu)),
    texte: texte(un?.contenu)
  }));

  const annotations = (LES_ANNOTATIONS_DESCENDUES as any[])
    .map((un) => uneAnnotation(un?.brute, texte(un?.nom)));

  return { corpus, annotations };
}

/**
 * Faire **un** morceau, et rendre ce qu'il a donné.
 *
 * Les deux outils qui relisent partagent cette porte : ce qui change est
 * l'unité — une épreuve de perturbation d'un côté, une confrontation de
 * l'autre — et non la mécanique.
 */
async function faireUnMorceau(outil: string, morceau: any, lire: any) {
  if (outil === MESURE.PERTURBATIONS) {
    return await passerUneEpreuve(morceau.document, morceau.perturbation, lire);
  }

  const annotation = morceau.annotation;
  const lu = await lire({
    texte: texte(annotation?.texte), famille: texte(annotation?.famille),
    nom: texte(annotation?.document)
  });

  /**
   * **Une lecture manquée n'est pas une confrontation ratée.** La confondre
   * ferait compter un rappel de zéro là où l'on n'a rien pu lire — et un taux
   * qui chute parce que le réseau a coupé est pire qu'un taux absent (règle 5).
   */
  if (!lu?.ok) return null;
  return confronter(annotation, lu.lecture);
}

/**
 * Les analyses gelées d'un chantier, des trois familles.
 *
 * **Sous l'autorisation de celui qui demande.** `OU_SONT_LES_GELEES` dit où
 * chaque famille range les siennes et quelles colonnes il faut : la liste vient
 * du registre, et non d'une seconde écrite ici.
 */
async function lesGelees(client: any, projectId: string) {
  const toutes: any[] = [];

  for (const [famille, ou] of Object.entries(OU_SONT_LES_GELEES) as any) {
    /**
     * **Toutes les lectures que ce compte peut lire**, et non celles d'un
     * chantier.
     *
     * L'outil en ligne de commande demandait `MDALL_PROJET`, et c'était une
     * limitation de l'outil, pas de la mesure : la dérive dit si **le procédé**
     * se répète, et un procédé ne tient pas chantier par chantier. Un
     * ajustement de consigne déplace les lectures partout à la fois, et c'est
     * précisément ce qu'on vient voir.
     *
     * Les politiques tiennent le périmètre : la requête passe sous
     * l'autorisation de celui qui demande, et ne voit donc que les lectures
     * auxquelles son compte a droit. L'écran le dit, plutôt que de laisser
     * croire qu'il a mesuré le produit entier (règle 5).
     */
    const demande = client
      .from(ou.table)
      .select(ou.colonnes)
      .order("created_at", { ascending: true })
      .limit(500);

    const { data, error } = await (projectId
      ? demande.eq("project_id", projectId) : demande);

    // **Une table muette n'est pas une table vide.** On s'arrête plutôt que de
    // mesurer une dérive sur deux familles en annonçant les trois (règle 5).
    if (error) throw new Error(`${ou.table} : ${texte(error.message)}`);

    for (const ligne of (Array.isArray(data) ? data : [])) {
      const gelee = uneGelee(ligne, famille);
      if (gelee) toutes.push(gelee);
    }
  }

  return toutes;
}

/**
 * La mesure d'un outil, sur les analyses d'un chantier.
 *
 * **Les deux outils sortent du même calcul**, et c'est voulu : les invariants
 * sont vérifiés lecture par lecture **à l'intérieur** de la dérive, qui les
 * rassemble. Les calculer deux fois aurait donné deux comptes d'invariants pour
 * le même corpus.
 */
function laMesure(outil: string, gelees: any[]) {
  const { bilan } = laDeriveDesGelees(gelees);

  if (outil === MESURE.DERIVE) return leBilanAVerser(MESURE.DERIVE, bilan);
  return leBilanAVerser(MESURE.INVARIANTS, bilan);
}

/**
 * Un morceau de plus, puis on se rappelle.
 *
 * ## Pourquoi la ligne garde les morceaux faits, et non un compteur
 *
 * Le bilan se compose de **toutes** les épreuves ensemble : `leBilan` lit les
 * verdicts, les invariants posés et ceux qui sont tombés. Un compteur
 * obligerait à tout recommencer au moindre réveil manqué — c'est-à-dire à
 * repayer quarante appels.
 *
 * ## Pourquoi le rappel ne s'attend pas
 *
 * C'est la règle de toutes les files d'ici : le morceau est écrit, **c'est lui
 * qui compte**. Un rappel qui ne part pas laisse la ligne `en_cours`, et le
 * réveil suivant la reprend là où elle en était. Rien n'est perdu, c'est juste
 * plus tard.
 */
async function unMorceauDePlus(client: any, ligne: any, autorisation: string) {
  const outil = texte(ligne.outil);
  const { corpus, annotations } = leCorpusEtSesAnnotations();
  const morceaux = lesMorceauxDeLaMesure(outil, { corpus, annotations });

  const faits = Array.isArray(ligne?.avancement?.faits) ? ligne.avancement.faits : [];
  const morceau = leProchainMorceau(morceaux, faits);

  /* ── Plus rien à faire : on compose, on dépose, on referme ──────────────── */
  if (!morceau) {
    const verser = leBilanDesMorceaux(outil, faits);
    if (!verser) throw new Error("la mesure n'a rien rendu qui puisse être déposé");

    const { data: mesureId, error: pasDeposee } = await client.rpc("deposer_une_mesure", {
      p_quoi: verser.quoi,
      p_procede: LE_PROCEDE_DU_CORPUS,
      p_combien: verser.combien,
      p_bilan: verser.bilan
    });
    if (pasDeposee) throw new Error(`le bilan ne s'est pas déposé : ${pasDeposee.message}`);

    await client
      .from("mesures_demandees")
      .update({
        statut: "fini",
        fini_le: new Date().toISOString(),
        procede: LE_PROCEDE_DU_CORPUS,
        mesure_id: texte(mesureId) || null
      })
      .eq("id", ligne.id);

    return reponse({ prise: true, outil, acheve: true, combien: verser.combien });
  }

  /* ── Un morceau, et un seul ─────────────────────────────────────────────── */
  const lire = unLecteurDuServeur({
    appeler: parLesFonctionsDeBord(autorisation),
    // Le corpus n'appartient à aucun chantier : ces lectures ne touchent aucune
    // de vos données, et n'en écrivent aucune.
    projectId: ""
  });

  const obtenu = await faireUnMorceau(outil, morceau, lire);
  const suivants = [...faits, { cle: texte(morceau.cle), obtenu }];
  const ou = ouEnEstLaMesure(morceaux, suivants);

  await client
    .from("mesures_demandees")
    .update({ avancement: { faits: suivants }, statut: "en_cours" })
    .eq("id", ligne.id);

  // **Le rappel ne s'attend pas**, et son échec n'en est pas un : la ligne
  // reste `en_cours`, et le réveil suivant la reprendra.
  try {
    void appelerUneFonction("mesurer-la-justesse", {}, autorisation);
  } catch { /* elle attendra le prochain réveil */ }

  return reponse({ prise: true, outil, acheve: false, ou: ou.dit });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: entetes });

  const qui = await requireUser(req, entetes);
  if ("response" in qui) return qui.response;

  const autorisation = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: { headers: { Authorization: autorisation } },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  /**
   * **La ligne la plus ancienne qui attend, parmi les outils servis.**
   *
   * La lecture passe par la politique de la table, qui la réserve aux
   * administrateurs : une fonction qui lirait la file sous la clé de service
   * servirait une demande que personne n'a eu le droit de poser.
   */
  const { data: lignes, error: pasLue } = await client
    .from("mesures_demandees")
    .select("id, outil, projet_id, statut, avancement, cree_le")
    /**
     * **`en_cours` compte aussi**, et c'est tout l'objet du découpage : une
     * mesure qui avance par morceaux est reprise par le réveil suivant, là où
     * elle en était. Ne lire que `en_attente` l'aurait laissée au premier
     * morceau pour toujours.
     */
    .in("statut", ["en_attente", "en_cours"])
    .in("outil", SERVIS)
    .order("cree_le", { ascending: true })
    .limit(1);

  if (pasLue) return reponse({ arrete: `la file ne se lit pas : ${pasLue.message}` }, 500);

  const ligne = (Array.isArray(lignes) ? lignes[0] : null) ?? null;
  if (!ligne) return reponse({ prise: false, dit: "rien n'attend" });

  /**
   * **Marquée prise avant de commencer.** Deux réveils rapprochés prendraient
   * sinon la même ligne, et le même morceau se paierait deux fois.
   *
   * La prise est conditionnée au statut qu'on a lu : si un autre réveil l'a
   * prise entre-temps, l'écriture ne touche aucune ligne et celui-ci s'arrête.
   */
  const { data: priseData, error: pasPrise } = await client
    .from("mesures_demandees")
    .update({ statut: "en_cours", pris_le: new Date().toISOString() })
    .eq("id", ligne.id)
    .eq("statut", ligne.statut)
    .select("id");

  if (pasPrise || !(Array.isArray(priseData) ? priseData.length : 0)) {
    return reponse({ prise: false, dit: "déjà prise" });
  }

  try {
    /**
     * **Les outils qui relisent avancent morceau par morceau.**
     *
     * Un morceau, trois appels, une quinzaine de secondes — puis la ligne garde
     * ce qu'on a obtenu, et la fonction se rappelle. Elle ne dépose son bilan
     * qu'au dernier.
     */
    if (!DUN_SEUL_COUP.includes(texte(ligne.outil))) {
      return await unMorceauDePlus(client, ligne, autorisation);
    }

    /**
     * **Un chantier n'est pas obligatoire**, et c'est le cas ordinaire : la
     * console mesure le procédé sur tout ce qu'elle peut lire. Une demande qui
     * en porte un restreint la mesure à celui-là.
     */
    const gelees = await lesGelees(client, texte(ligne.projet_id));
    if (!gelees.length) {
      throw new Error("aucune analyse conservée n'est lisible : il n'y a rien à mesurer");
    }
    const verser = laMesure(texte(ligne.outil), gelees);
    if (!verser) throw new Error("la mesure n'a rien rendu qui puisse être déposé");

    /**
     * **Le dépôt passe par la base**, et non par un `insert` écrit ici :
     * `deposer_une_mesure` jette toute valeur qui n'est pas un nombre, et c'est
     * la serrure qui empêche un contenu de chantier d'entrer dans la console.
     */
    const { data: mesureId, error: pasDeposee } = await client.rpc("deposer_une_mesure", {
      p_quoi: verser.quoi,
      // Le procédé n'est pas celui d'un modèle : cette mesure ne lit rien avec
      // un modèle. Elle dit donc par quoi elle a été faite.
      p_procede: "la console · lecture des gelées v1",
      p_combien: verser.combien,
      p_bilan: verser.bilan
    });

    if (pasDeposee) throw new Error(`le bilan ne s'est pas déposé : ${pasDeposee.message}`);

    await client
      .from("mesures_demandees")
      .update({
        statut: "fini",
        fini_le: new Date().toISOString(),
        procede: "la console · lecture des gelées v1",
        mesure_id: texte(mesureId) || null
      })
      .eq("id", ligne.id);

    return reponse({ prise: true, outil: ligne.outil, combien: verser.combien });
  } catch (erreur) {
    /**
     * **Un échec referme la ligne, avec son motif.** Une ligne laissée
     * `en_cours` se lirait « ça tourne encore » pour toujours, et l'on
     * attendrait un bilan qui ne viendra jamais (règle 5).
     */
    const motif = texte((erreur as Error)?.message) || "cause inconnue";
    await client
      .from("mesures_demandees")
      .update({ statut: "echec", fini_le: new Date().toISOString(), arrete: motif })
      .eq("id", ligne.id);

    return reponse({ prise: true, arrete: motif }, 500);
  }
});
