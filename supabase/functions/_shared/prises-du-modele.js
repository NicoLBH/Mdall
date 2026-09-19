/**
 * Ce qu'un fil de mails porte : les prises de position, relevées par le modèle.
 *
 * ## Pourquoi ce n'est pas la lecture d'un compte rendu
 *
 * Un compte rendu donne des **points** : un lot, une référence, un destinataire,
 * une échéance. Quelqu'un a déjà arbitré, et la lecture fait du secrétariat sur
 * une décision prise.
 *
 * Un fil de mails n'a rien de tout cela. Ce qu'il porte, ce sont des **prises
 * de position** — chacune attribuée, datée, et citée mot pour mot. Les faire
 * entrer dans la forme d'un point obligerait à leur inventer un lot, une
 * référence et une échéance qu'elles n'ont pas, et l'on retomberait sur un
 * écran qui n'affiche que des trous.
 *
 * ## Cinq natures, et deux qui n'y sont pas
 *
 * Le modèle en déclare cinq : constat, demande, engagement, décision, source.
 * Les deux autres — **une question restée sans réponse**, **un désaccord** — ne
 * lui sont pas demandées, et c'est délibéré : elles **se dérivent** du fil
 * déplié. Une question sans réponse est une demande qu'aucun message postérieur
 * ne reprend ; un désaccord est deux constats contraires sur la même chose.
 * Les faire déclarer par le modèle en ferait des inventions ; les calculer sur
 * le fil en fait des observations. C'est l'étape 6.
 *
 * ## Ce qu'on ne demande pas, parce qu'on le sait déjà
 *
 * **Qui parle.** L'auteur d'une prise est l'auteur du message d'où elle sort,
 * et ce nom vient des en-têtes du `.eml` — il est lu, pas deviné. Le demander
 * au modèle en ferait une seconde source, qui finirait par contredire la
 * première (règle 4), et l'on croirait la mauvaise.
 *
 * **Quand.** De même : la date d'une prise est celle de son message.
 *
 * ## La consigne vit ici, et nulle part ailleurs
 *
 * Elle décrit ce que Mdall sait lire d'une correspondance, et c'est du
 * savoir-faire. Le navigateur envoie un fil déjà déplié et reçoit des prises
 * vérifiées ; il ne voit jamais la consigne, et la clé du modèle n'entre jamais
 * chez lui.
 */

import { ECART, aplati, verifierLesCitations } from "./citation-verifiee.js";

export { ECART, PHRASES_DE_LECART } from "./citation-verifiee.js";

/**
 * Les cinq natures que le modèle déclare.
 *
 * **La liste est fermée, et la porte est plus bas.** Une nature inventée n'est
 * pas une étiquette de trop : c'est une colonne de plus à l'écran, sous
 * laquelle des prises réelles iraient se ranger sans que personne ne sache d'où
 * la colonne sort.
 */
export const NATURE = {
  CONSTAT: "constat",
  DEMANDE: "demande",
  ENGAGEMENT: "engagement",
  DECISION: "decision",
  SOURCE: "source"
};

/** Ce qu'on écarte en plus de ce que la citation écarte. */
export const ECART_DE_NATURE = "nature-inconnue";

/**
 * Pourquoi une prise n'a pas franchi la porte, dit pour un fil de mails.
 *
 * **Les phrases du garde-fou commun parlent d'un « document ».** Ici il n'y en
 * a pas : il y a des messages, et dire à quelqu'un que sa citation « ne se
 * retrouve pas dans le document » l'enverrait chercher un PDF qui n'existe
 * pas. Le motif reste le même ; c'est la phrase qui change de métier.
 *
 * Elle descend avec l'écartée, plutôt que d'être recopiée au navigateur : le
 * motif vit d'un seul côté de la cloison (règle 10).
 */
export const PHRASES_DE_LECART_DUNE_PRISE = {
  [ECART.SANS_CITATION]: "cette prise ne cite aucun message",
  [ECART.INTROUVABLE]: "cette citation ne se retrouve dans aucun message du fil",
  [ECART.VIDE]: "cette prise ne porte pas d'intitulé",
  [ECART_DE_NATURE]: "cette nature n'est pas l'une des cinq"
};

