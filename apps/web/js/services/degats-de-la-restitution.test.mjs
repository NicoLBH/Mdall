import test from "node:test";
import assert from "node:assert/strict";

import {
  PHRASES_DU_VERDICT, TON_DU_VERDICT, VERDICT, degatsDeLaRestitution, deplacements,
  formeDeLaRestitution, ligneAbimee, pagesAbimees, titresInventes, verdictDesDegats
} from "./degats-de-la-restitution.js";

/* ── Reconnaître une phrase découpée à la verticale ──────────────────────── */

/**
 * **Le défaut, tel qu'il se constate sur un compte rendu réel.** L'outil a cru
 * voir six colonnes là où il n'y avait qu'une cellule large, et il a coupé les
 * phrases au milieu des mots — le caractère de la coupe se répétant de part et
 * d'autre.
 */
test("une phrase coupée en plein milieu d'un mot se reconnaît", () => {
  assert.equal(ligneAbimee(
    "|Remarques :  04/03 : Point travau|ux devant l'hôtel en lien avec|c le voisin :|Pour le|"
  ), true);
  assert.equal(ligneAbimee("|Travaux sur la voirie|ie entre hôtel et chemin d'accès|"), true);
});

/**
 * **Et surtout : un tableau honnête ne doit pas se faire accuser.** Une cellule
 * qui suit une autre commence par une majuscule, un chiffre, une croix ou rien
 * — jamais par une minuscule qui prolonge un mot.
 *
 * La règle a été éprouvée sur un compte rendu réel de onze pages : elle a
 * trouvé les trois pages abîmées et **aucune** des huit pages saines, tableaux
 * de contacts et de présences compris.
 */
test("un tableau honnête ne se fait pas accuser", () => {
  const honnetes = [
    "|N°|Lot|Observation|Entreprise|Délai|État|",
    "|12.1|Gros œuvre|Reprise des réservations|SOGEA|15/09/2026|En cours|",
    "|Maître d'ouvrage|X| |X|",
    "|09 – Étanchéité|  |EXC| |",
    "|---|---|---|---|",
    "|EFFECTIF CHANTIER|RETARD REMISE DE DOCUMENT|RETARD PENALISABLE|",
    "|Remarques compte-rendu :  Sans objet|Pour le|Statut|"
  ];

  for (const ligne of honnetes) {
    assert.equal(ligneAbimee(ligne), false, `accusée à tort : ${ligne}`);
  }
});

test("ce qui n'est pas une ligne de tableau n'est jamais abîmé", () => {
  assert.equal(ligneAbimee("# Lot 03 – Terrassement"), false);
  assert.equal(ligneAbimee("- 30/03 : Nous notons que le dépôt se fera demain"), false);
  assert.equal(ligneAbimee(""), false);
  assert.equal(ligneAbimee(null), false);
});

/* ── La mesure, page par page ────────────────────────────────────────────── */

const ABIMEE = "|Remarques :  30/03 : Point travau|ux devant l'hôtel en lien avec|c le voisin :|";
const SAINE = "|12.1|Gros œuvre|Reprise des réservations|SOGEA|15/09/2026|En cours|";

test("les dégâts se comptent par page, et se situent", () => {
  const degats = degatsDeLaRestitution([
    { page: 1, markdown: `# Lot 01\n\n${SAINE}` },
    { page: 2, markdown: `# Lot 02\n\n${ABIMEE}` },
    { page: 3, markdown: "# Lot 03\n\nSans objet." }
  ]);

  assert.equal(degats.pages.length, 3);
  assert.equal(degats.pages[0].abimes, 0);
  assert.ok(degats.pages[1].abimes > 0);
  assert.equal(degats.pages[2].abimes, 0);
  assert.deepEqual(pagesAbimees(degats).map((page) => page.page), [2]);
});

/**
 * **C'est la part des points à suivre qui décide, et non celle des
 * caractères.** Les lots qui n'ont rien à dire écrivent « Sans objet » et se
 * restituent parfaitement : ils gonflent le document de texte sain sans rien
 * apporter. Sur le compte rendu d'essai, dix pour cent de caractères abîmés
 * valaient **un point daté sur cinq**.
 */
