/**
 * Lire les sujets d'un compte rendu de chantier par le modèle.
 *
 * ## Ce que ce fichier remplace
 *
 * Rien — et c'est le problème qu'il ferme. Déposer un compte rendu de chantier
 * n'ajoutait aucun sujet, ni par une proposition, ni par un dépôt direct. Un
 * chemin existait bien, l'ancienne pipeline d'analyse, mais il produisait des
 * sujets **à partir d'un PDF, sans proposition** : il contournait la règle 1,
 * et il s'en va avec cette version.
 *
 * ## Pourquoi le modèle, et pas un extracteur
 *
 * La même raison que pour les avis, en pire. Un livrable de bureau de contrôle
 * suit au moins la maquette de son émetteur ; un compte rendu de chantier suit
 * celle de son maître d'œuvre, et il y en a autant que d'agences. Tableaux à
 * trois colonnes, listes numérotées par lot, paragraphes courants : aucune
 * forme ne domine, et aucune ne tient d'un chantier au suivant.
 *
 * ## Ce qui rend le modèle acceptable : la citation, encore
 *
 * Chaque sujet rendu porte la ligne du compte rendu d'où il sort, et cette
 * ligne est recherchée dans le texte de la page — au serveur, avant la réponse.
 * Ce qui ne s'y retrouve pas est écarté et compté. Le garde-fou est celui de
 * `citation-verifiee.js` : le même pour toutes les lectures, écrit une fois.
 *
 * L'enjeu est ici plus grand que pour un avis. Un avis inventé se remarque — il
 * porte un code que la légende ne connaît pas. Un sujet inventé, lui, est
 * plausible : « Reprise d'étanchéité en toiture terrasse » pourrait figurer
 * dans n'importe quel compte rendu. Sans la citation, rien ne le distinguerait
 * d'un vrai, et l'on ouvrirait des sujets sur un chantier pour une phrase que
 * personne n'a écrite.
 *
 * ## Ce qu'on ne lui demande pas
 *
 * **De juger.** Ni la priorité, ni la gravité, ni l'urgence. Un compte rendu ne
 * les écrit pas, et les deviner ferait classer un chantier sur une intuition.
 *
 * **De trancher.** Ce qu'il rend n'est pas un sujet du projet : c'est une
 * **proposition** de sujet, qu'un humain accepte ou refuse. Rien n'entre
 * directement (règle 1), et ceci moins que tout : ouvrir un sujet engage
 * quelqu'un à le traiter.
 */

import { verifierLesCitations } from "./citation-verifiee.js";

export { ECART, PHRASES_DE_LECART, pagesEnTexte } from "./citation-verifiee.js";

/** Ce que le modèle doit rendre, et rien d'autre. */
/**
 * Les labels de qualification, et pourquoi la liste est **fermée**.
 *
 * Un modèle libre d'inventer des labels en produit quinze en trois comptes
 * rendus : « Urgent », « Très urgent », « Prioritaire », « À traiter vite ». Le
 * projet se remplit d'étiquettes qui disent la même chose, aucun filtre ne
 * trouve plus rien, et personne ne nettoiera.
 *
 * **Cette liste est le double de celle du navigateur**, et c'est délibéré : une
 * fonction Edge ne peut pas importer hors de `supabase/functions/`. Un test
 * compare les deux et tombe dès qu'elles divergent — la seule façon, ici,
 * d'avoir un nom qui vit à un seul endroit (règle 10).
 */
export const LABELS_DE_QUALIFICATION = ["Urgent", "Rappel", "Information générale"];

