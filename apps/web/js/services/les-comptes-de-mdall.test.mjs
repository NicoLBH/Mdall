/**
 * Les comptes de Mdall, tels que la console les met en forme.
 *
 * Les comptes sont inventés : BERTRAND, NOVACLIM, VERIFAS, des adresses en
 * `.example`. Rien de ce fichier ne vient d'une base réelle.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CE_QUE_DIT_LE_ROLE, LE_ROLE, PAR_PAGE, laConsommationALecran, leDetailDunCompte,
  lePasPourLaBase, lesComptesALecran, lidentifiantCourt, unCompteALecran
} from "./les-comptes-de-mdall.js";
import {
  PAS, laFenetreDe, parPas, totalDesAppels
} from "./consommation-ia.js";

/** Une ligne telle que `les_comptes_de_mdall()` la rend. */
const uneLigne = (reste = {}) => ({
  identifiant: "a1b2c3d4-0000-4000-8000-000000000001",
  courriel: "ourdine.ferrand@verifas.example",
  prenom: "Ourdine",
  nom: "Ferrand",
  societe: "VERIFAS",
  entre_le: "2026-03-02T09:00:00Z",
  derniere_trace: "2026-10-01T14:00:00Z",
  projets_possedes: 3,
  projets_collabores: 1,
  combien_en_tout: 42,
  ...reste
});

/* ── Un compte, et comment on l'appelle ──────────────────────────────────── */

test("un compte se nomme par son nom, son adresse, ou son identifiant", () => {
  // **Jamais « Utilisateur anonyme »** : cela ferait croire à un défaut de
  // saisie là où il n'y a qu'un compte qui n'a pas rempli son profil.
  assert.equal(unCompteALecran(uneLigne()).commeOnLappelle, "Ourdine Ferrand");
  assert.equal(
    unCompteALecran(uneLigne({ prenom: "", nom: "" })).commeOnLappelle,
    "ourdine.ferrand@verifas.example"
  );
  assert.equal(
    unCompteALecran(uneLigne({ prenom: "", nom: "", courriel: "" })).commeOnLappelle,
    "a1b2c3d4"
  );
  // Un prénom seul suffit : on n'attend pas les deux pour écrire quelque chose.
  assert.equal(unCompteALecran(uneLigne({ nom: "" })).commeOnLappelle, "Ourdine");
});

test("une ligne sans identifiant ne fait pas de compte", () => {
  // Sans identifiant, le clic sur la ligne ne pourrait désigner personne : un
  // détail s'ouvrirait sur un compte qu'on ne sait pas lire (règle 5).
  assert.equal(unCompteALecran({ courriel: "a@b.example" }), null);
  assert.equal(unCompteALecran(null), null);
  assert.equal(unCompteALecran({}), null);
});

test("l'identifiant se raccourcit pour être lu, et l'entier se garde", () => {
  // Un UUID entier prend la moitié d'une colonne et ne se retient pas. Tronqué
  // **sans** garder l'entier, il ne servirait à rien : on ne peut plus rien
  // chercher avec huit caractères.
  const compte = unCompteALecran(uneLigne());
  assert.equal(compte.court, "a1b2c3d4");
  assert.equal(compte.identifiant, "a1b2c3d4-0000-4000-8000-000000000001");
  assert.equal(lidentifiantCourt(""), "");
  assert.equal(lidentifiantCourt(null), "");
});

/* ── Une page de comptes ─────────────────────────────────────────────────── */

test("le total vient de la base, pas de la longueur de la page", () => {
  // Compter les lignes reçues dirait « 25 comptes » sur une base de mille, et
  // l'écran n'oserait pas proposer la page suivante.
  const vues = lesComptesALecran([uneLigne(), uneLigne({
    identifiant: "b2c3d4e5-0000-4000-8000-000000000002", courriel: "bertrand@novaclim.example"
  })]);

  assert.equal(vues.comptes.length, 2);
  assert.equal(vues.combienEnTout, 42);
  assert.notEqual(vues.combienEnTout, vues.comptes.length);
});

test("une page vide n'est pas une lecture ratée", () => {
  // Les deux mènent à des décisions opposées : la première dit « personne ne
  // répond à cette recherche », la seconde a quelque chose qu'on ne sait pas.
  assert.deepEqual(lesComptesALecran([]), { comptes: [], combienEnTout: 0 });
  assert.equal(lesComptesALecran(null), null);
  assert.equal(lesComptesALecran(undefined), null);
});

test("vingt-cinq par page, comme les autres tableaux de Mdall", () => {
  assert.equal(PAR_PAGE, 25);
});

/* ── Le détail, et les deux rôles ────────────────────────────────────────── */

