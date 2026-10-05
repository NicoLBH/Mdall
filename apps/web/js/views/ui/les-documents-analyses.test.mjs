/**
 * Le rail des familles, et le tableau qu'il filtre.
 *
 * Les documents sont inventés.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CHOISIR_UNE_FAMILLE, FILTRER_PAR_ETAT, OUVRIR_UN_DOCUMENT, laFamilleDesignee,
  leDocumentDesigne, renderLeRailDesFamilles, renderLeTableauDesDocuments
} from "./les-documents-analyses.js";
import { COLONNE_DU_COMPTE, POUSSE_A_DROITE } from "./data-table-shell.js";
import { NOM_COUPABLE } from "./un-nom-coupable.js";
import {
  FAMILLE, OU_EN_EST, TOUTES, lesDocumentsAnalyses, lesDocumentsDuTableau,
  lesDocumentsEnAttente
} from "../../services/les-documents-analyses.js";
import {
  LES_TRIS_DES_DOCUMENTS, SENS, TRI_DES_DOCUMENTS, laCleDuTri
} from "../../services/le-tri-des-documents.js";
import { escapeHtml } from "../../utils/escape-html.js";

/** Les clés composées comme l'écran les compose, et non recopiées à la main. */
const PAR_DOCUMENT = laCleDuTri(TRI_DES_DOCUMENTS.DOCUMENT, SENS.RECENT);
const PAR_DOCUMENT_ANCIEN = laCleDuTri(TRI_DES_DOCUMENTS.DOCUMENT, SENS.ANCIEN);

const TOUS = lesDocumentsAnalyses({
  mails: [{
    id: "f-1", objet: "Reprise des enduits", finit_le: "2026-03-02",
    created_at: "2026-10-01T10:00:00Z", mesures: { messages: 7, prises: 3 }, relectures: 2
  }],
  controles: [{
    id: "r-1", document: "RICT-03.pdf", numero_de_rapport: "RICT-03", etabli_le: "2026-04-18",
    created_at: "2026-09-28T10:00:00Z", mesures: { avis: 12, marques: 4 }
  }],
  crs: [{
    id: "c-1", document: "CR_16.pdf", numero_de_reunion: "16", tenue_le: "2026-04-16",
    created_at: "2026-09-30T10:00:00Z", mesures: { points: 11 }
  }]
});

/**
 * Ce qui attend, **tel que le service le tire de la file** — et non écrit à la
 * main ici.
 *
 * Une ligne dont j'aurais posé moi-même le `ou` et le `dit` recopierait
 * l'hypothèse du code : elle passerait encore si le service cessait de lire la
 * file. Les lignes brutes ci-dessous sont celles de la table `versements`.
 */
const EN_ATTENTE = lesDocumentsEnAttente([
  {
    geste: FAMILLE.CONTROLE, cree_le: "2026-10-03T08:00:00Z",
    avancement: { pas: [
      { id: "r-9", nom: "RICT-04.pdf", ou: "en-cours" },
      { id: "r-8", nom: "RICT-05.pdf", ou: "echoue", motif: "le fichier est illisible" },
      // Déjà lu : il a sa lecture conservée, et n'attend plus rien.
      { id: "r-1", nom: "RICT-03.pdf", ou: "lu" }
    ] }
  },
  {
    geste: FAMILLE.MAIL, cree_le: "2026-10-03T09:00:00Z",
    fichiers: [{ id: "m-4", nom: "Relance toiture.msg" }]
  }
]);

/** Les deux états réunis, comme l'écran les passe au tableau. */
const MELANGE = lesDocumentsDuTableau({ analyses: TOUS, enAttente: EN_ATTENTE });

/**
 * Ce que les pastilles affichent, lu dans le HTML : leur mot et leur compte.
 *
 * Les lire au lieu de les déduire est le point : une pastille qui compterait le
 * chantier entier au lieu de la famille ouverte n'est visible que là.
 */
function lesPastillesDisent(html) {
  const dit = {};
  const trouve = /documents-analyses__pastille[\s\S]*?>([^<]*)<span class="documents-analyses__compte">(\d+)</g;
  for (const une of html.matchAll(trouve)) dit[une[1].trim()] = Number(une[2]);
  return dit;
}

/** Ce que chaque pastille émet au clic. */
function lesPastillesEmettent(html) {
  return [...html.matchAll(new RegExp(`${FILTRER_PAR_ETAT}="([^"]*)"`, "g"))].map((un) => un[1]);
}

