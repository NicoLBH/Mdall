/**
 * Les trois familles sur une même ligne, et ce qui reste distinct.
 *
 * Les documents sont inventés. Aucun nom réel, aucune commune réelle.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  CE_QUE_DIT_LA_FAMILLE, FAMILLE, LES_FAMILLES, TOUTES, ceQueDitLaFamille,
  lesComptesParFamille, lesDocumentsAnalyses, parFamille,
  unDocumentAnalyse
} from "./les-documents-analyses.js";

const UN_FIL = {
  id: "f-1", objet: "Reprise des enduits", finit_le: "2026-03-02",
  created_at: "2026-10-01T10:00:00Z", lu_par: "gpt-5 · lecture d'un fil v1",
  mesures: { messages: 7, prises: 3, trous: 1 }, relectures: 2
};

const UN_RAPPORT = {
  id: "r-1", document: "RICT-03.pdf", numero_de_rapport: "RICT-03", etabli_le: "2026-04-18",
  created_at: "2026-09-28T10:00:00Z", mesures: { avis: 12, marques: 4, illisibles: 1 },
  // **Trois, et non un.** Avec `combien: 1`, oublier que les rapports nomment ce
  // nombre `combien` et non `relectures` ne changeait rien : la valeur par défaut
  // rendait un. La batterie l'a dit.
  combien: 3
};

const UN_CR = {
  id: "c-1", document: "CR_16.pdf", document_id: "d-1", numero_de_reunion: "16",
  tenue_le: "2026-04-16", created_at: "2026-09-30T10:00:00Z",
  mesures: { points: 11 }, relectures: 1
};

const TOUS = () => lesDocumentsAnalyses({
  mails: [UN_FIL], controles: [UN_RAPPORT], crs: [UN_CR]
});

test("chaque famille se nomme par ce qui la désigne", () => {
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).titre, "Reprise des enduits");
  assert.equal(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).titre, "RICT-03.pdf");
  assert.equal(unDocumentAnalyse(UN_CR, FAMILLE.CR).titre, "CR_16.pdf");

  // Un fil n'a pas de numéro : il n'en invente pas un.
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).repere, "");
  assert.equal(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).repere, "n° RICT-03");
  assert.equal(unDocumentAnalyse(UN_CR, FAMILLE.CR).repere, "réunion n° 16");
});

test("la date est celle du document, pas celle de l'analyse", () => {
  // On cherche « le compte rendu du 16 avril », jamais « celui que j'ai lu mardi ».
  const cr = unDocumentAnalyse(UN_CR, FAMILLE.CR);
  assert.equal(cr.quand, "2026-04-16");
  assert.equal(cr.lueLe, "2026-09-30T10:00:00Z");
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).quand, "2026-03-02");
});

test("les mesures restent propres à leur famille", () => {
  assert.equal(unDocumentAnalyse(UN_CR, FAMILLE.CR).dit, "11 points");
  assert.match(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).dit, /7 messages • 3 prises • 1 trou/);
  assert.match(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).dit,
    /12 avis • 4 marques • 1 illisible/);
});

test("« on n'a pas relevé » ne devient pas zéro", () => {
  // `Number(null)` vaut zéro, qui est fini : sans garde, une étape qui n'a pas eu
  // lieu se lirait « il n'y en a aucun » (règle 5).
  assert.match(unDocumentAnalyse({ ...UN_RAPPORT, mesures: { avis: null } }, FAMILLE.CONTROLE).dit,
    /avis non relevés/);
  assert.match(unDocumentAnalyse({ ...UN_FIL, mesures: { messages: 4, prises: null } },
    FAMILLE.MAIL).dit, /prises non relevées/);
  assert.match(unDocumentAnalyse({ ...UN_CR, mesures: {} }, FAMILLE.CR).dit,
    /points non relevés/);
});

test("le nombre de lectures porte un seul nom", () => {
  // `relectures` chez les comptes rendus et les fils, `combien` chez les rapports :
  // le même nombre sous deux noms, dans trois modules (règle 10).
  assert.equal(unDocumentAnalyse(UN_FIL, FAMILLE.MAIL).combien, 2);
  assert.equal(unDocumentAnalyse(UN_RAPPORT, FAMILLE.CONTROLE).combien, 3);
  // Jamais zéro : une ligne existe parce qu'une lecture a eu lieu.
  assert.equal(unDocumentAnalyse({ ...UN_CR, relectures: 0 }, FAMILLE.CR).combien, 1);
});

test("une ligne sans identifiant n'entre pas dans un tableau qui s'ouvre au clic", () => {
  assert.equal(unDocumentAnalyse({ document: "sans id" }, FAMILLE.CR), null);
  assert.equal(unDocumentAnalyse(UN_CR, "inconnue"), null);
  // `TOUTES` n'est pas une famille : c'est leur réunion.
  assert.equal(unDocumentAnalyse(UN_CR, TOUTES), null);
});

test("la vue d'ensemble range par date de lecture", () => {
  // Trois familles dont les dates de document ne veulent pas dire la même chose :
  // ce qui les ordonne entre elles est le moment où on les a lues.
  assert.deepEqual(TOUS().map((un) => un.id), ["f-1", "c-1", "r-1"]);
});

test("le rail compte chaque famille, et leur réunion", () => {
  assert.deepEqual(lesComptesParFamille(TOUS()),
    { [TOUTES]: 3, [FAMILLE.MAIL]: 1, [FAMILLE.CONTROLE]: 1, [FAMILLE.CR]: 1 });
});

test("filtrer rend la famille, et rien d'autre", () => {
  assert.deepEqual(parFamille(TOUS(), FAMILLE.MAIL).map((un) => un.id), ["f-1"]);
  assert.equal(parFamille(TOUS(), TOUTES).length, 3);
});

test("une famille vide dit quoi faire, et non « aucun résultat »", () => {
  // La phrase vit dans le registre, et c'est l'état vide du tableau qui la pose.
  // Elle avait aussi une seconde vie en tête de tableau — « 19 documents
  // analysés. Cliquer sur une ligne… » —, qui redisait le compte de l'en-tête et
  // expliquait un geste qu'on fait sans qu'on le dise : elle a été retirée, et
  // avec elle la fonction qui la composait (règle 4).
  for (const famille of [TOUTES, ...LES_FAMILLES]) {
    const dit = CE_QUE_DIT_LA_FAMILLE[famille].vide.quoi;
    assert.ok(dit.length > 30, famille);
  }
});

test("une famille inconnue n'est pas inventée", () => {
  assert.equal(ceQueDitLaFamille("autre"), null);
  assert.equal(ceQueDitLaFamille(""), null);
});

/**
 * **Les icônes du rail existent dans la planche.**
 *
 * Une icône absente ne lève pas : elle laisse un vide à la place, et le rail
 * garde son alignement. Rien, à l'écran comme dans les épreuves de rendu, ne le
 * signale — c'est exactement ce qui est arrivé à « Bureau de Contrôle », dessiné
 * sans icône pendant tout un banc.
 */
