/**
 * La santé des lectures, telle que la console la lit.
 *
 * ## La question posée
 *
 * > « C'est une console pour gérer l'application : il est hors de question de
 * >   passer par le terminal pour obtenir des infos. Il faut que tout soit
 * >   alimenté depuis l'architecture de l'application, avec des requêtes, des
 * >   comptages. On doit suivre la santé du système en ligne. »
 *
 * La rubrique « La justesse » ne montrait que les bilans de quatre outils de
 * banc. Sur une installation qui n'en avait jamais reçu — c'est-à-dire sur la
 * seule qui tourne —, elle affichait quatre fois « jamais lancé », et le seul
 * geste qu'elle proposait était d'ouvrir une invite de commandes.
 *
 * ## Ce que ce module ajoute, et ce qu'il ne remplace pas
 *
 * Il lit ce que le système **a déjà fait** : les trois tables de lectures, par
 * famille et par procédé. Cela répond à « est-ce que ça marche, en ce moment,
 * en vrai ? » — et cela ne demande rien à personne.
 *
 * **Cela ne remplace pas les quatre outils**, et il faut le dire plutôt que de
 * laisser croire le contraire. Compter les lectures qui ont relevé quelque
 * chose ne dit pas si elles ont relevé la **bonne** chose : pour cela il faut
 * un document dont on connaît la réponse, et c'est le jeu de référence. Les
 * deux mesures ne se remplacent pas, elles se complètent — et la première a
 * l'immense avantage d'exister sans qu'on fasse rien.
 *
 * ## Les trois cas d'un relevé, et jamais deux
 *
 * `avecReleve`, `sansReleve` et `releveInconnu`. Une lecture dont les mesures ne
 * portent pas la clé n'a pas relevé zéro : on ne sait pas ce qu'elle a relevé.
 * `Number(null)` vaut zéro, et zéro est fini — les fondre ferait lire « douze
 * lectures sans aucun point » là où l'on n'a rien mesuré (règle 5).
 *
 * ## Il est pur
 *
 * Des comptes entrent, des phrases sortent. La lecture est dans
 * `lexploitation-de-mdall-supabase.js`, l'écran dans `apps/console/js`.
 */

import { lePluriel } from "./lexploitation-de-mdall.js";
import { unTaux } from "./la-justesse-de-mdall.js";

const texte = (valeur) => String(valeur ?? "").trim();
const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);
const liste = (valeur) => (Array.isArray(valeur) ? valeur : []);

/** Sur combien de jours la console regarde par défaut. */
export const LA_FENETRE_EN_JOURS = 30;

/**
 * Les trois familles, **recopiées ici — et pourquoi c'est la bonne décision**.
 *
 * ## La règle qu'on enfreint
 *
 * Un nom vit à un seul endroit (règle 10), et celui des familles vit dans
 * `les-familles-de-document.js`. L'importer serait le réflexe juste, et c'est
 * ce que ce module faisait d'abord.
 *
 * ## La cloison qui l'interdit
 *
 * `les-familles-de-document.js` est le registre de ce qui se **lit** : il nomme
 * `cr_lectures`, `fil_lectures`, `rapport_lectures`, et de proche en proche le
 * dossier des mails. Ce sont les tables de contenu — un compte rendu entier, un
 * fil avec qui a écrit quoi à qui, le verdict d'un bureau de contrôle.
 *
 * La console **n'emporte aucun module qui les nomme**, et ce n'est pas une
 * précaution de style : c'est une cloison, éprouvée à chaque passage, et c'est
 * elle qui permet de dire qu'une console d'administration ne peut pas lire le
 * chantier de quelqu'un. L'importer ici aurait fait traverser tout le registre
 * de lecture à une page qui ne compte que des nombres.
 *
 * ## Ce qui rend la copie tenable
 *
 * Elle est **confrontée au registre** par une épreuve, du côté du site, où les
 * deux modules se chargent ensemble. Une famille ajoutée là-bas, un nom changé,
 * une icône renommée : l'épreuve tombe. Une copie qu'on ne peut pas laisser
 * diverger n'est plus tout à fait une copie.
 */
export const LES_FAMILLES_LUES = [
  { cle: "mails", nom: "Mails", icone: "mail" },
  { cle: "rapports", nom: "Bureau de Contrôle", icone: "shield" },
  { cle: "comptes_rendus", nom: "CR chantier", icone: "file" }
];

/** Une famille par sa clé, ou `null` : une ligne qu'on ne sait pas nommer sort. */
export function laFamilleNommee(cle) {
  return LES_FAMILLES_LUES.find((une) => une.cle === texte(cle)) ?? null;
}

/* ── Les deux indicateurs, et ce que chacun attrape ───────────────────────── */

