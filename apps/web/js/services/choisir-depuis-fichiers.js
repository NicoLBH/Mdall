/**
 * Choisir un document dans l'arborescence de Fichiers.
 *
 * ## Pourquoi l'Atelier va chercher, plutôt que Fichiers apporter
 *
 * Le premier essai faisait l'inverse : un bouton dans Fichiers posait le texte
 * dans une case et envoyait vers l'Atelier. Deux défauts, et le second est
 * dirimant.
 *
 * D'abord, le geste était au mauvais endroit : on ouvre un compte rendu dans
 * Fichiers **pour le lire**, pas pour décider de le faire analyser ; la décision
 * se prend à l'Atelier, quand on est venu pour ça.
 *
 * Ensuite et surtout, **Fichiers chargeait alors l'Atelier**. Il fallait une
 * case partagée entre les deux, donc une route, donc un morceau de l'écran de
 * lecture dans les dépendances d'un écran qui ne s'en sert pas. On alourdit le
 * navigateur de tous pour un bouton que peu utiliseront. Ici, rien ne remonte :
 * l'Atelier descend chercher, et Fichiers ne sait pas qu'il existe.
 *
 * ## Ce que ce fichier décide
 *
 * Ce qui se choisit, et ce qui ne se choisit pas. Un PDF **s'affiche** dans la
 * liste, éteint, avec la raison : le masquer ferait un dossier de douze comptes
 * rendus qui paraîtrait vide, ce qui se lirait comme une panne (règle 5).
 *
 * ## Il est pur
 *
 * Des dossiers et des fichiers entrent, une liste ordonnée sort. Le réseau vit
 * dans `choisir-depuis-fichiers-supabase.js`.
 */

import { estUnFichierTexte, nomDuFichier } from "./lire-un-fichier-texte.js";
import { extensionDe } from "./fichier-a-la-main.js";
import { FAMILLE, ceQueDitLaFamille } from "./les-familles-de-document.js";
import { etatDeLaCaseDeTete } from "./selection-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'une entrée de la liste est. */
export const ENTREE = { DOSSIER: "dossier", FICHIER: "fichier" };

/**
 * Ce qu'un document déjà déposé demande pour être lu.
 *
 * **Le texte ne demande rien** : il est déjà le document. **Un PDF demande une
 * extraction**, et c'est un parcours qui coûte un appel — il est donc dit, à
 * côté du document, avant qu'on clique.
 *
 * **Un mail ne coûte rien non plus à ouvrir** : le dépliage se fait dans le
 * navigateur. Ce qui coûte est le relèvement du fil, **une fois pour tout le
 * fil** — et c'est une autre phrase, parce que c'est une autre économie : dix
 * mails choisis ne font pas dix appels.
 */
export const LECTURE_DU_CHOIX = { TEXTE: "texte", PDF: "pdf", MAIL: "mail" };

export const CE_QUE_CA_DEMANDE = {
  [LECTURE_DU_CHOIX.TEXTE]: "",
  [LECTURE_DU_CHOIX.PDF]: "Ce document sera extrait puis restitué par le modèle.",
  [LECTURE_DU_CHOIX.MAIL]: "Les mails choisis forment un fil, relevé en un seul appel."
};

/**
 * Pourquoi un fichier ne se choisit pas.
 *
 * ## Trois cas, et le troisième a été ajouté parce que le premier mentait
 *
 * Un `.eml` proposé sous « Bureau de contrôle » disait « Mdall ne sait pas lire
 * ce format ». C'était faux : Mdall le lit très bien, **ailleurs**. Une phrase
 * fausse sur un écran qui explique pourquoi quelque chose est éteint est pire
 * qu'un écran muet — on en conclut que le format n'est pas pris en charge, et
 * l'on ne cherche plus (règle 5).
 */
export const PAS_CHOISISSABLE = {
  PAS_LISIBLE: "pas-lisible",
  PAS_DE_CETTE_FAMILLE: "pas-de-cette-famille",
  RIEN_A_LIRE: "rien-a-lire"
};