/* ── Le rail ──────────────────────────────────────────────────────────────── */

test("le rail porte les quatre entrées, et leur compte", () => {
  const html = renderLeRailDesFamilles({ actif: TOUTES, documents: TOUS });

  for (const quoi of [TOUTES, FAMILLE.MAIL, FAMILLE.CONTROLE, FAMILLE.CR]) {
    assert.match(html, new RegExp(`${CHOISIR_UNE_FAMILLE}="${quoi}"`), quoi);
  }
  assert.match(html, /Tous les documents/);
  assert.match(html, /Bureau de Contrôle/);
  // Le compte va avec le nom : il dit, **avant** le clic, s'il y a quelque chose
  // à voir derrière.
  assert.match(html, />\s*3\s*</);
});

test("une famille vide porte zéro, et non rien", () => {
  // « Mails 0 » dit qu'il n'y a rien ; une entrée sans compte laisse chercher.
  const html = renderLeRailDesFamilles({ documents: [] });
  assert.match(html, />\s*0\s*</);
});

test("l'entrée ouverte est marquée, et une seule", () => {
  const html = renderLeRailDesFamilles({ actif: FAMILLE.CONTROLE, documents: TOUS });
  const actives = html.match(/aria-current="page"/g) ?? [];
  assert.equal(actives.length, 1);
});

/* ── Le tableau ───────────────────────────────────────────────────────────── */

test("le tableau filtre sur la famille ouverte", () => {
  const mails = renderLeTableauDesDocuments({ documents: TOUS, famille: FAMILLE.MAIL });
  assert.match(mails, /Reprise des enduits/);
  assert.doesNotMatch(mails, /RICT-03\.pdf/);
  assert.match(mails, /1 fil analysé/);

  const toutes = renderLeTableauDesDocuments({ documents: TOUS, famille: TOUTES });
  assert.match(toutes, /Reprise des enduits/);
  assert.match(toutes, /RICT-03\.pdf/);
  assert.match(toutes, /3 documents analysés/);
});

