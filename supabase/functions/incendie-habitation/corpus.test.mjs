/**
 * Le corpus : ce que le texte dit, et ce que l'utilitaire en fait.
 *
 * Les cas sont écrits comme on décrit un bâtiment à un confrère — nature,
 * implantation, étages, hauteurs — et l'on vérifie le classement, puis les
 * degrés qui en découlent. Un test qui n'énoncerait que des clés et des
 * valeurs ne dirait pas de quel bâtiment on parle, et personne ne le relirait.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { CORPUS, consulter, demander, lireArticle, expliquer, QUESTIONS, grapheDu, faitsDemandes, cheminVers, sousGrapheDe } from "./corpus.js";
import { ordonner } from "./moteur.js";

/** Le minimum pour qu'un bâtiment sorte du champ d'application sans être un IGH. */
const DANS_LE_CHAMP = { hauteurPlancherBasLogementLePlusHaut: 6, hauteurPlancherBasNiveauLePlusHaut: 6 };
const SANS_DUPLEX = { duplexOuTriplexAuDernierEtage: false };

const classer = (cas) => consulter({ ...DANS_LE_CHAMP, ...SANS_DUPLEX, ...cas }).faits.classement;

/* ── L'intégrité du corpus ───────────────────────────────────────────────── */

test("aucune question n'est orpheline, aucun fait n'est sans question", () => {
  // Une question orpheline reste à l'écran sans servir ; un fait sans question
  // rend un module définitivement muet, et rien ne le signale à l'usage.
  const source = grapheDu(CORPUS).questionsSource;
  const declarees = QUESTIONS.map((q) => q.cle);
  assert.deepEqual(declarees.filter((c) => !source.includes(c)), []);
  assert.deepEqual(source.filter((c) => !declarees.includes(c)), []);
});

