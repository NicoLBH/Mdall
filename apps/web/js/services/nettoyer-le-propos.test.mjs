import assert from "node:assert/strict";
import test from "node:test";

import {
  MARQUE_DUNE_IMAGE, deplierUneRedirection, estUneRedirection, leProposNettoye
} from "./nettoyer-le-propos.js";

// Aucun mail réel : les noms, les sociétés et les domaines sont inventés.
const corps = (...lignes) => lignes.join("\n");

// ── Déplier une redirection ────────────────────────────────────────────────

test("une adresse ordinaire n'est pas une redirection et ne bouge pas", () => {
  const nue = "https://www.novaclim.example/notices/cvc-12.pdf";
  assert.equal(estUneRedirection(nue), false);
  assert.equal(deplierUneRedirection(nue), nue);
});

test("une passerelle qui pose la cible en paramètre rend la cible", () => {
  const enveloppe =
    "https://eur03.safelinks.protection.outlook.com/?url=https%3A%2F%2Fwww.novaclim.example" +
    "%2Fnotices%2Fcvc-12.pdf&data=05%7C02%7C&sdata=abc%3D&reserved=0";
  assert.equal(estUneRedirection(enveloppe), true);
  assert.equal(
    deplierUneRedirection(enveloppe),
    "https://www.novaclim.example/notices/cvc-12.pdf"
  );
});

test("un filtre de liens qui entoure la cible de tirets bas rend la cible", () => {
  const enveloppe =
    "https://urldefense.com/v3/__https://www.novaclim.example/notices/cvc-12.pdf__;!!PWAseTJI!abcd$";
  assert.equal(
    deplierUneRedirection(enveloppe),
    "https://www.novaclim.example/notices/cvc-12.pdf"
  );
});

test("deux couches empilées se déplient jusqu'à la cible", () => {
  // Le cas réel : une passerelle de messagerie enveloppe une adresse qu'un
  // filtre de liens avait déjà enveloppée. S'arrêter à la première couche
  // rend une deuxième redirection, pas une adresse.
  const dedans =
    "https://urldefense.com/v3/__https://www.novaclim.example/notices/cvc-12.pdf__;!!PWAseTJI!abcd$";
  const dehors =
    "https://eur03.safelinks.protection.outlook.com/?url=" +
    encodeURIComponent(dedans) + "&data=05%7C02%7C";
  assert.equal(
    deplierUneRedirection(dehors),
    "https://www.novaclim.example/notices/cvc-12.pdf"
  );
});

test("une redirection qu'on ne sait pas déplier revient telle quelle", () => {
  // On ne devine pas ce qu'elle visait : rendre une adresse fausse serait pire
  // que rendre une adresse longue.
  const opaque = "https://eur03.safelinks.protection.outlook.com/?data=05%7C02%7C";
  assert.equal(deplierUneRedirection(opaque), opaque);
});

test("une enveloppe qui ne contient pas une adresse ne se déplie pas", () => {
  // `url=` peut porter autre chose qu'une adresse ; on ne la remplace pas par
  // un morceau de texte qui n'est pas une cible.
  const bancale = "https://eur03.safelinks.protection.outlook.com/?url=cvc-12.pdf";
  assert.equal(deplierUneRedirection(bancale), bancale);
});

// ── Les redirections dans le texte ─────────────────────────────────────────

test("une redirection dans une phrase se déplie sans emporter la phrase", () => {
  const propre = leProposNettoye(
    "Voir la notice ici : https://eur03.safelinks.protection.outlook.com/?url=" +
    "https%3A%2F%2Fwww.novaclim.example%2Fnotices%2Fcvc-12.pdf&data=05 puis me dire."
  );
  assert.equal(
    propre.texte,
    "Voir la notice ici : https://www.novaclim.example/notices/cvc-12.pdf puis me dire."
  );
  assert.equal(propre.redirections, 1);
});

test("chaque redirection se compte", () => {
  const une = "https://urldefense.com/v3/__https://a.example/1__;!!x$";
  const deux = "https://urldefense.com/v3/__https://a.example/2__;!!x$";
  const propre = leProposNettoye(`D'abord ${une} ensuite ${deux}`);
  assert.equal(propre.redirections, 2);
  assert.equal(propre.texte, "D'abord https://a.example/1 ensuite https://a.example/2");
});

test("une adresse ordinaire dans le texte ne se compte pas", () => {
  const propre = leProposNettoye("La notice est sur https://www.novaclim.example/notices/cvc-12.pdf ok");
  assert.equal(propre.redirections, 0);
  assert.equal(propre.texte, "La notice est sur https://www.novaclim.example/notices/cvc-12.pdf ok");
});