test("chaque famille porte une icône qui existe", () => {
  const planche = readFileSync(
    fileURLToPath(new URL("../../assets/icons.svg", import.meta.url)), "utf8");

  for (const famille of [TOUTES, ...LES_FAMILLES]) {
    const nom = CE_QUE_DIT_LA_FAMILLE[famille].icone;
    assert.ok(planche.includes(`id="${nom}"`), `${famille} : l'icône « ${nom} » n'existe pas`);
  }
});

/* ── Ce qui a été lancé, et qui n'est pas revenu ─────────────────────────── */

import {
  CE_QUE_DIT_LETAT, CE_QUE_DIT_LETAT_DUN, OU_EN_EST, lesComptesParEtat, lesDocumentsDuTableau,
  lesDocumentsEnAttente, parEtat
} from "./les-documents-analyses.js";

/** Une ligne de file, telle que la table `versements` la rend. */
function uneFile(geste, pas, reste = {}) {
  return {
    id: `v-${geste}`, geste, statut: "en_cours", cree_le: "2026-10-04T09:00:00Z",
    avancement: pas === null ? null : { pas },
    ...reste
  };
}

test("les documents d'une file qui tourne sont en attente", () => {
  const attente = lesDocumentsEnAttente([
    uneFile("rapports", [
      { id: "d-1", nom: "RICT-01.pdf", ou: "attend" },
      { id: "d-2", nom: "RICT-02.pdf", ou: "en-cours" }
    ])
  ]);

  assert.deepEqual(attente.map((un) => un.titre), ["RICT-01.pdf", "RICT-02.pdf"]);
  assert.deepEqual(attente.map((un) => un.ou), [OU_EN_EST.ATTENTE, OU_EN_EST.ATTENTE]);
  assert.deepEqual(attente.map((un) => un.famille), ["rapports", "rapports"]);
  assert.deepEqual(attente.map((un) => un.dit),
    ["en attente de lecture", "lecture en cours"]);
});

