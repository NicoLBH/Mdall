import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { FAMILLE, TOUTES } from "./les-familles-de-document.js";
import {
  CE_QUE_CA_DEMANDE, ENTREE, LECTURE_DU_CHOIX, PAS_CHOISISSABLE, PHRASES_DU_REFUS, basculerLeChoix, ceQueLaFileContient, cheminDuDossier, commentCaSeLit, entreesDuDossier, etatDeLaCaseDuDossier, lesChoisissables, phraseDeCeQueLaFileFera, phraseDeLaSelection, phraseDuDossier, pourquoiPasChoisissable, toutBasculer
} from "./choisir-depuis-fichiers.js";
import { OU_EN_EST } from "./les-documents-analyses.js";

const range = (nom, surcharge = {}) => ({
  id: nom, name: nom, storage_bucket: "documents", storage_path: `p/${nom}`, ...surcharge
});

// ── Ce qui se choisit ──────────────────────────────────────────────────────

test("un document de texte se choisit", () => {
  assert.equal(pourquoiPasChoisissable(range("notice.md")), "");
  assert.equal(pourquoiPasChoisissable(range("releve.txt")), "");
});

test("un PDF se choisit aussi", () => {
  // Ses octets se redescendent du stockage : il est déjà dans le projet, et le
  // redéposer en ferait un second exemplaire.
  assert.equal(pourquoiPasChoisissable(range("cr.pdf")), "");
});

test("un format que Mdall ne sait pas lire ne se choisit pas", () => {
  assert.equal(pourquoiPasChoisissable(range("plan.dwg")), PAS_CHOISISSABLE.PAS_LISIBLE);
  assert.equal(pourquoiPasChoisissable(range("photo.png")), PAS_CHOISISSABLE.PAS_LISIBLE);
});

test("chaque document dit comment il se lira", () => {
  // Un PDF passe par une extraction et une restitution, donc par un appel payé.
  // Le découvrir après coup, sur une facture, n'est pas une façon de décider.
  assert.equal(commentCaSeLit(range("notice.md")), LECTURE_DU_CHOIX.TEXTE);
  assert.equal(commentCaSeLit(range("cr.pdf")), LECTURE_DU_CHOIX.PDF);
  assert.equal(commentCaSeLit(range("plan.dwg")), "");
});

test("seul le PDF annonce ce qu'il demande", () => {
  // Une phrase sur chaque ligne ferait du bruit là où il n'y a rien à dire, et
  // l'œil cesserait de la voir quand elle compte.
  assert.equal(CE_QUE_CA_DEMANDE[LECTURE_DU_CHOIX.TEXTE], "");
  assert.match(CE_QUE_CA_DEMANDE[LECTURE_DU_CHOIX.PDF], /extrait puis restitué/);
});

test("un document sans contenu attaché ne se choisit pas", () => {
  // Son dépôt ne s'est pas terminé : le proposer donnerait un clic qui échoue.
  assert.equal(
    pourquoiPasChoisissable(range("notice.md", { storage_path: "" })),
    PAS_CHOISISSABLE.RIEN_A_LIRE
  );
  assert.equal(
    pourquoiPasChoisissable(range("notice.md", { storage_bucket: "" })),
    PAS_CHOISISSABLE.RIEN_A_LIRE
  );
});

test("les deux refus ne se confondent pas", () => {
  // « ce n'est pas du texte » se traite en déposant le fichier ; « rien à lire »
  // en le redéposant. Deux gestes différents.
  assert.notEqual(PAS_CHOISISSABLE.PAS_DU_TEXTE, PAS_CHOISISSABLE.RIEN_A_LIRE);
});

/* ── Ce que chaque famille lit ────────────────────────────────── */

