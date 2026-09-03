/**
 * Le bâtiment tel que les réponses le décrivent — dessiné au fur et à mesure.
 *
 * ## Ce que ce dessin est, et ce qu'il n'est pas
 *
 * Ce n'est pas une représentation du projet : ni proportions, ni géométrie, ni
 * matériaux. C'est une **relecture** de ce qui vient d'être répondu, en coupe,
 * pour qu'on voie ce que l'arrêté a compris.
 *
 * C'est là tout l'intérêt. On demande « nombre d'étages sur rez-de-chaussée » ;
 * quelqu'un qui compte trois niveaux habitables répond « 3 ». Le dessin montre
 * alors quatre planchers — R, 1, 2, 3 — et la faute saute aux yeux avant
 * d'avoir contaminé le classement, puis le degré coupe-feu des planchers, puis
 * tout ce qui en découle. Aucun message d'erreur ne ferait ce travail : il
 * faudrait savoir d'avance qu'il y a une erreur.
 *
 * Même chose pour les parois de l'enveloppe du logement prolongées jusqu'à la
 * couverture : la phrase est abstraite, le trait qui monte à travers le comble
 * ne l'est pas.
 *
 * ## Ce qu'il ne fait jamais
 *
 * Il ne conclut rien, il ne corrige rien, il ne signale aucune faute — il
 * montre. La règle reste au serveur ; ce fichier ne connaît que des étages et
 * des traits.
 */

import { escapeHtml } from "../../../utils/escape-html.js";