test("un document déjà lu par la file n'est pas en attente", () => {
  // Il a une lecture conservée : le reprendre ici le montrerait deux fois, une
  // fois en attente et une fois analysé, pour le même document.
  const attente = lesDocumentsEnAttente([
    uneFile("rapports", [
      { id: "d-1", nom: "RICT-01.pdf", ou: "lu" },
      { id: "d-2", nom: "RICT-02.pdf", ou: "attend" }
    ])
  ]);

  assert.deepEqual(attente.map((un) => un.id), ["d-2"]);
});

test("une lecture qui a échoué reste en attente, et dit pourquoi", () => {
  // Une lecture qui n'a pas abouti et qui disparaîtrait serait une lecture
  // qu'on croit faite (règle 5).
  const attente = lesDocumentsEnAttente([
    uneFile("comptes_rendus", [
      { id: "d-9", nom: "CR_16.pdf", ou: "echoue", motif: "ce document ne porte aucun texte" }
    ])
  ]);

  assert.equal(attente.length, 1);
  assert.equal(attente[0].dit, "la lecture n'a pas abouti");
  assert.equal(attente[0].motif, "ce document ne porte aucun texte");
});

test("une ligne que le serveur n'a pas encore prise attend tout entière", () => {
  // Attendre le premier battement pour la faire paraître laisserait l'écran
  // muet juste après le clic — c'est-à-dire au moment où l'on regarde.
  const attente = lesDocumentsEnAttente([
    uneFile("rapports", null, {
      documents: [{ id: "d-1", nom: "RICT-01.pdf" }, { id: "d-2", nom: "RICT-02.pdf" }]
    })
  ]);

  assert.deepEqual(attente.map((un) => un.id), ["d-1", "d-2"]);
  assert.deepEqual(attente.map((un) => un.dit), ["en attente de lecture", "en attente de lecture"]);
});

test("un dépôt de mails attend par ses fichiers", () => {
  // Les mails portent des chemins d'octets, les lectures des identifiants de
  // documents : les deux se comptent, sinon le dépôt de messagerie n'apparaît pas.
  const attente = lesDocumentsEnAttente([
    uneFile("mails", null, { fichiers: [{ chemin: "p/a.eml", nom: "Reprise des enduits" }] })
  ]);

  assert.equal(attente.length, 1);
  assert.equal(attente[0].titre, "Reprise des enduits");
  assert.equal(attente[0].famille, "mails");
});

test("le même document relancé deux fois n'occupe qu'une ligne", () => {
  // C'est le document qu'on regarde, pas la tentative.
  const attente = lesDocumentsEnAttente([
    uneFile("rapports", [{ id: "d-1", nom: "RICT-01.pdf", ou: "echoue" }], { id: "v-1" }),
    uneFile("rapports", [{ id: "d-1", nom: "RICT-01.pdf", ou: "attend" }], { id: "v-2" })
  ]);

  assert.equal(attente.length, 1);
});

test("une file d'un geste qu'on ne connaît pas n'entre pas au tableau", () => {
  // Deviner sa famille la rangerait sous un rail qui ne la lit pas (règle 5).
  assert.deepEqual(lesDocumentsEnAttente([uneFile("notices", [{ id: "d-1", ou: "attend" }])]), []);
});

test("un pas sans identifiant ne fait pas de ligne", () => {
  // Une ligne qu'on ne peut pas désigner n'a rien à faire dans un tableau.
  assert.deepEqual(lesDocumentsEnAttente([uneFile("rapports", [{ nom: "x", ou: "attend" }])]), []);
});

test("aucune file ne donne aucune attente, et non une erreur", () => {
  assert.deepEqual(lesDocumentsEnAttente([]), []);
  assert.deepEqual(lesDocumentsEnAttente(null), []);
});

/* ── Les deux états réunis ───────────────────────────────────────────────── */

const UN_ANALYSE = {
  id: "l-1", famille: "rapports", titre: "RICT-00.pdf", documentId: "d-0",
  lueLe: "2026-10-01T10:00:00Z", quand: "2026-09-01", dit: "12 avis", combien: 1
};

