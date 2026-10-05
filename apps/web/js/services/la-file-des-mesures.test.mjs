/**
 * L'épreuve des demandes de mesure.
 *
 * **La propriété qui compte : on ne lance rien sans savoir ce que ça coûte.**
 * Deux des quatre outils relisent des documents avec le modèle — une
 * quarantaine d'appels pour la batterie —, et un prix qu'on découvre sur une
 * facture n'entre jamais dans la décision (fondamental 13).
 *
 * **Et on ne pose pas une demande que rien ne viendra prendre.** Une file
 * qu'aucun serveur ne vide reste en attente pour toujours, et se lit « ça
 * tourne » (règle 5, règle 12).
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LOUTIL_DEMANDE, EN_VOL, OU_EN_EST_LA_MESURE, PAS_ENCORE_SERVI,
  ceQueLaDemandeDit, ceQueLesMesuresCoutent, ceQueLoutilDemande, cequeLeBoutonDit,
  laDemandeEnVol, laDerniereDemande, pourquoiPasDici
} from "./la-file-des-mesures.js";
import { LES_OUTILS } from "./la-justesse-de-mdall.js";

const uneDemande = (surcharge = {}) => ({
  id: "d-1", outil: "derive", statut: OU_EN_EST_LA_MESURE.ATTENTE, arrete: "", ...surcharge
});

/* ── Les quatre outils, et eux seuls ──────────────────────────────────────── */

/**
 * **Les mêmes quatre que la console affiche**, et sous les mêmes clés. Une
 * liste qui divergerait donnerait un outil affiché qu'on ne peut pas lancer, ou
 * une demande pour un outil que l'écran ne sait pas nommer (règle 10).
 */
test("les outils qu'on peut demander sont ceux que la console affiche", () => {
  assert.deepEqual(
    Object.keys(CE_QUE_LOUTIL_DEMANDE).slice().sort(),
    LES_OUTILS.map((un) => un.cle).slice().sort());
});

test("un outil inconnu ne se lance pas, et le dit", () => {
  assert.equal(ceQueLoutilDemande("un_outil_quon_na_pas_ecrit"), null);
  assert.equal(ceQueLoutilDemande(""), null);

  const bouton = cequeLeBoutonDit("un_outil_quon_na_pas_ecrit", []);
  assert.equal(bouton.peut, false);
  assert.match(bouton.pourquoi, /ne connaît pas cet outil/);
});

/* ── Le prix, avant le clic ───────────────────────────────────────────────── */

/**
 * **Chaque outil dit ce qu'il coûte**, et le bouton le porte. C'est la décision
 * qu'on prend en cliquant.
 */
test("chaque outil annonce son coût et ce qu'il rend", () => {
  for (const [cle, ce] of Object.entries(CE_QUE_LOUTIL_DEMANDE)) {
    assert.ok(ce.coute?.length > 30, `${cle} ne dit pas ce qu'il coûte`);
    assert.ok(ce.rend?.length > 30, `${cle} ne dit pas ce qu'il rend`);

    // **Les deux familles sont exclusives**, et c'est la distinction qui porte
    // tout : un outil qui lit ne relit pas, un outil qui relit ne lit pas.
    assert.equal(ce.lit, ce.relit === 0, `${cle} lit et relit à la fois`);
  }
});

test("le bouton d'un outil gratuit porte son prix, qui est rien", () => {
  const bouton = cequeLeBoutonDit("derive", []);
  assert.equal(bouton.peut, true);
  assert.equal(bouton.dit, "Lancer la mesure");
  assert.match(bouton.pourquoi, /aucun appel au modèle, aucune facture/);
});

/** Les quatre se lancent depuis la console, et c'est ce qu'on vient de livrer. */
test("les quatre outils se lancent depuis la console", () => {
  for (const outil of Object.keys(CE_QUE_LOUTIL_DEMANDE)) {
    assert.equal(pourquoiPasDici(outil), "", `${outil} ne se lance pas`);
    assert.equal(cequeLeBoutonDit(outil, []).peut, true);
  }
});

