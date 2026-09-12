import test from "node:test";
import assert from "node:assert/strict";

import {
  PHRASES_DU_VERDICT, TON_DU_VERDICT, VERDICT, degatsDeLaRestitution, ligneAbimee,
  pagesAbimees, verdictDesDegats
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
