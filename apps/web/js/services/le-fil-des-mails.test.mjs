import assert from "node:assert/strict";
import test from "node:test";

import {
  CERTITUDE, ORDRE, empreinteDuTexte, leFilDesMails, leJourDuMessage, leMemeTexte,
  lesMessagesCites, phraseDuFil, unMessageDuFil
, quiDuneCitation
} from "./le-fil-des-mails.js";
import { TROU } from "./trous-dun-mail.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const mail = (...lignes) => lignes.join("\r\n");
const aBien = (fil, quoi) => fil.trous.some((trou) => trou.quoi === quoi);
const qui = (fil) => fil.messages.map((message) => message.qui.adresse || message.qui.nom);
const proposDe = (fil) => fil.messages.map((message) => message.propos);

const PREMIER = mail(
  "From: BERTRAND <contact@bertrand.example>",
  "To: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Date: Tue, 3 Mar 2026 08:30:00 +0100",
  "Subject: Étanchéité toiture",
  "Message-ID: <a1@bertrand.example>",
  "",
  "Rien n'a été relevé au droit de l'acrotère à ce jour.",
  ""
);

const SECOND = mail(
  "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "To: BERTRAND <contact@bertrand.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Re: Étanchéité toiture",
  "Message-ID: <b2@novaclim.example>",
  "In-Reply-To: <a1@bertrand.example>",
  "References: <a1@bertrand.example>",
  "",
  "Le support est humide au droit de l'acrotère.",
  "",
  "Le 3 mars 2026 à 08:30, BERTRAND a écrit :",
  "> Rien n'a été relevé au droit de l'acrotère à ce jour.",
  ""
);

// ── Reconnaître deux fois le même texte ────────────────────────────────────

test("l'empreinte efface la mise en page, pas le propos", () => {
  assert.equal(empreinteDuTexte("  Le  support\n  est humide.  "), "le support est humide.");
});

test("un texte recopié à l'identique se reconnaît", () => {
  assert.equal(leMemeTexte("Le support est humide.", "le  support\nest humide."), true);
});

test("une citation un peu plus longue que l'original se reconnaît", () => {
  // La signature du cité s'ajoute souvent à la citation : l'égalité stricte
  // laisserait alors le même message apparaître deux fois.
  const original = "Rien n'a été relevé au droit de l'acrotère à ce jour.";
  const citation = `${original}\nNous repasserons jeudi avec le géomètre.`;
  assert.equal(leMemeTexte(original, citation), true);
});

test("deux messages qui partagent leur entrée en matière ne sont pas le même", () => {
  const entree = "Bonjour, suite à notre échange de ce matin,";
  const un = `${entree} nous confirmons la reprise de l'étanchéité sur le lot 3 et la dépose des relevés existants.`;
  assert.equal(leMemeTexte(entree, un), false);
});

test("trois mots communs ne font pas un message", () => {
  assert.equal(leMemeTexte("D'accord.", "D'accord. Nous repasserons jeudi avec le géomètre et le couvreur."), false);
});

test("un texte vide ne ressemble à rien", () => {
  assert.equal(leMemeTexte("", "Le support est humide."), false);
  assert.equal(leMemeTexte(null, null), false);
});

// ── Les messages qu'une citation contient ──────────────────────────────────

test("une citation imbriquée rend ses messages, du plus récent au plus ancien", () => {
  const { decoupe } = unMessageDuFil(mail(
    "From: a@b.example", "", "D'accord.",
    "Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :",
    "> Le support est humide.",
    "> Le 3 mars 2026 à 08:30, BERTRAND a écrit :",
    ">> Rien n'a été relevé.",
    ""
  ));
  const cites = lesMessagesCites(decoupe.blocs);
  assert.deepEqual(cites.map((cite) => [cite.niveauDeCitation, cite.texteQui, cite.propos]), [
    [1, "Ourdine Ferrand", "Le support est humide."],
    [2, "BERTRAND", "Rien n'a été relevé."]
  ]);
});