/**
 * **Et le garde reste, parce qu'il empêche le défaut que la règle 12 nomme.**
 *
 * Un bouton qui pose une ligne qu'aucune fonction ne vient prendre laisse la
 * console sur « en cours » pour toujours : on attend un bilan qui ne viendra
 * jamais. `leServeurSert` est ce qui l'interdit ; le jour où l'on ajoute un
 * cinquième outil, c'est lui qui dira s'il est servi.
 */
test("un outil que le serveur ne servirait pas resterait éteint, avec sa raison", () => {
  const faux = { ...CE_QUE_LOUTIL_DEMANDE.derive, leServeurSert: false };
  CE_QUE_LOUTIL_DEMANDE.un_outil_pas_servi = faux;
  try {
    const bouton = cequeLeBoutonDit("un_outil_pas_servi", []);
    assert.equal(bouton.peut, false, "un outil que rien ne sert se lance quand même");
    assert.equal(bouton.pourquoi, PAS_ENCORE_SERVI);
  } finally {
    delete CE_QUE_LOUTIL_DEMANDE.un_outil_pas_servi;
  }

  // Et la raison dit **pourquoi** on ne propose pas, plutôt que de laisser un
  // bouton gris sans explication — qui se lit comme une panne.
  assert.match(PAS_ENCORE_SERVI, /que rien ne viendrait prendre/);
});

/* ── Une demande en vol ───────────────────────────────────────────────────── */

/**
 * **Un outil qui tourne ne se relance pas.** Deux clics sur la batterie, ce
 * sont quatre-vingts appels au modèle au lieu de quarante — et le second bilan
 * écraserait le premier, de sorte qu'on ne verrait même pas qu'on a payé deux
 * fois.
 */
test("une demande en vol éteint le bouton, et dit ce qui se passe", () => {
  for (const statut of EN_VOL) {
    const bouton = cequeLeBoutonDit("derive", [uneDemande({ statut })]);
    assert.equal(bouton.peut, false, `${statut} laisse relancer`);
    assert.ok(bouton.pourquoi.length > 20, `${statut} n'explique rien`);
  }

  // Et une demande d'un **autre** outil ne bloque pas celui-ci : ils ne
  // mesurent pas la même chose.
  assert.equal(
    cequeLeBoutonDit("derive", [uneDemande({ outil: "invariants" })]).peut, true);
});

test("une demande terminée laisse repartir l'outil", () => {
  const finie = [uneDemande({ statut: OU_EN_EST_LA_MESURE.FINI })];
  assert.equal(laDemandeEnVol(finie, "derive"), null);
  assert.equal(cequeLeBoutonDit("derive", finie).peut, true);
});

test("la plus récente demande d'un outil se retrouve, quel que soit son état", () => {
  const toutes = [
    uneDemande({ id: "d-2", statut: OU_EN_EST_LA_MESURE.ECHEC }),
    uneDemande({ id: "d-1", statut: OU_EN_EST_LA_MESURE.FINI })
  ];
  assert.equal(laDerniereDemande(toutes, "derive").id, "d-2");
  assert.equal(laDerniereDemande(toutes, "perturbations"), null);
  assert.equal(laDerniereDemande(null, "derive"), null);
});

/* ── Ce que l'écran dit d'une demande ─────────────────────────────────────── */

/**
 * **Une demande terminée ne se dit pas**, et c'est voulu : son résultat est la
 * carte elle-même, qui porte le bilan et sa date. Répéter « terminée » au-dessus
 * d'un bilan qu'on lit n'apprend rien.
 */
test("une demande terminée ne redit rien au-dessus de son bilan", () => {
  assert.equal(ceQueLaDemandeDit(uneDemande({ statut: OU_EN_EST_LA_MESURE.FINI })), "");
  assert.equal(ceQueLaDemandeDit(null), "");
  assert.equal(ceQueLaDemandeDit(uneDemande({ statut: "un_statut_inconnu" })), "");
});

/**
 * **Un échec se dit, avec son motif.** C'est la seule chose qui explique
 * pourquoi la carte n'a pas bougé : sans lui, on relance (règle 5).
 */