const nombre = (valeur) => {
  const n = Number.parseFloat(String(valeur ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const oui = (valeur) => valeur === true || valeur === "oui" || valeur === "true";
const non = (valeur) => valeur === false || valeur === "non" || valeur === "false";

/** Ce que le dessin sait lire dans les réponses. */
export const FAITS_DESSINES = [
  "logementsSuperposes", "implantation", "structuresIndependantes", "etagesSurRdc",
  "duplexOuTriplexAuDernierEtage", "sousSol", "hauteurPlancherBasLogementLePlusHaut",
  "hauteurPlancherBasNiveauLePlusHaut", "paroisLogementProlongeesJusquACouverture",
  "parcDeStationnement", "niveauxParcAuDessous", "niveauxParcAuDessus", "voieAccesDecrite"
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
  return {
    collectif: oui(reponses.logementsSuperposes) ? true : non(reponses.logementsSuperposes) ? false : null,
    implantation: reponses.implantation ?? null,
    structuresIndependantes: oui(reponses.structuresIndependantes) ? true
      : non(reponses.structuresIndependantes) ? false : null,
    // Au-delà d'une douzaine d'étages le dessin cesse d'être lisible et cesse
    // de servir : on le plafonne, en le disant.
    etages: etages === null ? null : Math.max(0, Math.min(12, Math.round(etages))),
    etagesReels: etages,
    duplex: oui(reponses.duplexOuTriplexAuDernierEtage) ? true
      : non(reponses.duplexOuTriplexAuDernierEtage) ? false : null,
    sousSol: oui(reponses.sousSol) ? true : non(reponses.sousSol) ? false : null,
    hauteur: nombre(reponses.hauteurPlancherBasLogementLePlusHaut)
      ?? nombre(reponses.hauteurPlancherBasNiveauLePlusHaut),
    paroisJusquACouverture: oui(reponses.paroisLogementProlongeesJusquACouverture) ? true
      : non(reponses.paroisLogementProlongeesJusquACouverture) ? false : null,
    parc: oui(reponses.parcDeStationnement) ? true : non(reponses.parcDeStationnement) ? false : null,
    parcDessous: nombre(reponses.niveauxParcAuDessous),
    parcDessus: nombre(reponses.niveauxParcAuDessus),
    voie: oui(reponses.voieAccesDecrite) ? true : non(reponses.voieAccesDecrite) ? false : null
  };
}

/* ------------------------------------------------------------------ *
 * Le dessin
 * ------------------------------------------------------------------ */

const L = {
  largeur: 560,
  niveau: 30,          // la hauteur d'un niveau
  toit: 34,            // ce que le comble ajoute au-dessus du dernier plancher
  volume: 104,         // la largeur d'un volume bâti
  margeHaut: 34,       // de quoi loger le classement et le faîtage
  margeBas: 46         // de quoi loger les légendes sous le sol
};

/**
 * Où poser le sol, et quelle hauteur donner au cadre.
 *
 * Le dessin se mesure sur le cas plutôt que l'inverse : un rez-de-chaussée seul
 * occuperait le quart d'un cadre taillé pour un R+6, et un R+6 avec deux
 * niveaux de parc déborderait d'un cadre taillé pour le plain-pied.
 */
function cadre(batiment) {
  const dessus = ((batiment.etages ?? 0) + 1) * L.niveau + L.toit;
  const dessous = niveauxEnterres(batiment) * L.niveau;
  return { sol: L.margeHaut + dessus, hauteur: L.margeHaut + dessus + dessous + L.margeBas };
}

/** Les niveaux sous le niveau de référence : le sous-sol, puis le parc. */
function niveauxEnterres(batiment) {
  return (batiment.sousSol === true ? 1 : 0)
    + (batiment.parc === true ? Math.max(0, Math.min(6, Math.round(batiment.parcDessous ?? 0))) : 0);
}

/** Combien de volumes côte à côte, selon l'implantation déclarée. */
function volumes(batiment) {
  if (batiment.collectif !== false) return 1;
  if (batiment.implantation === "jumelee") return 2;
  if (batiment.implantation === "bande") return 4;
  return 1;
}

/**
 * Un niveau : sa dalle, et son étiquette.
 *
 * L'étiquette est ce qui enseigne : « R » au rez-de-chaussée, « 1 » au premier.
 * C'est en la voyant qu'on comprend que le rez-de-chaussée ne compte pas dans
 * « le nombre d'étages sur rez-de-chaussée ».
 */
function niveaux(batiment, x, largeur, sol) {
  const t = [];
  const etages = batiment.etages ?? 0;
  const hautDuDernier = sol - (etages + 1) * L.niveau;

  for (let n = 0; n <= etages; n += 1) {
    const bas = sol - n * L.niveau;
    const haut = bas - L.niveau;
    // Le plancher du duplex de dernier étage ne sépare rien : le 5°) de
    // l'article 3 ne compte que son niveau bas.
    const dalleDuDuplex = batiment.duplex === true && n === etages && etages >= 1;
    if (n > 0) {
      t.push(`<line x1="${x}" y1="${bas}" x2="${x + largeur}" y2="${bas}"
        class="bat-dalle${dalleDuDuplex ? " est-effacee" : ""}"/>`);
    }
    t.push(`<text x="${x + 9}" y="${bas - 8}" class="bat-etage">${n === 0 ? "R" : String(n)}</text>`);
    if (n === etages) t.push(`<line x1="${x}" y1="${haut}" x2="${x + largeur}" y2="${haut}" class="bat-dalle"/>`);
  }
  if (batiment.duplex === true && etages >= 1) {
    t.push(`<text x="${x + largeur - 8}" y="${hautDuDernier + L.niveau + 14}" class="bat-note-droite">duplex</text>`);
  }
  return t.join("\n      ");
}

/** Le comble, et les parois qui le traversent ou s'arrêtent dessous. */
function couverture(batiment, x, largeur, sol, avecNote) {
  const faite = sol - ((batiment.etages ?? 0) + 1) * L.niveau;
  const t = [];
  if (batiment.collectif === false) {
    t.push(`<path d="M ${x - 6} ${faite} L ${x + largeur / 2} ${faite - 30} L ${x + largeur + 6} ${faite}"
      class="bat-toit"/>`);
  } else {
    t.push(`<line x1="${x - 6}" y1="${faite - 8}" x2="${x + largeur + 6}" y2="${faite - 8}" class="bat-toit"/>`);
    t.push(`<line x1="${x}" y1="${faite}" x2="${x}" y2="${faite - 8}" class="bat-mur"/>`);
    t.push(`<line x1="${x + largeur}" y1="${faite}" x2="${x + largeur}" y2="${faite - 8}" class="bat-mur"/>`);
  }

  // La question qui ne se dessine pas toute seule : les parois verticales de
  // l'enveloppe du logement montent-elles jusqu'à la couverture, ou s'arrêtent
  // -elles au dernier plancher ? L'article 6 en fait dépendre une exception.
  if (batiment.paroisJusquACouverture !== null) {
    const milieu = x + largeur / 2;
    const sommet = batiment.collectif === false ? faite - 26 : faite - 8;
    t.push(batiment.paroisJusquACouverture
      ? `<line x1="${milieu}" y1="${faite + L.niveau}" x2="${milieu}" y2="${sommet}" class="bat-paroi est-prolongee"/>`
      : `<line x1="${milieu}" y1="${faite + L.niveau}" x2="${milieu}" y2="${faite}" class="bat-paroi"/>`);
    // Le mot suffit dans le dessin ; la phrase entière est sous le dessin, où
    // elle ne recouvre rien.
    if (avecNote) t.push(`<text x="${milieu + 7}" y="${faite - 14}" class="bat-note">parois</text>`);
  }
  return t.join("\n      ");
}

/** Le sous-sol, et les niveaux de parc, sous le niveau de référence. */
function dessous(batiment, x, largeur, sol) {
  const t = [];
  let bas = sol;
  if (batiment.sousSol === true) {
    t.push(`<rect x="${x}" y="${bas}" width="${largeur}" height="${L.niveau}" class="bat-enterre"/>`);
    t.push(`<text x="${x + 9}" y="${bas + L.niveau - 8}" class="bat-etage">S</text>`);
    bas += L.niveau;
  }
  const niveauxParc = batiment.parc === true ? Math.max(0, Math.min(6, Math.round(batiment.parcDessous ?? 0))) : 0;
  for (let n = 0; n < niveauxParc; n += 1) {
    t.push(`<rect x="${x}" y="${bas}" width="${largeur}" height="${L.niveau}" class="bat-parc"/>`);
    t.push(`<text x="${x + largeur / 2}" y="${bas + L.niveau - 8}" class="bat-parc-note">parc −${n + 1}</text>`);
    bas += L.niveau;
  }
  return t.join("\n      ");
}

/** La cote H : du sol accessible aux engins au plancher bas du logement le plus haut. */
function cote(batiment, x, sol) {
  if (batiment.hauteur === null || batiment.etages === null) return "";
  const haut = sol - (batiment.etages ?? 0) * L.niveau;
  const xC = x - 26;
  return `
      <line x1="${xC}" y1="${sol}" x2="${xC}" y2="${haut}" class="bat-cote"/>
      <path d="M ${xC - 4} ${haut + 6} L ${xC} ${haut} L ${xC + 4} ${haut + 6}" class="bat-cote-fleche"/>
      <path d="M ${xC - 4} ${sol - 6} L ${xC} ${sol} L ${xC + 4} ${sol - 6}" class="bat-cote-fleche"/>
      <text x="${xC - 8}" y="${(sol + haut) / 2}" class="bat-cote-texte">${
        escapeHtml(String(batiment.hauteur).replace(".", ","))} m</text>`;
}

/**
 * Le bâtiment, en coupe.
 *
 * Rien n'est dessiné de ce qui n'a pas été répondu : un dessin qui inventerait
 * un sous-sol pour faire joli ferait répondre « oui » à quelqu'un qui n'a rien
 * dit.
 */
export function dessinerLeBatiment(reponses = {}, { classement = null } = {}) {
  const batiment = lireLeBatiment(reponses);
  if (batiment.etages === null && batiment.collectif === null) {
    return { vide: true, svg: "", batiment };
  }

  const { sol, hauteur } = cadre(batiment);
  const combien = volumes(batiment);
  const largeur = combien === 1 ? L.volume + 46 : L.volume;
  const total = combien * largeur;
  const x0 = Math.max(132, (L.largeur - total) / 2 + 24);
  const hautDuBati = ((batiment.etages ?? 0) + 1) * L.niveau;

  const corps = [];
  for (let v = 0; v < combien; v += 1) {
    const x = x0 + v * largeur;
    corps.push(`<rect x="${x}" y="${sol - hautDuBati}" width="${largeur}" height="${hautDuBati}" class="bat-volume"/>`);
    corps.push(niveaux(batiment, x, largeur, sol));
    corps.push(couverture(batiment, x, largeur, sol, v === combien - 1));
    corps.push(dessous(batiment, x, largeur, sol));
    // Le joint entre deux maisons en bande : c'est lui qui décide de la
    // première ou de la deuxième famille, et il ne se voit pas autrement.
    if (v > 0 && batiment.structuresIndependantes !== null) {
      corps.push(`<line x1="${x}" y1="${sol}" x2="${x}" y2="${sol - hautDuBati}"
        class="bat-joint${batiment.structuresIndependantes ? " est-independant" : ""}"/>`);
    }
  }

  const enterres = niveauxEnterres(batiment);
  const legendes = [`<text x="20" y="${sol - 8}" class="bat-note">sol accessible aux engins</text>`];
  if (enterres > 0) {
    legendes.push(`<text x="20" y="${sol + enterres * L.niveau - 8}" class="bat-note">sous le niveau de référence</text>`);
  }
  if (batiment.voie === true) {
    const y = sol + enterres * L.niveau + 14;
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
      ${cote(batiment, x0, sol)}
      <line x1="16" y1="${sol}" x2="${L.largeur - 12}" y2="${sol}" class="bat-sol"/>
      ${legendes.join("\n      ")}
      ${classement ? `<text x="${L.largeur - 12}" y="22" class="bat-verdict">${escapeHtml(classement)}</text>` : ""}
    </svg>`
  };
}

/**
 * Ce que le dessin dit, en une phrase — pour le lecteur d'écran, et pour la
 * légende sous le dessin.
 */
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
  if (batiment.sousSol === true) morceaux.push("un sous-sol");
  if (batiment.parc === true && batiment.parcDessous) morceaux.push(`parc sur ${batiment.parcDessous} niveaux enterrés`);
  if (batiment.hauteur !== null) morceaux.push(`plancher bas du logement le plus haut à ${String(batiment.hauteur).replace(".", ",")} m`);
  if (batiment.paroisJusquACouverture === true) morceaux.push("parois de l'enveloppe des logements prolongées jusqu'à la couverture");
  if (batiment.paroisJusquACouverture === false) morceaux.push("parois de l'enveloppe arrêtées au dernier plancher");
  if (batiment.structuresIndependantes === true) morceaux.push("structures indépendantes de l'habitation contiguë");
  if (batiment.structuresIndependantes === false) morceaux.push("structures non indépendantes de l'habitation contiguë");
  if (classement) morceaux.push(classement);
  return morceaux.length ? `${morceaux.join(", ")}.` : "Rien n'a encore été décrit.";
}
