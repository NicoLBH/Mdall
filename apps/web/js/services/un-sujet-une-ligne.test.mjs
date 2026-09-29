/**
 * Où l'on regarde, et ce qu'on regarde.
 *
 * Deux défauts vus sur une capture d'écran, et le second est le plus coûteux.
 *
 * **La portée s'affichait sans s'interroger.** Chaque ligne porte « Bâtiment A »
 * ou « Ensemble — toutes zones », et c'était la seule puce de l'écran qui
 * n'ouvrait sur rien. Une puce qu'on ne peut pas interroger est un cul-de-sac :
 * on la lit, et l'on ne peut rien en faire.
 *
 * **Une question fermée s'affichait en trois lignes.** La valeur qu'elle fixe,
 * la décision qui l'a tranchée, le raisonnement qui y a mené : trois lignes au
 * même titre, portant le même titre, avec les mêmes puces. On ne savait pas
 * laquelle ouvrir, et personne n'a le temps d'ouvrir les trois.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  FACE, MOT_DE_LA_FACE, MOT_DU_POURQUOI, POURQUOI, BEAUCOUP,
  faceDe, grouperParSujet, parImportance, poidsDuSujet
} from "./memoire-groupes.js";
import {
  ZONE_TOUT_LOUVRAGE, filterByZone, filterByZoneSeule
} from "./project-zones.js";
import {
  selectionDeLaMemoire, champsDeLaMemoire, ZONE_TOUT_LOUVRAGE_SEUL
} from "./memoire-selection.js";
import { noteDeLaMemoire } from "./note-de-la-memoire.js";

/* ════════════════════════════════════════════════════════════════════════════
 * Où l'on regarde : `zone:` et `seulement:`
 * ════════════════════════════════════════════════════════════════════════════ */

const dit = (sujet, valeur, zones = null, quoi = {}) => ({
  id: `a-${sujet}`, kind: "base-datum", subject_key: sujet,
  status: "assumed", superseded_by: null, zones,
  statement: `${sujet} : ${valeur}`,
  payload: { subject: sujet, value: valeur, ...(zones ? { zones } : {}) },
  ...quoi
});

const zone = (label, cle) => ({
  id: `z-${cle}`, kind: "base-datum", subject_key: `zone:${cle}`,
  status: "assumed", superseded_by: null, zones: null,
  statement: `${label} : une partie de l'ouvrage`,
  payload: { subject: label, value: "une partie de l'ouvrage", zoneDefinition: true, zoneKey: cle }
});

const MEMOIRE = [
  zone("Bâtiment A", "batiment-a"),
  zone("Bâtiment B", "batiment-b"),
  dit("hauteur-de-reference", "9 m"),
  dit("nature-des-volets@batiment-a", "alu", ["batiment-a"]),
  dit("nature-des-volets@batiment-b", "bois", ["batiment-b"]),
  dit("exposition@batiment-a", "sud", ["batiment-a", "batiment-b"])
];

const sujets = (lignes) => lignes.map((une) => une.subject_key).sort();

test("ce qui s'applique à une zone comprend ce qui vaut partout", () => {
  /**
   * **C'est la lecture de tous les jours.** Retrancher la hauteur de référence
   * du projet donnerait un bâtiment A qui ne porte plus ses propres entrées, et
   * l'on conclurait qu'elle manque. C'est déjà ce que le rejeu fait, et une
   * seconde décision ici finirait par ne plus dire la même chose (règle 10).
   */
  assert.deepEqual(sujets(filterByZone(MEMOIRE, "batiment-a")), [
    "exposition@batiment-a",
    "hauteur-de-reference",
    "nature-des-volets@batiment-a",
    "zone:batiment-a",
    "zone:batiment-b"
  ]);

  // Une affirmation qui porte deux zones entre dans les deux lectures.
  assert.ok(sujets(filterByZone(MEMOIRE, "batiment-b")).includes("exposition@batiment-a"));
  // Et celle de l'autre bâtiment n'y est pas.
  assert.ok(!sujets(filterByZone(MEMOIRE, "batiment-b")).includes("nature-des-volets@batiment-a"));
});

