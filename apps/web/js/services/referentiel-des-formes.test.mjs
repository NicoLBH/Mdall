import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ceQuAilleursOnEnTire, ceQuAilleursOnRegarde, ceQueLeReferentielSaitTrancher,
  domainesDuReferentiel, formeDejaConnue, formesQuiAboutissentA, formesQuiMentionnent,
  formesQuiPartentDe, leVersementDuneForme, monVersementDeCetteForme,
  phraseDeCeQuAilleursOnEnTire, phraseDeCeQuAilleursOnRegarde
} from "./referentiel-des-formes.js";

/** Une forme, telle que `forme-dun-raisonnement.js` la produit. */
const forme = (entrees, conclusions, domaine = "gros-oeuvre") => ({
  entrees, conclusions, domaine,
  empreinte: `${entrees.join(" + ")} > ${conclusions.join(" + ")}`
});

/** Une ligne du référentiel, telle que la base la rend. */
const auReferentiel = (id, entrees, conclusions, domaine = "gros-oeuvre") => ({
  id, entrees, conclusions, domaine,
  empreinte: `${entrees.join(" + ")} > ${conclusions.join(" + ")}`,
  created_at: "2026-01-04T09:00:00Z"
});

const HORS_GEL = forme(["altitude", "nature du sol"], ["profondeur hors gel"]);

const REFERENTIEL = [
  auReferentiel("f-1", ["altitude", "nature du sol"], ["profondeur hors gel"]),
  auReferentiel("f-2", ["nature du sol", "pente du terrain"], ["profondeur hors gel"]),
  auReferentiel("f-3", ["exposition", "zone de neige"], ["charge de neige"], "charpente"),
  // Les mêmes entrées que `f-1`, une autre conclusion. C'est la paire sur
  // laquelle une reconnaissance qui ne lirait que le départ se tromperait.
  auReferentiel("f-4", ["altitude", "nature du sol"], ["classe d'exposition"])
];

/* ── Ce qu'on vient y chercher ───────────────────────────────────────────── */

test("le référentiel dit d'où on part ailleurs pour trancher la même chose", () => {
  // La seule question qui justifie tout le reste : « j'ai à trancher une
  // profondeur hors gel — ailleurs, d'où part-on ? »
  const trouvees = formesQuiAboutissentA(["Profondeur hors gel"], REFERENTIEL);

  assert.deepEqual(trouvees.map((ligne) => ligne.id), ["f-1", "f-2"]);
});

test("ce qu'ailleurs on regarde, et qu'on ne regarde pas ici", () => {
  const ailleurs = ceQuAilleursOnRegarde(HORS_GEL, REFERENTIEL);

  assert.deepEqual(ailleurs.noms, ["pente du terrain"]);
  assert.equal(ailleurs.formes, 1);
});

test("ce qu'on regarde déjà ne se propose pas comme une nouveauté", () => {
  // `f-1` **est** cette forme, et elle remonte parmi les voisines. C'est ce
  // retrait-ci qui la rend inoffensive — pas un filtrage par empreinte en
  // amont, qui a été écrit puis retiré faute de rien protéger.
  const ailleurs = ceQuAilleursOnRegarde(HORS_GEL, REFERENTIEL);

  assert.equal(ailleurs.noms.includes("altitude"), false);
  assert.equal(ailleurs.noms.includes("nature du sol"), false);
});

test("ce qui aboutit ailleurs ne remonte pas", () => {
  // `f-3` part de l'exposition, mais pour une charge de neige. La faire remonter
  // ferait proposer de regarder l'exposition pour une profondeur hors gel.
  const ailleurs = ceQuAilleursOnRegarde(HORS_GEL, REFERENTIEL);

  assert.equal(ailleurs.noms.includes("exposition"), false);
  assert.equal(ailleurs.noms.includes("zone de neige"), false);
});

test("la phrase dit un fait sur le référentiel, pas un manque dans le raisonnement", () => {
  // « Vous avez oublié la pente du terrain » serait un jugement sur un
  // raisonnement que le référentiel ne connaît pas : peut-être la pente a-t-elle
  // été regardée et écartée.
  const dit = phraseDeCeQuAilleursOnRegarde(ceQuAilleursOnRegarde(HORS_GEL, REFERENTIEL));

  assert.equal(dit, "Ailleurs, on part aussi de pente du terrain.");
  assert.equal(/oubli|manque|devriez|aurait fallu/i.test(dit), false);
});

