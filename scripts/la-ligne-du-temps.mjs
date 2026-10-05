#!/usr/bin/env node
/**
 * La ligne du temps d'un chantier — **les deux lignes, et ce qui les sépare.**
 *
 *   node scripts/la-ligne-du-temps.mjs
 *     → **l'auto-épreuve** : un corpus de carton où une archive est déposée
 *       après coup. Les deux lignes doivent diverger, et le document du passé
 *       doit perdre le droit de fermer sur son silence.
 *
 *   SUPABASE_URL=… SUPABASE_JETON=… MDALL_PROJET=… \
 *   node scripts/la-ligne-du-temps.mjs --serveur
 *     → votre chantier. Aucun appel au modèle : elle lit les lectures déjà
 *       conservées, comme la dérive.
 *
 * ## Pourquoi un terminal et pas un écran
 *
 * Parce qu'il n'y a encore rien à décider avec. La ligne du temps est une
 * matière pour la prédiction, et tant que la prédiction ne la consomme pas, un
 * écran montrerait une belle frise dont personne ne ferait rien. Ce qu'on vient
 * y chercher aujourd'hui tient en un chiffre : **de combien les deux lignes
 * diffèrent sur ce chantier**. S'il vaut zéro, il n'y a rien à arbitrer.
 */

import { laLigneDuTemps, ceQuiSepareLesDeuxLignes } from "../apps/web/js/services/la-ligne-du-temps.js";
import { CE_QUE_DIT_LA_NATURE } from "../apps/web/js/services/les-faits-dates.js";
import { FAMILLE } from "../apps/web/js/services/les-familles-de-document.js";
import { lePluriel } from "../apps/web/js/services/lexploitation-de-mdall.js";
import {
  lesGeleesDunProjet, parLeReseau
} from "./la-derive-des-analyses/les-gelees-du-serveur.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * **Un corpus de carton où l'archive arrive en dernier.**
 *
 * RICT-01 est de novembre et n'est déposé qu'en septembre suivant : les deux
 * lignes doivent diverger, et lui seul doit perdre le droit de fermer par
 * absence. C'est tout ce que l'auto-épreuve vérifie, et c'est tout ce que ce
 * module promet.
 */
function leChantierDeLauroEpreuve() {
  return [
    { document: "RICT-03.pdf", famille: FAMILLE.CONTROLE,
      quand: "2026-04-18", deposeLe: "2026-04-20",
      lecture: { avis: [
        { reference: "A-12", intitule: "Source auxiliaire 48 V", marque: "D",
          constat: "autonomie annoncée 45 minutes" }] } },
    { document: "CR_14.pdf", famille: FAMILLE.CR,
      quand: "2026-04-30", deposeLe: "2026-05-02",
      lecture: { points: [
        { reference: "02.3", titre: "Dalle haute du préau", description: "ferraillage coulé",
          faitLe: "2026-04-22", echeance: "2026-05-15" },
        { reference: "09.2", titre: "Autonomie de la source auxiliaire",
          description: "étude à reprendre", echeance: "2026-05-22" }] } },
    // L'archive : de novembre, déposée dix mois plus tard.
    { document: "RICT-01.pdf", famille: FAMILLE.CONTROLE,
      quand: "2025-11-06", deposeLe: "2026-09-01",
      lecture: { avis: [
        { reference: "A-55", intitule: "Trappe de visite du vide sanitaire", marque: "SO",
          constat: "hors mission" }] } }
  ];
}

const auServeur = process.argv.slice(2).includes("--serveur");
const url = texte(process.env.SUPABASE_URL);
const jeton = texte(process.env.SUPABASE_JETON);
const projet = texte(process.env.MDALL_PROJET);

const manque = auServeur
  ? [!url && "SUPABASE_URL", !jeton && "SUPABASE_JETON", !projet && "MDALL_PROJET"].filter(Boolean)
  : [];
if (manque.length) {
  console.error(`\n--serveur demande ${manque.join(", ")} dans l'environnement.\n`);
  process.exit(2);
}

console.log(auServeur
  ? `\nVOTRE CHANTIER — projet ${projet}. Aucun appel au modèle.`
  : "\nAUTO-ÉPREUVE — un corpus de carton où une archive est déposée après coup.\n"
    + "Aucune de vos lectures n'est regardée. Pour les vôtres : --serveur.");

