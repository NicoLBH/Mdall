/**
 * Le bâtiment tel que les réponses le décrivent — en coupe et en plan.
 *
 * ## Ce que ces dessins sont, et ce qu'ils ne sont pas
 *
 * Ce n'est pas une représentation du projet : ni proportions, ni géométrie, ni
 * matériaux. C'est une **relecture** de ce qui vient d'être répondu, pour qu'on
 * voie ce que l'arrêté a compris.
 *
 * C'est là tout l'intérêt. On demande « nombre d'étages sur rez-de-chaussée » ;
 * quelqu'un qui compte trois niveaux habitables répond « 3 ». Le dessin montre
 * alors quatre planchers — R, 1, 2, 3 — et la faute saute aux yeux avant
 * d'avoir contaminé le classement, puis le degré coupe-feu des planchers, puis
 * tout ce qui en découle. Aucun message d'erreur ne ferait ce travail : il
 * faudrait savoir d'avance qu'il y a une erreur.
 *
 * ## Presque chaque réponse doit se voir
 *
 * Une réponse qui ne change rien au dessin ne se relit pas. L'ascenseur, la
 * colonne de gaz, les celliers, le sas du parc, la pente du terrain : chacun a
 * son trait, et son absence se voit autant que sa présence. Ce qui n'a pas été
 * répondu, en revanche, ne se dessine jamais — un dessin qui inventerait un
 * sous-sol ferait répondre « oui » à quelqu'un qui n'a rien dit.
 *
 * ## Pourquoi deux vues
 *
 * La coupe montre ce qui s'empile : les niveaux, le sous-sol, le parc, les
 * parois qui montent ou s'arrêtent, la cote qui décide de la famille. Elle ne
 * montre rien de ce qui se mesure à plat — la distance de la porte palière la
 * plus éloignée à l'escalier, la voie-engins le long de la façade, l'éloignement
 * des baies. Ces mesures-là décident d'autant d'articles, et le plan est le seul
 * endroit où on les voit.
 *
 * ## Ce qu'ils ne font jamais
 *
 * Ils ne concluent rien, ne corrigent rien, ne signalent aucune faute — ils
 * montrent. La règle reste au serveur ; ce fichier ne connaît que des niveaux,
 * des distances et des traits.
 */

import { escapeHtml } from "../../../utils/escape-html.js";