test("un message sans citation n'en contient aucun", () => {
  const { decoupe } = unMessageDuFil(mail("From: a@b.example", "", "Le support est humide.", ""));
  assert.deepEqual(lesMessagesCites(decoupe.blocs), []);
});

// ── La chaîne d'abord ──────────────────────────────────────────────────────

const CHAINE_A = mail(
  "From: BERTRAND <contact@bertrand.example>",
  "Date: Thu, 12 Mar 2026 09:00:00 +0100",
  "Subject: Étanchéité toiture",
  "Message-ID: <a1@bertrand.example>",
  "", "Rien n'a été relevé au droit de l'acrotère à ce jour.", ""
);
const CHAINE_B = mail(
  "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Re: Étanchéité toiture",
  "Message-ID: <b2@novaclim.example>",
  "In-Reply-To: <a1@bertrand.example>",
  "", "Le support est humide au droit de l'acrotère.", ""
);
const CHAINE_C = mail(
  "From: Bureau VERIFAS <controle@verifas.example>",
  "Date: Thu, 12 Mar 2026 09:14:00 +0100",
  "Subject: Re: Étanchéité toiture",
  "Message-ID: <c3@verifas.example>",
  "In-Reply-To: <b2@novaclim.example>",
  "", "Nous confirmons : il faut sonder avant de reprendre le relevé.", ""
);

test("deux messages de même date mais de chaîne différente se rangent par la chaîne", () => {
  // C'est la rupture que le plan nomme. Par les dates, B et C sont à égalité
  // et l'ordre serait celui du dépôt — ici, l'inverse du vrai.
  const fil = leFilDesMails([CHAINE_C, CHAINE_B, CHAINE_A]);
  assert.deepEqual(qui(fil), [
    "contact@bertrand.example", "o.ferrand@novaclim.example", "controle@verifas.example"
  ]);
  assert.equal(fil.ordre, ORDRE.CHAINE);
});

test("un fil rangé par sa chaîne ne dit pas qu'il l'a été par ses dates", () => {
  assert.equal(aBien(leFilDesMails([CHAINE_C, CHAINE_B, CHAINE_A]), TROU.FIL_ORDONNE_PAR_DATES), false);
});

test("la profondeur dit qui répond à qui", () => {
  const fil = leFilDesMails([CHAINE_A, CHAINE_B, CHAINE_C]);
  assert.deepEqual(fil.messages.map((message) => message.profondeur), [0, 1, 2]);
  assert.deepEqual(fil.messages.map((message) => message.repondA),
    ["", "<a1@bertrand.example>", "<b2@novaclim.example>"]);
});

test("References sert quand In-Reply-To manque", () => {
  const sansReponseA = CHAINE_B.replace("In-Reply-To: <a1@bertrand.example>", "References: <a1@bertrand.example>");
  const fil = leFilDesMails([sansReponseA, CHAINE_A]);
  assert.equal(fil.ordre, ORDRE.CHAINE);
  assert.deepEqual(fil.messages.map((message) => message.profondeur), [0, 1]);
});

test("les réponses à un même message se départagent par leurs dates", () => {
  // Trois frères déposés dans le désordre : ni l'ordre du dépôt, ni son
  // inverse, ne donnent le bon rang. Seules les dates le donnent.
  const tardive = CHAINE_C
    .replace("In-Reply-To: <b2@novaclim.example>", "In-Reply-To: <a1@bertrand.example>")
    .replace("09:14:00", "11:40:00");
  const entreDeux = mail(
    "From: Cabinet NOVACLIM <etudes@novaclim.example>",
    "Date: Thu, 12 Mar 2026 10:00:00 +0100",
    "Subject: Re: Étanchéité toiture",
    "Message-ID: <e5@novaclim.example>",
    "In-Reply-To: <a1@bertrand.example>",
    "", "Nous transmettons le détail du complexe posé en 2019.", ""
  );
  const fil = leFilDesMails([tardive, CHAINE_B, entreDeux, CHAINE_A]);
  assert.deepEqual(qui(fil), [
    "contact@bertrand.example",
    "o.ferrand@novaclim.example",
    "etudes@novaclim.example",
    "controle@verifas.example"
  ]);
  assert.deepEqual(fil.messages.map((message) => message.profondeur), [0, 1, 1, 1]);
});