test("les points datés perdus se comptent à part des caractères", () => {
  const degats = degatsDeLaRestitution([
    // Beaucoup de texte sain, sans un seul point à suivre.
    { page: 1, markdown: `# Lot 01\n\n${"Sans objet. ".repeat(40)}` },
    // Peu de texte, mais deux points datés dedans.
    { page: 2, markdown: `|30/03 : Nous noton|ns que vous prévoyez le 04/04 : dépos|se|` }
  ]);

  assert.ok(degats.part < degats.partDesPoints,
    "la part de caractères doit sous-estimer la perte réelle");
  assert.equal(degats.pointsAbimes, 2);
  assert.equal(degats.pointsLisibles, 0);
  assert.equal(degats.partDesPoints, 1);
});

test("une page sans numéro ne compte pas, et une restitution vide ne divise pas par zéro", () => {
  assert.equal(degatsDeLaRestitution([{ page: null, markdown: ABIMEE }]).pages.length, 0);

  const rien = degatsDeLaRestitution([]);
  assert.equal(rien.part, 0);
  assert.equal(rien.partDesPoints, 0);
  assert.deepEqual(pagesAbimees(rien), []);
});

/* ── Le verdict ──────────────────────────────────────────────────────────── */

/**
 * Les seuils sont arbitraires et assumés comme tels : ils nomment ce qu'on
 * voit, pour qu'une décision se prenne sur un mot plutôt que sur une
 * impression. **Rien n'est écarté sur ce verdict.**
 */
test("le verdict nomme sans décider", () => {
  const intacte = degatsDeLaRestitution([{ page: 1, markdown: SAINE }]);
  assert.equal(verdictDesDegats(intacte), VERDICT.INTACTE);

  const abimee = degatsDeLaRestitution([{ page: 1, markdown: ABIMEE }]);
  assert.equal(verdictDesDegats(abimee), VERDICT.ABIMEE);

  // Un point abîmé noyé dans quarante points sains : entamée, pas abîmée.
  const entamee = degatsDeLaRestitution([
    { page: 1, markdown: Array.from({ length: 40 }, (_, rang) => `- 0${rang % 9 + 1}/03 : un point`).join("\n") },
    { page: 2, markdown: "|30/03 : Nous noton|ns que c'est coupé|" }
  ]);
  assert.equal(verdictDesDegats(entamee), VERDICT.ENTAMEE);
});

test("chaque verdict a sa phrase et son ton", () => {
  for (const verdict of Object.values(VERDICT)) {
    assert.ok(PHRASES_DU_VERDICT[verdict], `le verdict « ${verdict} » n'a pas de phrase`);
    assert.ok(TON_DU_VERDICT[verdict], `le verdict « ${verdict} » n'a pas de ton`);
  }
  // Le verdict le plus grave ne dit pas « jetez », il dit « pas telle quelle ».
  assert.match(PHRASES_DU_VERDICT[VERDICT.ABIMEE], /telle quelle/);
});

/* ── Les titres inventés ─────────────────────────────────────────────────── */

/**
 * **Constaté sur un compte rendu réel** : le modèle avait ajouté un en-tête de
 * page qui ne figure nulle part dans le PDF. Le compteur de mots ajoutés ne le
 * voit pas — tous ces mots existent ailleurs dans le document.
 *
 * C'est pourtant le pire endroit où inventer : **un titre organise**. Il devient
 * la rubrique d'un point, donc le titre d'un sujet, donc une ligne de la mémoire
 * du projet — pour une section qui n'a jamais existé.
 */
test("un titre que le document ne porte pas se voit", () => {
  const origine = "Réunion de chantier du 30/03/2026\nLot 03 – Terrassement\nReprise étanchéité.";

  assert.deepEqual(
    titresInventes(origine, "# Rapport du : 30/03/2026 Page 1\n\n## Lot 03 – Terrassement"),
    ["Rapport du : 30/03/2026 Page 1"]
  );
});

test("un titre qui figure dans le document ne se fait pas accuser", () => {
  const origine = "Réunion de chantier du 30/03/2026\nLot 03 – Terrassement – MONT BLANC";

  // Y compris quand le PDF l'a coupé sur deux lignes, ou l'a mis en gras.
  assert.deepEqual(titresInventes(origine, "## Lot 03 – Terrassement – MONT BLANC"), []);
  assert.deepEqual(titresInventes(origine, "## **Lot 03 – Terrassement**"), []);
  assert.deepEqual(titresInventes("Lot 03\n– Terrassement", "## Lot 03 – Terrassement"), []);
});

