/**
 * Repris du projet, et modifiable.
 *
 * ## Le défaut
 *
 * Le sélecteur de zone **éclairait** les champs sans les remplir : on lisait
 * « du projet : alu » sous un champ vide, et l'on ne pouvait pas partir de
 * cette valeur pour la corriger d'un caractère — il fallait la retaper, en la
 * recopiant de la ligne du dessous.
 *
 * Poser la valeur dans le champ sans rien dire aurait fait l'inverse : elle
 * serait devenue indiscernable d'une réponse, et l'écran n'aurait plus dit d'où
 * elle vient (règle 5). Il fallait un **troisième** état.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { ETAT_DU_CHAMP, etatDuChamp, champsDuBrouillon, valeursDuLancement } from "./formulaire-du-brouillon.js";
import { renderUnChamp, renderFormulaire } from "../views/studio/dev/ecrire-en-mdall.js";
import { lancerLeBrouillon } from "./bac-dessai.js";

const zone = (label, cle, quoi, id) => ({
  id, subject_key: `zone:${cle}`, status: "assumed", superseded_by: null, zones: null,
  kind: "assertion", statement: `${label} : ${quoi}`,
  payload: { subject: label, value: quoi, zoneDefinition: true, zoneKey: cle }
});

const valeur = (sujet, dite, ou, id) => ({
  id, subject_key: `${sujet}@${ou}`, status: "assumed", superseded_by: null,
  zones: [ou], kind: "assertion", statement: `${sujet} : ${dite}`,
  payload: { subject: sujet, value: dite, zones: [ou] }
});

const MEMOIRE = [
  zone("Bâtiment A", "batiment-a", "Le corps principal.", "z-a"),
  valeur("Nature des volets", "alu", "batiment-a", "v-a")
];

const FICHIERS = [{ nom: "essai.ref", contenu: `fonction Couleur des volets(zones, Nature des volets) {
   si (Nature des volets = "bois")
   alors ("violet");
   sinon ("blanc");
}
` }];

const leChamp = () => champsDuBrouillon(FICHIERS, { memoire: MEMOIRE, zone: "batiment-a" })[0];

/* ── La règle : trois états, et un seul décide ───────────────────────────── */

test("les trois états d'un champ", () => {
  assert.equal(etatDuChamp({ duProjet: "alu" }, "").etat, ETAT_DU_CHAMP.DU_PROJET);
  assert.equal(etatDuChamp({ duProjet: "alu" }, "bois").etat, ETAT_DU_CHAMP.REPONDU);
  assert.equal(etatDuChamp({ duProjet: "" }, "").etat, ETAT_DU_CHAMP.VIDE);

  // **La valeur à montrer vient de l'état**, et non de deux endroits : le champ
  // porte ce que l'essai lira, quel que soit d'où ça vient.
  assert.equal(etatDuChamp({ duProjet: "alu" }, "").valeur, "alu");
  assert.equal(etatDuChamp({ duProjet: "alu" }, "bois").valeur, "bois");
  assert.equal(etatDuChamp({ duProjet: "" }, "").valeur, "");
});

test("on ne propose de revenir que s'il y a quelque chose à défaire", () => {
  /**
   * Taper exactement ce que le projet dit n'est pas le corriger. Offrir d'y
   * « revenir » serait proposer de défaire ce qui n'a pas été fait.
   */
  assert.equal(etatDuChamp({ duProjet: "alu" }, "bois").differe, true);
  assert.equal(etatDuChamp({ duProjet: "alu" }, "alu").differe, false);
  assert.equal(etatDuChamp({ duProjet: "" }, "bois").differe, false,
    "sans valeur au projet, il n'y a nulle part où revenir");
});

test("un blanc n'est pas une réponse", () => {
  // Vider un champ, c'est reprendre le projet — et c'est déjà ce que le
  // lancement fait des réponses vides. Les deux doivent dire pareil (règle 4).
  assert.equal(etatDuChamp({ duProjet: "alu" }, "   ").etat, ETAT_DU_CHAMP.DU_PROJET);
  assert.equal(etatDuChamp(null, "").etat, ETAT_DU_CHAMP.VIDE);
});

/* ── Ce que l'écran en fait ──────────────────────────────────────────────── */

test("repris : la valeur est dans le champ, et le champ dit qu'elle n'est pas de nous", () => {
  const dessine = renderUnChamp(leChamp(), {});

  assert.match(dessine, /value="alu"/, "on doit pouvoir partir d'elle");
  assert.match(dessine, /est-du-projet/, "et voir qu'elle n'est pas de nous");
  assert.match(dessine, /du projet<\/span>/);
  // La valeur est déjà sous les yeux : la répéter dans la note serait du bruit.
  assert.doesNotMatch(dessine, /du projet : alu/);
  assert.doesNotMatch(dessine, /revenir/);
});