test("le graphe ne boucle pas, et chaque module produit un fait qui lui est propre", () => {
  assert.equal(ordonner(CORPUS).length, CORPUS.length);
  const produits = CORPUS.map((m) => m.produit);
  assert.equal(new Set(produits).size, produits.length, "deux modules produisent le même fait");
  const ids = CORPUS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("chaque règle cite son article et la phrase qui décide", () => {
  // Sans la citation, un résultat contesté ne se défend pas : il faut pouvoir
  // ouvrir l'arrêté à la bonne ligne devant la personne qui conteste.
  for (const module of CORPUS) {
    for (const regle of module.regles) {
      assert.ok(regle.source, `${module.id} : une règle sans source`);
      assert.ok(regle.source.article, `${module.id} : une règle sans article`);
      assert.ok(regle.source.citation?.length > 20, `${module.id} : une citation trop courte pour être vérifiable`);
      // Trois natures, et la distinction compte : « reglement » cite l'arrêté
      // mot pour mot — un test le vérifie contre le texte —, « lecture » dit ce
      // que l'article veut dire quand il n'y a pas de phrase à citer, et
      // « commentaire » rapporte une doctrine. Les confondre ferait passer une
      // interprétation pour la loi.
      assert.ok(["reglement", "lecture", "commentaire"].includes(regle.source.nature),
        `${module.id} : la nature de la source doit dire si l'on est sur du texte, sur une lecture ou sur de la doctrine`);
    }
  }
});

test("chaque module dit à quelle question il répond", () => {
  for (const module of CORPUS) {
    assert.ok(module.titre, `${module.id} sans titre`);
    assert.ok(module.repond?.endsWith("?"), `${module.id} : « répond » doit être une question`);
    assert.ok(module.source?.article, `${module.id} sans article`);
    assert.ok(faitsDemandes(module).length > 0, `${module.id} ne demande rien : il n'a pas sa place dans un graphe`);
  }
});

/* ── Le classement : article 3 ───────────────────────────────────────────── */

test("première famille : les trois cas du 1°), et rien d'autre", () => {
  // Individuelle isolée ou jumelée, à un étage sur rez-de-chaussée au plus.
  assert.equal(classer({ logementsSuperposes: false, implantation: "isolee", etagesSurRdc: 1 }), "1re famille");
  assert.equal(classer({ logementsSuperposes: false, implantation: "jumelee", etagesSurRdc: 0 }), "1re famille");
  // Individuelle à rez-de-chaussée groupée en bande.
  assert.equal(classer({ logementsSuperposes: false, implantation: "bande", etagesSurRdc: 0 }), "1re famille");
  // En bande à un étage : seulement si les structures sont indépendantes.
  assert.equal(classer({ logementsSuperposes: false, implantation: "bande", etagesSurRdc: 1, structuresIndependantes: true }), "1re famille");
  assert.equal(classer({ logementsSuperposes: false, implantation: "bande", etagesSurRdc: 1, structuresIndependantes: false }), "2e famille");
});

test("l'indépendance des structures est la seule chose qui sépare ces deux maisons", () => {
  // Deux maisons en bande à R+1, identiques en tout point : c'est ce mot-là qui
  // décide, et c'est pour lui qu'on pose la question.
  const commun = { logementsSuperposes: false, implantation: "bande", etagesSurRdc: 1 };
  const vue = consulter({ ...DANS_LE_CHAMP, ...SANS_DUPLEX, ...commun });
  assert.equal(vue.faits.classement, undefined);
  const classementEnAttente = vue.modules.find((m) => m.id === "classement");
  assert.equal(classementEnAttente.statut, "en attente");
  // Une seule question manque, et c'est la bonne : les règles suivantes — celles
  // de la troisième famille — ne seront examinées que si celle-ci est écartée.
  assert.deepEqual(classementEnAttente.manque, ["structuresIndependantes"]);
  assert.ok(vue.questions.some((q) => q.cle === "structuresIndependantes"));
});

test("deuxième famille : les quatre cas du 2°)", () => {
  assert.equal(classer({ logementsSuperposes: false, implantation: "isolee", etagesSurRdc: 2 }), "2e famille");
  assert.equal(classer({ logementsSuperposes: false, implantation: "bande", etagesSurRdc: 3 }), "2e famille");
  assert.equal(classer({ logementsSuperposes: true, etagesSurRdc: 3 }), "2e famille");
  // Un collectif de quatre étages n'est plus de deuxième famille.
  assert.notEqual(classer({ logementsSuperposes: true, etagesSurRdc: 4 }), "2e famille");
});

test("troisième famille A : les trois conditions, plus la conformité de la voie", () => {
  const cas = {
    logementsSuperposes: true, etagesSurRdc: 6, duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 20, hauteurPlancherBasNiveauLePlusHaut: 20,
    distancePortePaliereEscalier: 8, accesEscaliersAtteintsParVoieEchelles: true,
    voieAccesDecrite: true, voieLargeur: 4, voieForcePortante: 130, voieRayonInterieur: 11, voieHauteurLibre: 3.5,
    voiePente: 8, voieLongueur: 12, voieResistancePoinconnement: 100,
    voieRaccordeeAUneVoieEngins: "surVoiePublique"
  };
  assert.equal(consulter(cas).faits.classement, "3e famille A");
  // Une porte palière à 12 m de l'escalier : la 3ᵉ famille A est perdue.
  assert.equal(consulter({ ...cas, distancePortePaliereEscalier: 12 }).faits.classement, "3e famille B");
  // Huit étages : perdue aussi.
  assert.equal(consulter({ ...cas, etagesSurRdc: 8 }).faits.classement, "3e famille B");
  // Une voie trop étroite pour être une voie-échelles : perdue également, et
  // c'est bien l'article 4 qui l'a dit.
  assert.equal(consulter({ ...cas, voieLargeur: 3.2 }).faits.classement, "3e famille B");
});

test("quatrième famille : ce qui ne relève pas des trois autres, sous 50 m", () => {
  const cas = { logementsSuperposes: true, etagesSurRdc: 12, duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 40, hauteurPlancherBasNiveauLePlusHaut: 40 };
  assert.equal(consulter(cas).faits.classement, "4e famille");
});

test("au-delà de 50 m, ce n'est plus une habitation au sens de l'arrêté", () => {
  const cas = { logementsSuperposes: true, etagesSurRdc: 18, duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 52, hauteurPlancherBasNiveauLePlusHaut: 52 };
  assert.equal(consulter(cas).faits.classement, "hors champ — IGH");
});

test("le duplex de dernier étage : deux mesures, et elles ne disent pas la même chose", () => {
  // Depuis l'arrêté du 7 août 2019, un duplex dont le plancher bas tient sous
  // 50 m mais dont le niveau haut les dépasse relève de l'IGH. C'est tout
  // l'objet des deux questions de hauteur.
  const cas = { logementsSuperposes: true, etagesSurRdc: 16,
    duplexOuTriplexAuDernierEtage: true, duplexPiecePrincipaleEtPortePaliereEnBas: true,
    duplexPlanchersConformesArticle6: true,
    hauteurPlancherBasLogementLePlusHaut: 48, hauteurPlancherBasNiveauLePlusHaut: 51 };
  assert.equal(consulter(cas).faits.classement, "hors champ — IGH");
});

test("le 5°) ne retranche un niveau que si ses trois conditions sont réunies", () => {
  const base = { logementsSuperposes: true, etagesSurRdc: 4, ...DANS_LE_CHAMP,
    duplexOuTriplexAuDernierEtage: true, duplexPiecePrincipaleEtPortePaliereEnBas: true,
    duplexPlanchersConformesArticle6: true };
  // Quatre étages, dont un duplex en tête : trois étages retenus, donc 2ᵉ famille.
  assert.equal(consulter(base).faits.etagesSurRdcRetenu, 3);
  assert.equal(consulter(base).faits.classement, "2e famille");
  // Sans porte palière en partie basse, le niveau haut recompte.
  const sansPorte = { ...base, duplexPiecePrincipaleEtPortePaliereEnBas: false };
  assert.equal(consulter(sansPorte).faits.etagesSurRdcRetenu, 4);
  assert.notEqual(consulter(sansPorte).faits.classement, "2e famille");
});

test("le déclassement 3ᵉ B en 3ᵉ A est une décision du maire, jamais de l'utilitaire", () => {
  const cas = { logementsSuperposes: true, etagesSurRdc: 6, duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 22, hauteurPlancherBasNiveauLePlusHaut: 22,
    distancePortePaliereEscalier: 14, accesEscaliersAtteintsParVoieEchelles: false };
  assert.equal(consulter(cas).faits.classement, "3e famille B");
  const declasse = consulter({ ...cas, arreteMunicipalDeclassement: true, logementsAtteignablesEchellesOuParcoursSur: true });
  assert.equal(declasse.faits.regimeApplique, "3e famille A");
  // Sans logements atteignables, la décision ne suffit pas.
  const refuse = consulter({ ...cas, arreteMunicipalDeclassement: true, logementsAtteignablesEchellesOuParcoursSur: false });
  assert.equal(refuse.faits.regimeApplique, "3e famille B");
});

test("l'encloisonnement des escaliers se cache dans un paragraphe de vocabulaire", () => {
  // Trois étages sur rez-de-chaussée ET plus de 8 m : les deux ensemble.
  const haut = { logementsSuperposes: true, etagesSurRdc: 3, duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 9, hauteurPlancherBasNiveauLePlusHaut: 9 };
  assert.equal(consulter(haut).faits.escaliersAEncloisonner, "encloisonnement exigé");
  const bas = { ...haut, hauteurPlancherBasLogementLePlusHaut: 7.5, hauteurPlancherBasNiveauLePlusHaut: 7.5 };
  assert.equal(consulter(bas).faits.escaliersAEncloisonner, "non exigé par cet alinéa");
});

/* ── L'article 4 ─────────────────────────────────────────────────────────── */

test("sans voie décrite, l'article 4 se tait plutôt que de conclure", () => {
  // « Pour l'application de l'article 3 ci-avant » : sans voie, rien à qualifier.
  const vue = consulter({ voieAccesDecrite: false });
  assert.equal(vue.faits.voieEnginsConforme, "non décrite");
  assert.equal(vue.faits.voieEchellesConforme, "non décrite");
  assert.match(vue.modules.find((m) => m.id === "voie-engins").sansObjet, /aucune prescription d'accès/i);
});

test("une voie-échelles suppose d'abord une voie-engins", () => {
  const voie = { voieAccesDecrite: true, voieLargeur: 4, voieForcePortante: 130, voieRayonInterieur: 11, voieHauteurLibre: 3.5,
    voiePente: 8, voieLongueur: 12, voieResistancePoinconnement: 100, voieRaccordeeAUneVoieEngins: "raccordee" };
  assert.equal(consulter(voie).faits.voieEchellesConforme, "conforme");
  // Hauteur libre insuffisante : la voie-engins tombe, la voie-échelles avec elle.
  const basse = consulter({ ...voie, voieHauteurLibre: 3.2 });
  assert.equal(basse.faits.voieEnginsConforme, "non conforme");
  assert.equal(basse.faits.voieEchellesConforme, "non conforme");
});

test("la pente n'a pas le même seuil pour l'une et pour l'autre", () => {
  const voie = { voieAccesDecrite: true, voieLargeur: 4, voieForcePortante: 130, voieRayonInterieur: 11, voieHauteurLibre: 3.5,
    voiePente: 12, voieLongueur: 12, voieResistancePoinconnement: 100, voieRaccordeeAUneVoieEngins: "raccordee" };
  assert.equal(consulter(voie).faits.voieEnginsConforme, "conforme");   // moins de 15 %
  assert.equal(consulter(voie).faits.voieEchellesConforme, "non conforme"); // plus de 10 %
});

/* ── Les exigences qui découlent du classement ───────────────────────────── */

const PREMIERE = { logementsSuperposes: false, implantation: "isolee", etagesSurRdc: 1, ...DANS_LE_CHAMP, ...SANS_DUPLEX };

test("en première famille, l'article 6 ne vise que le plancher haut du sous-sol", () => {
  // C'est le type même de la phrase qui cache une condition : « 1/4 heure pour
  // le plancher haut du sous-sol ». Sans sous-sol, l'article n'exige rien.
  const avec = demander("planchersCoupeFeu", { ...PREMIERE, niveauxEnSousSol: 1 });
  assert.equal(avec.valeur, "CF 1/4 h");
  assert.match(avec.mention, /seul plancher haut du sous-sol/);

  const sans = demander("planchersCoupeFeu", { ...PREMIERE, niveauxEnSousSol: 0 });
  assert.equal(sans.valeur, null);
  assert.match(sans.sansObjet, /n'exige aucun degré/);
  assert.equal(sans.pourquoi.article, "6");
});

test("le cas du copilote : deux hauteurs, un classement, un degré", () => {
  // « Quel est le degré coupe-feu des planchers à respecter ? »
  const reponses = { logementsSuperposes: true, etagesSurRdc: 3, duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 7.5, hauteurPlancherBasNiveauLePlusHaut: 7.5 };
  const r = demander("planchersCoupeFeu", reponses);
  assert.equal(r.ok, true);
  assert.equal(r.valeur, "CF 1/2 h");
  assert.equal(r.pourquoi.article, "6");
  assert.match(r.pourquoi.citation, /2ème famille : 1\/2 heure/);
  // Le chemin dit d'où vient le classement, sans lequel le degré ne veut rien dire.
  assert.ok(r.chemin.some((etape) => etape.id === "classement" && etape.valeur === "2e famille"));
});

test("sans de quoi conclure, on dit ce qui manque plutôt que de se prononcer", () => {
  const r = demander("planchersCoupeFeu", {});
  assert.equal(r.ok, false);
  assert.ok(r.manque.length > 0);
  assert.ok(r.manque.every((q) => q.libelle));
});

test("les degrés du titre II suivent la famille, et le disent avec leur article", () => {
  const familles = [
    [PREMIERE, "SF 1/4 h", "PF 1/4 h ou RE 15", "CF 1/2 h"],
    [{ logementsSuperposes: true, etagesSurRdc: 3, ...DANS_LE_CHAMP, ...SANS_DUPLEX }, "SF 1/2 h", "PF 1/2 h ou RE 30", "CF 1 h"]
  ];
  for (const [cas, porteurs, coursives, recoupement] of familles) {
    const complet = { ...cas, coursivesPasserellesOuCirculationsAAirLibre: true,
      groupementEnBandeOuGrandeLongueur: true, longueurDuBatiment: 60 };
    const vue = consulter(complet);
    assert.equal(vue.faits.porteursVerticauxStabilite, porteurs);
    assert.equal(vue.faits.planchersExterieursResistance, coursives);
    assert.equal(vue.faits.murRecoupementCoupeFeu, recoupement);
  }
});

test("un bâtiment court n'a pas de mur de recoupement à construire", () => {
  const vue = consulter({ ...PREMIERE, groupementEnBandeOuGrandeLongueur: true, longueurDuBatiment: 30 });
  assert.equal(vue.faits.murRecoupementCoupeFeu, "aucun recoupement exigé");
  // Et le franchissement d'un mur qui n'existe pas est sans objet.
  assert.equal(vue.faits.franchissementRecoupementCoupeFeu, "sans objet");
});

test("l'exception de l'article 12 tient à trois conditions dans une seule phrase", () => {
  const base = { ...PREMIERE, facadePartiesPleinesSystemeClasseE: true, distanceLimiteDePropriete: 6 };
  assert.match(consulter(base).faits.parementExterieurClasse, /exception ouverte/);
  // À quatre mètres exactement, l'exception est fermée : le texte dit « plus de ».
  assert.equal(consulter({ ...base, distanceLimiteDePropriete: 4 }).faits.parementExterieurClasse,
    "au moins D-s3, d0, ou en bois");
  // Jumelée plutôt qu'isolée : fermée aussi.
  assert.equal(consulter({ ...base, implantation: "jumelee" }).faits.parementExterieurClasse,
    "au moins D-s3, d0, ou en bois");
});

test("le sort des couvertures M1 à M3 dépend de leur support, pas de la famille", () => {
  const surSupport = consulter({ ...PREMIERE, revetementCouvertureClasse: "M2", supportCouvertureContinuIncombustible: true });
  assert.equal(surSupport.faits.couvertureClassePenetration, "aucune restriction");
  const sansSupport = consulter({ ...PREMIERE, revetementCouvertureClasse: "M2", supportCouvertureContinuIncombustible: false });
  assert.equal(sansSupport.faits.couvertureClassePenetration, "T 5, T 15 ou T 30");
});

test("en individuel de première ou deuxième famille, l'article 45 n'impose rien", () => {
  const vue = consulter({ ...PREMIERE, conduitsOuGainesTraversantDesParois: true });
  assert.equal(vue.faits.conduitsExigence, "aucune prescription");
  assert.equal(vue.modules.find((m) => m.id === "conduits-et-gaines").pourquoi.article, "45");
});

test("les parois séparatives ne concernent que les individuelles accolées", () => {
  assert.equal(consulter({ ...PREMIERE, implantation: "jumelee" }).faits.paroisSeparativesCoupeFeu, "CF 1/4 h");
  assert.equal(consulter(PREMIERE).faits.paroisSeparativesCoupeFeu, "sans objet");
});

/* ── Ce que l'écran reçoit ───────────────────────────────────────────────── */

test("la consultation ne livre que la branche empruntée, jamais la table des règles", () => {
  // C'est le point de tout l'exercice : on peut défendre le résultat sans
  // publier le dépouillement du texte.
  const vue = consulter({ ...PREMIERE, niveauxEnSousSol: 1 });
  const serialisee = JSON.stringify(vue);
  assert.ok(!serialisee.includes('"regles"'), "les règles ne doivent pas descendre au navigateur");
  assert.ok(!serialisee.includes('"si"'), "les conditions ne doivent pas descendre au navigateur");
  // …mais l'article et la phrase, oui.
  const planchers = vue.modules.find((m) => m.id === "planchers");
  assert.equal(planchers.pourquoi.article, "6");
  assert.ok(planchers.pourquoi.citation.length > 20);
});

test("le graphe descend en entier : c'est la carte, pas le trésor", () => {
  const vue = consulter({});
  assert.equal(vue.graphe.noeuds.length, CORPUS.length);
  assert.ok(vue.graphe.liens.length > 20);
  assert.equal(vue.graphe.questionsSource.length, QUESTIONS.length);
  assert.equal(vue.avancement.questionsSourceEnTout, QUESTIONS.length);
});

test("les questions arrivent par vagues, la racine d'abord", () => {
  // Un questionnaire qui commence par la couverture avant de savoir de quelle
  // famille on parle donne l'impression de ne mener nulle part.
  const debut = consulter({});
  // Les toutes premières sont celles des modules racines : la nature de
  // l'habitation, et ce qui décide de la hauteur retenue.
  assert.ok(["logementsSuperposes", "duplexOuTriplexAuDernierEtage"].includes(debut.questions[0].cle),
    debut.questions[0].cle);
  const posees = debut.questions.map((q) => q.cle);
  // Rien de ce qui suppose le classement n'est demandé dans la première vague :
  // demander la classe du système de façade avant de savoir de quelle famille
  // on parle donne l'impression de remplir un formulaire au hasard.
  for (const tardive of ["facadePartiesPleinesSystemeClasseE", "implantation",
                         "etagesSurRdc", "arreteMunicipalDeclassement", "solutionDegagementRetenue"]) {
    assert.ok(!posees.includes(tardive), `${tardive} ne devrait pas être demandée d'emblée`);
  }
  // Et l'on ne demande pas d'emblée les cotes d'une chaussée : l'article 4 ne
  // définit les voies que « pour l'application de l'article 3 ».
  assert.ok(posees.includes("voieAccesDecrite"));
  assert.ok(!posees.includes("voieForcePortante"));
  // Chaque question dit pour quel module elle est posée.
  assert.ok(debut.questions.every((q) => q.pour && q.pourTitre));
});

test("la vague suivante s'ouvre d'elle-même quand l'amont a conclu", () => {
  const apres = consulter({ logementsSuperposes: true, duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 7.5, hauteurPlancherBasNiveauLePlusHaut: 7.5 });
  // Le nombre d'étages n'avait aucun sens tant qu'on ignorait si le 5°) en
  // retranchait un : il se demande maintenant.
  assert.ok(apres.questions.some((q) => q.cle === "etagesSurRdc"));
});

test("la portée est rendue avec chaque réponse, pas rangée dans une documentation", () => {
  const vue = consulter({});
  assert.ok(vue.portee.couvert.length >= 4);
  assert.ok(vue.portee.nonCouvert.some((l) => /stationnement/i.test(l)));
  assert.equal(demander("planchersCoupeFeu", {}).portee, vue.portee);
});

test("le chemin vers un module remonte tous ses amonts conclus", () => {
  const reponses = { ...PREMIERE, niveauxEnSousSol: 1 };
  const vue = consulter(reponses);
  const chemin = cheminVers("planchers", vue).map((e) => e.id);
  // Les amonts d'abord, le module demandé en dernier : c'est l'ordre dans
  // lequel un humain refait le raisonnement.
  assert.deepEqual(chemin, ["hauteur-logement-le-plus-haut", "champ-application", "nature-habitation",
    "duplex-niveau-bas", "etages-retenus", "classement", "famille", "sous-sol", "planchers"]);
  assert.ok(cheminVers("planchers", vue).every((e) => e.article));
});

test("ce qui manque à un module, c'est ce qui bloque en amont — pas ce qu'il lit en dernier", () => {
  // Sans réponse sur les duplex, le nombre d'étages retenu reste indéterminé,
  // donc le classement, donc la famille, donc le degré. Répondre « il faut
  // savoir s'il y a un sous-sol » enverrait chercher au mauvais endroit.
  const r = demander("planchersCoupeFeu", { logementsSuperposes: true, etagesSurRdc: 3,
    hauteurPlancherBasLogementLePlusHaut: 7.5, hauteurPlancherBasNiveauLePlusHaut: 7.5 });
  assert.equal(r.ok, false);
  const cles = r.manque.map((q) => q.cle);
  assert.ok(cles.includes("duplexOuTriplexAuDernierEtage"));
  assert.ok(!cles.includes("sousSol"), "le sous-sol ne bloque rien tant que la famille est inconnue");

  // La réponse manquante donnée, le degré tombe.
  const ensuite = demander("planchersCoupeFeu", { logementsSuperposes: true, etagesSurRdc: 3,
    duplexOuTriplexAuDernierEtage: false,
    hauteurPlancherBasLogementLePlusHaut: 7.5, hauteurPlancherBasNiveauLePlusHaut: 7.5 });
  assert.equal(ensuite.valeur, "CF 1/2 h");
});

test("le sous-graphe d'un module remonte tout ce dont il dépend, et rien d'autre", () => {
  const vue = consulter({});
  const amont = sousGrapheDe("planchers", vue.graphe);
  for (const attendu of ["planchers", "famille", "classement", "etages-retenus", "nature-habitation"]) {
    assert.ok(amont.has(attendu), `${attendu} manque au sous-graphe`);
  }
  // La couverture ne décide rien du degré des planchers.
  assert.ok(!amont.has("couverture"));
});

/* ── Titre III : dégagements ─────────────────────────────────────────────── */

const COLLECTIF = { logementsSuperposes: true, ...SANS_DUPLEX };
const troisiemeB = (extra = {}) => ({
  ...COLLECTIF, etagesSurRdc: 6,
  hauteurPlancherBasLogementLePlusHaut: 22, hauteurPlancherBasNiveauLePlusHaut: 22,
  distancePortePaliereEscalier: 14, accesEscaliersAtteintsParVoieEchelles: false, ...extra
});

test("l'article 26 exige un escalier protégé en 3ᵉ famille B, et deux formes seulement", () => {
  const cas = troisiemeB();
  assert.equal(consulter(cas).faits.classement, "3e famille B");
  assert.equal(consulter(cas).faits.typeEscalierExige, "escalier protégé");
  // Un escalier encloisonné n'en est pas un : le texte n'ouvre que « à l'air
  // libre » et « à l'abri des fumées ».
  assert.equal(consulter({ ...cas, typeEscalierRetenu: "encloisonne" }).faits.conformiteEscalier, "non conforme");
  assert.equal(consulter({ ...cas, typeEscalierRetenu: "abriFumees" }).faits.conformiteEscalier, "conforme");
  assert.equal(consulter({ ...cas, typeEscalierRetenu: "airLibre" }).faits.conformiteEscalier, "conforme");
});

test("en 3ᵉ famille A, aucun escalier protégé n'est exigé — et c'est une conclusion", () => {
  const cas = { ...COLLECTIF, etagesSurRdc: 6,
    hauteurPlancherBasLogementLePlusHaut: 20, hauteurPlancherBasNiveauLePlusHaut: 20,
    distancePortePaliereEscalier: 8, accesEscaliersAtteintsParVoieEchelles: true,
    voieAccesDecrite: true, voieLargeur: 4, voieForcePortante: 130, voieRayonInterieur: 11,
    voieHauteurLibre: 3.5, voiePente: 8, voieLongueur: 12, voieResistancePoinconnement: 100,
    voieRaccordeeAUneVoieEngins: "surVoiePublique" };
  assert.equal(consulter(cas).faits.classement, "3e famille A");
  assert.equal(consulter(cas).faits.typeEscalierExige, "aucun escalier protégé exigé");
  assert.equal(consulter({ ...cas, typeEscalierRetenu: "encloisonne" }).faits.conformiteEscalier, "sans objet");
});

test("l'article 18 s'efface devant un collectif de 2ᵉ famille sous 8 m — et la Q/R le dit", () => {
  // Le texte s'adresse à « toutes les habitations collectives », mais un
  // escalier non encloisonné n'a pas de paroi de cage à qualifier.
  const bas = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 7,
    hauteurPlancherBasNiveauLePlusHaut: 7, hauteurDernierPlancherDesserviParEscalier: 7 };
  const vue = consulter(bas);
  assert.equal(vue.faits.paroisEscalierFacade, "non applicable");
  assert.equal(vue.modules.find((m) => m.id === "parois-escalier-facade").pourquoi.nature, "commentaire");

  const haut = { ...bas, hauteurPlancherBasLogementLePlusHaut: 9,
    hauteurPlancherBasNiveauLePlusHaut: 9, hauteurDernierPlancherDesserviParEscalier: 9 };
  assert.equal(consulter(haut).faits.paroisEscalierFacade, "PF 1/2 h");
});

test("les trois éloignements de l'article 18 tiennent à un angle, bornes comprises", () => {
  const base = { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, hauteurDernierPlancherDesserviParEscalier: 20,
    partiesParoiEscalierNonPareFlammes: true };
  assert.equal(consulter({ ...base, angleDiedreFacade: 180 }).faits.eloignementBaiesEscalier, "2 m au moins");
  // À 135° exactement, on est en retour : le texte dit « bornes incluses ».
  assert.equal(consulter({ ...base, angleDiedreFacade: 135 }).faits.eloignementBaiesEscalier, "4 m au moins");
  assert.equal(consulter({ ...base, angleDiedreFacade: 90 }).faits.eloignementBaiesEscalier, "4 m au moins");
  assert.equal(consulter({ ...base, angleDiedreFacade: 89 }).faits.eloignementBaiesEscalier, "8 m au moins");
  // Toute la paroi pare-flammes : aucun éloignement n'est exigé.
  assert.equal(consulter({ ...base, partiesParoiEscalierNonPareFlammes: false }).faits.eloignementBaiesEscalier, "sans objet");
});

test("la porte entre escalier et circulation, en 2ᵉ famille, tient aux 8 m", () => {
  const bas = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 7, hauteurPlancherBasNiveauLePlusHaut: 7 };
  assert.equal(consulter(bas).faits.porteEscalierCirculation, "non exigée");
  const haut = { ...bas, hauteurPlancherBasLogementLePlusHaut: 9, hauteurPlancherBasNiveauLePlusHaut: 9 };
  assert.equal(consulter(haut).faits.porteEscalierCirculation, "exigée");
  assert.match(consulter(haut).modules.find((m) => m.id === "porte-escalier-circulation").mention, /séparation physique/);
});

test("le désenfumage de la cage s'efface devant un escalier extérieur", () => {
  const cas = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 9, hauteurPlancherBasNiveauLePlusHaut: 9 };
  assert.match(consulter({ ...cas, typeEscalierRetenu: "encloisonne" }).faits.desenfumageCageEscalier, /1 m²/);
  assert.equal(consulter({ ...cas, typeEscalierRetenu: "exterieur" }).faits.desenfumageCageEscalier, "sans objet");
});

test("en 3ᵉ famille A, l'ouverture est asservie à un détecteur — c'est le « en outre »", () => {
  const cas = { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, distancePortePaliereEscalier: 8,
    accesEscaliersAtteintsParVoieEchelles: true, typeEscalierRetenu: "encloisonne",
    voieAccesDecrite: true, voieLargeur: 4, voieForcePortante: 130, voieRayonInterieur: 11,
    voieHauteurLibre: 3.5, voiePente: 8, voieLongueur: 12, voieResistancePoinconnement: 100,
    voieRaccordeeAUneVoieEngins: "surVoiePublique" };
  assert.match(consulter(cas).faits.desenfumageCageEscalier, /détecteur autonome déclencheur/);
});

test("une même cote, trois seuils : 10 m, 15 m, 25 m", () => {
  // La distance porte palière → escalier vaut 10 m à l'article 3 (classement en
  // 3ᵉ A), 15 m à l'article 31, 25 m à l'article 30. Une seule question.
  const airLibre = troisiemeB({ typeCirculationRetenue: "airLibre", distancePortePaliereEscalier: 22 });
  assert.match(consulter(airLibre).faits.distanceCirculationVerdict, /admissible — 25 m/);
  assert.match(consulter({ ...airLibre, distancePortePaliereEscalier: 27 }).faits.distanceCirculationVerdict, /dépassée/);

  const abri = troisiemeB({ typeCirculationRetenue: "abriFumees", distancePortePaliereEscalier: 14 });
  assert.match(consulter(abri).faits.distanceCirculationVerdict, /admissible — 15 m/);
  assert.match(consulter({ ...abri, distancePortePaliereEscalier: 22 }).faits.distanceCirculationVerdict, /dépassée/);
});

test("l'allège d'un mètre, ou des baies fixes : c'est le « sinon » qui décide", () => {
  const cas = troisiemeB({ typeCirculationRetenue: "airLibre", partVidesParoiCirculation: 60 });
  assert.equal(consulter({ ...cas, allegeBaieVitreeHauteur: 1.1 }).faits.allegeBaieVitreeCirculation, "allège CF 1/2 h (EI 30)");
  // En deçà d'un mètre, l'autre branche s'applique — et elle exige « fixes ».
  const basse = consulter({ ...cas, allegeBaieVitreeHauteur: 0.8 });
  assert.match(basse.faits.allegeBaieVitreeCirculation, /fixes/);
  assert.match(basse.modules.find((m) => m.id === "allege-circulation-air-libre").pourquoi.citation, /et fixes/);
});

test("les circulations protégées ne sont imposées qu'en 3ᵉ B et en 4ᵉ", () => {
  assert.equal(consulter(troisiemeB()).faits.circulationProtegeeExigee, "exigée");
  const deuxieme = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 9, hauteurPlancherBasNiveauLePlusHaut: 9 };
  assert.equal(consulter(deuxieme).faits.circulationProtegeeExigee, "non exigée");
  assert.match(consulter(deuxieme).modules.find((m) => m.id === "circulation-exigee").mention, /séparation physique/);
});

