/**
 * L'archive des messages — **le fondement**.
 *
 * ## Ce qu'une pièce sans son message ne vaut pas
 *
 * Le casier garde les pièces, nommées par l'empreinte de leurs octets. Un plan
 * ainsi rangé n'a pourtant **aucune provenance** : on ne sait plus qui l'a
 * envoyé, quand, en réponse à quoi, ni ce qu'il disait en l'envoyant.
 *
 * Or c'est la matière même de l'épisode — la suite des sujets, les constats,
 * leurs issues —, et **c'est la partie qu'on ne reconstitue pas après coup**.
 * Les octets d'un plan, on les aura toujours ; l'ordre dans lequel les choses
 * se sont dites, non.
 *
 * ## Deux façons de garder, et les deux servent
 *
 * **Le fichier entier**, dans le casier, sous `messages/<empreinte de ses
 * octets>` : c'est la source. Le jour où l'on saura lire mieux qu'aujourd'hui,
 * on relit sans redistribuer le carburant.
 *
 * **La forme lue**, dans une table : ce qu'on sait exploiter maintenant, et qui
 * se cherche sans télécharger cent mille fichiers.
 *
 * L'un n'est pas la copie de l'autre : le fichier est la source, la table est
 * la lecture. Quand la lecture s'améliorera, on refera la table depuis les
 * fichiers — et c'est pour cela qu'on les garde.
 *
 * ## Deux empreintes, et ce ne sont pas deux noms d'une chose
 *
 * Celle du **message** — son identité, `Message-ID` ou clé calculée — dit que
 * deux dépôts parlent du même échange. Celle de ses **octets** dit où le
 * fichier est rangé. Deux exports du même message donnent deux fichiers
 * différents et un seul message : les confondre ferait perdre l'un ou l'autre.
 *
 * ## Ce que la table ne porte pas
 *
 * Les adresses des destinataires : seulement leur nombre. Rien, aujourd'hui,
 * ne sait s'en servir — le contexte raisonne sur des rôles, l'épisode sur des
 * dates et des domaines. Et rien n'est perdu : le fichier d'origine les porte
 * toujours. Le jour où une raison de les lire apparaîtra, on écrira ce qu'on
 * en fait avant d'écrire la colonne.
 *
 * ## Il est pur
 *
 * Aucun réseau, aucun écran. Ce qui parle à Supabase vit dans
 * `larchive-des-messages-supabase.js`.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Le dossier des fichiers d'origine, dans le casier. */
const LE_DOSSIER = "messages";

/** Une empreinte a cette forme, ou ce n'en est pas une. */
const UNE_EMPREINTE = /^[0-9a-f]{64}$/;

/** Combien de messages l'écran montre au plus. La raison est celle des pièces. */
export const AU_PLUS = 200;

/**
 * Le chemin du fichier d'origine dans le casier.
 *
 * Vide quand l'empreinte n'en est pas une : mieux vaut ne rien écrire que
 * d'écrire sous un nom qu'on ne saura pas relire.
 */
export function cheminDuMessage(empreinte) {
  const nu = texte(empreinte).toLowerCase();
  return UNE_EMPREINTE.test(nu) ? `${LE_DOSSIER}/${nu}` : "";
}

/** Un instant comparable, ou `null`. Une date illisible n'est pas une date. */
function instant(valeur) {
  const quand = Date.parse(texte(valeur));
  return Number.isFinite(quand) ? quand : null;
}

/**
 * Où un message se range dans le temps.
 *
 * Ce qui n'a pas de date passe **après tout ce qui en a**, quelle qu'elle soit.
 * Le glisser au milieu lui inventerait un moment ; le cacher perdrait un
 * message (règle 5).
 */
function rangDansLeTemps(un) {
  return instant(un?.quand) ?? -Infinity;
}

/**
 * La ligne de registre d'un message.
 *
 * `versee_par` n'y figure pas : la base le pose elle-même, et un appelant qui
 * le déclarerait ferait porter un versement à quelqu'un d'autre.
 *
 * @param {object} lu ce que rend `unMsgDeplie`
 * @param {object} quoi `{empreinte, octets, fichier}` — les deux empreintes et
 *   le nom du fichier déposé
 */