export const CONSIGNES = [
  "Tu lis un fil de courriels d'un chantier de construction et tu en relèves les prises de position. Tu ne juges rien, tu ne résumes rien, tu ne complètes rien.",
  "",
  "Le fil t'est donné message par message, numéroté. Chaque message ne porte QUE ce que son auteur a écrit : les citations des messages précédents ont déjà été retirées. Ne relève donc rien qui ne soit pas dans le message que tu cites.",
  "",
  "Une prise de position est l'une de ces cinq choses, et rien d'autre :",
  "- `constat` : un fait affirmé — « le support est humide au droit de l'acrotère ».",
  "- `demande` : quelque chose est demandé à quelqu'un — « pouvez-vous confirmer la cote avant vendredi ? ».",
  "- `engagement` : l'auteur s'engage à faire quelque chose — « nous repassons jeudi avec le géomètre ».",
  "- `decision` : quelque chose est tranché — « on part sur la variante B ». UN REFUS EN EST UNE : « non, je ne peux pas », « c'est un avis défavorable qui sera émis », « nous ne validerons pas en l'état ». Trancher contre est trancher, et c'est souvent la prise la plus importante du fil : ne la laisse jamais de côté parce qu'elle est négative.",
  "- `source` : une référence invoquée pour fonder autre chose — « d'après le DTU 43.1 § 5.2 ». La source n'est pas le constat : c'est sa provenance.",
  "",
  "Ce qui n'en est PAS, et que tu laisses de côté : les formules de politesse, les accusés de réception, les signatures, les mentions légales, les réponses automatiques, les confirmations de rendez-vous sans engagement nouveau.",
  "",
  "Un même message peut porter plusieurs prises, ou aucune. Un message qui ne dit que « bien reçu, merci » n'en porte aucune : ne force pas.",
  "",
  "Tu rends une entrée PAR MESSAGE du fil, dans l'ordre où ils te sont donnés, et tu n'en sautes AUCUN. Un message dont tu ne tires rien reçoit une entrée avec une liste de prises vide : c'est une réponse, et elle est attendue. Ne rien dire d'un message et dire qu'il ne porte rien sont deux choses différentes, et seule la seconde est une lecture.",
  "",
  "AVANT TOUT, tu déclares `sujets` : la liste des sujets dont ce fil traite, numérotés à partir de 1. Un sujet est une question débattue dans le fil — « humidité de l'acrotère », « cote du seuil », « combinaison du souffle et du vent ». Nomme-le en deux ou trois mots.",
  "Fais cette liste COURTE : un fil de chantier traite de quelques questions, pas de vingt. Si deux formulations désignent la même question, c'est UN SEUL sujet — ne le dédouble pas parce qu'un message le dit autrement qu'un autre. Une liste aussi longue que le nombre de prises ne rapproche rien, et c'est exactement ce qu'on cherche à éviter.",
  "",
  "Pour chaque entrée de message :",
  "- `message` : le numéro du message, tel qu'il est écrit dans son en-tête.",
  "- `prises` : ce qu'il porte, éventuellement vide.",
  "",
  "Pour chaque prise :",
  "- `nature` : l'une des cinq ci-dessus.",
  "- `intitule` : ce qui est pris comme position, en une ligne, DANS LES MOTS DE L'AUTEUR. Ne reformule pas, n'ajoute pas de verbe d'action qui n'y est pas.",
  "- `citation` : la phrase du message, RECOPIÉE MOT POUR MOT. Elle sera recherchée dans le texte de ce message : si elle ne s'y retrouve pas, la prise sera écartée.",
  "- `sujet` : LE NUMÉRO d'un sujet de la liste que tu as déclarée. Pas un libellé : un numéro de cette liste. Null si aucun ne convient — mieux vaut null qu'un rattachement forcé.",
  "- `pour_qui` : à qui c'est demandé, tel qu'écrit — un nom, une entreprise, « la MOE ». Null pour un constat ou une source.",
  "- `echeance` : le délai annoncé, TEL QU'ÉCRIT — « avant vendredi », « jeudi », « sous 15 jours ». Ne le convertis pas en date. Null s'il n'y en a pas.",
  "- `repond_a` : le NUMÉRO DU MESSAGE auquel cette prise répond, quand elle répond à quelque chose qui y a été dit — une question, une demande, une position. Un numéro STRICTEMENT INFÉRIEUR à celui du message où tu la relèves. Null quand elle n'est la réponse de rien. Ne le mets QUE si la prise reprend vraiment ce qui a été dit là : ce numéro sera vérifié, et un renvoi inventé fait disparaître une question restée sans réponse, ce qui est le pire résultat possible.",
  "",
  "N'invente JAMAIS l'auteur ni la date d'une prise : ils sont déjà connus, ils viennent des en-têtes du message. On ne te les demande pas."
].join("\n");