test("les conduits de désenfumage suivent la famille, mais seulement à l'abri des fumées", () => {
  const abri = troisiemeB({ typeCirculationRetenue: "abriFumees" });
  assert.equal(consulter(abri).faits.conduitsDesenfumageResistance, "incombustibles, CF 1/2 h");
  const quatrieme = { ...COLLECTIF, etagesSurRdc: 12, hauteurPlancherBasLogementLePlusHaut: 40,
    hauteurPlancherBasNiveauLePlusHaut: 40, typeCirculationRetenue: "abriFumees" };
  assert.equal(consulter(quatrieme).faits.conduitsDesenfumageResistance, "incombustibles, CF 1 h");
  const air = troisiemeB({ typeCirculationRetenue: "airLibre" });
  assert.equal(consulter(air).faits.conduitsDesenfumageResistance, "sans objet");
});

test("les bouches passent de 10 m à 7 m dès que le parcours n'est plus rectiligne", () => {
  const abri = troisiemeB({ typeCirculationRetenue: "abriFumees" });
  assert.match(consulter({ ...abri, parcoursCirculationRectiligne: true }).faits.bouchesDesenfumage, /10 m au plus/);
  assert.match(consulter({ ...abri, parcoursCirculationRectiligne: false }).faits.bouchesDesenfumage, /7 m au plus/);
});