/**
 * **Un `.eml` sous « Bureau de contrôle » disait « Mdall ne sait pas lire ce
 * format ».** C'était faux : Mdall le lit très bien, ailleurs. Une phrase fausse
 * sur l'écran qui explique pourquoi une ligne est éteinte est pire qu'un écran
 * muet — on en conclut que le format n'est pas pris en charge, et l'on ne
 * cherche plus (règle 5).
 */
test("une famille ne propose que ce qu'elle lit", () => {
  assert.equal(commentCaSeLit(range("cr.pdf"), FAMILLE.CR), LECTURE_DU_CHOIX.PDF);
  assert.equal(commentCaSeLit(range("notice.md"), FAMILLE.CR), LECTURE_DU_CHOIX.TEXTE);
  // Le bureau de contrôle ne lit que des PDF : pas de texte, pas de mails.
  assert.equal(commentCaSeLit(range("cr.pdf"), FAMILLE.CONTROLE), LECTURE_DU_CHOIX.PDF);
  assert.equal(commentCaSeLit(range("notice.md"), FAMILLE.CONTROLE), "");
  // Et les mails ne lisent que des porteurs de mails.
  assert.equal(commentCaSeLit(range("fil.eml"), FAMILLE.MAIL), LECTURE_DU_CHOIX.MAIL);
  assert.equal(commentCaSeLit(range("export.zip"), FAMILLE.MAIL), LECTURE_DU_CHOIX.MAIL);
  assert.equal(commentCaSeLit(range("cr.pdf"), FAMILLE.MAIL), "");
});

test("un format que Mdall lit ailleurs le dit, et ne prétend pas être inconnu", () => {
  assert.equal(pourquoiPasChoisissable(range("fil.eml"), FAMILLE.CONTROLE),
    PAS_CHOISISSABLE.PAS_DE_CETTE_FAMILLE);
  assert.equal(pourquoiPasChoisissable(range("cr.pdf"), FAMILLE.MAIL),
    PAS_CHOISISSABLE.PAS_DE_CETTE_FAMILLE);

  // Et ce que Mdall ne lit nulle part garde l'autre refus : les deux gestes
  // qu'ils appellent sont différents — changer de famille, ou renoncer.
  assert.equal(pourquoiPasChoisissable(range("plan.dwg"), FAMILLE.MAIL),
    PAS_CHOISISSABLE.PAS_LISIBLE);

  assert.notEqual(PHRASES_DU_REFUS[PAS_CHOISISSABLE.PAS_DE_CETTE_FAMILLE],
    PHRASES_DU_REFUS[PAS_CHOISISSABLE.PAS_LISIBLE]);
  assert.match(PHRASES_DU_REFUS[PAS_CHOISISSABLE.PAS_DE_CETTE_FAMILLE], /mais pas ici/);
});

test("sans famille, tout ce que Mdall sait lire se choisit", () => {
  // L'appelant qui ne regarde aucune famille en particulier ne doit pas voir des
  // documents éteints sans raison visible. `toutes` est leur réunion, et non une
  // famille qui refuserait tout.
  for (const quoi of ["", TOUTES]) {
    assert.equal(commentCaSeLit(range("cr.pdf"), quoi), LECTURE_DU_CHOIX.PDF);
    assert.equal(commentCaSeLit(range("notice.md"), quoi), LECTURE_DU_CHOIX.TEXTE);
    assert.equal(commentCaSeLit(range("fil.eml"), quoi), LECTURE_DU_CHOIX.MAIL);
  }
});

test("un fil annonce qu'il coûte un appel, et un seul", () => {
  // Dix mails choisis ne font pas dix appels : c'est une autre économie que
  // celle des PDF, et la taire ferait renoncer à choisir large.
  assert.match(CE_QUE_CA_DEMANDE[LECTURE_DU_CHOIX.MAIL], /un seul appel/);
  assert.notEqual(CE_QUE_CA_DEMANDE[LECTURE_DU_CHOIX.MAIL],
    CE_QUE_CA_DEMANDE[LECTURE_DU_CHOIX.PDF]);
});

