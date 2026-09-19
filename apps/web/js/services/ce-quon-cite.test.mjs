import assert from "node:assert/strict";
import test from "node:test";

import {
  FORME_DE_LA_MARQUE, NATURE, ceQuonCite, chevronsDe, laMarque
} from "./ce-quon-cite.js";
import { TROU } from "./trous-dun-mail.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const corps = (...lignes) => lignes.join("\n");
const aBien = (lu, quoi) => lu.trous.some((trou) => trou.quoi === quoi);
const nus = (...lignes) => lignes.map(chevronsDe);
const plan = (lu) => lu.blocs.map((bloc) => `${bloc.profondeur}:${bloc.nature}`);

// ── Les chevrons ───────────────────────────────────────────────────────────

test("un chevron se compte, et l'espace qui le suit s'en va avec lui", () => {
  assert.deepEqual(chevronsDe("> La cote"), { chevrons: 1, reste: "La cote" });
  assert.deepEqual(chevronsDe(">> La cote"), { chevrons: 2, reste: "La cote" });
  assert.deepEqual(chevronsDe("> > La cote"), { chevrons: 2, reste: "La cote" });
});

test("une citation profonde ne part pas en escalier", () => {
  // L'espace après chaque chevron est celui de la messagerie, pas de l'auteur :
  // le garder décalerait le texte d'un cran par niveau.
  assert.equal(chevronsDe(">>>> La cote").reste, "La cote");
});

test("l'indentation de l'auteur reste", () => {
  assert.deepEqual(chevronsDe(">     La cote"), { chevrons: 1, reste: "    La cote" });
});

test("une ligne sans chevron n'en a aucun", () => {
  assert.deepEqual(chevronsDe("La cote est à 12,40."), { chevrons: 0, reste: "La cote est à 12,40." });
  assert.deepEqual(chevronsDe(""), { chevrons: 0, reste: "" });
});

// ── Les bandeaux reconnus ──────────────────────────────────────────────────

test("« a écrit : » ouvre une citation, et dit qui et quand", () => {
  const marque = laMarque(nus("Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :"), 0);
  assert.equal(marque.forme, FORME_DE_LA_MARQUE.A_ECRIT);
  assert.equal(marque.texteQui, "Ourdine Ferrand");
  assert.equal(marque.texteQuand, "12 mars 2026 à 09:14");
});

test("la forme anglaise se reconnaît aussi", () => {
  const marque = laMarque(nus("On Thu, Mar 12, 2026 at 9:14 AM, Ourdine Ferrand wrote:"), 0);
  assert.equal(marque.forme, FORME_DE_LA_MARQUE.A_ECRIT);
  assert.equal(marque.texteQui, "Ourdine Ferrand");
});

test("un bandeau coupé en deux par la messagerie se recolle", () => {
  // Forme très courante : la messagerie replie à la longueur de ligne, et
  // « écrit : » se retrouve seul en dessous.
  const marque = laMarque(nus(
    "Le 12 mars 2026 à 09:14, Ourdine Ferrand <o.ferrand@novaclim.example> a",
    "écrit :"
  ), 0);
  assert.equal(marque.forme, FORME_DE_LA_MARQUE.A_ECRIT);
  assert.equal(marque.lignes, 2);
});

test("le séparateur nommé se suffit à lui-même", () => {
  assert.equal(laMarque(nus("-----Message d'origine-----"), 0).forme, FORME_DE_LA_MARQUE.SEPARATEUR);
  assert.equal(laMarque(nus("---------- Forwarded message ---------"), 0).forme, FORME_DE_LA_MARQUE.SEPARATEUR);
});

test("des en-têtes recopiés ouvrent une citation, et disent qui et quand", () => {
  const marque = laMarque(nus(
    "De : Ourdine Ferrand <o.ferrand@novaclim.example>",
    "Envoyé : jeudi 12 mars 2026 09:14",
    "À : controle@verifas.example",
    "Objet : Lot 3"
  ), 0);
  assert.equal(marque.forme, FORME_DE_LA_MARQUE.EN_TETES);
  assert.equal(marque.lignes, 4);
  assert.equal(marque.texteQui, "Ourdine Ferrand <o.ferrand@novaclim.example>");
  assert.equal(marque.texteQuand, "jeudi 12 mars 2026 09:14");
});

// ── Ce qui n'est pas un bandeau, et ne doit pas emporter le message ────────

test("« a écrit » au milieu d'une phrase ne coupe rien", () => {
  assert.equal(laMarque(nus("Le maître d'œuvre a écrit un courrier recommandé."), 0), null);
});

test("un paragraphe qui finit par « a écrit : » est trop long pour un bandeau", () => {
  const paragraphe = `Nous reprenons ici l'intégralité des échanges relatifs au lot 3, ${"y compris ".repeat(20)}a écrit :`;
  assert.equal(laMarque(nus(paragraphe), 0), null);
});

test("une ligne de tirets bas seule est un trait, pas un bandeau", () => {
  // C'est la rupture que le plan nomme : couper là emporterait tout ce que
  // l'auteur a écrit, parce que ce trait précède souvent une signature.
  assert.equal(laMarque(nus("________________________________", "Ourdine Ferrand", "NOVACLIM"), 0), null);
});

