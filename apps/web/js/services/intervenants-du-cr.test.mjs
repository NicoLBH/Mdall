import test from "node:test";
import assert from "node:assert/strict";

import {
  CONNU, aQuiRevientLePoint, intervenantsDuCompteRendu, lotDuProjetPour, nomPourLeRepertoire,
  phraseDuConnu, societeAplatie
} from "./intervenants-du-cr.js";

/*
 * Aucune donnée réelle ici : les sociétés sont des lettres grecques et les
 * personnes des initiales. Un jeu d'essai qui emporterait le carnet d'adresses
 * d'un chantier réel serait un jeu d'essai qu'on ne peut pas publier.
 */
const lu = (champs = {}) => ({
  key: "intervenant:alpha",
  societe: "SARL ALPHA",
  nom: "M. A.",
  role: "lot 02 — gros œuvre",
  provenance: { source_id: "cr-1", page: 1, excerpt: "…" },
  ...champs
});

/* ── Reconnaître une société ─────────────────────────────────────────────── */

/**
 * « SARL Alpha » et « Alpha SAS » sont la même maison sous deux plumes. Les
 * garder séparées ferait deux lignes dans la liste, et deux personnes à qui
 * assigner le même lot.
 */
test("la forme juridique ne distingue pas deux entreprises", () => {
  assert.equal(societeAplatie("SARL ALPHA"), societeAplatie("Alpha SAS"));
  assert.equal(societeAplatie("Ets Bêta"), societeAplatie("BETA"));
});

test("les accents et la ponctuation non plus", () => {
  assert.equal(societeAplatie("Béton  du Sud"), societeAplatie("BETON-DU-SUD"));
});

/**
 * Une raison sociale qui n'est **que** sa forme juridique ne doit pas
 * s'évaporer : mieux vaut un repère faible qu'aucun repère.
 */
test("une société réduite à sa forme juridique garde quelque chose", () => {
  assert.notEqual(societeAplatie("SARL"), "");
});

/* ── Ce qu'un compte rendu propose d'ajouter ─────────────────────────────── */

test("une société que le projet ne connaît pas est proposée", () => {
  const tri = intervenantsDuCompteRendu({ lus: [lu()], collaborateurs: [] });

  assert.equal(tri.proposes.length, 1);
  assert.equal(tri.proposes[0].societe, "SARL ALPHA");
  assert.equal(tri.proposes[0].nom, "M. A.");
  assert.deepEqual(tri.deja, []);
});

test("une société déjà au projet n'est pas reproposée, et on dit pourquoi", () => {
  const tri = intervenantsDuCompteRendu({
    lus: [lu()],
    collaborateurs: [{ id: "collab-1", company: "Alpha SAS", status: "Actif" }]
  });

  assert.deepEqual(tri.proposes, []);
  assert.equal(tri.deja[0].motif, CONNU.DEJA_AU_PROJET);
  assert.equal(tri.deja[0].collaborateur.id, "collab-1");
  assert.match(phraseDuConnu(CONNU.DEJA_AU_PROJET), /déjà au projet/);
});

/**
 * Un collaborateur retiré du projet n'y est plus. Le compter ferait manquer le
 * jour où une entreprise écartée revient sur le chantier.
 */
test("un collaborateur retiré ne fait pas écran", () => {
  const tri = intervenantsDuCompteRendu({
    lus: [lu()],
    collaborateurs: [{ id: "collab-1", company: "Alpha SAS", status: "Retiré" }]
  });

  assert.equal(tri.proposes.length, 1);
});

/**
 * Un compte rendu nomme l'entreprise seule dans un en-tête de lot, et la
 * personne dans la liste des présents. Garder la première rencontre perdrait
 * le nom.
 */