test("ce qui attend se lit avant ce qui est analysé", () => {
  // C'est la seule part sur laquelle on peut encore agir.
  const tout = lesDocumentsDuTableau({
    analyses: [UN_ANALYSE],
    enAttente: lesDocumentsEnAttente([uneFile("rapports", [{ id: "d-1", nom: "A.pdf", ou: "attend" }])])
  });

  assert.deepEqual(tout.map((un) => un.id), ["d-1", "l-1"]);
  assert.deepEqual(tout.map((un) => un.ou), [OU_EN_EST.ATTENTE, OU_EN_EST.ANALYSE]);
});

test("un document déjà analysé n'attend plus, même si une file le nomme encore", () => {
  // Une file abandonnée en route, ou une relecture lancée sur un document déjà
  // lu, le ferait paraître dans les deux comptes.
  const tout = lesDocumentsDuTableau({
    analyses: [UN_ANALYSE],
    enAttente: lesDocumentsEnAttente([uneFile("rapports", [{ id: "d-0", nom: "RICT-00.pdf", ou: "attend" }])])
  });

  assert.deepEqual(tout.map((un) => un.id), ["l-1"]);
});

test("ne pas savoir ce qui est analysé ne dresse aucun tableau", () => {
  // Un tableau qui ne porterait que la file laisserait croire que rien n'a
  // jamais été analysé (règle 5).
  assert.equal(lesDocumentsDuTableau({ analyses: null, enAttente: [{ id: "d-1" }] }), null);
});

test("un analysé sans état déclaré est analysé", () => {
  const [un] = lesDocumentsDuTableau({ analyses: [UN_ANALYSE] });
  assert.equal(un.ou, OU_EN_EST.ANALYSE);
});

/* ── Le filtre et ses pastilles ──────────────────────────────────────────── */

test("le filtre rend ceux d'un état, et tous quand il n'y en a pas", () => {
  const tout = lesDocumentsDuTableau({
    analyses: [UN_ANALYSE],
    enAttente: lesDocumentsEnAttente([uneFile("rapports", [{ id: "d-1", nom: "A.pdf", ou: "attend" }])])
  });

  assert.deepEqual(parEtat(tout, OU_EN_EST.ATTENTE).map((un) => un.id), ["d-1"]);
  assert.deepEqual(parEtat(tout, OU_EN_EST.ANALYSE).map((un) => un.id), ["l-1"]);
  assert.equal(parEtat(tout, "").length, 2);
});

/**
 * **Un échec se compte à part, et ne se cache plus derrière une attente.**
 *
 * Les deux n'appellent pas le même geste : ce qui attend n'a besoin de rien, ce
 * qui a échoué ne reviendra jamais tout seul. Fondus, on lisait « 3 en attente »
 * en croyant que le serveur y travaillait (règle 5).
 */
test("les pastilles comptent les trois états qui ont une trace", () => {
  const tout = lesDocumentsDuTableau({
    analyses: [UN_ANALYSE, { ...UN_ANALYSE, id: "l-2", documentId: "d-2" }],
    enAttente: lesDocumentsEnAttente([uneFile("rapports", [
      { id: "d-1", nom: "A.pdf", ou: "attend" },
      { id: "d-9", nom: "B.pdf", ou: "echoue", motif: "le fichier est illisible" }
    ])])
  });

  assert.deepEqual(lesComptesParEtat(tout), { attente: 1, echoue: 1, analyse: 2 });

  /**
   * **`jamais` n'est pas compté ici**, et c'est voulu : le tableau ne liste que
   * ce qui a une trace, et un document jamais lancé n'en a aucune. C'est le
   * choix depuis Fichiers qui le rencontre, parce que lui énumère un dossier.
   */
  assert.equal(lesComptesParEtat(tout)[OU_EN_EST.JAMAIS], undefined);
});

test("chaque état se dit dans les mots de l'écran", () => {
  assert.equal(CE_QUE_DIT_LETAT[OU_EN_EST.ATTENTE], "En attente");
  assert.equal(CE_QUE_DIT_LETAT[OU_EN_EST.ANALYSE], "Analysés");
  assert.equal(CE_QUE_DIT_LETAT[OU_EN_EST.ECHOUE], "En échec");

  // **Chaque état du domaine se dit**, sans exception : un état ajouté là-haut
  // et oublié ici ferait une pastille sans mot (règle 10).
  for (const ou of Object.values(OU_EN_EST)) {
    assert.ok(CE_QUE_DIT_LETAT[ou], `« ${ou} » n'a pas de mot pour la pastille`);
  }
});