export const PHRASES_DU_REFUS = {
  [PAS_CHOISISSABLE.PAS_LISIBLE]:
    "Mdall ne sait pas lire ce format.",
  [PAS_CHOISISSABLE.PAS_DE_CETTE_FAMILLE]:
    "Mdall sait lire ce format, mais pas ici : choisissez la famille qui le lit.",
  [PAS_CHOISISSABLE.RIEN_A_LIRE]:
    "Aucun contenu n'est attaché à ce document : son dépôt ne s'est pas terminé."
};

/** Les extensions d'une famille, en minuscules, telles que le registre les déclare. */
function ceQuelleAccepte(famille) {
  return texte(ceQueDitLaFamille(famille)?.accepte)
    .split(",").map((un) => un.trim().toLowerCase()).filter(Boolean);
}

/**
 * De quelle nature est ce document, indépendamment de qui le lit.
 *
 * ## Les mails d'abord, et par le registre
 *
 * Un `.zip` est un porteur de mails et rien d'autre ici ; le ranger au texte en
 * ferait un document qu'on ouvrirait comme une page. La liste de ce qui porte
 * des mails n'est pas recopiée : c'est celle de la famille, et elle vient de
 * celui qui les range (règle 10).
 *
 * **C'est la seule famille nommée ici, et c'est assumé** : les deux autres lisent
 * un document, celle-ci lit un *fil* — plusieurs documents en un seul appel. La
 * différence n'est pas de format, elle est d'économie, et c'est pour cela qu'elle
 * a sa phrase à elle.
 */
function laNatureDe(document = null) {
  const nom = nomDuFichier(document);
  if (ceQuelleAccepte(FAMILLE.MAIL).includes(extensionDe(nom))) return LECTURE_DU_CHOIX.MAIL;
  if (estUnFichierTexte(nom)) return LECTURE_DU_CHOIX.TEXTE;
  return extensionDe(nom) === ".pdf" ? LECTURE_DU_CHOIX.PDF : "";
}

/**
 * Comment ce document se lirait **pour la famille ouverte** — `""` sinon.
 *
 * ## Ce que la famille accepte vient du registre
 *
 * Il le déclare déjà, pour la zone de dépôt : une famille lit des PDF et du
 * texte, une autre des porteurs de mails. En tenir une seconde liste ici, c'est
 * accepter qu'elles divergent au premier format ajouté — et la divergence ne se
 * verrait que sur l'écran qu'on relit le moins (règle 10).
 *
 * **Sans famille, tout ce que Mdall sait lire.** C'est le cas de l'appelant qui
 * ne regarde pas une famille en particulier ; restreindre par défaut aurait
 * éteint des documents sans raison visible.
 */
export function commentCaSeLit(document = null, famille = "") {
  const nature = laNatureDe(document);
  if (!nature) return "";

  const voulue = texte(famille);
  if (!voulue) return nature;

  const accepte = ceQuelleAccepte(voulue);
  // Une famille qui n'accepte rien ne restreint rien : c'est `TOUTES`, qui est
  // la réunion des autres et non une famille qui refuserait tout.
  if (!accepte.length) return nature;

  return accepte.includes(extensionDe(nomDuFichier(document))) ? nature : "";
}

/** Pourquoi ce document ne se choisit pas — ou `""` s'il se choisit. */
export function pourquoiPasChoisissable(document = null, famille = "") {
  if (!commentCaSeLit(document, famille)) {
    // **Mdall le lit-il ailleurs ?** La distinction est tout l'intérêt : dire
    // « ce format n'est pas pris en charge » d'un `.eml` ferait renoncer.
    return laNatureDe(document)
      ? PAS_CHOISISSABLE.PAS_DE_CETTE_FAMILLE
      : PAS_CHOISISSABLE.PAS_LISIBLE;
  }

  const seau = texte(document?.storageBucket ?? document?.storage_bucket);
  const chemin = texte(document?.storagePath ?? document?.storage_path);
  return seau && chemin ? "" : PAS_CHOISISSABLE.RIEN_A_LIRE;
}