test("les trois solutions de la 4ᵉ famille, et ce que chacune exige d'escaliers", () => {
  const quatrieme = { ...COLLECTIF, etagesSurRdc: 12,
    hauteurPlancherBasLogementLePlusHaut: 40, hauteurPlancherBasNiveauLePlusHaut: 40 };
  const sol1 = { ...quatrieme, solutionDegagementRetenue: "1" };
  assert.match(consulter(sol1).faits.solutionDegagements4e, /solution n° 1/);
  assert.match(consulter({ ...sol1, nombreEscaliersProteges: 2, distanceEntreEscaliers: 12 }).faits.escaliers4eFamille, /^conforme/);
  assert.match(consulter({ ...sol1, nombreEscaliersProteges: 2, distanceEntreEscaliers: 7 }).faits.escaliers4eFamille, /10 m au moins/);
  assert.match(consulter({ ...sol1, nombreEscaliersProteges: 1 }).faits.escaliers4eFamille, /deux escaliers protégés exigés/);

  const sol2 = { ...quatrieme, solutionDegagementRetenue: "2", nombreEscaliersProteges: 1 };
  assert.match(consulter(sol2).faits.solutionDegagements4e, /volume séparatif/);
  assert.match(consulter(sol2).modules.find((m) => m.id === "solution-degagements-4e").mention, /n'est pas nécessaire lorsque/);
  assert.match(consulter(sol2).faits.escaliers4eFamille, /^conforme/);

  const sol3 = { ...quatrieme, solutionDegagementRetenue: "3", nombreEscaliersProteges: 1 };
  assert.match(consulter(sol3).faits.solutionDegagements4e, /surpression/);
  assert.match(consulter(sol3).modules.find((m) => m.id === "solution-degagements-4e").mention, /0,8 m³\/s/);
});

test("l'escalier extérieur reprend les trois distances, mesurées autrement", () => {
  const cas = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 9,
    hauteurPlancherBasNiveauLePlusHaut: 9, typeEscalierRetenu: "exterieur" };
  assert.equal(consulter({ ...cas, angleDiedreFacade: 180, distanceEscalierAuxBaies: 2.5 }).faits.escalierExterieurConforme, "conforme");
  assert.equal(consulter({ ...cas, angleDiedreFacade: 180, distanceEscalierAuxBaies: 1.5 }).faits.escalierExterieurConforme, "non conforme");
  assert.equal(consulter({ ...cas, angleDiedreFacade: 60, distanceEscalierAuxBaies: 5 }).faits.escalierExterieurConforme, "non conforme");
  assert.equal(consulter({ ...cas, angleDiedreFacade: 60, distanceEscalierAuxBaies: 9 }).faits.escalierExterieurConforme, "conforme");
});

/* ── Titre IV : conduits et gaines ───────────────────────────────────────── */

const AVEC_CONDUITS = { conduitsOuGainesTraversantDesParois: true };

test("le croisement matériau × diamètre décide du régime d'un conduit", () => {
  // Un M1 de 100 mm dans un logement peut rester nu ; le même hors logement
  // passe en coffrage ; au-delà de 125 mm, la gaine s'impose — et le ministère
  // dit expressément qu'un M1 n'y gagne rien sur un M2 à M4.
  const base = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 7,
    hauteurPlancherBasNiveauLePlusHaut: 7, ...AVEC_CONDUITS };

  const nu = { ...base, conduitDansLogementOuCirculationCommune: true, classeReactionConduit: "M1", diametreConduit: 100 };
  assert.equal(consulter(nu).faits.conduitEntreNiveaux, "peut rester nu");
  assert.match(consulter(nu).modules.find((m) => m.id === "conduit-entre-niveaux").mention, /rebouché/);

  const coffre = { ...nu, conduitDansLogementOuCirculationCommune: false };
  assert.equal(consulter(coffre).faits.conduitEntreNiveaux, "coffrage admis");

  const gros = { ...nu, diametreConduit: 150 };
  assert.equal(consulter(gros).faits.conduitEntreNiveaux, "gaine CF 1/2 h exigée");
  assert.match(consulter(gros).modules.find((m) => m.id === "conduit-entre-niveaux").mention,
    /pas d'atténuation pour les conduits classés M1/);
});

test("en individuel de 1ʳᵉ ou 2ᵉ famille, le titre IV n'impose rien", () => {
  const maison = { logementsSuperposes: false, implantation: "isolee", etagesSurRdc: 1,
    ...DANS_LE_CHAMP, ...SANS_DUPLEX, ...AVEC_CONDUITS };
  assert.equal(consulter(maison).faits.conduitEntreNiveaux, "aucune prescription");
  assert.equal(consulter(maison).faits.traverseeDeParoi, "aucune prescription");
});

test("le recoupement en A1 efface le seuil de 0,25 m² des trappes", () => {
  const base = { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, ...AVEC_CONDUITS,
    conduitDansLogementOuCirculationCommune: false, classeReactionConduit: "M3", diametreConduit: 150 };
  assert.equal(consulter({ ...base, gaineRecoupeeTousNiveauxA1: false, surfaceTrappeDeGaine: 0.2 }).faits.trappesDeGaine, "CF 1/4 h");
  assert.equal(consulter({ ...base, gaineRecoupeeTousNiveauxA1: false, surfaceTrappeDeGaine: 0.4 }).faits.trappesDeGaine, "CF 1/2 h");
  // Le « Toutefois » du troisième alinéa vaut une demi-heure.
  assert.equal(consulter({ ...base, gaineRecoupeeTousNiveauxA1: true, surfaceTrappeDeGaine: 0.4 }).faits.trappesDeGaine, "CF 1/4 h (EI 15)");
});

test("le 5°) de l'article 49 affranchit les caves et sous-sols — et s'arrête à 125 mm", () => {
  const base = { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, ...AVEC_CONDUITS, paroiTraversee: "caveOuSousSol" };
  assert.equal(consulter({ ...base, diametreConduit: 100 }).faits.traverseeDeParoi, "aucune prescription");
  assert.equal(consulter({ ...base, diametreConduit: 160 }).faits.traverseeDeParoi, "incombustible ou M1 au moins");
});