test("une ligne de tirets bas suivie d'en-têtes est un bandeau", () => {
  const marque = laMarque(nus(
    "________________________________",
    "De : Ourdine Ferrand",
    "Envoyé : jeudi 12 mars 2026 09:14"
  ), 0);
  assert.equal(marque.forme, FORME_DE_LA_MARQUE.TIRETS);
  assert.equal(marque.lignes, 3);
});

test("une seule ligne « De : … » ne suffit pas", () => {
  // Elle peut être une phrase ; il lui faut au moins un autre en-tête.
  assert.equal(laMarque(nus("De : la toiture vient l'humidité", "et rien d'autre"), 0), null);
});

test("un bandeau reconnu n'emporte pas le message entier", () => {
  const lu = ceQuonCite(corps(
    "Le support est humide au droit de l'acrotère.",
    "",
    "________________________________",
    "Ourdine Ferrand — NOVACLIM",
    "04 79 00 00 00"
  ));
  assert.equal(lu.cite, "");
  assert.ok(lu.propos.includes("Le support est humide"));
  assert.ok(lu.propos.includes("04 79 00 00 00"));
});

// ── Une ligne isolée qui commence par « > » n'est pas une citation ─────────

test("« > 50 m² » dans un devis n'a cité personne", () => {
  const lu = ceQuonCite(corps(
    "Le devis retient les surfaces suivantes :",
    "> 50 m² en toiture",
    "et rien pour l'acrotère."
  ));
  assert.equal(lu.cite, "");
  assert.ok(lu.propos.includes("> 50 m² en toiture"));
  assert.ok(aBien(lu, TROU.CHEVRON_ISOLE));
});

test("la ligne gardée l'est telle que l'auteur l'a écrite", () => {
  const lu = ceQuonCite(corps("Surfaces :", "> 50 m²", "fin"));
  assert.equal(lu.propos, "Surfaces :\n> 50 m²\nfin");
});

test("deux lignes qui se suivent font un bloc, donc une citation", () => {
  const lu = ceQuonCite(corps(
    "D'accord.",
    "> La cote est à 12,40.",
    "> Le support est humide."
  ));
  assert.equal(lu.propos, "D'accord.");
  assert.equal(lu.cite, "La cote est à 12,40.\nLe support est humide.");
  assert.equal(aBien(lu, TROU.CHEVRON_ISOLE), false);
});

test("une ligne vide ne coupe pas un bloc de citation en deux", () => {
  // Bien des messageries laissent la ligne vide sans chevron : compter deux
  // blocs d'une ligne ferait passer une vraie citation pour un devis.
  const lu = ceQuonCite(corps(
    "D'accord.",
    "> La cote est à 12,40.",
    "",
    "> Le support est humide."
  ));
  assert.equal(aBien(lu, TROU.CHEVRON_ISOLE), false);
  assert.equal(lu.cite, "La cote est à 12,40.\n\nLe support est humide.");
});

test("une ligne isolée précédée d'un bandeau est bien une citation", () => {
  const lu = ceQuonCite(corps(
    "D'accord.",
    "Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :",
    "> La cote est à 12,40."
  ));
  assert.equal(lu.cite, "La cote est à 12,40.");
  assert.equal(aBien(lu, TROU.CHEVRON_ISOLE), false);
});

test("une réponse point par point garde tout, et porte ses marques", () => {
  // Le prix assumé de la prudence : chaque ligne citée seule reste dans le
  // propos. Garder du texte en trop se voit ; perdre du propos ne se voit pas.
  const lu = ceQuonCite(corps(
    "> La cote est à 12,40 ?",
    "Non, 12,60.",
    "",
    "> Le support est humide ?",
    "Oui, au droit de l'acrotère."
  ));
  assert.equal(lu.cite, "");
  assert.equal(lu.trous.filter((trou) => trou.quoi === TROU.CHEVRON_ISOLE).length, 2);
  assert.ok(lu.propos.includes("Non, 12,60."));
  assert.ok(lu.propos.includes("> Le support est humide ?"));
});

// ── Les niveaux ────────────────────────────────────────────────────────────

const FIL_CHEVRONNE = corps(
  "Bonjour,",
  "Le support est humide au droit de l'acrotère.",
  "",
  "Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :",
  "> La cote est à 12,40.",
  ">",
  "> Le 11 mars 2026 à 17:02, BERTRAND a écrit :",
  ">> Rien n'a été relevé à cet endroit.",
  "",
  "-- ",
  "Ourdine Ferrand",
  "NOVACLIM"
);

test("les niveaux s'empilent, et chacun sait de qui il est", () => {
  const lu = ceQuonCite(FIL_CHEVRONNE);
  assert.deepEqual(plan(lu), [
    "0:propos", "0:bandeau", "1:citation", "1:bandeau", "2:citation", "0:signature"
  ]);
  assert.equal(lu.profondeurMax, 2);
  assert.deepEqual(lu.blocs.filter((bloc) => bloc.marque).map((bloc) => bloc.marque.texteQui),
    ["Ourdine Ferrand", "BERTRAND"]);
});