/**
 * **Chaque état qui se montre au singulier a son mot, et « jamais » n'en a pas.**
 *
 * Les pastilles du tableau comptent ; le choix depuis Fichiers qualifie **une**
 * ligne, et le mot doit tenir à côté d'un nom de fichier. Les deux vocabulaires
 * se tiennent ici, dans le domaine, et non chacun dans son écran (règle 10).
 *
 * `jamais` est seul à n'avoir pas d'entrée, et c'est l'énoncé : dans un dossier
 * qu'on ouvre pour la première fois, n'avoir jamais été analysé est le cas de
 * toutes les lignes. L'absence de clé dit « rien à écrire ici », et c'est aussi
 * là que tombe un état que le serveur nommerait demain sans qu'on le sache.
 */
test("chaque état qui se dit d'un seul document a son mot", () => {
  assert.equal(CE_QUE_DIT_LETAT_DUN[OU_EN_EST.ANALYSE], "déjà analysé");
  assert.equal(CE_QUE_DIT_LETAT_DUN[OU_EN_EST.ATTENTE], "lecture en cours");
  assert.equal(CE_QUE_DIT_LETAT_DUN[OU_EN_EST.ECHOUE], "la lecture a échoué");

  for (const ou of Object.values(OU_EN_EST)) {
    if (ou === OU_EN_EST.JAMAIS) continue;
    assert.ok(CE_QUE_DIT_LETAT_DUN[ou],
      `« ${ou} » n'a pas de mot : sa pastille s'afficherait vide`);
  }

  assert.equal(CE_QUE_DIT_LETAT_DUN[OU_EN_EST.JAMAIS], undefined,
    "« jamais » a un mot : il s'écrirait sur toutes les lignes d'un dossier neuf");
});

/**
 * **Un pas qui a échoué porte l'état de l'échec**, et non celui de l'attente.
 *
 * C'est le service qui le décide, à partir de ce que la file écrit — et non
 * l'écran, qui aurait eu à redécouvrir le mot « echoue ».
 */
test("un pas en échec sort de la file comme un échec", () => {
  const sortis = lesDocumentsEnAttente([uneFile("rapports", [
    { id: "d-1", nom: "A.pdf", ou: "attend" },
    { id: "d-2", nom: "B.pdf", ou: "en-cours" },
    { id: "d-3", nom: "C.pdf", ou: "echoue", motif: "le fichier est illisible" }
  ])]);

  const par = new Map(sortis.map((un) => [un.id, un]));
  assert.equal(par.get("d-1").ou, OU_EN_EST.ATTENTE);
  assert.equal(par.get("d-2").ou, OU_EN_EST.ATTENTE, "une lecture en cours attend bien");
  assert.equal(par.get("d-3").ou, OU_EN_EST.ECHOUE,
    "un échec est encore rangé avec ce qui attend : rien ne le reprendra pourtant");
  assert.equal(par.get("d-3").motif, "le fichier est illisible");
});

/**
 * **Un document en file n'a pas de date de document, et n'en invente pas.**
 *
 * Il portait `cree_le` — le jour où la lecture a été lancée. C'était juste tant
 * que `quand` n'était qu'un mot dans la ligne de méta ; le tri par date de
 * document en a fait un mensonge : un document mis en file ce matin remontait
 * en tête d'un ordre qui promet « le plus récent du chantier », alors que
 * personne ne sait de quand il date — on ne l'a pas encore lu.
 *
 * La date de la file reste dans `lueLe`, qui est exactement cela.
 */
test("un document en attente n'a pas de date de document, et garde celle de la file", () => {
  const [attente] = lesDocumentsEnAttente([
    uneFile("rapports", [{ id: "d-9", nom: "RICT-09.pdf", ou: "attend" }])
  ]);

  assert.equal(attente.quand, "",
    "la date de la file passe pour la date du document : le tri le mettrait en tête");
  assert.equal(attente.lueLe, "2026-10-04T09:00:00Z");
});

/* ── Les trois familles passent par la même porte ─────────────────────────── */