test("une chaîne qui boucle sur elle-même ne fait pas tourner le rangement en rond", () => {
  const boucle = CHAINE_A.replace("Message-ID: <a1@bertrand.example>",
    "Message-ID: <a1@bertrand.example>\r\nIn-Reply-To: <b2@novaclim.example>");
  const fil = leFilDesMails([boucle, CHAINE_B]);
  assert.equal(fil.messages.length, 2);
  assert.equal(fil.doublons, 0);
});

// ── Les dates ensuite, et le fil le dit ────────────────────────────────────

test("sans chaîne de réponses, les dates rangent le fil — et il le dit", () => {
  const sansChaine = CHAINE_B.replace("In-Reply-To: <a1@bertrand.example>\r\n", "");
  const fil = leFilDesMails([sansChaine, CHAINE_A]);
  assert.equal(fil.ordre, ORDRE.DATES);
  assert.deepEqual(qui(fil), ["contact@bertrand.example", "o.ferrand@novaclim.example"]);
  assert.ok(aBien(fil, TROU.FIL_ORDONNE_PAR_DATES));
});

test("un fil en deux morceaux le dit aussi", () => {
  const ailleurs = mail(
    "From: Bureau VERIFAS <controle@verifas.example>",
    "Date: Fri, 13 Mar 2026 10:00:00 +0100",
    "Subject: Étanchéité toiture",
    "Message-ID: <d4@verifas.example>",
    "", "Nous passons vendredi prochain pour le sondage du support.", ""
  );
  const fil = leFilDesMails([CHAINE_A, CHAINE_B, ailleurs]);
  assert.equal(fil.ordre, ORDRE.MELANGE);
  assert.ok(aBien(fil, TROU.FIL_EN_PLUSIEURS_MORCEAUX));
});

test("un message seul n'est rangé ni par sa chaîne ni par ses dates", () => {
  const fil = leFilDesMails([CHAINE_A]);
  assert.equal(fil.ordre, ORDRE.UNIQUE);
  assert.equal(aBien(fil, TROU.FIL_ORDONNE_PAR_DATES), false);
});

test("un message sans date que rien ne relie dit que sa place est celle du dépôt", () => {
  const sansDate = CHAINE_A.replace("Date: Thu, 12 Mar 2026 09:00:00 +0100\r\n", "");
  const fil = leFilDesMails([sansDate, CHAINE_C]);
  assert.ok(aBien(fil, TROU.MESSAGE_SANS_PLACE));
});

// ── Un message n'apparaît qu'une fois ──────────────────────────────────────

test("le même fichier déposé deux fois ne fait qu'un message", () => {
  const fil = leFilDesMails([PREMIER, SECOND, PREMIER]);
  assert.equal(fil.messages.length, 2);
  assert.equal(fil.doublons, 1);
});

test("un message déposé et cité ailleurs n'apparaît qu'une fois, à sa place", () => {
  // SECOND recopie PREMIER dans sa citation. Le déposé gagne : il porte sa
  // vraie date, ses destinataires et ses pièces jointes.
  const fil = leFilDesMails([SECOND, PREMIER]);
  assert.equal(fil.messages.length, 2);
  assert.deepEqual(fil.messages.map((message) => message.certitude),
    [CERTITUDE.DEPOSE, CERTITUDE.DEPOSE]);
  assert.equal(fil.messages[0].quand, "2026-03-03T07:30:00.000Z");
});

test("deux exemplaires sans identifiant se reconnaissent par qui, quand et quoi", () => {
  const anonyme = PREMIER.replace("Message-ID: <a1@bertrand.example>\r\n", "");
  const fil = leFilDesMails([anonyme, anonyme]);
  assert.equal(fil.messages.length, 1);
  assert.equal(fil.doublons, 1);
});