test("le propos ne porte que ce que l'auteur a ajouté", () => {
  const lu = ceQuonCite(FIL_CHEVRONNE);
  assert.equal(lu.propos, "Bonjour,\nLe support est humide au droit de l'acrotère.");
});

test("la signature n'est ni du propos ni de la citation", () => {
  // Laisser un pied de page entrer dans le propos donnerait au relevé des
  // numéros de téléphone et des mentions légales à prendre pour des constats.
  const lu = ceQuonCite(FIL_CHEVRONNE);
  assert.equal(lu.signature, "Ourdine Ferrand\nNOVACLIM");
  assert.equal(lu.propos.includes("NOVACLIM"), false);
});

test("une signature posée après la citation revient bien au propos", () => {
  // Sans cela, un bandeau une fois franchi ferait de toute la fin du message
  // une citation, et le « Merci, à jeudi » d'après serait attribué à un autre.
  const lu = ceQuonCite(corps(
    "Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :",
    "> La cote est à 12,40.",
    "> Le support est humide.",
    "",
    "Merci, à jeudi."
  ));
  assert.equal(lu.propos, "Merci, à jeudi.");
  assert.equal(lu.cite, "La cote est à 12,40.\nLe support est humide.");
});

test("un fil à l'ancienne, sans le moindre chevron, se creuse quand même", () => {
  const lu = ceQuonCite(corps(
    "Le support est humide.",
    "",
    "-----Message d'origine-----",
    "De : Ourdine Ferrand",
    "Envoyé : jeudi 12 mars 2026 09:14",
    "À : controle@verifas.example",
    "",
    "La cote est à 12,40.",
    "",
    "-----Message d'origine-----",
    "De : BERTRAND",
    "Envoyé : mercredi 11 mars 2026 17:02",
    "",
    "Rien n'a été relevé."
  ));
  assert.deepEqual(plan(lu), [
    "0:propos", "0:bandeau", "1:citation", "1:bandeau", "2:citation"
  ]);
  assert.equal(lu.propos, "Le support est humide.");
  assert.equal(lu.cite, "La cote est à 12,40.\n\nRien n'a été relevé.");
});

test("un bandeau à l'ancienne caché dans une citation chevronnée se compte une fois", () => {
  const lu = ceQuonCite(corps(
    "Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :",
    "> La cote est à 12,40.",
    "> -----Message d'origine-----",
    "> De : BERTRAND",
    "> Envoyé : mercredi 11 mars 2026 17:02",
    "> Rien n'a été relevé."
  ));
  assert.deepEqual(plan(lu), ["0:bandeau", "1:citation", "1:bandeau", "2:citation"]);
});

test("les chevrons et le bandeau ne comptent pas deux fois", () => {
  const lu = ceQuonCite(corps(
    "Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :",
    "> La cote est à 12,40.",
    "> Le support est humide."
  ));
  assert.equal(lu.profondeurMax, 1);
});

// ── Ce qu'on n'a pas su couper ─────────────────────────────────────────────

test("des en-têtes qui traînent dans le propos se signalent", () => {
  // Une messagerie dont le bandeau n'est pas dans la liste laisse cela : on
  // ne coupe pas au jugé, on dit qu'on n'a pas su.
  const lu = ceQuonCite(corps(
    "Le support est humide.",
    "",
    "###### Message transmis ######",
    "Expéditeur : Ourdine Ferrand",
    "La cote est à 12,40."
  ));
  assert.ok(aBien(lu, TROU.BANDEAU_PROBABLE));
  assert.ok(lu.propos.includes("La cote est à 12,40."));
});

test("un message qui ne fait que citer le dit, au lieu de paraître vide", () => {
  const lu = ceQuonCite(corps(
    "-----Message d'origine-----",
    "De : Ourdine Ferrand",
    "Envoyé : jeudi 12 mars 2026 09:14",
    "",
    "La cote est à 12,40."
  ));
  assert.equal(lu.propos, "");
  assert.ok(aBien(lu, TROU.RIEN_QUE_DES_CITATIONS));
});

test("un message ordinaire ne porte aucun trou", () => {
  // Une liste de trous qui se remplit toujours vaut autant qu'une liste qui
  // reste toujours vide.
  assert.deepEqual(ceQuonCite(FIL_CHEVRONNE).trous, []);
  assert.deepEqual(ceQuonCite("Le support est humide au droit de l'acrotère.").trous, []);
});

test("un corps vide ne rend rien, et ne s'en plaint pas", () => {
  const lu = ceQuonCite("");
  assert.deepEqual(lu.blocs, []);
  assert.equal(lu.propos, "");
  assert.deepEqual(lu.trous, []);
  assert.deepEqual(ceQuonCite(null).blocs, []);
});

test("le texte d'un bloc perd les lignes vides de ses bords, pas son retrait", () => {
  const lu = ceQuonCite(corps("", "", "  Surfaces :", "    50 m²", "", ""));
  assert.equal(lu.propos, "  Surfaces :\n    50 m²");
});
