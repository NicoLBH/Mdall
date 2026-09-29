/**
 * Ce que le projet a écarté, et qu'on n'a pas eu à demander.
 *
 * Les quatre gisements sont **gratuits** : chaque cas de ce fichier construit
 * une mémoire telle que le travail normal la laisse, et vérifie qu'un écarté en
 * sort sans que personne n'ait rien saisi.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  VU, MOT_DU_VU, ecartsObserves, ecartsObservesParSujet, phraseDeLEcart
} from "./ecarts-observes.js";

/** Une valeur versée, telle que la base la porte. */
const verse = (id, {
  le, zones = [], valeur = "0,5 m", sujet = "Profondeur hors gel",
  cle = "profondeur-hors-gel", status = "assumed", detail = null, du = ""
}) => {
  const ligne = {
    id, project_id: "p1", subject_key: cle,
    nature: "contrainte", domain: "structure", status, superseded_by: null,
    detail, created_at: le, decided_at: le, zones,
    payload: { subject: sujet, value: valeur, zones }
  };
  // La date du document lu, quand le cas en a besoin : c'est elle qui fait foi,
  // et non la date de saisie (voir `le-temps-des-valeurs.js`).
  if (du) ligne.payload.provenance = { quoi: `rapport ${id}`, le: du };
  return ligne;
};

/* ── 1. Une valeur qu'une autre a remplacée ──────────────────────────────── */

test("une valeur remplacée est un possible écarté, et personne ne l'a saisi", () => {
  // C'est le gisement le plus banal, et il n'a jamais été lu comme tel : « 0,47 m
  // a été écarté au profit de 0,60 m » est exactement ce qu'on s'apprêtait à
  // redemander six mois plus tard.
  const ecarts = ecartsObserves([
    verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"], valeur: "0,47 m" }),
    verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"], valeur: "0,60 m" })
  ]);

  assert.equal(ecarts.length, 1);
  assert.equal(ecarts[0].quoi, "0,47 m");
  assert.equal(ecarts[0].vu, VU.CORRIGEE);
  assert.equal(ecarts[0].cle, "profondeur-hors-gel");
  assert.match(ecarts[0].dit, /0,60 m/);
  // La date de l'écartement, pas celle de l'écarté : c'est le jour où la
  // nouvelle valeur est arrivée qu'on a cessé de tenir l'ancienne.
  assert.equal(ecarts[0].quand, "2026-09-09T08:00:00Z");
  // Personne n'a écrit pourquoi : le dire serait inventer un motif (règle 5).
  assert.equal(ecarts[0].pourquoi, "");
});

test("la même valeur versée deux fois n'écarte rien", () => {
  // Il n'y a pas de possible sur la table : il y a la même réponse, deux fois.
  // Un doublon présenté comme un écarté ferait croire à une hésitation.
  const ecarts = ecartsObserves([
    verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"], valeur: "0,60 m" }),
    verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"], valeur: "0,60 m" })
  ]);

  assert.deepEqual(ecarts, []);
});

/* ── 2. Un document arrivé après coup ────────────────────────────────────── */

test("un document plus ancien saisi plus tard laisse un écarté", () => {
  // Le rapport de mars, saisi en septembre, ne dit pas ce que le projet dit
  // aujourd'hui. Sa valeur a été sur la table, et elle n'a pas fait foi.
  const ecarts = ecartsObserves([
    verse("juin", { du: "2026-06-12", le: "2026-07-01T08:00:00Z", zones: ["batiment-a"], valeur: "0,80 m" }),
    verse("mars", { du: "2026-03-04", le: "2026-09-20T08:00:00Z", zones: ["batiment-a"], valeur: "0,50 m" })
  ]);

  const apresCoup = ecarts.find((ecart) => ecart.vu === VU.APRES_COUP);
  assert.ok(apresCoup, "le versement rétrospectif n'a pas été vu comme un écarté");
  assert.equal(apresCoup.quoi, "0,50 m");
  assert.match(apresCoup.dit, /0,80 m/);

  // **Et il ne se lit pas aussi comme un remplacement.** Un document plus
  // ancien saisi plus tard est aussi un versement éclipsé ; le lire ainsi
  // ferait croire à une correction là où il n'y a qu'une chronologie.
  assert.deepEqual(ecarts.filter((ecart) => ecart.id === "mars").map((ecart) => ecart.vu),
    [VU.APRES_COUP]);
});

