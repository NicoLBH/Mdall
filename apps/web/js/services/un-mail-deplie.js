/**
 * Déplier un `.eml` : ce qu'un mail porte, et ce qu'on n'a pas su y lire.
 *
 * ## Le dépliage ne coûte rien, et c'est tout le sujet
 *
 * Un compte rendu est une image de page : le transcrire demande un modèle, et
 * le lecteur de CR est bâti autour de cette dépense — la mesure de fidélité,
 * les mots ajoutés, le rangement pour ne pas repayer.
 *
 * Un `.eml` est du **texte structuré** (RFC 5322). L'expéditeur, la date,
 * l'objet, les destinataires, le corps, les pièces jointes : tout y est nommé.
 * Le déplier est du décorticage, pas de la lecture. Rien à mesurer — on n'a
 * rien réécrit ; rien à ranger — le refaire est gratuit.
 *
 * ## Ce qui remplace la mesure de fidélité
 *
 * Non pas un chiffre, mais une question : **qu'est-ce qu'on n'a pas su
 * placer ?** Une date qui ne se lit pas, un corps qu'on n'a pas su décoder,
 * une pièce jointe sans nom. Ces trous-là s'affichent (règle 5) ; ils ne se
 * comptent pas pour faire un score, ils se montrent un par un.
 *
 * Trois manquements sont interdits, et chacun a son garde-fou :
 *
 * - **un mail sans `Date` n'invente pas la date du jour.** `quand` reste vide
 *   et un trou le dit. Une date inventée est pire qu'une date absente : elle
 *   ordonnera le fil (étape 3) et personne ne saura qu'elle est fausse.
 * - **un corps non décodé ne s'affiche pas vide.** `corps` vaut `null`, pas
 *   `""` : « ce message est vide » et « je n'ai pas su le lire » appellent deux
 *   gestes différents.
 * - **on prend `text/plain` quand il existe.** Prendre le HTML par défaut ferait
 *   passer de la mise en forme pour du propos — exactement ce qu'on reproche à
 *   une transcription infidèle. Quand on n'a que du HTML, `formeDuCorps` le dit.
 *
 * ## Ce que ce module ne fait pas
 *
 * Il ne sépare pas le propos de la citation — c'est l'étape 2, et elle est
 * d'une autre nature : le dépliage suit une norme, la citation suit des usages
 * de messagerie qu'aucune liste n'épuise. Il ne reconstitue pas le fil — étape
 * 3. Il ne lit pas les pièces jointes : elles sont **nommées**, et rien de plus.
 *
 * ## Il est pur
 *
 * Des octets entrent, un message sort. Aucun réseau, aucun écran, et surtout
 * aucune horloge : ce module n'appelle jamais `Date.now()`.
 */

import {
  JEU_PAR_DEFAUT, decoderLesMotsEncodes, leTexteDuCorps, texteBrutDe, texteDuHtml
} from "./decoder-un-mail.js";

/** Ce qu'on peut ne pas savoir placer, nommé pour que l'écran puisse le dire. */
export const TROU = {
  PAS_UN_MAIL: "pas-un-mail",
  SANS_EXPEDITEUR: "sans-expediteur",
  SANS_DATE: "sans-date",
  DATE_ILLISIBLE: "date-illisible",
  FUSEAU_ABSENT: "fuseau-absent",
  SANS_IDENTITE: "sans-identite",
  EN_TETE_INDECHIFFRABLE: "en-tete-indechiffrable",
  LIGNE_EGAREE: "ligne-egaree",
  SANS_CORPS: "sans-corps",
  CORPS_NON_DECODE: "corps-non-decode",
  CORPS_EN_HTML: "corps-en-html",
  JEU_DE_SECOURS: "jeu-de-secours",
  FRONTIERE_ABSENTE: "frontiere-absente",
  FRONTIERE_NON_FERMEE: "frontiere-non-fermee",
  PIECE_SANS_NOM: "piece-sans-nom"
};

/** Les deux formes sous lesquelles un corps peut arriver. */
export const FORME_DU_CORPS = { TEXTE: "texte", HTML: "html" };