const unDetail = (reste = {}) => ({
  ...uneLigne(),
  sujets: 118,
  appels: 412,
  jetons: 9_400_000,
  premier_appel: "2026-03-04T10:00:00Z",
  dernier_appel: "2026-10-02T17:00:00Z",
  projets: [
    {
      id: "11111111-1111-4111-8111-111111111111", nom: "Médiathèque de Montholon",
      role: "proprietaire", cree_le: "2026-03-02T09:00:00Z", archive_le: null, sujets: 74
    },
    {
      id: "22222222-2222-4222-8222-222222222222", nom: "Gymnase",
      role: "proprietaire", cree_le: "2026-05-02T09:00:00Z",
      archive_le: "2026-09-30T09:00:00Z", sujets: 12
    },
    {
      id: "33333333-3333-4333-8333-333333333333", nom: "Groupe scolaire",
      role: "collaborateur", cree_le: "2026-06-02T09:00:00Z", archive_le: null, sujets: 32
    }
  ],
  ...reste
});

test("possédé et collaboré ne se mélangent pas", () => {
  // Un déclencheur inscrit le propriétaire comme collaborateur de son propre
  // chantier : fondus, les deux nombres monteraient ensemble sans rien
  // apprendre de plus que la colonne d'à côté.
  const detail = leDetailDunCompte(unDetail());

  assert.deepEqual(detail.possedes.map((un) => un.nom),
    ["Médiathèque de Montholon", "Gymnase"]);
  assert.deepEqual(detail.collabores.map((un) => un.nom), ["Groupe scolaire"]);
  assert.equal(detail.sujets, 118);
  assert.equal(detail.appels, 412);
});

test("un rôle inconnu devient propriétaire, et non une catégorie inventée", () => {
  // La base n'en écrit que deux ; un troisième mot viendrait d'un déploiement
  // plus récent, et une liste « Autre » laisserait chercher ce que c'est.
  const detail = leDetailDunCompte(unDetail({
    projets: [{ id: "4", nom: "Presbytère", role: "visiteur" }]
  }));
  assert.equal(detail.possedes.length, 1);
  assert.equal(detail.collabores.length, 0);
});

test("un chantier sans nom le dit, et garde sa place", () => {
  // Le faire disparaître retirerait un chantier du décompte qu'on vient lire.
  const detail = leDetailDunCompte(unDetail({
    projets: [{ id: "4", nom: "   ", role: LE_ROLE.PROPRIETAIRE }]
  }));
  assert.equal(detail.possedes[0].nom, "Chantier sans nom");

  // Un chantier sans identifiant, lui, n'a pas de place : on ne saurait pas
  // lequel c'est.
  assert.equal(leDetailDunCompte(unDetail({ projets: [{ nom: "Sans clé" }] })).possedes.length, 0);
});

test("un chantier rangé se dit comme tel", () => {
  // Un chantier archivé n'est pas un chantier mort : le taire le ferait compter
  // comme en cours.
  const detail = leDetailDunCompte(unDetail());
  const gymnase = detail.possedes.find((un) => un.nom === "Gymnase");
  assert.equal(gymnase.archiveLe, "2026-09-30T09:00:00Z");
  assert.equal(detail.possedes[0].archiveLe, "");
});

test("les deux rôles ont chacun leur mot", () => {
  assert.equal(CE_QUE_DIT_LE_ROLE[LE_ROLE.PROPRIETAIRE], "Propriétaire");
  assert.equal(CE_QUE_DIT_LE_ROLE[LE_ROLE.COLLABORATEUR], "Collaborateur");
});

test("un compte qu'on n'a pas su lire n'est pas un compte vide", () => {
  assert.equal(leDetailDunCompte(null), null);
  // Une ligne sans projets rend des listes vides, et non `null` : la lecture a
  // abouti, il n'a simplement aucun chantier.
  const nu = leDetailDunCompte(uneLigne());
  assert.deepEqual(nu.possedes, []);
  assert.deepEqual(nu.collabores, []);
});

/* ── La consommation, groupée en base et totalisée ici ───────────────────── */

test("le pas se traduit pour la base, et une seule fois", () => {
  // `consommation-ia.js` les nomme en français, `date_trunc` les veut en
  // anglais. Écrite deux fois, la traduction aurait fini par envoyer « annee » à
  // PostgreSQL, qui lève — un écran vide sur une faute de vocabulaire.
  assert.equal(lePasPourLaBase(PAS.JOUR), "day");
  assert.equal(lePasPourLaBase(PAS.MOIS), "month");
  assert.equal(lePasPourLaBase(PAS.ANNEE), "year");
  // Et les deux côtés retombent au même endroit sur un pas inconnu : sinon
  // l'axe et les données ne parleraient pas du même pas.
  assert.equal(lePasPourLaBase("semaine"), "day");
  assert.equal(lePasPourLaBase(""), "day");
});