test("la liste d'un dossier suit la famille ouverte", () => {
  const dossier = { folders: [], files: [range("cr.pdf"), range("fil.eml")] };

  const sousLeControle = entreesDuDossier(dossier, FAMILLE.CONTROLE);
  assert.deepEqual(sousLeControle.map((une) => une.choisissable), [true, false]);
  // Éteint, mais **listé** : masquer ferait un dossier de douze mails qui
  // paraîtrait vide, ce qui se lit comme une panne (règle 5).
  assert.equal(sousLeControle.length, 2);

  const sousLesMails = entreesDuDossier(dossier, FAMILLE.MAIL);
  assert.deepEqual(sousLesMails.map((une) => une.choisissable), [false, true]);
});

// ── L'ordre de la liste ────────────────────────────────────────────────────

const DOSSIER = {
  folders: [{ id: "f2", name: "Zinguerie" }, { id: "f1", name: "Étanchéité" }],
  files: [range("notice.md"), range("cr.pdf"), range("annexe.md")]
};

test("les dossiers passent avant les fichiers", () => {
  const entrees = entreesDuDossier(DOSSIER);
  const types = entrees.map((entree) => entree.type);
  assert.deepEqual(types, [
    ENTREE.DOSSIER, ENTREE.DOSSIER, ENTREE.FICHIER, ENTREE.FICHIER, ENTREE.FICHIER
  ]);
});

test("l'ordre est celui du français, et non celui des codes de caractères", () => {
  // **Trié sur les codes de caractères** — ce qu'on obtient avec un `<` — on
  // aurait « Zinguerie », « atelier », « Étanchéité » dans cet ordre :
  // majuscules d'abord, accents tout à la fin. Un dossier qui se range
  // autrement qu'à l'alphabet se cherche longtemps.
  const dossiers = entreesDuDossier({
    folders: [
      { id: "f2", name: "Zinguerie" }, { id: "f1", name: "Étanchéité" },
      { id: "f3", name: "atelier" }, { id: "f4", name: "Etancheite bis" }
    ]
  });

  assert.deepEqual(
    dossiers.map((entree) => entree.nom),
    ["atelier", "Étanchéité", "Etancheite bis", "Zinguerie"]
  );
});

test("les fichiers sont dans l'ordre alphabétique", () => {
  const fichiers = entreesDuDossier(DOSSIER).filter((entree) => entree.type === ENTREE.FICHIER);
  assert.deepEqual(fichiers.map((entree) => entree.nom), ["annexe.md", "cr.pdf", "notice.md"]);
});

test("un format illisible figure dans la liste, éteint", () => {
  // Le masquer ferait paraître vide un dossier qui porte douze documents, et
  // l'on chercherait une panne (règle 5).
  const entrees = entreesDuDossier({ files: [range("plan.dwg"), range("notice.md")] });
  const plan = entrees.find((entree) => entree.nom === "plan.dwg");

  assert.ok(plan, "le plan a disparu de la liste");
  assert.equal(plan.choisissable, false);
  assert.equal(plan.pourquoi, PAS_CHOISISSABLE.PAS_LISIBLE);
  // Et rien ne dit comment il se lirait : aucune façon ne convient.
  assert.equal(plan.lecture, "");
});

test("un texte dont le dépôt n'a pas abouti reste du texte", () => {
  // Il n'y a rien à lire, mais sa nature n'a pas changé : la blanchir aurait
  // fait une ligne dont rien ne dépend — ce champ n'est jamais lu sur une
  // entrée qu'on ne peut pas prendre.
  const [notice] = entreesDuDossier({ files: [range("notice.md", { storage_path: "" })] });
  assert.equal(notice.pourquoi, PAS_CHOISISSABLE.RIEN_A_LIRE);
  assert.equal(notice.lecture, LECTURE_DU_CHOIX.TEXTE);
});

