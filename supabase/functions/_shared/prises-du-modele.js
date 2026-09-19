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

export const CONSIGNES = [
  "Tu lis un fil de courriels d'un chantier de construction et tu en relèves les prises de position. Tu ne juges rien, tu ne résumes rien, tu ne complètes rien.",
  "",
  "Le fil t'est donné message par message, numéroté. Chaque message ne porte QUE ce que son auteur a écrit : les citations des messages précédents ont déjà été retirées. Ne relève donc rien qui ne soit pas dans le message que tu cites.",
  "",
  "Une prise de position est l'une de ces cinq choses, et rien d'autre :",
  "- `constat` : un fait affirmé — « le support est humide au droit de l'acrotère ».",
  "- `demande` : quelque chose est demandé à quelqu'un — « pouvez-vous confirmer la cote avant vendredi ? ».",
  "- `engagement` : l'auteur s'engage à faire quelque chose — « nous repassons jeudi avec le géomètre ».",
  "- `decision` : quelque chose est tranché — « on part sur la variante B ».",
  "- `source` : une référence invoquée pour fonder autre chose — « d'après le DTU 43.1 § 5.2 ». La source n'est pas le constat : c'est sa provenance.",
  "",
  "Ce qui n'en est PAS, et que tu laisses de côté : les formules de politesse, les accusés de réception, les signatures, les mentions légales, les réponses automatiques, les confirmations de rendez-vous sans engagement nouveau.",
  "",
  "Un même message peut porter plusieurs prises, ou aucune. Un message qui ne dit que « bien reçu, merci » n'en porte aucune : ne force pas.",
  "",
  "Pour chaque prise :",
  "- `nature` : l'une des cinq ci-dessus.",
  "- `intitule` : ce qui est pris comme position, en une ligne, DANS LES MOTS DE L'AUTEUR. Ne reformule pas, n'ajoute pas de verbe d'action qui n'y est pas.",
  "- `message` : le numéro du message d'où elle sort.",
  "- `citation` : la phrase du message d'où elle sort, RECOPIÉE MOT POUR MOT. Elle sera recherchée dans le texte de ce message : si elle ne s'y retrouve pas, la prise sera écartée.",
  "- `porte_sur` : sur quoi elle porte, en deux ou trois mots, les mêmes d'une prise à l'autre quand c'est la même chose — « humidité de l'acrotère », « cote du seuil ». C'est ce qui permettra de rapprocher deux prises contraires.",
  "- `pour_qui` : à qui c'est demandé, tel qu'écrit — un nom, une entreprise, « la MOE ». Null pour un constat ou une source.",
  "- `echeance` : le délai annoncé, TEL QU'ÉCRIT — « avant vendredi », « jeudi », « sous 15 jours ». Ne le convertis pas en date. Null s'il n'y en a pas.",
  "",
  "N'invente JAMAIS l'auteur ni la date d'une prise : ils sont déjà connus, ils viennent des en-têtes du message. On ne te les demande pas."
].join("\n");

export const SCHEMA_DES_PRISES = {
  name: "prises_du_fil",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      prises: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            nature: { type: "string", enum: Object.values(NATURE) },
            intitule: { type: "string" },
            message: { type: "integer" },
            citation: { type: "string" },
            porte_sur: { anyOf: [{ type: "string" }, { type: "null" }] },
            pour_qui: { anyOf: [{ type: "string" }, { type: "null" }] },
            echeance: { anyOf: [{ type: "string" }, { type: "null" }] }
          },
          required: ["nature", "intitule", "message", "citation", "porte_sur", "pour_qui", "echeance"]
        }
      }
    },
    required: ["prises"]
  }
};

const texte = (valeur) => String(valeur ?? "").trim();

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
export function verifierLesPrises({ prises = [], messages = [] } = {}) {
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

  return {
    // **Le rang retenu est celui où la citation se trouve**, pas celui que le
    // modèle a annoncé : c'est de lui que viendront l'auteur et la date, et
    // garder l'annonce attribuerait la prise à quelqu'un qui ne l'a pas écrite.
    retenues: retenus.map((ligne) => ({ ...ligne, message: Number(ligne?.page) || null })),
    ecartees: [...horsListe, ...ecartes.map(({ ligne, motif }) => ({ prise: ligne, motif }))],
    messagesCorriges: pagesCorrigees
  };
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
      /** Deux prises identiques d'un même message se reconnaissent à ceci. */
      empreinte: aplati(`${texte(prise?.nature)} ${intitule}`)
    };
  });
}