// ── Les images en ligne ────────────────────────────────────────────────────

test("une image collée dans le texte devient sa présence, et se compte", () => {
  const propre = leProposNettoye("Le détail est là [cid:image018.png@01DD1B52.8A52BFD0] en coupe.");
  assert.equal(propre.texte, `Le détail est là ${MARQUE_DUNE_IMAGE} en coupe.`);
  assert.equal(propre.images, 1);
});

test("les images se comptent une par une", () => {
  // Le compte est ce qui permet de dire qu'on n'a pas lu quelque chose
  // (règle 5) : s'il s'arrête à un, un message de dix-huit images en annonce
  // une et ment.
  const propre = leProposNettoye(
    "[cid:a@1] au milieu [cid:b@2] du texte [cid:c@3] encore"
  );
  assert.equal(propre.images, 3);
});

test("une ligne qui ne porte plus que des images s'en va", () => {
  // Une signature d'entreprise pose ses logos sur une ligne à elle : la garder
  // laisserait « (image) (image) (image) » dans le propos.
  const propre = leProposNettoye(corps(
    "La cote est arrêtée à 12,40.",
    "[cid:logo@1] [cid:certif@2]",
    "Bien cordialement"
  ));
  assert.equal(propre.texte, corps("La cote est arrêtée à 12,40.", "Bien cordialement"));
  assert.equal(propre.images, 2, "elle s'en va, mais après avoir été comptée");
});

// ── Le bandeau d'une passerelle ────────────────────────────────────────────

test("un bandeau de sécurité n'est de personne et s'en va", () => {
  const propre = leProposNettoye(corps(
    "EXTERNAL SENDER: soyez prudent avant d'ouvrir les pièces jointes.",
    "",
    "La cote est arrêtée à 12,40."
  ));
  assert.equal(propre.texte, "La cote est arrêtée à 12,40.");
  assert.equal(propre.bandeaux, 1);
});

test("le bandeau se reconnaît aussi en français", () => {
  const propre = leProposNettoye(corps(
    "EXPEDITEUR EXTERNE : ce message vient de l'extérieur.",
    "La cote est arrêtée à 12,40."
  ));
  assert.equal(propre.texte, "La cote est arrêtée à 12,40.");
  assert.equal(propre.bandeaux, 1);
});

test("une phrase qui parle d'un intervenant extérieur n'est pas un bandeau", () => {
  // « externe » est un mot du métier : un lot peut être confié à une entreprise
  // extérieure, et la phrase qui le dit est du propos.
  const phrase = "Le lot CVC est confié à une entreprise externe : NOVACLIM.";
  const propre = leProposNettoye(phrase);
  assert.equal(propre.texte, phrase);
  assert.equal(propre.bandeaux, 0);
});

// ── Les lignes de coordonnées ──────────────────────────────────────────────

test("une ligne qui n'est qu'un numéro de téléphone s'en va", () => {
  const propre = leProposNettoye(corps(
    "Bien cordialement",
    "Tél. : +33 1 23 45 67 89",
    "Mob : 06 12 34 56 78"
  ));
  assert.equal(propre.texte, "Bien cordialement");
});

test("une phrase qui annonce un appel reste", () => {
  // Elle porte un engagement ; la couper le perdrait.
  const phrase = "Je vous appelle au 06 12 34 56 78 demain matin pour arrêter la cote.";
  assert.equal(leProposNettoye(phrase).texte, phrase);
});

test("une ligne qui n'est qu'une adresse de site s'en va", () => {
  const propre = leProposNettoye(corps(
    "Bien cordialement",
    "www.novaclim.example",
    "Site : https://www.novaclim.example"
  ));
  assert.equal(propre.texte, "Bien cordialement");
});

test("une ligne qui porte une adresse et une phrase reste entière", () => {
  const phrase = "La notice est sur www.novaclim.example, à la page 4.";
  assert.equal(leProposNettoye(phrase).texte, phrase);
});

// ── Ce qu'on ne coupe pas ──────────────────────────────────────────────────