/**
 * Ce qu'on peut répéter d'une panne du fournisseur, et ce qu'on ne répète pas.
 *
 * ## Pourquoi ce filtre existe
 *
 * « La lecture a été refusée » ne dit rien. Ni à qui la lit, ni à qui doit la
 * réparer : on ne sait pas si le document était trop long, si le modèle n'existe
 * pas, si la clé a expiré ou si le schéma est invalide. Quatre pannes, une seule
 * phrase, et chacune se corrige autrement.
 *
 * ## Pourquoi on ne renvoie pas le corps de l'erreur
 *
 * Le corps d'une erreur du fournisseur peut contenir un écho de ce qu'on lui a
 * envoyé — c'est-à-dire la consigne. Elle décrit ce que Mdall sait lire d'un
 * document de chantier, et elle ne descend pas dans le navigateur.
 *
 * On ne relaie donc que trois champs nommés, coupés court : le type, le code et
 * le message. C'est ce qui nomme la panne, et c'est tout ce qui sert.
 */
export function panneDuFournisseur(corps = "", status = 0) {
  const court = (valeur) => String(valeur ?? "").trim().slice(0, 300);

  let lu = null;
  try {
    lu = JSON.parse(corps);
  } catch {
    lu = null;
  }

  const erreur = lu?.error ?? lu ?? {};
  return {
    status: Number(status) || 0,
    type: court(erreur?.type),
    code: court(erreur?.code),
    // Sans message exploitable, on dit qu'il n'y en avait pas : inventer une
    // explication vraisemblable serait pire que de n'en donner aucune (règle 5).
    message: court(erreur?.message) || (corps ? "le fournisseur n'a pas nommé la panne" : "")
  };
}

