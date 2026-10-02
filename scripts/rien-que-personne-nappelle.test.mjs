/**
 * Rien de livré que rien n'appelle.
 *
 * ## Le défaut qu'il attrape, et que rien d'autre n'attrape
 *
 * Un round a livré une table, son service pur, son composant d'écran et son
 * tableau — tous éprouvés, tous verts, 8 374 épreuves au vert — et **aucun appel**
 * pour en écrire une ligne. Le tableau était donc vide à jamais, et un tableau
 * vide ne se voit pas : l'écran paraissait inchangé, et il l'était.
 *
 * Aucune épreuve de comportement ne pouvait le dire. Chaque fonction faisait
 * exactement ce qu'on lui demandait ; ce qui manquait était la **demande**. C'est
 * le cas précis où lire le code comme du texte est la seule mesure possible — et
 * c'est la seule raison pour laquelle on s'y autorise.
 *
 * ## Pourquoi une liste, et non tout le dépôt
 *
 * La règle est neuve ; le dépôt a dix mille lignes qui la précèdent. Passer tout
 * d'un coup aurait rendu ce banc rouge pour des raisons anciennes, et un banc
 * rouge en permanence ne dit plus rien. On y inscrit donc un module quand on le
 * livre, et la liste grandit par le haut.
 *
 * ## Ce qu'il compte comme un appel, et pourquoi
 *
 * Un export **employé dans son propre module** est atteint : `renderLesAvisReleves`
 * n'est appelé que par `renderLeDetailDunRapport`, qui l'est par l'écran. Exiger
 * un appelant extérieur condamnerait tout découpage d'un gros rendu en pièces
 * éprouvables, qui est précisément ce qu'on veut encourager.
 *
 * Ce qu'il refuse est le nom qui n'apparaît **nulle part** hors de sa propre
 * déclaration : ni chez un voisin, ni chez lui. C'est la forme exacte du défaut
 * qu'on a payé — `conserverUneLectureDeRapport` était écrit, éprouvé, et appelé
 * par personne, pas même par son propre module.
 *
 * ## Ce qu'il ne prouve pas
 *
 * Qu'un nom soit écrit quelque part ne prouve pas qu'il soit **atteint** à
 * l'écran : un bouton dont le gestionnaire n'est jamais déclenché passerait ici.
 * C'est la limite, et elle est dite plutôt que tue (règle 5).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RACINE = fileURLToPath(new URL("..", import.meta.url));

/**
 * Les modules dont chaque export doit être appelé quelque part.
 *
 * Le lecteur de rapports de contrôle y entre en entier : c'est lui qui a payé la
 * leçon.
 */
const LES_MODULES_SOUS_GARDE = [
  "apps/web/js/services/la-lecture-dun-rapport.js",
  "apps/web/js/services/le-parcours-dun-rapport.js",
  "apps/web/js/services/lire-un-rapport.js",
  "apps/web/js/services/lectures-de-rapports-supabase.js",
  "apps/web/js/views/ui/les-rapports-lus.js",
  // La zone de dépôt commune, qui porte maintenant son dessin et son branchement.
  "apps/web/js/views/ui/zone-de-depot.js",
  // La vue d'ensemble des documents analysés, et la vue propre aux fils de mails.
  "apps/web/js/services/les-documents-analyses.js",
  "apps/web/js/views/ui/les-documents-analyses.js",
  "apps/web/js/views/ui/le-detail-dun-fil.js",
  // Le registre des familles, et le lancement d'une lecture quelle qu'elle soit.
  "apps/web/js/services/les-familles-de-document.js",
  "apps/web/js/services/lancer-une-lecture.js"
];

/** Où l'on cherche les appels. Les tests n'en sont pas : ils appellent tout. */
const LES_DOSSIERS = ["apps/web/js", "apps/console/js", "supabase/functions", "scripts"];

function lesFichiersDe(dossier) {
  const entier = path.join(RACINE, dossier);
  let entrees = [];
  try { entrees = readdirSync(entier); } catch { return []; }

  return entrees.flatMap((nom) => {
    const chemin = path.join(entier, nom);
    if (statSync(chemin).isDirectory()) return lesFichiersDe(path.join(dossier, nom));
    // **Les tests sont exclus.** Un export qu'une seule épreuve appelle n'est pas
    // appelé : c'est précisément la forme du défaut qu'on cherche.
    if (/\.test\.mjs$/.test(nom)) return [];
    return /\.(js|mjs|ts)$/.test(nom) ? [path.join(dossier, nom)] : [];
  });
}

/** Les noms qu'un module exporte. */
function lesExportsDe(source) {
  const noms = new Set();

  for (const trouve of source.matchAll(
    /^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm
  )) {
    noms.add(trouve[1]);
  }

  // `export { a, b as c }` : c'est le nom exporté qui compte, donc celui d'après
  // `as` quand il y en a un.
  for (const bloc of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const morceau of bloc[1].split(",")) {
      const dit = morceau.trim();
      if (!dit) continue;
      const nom = dit.includes(" as ") ? dit.split(/\s+as\s+/).pop().trim() : dit;
      if (/^[A-Za-z_$][\w$]*$/.test(nom)) noms.add(nom);
    }
  }

  return [...noms];
}