/**
 * Ce qu'on demande au modèle de rendre.
 *
 * **Des messages, qui portent des prises — et non une liste de prises.** La
 * différence n'est pas cosmétique, et un fil réel l'a payée : sur six
 * messages, le modèle en a sauté deux, et rien dans sa réponse ne le disait.
 * Une liste plate ne distingue pas « ce message ne porte aucune prise » de
 * « je n'ai rien dit de ce message » ; le lecteur, lui, lit les deux comme la
 * première, et croit qu'un message où le désaccord se jouait était vide
 * (règle 5).
 *
 * Ici, une liste vide est une **déclaration**, et une entrée absente se voit.
 *
 * ## Et les sujets sont déclarés avant d'être employés
 *
 * **Le libellé d'une prise était un texte libre, et il l'écrivait à chaque
 * fois.** Sur un fil réel : **28 libellés pour 39 prises**, là où une lecture
 * humaine en compte dix. « rapport Avg/Ag » et « étude sismique verticale »
 * désignent la même question et ne partagent aucun mot ; aucune règle sur les
 * lettres ne les rapprochera — celle qu'on a rapproche quatre paires sur la
 * vingtaine qu'il faudrait, et la resserrer n'y change rien.
 *
 * Le modèle déclare donc **la liste des sujets du fil, une fois**, et chaque
 * prise **pointe un numéro** de cette liste. Deux prises sur le même sujet le
 * sont alors par construction et non par comparaison de chaînes.
 *
 * **Et le numéro se vérifie**, comme le renvoi : un sujet qui n'est pas dans la
 * liste déclarée est écarté et compté. La prise reste — elle est réelle —, mais
 * elle perd son sujet, ce qui la range en « on ne sait pas » plutôt qu'en une
 * réponse inventée (règle 5).
 */
export const SCHEMA_DES_PRISES = {
  name: "prises_du_fil",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      /**
       * Les sujets du fil, déclarés une fois pour toutes.
       *
       * Une prise ne porte plus un libellé qu'elle invente : elle pointe un
       * numéro de cette liste.
       */
      sujets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            numero: { type: "integer" },
            intitule: { type: "string" }
          },
          required: ["numero", "intitule"]
        }
      },
      messages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            message: { type: "integer" },
            prises: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  nature: { type: "string", enum: Object.values(NATURE) },
                  intitule: { type: "string" },
                  citation: { type: "string" },
                  sujet: { anyOf: [{ type: "integer" }, { type: "null" }] },
                  pour_qui: { anyOf: [{ type: "string" }, { type: "null" }] },
                  echeance: { anyOf: [{ type: "string" }, { type: "null" }] },
                  repond_a: { anyOf: [{ type: "integer" }, { type: "null" }] }
                },
                required: ["nature", "intitule", "citation", "sujet", "pour_qui", "echeance",
                  "repond_a"]
              }
            }
          },
          required: ["message", "prises"]
        }
      }
    },
    required: ["sujets", "messages"]
  }
};

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les sujets que le modèle a déclarés pour ce fil.
 *
 * **On nettoie la liste avant de s'en servir**, et chaque écart répare un
 * défaut qui, sinon, passerait inaperçu :
 *
 * - un numéro illisible ne devient pas zéro — `Number(null)` vaut zéro, et la
 *   liste aurait alors un « sujet 0 » que personne n'a déclaré ;
 * - un intitulé vide ne fait pas un sujet : une prise rattachée à lui aurait un
 *   sujet sans nom, ce qui se lit à l'écran comme une absence de sujet tout en
 *   comptant comme une identité — deux prises « sans nom » seraient alors le
 *   même sujet ;
 * - **le premier gagne** quand deux entrées portent le même numéro. Le dernier
 *   ferait changer le sens des prises déjà rattachées au même numéro plus haut
 *   dans la réponse, ce qui est la seule des deux façons de se tromper en
 *   silence.
 *
 * Une réponse sans liste rend une liste vide : aucun rattachement ne tiendra,
 * et c'est exactement ce qu'on veut dire.
 */
export function lesSujetsDuFil(rendu) {
  const declares = Array.isArray(rendu?.sujets) ? rendu.sujets : [];
  const vus = new Map();

  for (const sujet of declares) {
    const numero = sujet?.numero;
    if (!Number.isFinite(numero)) continue;
    const intitule = texte(sujet?.intitule);
    if (!intitule) continue;
    if (vus.has(numero)) continue;
    vus.set(numero, { numero, intitule });
  }

  return [...vus.values()];
}

