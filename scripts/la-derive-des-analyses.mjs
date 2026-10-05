#!/usr/bin/env node
/**
 * La dérive des analyses — **ce qui a changé entre deux lectures du même document.**
 *
 *   node scripts/la-derive-des-analyses.mjs
 *     → **l'auto-épreuve** : sur une base de carton où l'on a fabriqué exprès
 *       une dérive, une instabilité et une stabilité. L'outil doit nommer les
 *       trois correctement. Aucune de vos lectures n'est regardée.
 *
 *   SUPABASE_URL=… SUPABASE_JETON=… MDALL_PROJET=… \
 *   node scripts/la-derive-des-analyses.mjs --serveur
 *     → vos lectures conservées.
 *
 * ## Elle ne coûte rien
 *
 * Chaque lecture a sa propre ligne, jamais mise à jour : la suite des lectures
 * d'un document est **déjà écrite**. La dérive se lit, elle ne se fabrique pas —
 * pas un appel au modèle, pas une facture. C'est ce qui permet de la regarder
 * souvent, et un indicateur qu'on ne regarde pas ne sert à rien.
 *
 * ## Pour ajouter un point à la série
 *
 * On relit le document **depuis l'Atelier**, avec le bouton du produit. Ce n'est
 * pas un manque de cet outil : une relecture lancée par un script de mesure
 * serait une lecture que rien ne trace, et la trace est précisément ce qu'on
 * mesure ici.
 *
 * ## Ce qu'elle ne dit pas
 *
 * **Si c'est mieux.** Deux lectures peuvent différer et la seconde être
 * meilleure ; elles peuvent différer et la seconde être pire. Il faudrait savoir
 * quelle est la bonne réponse, et c'est le jeu de référence. Elle dit ce qui a
 * bougé, nommément, et c'est vous qui savez ce que vous aviez voulu.
 */

import { CE_QUI_SEST_PASSE, laDeriveDesGelees } from "./la-derive-des-analyses/la-derive.js";
import { lePluriel } from "../apps/web/js/services/lexploitation-de-mdall.js";
import {
  lesGeleesDunProjet, parLeReseau
} from "./la-derive-des-analyses/les-gelees-du-serveur.js";
import {
  unAvis, uneBaseDeCarton, uneLigneDeCompteRendu, uneLigneDeRapport
} from "./la-derive-des-analyses/une-base-de-carton.js";
import {
  MESURE, deposerUnBilan, direLeDepot, ouDeposer
} from "./la-mesure-des-analyses/le-depot-dun-bilan.js";

const texte = (valeur) => String(valeur ?? "").trim();

const LA_MARQUE = {
  [CE_QUI_SEST_PASSE.STABLE]: " = ",
  [CE_QUI_SEST_PASSE.DERIVE]: " ~ ",
  [CE_QUI_SEST_PASSE.INSTABLE]: " ! ",
  [CE_QUI_SEST_PASSE.PROCEDE_INCONNU]: " ? ",
  [CE_QUI_SEST_PASSE.SANS_OBJET]: " · "
};

/**
 * **La base de l'auto-épreuve : trois défauts fabriqués exprès.**
 *
 * Un rapport lu trois fois — stable sous un procédé qui change, puis instable
 * sous le même — et un compte rendu lu deux fois sans que `lu_par` dise rien.
 * L'outil doit nommer les trois, et ne pas trancher sur le troisième.
 */
