/**
 * **« Aucune trace » ne doit jamais se lire « tout va bien ».**
 *
 * C'est la seule ligne qui compte vraiment dans ce module, et elle ne se vérifie
 * qu'en l'écrivant à l'envers : ces épreuves rendent `null` partout et exigent
 * « on ne sait pas ».
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUON_NE_SAIT_PAS_DICI, LA_CAUSE, LA_CAUSE_DU_MOTIF, LES_SYSTEMES,
  LE_SYSTEME, LE_TON_DU_VERDICT, SANS_NOUVELLES_APRES_H, VERDICT, VERDICTS_DITS,
  ceQueLaSanteDit, depuisCombienDHeures, laPreuveDite, laSanteDesSystemes,
  lesRefusDe, lesRefusParCause, leVerdictDe
} from "./la-sante-des-systemes.js";
import { MOTIF_DU_REFUS } from "./journal-des-refus.js";

const MAINTENANT = Date.parse("2026-10-04T12:00:00Z");
const ilYa = (heures) => new Date(MAINTENANT - heures * 3600000).toISOString();

/** Une installation qui tourne : tout a répondu dans l'heure, aucun refus. */
const QUI_TOURNE = {
  regardeLe: ilYa(0),
  dernierDocument: ilYa(1),
  dernierAppelModele: ilYa(2),
  dernierePriseDeFile: ilYa(0.5),
  filesBloquees: 0,
  filesEnAttente: 0,
  refusRecents: []
};

/**
 * **Le cas qui décide de tout : une installation neuve.**
 *
 * Aucune trace de rien. Un tableau qui compte les pannes en trouverait zéro et
 * afficherait du vert — alors que la clé peut être révoquée, la fonction non
 * déployée, le casier inexistant. On ne sait pas, et c'est ce qu'il faut dire.
 */
test("aucune trace ne se lit pas « tout va bien »", () => {
  const rien = { regardeLe: null, dernierDocument: null, dernierAppelModele: null,
    dernierePriseDeFile: null, filesBloquees: 0, refusRecents: [] };

  for (const un of laSanteDesSystemes(rien, MAINTENANT)) {
    assert.equal(un.verdict, VERDICT.INCONNU,
      `${un.cle} sans trace rend « ${un.verdict} » au lieu de « on ne sait pas »`);
    assert.notEqual(un.verdict, VERDICT.REPOND);
  }

  const phrase = ceQueLaSanteDit(rien, MAINTENANT);
  assert.match(phrase, /on ne sait rien/i, phrase);
  assert.doesNotMatch(phrase, /tout va bien(?!\s*»)/i,
    `la phrase d'ensemble rassure sur une absence : « ${phrase} »`);
});

/** Et une lecture entièrement absente ne fait pas tomber le module. */
test("une lecture manquante rend quatre « on ne sait pas »", () => {
  for (const lecture of [null, undefined, {}]) {
    const lignes = laSanteDesSystemes(lecture, MAINTENANT);
    assert.equal(lignes.length, 4, "un système a disparu du tableau");
    assert.ok(lignes.every((un) => un.verdict === VERDICT.INCONNU));
  }
});

/** Quand tout a répondu, le tableau le dit — sans quoi il ne servirait à rien. */
test("quatre traces récentes et aucun refus donnent quatre « répond »", () => {
  const lignes = laSanteDesSystemes(QUI_TOURNE, MAINTENANT);
  assert.deepEqual(lignes.map((un) => un.verdict), Array(4).fill(VERDICT.REPOND));
  assert.match(ceQueLaSanteDit(QUI_TOURNE, MAINTENANT), /ont répondu récemment/);
});

/**
 * **Les quatre lignes sortent toujours.**
 *
 * Un système sans trace ne quitte pas la liste : un tableau de trois lignes se
 * lit « il y a trois systèmes », et le quatrième deviendrait un angle mort.
 */
test("un système sans trace reste dans le tableau", () => {
  const sansModele = { ...QUI_TOURNE, dernierAppelModele: null };
  const lignes = laSanteDesSystemes(sansModele, MAINTENANT);

  assert.equal(lignes.length, 4);
  const modele = lignes.find((un) => un.cle === LE_SYSTEME.MODELE);
  assert.equal(modele.verdict, VERDICT.INCONNU);
  assert.equal(modele.quand, null);
  assert.equal(modele.heures, null, "une absence de trace rend un âge");
});