test("ce qui n'est écrit que là est une autre question", () => {
  /**
   * C'est celle de l'**audit d'un découpage** : une zone qui ne porte rien en
   * propre n'avait pas besoin d'exister, et une zone qui porte trop cache une
   * règle générale qu'on a recopiée.
   */
  assert.deepEqual(sujets(filterByZoneSeule(MEMOIRE, "batiment-a")), [
    "exposition@batiment-a",
    "nature-des-volets@batiment-a"
  ]);

  // La hauteur de référence n'y est pas : elle vaut partout, elle n'est pas
  // « du bâtiment A ». C'est toute la différence avec la lecture d'en face.
  assert.ok(!sujets(filterByZoneSeule(MEMOIRE, "batiment-a")).includes("hauteur-de-reference"));
});

test("l'ouvrage entier se lit aussi, par l'autre bout", () => {
  /**
   * `seulement:ensemble` — ce qui n'est écrit pour aucune zone en particulier.
   * `zone:` n'a pas de valeur pour cela : lire « l'ouvrage entier » ne filtre
   * rien, et offrir un filtre qui ne filtre pas serait un cul-de-sac de plus.
   */
  assert.deepEqual(sujets(filterByZoneSeule(MEMOIRE, ZONE_TOUT_LOUVRAGE)), [
    "hauteur-de-reference",
    "zone:batiment-a",
    "zone:batiment-b"
  ]);
});

/**
 * **Le vrai vocabulaire, pas une recopie.** Une fixture qui réécrit à la main
 * ce que le code déclare n'éprouve que sa propre orthographe — et la première
 * version de celle-ci avait oublié une zone, ce qui faisait passer une épreuve
 * sur un filtre que la barre ne savait pas lire.
 */
const CHAMPS = champsDeLaMemoire(MEMOIRE);

const cherchee = (query) => sujets(selectionDeLaMemoire(MEMOIRE, { query, champs: CHAMPS }));

test("le vocabulaire des zones vient du projet, et se tait quand il n'y en a pas", () => {
  const cles = (champs) => champs.map((une) => une.key);

  assert.ok(cles(CHAMPS).includes("zone"));
  assert.ok(cles(CHAMPS).includes("seulement"));
  assert.deepEqual(
    CHAMPS.find((une) => une.key === "zone").values.map((une) => une.value),
    ["batiment-a", "batiment-b"]
  );

  /**
   * **Rien tant que le projet n'a pas de zone.** Un champ dont aucune valeur
   * n'est connue ferait passer `zone:bâtiment-a` pour une faute de frappe sur
   * un projet qui n'a simplement pas encore de découpage (règle 5).
   */
  const sansZone = champsDeLaMemoire([dit("hauteur-de-reference", "9 m")]);
  assert.ok(!cles(sansZone).includes("zone"));
  assert.ok(!cles(sansZone).includes("seulement"));

  // Et le reste du vocabulaire ne bouge pas pour autant.
  assert.deepEqual(cles(sansZone), cles(CHAMPS).filter((une) => !["zone", "seulement"].includes(une)));
});

test("la barre sait les deux lectures, et elles se tapent", () => {
  assert.ok(cherchee("zone:bâtiment-a").includes("hauteur-de-reference"));
  // Et elle **retire** ce qui est d'ailleurs : c'est tout l'objet du filtre.
  assert.ok(!cherchee("zone:bâtiment-a").includes("nature-des-volets@batiment-b"));
  assert.ok(cherchee("zone:bâtiment-b").includes("nature-des-volets@batiment-b"));

  assert.ok(!cherchee("seulement:bâtiment-a").includes("hauteur-de-reference"));
  assert.deepEqual(cherchee("seulement:ensemble"), [
    "hauteur-de-reference", "zone:batiment-a", "zone:batiment-b"
  ]);

  // Sans filtre de zone, rien ne se retire : c'est la mémoire entière.
  assert.equal(cherchee("").length, MEMOIRE.length);
});