/**
 * Les exports d'un module que rien n'atteint.
 *
 * ## Pourquoi une fonction, et non une boucle au milieu de l'épreuve
 *
 * La batterie l'a exigé : la détection écrite en ligne dans l'épreuve pouvait être
 * neutralisée — `return false` partout — sans qu'aucune épreuve s'en aperçoive. Un
 * banc qui ne s'éprouve pas lui-même ne garantit que lui-même (règle 12). Sortie
 * ici, elle se vérifie sur des sources inventées.
 *
 * @param {{chemin: string, texte: string}} module le module examiné
 * @param {{chemin: string, texte: string}[]} toutes les sources où chercher les appels
 */
export function lesOrphelinsDe(module, toutes = []) {
  return lesExportsDe(module.texte).filter((nom) => {
    const chezLesAutres = toutes
      .some((une) => une.chemin !== module.chemin && new RegExp(`\\b${nom}\\b`).test(une.texte));
    if (chezLesAutres) return false;

    // Chez lui : une seule occurrence est la déclaration elle-même, et une
    // déclaration n'est pas un appel.
    //
    // **Les blocs `export { … }` sont retirés du compte.** Un nom qui s'y trouve y
    // apparaît une seconde fois sans être appelé pour autant, et il passerait donc
    // le banc par le seul fait d'être exporté sous cette forme.
    const chezLui = module.texte.replace(/^export\s*\{[^}]*\}[^\n]*$/gm, "");
    return [...chezLui.matchAll(new RegExp(`\\b${nom}\\b`, "g"))].length <= 1;
  });
}

const LES_SOURCES = LES_DOSSIERS.flatMap(lesFichiersDe)
  .map((chemin) => ({ chemin, texte: readFileSync(path.join(RACINE, chemin), "utf8") }));

test("le banc regarde bien quelque chose", () => {
  // Sans ce garde-fou, une liste de dossiers fautive rendrait le banc vert en
  // n'ayant rien lu — ce qui est pire que de ne pas l'avoir écrit.
  assert.ok(LES_SOURCES.length > 200, `${LES_SOURCES.length} fichiers lus`);
  for (const module of LES_MODULES_SOUS_GARDE) {
    assert.ok(LES_SOURCES.some((une) => une.chemin === module), `${module} n'a pas été lu`);
  }
});

for (const module of LES_MODULES_SOUS_GARDE) {
  test(`chaque export de ${path.basename(module)} est appelé ailleurs`, () => {
    const source = LES_SOURCES.find((une) => une.chemin === module);
    const exports = lesExportsDe(source.texte);
    assert.ok(exports.length > 0, `${module} n'exporte rien : la liste est à revoir`);

    const orphelins = lesOrphelinsDe(source, LES_SOURCES);

    assert.deepEqual(orphelins, [],
      `${module} exporte ce que personne n'appelle : ${orphelins.join(", ")}`);
  });
}

/* ── Le banc s'éprouve lui-même ──────────────────────────────────────────── */

const UN_MODULE = {
  chemin: "faux/un.js",
  texte: [
    "export function appeleAilleurs() { return 1; }",
    "export function appeleChezLui() { return 2; }",
    "export const UNE_CONSTANTE = 3;",
    "export function laPorte() { return appeleChezLui() + UNE_CONSTANTE; }",
    "export function personneNenParle() { return 4; }"
  ].join("\n")
};

const UN_VOISIN = {
  chemin: "faux/deux.js",
  texte: "import { appeleAilleurs, laPorte } from \"./un.js\";\nappeleAilleurs(); laPorte();"
};

test("le banc nomme ce que personne n'atteint, et rien d'autre", () => {
  assert.deepEqual(lesOrphelinsDe(UN_MODULE, [UN_MODULE, UN_VOISIN]), ["personneNenParle"]);
});

test("un export employé chez lui est atteint", () => {
  // `appeleChezLui` et `UNE_CONSTANTE` ne sont appelés que par `laPorte`, qui l'est
  // de l'extérieur. Les refuser condamnerait tout découpage en pièces éprouvables.
  const orphelins = lesOrphelinsDe(UN_MODULE, [UN_MODULE, UN_VOISIN]);
  assert.ok(!orphelins.includes("appeleChezLui"));
  assert.ok(!orphelins.includes("UNE_CONSTANTE"));
});

test("un module que personne n'importe est entièrement orphelin", () => {
  assert.deepEqual(
    lesOrphelinsDe(UN_MODULE, [UN_MODULE]).sort(),
    ["appeleAilleurs", "laPorte", "personneNenParle"]
  );
});

test("le banc lit les deux formes d'export", () => {
  const module = {
    chemin: "faux/trois.js",
    texte: "function un() {}\nfunction deux() {}\nexport { un, deux as renomme };"
  };
  assert.deepEqual(lesOrphelinsDe(module, [module]).sort(), ["renomme", "un"]);
});