/**
 * Les deux taux qu'on lit sur une famille, **et ce que chacun ne dit pas**.
 *
 * Deux, et non un : « la lecture a-t-elle rendu quelque chose ? » et « ce
 * qu'elle a rendu porte-t-il un relevé ? » sont deux pannes différentes, et
 * elles se réparent à deux endroits différents.
 *
 *   * une lecture **sans analyse gelée** est revenue vide : le tableau annonce
 *     « analysé », on clique, il n'y a rien à rouvrir. C'est une panne de la
 *     fonction de bord, ou du modèle qui n'a rien rendu ;
 *   * une lecture **avec analyse et sans relevé** a bien tourné et n'a rien
 *     trouvé : c'est une panne de la consigne, ou un document qui n'est pas ce
 *     qu'on croyait.
 */
export const LES_INDICATEURS = [
  {
    cle: "analyse",
    libelle: "Lectures qui ont rendu une analyse",
    question: "Ce qui est annoncé « analysé » se rouvre-t-il vraiment ?",
    part: (une) => nombre(une?.avecAnalyse),
    sur: (une) => nombre(une?.lectures),
    quandTout: "Toutes les lectures de cette fenêtre ont gelé leur analyse.",
    quandIlManque: "Ces lectures-là s'affichent « analysées » et ne rouvrent "
      + "rien : la fonction de bord a écrit sa ligne sans que le modèle rende "
      + "quoi que ce soit.",
    aveugle: "Une analyse gelée peut être entièrement fausse. Celui-ci dit "
      + "qu'il y a quelque chose à rouvrir, pas que c'est juste."
  },
  {
    cle: "releve",
    libelle: "Lectures qui ont relevé quelque chose",
    question: "La lecture a-t-elle trouvé des points, des avis, des prises ?",
    part: (une) => nombre(une?.avecReleve),
    // **L'assiette exclut ce qu'on n'a pas mesuré**, et c'est tout l'objet des
    // trois cas : compter « relevé inconnu » au dénominateur ferait baisser un
    // taux pour des lectures dont on ignore simplement le relevé (règle 5).
    sur: (une) => nombre(une?.avecReleve) + nombre(une?.sansReleve),
    quandTout: "Toutes les lectures mesurées ont relevé au moins un élément.",
    quandIlManque: "Ces lectures ont abouti et n'ont rien trouvé : c'est la "
      + "consigne qu'il faut regarder, ou le document qui n'est pas de la "
      + "famille sous laquelle il a été lu.",
    aveugle: "Un relevé n'est pas un bon relevé. Vingt points faux comptent "
      + "ici exactement comme vingt points justes."
  }
];

/* ── Ce qu'une famille dit d'elle-même ────────────────────────────────────── */

/**
 * Une famille, mise en forme pour l'écran.
 *
 * `null` quand la famille n'est pas au registre : une ligne qu'on ne sait pas
 * nommer s'afficherait sous une clé brute, et l'on croirait à une famille
 * nouvelle là où c'est une faute de frappe (règle 5).
 */
export function laFamilleDeLaSante(une = null) {
  const ce = laFamilleNommee(une?.famille);
  if (!ce) return null;

  const lectures = nombre(une?.lectures);

  return {
    cle: texte(une.famille),
    nom: ce.nom,
    icone: ce.icone,
    lectures,
    documents: nombre(une?.documents),
    derniere: texte(une?.derniere),
    releveInconnu: nombre(une?.releveInconnu),
    // **`lePluriel` porte déjà le nombre.** Le poser devant en ferait deux.
    dit: lePluriel(lectures, "lecture"),
    /**
     * **Les relectures, dites séparément.** Vingt lectures sur quatre documents
     * et vingt lectures sur vingt documents ne décrivent pas le même usage : la
     * première est un réglage de consigne en cours, la seconde un chantier qui
     * avance. `""` pour les fils, qui ne sont pas des lignes de Fichiers.
     */
    surCombienDeDocuments: nombre(une?.documents) > 0
      ? `sur ${lePluriel(nombre(une.documents), "document")}`
      : "",
    indicateurs: LES_INDICATEURS.map((un) => ({
      ...un,
      taux: unTaux(un.part(une), un.sur(une))
    })),
    procedes: lesProcedesDe(une)
  };
}

/**
 * Les procédés qui ont lu cette famille, du plus utilisé au moins utilisé.
 *
 * **Deux procédés en vie font deux états du système**, et non une moyenne : le
 * plus récent n'est « l'état du système » que si c'est celui qui est en service,
 * et la base ne le sait pas. L'écran les montre donc tous les deux.
 */
export function lesProcedesDe(une = null) {
  const tous = liste(une?.procedes);
  const total = tous.reduce((somme, un) => somme + nombre(un?.combien), 0);

  return tous.map((un) => ({
    procede: texte(un?.procede) || "procédé non dit",
    combien: nombre(un?.combien),
    derniere: texte(un?.derniere),
    taux: unTaux(nombre(un?.combien), total)
  }));
}