/**
 * Ce que le dossier ouvert contient, dans l'ordre où on le lit.
 *
 * **Les dossiers d'abord, puis les fichiers**, chacun par ordre alphabétique.
 * C'est l'ordre de l'onglet Fichiers : une même arborescence qui se range
 * autrement selon l'écran oblige à la relire à chaque fois.
 *
 * L'ordre est celui du **français**, et non celui des codes de caractères :
 * sans locale, on aurait « Zinguerie », « atelier », « Étanchéité » dans cet
 * ordre — majuscules d'abord, accents tout à la fin. Un dossier qui se range
 * autrement qu'à l'alphabet se cherche longtemps.
 *
 * Pas de `sensitivity` : un cassage a montré qu'aucune des valeurs possibles ne
 * changeait le résultat ici. Un réglage qu'aucune vérification ne justifie se
 * lit comme une précaution, et l'on hésite à y toucher pour rien.
 */
export function entreesDuDossier(contenu = null, famille = "") {
  // **`null` n'est pas `undefined`.** Une valeur par défaut de déstructuration
  // ne couvre que le second, et la lecture d'un dossier peut très bien rendre
  // `null` : on lèverait alors au lieu d'afficher un dossier vide.
  const { folders = [], files = [] } = contenu ?? {};
  const parNom = (a, b) => a.nom.localeCompare(b.nom, "fr");

  const dossiers = (Array.isArray(folders) ? folders : [])
    .map((dossier) => ({
      type: ENTREE.DOSSIER,
      id: texte(dossier?.id),
      nom: texte(dossier?.name) || "Dossier",
      choisissable: false,
      pourquoi: ""
    }))
    .filter((entree) => entree.id)
    .sort(parNom);

  const fichiers = (Array.isArray(files) ? files : [])
    .map((fichier) => {
      const pourquoi = pourquoiPasChoisissable(fichier, famille);
      return {
        type: ENTREE.FICHIER,
        id: texte(fichier?.id),
        nom: nomDuFichier(fichier) || "Document",
        choisissable: !pourquoi,
        pourquoi,
        // **Comment il se lira**, dit avant qu'on clique : un PDF coûtera un
        // appel, un texte non. Le découvrir après coup, sur une facture, n'est
        // pas une façon de décider (fondamental 13).
        //
        // Un document refusé garde sa nature : un `.md` dont le dépôt n'a pas
        // abouti est bien du texte, il n'y a simplement rien à lire. Le blanchir
        // aurait été une ligne qu'aucun cassage ne fait tomber — rien ne lit ce
        // champ sur une entrée qu'on ne peut pas prendre.
        lecture: commentCaSeLit(fichier, famille)
      };
    })
    .filter((entree) => entree.id)
    .sort(parNom);

  return [...dossiers, ...fichiers];
}

/**
 * Le chemin du dossier ouvert, du plus haut au plus bas.
 *
 * Le premier morceau est **Fichiers**, sans identifiant : c'est la racine, et
 * sans elle on descend dans un dossier sans plus rien pour remonter.
 */
export function cheminDuDossier(breadcrumb = []) {
  return [
    { id: "", nom: "Fichiers" },
    ...(Array.isArray(breadcrumb) ? breadcrumb : [])
      .map((dossier) => ({ id: texte(dossier?.id), nom: texte(dossier?.name) || "Dossier" }))
      .filter((dossier) => dossier.id)
  ];
}

/**
 * Ce qu'on dit d'un dossier qui n'offre rien à choisir.
 *
 * Trois situations, trois phrases. « Ce dossier est vide » quand il l'est ;
 * « rien qui se lise ici » quand il ne porte que des formats qu'on ne sait pas
 * lire — et la nuance compte, parce que la seconde invite à ouvrir un autre
 * dossier quand la première invite à en déposer. Et `""` quand il y a quelque
 * chose : on ne commente pas une liste qui se lit toute seule.
 */
export function phraseDuDossier(entrees = []) {
  const lues = Array.isArray(entrees) ? entrees : [];
  if (lues.length === 0) return "Ce dossier est vide.";

  if (lues.some((entree) => entree.choisissable)) return "";

  return lues.some((entree) => entree.type === ENTREE.DOSSIER)
    ? "Rien à lire ici. Ouvrez un dossier."
    : "Rien à lire ici.";
}