export const SCHEMA_DES_SUJETS = {
  name: "sujets_du_compte_rendu",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      numero_de_reunion: { anyOf: [{ type: "string" }, { type: "null" }] },
      tenue_le: { anyOf: [{ type: "string" }, { type: "null" }] },
      redige_par: { anyOf: [{ type: "string" }, { type: "null" }] },
      sujets: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            /** Le lot tel qu'écrit — « 02 — GROS ŒUVRE ». Il ne se traduit pas en code. */
            lot: { anyOf: [{ type: "string" }, { type: "null" }] },
            /**
             * Le numéro que le compte rendu donne au point — « 12.02.1 ».
             *
             * C'est lui qui fait qu'un point reporté d'une réunion à la suivante
             * se reconnaît : sans lui, la douzième réunion rouvrirait douze fois
             * la même chose.
             */
            reference: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** Ce qu'il y a à traiter, en une ligne, dans les mots du document. */
            titre: { type: "string" },
            /** Ce que le compte rendu en dit, recopié et non résumé. */
            description: { type: "string" },
            /** À qui c'est demandé, tel qu'écrit. Jamais un nom de personne deviné. */
            qui: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** La date ou le délai annoncé, tel qu'écrit. */
            echeance: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** « nouveau », « en cours », « soldé »… tel que le document le marque. */
            etat: { anyOf: [{ type: "string" }, { type: "null" }] },
            page: { anyOf: [{ type: "integer" }, { type: "null" }] },
            /** La ligne du document d'où le sujet sort. Sans elle, rien n'entre. */
            citation: { type: "string" },
            /**
             * Le sujet du projet que ce point continue, s'il en continue un.
             *
             * **C'est le rapprochement, et il change de main.** Il se faisait
             * jusqu'ici par comparaison des titres mis à plat, dans le
             * navigateur — ce qui ne reconnaît qu'une reprise mot pour mot. Or
             * un point qui avance se réécrit : « pose prévue demain » devient
             * « posé », et repartait donc comme un point neuf.
             *
             * Le modèle, lui, voit les deux textes. Il rend l'identifiant tel
             * qu'il lui a été donné, et rien d'autre : un identifiant qu'on ne
             * lui a pas envoyé est écarté avant de sortir d'ici.
             */
            /**
             * Ce que le document dit de ce point, en labels.
             *
             * Une liste fermée — voir `LABELS_DE_QUALIFICATION`. Le schéma ne
             * l'impose pas au modèle, qui la respecte à peu près ; le serveur,
             * lui, écarte ce qui n'en est pas.
             *
             * « CR chantier » n'y figure pas : il est posé sur tout sujet venu
             * d'un compte rendu, sans que le modèle ait à le dire.
             */
            labels: { type: "array", items: { type: "string" } },
            sujet_existant: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** Pourquoi ce point continue ce sujet-là. Une phrase, sinon null. */
            raison_du_rapprochement: { anyOf: [{ type: "string" }, { type: "null" }] }
          },
          required: [
            "lot", "reference", "titre", "description", "qui", "echeance", "etat", "page",
            "citation", "labels", "sujet_existant", "raison_du_rapprochement"
          ]
        }
      },
      /**
       * Qui travaille sur ce chantier.
       *
       * **Pourquoi le compte rendu est le bon endroit pour le savoir.** Un
       * compte rendu de chantier nomme tout le monde : il ouvre par la liste
       * des présents, des absents et des excusés, et il découpe ses points par
       * lot en nommant l'entreprise de chacun. C'est la source la plus complète
       * et la plus à jour qui existe sur un chantier — plus que n'importe quel
       * fichier tenu à la main, parce qu'elle se remet à jour toute seule à
       * chaque réunion.
       *
       * Et c'est ce qui manque pour suivre un point d'une semaine à l'autre :
       * sans la liste des intervenants, « qui doit reprendre l'étanchéité »
       * reste un texte, et un sujet ne peut être assigné à personne.
       */
      intervenants: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            /** L'entreprise ou l'organisme, tel qu'écrit. C'est le repère principal. */
            societe: { type: "string" },
            /** La personne, quand le document la nomme. Jamais devinée. */
            nom: { anyOf: [{ type: "string" }, { type: "null" }] },
            /** Son rôle tel qu'écrit — « maîtrise d'œuvre », « lot 02 — gros œuvre ». */
            role: { anyOf: [{ type: "string" }, { type: "null" }] },
            /**
             * Son adresse électronique, **recopiée** — jamais reconstruite.
             *
             * Un compte rendu en porte presque toujours : la liste de diffusion
             * les aligne sous les noms. La recopier n'est pas deviner, c'est
             * lire — et c'est ce qui permet de rattacher la personne à son
             * compte Mdall le jour où elle en ouvre un.
             *
             * Ce qui reste interdit est de la **fabriquer** : « M. A. » chez
             * « SARL Alpha » ne devient pas `a@alpha.fr`. Une adresse inventée
             * dans un annuaire de personnes réelles finit par recevoir du
             * courrier.
             */
            courriel: { anyOf: [{ type: "string" }, { type: "null" }] },
            page: { anyOf: [{ type: "integer" }, { type: "null" }] },
            /** La ligne d'où l'intervenant sort. Sans elle, rien n'entre. */
            citation: { type: "string" }
          },
          required: ["societe", "nom", "role", "courriel", "page", "citation"]
        }
      }
    },
    required: ["numero_de_reunion", "tenue_le", "redige_par", "sujets", "intervenants"]
  }
};