/**
 * **Les deux bouts, branchés l'un sur l'autre.**
 *
 * La base groupe par pas et par modèle ; le JavaScript garde l'axe, les pas
 * vides et le tarif. Si les deux ne se rencontraient pas, l'écran afficherait
 * une courbe vide sans que rien ne lève — et une courbe vide se lit « rien n'a
 * été consommé » (règle 5).
 *
 * Ce qui est éprouvé ici est que **regrouper au même pas ne change rien** :
 * c'est ce qui permet de grouper en base sans écrire un second axe.
 */
test("ce que la base groupe, le même module le totalise", () => {
  const fenetre = laFenetreDe({ pas: PAS.MOIS, mois: "2026-10" });

  // Ce que la base rend : les deux appels d'octobre réunis, les deux modèles
  // distincts, et le début du pas comme instant.
  const groupe = laConsommationALecran([
    { le: "2026-09-01T00:00:00Z", model: "claude-sonnet-5-5", entree: 500, sortie: 100, combien: 1 },
    { le: "2026-10-01T00:00:00Z", model: "claude-sonnet-5-5", entree: 4000, sortie: 600, combien: 2 },
    { le: "2026-10-01T00:00:00Z", model: "claude-opus-5-5", entree: 1000, sortie: 200, combien: 1 }
  ]);

  // Les appels un par un, tels que l'écran de l'utilisateur les lit.
  const unParUn = [
    { le: "2026-09-15T10:00:00Z", model: "claude-sonnet-5-5", entree: 500, sortie: 100 },
    { le: "2026-10-02T10:00:00Z", model: "claude-sonnet-5-5", entree: 1000, sortie: 200 },
    { le: "2026-10-28T10:00:00Z", model: "claude-sonnet-5-5", entree: 3000, sortie: 400 },
    { le: "2026-10-02T18:00:00Z", model: "claude-opus-5-5", entree: 1000, sortie: 200 }
  ];

  const total = totalDesAppels(groupe);
  const attendu = totalDesAppels(unParUn);
  assert.equal(total.appels, attendu.appels, "le nombre d'appels");
  assert.equal(total.jetons, attendu.jetons, "les jetons");
  assert.ok(Math.abs(total.euros - attendu.euros) < 1e-12, "le même montant");

  // Et l'axe est le même : douze pas, dont dix vides.
  const pasGroupes = parPas(groupe, { pas: PAS.MOIS, ...fenetre });
  const pasUnParUn = parPas(unParUn, { pas: PAS.MOIS, ...fenetre });
  assert.deepEqual(pasGroupes.map((un) => un.cle), pasUnParUn.map((un) => un.cle));
  assert.deepEqual(pasGroupes.map((un) => un.appels), pasUnParUn.map((un) => un.appels));
  assert.deepEqual(pasGroupes.map((un) => un.jetons), pasUnParUn.map((un) => un.jetons));
});

test("un pas sans décompte du fournisseur ne vaut pas zéro jeton", () => {
  // Zéro et « on ne sait pas » ne se disent pas pareil : c'est la carte qui dit
  // de combien on se trompe, et elle ne peut le dire que si `null` traverse.
  const vues = laConsommationALecran([
    { le: "2026-10-01T00:00:00Z", model: "claude-sonnet-5-5", entree: null, sortie: null, combien: 7 }
  ]);
  assert.equal(vues[0].entree, null);
  assert.equal(vues[0].sortie, null);

  const total = totalDesAppels(vues);
  assert.equal(total.sansDecompte, 7);
  assert.equal(total.jetons, 0);
  assert.equal(total.euros, 0);
});

test("une ligne groupée vaut au moins un appel", () => {
  // `combien` à zéro ou absent ferait un pas qui ne compte aucun appel alors
  // qu'il porte des jetons : le total des appels et celui des jetons ne se
  // raconteraient plus la même histoire.
  const vues = laConsommationALecran([
    { le: "2026-10-01T00:00:00Z", model: "claude-sonnet-5-5", entree: 10, sortie: 2 },
    { le: "2026-10-02T00:00:00Z", model: "claude-sonnet-5-5", entree: 10, sortie: 2, combien: 0 }
  ]);
  assert.deepEqual(vues.map((un) => un.combien), [1, 1]);
});

test("la console ne lit ni la nature d'un appel ni son chantier", () => {
  // La fonction de base ne les rend pas. Les inventer ferait une répartition
  // par usage et par chantier **fausse**, et c'est le genre de faux qu'on ne
  // voit pas en regardant.
  const vues = laConsommationALecran([
    { le: "2026-10-01T00:00:00Z", model: "claude-sonnet-5-5", entree: 10, sortie: 2, combien: 1 }
  ]);
  assert.equal(vues[0].nature, "");
  assert.equal(vues[0].projetId, "");
  assert.equal(vues[0].ownerId, "");
});

test("une consommation qu'on n'a pas su lire n'est pas une consommation nulle", () => {
  assert.equal(laConsommationALecran(null), null);
  assert.deepEqual(laConsommationALecran([]), []);
});