/**
 * **La base se prouve par la lecture elle-même.**
 *
 * Si le tableau s'affiche, la base a répondu. C'est la trace la plus solide du
 * lot, et aller en chercher une autre serait une sonde pour savoir ce qu'on sait.
 */
test("la base répond parce que la lecture est revenue", () => {
  const base = laSanteDesSystemes(QUI_TOURNE, MAINTENANT)
    .find((un) => un.cle === LE_SYSTEME.BASE);
  assert.equal(base.verdict, VERDICT.REPOND);

  // Et sans `regardeLe`, on ne prétend pas : la lecture ne dit pas son heure.
  assert.equal(leVerdictDe(LE_SYSTEME.BASE, { ...QUI_TOURNE, regardeLe: null }, MAINTENANT),
    VERDICT.INCONNU);
});

/**
 * **« Sans nouvelles » n'est pas « en panne ».**
 *
 * Mdall ne sait pas distinguer « personne ne s'en est servi » de « il ne répond
 * plus ». Rendre `BLOQUE` sur l'âge d'une trace affirmerait une panne qu'on n'a
 * pas constatée — et un tableau qui crie faux est un tableau qu'on n'ouvre plus.
 */
test("une trace vieille donne « sans nouvelles », jamais « bloqué »", () => {
  const vieux = {
    ...QUI_TOURNE,
    dernierAppelModele: ilYa(SANS_NOUVELLES_APRES_H[LE_SYSTEME.MODELE] + 1)
  };
  const modele = laSanteDesSystemes(vieux, MAINTENANT)
    .find((un) => un.cle === LE_SYSTEME.MODELE);

  assert.equal(modele.verdict, VERDICT.SANS_NOUVELLES);
  assert.notEqual(modele.verdict, VERDICT.BLOQUE);
  assert.notEqual(modele.verdict, VERDICT.INCONNU,
    "une trace vieille se confond avec une absence de trace");

  // Une heure de moins, et c'est encore une nouvelle.
  const juste = {
    ...QUI_TOURNE,
    dernierAppelModele: ilYa(SANS_NOUVELLES_APRES_H[LE_SYSTEME.MODELE] - 1)
  };
  assert.equal(leVerdictDe(LE_SYSTEME.MODELE, juste, MAINTENANT), VERDICT.REPOND);
});

/**
 * **Chaque système a son rythme, et c'est pour cela qu'il a son seuil.**
 *
 * La base répond à chaque écran ; un appel de modèle peut n'avoir pas eu lieu
 * depuis trois jours sans que rien ne soit cassé. Un seuil unique aurait rendu
 * l'un bavard et l'autre aveugle.
 */
test("le seuil de la base est bien plus court que celui du modèle", () => {
  assert.ok(SANS_NOUVELLES_APRES_H[LE_SYSTEME.BASE]
    < SANS_NOUVELLES_APRES_H[LE_SYSTEME.MODELE],
    "la base et le modèle ont le même seuil : l'un des deux est mal réglé");

  // Deux heures sans lecture de base : on n'a plus de nouvelles d'elle.
  const vieille = { ...QUI_TOURNE, regardeLe: ilYa(2) };
  assert.equal(leVerdictDe(LE_SYSTEME.BASE, vieille, MAINTENANT), VERDICT.SANS_NOUVELLES);
  // Deux heures sans appel de modèle : rien à signaler.
  assert.equal(leVerdictDe(LE_SYSTEME.MODELE, QUI_TOURNE, MAINTENANT), VERDICT.REPOND);
});

/**
 * **Une file prise et jamais refermée est le seul verdict qui affirme.**
 *
 * Il ne vient pas d'une absence mais d'une preuve positive : le serveur a
 * commencé quelque chose qu'il n'a pas fini. Il passe devant tout le reste, et
 * même devant « aucune trace » — qui n'aurait rien dit de plus utile.
 */
test("une file bloquée l'emporte sur une trace récente et sur une absence", () => {
  const bloque = { ...QUI_TOURNE, filesBloquees: 1 };
  assert.equal(leVerdictDe(LE_SYSTEME.SERVEUR, bloque, MAINTENANT), VERDICT.BLOQUE);

  const bloqueEtMuet = { ...bloque, dernierePriseDeFile: null };
  assert.equal(leVerdictDe(LE_SYSTEME.SERVEUR, bloqueEtMuet, MAINTENANT), VERDICT.BLOQUE,
    "une file bloquée sans trace de prise se lit « on ne sait pas »");

  const phrase = ceQueLaSanteDit(bloque, MAINTENANT);
  assert.match(phrase, /ne passe plus/, phrase);

  // Et le blocage ne contamine pas les autres systèmes.
  const lignes = laSanteDesSystemes(bloque, MAINTENANT);
  assert.equal(lignes.filter((un) => un.verdict === VERDICT.BLOQUE).length, 1,
    "un blocage de file tache les autres systèmes");
});