/**
 * Le sujet d'une prise, une fois confronté à la liste déclarée.
 *
 * Rend l'intitulé du sujet visé, ou `null`. **On ne rattrape rien** : un numéro
 * qui n'a pas été déclaré ne dit pas ce qu'il visait, et le plus proche serait
 * un sujet prêté à quelqu'un qui ne l'a pas nommé.
 */
export function leSujetVerifie(prise, parNumero) {
  const vise = prise?.sujet;
  if (!Number.isFinite(vise)) return null;
  return parNumero.get(vise) ?? null;
}

/**
 * Le renvoi d'une prise vers le message auquel elle répond, s'il tient.
 *
 * **On ne croit pas le modèle sur parole.** Le rang doit exister dans le fil et
 * être **strictement antérieur** à celui où la prise est relevée : une réponse
 * ne précède pas sa question. Un renvoi qui ne tient pas est écarté et compté —
 * il ne se corrige pas, parce qu'on ne sait pas ce qu'il visait.
 *
 * L'enjeu n'est pas cosmétique : un renvoi inventé fait passer une question
 * restée sans réponse pour une question répondue, et c'est l'apport principal
 * du procédé qui disparaîtrait en silence.
 */
export function leRenvoiVerifie(prise, rangsConnus) {
  const vise = prise?.repond_a;
  if (!Number.isFinite(vise)) return null;
  if (!rangsConnus.has(vise)) return null;

  const dOu = Number(prise?.message);
  if (!Number.isFinite(dOu) || vise >= dOu) return null;
  return vise;
}

/**
 * Le fil tel qu'on le donne à lire.
 *
 * **Chaque message ne porte que son propre texte.** C'est ce que les étapes 2
 * et 3 ont gagné, et c'est ce qui rend cette lecture-ci bon marché : déposer
 * huit mails d'une discussion enverrait sinon huit fois le même texte, imbriqué
 * de huit façons — on paierait huit fois pour le lire, et le modèle relèverait
 * huit fois le même constat en l'attribuant à huit personnes.
 *
 * L'auteur et la date sont donnés **en en-tête de chaque message, pas dans le
 * texte à citer** : le modèle doit s'en servir pour comprendre, jamais les
 * recopier comme s'il les avait lus.
 */
export function filEnTexte(messages = [], { maxCaracteres = 120000 } = {}) {
  const morceaux = [];
  let total = 0;

  for (const message of Array.isArray(messages) ? messages : []) {
    const propos = texte(message?.propos);
    if (!propos) continue;

    const rang = Number(message?.rang);
    const qui = texte(message?.qui) || "auteur inconnu";
    const quand = texte(message?.quand) || "date inconnue";
    const bloc = `\n=== MESSAGE ${Number.isFinite(rang) ? rang : "?"} — ${qui} — ${quand} ===\n${propos}`;
    if (total + bloc.length > maxCaracteres) break;

    morceaux.push(bloc);
    total += bloc.length;
  }

  return morceaux.join("\n");
}

/** Le fil, dans la forme que le garde-fou des citations attend. */
export function messagesEnPages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => texte(message?.propos))
    .map((message) => ({ page: Number(message?.rang), text: texte(message.propos) }));
}

/**
 * Ce que le modèle a rendu, message par message — et ce dont il n'a rien dit.
 *
 * **C'est ici que l'omission cesse d'être silencieuse.** Le schéma demande une
 * entrée par message ; cette fonction met les prises à plat pour la suite, et
 * garde de côté les deux choses qu'une liste plate ne pouvait pas dire :
 *
 * - `muets` : les messages dont le modèle déclare ne rien tirer. C'est une
 *   lecture, et elle vaut ce qu'elle vaut — mais c'est une réponse.
 * - `oublies` : les messages dont il n'a rien dit du tout. Ce n'en est pas
 *   une, et les confondre avec les premiers ferait passer un trou pour un
 *   constat de vide (règle 5).
 *
 * `parMessage` dit si la réponse avait bien cette forme. Une réponse qui ne
 * l'a pas — un modèle qui retombe sur l'ancienne liste plate — est lue quand
 * même, parce que la jeter perdrait des prises réelles ; mais alors on ne sait
 * ni qui est muet ni qui est oublié, et on le dit plutôt que de compter zéro.
 */