/* ── Ne pas savoir n'est pas savoir qu'il n'y a rien ─────────────────────── */

test("un référentiel non lu ne dit pas que personne ne fait autrement", () => {
  // `null` — la lecture a échoué. Rendre `[]` ferait dire « rien de comparable »
  // à une panne de réseau (règle 5).
  assert.equal(ceQuAilleursOnRegarde(HORS_GEL, null), null);
  assert.equal(formesQuiAboutissentA(["profondeur hors gel"], null), null);
  assert.equal(formeDejaConnue(HORS_GEL, null), null);
  assert.equal(phraseDeCeQuAilleursOnRegarde(null), "");
});

test("un référentiel lu et vide se distingue d'un référentiel non lu", () => {
  const ailleurs = ceQuAilleursOnRegarde(HORS_GEL, []);

  assert.deepEqual(ailleurs, { noms: [], formes: 0 });
  assert.equal(phraseDeCeQuAilleursOnRegarde(ailleurs), "");
});

/* ── Reconnaître une forme déjà versée ───────────────────────────────────── */

test("une forme se reconnaît par son empreinte, et par rien d'autre", () => {
  // C'est elle que la base rend unique. Reconnaître ici selon une autre règle
  // ferait croire à un doublon là où la base n'en voit pas (règle 10).
  assert.equal(formeDejaConnue(HORS_GEL, REFERENTIEL).id, "f-1");
  assert.equal(formeDejaConnue(forme(["altitude"], ["profondeur hors gel"]), REFERENTIEL), null);

  // `f-1` et `f-4` partent des mêmes valeurs et n'aboutissent pas au même
  // endroit. Reconnaître au départ seul les confondrait, et l'on croirait avoir
  // déjà versé une forme qu'on n'a jamais versée.
  assert.equal(formeDejaConnue(forme(["altitude", "nature du sol"], ["classe d'exposition"]), REFERENTIEL).id, "f-4");
});

test("une signature retirée ne fait plus dire « versée »", () => {
  // Elle a été retirée : afficher « versée » ferait croire que le geste n'a pas
  // été pris, et on le referait.
  const vive = { id: "c-1", form_id: "f-1", retire_le: null };
  const retiree = { id: "c-1", form_id: "f-1", retire_le: "2026-04-02T08:00:00Z" };

  assert.equal(monVersementDeCetteForme(HORS_GEL, { formes: REFERENTIEL, versements: [vive] }).id, "c-1");
  assert.equal(monVersementDeCetteForme(HORS_GEL, { formes: REFERENTIEL, versements: [retiree] }), null);
});

test("sans versements lus, on ne dit pas qu'elle n'est pas versée", () => {
  assert.equal(monVersementDeCetteForme(HORS_GEL, { formes: REFERENTIEL, versements: null }), null);
});

/* ── Ce qui part, et qui en répond ───────────────────────────────────────── */

test("le versement ne porte que des noms, un domaine et une signature", () => {
  const versement = leVersementDuneForme(HORS_GEL, {
    projectId: "pr-1", assertionId: "r-1", signePar: "u-1"
  });

  assert.deepEqual(Object.keys(versement.forme).sort(), ["conclusions", "domaine", "entrees"]);
  assert.deepEqual(versement.forme.entrees, ["altitude", "nature du sol"]);
  assert.deepEqual(versement.forme.conclusions, ["profondeur hors gel"]);
});

test("l'empreinte ne s'envoie pas : le serveur la compose", () => {
  // L'envoyer ferait croire qu'on peut la choisir — et un champ qu'on choisit
  // est un champ où quelque chose d'autre peut se cacher.
  const versement = leVersementDuneForme(HORS_GEL, {
    projectId: "pr-1", assertionId: "r-1", signePar: "u-1"
  });

  assert.equal("empreinte" in versement.forme, false);
});

test("rien ne sort sans signataire", () => {
  // Une forme versée sans signataire serait versée par le logiciel, et rien ne
  // sort d'un projet sans que quelqu'un en réponde (règle 1).
  assert.equal(leVersementDuneForme(HORS_GEL, { projectId: "pr-1", signePar: "" }), null);
  assert.equal(leVersementDuneForme(HORS_GEL, { projectId: "", signePar: "u-1" }), null);
});

