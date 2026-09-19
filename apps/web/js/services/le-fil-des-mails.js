/**
 * Remettre des mails déposés dans l'ordre où ils ont été écrits.
 *
 * ## Deux façons de savoir, et on ne les confond pas
 *
 * `In-Reply-To` et `References` sont **ce qui reconstitue le fil sans rien
 * deviner** : quand ils sont là, l'arbre de la discussion est donné. On n'a pas
 * à le reconstruire par les dates, qui mentent — un message envoyé d'un
 * téléphone mal réglé, un fuseau, un brouillon repris trois jours plus tard.
 *
 * Quand ils manquent — un mail transféré, un export d'une messagerie qui les
 * perd — on retombe sur l'ordre des dates, **et le fil le dit**. Le résultat
 * peut être exactement le même ; ce n'est pas le même degré de certitude, et
 * `ordre` porte lequel des deux a fait le travail (règle 5).
 *
 * ## Le même message n'apparaît qu'une fois
 *
 * Déposer huit mails d'une même discussion, c'est déposer huit fois le même
 * texte, imbriqué de huit façons. Un message reconnu deux fois — déposé deux
 * fois, ou déposé et cité ailleurs — n'apparaît **qu'une fois, à sa place**.
 *
 * Et quand deux exemplaires s'opposent, c'est **le déposé qui gagne** : il
 * porte sa vraie date, ses destinataires et ses pièces jointes, là où la
 * citation n'a que ce que la messagerie a bien voulu recopier.
 *
 * ## Un fil reconstitué à partir de citations n'est pas le fil
 *
 * Déposer le dernier message d'une discussion donne son texte et les citations
 * qu'il porte. L'ordre en est sûr — une citation en contient une autre, et
 * l'imbrication est une chaîne —, mais les messages eux-mêmes le sont moins :
 * leur date est celle que le bandeau affichait, leurs destinataires sont
 * perdus, leurs pièces jointes aussi. C'est moins sûr, ce n'est pas faux, et
 * `certitude` fait la différence.
 *
 * ## Il est pur
 *
 * Des `.eml` entrent, un fil sort. Aucun réseau, aucun écran, aucune horloge.
 */

import { NATURE, ceQuonCite } from "./ce-quon-cite.js";
import { TROU, unTrou } from "./trous-dun-mail.js";
import { unMailDeplie } from "./un-mail-deplie.js";

/** D'où l'on tient un message. */
export const CERTITUDE = {
  DEPOSE: "depose",
  CITE: "cite"
};

/** Ce qui a mis les messages dans cet ordre. */
export const ORDRE = {
  UNIQUE: "unique",
  CHAINE: "chaine",
  DATES: "dates",
  MELANGE: "melange"
};

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"
];

/**
 * En deçà, deux textes qui commencent pareil ne prouvent rien.
 *
 * Une citation recopie le message qu'elle cite, mais pas toujours mot pour
 * mot : la signature du cité s'y ajoute, un bandeau plus ancien traîne à la
 * fin. L'égalité stricte ne suffit donc pas, et l'on accepte qu'un texte soit
 * le début de l'autre.
 *
 * Deux garde-fous pour que ce ne soit pas une porte ouverte. Il faut **assez
 * de texte** — quelques mots communs ne font pas un message. Et il faut que le
 * plus court soit **le gros du plus long** : deux messages qui s'ouvrent tous
 * les deux sur « Bonjour, suite à notre échange de ce matin » partagent une
 * entrée en matière, pas un propos.
 */
const ASSEZ_POUR_RECONNAITRE = 30;
const LA_PART_QUIL_FAUT_PARTAGER = 0.5;

const texte = (valeur) => String(valeur ?? "").trim();