test("la liste porte la façon dont chaque document se lira", () => {
  const entrees = entreesDuDossier(DOSSIER);
  assert.equal(entrees.find((e) => e.nom === "notice.md").lecture, LECTURE_DU_CHOIX.TEXTE);
  assert.equal(entrees.find((e) => e.nom === "cr.pdf").lecture, LECTURE_DU_CHOIX.PDF);
});

test("un dossier ne se choisit pas : il s'ouvre", () => {
  const dossier = entreesDuDossier(DOSSIER).find((entree) => entree.type === ENTREE.DOSSIER);
  assert.equal(dossier.choisissable, false);
  // Et sans motif de refus : il n'y a rien à refuser, on y entre.
  assert.equal(dossier.pourquoi, "");
});

test("une entrée sans identifiant ne se liste pas", () => {
  // On ne peut ni l'ouvrir ni la prendre : l'afficher ferait une ligne morte.
  const entrees = entreesDuDossier({ folders: [{ name: "Sans id" }], files: [range("", { id: "" })] });
  assert.deepEqual(entrees, []);
});

test("un dossier vide donne une liste vide", () => {
  assert.deepEqual(entreesDuDossier({}), []);
  assert.deepEqual(entreesDuDossier(null), []);
});

// ── Le chemin ──────────────────────────────────────────────────────────────

test("le chemin commence à la racine", () => {
  // Sans elle, on descend dans un dossier sans plus rien pour remonter.
  const chemin = cheminDuDossier([{ id: "f1", name: "Incendie" }]);
  assert.deepEqual(chemin, [{ id: "", nom: "Fichiers" }, { id: "f1", nom: "Incendie" }]);
});

test("à la racine, le chemin est la racine seule", () => {
  assert.deepEqual(cheminDuDossier([]), [{ id: "", nom: "Fichiers" }]);
});

// ── Ce qu'on dit du dossier ────────────────────────────────────────────────

test("un dossier vide et un dossier illisible ne se disent pas pareil", () => {
  // L'un invite à déposer, l'autre à ouvrir un autre dossier.
  assert.match(phraseDuDossier([]), /vide/);
  assert.match(phraseDuDossier(entreesDuDossier({ files: [range("plan.dwg")] })), /Rien à lire/);
});

test("un dossier illisible qui porte des dossiers invite à descendre", () => {
  const dit = phraseDuDossier(entreesDuDossier({
    folders: [{ id: "f1", name: "Incendie" }], files: [range("plan.dwg")]
  }));
  assert.match(dit, /Ouvrez un dossier/);
});

test("un dossier qui ne porte que des PDF offre quelque chose", () => {
  // Il n'invite plus à aller voir ailleurs : ses comptes rendus se lisent.
  assert.equal(phraseDuDossier(entreesDuDossier({ files: [range("cr.pdf")] })), "");
});

test("un dossier qui offre quelque chose ne se commente pas", () => {
  // Une liste qui se lit toute seule n'a pas besoin d'une phrase au-dessous.
  assert.equal(phraseDuDossier(entreesDuDossier(DOSSIER)), "");
});

/* ── Ce que Fichiers ne doit pas charger ──────────────────────────────────
 *
 * Le premier essai mettait le bouton dans Fichiers : il fallait une case
 * partagée, donc une route, donc un morceau de l'écran de lecture dans les
 * dépendances d'un écran qui ne s'en sert pas. Rien ne le disait — l'écran
 * marchait, il était seulement plus lourd à charger pour tout le monde.
 */

const FICHIERS = readFileSync(new URL("../views/project-documents.js", import.meta.url), "utf8");
const ATELIER = readFileSync(
  new URL("../views/studio/dev/lecture-des-cr.js", import.meta.url), "utf8");

test("Fichiers ne charge rien de l'Atelier", () => {
  const imports = FICHIERS.match(/^import[\s\S]*?from\s+"([^"]+)";$/gm) ?? [];
  const venus = imports.map((ligne) => ligne.match(/from\s+"([^"]+)"/)[1]);

  for (const venu of venus) {
    assert.equal(/studio|atelier/.test(venu), false, `Fichiers charge ${venu}`);
  }
});