/* ── Choisir plusieurs comptes rendus d'un coup ───────────────────────────── */

/**
 * ## Pourquoi la sélection multiple existe, et à quoi elle sert vraiment
 *
 * Un chantier ne commence pas avec Mdall. Il a deux ans, trente comptes rendus
 * de réunion, et personne ne va les relire un par un dans un écran qui en prend
 * un à la fois. Sans **mise à niveau**, Mdall ne sert que les chantiers qui
 * démarrent — c'est-à-dire presque aucun.
 *
 * Et c'est aussi ce qui nourrit la prédiction : trente comptes rendus d'un
 * chantier déjà avancé, ce sont trente pas de séquence que rien d'autre ne
 * donne.
 *
 * ## Ce que la sélection ne fait pas, et ne fera jamais
 *
 * **Elle ne verse rien.** Chaque compte rendu lu donne **une proposition**, et
 * chaque proposition se signe (règle 1). Trente documents font trente
 * propositions à relire, pas trente écritures en mémoire. C'est plus long, et
 * c'est le contraire d'un défaut : une mémoire remplie par un bouton est une
 * mémoire à laquelle personne ne se fie.
 *
 * ## Le coût se dit avant, jamais après
 *
 * Trente PDF, ce sont trente extractions et trente restitutions — trente appels
 * payés. Le compte s'affiche à côté du bouton, **avant** le clic : un prix
 * qu'on découvre sur une facture n'entre jamais dans la décision
 * (fondamental 13).
 */

/**
 * La sélection, après avoir basculé une entrée.
 *
 * **Rendue neuve, jamais modifiée sur place** : l'écran compare l'ancienne à la
 * nouvelle pour savoir s'il doit redessiner, et muter l'ensemble aurait rendu
 * les deux identiques.
 *
 * Une entrée qu'on ne peut pas choisir ne se sélectionne pas, même si son
 * identifiant arrive : c'est la même règle que pour le clic simple, et la
 * laisser passer aurait mis dans la file un document dont rien n'est lisible.
 */
export function basculerLeChoix(choisis = null, id = "", entrees = []) {
  const voulu = texte(id);
  const suivant = new Set(choisis ?? []);
  if (!voulu) return suivant;

  if (suivant.has(voulu)) {
    suivant.delete(voulu);
    return suivant;
  }

  const entree = (Array.isArray(entrees) ? entrees : [])
    .find((une) => une.id === voulu && une.type === ENTREE.FICHIER);
  if (entree?.choisissable) suivant.add(voulu);
  return suivant;
}

/**
 * Tout cocher, ou tout décocher, dans le dossier ouvert.
 *
 * **Seul le dossier ouvert**, et c'est voulu : « tout » ne peut pas désigner ce
 * qu'on n'a pas lu. Un « tout cocher » qui descendrait l'arborescence
 * sélectionnerait des documents que personne n'a vus, dans des dossiers que
 * personne n'a ouverts — et le compte annoncé ne correspondrait à rien de
 * visible (règle 5).
 *
 * Ce qui est coché **ailleurs** ne bouge pas : on monte une file en descendant
 * plusieurs dossiers, et décocher ce dossier-ci ne doit pas vider le précédent.
 */
export function toutBasculer(choisis = null, entrees = [], { cocher = true } = {}) {
  const suivant = new Set(choisis ?? []);
  const ici = (Array.isArray(entrees) ? entrees : [])
    .filter((une) => une.type === ENTREE.FICHIER && une.choisissable);

  for (const une of ici) {
    if (cocher) suivant.add(une.id);
    else suivant.delete(une.id);
  }
  return suivant;
}

/**
 * Ce qui se choisit dans le dossier ouvert, par identifiant.
 *
 * **C'est ce que « tout » désigne**, et la seule liste qui compte pour la case
 * de tête : un dossier et un document illisible n'ont pas de case, donc ne
 * pèsent ni dans « tout coché » ni dans « rien coché ».
 */