test("une forme vide ne part pas, même si on la lui donne", () => {
  // `forme-dun-raisonnement.js` n'en produit pas ; si l'une arrive ici, c'est
  // qu'elle n'est pas passée par lui — et rien ne sort par une autre porte.
  const creuse = { entrees: [], conclusions: ["profondeur hors gel"], empreinte: " > profondeur hors gel" };

  assert.equal(leVersementDuneForme(creuse, { projectId: "pr-1", signePar: "u-1" }), null);
});

test("la signature dit le projet, le raisonnement et qui signe", () => {
  const { signature } = leVersementDuneForme(HORS_GEL, {
    projectId: "pr-1", assertionId: "r-1", signePar: "u-1"
  });

  assert.deepEqual(signature, { project_id: "pr-1", assertion_id: "r-1", signed_by: "u-1" });
});

/* ── Ce que ce fichier n'a pas le droit de savoir faire ──────────────────── */

test("rien ici ne rend une valeur au projet", () => {
  // L'interdit fondateur, dans l'autre sens : on ne verse RIEN directement dans
  // la mémoire, et surtout pas ce qui vient d'un autre projet. Ce qu'on apprend
  // d'ailleurs, c'est **où regarder** — c'est au projet de regarder.
  const rendus = [
    ceQuAilleursOnRegarde(HORS_GEL, REFERENTIEL),
    formesQuiAboutissentA(["profondeur hors gel"], REFERENTIEL),
    formeDejaConnue(HORS_GEL, REFERENTIEL)
  ];

  const tout = JSON.stringify(rendus);
  for (const champ of ["value", "valeur", "payload", "subject_key", "decided_by", "project_id"]) {
    assert.ok(!tout.includes(champ), `le référentiel rapporte « ${champ} »`);
  }
});

/* ── L'écran de la Mémoire s'en sert, et ne rapporte rien ────────────────── */

test("la ligne d'un raisonnement dit ce qu'ailleurs on regarde", () => {
  // Une garde sur le **texte** de l'écran, pour le seul défaut qu'elle attrape :
  // un rendu écrit et jamais appelé. C'est la phrase qui justifie toute
  // l'étape — la replier ou l'oublier ne casse aucun service.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  // L'interpolation, pas le nom : la définition porte le même nom.
  assert.match(ecran, /\$\{renderCeQuAilleursOnRegarde\(assertion\)\}/,
    "la ligne ne dit pas ce qu'ailleurs on regarde");
  // Et elle est **hors** du bloc replié : une phrase qu'il faut déplier pour lire
  // est une phrase que personne ne lit.
  const raisonnement = ecran.slice(ecran.indexOf("function renderLeRaisonnement"));
  assert.ok(
    raisonnement.indexOf("renderCeQuAilleursOnRegarde(assertion)")
      < raisonnement.indexOf("renderCeQuiPourraitVoyager(assertion, chemin)"),
    "la phrase est passée après l'encadré replié"
  );
});

test("le geste de sortie est sous la forme entière, et nulle part ailleurs", () => {
  // Un bouton « verser » posé en haut d'une liste ferait signer sans regarder.
  // Sa place **est** la garantie : la signature se donne devant ce qu'on signe.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  const encadre = ecran.slice(
    ecran.indexOf("function renderCeQuiPourraitVoyager"),
    ecran.indexOf("function renderLaSignatureDeLaForme")
  );
  assert.match(encadre, /\$\{renderLaSignatureDeLaForme\(assertion, forme\)\}/,
    "le geste de sortie n'est pas sous la forme");
  assert.equal((ecran.match(/data-forme-verser=/g) ?? []).length, 1,
    "le geste de sortie est proposé à plus d'un endroit");
});