export function lesMessagesRendus(rendu, messages = []) {
  const attendus = (Array.isArray(messages) ? messages : [])
    .filter((message) => texte(message?.propos))
    .map((message) => Number(message?.rang))
    .filter((rang) => Number.isFinite(rang));

  const groupes = Array.isArray(rendu?.messages) ? rendu.messages : null;

  if (!groupes) {
    const plates = Array.isArray(rendu?.prises) ? rendu.prises : [];
    return { prises: plates, muets: null, oublies: null, parMessage: false };
  }

  const prises = [];
  const vus = new Set();
  const muets = [];

  for (const groupe of groupes) {
    // **On lit le nombre, on ne le fabrique pas.** `Number(null)` vaut zéro,
    // et un groupe sans numéro deviendrait ainsi « le message 0 » : un message
    // qui n'existe pas, déclaré lu.
    const rang = groupe?.message;
    const lisible = Number.isFinite(rang);
    if (lisible) vus.add(rang);

    const lot = Array.isArray(groupe?.prises) ? groupe.prises : [];
    // **Le rang du groupe descend dans chaque prise.** C'est le seul endroit
    // où il est écrit, et c'est de lui que viendront l'auteur et la date.
    //
    // **Un numéro illisible ne fait pas perdre les prises du groupe.** La
    // porte cherchera leur citation dans tout le fil et les rattachera au
    // message où elle se trouve : jeter une prise réelle parce que son
    // en-tête est abîmé coûterait plus cher que de la replacer. Ce que le
    // groupe perd, c'est le droit de dire qu'un message a été lu.
    for (const prise of lot) prises.push({ ...prise, message: lisible ? rang : null });
    if (lisible && !lot.length) muets.push(rang);
  }

  return {
    prises,
    muets,
    oublies: attendus.filter((rang) => !vus.has(rang)),
    parMessage: true
  };
}

/**
 * Ce qui a été écarté, dit en clair.
 *
 * **Un compte ne suffit pas.** « 3 écartées » ne dit pas si le garde-fou a
 * protégé — trois inventions jetées — ou s'il a jeté trois prises réelles dont
 * la citation était mal recopiée. Ce sont deux défauts opposés, et l'un se
 * répare en resserrant la porte, l'autre en la desserrant. Sans l'intitulé et
 * la citation refusée, on ne peut pas savoir lequel on a.
 *
 * Ce qui sort ici est du texte du fil de celui qui l'a déposé, ou une
 * invention du modèle sur son fil : rien de la consigne, rien du serveur.
 */
export function ecarteesAuFormatDuMoteur(ecartees = []) {
  return (Array.isArray(ecartees) ? ecartees : []).map(({ prise, motif }) => ({
    motif: texte(motif),
    /** Le motif en clair, dit pour un fil et non pour un document. */
    phrase: PHRASES_DE_LECART_DUNE_PRISE[texte(motif)] ?? "",
    nature: texte(prise?.nature),
    intitule: texte(prise?.intitule),
    /** La phrase que le modèle a donnée, et qui ne s'est pas retrouvée. */
    citation: texte(prise?.citation),
    message: Number(prise?.message) || null
  }));
}

/**
 * Ce que le modèle a rendu, confronté au fil.
 *
 * Deux portes, dans cet ordre.
 *
 * **La nature d'abord.** La liste est fermée ; une nature hors liste ne se
 * corrige pas, elle s'écarte. La vérifier après la citation ferait passer par
 * la porte coûteuse une ligne qu'on va jeter de toute façon.
 *
 * **La citation ensuite**, et c'est le garde-fou qui compte. Un modèle peut
 * inventer une prise entière : « le support est humide au droit de l'acrotère »
 * pourrait figurer dans n'importe quel fil d'étanchéité, et rien dans sa
 * réponse ne le distinguerait d'une vraie. Ce qui l'en distingue, c'est le
 * message.
 *
 * La recherche se fait d'abord dans le message annoncé, puis dans le fil
 * entier : une prise réelle attribuée au mauvais message ne doit pas se perdre,
 * mais **elle change d'auteur**, ce qui n'est pas anodin. C'est compté.
 */