test("l'Atelier va chercher dans Fichiers à la demande, et non au chargement", () => {
  // `project-supabase-sync.js` passe par le SDK Supabase, importé depuis le
  // réseau : le charger d'emblée le ferait descendre pour qui n'ouvrira jamais
  // le choix — et l'exécution hors navigateur ne saurait pas le résoudre.
  assert.equal(/^import[\s\S]*?project-supabase-sync\.js";$/m.test(ATELIER), false,
    "le module de lecture des dossiers est importé au chargement");
  assert.match(ATELIER, /await import\("\.\.\/\.\.\/\.\.\/services\/project-supabase-sync\.js"\)/);
});

test("les quatre gestes du choix sont branchés dans l'Atelier", () => {
  // Une marque posée sans écouteur fait exactement ce que fait une marque
  // absente : rien, sans erreur et sans rien pour le dire.
  for (const marque of [
    "data-choisir-fermer", "data-choisir-dossier", "data-choisir-document"
  ]) {
    const ou = ATELIER.indexOf(`[${marque}]`);
    assert.notEqual(ou, -1, `${marque} n'est pas écouté`);
  }

  // **Le quatrième porte un nom, et non une chaîne.** L'attribut du choix depuis
  // Fichiers est déclaré par la zone de dépôt commune, et l'écran l'écoute par la
  // constante qu'elle exporte — c'est ce qui garantit qu'il écoute bien celui que
  // la zone pose (règle 10).
  assert.match(ATELIER, /closest\(`\[\$\{DEPUIS_FICHIERS\}\]`\)/);

  // Et le clic est **délégué sur l'hôte** : la liste se réécrit à chaque
  // dossier ouvert, donc des écouteurs posés sur les lignes mourraient avec
  // elles — le second clic ne ferait rien.
  assert.match(ATELIER, /hote\.addEventListener\("click", surLeClic\)/);
});

/**
 * **Cette épreuve relisait le fichier comme du texte, et c'était un défaut.**
 *
 * Elle cherchait l'expression exacte `vue.choix ? renderChoisirUnFichier(…) :
 * renderDepot(…)`. Un fichier qui contient les bons mots peut lever à la
 * première seconde, et un troisième état — la file — pouvait s'ajouter sous les
 * deux autres sans qu'elle bouge. Elle vit maintenant dans
 * `views/studio/dev/lecture-des-cr.test.mjs`, où l'écran se **dessine**.
 */

/**
 * **Celle-ci est partie chez l'écran.**
 *
 * Elle comptait deux fois la chaîne `data-lecture-cr-depuis-fichiers>` dans le
 * source. Le bouton de la zone de dépôt vit maintenant dans le composant commun :
 * l'occurrence a disparu du fichier sans que rien ne disparaisse de l'écran, et
 * un compte d'occurrences aurait été rouge pour une raison fausse. Elle se
 * vérifie où l'écran se **dessine**, dans `views/studio/dev/lecture-des-cr.test.mjs`.
 */

/* ── Choisir plusieurs comptes rendus d'un coup ───────────────────────────── */

const TROIS = [
  { type: ENTREE.DOSSIER, id: "f1", nom: "Archives", choisissable: false, lecture: "" },
  { type: ENTREE.FICHIER, id: "d1", nom: "CR 01.pdf", choisissable: true, lecture: LECTURE_DU_CHOIX.PDF },
  { type: ENTREE.FICHIER, id: "d2", nom: "CR 02.md", choisissable: true, lecture: LECTURE_DU_CHOIX.TEXTE },
  { type: ENTREE.FICHIER, id: "d3", nom: "scan.tiff", choisissable: false, lecture: "" }
];

