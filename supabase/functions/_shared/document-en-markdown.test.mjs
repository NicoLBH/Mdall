import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSIGNES_DE_RECONSTITUTION, SCHEMA_DU_DOCUMENT, pagesDuTexte, pagesRefaites
} from "./document-en-markdown.js";
import { pagesEnTexte } from "./citation-verifiee.js";

/* ── La consigne ─────────────────────────────────────────────────────────── */

/**
 * **C'est une transcription, pas une lecture.** Une consigne qui laisserait
 * juger rendrait un document déjà interprété, dans lequel on ne pourrait plus
 * distinguer ce que le PDF disait de ce que le modèle en a compris — et c'est
 * exactement cette distinction qu'on vient voir.
 */
test("la consigne interdit de résumer, de reformuler et de compléter", () => {
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Ne résume pas/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Ne reformule pas/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Ne complète pas/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /N'invente pas/);
  // Les tableaux sont la moitié d'un compte rendu de chantier.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /tableaux? Markdown/);
  // Et les nombres en sont la moitié qui coûte cher quand elle bouge.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /caractère pour caractère/);
});

/**
 * **Deux interdits ajoutés après mesure.** Sur un compte rendu réel, la
 * restitution avait inventé un en-tête de page absent du PDF, et remonté les
 * tableaux d'intervenants avant le titre de la réunion qui les précède.
 *
 * Aucune des deux n'est grave en soi. Les deux le deviennent quand on s'y fie :
 * un titre inventé devient une rubrique de sujet qui n'existe pas, et un ordre
 * changé fait perdre la trace de ce qui suit quoi. La consigne était silencieuse
 * là-dessus.
 */
test("la consigne interdit d'inventer un titre et de changer l'ordre", () => {
  assert.match(CONSIGNES_DE_RECONSTITUTION, /N'AJOUTE AUCUN TITRE/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /n'invente pas d'en-tête de page/i);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /GARDE L'ORDRE DU DOCUMENT/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Ne déplace rien/);
});

/**
 * **Une consigne qu'on ne vérifie pas est une intention, pas une règle**
 * (règle 12). Ces deux interdits sont mesurés, et le test le garde : les écrire
 * sans les vérifier reviendrait à espérer qu'ils soient suivis.
 */
test("les deux interdits sont mesurés, pas seulement écrits", async () => {
  const { formeDeLaRestitution } = await import(
    "../../../apps/web/js/services/degats-de-la-restitution.js"
  );

  const origine = [{ page: 1, text: "Réunion de chantier du 30 mars 2026 à dix heures\nLot 03 Terrassement" }];
  const fautive = [{ page: 1, markdown: "# Rapport du : 30/03/2026 Page 1\n\n## Lot 03 Terrassement" }];

  const forme = formeDeLaRestitution(origine, fautive);
  assert.equal(forme.titresInventes, 1);
  assert.deepEqual(forme.titres, ["Rapport du : 30/03/2026 Page 1"]);
});

test("le schéma ne laisse rendre qu'une page et son Markdown", () => {
  const page = SCHEMA_DU_DOCUMENT.schema.properties.pages.items;
  assert.deepEqual(Object.keys(page.properties).sort(), ["markdown", "page"]);
  assert.equal(page.additionalProperties, false);
  assert.deepEqual(page.required.sort(), ["markdown", "page"]);
});

/* ── Les pages qui partent vraiment ──────────────────────────────────────── */

/**
 * **Le plafond coupe en silence.** Un document long part amputé, et le modèle
 * en rend alors une reconstitution très fidèle… d'un document tronqué. On relit
 * donc le texte qui part plutôt que de refaire le calcul de la coupe : deux
 * calculs finiraient par diverger (règle 4).
 */