test("sans identifiant, deux messages du même auteur à la même seconde se séparent par leur texte", () => {
  // C'est le seul cas où le texte tranche : sans Message-ID, rien d'autre ne
  // distingue deux messages écrits par la même personne au même instant.
  const anonyme = PREMIER.replace("Message-ID: <a1@bertrand.example>\r\n", "");
  const autre = anonyme.replace("Rien n'a été relevé au droit de l'acrotère à ce jour.",
    "Nous repassons jeudi avec le géomètre pour reprendre les cotes.");
  const fil = leFilDesMails([anonyme, autre]);
  assert.equal(fil.messages.length, 2);
  assert.equal(fil.doublons, 0);
});

test("deux messages différents du même auteur ne se confondent pas", () => {
  const autre = PREMIER
    .replace("Message-ID: <a1@bertrand.example>", "Message-ID: <a9@bertrand.example>")
    .replace("Rien n'a été relevé au droit de l'acrotère à ce jour.",
      "Nous repassons jeudi avec le géomètre pour reprendre les cotes.");
  const fil = leFilDesMails([PREMIER, autre]);
  assert.equal(fil.messages.length, 2);
  assert.equal(fil.doublons, 0);
});

// ── Le dernier message, déposé seul ────────────────────────────────────────

const TOUT_SEUL = mail(
  "From: Bureau VERIFAS <controle@verifas.example>",
  "To: Ourdine Ferrand <o.ferrand@novaclim.example>",
  "Date: Thu, 12 Mar 2026 11:40:00 +0100",
  "Subject: Re: Re: Étanchéité toiture",
  "Message-ID: <c3@verifas.example>",
  "",
  "Nous confirmons : il faut sonder avant de reprendre le relevé.",
  "",
  "Le 12 mars 2026 à 09:14, Ourdine Ferrand a écrit :",
  "> Le support est humide au droit de l'acrotère.",
  ">",
  "> Le 3 mars 2026 à 08:30, BERTRAND a écrit :",
  ">> Rien n'a été relevé au droit de l'acrotère à ce jour.",
  ""
);

test("un fil où le dernier message porte tout se reconstitue dans l'ordre", () => {
  // La seconde rupture que le plan nomme. L'ordre vient de l'imbrication des
  // citations, qui est une chaîne : le plus profond est le plus ancien.
  const fil = leFilDesMails([TOUT_SEUL]);
  assert.deepEqual(proposDe(fil), [
    "Rien n'a été relevé au droit de l'acrotère à ce jour.",
    "Le support est humide au droit de l'acrotère.",
    "Nous confirmons : il faut sonder avant de reprendre le relevé."
  ]);
  assert.deepEqual(qui(fil), ["BERTRAND", "Ourdine Ferrand", "controle@verifas.example"]);
});

test("un message reconstitué se dit reconstitué, et ne prétend pas avoir de date", () => {
  const fil = leFilDesMails([TOUT_SEUL]);
  const reconstitue = fil.messages[0];
  assert.equal(reconstitue.certitude, CERTITUDE.CITE);
  assert.equal(reconstitue.quand, "");
  assert.equal(reconstitue.quandTexte, "3 mars 2026 à 08:30");
  assert.deepEqual(reconstitue.a, []);
  assert.deepEqual(reconstitue.pieces, []);
  assert.ok(aBien(fil, TROU.MESSAGE_RECONSTITUE));
});

test("le message vraiment déposé, lui, garde tout", () => {
  const fil = leFilDesMails([TOUT_SEUL]);
  const depose = fil.messages[2];
  assert.equal(depose.certitude, CERTITUDE.DEPOSE);
  assert.equal(depose.quand, "2026-03-12T10:40:00.000Z");
  assert.deepEqual(depose.a.map((adresse) => adresse.adresse), ["o.ferrand@novaclim.example"]);
});

test("la profondeur d'imbrication dit d'où vient chaque message reconstitué", () => {
  const fil = leFilDesMails([TOUT_SEUL]);
  assert.deepEqual(fil.messages.map((message) => message.niveauDeCitation), [2, 1, 0]);
  assert.equal(fil.messages[0].citeDans, "<c3@verifas.example>");
});