/**
 * **L'épreuve qui manquait, et ce qu'elle a coûté de ne pas exister.**
 *
 * Le tableau lit les trois familles par **une seule** fonction,
 * `unDocumentAnalyse`, qui va chercher `created_at`, `lu_par` et `document_id`.
 * Chaque famille arrive par son propre groupeur — `lesFilsLus`,
 * `lesComptesRendusLus`, `lesRapportsLus` —, et celui des rapports recopiait la
 * ligne sous d'autres noms : `created_at` y était devenu `lueLe`,
 * `document_id` était devenu `documentId`.
 *
 * `unDocumentAnalyse` lisait donc `undefined` et rendait la chaîne vide. **Sans
 * erreur, et sans rien pour le dire.** Les quatre rapports d'un chantier réel
 * sont arrivés sans date d'analyse, sans lecteur et sans document : le tri ne
 * pouvait pas les ranger, le choix depuis Fichiers ne pouvait pas dire qu'ils
 * étaient déjà analysés, et il a fallu lire un export pour le voir.
 *
 * L'épreuve part donc des lignes **telles que la base les rend**, les fait
 * passer par le groupeur de chaque famille, et vérifie que ce que le tableau
 * lit est arrivé. Une fixture écrite à la forme attendue n'aurait rien éprouvé :
 * elle aurait recopié l'hypothèse du code.
 */
test("ce que la base écrit traverse les trois groupeurs jusqu'au tableau", async () => {
  const [{ lesFilsLus }, { lesComptesRendusLus }, { lesRapportsLus }] = await Promise.all([
    import("./la-lecture-dun-fil.js"),
    import("./la-lecture-conservee.js"),
    import("./la-lecture-dun-rapport.js")
  ]);

  // Les colonnes telles que les migrations les déclarent — pas une forme choisie
  // pour que l'épreuve passe.
  const LU_LE = "2026-10-05T12:46:59Z";
  const lignes = {
    mails: lesFilsLus([{
      id: "f-1", project_id: "p-1", objet: "Reprise des enduits",
      finit_le: "2026-03-02", mesures: { messages: 4 },
      lu_par: "modèle · lecture d'un fil v1", created_at: LU_LE
    }]),
    crs: lesComptesRendusLus([{
      id: "c-1", project_id: "p-1", document: "CR-12.pdf", document_id: "doc-c-1",
      numero_de_reunion: "12", tenue_le: "2026-04-02", mesures: { points: 20 },
      lu_par: "modèle · lecture de CR v1", created_at: LU_LE
    }]),
    controles: lesRapportsLus([{
      id: "r-1", project_id: "p-1", document: "RICT-03.pdf", document_id: "doc-r-1",
      numero_de_rapport: "RICT-03", etabli_le: "2026-04-18", nature: "rapport initial",
      legende: [{ marque: "S", signification: "Suspendu" }], mesures: { avis: 7 },
      lu_par: "modèle · lecture d'un rapport v1", created_at: LU_LE
    }])
  };

  const tableau = lesDocumentsAnalyses(lignes);
  assert.equal(tableau.length, 3, "une famille n'est pas arrivée jusqu'au tableau");

  for (const document of tableau) {
    assert.equal(document.lueLe, LU_LE,
      `${document.famille} : la date d'analyse ne traverse pas son groupeur`);
    assert.ok(document.luPar,
      `${document.famille} : le lecteur ne traverse pas son groupeur`);
    assert.ok(document.titre && document.titre !== ceQueDitLaFamille(document.famille).nom,
      `${document.famille} : le titre ne traverse pas son groupeur`);
    assert.ok(document.dit, `${document.famille} : les mesures ne traversent pas`);
  }

  // **La date du document, et le document de Fichiers.** Un fil n'en a pas : il
  // n'est pas une ligne de Fichiers, et sa date est celle du dernier message —
  // déjà vérifiée par `lueLe` ci-dessus. Les deux autres en ont, et c'est par
  // `documentId` que le choix depuis Fichiers sait ce qui est déjà analysé.
  for (const famille of [FAMILLE.CR, FAMILLE.CONTROLE]) {
    const document = tableau.find((un) => un.famille === famille);
    assert.ok(document.documentId,
      `${famille} : le document de Fichiers ne traverse pas son groupeur`);
    assert.ok(document.quand,
      `${famille} : la date du document ne traverse pas son groupeur`);
  }
});