const MOIS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Les fuseaux nommés que la norme obsolète autorise encore (RFC 5322 § 4.3).
 *
 * Les lettres militaires (`A` à `Z`) n'y sont pas : la norme elle-même dit
 * qu'elles ont été si souvent écrites à l'envers qu'il faut les tenir pour
 * inconnues. Les deviner reviendrait à décaler un message d'une demi-journée
 * sans le dire.
 */
const FUSEAUX = {
  ut: 0, gmt: 0, z: 0,
  est: -300, edt: -240, cst: -360, cdt: -300,
  mst: -420, mdt: -360, pst: -480, pdt: -420
};

const PREFIXES_DOBJET = /^\s*(re|ré|rép|rep|fw|fwd|tr|aw|vs|sv)\s*(\[\d+\])?\s*:\s*/i;

const texte = (valeur) => String(valeur ?? "").trim();

function unTrou(quoi, ou, detail) {
  return detail === undefined ? { quoi, ou } : { quoi, ou, detail };
}

/**
 * Séparer les en-têtes du corps, en dépliant les lignes repliées.
 *
 * Un en-tête trop long est coupé, et sa suite commence par une espace ou une
 * tabulation (RFC 5322 § 2.2.3). Déplier, c'est retirer le retour à la ligne
 * **en gardant** ce blanc : c'est lui qui sépare les deux morceaux.
 *
 * Une ligne `From ` en tête de fichier est le séparateur des boîtes `mbox`,
 * pas un en-tête : elle n'a pas de deux-points et ferait échouer la lecture.
 */
export function separerLesEnTetes(brut) {
  const lignes = String(brut ?? "").split(/\r\n|\n|\r/);
  const enTetes = [];
  let rang = 0;
  if (lignes[0] !== undefined && /^From /.test(lignes[0]) && !/^From:/.test(lignes[0])) rang = 1;
  let reconnu = false;
  let egare = false;
  for (; rang < lignes.length; rang += 1) {
    const ligne = lignes[rang];
    if (ligne === "") { rang += 1; break; }
    if (/^[ \t]/.test(ligne)) {
      if (enTetes.length === 0) { egare = true; continue; }
      enTetes[enTetes.length - 1].valeur += ligne;
      continue;
    }
    const coupure = ligne.indexOf(":");
    if (coupure <= 0) { egare = true; continue; }
    enTetes.push({ nom: ligne.slice(0, coupure).trim().toLowerCase(), valeur: ligne.slice(coupure + 1) });
    reconnu = true;
  }
  return { enTetes, corps: lignes.slice(rang).join("\n"), reconnu, egare };
}

/** La première valeur d'un en-tête, dépliée et brute. */
export function valeurDe(enTetes, nom) {
  const trouve = (enTetes ?? []).find((entete) => entete.nom === nom);
  return trouve ? trouve.valeur.trim() : "";
}

function decouperSaufEntre(valeur, separateur) {
  const morceaux = [];
  let courant = "";
  let guillemets = false;
  let chevrons = 0;
  for (const caractere of String(valeur ?? "")) {
    if (caractere === "\"") guillemets = !guillemets;
    if (!guillemets && caractere === "<") chevrons += 1;
    if (!guillemets && caractere === ">") chevrons = Math.max(0, chevrons - 1);
    if (caractere === separateur && !guillemets && chevrons === 0) {
      morceaux.push(courant);
      courant = "";
      continue;
    }
    courant += caractere;
  }
  morceaux.push(courant);
  return morceaux;
}

/**
 * Une adresse, avec le nom qui la précède quand il y en a un.
 *
 * `Ourdine Ferrand <o.ferrand@novaclim.example>` donne les deux ; une adresse
 * nue ne donne que l'adresse, et `nom` reste vide — on ne fabrique pas un nom
 * à partir de la partie gauche d'une adresse, qui n'en est pas un.
 */
export function uneAdresse(valeur) {
  const source = texte(valeur);
  if (!source) return null;
  const chevrons = source.match(/^(.*)<([^<>]*)>\s*$/s);
  const brut = chevrons ? texte(chevrons[1]) : source;
  const adresse = chevrons ? texte(chevrons[2]) : source;
  const sansGuillemets = brut.replace(/^"(.*)"$/s, "$1");
  const nom = chevrons ? decoderLesMotsEncodes(sansGuillemets).texte.trim() : "";
  return { nom, adresse };
}