test("deux mentions de la même société n'en font qu'une, la plus complète", () => {
  const tri = intervenantsDuCompteRendu({
    lus: [
      lu({ nom: "", role: "lot 02" }),
      lu({ nom: "M. A. B.", role: "" })
    ],
    collaborateurs: []
  });

  assert.equal(tri.proposes.length, 1);
  assert.equal(tri.proposes[0].nom, "M. A. B.");
  assert.equal(tri.proposes[0].role, "lot 02");
  assert.equal(tri.deja[0].motif, CONNU.DANS_LE_LOT);
});

test("une ligne sans société n'est pas un intervenant", () => {
  const tri = intervenantsDuCompteRendu({ lus: [lu({ societe: "  " })], collaborateurs: [] });
  assert.deepEqual(tri.proposes, []);
});

test("sans rien lui donner, rien à proposer", () => {
  assert.deepEqual(intervenantsDuCompteRendu(), { proposes: [], deja: [] });
});

/* ── À qui revient un point ──────────────────────────────────────────────── */

const EQUIPE = [
  { id: "c-1", company: "SARL ALPHA", projectLotLabel: "Lot 02 — Gros œuvre", status: "Actif" },
  { id: "c-2", company: "Bêta Couverture", projectLotLabel: "Lot 05 — Couverture", status: "Actif" }
];

test("le point désigne une entreprise que le projet connaît", () => {
  assert.equal(aQuiRevientLePoint({ qui: "SARL ALPHA" }, EQUIPE)?.id, "c-1");
});

test("le point désigne un lot, et le lot désigne quelqu'un", () => {
  assert.equal(aQuiRevientLePoint({ qui: "", lot: "Lot 05 — Couverture" }, EQUIPE)?.id, "c-2");
});

/**
 * **Ne pas choisir entre deux.** Assigner au premier venu mettrait un travail
 * sur le dos de quelqu'un sans que personne l'ait décidé, et le vrai
 * destinataire ne verrait jamais le point. Un sujet sans assigné se corrige en
 * un clic ; un sujet assigné à la mauvaise entreprise se découvre trois
 * semaines plus tard.
 */
test("deux correspondances aussi bonnes n'en désignent aucune", () => {
  const ambigu = [
    { id: "c-1", company: "Alpha", projectLotLabel: "Lot 02", status: "Actif" },
    { id: "c-2", company: "Alpha", projectLotLabel: "Lot 03", status: "Actif" }
  ];

  assert.equal(aQuiRevientLePoint({ qui: "Alpha" }, ambigu), null);
});

/**
 * Le mot doit être entier : « SA » ne doit pas reconnaître « SANITAIRE », et
 * une correspondance par fragment assignerait des points au hasard.
 */
test("une société ne se reconnaît pas dans un fragment d'un autre mot", () => {
  const equipe = [{ id: "c-1", company: "SA", projectLotLabel: "", status: "Actif" }];
  assert.equal(aQuiRevientLePoint({ qui: "lot sanitaire" }, equipe), null);
});

test("un point qui ne désigne personne ne désigne personne", () => {
  assert.equal(aQuiRevientLePoint({ qui: "Entreprise Gamma" }, EQUIPE), null);
  assert.equal(aQuiRevientLePoint({ qui: "" }, EQUIPE), null);
  assert.equal(aQuiRevientLePoint(null, EQUIPE), null);
});

test("un collaborateur retiré ne reçoit plus de points", () => {
  const partis = [{ id: "c-1", company: "SARL ALPHA", projectLotLabel: "", status: "Retiré" }];
  assert.equal(aQuiRevientLePoint({ qui: "SARL ALPHA" }, partis), null);
});

/* ── Le vocabulaire ──────────────────────────────────────────────────────── */

test("aucun mot des intervenants ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  for (const motif of Object.values(CONNU)) {
    for (const interdit of [/visa/i, /à valider/i, /approbation/i]) {
      assert.doesNotMatch(phraseDuConnu(motif), interdit);
    }
  }
});

/* ── Sous quel lot ranger une entreprise ─────────────────────────────────── */