test("répondu : la réponse est dans le champ, et le projet se rappelle", () => {
  const dessine = renderUnChamp(leChamp(), { "Nature des volets": "bois" });

  assert.match(dessine, /value="bois"/);
  assert.doesNotMatch(dessine, /est-du-projet/, "ce n'est plus du projet");
  // Ce que le projet disait devient la seule chose qu'on ne peut plus lire
  // nulle part une fois qu'on a tapé par-dessus.
  assert.match(dessine, /du projet : alu/);
  assert.match(dessine, /data-bac-retour="Nature des volets"/);
});

test("répondu à l'identique : rien à défaire, rien à dire", () => {
  const dessine = renderUnChamp(leChamp(), { "Nature des volets": "alu" });

  assert.doesNotMatch(dessine, /est-du-projet/);
  assert.doesNotMatch(dessine, /revenir/);
});

test("vide : le champ est nu, et il n'y a rien à dire", () => {
  const dessine = renderUnChamp(
    { nom: "Portée", cle: "portee", saisie: "mesure", choix: [], unite: "m", aide: "", declare: true, duProjet: "" },
    {});

  assert.match(dessine, /value=""/);
  assert.doesNotMatch(dessine, /est-du-projet/);

  /**
   * **La note a sa place même vide**, et elle est cachée : un emplacement qui
   * existe déjà se remplit en une ligne à la frappe, là où l'insérer ou le
   * retirer selon les cas ferait trois chemins pour une question.
   */
  assert.match(dessine, /class="bac-formulaire__projet" hidden><\/span>/);
});

test("une liste et un oui/non se reprennent aussi", () => {
  /**
   * **Les trois formes de saisie, et la même règle.** Une seule qui l'ignore
   * ferait un champ qu'on croit avoir rempli — celui qu'on ne relit pas.
   */
  const liste = renderUnChamp({ nom: "Matière", cle: "matiere", saisie: "liste",
    choix: ["bois", "alu"], unite: "", aide: "", declare: true, duProjet: "alu" }, {});
  assert.match(liste, /option value="alu" selected/);
  assert.match(liste, /est-du-projet/);

  const logique = renderUnChamp({ nom: "Sprinklé", cle: "sprinkle", saisie: "logique",
    choix: [], unite: "", aide: "", declare: true, duProjet: "oui" }, {});
  assert.match(logique, /bac-formulaire__logique est-du-projet/);
  assert.match(logique, /aria-pressed="true"[^>]*>oui/);
});

test("le formulaire entier passe par le même dessin", () => {
  // Un second dessin écrit pour le retour aurait fini par ne plus ressembler au
  // premier (règle 4) — celui qu'on ne regarde pas est toujours celui qui a
  // raison le jour où l'on cherche.
  const champ = leChamp();
  assert.equal(renderFormulaire([champ], {}).includes(renderUnChamp(champ, {}).trim()), true);
});

/* ── Et ce que cela ne change pas ────────────────────────────────────────── */

test("voir la valeur dans le champ ne vaut pas l'avoir tapée", () => {
  /**
   * **C'est le piège du troisième état**, et il est silencieux : si le champ
   * rempli comptait pour une réponse, le sélecteur de zone changerait de zone
   * sans changer de valeurs — on garderait le bâtiment A en croyant lire le B.
   *
   * Le lancement ne reçoit que les **réponses**, et elles restent vides.
   */
  assert.equal(etatDuChamp(leChamp(), "").etat, ETAT_DU_CHAMP.DU_PROJET);

  const sansReponse = valeursDuLancement(FICHIERS, {}, { memoire: MEMOIRE, zone: "batiment-a" });
  assert.equal(sansReponse.get("nature des volets"), "alu", "l'essai lit le projet");

  // Et le même brouillon, hors de ce bâtiment, ne lit plus rien : la valeur
  // n'avait pas été « répondue » au passage.
  assert.equal(valeursDuLancement(FICHIERS, {}, { memoire: MEMOIRE, zone: "" })
    .get("nature des volets"), undefined);

  assert.equal(lancerLeBrouillon(FICHIERS, {}, { memoire: MEMOIRE, zone: "batiment-a" })
    .find((une) => une.sujet === "Couleur des volets")?.valeur, "blanc");
  assert.equal(lancerLeBrouillon(FICHIERS, {}, { memoire: MEMOIRE, zone: "" })
    .find((une) => une.sujet === "Couleur des volets")?.valeur, "");
});
