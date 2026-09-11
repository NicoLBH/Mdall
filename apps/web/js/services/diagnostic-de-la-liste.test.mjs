import test from "node:test";
import assert from "node:assert/strict";

import { diagnosticDeLaListeDesSujets } from "./diagnostic-de-la-liste.js";

const etat = (reste = {}) => ({
  statut: "closed", priorite: "", recherche: "",
  comptes: { open: 73, closed: 3 },
  charges: 76, apresFiltres: 3, affiches: 3, lignes: 0,
  pagination: { currentPage: 1, totalPages: 1, pageSize: 25, startIndex: 0, endIndex: 3 },
  sousVue: "subjects", tableSeule: true,
  etatBrut: { "projectSubjectsView.subjectsStatusFilter": "closed" },
  fermes: [{ id: "abcdef0123", status: "closed", effectif: "closed", titre: "Reprise d'étanchéité" }],
  ...reste
});

/* ── Les nombres du moment ───────────────────────────────────────────────── */

/**
 * Ce qui manquait après trois tours n'était pas une idée de plus : chaque
 * maillon avait été vérifié isolément et se révélait juste. Ce sont les nombres
 * du moment qui permettent de dire **où** la chaîne se rompt.
 */
test("le relevé porte les longueurs à chaque étape", () => {
  const dit = diagnosticDeLaListeDesSujets(etat());

  assert.match(dit, /comptés\s+: 73 ouverts, 3 fermés/);
  assert.match(dit, /sujets chargés\s+: 76/);
  assert.match(dit, /après filtres\s+: 3/);
  assert.match(dit, /après pagination\s+: 3/);
  assert.match(dit, /lignes rendues\s+: 0/);
});

/**
 * La question qui tranche : trois sujets sont comptés fermés — que portent-ils
 * réellement ? Si la liste est vide alors qu'ils sont là, le défaut est dans le
 * rendu ; s'ils n'y sont pas, il est dans la lecture du statut.
 */
/**
 * L'ordre fait partie de l'état de la liste. Une liste rangée par dernière
 * activité ne montre pas les mêmes lignes en page 1 qu'une liste dans l'ordre du
 * projet — et si le relevé n'en dit rien, deux captures d'écran du même écran
 * paraissent se contredire.
 */
test("le relevé dit dans quel ordre la liste est rangée", () => {
  assert.match(diagnosticDeLaListeDesSujets({ tri: "derniere-activite" }), /tri\s+: derniere-activite/);
  assert.match(diagnosticDeLaListeDesSujets({}), /tri\s+: ordre du projet/);
});

test("il dit ce que portent les sujets comptés fermés", () => {
  const dit = diagnosticDeLaListeDesSujets(etat());

  assert.match(dit, /les 1 sujets comptés fermés/);
  assert.match(dit, /status=closed/);
  assert.match(dit, /effectif=closed/);
});

test("il nomme les quatre cases où le filtre a vécu", () => {
  const dit = diagnosticDeLaListeDesSujets(etat({
    etatBrut: {
      "projectSubjectsView.subjectsStatusFilter": "closed",
      "situationsView.subjectsStatusFilter": "open"
    }
  }));

  assert.match(dit, /projectSubjectsView\.subjectsStatusFilter = closed/);
  assert.match(dit, /situationsView\.subjectsStatusFilter = open/);
});

/* ── Ne pas savoir se dit ────────────────────────────────────────────────── */

test("un nombre qu'on n'a pas se dit « ? », jamais zéro", () => {
  // Règle 5 : « je n'ai pas pu mesurer » et « il y en a zéro » n'appellent pas
  // le même diagnostic, et les confondre enverrait chercher au mauvais endroit.
  const dit = diagnosticDeLaListeDesSujets(etat({ charges: null, comptes: {} }));

  assert.match(dit, /sujets chargés\s+: \?/);
  assert.match(dit, /comptés\s+: \? ouverts, \? fermés/);
});