export const CONSIGNES = [
  "Tu lis un compte rendu de réunion de chantier et tu en extrais les points à traiter. Tu ne juges rien, tu ne résumes rien, tu ne complètes rien.",
  "",
  "Un point à traiter est une observation, une demande, une réserve ou une question que le compte rendu adresse à quelqu'un. Selon les maîtres d'œuvre, cela se présente en tableau, en liste numérotée par lot, ou en paragraphes.",
  "",
  "Ce qui n'en est PAS un, et que tu laisses de côté : l'ordre du jour, la liste des présents, la liste de diffusion, l'heure d'ouverture et de clôture, la date de la prochaine réunion, les rappels de pièces contractuelles.",
  "",
  "Pour chaque point :",
  "- `titre` : ce qu'il y a à traiter, en une ligne, DANS LES MOTS DU DOCUMENT. Ne reformule pas et n'ajoute pas de verbe d'action qui n'y est pas.",
  "- `description` : ce que le compte rendu en dit, recopié. Si le document n'en dit pas plus que le titre, reprends le titre.",
  "- `lot` : le lot sous lequel le point est écrit, tel qu'écrit — « 02 — GROS ŒUVRE ». Sinon null.",
  "- `reference` : le numéro que le compte rendu donne au point — « 12.02.1 », « 4.3 ». Sinon null.",
  "- `qui` : à qui c'est demandé, tel qu'écrit — un lot, une entreprise, « MOE ». Jamais un nom de personne que tu supposes.",
  "- `echeance` : la date ou le délai annoncé, tel qu'écrit. Sinon null.",
  "- `etat` : « nouveau », « en cours », « soldé », « levé »… tel que le document le marque. Sinon null.",
  "- `page` : la page où le point se lit.",
  "- `citation` : la ligne du document d'où le point sort, RECOPIÉE MOT POUR MOT. Elle sera recherchée dans le texte de la page : si elle ne s'y retrouve pas, le point sera écarté.",
  "",
  "Au niveau du document :",
  "- `numero_de_reunion`, `tenue_le`, `redige_par` : tels que le document les déclare.",
  "",
  "Les intervenants : relève ceux que le document nomme — dans la liste des présents, des absents, des excusés, dans la liste de diffusion, et dans les en-têtes de lot qui nomment une entreprise.",
  "- `societe` : l'entreprise ou l'organisme, tel qu'écrit. C'est le champ obligatoire : une ligne sans société n'est pas un intervenant.",
  "- `nom` : la personne, UNIQUEMENT si le document la nomme. Jamais un nom que tu supposes, jamais un nom reconstruit à partir d'une adresse.",
  "- `role` : son rôle tel qu'écrit — « maîtrise d'œuvre », « lot 02 — gros œuvre », « bureau de contrôle ». Sinon null.",
  "- `courriel` : son adresse électronique, RECOPIÉE telle qu'écrite dans le document — la liste de diffusion en porte presque toujours. Sinon null. Ne la reconstruis JAMAIS à partir d'un nom et d'une société : une adresse inventée dans un annuaire de personnes réelles finit par recevoir du courrier.",
  "- `citation` : la ligne d'où il sort, RECOPIÉE MOT POUR MOT.",
  "Ne relève pas de numéro de téléphone : il ne sert à rien ici et il n'a pas à voyager.",
  "Une même entreprise citée trois fois ne se relève qu'une fois, avec le nom de personne le plus complet que le document en donne.",
  "",
  "",
  "LES LABELS :",
  "Pour chaque point, `labels` dit ce que LE DOCUMENT en dit. TU NE PEUX EN UTILISER QUE TROIS, écrits exactement ainsi :",
  "- `Urgent` : le document le marque urgent, ou fixe une échéance immédiate — « urgent », « sous 48 h », « avant la prochaine réunion », une mise en évidence en rouge sur le point lui-même.",
  "- `Rappel` : le point est redit d'un compte rendu à l'autre, ou porte la mention « pour rappel », « rappel », « relance », « déjà signalé ».",
  "- `Information générale` : le document l'écrit pour information, il n'attend d'action de personne — les consignes générales de chantier reprises de réunion en réunion en sont.",
  "N'invente AUCUN autre label. Pas de « Prioritaire », pas de « À traiter », pas de « Important » : ce qui n'est pas dans la liste ci-dessus est écarté. Un projet qui accumule quinze étiquettes disant la même chose n'a plus de filtre qui fonctionne, et personne ne le nettoiera.",
  "Un point peut n'en porter aucun : `labels` vaut alors la liste vide. C'est le cas le plus fréquent, et c'est très bien — n'en pose un que si le document le dit.",
  "Ne pose jamais `Urgent` parce que le sujet te semble grave : tu relèves ce qui est écrit, tu ne juges pas le chantier.",
  "",
  "LE RAPPROCHEMENT AVEC CE QUE LE PROJET SUIT DÉJÀ :",
  "Un compte rendu de chantier REPORTE. La douzième réunion reprend les points de la onzième, qui reprenait ceux de la dixième : un point reste écrit tant qu'il n'est pas soldé. Si on ne reconnaît pas qu'un point continue un sujet déjà ouvert, la douzième réunion ouvre douze fois la même chose.",
  "Quand la liste « CE QUE LE PROJET SUIT DÉJÀ » t'est donnée, remplis pour chaque point :",
  "- `sujet_existant` : l'identifiant du sujet que ce point continue, RECOPIÉ CARACTÈRE POUR CARACTÈRE depuis cette liste. Sinon null.",
  "- `raison_du_rapprochement` : en une phrase, ce qui te fait dire que c'est le même point — le même numéro, le même ouvrage au même endroit, la suite visible de la même affaire. Sinon null.",
  "Le numéro du compte rendu — « 12.02.1 » — est la reconnaissance la plus sûre : le même numéro désigne le même point d'une réunion à l'autre.",
  "Un point qui a AVANCÉ continue son sujet : « pose prévue demain » et « pose réalisée » sont le même point à deux semaines d'écart, pas deux points. C'est exactement ce qu'une comparaison de titres ne sait pas voir, et c'est pour cela qu'on te le demande.",
  "Un point qui parle du MÊME OUVRAGE mais d'AUTRE CHOSE est un point nouveau : « étanchéité toiture, angle nord-ouest » et « étanchéité toiture, relevé sud » ne sont pas le même point. Dans le doute, laisse null : reproposer un point déjà suivi se corrige d'un clic, alors qu'un point rattaché au mauvais sujet disparaît dans une discussion où personne ne le cherchera.",
  "N'invente JAMAIS un identifiant. S'il ne figure pas mot pour mot dans la liste qu'on t'a donnée, écris null.",
  "",
  "Ce qui n'est pas dans le document vaut null. N'invente jamais pour remplir un champ.",
  "N'invente surtout jamais un point : un point plausible que personne n'a écrit ferait ouvrir un sujet sur un chantier réel."
].join("\n");