export function verifierLesPrises({ prises = [], messages = [], sujets = [] } = {}) {
  const connues = new Set(Object.values(NATURE));
  const recevables = [];
  const horsListe = [];

  for (const prise of Array.isArray(prises) ? prises : []) {
    if (connues.has(texte(prise?.nature))) recevables.push(prise);
    else horsListe.push({ prise, motif: ECART_DE_NATURE });
  }

  // **Le rang du message devient une page.** Le garde-fou commun cherche
  // `page` ; sans cette traduction il ne trouve jamais le champ, la
  // vérification stricte ne se fait pas, et *toutes* les prises ressortent
  // « rattachées ailleurs » — un avertissement sur chaque ligne, donc un
  // avertissement qu'on cesse de lire, et surtout plus aucun moyen de
  // repérer celle qui l'est vraiment.
  const { retenus, ecartes, pagesCorrigees } = verifierLesCitations({
    lignes: recevables.map((prise) => ({ ...prise, page: Number(prise?.message) })),
    pages: messagesEnPages(messages),
    estVide: (ligne) => !texte(ligne?.intitule)
  });

  // **Les renvois se confrontent au fil.** Un rang qui n'existe pas, ou qui
  // n'est pas antérieur, ne dit rien de ce qu'il visait : il s'écarte.
  const rangsConnus = new Set(
    (Array.isArray(messages) ? messages : [])
      .filter((message) => texte(message?.propos))
      .map((message) => Number(message?.rang))
      .filter((rang) => Number.isFinite(rang))
  );
  let renvoisEcartes = 0;

  // **Les sujets se confrontent à la liste déclarée**, pour la même raison que
  // les renvois se confrontent au fil : un numéro que personne n'a déclaré
  // rangerait la prise sous un sujet inventé, et deux prises pourraient s'y
  // retrouver ensemble sans que rien ne les rapproche vraiment.
  const parNumero = new Map(
    (Array.isArray(sujets) ? sujets : []).map((sujet) => [sujet?.numero, texte(sujet?.intitule)])
  );
  let sujetsEcartes = 0;

  return {
    // **Le rang retenu est celui où la citation se trouve**, pas celui que le
    // modèle a annoncé : c'est de lui que viendront l'auteur et la date, et
    // garder l'annonce attribuerait la prise à quelqu'un qui ne l'a pas écrite.
    retenues: retenus.map((ligne) => {
      const rendue = { ...ligne, message: Number(ligne?.page) || null };
      const renvoi = leRenvoiVerifie(rendue, rangsConnus);
      if (rendue.repond_a !== null && rendue.repond_a !== undefined && renvoi === null) {
        renvoisEcartes += 1;
      }

      const sujet = leSujetVerifie(rendue, parNumero);
      if (Number.isFinite(rendue.sujet) && sujet === null) sujetsEcartes += 1;

      // **Le libellé descend ici, et nulle part ailleurs.** Tout ce qui suit —
      // l'écran, la dérivation, l'export — lit `porte_sur` comme avant ; ce qui
      // a changé est d'où il vient, et il vient maintenant d'une liste fermée.
      return { ...rendue, repond_a: renvoi, porte_sur: sujet };
    }),
    ecartees: [...horsListe, ...ecartes.map(({ ligne, motif }) => ({ prise: ligne, motif }))],
    messagesCorriges: pagesCorrigees,
    /** Combien de renvois ne tenaient pas devant le fil. Se dit, ne se cache pas. */
    renvoisEcartes,
    /** Combien de prises visaient un sujet que le modèle n'avait pas déclaré. */
    sujetsEcartes
  };
}

/**
 * Un texte réduit à ses mots, bordé d'espaces.
 *
 * **Bordé, pour que `includes` compare des mots et non des lettres.** C'est le
 * piège que ce dépôt a déjà payé ailleurs : « vent » se lit dans
 * « ventilation », et une comparaison de chaînes rapproche alors deux choses
 * qui n'ont rien à voir. Avec une espace de chaque côté, `includes` ne peut
 * plus tomber au milieu d'un mot.
 *
 * La ponctuation s'efface aussi, et c'est nécessaire ici : la phrase est
 * découpée par nous, la citation est recopiée par le modèle, et l'une des deux
 * porte souvent un point ou une virgule que l'autre n'a pas.
 */
function enMots(valeur) {
  const nu = aplati(valeur).replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
  return nu ? ` ${nu} ` : "";
}

/** Combien de mots un texte ainsi réduit porte. */
const combienDeMots = (borde) => (borde ? borde.trim().split(" ").length : 0);

