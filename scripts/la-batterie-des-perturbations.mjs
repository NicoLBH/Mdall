#!/usr/bin/env node
/**
 * Lancer la batterie de perturbations.
 *
 *   node scripts/la-batterie-des-perturbations.mjs
 *     → **l'auto-épreuve** : la batterie se passe sur deux lecteurs de carton,
 *       l'un qui lit la colonne du verdict, l'autre qui rend toujours la même
 *       marque sans la regarder. Elle doit laisser passer le premier et
 *       attraper le second. Elle ne mesure aucune de vos analyses.
 *
 *   SUPABASE_URL=… SUPABASE_JETON=… MDALL_PROJET=… \
 *   node scripts/la-batterie-des-perturbations.mjs --serveur
 *     → avec la vraie lecture. Chaque épreuve coûte deux lectures, et chaque
 *       lecture coûte trois appels : la facture est annoncée avant de partir.
 *
 * ## Pourquoi l'auto-épreuve est le défaut
 *
 * Parce qu'elle ne coûte rien et qu'elle répond à la question qui vient avant
 * toutes les autres : **cet instrument mesure-t-il quelque chose ?** Un outil
 * qu'on n'a jamais vu tomber ne mesure rien. Elle fabrique donc exprès le
 * défaut qu'elle prétend attraper — un lecteur qui devine — et sort en échec si
 * elle ne l'attrape pas.
 *
 * Partir par défaut sur le serveur ferait par ailleurs payer une facture à qui
 * tape la commande pour voir. Et il est **dit à l'écran**, en toutes lettres,
 * que ce passage ne mesure aucune analyse : un outil qu'on croit avoir lancé
 * sur ses données alors qu'il tournait à vide est pire qu'un outil absent.
 */

import { leCorpus } from "./la-batterie-des-perturbations/le-corpus.js";
import { LES_PERTURBATIONS } from "./la-batterie-des-perturbations/les-perturbations.js";
import { VERDICT } from "./la-batterie-des-perturbations/la-relation.js";
import { passerLaBatterie } from "./la-batterie-des-perturbations/passer-la-batterie.js";
import {
  unLecteurFidele, unLecteurQuiDevine
} from "./la-batterie-des-perturbations/un-lecteur-de-carton.js";
import {
  parLeReseau, unLecteurDuServeur
} from "./la-mesure-des-analyses/un-lecteur-du-serveur.js";
import {
  MESURE, deposerUnBilan, direLeDepot, ouDeposer
} from "../apps/web/js/services/le-depot-dun-bilan.js";

const texte = (valeur) => String(valeur ?? "").trim();
const LA_MARQUE = { [VERDICT.TIENT]: " ✓ ", [VERDICT.TOMBE]: " ✗ ", [VERDICT.SANS_OBJET]: " · " };

/** Le lecteur demandé, et ce qu'il faut dire de lui avant de partir. */
function leLecteurDemande(arguments_ = []) {
  if (!arguments_.includes("--serveur")) return null;

  const url = texte(process.env.SUPABASE_URL);
  const jeton = texte(process.env.SUPABASE_JETON);
  const projet = texte(process.env.MDALL_PROJET);

  // **Un manque se dit, il ne se contourne pas.** Retomber en silence sur le
  // lecteur de carton rendrait un bilan vert qu'on croirait être le sien.
  const manque = [!url && "SUPABASE_URL", !jeton && "SUPABASE_JETON", !projet && "MDALL_PROJET"]
    .filter(Boolean);
  if (manque.length) {
    throw new Error(`--serveur demande ${manque.join(", ")} dans l'environnement.`);
  }

  return {
    lire: unLecteurDuServeur({ appeler: parLeReseau({ url, jeton }), projectId: projet }),
    annonce: `LECTEUR DU SERVEUR — projet ${projet}.`
  };
}

/**
 * **Le dépôt dans la console, et seulement depuis `--serveur`.**
 *
 * L'auto-épreuve ne dépose rien, jamais. Elle mesure deux lecteurs de carton :
 * déposer son bilan montrerait la justesse de l'instrument comme celle du
 * produit, et c'est le mensonge le plus confortable de tout cet outillage — un
 * écran vert obtenu sans avoir lu un seul document (règle 5).
 *
 * `MDALL_PROCEDE` nomme le modèle et la version mesurés. Absent, le bilan se
 * dépose avec un procédé vide, et l'écran le dit « procédé non noté » plutôt que
 * de le ranger sous un procédé supposé.
 */