test("cocher ajoute, recocher enlève", () => {
  const un = basculerLeChoix(null, "d1", TROIS);
  assert.deepEqual([...un], ["d1"]);
  assert.deepEqual([...basculerLeChoix(un, "d1", TROIS)], []);
});

/**
 * **Ce qui ne se choisit pas ne se coche pas**, même si son identifiant arrive.
 * C'est la même règle que pour le clic simple, et la laisser passer aurait mis
 * dans la file un document dont rien n'est lisible.
 */
test("un document qu'on ne peut pas lire ne se coche pas", () => {
  assert.deepEqual([...basculerLeChoix(null, "d3", TROIS)], []);
  // Et un dossier non plus : on y entre, on ne le lit pas.
  assert.deepEqual([...basculerLeChoix(null, "f1", TROIS)], []);
  assert.deepEqual([...basculerLeChoix(null, "", TROIS)], []);
});

/**
 * **« Tout » ne désigne que le dossier ouvert.** Descendre l'arborescence
 * sélectionnerait des documents que personne n'a vus, et le compte annoncé ne
 * correspondrait à rien de visible (règle 5).
 */
test("tout cocher ne prend que ce qui est lisible, et ce qui est ouvert", () => {
  const tous = toutBasculer(null, TROIS);
  assert.deepEqual([...tous].sort(), ["d1", "d2"]);
  assert.deepEqual(lesChoisissables(TROIS).sort(), ["d1", "d2"]);

  // Ce qui est coché ailleurs ne bouge pas : on monte une file en descendant
  // plusieurs dossiers.
  const ailleurs = toutBasculer(new Set(["venu-dailleurs"]), TROIS, { cocher: false });
  assert.deepEqual([...ailleurs], ["venu-dailleurs"]);
});

/**
 * **La case de tête a trois états, et le troisième n'est pas un détail.**
 *
 * Une case vide sur un dossier où un document est coché dirait que rien ne
 * l'est, et l'on cliquerait pour tout cocher en croyant ne rien défaire. La
 * règle et son dessin viennent du tableau des sujets, inchangés (règle 10).
 */
test("la case du dossier distingue « rien », « une partie » et « tout »", () => {
  assert.equal(etatDeLaCaseDuDossier(new Set(), TROIS), "aucune");
  assert.equal(etatDeLaCaseDuDossier(new Set(["d1"]), TROIS), "partielle");
  assert.equal(etatDeLaCaseDuDossier(new Set(["d1", "d2"]), TROIS), "toutes");

  // Ce qui est coché ailleurs ne compte pas ici : « tout » ne désigne que le
  // dossier ouvert.
  assert.equal(etatDeLaCaseDuDossier(new Set(["d1", "d2", "ailleurs"]), TROIS), "toutes");
});

test("un dossier sans rien de lisible n'est jamais « tout coché »", () => {
  const rien = [TROIS[0], TROIS[3]];
  assert.deepEqual(lesChoisissables(rien), []);
  assert.equal(etatDeLaCaseDuDossier(new Set(), rien), "aucune");
  assert.equal(etatDeLaCaseDuDossier(new Set(["d3"]), rien), "aucune");
});

/**
 * **Le coût se dit avant le clic, et les deux natures se séparent.** Annoncer
 * « 30 documents » sans dire combien sont des PDF laisserait croire au même prix
 * pour trente notes de texte que pour trente scans (fondamental 13).
 */
test("la file dit combien elle coûtera, PDF par PDF", () => {
  const contenu = ceQueLaFileContient(new Set(["d1", "d2"]), TROIS);
  assert.deepEqual(contenu, { combien: 2, pdf: 1, textes: 1 });

  const dite = phraseDeLaSelection(contenu);
  assert.match(dite, /2 documents/);
  assert.match(dite, /1 PDF à extraire puis restituer par le modèle/);
  assert.match(dite, /1 déjà en texte/);
});

test("rien que du texte se dit, et rassure", () => {
  const dite = phraseDeLaSelection(ceQueLaFileContient(new Set(["d2"]), TROIS));
  assert.match(dite, /aucun appel au modèle/);
});

