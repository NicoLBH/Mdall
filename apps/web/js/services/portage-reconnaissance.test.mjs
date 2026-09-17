import test from "node:test";
import assert from "node:assert/strict";

import { phraseDesPortagesProposes, proposerLesPortages } from "./portage-reconnaissance.js";

/* ── Ce que le journal d'une fusion lit ──────────────────────────────────── */

test("« rien reconnu » et « rien de nouveau » ne se disent pas pareil", () => {
  // La première dit que la reconnaissance a tourné sans rien trouver ; la
  // seconde que tout ce qu'elle trouve était déjà su. Les confondre ferait
  // croire, six mois plus tard en relisant le journal, qu'elle ne marchait pas
  // (règle 5).
  assert.equal(phraseDesPortagesProposes({ proposees: 0, reconnues: 0 }), "aucun nom de la mémoire reconnu");
  assert.equal(phraseDesPortagesProposes({ proposees: 0, reconnues: 4 }), "rien de nouveau à rattacher");
});

test("une lecture ratée se dit, au lieu de passer pour un silence", () => {
  // « Rien à rattacher » écrit alors qu'on n'a pas su lire ferait croire la
  // mémoire à jour. C'est exactement le mensonge que le journal existe pour
  // empêcher.
  assert.equal(
    phraseDesPortagesProposes(null),
    "les rattachements n'ont pas pu être cherchés"
  );
});

test("ce qui a été proposé se compte, et attend une confirmation", () => {
  // Jamais « rattachés » : rien n'est acquis, et le dire acquis ferait contester
  // des valeurs que personne n'a mises en doute.
  assert.equal(phraseDesPortagesProposes({ proposees: 1, reconnues: 1 }), "1 rattachement proposé, à confirmer");
  assert.equal(phraseDesPortagesProposes({ proposees: 7, reconnues: 9 }), "7 rattachements proposés, à confirmer");

  for (const combien of [1, 7]) {
    const dit = phraseDesPortagesProposes({ proposees: combien, reconnues: combien });
    assert.match(dit, /à confirmer$/);
    // Sur mots entiers : « proposés » contient « posés », et un garde qui le
    // refuserait refuserait précisément le mot juste.
    assert.doesNotMatch(dit, /\b(rattachés|acquis|confirmés)\b/);
  }
});

test("aucune phrase du journal ne parle comme un outil de visa", () => {
  // Règle 12 : le mot du métier reste dans le code, jamais à l'écran.
  const toutes = [
    phraseDesPortagesProposes(null),
    phraseDesPortagesProposes({ proposees: 0, reconnues: 0 }),
    phraseDesPortagesProposes({ proposees: 0, reconnues: 3 }),
    phraseDesPortagesProposes({ proposees: 2, reconnues: 3 })
  ];

  for (const dite of toutes) {
    assert.ok(dite, "chaque cas doit se dire");
    assert.doesNotMatch(dite, /vis[ae]|valid|approu|en attente de/i);
  }
});

/* ── Ce qu'elle refuse de faire, avant même de lire ──────────────────────── */

/**
 * Ces quatre cas s'arrêtent **avant** la première lecture en base — et c'est ce
 * qui les rend vérifiables ici, sans base. Ce n'est pas un hasard de mise en
 * œuvre : chacun est un cas où il n'y a rien à chercher, et ouvrir une
 * connexion pour s'en apercevoir serait payer une requête pour un non.
 */
const UN_FERME = { id: "p-1", title: "La classe de sol C", status: "closed" };
const UN_DOUBLE = { id: "p-2", title: "La classe de sol C", status: "closed_duplicate" };
const UNE_VALEUR = { id: "v-sol", payload: { subject: "Classe de sol", value: "C" } };

test("un sujet fermé n'entre pas dans la reconnaissance", async () => {
  // Un débat soldé ne met plus rien en question. Lui accrocher une valeur ferait
  // présenter comme contestée une valeur que plus personne ne discute.
  const bilan = await proposerLesPortages({
    projectId: "projet-1",
    confrontations: [{ points: [UN_FERME, UN_DOUBLE], assertions: [UNE_VALEUR] }]
  });

  assert.deepEqual(bilan, { proposees: 0, reconnues: 0, parPoint: new Map() });
});

test("sans projet, elle ne cherche rien — et le dit", async () => {
  // `null` dit « on ne sait pas », jamais « il n'y avait rien ».
  assert.equal(await proposerLesPortages({ confrontations: [{ points: [UN_FERME], assertions: [] }] }), null);
  assert.equal(await proposerLesPortages({}), null);
});

test("une confrontation sans rien à confronter ne coûte pas une requête", async () => {
  const sansValeur = await proposerLesPortages({
    projectId: "projet-1",
    confrontations: [{ points: [{ id: "p-9", status: "open" }], assertions: [] }]
  });
  const sansPoint = await proposerLesPortages({
    projectId: "projet-1",
    confrontations: [{ points: [], assertions: [UNE_VALEUR] }]
  });

  assert.equal(sansValeur.proposees, 0);
  assert.equal(sansPoint.proposees, 0);
});