test("la signature reste, et ce qui vit dessous avec elle", () => {
  // L'arbitrage du module, appuyé sur un cas réel : sous une signature se
  // trouvait une absence de six semaines, qui est une contrainte de planning.
  // Couper à la formule de politesse l'aurait emportée.
  const propre = leProposNettoye(corps(
    "La cote est arrêtée à 12,40.",
    "",
    "Bien cordialement",
    "Ourdine Ferrand",
    "Responsable travaux — NOVACLIM",
    "Je serai en congés du 27/07 au 06/09."
  ));
  assert.ok(propre.texte.includes("Je serai en congés du 27/07 au 06/09."));
  assert.ok(propre.texte.includes("Bien cordialement"));
  assert.ok(propre.texte.includes("Ourdine Ferrand"));
});

test("un texte sans rien à retirer ressort identique", () => {
  const phrase = corps(
    "La cote du dallage est arrêtée à 12,40 NGF.",
    "",
    "Le calepinage suivra lundi."
  );
  const propre = leProposNettoye(phrase);
  assert.equal(propre.texte, phrase);
  assert.deepEqual(
    { redirections: propre.redirections, images: propre.images,
      bandeaux: propre.bandeaux, liensDoubles: propre.liensDoubles },
    { redirections: 0, images: 0, bandeaux: 0, liensDoubles: 0 }
  );
});

test("rien qui entre ne fait rien sortir", () => {
  const vide = { texte: "", redirections: 0, images: 0, bandeaux: 0, liensDoubles: 0 };
  assert.deepEqual(leProposNettoye(""), vide);
  assert.deepEqual(leProposNettoye(null), vide);
});

test("les blancs laissés par ce qu'on retire ne creusent pas de trou", () => {
  const propre = leProposNettoye(corps(
    "EXTERNAL SENDER: prudence.",
    "",
    "",
    "La cote est arrêtée à 12,40.",
    "",
    "[cid:logo@1]",
    "",
    "",
    "",
    "Bien cordialement"
  ));
  assert.equal(
    propre.texte,
    corps("La cote est arrêtée à 12,40.", "", "Bien cordialement")
  );
});

test("un saut de ligne voulu par l'auteur reste", () => {
  // On resserre les trous qu'on creuse, pas les paragraphes qu'il a écrits.
  const phrase = corps("La cote est arrêtée.", "", "Le calepinage suivra.");
  assert.equal(leProposNettoye(phrase).texte, phrase);
});

// ── Un courriel réel finit ses lignes par \r\n ─────────────────────────────

const enCourriel = (...lignes) => lignes.join("\r\n");

test("le bandeau s'en va aussi quand les lignes finissent par un retour chariot", () => {
  // **L'épreuve que les autres ne faisaient pas.** RFC 5322 impose `\r\n`, et
  // le point d'une expression régulière ne s'applique pas au retour chariot :
  // un `.*$` s'arrêtait avant le `\r` et ne trouvait jamais la fin de ligne.
  // Écrites en `\n`, toutes les épreuves passaient ; sur un fil réel, pas un
  // bandeau n'était retiré.
  const propre = leProposNettoye(enCourriel(
    "EXTERNAL SENDER: Do not click any links or open any attachments.",
    "EXPEDITEUR EXTERNE: Ne cliquez sur aucun lien.",
    "",
    "La cote est arrêtée à 12,40."
  ));
  assert.equal(propre.bandeaux, 2);
  assert.equal(propre.texte.includes("EXTERNAL SENDER"), false);
  assert.equal(propre.texte.includes("EXPEDITEUR EXTERNE"), false);
});

test("les autres règles de ligne tiennent aussi en retour chariot", () => {
  // Le pendant : une règle qui ne tomberait qu'en `\n` ne sert à rien.
  const propre = leProposNettoye(enCourriel(
    "La cote est arrêtée à 12,40.",
    "Tél. : +33 1 23 45 67 89",
    "www.novaclim.example",
    "[cid:logo@1]",
    "Bien cordialement"
  ));
  assert.equal(propre.texte.includes("+33 1 23 45 67 89"), false);
  assert.equal(propre.texte.includes("www.novaclim.example"), false);
  assert.equal(propre.texte.includes(MARQUE_DUNE_IMAGE), false, "la ligne d'image s'en va");
  assert.equal(propre.images, 1, "mais elle a été comptée");
  assert.ok(propre.texte.includes("Bien cordialement"));
});

test("une redirection se déplie aussi en retour chariot", () => {
  const propre = leProposNettoye(enCourriel(
    "Voir : https://urldefense.com/v3/__https://a.example/1__;!!x$",
    "Bien cordialement"
  ));
  assert.equal(propre.redirections, 1);
  assert.ok(propre.texte.includes("https://a.example/1"));
});

// ── La queue qu'une messagerie colle derrière un lien ──────────────────────

