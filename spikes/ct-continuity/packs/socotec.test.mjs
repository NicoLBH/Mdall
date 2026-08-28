import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_PACK, PACKS, packStamp, selectPack } from "./index.mjs";
import { SOCOTEC } from "./socotec.mjs";
import { readDocumentMeta } from "../document-meta.mjs";
import { requiresAction } from "../block-extraction.mjs";
import { findGlobalClearances, findLiftingStatements } from "../lifting.mjs";

/**
 * Un pack doit être falsifiable. « Est-ce que le pack marche encore » est une
 * commande, pas une opinion : ce fichier est cette commande.
 *
 * Les extraits ci-dessous sont écrits à la main, mais fidèles à ce que les
 * livrables portent réellement — un jeu d'essai infidèle ferait corriger du
 * code qui était juste.
 */

const PIED_DE_PAGE = "SOCOTEC Construction - S.A.S. au capital de 9 116 700 euros";

function document(lines) {
  return { content_available: true, content: lines.join("\n"), source_id: "doc", pages: [{ page: 1, text: lines.join("\n") }] };
}

test("le pack se choisit sur le nom que l'émetteur imprime, pas sur un format", () => {
  assert.equal(selectPack(`Un rapport quelconque\n${PIED_DE_PAGE}`), SOCOTEC);

  // Une référence au format connu ne suffit pas à nommer un émetteur : c'est
  // un format, pas une signature.
  assert.equal(PACKS.length, 1, "un second pack demandera de revoir cette attente");
  assert.equal(selectPack("Référence du chrono: CT/13860/0824/0139"), DEFAULT_PACK);
});

test("un pack se consigne avec sa version", () => {
  // Sans version, face à un écart entre deux exécutions, on ne saurait jamais
  // si la cause est le document ou une correction de la veille.
  assert.deepEqual(packStamp(SOCOTEC), { pack_id: "socotec", pack_version: SOCOTEC.version });
  assert.equal(typeof SOCOTEC.version, "number");
});

test("les livrables de l'émetteur se nomment, et disent s'ils récapitulent", () => {
  const lire = (titre) =>
    readDocumentMeta(document([titre, "CONTROLE TECHNIQUE", "Date d’émission : 12/03/2025"]), { pack: SOCOTEC });

  assert.equal(lire("RAPPORT INITIAL DE CONTROLE TECHNIQUE").document_type, "rapport_initial");
  assert.equal(lire("RAPPORT PREALABLE / APD").document_type, "rapport_prealable");
  assert.equal(lire("RAPPORT PREALABLE / APS").document_type, "rapport_prealable_aps");
  assert.equal(lire("RAPPORT D'ETAPE").document_type, "rapport_etape");
  assert.equal(lire("AVIS EN PHASE DE REALISATION DES TRAVAUX").document_type, "fiche_avis_travaux");
  assert.equal(lire("RVRAT").document_type, "rvrat");

  // La distinction qui décide de tout le suivi : un récapitulatif reprend
  // l'état complet des avis, une fiche ne répète pas les précédentes.
  assert.equal(lire("RAPPORT INITIAL DE CONTROLE TECHNIQUE").recapitulative, true);
  assert.equal(lire("AVIS EN PHASE DE REALISATION DES TRAVAUX").recapitulative, false);
  assert.equal(lire("RVRAT").recapitulative, false);
});

test("la référence, la date et le numéro de fiche se lisent où l'émetteur les écrit", () => {
  const meta = readDocumentMeta(
    document([
      "AVIS EN PHASE DE RÉALISATION DES TRAVAUX",
      "FICHE N° : 2",
      "Version : 3",
      "Date d’émission : 20/05/2025",
      "Référence du chrono: CT/13860/0525/0179"
    ]),
    { pack: SOCOTEC }
  );

  assert.equal(meta.chrono_reference, "CT/13860/0525/0179");
  assert.equal(meta.issued_at, "2025-05-20");
  assert.equal(meta.issued_at_source, "declared", "une date déclarée vaut mieux qu'une date devinée");
  assert.equal(meta.sheet_number, 2);
  assert.equal(meta.version, 3);
});

test("les colonnes du tableau sont celles que l'émetteur intitule", () => {
  const intitule = (texte) => SOCOTEC.tableHeaders.find((header) => header.pattern.test(texte))?.id ?? null;

  // Un rapport dit « Dispositions du projet », une fiche « Éléments examinés » :
  // c'est le même tableau.
  assert.equal(intitule("Dispositions du projet"), "disposition");
  assert.equal(intitule("Éléments examinés"), "disposition");
  assert.equal(intitule("Avis*"), "opinion");
  assert.equal(intitule("Observations et commentaires"), "comment");
  assert.equal(intitule("N°"), "reference");
  assert.equal(intitule("Montant HT"), null);
});

test("une levée déclarée se lit, avec le numéro qu'elle désigne", () => {
  const [levee] = findLiftingStatements(document(["Pour mémoire.", "L'avis 171 est levé."]), { pack: SOCOTEC });

  assert.equal(levee.reference_normalized, "171");
  assert.match(levee.sentence, /L'avis 171 est levé/);

  // Volontairement étroit : une phrase qui parle de levée sans désigner de
  // numéro ne prouve rien d'exploitable.
  assert.deepEqual(findLiftingStatements(document(["Les réserves ont été levées."]), { pack: SOCOTEC }), []);
});

test("la clôture générale se lit, et le titre qui la nie ne la déclenche pas", () => {
  const clot = findGlobalClearances(
    document([
      "À notre connaissance, l'ensemble des avis que nous avons émis dans le cadre",
      "de notre mission au cours de l'opération ont été suivis d'effet."
    ]),
    { pack: SOCOTEC }
  );
  assert.equal(clot.length, 1);

  // Le titre de la section qui précède dit l'inverse, à deux mots près. C'est
  // exactement le voisinage où un motif trop large affirme le contraire du
  // document.
  const nie = findGlobalClearances(
    document(["4. AVIS, QUI A LA CONNAISSANCE DE SOCOTEC, N’ONT PAS ETE SUIVIS D’EFFETS"]),
    { pack: SOCOTEC }
  );
  assert.deepEqual(nie, []);
});

test("seuls suspendu, défavorable et non conforme appellent une action", () => {
  const appelle = (opinion) => requiresAction(opinion, { pack: SOCOTEC });

  assert.equal(appelle({ opinion_raw: "S", opinion_label: "Suspendu" }), true);
  assert.equal(appelle({ opinion_raw: "D", opinion_label: "Défavorable" }), true);
  assert.equal(appelle({ opinion_raw: "F", opinion_label: "Favorable" }), false);
  assert.equal(appelle({ opinion_raw: "SO", opinion_label: "Sans objet" }), false);

  // Le libellé prime sur la lettre : c'est la légende du document qui fait foi,
  // pas une liste de codes que nous aurions décidée.
  assert.equal(appelle({ opinion_raw: "R", opinion_label: "Suspendu" }), true);
  assert.equal(appelle({ opinion_raw: "S", opinion_label: "Favorable" }), false);
});
