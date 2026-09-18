import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  EXTENSION_PAR_DEFAUT, REFUS, extensionDe, leFichierAEcrire, nomComplet,
  phraseDesRefus, pourquoiOnNePeutPasLEcrire, typeDuFichier
} from "./fichier-a-la-main.js";

/** Ce que le dossier porte déjà. Aucun nom réel. */
const DEJA_LA = [
  { name: "CR de chantier n12.pdf" },
  { name: "notice-incendie.md" }
];

/* ── Le nom ──────────────────────────────────────────────────────────────── */

test("un nom sans extension prend « .md »", () => {
  // C'est ce qu'on colle : du texte qu'on veut relire, pas un format d'échange.
  assert.equal(nomComplet("notice"), `notice${EXTENSION_PAR_DEFAUT}`);
  assert.equal(nomComplet("  notice  "), "notice.md");
});

test("une extension donnée ne se remplace pas", () => {
  // Quelqu'un qui tape « notice.txt » veut un .txt : lui imposer .md ferait un
  // fichier qui ne s'appelle pas comme ce qu'il a demandé.
  assert.equal(nomComplet("notice.txt"), "notice.txt");
  assert.equal(nomComplet("variables.ref"), "variables.ref");
});

test("l'extension se lit en minuscules", () => {
  assert.equal(extensionDe("NOTICE.MD"), ".md");
  assert.equal(extensionDe("sans extension"), "");
});

/* ── Les quatre refus ────────────────────────────────────────────────────── */

test("un nom vide ne fait pas un fichier", () => {
  assert.deepEqual(pourquoiOnNePeutPasLEcrire(""), [REFUS.SANS_NOM]);
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("   "), [REFUS.SANS_NOM]);
});

test("un chemin n'est pas un nom, et se dit avant le reste", () => {
  // « ../notice.md » n'est pas refusé parce qu'il est pris : il est refusé parce
  // que ce n'est pas un nom. Le dire dans cet ordre évite un message qui envoie
  // chercher au mauvais endroit.
  for (const chemin of ["dossier/notice.md", "..\\notice.md", "../notice.md"]) {
    assert.deepEqual(pourquoiOnNePeutPasLEcrire(chemin, { dejaLa: DEJA_LA }), [REFUS.UN_CHEMIN],
      `« ${chemin} » passe`);
  }
});

test("« . » et « .. » ne sont pas des noms de fichier", () => {
  // Le séparateur écarte toute traversée — elle en demande un. Ces deux-là n'en
  // ont pas, et sans un refus à eux ils deviendraient « ..md » et « ...md »,
  // deux fichiers que personne n'a demandés.
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("."), [REFUS.UN_CHEMIN]);
  assert.deepEqual(pourquoiOnNePeutPasLEcrire(".."), [REFUS.UN_CHEMIN]);

  // Et un nom qui porte un point double sans être un chemin reste un nom — ce
  // sont les points **seuls** qui ne font pas un fichier, pas les points.
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("notice..v2.md"), []);
});

test("on n'écrit à la main que du texte", () => {
  // Un .pdf écrit à la main ne serait pas un PDF, et un .png encore moins.
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("notice.pdf"), [REFUS.PAS_DU_TEXTE]);
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("photo.png"), [REFUS.PAS_DU_TEXTE]);
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("notice.md"), []);
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("variables.ref"), []);
});

test("un nom déjà pris se refuse, à la casse près", () => {
  // Deux fichiers « Notice.md » et « notice.md » dans un dossier se confondent à
  // l'œil, et l'on ouvre le mauvais.
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("notice-incendie", { dejaLa: DEJA_LA }), [REFUS.DEJA_PRIS]);
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("Notice-Incendie.MD", { dejaLa: DEJA_LA }), [REFUS.DEJA_PRIS]);
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("autre-notice", { dejaLa: DEJA_LA }), []);
});

test("le nom se compare complété, pas tel qu'il est tapé", () => {
  // On tape « notice-incendie » sans extension : c'est « notice-incendie.md »
  // qui existe déjà, et sans la complétion le conflit passerait inaperçu jusqu'à
  // ce que la base le refuse.
  assert.deepEqual(pourquoiOnNePeutPasLEcrire("notice-incendie", { dejaLa: DEJA_LA }), [REFUS.DEJA_PRIS]);
});