export function ligneDunMessage(lu = null, { empreinte = "", octets = "", fichier = "" } = {}) {
  const quand = texte(lu?.quand);

  return {
    empreinte: texte(empreinte).toLowerCase(),
    identite: texte(lu?.identite),
    octets: texte(octets).toLowerCase(),
    fichier: texte(fichier),
    objet: texte(lu?.objet),
    qui_nom: texte(lu?.qui?.nom),
    qui_adresse: texte(lu?.qui?.adresse),
    // **On n'invente pas une date.** `null` place le message hors de la suite,
    // ce qui est exact ; une date choisie l'y placerait à un moment qu'il n'a
    // pas eu (règle 5).
    quand: instant(quand) === null ? null : quand,
    combien_de_destinataires: (Array.isArray(lu?.a) ? lu.a.length : 0)
      + (Array.isArray(lu?.copie) ? lu.copie.length : 0),
    corps: texte(lu?.corps),
    en_reponse_a: texte(lu?.enReponseA),
    chaine: Array.isArray(lu?.chaine) ? lu.chaine.map(texte).filter(Boolean) : [],
    // Les noms des trous, pas leurs phrases : la phrase vit à un seul endroit
    // (`trous-dun-mail.js`), et la recopier ici la ferait diverger (règle 10).
    trous: Array.isArray(lu?.trous) ? [...new Set(lu.trous.map((un) => texte(un?.quoi)))].filter(Boolean) : []
  };
}

/**
 * Les liens entre un message et ses pièces.
 *
 * **Ce que le message déclarait d'une pièce appartient au message.** La même
 * image est une signature ici et un document ailleurs : c'est bien sur le lien
 * que cela s'écrit, et non sur la pièce.
 *
 * Une pièce sans empreinte n'a pas de ligne : elle n'est pas dans le casier,
 * et un lien vers rien se lirait comme une pièce manquante.
 */
export function liensDesPieces(message, pieces = []) {
  const vus = new Set();

  return (Array.isArray(pieces) ? pieces : [])
    .map((une) => ({
      message: texte(message).toLowerCase(),
      piece: texte(une?.empreinte).toLowerCase(),
      nom: texte(une?.nom),
      dans_le_texte: Boolean(une?.dansLeTexte)
    }))
    .filter((un) => {
      if (!UNE_EMPREINTE.test(un.piece) || !UNE_EMPREINTE.test(un.message)) return false;
      // La même pièce deux fois dans le même message : un seul lien, sans quoi
      // la clé primaire refuserait tout le lot.
      if (vus.has(un.piece)) return false;
      vus.add(un.piece);
      return true;
    });
}

/**
 * Ce qui reste à verser, au vu de ce que l'archive porte déjà.
 *
 * Le pendant de `ceQuiResteAVerser` pour les pièces, et pour la même raison :
 * le même message est déposé deux fois, ou déjà versé la semaine dernière.
 *
 * **Les liens, eux, se reversent.** Ils sont idempotents par leur clé, et un
 * message déjà connu peut apporter une pièce qu'on n'avait pas.
 */
export function ceQuiResteAVerserDesMessages(messages = [], dejaLa = []) {
  const connus = new Set([...(dejaLa ?? [])].map((un) => texte(un).toLowerCase()));
  const vus = new Set();
  const aVerser = [];
  let dejaLaCombien = 0;
  let sansEmpreinte = 0;

  for (const un of Array.isArray(messages) ? messages : []) {
    const empreinte = texte(un?.empreinte).toLowerCase();
    if (!UNE_EMPREINTE.test(empreinte)) {
      sansEmpreinte += 1;
      continue;
    }
    if (connus.has(empreinte) || vus.has(empreinte)) {
      dejaLaCombien += 1;
      continue;
    }
    vus.add(empreinte);
    aVerser.push({ ...un, empreinte });
  }

  return { aVerser, dejaLa: dejaLaCombien, sansEmpreinte };
}

