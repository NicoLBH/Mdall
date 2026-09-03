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

/** Ce que les dessins savent lire dans les réponses. */
export const FAITS_DESSINES = [
  "logementsSuperposes", "implantation", "structuresIndependantes", "etagesSurRdc",
  "duplexOuTriplexAuDernierEtage", "niveauxEnSousSol", "hauteurPlancherBasNiveauLePlusHaut",
  "hauteurPlancherBasLogementLePlusHautSiDuplex", "paroisLogementProlongeesJusquACouverture",
  "parcDeStationnement", "niveauxParcAuDessous", "niveauxParcAuDessus", "voieAccesDecrite",
  "typeEscalierRetenu", "typeCirculationRetenue", "distancePortePaliereEscalier",
  "accesEscaliersAtteintsParVoieEchelles", "distanceEscalierAuxBaies", "distanceLimiteDePropriete"
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
    enterresDeclares,
    hauteur: nombre(reponses.hauteurPlancherBasNiveauLePlusHaut),
    hauteurLogement: nombre(reponses.hauteurPlancherBasLogementLePlusHautSiDuplex),
    paroisJusquACouverture: booleen(reponses.paroisLogementProlongeesJusquACouverture),
    parc,
    parcDessous,
    parcDessus: parc === true ? borner(nombre(reponses.niveauxParcAuDessus), 0, 12) : null,
    voie: booleen(reponses.voieAccesDecrite),
    voieEchelles: booleen(reponses.accesEscaliersAtteintsParVoieEchelles),
    escalier: reponses.typeEscalierRetenu ?? null,
    circulation: reponses.typeCirculationRetenue ?? null,
    distancePortePaliere: nombre(reponses.distancePortePaliereEscalier),
    distanceBaies: nombre(reponses.distanceEscalierAuxBaies),
    distanceLimite: nombre(reponses.distanceLimiteDePropriete)
  };
}

/**
 * Ce qu'on trouve à chaque niveau, du plus haut au plus bas.
 *
 * Un niveau porte un nom — R, 1, 2, −1 — et une destination. Le parc en
 * superstructure occupe le bas du bâti, le parc enterré le haut du sous-sol :
 * c'est ainsi qu'ils se construisent, et c'est ce que le compte de l'arrêté
 * décrit. Le reste est habitation, ou sous-sol quelconque.
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
  for (let n = 1; n <= enterres; n += 1) {
    niveaux.push({
      nom: `−${n}`,
      rang: -n,
      enterre: true,
      destination: n <= parcDessous ? "parc" : "sous-sol",
      dalleEffacee: false
    });
  }
  return niveaux;
}

/* ------------------------------------------------------------------ *
 * La coupe
 * ------------------------------------------------------------------ */