test("déposer aussi les messages cités ne les dédouble pas", () => {
  const fil = leFilDesMails([TOUT_SEUL, PREMIER, SECOND]);
  assert.equal(fil.messages.length, 3);
  assert.deepEqual(fil.messages.map((message) => message.certitude),
    [CERTITUDE.DEPOSE, CERTITUDE.DEPOSE, CERTITUDE.DEPOSE]);
});

// ── Ce qui nomme le fil ────────────────────────────────────────────────────

test("l'objet du fil perd ses Re: empilés", () => {
  assert.equal(leFilDesMails([TOUT_SEUL]).objet, "Étanchéité toiture");
});

test("des objets différents se signalent : ce n'est peut-être pas un seul fil", () => {
  const ailleurs = CHAINE_C.replace("Subject: Re: Étanchéité toiture", "Subject: Reprise des acrotères");
  assert.ok(aBien(leFilDesMails([CHAINE_A, CHAINE_B, ailleurs]), TROU.FIL_A_PLUSIEURS_OBJETS));
});

test("un fil d'un seul objet ne se plaint pas", () => {
  assert.equal(aBien(leFilDesMails([CHAINE_A, CHAINE_B]), TROU.FIL_A_PLUSIEURS_OBJETS), false);
});

test("la phrase du fil dit l'objet, le compte et la période", () => {
  assert.equal(leFilDesMails([PREMIER, SECOND]).phrase,
    "Étanchéité toiture · 2 messages du 3 au 12 mars 2026");
});

test("la période se dit autrement selon ce qui change", () => {
  const jour = (annee, mois, jourDuMois) => ({ annee, mois, jour: jourDuMois });
  const fil = (debut, fin, combien) => phraseDuFil({ objet: "Lot 3", debut, fin, messages: Array(combien).fill(0) });
  assert.equal(fil(jour(2026, 2, 12), jour(2026, 2, 12), 1), "Lot 3 · 1 message le 12 mars 2026");
  assert.equal(fil(jour(2026, 2, 3), jour(2026, 3, 19), 5), "Lot 3 · 5 messages du 3 mars au 19 avril 2026");
  assert.equal(fil(jour(2025, 11, 30), jour(2026, 0, 6), 4), "Lot 3 · 4 messages du 30 décembre 2025 au 6 janvier 2026");
});

test("la période va de la première date à la dernière, pas du premier rang au dernier", () => {
  // Un message envoyé d'un téléphone mal réglé arrive daté d'avant celui
  // auquel il répond. La chaîne le range après — c'est elle qui sait — mais
  // la période du fil, elle, se lit sur les dates, sinon elle court à
  // l'envers.
  const dereglee = CHAINE_B
    .replace("Date: Thu, 12 Mar 2026 09:14:00 +0100", "Date: Tue, 3 Mar 2026 08:30:00 +0100");
  const fil = leFilDesMails([CHAINE_A, dereglee]);
  assert.deepEqual(qui(fil), ["contact@bertrand.example", "o.ferrand@novaclim.example"]);
  assert.equal(fil.phrase, "Étanchéité toiture · 2 messages du 3 au 12 mars 2026");
});

test("sans date, la phrase ne fabrique pas de période", () => {
  const sansDate = CHAINE_A.replace("Date: Thu, 12 Mar 2026 09:00:00 +0100\r\n", "");
  assert.equal(leFilDesMails([sansDate]).phrase, "Étanchéité toiture · 1 message");
});

test("le jour d'un message est celui de son fuseau, pas celui de Greenwich", () => {
  // Un message envoyé à 00 h 30 à Paris est daté de la veille à Greenwich :
  // la période du fil s'en trouverait fausse d'un jour.
  const minuit = mail(
    "From: a@b.example",
    "Date: Thu, 12 Mar 2026 00:30:00 +0100",
    "Subject: Lot 3",
    "Message-ID: <m@b.example>",
    "", "Le support est humide.", ""
  );
  const fil = leFilDesMails([minuit]);
  assert.equal(fil.messages[0].quand, "2026-03-11T23:30:00.000Z");
  assert.deepEqual(leJourDuMessage(fil.messages[0]), { annee: 2026, mois: 2, jour: 12 });
  assert.equal(fil.phrase, "Lot 3 · 1 message le 12 mars 2026");
});

