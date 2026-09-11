/**
 * Pourquoi un sujet ne dit rien de ce que les comptes rendus en redisent.
 *
 * ## Pourquoi ce fichier existe
 *
 * Le suivi d'une réunion à l'autre traverse quatre maillons — reconnaître le
 * compte rendu, trier ses points, écrire les reprises, calculer la phrase. Il a
 * été relu deux fois, corrigé deux fois, et il est resté muet à l'écran. Le
 * problème n'est pas d'analyser : c'est qu'**on ne voit pas où il s'arrête**.
 *
 * Chaque maillon peut échouer sans bruit, et l'écran affiche la même chose dans
 * les quatre cas : rien. Relire le code une troisième fois ne distinguera pas
 * « aucun compte rendu n'a jamais été fusionné » de « les reprises sont écrites
 * mais la phrase se calcule mal ». Il faut regarder les données.
 *
 * ## Ce qu'il rend, et ce qu'il ne rend pas
 *
 * **Un constat par maillon, pas un vidage.** Le nombre de lignes, ce qu'elles
 * portent, et pour chaque maillon une phrase qui dit s'il a fait son travail.
 * Un vidage de tables obligerait à refaire ici le raisonnement qui est déjà
 * dans le code.
 *
 * **Il ne corrige rien et n'écrit rien.** Il lit, il compte, il constate. Un
 * diagnostic qui répare masquerait la cause en la supprimant.
 *
 * ## Il est provisoire
 *
 * Il existe le temps de comprendre. Le jour où la ligne s'affiche, il s'en va —
 * et le laisser traîner ferait un second endroit où l'on va chercher ce que le
 * sujet dit déjà.
 */

import { CR_CHANTIER_KIND } from "./document-recognizer-cr.js";
import { mentionsDesLignes, repriseSansChangement } from "./reprise-sans-changement.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** La date comme l'écran la met. */
function enFrancais(iso) {
  const [annee, mois, jour] = texte(iso).slice(0, 10).split("-");
  return annee && mois && jour ? `${jour}/${mois}/${annee}` : texte(iso);
}

/**
 * Le constat, à partir de ce qui a été lu.
 *
 * Pur : il ne touche ni au réseau ni au DOM, donc il se vérifie.
 *
 * @param {object} faits
 * @param {string} [faits.projetRoute] l'identifiant de la route
 * @param {string} [faits.projetBackend] celui de la base
 * @param {object[]} [faits.documents] les documents du projet
 * @param {object[]} [faits.sujets] les sujets chargés à l'écran
 * @param {object[]|null} [faits.reprises] les lignes de `subject_cr_mentions`,
 *   `null` si la base n'a pas répondu
 * @param {object[]} [faits.epingles] les épingles de qui regarde
 * @param {string} [faits.migrationLe] le jour où le suivi a commencé d'exister
 * @returns {string}
 */