const LOTS = [
  { id: "lot-a", code: "02", label: "Gros œuvre", activated: true },
  { id: "lot-b", code: "05", label: "Couverture", activated: true }
];

test("le lot se reconnaît à son libellé", () => {
  assert.equal(lotDuProjetPour("Lot 02 — GROS ŒUVRE", LOTS)?.id, "lot-a");
});

test("à défaut de libellé, à son code", () => {
  assert.equal(lotDuProjetPour("lot 05", LOTS)?.id, "lot-b");
});

/**
 * **Aucun lot ne s'invente.** Un lot que le projet n'a pas activé ne s'active
 * pas parce qu'un document le mentionne : ce serait changer les paramètres du
 * projet par un dépôt de fichier, exactement ce qu'on refuse ailleurs.
 */
test("un lot que le projet n'a pas activé ne compte pas", () => {
  const eteints = [{ id: "lot-c", code: "09", label: "Peinture", activated: false }];
  assert.equal(lotDuProjetPour("lot 09 — peinture", eteints), null);
});

test("un rôle qui ne désigne aucun lot n'en désigne aucun", () => {
  assert.equal(lotDuProjetPour("maîtrise d'ouvrage", LOTS), null);
  assert.equal(lotDuProjetPour("", LOTS), null);
});

test("deux lots aussi plausibles n'en désignent aucun", () => {
  const jumeaux = [
    { id: "lot-a", code: "02", label: "Gros œuvre", activated: true },
    { id: "lot-b", code: "03", label: "Gros œuvre", activated: true }
  ];
  assert.equal(lotDuProjetPour("gros œuvre", jumeaux), null);
});

/* ── Comment une personne s'écrit dans le répertoire ─────────────────────── */

/**
 * **Ce n'est pas un état civil.** Un compte rendu écrit « M. A. », rarement un
 * prénom et un nom séparés. Découper au premier espace donnerait « M. » comme
 * prénom sur la moitié des lignes, et ce prénom s'afficherait partout.
 */
test("la civilité ne devient pas un prénom", () => {
  assert.deepEqual(nomPourLeRepertoire({ nom: "M. A." }), { firstName: "", lastName: "A." });
  assert.deepEqual(nomPourLeRepertoire({ nom: "Mme B. Gamma" }), { firstName: "", lastName: "B. Gamma" });
});

/**
 * Une entreprise dont on ne connaît personne existe quand même sur le chantier,
 * et des points lui reviennent : c'est la société qui porte alors la ligne.
 */
test("sans personne nommée, la société porte la ligne", () => {
  assert.deepEqual(
    nomPourLeRepertoire({ nom: "", societe: "SARL ALPHA" }),
    { firstName: "", lastName: "SARL ALPHA" }
  );
});

test("une civilité seule ne vide pas la ligne", () => {
  assert.equal(nomPourLeRepertoire({ nom: "M." }).lastName, "M.");
});

/* ── Le point trouve son entreprise par le code du lot ───────────────────── */

test("un point qui n'écrit que le numéro de lot trouve quand même", () => {
  const equipe = [{ id: "c-1", company: "Alpha", role: "Gros œuvre", roleCode: "02", status: "Actif" }];
  assert.equal(aQuiRevientLePoint({ qui: "", lot: "Lot 02" }, equipe)?.id, "c-1");
});

/* ── La chaîne, d'un bout à l'autre ──────────────────────────────────────── */

const lire = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

/**
 * **Aucune exception à la règle 1.** L'utilisateur envisageait d'en faire une
 * pour ajouter des collaborateurs depuis un compte rendu. Elle n'était pas
 * nécessaire : le compte rendu arrive déjà par une proposition, et une société
 * y devient une ligne comme les autres — cochée, refusée, signée à la fusion.
 *
 * Ce test garde cette porte. Le jour où quelqu'un ajoutera un collaborateur
 * ailleurs qu'à la fusion, il faudra le vouloir explicitement.
 */