// ── Les bords ──────────────────────────────────────────────────────────────

test("aucun mail déposé ne fait pas un fil en erreur", () => {
  const fil = leFilDesMails([]);
  assert.deepEqual(fil.messages, []);
  assert.equal(fil.objet, "");
  assert.equal(fil.debut, null);
  assert.deepEqual(leFilDesMails(null).messages, []);
});

test("un fil ordinaire ne porte aucun trou du fil", () => {
  // Une liste de trous qui se remplit toujours vaut autant qu'une liste qui
  // reste toujours vide.
  assert.deepEqual(leFilDesMails([PREMIER, SECOND]).trous, []);
});

test("les trous de chaque message remontent dans ceux du fil", () => {
  const sansIdentite = CHAINE_A.replace("Message-ID: <a1@bertrand.example>\r\n", "");
  assert.ok(aBien(leFilDesMails([sansIdentite]), TROU.SANS_IDENTITE));
});

// ── Qui a écrit un message reconstitué d'une citation ──────────────────────

test("le bandeau d'un message cité rend le nom et l'adresse séparés", () => {
  // Les garder dans la même chaîne donne à la même personne une identité par
  // forme d'affichage : un fil réel a porté deux personnes sous quatre.
  assert.deepEqual(quiDuneCitation("Ourdine Ferrand <o.ferrand@novaclim.example>"),
    { nom: "Ourdine Ferrand", adresse: "o.ferrand@novaclim.example" });
});

test("un bandeau qui ne nomme qu'une personne ne lui invente pas d'adresse", () => {
  // « BERTRAND a écrit » ne porte pas d'adresse, et prendre ce nom pour une
  // adresse serait pire que de ne rien savoir.
  assert.deepEqual(quiDuneCitation("BERTRAND"), { nom: "BERTRAND", adresse: "" });
});

test("un chevron au milieu d'un nom n'en fait pas une adresse", () => {
  // Les chevrons se cherchent à la fin : ailleurs, ils appartiennent au texte.
  // « SOCOTEC <> VERIFAS » n'est pas un couple nom/adresse.
  assert.deepEqual(quiDuneCitation("NOVACLIM < VERIFAS"),
    { nom: "NOVACLIM < VERIFAS", adresse: "" });
});

test("un bandeau vide ne nomme personne", () => {
  assert.deepEqual(quiDuneCitation(""), { nom: "", adresse: "" });
});

test("un message reconstitué porte l'adresse de son auteur, pas une chaîne d'affichage", () => {
  // L'épreuve qui compte : `quiDuneCitation` peut être juste et n'être appelée
  // nulle part. Sans elle ici, la même personne prend une identité par forme
  // d'affichage, et se retrouve en désaccord avec elle-même.
  const porteur = mail(
    "From: Ourdine Ferrand <o.ferrand@novaclim.example>",
    "To: BERTRAND <contact@bertrand.example>",
    "Date: Thu, 12 Mar 2026 09:14:00 +0100",
    "Subject: Re: Étanchéité toiture",
    "Message-ID: <z9@novaclim.example>",
    "",
    "La cote est arrêtée à 12,40.",
    "",
    "De : BERTRAND <contact@bertrand.example>",
    "Envoyé : mardi 3 mars 2026 08:30",
    "À : Ourdine Ferrand <o.ferrand@novaclim.example>",
    "Objet : Étanchéité toiture",
    "",
    "Rien n'a été relevé au droit de l'acrotère.",
    ""
  );
  const cite = leFilDesMails([porteur]).messages.find((message) => message.rang === 1);
  assert.deepEqual(cite.qui, { nom: "BERTRAND", adresse: "contact@bertrand.example" });
});
