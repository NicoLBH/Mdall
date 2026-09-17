import test from "node:test";
import assert from "node:assert/strict";

import {
  RESOLUTION, applicationsDeLaMemoire, applicationsDuVersement, couvertureDesApplications,
  dependancesDesApplications, emploisParAffirmation, emploisParSujet, impactDe, lecturesDeLaRegle
} from "./memoire-applications.js";

/** Une règle appliquée, telle que la mémoire garde son instantané. */
const regle = (sujet, valeur, lit = [], { zones = null, sauf = [], id = null, proposition = null } = {}) => ({
  id: id ?? `r-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  project_id: "p1",
  subject_key: `regle:${sujet}`,
  status: "assumed",
  superseded_by: null,
  proposition_id: proposition,
  zones,
  payload: {
    subject: sujet, value: valeur, referentiel: true,
    ...(zones ? { zones } : {}),
    regle: {
      conditions: lit.map((nom) => ({ sujet: nom, operateur: "=", valeur: ["x"] })),
      sauf: sauf.map((nom) => ({ sujet: nom, operateur: "!=", valeur: ["y"] })),
      sinon: ""
    }
  }
});

/** Une valeur du projet, avec sa portée. */
const dit = (sujet, valeur, { zones = null, id = null, proposition = null, remplacee = null } = {}) => ({
  id: id ?? `a-${sujet}${zones ? `@${zones.join("+")}` : ""}`,
  project_id: "p1",
  subject_key: sujet,
  status: "assumed",
  superseded_by: remplacee,
  proposition_id: proposition,
  zones,
  payload: { subject: sujet, value: valeur, ...(zones ? { zones } : {}) }
});

test("les conditions et les exceptions se lisent dans l'ordre du texte", () => {
  const r = regle("Colonne sèche", "exigée", ["Classement", "Hauteur"], { sauf: ["Désenfumage"] });
  assert.deepEqual(lecturesDeLaRegle(r), ["Classement", "Hauteur", "Désenfumage"]);
});

test("une règle fait une ligne par nom lu, avec son rang", () => {
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement", "Hauteur"]),
    dit("Colonne sèche", "exigée"),
    dit("Classement", "3e famille B"),
    dit("Hauteur", "26 m")
  ];

  const lignes = applicationsDeLaMemoire(memoire, { projectId: "p1" });

  assert.equal(lignes.length, 2);
  assert.deepEqual(lignes.map((l) => [l.input_subject, l.input_rank]), [["Classement", 1], ["Hauteur", 2]]);
  assert.equal(lignes[0].output_assertion_id, "a-Colonne sèche");
  assert.equal(lignes[0].input_assertion_id, "a-Classement");
  assert.equal(lignes[0].rule_assertion_id, "r-Colonne sèche");
  assert.equal(lignes[0].zone, "");
  assert.equal(lignes[0].resolution, RESOLUTION.RECONSTRUIT);
});

test("le même nom lu deux fois fait deux lectures", () => {
  // C'est exactement ce que l'unicité de `assertion_dependencies` interdisait,
  // et c'est ce qui permet de répondre à « employée combien de fois ? ».
  const memoire = [
    regle("Section", "0,60 m", ["Hauteur", "Hauteur"]),
    dit("Section", "0,60 m"),
    dit("Hauteur", "26 m")
  ];

  const lignes = applicationsDeLaMemoire(memoire);
  assert.equal(lignes.length, 2);
  assert.deepEqual(lignes.map((l) => l.input_rank), [1, 2]);
  assert.equal(emploisParSujet(lignes).get("hauteur").lectures, 2);
  // Un lien dit « repose sur », pas « combien de fois » : il ne se dédouble pas.
  assert.equal(dependancesDesApplications(lignes).length, 1);
});

test("la même règle sur trois zones fait trois appels", () => {
  const memoire = [
    regle("Degré CF", "CF 1 h", ["Classement"], { zones: ["batiment-a"] }),
    regle("Degré CF", "CF 1/2 h", ["Classement"], { zones: ["batiment-b"] }),
    dit("Degré CF", "CF 1 h", { zones: ["batiment-a"] }),
    dit("Degré CF", "CF 1/2 h", { zones: ["batiment-b"] }),
    dit("Classement", "3e famille B", { zones: ["batiment-a"] }),
    dit("Classement", "2e famille", { zones: ["batiment-b"] })
  ];

  const lignes = applicationsDeLaMemoire(memoire);

  assert.equal(lignes.length, 2);
  const parZone = new Map(lignes.map((l) => [l.zone, l]));
  assert.equal(parZone.get("batiment-a").input_assertion_id, "a-Classement@batiment-a");
  assert.equal(parZone.get("batiment-b").input_assertion_id, "a-Classement@batiment-b");
  // Le degré du bâtiment A ne repose jamais sur le classement du bâtiment B.
  assert.equal(parZone.get("batiment-a").output_assertion_id, "a-Degré CF@batiment-a");
});

test("une valeur portée l'emporte sur une valeur qui vaut partout", () => {
  const memoire = [
    regle("Degré CF", "CF 1 h", ["Classement"], { zones: ["batiment-a"] }),
    dit("Degré CF", "CF 1 h", { zones: ["batiment-a"] }),
    dit("Classement", "3e famille B"),
    dit("Classement", "2e famille", { zones: ["batiment-a"] })
  ];

  const lignes = applicationsDeLaMemoire(memoire);
  assert.equal(lignes[0].input_assertion_id, "a-Classement@batiment-a");
});

test("on n'emprunte jamais la valeur d'une autre zone", () => {
  const memoire = [
    regle("Degré CF", "CF 1 h", ["Classement"], { zones: ["batiment-a"] }),
    dit("Degré CF", "CF 1 h", { zones: ["batiment-a"] }),
    dit("Classement", "2e famille", { zones: ["batiment-b"] })
  ];

  const lignes = applicationsDeLaMemoire(memoire);
  // La lecture existe — la règle a bien lu ce nom — mais elle ne désigne rien
  // ici. Le trou se compte, il ne se comble pas avec le voisin.
  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].input_assertion_id, null);
  assert.equal(lignes[0].input_subject, "Classement");
});

test("un nom que personne n'a versé fait une lecture orpheline, jamais une absence", () => {
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement", "Portance du sol"]),
    dit("Colonne sèche", "exigée"),
    dit("Classement", "3e famille B")
  ];

  const lignes = applicationsDeLaMemoire(memoire);
  assert.equal(lignes.length, 2);
  assert.equal(lignes[1].input_assertion_id, null);
  assert.equal(emploisParSujet(lignes).get("portance du sol").orphelines, 1);
  // Et elle ne fabrique pas de lien : on ne repose pas sur ce qui n'existe pas.
  assert.deepEqual(dependancesDesApplications(lignes).map((l) => l.depends_on_assertion_id), ["a-Classement"]);
});

test("une règle n'emprunte jamais la valeur d'une autre zone", () => {
  // Rattacher la sortie du bâtiment B à la règle du bâtiment A serait le pire
  // des mensonges : elle se lirait comme la valeur d'ici.
  const memoire = [
    regle("Degré CF", "CF 1 h", ["Classement"], { zones: ["batiment-a"] }),
    dit("Degré CF", "CF 1/2 h", { zones: ["batiment-b"] }),
    dit("Classement", "3e famille B", { zones: ["batiment-a"] })
  ];

  const lignes = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  assert.deepEqual(lignes.map((l) => l.output_assertion_id), ["r-Degré CF@batiment-a"]);
});

test("une règle dont aucune valeur ne porte la conclusion est sa propre sortie", () => {
  // C'est le trou qui coupait les chaînes en deux. « Famille : 2 » peut n'exister
  // que dans la règle qui l'établit ; ne chercher que parmi les valeurs faisait
  // disparaître la règle **et** toutes ses lectures de l'index.
  const memoire = [
    regle("Famille", "2", ["Nombre d'étages"]),
    dit("Nombre d'étages", "2")
  ];

  const [ligne] = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  assert.equal(ligne.output_assertion_id, "r-Famille");
  assert.equal(ligne.input_assertion_id, "a-Nombre d'étages");
});

test("une règle qui lit un sujet conclu par une autre règle la trouve", () => {
  // Sans ce recours, les soixante-huit règles qui lisent « Famille » perdaient
  // leur entrée, et une chaîne de six pas s'annonçait à deux.
  const memoire = [
    regle("Famille", "2", ["Nombre d'étages"]),
    dit("Nombre d'étages", "2"),
    regle("Degré CF", "CF 1 h", ["Famille"]),
    dit("Degré CF", "CF 1 h")
  ];

  const lignes = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  const cf = lignes.find((l) => l.rule_assertion_id === "r-Degré CF");
  assert.equal(cf.input_assertion_id, "r-Famille");
  assert.equal(cf.output_assertion_id, "a-Degré CF");
});

test("une valeur versée l'emporte sur la règle qui la conclut", () => {
  // La valeur est plus proche de ce que le projet affirme aujourd'hui que le
  // bloc qui l'a produite : on ne remonte à la règle qu'à défaut.
  const memoire = [
    regle("Famille", "2", ["Nombre d'étages"]),
    dit("Famille", "2"),
    dit("Nombre d'étages", "2"),
    regle("Degré CF", "CF 1 h", ["Famille"]),
    dit("Degré CF", "CF 1 h")
  ];

  const cf = applicationsDeLaMemoire(memoire, { projectId: "p1" })
    .find((l) => l.rule_assertion_id === "r-Degré CF");
  assert.equal(cf.input_assertion_id, "a-Famille");
});

test("une règle qui est sa propre sortie ne se lit pas elle-même", () => {
  // Le lien tournerait en rond, et l'onde ferait un cycle qui n'existe pas dans
  // le raisonnement.
  const memoire = [regle("Famille", "2", ["Famille"])];

  const [ligne] = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  assert.equal(ligne.output_assertion_id, "r-Famille");
  assert.equal(ligne.input_assertion_id, null);
});

test("ce qui a été remplacé ne fait plus d'appel", () => {
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement"], { id: "r-vieille" }),
    dit("Colonne sèche", "exigée", { id: "a-vieille", remplacee: "a-neuve" }),
    dit("Classement", "3e famille B")
  ];
  // La ligne remplacée ne décrit plus l'état : son appel non plus. La règle
  // encore en vigueur, elle, reste sa propre sortie — c'est ce qu'elle est.
  assert.deepEqual(
    applicationsDeLaMemoire(memoire).map((l) => l.output_assertion_id),
    ["r-vieille"]
  );

  // Une règle remplacée, elle, ne dit plus rien.
  assert.deepEqual(
    applicationsDeLaMemoire(memoire.map((a) => (
      a.id === "r-vieille" ? { ...a, superseded_by: "r-neuve" } : a
    ))),
    []
  );
});

test("un versement n'écrit que les appels de ce qu'il vient d'écrire", () => {
  // Réécrire les appels de toute la mémoire à chaque fusion remplacerait des
  // liens enregistrés en leur temps par des liens résolus aujourd'hui.
  const ancienne = [
    regle("Ancrage", "0,99 m", ["Hors gel"], { id: "r-vieux" }),
    dit("Ancrage", "0,99 m", { id: "a-vieux" }),
    dit("Hors gel", "0,99 m", { id: "a-horsgel" })
  ];
  const ecrites = [
    regle("Colonne sèche", "exigée", ["Classement"], { id: "r-neuf", proposition: "P7" }),
    dit("Colonne sèche", "exigée", { id: "a-neuf", proposition: "P7" }),
    dit("Classement", "3e famille B", { id: "a-classement", proposition: "P7" })
  ];

  const lignes = applicationsDuVersement({
    memoire: ancienne, ecrites, projectId: "p1", propositionId: "P7"
  });

  assert.deepEqual(lignes.map((l) => l.output_assertion_id), ["a-neuf"]);
  assert.equal(lignes[0].resolution, RESOLUTION.ENREGISTRE);
  assert.equal(lignes[0].proposition_id, "P7");
});

test("une règle lit la valeur versée avec elle, pas celle qu'elle remplace", () => {
  // Une étude verse ses conclusions et les valeurs qu'elles ont produites ; la
  // règle a lu celles-là, pas la version d'avant qui vaut encore à cet instant.
  const memoire = [dit("Classement", "2e famille", { id: "a-avant" })];
  const ecrites = [
    regle("Degré CF", "CF 1 h", ["Classement"], { id: "r-neuf", proposition: "P7" }),
    dit("Degré CF", "CF 1 h", { id: "a-degre", proposition: "P7" }),
    dit("Classement", "3e famille B", { id: "a-apres", proposition: "P7" })
  ];

  const lignes = applicationsDuVersement({ memoire, ecrites, projectId: "p1", propositionId: "P7" });
  assert.equal(lignes[0].input_assertion_id, "a-apres");
});

test("une reconstruction se déclare comme telle", () => {
  const memoire = [
    regle("Colonne sèche", "exigée", ["Classement"]),
    dit("Colonne sèche", "exigée"),
    dit("Classement", "3e famille B")
  ];

  const lignes = applicationsDeLaMemoire(memoire, { projectId: "p1", resolution: RESOLUTION.RECONSTRUIT });
  assert.equal(lignes[0].resolution, "reconstruit");
  // Elle ne s'attribue aucun versement : elle n'en vient d'aucun.
  assert.equal(lignes[0].proposition_id, null);
});

test("les emplois se comptent par nom, avec leurs zones et leurs sorties", () => {
  const memoire = [
    regle("Degré CF", "CF 1 h", ["Classement"], { zones: ["batiment-a"] }),
    regle("Colonne sèche", "exigée", ["Classement"], { zones: ["batiment-a"] }),
    dit("Degré CF", "CF 1 h", { zones: ["batiment-a"] }),
    dit("Colonne sèche", "exigée", { zones: ["batiment-a"] }),
    dit("Classement", "3e famille B", { zones: ["batiment-a"] })
  ];

  const emploi = emploisParSujet(applicationsDeLaMemoire(memoire)).get("classement");
  assert.equal(emploi.lectures, 2);
  assert.equal(emploi.sorties.size, 2);
  assert.deepEqual([...emploi.zones], ["batiment-a"]);
  assert.equal(emploi.orphelines, 0);
});

/** Une lecture, telle que la table la porte. */
const lecture = (sortie, entree, { rang = 1, zone = "", sujet = "x", resolution = "enregistre" } = {}) => ({
  output_assertion_id: sortie, input_assertion_id: entree, input_subject: sujet,
  input_rank: rang, zone, resolution
});

test("les emplois se comptent par affirmation, pas seulement par nom", () => {
  // Deux valeurs successives d'un même sujet ne servent pas les mêmes fonctions :
  // c'est la ligne qu'on regarde qui a un identifiant, pas le libellé.
  const lignes = [
    lecture("degre", "classement-v1"),
    lecture("colonne", "classement-v1"),
    lecture("desenfumage", "classement-v2")
  ];

  const emplois = emploisParAffirmation(lignes);
  assert.equal(emplois.get("classement-v1").lectures, 2);
  assert.equal(emplois.get("classement-v1").sorties.size, 2);
  assert.equal(emplois.get("classement-v2").lectures, 1);
});

test("une même sortie lue deux fois compte deux lectures pour une sortie", () => {
  const emplois = emploisParAffirmation([
    lecture("section", "hauteur", { rang: 1 }),
    lecture("section", "hauteur", { rang: 2 })
  ]);
  assert.equal(emplois.get("hauteur").lectures, 2);
  assert.equal(emplois.get("hauteur").sorties.get("section"), 2);
});

test("l'impact se range par distance, parce qu'une liste de 47 ne se lit pas", () => {
  const lignes = [
    lecture("horsgel", "altitude"),
    lecture("neige", "altitude"),
    lecture("ancrage", "horsgel"),
    lecture("charge", "neige"),
    lecture("section", "ancrage"),
    lecture("section", "charge"),
    lecture("ferraillage", "section")
  ];

  const rendu = impactDe("altitude", lignes);

  assert.deepEqual(rendu.strates, [["horsgel", "neige"], ["ancrage", "charge"], ["section"], ["ferraillage"]]);
  assert.equal(rendu.total, 6);
  // « Employée deux fois » n'est pas « six affirmations touchées ».
  assert.equal(rendu.lectures, 2);
  assert.deepEqual(rendu.cycles, []);
});

test("une affirmation atteinte par deux chemins se lit au plus court", () => {
  const lignes = [
    lecture("b", "a"),
    lecture("c", "a"),
    lecture("d", "b"),
    lecture("d", "c")
  ];
  const rendu = impactDe("a", lignes);
  assert.deepEqual(rendu.strates, [["b", "c"], ["d"]]);
  assert.equal(rendu.total, 3);
});

test("un cycle se nomme, il ne boucle pas", () => {
  const lignes = [lecture("b", "a"), lecture("c", "b"), lecture("a", "c")];
  const rendu = impactDe("a", lignes);

  assert.deepEqual(rendu.strates, [["b"], ["c"]]);
  assert.deepEqual(rendu.cycles, [{ de: "c", vers: "a" }]);
});

test("une valeur sur laquelle rien ne repose le dit sans détour", () => {
  const rendu = impactDe("commune", [lecture("degre", "classement")]);
  assert.deepEqual(rendu.strates, []);
  assert.equal(rendu.total, 0);
  assert.equal(rendu.lectures, 0);
});

test("la couverture distingue ce qui a été figé de ce qui a été rapproché", () => {
  // Un graphe où l'on ne fait pas la différence se lit comme s'il était tout
  // entier sûr.
  const rendu = couvertureDesApplications([
    lecture("degre", "classement", { resolution: RESOLUTION.ENREGISTRE }),
    lecture("colonne", "classement", { resolution: RESOLUTION.RECONSTRUIT }),
    lecture("colonne", null, { rang: 2, resolution: RESOLUTION.RECONSTRUIT, sujet: "Portance" })
  ]);

  assert.deepEqual(rendu, { lectures: 3, enregistrees: 1, reconstruites: 2, orphelines: 1 });
});

/* ── Les lectures d'un utilitaire ────────────────────────────────────────── */

/** Une contrainte déduite, qui déclare ce qu'elle a lu du projet. */
const deduite = (sujet, valeur, lectures = [], { id = null, zones = null, utilitaire = "outil_V1" } = {}) => ({
  id: id ?? `c-${sujet}`,
  project_id: "p1",
  kind: "site-constraint",
  subject_key: `site:${sujet}`,
  status: "assumed",
  superseded_by: null,
  proposition_id: null,
  zones,
  payload: {
    subject: sujet, value: valeur, derived: true, utilitaire,
    ...(zones ? { zones } : {}),
    lectures: lectures.map(([sujetLu, valeurLue]) => ({ sujet: sujetLu, valeur: valeurLue }))
  }
});

test("un agent qui déclare ce qu'il lit fait des lectures, comme une règle", () => {
  // C'était le trou : une donnée employée uniquement par un utilitaire comptait
  // « aucun emploi », et l'étude d'impact disait « rien ne repose dessus » à un
  // projet dont la moitié des fondations en dépendait.
  const memoire = [
    dit("Altitude du site", "13 m", { id: "ddb-alt" }),
    dit("H0 retenu pour le département", "0,50 m", { id: "ddb-h0" }),
    deduite("Profondeur hors gel", "0.71 m", [
      ["H0 retenu pour le département", "0.5"],
      ["Altitude du site", "13"]
    ], { id: "c-gel" })
  ];

  const lignes = applicationsDeLaMemoire(memoire, { projectId: "p1" });

  assert.deepEqual(lignes.map((l) => [l.input_subject, l.input_rank, l.input_assertion_id]), [
    ["H0 retenu pour le département", 1, "ddb-h0"],
    ["Altitude du site", 2, "ddb-alt"]
  ]);
  // Aucune règle du projet n'est en cause : c'est la colonne `utility` qui nomme
  // le producteur, et elle était posée pour ce jour-là.
  assert.equal(lignes[0].rule_assertion_id, null);
  assert.equal(lignes[0].utility, "outil_V1");
  assert.equal(lignes[0].output_assertion_id, "c-gel");
});

test("l'altitude cesse d'être comptée « aucun emploi »", () => {
  const memoire = [
    dit("Altitude du site", "13 m", { id: "ddb-alt" }),
    deduite("Profondeur hors gel", "0.71 m", [["Altitude du site", "13"]])
  ];

  const emplois = emploisParAffirmation(applicationsDeLaMemoire(memoire, { projectId: "p1" }));
  assert.equal(emplois.get("ddb-alt")?.lectures, 1);

  // Et l'étude d'impact voit enfin ce chemin-là.
  const impact = impactDe("ddb-alt", applicationsDeLaMemoire(memoire, { projectId: "p1" }));
  assert.equal(impact.total, 1);
});

test("un sujet déclaré que rien ne verse fait une lecture sans entrée", () => {
  // Le trou du raisonnement se compte : le taire ferait passer pour complet un
  // calcul auquel il manquait une entrée.
  const memoire = [deduite("Profondeur hors gel", "0.71 m", [["Altitude du site", "13"]])];

  const [ligne] = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  assert.equal(ligne.input_assertion_id, null);
  assert.equal(ligne.input_subject, "Altitude du site");
});

test("une contrainte versée sans déclaration prend celle de son catalogue", () => {
  // Reverser une contrainte juste pour lui attacher une déclaration périmerait
  // une ligne exacte et marquerait à revérifier ce que rien n'a touché. La
  // référence d'utilitaire est là, version comprise, et le catalogue dit ce que
  // cette version lit — c'est la même déclaration, lue à sa source.
  const ancienne = {
    ...deduite("Profondeur hors gel", "0.71 m", [], { utilitaire: "deduction_profondeur_hors_gel_altitude_V1" })
  };
  delete ancienne.payload.lectures;

  const lignes = applicationsDeLaMemoire(
    [dit("Altitude du site", "13 m", { id: "ddb-alt" }), ancienne],
    { projectId: "p1" }
  );

  assert.deepEqual(lignes.map((l) => l.input_subject), [
    "Localisation du projet", "H0 retenu pour le département", "Altitude du site"
  ]);
  assert.equal(lignes[2].input_assertion_id, "ddb-alt");
});

test("un agent inconnu du catalogue ne rend aucun lien", () => {
  const orpheline = { ...deduite("Zone de sismicité", "3", [], { utilitaire: "outil_disparu_V9" }) };
  delete orpheline.payload.lectures;

  assert.deepEqual(applicationsDeLaMemoire([orpheline], { projectId: "p1" }), []);
});

test("une règle et un agent pour un même sujet : la règle l'emporte", () => {
  // C'est un défaut de la mémoire, pas deux raisonnements. La règle porte le
  // texte, elle s'audite, elle se rejoue. Écrire les deux ferait en plus deux
  // rangs 1 pour un même appel, ce que la clé de la table refuse — et le
  // versement entier échouerait pour un lien de second rang.
  const memoire = [
    dit("Altitude du site", "13 m", { id: "ddb-alt" }),
    dit("Commune", "Nantes", { id: "ddb-com" }),
    regle("Profondeur hors gel", "0.71 m", ["Commune"]),
    deduite("Profondeur hors gel", "0.71 m", [["Altitude du site", "13"]], { id: "c-gel" })
  ];

  const lignes = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  assert.deepEqual(lignes.map((l) => [l.input_subject, l.rule_assertion_id]), [
    ["Commune", "r-Profondeur hors gel"]
  ]);
});

test("une contrainte qui se déclarerait sa propre lecture ne se lie pas à elle-même", () => {
  const memoire = [deduite("Profondeur hors gel", "0.71 m", [["Profondeur hors gel", "0.71"]], { id: "c-gel" })];

  const [ligne] = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  // La déclaration est fautive ; on la garde sans entrée plutôt que de la taire.
  assert.equal(ligne.input_assertion_id, null);
  assert.equal(ligne.input_subject, "Profondeur hors gel");
});

test("les lectures d'un agent respectent la zone, comme celles d'une règle", () => {
  const memoire = [
    dit("Altitude du site", "13 m", { id: "alt-a", zones: ["batiment-a"] }),
    dit("Altitude du site", "890 m", { id: "alt-b", zones: ["batiment-b"] }),
    deduite("Profondeur hors gel", "1.09 m", [["Altitude du site", "890"]], {
      id: "c-gel-b", zones: ["batiment-b"]
    })
  ];

  const [ligne] = applicationsDeLaMemoire(memoire, { projectId: "p1" });
  // On n'emprunte jamais la valeur du bâtiment voisin : elle se lirait comme
  // celle d'ici.
  assert.equal(ligne.zone, "batiment-b");
  assert.equal(ligne.input_assertion_id, "alt-b");
});

test("les lectures d'un agent dessinent un lien de dépendance", () => {
  const memoire = [
    dit("Altitude du site", "13 m", { id: "ddb-alt" }),
    deduite("Profondeur hors gel", "0.71 m", [["Altitude du site", "13"]], { id: "c-gel" })
  ];

  assert.deepEqual(dependancesDesApplications(applicationsDeLaMemoire(memoire, { projectId: "p1" })), [
    { assertion_id: "c-gel", depends_on_assertion_id: "ddb-alt", declared_by: null }
  ]);
});

test("le versement n'enregistre que les lectures de ce qu'il vient d'écrire", () => {
  const memoire = [dit("Altitude du site", "13 m", { id: "ddb-alt" })];
  const ecrites = [deduite("Profondeur hors gel", "0.71 m", [["Altitude du site", "13"]], { id: "c-gel" })];

  const lignes = applicationsDuVersement({ memoire, ecrites, projectId: "p1" });
  assert.equal(lignes.length, 1);
  assert.equal(lignes[0].resolution, RESOLUTION.ENREGISTRE);
  assert.equal(lignes[0].output_assertion_id, "c-gel");
});