const nombre = (valeur) => {
  const n = Number.parseFloat(String(valeur ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const oui = (valeur) => valeur === true || valeur === "oui" || valeur === "true";
const non = (valeur) => valeur === false || valeur === "non" || valeur === "false";
const booleen = (valeur) => (oui(valeur) ? true : non(valeur) ? false : null);
const borner = (n, min, max) => (n === null ? null : Math.max(min, Math.min(max, Math.round(n))));
const virgule = (n) => String(n).replace(".", ",");

/** Ce que les dessins savent lire dans les réponses. */
export const FAITS_DESSINES = [
  "logementsSuperposes", "implantation", "structuresIndependantes", "etagesSurRdc",
  "duplexOuTriplexAuDernierEtage", "niveauxEnSousSol", "hauteurPlancherBasNiveauLePlusHaut",
  "hauteurPlancherBasLogementLePlusHautSiDuplex", "paroisLogementProlongeesJusquACouverture",
  "parcDeStationnement", "niveauxParcAuDessous", "niveauxParcAuDessus", "voieAccesDecrite",
  "typeEscalierRetenu", "typeCirculationRetenue", "distancePortePaliereEscalier",
  "accesEscaliersAtteintsParVoieEchelles", "distanceEscalierAuxBaies", "distanceLimiteDePropriete",
  // Ce que la coupe a appris à montrer : chaque réponse qui suit déplace un trait.
  "celliersOuCavesRegroupes", "ascenseur", "ascenseurDessertSousSolParcOuCaves",
  "conduiteMontanteDeGaz", "gazTraversantUnParcDeStationnement", "colonneMontanteElectriqueEnGaine",
  "videOrdures", "communicationParcImmeuble", "plusieursIssuesAuChoix",
  "couvertureParcDomineeParFacadesVitrees", "parcContiguAImmeuble", "distanceParcAImmeubleHabite",
  "hauteurDernierPlancherDesserviParEscalier", "coursivesPasserellesOuCirculationsAAirLibre",
  "hauteurPlancherBasDernierNiveauParc",
  // Ce que les trois plans lisent en propre.
  "nombreEscaliersProteges", "distanceEntreEscaliers", "distanceDebouchEscalierSortie",
  "longueurDuBatiment", "hallDessertServicesCollectifs", "surfaceParc",
  "superficieCompartimentParc", "boxesDansLeParc", "emplacementsParBox",
  "distanceAParcourirVersIssueParc", "largesOuverturesDeuxFacesOpposees", "ventilationParcRetenue"
];

/**
 * Ce que les réponses disent du bâtiment, ramené à ce qui se dessine.
 *
 * Les valeurs absentes le restent : un bâtiment dont on ne sait pas encore s'il
 * a un sous-sol ne s'en voit pas attribuer un, et n'en voit pas non plus nier
 * l'existence. « Ne pas savoir n'autorise pas à prétendre qu'il n'y a rien. »
 */
export function lireLeBatiment(reponses = {}) {
  const etages = nombre(reponses.etagesSurRdc);
  const parc = booleen(reponses.parcDeStationnement);
  const enterresDeclares = nombre(reponses.niveauxEnSousSol);
  const parcDessous = parc === true ? borner(nombre(reponses.niveauxParcAuDessous), 0, 8) : null;

  return {
    collectif: booleen(reponses.logementsSuperposes),
    implantation: reponses.implantation ?? null,
    structuresIndependantes: booleen(reponses.structuresIndependantes),
    // Au-delà d'une douzaine d'étages le dessin cesse d'être lisible et cesse
    // de servir : on le plafonne, en le disant.
    etages: borner(etages, 0, 12),
    etagesReels: etages,
    duplex: booleen(reponses.duplexOuTriplexAuDernierEtage),
    // Un seul compte pour ce qui est enterré. Le sous-sol se cochait, le parc se
    // comptait : on obtenait un sous-sol posé sur un parc qui en était un.
    //
    // Et le compte ne peut pas être plus petit que celui du parc : deux niveaux
    // de parc enterrés font au moins deux niveaux enterrés, quoi qu'on ait
    // répondu à l'autre question.
    enterres: enterresDeclares === null && parcDessous === null ? null
      : borner(Math.max(enterresDeclares ?? 0, parcDessous ?? 0), 0, 8),
    enterresDeclares: borner(enterresDeclares, 0, 8),
    hauteur: nombre(reponses.hauteurPlancherBasNiveauLePlusHaut),
    hauteurLogement: nombre(reponses.hauteurPlancherBasLogementLePlusHautSiDuplex),
    hauteurEscalier: nombre(reponses.hauteurDernierPlancherDesserviParEscalier),
    hauteurParc: nombre(reponses.hauteurPlancherBasDernierNiveauParc),
    paroisJusquACouverture: booleen(reponses.paroisLogementProlongeesJusquACouverture),
    coursives: booleen(reponses.coursivesPasserellesOuCirculationsAAirLibre),
    celliers: booleen(reponses.celliersOuCavesRegroupes),
    ascenseur: booleen(reponses.ascenseur),
    ascenseurAuSousSol: booleen(reponses.ascenseurDessertSousSolParcOuCaves),
    gaz: booleen(reponses.conduiteMontanteDeGaz),
    gazParc: booleen(reponses.gazTraversantUnParcDeStationnement),
    electricite: booleen(reponses.colonneMontanteElectriqueEnGaine),
    videOrdures: booleen(reponses.videOrdures),
    parc,
    parcDessous,
    parcDessus: parc === true ? borner(nombre(reponses.niveauxParcAuDessus), 0, 12) : null,
    parcCommunication: booleen(reponses.communicationParcImmeuble),
    parcPlusieursIssues: booleen(reponses.plusieursIssuesAuChoix),
    parcCouvertureDominee: booleen(reponses.couvertureParcDomineeParFacadesVitrees),
    parcContigu: booleen(reponses.parcContiguAImmeuble),
    parcDistance: nombre(reponses.distanceParcAImmeubleHabite),
    voie: booleen(reponses.voieAccesDecrite),
    voieEchelles: booleen(reponses.accesEscaliersAtteintsParVoieEchelles),
    escalier: reponses.typeEscalierRetenu ?? null,
    circulation: reponses.typeCirculationRetenue ?? null,
    distancePortePaliere: nombre(reponses.distancePortePaliereEscalier),
    distanceBaies: nombre(reponses.distanceEscalierAuxBaies),
    distanceLimite: nombre(reponses.distanceLimiteDePropriete),
    // Ce que seuls les plans savent montrer.
    nombreEscaliers: nombre(reponses.nombreEscaliersProteges),
    distanceEntreEscaliers: nombre(reponses.distanceEntreEscaliers),
    distanceDebouche: nombre(reponses.distanceDebouchEscalierSortie),
    longueur: nombre(reponses.longueurDuBatiment),
    hallServices: booleen(reponses.hallDessertServicesCollectifs),
    surfaceParc: nombre(reponses.surfaceParc),
    superficieCompartiment: nombre(reponses.superficieCompartimentParc),
    boxes: booleen(reponses.boxesDansLeParc),
    emplacementsParBox: nombre(reponses.emplacementsParBox),
    distanceIssue: nombre(reponses.distanceAParcourirVersIssueParc),
    largesOuvertures: booleen(reponses.largesOuverturesDeuxFacesOpposees),
    ventilationParc: reponses.ventilationParcRetenue ?? null
  };
}

/**
 * Ce qu'on trouve à chaque niveau, du plus haut au plus bas.
 *
 * ## Le niveau que deux questions se disputent
 *
 * « Combien de niveaux au-dessous du niveau de référence ? » et « combien de
 * niveaux de parc au-dessous ? » ne comptent pas la même chose quand le terrain
 * est en pente : ce qui est enterré côté façade habitation débouche à
 * l'air libre côté parc. Répondre 1 à la première et 2 à la seconde n'est donc
 * pas une faute — c'est la pente.
 *
 * Le dessin ne peut pas trancher, et n'a pas à le faire : il **recoupe** le
 * niveau que les deux comptes revendiquent, moitié habitation, moitié parc, et
 * fait descendre le terrain de ce côté-là. On voit alors ce que chaque réponse
 * a voulu dire, et si l'une des deux est fausse elle se voit aussi.
 */
export function niveauxDuBatiment(batiment) {
  const niveaux = [];
  const hauts = (batiment.etages ?? 0) + 1;
  const parcDessus = Math.min(batiment.parcDessus ?? 0, hauts);
  for (let n = hauts - 1; n >= 0; n -= 1) {
    niveaux.push({
      nom: n === 0 ? "R" : String(n),
      rang: n,
      enterre: false,
      destination: n < parcDessus ? "parc" : "habitation",
      // Le plancher du duplex de dernier étage ne sépare rien : le 5°) de
      // l'article 3 ne compte que son niveau bas.
      dalleEffacee: batiment.duplex === true && n === hauts - 1 && hauts >= 2
    });
  }
  const enterres = batiment.enterres ?? 0;
  const parcDessous = Math.min(batiment.parcDessous ?? 0, enterres);
  const declares = batiment.enterresDeclares ?? 0;
  const enPente = terrainEnPente(batiment);
  for (let n = 1; n <= enterres; n += 1) {
    niveaux.push({
      nom: `−${n}`,
      rang: -n,
      enterre: true,
      destination: enPente && n <= declares ? "mixte"
        : n <= parcDessous ? "parc" : "sous-sol",
      dalleEffacee: false
    });
  }
  return niveaux;
}

/**
 * Le parc revendique-t-il plus de niveaux enterrés que l'habitation ?
 *
 * C'est la signature d'un terrain en pente, et la seule lecture qui rende les
 * deux réponses compatibles.
 */
export function terrainEnPente(batiment) {
  const declares = batiment.enterresDeclares;
  const parc = batiment.parcDessous;
  return declares !== null && parc !== null && parc > declares && declares > 0;
}

/**
 * La hauteur d'un niveau, déduite de la cote et du nombre de planchers.
 *
 * On la suppose constante — c'est faux d'un demi-mètre, et c'est sans
 * importance : ce qu'on veut lire, c'est si « 9 m sur R+3 » tient debout.
 * Trois mètres par niveau, oui ; six, il y a une réponse à revoir.
 */
export function hauteurDeNiveau(batiment) {
  const hauts = (batiment.etages ?? 0) + 1;
  if (batiment.hauteur === null || hauts < 2) return null;
  const h = batiment.hauteur / (hauts - 1);
  return h > 0 ? Math.round(h * 100) / 100 : null;
}

/* ------------------------------------------------------------------ *
 * La coupe
 * ------------------------------------------------------------------ */

const L = {
  niveau: 42,
  comble: 48,
  margeHaut: 22,
  margeBas: 46,
  cotes: 104,
  ecartParc: 48,
  volumeCollectif: 224,
  volumeIndividuel: 122,
  altitudes: 46,
  camion: 68,
  parcAnnexe: 92,
  ligneLegende: 15
};

/** Les parts d'un niveau d'habitation : deux logements, un couloir, deux gaines. */
const P = {
  logementA: [0.00, 0.30],
  couloir: [0.30, 0.68],
  escalier: [0.325, 0.445],
  ascenseur: [0.535, 0.655],
  logementB: [0.68, 1.00],
  videOrdures: 0.285,
  gaz: 0.715,
  electricite: 0.755
};

/** Combien de volumes côte à côte, selon l'implantation déclarée. */
function volumes(batiment) {
  if (batiment.collectif !== false) return 1;
  if (batiment.implantation === "jumelee") return 2;
  if (batiment.implantation === "bande") return 4;
  return 1;
}

/**
 * Le bâtiment en coupe.
 *
 * Rien n'est dessiné de ce qui n'a pas été répondu : un dessin qui inventerait
 * un sous-sol pour faire joli ferait répondre « oui » à quelqu'un qui n'a rien
 * dit.
 */
export function dessinerLaCoupe(reponses = {}, { classement = null } = {}) {
  const batiment = lireLeBatiment(reponses);
  if (batiment.etages === null && batiment.collectif === null) return { vide: true, svg: "", batiment };

  const niveaux = niveauxDuBatiment(batiment);
  const hauts = niveaux.filter((n) => !n.enterre).length;
  const bas = niveaux.length - hauts;
  const sol = L.margeHaut + L.comble + hauts * L.niveau;
  const fond = sol + bas * L.niveau;

  const combien = volumes(batiment);
  const w = combien === 1 ? L.volumeCollectif : L.volumeIndividuel;
  const x0 = L.cotes;
  const largeurBatie = combien * w;
  const avecAltitudes = hauteurDeNiveau(batiment) !== null;
  const avecCamion = batiment.voie !== null;
  const annexe = batiment.parcCouvertureDominee !== null || batiment.parcContigu !== null;
  // Le parc voisin se colle à la façade. Le laisser à distance en faisait un
  // autre parc, isolé par une aire libre — ce n'est pas de cela que parle
  // l'article 87. Il ne s'écarte que si l'on a répondu qu'il n'est pas contigu,
  // et l'écart porte alors la distance déclarée.
  const ecartAnnexe = batiment.parcContigu === false ? L.ecartParc : 0;
  const xAnnexe = x0 + largeurBatie + ecartAnnexe;
  const finBati = xAnnexe + (annexe ? L.parcAnnexe : 0);
  const xAltitudes = finBati + 8;
  const xCamion = xAltitudes + (avecAltitudes ? L.altitudes : 10);
  const largeur = xCamion + (avecCamion ? L.camion : 0) + 14;
  const lignes = lignesDeLegende(batiment, largeur);
  const hauteur = fond + L.margeBas + lignes * L.ligneLegende;

  const yDe = (rang) => (rang >= 0 ? sol - (rang + 1) * L.niveau : sol + (-rang - 1) * L.niveau);
  const cadre = { x0, w, combien, sol, fond, hauts, bas, yDe, largeur,
    xAltitudes, xCamion, xAnnexe, finBati, avecCamion, annexe };

  const t = [];
  t.push(terrain(batiment, cadre));
  for (let v = 0; v < combien; v += 1) {
    const x = x0 + v * w;
    t.push(volumeBati(batiment, niveaux, x, w, cadre, v === combien - 1));
    if (v > 0 && batiment.structuresIndependantes !== null) {
      t.push(`<line x1="${x}" y1="${sol}" x2="${x}" y2="${sol - hauts * L.niveau}"
        class="bat-joint${batiment.structuresIndependantes ? " est-independant" : ""}"/>`);
    }
  }
  if (annexe) t.push(parcAnnexe(batiment, cadre));
  if (avecCamion) t.push(camionPompier(batiment, cadre));
  t.push(altitudes(batiment, niveaux, cadre));
  t.push(cotes(batiment, cadre));
  t.push(legendeDesCouleurs(batiment, cadre));

  return {
    vide: false,
    batiment,
    svg: `<svg viewBox="0 0 ${largeur} ${hauteur}" role="img" xmlns="http://www.w3.org/2000/svg"
      aria-label="${escapeHtml(resumer(batiment, classement))}">
      ${t.filter(Boolean).join("\n      ")}
      ${classement ? `<text x="${largeur - 14}" y="20" class="bat-verdict">${escapeHtml(classement)}</text>` : ""}
    </svg>`
  };
}

/**
 * Le terrain : plat côté engins, en pente là où le parc débouche.
 *
 * Le camion se range du côté plat, au niveau de référence — c'est de là que la
 * hauteur se mesure, et le montrer évite de croire qu'elle se compte depuis le
 * point bas du terrain.
 */
function terrain(batiment, { x0, w, combien, sol, fond, largeur, finBati }) {
  const droite = finBati;
  const t = [];
  const enPente = terrainEnPente(batiment);
  const chute = enPente ? (batiment.enterresDeclares ?? 1) * L.niveau : 0;

  if (enPente) {
    // La pente descend côté façade habitation ; le niveau de référence reste
    // celui du côté plat, où les engins se rangent.
    t.push(`<path d="M 10 ${sol + chute} L ${x0 - 14} ${sol + chute} L ${x0 + 6} ${sol} L ${largeur - 12} ${sol}" class="bat-sol"/>`);
    t.push(`<text x="12" y="${sol + chute - 7}" class="bat-note">terrain en pente</text>`);
  } else {
    t.push(`<line x1="10" y1="${sol}" x2="${largeur - 12}" y2="${sol}" class="bat-sol"/>`);
  }

  if (batiment.voie === true) {
    t.push(`<rect x="${droite + 6}" y="${sol + 3}" width="${Math.max(10, largeur - droite - 20)}" height="8" class="bat-voie"/>`);
  }
  return t.join("\n      ");
}

/** Un volume : ses niveaux, ce qu'ils contiennent, et sa couverture. */
function volumeBati(batiment, niveaux, x, w, cadre, dernier) {
  const t = [];
  const detaille = batiment.collectif === true;

  for (const niveau of niveaux) {
    const y = cadre.yDe(niveau.rang);
    if (niveau.destination === "mixte") {
      // Le niveau que les deux comptes revendiquent : moitié enterrée côté
      // habitation, moitié à l'air libre côté parc.
      t.push(`<rect x="${x}" y="${y}" width="${w / 2}" height="${L.niveau}" class="bat-enterre"/>`);
      t.push(`<rect x="${x + w / 2}" y="${y}" width="${w / 2}" height="${L.niveau}" class="bat-parc"/>`);
      t.push(`<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + L.niveau}" class="bat-refend"/>`);
      t.push(`<text x="${x + w / 4}" y="${y + L.niveau - 10}" class="bat-parc-note est-sobre">habitation</text>`);
      t.push(`<text x="${x + 3 * w / 4}" y="${y + L.niveau - 10}" class="bat-parc-note">parc</text>`);
    } else {
      const classe = niveau.destination === "parc" ? "bat-parc"
        : niveau.enterre ? "bat-enterre" : "bat-volume";
      t.push(`<rect x="${x}" y="${y}" width="${w}" height="${L.niveau}" class="${classe}"/>`);
      if (niveau.destination === "parc") {
        t.push(`<text x="${x + w - 8}" y="${y + L.niveau - 10}" class="bat-parc-note est-fin">parc</text>`);
      }
    }
    t.push(`<text x="${x + 5}" y="${y + L.niveau - 10}" class="bat-etage">${escapeHtml(niveau.nom)}</text>`);

    if (niveau.dalleEffacee) {
      // Le duplex : le plancher du dernier niveau ne traverse pas — on le
      // dessine court, c'est plus parlant qu'un trait pointillé sur toute la
      // largeur.
      t.push(`<line x1="${x + w * 0.06}" y1="${y + L.niveau}" x2="${x + w * 0.48}" y2="${y + L.niveau}" class="bat-dalle est-partielle"/>`);
      t.push(`<text x="${x + w * 0.50}" y="${y + L.niveau + 10}" class="bat-note">duplex</text>`);
    }
    if (detaille && niveau.destination === "habitation") t.push(interieur(x, w, y));
  }

  if (detaille) t.push(noyau(batiment, niveaux, x, w, cadre));
  if (detaille) t.push(reseaux(batiment, niveaux, x, w, cadre));
  t.push(celliers(batiment, niveaux, x, w, cadre));
  t.push(dansLeParc(batiment, niveaux, x, w, cadre));
  t.push(couverture(batiment, x, w, cadre, dernier));
  if (batiment.coursives === true) {
    // Les coursives à l'air libre : elles longent la façade, et l'article 5 en
    // fait dépendre la stabilité de leurs porteurs.
    for (const niveau of niveaux.filter((n) => !n.enterre && n.rang > 0 && n.destination === "habitation")) {
      const y = cadre.yDe(niveau.rang);
      t.push(`<rect x="${x + w}" y="${y + 6}" width="12" height="4" class="bat-coursive"/>`);
    }
  }
  return t.join("\n      ");
}

/** Deux logements et le couloir qui les sépare : ce que le niveau contient. */
function interieur(x, w, y) {
  const bande = (part, classe) => `<rect x="${x + w * part[0]}" y="${y + 5}"
    width="${w * (part[1] - part[0])}" height="${L.niveau - 10}" class="${classe}"/>`;
  return [
    bande(P.logementA, "bat-logement"),
    bande(P.couloir, "bat-couloir"),
    bande(P.logementB, "bat-logement")
  ].join("\n      ");
}

/**
 * Le noyau : l'escalier et l'ascenseur, du haut en bas de ce qu'ils desservent.
 *
 * L'ascenseur descend dans le sous-sol quand il le dessert — c'est la question
 * de l'article 98, et la gaine qui traverse le parc n'est pas la même chose
 * qu'une gaine qui s'arrête au rez-de-chaussée.
 */
function noyau(batiment, niveaux, x, w, cadre) {
  const t = [];
  const hauts = cadre.hauts;
  const xE = [x + w * P.escalier[0], x + w * P.escalier[1]];
  const yHaut = cadre.yDe(hauts - 1) + 5;
  const yBas = cadre.sol - 5;

  if (batiment.escalier !== null) {
    t.push(`<rect x="${xE[0]}" y="${yHaut}" width="${xE[1] - xE[0]}" height="${yBas - yHaut}"
      class="bat-cage${batiment.escalier === "encloisonne" ? " est-encloisonnee"
        : batiment.escalier === "airLibre" || batiment.escalier === "exterieur" ? " est-ouverte" : ""}"/>`);
    // Les volées, une par niveau : c'est ce qui fait lire « escalier » plutôt
    // que « gaine ».
    for (let n = 0; n < hauts; n += 1) {
      const y = cadre.yDe(n);
      t.push(`<path d="M ${xE[0] + 2} ${y + L.niveau - 4} L ${xE[1] - 2} ${y + L.niveau / 2}
        L ${xE[0] + 2} ${y + L.niveau / 2} L ${xE[1] - 2} ${y + 4}" class="bat-volee"/>`);
    }
  }

  if (batiment.ascenseur === true) {
    const xA = [x + w * P.ascenseur[0], x + w * P.ascenseur[1]];
    const bas = batiment.ascenseurAuSousSol === true
      ? cadre.fond - 5
      : cadre.sol - 5;
    t.push(`<rect x="${xA[0]}" y="${yHaut - 8}" width="${xA[1] - xA[0]}" height="${bas - yHaut + 8}" class="bat-gaine-ascenseur"/>`);
    // Le câble et la cabine : deux traits, et l'on ne confond plus la gaine
    // d'ascenseur avec une gaine technique.
    const yCabine = cadre.yDe(Math.max(0, Math.floor((hauts - 1) / 2))) + 8;
    t.push(`<line x1="${(xA[0] + xA[1]) / 2}" y1="${yHaut - 8}" x2="${(xA[0] + xA[1]) / 2}" y2="${yCabine}" class="bat-cable"/>`);
    t.push(`<rect x="${xA[0] + 2}" y="${yCabine}" width="${xA[1] - xA[0] - 4}" height="${L.niveau - 20}" class="bat-cabine"/>`);
  }
  return t.join("\n      ");
}

/**
 * Les colonnes montantes : le gaz en jaune, l'électricité en rouge.
 *
 * Ce sont les couleurs des corps d'état, et elles évitent une légende à lire
 * deux fois. Le gaz qui traverse un parc de stationnement descend d'un
 * cinquième dans le premier niveau de parc puis ressort en terre, du côté des
 * engins : c'est le tracé que l'article 55 interdit sans précaution.
 */
function reseaux(batiment, niveaux, x, w, cadre) {
  const t = [];
  const hauts = cadre.hauts;
  const yHaut = cadre.yDe(hauts - 1) + 6;
  const xGaz = x + w * P.gaz;
  const xElec = x + w * P.electricite;

  if (batiment.gaz === true) {
    t.push(`<line x1="${xGaz}" y1="${yHaut}" x2="${xGaz}" y2="${cadre.sol - 4}" class="bat-gaz"/>`);
  }
  if (batiment.electricite === true) {
    t.push(`<line x1="${xElec}" y1="${yHaut}" x2="${xElec}" y2="${cadre.sol - 4}" class="bat-elec"/>`);
  }
  if (batiment.gaz === true && batiment.gazParc === true) {
    const premierParc = niveaux.find((n) => n.enterre && (n.destination === "parc" || n.destination === "mixte"));
    if (premierParc) {
      const yParc = cadre.yDe(premierParc.rang);
      const yCoude = yParc + L.niveau / 5;
      const bout = cadre.xCamion + (cadre.avecCamion ? L.camion / 2 : 20);
      t.push(`<path d="M ${xGaz} ${cadre.sol - 4} L ${xGaz} ${yCoude} L ${bout} ${yCoude}" class="bat-gaz est-en-terre"/>`);
    }
  }
  if (batiment.videOrdures === true) {
    const xV = x + w * P.videOrdures;
    const basNiveau = niveaux[niveaux.length - 1];
    t.push(`<line x1="${xV}" y1="${yHaut}" x2="${xV}" y2="${cadre.yDe(basNiveau.rang) + L.niveau - 12}" class="bat-vide-ordures"/>`);
    t.push(`<rect x="${xV - 9}" y="${cadre.yDe(basNiveau.rang) + L.niveau - 14}" width="18" height="10" class="bat-local-ordures"/>`);
  }
  return t.join("\n      ");
}

/**
 * Les celliers ou caves regroupés, en bloc distinct.
 *
 * L'arrêté ne demande pas *où* ils sont : l'article 8 les vise partout. On les
 * pose donc au plus bas des niveaux décrits — c'est le cas courant — et l'on
 * écrit lequel, pour que personne ne prête au dessin une réponse qu'on n'a pas
 * donnée.
 */
function celliers(batiment, niveaux, x, w, cadre) {
  if (batiment.celliers !== true) return "";
  const accueil = niveaux.find((n) => n.enterre && n.destination === "sous-sol")
    ?? niveaux.find((n) => n.enterre && n.destination === "mixte")
    ?? niveaux.find((n) => n.rang === 0);
  if (!accueil) return "";
  const y = cadre.yDe(accueil.rang);
  const largeur = w * 0.24;
  // Sur un niveau recoupé, les celliers vont du côté habitation : les poser
  // dans la moitié parc leur ferait dire le contraire de ce qu'ils sont.
  const xC = accueil.destination === "mixte" ? x + 6 : x + w - largeur - 6;
  return `<rect x="${xC}" y="${y + 6}" width="${largeur}" height="${L.niveau - 12}" class="bat-celliers"/>
      <text x="${xC + largeur / 2}" y="${y + L.niveau / 2 + 3}" class="bat-celliers-note">celliers</text>`;
}

/**
 * Ce qui se passe dans les niveaux de parc : le sas, l'escalier, les issues.
 *
 * Une communication entre le parc et le bâtiment n'est jamais une porte seule —
 * l'article 89 exige un sas —, et « plusieurs issues au choix » veut dire au
 * moins deux : les dessiner toutes les deux est la seule façon de relire
 * la réponse.
 */
function dansLeParc(batiment, niveaux, x, w, cadre) {
  const duParc = niveaux.filter((n) => n.destination === "parc" || n.destination === "mixte");
  if (!duParc.length) return "";
  const t = [];
  const combien = batiment.parcPlusieursIssues === true ? 2
    : batiment.parcCommunication === true || batiment.parcPlusieursIssues === false ? 1 : 0;
  if (combien === 0) return "";

  for (let i = 0; i < combien; i += 1) {
    const xS = x + w * (i === 0 ? 0.10 : 0.60);
    for (const niveau of duParc) {
      const y = cadre.yDe(niveau.rang);
      t.push(`<rect x="${xS}" y="${y + 6}" width="${w * 0.11}" height="${L.niveau - 12}" class="bat-sas"/>`);
      t.push(`<path d="M ${xS + 2} ${y + L.niveau - 8} L ${xS + w * 0.11 - 2} ${y + 8}" class="bat-volee est-parc"/>`);
    }
    const dernier = duParc[duParc.length - 1];
    t.push(`<text x="${xS + w * 0.055}" y="${cadre.yDe(dernier.rang) + L.niveau + 10}" class="bat-sas-note">sas</text>`);
  }
  return t.join("\n      ");
}

/**
 * Le parc en bloc voisin, quand sa couverture est dominée par les façades.
 *
 * L'article 87 vise la couverture d'un parc que les façades du bâtiment
 * surplombent : tant qu'on ne voit pas ce débord, on ne voit pas de quoi il
 * parle. Le bloc reprend le compte de niveaux du parc, au-dessus et au-dessous.
 */
function parcAnnexe(batiment, cadre) {
  const dessus = batiment.parcDessus ?? 1;
  const dessous = batiment.parcDessous ?? 0;
  const x = cadre.xAnnexe;
  const w = L.parcAnnexe;
  const t = [];
  for (let n = 0; n < Math.max(1, dessus); n += 1) {
    t.push(`<rect x="${x}" y="${cadre.sol - (n + 1) * L.niveau}" width="${w}" height="${L.niveau}" class="bat-parc"/>`);
  }
  for (let n = 0; n < dessous; n += 1) {
    t.push(`<rect x="${x}" y="${cadre.sol + n * L.niveau}" width="${w}" height="${L.niveau}" class="bat-parc"/>`);
  }
  const faite = cadre.sol - Math.max(1, dessus) * L.niveau;
  t.push(`<line x1="${x - 4}" y1="${faite}" x2="${x + w + 4}" y2="${faite}" class="bat-couverture-parc"/>`);
  t.push(`<text x="${x + w / 2}" y="${faite - 6}" class="bat-parc-note">couverture</text>`);
  if (batiment.parcCouvertureDominee === true) {
    // Le surplomb : la façade du bâtiment monte au-dessus de la couverture, et
    // c'est ce que l'article 87 regarde. Le trait le suit le long du mur commun,
    // du faîtage jusqu'à la couverture qu'il domine.
    const mur = cadre.x0 + cadre.combien * cadre.w;
    const faiteBati = cadre.sol - cadre.hauts * L.niveau;
    t.push(`<path d="M ${mur} ${faiteBati} L ${mur} ${faite}" class="bat-domination"/>`);
    t.push(`<text x="${x + w / 2}" y="${faite + 14}" class="bat-parc-note">surplombée</text>`);
  }
  if (batiment.parcContigu === false) {
    const y = cadre.sol - L.niveau / 2;
    const xA = cadre.x0 + cadre.combien * cadre.w;
    t.push(`<line x1="${xA}" y1="${y}" x2="${x}" y2="${y}" class="bat-cote"/>
      <text x="${(xA + x) / 2}" y="${y - 6}" class="bat-cote-texte est-centre">${
        batiment.parcDistance !== null ? `${escapeHtml(virgule(batiment.parcDistance))} m` : "non contigu"}</text>`);
  }
  return t.join("\n      ");
}

/** Le comble, à deux versants, et les parois qui le traversent ou s'arrêtent. */
function couverture(batiment, x, w, cadre, dernier) {
  const faite = cadre.sol - cadre.hauts * L.niveau;
  const sommet = faite - L.comble + 10;
  const t = [];
  // Deux versants pour tout le monde : le recoupement des combles — article 8,
  // dernier alinéa — ne se lit pas sous un toit-terrasse.
  t.push(`<path d="M ${x - 7} ${faite} L ${x + w / 2} ${sommet} L ${x + w + 7} ${faite} Z" class="bat-toit"/>`);
  if (dernier) t.push(`<text x="${x + w + 11}" y="${faite - 8}" class="bat-note">comble</text>`);

  // La question qui ne se dessine pas toute seule : les parois verticales de
  // l'enveloppe du logement montent-elles jusqu'à la couverture, ou s'arrêtent
  // -elles au dernier plancher ? L'article 6 en fait dépendre une exception.
  // Elles traversent **tous** les niveaux habités : les arrêter au dernier
  // laissait croire qu'elles ne séparaient qu'un étage.
  if (batiment.paroisJusquACouverture !== null) {
    const milieu = x + w / 2;
    const haut = batiment.paroisJusquACouverture ? sommet : faite;
    t.push(`<line x1="${milieu}" y1="${cadre.sol}" x2="${milieu}" y2="${haut}"
      class="bat-paroi${batiment.paroisJusquACouverture ? " est-prolongee" : ""}"/>`);
    if (dernier) t.push(`<text x="${milieu + 6}" y="${faite - 14}" class="bat-note">parois</text>`);
  }
  return t.join("\n      ");
}

/**
 * L'altitude de chaque plancher, quand la hauteur et le nombre de niveaux la
 * donnent.
 *
 * « 9 m sur R+3 » fait trois mètres par niveau ; « 9 m sur R+1 » en fait quatre
 * et demi, et l'une des deux réponses est à revoir. Le calcul n'affirme rien —
 * il suppose des niveaux d'égale hauteur, et le dit.
 */
function altitudes(batiment, niveaux, cadre) {
  const pas = hauteurDeNiveau(batiment);
  if (pas === null) return "";
  const t = [];
  for (const niveau of niveaux) {
    const y = cadre.yDe(niveau.rang) + L.niveau - 12;
    const valeur = Math.round(niveau.rang * pas * 100) / 100;
    const signe = valeur > 0 ? "+" : valeur < 0 ? "−" : "±";
    t.push(`<text x="${cadre.xAltitudes}" y="${y}" class="bat-altitude">${signe}${escapeHtml(virgule(Math.abs(valeur)))} m</text>`);
  }
  return t.join("\n      ");
}

/**
 * Les cotes, toutes prises du même niveau de référence.
 *
 * Deux réponses qui valent le même nombre doivent pointer le même plancher :
 * deux « 9 m » tracés à deux hauteurs différentes font douter du dessin entier,
 * alors qu'ils disent la même chose. Le rang se déduit donc de la valeur quand
 * la hauteur d'un niveau est connue, et les cotes qui tombent au même endroit
 * se réunissent en une seule.
 */
function cotes(batiment, cadre) {
  const pas = hauteurDeNiveau(batiment);
  const rangSelon = (valeur, defaut) => {
    if (valeur === null) return null;
    if (pas === null) return defaut;
    return Math.max(0, Math.min(cadre.hauts - 1, Math.round(valeur / pas)));
  };

  // Des étiquettes courtes : la phrase sous le dessin porte les libellés en
  // entier, et un texte de quarante caractères sortait du cadre par la gauche.
  const demandees = [
    { valeur: batiment.hauteur, libelle: "niveau", rang: rangSelon(batiment.hauteur, cadre.hauts - 1) },
    batiment.duplex === true
      ? { valeur: batiment.hauteurLogement, libelle: "logement", rang: rangSelon(batiment.hauteurLogement, Math.max(0, cadre.hauts - 2)) }
      : null,
    { valeur: batiment.hauteurEscalier, libelle: "escalier", rang: rangSelon(batiment.hauteurEscalier, cadre.hauts - 1) }
  ].filter((c) => c && c.valeur !== null);
  if (!demandees.length) return "";

  // Ce qui vaut pareil se trace pareil : on réunit, et l'on nomme les deux.
  const parValeur = new Map();
  for (const cote of demandees) {
    const clef = `${cote.valeur}|${cote.rang}`;
    if (parValeur.has(clef)) parValeur.get(clef).libelles.push(cote.libelle);
    else parValeur.set(clef, { valeur: cote.valeur, rang: cote.rang, libelles: [cote.libelle] });
  }

  const groupes = [...parValeur.values()].sort((a, b) => a.valeur - b.valeur);
  const t = [];
  groupes.forEach((groupe, i) => {
    const haut = cadre.sol - groupe.rang * L.niveau;
    const xC = cadre.x0 - 18 - i * 34;
    t.push(`<line x1="${xC}" y1="${cadre.sol}" x2="${xC}" y2="${haut}" class="bat-cote"/>
      <line x1="${xC}" y1="${haut}" x2="${cadre.x0}" y2="${haut}" class="bat-cote est-rappel"/>
      <path d="M ${xC - 4} ${haut + 6} L ${xC} ${haut} L ${xC + 4} ${haut + 6}" class="bat-cote-fleche"/>
      <path d="M ${xC - 4} ${cadre.sol - 6} L ${xC} ${cadre.sol} L ${xC + 4} ${cadre.sol - 6}" class="bat-cote-fleche"/>
      <text x="${xC - 5}" y="${(cadre.sol + haut) / 2}" class="bat-cote-texte">${escapeHtml(virgule(groupe.valeur))} m</text>
      ${groupe.libelles.map((libelle, rang) => `<text x="${xC - 5}" y="${(cadre.sol + haut) / 2 + 11 + rang * 10}"
        class="bat-cote-quoi">${escapeHtml(libelle)}</text>`).join("")}`);
  });
  return t.join("\n      ");
}

/** Le camion des secours, au niveau de référence, du côté plat. */
function camionPompier(batiment, cadre) {
  if (batiment.voie === null) return "";
  const w = L.camion - 8;
  const x = cadre.xCamion;
  const y = cadre.sol - 30;
  return `<g class="bat-camion">
      <rect x="${x}" y="${y + 6}" width="${w * 0.62}" height="18" class="bat-camion-caisse"/>
      <path d="M ${x + w * 0.62} ${y + 6} L ${x + w * 0.86} ${y + 6} L ${x + w} ${y + 14} L ${x + w} ${y + 24} L ${x + w * 0.62} ${y + 24} Z" class="bat-camion-cabine"/>
      <line x1="${x + 5}" y1="${y + 3}" x2="${x + w * 0.58}" y2="${y + 3}" class="bat-camion-echelle"/>
      <circle cx="${x + w * 0.22}" cy="${cadre.sol - 4}" r="4" class="bat-camion-roue"/>
      <circle cx="${x + w * 0.78}" cy="${cadre.sol - 4}" r="4" class="bat-camion-roue"/>
      <text x="${x + w / 2}" y="${y - 4}" class="bat-parc-note">${
        batiment.voie ? "voie d'accès" : "aucune voie"}</text>
    </g>`;
}

/**
 * La légende du bas : ce que les couleurs veulent dire, et ce qui se déduit.
 *
 * Une couleur sans légende se devine, et l'on devine mal — le jaune du gaz et
 * le rouge de l'électricité sont des conventions de corps d'état, pas des
 * évidences. On y range aussi ce qui n'a pas de place dans le dessin sans y
 * heurter un autre mot : la hauteur d'un niveau, la voie, les coursives.
 */
function entreesDeLegende(batiment) {
  const entrees = [];
  if (batiment.gaz === true) entrees.push(["bat-legende-gaz", "gaz"]);
  if (batiment.electricite === true) entrees.push(["bat-legende-elec", "électricité"]);
  if (batiment.videOrdures === true) entrees.push(["bat-legende-ordures", "vide-ordures"]);
  if (batiment.celliers === true) entrees.push(["bat-legende-celliers", "celliers ou caves"]);
  if (batiment.ascenseur === true) entrees.push(["bat-legende-ascenseur", "ascenseur"]);
  if (batiment.coursives === true) entrees.push(["bat-legende-coursives", "coursives à l'air libre"]);
  const pas = hauteurDeNiveau(batiment);
  if (pas !== null) entrees.push([null, `${virgule(pas)} m par niveau`]);
  if (batiment.voie === false) entrees.push([null, "aucune voie décrite"]);
  if (batiment.etagesReels !== null && batiment.etagesReels !== batiment.etages) {
    entrees.push([null, "dessin plafonné à 12 étages"]);
  }
  return entrees;
}

/** Où chaque entrée se pose. Le calcul sert deux fois : à mesurer, puis à écrire. */
function rangerLaLegende(batiment, largeur) {
  const posees = [];
  let x = 12;
  let ligne = 0;
  for (const [classe, libelle] of entreesDeLegende(batiment)) {
    // Une largeur approchée suffit : le texte est en 10,5 px, et l'on préfère
    // une ligne de plus à deux mots l'un sur l'autre.
    const large = (classe ? 22 : 0) + libelle.length * 6.4 + 16;
    if (x > 12 && x + large > largeur - 12) { x = 12; ligne += 1; }
    posees.push({ classe, libelle, x, ligne });
    x += large;
  }
  return posees;
}

function lignesDeLegende(batiment, largeur) {
  const posees = rangerLaLegende(batiment, largeur);
  return posees.length ? posees[posees.length - 1].ligne + 1 : 0;
}

function legendeDesCouleurs(batiment, cadre) {
  const posees = rangerLaLegende(batiment, cadre.largeur);
  if (!posees.length) return "";
  const y0 = cadre.fond + 24;
  return posees.map(({ classe, libelle, x, ligne }) => {
    const y = y0 + ligne * L.ligneLegende;
    return (classe ? `<rect x="${x}" y="${y - 8}" width="14" height="4" class="${classe}"/>` : "")
      + `<text x="${x + (classe ? 20 : 0)}" y="${y - 3}" class="bat-note">${escapeHtml(libelle)}</text>`;
  }).join("\n      ");
}

/* ------------------------------------------------------------------ *
 * Le plan — trois niveaux, trois choses à lire
 * ------------------------------------------------------------------ */

/**
 * ## Pourquoi trois plans et non un seul
 *
 * Un niveau courant, un rez-de-chaussée et un sous-sol ne posent pas les mêmes
 * questions, et un plan unique les mélangeait : la distance de la porte palière
 * la plus éloignée n'existe qu'en étage, la voie-engins et la limite de
 * propriété ne se mesurent qu'au rez-de-chaussée, les compartiments et les
 * issues du parc n'existent qu'au sous-sol. Superposer les trois donnait un
 * dessin qu'aucun étage réel ne ressemble.
 *
 * Chacun ne se propose que s'il a quelque chose à montrer : un bâtiment sans
 * sous-sol n'a pas d'onglet sous-sol.
 */

const PL = {
  largeur: 620,
  gauche: 60,
  droite: 60,
  haut: 58,
  bas: 74,
  profondeur: 172,
  cage: 52,
  couloir: 30
};

/** Le cadre commun aux trois plans : l'enveloppe, et où tombe le noyau. */
function cadrePlan() {
  const x0 = PL.gauche;
  const y0 = PL.haut;
  const w = PL.largeur - PL.gauche - PL.droite;
  const h = PL.profondeur;
  return {
    x0, y0, w, h,
    hauteur: y0 + h + PL.bas,
    cage: { x: x0 + 26, y: y0 + h / 2 - PL.cage / 2, c: PL.cage },
    couloir: { y: y0 + h / 2 - PL.couloir / 2, h: PL.couloir }
  };
}

/** Une cote horizontale, flèches aux deux bouts, texte au-dessus. */
function coteH(x1, x2, y, texte) {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="bat-cote"/>
      <path d="M ${x1 + 6} ${y - 4} L ${x1} ${y} L ${x1 + 6} ${y + 4}" class="bat-cote-fleche"/>
      <path d="M ${x2 - 6} ${y - 4} L ${x2} ${y} L ${x2 - 6} ${y + 4}" class="bat-cote-fleche"/>
      <text x="${(x1 + x2) / 2}" y="${y - 6}" class="plan-cote-texte">${escapeHtml(texte)}</text>`;
}

/** Une cote verticale. Le texte se pose à droite du trait, à mi-hauteur. */
function coteV(y1, y2, x, texte) {
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="bat-cote"/>
      <path d="M ${x - 4} ${y1 + 6} L ${x} ${y1} L ${x + 4} ${y1 + 6}" class="bat-cote-fleche"/>
      <path d="M ${x - 4} ${y2 - 6} L ${x} ${y2} L ${x + 4} ${y2 - 6}" class="bat-cote-fleche"/>
      <text x="${x + 6}" y="${(y1 + y2) / 2}" class="plan-cote-texte est-gauche">${escapeHtml(texte)}</text>`;
}

/** L'escalier vu de dessus : sa cage, ses marches, et ce qu'il est. */
function cagePlan(batiment, { x, y, c }, etiquette = true) {
  const t = [`<rect x="${x}" y="${y}" width="${c}" height="${c}"
    class="plan-cage${batiment.escalier === "encloisonne" ? " est-encloisonnee"
      : batiment.escalier === "exterieur" ? " est-exterieure" : ""}"/>`];
  for (let i = 1; i < 5; i += 1) {
    t.push(`<line x1="${x}" y1="${y + i * c / 5}" x2="${x + c}" y2="${y + i * c / 5}" class="plan-marche"/>`);
  }
  if (etiquette) {
    t.push(`<text x="${x + c / 2}" y="${etiquette === true ? y + c + 14 : etiquette}" class="plan-etiquette">${
      escapeHtml(nommerEscalier(batiment.escalier))}</text>`);
  }
  return t.join("\n      ");
}

/** L'ascenseur, contre la cage. Sa gaine se lit en plan comme en coupe. */
function ascenseurPlan(batiment, cage) {
  if (batiment.ascenseur !== true) return "";
  return `<rect x="${cage.x}" y="${cage.y - 32}" width="${cage.c}" height="26" class="plan-ascenseur"/>
      <text x="${cage.x + cage.c / 2}" y="${cage.y - 15}" class="plan-etiquette est-sobre">asc.</text>`;
}

/** Les gaines techniques, aux couleurs des corps d'état. */
function gainesPlan(batiment, x, y) {
  const t = [];
  let decale = 0;
  const poser = (classe, titre) => {
    t.push(`<rect x="${x + decale}" y="${y}" width="11" height="11" class="${classe}"/>`);
    t.push(`<title>${escapeHtml(titre)}</title>`);
    decale += 15;
  };
  if (batiment.gaz === true) poser("plan-gaine-gaz", "colonne montante de gaz");
  if (batiment.electricite === true) poser("plan-gaine-elec", "colonne montante électrique");
  if (batiment.videOrdures === true) poser("plan-gaine-ordures", "vide-ordures");
  return t.join("\n      ");
}

/** L'enveloppe du niveau, et ce qu'il faut savoir écrire dessus. */
function enveloppePlan(cadre, titre) {
  return `<rect x="${cadre.x0}" y="${cadre.y0}" width="${cadre.w}" height="${cadre.h}" class="plan-enveloppe"/>
      <text x="${cadre.x0}" y="${cadre.y0 - 32}" class="plan-titre">${escapeHtml(titre)}</text>`;
}

/**
 * Le niveau courant : les logements, la circulation, et ce qui s'y mesure.
 *
 * La distance de la porte palière la plus éloignée à l'escalier sépare la
 * troisième famille A de la troisième famille B ; l'éloignement de l'escalier
 * aux baies décide de l'article 19. Ni l'une ni l'autre ne se voit en coupe.
 */
function planEtage(batiment) {
  const utiles = [batiment.escalier, batiment.circulation, batiment.distancePortePaliere,
    batiment.distanceBaies, batiment.coursives, batiment.ascenseur, batiment.nombreEscaliers];
  if (!utiles.some((v) => v !== null && v !== undefined)) return null;

  const c = cadrePlan();
  const t = [enveloppePlan(c, "Niveau courant")];

  // La circulation traverse le niveau, du noyau jusqu'au bout.
  t.push(`<rect x="${c.cage.x + c.cage.c}" y="${c.couloir.y}" width="${c.w - c.cage.c - 26}" height="${c.couloir.h}"
    class="plan-circulation${batiment.circulation === "abriFumees" ? " est-protegee"
      : batiment.circulation === "airLibre" ? " est-air-libre" : ""}"/>`);
  t.push(`<text x="${c.cage.x + c.cage.c + 8}" y="${c.couloir.y - 6}" class="plan-note">${escapeHtml(nommerCirculation(batiment.circulation))}</text>`);

  t.push(cagePlan(batiment, c.cage));
  t.push(ascenseurPlan(batiment, c.cage));
  t.push(gainesPlan(batiment, c.cage.x + c.cage.c + 8, c.couloir.y + 9));

  // Les logements de part et d'autre, et la porte palière la plus éloignée —
  // celle qui décide, en troisième famille, du A ou du B.
  for (let i = 0; i < 4; i += 1) {
    const x = c.cage.x + c.cage.c + 40 + i * 76;
    const derniere = i === 3;
    for (const cote of [-1, 1]) {
      const y = cote < 0 ? c.couloir.y - 46 : c.couloir.y + c.couloir.h;
      const yPorte = cote < 0 ? c.couloir.y : c.couloir.y + c.couloir.h;
      t.push(`<rect x="${x}" y="${y}" width="60" height="46" class="plan-logement${derniere && cote > 0 ? " est-la-plus-eloignee" : ""}"/>`);
      t.push(`<line x1="${x + 20}" y1="${yPorte}" x2="${x + 40}" y2="${yPorte}" class="plan-porte"/>`);
    }
  }

  // Les coursives à l'air libre longent la façade : elles ne desservent pas
  // comme un couloir, et l'article 5 en fait dépendre leurs porteurs.
  if (batiment.coursives === true) {
    t.push(`<rect x="${c.x0}" y="${c.y0 - 12}" width="${c.w}" height="10" class="plan-coursive"/>`);
    t.push(`<text x="${c.x0 + c.w}" y="${c.y0 - 16}" class="plan-note est-droite">coursives à l'air libre</text>`);
  }

  // Le second escalier, quand il y en a deux, et ce qui les sépare.
  const deuxieme = batiment.nombreEscaliers !== null && batiment.nombreEscaliers >= 2;
  if (deuxieme) {
    const cage2 = { x: c.x0 + c.w - 26 - c.cage.c, y: c.cage.y, c: c.cage.c };
    t.push(cagePlan(batiment, cage2, false));
    if (batiment.distanceEntreEscaliers !== null) {
      t.push(coteH(c.cage.x + c.cage.c / 2, cage2.x + cage2.c / 2, c.y0 - 20,
        `${virgule(batiment.distanceEntreEscaliers)} m entre escaliers`));
    }
  }

  if (batiment.distancePortePaliere !== null) {
    const xFin = c.cage.x + c.cage.c + 40 + 3 * 76 + 46;
    t.push(coteH(c.cage.x + c.cage.c / 2, xFin, c.y0 + c.h + 22,
      `${virgule(batiment.distancePortePaliere)} m — porte palière la plus éloignée`));
  }
  if (batiment.distanceBaies !== null) {
    t.push(coteV(c.cage.y + c.cage.c, c.y0 + c.h, c.cage.x + c.cage.c / 2,
      `${virgule(batiment.distanceBaies)} m aux baies`));
  }

  return { titre: "Niveau courant", svg: t.filter(Boolean).join("\n      "), hauteur: c.hauteur };
}

/**
 * Le rez-de-chaussée : ce qui se mesure depuis l'extérieur.
 *
 * La voie et son accès, le débouché de l'escalier vers la sortie, la limite de
 * propriété, la longueur du bâtiment, et les volumes voisins quand l'habitation
 * est jumelée ou groupée en bande. Rien de tout cela n'a de sens en étage.
 */
function planRdc(batiment) {
  const utiles = [batiment.voie, batiment.voieEchelles, batiment.distanceDebouche,
    batiment.distanceLimite, batiment.longueur, batiment.implantation, batiment.hallServices];
  if (!utiles.some((v) => v !== null && v !== undefined)) return null;

  const c = cadrePlan();
  const t = [enveloppePlan(c, "Rez-de-chaussée")];

  // Le hall, contre le noyau, et sa porte sur l'extérieur.
  const hall = { x: c.cage.x + c.cage.c, y: c.couloir.y - 14, w: 118, h: c.couloir.h + 28 };
  t.push(`<rect x="${hall.x}" y="${hall.y}" width="${hall.w}" height="${hall.h}" class="plan-hall"/>`);
  t.push(`<text x="${hall.x + hall.w / 2}" y="${hall.y + hall.h / 2 + 4}" class="plan-etiquette est-sobre">hall${
    batiment.hallServices === true ? " + services" : ""}</text>`);
  const sortie = { x: hall.x + hall.w / 2, y: c.y0 + c.h };
  t.push(`<line x1="${sortie.x - 16}" y1="${sortie.y}" x2="${sortie.x + 16}" y2="${sortie.y}" class="plan-sortie"/>`);
  t.push(`<path d="M ${hall.x + hall.w / 2} ${hall.y + hall.h} L ${sortie.x} ${sortie.y}" class="plan-parcours"/>`);

  t.push(cagePlan(batiment, c.cage));
  t.push(ascenseurPlan(batiment, c.cage));

  // Les logements du rez-de-chaussée, au-delà du hall.
  for (let i = 0; i < 3; i += 1) {
    const x = hall.x + hall.w + 14 + i * 76;
    if (x + 60 > c.x0 + c.w - 8) break;
    for (const cote of [-1, 1]) {
      const y = cote < 0 ? c.couloir.y - 46 : c.couloir.y + c.couloir.h;
      t.push(`<rect x="${x}" y="${y}" width="60" height="46" class="plan-logement"/>`);
    }
  }

  // La voie, le long de la façade, et ce qu'elle atteint.
  if (batiment.voie !== null) {
    const y = c.y0 + c.h + 30;
    t.push(`<rect x="${c.x0 - 14}" y="${y}" width="${c.w + 28}" height="14" class="bat-voie"/>`);
    t.push(`<text x="${c.x0 - 14}" y="${y + 26}" class="plan-note">${
      batiment.voieEchelles === true ? "voie-échelles — accès aux escaliers atteints"
        : batiment.voie ? "voie d'accès déclarée" : "aucune voie décrite"}</text>`);
    if (batiment.distanceDebouche !== null) {
      t.push(coteV(sortie.y, y, sortie.x, `${virgule(batiment.distanceDebouche)} m au débouché`));
    }
  }

  // La limite de propriété : c'est d'elle que se mesure l'isolement.
  if (batiment.distanceLimite !== null) {
    const y = c.y0 - 30;
    t.push(`<line x1="${c.x0 - 20}" y1="${y}" x2="${c.x0 + c.w + 20}" y2="${y}" class="plan-limite"/>`);
    t.push(`<text x="${c.x0 + c.w + 20}" y="${y - 5}" class="plan-note est-droite">limite de propriété</text>`);
    t.push(coteV(y, c.y0, c.x0 + 14, `${virgule(batiment.distanceLimite)} m`));
  }

  // La longueur : au-delà de 45 m, l'article 8 exige un recoupement vertical.
  if (batiment.longueur !== null) {
    t.push(coteH(c.x0, c.x0 + c.w, c.y0 + c.h + 76, `${virgule(batiment.longueur)} m de longueur`));
  }

  // Les volumes voisins : une maison jumelée ou en bande n'est pas seule, et
  // c'est le joint qui décide de la première ou de la deuxième famille.
  if (batiment.collectif === false && batiment.implantation && batiment.implantation !== "isolee") {
    // Une maison en bande a une voisine de chaque côté, une jumelée une seule.
    // C'est le joint mitoyen qui décide de la première ou de la deuxième
    // famille, et il ne se voit pas autrement.
    const cotes = batiment.implantation === "bande" ? [-1, 1] : [1];
    for (const cote of cotes) {
      const x = cote < 0 ? c.x0 - 46 : c.x0 + c.w + 6;
      t.push(`<rect x="${x}" y="${c.y0}" width="40" height="${c.h}" class="plan-voisin"/>`);
      const mitoyen = cote < 0 ? c.x0 : c.x0 + c.w;
      t.push(`<line x1="${mitoyen}" y1="${c.y0}" x2="${mitoyen}" y2="${c.y0 + c.h}"
        class="bat-joint${batiment.structuresIndependantes ? " est-independant" : ""}"/>`);
    }
  }

  return { titre: "Rez-de-chaussée", svg: t.filter(Boolean).join("\n      "), hauteur: c.hauteur + 40 };
}

/**
 * Le sous-sol : le parc, ses compartiments et ses issues.
 *
 * La superficie d'un compartiment et la distance à parcourir vers une issue
 * décident du titre VI, et rien de tout cela ne se voit en coupe : un parc s'y
 * réduit à une bande. À plat, on compte les compartiments et l'on suit le
 * chemin qu'il faut faire pour sortir.
 */
function planSousSol(batiment) {
  const auSousSol = (batiment.enterres ?? 0) > 0;
  const utiles = [batiment.superficieCompartiment, batiment.boxes, batiment.distanceIssue,
    batiment.parcPlusieursIssues, batiment.largesOuvertures, batiment.ventilationParc];
  if (!auSousSol || !utiles.some((v) => v !== null && v !== undefined)) return null;

  const c = cadrePlan();
  const t = [];
  // Le fond d'abord, l'enveloppe ensuite : un aplat posé après le trait
  // recouvrait le mur, et le parc n'avait plus de contour.
  t.push(`<rect x="${c.x0}" y="${c.y0}" width="${c.w}" height="${c.h}" class="plan-parc"/>`);

  // Les issues d'abord, parce qu'elles réservent leur place : une, ou deux
  // quand elles sont au choix. Chacune est un sas et un escalier — l'article 89
  // n'admet pas la porte seule.
  const deuxIssues = batiment.parcPlusieursIssues === true;
  const issue = { w: 92, h: 50 };
  const issues = [];
  const poser = (x) => {
    const y = c.couloir.y - 10;
    t.push(`<rect x="${x}" y="${y}" width="${issue.w}" height="${issue.h}" class="plan-sas"/>`);
    t.push(cagePlan(batiment, { x: x + 46, y: y + 4, c: 42 }, false));
    t.push(`<text x="${x + 23}" y="${y + 30}" class="plan-etiquette est-sobre">sas</text>`);
    issues.push(x + issue.w);
  };
  poser(c.x0 + 8);
  if (deuxIssues) poser(c.x0 + c.w - 8 - issue.w);

  // L'allée et ses emplacements : sans eux, le sous-sol n'est qu'un rectangle
  // brun, et l'on ne voit pas qu'il s'agit d'un parc.
  const zone = { x: c.x0 + 8 + issue.w + 10, fin: c.x0 + c.w - 10 - (deuxIssues ? issue.w + 8 : 0) };
  const large = zone.fin - zone.x;
  if (large > 60) {
    t.push(`<rect x="${zone.x}" y="${c.couloir.y}" width="${large}" height="${c.couloir.h}" class="plan-allee"/>`);
    const combien = Math.max(2, Math.min(10, Math.floor(large / 34)));
    const pas = large / combien;
    for (let i = 0; i < combien; i += 1) {
      const x = zone.x + i * pas;
      t.push(`<rect x="${x + 2}" y="${c.y0 + 10}" width="${pas - 4}" height="${c.couloir.y - c.y0 - 12}"
        class="plan-emplacement${batiment.boxes === true ? " est-box" : ""}"/>`);
      t.push(`<rect x="${x + 2}" y="${c.couloir.y + c.couloir.h + 2}" width="${pas - 4}"
        height="${c.y0 + c.h - c.couloir.y - c.couloir.h - 12}"
        class="plan-emplacement${batiment.boxes === true ? " est-box" : ""}"/>`);
    }
    if (batiment.boxes === true) {
      t.push(`<text x="${zone.x}" y="${c.y0 + c.h - 6}" class="plan-note">box${
        batiment.emplacementsParBox !== null ? ` — ${batiment.emplacementsParBox} emplacement(s)` : ""}</text>`);
    }
  }

  // Les compartiments : autant que la surface en demande, plafonnés à quatre —
  // au-delà, on ne compte plus, on regarde une trame.
  const compartiments = batiment.surfaceParc !== null && batiment.superficieCompartiment
    ? Math.max(1, Math.min(4, Math.ceil(batiment.surfaceParc / batiment.superficieCompartiment)))
    : 1;
  for (let i = 1; i < compartiments; i += 1) {
    const x = c.x0 + (i * c.w) / compartiments;
    t.push(`<line x1="${x}" y1="${c.y0}" x2="${x}" y2="${c.y0 + c.h}" class="plan-compartiment"/>`);
  }
  if (batiment.superficieCompartiment !== null) {
    t.push(`<text x="${c.x0 + 8}" y="${c.y0 - 8}" class="plan-note">${compartiments} compartiment${
      compartiments > 1 ? "s" : ""} — ${virgule(batiment.superficieCompartiment)} m² au plus</text>`);
  }

  // Les celliers ou caves regroupés partagent le sous-sol avec le parc, et
  // l'article 10 les en sépare.
  if (batiment.celliers === true) {
    const x = c.x0 + c.w - 94;
    const y = c.y0 + c.h - 46;
    t.push(`<rect x="${x}" y="${y}" width="86" height="38" class="bat-celliers"/>`);
    t.push(`<text x="${x + 43}" y="${y + 24}" class="bat-celliers-note">celliers</text>`);
  }

  // Les larges ouvertures sur deux faces opposées : c'est ce qui dispense de la
  // ventilation mécanique.
  if (batiment.largesOuvertures === true) {
    for (const x of [c.x0, c.x0 + c.w]) {
      t.push(`<line x1="${x}" y1="${c.y0 + 24}" x2="${x}" y2="${c.y0 + c.h - 24}" class="plan-ouverture"/>`);
    }
  }

  t.push(enveloppePlan(c, "Sous-sol — parc de stationnement"));

  // Le chemin à parcourir : depuis le point le plus défavorable, jusqu'à
  // l'issue la plus proche.
  if (batiment.distanceIssue !== null) {
    t.push(coteH(issues[0], c.x0 + c.w - 14, c.y0 + c.h + 30, `${virgule(batiment.distanceIssue)} m à parcourir`));
  }
  const dessous = batiment.largesOuvertures === true ? "larges ouvertures sur deux faces opposées"
    : batiment.ventilationParc === "mecanique" ? "ventilation mécanique"
      : batiment.ventilationParc ? `ventilation ${batiment.ventilationParc}` : "";
  if (dessous) {
    t.push(`<text x="${c.x0 + c.w / 2}" y="${c.y0 + c.h + 54}" class="plan-note est-centre">${escapeHtml(dessous)}</text>`);
  }

  return { titre: "Sous-sol", svg: t.filter(Boolean).join("\n      "), hauteur: c.hauteur + 24 };
}

const PLANS = { etage: planEtage, rdc: planRdc, sousSol: planSousSol };

/**
 * Un plan, au niveau demandé.
 *
 * @param {object} reponses ce qui a été répondu
 * @param {{niveau?: "etage"|"rdc"|"sousSol"}} options le niveau à dessiner
 */
export function dessinerLePlan(reponses = {}, { niveau = "etage" } = {}) {
  const batiment = lireLeBatiment(reponses);
  const dessine = (PLANS[niveau] ?? planEtage)(batiment);
  if (!dessine) return { vide: true, svg: "", batiment };

  return {
    vide: false,
    batiment,
    niveau,
    titre: dessine.titre,
    svg: `<svg viewBox="0 0 ${PL.largeur} ${dessine.hauteur}" role="img" xmlns="http://www.w3.org/2000/svg"
      aria-label="${escapeHtml(resumerLePlan(batiment, niveau))}">
      ${dessine.svg}
    </svg>`
  };
}

/** Les plans qui ont quelque chose à montrer, dans l'ordre où on les lit. */
export function plansDisponibles(reponses = {}) {
  return [["etage", "Étage"], ["rdc", "Rez-de-chaussée"], ["sousSol", "Sous-sol"]]
    .map(([cle, libelle]) => [cle, libelle, dessinerLePlan(reponses, { niveau: cle })])
    .filter(([, , plan]) => !plan.vide);
}

const nommerEscalier = (type) => ({
  encloisonne: "escalier encloisonné", airLibre: "escalier à l'air libre",
  abriFumees: "escalier à l'abri des fumées", exterieur: "escalier extérieur",
  nonProtege: "escalier non protégé"
}[type] ?? "escalier");

const nommerCirculation = (type) => ({
  airLibre: "circulation à l'air libre", abriFumees: "circulation à l'abri des fumées",
  aucune: "aucune circulation protégée"
}[type] ?? "circulation horizontale");

/* ------------------------------------------------------------------ *
 * Ce que les dessins disent
 * ------------------------------------------------------------------ */

/** Ce que la coupe dit, en une phrase — pour le lecteur d'écran et la légende. */
export function resumer(batiment, classement = null) {
  const morceaux = [];
  if (batiment.collectif === true) morceaux.push("bâtiment collectif");
  if (batiment.collectif === false) {
    morceaux.push(`habitation individuelle${batiment.implantation === "bande" ? " groupée en bande"
      : batiment.implantation === "jumelee" ? " jumelée" : batiment.implantation === "isolee" ? " isolée" : ""}`);
  }
  if (batiment.etages !== null) {
    morceaux.push(batiment.etages === 0 ? "rez-de-chaussée seul"
      : `rez-de-chaussée et ${batiment.etages} étage${batiment.etages > 1 ? "s" : ""}`);
  }
  if (batiment.duplex === true) morceaux.push("duplex au dernier étage");
  if (batiment.enterres) {
    morceaux.push(`${batiment.enterres} niveau${batiment.enterres > 1 ? "x" : ""} au-dessous du niveau de référence`
      + (batiment.parcDessous ? `, dont ${Math.min(batiment.parcDessous, batiment.enterres)} de parc` : ""));
  }
  if (terrainEnPente(batiment)) {
    morceaux.push(`terrain en pente : ${batiment.enterresDeclares} niveau${batiment.enterresDeclares > 1 ? "x" : ""} `
      + "recoupé, moitié habitation, moitié parc");
  }
  if (batiment.parcDessus) morceaux.push(`parc sur ${batiment.parcDessus} niveau${batiment.parcDessus > 1 ? "x" : ""} en superstructure`);
  const pas = hauteurDeNiveau(batiment);
  if (batiment.hauteur !== null) {
    morceaux.push(`plancher bas du niveau le plus haut à ${virgule(batiment.hauteur)} m`
      + (pas !== null ? `, soit ${virgule(pas)} m par niveau` : ""));
  }
  if (batiment.hauteurLogement !== null) morceaux.push(`plancher bas du logement le plus haut à ${virgule(batiment.hauteurLogement)} m`);
  if (batiment.paroisJusquACouverture === true) morceaux.push("parois de l'enveloppe des logements prolongées jusqu'à la couverture");
  if (batiment.paroisJusquACouverture === false) morceaux.push("parois de l'enveloppe arrêtées au dernier plancher");
  if (batiment.structuresIndependantes === true) morceaux.push("structures indépendantes de l'habitation contiguë");
  if (batiment.structuresIndependantes === false) morceaux.push("structures non indépendantes de l'habitation contiguë");
  if (batiment.ascenseur === true) {
    morceaux.push(`ascenseur${batiment.ascenseurAuSousSol === true ? " desservant le sous-sol" : ""}`);
  }
  if (batiment.celliers === true) morceaux.push("celliers ou caves regroupés");
  if (batiment.gaz === true) morceaux.push(`colonne montante de gaz${batiment.gazParc === true ? " traversant le parc" : ""}`);
  if (batiment.electricite === true) morceaux.push("colonne montante électrique en gaine");
  if (batiment.videOrdures === true) morceaux.push("vide-ordures");
  if (batiment.parcCommunication === true) morceaux.push("communication entre le parc et le bâtiment, par sas");
  if (batiment.parcPlusieursIssues === true) morceaux.push("plusieurs issues au choix dans le parc");
  if (batiment.parcCouvertureDominee === true) morceaux.push("couverture du parc dominée par les façades");
  if (classement) morceaux.push(classement);
  return morceaux.length ? `${morceaux.join(", ")}.` : "Rien n'a encore été décrit.";
}

/** Ce que le plan dit, en une phrase — et ce n'est pas la même selon le niveau. */
export function resumerLePlan(batiment, niveau = "etage") {
  const morceaux = [];
  if (niveau === "sousSol") {
    if (batiment.superficieCompartiment !== null) {
      morceaux.push(`compartiments de ${virgule(batiment.superficieCompartiment)} m² au plus`);
    }
    if (batiment.boxes === true) {
      morceaux.push(`boxes${batiment.emplacementsParBox !== null ? ` de ${batiment.emplacementsParBox} emplacement(s)` : ""}`);
    }
    if (batiment.parcPlusieursIssues === true) morceaux.push("plusieurs issues au choix");
    if (batiment.distanceIssue !== null) morceaux.push(`${virgule(batiment.distanceIssue)} m à parcourir vers une issue`);
    if (batiment.largesOuvertures === true) morceaux.push("larges ouvertures sur deux faces opposées");
    if (batiment.celliers === true) morceaux.push("celliers ou caves regroupés");
    return morceaux.length ? `Sous-sol : ${morceaux.join(", ")}.` : "Rien n'a encore été décrit au sous-sol.";
  }

  if (niveau === "rdc") {
    if (batiment.voieEchelles === true) morceaux.push("accès aux escaliers atteints par la voie-échelles");
    else if (batiment.voie === true) morceaux.push("voie d'accès déclarée");
    else if (batiment.voie === false) morceaux.push("aucune voie décrite");
    if (batiment.distanceDebouche !== null) morceaux.push(`${virgule(batiment.distanceDebouche)} m du débouché de l'escalier à la sortie`);
    if (batiment.distanceLimite !== null) morceaux.push(`${virgule(batiment.distanceLimite)} m de la limite de propriété`);
    if (batiment.longueur !== null) morceaux.push(`${virgule(batiment.longueur)} m de longueur`);
    if (batiment.hallServices === true) morceaux.push("hall desservant des services collectifs");
    return morceaux.length ? `Rez-de-chaussée : ${morceaux.join(", ")}.` : "Rien n'a encore été décrit au rez-de-chaussée.";
  }

  if (batiment.escalier) morceaux.push(nommerEscalier(batiment.escalier));
  if (batiment.circulation) morceaux.push(nommerCirculation(batiment.circulation));
  if (batiment.distancePortePaliere !== null) {
    morceaux.push(`porte palière la plus éloignée à ${virgule(batiment.distancePortePaliere)} m de l'escalier`);
  }
  if (batiment.distanceBaies !== null) morceaux.push(`escalier à ${virgule(batiment.distanceBaies)} m des baies`);
  if (batiment.nombreEscaliers !== null && batiment.nombreEscaliers >= 2) {
    morceaux.push(`${batiment.nombreEscaliers} escaliers protégés`
      + (batiment.distanceEntreEscaliers !== null ? `, ${virgule(batiment.distanceEntreEscaliers)} m entre eux` : ""));
  }
  if (batiment.ascenseur === true) morceaux.push("ascenseur contre la cage");
  if (batiment.coursives === true) morceaux.push("coursives à l'air libre");
  return morceaux.length ? `Niveau courant : ${morceaux.join(", ")}.` : "Rien n'a encore été décrit à plat.";
}

/** L'ancienne porte, gardée : la coupe est ce qu'on montre par défaut. */
export const dessinerLeBatiment = dessinerLaCoupe;
