import assert from "node:assert/strict";
import test from "node:test";

import {
  DOSSIER_DES_MAILS, EXTENSION_DUN_MAIL, LE_CADENAS, NATURE_DUN_MAIL,
  estLeDossierDesMails, laMarqueDuDossier, leNomDuMailDepose, phraseDuDossierDesMails
} from "./le-dossier-des-mails.js";

const message = (quand, objetNu, decalage = 60) => ({ quand, objetNu, decalage });

// ── Le dossier ─────────────────────────────────────────────────────────────

test("le dossier des mails se reconnaît sans égard à la casse", () => {
  assert.equal(estLeDossierDesMails(DOSSIER_DES_MAILS), true);
  assert.equal(estLeDossierDesMails("mails"), true);
  assert.equal(estLeDossierDesMails(" MAILS "), true);
  assert.equal(estLeDossierDesMails("Documents"), false);
  assert.equal(estLeDossierDesMails(""), false);
});

// ── Le cadenas ─────────────────────────────────────────────────────────────

test("un dossier privé porte le cadenas", () => {
  assert.deepEqual(laMarqueDuDossier({ name: "Mails", prive: true }), LE_CADENAS);
});

test("un dossier ordinaire ne porte rien", () => {
  assert.equal(laMarqueDuDossier({ name: "Documents", prive: false }), null);
  assert.equal(laMarqueDuDossier({ name: "Documents" }), null);
  assert.equal(laMarqueDuDossier(null), null);
});

test("le nom ne suffit pas à rendre un dossier privé", () => {
  // Un dossier peut s'appeler « Mails » sans l'être — et un autre pourra être
  // privé sans s'appeler ainsi. C'est la colonne de la base qui fait foi,
  // puisque c'est elle qui tient la garde.
  assert.equal(laMarqueDuDossier({ name: "Mails", prive: false }), null);
  assert.deepEqual(laMarqueDuDossier({ name: "Correspondance", prive: true }), LE_CADENAS);
});

test("la marque rendue ne partage pas son objet avec le module", () => {
  // Un écran qui écrirait dedans changerait le cadenas de tous les autres.
  const marque = laMarqueDuDossier({ prive: true });
  marque.titre = "n'importe quoi";
  assert.equal(LE_CADENAS.titre, "Dossier privé : vous seul y avez accès");
});

// ── Le nom d'un mail rangé ─────────────────────────────────────────────────

test("un mail se range sous sa date et son objet", () => {
  assert.equal(
    leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Étanchéité toiture")),
    "2026-03-12 09h14 — Étanchéité toiture.eml"
  );
});

test("l'heure du nom est celle du fuseau d'envoi", () => {
  // Minuit et demi à Paris est la veille à Greenwich : le dossier se
  // rangerait un jour trop tôt.
  assert.equal(
    leNomDuMailDepose(message("2026-03-11T23:30:00.000Z", "Lot 3")).slice(0, 16),
    "2026-03-12 00h30"
  );
});

test("un mail sans date ne se voit pas attribuer celle du jour", () => {
  const nom = leNomDuMailDepose({ quand: "", objetNu: "Lot 3" });
  assert.equal(nom, "sans date — Lot 3.eml");
  assert.equal(/\d{4}-\d{2}-\d{2}/.test(nom), false);
});

test("un mail sans objet le dit", () => {
  assert.equal(leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "")), "2026-03-12 09h14 — sans objet.eml");
});

test("l'objet nu sert, pas l'objet avec ses Re: empilés", () => {
  // Quinze fichiers nommés « Re: Re: Étanchéité toiture » ne se distinguent
  // que par leur date, et le Re: n'apporte rien au nom.
  const nom = leNomDuMailDepose({
    quand: "2026-03-12T08:14:00.000Z", decalage: 60,
    objet: "Re: TR: Étanchéité toiture", objetNu: "Étanchéité toiture"
  });
  assert.equal(nom, "2026-03-12 09h14 — Étanchéité toiture.eml");
});

test("un objet qui ferait un chemin ne fait pas un chemin", () => {
  const nom = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3 / toiture : reprise"));
  assert.equal(nom.includes("/"), false);
  assert.equal(nom, "2026-03-12 09h14 — Lot 3 toiture reprise.eml");
});

test("un objet interminable se coupe", () => {
  const nom = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "toiture ".repeat(40)));
  assert.ok(nom.length < 100, nom);
  assert.ok(nom.endsWith(EXTENSION_DUN_MAIL));
});

test("deux mails de la même minute et du même objet ne s'écrasent pas", () => {
  const premier = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"));
  const second = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"), { dejaLa: [premier] });
  const troisieme = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"), { dejaLa: [premier, second] });
  assert.equal(second, "2026-03-12 09h14 — Lot 3 (2).eml");
  assert.equal(troisieme, "2026-03-12 09h14 — Lot 3 (3).eml");
});

test("l'homonyme se reconnaît sans égard à la casse", () => {
  const nom = leNomDuMailDepose(message("2026-03-12T08:14:00.000Z", "Lot 3"), {
    dejaLa: ["2026-03-12 09H14 — LOT 3.EML"]
  });
  assert.equal(nom, "2026-03-12 09h14 — Lot 3 (2).eml");
});

test("un mail se range toujours en .eml, et se distingue d'un compte rendu", () => {
  assert.ok(leNomDuMailDepose(message("", "Lot 3")).endsWith(".eml"));
  assert.equal(EXTENSION_DUN_MAIL, ".eml");
  assert.notEqual(NATURE_DUN_MAIL, "source_texte");
});

// ── Ce qu'on en dit ────────────────────────────────────────────────────────

test("la phrase du dossier nomme le dossier et dit pourquoi il est à part", () => {
  const phrase = phraseDuDossierDesMails();
  assert.ok(phrase.includes(DOSSIER_DES_MAILS));
  assert.ok(phrase.includes("pas partagé"));
});