test("les pages parties se relisent dans le texte qui part", () => {
  const pages = [
    { page: 1, text: "a".repeat(50) },
    { page: 2, text: "b".repeat(50) },
    { page: 3, text: "c".repeat(50) }
  ];

  assert.deepEqual(pagesDuTexte(pagesEnTexte(pages, { maxCaracteres: 120000 })), [1, 2, 3]);

  // Un plafond qui ne laisse passer que les deux premières.
  const coupe = pagesDuTexte(pagesEnTexte(pages, { maxCaracteres: 140 }));
  assert.deepEqual(coupe, [1, 2]);
});

test("une page sans texte ne part pas, et ne se compte donc pas", () => {
  const parties = pagesDuTexte(pagesEnTexte([
    { page: 1, text: "quelque chose" },
    { page: 2, text: "   " }
  ]));
  assert.deepEqual(parties, [1]);
});

/* ── Ce que le modèle rend ───────────────────────────────────────────────── */

test("les pages reviennent dans l'ordre, quelles qu'elles soient dans la réponse", () => {
  const { pages } = pagesRefaites({ pages: [
    { page: 3, markdown: "trois" }, { page: 1, markdown: "un" }
  ] }, [1, 2, 3]);

  assert.deepEqual(pages.map((page) => page.page), [1, 3]);
});

/**
 * **Une page rendue sous un numéro qu'on n'a pas envoyé ne peut être confrontée
 * à rien.** La laisser passer ferait afficher comme « document » une page que le
 * document ne contient pas.
 */
test("une page qu'on n'a pas envoyée est écartée, et nommée", () => {
  const { pages, inconnues } = pagesRefaites({ pages: [
    { page: 1, markdown: "un" }, { page: 9, markdown: "inventée" }
  ] }, [1, 2]);

  assert.deepEqual(pages.map((page) => page.page), [1]);
  assert.deepEqual(inconnues, [9]);
});

/**
 * Une page envoyée dont rien ne revient se nomme : c'est le seul défaut de
 * reconstitution qui ne se voit pas en lisant le résultat (règle 5).
 */
test("une page envoyée dont rien ne revient se nomme", () => {
  const { absentes } = pagesRefaites({ pages: [{ page: 1, markdown: "un" }] }, [1, 2, 3]);
  assert.deepEqual(absentes, [2, 3]);
});

test("une page rendue deux fois ne double pas le document", () => {
  const { pages } = pagesRefaites({ pages: [
    { page: 1, markdown: "le bon" }, { page: 1, markdown: "le second" }
  ] }, [1]);

  assert.equal(pages.length, 1);
  assert.equal(pages[0].markdown, "le bon");
});

/**
 * Une page vide est une **réponse** — « il n'y avait rien à lire ici ». Elle ne
 * se confond pas avec une page absente, et ne doit donc pas être écartée.
 */
test("une page rendue vide est une réponse, pas une absence", () => {
  const { pages, absentes } = pagesRefaites({ pages: [{ page: 1, markdown: "" }] }, [1]);

  assert.equal(pages.length, 1);
  assert.deepEqual(absentes, []);
});

test("une réponse sans pages ne fait rien sortir", () => {
  assert.deepEqual(pagesRefaites(null, [1, 2]).pages, []);
  assert.deepEqual(pagesRefaites({}, [1, 2]).absentes, [1, 2]);
});

/* ── L'appel se compte, et l'on ne lit pas par un chemin non compté ──────── */

/**
 * **Un utilitaire qui lirait par un chemin non compté ferait grossir la facture
 * sans apparaître nulle part** — et c'est précisément ce que le compteur existe
 * pour empêcher (fondamental 13).
 */
