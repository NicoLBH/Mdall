/**
 * Ce qui n'a pas abouti se compte, comme ce qui aboutit.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  MOTIF_DU_REFUS, MOTIFS_DU_REFUS_DITS, REMEDES_DU_REFUS,
  motifDuRefus, motifDeLaPanne, nomDeLaFonction, refusANoter,
  refusParMotif, phraseDesRefus
} from "./journal-des-refus.js";

/* ── Ce qu'un code de réponse dit de la panne ────────────────────────────── */

test("chaque code se range là où il appelle un geste différent", () => {
  // Un code mal rangé envoie chercher un problème ailleurs : 429 traité comme
  // un refus fait relire un prompt alors qu'il suffisait d'attendre.
  assert.equal(motifDuRefus(401), MOTIF_DU_REFUS.NON_AUTORISE);
  assert.equal(motifDuRefus(403), MOTIF_DU_REFUS.NON_AUTORISE);
  assert.equal(motifDuRefus(404), MOTIF_DU_REFUS.INJOIGNABLE);
  assert.equal(motifDuRefus(402), MOTIF_DU_REFUS.QUOTA);
  assert.equal(motifDuRefus(413), MOTIF_DU_REFUS.TROP_GRAND);
  assert.equal(motifDuRefus(429), MOTIF_DU_REFUS.SURCHARGE);
  assert.equal(motifDuRefus(502), MOTIF_DU_REFUS.SURCHARGE);
  assert.equal(motifDuRefus(503), MOTIF_DU_REFUS.SURCHARGE);

  // « On a cessé d'attendre » n'est pas un refus : un refus a une cause
  // nommée, un dépassement n'en a aucune.
  for (const code of [408, 504, 524]) assert.equal(motifDuRefus(code), MOTIF_DU_REFUS.TROP_LONG);

  // Un code nommé qu'on ne range pas ailleurs est un refus, et c'est exact.
  assert.equal(motifDuRefus(400), MOTIF_DU_REFUS.REFUSE);
  assert.equal(motifDuRefus(500), MOTIF_DU_REFUS.REFUSE);
});

test("rien qui n'ait répondu se dit injoignable, et pas refusé", () => {
  // `fetch` ne jette que lorsque rien n'a répondu. Le noter « refusé » ferait
  // chercher un motif là où il n'y a eu aucune réponse.
  assert.equal(motifDuRefus(0), MOTIF_DU_REFUS.INJOIGNABLE);
  assert.equal(motifDuRefus(), MOTIF_DU_REFUS.INJOIGNABLE);
  assert.equal(motifDeLaPanne(), MOTIF_DU_REFUS.INJOIGNABLE);
});

test("le relevé projette cette lecture au lieu d'en tenir une seconde", async () => {
  // Deux lectures d'un même code finiraient par ne plus dire la même chose, et
  // l'écran montrerait « refusé » là où le journal noterait « surcharge ».
  const { REFUS, motifDuStatut } = await import("./le-releve-rendu.js");

  assert.equal(motifDuStatut(404), REFUS.INJOIGNABLE);
  assert.equal(motifDuStatut(504), REFUS.TROP_LONG);
  // Ce que le relevé ne connaît pas, il le subit comme un refus — et c'est
  // exact : on ne relève pas autrement pour un quota que pour un 400.
  assert.equal(motifDuStatut(429), REFUS.REFUSE);
  assert.equal(motifDuStatut(400), REFUS.REFUSE);
});

/* ── Le vocabulaire, et ce qu'il promet ──────────────────────────────────── */

test("chaque genre se dit en français, et chacun porte un geste", () => {
  // Une clé sans libellé s'afficherait telle quelle. Et un journal qui ne dit
  // que le mal est un journal qu'on cesse d'ouvrir : un genre qui n'appelle
  // aucun geste n'avait pas besoin d'exister.
  const genres = Object.values(MOTIF_DU_REFUS);
  assert.equal(genres.length, 8);
  assert.equal(new Set(genres).size, genres.length, "deux genres partagent une clé");

  for (const genre of genres) {
    assert.ok(MOTIFS_DU_REFUS_DITS[genre], `« ${genre} » n'a pas de libellé`);
    assert.ok(REMEDES_DU_REFUS[genre], `« ${genre} » n'appelle aucun geste`);
  }
  assert.equal(Object.keys(MOTIFS_DU_REFUS_DITS).length, genres.length);
  assert.equal(new Set(Object.values(MOTIFS_DU_REFUS_DITS)).size, genres.length,
    "deux genres se lisent pareil");
});