test("aucun sujet fermé relevé se dit aussi", () => {
  assert.match(diagnosticDeLaListeDesSujets(etat({ fermes: [] })), /aucun sujet compté fermé/);
});

/* ── Ce qu'il n'emporte pas ──────────────────────────────────────────────── */

/**
 * Ce texte part dans un presse-papiers, puis dans un message. Un diagnostic qui
 * emporterait le contenu d'un chantier au passage serait un diagnostic qu'on ne
 * peut pas envoyer.
 */
test("il n'emporte ni description, ni assignés, ni commentaires", () => {
  const dit = diagnosticDeLaListeDesSujets(etat({
    fermes: [{
      id: "abcdef0123456789", status: "closed", effectif: "closed",
      titre: "Reprise d'étanchéité",
      description: "un texte confidentiel", assignees: ["une personne"], comments: ["un message"]
    }]
  }));

  assert.doesNotMatch(dit, /confidentiel/);
  assert.doesNotMatch(dit, /une personne/);
  assert.doesNotMatch(dit, /un message/);
  // L'identifiant est tronqué : il sert à reconnaître la ligne, pas à la rejouer.
  assert.match(dit, /abcdef01 /);
  assert.doesNotMatch(dit, /abcdef0123456789/);
});

test("un titre très long est tronqué", () => {
  const dit = diagnosticDeLaListeDesSujets(etat({
    fermes: [{ id: "x", status: "closed", effectif: "closed", titre: "a".repeat(200) }]
  }));

  assert.doesNotMatch(dit, /a{61}/);
});

test("sans rien lui donner, il rend quand même un relevé lisible", () => {
  const dit = diagnosticDeLaListeDesSujets();

  assert.match(dit, /Mdall — état de la liste des sujets/);
  assert.match(dit, /aucun sujet compté fermé/);
});

/* ── Ce que la tête entend, et ce qui la recouvre ────────────────────────── */

/**
 * **Les deux faits qui manquaient.** Un bouton muet a deux explications, et
 * rien à l'écran ne les distingue : personne ne l'écoute, ou personne ne le
 * clique. Quatre tours ont été dépensés sur la première sans envisager la
 * seconde. Le relevé porte désormais les deux, constatés et non déduits.
 */
test("le relevé dit si la tête écoute, et ce qu'elle a reçu", () => {
  const dit = diagnosticDeLaListeDesSujets({
    ecoute: {
      posee: true,
      gestes: ["subjects-status-filter", "subjects-sort"],
      copies: ["sujets-liste"],
      recus: 0,
      dernier: null
    }
  });

  assert.match(dit, /posée\s+: oui/);
  assert.match(dit, /subjects-sort/);
  assert.match(dit, /gestes reçus\s+: 0/);
  assert.match(dit, /aucun depuis l'ouverture/);
});

test("il nomme les boutons que quelque chose recouvre", () => {
  const dit = diagnosticDeLaListeDesSujets({
    ecoute: { posee: true, gestes: [], copies: [], recus: 0, dernier: null },
    recouvrements: [{ cle: "button.table-head-sort", recouvertPar: "div.project-tabs" }]
  });

  assert.match(dit, /ne reçoivent pas le geste/);
  assert.match(dit, /button\.table-head-sort recouvert par div\.project-tabs/);
});

/**
 * Et quand rien ne recouvre, il le dit aussi : « je n'ai rien trouvé » et « je
 * n'ai pas regardé » envoient chercher à deux endroits différents (règle 5).
 */
test("rien ne recouvre se dit, plutôt que de se taire", () => {
  const dit = diagnosticDeLaListeDesSujets({
    ecoute: { posee: true, gestes: [], copies: [], recus: 3, dernier: null }
  });
  assert.match(dit, /rien ne recouvre les boutons/);
});

test("sans relevé de l'écoute, le diagnostic n'invente pas d'écoute", () => {
  const dit = diagnosticDeLaListeDesSujets({});
  assert.doesNotMatch(dit, /écoute de la tête/);
  assert.doesNotMatch(dit, /rien ne recouvre/);
});