test("les deux se composent, et l'intersection ne s'écroule pas", () => {
  // `zone:` puis `seulement:` : ce qui s'applique au bâtiment A **et** n'est
  // écrit que là. Un filtre qui écraserait l'autre rendrait la dernière ligne
  // tapée, pas l'intersection.
  assert.deepEqual(cherchee("zone:bâtiment-a seulement:bâtiment-a"), [
    "exposition@batiment-a", "nature-des-volets@batiment-a"
  ]);

  /**
   * **Et le second filtre porte sur ce que le premier a retenu.** « Ce qui
   * s'applique au bâtiment A, et qui est écrit pour le bâtiment B » ne peut
   * être que ce qui porte les deux zones. Appliqué à la mémoire entière, le
   * second ramènerait ce qui n'est écrit que pour B — que le premier venait
   * d'écarter.
   */
  assert.deepEqual(cherchee("zone:bâtiment-a seulement:bâtiment-b"),
    ["exposition@batiment-a"]);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Un sujet, une ligne
 * ════════════════════════════════════════════════════════════════════════════ */

const QUESTION = "quelle-est-la-profondeur-hors-gel";

const laFace = (cle, quoi = {}) => ({
  id: cle, kind: "base-datum", subject_key: cle, status: "assumed", superseded_by: null,
  payload: {}, ...quoi
});

test("la face d'une affirmation se lit sur sa clé, jamais sur son titre", () => {
  /**
   * Deux sujets peuvent porter le même libellé — c'est le propre d'un projet à
   * plusieurs bâtiments —, et la clé porte déjà sa zone.
   */
  assert.deepEqual(faceDe(laFace(QUESTION)), { cle: QUESTION, face: FACE.VALEUR });
  assert.deepEqual(faceDe(laFace(`decision:${QUESTION}`)), { cle: QUESTION, face: FACE.DECISION });
  assert.deepEqual(faceDe(laFace(`raisonnement:${QUESTION}`)),
    { cle: QUESTION, face: FACE.RAISONNEMENT });
  assert.deepEqual(faceDe(laFace("regle:profondeur")), { cle: "profondeur", face: FACE.FONCTION });

  // Une clé vide n'a rien à regrouper : l'appelant garde la ligne seule plutôt
  // que de la ranger sous un sujet qui n'existe pas.
  assert.deepEqual(faceDe({}), { cle: "", face: FACE.VALEUR });

  // Deux zones, deux sujets — et ils le restent.
  assert.notEqual(faceDe(laFace("hauteur@batiment-a")).cle, faceDe(laFace("hauteur@batiment-b")).cle);
});

test("les trois faces d'une question fermée ne font qu'une ligne", () => {
  const groupes = grouperParSujet([
    laFace(QUESTION),
    laFace(`decision:${QUESTION}`),
    laFace(`raisonnement:${QUESTION}`),
    laFace("profondeur-hors-gel")
  ]);

  assert.equal(groupes.length, 2, "quatre lignes devraient faire deux sujets");
  assert.equal(groupes[0].cle, QUESTION);
  assert.equal(groupes[0].tete.subject_key, QUESTION);
  assert.deepEqual(groupes[0].faces.map((une) => une.face),
    [FACE.VALEUR, FACE.DECISION, FACE.RAISONNEMENT]);
});

test("l'ordre des faces est celui de la lecture, pas celui de la base", () => {
  /**
   * On lit d'abord **ce que le projet tient**, puis qui l'a tranché, puis par où
   * l'on est passé. La base, elle, les range par clé — et `decision:` vient
   * avant la valeur dans l'alphabet.
   */
  const [groupe] = grouperParSujet([
    laFace(`raisonnement:${QUESTION}`),
    laFace(`decision:${QUESTION}`),
    laFace(QUESTION)
  ]);

  assert.deepEqual(groupe.faces.map((une) => une.face),
    [FACE.VALEUR, FACE.DECISION, FACE.RAISONNEMENT]);
  assert.equal(groupe.tete.subject_key, QUESTION);
});

test("la tête est la face la plus haute parmi celles qu'on a retenues", () => {
  /**
   * Chercher `nature:raisonnement` doit montrer le raisonnement : la sélection
   * a déjà écarté les autres, et un groupe qui les ramènerait rendrait une
   * ligne que la recherche venait d'exclure.
   */
  const [groupe] = grouperParSujet([
    laFace(`raisonnement:${QUESTION}`),
    laFace(`decision:${QUESTION}`)
  ]);

  assert.equal(groupe.tete.subject_key, `decision:${QUESTION}`);
  assert.equal(groupe.faces.length, 2);
});

test("aucune face ne disparaît d'un regroupement", () => {
  /**
   * Une ligne qu'un regroupement escamoterait serait une ligne qu'on ne peut
   * plus retrouver — c'est exactement ce qu'un écran de mémoire ne doit jamais
   * faire. Elles sont pliées, pas retirées.
   */
  const lignes = [
    laFace(QUESTION), laFace(`decision:${QUESTION}`), laFace(`raisonnement:${QUESTION}`),
    laFace("profondeur"), laFace("regle:profondeur"), laFace("autre-chose")
  ];

  const rendues = grouperParSujet(lignes).flatMap((groupe) => groupe.faces.map((une) => une.assertion));
  assert.deepEqual(new Set(rendues), new Set(lignes));
  assert.equal(rendues.length, lignes.length);
});

test("l'ordre des groupes est celui des lignes reçues", () => {
  // C'est la liste qu'on regardait : la remettre dans un autre ordre ferait
  // perdre celle qu'on lisait.
  const groupes = grouperParSujet([
    laFace("zzz"), laFace(`decision:${QUESTION}`), laFace("aaa"), laFace(QUESTION)
  ]);

  assert.deepEqual(groupes.map((une) => une.cle), ["zzz", QUESTION, "aaa"]);
});

test("une ligne sans clé garde sa place au milieu des autres", () => {
  /**
   * Elle ne se regroupe avec rien — il n'y a pas de sujet sous lequel la
   * ranger —, et elle ne doit pas pour autant être repoussée à la fin : la
   * liste changerait d'ordre autour d'une ligne que l'écran ne distingue pas.
   */
  const sansCle = { id: "?", kind: "base-datum", subject_key: "", payload: {} };
  const groupes = grouperParSujet([laFace("a"), sansCle, laFace("b")]);

  assert.deepEqual(groupes.map((une) => une.tete.subject_key), ["a", "", "b"]);
});

/* ── Ce qui fait remonter un sujet ───────────────────────────────────────── */

const pese = (groupe, quoi = {}) => poidsDuSujet(groupe, quoi);
const unGroupe = (...cles) => grouperParSujet(cles.map((cle) => laFace(cle)))[0];

test("un constat qui attend quelqu'un passe devant tout le reste", () => {
  /**
   * C'est du travail en attente ; le reste est de la lecture. Les poids sont
   * des **ordres de grandeur**, pas des points : deux raisons faibles ne valent
   * jamais une forte, et c'est voulu.
   */
  const attendu = pese(unGroupe("un-constat"), { attend: () => true });
  const porteur = pese(unGroupe("un-nom"), { combienSappuient: () => 40 });

  assert.deepEqual(attendu.pourquoi, [POURQUOI.APPELLE_UN_GESTE]);
  assert.ok(attendu.poids > porteur.poids);
});

test("un raisonnement qui ne dit pas tout remonte", () => {
  /**
   * L'écran dit déjà « ce raisonnement ne dit pas tout — on ne sait pas ce qui
   * a été examiné », et cette phrase-là **est** le travail qui reste. La ranger
   * au milieu de trois cents lignes revient à ne pas l'avoir écrite (règle 5).
   */
  const { pourquoi } = pese(unGroupe(QUESTION, `raisonnement:${QUESTION}`), {
    neDitPasTout: (une) => une.subject_key.startsWith("raisonnement:")
  });

  assert.deepEqual(pourquoi, [POURQUOI.NE_DIT_PAS_TOUT]);
});

test("une face suffit à remonter son sujet", () => {
  // C'est le sujet qu'on trie, pas la ligne : la lacune est sur le
  // raisonnement, et c'est la valeur qui s'affiche en tête.
  const groupe = unGroupe(QUESTION, `raisonnement:${QUESTION}`);
  assert.equal(groupe.tete.subject_key, QUESTION);

  const { pourquoi } = pese(groupe, {
    neDitPasTout: (une) => une.subject_key.startsWith("raisonnement:")
  });
  assert.deepEqual(pourquoi, [POURQUOI.NE_DIT_PAS_TOUT]);
});

test("un nom sur lequel beaucoup s'appuient remonte, et pas un nom isolé", () => {
  assert.deepEqual(pese(unGroupe("x"), { combienSappuient: () => BEAUCOUP }).pourquoi,
    [POURQUOI.PORTE_BEAUCOUP]);
  assert.deepEqual(pese(unGroupe("x"), { combienSappuient: () => BEAUCOUP - 1 }).pourquoi, []);

  /**
   * **N'importe laquelle des faces suffit**, et pas seulement celle qu'on
   * affiche : c'est le **sujet** qu'on trie. Regarder la seule tête ferait
   * manquer un sujet dont c'est la décision que quinze fonctions lisent.
   */
  const groupe = unGroupe(QUESTION, `decision:${QUESTION}`);
  assert.equal(groupe.tete.subject_key, QUESTION);
  assert.deepEqual(
    pese(groupe, {
      combienSappuient: (une) => (une.subject_key.startsWith("decision:") ? 40 : 0)
    }).pourquoi,
    [POURQUOI.PORTE_BEAUCOUP]
  );
});

test("ce qu'on ne sait pas ne remonte rien", () => {
  /**
   * Sans les fonctions qui répondent, on ne pèse rien : inventer ferait
   * remonter toute la mémoire, ce qui revient à ne rien trier (règle 5).
   */
  assert.deepEqual(pese(unGroupe("x")), { poids: 0, pourquoi: [] });
});

test("les raisons se cumulent, et chacune se dit en français", () => {
  const { pourquoi } = pese(unGroupe("x"), {
    attend: () => true, neDitPasTout: () => true, combienSappuient: () => 40
  });

  assert.deepEqual(pourquoi,
    [POURQUOI.APPELLE_UN_GESTE, POURQUOI.NE_DIT_PAS_TOUT, POURQUOI.PORTE_BEAUCOUP]);

  // **Un ordre qu'on ne peut pas expliquer se subit.** Chaque raison a son mot.
  for (const une of pourquoi) assert.ok(MOT_DU_POURQUOI[une], une);
  for (const une of Object.values(FACE)) assert.ok(MOT_DE_LA_FACE[une], une);
});

test("à poids égal, l'ordre reçu est conservé", () => {
  /**
   * Deux sujets que rien ne distingue ne doivent pas changer de place entre
   * deux frappes : on perdrait celui qu'on était en train de lire.
   */
  const groupes = grouperParSujet(["a", "b", "c", "d"].map((cle) => laFace(cle)));
  const ranges = parImportance(groupes, {
    attend: (une) => une.subject_key === "c"
  });

  assert.deepEqual(ranges.map((une) => une.cle), ["c", "a", "b", "d"]);
  assert.deepEqual(ranges[0].pourquoi, [POURQUOI.APPELLE_UN_GESTE]);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Un chiffre qui donne une prise
 * ════════════════════════════════════════════════════════════════════════════ */

const constat = (id, domaine) => ({
  id, kind: "avis", subject_key: id, status: "assumed", superseded_by: null,
  domain: domaine, statement: `${id} : à voir`,
  payload: { subject: id, value: "à voir", status: "REPORTED" }
});

const laLigneDesConstats = (lignes) => noteDeLaMemoire(lignes)
  .parties.flatMap((partie) => partie.lignes).find((une) => une.cle === "ouverts");

test("un chiffre de constats se découpe par domaine, et chaque part s'ouvre", () => {
  /**
   * « 380 constats attendent d'être levés » est un nombre qui décourage, pas qui
   * oriente. Découpé, il rend la main.
   */
  const lignes = [
    ...["a", "b", "c", "d", "e"].map((id) => constat(id, "structure")),
    ...["f", "g", "h"].map((id) => constat(id, "incendie")),
    constat("i", "sol"),
    constat("j", "urbanisme")
  ];

  const ligne = laLigneDesConstats(lignes);
  assert.equal(ligne.combien, 10);
  assert.deepEqual(ligne.detail.map((une) => [une.combien, une.phrase]),
    [[5, "Structure"], [3, "Incendie"], [1, "Sol"], [1, "1 autre domaine"]]);

  // Chaque part mène à ce qu'elle compte — sauf le reste, qui n'est pas un
  // domaine : lui donner la requête du total ferait cliquer sur « 1 » pour en
  // obtenir dix.
  assert.equal(ligne.detail[0].requete, "ouverts:oui domaine:structure");
  assert.equal(ligne.detail[3].requete, "");
});

test("ce qu'on ne peut même pas ranger se dit, et se cherche", () => {
  // Un constat sans domaine n'est pas un constat de moins : c'est un travail
  // de plus.
  const ligne = laLigneDesConstats([
    constat("a", "structure"), constat("b", null), constat("c", null)
  ]);

  assert.deepEqual(ligne.detail.map((une) => [une.combien, une.phrase]),
    [[2, "sans domaine"], [1, "Structure"]]);
  assert.equal(ligne.detail[0].requete, "ouverts:oui domaine:non-classé");
});

test("un seul domaine ne se découpe pas", () => {
  // La part vaudrait le total, et la répéter ferait lire deux fois le même
  // chiffre.
  const ligne = laLigneDesConstats([constat("a", "structure"), constat("b", "structure")]);

  assert.equal(ligne.combien, 2);
  assert.deepEqual(ligne.detail, []);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Le câblage : seul le code qui le porte en témoigne
 *
 * **Une fonction pure s'éprouve par son résultat ; un câblage ne s'éprouve que
 * par le code qui le porte.** Un regroupement qui ne serait branché nulle part
 * ne casse rien : il rend une liste juste que personne ne dessine.
 * ════════════════════════════════════════════════════════════════════════════ */

const source = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

const bloc = (texte, nom) =>
  texte.match(new RegExp(`\\nfunction ${nom}\\([^)]*\\) \\{\\n([\\s\\S]*?)\\n\\}\\n`))?.[1] ?? "";

test("l'écran regroupe avant de paginer, et trie après", async () => {
  /**
   * **Plier après aurait donné des pages de douze lignes qui n'en montrent que
   * cinq**, et un compte qui ne se retrouve nulle part. L'ordre des trois
   * gestes n'est donc pas indifférent.
   */
  const ecran = await source("../views/project-memory.js");
  const liste = ecran.slice(ecran.indexOf("export function renderMemoryList"));

  /**
   * **On trie des sujets, pas des lignes.** Trier avant de regrouper mettrait
   * un constat ouvert en tête, puis le replierait sous la valeur qu'il
   * accompagne — et l'on ne saurait plus pourquoi la ligne est là.
   */
  assert.match(liste, /parImportance\(grouperParSujet\(/,
    "le tri ne porte pas sur les sujets regroupés");

  const sujets = liste.indexOf("parImportance(grouperParSujet(");
  const page = liste.indexOf("paginateItems(");

  assert.ok(sujets > 0, "l'écran ne regroupe pas : la question s'affiche encore en trois lignes");
  assert.ok(page > sujets,
    "on pagine avant de regrouper : les pages ne compteraient plus leurs lignes");
  assert.match(liste, /paginateItems\(sujets,/,
    "la pagination compte des lignes, pas des sujets");
});

test("ce qui pèse un sujet vient d'où la question a déjà sa réponse", async () => {
  /**
   * Un constat ouvert se reconnaît dans les lectures du rail, les lacunes d'un
   * raisonnement dans le fichier qui les compte. Les refaire ici en ferait deux
   * réponses à la même question, et l'une se mettrait à taire ce que l'autre
   * dit (règle 10).
   */
  const ecran = await source("../views/project-memory.js");
  const pese = bloc(ecran, "commentOnPese");

  assert.ok(pese, "commentOnPese est introuvable");
  assert.match(pese, /isOpenFinding\(/, "l'écran redécide ce qu'est un constat ouvert");
  assert.match(pese, /lacunesDuRaisonnement\(/, "l'écran recompte les lacunes d'un raisonnement");
  assert.match(pese, /emploisParAffirmation\(/, "l'écran recompte les emplois");

  /**
   * **`null` n'est pas zéro.** Tant que le raisonnement n'est pas là, il n'a pas
   * de lacune connue — et en inventer ferait remonter toute la mémoire, ce qui
   * revient à ne rien trier (règle 5).
   */
  assert.match(pese, /Boolean\(assertion\?\.payload\?\.raisonnement\)/,
    "un sujet sans raisonnement compterait comme incomplet");
});

test("les autres faces restent à portée de clic", async () => {
  const ecran = await source("../views/project-memory.js");
  const faces = bloc(ecran, "renderLesAutresFaces");

  assert.ok(faces, "renderLesAutresFaces est introuvable");
  assert.match(faces, /data-memory-open=/,
    "les faces pliées n'ouvrent rien : elles seraient perdues");
  assert.match(faces, /MOT_DE_LA_FACE\[/, "les faces pliées ne se nomment pas");

  const sujet = bloc(ecran, "renderSujet");
  assert.ok(sujet, "renderSujet est introuvable");
  assert.match(sujet, /assertion !== tete/,
    "la tête se répéterait sous elle-même");

  // **Et la ligne les dessine.** Une fonction qui les rend sans que personne ne
  // l'appelle est du code que rien n'exécute : les faces disparaîtraient de
  // l'écran sans qu'une épreuve tombe.
  const ligne = bloc(ecran, "renderAssertion");
  assert.ok(ligne, "renderAssertion est introuvable");
  assert.match(ligne, /renderLesAutresFaces\(autres\)/,
    "les faces pliées ne sont dessinées nulle part");
  assert.match(ligne, /renderPourquoiEnHaut\(pourquoi\)/,
    "la raison du classement ne se lit nulle part");
});

test("la puce de la zone mène à sa zone", async () => {
  const ecran = await source("../views/project-memory.js");

  assert.match(ecran, /data-memory-zone="\$\{escapeHtml\(zoneOf\(assertion\)\)\}"/,
    "la puce de la zone ne porte pas la zone de sa ligne");
  assert.match(ecran, /withFilter\(view\.query, lesChamps\(\), "zone", bouton\.dataset\.memoryZone\)/,
    "le clic sur la puce n'écrit pas dans la barre");
  assert.match(ecran, /memoryZone: "zone"/,
    "le menu de l'en-tête n'est branché sur rien");

  /**
   * **Et l'en-tête l'offre.** Un geste branché sur un menu qui n'est pas
   * dessiné ne se déclenche jamais : la puce mènerait quelque part, et
   * l'en-tête resterait muet sur la seule chose qui découpe l'ouvrage.
   *
   * Rien quand le projet n'a pas de zone : un menu à un seul choix fait douter
   * de son propre écran.
   */
  assert.match(ecran, /menu\("memoryZone", \[/,
    "l'en-tête n'offre pas de menu de zone");
  assert.match(ecran, /definedZones\(view\.assertions \?\? \[\]\)\.length\s*\n?\s*\? menu\("memoryZone"/,
    "le menu de zone paraît sur un projet qui n'en a pas");
});

test("le vocabulaire de la barre se demande, il ne se recopie pas", async () => {
  /**
   * Les zones changent avec le projet. Vingt appels qui liraient chacun la
   * constante auraient tous oublié les zones, et `zone:bâtiment-a` se lirait
   * comme une faute de frappe dans dix-neuf d'entre eux (règle 10).
   */
  const ecran = await source("../views/project-memory.js");

  const dehors = ecran
    .slice(ecran.indexOf("export function champsDeLaMemoire"))
    .slice(ecran.slice(ecran.indexOf("export function champsDeLaMemoire")).indexOf("function lesChamps"));

  assert.doesNotMatch(dehors, /MEMORY_FIELDS/,
    "un appel lit encore la constante : il aura oublié les zones");
  assert.match(ecran, /function lesChamps\(\) \{\s*return champsDeLaMemoire\(view\.assertions \?\? \[\]\);/,
    "lesChamps ne lit pas la mémoire regardée");
});