test("rien de choisi ne se dit pas", () => {
  assert.equal(phraseDeLaSelection(ceQueLaFileContient(null, TROIS)), "");
  assert.equal(phraseDeLaSelection(null), "");
  assert.equal(phraseDeCeQueLaFileFera(null), "");
});

/**
 * **Le malentendu le plus coûteux de tout l'écran.**
 *
 * « Analyser 30 documents » se lit comme « remplir la mémoire », et ce n'est pas
 * ce qui va se passer : chaque lecture donne une proposition, et chacune se
 * signe (règle 1). Le dire après aurait fait découvrir trente relectures à
 * quelqu'un qui croyait avoir fini.
 */
test("ce que la file fera se dit avant : une proposition par compte rendu", () => {
  const dite = phraseDeCeQueLaFileFera(ceQueLaFileContient(new Set(["d1", "d2"]), TROIS));
  assert.match(dite, /2 lectures/);
  assert.match(dite, /2 propositions à signer/);
  assert.match(dite, /Rien n'entre dans la mémoire/);

  const seule = phraseDeCeQueLaFileFera(ceQueLaFileContient(new Set(["d1"]), TROIS));
  assert.match(seule, /une proposition à signer/);
  assert.doesNotMatch(seule, /1 lectures/);
});

/* ── Où en est l'analyse de chaque document ──────────────────────────────── */

/**
 * **On cochait à l'aveugle.**
 *
 * Pour savoir si un compte rendu avait déjà été lu, il fallait fermer le choix,
 * aller au tableau, chercher la ligne, revenir. Trois conséquences, et chacune
 * coûte : on relance une lecture déjà payée, on laisse de côté une lecture qui a
 * **échoué** en la croyant faite, et l'on ne voit pas ce qui n'a jamais été lu —
 * c'est-à-dire ce qu'on est venu lancer.
 */
/**
 * Où en est le fichier `a`, quand le tableau dit `documents` de lui.
 *
 * `entreesDuDossier` est la seule porte : la composition de la carte et sa
 * consultation sont désormais internes, parce qu'aucun écran n'avait de raison
 * de les appeler séparément (règle 4). Elles s'éprouvent donc par là, ce qui est
 * aussi la façon dont l'application les emploie.
 */
function ouEnEst(documents, id = "a") {
  const entrees = entreesDuDossier({ files: [
    { id, original_filename: "CR.pdf", storage_bucket: "d", storage_path: `p/${id}` }
  ] }, FAMILLE.CR, documents);
  return entrees[0].ou;
}

test("chaque entrée dit où en est son analyse", () => {
  const su = [
    { documentId: "a", ou: OU_EN_EST.ANALYSE },
    { documentId: "b", ou: OU_EN_EST.ECHOUE, motif: "ce document ne porte aucun texte" },
    { documentId: "c", ou: OU_EN_EST.ATTENTE }
  ];

  const entrees = entreesDuDossier({ files: [
    { id: "a", original_filename: "CR_16.pdf", storage_bucket: "d", storage_path: "p/a" },
    { id: "b", original_filename: "CR_17.pdf", storage_bucket: "d", storage_path: "p/b" },
    { id: "c", original_filename: "CR_18.pdf", storage_bucket: "d", storage_path: "p/c" },
    { id: "z", original_filename: "CR_19.pdf", storage_bucket: "d", storage_path: "p/z" }
  ] }, FAMILLE.CR, su);

  const par = new Map(entrees.map((une) => [une.id, une]));
  assert.equal(par.get("a").ou, OU_EN_EST.ANALYSE);
  assert.equal(par.get("b").ou, OU_EN_EST.ECHOUE);
  assert.equal(par.get("c").ou, OU_EN_EST.ATTENTE);

  /**
   * **Celui qu'on n'a jamais lancé est le cas ordinaire**, et il se dit quand
   * même : c'est l'absence des deux autres, et seul un écran qui énumère un
   * dossier peut la constater. Le tableau des analyses ne le rencontre jamais.
   */
  assert.equal(par.get("z").ou, OU_EN_EST.JAMAIS);

  // Et le motif de l'échec voyage : c'est lui qui dit s'il faut relancer ou non.
  assert.equal(par.get("b").motif, "ce document ne porte aucun texte");
  assert.equal(par.get("z").motif, "");
});

/**
 * **Ce qui a abouti l'emporte.**
 *
 * Un document relancé après un échec porte les deux traces. Il est analysé, et
 * le dire « en échec » ferait relancer une lecture qu'on a déjà payée deux fois
 * (règle 5).
 */
test("un document relancé après un échec est analysé, et non en échec", () => {
  assert.equal(ouEnEst([
    { documentId: "a", ou: OU_EN_EST.ECHOUE, motif: "le fichier est illisible" },
    { documentId: "a", ou: OU_EN_EST.ANALYSE }
  ]), OU_EN_EST.ANALYSE);

  // Et dans l'autre ordre aussi : c'est l'aboutissement qui tranche, pas le rang.
  assert.equal(ouEnEst([
    { documentId: "a", ou: OU_EN_EST.ANALYSE },
    { documentId: "a", ou: OU_EN_EST.ECHOUE, motif: "le fichier est illisible" }
  ]), OU_EN_EST.ANALYSE);
});

/**
 * **Le dernier vu l'emporte, à égalité d'aboutissement.**
 *
 * Deux échecs sur le même document : c'est le second qu'on veut voir, parce que
 * c'est lui qui dit pourquoi la dernière tentative s'est arrêtée. Le motif de la
 * première ferait chercher une cause déjà corrigée.
 */
test("entre deux échecs, c'est le motif du dernier qui se lit", () => {
  const entrees = entreesDuDossier({ files: [
    { id: "a", original_filename: "CR.pdf", storage_bucket: "d", storage_path: "p/a" }
  ] }, FAMILLE.CR, [
    { documentId: "a", ou: OU_EN_EST.ECHOUE, motif: "le modèle n'a pas répondu" },
    { documentId: "a", ou: OU_EN_EST.ECHOUE, motif: "le fichier ne porte aucun texte" }
  ]);
  assert.equal(entrees[0].motif, "le fichier ne porte aucun texte");
});

/** Sans rien de su, tout est « jamais » — et non « analysé » par défaut. */
test("sans rien de su, aucun document n'est réputé analysé", () => {
  for (const rien of [null, undefined, [], {}, "deux documents"]) {
    assert.equal(ouEnEst(rien), OU_EN_EST.JAMAIS,
      "un document inconnu est réputé analysé : on ne le relancerait jamais");
  }
});

/**
 * **Ce que le tableau ne nomme pas n'a pas d'état inventé.**
 *
 * Les documents arrivent du tableau des analyses, qui donne toujours un `ou`.
 * Prêter « analysé » par défaut à une ligne qui n'en porte pas ferait passer pour
 * lue une lecture dont on ne sait rien.
 */
test("une ligne sans état ne vaut pas « analysé »", () => {
  assert.notEqual(ouEnEst([{ documentId: "a" }]), OU_EN_EST.ANALYSE);
});

/** Un dossier n'a pas d'analyse : lui en prêter une n'aurait aucun sens. */
test("un dossier ne porte pas d'état d'analyse", () => {
  const entrees = entreesDuDossier({
    folders: [{ id: "f-1", name: "Comptes rendus" }],
    files: []
  }, FAMILLE.CR, [{ documentId: "f-1", ou: OU_EN_EST.ANALYSE }]);

  assert.equal(entrees[0].type, ENTREE.DOSSIER);
  assert.equal(entrees[0].ou, undefined,
    "un dossier porte un état d'analyse : on croirait pouvoir l'ouvrir");
});