/**
 * Le plancher sous lequel une phrase est trop courte pour se reconnaître dans
 * une citation.
 *
 * « Non. » est un mot, et le mot « non » se lit dans presque toutes les
 * citations d'un fil où l'on discute. Une phrase d'un seul mot serait donc
 * déclarée reprise par accident — et ce serait précisément celle qu'il fallait
 * montrer. Sous ce plancher, la phrase paraît dans la liste : **montrer une
 * phrase de trop coûte moins cher qu'en cacher une.**
 */
const ASSEZ_DE_MOTS_POUR_SE_RECONNAITRE = 2;

/**
 * Le message, coupé en phrases, dans les mots de son auteur.
 *
 * On coupe aux retours à la ligne et après un point, un point d'exclamation ou
 * d'interrogation. **Une abréviation coupe donc une phrase en deux** — « M. »,
 * « n° 5. » —, et le morceau paraîtra seul dans la liste. C'est le sens de
 * l'erreur qu'on choisit : un morceau de trop se lit, une phrase cachée ne se
 * lit pas.
 */
export function lesPhrasesDunMessage(propos) {
  return String(propos ?? "")
    .split(/\n+/)
    .flatMap((ligne) => ligne.split(/(?<=[.!?…])\s+/))
    .map((phrase) => phrase.trim())
    .filter(Boolean);
}

/**
 * Les phrases d'un message qu'aucune citation ne reprend.
 *
 * ## Pourquoi un pourcentage ne suffisait pas
 *
 * L'étape précédente a appris à dire qu'un message était **peu** relevé : 31 %
 * quand les autres étaient à 51 %. Elle disait où regarder ; elle ne montrait
 * rien. Or ce qui manquait à ce message-là était « Non, je ne peux pas » et
 * « c'est un avis défavorable qui sera émis » — les deux phrases les plus
 * lourdes du fil. Pour les voir, il fallait rouvrir le mail et relire à côté du
 * relevé, ce qui est exactement le geste que l'outil devait épargner.
 *
 * **Ici, ce que le modèle n'a pas pris se lit.** Sans modèle, sans appel, sans
 * jugement : le texte du message moins ce que les citations reprennent. Le
 * lecteur décide lui-même si l'omission compte — et il peut décider sans nous
 * (fondamental 13).
 *
 * ## Ce que la liste contient, et qu'on ne filtre pas
 *
 * La politesse, la signature, les salutations y sont. **On ne les retire pas**,
 * et ce n'est pas une paresse : les retirer demanderait un lexique de ce qui ne
 * compte pas, et ce lexique déciderait à la place du lecteur — c'est ainsi
 * qu'on cache une phrase qui comptait. Cent pour cent de reprise serait un
 * mauvais signe (voir `laPartRelevee`) ; une liste vide ici le serait aussi.
 */
export function lesPhrasesNonReprises(propos, citations = []) {
  const reprises = (Array.isArray(citations) ? citations : [])
    .map((citation) => enMots(citation))
    .filter(Boolean);

  return lesPhrasesDunMessage(propos).filter((phrase) => {
    const lue = enMots(phrase);
    if (!lue) return false;

    // **Trop courte pour se reconnaître, donc montrée.** Voir le plancher.
    if (combienDeMots(lue) < ASSEZ_DE_MOTS_POUR_SE_RECONNAITRE) return true;

    // Reprise dans les deux sens : la citation peut tenir dans la phrase — le
    // modèle n'en a cité qu'un morceau — comme la phrase dans la citation, quand
    // notre découpe a coupé là où lui ne coupait pas.
    return !reprises.some((citation) => citation.includes(lue) || lue.includes(citation));
  });
}

/**
 * Quelle part de chaque message une citation reprend.
 *
 * ## Pourquoi cela se compte
 *
 * L'étape précédente a appris à dire qu'un message n'avait **rien** donné.
 * Elle ne dit rien d'un message qui a donné **peu** — et c'est là qu'un fil
 * réel a fait disparaître ce qui comptait le plus : sur un échange de
 * chantier, le message où le bureau de contrôle répondait « Non, je ne peux
 * pas » et annonçait « c'est un avis défavorable qui sera émis » a rendu trois
 * prises, donc il n'était pas muet — et ces deux phrases-là n'y étaient pas.
 * **Couvert à 31 %, quand les autres l'étaient à 51 %.**
 *
 * ## Ce que le compte vaut, et ce qu'il ne vaut pas
 *
 * Ce n'est **pas** un taux à faire monter : un message porte des formules de
 * politesse et une signature, qu'aucune prise ne doit reprendre. Cent pour
 * cent serait un mauvais signe, pas un bon.
 *
 * Ce qu'il permet, c'est la **comparaison** — entre les messages d'un même fil,
 * où la politesse pèse à peu près pareil. Aucun seuil n'est posé ici : en
 * inventer un ferait dire au chiffre plus qu'il ne sait (règle 5). On le rend,
 * et le lecteur juge.
 *
 * Il se calcule ici parce que c'est ici que vit l'aplatissement qui sert déjà
 * à vérifier les citations : le refaire au navigateur en ferait une seconde
 * version, qui finirait par ne plus dire la même chose (règle 4).
 */