export function diagnosticDuSuivi({
  projetRoute = "", projetBackend = "", documents = [], sujets = [],
  reprises = null, epingles = [], migrationLe = "2026-09-21"
} = {}) {
  const lignes = [];
  const dire = (ligne = "") => lignes.push(ligne);

  const docs = Array.isArray(documents) ? documents : [];
  const sujs = Array.isArray(sujets) ? sujets : [];

  dire("=== SUIVI D'UNE RÉUNION À L'AUTRE — CONSTAT ===");
  dire(`projet : route ${projetRoute || "(aucune)"} · base ${projetBackend || "(non résolu)"}`);
  dire(`sujets chargés : ${sujs.length} · épingles : ${Array.isArray(epingles) ? epingles.length : 0}`);
  dire("");

  /* ── 1. Les comptes rendus ─────────────────────────────────────────────── */

  const cr = docs.filter((doc) => estUnCompteRendu(doc));
  dire(`-- 1. COMPTES RENDUS : ${cr.length} sur ${docs.length} documents`);

  if (cr.length === 0) {
    dire("   AUCUN. Sans compte rendu reconnu, rien n'est repris : la chaîne");
    dire("   n'a pas de quoi commencer.");
    const douteux = docs.filter((doc) => !texte(doc?.detected_kind)).length;
    if (douteux > 0) dire(`   (${douteux} document(s) sans nature reconnue)`);
  } else {
    for (const doc of cr) {
      const numero = texte(doc?.declared_reference);
      const tenueLe = texte(doc?.issued_at).slice(0, 10);
      dire(`   ${texte(doc?.original_filename ?? doc?.filename) || texte(doc?.id)}`);
      dire(`     n° ${numero || "(non lu)"} · tenue le ${tenueLe || "(non lue)"}`
        + ` · déposé le ${texte(doc?.created_at).slice(0, 10) || "?"}`);
    }

    const sansNumero = cr.filter((doc) => !texte(doc?.declared_reference)).length;
    const sansDate = cr.filter((doc) => !texte(doc?.issued_at)).length;
    if (sansNumero > 0) {
      dire(`   ${sansNumero} compte(s) rendu(s) sans numéro : la phrase ne pourra`);
      dire("   nommer aucun compte rendu.");
    }
    if (sansDate > 0) {
      dire(`   ${sansDate} compte(s) rendu(s) sans date de réunion : la phrase`);
      dire("   perdra son « depuis le … », et l'ordre des reprises n'est plus sûr.");
    }
  }
  dire("");

  /* ── 2. Les reprises écrites ───────────────────────────────────────────── */

  dire("-- 2. REPRISES EN BASE");

  if (reprises === null) {
    dire("   LA BASE N'A PAS RÉPONDU. On ne sait pas s'il y en a — et c'est");
    dire("   différent de « il n'y en a pas » (règle 5).");
    dire("");
    return lignes.join("\n");
  }

  dire(`   ${reprises.length} ligne(s) pour les sujets chargés`);

  if (reprises.length === 0) {
    dire("   AUCUNE. La chaîne s'arrête ici : rien n'a jamais été écrit.");
    dire("");
    dire("   Les reprises ne s'écrivent qu'à la fusion d'une proposition qui");
    dire("   porte un compte rendu. Deux causes possibles, et elles se");
    dire("   distinguent par les dates ci-dessus :");
    dire(`     · les comptes rendus ont été fusionnés avant le ${migrationLe},`);
    dire("       jour où le suivi a commencé d'exister — rien ne pouvait être");
    dire("       écrit, et rien ne sera rattrapé sans refusionner ;");
    dire("     · ils ont été fusionnés depuis, et l'écriture a échoué ou n'a");
    dire("       rien trouvé à écrire.");
    const avant = cr.filter((doc) => texte(doc?.created_at).slice(0, 10) < migrationLe).length;
    if (cr.length > 0) {
      dire(`   ${avant} des ${cr.length} compte(s) rendu(s) ont été déposés avant cette date.`);
    }
    dire("");
    return lignes.join("\n");
  }

  const parSujet = new Map();
  for (const ligne of reprises) {
    const cle = texte(ligne?.subject_id);
    if (!cle) continue;
    if (!parSujet.has(cle)) parSujet.set(cle, []);
    parSujet.get(cle).push(ligne);
  }

  dire(`   réparties sur ${parSujet.size} sujet(s)`);
  dire("");

  /* ── 3. Ce que la phrase donne, sujet par sujet ────────────────────────── */

  dire("-- 3. CE QUE CHAQUE SUJET AFFICHE");

  const titres = new Map(sujs.map((sujet) => [texte(sujet?.id), texte(sujet?.title ?? sujet?.titre)]));

  for (const [subjectId, sesLignes] of parSujet) {
    const mentions = mentionsDesLignes(sesLignes);
    const dit = repriseSansChangement(mentions, { dater: enFrancais });
    const suite = mentions
      .map((mention) => `n°${mention.numero || "?"}${mention.aChange ? "*" : ""}`)
      .join(" ");

    dire(`   ${titres.get(subjectId) || subjectId}`);
    dire(`     reprises : ${suite}   (* = a changé)`);
    dire(`     affiche  : ${dit.texte || "(rien)"}`);
    if (!dit.texte) {
      dire("     → la dernière reprise a changé quelque chose : c'est le");
      dire("       commentaire daté qui le dit, pas cette ligne.");
    }
  }
  dire("");

  /* ── 4. Les sujets que rien n'a repris ─────────────────────────────────── */

  const muets = sujs.filter((sujet) => !parSujet.has(texte(sujet?.id)));
  dire(`-- 4. SUJETS SANS AUCUNE REPRISE : ${muets.length} sur ${sujs.length}`);
  for (const sujet of muets.slice(0, 12)) {
    dire(`   ${texte(sujet?.title ?? sujet?.titre) || texte(sujet?.id)}`);
  }
  if (muets.length > 12) dire(`   … et ${muets.length - 12} autre(s)`);

  return lignes.join("\n");
}

/**
 * Ce document est-il un compte rendu de chantier ?
 *
 * On lit la nature **telle que la reconnaissance l'a écrite**, et sous le nom
 * qu'elle en donne. Deviner d'après le nom du fichier ferait passer pour un
 * compte rendu tout ce qui s'appelle « CR » et raterait ceux qui ne s'appellent
 * pas ainsi ; écrire la famille en toutes lettres ici en ferait un second
 * endroit où elle vit (règle 10).
 */
export function estUnCompteRendu(document = {}) {
  return texte(document?.detected_kind) === CR_CHANTIER_KIND;
}