test("le tableau de l'article 54 porte une interdiction, pas un degré nul", () => {
  const troisB = troisiemeB({ conduiteMontanteDeGaz: true, situationGaineGaz: "cageEscalier" });
  assert.equal(consulter({ ...troisB, typeEscalierRetenu: "abriFumees" }).faits.paroisGaineGaz, "solution interdite");
  // Et l'interdiction porte sa propre exception, note (2) du tableau.
  assert.match(consulter({ ...troisB, typeEscalierRetenu: "airLibre" }).faits.paroisGaineGaz, /admise/);
  // En parties communes autres, un degré, et il diffère de la 3ᵉ A.
  const enPartiesCommunes = { ...troisB, situationGaineGaz: "partiesCommunesAutres", typeEscalierRetenu: "abriFumees" };
  assert.equal(consulter(enPartiesCommunes).faits.paroisGaineGaz, "parois CF 1/4 h — portes et trappes PF 1/4 h");
});

test("la gaine électrique n'a pas de degré propre : c'est une doctrine, et elle est datée", () => {
  const cas = troisiemeB({ colonneMontanteElectriqueEnGaine: true });
  const vue = consulter(cas);
  assert.match(vue.faits.colonneMontanteElectricite, /mêmes caractéristiques que la gaine gaz/);
  const module = vue.modules.find((m) => m.id === "colonne-montante-electricite");
  assert.equal(module.pourquoi.nature, "commentaire");
  assert.match(module.pourquoi.texte, /25 juin 1990/);
});

test("les conduits de ventilation suivent la famille, et seulement en collectif", () => {
  const deuxieme = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 7, hauteurPlancherBasNiveauLePlusHaut: 7 };
  assert.equal(consulter(deuxieme).faits.conduitsVentilation, "incombustible, CF 1/4 h");
  assert.equal(consulter(troisiemeB()).faits.conduitsVentilation, "incombustible, CF 1/2 h");
  const maison = { logementsSuperposes: false, implantation: "isolee", etagesSurRdc: 1, ...DANS_LE_CHAMP, ...SANS_DUPLEX };
  assert.equal(consulter(maison).faits.conduitsVentilation, "sans objet");
});

test("une solution de ventilation peut être interdite pour le système retenu", () => {
  // Un utilitaire qui rendrait le degré du conduit sans dire que la solution
  // est interdite pour ce système-là rendrait un résultat exact et inutilisable.
  const base = troisiemeB();
  assert.match(consulter({ ...base, typeVentilation: "vmcGaz", solutionVentilationRetenue: "2" }).faits.solutionVentilation,
    /interdite en VMC-gaz/);
  assert.match(consulter({ ...base, typeVentilation: "doubleFlux", solutionVentilationRetenue: "3" }).faits.solutionVentilation,
    /interdite en double flux/);
  assert.match(consulter({ ...base, typeVentilation: "vmcInversee", solutionVentilationRetenue: "5" }).faits.solutionVentilation,
    /interdite en VMC inversée/);
  // La n° 4 reste ouverte en VMC inversée : le texte ne l'exclut pas.
  assert.match(consulter({ ...base, typeVentilation: "vmcInversee", solutionVentilationRetenue: "4" }).faits.solutionVentilation,
    /admise/);
  assert.match(consulter({ ...base, typeVentilation: "simpleFlux", solutionVentilationRetenue: "1" }).faits.solutionVentilation,
    /fonctionnement du ventilateur assuré en permanence/);
});

test("le local du ventilateur inversé reprend le degré de stabilité du bâtiment", () => {
  // « coupe-feu de degré identique à celui de la stabilité du bâtiment » : le
  // module ne recopie pas un chiffre, il reprend le fait produit par l'article 5.
  const cas = troisiemeB({ typeVentilation: "vmcInversee", ventilateurDansUnLocalExterieur: false });
  const vue = consulter(cas);
  assert.equal(vue.faits.porteursVerticauxStabilite, "SF 1 h");
  assert.equal(vue.faits.localVentilateurInverse, "SF 1 h");
  assert.match(vue.modules.find((m) => m.id === "local-ventilateur-inverse").mention, /pare-flammes de degré 1\/2 heure/);
  // À l'extérieur du bâtiment, rien n'est exigé.
  assert.equal(consulter({ ...cas, ventilateurDansUnLocalExterieur: true }).faits.localVentilateurInverse, "aucune exigence");
});

test("le vide-ordures : quatre exigences dans un article, sur quatre objets", () => {
  const troisB = troisiemeB({ videOrdures: true, videOrduresDansLesLogements: false,
    localOrduresDansLeParcDeStationnement: false });
  assert.equal(consulter(troisB).faits.videOrduresConduit, "coupe-feu de traversée 30 min — vidoir PF 1/4 h");
  assert.equal(consulter(troisB).faits.localReceptacleOrdures, "parois CF 1 h — bloc-porte CF 1/2 h");
  // À l'intérieur des logements, les degrés du conduit sont relevés.
  assert.equal(consulter({ ...troisB, videOrduresDansLesLogements: true }).faits.videOrduresConduit,
    "conduit ou gaine CF 1/2 h — vidoir PF 1/2 h");
  // Dans le parc de stationnement, le local double ses degrés.
  assert.equal(consulter({ ...troisB, localOrduresDansLeParcDeStationnement: true }).faits.localReceptacleOrdures,
    "parois CF 2 h — bloc-porte CF 1 h");
  // En deuxième famille, l'article 64 ne dit rien.
  const deuxieme = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 7,
    hauteurPlancherBasNiveauLePlusHaut: 7, videOrdures: true };
  assert.match(consulter(deuxieme).modules.find((m) => m.id === "vide-ordures").sansObjet, /troisième et quatrième familles/);
});

test("un module ne peut pas produire le fait qu'il demande — le moteur le refuse", () => {
  // C'est ce qui est arrivé en écrivant le titre IV : le module « vide-ordures »
  // produisait « videOrdures », qui est aussi le nom de sa question. Le graphe
  // bouclait, et c'est le moteur qui l'a dit plutôt qu'un écran qui aurait
  // tourné en rond.
  const boucle = [{ id: "x", titre: "X", produit: "meme", regles: [
    { si: { meme: true }, alors: { valeur: "oui" }, source: { article: "1", citation: "une citation assez longue" } }
  ] }];
  assert.throws(() => ordonner(boucle), /circulaire/);
});

/* ── Titre V : logements-foyers ──────────────────────────────────────────── */

test("le titre V s'ajoute au classement, il ne le remplace pas", () => {
  // « s'ajoutent aux prescriptions générales des articles premier à 64 » : le
  // bâtiment reste classé, et tout ce que les titres II à IV en tirent vaut.
  const foyer = { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, distancePortePaliereEscalier: 14,
    accesEscaliersAtteintsParVoieEchelles: false, logementFoyer: true, typeLogementFoyer: "autres" };
  const vue = consulter(foyer);
  assert.equal(vue.faits.classement, "3e famille B");
  assert.equal(vue.faits.planchersCoupeFeu, "CF 1 h");
  assert.equal(vue.faits.regimeLogementFoyer, "chapitre II");
});

test("les articles 73 à 76 sont supprimés — et le référentiel le dit au lieu de se taire", () => {
  // Ils figurent encore dans le fascicule, barrés : un lecteur pressé les
  // applique. Un silence se lirait comme un oubli.
  const cas = { ...COLLECTIF, etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 9,
    hauteurPlancherBasNiveauLePlusHaut: 9, logementFoyer: true, typeLogementFoyer: "handicapesPhysiques" };
  const vue = consulter(cas);
  assert.match(vue.faits.regimeLogementFoyer, /articles 73 à 76 sont supprimés/);
  const module = vue.modules.find((m) => m.id === "regime-logement-foyer");
  assert.match(module.mention, /arrêté du 19 juin 2015/);
  assert.match(module.mention, /type J/);
  assert.equal(module.pourquoi.article, "73 à 76");
});

test("le nombre d'escaliers d'un foyer suit les tranches de 200, fractions comprises", () => {
  const foyer = (occupants) => consulter({ ...COLLECTIF, etagesSurRdc: 6,
    hauteurPlancherBasLogementLePlusHaut: 20, hauteurPlancherBasNiveauLePlusHaut: 20,
    logementFoyer: true, nombreOccupantsLogementFoyer: occupants }).faits.escaliersLogementFoyer;
  assert.equal(foyer(200), "1 escalier au moins");
  assert.equal(foyer(201), "2 escaliers");
  assert.equal(foyer(400), "2 escaliers");
  // « ou fraction de 200 » : 401 en demandent trois, pas deux et demi.
  assert.equal(foyer(401), "3 escaliers");
  assert.equal(foyer(750), "4 escaliers");
});

test("l'exception du hall a deux conditions, et l'une sans l'autre ne libère rien", () => {
  const base = { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, logementFoyer: true, hallDessertServicesCollectifs: true };
  const libre = consulter({ ...base, hallOuvertureExterieureDeDeuxMetresCarres: true, distanceDebouchEscalierSortie: 5 });
  assert.match(libre.faits.hallLogementFoyer, /aucune caractéristique pare-flammes/);
  // L'ouverture sans la distance : l'exception ne joue pas.
  assert.equal(consulter({ ...base, hallOuvertureExterieureDeDeuxMetresCarres: true, distanceDebouchEscalierSortie: 9 })
    .faits.hallLogementFoyer, "parois et blocs-portes PF 1/2 h");
  // La distance sans l'ouverture : pas davantage.
  assert.equal(consulter({ ...base, hallOuvertureExterieureDeDeuxMetresCarres: false, distanceDebouchEscalierSortie: 5 })
    .faits.hallLogementFoyer, "parois et blocs-portes PF 1/2 h");
});

test("le seuil de dix personnes déplace les dispositifs sonores, il ne les supprime pas", () => {
  const foyer = (parUnite) => consulter({ ...COLLECTIF, etagesSurRdc: 6,
    hauteurPlancherBasLogementLePlusHaut: 20, hauteurPlancherBasNiveauLePlusHaut: 20,
    logementFoyer: true, occupantsParUniteDeVie: parUnite });
  assert.match(foyer(8).faits.alarmeLogementFoyer, /à chaque niveau/);
  assert.match(foyer(14).faits.alarmeLogementFoyer, /dans chaque unité de vie/);
  // Le téléphone et l'alarme sonore restent exigés dans les deux cas.
  assert.match(foyer(8).modules.find((m) => m.id === "alarme-logement-foyer").mention, /téléphone accessible en permanence/);
});