test("trois états, et non deux", () => {
  // On n'a pas encore demandé : rien du tout, pas même une panne.
  assert.equal(renderLeTableauDesDocuments({ documents: null }), "");

  // On attend la réponse.
  assert.match(renderLeTableauDesDocuments({ documents: null, enCours: true }),
    /Lecture de ce qui a déjà été analysé/);

  // On n'a pas su lire. Ce n'est pas « rien n'a été analysé » : on recommencerait
  // une lecture déjà payée (règle 5).
  const rate = renderLeTableauDesDocuments({ documents: null, rate: true });
  assert.match(rate, /n'a pas pu/);
  assert.match(rate, /on ne sait pas quoi/);
});

test("une famille vide dit laquelle, et quoi faire", () => {
  const html = renderLeTableauDesDocuments({ documents: [], famille: FAMILLE.CONTROLE });

  assert.match(html, /Aucun rapport de contrôle analysé/);
  assert.match(html, /structure et sa légende/);
  // Et surtout pas « Aucun résultat », qui n'apprend rien.
  assert.doesNotMatch(html, /Aucun résultat/);
});

test("l'icône de famille ne s'affiche que dans la vue d'ensemble", () => {
  // Sous « Mails », une colonne d'enveloppes identiques ne distingue rien et prend
  // la place du titre.
  const toutes = renderLeTableauDesDocuments({ documents: TOUS, famille: TOUTES });
  assert.match(toutes, /title="Mails"/);

  const mails = renderLeTableauDesDocuments({ documents: TOUS, famille: FAMILLE.MAIL });
  assert.doesNotMatch(mails, /title="Mails"/);
});

test("la ligne ouverte est marquée", () => {
  const html = renderLeTableauDesDocuments({
    documents: TOUS, famille: TOUTES, ouverte: "r-1"
  });
  assert.equal((html.match(/est-ouverte/g) ?? []).length, 1);
});

/* ── Les deux états, à l'écran ─────────────────────────────────── */

test("chaque ligne porte un badge, et il dit lequel des trois états", () => {
  // Le badge est ce qu'on lit **avant** de parcourir la ligne, au moment où l'on
  // décide de cliquer ou non. Un badge qui dirait la même chose de deux états
  // ferait croire qu'une lecture partie est déjà revenue (règle 5).
  const html = renderLeTableauDesDocuments({ documents: MELANGE, famille: TOUTES });

  // Le mot de la pastille, lui, est suivi de son compte : seuls les badges
  // referment leur `span` juste après le mot.
  assert.equal((html.match(/En attente<\/span>/g) ?? []).length, 2, "deux en attente");
  assert.equal((html.match(/En échec<\/span>/g) ?? []).length, 1, "un en échec");
  assert.equal((html.match(/Analysé<\/span>/g) ?? []).length, 3, "trois analysés");

  assert.match(html, /documents-analyses__badge--attente/);
  assert.match(html, /documents-analyses__badge--analyse"/);
  /**
   * **Un échec a son propre ton.** Il ne demande pas la même chose qu'une
   * attente : l'une n'a besoin de rien, l'autre ne reviendra jamais toute seule.
   */
  assert.match(html, /documents-analyses__badge--echoue/);
  // Et ce qui attend se dit sur sa ligne : ce que la file en sait.
  assert.match(html, /lecture en cours/);
  assert.match(html, /le fichier est illisible/);
});

test("un document qui attend ne s'ouvre pas", () => {
  // Il n'a pas d'analyse à montrer : un titre qui se clique pour ne rien ouvrir
  // se lit comme un écran en panne (règle 5).
  const html = renderLeTableauDesDocuments({ documents: MELANGE, famille: TOUTES });

  assert.doesNotMatch(html, new RegExp(`${OUVRIR_UN_DOCUMENT}="rapports:r-9"`));
  assert.doesNotMatch(html, new RegExp(`${OUVRIR_UN_DOCUMENT}="mails:m-4"`));
  // Son titre reste du texte : il porte son nom en deux morceaux comme les
  // autres, mais dans un `<span>` et non dans un bouton.
  assert.match(html, /<span class="documents-analyses__titre nom-coupable"/);
  assert.ok(html.includes(`<span class="${NOM_COUPABLE}__fin">RICT-04.pdf</span>`));
  // Celui qui est analysé, lui, s'ouvre toujours.
  assert.match(html, new RegExp(`${OUVRIR_UN_DOCUMENT}="rapports:r-1"`));
  assert.equal((html.match(/est-en-attente/g) ?? []).length, 3);
});

test("les pastilles comptent la famille ouverte, et non le chantier entier", () => {
  // « En attente (5) » sous Mails doit dire cinq mails : sinon cliquer dessus en
  // rendrait trois, et le compte passerait pour faux.
  assert.deepEqual(
    lesPastillesDisent(renderLeTableauDesDocuments({ documents: MELANGE, famille: TOUTES })),
    { "En échec": 1, "En attente": 2, "Analysés": 3 }
  );
  assert.deepEqual(
    lesPastillesDisent(renderLeTableauDesDocuments({
      documents: MELANGE, famille: FAMILLE.CONTROLE
    })),
    { "En échec": 1, "En attente": 1, "Analysés": 1 }
  );
  assert.deepEqual(
    lesPastillesDisent(renderLeTableauDesDocuments({
      documents: MELANGE, famille: FAMILLE.CR
    })),
    { "En échec": 0, "En attente": 0, "Analysés": 1 }
  );
});

test("un état sans document garde sa pastille", () => {
  // « En attente (0) » est une réponse : rien n'est en cours. La faire
  // disparaître laisserait se demander si le filtre existe encore.
  const html = renderLeTableauDesDocuments({ documents: TOUS, famille: TOUTES });
  assert.deepEqual(lesPastillesDisent(html),
    { "En échec": 0, "En attente": 0, "Analysés": 3 });
});

test("le filtre ne montre qu'un état", () => {
  const attente = renderLeTableauDesDocuments({
    documents: MELANGE, famille: TOUTES, filtre: OU_EN_EST.ATTENTE
  });
  assert.match(attente, /RICT-04\.pdf/);
  assert.doesNotMatch(attente, /RICT-03\.pdf/, "un analysé reste dans le filtre d'attente");
  assert.doesNotMatch(attente, /Reprise des enduits/);

  const analyses = renderLeTableauDesDocuments({
    documents: MELANGE, famille: TOUTES, filtre: OU_EN_EST.ANALYSE
  });
  assert.match(analyses, /RICT-03\.pdf/);
  assert.doesNotMatch(analyses, /RICT-04\.pdf/);

  /**
   * **Et le filtre des échecs ne montre que ce qui s'est arrêté.**
   *
   * C'est le seul des trois sur lequel on peut agir tout de suite : relancer.
   * Noyé dans « en attente », il n'avait pas de chemin à lui.
   */
  const echecs = renderLeTableauDesDocuments({
    documents: MELANGE, famille: TOUTES, filtre: OU_EN_EST.ECHOUE
  });
  assert.match(echecs, /RICT-05\.pdf/);
  assert.doesNotMatch(echecs, /RICT-04\.pdf/, "une lecture en cours est rangée en échec");
  assert.doesNotMatch(echecs, /RICT-03\.pdf/);
});

test("une pastille allumée se rééteint au clic", () => {
  // Sans cela, il n'y aurait aucun chemin de retour vers la liste entière, et
  // l'on chercherait un bouton qui n'existe pas.
  assert.deepEqual(
    lesPastillesEmettent(renderLeTableauDesDocuments({ documents: MELANGE })),
    [OU_EN_EST.ECHOUE, OU_EN_EST.ATTENTE, OU_EN_EST.ANALYSE]
  );
  assert.deepEqual(
    lesPastillesEmettent(renderLeTableauDesDocuments({
      documents: MELANGE, filtre: OU_EN_EST.ATTENTE
    })),
    [OU_EN_EST.ECHOUE, "", OU_EN_EST.ANALYSE]
  );
  assert.match(renderLeTableauDesDocuments({
    documents: MELANGE, filtre: OU_EN_EST.ANALYSE
  }), /est-active/);
});

test("un filtre qui ne rend rien dit lequel, et où sont les autres", () => {
  // « Aucun rapport de contrôle analysé » serait faux : il y en a, ils sont
  // juste dans l'autre état.
  const html = renderLeTableauDesDocuments({
    documents: TOUS, famille: TOUTES, filtre: OU_EN_EST.ATTENTE
  });
  assert.match(html, /Aucun document en attente/);
  assert.match(html, /Le filtre en haut du tableau en montre d&#39;autres/);
});

test("rien ne se dresse entre le tableau et son en-tête", () => {
  // « 19 documents analysés. Cliquer sur une ligne rouvre son analyse » redisait
  // le compte que l'en-tête porte, et expliquait un geste qu'on fait sans qu'on
  // le dise. Ce qui comptait est passé dans les pastilles.
  const html = renderLeTableauDesDocuments({ documents: MELANGE, famille: TOUTES });
  assert.match(html, /<section class="documents-analyses">\s*<div class="data-table-shell/);
});

/* ── Ce qu'un clic désigne ────────────────────────────────────────────────── */

test("une ligne porte sa famille avec son identifiant", () => {
  const html = renderLeTableauDesDocuments({ documents: TOUS, famille: TOUTES });
  assert.match(html, new RegExp(`${OUVRIR_UN_DOCUMENT}="rapports:r-1"`));
  assert.match(html, new RegExp(`${OUVRIR_UN_DOCUMENT}="mails:f-1"`));
});

test("une marque à moitié ne désigne rien", () => {
  // Deux tables peuvent rendre le même identifiant : sans la famille on ne sait
  // pas où aller le chercher, ni quel détail dessiner (règle 5).
  assert.deepEqual(leDocumentDesigne("comptes_rendus:c-1"), { famille: "comptes_rendus", id: "c-1" });
  assert.equal(leDocumentDesigne("c-1"), null);
  assert.equal(leDocumentDesigne("comptes_rendus:"), null);
  assert.equal(leDocumentDesigne("inconnue:c-1"), null);
  // `toutes` n'est pas une famille : c'est leur réunion.
  assert.equal(leDocumentDesigne("toutes:c-1"), null);
});

test("une entrée de rail inconnue ne change pas la vue", () => {
  assert.equal(laFamilleDesignee(FAMILLE.MAIL), FAMILLE.MAIL);
  assert.equal(laFamilleDesignee(TOUTES), TOUTES);
  assert.equal(laFamilleDesignee("autre"), null);
});

/* ── Un nom trop long ─────────────────────────────────────────────────────── */

const LE_LONG = "1824_RICT_07_VERIFAS_Montholon_Mediatheque_phase_EXE_indice_C.pdf";

const AVEC_UN_LONG = lesDocumentsAnalyses({
  controles: [{
    id: "r-7", document: LE_LONG, numero_de_rapport: "RICT-07", etabli_le: "2026-04-18",
    created_at: "2026-10-05T10:00:00Z", mesures: { avis: 12, marques: 4 }
  }]
});

/**
 * **Un nom de quatre-vingts caractères poussait l'état hors de la ligne.**
 *
 * On ne pouvait plus voir si le document avait été analysé, qui est la seule
 * question qu'on se pose en arrivant sur cet écran.
 */
test("un nom long se découpe en deux, et la fin ne se rogne pas", () => {
  const html = renderLeTableauDesDocuments({ documents: AVEC_UN_LONG });

  /**
   * **Deux éléments, et c'est tout l'objet.** La feuille de style rogne le
   * premier s'il déborde, et ne touche jamais au second — où vivent l'indice et
   * l'extension, c'est-à-dire ce qui distingue deux rapports du même chantier.
   *
   * Un seul élément laisserait `text-overflow` couper la fin, et c'est
   * exactement le défaut qu'on ferme.
   */
  assert.match(html, new RegExp(`<span class="${NOM_COUPABLE}__debut">1824_RICT_07`),
    "le début du nom n'est pas dans son propre élément");
  assert.ok(html.includes(`<span class="${NOM_COUPABLE}__fin">indice_C.pdf</span>`),
    "la fin du nom n'est pas protégée dans son propre élément");

  /**
   * **Et plus aucun caractère de coupe dans le balisage.**
   *
   * Le module comptait soixante caractères et coupait toujours : dans une
   * colonne large, il rendait un nom abrégé à côté de trente centimètres de
   * vide. Le nom entier est maintenant rendu, en deux morceaux, et c'est le
   * navigateur qui décide s'il faut rogner.
   */
  const ligne = html.slice(html.indexOf("documents-analyses__ligne"));
  assert.ok(!ligne.slice(0, ligne.indexOf("data-table-shell__cell--titre") + 600).includes("…"),
    "le nom est encore coupé à l'avance, au lieu de prendre la largeur disponible");

  // Et le nom entier est dans l'infobulle.
  assert.ok(html.includes(`title="${LE_LONG}"`), "le nom entier n'est pas au survol");
});

/**
 * **Un nom court porte quand même son infobulle**, et c'est assumé : on ne sait
 * pas s'il tient, puisque c'est le navigateur qui mesure. Entre une infobulle
 * parfois redondante et un nom qu'on ne peut plus retrouver, on garde
 * l'infobulle.
 */
test("un nom court s'affiche entier, sans début vide", () => {
  const html = renderLeTableauDesDocuments({ documents: TOUS, famille: FAMILLE.CONTROLE });
  assert.ok(html.includes('title="RICT-03.pdf"'));
  assert.ok(html.includes(`<span class="${NOM_COUPABLE}__fin">RICT-03.pdf</span>`));
  /**
   * **Aucun élément de début, et non un élément vide.**
   *
   * L'épreuve cherchait `__debut"></span>` — une balise strictement vide. Un
   * début réduit à une espace la laissait passer, et la batterie de mutations
   * l'a montré : ce qu'on veut interdire est le morceau de balisage, pas son
   * contenu.
   */
  assert.ok(!html.includes(`${NOM_COUPABLE}__debut`),
    "un morceau de balisage de début sur chaque ligne courte");
});

/* ── L'état en colonne ────────────────────────────────────────────────────── */

/**
 * **L'état a sa colonne**, et c'est tout l'objet du changement : à côté du
 * titre, il se perdait dès qu'un nom était long.
 */
test("l'état est dans sa propre cellule, pas collé au titre", () => {
  const html = renderLeTableauDesDocuments({ documents: AVEC_UN_LONG });

  // Trois colonnes, et la grille les compte une seule fois : une largeur écrite
  // pour deux colonnes au-dessus de trois décale l'en-tête.
  assert.match(html, /--data-table-cols:\s*minmax\(240px,2fr\) 128px 200px/);

  /**
   * **Et l'en-tête ne les nomme pas.**
   *
   * « État » et « Ce que la lecture a valu » tombaient sur une seconde ligne —
   * la colonne du compte couvre la grille entière — et désignaient donc les
   * mauvaises colonnes. Une en-tête qui se trompe de colonne est pire qu'une
   * en-tête muette.
   */
  assert.doesNotMatch(html, /<div class="data-table-shell__col">État<\/div>/);
  assert.doesNotMatch(html, /Ce que la lecture a valu/);

  /**
   * **Ce qui décrit à gauche, ce qui agit à droite.** Collés l'un à l'autre, le
   * compte, les pastilles et le menu d'ordre se lisent comme une seule barre, et
   * l'on cherche le compte au milieu des boutons. Le nom de la classe vit dans
   * la coque, pas ici : recopié, il se renommerait un jour d'un seul côté et le
   * menu reviendrait se coller au compte sans que rien ne tombe (règle 10).
   */
  const barre = html.slice(html.indexOf(COLONNE_DU_COMPTE));
  const pousse = barre.indexOf(POUSSE_A_DROITE);
  /**
   * **`indexOf` rend `-1`, et `-1 < n` est vrai.** La première écriture de cette
   * épreuve comparait les deux rangs sans vérifier d'abord que la classe est là :
   * retirée, elle rendait `-1`, l'assertion passait, et la batterie de mutations
   * l'a montré en une fois. Un garde qu'on ne peut pas faire tomber n'en est pas
   * un (règle 4).
   */
  assert.ok(pousse >= 0, "l'en-tête ne pousse plus rien à droite");
  assert.ok(pousse < barre.indexOf("documents-analyses__ligne"),
    "le menu d'ordre n'est plus dans l'en-tête");

  // Le badge vit dans une cellule, et non dans la grille de titre.
  const ou = (quoi) => {
    const rang = html.indexOf(quoi);
    assert.ok(rang >= 0, `introuvable : ${quoi}`);
    return rang;
  };
  assert.ok(ou("issue-row-title-grid__meta") < ou("documents-analyses__badge"),
    "le badge est resté dans la grille du titre");
});

/**
 * **La classe était là, et elle ne poussait rien.**
 *
 * `margin-left:auto` seul ne suffit pas : `.issues-head-menu` fait `width:100%`
 * — c'est juste là où il est né, seul dans sa colonne —, et dans une barre en
 * flex il prend donc toute la place restante. La marge automatique n'a plus rien
 * contre quoi pousser, et le bouton reste collé aux pastilles.
 *
 * Aucun rendu ne peut le montrer : le balisage est identique dans les deux cas.
 * On lit donc la feuille, ce qu'on ne s'autorise que pour ce genre de défaut —
 * celui qui est passé en revue, en épreuve, et jusqu'à l'écran.
 */
test("la poussée à droite reprend sa largeur au menu", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const feuille = readFileSync(
    fileURLToPath(new URL("../../../style.css", import.meta.url)), "utf8");

  const debut = feuille.indexOf(`.${POUSSE_A_DROITE}{`);
  assert.ok(debut >= 0, "la classe de poussée n'est plus déclarée");

  /**
   * **Les commentaires se retirent avant de chercher les déclarations.**
   *
   * Celui de cette règle cite `width:auto` et `flex:0 0 auto` pour expliquer
   * pourquoi ils sont là — et l'épreuve les y trouvait. Elle lisait sa propre
   * documentation : on pouvait retirer les deux déclarations, elle restait
   * verte, et la batterie de mutations l'a montré en une fois. Un garde qu'on ne
   * peut pas faire tomber n'en est pas un (règle 4).
   */
  const corps = feuille.slice(debut, feuille.indexOf("}", debut));
  const regle = corps.replace(/\/\*[\s\S]*?\*\//g, "");

  assert.match(regle, /margin-left:\s*auto/);
  assert.match(regle, /width:\s*auto/,
    "le menu garde width:100% : la marge automatique n'a rien contre quoi pousser");
  assert.match(regle, /flex:\s*0 0 auto/,
    "le menu peut encore s'étirer : il recouvrirait la place qu'on veut vide");
});

/* ── Le tri ───────────────────────────────────────────────────────────────── */

test("le menu de tri porte les quatre ordres, avec leur question", () => {
  const html = renderLeTableauDesDocuments({ documents: TOUS });

  assert.match(html, /Ranger le tableau/);
  /**
   * **Les quatre libellés sont relevés du service**, et non recopiés ici. Les
   * écrire à la main ferait une épreuve qui passe au vert sur un menu où il en
   * manque un : elle vérifierait les trois qu'elle connaît.
   */
  for (const ordre of LES_TRIS_DES_DOCUMENTS) {
    assert.ok(html.includes(escapeHtml(ordre.libelle)),
      `le menu ne porte pas « ${ordre.libelle} »`);
    // La question sous le libellé : deux ordres du même axe se confondent sans
    // elle — « Analysé en dernier » et « Analysé en premier ».
    assert.ok(html.includes(escapeHtml(ordre.question)),
      `« ${ordre.libelle} » ne porte pas sa question`);
  }
});

test("le bouton du menu porte l'ordre en cours, et son sens", () => {
  // « Trier » seul obligerait à ouvrir le menu pour savoir comment c'est rangé.
  const parDefaut = renderLeTableauDesDocuments({ documents: TOUS });
  assert.match(parDefaut, /<span>Analysé en dernier<\/span>/);
  assert.match(parDefaut, /#sort-desc/, "la flèche ne dit pas le sens");

  const parDocument = renderLeTableauDesDocuments({ documents: TOUS, tri: PAR_DOCUMENT });
  assert.match(parDocument, /<span>Document le plus récent<\/span>/);

  // **La flèche monte quand le plus ancien est en tête.** Deux ordres du même
  // axe portent des libellés voisins : c'est elle qui les sépare d'un coup d'œil.
  const alEnvers = renderLeTableauDesDocuments({ documents: TOUS, tri: PAR_DOCUMENT_ANCIEN });
  assert.match(alEnvers, /<span>Document le plus ancien<\/span>/);
  assert.match(alEnvers, /#sort-asc/);
});

test("l'ordre choisi change vraiment l'ordre des lignes", () => {
  const ou = (html, quoi) => html.indexOf(quoi);

  // Par date d'analyse : le fil (1er octobre) avant le rapport (28 septembre).
  const parAnalyse = renderLeTableauDesDocuments({ documents: TOUS });
  assert.ok(ou(parAnalyse, "Reprise des enduits") < ou(parAnalyse, "RICT-03.pdf"));

  // Par date de document : le rapport (18 avril) avant le fil (2 mars).
  const parDocument = renderLeTableauDesDocuments({ documents: TOUS, tri: PAR_DOCUMENT });
  assert.ok(ou(parDocument, "RICT-03.pdf") < ou(parDocument, "Reprise des enduits"),
    "le menu de tri est une décoration : l'ordre ne change pas");

  // **Et le sens inverse remet l'autre en tête.** Sans cette épreuve, un sens
  // ignoré rendrait la même liste et le menu offrirait deux fois le même ordre.
  const alEnvers = renderLeTableauDesDocuments({ documents: TOUS, tri: PAR_DOCUMENT_ANCIEN });
  assert.ok(ou(alEnvers, "Reprise des enduits") < ou(alEnvers, "RICT-03.pdf"),
    "l'ordre inverse rend la même liste que l'ordre direct");
});

test("le tri vient après le filtre, et sa phrase compte ce qui est montré", () => {
  // Un document en attente n'a pas de date d'analyse : la phrase doit parler de
  // ce qu'on a sous les yeux, pas du chantier entier.
  // La forme d'une ligne de `versements` : un geste, et ses pièces dans
  // `avancement.pas`. Une fixture inventée aurait rendu une liste vide, et
  // l'épreuve aurait vérifié la phrase de rien.
  const avecAttente = lesDocumentsDuTableau({
    analyses: TOUS,
    enAttente: lesDocumentsEnAttente([{
      id: "v-rapports", geste: "rapports", statut: "en_cours",
      cree_le: "2026-10-05T11:00:00Z",
      avancement: { pas: [{ id: "d-9", nom: "RICT-09.pdf", ou: "attend" }] }
    }])
  });
  assert.ok(avecAttente.some((un) => un.titre === "RICT-09.pdf"),
    "le document en attente n'est pas entré dans le tableau");
  // Et il ne porte pas de date de document : on ne l'a pas encore lu.
  assert.equal(avecAttente.find((un) => un.titre === "RICT-09.pdf").quand, "");

  const html = renderLeTableauDesDocuments({ documents: avecAttente, tri: PAR_DOCUMENT });
  // Le document en attente ne porte pas de date de document : il reste à la fin,
  // et la phrase le dit — sinon le tri paraîtrait n'avoir rien trié.
  assert.match(html, /ne porte pas de date de document/);
  assert.match(html, /il reste à la fin/);
});

test("rien à expliquer sur l'ordre ne s'explique pas", () => {
  // Une phrase qui s'affiche toujours ne se lit jamais.
  const html = renderLeTableauDesDocuments({ documents: TOUS });
  assert.doesNotMatch(html, /reste à la fin/);
});