function laBaseDeLauroEpreuve() {
  return uneBaseDeCarton({
    rapport_lectures: [
      uneLigneDeRapport({ id: "l-1", lueLe: "2026-04-20T09:00:00Z",
        luPar: "modèle A · lecture de rapport v1", avis: [unAvis("A-07", "F"), unAvis("A-12", "D")] }),
      // Le procédé change, et un avis de plus est relevé : une **dérive**.
      uneLigneDeRapport({ id: "l-2", lueLe: "2026-05-02T09:00:00Z",
        luPar: "modèle B · lecture de rapport v2",
        avis: [unAvis("A-07", "F"), unAvis("A-12", "D"), unAvis("A-23", "F")] }),
      // Le procédé ne change pas, et un verdict bascule : une **instabilité**.
      uneLigneDeRapport({ id: "l-3", lueLe: "2026-05-09T09:00:00Z",
        luPar: "modèle B · lecture de rapport v2",
        avis: [unAvis("A-07", "D"), unAvis("A-12", "D"), unAvis("A-23", "F")] })
    ],
    // Deux lectures qui diffèrent, et dont `lu_par` ne dit rien : l'outil ne
    // doit **pas** trancher.
    cr_lectures: [
      uneLigneDeCompteRendu({ id: "c-1", lueLe: "2026-05-02T09:00:00Z", luPar: "",
        points: [{ reference: "02.3", titre: "Dalle du préau", etat: "En cours" }] }),
      uneLigneDeCompteRendu({ id: "c-2", lueLe: "2026-05-16T09:00:00Z", luPar: "",
        points: [{ reference: "02.3", titre: "Dalle du préau", etat: "Soldé" }] })
    ]
  });
}

const surLeServeur = process.argv.slice(2).includes("--serveur");

const url = texte(process.env.SUPABASE_URL);
const jeton = texte(process.env.SUPABASE_JETON);
const projet = texte(process.env.MDALL_PROJET);

/**
 * **Un manque se dit, il ne se contourne pas.** Retomber en silence sur la base
 * de carton rendrait un bilan qu'on prendrait pour le sien — et un bilan de
 * dérive se lit comme une bonne nouvelle (règle 5).
 */
const manque = surLeServeur
  ? [!url && "SUPABASE_URL", !jeton && "SUPABASE_JETON", !projet && "MDALL_PROJET"].filter(Boolean)
  : [];
if (manque.length) {
  console.error(`\n--serveur demande ${manque.join(", ")} dans l'environnement.`);
  console.error("La dérive lit les lectures déjà conservées : aucun appel au modèle, "
    + "aucune facture.\n");
  process.exit(2);
}

console.log(surLeServeur
  ? `\nVOS LECTURES CONSERVÉES — projet ${projet}. Aucun appel au modèle.`
  : "\nAUTO-ÉPREUVE — une base de carton où trois défauts ont été fabriqués exprès.\n"
    + "Aucune de vos lectures n'est regardée. Pour les vôtres : --serveur.");

const { gelees, pannes } = await lesGeleesDunProjet(
  surLeServeur ? parLeReseau({ url, jeton }) : laBaseDeLauroEpreuve(),
  surLeServeur ? projet : "p-1");

for (const panne of pannes) console.error(` ! une famille n'a pas pu être lue — ${panne}`);

const { franchissements, invariants, bilan } = laDeriveDesGelees(gelees);

console.log(`\n${lePluriel(bilan.lecturesEprouvees, "lecture conservée", "lectures conservées")}, `
  + `${lePluriel(bilan.franchis, "passage")} d'une lecture à la suivante.\n`);

let document = "";
for (const un of franchissements) {
  if (un.document !== document) { console.log(`\n── ${un.document}`); document = un.document; }
  console.log(`${LA_MARQUE[un.quoi]}${un.de.lueLe.slice(0, 10)} → ${un.vers.lueLe.slice(0, 10)}  ${un.dit}`);
}

/**
 * Les invariants tombés, **nommés document par document.**
 *
 * Ils ne disent rien de la dérive : une lecture peut être parfaitement stable et
 * citer des phrases qui ne figurent pas dans le document. Deux questions, deux
 * réponses, et les mêler ferait rater celle qui compte.
 */
const tombes = invariants.filter((un) => un.poses.some((pose) => pose.tient === false));
if (tombes.length) {
  console.log("\n── les invariants tombés (ce que chaque lecture dit d'elle-même)");
  for (const un of tombes) {
    for (const pose of un.poses.filter((une) => une.tient === false)) {
      console.log(` ! ${un.document.padEnd(20)} ${pose.quoi.padEnd(20)} ${pose.dit}`);
    }
  }
}