export function lesChoisissables(entrees = []) {
  return (Array.isArray(entrees) ? entrees : [])
    .filter((une) => une.type === ENTREE.FICHIER && une.choisissable)
    .map((une) => une.id);
}

/**
 * L'état de la case de tête — **et `etatDeLaCaseDeTete` existait déjà**.
 *
 * Le tableau des sujets la portait, avec son troisième état et la raison
 * écrite : « une case vide sur une liste où trois sujets sont cochés dirait que
 * rien ne l'est, et l'on cliquerait pour tout cocher en croyant ne rien
 * défaire ». En écrire une seconde ici aurait refait ce défaut, puis l'aurait
 * corrigé une seconde fois, un jour, peut-être (règle 10).
 */
export function etatDeLaCaseDuDossier(choisis = null, entrees = []) {
  return etatDeLaCaseDeTete({
    selection: [...(choisis ?? [])],
    visibles: lesChoisissables(entrees)
  });
}

/**
 * Ce que la file coûtera, compté par ce qu'elle contient.
 *
 * **Deux natures, deux coûts, et il faut les séparer.** Un PDF passe par une
 * extraction et une restitution ; un document déjà écrit en texte ne passe par
 * aucune des deux. Annoncer « 30 documents » sans dire combien sont des PDF
 * laisserait croire au même prix pour trente notes de texte que pour trente
 * scans.
 *
 * @param {Set<string>|string[]} choisis
 * @param {object[]} connues toutes les entrées rencontrées, tous dossiers confondus
 * @returns {{combien: number, pdf: number, textes: number}}
 */
export function ceQueLaFileContient(choisis = null, connues = []) {
  const voulus = new Set(choisis ?? []);
  const lues = (Array.isArray(connues) ? connues : [])
    .filter((une) => une.type === ENTREE.FICHIER && voulus.has(une.id));

  return {
    combien: voulus.size,
    pdf: lues.filter((une) => une.lecture === LECTURE_DU_CHOIX.PDF).length,
    textes: lues.filter((une) => une.lecture === LECTURE_DU_CHOIX.TEXTE).length
  };
}

/**
 * Ce qu'on dit de la sélection, et de ce qu'elle coûtera.
 *
 * Vide quand rien n'est choisi : « 0 document sélectionné » est du bruit, et
 * l'absence dit mieux que le bouton n'a rien à faire.
 */
export function phraseDeLaSelection(contenu = null) {
  const combien = Number(contenu?.combien) || 0;
  if (!combien) return "";

  const pdf = Number(contenu?.pdf) || 0;
  const dits = [`${combien} ${combien > 1 ? "documents" : "document"}`];

  // **Ce qui coûte se dit, ce qui ne coûte rien se dit aussi** : « dont 0 PDF »
  // ne s'écrit pas, mais « 4 notes de texte, aucun appel » rassure.
  if (pdf) {
    dits.push(`${pdf} ${pdf > 1 ? "PDF" : "PDF"} à extraire puis restituer par le modèle`);
  }
  const textes = Number(contenu?.textes) || 0;
  if (textes && !pdf) dits.push("déjà en texte : aucun appel au modèle");
  else if (textes) dits.push(`${textes} déjà en texte`);

  return dits.join(" · ");
}

/**
 * Ce qu'on dit avant de lancer : **une proposition par compte rendu**.
 *
 * C'est la phrase qui empêche le malentendu le plus coûteux de tout l'écran.
 * « Analyser 30 documents » se lit comme « remplir la mémoire », et ce n'est pas
 * ce qui va se passer : chaque lecture donne une proposition, et chacune se
 * signe (règle 1). Le dire après aurait fait découvrir trente relectures à
 * quelqu'un qui croyait avoir fini.
 */
export function phraseDeCeQueLaFileFera(contenu = null) {
  const combien = Number(contenu?.combien) || 0;
  if (!combien) return "";

  return `${combien} ${combien > 1 ? "lectures" : "lecture"}, l'une après l'autre, et `
    + `${combien > 1 ? `${combien} propositions à signer` : "une proposition à signer"}. `
    + `Rien n'entre dans la mémoire du chantier avant que vous ne l'ayez relu.`;
}