/** Ce qu'une ligne de registre devient à l'écran. */
export function unMessageArchive(ligne = null) {
  return {
    empreinte: texte(ligne?.empreinte).toLowerCase(),
    objet: texte(ligne?.objet),
    qui: texte(ligne?.qui_adresse) || texte(ligne?.qui_nom),
    quand: texte(ligne?.quand),
    fichier: texte(ligne?.fichier),
    combienDeDestinataires: Number(ligne?.combien_de_destinataires) || 0,
    signesDuCorps: texte(ligne?.corps).length,
    trous: Array.isArray(ligne?.trous) ? ligne.trous.map(texte).filter(Boolean) : [],
    // Les pièces viennent d'une autre table : l'écran les rattache, et elles
    // sont vides tant qu'on ne les a pas demandées.
    pieces: []
  };
}

/**
 * Les messages de l'archive, **dans l'ordre du temps**, du plus récent au plus
 * ancien.
 *
 * Ce qui n'a pas de date se range après ce qui en a. Le glisser au milieu lui
 * inventerait un moment ; le cacher perdrait un message.
 */
export function lesMessagesArchives(lignes = [], auPlus = AU_PLUS) {
  const lus = (Array.isArray(lignes) ? lignes : [])
    .map(unMessageArchive)
    .filter((un) => un.empreinte)
    // **Un rang, et non une soustraction de dates.** Soustraire laisserait
    // `null` se transformer en zéro — ce qui range correctement les messages
    // d'après 1970 et **par accident**. Une date antérieure passerait alors
    // derrière ce qui n'a pas de date du tout, sans que rien ne le dise.
    .sort((gauche, droite) => rangDansLeTemps(droite) - rangDansLeTemps(gauche));

  return { messages: lus.slice(0, auPlus), reste: lus.length > auPlus };
}

/**
 * Rattacher à chaque message les pièces que les liens lui donnent.
 *
 * Les pièces viennent du registre des pièces, les liens d'une autre table :
 * c'est ici, et nulle part ailleurs, que les trois se rejoignent (règle 10).
 */
export function avecLeursPieces(messages = [], liens = [], pieces = []) {
  const parEmpreinte = new Map(
    (Array.isArray(pieces) ? pieces : []).map((une) => [texte(une?.empreinte).toLowerCase(), une])
  );

  const parMessage = new Map();
  for (const un of Array.isArray(liens) ? liens : []) {
    const cle = texte(un?.message).toLowerCase();
    const piece = parEmpreinte.get(texte(un?.piece).toLowerCase());
    // Un lien vers une pièce que le registre ne connaît pas ne se dessine pas :
    // il n'y a rien à ouvrir, et une ligne vide se lirait comme une pièce
    // perdue alors que c'est un lien en avance sur son registre.
    if (!piece) continue;
    if (!parMessage.has(cle)) parMessage.set(cle, []);
    // **Le nom vient du lien**, pas du registre : c'est celui que ce message-là
    // donnait à la pièce, et c'est parfois lui qui date la révision d'un plan.
    parMessage.get(cle).push({
      ...piece,
      nom: texte(un?.nom) || piece.nom,
      // **Le rôle vient du lien, comme le nom.** La même image est une
      // signature ici et un document ailleurs : c'est ce message-là qui le dit.
      dansLeTexte: Boolean(un?.dans_le_texte)
    });
  }

  return (Array.isArray(messages) ? messages : [])
    .map((un) => ({ ...un, pieces: parMessage.get(un.empreinte) ?? [] }));
}

/**
 * Ce qu'un versement de messages a fait, en une phrase.
 *
 * Vide quand il n'y avait rien à verser.
 */
export function phraseDuVersementDesMessages(bilan = null) {
  const verses = Number(bilan?.verses) || 0;
  const dejaLa = Number(bilan?.dejaLa) || 0;
  const refuses = Number(bilan?.refuses) || 0;

  const dits = [];
  if (verses) dits.push(`${verses} ${verses > 1 ? "messages versés" : "message versé"}`);
  if (dejaLa) dits.push(`${dejaLa} ${dejaLa > 1 ? "étaient déjà là" : "était déjà là"}`);
  if (refuses) dits.push(`${refuses} ${refuses > 1 ? "n'ont pas pu être versés" : "n'a pas pu être versé"}`);

  return dits.join(" · ");
}