test("une 3ᵉ famille A peut basculer sur les dégagements de la 3ᵉ B — deux conditions", () => {
  const troisA = { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, distancePortePaliereEscalier: 8,
    accesEscaliersAtteintsParVoieEchelles: true, voieAccesDecrite: true, voieLargeur: 4,
    voieForcePortante: 130, voieRayonInterieur: 11, voieHauteurLibre: 3.5, voiePente: 8,
    voieLongueur: 12, voieResistancePoinconnement: 100, voieRaccordeeAUneVoieEngins: "surVoiePublique",
    logementFoyer: true, typeLogementFoyer: "autres" };
  assert.equal(consulter(troisA).faits.classement, "3e famille A");
  assert.match(consulter({ ...troisA, occupantsParUniteDeVie: 12, occupantsParNiveau: 25 }).faits.degagementsUniteDeVie,
    /3ᵉ famille B/);
  // Plus de dix par unité mais vingt par niveau au plus : le renvoi ne joue pas.
  assert.equal(consulter({ ...troisA, occupantsParUniteDeVie: 12, occupantsParNiveau: 18 }).faits.degagementsUniteDeVie,
    "régime du classement");
});

test("un foyer pour personnes âgées ne monte pas au-delà du sixième étage", () => {
  const foyer = (etage) => consulter({ ...COLLECTIF, etagesSurRdc: 8,
    hauteurPlancherBasLogementLePlusHaut: 25, hauteurPlancherBasNiveauLePlusHaut: 25,
    logementFoyer: true, typeLogementFoyer: "personnesAgees", etageLePlusHautDuFoyer: etage });
  assert.match(foyer(5).faits.niveauMaximalFoyerPersonnesAgees, /admis/);
  assert.match(foyer(7).faits.niveauMaximalFoyerPersonnesAgees, /interdit au-delà du 6/);
  // Et la doctrine de 1988 étend la limite aux locaux collectifs.
  assert.match(foyer(5).modules.find((m) => m.id === "niveau-maximal-foyer-personnes-agees").mention, /locaux collectifs/);
});

/* ── Titre VII : dispositions diverses ───────────────────────────────────── */

test("les parois de cage d'ascenseur suivent le classement, 3ᵉ A comprise", () => {
  const avecAscenseur = (extra) => consulter({ ...COLLECTIF, ascenseur: true, ...extra });
  const deuxieme = avecAscenseur({ etagesSurRdc: 3, hauteurPlancherBasLogementLePlusHaut: 9, hauteurPlancherBasNiveauLePlusHaut: 9 });
  assert.equal(deuxieme.faits.paroisCageAscenseur, "CF 1/2 h");
  const troisB = consulter({ ...troisiemeB(), ascenseur: true });
  assert.equal(troisB.faits.paroisCageAscenseur, "CF 1 h");
  // Sans ascenseur, l'article ne dit rien.
  assert.equal(consulter(troisiemeB({ ascenseur: false })).faits.paroisCageAscenseur, "sans objet");
});

test("l'appel prioritaire des pompiers n'est exigé qu'en 4ᵉ famille", () => {
  const quatrieme = { ...COLLECTIF, etagesSurRdc: 12, hauteurPlancherBasLogementLePlusHaut: 40,
    hauteurPlancherBasNiveauLePlusHaut: 40, ascenseur: true };
  assert.match(consulter(quatrieme).faits.appelPrioritairePompiers, /une cabine au moins par batterie/);
  assert.equal(consulter(troisiemeB({ ascenseur: true })).faits.appelPrioritairePompiers, "non exigé");
});

test("la colonne sèche : la règle est à l'article 98, pas à l'article 3", () => {
  // L'alinéa de l'article 3 est écrit dans le paragraphe du déclassement : le
  // lire comme une règle générale dispenserait de colonne sèche les bâtiments
  // de sept étages au plus, que l'article 98 vise pourtant.
  const troisB = troisiemeB({ etagesSurRdc: 5, accesHallsAtteintsParVoieEchelles: false });
  assert.match(consulter(troisB).faits.colonneSeche, /exigée/);
  assert.equal(consulter(troisB).modules.find((m) => m.id === "colonne-seche").pourquoi.article, "98");
  // L'exception de l'article 98 : collectif, sept étages au plus, halls atteints
  // par la voie-échelles. Les deux conditions ensemble.
  assert.equal(consulter(troisiemeB({ etagesSurRdc: 5, accesHallsAtteintsParVoieEchelles: true })).faits.colonneSeche,
    "non obligatoire");
  assert.match(consulter(troisiemeB({ etagesSurRdc: 9, accesHallsAtteintsParVoieEchelles: true })).faits.colonneSeche,
    /exigée/);
  // La quatrième famille l'a toujours.
  const quatrieme = { ...COLLECTIF, etagesSurRdc: 12, hauteurPlancherBasLogementLePlusHaut: 40,
    hauteurPlancherBasNiveauLePlusHaut: 40 };
  assert.match(consulter(quatrieme).faits.colonneSeche, /exigée/);
});

test("l'alinéa de l'article 3 ne vise que les bâtiments déclassés", () => {
  const declasse = troisiemeB({ etagesSurRdc: 9, arreteMunicipalDeclassement: true,
    logementsAtteignablesEchellesOuParcoursSur: true });
  assert.equal(consulter(declasse).faits.regimeApplique, "3e famille A");
  assert.equal(consulter(declasse).faits.colonnesSechesDeclassement, "exigées");
  // Sans déclassement, cet alinéa-là est sans objet — l'article 98 prend le relais.
  const sansDeclassement = troisiemeB({ etagesSurRdc: 9, arreteMunicipalDeclassement: false });
  assert.equal(consulter(sansDeclassement).faits.colonnesSechesDeclassement, "sans objet");
  assert.match(consulter(sansDeclassement).faits.colonneSeche, /exigée/);
});

/* ── Titre VI : parcs de stationnement couverts ──────────────────────────── */

/** Un parc annexe ordinaire : dans le champ, et rien d'autre de décidé. */
const PARC = { parcDeStationnement: true, surfaceParc: 2000 };
const parc = (extra = {}) => consulter({ ...PARC, ...extra });

test("le titre VI ne s'applique qu'entre 100 m² et 6 000 m²", () => {
  assert.equal(parc({ surfaceParc: 2000 }).faits.parcDansLeChamp, "dans le champ");
  // Les deux bornes sont exclusives dans des sens opposés : « plus de 100 m² et
  // 6 000 m² au plus ».
  assert.match(parc({ surfaceParc: 100 }).faits.parcDansLeChamp, /au plus 100 m²/);
  assert.equal(parc({ surfaceParc: 101 }).faits.parcDansLeChamp, "dans le champ");
  assert.equal(parc({ surfaceParc: 6000 }).faits.parcDansLeChamp, "dans le champ");
  assert.match(parc({ surfaceParc: 6001 }).faits.parcDansLeChamp, /plus de 6 000 m²/);
});

test("sans parc déclaré, tout le titre VI se tait — et ne pose aucune question", () => {
  const sansParc = consulter({ parcDeStationnement: false });
  assert.equal(sansParc.faits.parcDansLeChamp, "sans objet");
  assert.equal(sansParc.faits.stabiliteParc, "sans objet");
  assert.equal(sansParc.faits.boxesDansLeParcVerdict, "sans objet");
  // La question des boxes ne se pose pas non plus : elle n'a de sens qu'une fois
  // le parc reconnu.
  assert.equal(sansParc.questions.some((q) => q.cle === "boxesDansLeParc"), false);
});

test("le parc a sa propre racine : il se juge sans savoir la famille du bâtiment", () => {
  // C'est la nouveauté structurelle du titre VI. Une colonne entière de modules
  // conclut alors que le classement, lui, n'a pas encore de quoi se prononcer.
  const vue = parc({ niveauxParcAuDessus: 0, niveauxParcAuDessous: 1 });
  assert.equal(vue.faits.classement, undefined);
  assert.equal(vue.faits.stabiliteParc, "SF 1 h — planchers séparatifs CF 1 h");
  assert.equal(vue.faits.accesVehiculesLourds, "interdit au-delà de 3,5 t");
  assert.match(vue.faits.reactionAuFeuParc, /^M0/);
});