const L = {
  largeur: 560,
  niveau: 30,
  toit: 34,
  volume: 104,
  margeHaut: 34,
  margeBas: 46
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
  const sol = L.margeHaut + hauts * L.niveau + L.toit;
  const hauteur = sol + bas * L.niveau + L.margeBas;

  const combien = volumes(batiment);
  const largeur = combien === 1 ? L.volume + 46 : L.volume;
  const x0 = Math.max(132, (L.largeur - combien * largeur) / 2 + 24);
  const yDe = (rang) => (rang >= 0 ? sol - (rang + 1) * L.niveau : sol + (-rang - 1) * L.niveau);

  const corps = [];
  for (let v = 0; v < combien; v += 1) {
    const x = x0 + v * largeur;
    for (const niveau of niveaux) {
      const y = yDe(niveau.rang);
      const classe = niveau.destination === "parc" ? "bat-parc"
        : niveau.enterre ? "bat-enterre" : "bat-volume";
      corps.push(`<rect x="${x}" y="${y}" width="${largeur}" height="${L.niveau}" class="${classe}"/>`);
      if (niveau.dalleEffacee) {
        corps.push(`<line x1="${x}" y1="${y + L.niveau}" x2="${x + largeur}" y2="${y + L.niveau}" class="bat-dalle est-effacee"/>`);
      }
      corps.push(`<text x="${x + 7}" y="${y + L.niveau - 9}" class="bat-etage">${escapeHtml(niveau.nom)}</text>`);
      if (niveau.destination === "parc") {
        corps.push(`<text x="${x + largeur - 7}" y="${y + L.niveau - 9}" class="bat-parc-note">parc</text>`);
      }
    }
    corps.push(couverture(batiment, x, largeur, sol, hauts, v === combien - 1));
    // Le joint entre deux maisons en bande : c'est lui qui décide de la
    // première ou de la deuxième famille, et il ne se voit pas autrement.
    if (v > 0 && batiment.structuresIndependantes !== null) {
      corps.push(`<line x1="${x}" y1="${sol}" x2="${x}" y2="${sol - hauts * L.niveau}"
        class="bat-joint${batiment.structuresIndependantes ? " est-independant" : ""}"/>`);
    }
  }

  const legendes = [`<text x="20" y="${sol - 8}" class="bat-note">sol accessible aux engins</text>`];
  if (bas > 0) legendes.push(`<text x="20" y="${sol + bas * L.niveau - 8}" class="bat-note">sous le niveau de référence</text>`);
  if (batiment.voie === true) {
    const y = sol + bas * L.niveau + 14;
    legendes.push(`<rect x="20" y="${y}" width="78" height="10" class="bat-voie"/>`);
    legendes.push(`<text x="104" y="${y + 9}" class="bat-note">voie d'accès déclarée</text>`);
  }
  if (batiment.etagesReels !== null && batiment.etagesReels !== batiment.etages) {
    legendes.push(`<text x="20" y="${hauteur - 8}" class="bat-note">dessin plafonné à 12 étages</text>`);
  }

  return {
    vide: false,
    batiment,
    svg: `<svg viewBox="0 0 ${L.largeur} ${hauteur}" role="img" xmlns="http://www.w3.org/2000/svg"
      aria-label="${escapeHtml(resumer(batiment, classement))}">
      ${corps.join("\n      ")}
      ${cotes(batiment, x0, sol, hauts)}
      <line x1="16" y1="${sol}" x2="${L.largeur - 12}" y2="${sol}" class="bat-sol"/>
      ${legendes.join("\n      ")}
      ${classement ? `<text x="${L.largeur - 12}" y="22" class="bat-verdict">${escapeHtml(classement)}</text>` : ""}
    </svg>`
  };
}

/** Le comble, et les parois qui le traversent ou s'arrêtent dessous. */
function couverture(batiment, x, largeur, sol, hauts, avecNote) {
  const faite = sol - hauts * L.niveau;
  const t = [];
  if (batiment.collectif === false) {
    t.push(`<path d="M ${x - 6} ${faite} L ${x + largeur / 2} ${faite - 30} L ${x + largeur + 6} ${faite}" class="bat-toit"/>`);
  } else {
    t.push(`<line x1="${x - 6}" y1="${faite - 8}" x2="${x + largeur + 6}" y2="${faite - 8}" class="bat-toit"/>`);
    t.push(`<line x1="${x}" y1="${faite}" x2="${x}" y2="${faite - 8}" class="bat-mur"/>`);
    t.push(`<line x1="${x + largeur}" y1="${faite}" x2="${x + largeur}" y2="${faite - 8}" class="bat-mur"/>`);
  }

  // La question qui ne se dessine pas toute seule : les parois verticales de
  // l'enveloppe du logement montent-elles jusqu'à la couverture, ou s'arrêtent
  // -elles au dernier plancher ? L'article 6 en fait dépendre une exception.
  // Elles traversent **tous** les niveaux habités : les arrêter au dernier
  // laissait croire qu'elles ne séparaient qu'un étage.
  if (batiment.paroisJusquACouverture !== null) {
    const milieu = x + largeur / 2;
    const sommet = batiment.paroisJusquACouverture
      ? (batiment.collectif === false ? faite - 26 : faite - 8)
      : faite;
    t.push(`<line x1="${milieu}" y1="${sol}" x2="${milieu}" y2="${sommet}"
      class="bat-paroi${batiment.paroisJusquACouverture ? " est-prolongee" : ""}"/>`);
    if (avecNote) t.push(`<text x="${milieu + 7}" y="${faite - 14}" class="bat-note">parois</text>`);
  }
  return t.join("\n      ");
}

/**
 * Les cotes : du sol accessible aux engins aux planchers que l'arrêté mesure.
 *
 * Deux au plus, et la seconde n'apparaît qu'en présence d'un duplex de dernier
 * étage — c'est le seul cas où le plancher bas du logement le plus haut se
 * distingue de celui du niveau le plus haut.
 */