test("un échec porte son motif", () => {
  const dit = ceQueLaDemandeDit(uneDemande({
    statut: OU_EN_EST_LA_MESURE.ECHEC,
    arrete: "aucune analyse conservée n'est lisible"
  }));
  assert.match(dit, /Rien ne la reprendra sans un geste/);
  assert.match(dit, /aucune analyse conservée n'est lisible/);

  // Et un échec sans motif ne fabrique pas de phrase vide à la suite.
  const sans = ceQueLaDemandeDit(uneDemande({ statut: OU_EN_EST_LA_MESURE.ECHEC }));
  assert.ok(sans.length > 20);
  assert.ok(!sans.endsWith(" "));
});

test("ce qui tourne dit qu'on peut fermer la page", () => {
  const dit = ceQueLaDemandeDit(uneDemande({ statut: OU_EN_EST_LA_MESURE.EN_COURS }));
  assert.match(dit, /Vous pouvez fermer cette page/);
});

/* ── Ce que la page dit de la dépense ─────────────────────────────────────── */

/**
 * **Aucun des outils lançables ne coûte rien aujourd'hui**, et la phrase le dit
 * plutôt que d'annoncer une facture qui n'existe pas. Le jour où l'un d'eux
 * relira des documents, elle comptera les lectures — et cette épreuve le
 * vérifie sur les deux cas, pour qu'elle ne mente ni dans un sens ni dans
 * l'autre.
 */
test("la page compte les lectures que cliquer ici coûterait", () => {
  const dit = ceQueLesMesuresCoutent();

  // **Les deux outils qui relisent sont comptés, maintenant qu'ils se lancent.**
  // Taire leur facture serait la laisser découvrir après coup (fondamental 13).
  assert.match(dit, /2 mesures/);
  assert.match(dit, /14 lectures au total/,
    "le compte des lectures ne suit pas ce que les outils déclarent relire");
  assert.match(dit, /trois appels chacune/);

  // Et le compte vient des outils, pas d'un nombre écrit à la main.
  const attendu = Object.values(CE_QUE_LOUTIL_DEMANDE)
    .filter((ce) => ce.leServeurSert).reduce((somme, ce) => somme + ce.relit, 0);
  assert.match(dit, new RegExp(`${attendu} lectures`));
});

/* ── Les deux côtés disent la même chose ──────────────────────────────────── */

/**
 * **Ce que l'écran propose, et ce que le serveur sert.**
 *
 * La liste vit des deux côtés : `leServeurSert` ici, `SERVIS` dans la fonction
 * de bord. Un outil servi là-bas et éteint ici serait une mesure qu'on ne peut
 * pas demander ; l'inverse — un bouton qui pose une ligne qu'aucune fonction ne
 * vient prendre — laisserait la console sur « en cours » pour toujours
 * (règle 10, règle 12).
 *
 * Aucun rendu ne peut le montrer : les deux listes sont dans deux dépôts de
 * code que rien ne fait se rencontrer. On lit donc le source de la fonction de
 * bord, ce qu'on ne s'autorise que pour ce genre de défaut.
 */
test("les outils que le serveur sert sont ceux que l'écran propose", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(new URL(
    "../../../../supabase/functions/mesurer-la-justesse/index.ts", import.meta.url)), "utf8");

  const declare = source.match(/const SERVIS = \[([^\]]*)\]/);
  assert.ok(declare, "la liste des outils servis n'est plus reconnaissable");

  // `MESURE.DERIVE` → `derive` : les clés de la base, qui sont aussi les nôtres.
  const servis = [...declare[1].matchAll(/MESURE\.([A-Z_]+)/g)]
    .map((un) => un[1].toLowerCase()).sort();

  const proposes = Object.entries(CE_QUE_LOUTIL_DEMANDE)
    .filter(([, ce]) => ce.leServeurSert).map(([cle]) => cle).sort();

  assert.deepEqual(servis, proposes,
    "l'écran et le serveur ne s'accordent pas sur ce qui se lance depuis la console");
});