export function laPartRelevee(messages = [], retenues = []) {
  const prisesDuRang = new Map();
  for (const prise of Array.isArray(retenues) ? retenues : []) {
    const rang = Number(prise?.message);
    if (!Number.isFinite(rang)) continue;
    if (!prisesDuRang.has(rang)) prisesDuRang.set(rang, []);
    prisesDuRang.get(rang).push(aplati(prise?.citation));
  }

  return (Array.isArray(messages) ? messages : [])
    .filter((message) => texte(message?.propos))
    .map((message) => {
      const rang = Number(message?.rang);
      const propos = aplati(message.propos);
      // **Une citation ne compte que si elle se retrouve**, et chacune une
      // seule fois : deux prises tirées de la même phrase ne couvrent pas deux
      // fois le message.
      const vues = new Set();
      let couverts = 0;
      for (const citation of prisesDuRang.get(rang) ?? []) {
        if (!citation || vues.has(citation) || !propos.includes(citation)) continue;
        vues.add(citation);
        couverts += citation.length;
      }
      return {
        message: rang,
        caracteres: propos.length,
        couverts,
        /**
         * Ce qu'aucune citation ne reprend, dans les mots de l'auteur.
         *
         * **C'est le texte du message qui redescend**, pas un texte nouveau :
         * il est monté du navigateur à l'appel précédent, et rien de la
         * consigne ne l'accompagne.
         */
        nonRepris: lesPhrasesNonReprises(message.propos, prisesDuRang.get(rang) ?? [])
      };
    });
}

/**
 * Les prises, dans la forme que l'écran et la proposition attendent.
 *
 * **L'auteur et la date viennent du message, pas du modèle.** C'est la seule
 * façon d'être sûr qu'une prise est attribuée à qui l'a écrite : les en-têtes
 * d'un `.eml` se lisent, la mémoire d'un modèle se suppose.
 *
 * La clé porte le fil, le message et le rang : deux prises d'un même message ne
 * se confondent pas, et un même fil relu deux fois rend les mêmes clés — ce qui
 * permet de reconnaître ce qu'on a déjà vu passer.
 */
export function prisesAuFormatDuMoteur(retenues = [], { filId = "", messages = [] } = {}) {
  const parRang = new Map(
    (Array.isArray(messages) ? messages : []).map((message) => [Number(message?.rang), message])
  );

  return (Array.isArray(retenues) ? retenues : []).map((prise, rang) => {
    const message = parRang.get(Number(prise?.message)) ?? null;
    const intitule = texte(prise?.intitule);

    return {
      key: `prise:${texte(filId)}:${Number(prise?.message) || 0}:${rang + 1}`,
      nature: texte(prise?.nature),
      intitule,
      porteSur: texte(prise?.porte_sur) || null,
      pourQui: texte(prise?.pour_qui) || null,
      echeance: texte(prise?.echeance) || null,
      citation: texte(prise?.citation),
      message: Number(prise?.message) || null,
      /** Qui l'a écrite — lu dans les en-têtes, jamais demandé au modèle. */
      qui: texte(message?.qui) || null,
      /** Quand — de même. Vide quand le message lui-même n'a pas de date. */
      quand: texte(message?.quand) || null,
      /** Le message annoncé était-il le bon ? Sinon, l'auteur a changé. */
      messageVerifie: prise?.pageVerifiee === true,
      /**
       * Le message auquel cette prise répond, **une fois confronté au fil**.
       *
       * C'est le seul rapprochement vérifiable dont on dispose : le libellé de
       * sujet, lui, est un mot que le modèle écrit librement.
       */
      repondA: Number.isFinite(prise?.repond_a) ? prise.repond_a : null,
      /** Deux prises identiques d'un même message se reconnaissent à ceci. */
      empreinte: aplati(`${texte(prise?.nature)} ${intitule}`)
    };
  });
}