/**
 * **Un refus récent ne rend pas le système muet : il le fait se plaindre.**
 *
 * Les deux appellent des gestes opposés — l'un « va voir ce qui casse », l'autre
 * « rien à signaler ». Les confondre fait chercher une panne là où il n'y a que
 * du silence, ou l'inverse.
 */
test("un refus récent sur un système qui répond le fait se plaindre", () => {
  const plaintif = {
    ...QUI_TOURNE,
    refusRecents: [{ fonction: "extract-avis", motif: MOTIF_DU_REFUS.QUOTA, combien: 3,
      dernier: ilYa(0.25) }]
  };

  const modele = laSanteDesSystemes(plaintif, MAINTENANT)
    .find((un) => un.cle === LE_SYSTEME.MODELE);
  assert.equal(modele.verdict, VERDICT.SE_PLAINT);
  assert.equal(modele.refus.length, 1);

  // Le stockage n'a rien à voir avec un quota de modèle.
  const stockage = laSanteDesSystemes(plaintif, MAINTENANT)
    .find((un) => un.cle === LE_SYSTEME.STOCKAGE);
  assert.equal(stockage.verdict, VERDICT.REPOND,
    "un quota de modèle fait se plaindre le stockage");
});

/**
 * **Un refus se range par la cause de son motif, pas par le nom de la fonction.**
 *
 * « quota » dit le fournisseur quelle que soit la fonction qui l'a essuyé ;
 * « mal-forme » dit Mdall quel que soit le fournisseur. Trier par nom de fonction
 * aurait demandé une table des fonctions, qui aurait vieilli en silence à chaque
 * fonction nouvelle.
 */
test("le motif dit de quel côté tombe le refus, pas la fonction", () => {
  const varie = {
    ...QUI_TOURNE,
    refusRecents: [
      { fonction: "lire-un-rapport", motif: MOTIF_DU_REFUS.QUOTA, combien: 2, dernier: ilYa(1) },
      { fonction: "extract-avis", motif: MOTIF_DU_REFUS.MAL_FORME, combien: 1, dernier: ilYa(2) },
      { fonction: "verser-les-mails", motif: MOTIF_DU_REFUS.INJOIGNABLE, combien: 5, dernier: ilYa(3) }
    ]
  };

  // Le quota va au modèle, quelle que soit la fonction.
  const auModele = lesRefusDe(LE_SYSTEME.MODELE, varie);
  assert.deepEqual(auModele.map((un) => un.motif), [MOTIF_DU_REFUS.QUOTA]);

  // Le mal-formé et l'injoignable vont au serveur et au portail.
  const auServeur = lesRefusDe(LE_SYSTEME.SERVEUR, varie).map((un) => un.motif).sort();
  assert.deepEqual(auServeur, [MOTIF_DU_REFUS.INJOIGNABLE, MOTIF_DU_REFUS.MAL_FORME].sort());

  // Le stockage et la base ne reçoivent aucun refus : aucun motif ne les nomme.
  assert.deepEqual(lesRefusDe(LE_SYSTEME.STOCKAGE, varie), []);
  assert.deepEqual(lesRefusDe(LE_SYSTEME.BASE, varie), []);
});

/** Les huit genres de panne sont tous rangés : aucun ne tombe nulle part. */
test("les huit genres de panne ont tous une cause", () => {
  for (const motif of Object.values(MOTIF_DU_REFUS)) {
    assert.ok(Object.values(LA_CAUSE).includes(LA_CAUSE_DU_MOTIF[motif]),
      `« ${motif} » ne tombe d'aucun côté : il ne se verra nulle part`);
  }
});

/**
 * **Groupés par cause, et chacun avec son remède.**
 *
 * Un journal qui ne dit que le mal est un journal qu'on cesse d'ouvrir. Les
 * remèdes viennent de `journal-des-refus.js` : deux listes auraient fini par
 * conseiller deux gestes différents pour la même panne.
 */