/** Les familles lues, chacune mise en forme. Celles qu'on ne nomme pas sortent. */
export function lesFamillesDeLaSante(sante = null) {
  return liste(sante?.familles).map(laFamilleDeLaSante).filter(Boolean);
}

/* ── La file : ce qui part arrive-t-il ? ──────────────────────────────────── */

/**
 * Les statuts de la file, et **ce que chacun appelle**.
 *
 * Une lecture qui n'aboutit pas n'écrit rien dans les trois tables : elle est
 * donc parfaitement invisible aux indicateurs ci-dessus. C'est la file qui la
 * porte, et c'est pour cela que les deux se lisent ensemble.
 */
export const CE_QUE_DIT_LE_STATUT = {
  en_attente: "jamais prise",
  en_cours: "prise, pas encore refermée",
  fini: "aboutie",
  echec: "arrêtée"
};

/**
 * La file, par statut, tous gestes confondus.
 *
 * **Et le taux d'aboutissement**, qui est la seule question qu'on pose à une
 * file : sur ce qui est parti, combien est arrivé ? Les lignes encore en route
 * sortent du dénominateur — elles n'ont pas échoué, elles n'ont pas fini.
 */
export function laFileDeLaSante(sante = null) {
  const parStatut = {};
  for (const une of liste(sante?.files)) {
    const statut = texte(une?.statut);
    parStatut[statut] = (parStatut[statut] ?? 0) + nombre(une?.combien);
  }

  const abouties = parStatut.fini ?? 0;
  const arretees = parStatut.echec ?? 0;

  return {
    parStatut: Object.entries(parStatut)
      .map(([statut, combien]) => ({
        statut,
        combien,
        dit: CE_QUE_DIT_LE_STATUT[statut] ?? "statut que Mdall ne nomme pas"
      }))
      .sort((gauche, droite) => droite.combien - gauche.combien),
    /**
     * `null` quand rien n'est terminé : `0/0` vaut `NaN`, et une case « NaN % »
     * se lit comme un mauvais chiffre plutôt que comme une absence de mesure.
     */
    aboutissement: unTaux(abouties, abouties + arretees),
    enRoute: (parStatut.en_attente ?? 0) + (parStatut.en_cours ?? 0)
  };
}

/* ── Ce que l'écran en dit, et ce qu'il n'en dit pas ──────────────────────── */

/**
 * La phrase de tête.
 *
 * **Jamais un pourcentage global.** Les trois familles n'ont ni le même procédé,
 * ni le même document, ni la même difficulté : un taux unique les moyennerait et
 * cacherait exactement celle qui va mal.
 */
export function ceQueLaSanteDit(sante = null, jours = LA_FENETRE_EN_JOURS) {
  const familles = lesFamillesDeLaSante(sante);
  const fenetre = `sur les ${nombre(jours) || LA_FENETRE_EN_JOURS} derniers jours`;

  if (!familles.length) {
    return `Aucun document n'a été lu ${fenetre}. Ce n'est pas un défaut : `
      + "c'est qu'il ne s'est rien passé.";
  }

  const lectures = familles.reduce((somme, une) => somme + une.lectures, 0);

  return `${lePluriel(lectures, "lecture")} ${fenetre}, `
    + `dans ${lePluriel(familles.length, "famille")}. `
    + "Chaque famille se lit séparément : elles n'ont ni le même procédé, ni la "
    + "même difficulté, et un taux unique cacherait celle qui va mal.";
}

/**
 * **Ce que ces comptages ne disent pas.**
 *
 * Sans ce paragraphe, un écran vert se lit « les documents sont bien lus », ce
 * qu'aucun de ces nombres ne dit. Ils comptent ce qui est **arrivé**, pas ce qui
 * est **juste** — et la différence est tout l'objet de cette rubrique.
 */
export const CE_QUE_LA_SANTE_NE_DIT_PAS = [
  {
    quoi: "Si ce qui a été relevé est juste",
    pourquoi: "une lecture qui invente vingt points compte ici exactement comme "
      + "une lecture qui en relève vingt vrais. Pour le savoir, il faut un "
      + "document dont on connaît déjà la réponse — c'est le jeu de référence, "
      + "plus bas."
  },
  {
    quoi: "Ce qui n'a jamais été lancé",
    pourquoi: "ces comptes portent sur les lectures qui ont eu lieu. Un chantier "
      + "dont personne n'analyse les documents n'apparaît nulle part ici, et "
      + "c'est pourtant une question d'exploitation."
  },
  {
    quoi: "Si le procédé en service est le bon",
    pourquoi: "la base enregistre par quoi chaque document a été lu, pas lequel "
      + "est censé être en service. Deux procédés qui se partagent une famille "
      + "sont montrés tous les deux, sans que rien ne dise lequel est le bon."
  }
];