/** Un texte ramené à ce qui le distingue : la mise en page d'une citation varie, pas son propos. */
export function empreinteDuTexte(valeur) {
  return String(valeur ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Deux textes sont-ils le même message ? */
export function leMemeTexte(un, autre) {
  const gauche = empreinteDuTexte(un);
  const droite = empreinteDuTexte(autre);
  if (gauche === "" || droite === "") return false;
  if (gauche === droite) return true;
  const court = gauche.length < droite.length ? gauche : droite;
  const long = gauche.length < droite.length ? droite : gauche;
  if (!long.startsWith(court)) return false;
  return court.length >= ASSEZ_POUR_RECONNAITRE
    && court.length >= long.length * LA_PART_QUIL_FAUT_PARTAGER;
}

/**
 * Les messages qu'une citation contient, du plus récent au plus ancien.
 *
 * Chaque bandeau ouvre un message ; ce qui le suit à un niveau de plus lui
 * appartient, jusqu'à ce qu'on remonte. L'imbrication donne leur ordre, et
 * c'est le seul endroit de ce module où l'ordre ne vient ni d'une chaîne ni
 * d'une date : il vient de la façon dont les textes s'emboîtent, et il est sûr.
 */
export function lesMessagesCites(blocs) {
  const cites = [];
  (blocs ?? []).forEach((bloc, rang) => {
    if (bloc.nature !== NATURE.BANDEAU || !bloc.marque) return;
    const propos = [];
    for (let pas = rang + 1; pas < blocs.length; pas += 1) {
      const suivant = blocs[pas];
      if (suivant.profondeur <= bloc.profondeur) break;
      if (suivant.profondeur === bloc.profondeur + 1 && suivant.nature === NATURE.CITATION) {
        propos.push(suivant.texte);
      }
    }
    cites.push({
      niveauDeCitation: bloc.profondeur + 1,
      texteQui: texte(bloc.marque.texteQui),
      texteQuand: texte(bloc.marque.texteQuand),
      propos: propos.join("\n\n")
    });
  });
  return cites;
}

/** Un `.eml` déplié, puis séparé en propos et citations. */
export function unMessageDuFil(source) {
  const deplie = unMailDeplie(source);
  const decoupe = ceQuonCite(deplie.corps ?? "");
  return { deplie, decoupe, trous: [...deplie.trous, ...decoupe.trous] };
}

function unDepose(lu, rang) {
  const { deplie, decoupe } = lu;
  return {
    certitude: CERTITUDE.DEPOSE,
    depot: rang,
    identite: deplie.identite,
    enReponseA: deplie.enReponseA,
    chaine: deplie.chaine,
    qui: deplie.qui,
    a: deplie.a,
    copie: deplie.copie,
    quand: deplie.quand,
    quandTexte: deplie.quandBrut,
    decalage: deplie.decalage ?? 0,
    objet: deplie.objet,
    objetNu: deplie.objetNu,
    propos: decoupe.propos,
    cite: decoupe.cite,
    signature: decoupe.signature,
    pieces: deplie.pieces,
    niveauDeCitation: 0,
    trous: lu.trous
  };
}

function unCite(cite, porteur) {
  return {
    certitude: CERTITUDE.CITE,
    depot: porteur.depot,
    identite: "",
    enReponseA: "",
    chaine: [],
    qui: { nom: cite.texteQui, adresse: "" },
    a: [],
    copie: [],
    quand: "",
    quandTexte: cite.texteQuand,
    decalage: 0,
    objet: porteur.objetNu,
    objetNu: porteur.objetNu,
    propos: cite.propos,
    cite: "",
    signature: "",
    pieces: [],
    // Un message reconstitué n'a pas de place connue dans l'arbre des
    // réponses : on n'a pas sa chaîne. Ce qu'on sait, c'est à quelle
    // profondeur d'imbrication la citation le portait.
    profondeur: 0,
    niveauDeCitation: cite.niveauDeCitation,
    citeDans: porteur.identite,
    trous: [unTrou(TROU.MESSAGE_RECONSTITUE, "le message")]
  };
}

/**
 * Deux exemplaires déposés du même message.
 *
 * Le `Message-ID` tranche quand il est là. Sinon, on rapproche par ce qu'on a :
 * qui, quand, et le texte. Deux messages du même auteur, à la même seconde,
 * portant le même propos, sont le même message — et s'ils ne l'étaient pas,
 * rien de ce qu'un `.eml` porte ne permettrait de le voir.
 */
function memeDepose(un, autre) {
  if (un.identite && autre.identite) return un.identite === autre.identite;
  if (un.identite || autre.identite) return false;
  const memeQui = (un.qui?.adresse ?? "") === (autre.qui?.adresse ?? "");
  return memeQui && un.quand === autre.quand && leMemeTexte(un.propos, autre.propos);
}

function dedoublonnerLesDeposes(deposes) {
  const gardes = [];
  let doublons = 0;
  for (const message of deposes) {
    if (gardes.some((garde) => memeDepose(garde, message))) { doublons += 1; continue; }
    gardes.push(message);
  }
  return { gardes, doublons };
}

function leParent(message, parIdentite) {
  const pistes = [message.enReponseA, ...[...(message.chaine ?? [])].reverse()];
  for (const piste of pistes) {
    const trouve = piste ? parIdentite.get(piste) : undefined;
    if (trouve && trouve !== message) return trouve;
  }
  return null;
}

function parDate(un, autre) {
  if (un.quand && autre.quand && un.quand !== autre.quand) return un.quand < autre.quand ? -1 : 1;
  if (un.quand && !autre.quand) return -1;
  if (!un.quand && autre.quand) return 1;
  return un.depot - autre.depot;
}

/**
 * Mettre les messages déposés dans l'ordre, la chaîne d'abord.
 *
 * La descente se fait par l'arbre des réponses, et les dates ne départagent
 * que des frères — deux réponses au même message. C'est ce qui tient le cas
 * où deux messages portent la même date : leur rang vient de la chaîne, pas
 * d'une égalité qu'il faudrait arbitrer.
 *
 * Une chaîne qui boucle sur elle-même — un export abîmé, un identifiant
 * recopié — ne fait pas tourner la descente en rond : un message déjà placé
 * ne se replace pas.
 */
function ordonnerLesDeposes(deposes) {
  const parIdentite = new Map();
  for (const message of deposes) {
    if (message.identite && !parIdentite.has(message.identite)) parIdentite.set(message.identite, message);
  }
  const parents = new Map(deposes.map((message) => [message, leParent(message, parIdentite)]));
  const enfants = new Map(deposes.map((message) => [message, []]));
  const racines = [];
  for (const message of deposes) {
    const parent = parents.get(message);
    if (parent) enfants.get(parent).push(message);
    else racines.push(message);
  }

  const range = [];
  const places = new Set();
  const descendre = (message, profondeur) => {
    if (places.has(message)) return;
    places.add(message);
    range.push({ ...message, profondeur, repondA: parents.get(message)?.identite ?? "" });
    [...enfants.get(message)].sort(parDate).forEach((enfant) => descendre(enfant, profondeur + 1));
  };
  [...racines].sort(parDate).forEach((racine) => descendre(racine, 0));
  for (const message of [...deposes].sort(parDate)) descendre(message, 0);

  const relies = deposes.length - racines.length;
  let ordre = ORDRE.MELANGE;
  if (deposes.length < 2) ordre = ORDRE.UNIQUE;
  else if (relies === 0) ordre = ORDRE.DATES;
  else if (racines.length === 1) ordre = ORDRE.CHAINE;
  return { range, ordre };
}

function lesCitesRetenus(deposesRanges) {
  const retenus = [];
  for (const porteur of deposesRanges) {
    const cites = lesMessagesCites(porteur.decoupe?.blocs ?? []);
    for (const cite of [...cites].sort((un, autre) => autre.niveauDeCitation - un.niveauDeCitation)) {
      const deja = deposesRanges.some((autre) => leMemeTexte(autre.propos, cite.propos))
        || retenus.some((autre) => leMemeTexte(autre.message.propos, cite.propos));
      if (deja || texte(cite.propos) === "") continue;
      retenus.push({ avant: porteur, message: unCite(cite, porteur) });
    }
  }
  return retenus;
}

function sansLeDecoupage(porteur) {
  const message = { ...porteur };
  delete message.decoupe;
  return message;
}

/** Le premier et le dernier jour du fil : les deux bouts de ses dates, pas de son ordre. */
function lesBouts(messages) {
  const dates = messages.filter((message) => message.quand).sort((un, autre) => (un.quand < autre.quand ? -1 : 1));
  return { debut: leJourDuMessage(dates[0]), fin: leJourDuMessage(dates[dates.length - 1]) };
}

function lObjetDuFil(messages, trous) {
  const objets = messages.map((message) => texte(message.objetNu)).filter(Boolean);
  if (objets.length === 0) return "";
  const comptes = new Map();
  for (const objet of objets) comptes.set(objet, (comptes.get(objet) ?? 0) + 1);
  if (comptes.size > 1) trous.push(unTrou(TROU.FIL_A_PLUSIEURS_OBJETS, "le fil", [...comptes.keys()].join(" · ")));
  return [...comptes.entries()].sort((un, autre) => autre[1] - un[1] || objets.indexOf(un[0]) - objets.indexOf(autre[0]))[0][0];
}

/**
 * Le jour qu'un message portait pour celui qui l'a écrit.
 *
 * `quand` est un instant, ramené à l'heure de Greenwich ; le jour affiché doit
 * être celui du fuseau d'où le message est parti. Un message envoyé à 00 h 30
 * à Paris est daté de la veille à Greenwich, et le fil dirait alors une période
 * fausse d'un jour.
 */
export function leJourDuMessage(message) {
  if (message === undefined) return null;
  if (!message?.quand) return null;
  const instant = Date.parse(message.quand);
  if (Number.isNaN(instant)) return null;
  const local = new Date(instant + (message.decalage ?? 0) * 60000);
  return { annee: local.getUTCFullYear(), mois: local.getUTCMonth(), jour: local.getUTCDate() };
}

function laPeriode(un, autre) {
  if (!un || !autre) return "";
  if (un.annee === autre.annee && un.mois === autre.mois && un.jour === autre.jour) {
    return `le ${un.jour} ${MOIS[un.mois]} ${un.annee}`;
  }
  if (un.annee !== autre.annee) {
    return `du ${un.jour} ${MOIS[un.mois]} ${un.annee} au ${autre.jour} ${MOIS[autre.mois]} ${autre.annee}`;
  }
  if (un.mois !== autre.mois) {
    return `du ${un.jour} ${MOIS[un.mois]} au ${autre.jour} ${MOIS[autre.mois]} ${un.annee}`;
  }
  return `du ${un.jour} au ${autre.jour} ${MOIS[un.mois]} ${un.annee}`;
}

/**
 * Le moment d'un message, tel qu'on l'affiche.
 *
 * Trois cas, et ils ne se ressemblent pas. Un message déposé porte sa date, lue
 * dans ses en-têtes et rendue dans son fuseau. Un message reconstitué n'a que
 * le texte qu'un bandeau affichait — on le rend tel quel, sans chercher à en
 * faire une date. Et un message sans rien le dit, plutôt que de laisser un
 * blanc qu'on prendrait pour un oubli d'affichage (règle 5).
 */
export function phraseDuMoment(message) {
  const jour = leJourDuMessage(message);
  if (jour) {
    const instant = new Date(Date.parse(message.quand) + (message.decalage ?? 0) * 60000);
    const deuxChiffres = (nombre) => String(nombre).padStart(2, "0");
    return `${jour.jour} ${MOIS[jour.mois]} ${jour.annee} à ${
      deuxChiffres(instant.getUTCHours())}:${deuxChiffres(instant.getUTCMinutes())}`;
  }
  return texte(message?.quandTexte) || "sans date";
}

/**
 * Ce qui nomme un fil : son objet, son nombre de messages, sa période.
 *
 * « Étanchéité toiture · 12 messages du 3 au 19 mars 2026 ». Un compte rendu
 * s'appelle « n° 14 du 3 mars » ; un fil n'a pas de numéro, et c'est ce qu'il
 * porte qui le nomme. Les messages sans date ne font pas de période, et l'on
 * ne fabrique pas la période des autres pour autant.
 */
export function phraseDuFil(fil) {
  const morceaux = [];
  if (texte(fil?.objet)) morceaux.push(texte(fil.objet));
  const combien = fil?.messages?.length ?? 0;
  const periode = laPeriode(fil?.debut, fil?.fin);
  morceaux.push(`${combien} message${combien > 1 ? "s" : ""}${periode ? ` ${periode}` : ""}`);
  return morceaux.join(" · ");
}

/**
 * Le fil des mails déposés.
 *
 * Chaque source est un `.eml` — des octets de préférence. Rend les messages
 * dans l'ordre, ce qui les y a mis, l'objet du fil, sa période, et ce qu'on
 * n'a pas su placer.
 */
export function leFilDesMails(sources) {
  const trous = [];
  const lus = (sources ?? []).map(unMessageDuFil);
  const deposes = lus.map((lu, rang) => ({ ...unDepose(lu, rang), decoupe: lu.decoupe }));
  const { gardes, doublons } = dedoublonnerLesDeposes(deposes);
  const { range, ordre } = ordonnerLesDeposes(gardes);
  const retenus = lesCitesRetenus(range);

  const suite = [];
  for (const porteur of range) {
    for (const retenu of retenus) if (retenu.avant === porteur) suite.push(retenu.message);
    suite.push(sansLeDecoupage(porteur));
  }

  if (ordre === ORDRE.DATES) trous.push(unTrou(TROU.FIL_ORDONNE_PAR_DATES, "le fil"));
  if (ordre === ORDRE.MELANGE) trous.push(unTrou(TROU.FIL_EN_PLUSIEURS_MORCEAUX, "le fil"));
  for (const message of suite) {
    if (message.certitude === CERTITUDE.DEPOSE && !message.quand && !message.repondA) {
      trous.push(unTrou(TROU.MESSAGE_SANS_PLACE, `le message de ${texte(message.qui?.adresse) || "?"}`));
    }
  }

  const messages = suite.map((message, rang) => ({ ...message, rang: rang + 1 }));
  const bouts = lesBouts(messages);
  const fil = {
    messages,
    ordre,
    doublons,
    objet: lObjetDuFil(messages, trous),
    debut: bouts.debut,
    fin: bouts.fin,
    trous: [...trous, ...messages.flatMap((message) => message.trous)]
  };
  return { ...fil, phrase: phraseDuFil(fil) };
}