test("les refus se groupent par cause, du plus nombreux au moins", () => {
  /**
   * **Le petit groupe arrive en premier dans la liste reçue.**
   *
   * C'est ce qui rend le classement visible : rangés dans l'ordre où ils entrent,
   * les deux groupes sortiraient déjà bien placés par hasard, et l'épreuve
   * passerait sans le classement (règle 4).
   */
  const varie = {
    refusRecents: [
      { fonction: "c", motif: MOTIF_DU_REFUS.MAL_FORME, combien: 1, dernier: ilYa(3) },
      { fonction: "a", motif: MOTIF_DU_REFUS.QUOTA, combien: 2, dernier: ilYa(1) },
      { fonction: "b", motif: MOTIF_DU_REFUS.SURCHARGE, combien: 7, dernier: ilYa(2) }
    ]
  };

  const groupes = lesRefusParCause(varie);
  assert.deepEqual(groupes.map((un) => un.cause), [LA_CAUSE.LE_MODELE, LA_CAUSE.NOUS]);
  // Deux quotas et sept surcharges : neuf du côté du fournisseur.
  assert.equal(groupes[0].combien, 9);
  // Et dans le groupe, le plus nombreux d'abord.
  assert.deepEqual(groupes[0].lignes.map((un) => un.motif),
    [MOTIF_DU_REFUS.SURCHARGE, MOTIF_DU_REFUS.QUOTA]);
  assert.ok(groupes[0].lignes.every((un) => un.remede),
    "un refus sans remède : la console dira le mal sans dire quoi faire");
});

/**
 * **Un motif inconnu s'affiche brut plutôt que de faire un trou.**
 *
 * La base ne laisse passer que huit motifs, donc cela ne devrait pas arriver. Si
 * un neuvième était ajouté en base avant de l'être ici, une ligne vide se lirait
 * « rien » là où il y a eu une panne (règle 5).
 */
test("un motif que le module ne connaît pas s'affiche quand même", () => {
  const groupes = lesRefusParCause({
    refusRecents: [{ fonction: "x", motif: "venu-dailleurs", combien: 4, dernier: ilYa(1) }]
  });
  assert.equal(groupes.length, 1);
  assert.equal(groupes[0].lignes[0].dit, "venu-dailleurs");
  assert.equal(groupes[0].combien, 4);
});

/** Un refus sans nombre compte pour un : zéro refus se lirait « aucun ». */
test("un refus sans nombre compte pour un", () => {
  const groupes = lesRefusParCause({
    refusRecents: [{ fonction: "x", motif: MOTIF_DU_REFUS.QUOTA, combien: null }]
  });
  assert.equal(groupes[0].combien, 1, "un refus sans nombre disparaît du compte");
});

/**
 * **Ce qu'on ne sait pas d'ici est nommé, et chacun dit pourquoi.**
 *
 * Un tableau à quatre lignes qui ne dit pas qu'il y a une cinquième chose se lit
 * comme un tableau complet. Et GitHub en fait partie, parce que c'est la question
 * qui a été posée : la réponse n'est pas « vert », c'est « on ne le demande pas ».
 */
test("ce qu'on ne sait pas d'ici nomme GitHub, le quota et le trafic", () => {
  const quoi = CE_QUON_NE_SAIT_PAS_DICI.map((un) => un.quoi).join(" | ");
  assert.match(quoi, /GitHub/);
  assert.match(quoi, /quota/i);
  assert.match(quoi, /trafic/i);

  for (const un of CE_QUON_NE_SAIT_PAS_DICI) {
    assert.ok(un.pourquoi.length > 40,
      `« ${un.quoi} » est nommé sans raison : on le remettra au tour prochain`);
  }

  // Et aucun de ces quatre n'est un des systèmes du tableau : un système qui
  // serait dans les deux listes dirait à la fois qu'on sait et qu'on ne sait pas.
  const systemes = LES_SYSTEMES.map((un) => un.nom.toLowerCase());
  for (const un of CE_QUON_NE_SAIT_PAS_DICI) {
    assert.ok(!systemes.includes(un.quoi.toLowerCase()),
      `« ${un.quoi} » est à la fois mesuré et déclaré inconnaissable`);
  }
});

/** Chaque système dit ce que sa trace prouve : c'est ce qui évite de surlire. */
test("chaque système dit ce que sa trace prouve", () => {
  assert.equal(LES_SYSTEMES.length, 4);
  for (const un of LES_SYSTEMES) {
    assert.ok(un.nom && un.quoi && un.icone);
    assert.ok(un.prouve.length > 30,
      `« ${un.nom} » ne dit pas ce que sa trace prouve : on la surlira`);
    assert.ok(SANS_NOUVELLES_APRES_H[un.cle] > 0,
      `« ${un.nom} » n'a pas de seuil : son âge ne voudra rien dire`);
  }
});