function cotes(batiment, x, sol, hauts) {
  const t = [];
  const tracer = (valeur, rang, decalage, libelle) => {
    if (valeur === null) return;
    const haut = sol - rang * L.niveau;
    const xC = x - decalage;
    t.push(`<line x1="${xC}" y1="${sol}" x2="${xC}" y2="${haut}" class="bat-cote"/>
      <path d="M ${xC - 4} ${haut + 6} L ${xC} ${haut} L ${xC + 4} ${haut + 6}" class="bat-cote-fleche"/>
      <path d="M ${xC - 4} ${sol - 6} L ${xC} ${sol} L ${xC + 4} ${sol - 6}" class="bat-cote-fleche"/>
      <text x="${xC - 6}" y="${(sol + haut) / 2}" class="bat-cote-texte">${escapeHtml(libelle)}</text>`);
  };
  tracer(batiment.hauteur, Math.max(0, hauts - 1), 26, `${String(batiment.hauteur).replace(".", ",")} m niveau`);
  if (batiment.duplex === true) {
    tracer(batiment.hauteurLogement, Math.max(0, hauts - 2), 76, `${String(batiment.hauteurLogement).replace(".", ",")} m logement`);
  }
  return t.join("\n      ");
}

/* ------------------------------------------------------------------ *
 * Le plan
 * ------------------------------------------------------------------ */

/**
 * Le niveau courant, vu de dessus.
 *
 * Ce que la coupe ne peut pas montrer : la distance de la porte palière la plus
 * éloignée à l'escalier — celle qui sépare la troisième famille A de la
 * troisième famille B —, la forme de l'escalier retenu, celle de la circulation,
 * et la voie le long de la façade. Quatre articles se lisent ici et nulle part
 * ailleurs.
 */