test("un refus dit quoi faire, pas qu'il refuse", () => {
  assert.match(phraseDesRefus([REFUS.UN_CHEMIN]), /pas un chemin/);
  assert.match(phraseDesRefus([REFUS.PAS_DU_TEXTE]), /\.md/);
  assert.equal(phraseDesRefus([]), "");
});

/* ── Ce qu'on écrit ──────────────────────────────────────────────────────── */

test("le fichier et sa ligne portent le même nom", () => {
  // Les composer à deux endroits ferait un jour un fichier qui ne s'appelle pas
  // comme sa ligne.
  const ecrire = leFichierAEcrire("notice", {
    contenu: "# Notice", projectId: "pr-1", folderId: "f-1", parQui: "u-1"
  });

  assert.equal(ecrire.nom, "notice.md");
  assert.equal(ecrire.ligne.filename, "notice.md");
  assert.equal(ecrire.ligne.original_filename, "notice.md");
  assert.equal(ecrire.ligne.mime_type, ecrire.type);
});

test("la ligne dit qu'il a été écrit à la main", () => {
  // Un fichier dont on ne sait plus s'il vient d'un dépôt ou d'un collage ne se
  // relit pas de la même façon : l'un a un original ailleurs, l'autre EST
  // l'original.
  const ecrire = leFichierAEcrire("notice", { projectId: "pr-1" });

  assert.equal(ecrire.ligne.document_kind, "ecrit_a_la_main");
});

test("un fichier vide s'écrit quand même", () => {
  // On crée le fichier, puis on colle dedans : refuser un contenu vide
  // obligerait à taper un caractère avant de pouvoir coller.
  const ecrire = leFichierAEcrire("notice", { projectId: "pr-1" });

  assert.equal(ecrire.contenu, "");
  assert.equal(ecrire.nom, "notice.md");
});

test("un nom refusé n'écrit rien", () => {
  assert.equal(leFichierAEcrire("", { projectId: "pr-1" }), null);
  assert.equal(leFichierAEcrire("a/b.md", { projectId: "pr-1" }), null);
  assert.equal(leFichierAEcrire("notice.pdf", { projectId: "pr-1" }), null);
  assert.equal(leFichierAEcrire("notice-incendie", { projectId: "pr-1", dejaLa: DEJA_LA }), null);
});

test("sans projet, rien ne s'écrit", () => {
  // Un fichier sans projet n'a pas d'endroit où aller, et la base le refuserait
  // après avoir téléversé le contenu — on le dit avant.
  assert.equal(leFichierAEcrire("notice", { projectId: "" }), null);
});

test("les extensions de Mdall sont du texte", () => {
  // Leur donner un type inventé ferait télécharger un fichier que rien n'ouvre.
  assert.equal(typeDuFichier("variables.ref"), "text/plain");
  assert.equal(typeDuFichier("notice.md"), "text/markdown");
  assert.equal(typeDuFichier("tableau.csv"), "text/csv");
});

/* ── L'écran Fichiers l'offre ────────────────────────────────────────────── */

test("le kebab propose de créer un fichier", () => {
  // Une garde sur le texte de l'écran, pour le seul défaut qu'elle attrape : une
  // entrée de menu qu'on écrit sans la brancher ne fait rien, et rien ne tombe.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");

  assert.match(ecran, /action: "documents-ecrire"/, "le menu ne propose pas d'écrire");
  assert.match(ecran, /if \(action === "documents-ecrire"\) \{ ouvrirLEcriture\(root\); return; \}/,
    "l'entrée du menu n'est pas branchée");
});

test("le nom se tape au bout du fil d'Ariane", () => {
  // Une fenêtre au milieu de l'écran aurait demandé le nom sans dire où : dans
  // quel dossier, à côté de quoi.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
  const fil = ecran.slice(
    ecran.indexOf("function renderDocumentsBreadcrumb"), ecran.indexOf("function renderRepoFolderRow")
  );

  assert.match(fil, /if \(docsViewState\.ecriture\)/, "le fil ne porte pas le champ du nom");
  assert.match(fil, /data-ecriture-nom/);
  // Et il est **après** le chemin : le nom se lit au bout, là où le fichier ira.
  //
  // Le chemin se cherche d'abord : un `indexOf` qui ne trouve rien rend -1, qui
  // passe toutes les comparaisons « avant » — la garde dirait que l'ordre est
  // bon alors que le chemin a disparu.
  const ouLeChemin = fil.indexOf("${chemin}${sep}");
  assert.notEqual(ouLeChemin, -1, "le chemin ne précède plus le champ du nom");
  assert.ok(ouLeChemin < fil.indexOf("data-ecriture-nom"),
    "le champ du nom passe avant le chemin");
});