async function deposerLesDeuxBilans(bilan) {
  const ou = ouDeposer(process.env);
  if (!ou) { console.log(`\n${direLeDepot(null, { ou })}`); return; }

  const procede = texte(process.env.MDALL_PROCEDE);
  // **Deux dépôts, et non un.** Les invariants répondent à une autre question
  // que les perturbations — « cette lecture est-elle possible » et non « la
  // lecture suit-elle » —, et les fondre ferait une case de moins à l'écran.
  for (const quoi of [MESURE.PERTURBATIONS, MESURE.INVARIANTS]) {
    const rendu = await deposerUnBilan({ ou, quoi, procede, bilan });
    console.log(`\n${quoi} — ${direLeDepot(rendu, { ou })}`);
  }
}

/** Le détail d'un passage, épreuve par épreuve. */
function raconter(epreuves = []) {
  let document = "";
  for (const une of epreuves) {
    if (une.document !== document) { console.log(`\n── ${une.document}`); document = une.document; }
    console.log(`${LA_MARQUE[une.verdict]}${une.perturbation.padEnd(36)}${une.dit}`);

    for (const quand of ["avant", "apres"]) {
      for (const invariant of (une.invariants?.[quand] ?? [])) {
        if (invariant.tient === false) {
          console.log(`     ! invariant (${quand}) ${invariant.quoi} : ${invariant.dit}`);
        }
      }
    }
  }
}

/**
 * Le bilan, dit de façon qu'on ne puisse pas le lire de travers.
 *
 * **Les sans-objet se détaillent, et ne comptent pas comme des réussites.** Une
 * batterie dont la moitié des épreuves n'ont pas eu lieu n'est pas une batterie
 * qui passe : c'est une batterie qui n'a pas eu lieu, et il faut le voir sans
 * avoir à le chercher.
 */
function direLeBilan(bilan) {
  console.log(`\n═══ ${bilan.tiennent} tiennent, ${bilan.tombees} tombent, `
    + `sur ${bilan.eues} épreuves qui ont eu lieu ═══`);
  if (bilan.sansObjet) {
    console.log(`    ${bilan.sansObjet} épreuves n'ont pas eu lieu : `
      + Object.entries(bilan.pourquoiPas).map(([quoi, n]) => `${quoi} ${n}`).join(", "));
  }
  if (bilan.invariantsTombes) console.log(`    ${bilan.invariantsTombes} invariants tombés`);
}

const corpus = leCorpus();
const demande = leLecteurDemande(process.argv.slice(2));
const combien = corpus.length * LES_PERTURBATIONS.length;

console.log(`\n${demande ? demande.annonce : "AUTO-ÉPREUVE — la batterie se mesure elle-même,\n"
  + "sur deux lecteurs de carton. Elle ne mesure aucune de vos analyses.\n"
  + "Pour mesurer vos lectures : --serveur."}`);
console.log(`${corpus.length} documents × ${LES_PERTURBATIONS.length} perturbations `
  + `= ${combien} épreuves, soit jusqu'à ${combien * 2} lectures.`);

if (demande) {
  const { epreuves, bilan } = await passerLaBatterie({ corpus, lire: demande.lire });
  raconter(epreuves);
  direLeBilan(bilan);

  await deposerLesDeuxBilans(bilan);

  // Ce que la batterie trouve n'est pas une panne de la batterie : elle sort en
  // échec quand une relation tombe, pour qu'un enchaînement s'en aperçoive.
  process.exit(bilan.tombees || bilan.invariantsTombes ? 1 : 0);
}

/**
 * L'auto-épreuve : **on fabrique le défaut, et l'on vérifie qu'il est vu.**
 *
 * Le lecteur fidèle lit la colonne du verdict ; celui qui devine rend toujours
 * « F » sans la regarder. Sur cinq perturbations ils sont indiscernables ; sur
 * « une phrase niée », le second doit tomber. S'il passe, ce n'est pas lui qui
 * ment : c'est la batterie qui ne mesure plus rien, et elle doit le dire fort.
 */
const fidele = await passerLaBatterie({ corpus, lire: unLecteurFidele });
const devine = await passerLaBatterie({ corpus, lire: unLecteurQuiDevine("F") });

raconter(fidele.epreuves);
direLeBilan(fidele.bilan);

const attrape = devine.epreuves.filter((une) => une.verdict === "tombe");
console.log("\n── le lecteur qui devine (on lui a fabriqué le défaut exprès)");
for (const une of attrape) {
  console.log(` ✗ ${une.document}  ${une.perturbation.padEnd(24)}${une.dit}`);
}

const vaBien = fidele.bilan.tombees === 0 && fidele.bilan.invariantsTombes === 0
  && attrape.length > 0;

console.log(vaBien
  ? `\n═══ L'INSTRUMENT MESURE : le lecteur fidèle passe, celui qui devine est `
    + `attrapé ${attrape.length} fois ═══`
  : `\n═══ L'INSTRUMENT NE MESURE PLUS : ${fidele.bilan.tombees} épreuves tombent sur `
    + `le lecteur fidèle, et le lecteur qui devine est attrapé ${attrape.length} fois ═══`);

process.exit(vaBien ? 0 : 1);