test("la forme signée se recalcule au clic, elle ne voyage pas dans le HTML", () => {
  // Une forme écrite dans l'attribut d'un bouton serait une seconde vérité
  // (règle 4) : elle vieillirait à côté de celle qu'on a montrée, et l'on
  // signerait pour ce qui n'est plus affiché.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  const action = ecran.slice(
    ecran.indexOf("async function verserLaForme"),
    ecran.indexOf("async function repondreAuPortage")
  );
  assert.match(action, /formeDunRaisonnement\(assertion, \{/,
    "la forme versée n'est pas reprise de l'affirmation au moment du clic");
  assert.match(action, /leVersementDuneForme\(forme, \{/,
    "ce qui part n'est pas préparé par le service pur");
});

test("rien ne redescend du référentiel dans la mémoire", () => {
  // L'interdit fondateur : on ne verse RIEN directement dans la mémoire, et
  // surtout pas ce qui vient d'un autre projet. L'écran lit le référentiel pour
  // **dire où regarder** — il n'a aucun chemin pour en tirer une valeur.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  // Aucune des écritures de la mémoire ne part d'une forme lue.
  for (const interdit of [
    /view\.assertions\s*=\s*\[[\s\S]{0,80}view\.formes/,
    /formes[\w.]*\.map\([^)]*=>\s*\(\{[\s\S]{0,120}payload/,
    /proposer[A-Za-z]*\([^)]*forme[sA-Z]/
  ]) {
    assert.equal(interdit.test(ecran), false, `l'écran rapporte le référentiel dans la mémoire`);
  }

  // Et le transport n'a pas de porte de suppression : une forme versée a pu être
  // lue la seconde d'après.
  const transport = readFileSync(
    new URL("./referentiel-des-formes-supabase.js", import.meta.url), "utf8"
  );
  assert.equal(/method:\s*"DELETE"/.test(transport), false,
    "le transport peut supprimer une forme versée");
});

test("sans lecture du référentiel, l'écran ne propose pas le geste", () => {
  // Offrir de verser sans savoir si c'est déjà fait ferait signer deux fois, et
  // la base refuserait la seconde — on croirait la première perdue.
  const ecran = readFileSync(new URL("../views/project-memory.js", import.meta.url), "utf8");

  const signature = ecran.slice(
    ecran.indexOf("function renderLaSignatureDeLaForme"),
    ecran.indexOf("function renderCeQuiLuiRessemble")
  );
  assert.match(signature, /if \(view\.formes === null \|\| view\.versements === null\)/,
    "le geste se propose sur un référentiel qu'on n'a pas lu");
});

/* ── Ce qu'on peut demander AVANT d'avoir tranché ────────────────────────── */

test("en partant de ces valeurs, ailleurs, on a tranché ceci", () => {
  // La seule question qu'on puisse poser au moment de fermer un sujet : on sait
  // de quoi le débat part, on ne sait pas encore où il va.
  const ailleurs = ceQuAilleursOnEnTire(["Altitude", "Nature du sol"], REFERENTIEL);

  assert.deepEqual(ailleurs.noms, ["classe d'exposition", "profondeur hors gel"]);
  assert.equal(phraseDeCeQuAilleursOnEnTire(ailleurs),
    "En partant de ces valeurs, ailleurs, on a tranché classe d'exposition, profondeur hors gel.");
});

test("une seule valeur commune suffit à faire remonter une forme", () => {
  // `f-2` part de la nature du sol et de la pente ; on n'a que la nature du sol.
  // Exiger toutes les entrées ne ferait remonter que les raisonnements déjà
  // identiques — c'est-à-dire ceux qui n'apprennent rien.
  const ailleurs = ceQuAilleursOnEnTire(["Nature du sol"], REFERENTIEL);

  assert.equal(ailleurs.noms.includes("profondeur hors gel"), true);
});

test("ce qui ne part pas de ces valeurs ne remonte pas", () => {
  // `f-3` part de l'exposition et de la zone de neige : rien à voir.
  const ailleurs = ceQuAilleursOnEnTire(["Altitude"], REFERENTIEL);

  assert.equal(ailleurs.noms.includes("charge de neige"), false);
});

test("sans référentiel lu, on ne dit pas ce qu'on tire ailleurs", () => {
  assert.equal(ceQuAilleursOnEnTire(["Altitude"], null), null);
  assert.equal(formesQuiPartentDe(["Altitude"], null), null);
  assert.equal(phraseDeCeQuAilleursOnEnTire(null), "");

  // Lu et vide : ce n'est pas la même chose, et ça se dit autrement.
  assert.deepEqual(ceQuAilleursOnEnTire(["Altitude"], []), { noms: [], formes: 0 });
});

test("sans valeur de départ, la question ne se pose pas", () => {
  // Un sujet dont aucune arête n'est confirmée ne part de rien de connu.
  // Répondre « ailleurs on tranche tout ceci » sur un départ vide ferait
  // remonter le référentiel entier, ce qui ne renseigne sur rien.
  assert.deepEqual(ceQuAilleursOnEnTire([], REFERENTIEL), { noms: [], formes: 0 });
});

/* ── Parcourir le référentiel ────────────────────────────────────────────── */

test("l'index range par ce qu'on sait trancher", () => {
  // Une liste brute de formes est un fichier. Ce qu'on vient demander à un
  // référentiel, c'est « que sait-on trancher, et avec quoi ? ».
  const index = ceQueLeReferentielSaitTrancher(REFERENTIEL);

  assert.deepEqual(index.map((r) => r.conclusion),
    ["profondeur hors gel", "charge de neige", "classe d'exposition"]);
  assert.equal(index[0].formes, 2);
});

test("les départs se réunissent, ils ne se comptent pas deux fois", () => {
  // Trois projets qui tranchent la même chose en partant de l'altitude font une
  // ligne « altitude », pas trois. Le compte des formes reste dit à part.
  const index = ceQueLeReferentielSaitTrancher(REFERENTIEL);
  const horsGel = index.find((r) => r.conclusion === "profondeur hors gel");

  assert.deepEqual(horsGel.entrees, ["altitude", "nature du sol", "pente du terrain"]);
  assert.equal(horsGel.formes, 2);
});

test("le plus su d'abord, et à égalité l'ordre du nom", () => {
  // Sans le second critère, l'ordre serait celui de la lecture : deux lectures
  // de la même mémoire, rangées autrement, ne donneraient pas la même page
  // (règle 10).
  //
  // Le jeu d'essai est fait pour le voir : « zone de sismicité » est lu en
  // premier et doit s'afficher en dernier. Un référentiel dont l'ordre de
  // lecture est déjà l'ordre alphabétique ne prouverait rien.
  const melange = [
    auReferentiel("f-a", ["zone"], ["zone de sismicité"]),
    auReferentiel("f-b", ["portée"], ["flèche admissible"]),
    auReferentiel("f-c", ["altitude"], ["charge de neige"]),
    auReferentiel("f-d", ["altitude", "sol"], ["profondeur hors gel"]),
    auReferentiel("f-e", ["nature du sol"], ["profondeur hors gel"])
  ];

  assert.deepEqual(ceQueLeReferentielSaitTrancher(melange).map((r) => r.conclusion),
    // Repliés, comme la mémoire les replie : les accents partent, et c'est bien
    // sur le nom replié que le tri se fait.
    ["profondeur hors gel", "charge de neige", "fleche admissible", "zone de sismicite"]);
});

test("un référentiel non lu n'a pas un index vide", () => {
  // Un index vide dirait « on ne sait rien trancher » d'une lecture ratée.
  assert.equal(ceQueLeReferentielSaitTrancher(null), null);
  assert.deepEqual(ceQueLeReferentielSaitTrancher([]), []);
});

test("la recherche trouve sur un morceau de nom", () => {
  // Quelqu'un tape ce dont il se souvient. Exiger le mot entier d'un champ de
  // recherche fait une recherche qui ne trouve rien — c'est l'inverse de la
  // reconnaissance d'un nom dans un texte, où « argile » ne doit pas se
  // reconnaître dans « argileux ».
  assert.deepEqual(formesQuiMentionnent("profond", REFERENTIEL).map((f) => f.id),
    ["f-1", "f-2"]);
  assert.deepEqual(formesQuiMentionnent("neige", REFERENTIEL).map((f) => f.id), ["f-3"]);
});

test("la recherche lit aussi le domaine", () => {
  assert.deepEqual(formesQuiMentionnent("charpente", REFERENTIEL).map((f) => f.id), ["f-3"]);
});

test("une recherche vide ne cache rien", () => {
  assert.equal(formesQuiMentionnent("", REFERENTIEL).length, REFERENTIEL.length);
  assert.equal(formesQuiMentionnent("  ", REFERENTIEL).length, REFERENTIEL.length);
});

test("chercher dans un référentiel non lu ne rend pas une liste vide", () => {
  assert.equal(formesQuiMentionnent("profond", null), null);
});

test("les domaines se comptent, et l'absence de domaine ne s'invente pas", () => {
  // Ranger les formes sans domaine sous un domaine inventé ferait croire que
  // quelqu'un l'a dit.
  const sansDomaine = auReferentiel("f-9", ["portée"], ["flèche admissible"], "");
  const domaines = domainesDuReferentiel([...REFERENTIEL, sansDomaine]);

  assert.deepEqual(domaines, [{ domaine: "gros-oeuvre", formes: 3 }, { domaine: "charpente", formes: 1 }]);
  assert.equal(domainesDuReferentiel(null), null);
});