test("l'adresse recopiée derrière un lien s'en va, et se compte", () => {
  // Outlook écrit sa version texte en posant l'adresse derrière son texte.
  // Personne ne l'a tapée, et elle double chaque lien du message.
  const propre = leProposNettoye(
    "Voir le guide<https://www.novaclim.example/guide> avant vendredi."
  );
  assert.equal(propre.texte, "Voir le guide avant vendredi.");
  assert.equal(propre.liensDoubles, 1);
});

test("une adresse recopiée derrière elle-même s'en va aussi", () => {
  const propre = leProposNettoye(
    "De : Ourdine Ferrand <o.ferrand@novaclim.example<mailto:o.ferrand@novaclim.example>>"
  );
  assert.equal(propre.texte, "De : Ourdine Ferrand <o.ferrand@novaclim.example>");
  assert.equal(propre.liensDoubles, 1);
});

test("un en-tête cité reste lisible : c'est là tout l'enjeu", () => {
  // Sans cela, l'adresse ne se découpe plus du nom, et **la même personne
  // prend deux identités** dans le fil — puis se retrouve en désaccord avec
  // elle-même.
  const propre = leProposNettoye(
    "De : Ourdine Ferrand <o.ferrand@novaclim.example<mailto:o.ferrand@novaclim.example>>"
  );
  assert.ok(/<o\.ferrand@novaclim\.example>$/.test(propre.texte));
  assert.equal(propre.texte.includes("mailto:"), false);
});

test("une adresse écrite normalement garde la sienne", () => {
  // Ce qui la protège est le schéma : l'adresse d'un en-tête cité s'écrit sans
  // `mailto:` devant. Sans cela, on couperait l'adresse de tous les en-têtes
  // cités, et il n'y aurait plus d'auteur du tout.
  const entete = "De : Ourdine Ferrand <o.ferrand@novaclim.example>";
  const propre = leProposNettoye(entete);
  assert.equal(propre.texte, entete);
  assert.equal(propre.liensDoubles, 0);
});

test("une adresse que l'auteur a posée entre chevrons reste", () => {
  // La convention d'un courriel en texte brut : on encadre une adresse pour la
  // donner à lire. C'est ce que l'espace protège — et non l'en-tête cité, qui
  // n'a pas de schéma.
  const phrase = "Le guide est ici <https://www.novaclim.example/guide>, page 4.";
  const propre = leProposNettoye(phrase);
  assert.equal(propre.texte, phrase);
  assert.equal(propre.liensDoubles, 0);
});

test("le lien d'une image s'en va avec son espace", () => {
  // La marque est la nôtre : rien ne se perd à retirer l'adresse d'un logo.
  const propre = leProposNettoye("[cid:logo@1] <https://www.novaclim.example/> et la suite");
  assert.equal(propre.texte, `${MARQUE_DUNE_IMAGE} et la suite`);
  assert.equal(propre.images, 1);
  assert.equal(propre.liensDoubles, 1);
});

test("une ligne de logos liés disparaît entièrement", () => {
  // Le cas réel : un pied de signature pose ses logos sur une ligne à lui,
  // chacun portant l'adresse du site. Une fois les adresses parties, la ligne
  // n'est plus que des marques, et elle s'en va.
  const propre = leProposNettoye([
    "La cote est arrêtée à 12,40.",
    "[cid:logo@1]<https://www.novaclim.example/>  [cid:rs@2] <https://www.novaclim.example/rs>",
    "Bien cordialement"
  ].join("\n"));
  assert.equal(propre.texte, "La cote est arrêtée à 12,40.\nBien cordialement");
  assert.equal(propre.images, 2);
  assert.equal(propre.liensDoubles, 2);
});

test("une redirection cachée dans une queue ne se compte pas comme dépliée", () => {
  // La queue part avant : déplier une adresse qu'on s'apprête à retirer la
  // compterait comme une redirection du propos, alors qu'elle n'en était pas.
  const propre = leProposNettoye(
    "le guide<https://urldefense.com/v3/__https://a.example/1__;!!x$> ok"
  );
  assert.equal(propre.texte, "le guide ok");
  assert.equal(propre.liensDoubles, 1);
  assert.equal(propre.redirections, 0);
});

test("une redirection que l'auteur voit se déplie quand même", () => {
  // Le pendant : ce qui est dans le texte lu par un humain reste à déplier.
  const propre = leProposNettoye("Voir https://urldefense.com/v3/__https://a.example/1__;!!x$ ok");
  assert.equal(propre.redirections, 1);
  assert.ok(propre.texte.includes("https://a.example/1"));
});