/**
 * Ce que le projet suit déjà, mis en texte pour le modèle.
 *
 * **Maigre, et c'est voulu.** Un identifiant, un numéro, un titre, un état : de
 * quoi reconnaître, pas de quoi raisonner sur autre chose. Verser la
 * description de trente sujets ferait un contexte énorme, plus cher, et
 * donnerait au modèle mille occasions de rapprocher deux points sur un détail
 * qui n'a rien à voir.
 *
 * Rend "" quand la liste est vide ou absente. L'appelant n'ajoute alors rien à
 * la consigne : le modèle ne doit pas croire que le projet ne suit rien —
 * c'est une chose de ne rien avoir, c'en est une autre de ne pas savoir
 * (règle 5).
 */
export function sujetsDuProjetEnTexte(sujets = []) {
  const lignes = (Array.isArray(sujets) ? sujets : [])
    .map((sujet) => ({
      id: String(sujet?.id ?? "").trim(),
      numero: String(sujet?.subject_number ?? sujet?.numero ?? "").trim(),
      titre: String(sujet?.title ?? sujet?.titre ?? "").trim(),
      etat: String(sujet?.status ?? sujet?.etat ?? "").trim()
    }))
    .filter((sujet) => sujet.id && sujet.titre)
    .map((sujet) => {
      const numero = sujet.numero ? ` #${sujet.numero}` : "";
      const etat = sujet.etat ? ` [${sujet.etat}]` : "";
      return `- ${sujet.id}${numero}${etat} : ${sujet.titre}`;
    });

  if (lignes.length === 0) return "";

  return [
    "",
    "CE QUE LE PROJET SUIT DÉJÀ (identifiant, numéro, état, titre) :",
    ...lignes
  ].join("\n");
}

/**
 * Les rapprochements rendus, confrontés à ce qu'on a envoyé.
 *
 * **Le même garde-fou que les citations, et pour une raison plus forte.** Une
 * citation inventée fait perdre un point : on le voit, il manque. Un
 * identifiant inventé fait pire — il range un point réel dans la discussion
 * d'un sujet qui n'a rien à voir, où personne n'ira le chercher. Le point n'est
 * pas perdu, il est **égaré**, ce qui ne se voit jamais.
 *
 * On ne corrige donc pas, on écarte : le point reste, son rapprochement tombe,
 * et il repart comme un point neuf — l'erreur la moins coûteuse des deux.
 *
 * @returns {{sujets: object[], ecartes: number}}
 */