test("ce qui n'est pas un titre n'est jamais accusé", () => {
  const origine = "Rien de commun.";
  assert.deepEqual(titresInventes(origine, "un paragraphe ordinaire\n|une|cellule|"), []);
  assert.deepEqual(titresInventes(origine, "#pas-un-titre-sans-espace"), []);
});

/* ── Les blocs déplacés ──────────────────────────────────────────────────── */

const UN = "Réunion de chantier numéro 3 du 30 mars 2026, à dix heures";
const DEUX = "Maître d'ouvrage, SCCV du Pré Gaillard, présent et convoqué";
const TROIS = "Lot 03 Terrassement, démarrage planifié au 20 avril, ne pas décaler";

/**
 * **Constaté sur un compte rendu réel** : les tableaux d'intervenants étaient
 * passés avant le titre de la réunion, qui les précède dans le PDF. L'ordre d'un
 * compte rendu n'est pas une opinion — ce qui suit quoi dit ce qui répond à quoi.
 */
test("un bloc remonté avant un autre se compte comme une inversion", () => {
  const origine = `${UN}\n${DEUX}\n${TROIS}`;

  const tenu = deplacements(origine, `${UN}\n${DEUX}\n${TROIS}`);
  assert.equal(tenu.reperes, 3);
  assert.equal(tenu.inversions, 0);
  assert.equal(tenu.part, 0);

  // Le deuxième bloc remonté en tête : il se croise avec les deux autres.
  const croise = deplacements(origine, `${DEUX}\n${UN}\n${TROIS}`);
  assert.equal(croise.inversions, 1);
  assert.ok(croise.part > 0);
});

/**
 * **Zéro inversion sur zéro repère ne prouve rien.** Une restitution dont on ne
 * retrouve aucune ligne dans le document n'a pas un ordre parfait — elle n'a pas
 * d'ordre vérifiable, et les deux ne se disent pas pareil (règle 5).
 */
test("le nombre de repères se rend, pour qu'un zéro ne se lise pas comme un succès", () => {
  const rien = deplacements("un document", "une restitution sans aucun rapport");
  assert.equal(rien.reperes, 0);
  assert.equal(rien.inversions, 0);
  assert.equal(rien.part, 0);
});

test("les lignes trop courtes ne font pas des repères", () => {
  // « X », « 0 », « Statut » se retrouvent partout et ne disent rien de l'ordre.
  assert.equal(deplacements("X 0 Statut ailleurs", "Statut\nX\n0").reperes, 0);
});

/* ── Les deux règles, vérifiées page par page ────────────────────────────── */

/**
 * Une consigne qu'on ne vérifie pas est une intention, pas une règle (règle 12).
 */
test("la forme se vérifie page par page, et nomme les pages déplacées", () => {
  const origine = [
    { page: 1, text: `Réunion du 30/03\n${UN}\n${DEUX}` },
    { page: 2, text: `Lot 03\n${TROIS}` }
  ];
  const refaites = [
    { page: 1, markdown: `# Rapport du : 30/03/2026 Page 1\n\n${DEUX}\n${UN}` },
    { page: 2, markdown: `## Lot 03\n\n${TROIS}` }
  ];

  const forme = formeDeLaRestitution(origine, refaites);

  assert.equal(forme.titresInventes, 1);
  assert.deepEqual(forme.titres, ["Rapport du : 30/03/2026 Page 1"]);
  assert.equal(forme.inversions, 1);
  assert.deepEqual(forme.pagesDeplacees, [1]);
  // La page 2 est en ordre et son titre existe : elle ne signale rien.
  assert.equal(forme.pages.find((page) => page.page === 2).inversions, 0);
});

/**
 * Une page dont on n'a pas l'original ne se vérifie pas — et ne se compte pas
 * comme intacte pour autant : elle n'entre simplement pas (règle 5).
 */
test("une page sans original n'entre pas dans la mesure", () => {
  const forme = formeDeLaRestitution(
    [{ page: 1, text: UN }],
    [{ page: 1, markdown: UN }, { page: 9, markdown: "# Un titre inventé de toutes pièces" }]
  );

  assert.equal(forme.pages.length, 1);
  assert.equal(forme.titresInventes, 0);
});

test("une restitution vide ne divise pas par zéro", () => {
  const forme = formeDeLaRestitution([], []);
  assert.deepEqual(forme.pages, []);
  assert.equal(forme.inversions, 0);
  assert.equal(forme.reperes, 0);
});