/** Une liste de destinataires, découpée sans se tromper sur les virgules citées. */
export function lesAdresses(valeur) {
  return decouperSaufEntre(valeur, ",").map(uneAdresse).filter((adresse) => adresse !== null);
}

/**
 * Une date RFC 5322, ou rien.
 *
 * Écrite à la main plutôt que confiée à `new Date(…)` : le moteur accepte
 * presque n'importe quoi et rend une date quand même, ce qui est précisément
 * le comportement qu'on refuse ici. Un « 31 Feb 2026 » doit échouer, pas
 * glisser au 3 mars.
 *
 * `fuseauConnu` est faux quand le fuseau manque ou vaut `-0000`, que la norme
 * réserve à « heure locale inconnue ». L'instant reste juste ; c'est l'heure
 * qu'on affichera à côté qui ne veut rien dire.
 */
export function laDateRfc5322(valeur) {
  const sansCommentaire = String(valeur ?? "").replace(/\([^()]*\)/g, " ");
  const sansJour = sansCommentaire.replace(/^\s*[a-zA-Z]{3,}\s*,\s*/, " ").trim();
  const lu = sansJour.match(/^(\d{1,2})\s+([a-zA-Z]{3})\s+(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(\S+)?\s*$/);
  if (!lu) return { panne: TROU.DATE_ILLISIBLE };
  const mois = MOIS[lu[2].toLowerCase()];
  if (mois === undefined) return { panne: TROU.DATE_ILLISIBLE };
  const jour = Number(lu[1]);
  const brutAnnee = Number(lu[3]);
  let annee = brutAnnee;
  if (lu[3].length === 2) annee = brutAnnee < 50 ? brutAnnee + 2000 : brutAnnee + 1900;
  if (lu[3].length === 3) annee = brutAnnee + 1900;
  if (annee < 1000) return { panne: TROU.DATE_ILLISIBLE };
  const heure = Number(lu[4]);
  const minute = Number(lu[5]);
  const seconde = Number(lu[6] ?? 0);
  if (heure > 23 || minute > 59 || seconde > 60) return { panne: TROU.DATE_ILLISIBLE };
  const zone = lu[7] ?? "";
  let decalage = 0;
  let fuseauConnu = false;
  const chiffre = zone.match(/^([+-])(\d{2})(\d{2})$/);
  if (chiffre) {
    decalage = (Number(chiffre[2]) * 60 + Number(chiffre[3])) * (chiffre[1] === "-" ? -1 : 1);
    fuseauConnu = !(chiffre[1] === "-" && decalage === 0);
  } else if (zone && FUSEAUX[zone.toLowerCase()] !== undefined) {
    decalage = FUSEAUX[zone.toLowerCase()];
    fuseauConnu = true;
  } else if (zone) {
    return { panne: TROU.DATE_ILLISIBLE };
  }
  const instant = Date.UTC(annee, mois, jour, heure, minute, Math.min(seconde, 59));
  const verification = new Date(instant);
  if (verification.getUTCDate() !== jour || verification.getUTCMonth() !== mois) {
    return { panne: TROU.DATE_ILLISIBLE };
  }
  return { quand: new Date(instant - decalage * 60000).toISOString(), decalage, fuseauConnu };
}

/** L'objet débarrassé de ses `Re:`, `TR:`, `Fwd:` empilés. */
export function objetNu(objet) {
  let reste = texte(objet);
  let avant = "";
  while (reste !== avant) {
    avant = reste;
    reste = reste.replace(PREFIXES_DOBJET, "").trim();
  }
  return reste;
}

function valeurDuParametre(brut) {
  const nu = texte(brut);
  const cite = nu.match(/^"(.*)"$/s);
  return cite ? cite[1] : nu;
}

/**
 * Un en-tête de la famille `Content-…` : sa valeur, et ses paramètres.
 *
 * `text/plain; charset="utf-8"` donne `text/plain` et `{charset: "utf-8"}`.
 * La forme étendue `filename*=utf-8''%C3%89tude.pdf` (RFC 2231) est lue : un
 * nom de pièce jointe accentué voyage ainsi, et l'ignorer rendrait la pièce
 * anonyme alors que son nom est là.
 */
export function valeurEtParametres(brut) {
  const morceaux = decouperSaufEntre(brut, ";");
  const parametres = {};
  morceaux.slice(1).forEach((morceau) => {
    const coupure = morceau.indexOf("=");
    if (coupure <= 0) return;
    const nom = morceau.slice(0, coupure).trim().toLowerCase();
    const valeur = valeurDuParametre(morceau.slice(coupure + 1));
    if (!nom.endsWith("*")) {
      if (parametres[nom] === undefined) parametres[nom] = valeur;
      return;
    }
    const etendu = valeur.match(/^([^']*)'([^']*)'(.*)$/s);
    if (!etendu) return;
    let lu = etendu[3];
    try {
      lu = decodeURIComponent(etendu[3]);
    } catch {
      lu = etendu[3];
    }
    parametres[nom.slice(0, -1)] = lu;
  });
  return { valeur: texte(morceaux[0]).toLowerCase(), parametres };
}

/**
 * Découper un corps `multipart` sur sa frontière.
 *
 * Ce qui précède la première frontière est un préambule destiné aux lecteurs
 * qui ne savent pas lire MIME : il ne fait pas partie du message, et se jette.
 * Une frontière jamais fermée par `--…--` se signale : le fichier est tronqué,
 * et la dernière partie qu'on montre est peut-être incomplète.
 */
export function decouperLeMultipart(corps, frontiere) {
  if (!texte(frontiere)) return { parties: [], trouvee: false, fermee: false };
  const ouverture = `--${frontiere}`;
  const parties = [];
  let courant = null;
  let fermee = false;
  for (const ligne of String(corps ?? "").split("\n")) {
    const nu = ligne.replace(/[ \t\r]+$/, "");
    if (nu === `${ouverture}--`) {
      if (courant !== null) parties.push(courant.join("\n"));
      courant = null;
      fermee = true;
      break;
    }
    if (nu === ouverture) {
      if (courant !== null) parties.push(courant.join("\n"));
      courant = [];
      continue;
    }
    if (courant !== null) courant.push(ligne);
  }
  if (courant !== null) parties.push(courant.join("\n"));
  return { parties, trouvee: parties.length > 0 || fermee, fermee };
}

function unePartie(brut, trous, rang) {
  const { enTetes, corps } = separerLesEnTetes(brut);
  const contenu = valeurEtParametres(valeurDe(enTetes, "content-type") || "text/plain");
  const pose = valeurEtParametres(valeurDe(enTetes, "content-disposition"));
  const nom = pose.parametres.filename ?? contenu.parametres.name ?? "";
  const partie = {
    type: contenu.valeur || "text/plain",
    jeu: contenu.parametres.charset ?? "",
    encodage: valeurDe(enTetes, "content-transfer-encoding"),
    pose: pose.valeur,
    nom: texte(nom),
    corps,
    enfants: []
  };
  if (!partie.type.startsWith("multipart/")) return partie;
  const decoupe = decouperLeMultipart(corps, contenu.parametres.boundary ?? "");
  if (!decoupe.trouvee) {
    trous.push(unTrou(TROU.FRONTIERE_ABSENTE, `la partie ${rang}`, partie.type));
    return partie;
  }
  if (!decoupe.fermee) trous.push(unTrou(TROU.FRONTIERE_NON_FERMEE, `la partie ${rang}`, partie.type));
  partie.enfants = decoupe.parties.map((morceau, pas) => unePartie(morceau, trous, `${rang}.${pas + 1}`));
  return partie;
}

function estUnePiece(partie) {
  if (partie.pose === "attachment") return true;
  if (partie.nom !== "") return true;
  return !partie.type.startsWith("text/") && !partie.type.startsWith("multipart/");
}

function parcourir(partie, recolte) {
  if (partie.type.startsWith("multipart/")) {
    partie.enfants.forEach((enfant) => parcourir(enfant, recolte));
    return;
  }
  if (estUnePiece(partie)) {
    recolte.pieces.push(partie);
    return;
  }
  if (partie.type === "text/plain" && recolte.texte === null) recolte.texte = partie;
  if (partie.type === "text/html" && recolte.html === null) recolte.html = partie;
}

function lireLaPartie(partie) {
  return leTexteDuCorps({ texte: partie.corps, encodage: partie.encodage, jeu: partie.jeu || JEU_PAR_DEFAUT });
}

/**
 * Retirer les lignes vides que le format ajoute autour du propos.
 *
 * Un `.eml` finit par un saut de ligne, et une partie encodée en porte
 * souvent un de plus. Ce ne sont pas des lignes que l'auteur a tapées : les
 * garder ferait terminer chaque message du fil par un blanc, et décalerait la
 * coupure des citations à l'étape suivante.
 *
 * L'indentation d'une ligne, elle, reste : elle peut porter du sens — un
 * tableau posé à la main, un extrait recopié.
 */
function leCorpsNettoye(brut) {
  return String(brut ?? "").replace(/^[\r\n]+/, "").replace(/\s+$/, "");
}

function leCorps(recolte, trous) {
  const choisi = recolte.texte ?? recolte.html;
  if (!choisi) {
    trous.push(unTrou(TROU.SANS_CORPS, "le corps"));
    return { corps: null, formeDuCorps: "" };
  }
  const forme = choisi === recolte.texte ? FORME_DU_CORPS.TEXTE : FORME_DU_CORPS.HTML;
  const lu = lireLaPartie(choisi);
  if (lu.panne) {
    trous.push(unTrou(TROU.CORPS_NON_DECODE, "le corps", choisi.encodage || choisi.jeu || lu.panne));
    return { corps: null, formeDuCorps: forme };
  }
  if (lu.deSecours) trous.push(unTrou(TROU.JEU_DE_SECOURS, "le corps", lu.jeuAnnonce));
  if (forme === FORME_DU_CORPS.HTML) trous.push(unTrou(TROU.CORPS_EN_HTML, "le corps"));
  const corps = forme === FORME_DU_CORPS.HTML ? texteDuHtml(lu.texte) : leCorpsNettoye(lu.texte);
  return { corps, formeDuCorps: forme };
}

function lesPieces(recolte, trous) {
  return recolte.pieces.map((piece, rang) => {
    const { texte: nom, motsIndechiffrables } = decoderLesMotsEncodes(piece.nom);
    if (motsIndechiffrables > 0) trous.push(unTrou(TROU.EN_TETE_INDECHIFFRABLE, `la pièce jointe ${rang + 1}`));
    if (texte(nom) === "") trous.push(unTrou(TROU.PIECE_SANS_NOM, `la pièce jointe ${rang + 1}`, piece.type));
    return { nom: texte(nom), type: piece.type, jointeAuTexte: piece.pose === "inline" };
  });
}

function unEnTeteLu(enTetes, nom, trous) {
  const brut = valeurDe(enTetes, nom);
  const { texte: lu, motsIndechiffrables } = decoderLesMotsEncodes(brut);
  if (motsIndechiffrables > 0) trous.push(unTrou(TROU.EN_TETE_INDECHIFFRABLE, nom, brut));
  return texte(lu);
}

function lesIdentites(valeur) {
  return String(valeur ?? "").split(/\s+/).map(texte).filter((morceau) => /^<.+>$/.test(morceau));
}

function laDate(enTetes, trous) {
  const brut = valeurDe(enTetes, "date");
  if (!brut) {
    trous.push(unTrou(TROU.SANS_DATE, "l'en-tête Date"));
    return { quand: "", quandBrut: "", fuseauConnu: false };
  }
  const lue = laDateRfc5322(brut);
  if (lue.panne) {
    trous.push(unTrou(TROU.DATE_ILLISIBLE, "l'en-tête Date", brut));
    return { quand: "", quandBrut: brut, fuseauConnu: false };
  }
  if (!lue.fuseauConnu) trous.push(unTrou(TROU.FUSEAU_ABSENT, "l'en-tête Date", brut));
  return { quand: lue.quand, quandBrut: brut, fuseauConnu: lue.fuseauConnu, decalage: lue.decalage };
}

/**
 * Un `.eml` déplié : qui, quand, à qui, quoi, et ce qui manque.
 *
 * La source entre en octets — `Uint8Array` de préférence. Une chaîne déjà
 * décodée ailleurs est refusée plutôt que lue de travers : voir
 * `texteBrutDe` dans `decoder-un-mail.js`.
 */
export function unMailDeplie(source) {
  const trous = [];
  const brut = texteBrutDe(source);
  if (brut.panne) {
    return {
      qui: null, a: [], copie: [], quand: "", quandBrut: "", fuseauConnu: false,
      objet: "", objetNu: "", identite: "", enReponseA: "", chaine: [],
      corps: null, formeDuCorps: "", pieces: [],
      trous: [unTrou(TROU.PAS_UN_MAIL, "le fichier", brut.panne)]
    };
  }
  const { enTetes, reconnu, egare } = separerLesEnTetes(brut.texte);
  if (!reconnu) trous.push(unTrou(TROU.PAS_UN_MAIL, "le fichier"));
  else if (egare) trous.push(unTrou(TROU.LIGNE_EGAREE, "les en-têtes"));

  const racine = unePartie(brut.texte, trous, "1");
  const recolte = { texte: null, html: null, pieces: [] };
  parcourir(racine, recolte);

  const qui = uneAdresse(unEnTeteLu(enTetes, "from", trous));
  if (!qui) trous.push(unTrou(TROU.SANS_EXPEDITEUR, "l'en-tête From"));
  const identite = valeurDe(enTetes, "message-id");
  if (!identite) trous.push(unTrou(TROU.SANS_IDENTITE, "l'en-tête Message-ID"));
  const objet = unEnTeteLu(enTetes, "subject", trous);
  const { corps, formeDuCorps } = leCorps(recolte, trous);

  return {
    qui,
    a: lesAdresses(unEnTeteLu(enTetes, "to", trous)),
    copie: lesAdresses(unEnTeteLu(enTetes, "cc", trous)),
    ...laDate(enTetes, trous),
    objet,
    objetNu: objetNu(objet),
    identite,
    enReponseA: lesIdentites(valeurDe(enTetes, "in-reply-to"))[0] ?? "",
    chaine: lesIdentites(valeurDe(enTetes, "references")),
    corps,
    formeDuCorps,
    pieces: lesPieces(recolte, trous),
    trous
  };
}

const PHRASES = {
  [TROU.PAS_UN_MAIL]: "ce fichier n'a pas l'allure d'un mail : aucun en-tête n'y a été reconnu",
  [TROU.SANS_EXPEDITEUR]: "ce message ne dit pas qui l'a écrit",
  [TROU.SANS_DATE]: "ce message ne porte pas de date",
  [TROU.DATE_ILLISIBLE]: "la date de ce message ne se lit pas",
  [TROU.FUSEAU_ABSENT]: "la date de ce message ne dit pas son fuseau : l'heure affichée peut être décalée",
  [TROU.SANS_IDENTITE]: "ce message n'a pas d'identifiant : son rang dans le fil se devinera par sa date",
  [TROU.EN_TETE_INDECHIFFRABLE]: "un en-tête encodé n'a pas pu être lu, et s'affiche tel quel",
  [TROU.LIGNE_EGAREE]: "une ligne des en-têtes n'a pas été reconnue, et a été laissée de côté",
  [TROU.SANS_CORPS]: "aucun texte n'a été trouvé dans ce message",
  [TROU.CORPS_NON_DECODE]: "le corps de ce message n'a pas pu être décodé",
  [TROU.CORPS_EN_HTML]: "ce message n'existe qu'en HTML : son texte a été réduit, la mise en forme est perdue",
  [TROU.JEU_DE_SECOURS]: "le jeu de caractères annoncé ne tenait pas : le texte a été lu autrement",
  [TROU.FRONTIERE_ABSENTE]: "une partie annonce plusieurs morceaux, et sa frontière est introuvable",
  [TROU.FRONTIERE_NON_FERMEE]: "le message s'arrête avant sa fin : le dernier morceau est peut-être incomplet",
  [TROU.PIECE_SANS_NOM]: "une pièce jointe n'a pas de nom"
};

/**
 * La phrase d'un trou.
 *
 * Elle vit ici, et pas dans l'écran : les mêmes trous seront montrés par le
 * fil, par le relevé et par la proposition, et un même manque ne se dit pas de
 * trois façons selon l'endroit (règle 10).
 */
export function phraseDuTrou(trou) {
  const connue = PHRASES[trou?.quoi];
  if (!connue) return "quelque chose n'a pas pu être placé";
  return trou.ou ? `${connue} (${trou.ou})` : connue;
}