/**
 * Les lectures du chantier, dans la forme que la ligne du temps attend.
 *
 * **La date de la lecture tient lieu de date de dépôt**, et c'est juste : c'est
 * le moment où ce document est entré dans ce que Mdall sait. Prendre la date du
 * document reviendrait à supposer qu'on l'a toujours connu.
 */
const lectures = auServeur
  ? (await lesGeleesDunProjet(parLeReseau({ url, jeton }), projet)).gelees.map((une) => ({
    document: une.document || une.repere,
    famille: une.famille,
    quand: une.quand,
    deposeLe: une.lueLe,
    lecture: une.lecture
  }))
  : leChantierDeLauroEpreuve();

const { vecue, reconstituee, sansDate, bilan } = laLigneDuTemps(lectures);
const ecart = ceQuiSepareLesDeuxLignes(vecue, reconstituee);

/**
 * **Trois dates, et il faut les étiqueter séparément.**
 *
 * `quand` est le jour du fait ; `dou.quand` le jour où le **document** le dit ;
 * `deposeLe` le jour où on l'a **su**. Le premier jet écrivait « appris le » sur
 * `dou.quand` — c'était faux : un rapport du 6 novembre déposé en septembre
 * suivant n'a pas été appris en novembre. Une étiquette fausse sur une ligne du
 * temps est pire qu'une ligne absente, parce qu'elle se croit.
 */
const direLeFait = (un, quelleDate, commentOnLappelle) =>
  `${un.quand}  ${CE_QUE_DIT_LA_NATURE[un.nature].padEnd(12)}${(un.reference || "—").padEnd(8)}`
  + `${un.dit.slice(0, 50).padEnd(52)}${commentOnLappelle} ${quelleDate}`;

console.log("\n── LA LIGNE VÉCUE — ce qu'on savait, et quand");
for (const un of vecue) console.log(`   ${direLeFait(un, un.deposeLe.slice(0, 10), "su le")}`);

console.log("\n── LA LIGNE RECONSTITUÉE — ce qui s'est passé");
for (const un of reconstituee) console.log(`   ${direLeFait(un, un.dou.quand, "dit le")}`);

console.log(`\n═══ ${lePluriel(bilan.faits, "fait")} sur `
  + `${lePluriel(bilan.documents, "document")} — `
  + `${lePluriel(ecart.deplaces, "déplacé")} par la reconstitution ═══`);
console.log(`    ${lePluriel(bilan.parNature.constat ?? 0, "constat")} · `
  + `${lePluriel(bilan.parNature.avis ?? 0, "avis")} · `
  + `${lePluriel(bilan.aVenir, "promesse")}, qui ne sont pas des observations`);

/**
 * **Ce qui n'est pas dans la ligne se dit aussi fort que ce qui y est.** Un
 * chantier dont la moitié des documents ne se datent pas n'a pas une
 * chronologie propre : il a une chronologie partielle, et c'est tout autre
 * chose (règle 5).
 */
if (sansDate || bilan.sansRepere || bilan.retrospectifs) {
  console.log(`    ${lePluriel(bilan.retrospectifs, "document rétrospectif", "documents rétrospectifs")} `
    + "— ils ne ferment plus un sujet sur leur silence"
    + (bilan.sansRepere ? ` · ${bilan.sansRepere} qu'on ne sait pas dater` : "")
    + (sansDate ? ` · ${lePluriel(sansDate, "fait")} sans date, hors des deux lignes` : ""));
}

if (!ecart.deplaces) {
  console.log("    Les deux lignes coïncident : rien à arbitrer sur ce chantier.");
}

if (auServeur) process.exit(0);

/**
 * L'auto-épreuve juge **le moteur** : l'archive doit déplacer la ligne, et elle
 * doit perdre le droit de fermer par absence. Un moteur qui ne ferait ni l'un ni
 * l'autre rendrait une frise exacte et sans intérêt.
 */
const deplace = ecart.deplaces > 0;
const recule = bilan.retrospectifs === 1;

console.log(deplace && recule
  ? "\n═══ LE MOTEUR DISTINGUE : l'archive déplace la ligne reconstituée, "
    + "et perd le droit de fermer sur son silence ═══"
  : `\n═══ LE MOTEUR NE DISTINGUE PLUS : ${ecart.deplaces} faits déplacés, `
    + `${bilan.retrospectifs} documents rétrospectifs — on en attendait au moins un de chaque ═══`);
process.exit(deplace && recule ? 0 : 1);