console.log(`\n═══ ${lePluriel(bilan.stables, "stable")}, `
  + `${lePluriel(bilan.derives, "dérive")}, `
  + `${lePluriel(bilan.instables, "instabilité")} ═══`);

/**
 * **Ce qui n'a pas été mesuré se dit aussi fort que ce qui l'a été.** Un
 * chantier dont presque tous les documents n'ont été lus qu'une fois n'a pas une
 * dérive nulle : il a une dérive qu'on n'a pas mesurée, et c'est tout autre
 * chose.
 */
if (bilan.luesUneFois || bilan.sansCle || bilan.sansObjet || bilan.procedeInconnu) {
  console.log(`    ${lePluriel(bilan.luesUneFois, "document lu", "documents lus")} `
    + "une seule fois — rien à comparer"
    + (bilan.sansCle
      ? ` · ${lePluriel(bilan.sansCle, "lecture")} qu'on ne sait pas rapprocher` : "")
    + (bilan.procedeInconnu
      ? ` · ${lePluriel(bilan.procedeInconnu, "passage")} dont on ignore le procédé` : "")
    + (bilan.sansObjet ? ` · ${lePluriel(bilan.sansObjet, "passage")} sans objet` : ""));
}
if (bilan.invariantsTombes) {
  console.log(`    ${lePluriel(bilan.invariantsTombes, "invariant tombé", "invariants tombés")}`);
}

/**
 * **Le dépôt dans la console, et seulement depuis `--serveur`.**
 *
 * L'auto-épreuve ne dépose rien, jamais. Elle juge l'instrument sur une matière
 * fabriquée exprès : déposer son bilan montrerait la justesse de l'instrument
 * comme celle du produit, et c'est le mensonge le plus confortable de tout cet
 * outillage — un écran vert obtenu sans avoir lu un seul document (règle 5).
 *
 * `MDALL_PROCEDE` nomme le modèle et la version mesurés. Absent, le bilan se
 * dépose avec un procédé vide, et l'écran le dit « procédé non noté » plutôt que
 * de le ranger sous un procédé supposé.
 */
async function deposerDansLaConsole(quoi, bilan) {
  const ou = ouDeposer(process.env);
  if (!ou) { console.log(`\n${direLeDepot(null, { ou })}`); return; }

  for (const un of quoi) {
    const rendu = await deposerUnBilan({
      ou, quoi: un, procede: texte(process.env.MDALL_PROCEDE), bilan
    });
    console.log(`\n${un} — ${direLeDepot(rendu, { ou })}`);
  }
}

/**
 * **Seule l'instabilité fait sortir en échec**, sur vos lectures.
 *
 * Une dérive est attendue : on a touché à la consigne, et l'on vient voir ce que
 * ça change. Une instabilité, non : le même procédé a rendu deux réponses sur le
 * même document, et rien ne se conclut d'une mesure qui ne se répète pas.
 */
if (surLeServeur) {
  await deposerDansLaConsole([MESURE.DERIVE, MESURE.INVARIANTS], bilan);
  process.exit(bilan.instables ? 1 : 0);
}

/**
 * L'auto-épreuve, elle, juge **l'outil** : les trois défauts fabriqués doivent
 * être nommés, chacun par son nom. Un instrument qui les confondrait ferait
 * prendre un réglage voulu pour une panne — ou l'inverse, qui est pire.
 */
const nomme = bilan.derives === 1 && bilan.instables === 1 && bilan.procedeInconnu === 1;
console.log(nomme
  ? "\n═══ L'INSTRUMENT DISTINGUE : une dérive, une instabilité, "
    + "et un procédé sur lequel il ne tranche pas ═══"
  : `\n═══ L'INSTRUMENT NE DISTINGUE PLUS : ${bilan.derives} dérives, `
    + `${bilan.instables} instabilités, ${bilan.procedeInconnu} procédés inconnus `
    + "— on en attendait une de chaque ═══");
process.exit(nomme ? 0 : 1);