test("la zone de saisie ne se redessine pas à la frappe", () => {
  // L'écran entier se reconstruit à chaque rendu, et l'on perdrait le curseur au
  // milieu d'un collage de trente pages.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
  const branchement = ecran.slice(
    ecran.indexOf("if (docsViewState.ecriture) {\n    const champ"),
    ecran.indexOf('const menu = document.querySelector(\'[data-action-id="documentsMenu"]\')')
  );

  assert.match(branchement, /surChangement: \(valeur\) => \{ docsViewState\.ecriture\.contenu = valeur; \}/,
    "le texte ne se retient pas");
  assert.equal(/surChangement[\s\S]{0,120}renderProjectDocumentsContent/.test(branchement), false,
    "la zone se redessine à chaque frappe");
});

test("les refus se recalculent avant d'écrire, pas seulement à l'affichage", () => {
  // Un bouton désactivé est une politesse, pas une garde : la liste du dossier a
  // pu changer pendant qu'on tapait, et le nom devenir pris.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
  const ecrire = ecran.slice(
    ecran.indexOf("async function ecrireLeFichierAlaMain"), ecran.indexOf("/** Créer un dossier.")
  );

  assert.match(ecrire, /phraseDesRefus\(pourquoiOnNePeutPasLEcrire\(ecriture\.nom, \{ dejaLa \}\)\)/,
    "on écrit sans revérifier le nom");
});

test("un échec garde le texte, et le dit", () => {
  // Retomber sur la liste ferait perdre un collage de trente pages pour une
  // panne de réseau.
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
  const ecrire = ecran.slice(
    ecran.indexOf("async function ecrireLeFichierAlaMain"), ecran.indexOf("/** Créer un dossier.")
  );

  assert.match(ecrire, /Votre texte est toujours là/);
  // L'écriture n'est refermée qu'après un succès.
  const avantLeSucces = ecrire.slice(0, ecrire.indexOf("docsViewState.ecriture = null;"));
  assert.match(avantLeSucces, /if \(!ecrit\.ecrit\) \{/, "l'écriture se referme avant de savoir");
});

test("après l'écriture, le dossier se relit au lieu de se deviner", () => {
  // Deux listes qui divergent d'un fichier sont pires qu'un aller-retour de plus
  // (règle 4).
  const ecran = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");

  assert.match(ecran, /await loadCurrentDirectory\(\)\.catch\(\(\) => undefined\);/,
    "le dossier ne se relit pas après l'écriture");
});

test("le contenu ne se recopie pas sur la ligne du document", () => {
  // Le fichier vit dans le stockage, comme tout fichier. Le recopier sur sa
  // ligne ferait deux vérités qui divergeraient à la première correction
  // (règle 4) — et `transcription_markdown` dit ce que le MODÈLE a lu, ce qui
  // n'est pas la même chose qu'un texte écrit à la main.
  const transport = readFileSync(
    new URL("./fichier-a-la-main-supabase.js", import.meta.url), "utf8"
  );

  // Le champ **posé**, et non le mot : l'en-tête du fichier explique justement
  // pourquoi on ne s'en sert pas, et une garde qui cherche le mot tomberait sur
  // son propre commentaire.
  assert.equal(/transcription_markdown\s*:/.test(transport), false,
    "le texte écrit à la main est recopié sur la ligne");
  assert.match(transport, /uploadDocumentToStorage\(fichier/, "le texte ne part pas au stockage");
});

test("le fichier téléversé porte le nom qu'on a choisi", () => {
  // Le téléversement nomme l'objet de stockage d'après `file.name` : un `Blob`
  // n'en a pas, et le fichier arriverait sous un nom que personne n'a choisi.
  const transport = readFileSync(
    new URL("./fichier-a-la-main-supabase.js", import.meta.url), "utf8"
  );

  assert.match(transport, /new File\(\[aEcrire\.contenu\], aEcrire\.nom/);
});