test("une société n'entre au projet qu'à la fusion d'une proposition", async () => {
  const vue = await lire("../views/project-propositions.js");

  assert.match(vue, /\.\.\.intervenantItems\(analyse\.intervenants \?\? \[\]\)/);
  assert.match(vue, /entry\.itemType === ITEM_TYPE\.INTERVENANT && entry\.status !== ITEM\.REFUSED/);
  assert.match(vue, /await ajouterLesIntervenantsRetenus\(root, proposition, items\)/);
});

/**
 * Les sociétés entrent **avant** les sujets : un sujet ne peut être assigné
 * qu'à quelqu'un qui existe, et l'ordre inverse laisserait chaque point du
 * premier compte rendu sans destinataire.
 */
test("les sociétés entrent avant que les sujets ne s'ouvrent", async () => {
  const vue = await lire("../views/project-propositions.js");

  const societes = vue.indexOf("await ajouterLesIntervenantsRetenus(root, proposition, items)");
  const sujets = vue.indexOf("await ouvrirLesSujetsRetenus(root, proposition, items)");

  assert.ok(societes >= 0 && sujets >= 0);
  assert.ok(societes < sujets, "les sujets s'ouvrent avant que leurs destinataires n'existent");
});

test("le serveur lit les intervenants, et les vérifie comme le reste", async () => {
  const modele = await lire("../../../../supabase/functions/_shared/sujets-du-modele.js");
  const fonction = await lire("../../../../supabase/functions/extract-sujets/index.ts");

  assert.match(modele, /intervenants: \{/);
  assert.match(modele, /export function verifierLesIntervenants/);
  // La citation est le garde-fou : un intervenant inventé est une entreprise
  // qui n'existe pas sur ce chantier.
  assert.match(modele, /estVide: \(ligne\) => !String\(ligne\?\.societe \?\? ""\)\.trim\(\)/);
  assert.match(fonction, /verifierLesIntervenants\(\{/);

  // Aucune adresse, aucun téléphone : ils ne servent à rien ici et n'ont pas à
  // voyager.
  assert.match(modele, /Ne relève pas d'adresse électronique ni de numéro de téléphone/);
});

test("le sujet ouvert se voit assigner son entreprise", async () => {
  const vue = await lire("../views/project-propositions.js");

  assert.match(vue, /await assignerLesSujets\(nes\)/);
  assert.match(vue, /aQuiRevientLePoint\(point, collaborateurs\)/);
  assert.match(vue, /addSubjectAssignee\(subjectId, personId\)/);
});

/**
 * **Une personne sans adresse existe.** Un compte rendu n'en donne pas, et il
 * ne faut pas en inventer une : un courriel plausible dans un annuaire de
 * personnes réelles finirait par recevoir du courrier, ou par entrer en
 * collision avec une vraie adresse.
 *
 * Deux portes, deux exigences : celle des paramètres exige une adresse pour
 * inviter quelqu'un à se connecter, celle des documents n'en demande pas.
 */
test("une société entre sans qu'on lui invente une adresse", async () => {
  const vue = await lire("../views/project-propositions.js");
  const base = await lire("./project-supabase-sync.js");

  assert.match(vue, /addProjectCollaboratorFromDocument\(\{/);
  assert.match(base, /export async function addProjectCollaboratorFromDocument/);
  assert.match(base, /email: null/);

  // La porte des paramètres garde son exigence.
  assert.match(base, /throw new Error\("Adresse mail invalide\."\)/);
});

test("l'annuaire accepte une personne sans adresse, et l'unicité tient", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const migration = readFileSync(
    fileURLToPath(new URL("../../../../supabase/migrations/202609220001_directory_people_sans_courriel.sql", import.meta.url)),
    "utf8"
  );

  assert.match(migration, /alter column email drop not null/);
  // Additive : rien n'est supprimé ni renommé, et aucune ligne existante ne
  // devient invalide.
  assert.doesNotMatch(migration, /\bdrop\s+(table|column|index|constraint)\b/i);
});