export function dessinerLePlan(reponses = {}) {
  const batiment = lireLeBatiment(reponses);
  const utiles = [batiment.escalier, batiment.circulation, batiment.distancePortePaliere,
    batiment.voie, batiment.voieEchelles].filter((v) => v !== null && v !== undefined);
  if (utiles.length === 0) return { vide: true, svg: "", batiment };

  const W = 560, H = 300;
  const x0 = 60, y0 = 46, w = 400, h = 150;
  const cage = { x: x0 + 26, y: y0 + h / 2 - 26, c: 52 };
  const t = [];

  // L'enveloppe du niveau, et la circulation qui le traverse.
  t.push(`<rect x="${x0}" y="${y0}" width="${w}" height="${h}" class="plan-enveloppe"/>`);
  const couloir = { y: y0 + h / 2 - 13, h: 26 };
  t.push(`<rect x="${cage.x + cage.c}" y="${couloir.y}" width="${w - cage.c - 26}" height="${couloir.h}"
    class="plan-circulation${batiment.circulation === "abriFumees" ? " est-protegee"
      : batiment.circulation === "airLibre" ? " est-air-libre" : ""}"/>`);
  t.push(`<text x="${cage.x + cage.c + 8}" y="${couloir.y - 6}" class="plan-note">${escapeHtml(nommerCirculation(batiment.circulation))}</text>`);

  // La cage d'escalier, et la forme retenue.
  t.push(`<rect x="${cage.x}" y="${cage.y}" width="${cage.c}" height="${cage.c}"
    class="plan-cage${batiment.escalier === "encloisonne" ? " est-encloisonnee"
      : batiment.escalier === "exterieur" ? " est-exterieure" : ""}"/>`);
  for (let i = 1; i < 5; i += 1) {
    t.push(`<line x1="${cage.x}" y1="${cage.y + i * cage.c / 5}" x2="${cage.x + cage.c}" y2="${cage.y + i * cage.c / 5}" class="plan-marche"/>`);
  }
  t.push(`<text x="${cage.x + cage.c / 2}" y="${cage.y + cage.c + 15}" class="plan-etiquette">${escapeHtml(nommerEscalier(batiment.escalier))}</text>`);

  // Les logements de part et d'autre, et la porte palière la plus éloignée —
  // celle qui décide, en troisième famille, du A ou du B.
  for (let i = 0; i < 4; i += 1) {
    const x = cage.x + cage.c + 40 + i * 76;
    const derniere = i === 3;
    for (const cote of [-1, 1]) {
      const y = cote < 0 ? couloir.y - 46 : couloir.y + couloir.h;
      const yPorte = cote < 0 ? couloir.y : couloir.y + couloir.h;
      t.push(`<rect x="${x}" y="${y}" width="60" height="46" class="plan-logement${derniere && cote > 0 ? " est-la-plus-eloignee" : ""}"/>`);
      t.push(`<line x1="${x + 20}" y1="${yPorte}" x2="${x + 40}" y2="${yPorte}" class="plan-porte"/>`);
    }
  }

  if (batiment.distancePortePaliere !== null) {
    const xFin = cage.x + cage.c + 40 + 3 * 76 + 46;
    const y = y0 + h + 22;
    t.push(`<line x1="${cage.x + cage.c / 2}" y1="${y}" x2="${xFin}" y2="${y}" class="bat-cote"/>
      <path d="M ${cage.x + cage.c / 2 + 6} ${y - 4} L ${cage.x + cage.c / 2} ${y} L ${cage.x + cage.c / 2 + 6} ${y + 4}" class="bat-cote-fleche"/>
      <path d="M ${xFin - 6} ${y - 4} L ${xFin} ${y} L ${xFin - 6} ${y + 4}" class="bat-cote-fleche"/>
      <text x="${(cage.x + cage.c / 2 + xFin) / 2}" y="${y - 6}" class="plan-cote-texte">
        ${escapeHtml(String(batiment.distancePortePaliere).replace(".", ","))} m — porte palière la plus éloignée</text>`);
  }

  // La voie, le long de la façade.
  if (batiment.voie !== null) {
    t.push(`<rect x="${x0}" y="${y0 - 26}" width="${w}" height="14" class="bat-voie"/>`);
    t.push(`<text x="${x0}" y="${y0 - 32}" class="plan-note">${
      batiment.voieEchelles === true ? "voie-échelles : accès aux escaliers atteints"
        : batiment.voie ? "voie d'accès déclarée" : "aucune voie décrite"}</text>`);
  }

  return {
    vide: false,
    batiment,
    svg: `<svg viewBox="0 0 ${W} ${H}" role="img" xmlns="http://www.w3.org/2000/svg"
      aria-label="${escapeHtml(resumerLePlan(batiment))}">
      ${t.join("\n      ")}
    </svg>`
  };
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
  if (batiment.parcDessus) morceaux.push(`parc sur ${batiment.parcDessus} niveau${batiment.parcDessus > 1 ? "x" : ""} en superstructure`);
  if (batiment.hauteur !== null) morceaux.push(`plancher bas du niveau le plus haut à ${String(batiment.hauteur).replace(".", ",")} m`);
  if (batiment.hauteurLogement !== null) morceaux.push(`plancher bas du logement le plus haut à ${String(batiment.hauteurLogement).replace(".", ",")} m`);
  if (batiment.paroisJusquACouverture === true) morceaux.push("parois de l'enveloppe des logements prolongées jusqu'à la couverture");
  if (batiment.paroisJusquACouverture === false) morceaux.push("parois de l'enveloppe arrêtées au dernier plancher");
  if (batiment.structuresIndependantes === true) morceaux.push("structures indépendantes de l'habitation contiguë");
  if (batiment.structuresIndependantes === false) morceaux.push("structures non indépendantes de l'habitation contiguë");
  if (classement) morceaux.push(classement);
  return morceaux.length ? `${morceaux.join(", ")}.` : "Rien n'a encore été décrit.";
}

/** Ce que le plan dit, en une phrase. */
export function resumerLePlan(batiment) {
  const morceaux = [];
  if (batiment.escalier) morceaux.push(nommerEscalier(batiment.escalier));
  if (batiment.circulation) morceaux.push(nommerCirculation(batiment.circulation));
  if (batiment.distancePortePaliere !== null) {
    morceaux.push(`porte palière la plus éloignée à ${String(batiment.distancePortePaliere).replace(".", ",")} m de l'escalier`);
  }
  if (batiment.voieEchelles === true) morceaux.push("accès aux escaliers atteints par la voie-échelles");
  return morceaux.length ? `Vue en plan : ${morceaux.join(", ")}.` : "Rien n'a encore été décrit à plat.";
}

/** L'ancienne porte, gardée : la coupe est ce qu'on montre par défaut. */
export const dessinerLeBatiment = dessinerLaCoupe;