/**
 * Les labels rendus, ramenés à la liste fermée.
 *
 * **La même porte que les citations, et le même refus.** Ce qui n'est pas dans
 * la liste ne sort pas d'ici : un label inventé n'est pas une étiquette de trop,
 * c'est une étiquette que le projet devra porter pour toujours, à côté de celle
 * qui disait déjà la même chose.
 *
 * La casse et les accents ne comptent pas — « urgent » est `Urgent` — mais le
 * label rendu porte l'écriture officielle : sans quoi le projet finirait avec
 * « Urgent » et « urgent », que la base compte pour deux.
 *
 * @returns {{sujets: object[], ecartes: string[]}}
 */
export function verifierLesLabels({ sujets = [] } = {}) {
  const aplati = (valeur) =>
    String(valeur ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const officiels = new Map(LABELS_DE_QUALIFICATION.map((nom) => [aplati(nom), nom]));
  const ecartes = [];

  const verifies = (Array.isArray(sujets) ? sujets : []).map((sujet) => {
    const retenus = [];

    for (const propose of Array.isArray(sujet?.labels) ? sujet.labels : []) {
      const officiel = officiels.get(aplati(propose));
      if (!officiel) {
        if (String(propose ?? "").trim()) ecartes.push(String(propose).trim());
        continue;
      }
      // Un point qui porte deux fois le même label ne le porte qu'une fois.
      if (!retenus.includes(officiel)) retenus.push(officiel);
    }

    return { ...sujet, labels: retenus };
  });

  return { sujets: verifies, ecartes };
}

export function verifierLesRapprochements({ sujets = [], connus = [] } = {}) {
  const permis = new Set(
    (Array.isArray(connus) ? connus : [])
      .map((sujet) => String(sujet?.id ?? "").trim())
      .filter(Boolean)
  );

  let ecartes = 0;
  const verifies = (Array.isArray(sujets) ? sujets : []).map((sujet) => {
    const rapproche = String(sujet?.sujet_existant ?? "").trim();
    if (!rapproche) return { ...sujet, sujet_existant: null, raison_du_rapprochement: null };

    if (!permis.has(rapproche)) {
      ecartes += 1;
      return { ...sujet, sujet_existant: null, raison_du_rapprochement: null };
    }

    return { ...sujet, sujet_existant: rapproche };
  });

  return { sujets: verifies, ecartes };
}

/**
 * Ce que le modèle a rendu, confronté au document.
 *
 * Ce qui appartient aux sujets, et qu'on apprend ici à la vérification, est ce
 * qui fait qu'une ligne **n'est pas un point à traiter** : pas de titre. Le
 * reste peut manquer — beaucoup de comptes rendus ne numérotent rien, et
 * exiger une référence ferait perdre l'essentiel de ce qu'ils portent.
 *
 * @returns {{retenus: object[], ecartes: object[], pagesCorrigees: number}}
 */
/**
 * Les intervenants rendus, confrontés au document.
 *
 * Le même garde-fou que les sujets, et pour une raison plus forte encore : un
 * intervenant inventé n'est pas une ligne de trop dans une liste, c'est **une
 * entreprise qui n'existe pas sur ce chantier**, à qui l'on finirait par
 * assigner des points.
 *
 * Ce qui fait qu'une ligne n'est pas un intervenant : pas de société. Le nom de
 * la personne peut manquer — beaucoup de comptes rendus ne nomment que les
 * entreprises, et l'exiger perdrait l'essentiel.
 */
export function verifierLesIntervenants({ intervenants = [], pages = [] } = {}) {
  const { retenus, ecartes, pagesCorrigees } = verifierLesCitations({
    lignes: intervenants,
    pages,
    estVide: (ligne) => !String(ligne?.societe ?? "").trim()
  });

  return {
    retenus,
    ecartes: ecartes.map(({ ligne, motif }) => ({ intervenant: ligne, motif })),
    pagesCorrigees
  };
}

export function verifierLesSujets({ sujets = [], pages = [] } = {}) {
  const { retenus, ecartes, pagesCorrigees } = verifierLesCitations({
    lignes: sujets,
    pages,
    estVide: (ligne) => !String(ligne?.titre ?? "").trim()
  });

  return {
    retenus,
    ecartes: ecartes.map(({ ligne, motif }) => ({ sujet: ligne, motif })),
    pagesCorrigees
  };
}

/**
 * Ce que le modèle a rendu, dans la forme qu'une proposition attend.
 *
 * La clé porte le document et le rang : deux points d'un même compte rendu ne
 * se confondent pas, et un même compte rendu relu deux fois rend les mêmes
 * clés. Quand le compte rendu numérote lui-même ses points, c'est **son**
 * numéro qui fait la clé : c'est ce qui permet de reconnaître, à la douzième
 * réunion, le point ouvert à la quatrième.
 */
/**
 * Les intervenants, dans la forme qu'une proposition attend.
 *
 * **La clé est la société, aplatie.** C'est le repère qui tient d'une réunion à
 * l'autre : le représentant change, l'entreprise reste. Prendre le nom de la
 * personne ferait proposer deux fois la même entreprise dès qu'un compte rendu
 * nomme un autre conducteur de travaux.
 */
export function intervenantsAuFormatDuMoteur(retenus = [], { sourceId = "" } = {}) {
  return (Array.isArray(retenus) ? retenus : []).map((ligne) => {
    const societe = String(ligne?.societe ?? "").trim();

    return {
      key: `intervenant:${aplati(societe)}`,
      societe,
      nom: String(ligne?.nom ?? "").trim() || null,
      role: String(ligne?.role ?? "").trim() || null,
      courriel: String(ligne?.courriel ?? "").trim().toLowerCase() || null,
      provenance: {
        source_id: sourceId,
        page: Number.isFinite(Number(ligne?.page)) ? Number(ligne.page) : null,
        excerpt: String(ligne?.citation ?? "").trim()
      },
      lu_par: "modele"
    };
  });
}

/** Un nom réduit à ce qui se compare, pour que « SARL Alpha » et « Sarl  Alpha » soient un. */
function aplati(valeur) {
  return String(valeur ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sujetsAuFormatDuMoteur(retenus = [], { sourceId = "" } = {}) {
  return (Array.isArray(retenus) ? retenus : []).map((ligne, rang) => {
    const reference = String(ligne?.reference ?? "").trim();

    return {
      key: reference ? `cr:${reference}` : `cr:${sourceId}:${rang + 1}`,
      titre: String(ligne?.titre ?? "").trim(),
      description: String(ligne?.description ?? "").trim(),
      lot: String(ligne?.lot ?? "").trim() || null,
      reference: reference || null,
      qui: String(ligne?.qui ?? "").trim() || null,
      echeance: String(ligne?.echeance ?? "").trim() || null,
      etat: String(ligne?.etat ?? "").trim() || null,
      // Les labels que le document pose sur ce point, **vérifiés** : ramenés à
      // la liste fermée, dans leur écriture officielle.
      labels: Array.isArray(ligne?.labels) ? ligne.labels : [],
      // Le sujet que ce point continue, **vérifié** : il figure dans la liste
      // qu'on a envoyée, ou il vaut null.
      sujet_existant: String(ligne?.sujet_existant ?? "").trim() || null,
      raison_du_rapprochement: String(ligne?.raison_du_rapprochement ?? "").trim() || null,
      provenance: {
        source_id: sourceId,
        page: Number.isFinite(Number(ligne?.page)) ? Number(ligne.page) : null,
        excerpt: String(ligne?.citation ?? "").trim()
      },
      lu_par: "modele"
    };
  });
}