test("le domaine du code est celui que la base accepte", async () => {
  /**
   * **La base vérifie le motif elle-même** : c'est ce qui rend impossible de
   * faire passer autre chose par ce canal. Un genre ajouté ici et pas là-bas
   * ferait échouer toutes ses écritures en silence, et le journal manquerait
   * précisément le jour où quelque chose de nouveau casse.
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const migration = readFileSync(fileURLToPath(
    new URL("../../../../supabase/migrations/202610190001_le_journal_des_refus.sql", import.meta.url)
  ), "utf8");

  const dits = migration
    .slice(migration.indexOf("check (motif in ("), migration.indexOf("-- Le code de la réponse"))
    .match(/'[a-z-]+'/g)
    ?.map((un) => un.slice(1, -1)) ?? [];

  assert.deepEqual(dits.sort(), Object.values(MOTIF_DU_REFUS).sort());
});

/* ── Le nom de la fonction, lu dans son adresse ──────────────────────────── */

test("le nom de la fonction se lit dans son adresse, jamais à côté", () => {
  // Réécrire le nom ferait deux sources pour un seul fait : le jour où une
  // fonction est renommée, le journal noterait encore l'ancien nom.
  assert.equal(nomDeLaFonction("https://x.example/functions/v1/extract-avis"), "extract-avis");
  assert.equal(nomDeLaFonction("https://x.example/functions/v1/relever-un-fil?x=1"), "relever-un-fil");
  assert.equal(nomDeLaFonction("https://x.example/functions/v1/ecrire-en-mdall/"), "ecrire-en-mdall");

  // Ce qui n'a pas la forme d'un nom de fonction n'en est pas un.
  assert.equal(nomDeLaFonction("https://x.example/rest/v1/Ai_Usages"), "");
  assert.equal(nomDeLaFonction(""), "");
});

/* ── Ce qui entre dans le journal, et ce qui n'y entre pas ───────────────── */

test("un genre hors du domaine n'entre pas dans le journal", () => {
  // Un champ libre écrit par le navigateur, dans une table lue pour exploiter
  // le produit, serait un canal par lequel n'importe quoi pourrait sortir.
  assert.equal(refusANoter({ fonction: "extract-avis", motif: "le rapport dit 0,60 m" }), null);
  assert.equal(refusANoter({ fonction: "extract-avis", motif: "" }), null);
});

test("un nom de fonction qui n'en est pas un n'entre pas non plus", () => {
  const bon = { motif: MOTIF_DU_REFUS.SURCHARGE };

  assert.equal(refusANoter({ ...bon, fonction: "Ourdine Ferrand" }), null);
  assert.equal(refusANoter({ ...bon, fonction: "" }), null);
  assert.equal(refusANoter({ ...bon, fonction: "a".repeat(65) }), null);
  assert.ok(refusANoter({ ...bon, fonction: "extract-avis" }));
});

test("une ligne du journal ne porte que ce que le domaine a prévu", () => {
  // Ni message, ni charge utile : le journal répond à « combien, de quel
  // genre, quand, sur quoi », et c'est tout ce qu'il faut pour alerter.
  const ligne = refusANoter({
    fonction: "extract-avis", motif: MOTIF_DU_REFUS.SURCHARGE, statut: 429, projectId: "p1"
  });

  assert.deepEqual(Object.keys(ligne).sort(), ["fonction", "motif", "project_id", "statut"]);
  assert.deepEqual(ligne, {
    fonction: "extract-avis", motif: MOTIF_DU_REFUS.SURCHARGE, statut: 429, project_id: "p1"
  });
});

test("sans réponse, le code est absent — et non zéro", () => {
  // « 0 » se lirait comme un code de réponse. L'absence est un aveu (règle 5).
  const ligne = refusANoter({ fonction: "extract-avis", motif: MOTIF_DU_REFUS.INJOIGNABLE, statut: 0 });

  assert.equal(ligne.statut, null);
  assert.equal(refusANoter({ fonction: "a", motif: MOTIF_DU_REFUS.REFUSE }).statut, null);
  // Et un projet absent se dit `null`, pas une chaîne vide : c'est ce que la
  // colonne attend.
  assert.equal(ligne.project_id, null);
});

/* ── Ce qu'on en lit ─────────────────────────────────────────────────────── */

const panne = (motif, fonction, quand) => ({ motif, fonction, survenu_le: quand });

test("les refus se rangent par genre, le plus nombreux d'abord", () => {
  // **Les fonctions arrivent dans le désordre**, et c'est exprès : rangées à
  // l'arrivée, elles se rangeraient toutes seules et le tri ne prouverait rien.
  const range = refusParMotif([
    panne(MOTIF_DU_REFUS.SURCHARGE, "extract-sujets", "2026-10-02T08:00:00Z"),
    panne(MOTIF_DU_REFUS.INJOIGNABLE, "relever-un-fil", "2026-10-01T08:00:00Z"),
    panne(MOTIF_DU_REFUS.SURCHARGE, "extract-avis", "2026-10-03T08:00:00Z"),
    panne(MOTIF_DU_REFUS.SURCHARGE, "extract-sujets", "2026-10-01T09:00:00Z")
  ]);

  assert.deepEqual(range.map((un) => [un.motif, un.combien]), [
    [MOTIF_DU_REFUS.SURCHARGE, 3],
    [MOTIF_DU_REFUS.INJOIGNABLE, 1]
  ]);

  // Les fonctions, sans doublon et rangées : deux lectures de la même journée
  // doivent rendre la même ligne.
  assert.deepEqual(range[0].fonctions, ["extract-avis", "extract-sujets"]);
  // Le plus récent du genre : c'est ce qui dit si la panne dure encore.
  assert.equal(range[0].dernier, "2026-10-03T08:00:00Z");
  // Et le geste à faire, pris là où il vit.
  assert.equal(range[0].remede, REMEDES_DU_REFUS[MOTIF_DU_REFUS.SURCHARGE]);
});

test("un genre inconnu ne se compte pas : il ne peut pas venir de nous", () => {
  // La base le refuserait ; s'il arrivait quand même, le compter ferait lire
  // un total qui ne correspond à aucune panne connue.
  assert.deepEqual(refusParMotif([panne("mystere", "extract-avis", "2026-10-01T08:00:00Z")]), []);
});

test("à nombre égal, le mot départage — et l'ordre ne bouge pas", () => {
  const range = refusParMotif([
    panne(MOTIF_DU_REFUS.SURCHARGE, "a", "2026-10-01T08:00:00Z"),
    panne(MOTIF_DU_REFUS.QUOTA, "b", "2026-10-01T08:00:00Z")
  ]);

  assert.equal(range.length, 2);
  assert.deepEqual(range.map((un) => un.dit), range.map((un) => un.dit).slice().sort(
    (gauche, droite) => gauche.localeCompare(droite, "fr")));
});

test("zéro ne s'écrit pas", () => {
  // « 0 appel n'a pas abouti » apprend à ne plus regarder la ligne.
  assert.equal(phraseDesRefus([]), "");
  assert.equal(phraseDesRefus(null), "");

  assert.match(phraseDesRefus([panne(MOTIF_DU_REFUS.QUOTA, "a", "")]), /^1 appel n'a pas abouti$/);
  assert.match(
    phraseDesRefus([panne(MOTIF_DU_REFUS.QUOTA, "a", ""), panne(MOTIF_DU_REFUS.SURCHARGE, "b", "")]),
    /^2 appels n'ont pas abouti, de 2 genres$/
  );
  assert.match(
    phraseDesRefus([panne(MOTIF_DU_REFUS.QUOTA, "a", ""), panne(MOTIF_DU_REFUS.QUOTA, "b", "")]),
    /d'un seul genre$/
  );
});

/* ════════════════════════════════════════════════════════════════════════════
 * Le câblage : seul le code qui le porte en témoigne
 * ════════════════════════════════════════════════════════════════════════════ */

const source = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

const APPELS = [
  "avis-par-le-modele", "sujets-par-le-modele", "mdall-par-le-modele",
  "prises-par-le-modele", "structure-par-le-modele", "markdown-par-le-modele"
];

test("chaque appel au modèle note ses deux façons de ne pas aboutir", async () => {
  /**
   * **Les deux, et pas une seule.** Ne noter que la réponse refusée laisserait
   * hors du journal la panne la plus grave — celle où rien n'a répondu, et qui
   * est justement invisible du serveur.
   */
  for (const nom of APPELS) {
    const service = await source(`./${nom}.js`);

    assert.match(service, /import \{ noterLeRefusDunAppel \}/, `${nom} ne note rien`);
    assert.match(service,
      /noterLeRefusDunAppel\(\{ url: URL_DE_LA_FONCTION, statut: 0, projectId: await projetCourant\(\) \}\)/,
      `${nom} ne note pas la panne où rien n'a répondu`);
    assert.match(service,
      /url: URL_DE_LA_FONCTION, statut: reponse\.status, projectId: await projetCourant\(\)/,
      `${nom} ne note pas la réponse refusée`);
  }
});

test("rien du contenu ne peut entrer dans le journal par le dépôt", async () => {
  /**
   * C'est le point sur lequel tout repose. Le dépôt n'écrit **que** ce que
   * `refusANoter` a rendu, et `refusANoter` ne rend que quatre champs du
   * domaine. Un `body` composé ailleurs rouvrirait le canal qu'on vient de
   * fermer.
   */
  const depot = await source("./journal-des-refus-supabase.js");

  assert.match(depot, /const ligne = refusANoter\(refus\);/,
    "le dépôt compose sa ligne au lieu de la demander");
  assert.match(depot, /body: JSON\.stringify\(ligne\)/,
    "le dépôt envoie autre chose que la ligne vérifiée");
  assert.match(depot, /if \(!ligne\) return;/,
    "un refus qu'on ne sait pas nommer s'écrit quand même");

  // Et le propriétaire ne voyage pas dans ce qu'on écrit : c'est la base qui le
  // pose. Le lire pour filtrer est une autre affaire — d'où la tranche.
  const ecriture = depot.slice(
    depot.indexOf("export async function noterUnRefus"),
    depot.indexOf("export function noterLeRefusDunAppel")
  );
  assert.ok(ecriture, "noterUnRefus est introuvable");
  assert.doesNotMatch(ecriture, /owner_id/, "le navigateur déclare qui a subi la panne");
});

test("l'écran dit ce qui n'a pas abouti, et distingue « rien » de « on ne sait pas »", async () => {
  /**
   * Afficher « aucune panne » sur un journal qu'on n'a pas pu lire serait le
   * pire des mensonges, puisque c'est précisément le moment où il y en a une.
   */
  const ecran = await source("../views/consommation/ecran-de-consommation.js");

  assert.match(ecran, /if \(refus === null\) \{/, "une lecture ratée se lit comme une absence de panne");
  assert.match(ecran, /if \(!genres\.length\) return "";/, "zéro s'écrit");
  assert.match(ecran, /\$\{renderCeQuiNAPasAbouti\(refus\)\}/, "le bloc n'est dessiné nulle part");
  assert.match(ecran, /escapeHtml\(genre\.remede\)/, "le geste à faire ne se lit pas");

  // Et les deux écrans le demandent, sans quoi le bloc resterait toujours vide.
  /**
   * **Autant de fois que l'écran est dessiné.** Un écran se peint à plusieurs
   * endroits — au premier rendu, puis à chaque redessin —, et un seul oubli
   * suffirait pour que le bloc disparaisse dès qu'on revient sur l'onglet.
   */
  for (const chemin of [
    "../views/personal-settings/factures-et-abonnement.js",
    "../views/project-insights.js"
  ]) {
    const vue = await source(chemin);
    const dessins = vue.split("renderConsommation({").length - 1;
    const passages = vue.split(/refus: [\w.]+\.refusEchec \? null : \([\w.]+\.refus \?\? \[\]\)/).length - 1;

    assert.ok(dessins > 0, `${chemin} ne dessine pas l'écran de consommation`);
    assert.equal(passages, dessins,
      `${chemin} dessine ${dessins} fois l'écran et ne lui passe le journal que ${passages} fois`);
    assert.match(vue, /journal-des-refus-supabase\.js/, `${chemin} ne lit pas le journal`);
  }
});