test("la stabilité au feu du parc se lit en trois tranches, article 81", () => {
  // La première parle d'un rez-de-chaussée éventuellement surmonté d'un étage ;
  // les suivantes de niveaux « au-dessus **ou** au-dessous » — c'est le plus
  // grand des deux comptes qui commande, et non leur somme.
  assert.equal(parc({ niveauxParcAuDessus: 1, niveauxParcAuDessous: 0 }).faits.stabiliteParc, "SF 1/2 h");
  assert.equal(parc({ niveauxParcAuDessus: 0, niveauxParcAuDessous: 2 }).faits.stabiliteParc,
    "SF 1 h — planchers séparatifs CF 1 h");
  assert.equal(parc({ niveauxParcAuDessus: 2, niveauxParcAuDessous: 2 }).faits.stabiliteParc,
    "SF 1 h — planchers séparatifs CF 1 h");
  // Au-delà de deux niveaux, c'est la hauteur du plancher bas du dernier niveau
  // qui tranche, et l'article s'arrête à 28 m.
  const profond = { niveauxParcAuDessus: 0, niveauxParcAuDessous: 4 };
  assert.equal(parc({ ...profond, hauteurPlancherBasDernierNiveauParc: 12 }).faits.stabiliteParc,
    "SF 1 h 30 — planchers séparatifs CF 1 h 30");
  assert.match(parc({ ...profond, hauteurPlancherBasDernierNiveauParc: 30 }).faits.stabiliteParc,
    /au-delà de la portée de l'article 81/);
});

test("l'isolement d'un parc contigu est la seule liaison avec le classement", () => {
  const contigu = { ...PARC, parcContiguAImmeuble: true };
  const troisB = consulter({ ...troisiemeB(), ...contigu });
  assert.equal(troisB.faits.classement, "3e famille B");
  assert.equal(troisB.faits.isolementParcContigu, "CF 2 h");
  const deuxieme = consulter({ ...COLLECTIF, etagesSurRdc: 3,
    hauteurPlancherBasLogementLePlusHaut: 9, hauteurPlancherBasNiveauLePlusHaut: 9, ...contigu });
  assert.equal(deuxieme.faits.classement, "2e famille");
  assert.equal(deuxieme.faits.isolementParcContigu, "CF 1 h");
  // Le plancher bas est expressément exclu, et « contigu » inclut le parc situé
  // en dessous de l'immeuble.
  const module = troisB.modules.find((m) => m.id === "isolement-parc-contigu");
  assert.match(module.mention, /plancher bas est expressément exclu/);
  assert.match(module.mention, /situé en dessous/);
});

test("un parc non contigu ne s'isole qu'en deçà de 8 m", () => {
  assert.match(parc({ parcContiguAImmeuble: false, distanceParcAImmeubleHabite: 5 }).faits.isolementParcContigu,
    /murs extérieurs PF 1 h dans la zone de 8 m/);
  assert.match(parc({ parcContiguAImmeuble: false, distanceParcAImmeubleHabite: 8 }).faits.isolementParcContigu,
    /aucun isolement exigé/);
});

test("une communication vers le bâtiment appelle un sas — et trois interdictions", () => {
  assert.equal(parc({ communicationParcImmeuble: false }).faits.sasCommunicationParc, "sans objet");
  const avecSas = parc({ communicationParcImmeuble: true });
  assert.equal(avecSas.faits.sasCommunicationParc, "sas de 3 m² minimum, deux portes PF 1/2 h");
  // Ce sont les interdictions qui servent en réunion, plus que l'exigence
  // elle-même : elles ne se lisent pas dans l'article, seulement dans la
  // réponse ministérielle de 1988.
  const mention = avecSas.modules.find((m) => m.id === "sas-communication-parc").mention;
  assert.match(mention, /ne dessert jamais à la fois le parc et le\s+volume des caves/);
  assert.match(mention, /ne débouche pas dans la cage d'escalier commune/);
});

test("le recoupement en compartiments ne vise que le dessous du niveau de référence", () => {
  assert.match(parc({ niveauxParcAuDessous: 0 }).faits.recoupementParc, /sans objet/);
  const sousSol = { niveauxParcAuDessous: 2 };
  assert.match(parc({ ...sousSol, superficieCompartimentParc: 2999 }).faits.recoupementParc, /compartiments conformes/);
  // 3 000 m² pile est déjà trop : le texte dit « inférieurs à 3 000 m² ».
  assert.match(parc({ ...sousSol, superficieCompartimentParc: 3000 }).faits.recoupementParc, /recoupement exigé/);
  assert.match(parc({ ...sousSol, superficieCompartimentParc: 3000 }).modules
    .find((m) => m.id === "recoupement-parc").mention, /pare-flammes de degré 1\/2 heure à fermeture automatique/);
});

test("un box du parc ne compte pas plus de deux emplacements", () => {
  assert.equal(parc({ boxesDansLeParc: false }).faits.boxesDansLeParcVerdict, "sans objet");
  assert.match(parc({ boxesDansLeParc: true, emplacementsParBox: 2 }).faits.boxesDansLeParcVerdict, /conformes/);
  assert.match(parc({ boxesDansLeParc: true, emplacementsParBox: 3 }).faits.boxesDansLeParcVerdict, /non conformes/);
  // Et pas de cave ni de rangement fermé en fond de box.
  assert.match(parc({ boxesDansLeParc: true, emplacementsParBox: 2 }).modules
    .find((m) => m.id === "boxes-dans-le-parc").mention, /caves ou des espaces de rangement fermés en fond de\s+box/);
});

test("la couverture dominée par des façades vitrées est PF 1 h sur 8 m", () => {
  assert.match(parc({ couvertureParcDomineeParFacadesVitrees: true }).faits.couvertureParc,
    /PF 1 h sur 8 m/);
  assert.match(parc({ couvertureParcDomineeParFacadesVitrees: false }).faits.couvertureParc,
    /aucune exigence par cet article/);
});

test("l'article 86 ne connaît que trois cas de revêtement de couverture", () => {
  assert.equal(parc({ revetementCouvertureParcClasse: "M0" }).faits.revetementCouvertureParc,
    "admis sans restriction");
  assert.equal(parc({ revetementCouvertureParcClasse: "M3", supportCouvertureParcContinu: true })
    .faits.revetementCouvertureParc, "admis sans restriction");
  // Un M3 sur un support quelconque suit la règle des M4 : plus de 8 m.
  const m3PosePartout = { revetementCouvertureParcClasse: "M3", supportCouvertureParcContinu: false };
  assert.match(parc({ ...m3PosePartout, distanceCouvertureParcAuBatimentVoisin: 10 }).faits.revetementCouvertureParc,
    /admis — plus de 8 m/);
  assert.match(parc({ ...m3PosePartout, distanceCouvertureParcAuBatimentVoisin: 8 }).faits.revetementCouvertureParc,
    /non admis/);
  assert.match(parc({ revetementCouvertureParcClasse: "M4", distanceCouvertureParcAuBatimentVoisin: 6 })
    .faits.revetementCouvertureParc, /non admis/);
});

test("la distance vers une issue tombe de 40 m à 25 m sans choix entre plusieurs", () => {
  assert.match(parc({ plusieursIssuesAuChoix: true, distanceAParcourirVersIssueParc: 40 }).faits.distanceIssuesParc,
    /admissible — 40 m au plus/);
  assert.match(parc({ plusieursIssuesAuChoix: true, distanceAParcourirVersIssueParc: 41 }).faits.distanceIssuesParc,
    /dépassée/);
  // Un seul escalier, ou une partie formant cul-de-sac : 25 m.
  assert.match(parc({ plusieursIssuesAuChoix: false, distanceAParcourirVersIssueParc: 30 }).faits.distanceIssuesParc,
    /dépassée — 25 m au plus admis/);
  assert.match(parc({ plusieursIssuesAuChoix: false, distanceAParcourirVersIssueParc: 25 }).faits.distanceIssuesParc,
    /admissible — 25 m au plus/);
});

test("les cloisons d'escalier du parc : 1/2 heure au seul rez-de-chaussée surmonté d'un étage", () => {
  assert.match(parc({ niveauxParcAuDessus: 1, niveauxParcAuDessous: 0 }).faits.escaliersParc, /CF 1\/2 h/);
  assert.match(parc({ niveauxParcAuDessus: 0, niveauxParcAuDessous: 1 }).faits.escaliersParc, /CF 1 h/);
  // Et l'escalier du sous-sol n'aboutit jamais dans celui des niveaux hauts.
  assert.match(parc({ niveauxParcAuDessus: 0, niveauxParcAuDessous: 1 }).modules
    .find((m) => m.id === "escaliers-parc").mention, /ne doivent pas\s+aboutir dans ceux desservant les niveaux situés au-dessus/);
});

test("l'escalier qui aboutit dans l'immeuble appelle un sas, sinon une porte PF 1/2 h", () => {
  assert.match(parc({ escaliersParcAboutissentDansImmeuble: true }).faits.protectionEscaliersParc,
    /sas à chaque niveau/);
  assert.match(parc({ escaliersParcAboutissentDansImmeuble: false }).faits.protectionEscaliersParc,
    /portes PF 1\/2 h/);
});

test("sous le niveau de référence, la ventilation naturelle ne tient pas sans larges ouvertures", () => {
  const enterre = { niveauxParcAuDessous: 2, ventilationParcRetenue: "naturelle" };
  assert.match(parc({ ...enterre, largesOuverturesDeuxFacesOpposees: false }).faits.ventilationParc,
    /non conforme — ventilation mécanique exigée/);
  // Le cas particulier qu'on oublie : de larges ouvertures à l'air libre sur
  // deux faces opposées, à chaque niveau.
  assert.match(parc({ ...enterre, largesOuverturesDeuxFacesOpposees: true }).faits.ventilationParc,
    /6 dm² par véhicule/);
  // Un seul niveau enterré : la mécanique ne s'impose pas.
  assert.match(parc({ niveauxParcAuDessous: 1, ventilationParcRetenue: "naturelle",
    largesOuverturesDeuxFacesOpposees: false }).faits.ventilationParc, /6 dm² par véhicule/);
  assert.match(parc({ ventilationParcRetenue: "mecanique" }).faits.ventilationParc, /600 m³\/h par voiture/);
  // Le désenfumage n'est pas une seconde installation : c'est celle-là.
  assert.match(parc({ ventilationParcRetenue: "naturelle", niveauxParcAuDessous: 0 }).modules
    .find((m) => m.id === "ventilation-parc").mention, /il n'y a pas deux installations/);
});

test("la détection de l'article 95 ne compte pas les niveaux comme la caisse de sable de l'article 96", () => {
  // C'est la subtilité du titre VI, et le ministère a refusé d'en donner une
  // règle générale en 1987 : « à partir du 3ème niveau » exclut le niveau de
  // référence, « à chaque niveau une caisse de 100 litres » l'inclut.
  const quatreNiveaux = { niveauxParcAuDessous: 4, extinctionAutomatiqueInstallee: false };
  assert.match(parc(quatreNiveaux).faits.detectionParc, /à partir du 3ᵉ niveau/);
  assert.match(parc({ niveauxParcAuDessous: 6 }).faits.detectionParc, /à tous les niveaux/);
  assert.match(parc({ niveauxParcAuDessous: 3 }).faits.detectionParc, /non exigée/);
  // L'extinction automatique lève l'exigence du premier tiret.
  assert.match(parc({ niveauxParcAuDessous: 4, extinctionAutomatiqueInstallee: true }).faits.detectionParc,
    /non exigée — extinction automatique installée/);
  assert.match(parc(quatreNiveaux).modules.find((m) => m.id === "detection-parc").mention,
    /ne compte pas le niveau de référence/);
  // Les moyens de lutte, eux, ne dépendent d'aucun compte : une caisse par
  // niveau, niveau de référence compris.
  assert.match(parc().faits.moyensDeLutteParc, /1 caisse de sable par niveau/);
  assert.match(parc().modules.find((m) => m.id === "moyens-de-lutte-parc").mention,
    /« niveau » \*\*inclut\*\* le niveau de référence/);
});

test("l'alarme aux usagers : plus de quatre niveaux au-dessus, ou plus de deux au-dessous", () => {
  assert.equal(parc({ niveauxParcAuDessus: 5, niveauxParcAuDessous: 0 }).faits.alarmeUsagersParc, "exigé");
  assert.equal(parc({ niveauxParcAuDessus: 0, niveauxParcAuDessous: 3 }).faits.alarmeUsagersParc, "exigé");
  assert.equal(parc({ niveauxParcAuDessus: 4, niveauxParcAuDessous: 2 }).faits.alarmeUsagersParc, "non exigé");
});

test("les colonnes sèches du parc s'alimentent à 100 m, celles du bâtiment à 60 m", () => {
  assert.match(parc({ niveauxParcAuDessus: 5, niveauxParcAuDessous: 0 }).faits.colonneSecheParc, /exigées/);
  assert.match(parc({ niveauxParcAuDessus: 0, niveauxParcAuDessous: 4 }).faits.colonneSecheParc, /exigées/);
  assert.equal(parc({ niveauxParcAuDessus: 4, niveauxParcAuDessous: 3 }).faits.colonneSecheParc, "non exigées");
  // Deux chiffres voisins pour la même prise d'eau, dans deux articles
  // différents : c'est exactement le genre d'écart qu'on relit deux fois.
  assert.match(parc({ niveauxParcAuDessous: 4 }).modules.find((m) => m.id === "colonne-seche-parc").mention,
    /100 m ici, contre\s+60 m à l'article 98/);
});

test("détection et extinction automatique se répondent d'un article à l'autre", () => {
  // L'article 96, 3°) dispense du réseau d'extinction le parc équipé de
  // détection à partir du troisième niveau — et l'article 95, 1°) dispense de
  // détection celui qui a l'extinction. Les deux se lisent ensemble.
  assert.match(parc({ niveauxParcAuDessous: 4, extinctionAutomatiqueInstallee: false })
    .faits.extinctionAutomatiqueParc, /non exigée — détection automatique installée/);
  assert.match(parc({ niveauxParcAuDessous: 4, extinctionAutomatiqueInstallee: true })
    .faits.extinctionAutomatiqueParc, /exigée à partir du 3ᵉ niveau/);
  assert.match(parc({ niveauxParcAuDessous: 6 }).faits.extinctionAutomatiqueParc, /à partir du 6ᵉ niveau/);
  assert.equal(parc({ niveauxParcAuDessous: 3 }).faits.extinctionAutomatiqueParc, "non exigée");
});

test("le copilote peut demander une exigence du parc, et on lui dit ce qui manque", () => {
  const rendu = demander("recoupementParc", { ...PARC, niveauxParcAuDessous: 2, superficieCompartimentParc: 4000 });
  assert.equal(rendu.ok, true);
  assert.match(rendu.valeur, /recoupement exigé/);
  assert.equal(rendu.pourquoi.article, "84");
  assert.equal(rendu.pourquoi.paragraphe, "1°)");
  // Le chemin passe par le champ d'application, pas par le classement.
  assert.deepEqual(rendu.chemin.map((e) => e.id), ["champ-parc", "recoupement-parc"]);
  // Sans rien savoir du parc, on ne rend pas une valeur : on nomme la question.
  const muet = demander("recoupementParc", {});
  assert.equal(muet.ok, false);
  assert.equal(muet.manque.some((q) => q.cle === "parcDeStationnement"), true);
});

test("le dépouillement du titre VI ne descend pas dans le navigateur", () => {
  // Même garde que pour le reste du corpus : la table des règles reste au
  // serveur, et un parc n'y fait pas exception.
  const serialise = JSON.stringify(parc({ niveauxParcAuDessous: 4, superficieCompartimentParc: 4000 }));
  assert.equal(serialise.includes('"regles"'), false);
  assert.equal(serialise.includes('"si"'), false);
});

/* ── Le texte de l'arrêté, ouvert sous la question ───────────────────────── */

test("l'arrêté s'ouvre à l'article demandé, texte et commentaire séparés", () => {
  const article = lireArticle("6");
  assert.equal(article.ok, true);
  assert.equal(article.numero, "6");
  assert.match(article.texte, /Les planchers/);
  assert.match(article.texte, /vide sanitaire non accessible/);
  // Le commentaire est à part : on ne défend pas de la même façon un article et
  // une doctrine, et les mélanger ferait citer une lecture comme si c'était la loi.
  assert.ok(!article.texte.includes("Commentaire SOCOTEC"));
});

test("l'article premier porte son schéma, redessiné en traits", () => {
  const article = lireArticle("1er");
  assert.equal(article.figures.length, 1);
  assert.match(article.figures[0].svg, /^<svg /);
});

test("un article hors du texte porté se refuse plutôt que de rendre du vide", () => {
  assert.equal(lireArticle("512").ok, false);
  assert.equal(lireArticle("").ok, false);
});

test("le texte de l'arrêté ne descend pas avec les vagues de questions", () => {
  // Deux cent cinquante kilo-octets à chaque réponse, pour un panneau qu'on
  // n'ouvre pas à chaque question : l'écran va le chercher quand il l'ouvre.
  const vue = consulter({});
  const charge = JSON.stringify(vue);
  assert.ok(charge.length < 150000, `la consultation pèse ${Math.round(charge.length / 1024)} Ko`);
  for (const question of vue.questions) assert.equal(question.documentation, undefined);
});

test("l'inspection est la seule porte par laquelle les règles sortent", () => {
  // Et elle est fermée à clé dans la fonction : ici, on vérifie seulement que
  // la consultation ordinaire, elle, n'en laisse rien passer.
  const serialise = JSON.stringify(consulter({ logementsSuperposes: true, etagesSurRdc: 3 }));
  assert.equal(serialise.includes('"regles"'), false);
  assert.equal(serialise.includes('"si"'), false);
  // Tandis que l'inspection, demandée explicitement, les rend.
  assert.ok(expliquer("planchers", {}).regles.length > 0);
});

/* ── L'ordre des questions ───────────────────────────────────────────────── */

/** Six bâtiments complets, un par famille — de quoi juger ce qui est demandé. */
const CAS_COMPLETS = {
  "1re famille": { logementsSuperposes: false, implantation: "isolee", etagesSurRdc: 1,
    ...SANS_DUPLEX, hauteurPlancherBasLogementLePlusHaut: 5, hauteurPlancherBasNiveauLePlusHaut: 5 },
  "2e famille": { ...COLLECTIF, etagesSurRdc: 3,
    hauteurPlancherBasLogementLePlusHaut: 7.5, hauteurPlancherBasNiveauLePlusHaut: 7.5 },
  "3e famille A": { ...COLLECTIF, etagesSurRdc: 6, hauteurPlancherBasLogementLePlusHaut: 20,
    hauteurPlancherBasNiveauLePlusHaut: 20, distancePortePaliereEscalier: 8,
    accesEscaliersAtteintsParVoieEchelles: true, voieAccesDecrite: true, voieLargeur: 4,
    voieForcePortante: 130, voieRayonInterieur: 11, voieHauteurLibre: 3.5, voiePente: 8,
    voieLongueur: 12, voieResistancePoinconnement: 100, voieRaccordeeAUneVoieEngins: "surVoiePublique" },
  "3e famille B": troisiemeB(),
  "4e famille": { ...COLLECTIF, etagesSurRdc: 12,
    hauteurPlancherBasLogementLePlusHaut: 40, hauteurPlancherBasNiveauLePlusHaut: 40 }
};

test("aucune question posée n'est sans effet, quelle que soit la réponse", () => {
  // C'est le garde-fou de l'ordonnancement. On demandait « comment la
  // circulation est-elle désenfumée ? » à quelqu'un décrivant une deuxième
  // famille — où les circulations ne se désenfument pas : la question n'était
  // pas seulement prématurée, elle n'avait aucun effet visible. Une question
  // sans effet se répond au hasard, et l'on cesse de croire aux suivantes.
  //
  // La vérification est mécanique : pour chaque question posée dont les
  // réponses s'énumèrent, l'une au moins doit faire conclure autre chose que
  // « sans objet » au module qui la demande.
  const inutiles = [];
  for (const [nom, cas] of Object.entries({ "au départ": {}, ...CAS_COMPLETS })) {
    for (const question of consulter(cas).questions) {
      const valeurs = question.type === "booleen" ? [true, false]
        : question.type === "choix" ? (question.valeurs ?? []).map((v) => v.valeur) : null;
      if (!valeurs) continue;
      const utile = valeurs.some((valeur) => {
        const module = consulter({ ...cas, [question.cle]: valeur }).modules.find((m) => m.id === question.pour);
        return !module || module.statut !== "conclu" || (module.valeur !== null && !module.sansObjet);
      });
      if (!utile) inutiles.push(`${nom} : ${question.cle} → ${question.pour}`);
    }
  }
  assert.deepEqual(inutiles, []);
});

test("la deuxième famille ne se voit demander ni désenfumage ni circulation protégée", () => {
  // Le cas rapporté, nommément. En deuxième famille, aucune circulation
  // horizontale protégée n'est exigée : il n'y a rien à désenfumer.
  const posees = consulter(CAS_COMPLETS["2e famille"]).questions.map((q) => q.cle);
  assert.equal(posees.includes("modeDesenfumageRetenu"), false);
  assert.equal(posees.includes("typeCirculationRetenue"), false);
  assert.match(consulter(CAS_COMPLETS["2e famille"]).faits.extractionMecanique, /sans objet/);
  // Et la troisième famille B, elle, se les voit demander : le garde-fou ne
  // doit pas faire taire ce qui compte.
  const troisB = consulter(CAS_COMPLETS["3e famille B"]).questions.map((q) => q.cle);
  assert.ok(troisB.includes("modeDesenfumageRetenu"));
  assert.ok(troisB.includes("typeCirculationRetenue"));
});

test("sans logement-foyer, on ne demande pas de quel type il est", () => {
  const posees = consulter({ ...CAS_COMPLETS["2e famille"], logementFoyer: false }).questions.map((q) => q.cle);
  assert.equal(posees.includes("typeLogementFoyer"), false);
  // Et la question ne se pose pas non plus avant qu'on ait dit s'il y en a un.
  assert.equal(consulter({}).questions.map((q) => q.cle).includes("typeLogementFoyer"), false);
});

test("une question ne se pose jamais avant celle dont elle dépend", () => {
  // Le graphe donne l'ordre : un module dont un amont n'a pas conclu se tait.
  const vue = consulter({});
  const produits = new Set(vue.graphe.noeuds.map((n) => n.produit));
  for (const question of vue.questions) {
    const module = vue.modules.find((m) => m.id === question.pour);
    assert.deepEqual(module.manque.filter((cle) => produits.has(cle)), [],
      `${question.pour} demande ${question.cle} alors qu'un amont n'a pas conclu`);
  }
});