test("deux documents qui disent la même chose n'écartent rien", () => {
  const ecarts = ecartsObserves([
    verse("juin", { du: "2026-06-12", le: "2026-07-01T08:00:00Z", zones: ["batiment-a"], valeur: "0,80 m" }),
    verse("mars", { du: "2026-03-04", le: "2026-09-20T08:00:00Z", zones: ["batiment-a"], valeur: "0,80 m" })
  ]);

  assert.equal(ecarts.filter((ecart) => ecart.vu === VU.APRES_COUP).length, 0);
});

/* ── 3. Une ligne sortie du projet ───────────────────────────────────────── */

test("une ligne portée par une zone retirée est un abandon, avec le nom du retrait", () => {
  const ecarts = ecartsObserves([
    {
      id: "z1", project_id: "p1", subject_key: "zone-z1", nature: "intendance", domain: "",
      status: "rejected", superseded_by: null, detail: null,
      created_at: "2026-09-01T09:00:00Z", decided_at: "2026-09-01T09:00:00Z",
      payload: { subject: "Zone d'essai", zoneDefinition: true, value: "une partie de l'ouvrage" }
    },
    verse("s1", {
      le: "2026-09-02T09:00:00Z", zones: ["zone-d-essai"],
      valeur: "1,00 m", sujet: "Section Lx", cle: "section-lx"
    })
  ]);

  const abandon = ecarts.find((ecart) => ecart.cle === "section-lx");
  assert.ok(abandon, "la ligne sortie du projet n'a pas été vue");
  assert.equal(abandon.vu, VU.ABANDONNEE);
  // Le nom du retrait vient de `memoire-perimetre.js`, et n'est pas réécrit ici.
  assert.match(abandon.dit, /Zone d'essai/);
});

/* ── 4. Une ligne refusée en revue — le gisement le plus riche ───────────── */

test("un refus de revue porte son motif, écrit par quelqu'un au moment du refus", () => {
  // C'est le seul des quatre qui porte un motif humain, et il n'a rien coûté :
  // refuser un item de proposition est le geste normal d'une revue.
  const ecarts = ecartsObserves([
    verse("r1", {
      le: "2026-09-10T08:00:00Z", zones: ["batiment-a"], valeur: "0,90 m",
      status: "rejected", detail: "le rapport cité ne dit pas cela"
    })
  ]);

  assert.equal(ecarts.length, 1);
  assert.equal(ecarts[0].vu, VU.REFUSEE);
  assert.equal(ecarts[0].quoi, "0,90 m");
  assert.equal(ecarts[0].pourquoi, "le rapport cité ne dit pas cela");
});

test("un refus sans motif écrit reste un écarté : il dit au moins ce qui a été refusé", () => {
  const ecarts = ecartsObserves([
    verse("r1", { le: "2026-09-10T08:00:00Z", zones: [], valeur: "0,90 m", status: "rejected" })
  ]);

  assert.equal(ecarts.length, 1);
  assert.equal(ecarts[0].pourquoi, "");
});

/* ── Ce que l'assemblage garantit ────────────────────────────────────────── */

test("une ligne vue deux fois ne se lit qu'une, sous ce qui en dit le plus", () => {
  // Une ligne refusée dont la zone est ensuite retirée tombe dans deux
  // gisements. Deux lignes sous le même sujet, avec deux explications
  // différentes, feraient croire à deux possibles.
  const ecarts = ecartsObserves([
    {
      id: "z1", project_id: "p1", subject_key: "zone-z1", nature: "intendance", domain: "",
      status: "rejected", superseded_by: null, detail: null,
      created_at: "2026-09-01T09:00:00Z", decided_at: "2026-09-01T09:00:00Z",
      payload: { subject: "Zone d'essai", zoneDefinition: true, value: "une partie de l'ouvrage" }
    },
    verse("s1", {
      le: "2026-09-02T09:00:00Z", zones: ["zone-d-essai"], valeur: "1,00 m",
      sujet: "Section Lx", cle: "section-lx", status: "rejected", detail: "hors sujet"
    })
  ]);

  const siennes = ecarts.filter((ecart) => ecart.id === "s1");
  assert.equal(siennes.length, 1, "la même ligne se lit deux fois");
  // Le refus porte un motif humain ; le retrait ne porte qu'un nom de zone.
  assert.equal(siennes[0].vu, VU.REFUSEE);
  assert.equal(siennes[0].pourquoi, "hors sujet");
});

test("le plus récent d'abord : c'est ce qui vient d'être écarté qu'on relit", () => {
  const ecarts = ecartsObserves([
    verse("vieux", {
      le: "2026-01-05T08:00:00Z", zones: [], valeur: "0,30 m",
      cle: "a", sujet: "A", status: "rejected"
    }),
    verse("neuf", {
      le: "2026-09-05T08:00:00Z", zones: [], valeur: "0,90 m",
      cle: "b", sujet: "B", status: "rejected"
    })
  ]);

  assert.deepEqual(ecarts.map((ecart) => ecart.id), ["neuf", "vieux"]);
});

test("un écarté sans valeur ne se montre pas : il n'y a rien à lire", () => {
  // « quelque chose a été écarté » sans dire quoi n'apprend rien, et prend la
  // place d'une ligne qui apprendrait quelque chose.
  const muet = verse("r1", { le: "2026-09-10T08:00:00Z", zones: [], status: "rejected" });
  muet.payload.value = "";
  muet.statement = "";

  assert.deepEqual(ecartsObserves([muet]), []);
});

test("le regroupement se fait sur la clé sans préfixe, pour qu'une décision retrouve les siens", () => {
  // Tout l'intérêt : les écartés d'une décision ne sont pas écrits sur la
  // décision, ils sont dans l'histoire de la valeur. `decision:X` et `X`
  // partagent donc la même clé de regroupement.
  const parSujet = ecartsObservesParSujet([
    verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"], valeur: "0,47 m" }),
    verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"], valeur: "0,60 m" }),
    verse("d1", {
      le: "2026-09-09T08:00:00Z", zones: ["batiment-a"], valeur: "0,60 m",
      cle: "decision:profondeur-hors-gel", status: "rejected"
    })
  ]);

  assert.deepEqual([...parSujet.keys()], ["profondeur-hors-gel"]);
  assert.equal(parSujet.get("profondeur-hors-gel").length, 2);
});

test("un écarté sans sujet ne se range pas sous un sujet qui n'existe pas", () => {
  // Une clé vide rangerait ensemble des écartés qui n'ont rien à voir, et
  // l'écran les montrerait sous la première ligne venue.
  const parSujet = ecartsObservesParSujet([
    verse("r1", { le: "2026-09-10T08:00:00Z", zones: [], valeur: "0,90 m", cle: "", status: "rejected" })
  ]);

  assert.equal(parSujet.has(""), false);
  assert.equal(parSujet.size, 0);
});

test("une phrase d'écart dit comment on l'a vu, puis ce qu'on a vu", () => {
  const dite = phraseDeLEcart({ vu: VU.CORRIGEE, dit: "« 0,60 m » a pris sa place" });

  assert.match(dite, /^une valeur plus récente l'a remplacé/);
  assert.match(dite, /0,60 m/);

  // Un écart qui n'a rien de plus à dire ne traîne pas de tiret vide.
  assert.equal(phraseDeLEcart({ vu: VU.REFUSEE, dit: "" }), MOT_DU_VU[VU.REFUSEE]);
});

test("chaque façon de voir se dit en français, et aucune ne dit pourquoi", () => {
  // « Une valeur plus récente l'a remplacé » est un constat ; « il était trop
  // cher » serait une invention. Une clé sans libellé s'afficherait telle
  // quelle sous une ligne de la mémoire.
  const vus = Object.values(VU);
  assert.equal(new Set(vus).size, vus.length);
  for (const vu of vus) assert.ok(MOT_DU_VU[vu], `« ${vu} » n'a pas de libellé`);
  assert.equal(Object.keys(MOT_DU_VU).length, vus.length);
});

test("rien ne se verse : une mémoire vide ne produit rien, et aucun écart n'a d'auteur", () => {
  // Un écart constaté est une lecture de la mémoire, refaite à chaque
  // affichage. S'il portait un signataire, on le prendrait pour une
  // affirmation du projet (règle 1).
  assert.deepEqual(ecartsObserves([]), []);
  assert.deepEqual(ecartsObserves(null), []);

  const ecarts = ecartsObserves([
    verse("r1", { le: "2026-09-10T08:00:00Z", zones: [], valeur: "0,90 m", status: "rejected" })
  ]);
  assert.deepEqual(Object.keys(ecarts[0]).sort(),
    ["cle", "dit", "id", "pourquoi", "quand", "quoi", "vu"]);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Ce que la note en dit
 *
 * Un calcul juste que personne ne lit ne vaut rien. La phrase de la note est le
 * premier endroit où le renversement se voit : elle cessait d'être un reproche
 * pour devenir une piste.
 * ════════════════════════════════════════════════════════════════════════════ */

test("une décision muette dit combien Mdall en a constaté", async () => {
  const { noteDeLaMemoire } = await import("./note-de-la-memoire.js");

  // Une décision qui ne note pas ses écartés, et une valeur du même sujet qu'un
  // versement plus récent a corrigée. Personne n'a rien saisi.
  const memoire = [
    {
      id: "d1", project_id: "p1", subject_key: "decision:profondeur-hors-gel",
      nature: "decision", domain: "structure", status: "assumed", superseded_by: null,
      created_at: "2026-09-09T08:00:00Z", decided_at: "2026-09-09T08:00:00Z", zones: [],
      payload: {
        subject: "Profondeur hors gel", value: "0,60 m",
        decision: { question: "Quelle profondeur hors gel ?", ecartes: [], motif: "" },
        provenance: { par: "Ourdine Ferrand" }
      }
    },
    verse("v1", { le: "2026-09-07T08:00:00Z", zones: ["batiment-a"], valeur: "0,47 m" }),
    verse("v2", { le: "2026-09-09T08:00:00Z", zones: ["batiment-a"], valeur: "0,60 m" }),
    // **Une ligne refusée que le temps a depuis remplacée.** Elle ne vaut plus,
    // et c'est justement le cas qu'il faut compter : un possible écarté est
    // presque toujours une ligne que la mémoire ne montre plus.
    {
      ...verse("x1", {
        le: "2026-09-08T08:00:00Z", zones: ["batiment-a"], valeur: "0,90 m",
        status: "rejected", detail: "le rapport cité ne dit pas cela"
      }),
      superseded_by: "v2"
    }
  ];

  const ligne = noteDeLaMemoire(memoire).parties
    .flatMap((partie) => partie.lignes)
    .find((une) => une.cle === "decisions");

  assert.ok(ligne, "la note ne parle pas des décisions");
  assert.match(ligne.phrase, /une ne dit pas ce qu'elle a écarté/);
  assert.match(ligne.phrase, /Mdall en a constaté 2/);
});

test("la note se tait quand il n'y a rien à constater", async () => {
  // « et Mdall en a constaté 0 » ferait douter du calcul plutôt que d'avouer un
  // vide. Zéro ne s'écrit pas, ici comme partout dans la note.
  const { noteDeLaMemoire } = await import("./note-de-la-memoire.js");

  const ligne = noteDeLaMemoire([{
    id: "d1", project_id: "p1", subject_key: "decision:couverture",
    nature: "decision", domain: "", status: "assumed", superseded_by: null,
    created_at: "2026-09-09T08:00:00Z", decided_at: "2026-09-09T08:00:00Z", zones: [],
    payload: {
      subject: "Couverture", value: "bac acier",
      decision: { question: "Quelle couverture ?", ecartes: [], motif: "" }
    }
  }]).parties.flatMap((partie) => partie.lignes).find((une) => une.cle === "decisions");

  assert.match(ligne.phrase, /une ne dit pas ce qu'elle a écarté/);
  assert.doesNotMatch(ligne.phrase, /constaté/);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Le câblage : seul le code qui le porte en témoigne
 *
 * **Une fonction pure s'éprouve par son résultat ; un câblage ne s'éprouve que
 * par le code qui le porte.** Quatre gisements justes que l'écran ne dessine
 * pas, c'est le champ « Examine » qui reste vide.
 * ════════════════════════════════════════════════════════════════════════════ */

const source = async (chemin) => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  return readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
};

// `[\\s\\S]*?` et non `[^)]*` : une signature peut porter une valeur par défaut
// qui contient elle-même des parenthèses — `constates = new Map()`.
const bloc = (texte, nom) =>
  texte.match(new RegExp(`\\nfunction ${nom}\\([\\s\\S]*?\\) \\{\\n([\\s\\S]*?)\\n\\}\\n`))?.[1] ?? "";

test("l'écran constate sur toute la mémoire, pas sur la page qu'il montre", async () => {
  /**
   * Un possible écarté est presque toujours une ligne que la recherche ne montre
   * pas — remplacée, refusée, sortie du projet. Le calculer sur les lignes
   * filtrées rendrait une liste vide sur la mémoire la plus riche en écartés.
   */
  const ecran = await source("../views/project-memory.js");

  assert.match(ecran, /ecartsObservesParSujet\(view\.assertions \?\? \[\]\)/,
    "l'écran constate sur ce qu'il affiche : les écartés ont déjà été filtrés");

  // **Une fois pour la page, et non par sujet.** Le calcul parcourt la mémoire
  // entière ; l'appeler pour chaque ligne la parcourrait une fois par ligne.
  assert.equal(ecran.split("ecartsObservesParSujet(").length - 1, 1,
    "le calcul se refait par sujet, ou il ne se fait plus");
});

test("l'écran se tait là où la décision a noté ses écartés", async () => {
  /**
   * Une mention qui s'affiche partout n'oriente plus — on l'a appris en retirant
   * « a bougé récemment ». Et un constat de machine par-dessus une phrase de
   * projet ferait lire le second à la place de la première.
   */
  const ecran = await source("../views/project-memory.js");
  const constate = bloc(ecran, "ceQueMdallAConstate");

  assert.ok(constate, "ceQueMdallAConstate est introuvable");
  assert.match(constate, /payload\?\.decision\?\.ecartes/,
    "l'écran ne regarde pas ce que la décision déclare");
  assert.match(constate, /if \(declares\) return \[\];/,
    "le constat se superpose à ce qu'un humain a écrit");
});

test("les écartés constatés se dessinent, et se disent constatés", async () => {
  const ecran = await source("../views/project-memory.js");
  const rendu = bloc(ecran, "renderCeQuonAEcarte");

  assert.ok(rendu, "renderCeQuonAEcarte est introuvable");
  assert.match(rendu, /phraseDeLEcart\(ecart\)/,
    "l'écran réécrit la phrase de l'écart au lieu de la demander");
  assert.match(rendu, /jamais versé/,
    "rien ne dit que ce n'est pas une affirmation du projet");

  // **Et la ligne les dessine.** Une fonction que personne n'appelle ne montre
  // rien, et rien ne tombe.
  const ligne = bloc(ecran, "renderAssertion");
  assert.match(ligne, /renderCeQuonAEcarte\(ecarts, cle\)/,
    "les écartés constatés ne sont dessinés nulle part");
  const sujet = bloc(ecran, "renderSujet");
  assert.match(sujet, /ecarts: sujet\?\.ecarts \?\? \[\]/,
    "le sujet ne passe pas ses écartés à la ligne");

  // Et le sujet les porte : sans ce maillon, la ligne dessinerait une liste
  // toujours vide, et aucune épreuve ne tomberait.
  assert.match(ecran, /ecarts: ceQueMdallAConstate\(sujet, constates\)/,
    "les sujets ne portent pas ce qui a été constaté");
});

test("la fenêtre de fermeture fait de la raison un menu, et le porte dehors", async () => {
  /**
   * **Un clic, pas une phrase.** Un champ libre en fin de journée ne se remplit
   * pas — et une raison qu'on aurait choisie sans qu'elle sorte de la fenêtre
   * serait un menu qui ne sert à rien.
   */
  const fenetre = await source("../views/ui/decision-du-sujet.js");

  assert.match(fenetre, /RAISONS_DITES/,
    "la fenêtre n'offre pas le domaine des raisons");
  assert.match(fenetre, /<option value="">/,
    "aucune option vide : une raison serait cochée par défaut");
  assert.match(fenetre, /raison: texte\(hote\.querySelector\(`\[data-decision-raison="\$\{rang\}"\]`\)\?\.value\)/,
    "la raison choisie ne sort pas de la fenêtre");

  /**
   * **Sur la rangée elle-même**, et non ailleurs dans le fichier : un menu
   * écrit mais jamais dessiné ne se choisit pas, et le code qui le lit
   * continuerait de le nommer sans que rien ne tombe.
   */
  const rangee = fenetre.slice(
    fenetre.indexOf("const ecarte = (rang)"),
    fenetre.indexOf('<div class="fichiers-saisie"')
  );

  assert.match(rangee, /data-decision-ecarte/, "la rangée n'a plus de champ pour l'écarté");
  assert.match(rangee, /\$\{raisons\(rang\)\}/, "le menu n'est pas dessiné sur la rangée");
  // Le texte libre reste à côté : on se rappelle parfois un argument qui n'est
  // dans aucune case, et le perdre serait perdre la réponse à « pourquoi pas… ? ».
  assert.match(rangee, /data-decision-pourquoi/,
    "le texte libre a disparu avec l'arrivée du menu");
});