test("la fonction dépose sa consommation et garde la clé au serveur", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const fonction = readFileSync(
    fileURLToPath(new URL("../reconstituer-en-markdown/index.ts", import.meta.url)), "utf8"
  );

  assert.match(fonction, /deposerLaConsommation\(\{/);
  assert.match(fonction, /usageKind: "reconstitution-markdown"/);
  // La porte : un jeton présent n'est pas quelqu'un de connu.
  assert.match(fonction, /const garde = await requireUser\(req, corsHeaders\)/);

  const service = readFileSync(
    fileURLToPath(new URL("../../../apps/web/js/services/markdown-par-le-modele.js", import.meta.url)),
    "utf8"
  );
  // Le navigateur n'appelle jamais le modèle lui-même : il ne saurait ni se
  // compter, ni garder la consigne.
  assert.doesNotMatch(service, /api\.openai\.com|OPENAI/);
  assert.match(service, /project_id: await projetCourant\(\)/);
});

/**
 * **Ce que cette fonction rend ne s'exploite pas.** Le document refait sert à
 * être regardé : il n'alimente aucune extraction et n'ouvre aucun sujet — la
 * chaîne qui écrit passe par une proposition (règle 1).
 */
test("la reconstitution n'écrit rien et n'ouvre rien", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  for (const chemin of [
    "../reconstituer-en-markdown/index.ts",
    "../../../apps/web/js/services/markdown-par-le-modele.js",
    "../../../apps/web/js/services/reconstitution-markdown.js"
  ]) {
    const source = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.doesNotMatch(source, /createManualSubject|createSubject|\.insert\(|\.upsert\(/,
      `${chemin} écrit quelque chose`);
  }
});

/* ── Ce que l'étape 1 a ajouté ───────────────────────────────────────────── */

/**
 * **Un tableau perdu est une information perdue.** Le tableau des contacts est
 * le seul endroit d'un compte rendu où le nom, l'entreprise, le courriel et le
 * téléphone d'un intervenant sont réunis. Rendu en liste à puces, on ne sait
 * plus quelle adresse va avec quel nom.
 */
test("la consigne impose qu'un tableau reste un tableau", () => {
  assert.match(CONSIGNES_DE_RECONSTITUTION, /CE QUI EST UN TABLEAU RESTE UN TABLEAU/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /jamais en liste ni en paragraphe/);
  // Le cas qui compte, nommé pour qu'il ne se perde pas dans le général.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /tableau des contacts/);
});

/**
 * **La mise en page peut bouger, les mots non.** Un compte rendu de chantier est
 * une arborescence qui ne dit pas son nom : lot, entreprise, point, reprises des
 * semaines suivantes. La rendre explicite ici évite aux appels suivants de la
 * deviner — et ils devinent moins bien.
 *
 * C'est une porte ouverte, et elle reste étroite : l'autorisation porte sur la
 * forme, l'interdiction sur le fond, et les deux sont dans la même phrase.
 */
test("la consigne autorise la mise en page et interdit toujours les mots", () => {
  assert.match(CONSIGNES_DE_RECONSTITUTION, /TU PEUX CLARIFIER LA MISE EN PAGE, JAMAIS LES MOTS/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /Tu ne peux pas ajouter, retirer ni changer un seul mot/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /FAIS ÉMERGER LA STRUCTURE IMPLICITE/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /imbrique les reprises sous le point/);

  // L'ordre reste intouchable : l'imbrication déplace l'indentation, pas le
  // contenu. Sans cette précision, la porte ouverte à la forme laisserait
  // passer un réordonnancement — le défaut qu'on venait de corriger.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /l'ordre de lecture reste celui du document/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /GARDE L'ORDRE DU DOCUMENT/);
});

/**
 * **Le premier maillon prend le modèle complet.** Tout ce qui suit lit ce qu'il
 * rend, et une erreur de transcription se propage sans jamais se corriger. Le
 * relevé des points, lui, reste sur le petit modèle : il travaille sur un
 * document déjà propre.
 */
test("la transcription emploie le modèle complet, et son tarif est relevé", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const transcription = readFileSync(
    fileURLToPath(new URL("../reconstituer-en-markdown/index.ts", import.meta.url)), "utf8"
  );
  const releve = readFileSync(
    fileURLToPath(new URL("../extract-sujets/index.ts", import.meta.url)), "utf8"
  );

  // La transcription se règle par variable d'environnement — le nom d'un modèle
  // change plus vite que le code — mais son défaut est écrit ici, et c'est lui
  // qui sert au projet.
  const modeleDe = (source) =>
    source.match(/const MODELE = (?:Deno\.env\.get\("[^"]+"\) \|\| )?"([^"]+)"/)?.[1];

  // **Le meilleur modèle pour le premier maillon.** Tout ce qui suit lit ce
  // qu'il rend ; une erreur de transcription se propage sans se corriger.
  assert.equal(modeleDe(transcription), "gpt-5");
  assert.equal(modeleDe(releve), "gpt-4.1-mini");

  // **Un modèle sans tarif relevé afficherait « tarif inconnu ».** C'est voulu —
  // un prix inventé au milieu de prix réels serait pire que pas de prix — mais
  // ce serait ici une négligence, pas une honnêteté.
  const { TARIFS } = await import("../../../apps/web/js/services/consommation-ia.js");
  for (const modele of [modeleDe(transcription), modeleDe(releve)]) {
    assert.ok(TARIFS[modele], `le tarif de « ${modele} » n'est pas relevé`);
  }
});

/**
 * Le plafond d'entrée est calé sur ce qui peut **revenir** : une transcription
 * rend autant de texte qu'elle en reçoit. Envoyer plus que ce que le modèle
 * sait rendre d'un bloc garantirait une réponse coupée au milieu.
 */
test("le plafond d'entrée tient dans ce que le modèle peut rendre", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const fonction = readFileSync(
    fileURLToPath(new URL("../reconstituer-en-markdown/index.ts", import.meta.url)), "utf8"
  );

  const caracteres = Number(fonction.match(/const MAX_CARACTERES = (\d+)/)?.[1]);
  const jetons = Number(fonction.match(/const MAX_JETONS = (\d+)/)?.[1]);
  assert.ok(caracteres > 0 && jetons > 0, "les deux plafonds doivent être déclarés");

  // Un jeton vaut environ quatre caractères de français. Ce qui entre doit
  // pouvoir ressortir — sinon la coupure vient de nous, pas du document.
  assert.ok(caracteres / 4 <= jetons,
    `${caracteres} caractères ne tiennent pas dans ${jetons} jetons de sortie`);

  // Et ce qui n'est pas parti se dit, plutôt que de manquer en silence.
  assert.match(fonction, /hors_plafond/);
});

/* ── La couleur, là où elle est ──────────────────────────────────────────── */

/**
 * **L'erreur la plus grave que la transcription ait commise.**
 *
 * Les passages colorés étaient listés en légende de bas de page. Le modèle les
 * a pris pour du contenu et les a recopiés là, à la fin : des encadrés entiers
 * de fragments sans suite, hors de tout contexte, et le document doublé. La
 * légende a disparu — la couleur se marque maintenant au bout de sa ligne — et
 * la consigne l'interdit en toutes lettres.
 */
test("la consigne interdit de recopier les passages colorés à la fin", async () => {
  const { CONSIGNES_DE_RECONSTITUTION } = await import("./document-en-markdown.js");

  assert.match(CONSIGNES_DE_RECONSTITUTION, /TU NE RECOPIES JAMAIS LES PASSAGES COLORÉS À LA FIN DE LA PAGE/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /La couleur se marque LÀ OÙ LE TEXTE EST/);
  // Et elle explique la marque de fin de ligne, qui n'est pas du texte.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /⟨rouge⟩/);
  assert.match(CONSIGNES_DE_RECONSTITUTION, /ne la recopie jamais telle quelle/);
});

/**
 * Un tableau ne contient pas d'encadré : une cellule colorée reste une cellule.
 * C'est ce qui sortait les dates de leur colonne.
 */
test("la consigne garde les cellules colorées dans leur tableau", async () => {
  const { CONSIGNES_DE_RECONSTITUTION } = await import("./document-en-markdown.js");

  assert.match(CONSIGNES_DE_RECONSTITUTION, /un tableau ne contient pas d'encadré/);
  // Et le bleu des adresses n'est pas une hiérarchisation : c'est un lien.
  assert.match(CONSIGNES_DE_RECONSTITUTION, /UNE COULEUR QUI N'EST QU'UN LIEN N'EST PAS UNE HIÉRARCHISATION/);
});