/** Un âge se compte depuis la base, pas depuis l'horloge du navigateur. */
test("l'âge d'une trace se compte, et une absence n'a pas d'âge", () => {
  assert.equal(depuisCombienDHeures(ilYa(3), MAINTENANT), 3);
  assert.equal(depuisCombienDHeures(null, MAINTENANT), null);
  assert.equal(depuisCombienDHeures("pas une date", MAINTENANT), null,
    "une date illisible rend un âge : il sera faux et on le croira");
});

/**
 * **Une preuve ne s'énonce pas au passé sans date.**
 *
 * Le banc du navigateur a montré « Le modèle — on ne sait pas … aucune trace •
 * un appel a abouti » : l'écran affirmait l'abouti d'un appel qui n'avait jamais
 * eu lieu, juste à côté de l'aveu qu'il n'y en avait aucune trace. C'est
 * exactement le mensonge que ce module existe pour empêcher, et il était passé
 * par la grammaire (règle 5).
 */
test("sans trace, la preuve se met au conditionnel", () => {
  const rien = { regardeLe: null, dernierDocument: null, dernierAppelModele: null,
    dernierePriseDeFile: null, filesBloquees: 0, refusRecents: [] };

  for (const un of laSanteDesSystemes(rien, MAINTENANT)) {
    const dite = laPreuveDite(un);
    assert.match(dite, /^une trace dirait : /,
      `« ${un.nom} » annonce une preuve sans trace : « ${dite} »`);
  }

  // Avec une trace, elle s'énonce telle quelle, sans la tournure.
  for (const un of laSanteDesSystemes(QUI_TOURNE, MAINTENANT)) {
    assert.equal(laPreuveDite(un), un.prouve);
    assert.doesNotMatch(laPreuveDite(un), /dirait/);
  }

  assert.equal(laPreuveDite(null), "");
  assert.equal(laPreuveDite({ prouve: "", quand: new Date() }), "");
});

/**
 * **La pastille est celle des Actions, et deux verdicts n'en ont aucune.**
 *
 * `workflow-status-pill` est la classe de partout. Une échelle de couleurs
 * dessinée pour la console aurait divergé de celle des Actions au premier
 * réglage (règle 4).
 *
 * Et « on ne sait pas » comme « sans nouvelles » restent neutres : les peindre
 * en vert serait le mensonge que tout ce module empêche ; en rouge, ce serait
 * affirmer une panne qu'on n'a pas constatée.
 */
test("chaque verdict porte sa pastille, et l'absence n'est ni verte ni rouge", () => {
  for (const verdict of Object.values(VERDICT)) {
    const ton = LE_TON_DU_VERDICT[verdict];
    assert.ok(ton, `« ${verdict} » n'a pas de ton : sa pastille serait sans classe`);
    assert.ok(ton.icone, `« ${verdict} » n'a pas d'icône`);
    assert.ok(VERDICTS_DITS[verdict], `« ${verdict} » ne se dit pas`);
  }

  assert.equal(LE_TON_DU_VERDICT[VERDICT.INCONNU].pastille, "",
    "« on ne sait pas » est peint : il se lira comme un verdict");
  assert.equal(LE_TON_DU_VERDICT[VERDICT.SANS_NOUVELLES].pastille, "",
    "« sans nouvelles » est peint : il affirmera une panne qu'on n'a pas constatée");

  assert.equal(LE_TON_DU_VERDICT[VERDICT.REPOND].pastille, "workflow-status-pill--success");
  assert.equal(LE_TON_DU_VERDICT[VERDICT.BLOQUE].pastille, "workflow-status-pill--error");

  // Et chaque ligne du tableau porte le sien, sans que l'écran ait à le chercher.
  for (const un of laSanteDesSystemes(QUI_TOURNE, MAINTENANT)) {
    assert.equal(un.ton, LE_TON_DU_VERDICT[un.verdict]);
  }
});

/** Chaque icône de verdict existe dans le jeu : une absente dessine du vide. */
test("chaque icône de verdict existe dans le jeu", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const sprite = readFileSync(
    fileURLToPath(new URL("../../assets/icons.svg", import.meta.url)), "utf8"
  );

  for (const un of [...Object.values(LE_TON_DU_VERDICT), ...LES_SYSTEMES]) {
    assert.ok(sprite.includes(`<symbol id="${un.icone}"`),
      `« ${un.icone} » n'est pas dans le jeu d'icônes : la ligne dessinerait une case vide`);
  }
});
