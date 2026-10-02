/**
 * Vider la file d'un geste : la mécanique, écrite une fois.
 *
 * ## Ce qu'elle remplace
 *
 * Deux fonctions de bord tenaient la même mécanique, recopiée :
 * `lire-les-comptes-rendus` et `lire-les-rapports`. Prendre la plus ancienne ligne
 * qui attend, la marquer prise avant de travailler, reprendre l'avancement là où
 * une coupure l'a laissé, travailler sous budget, se rappeler soi-même quand il
 * est épuisé, consigner la course, refermer la ligne — sept décisions, chacune
 * payée par un défaut vu en production, et chacune écrite deux fois.
 *
 * La troisième famille — un plan, une notice — l'aurait recopiée une troisième
 * fois. Et ce n'est pas le volume qui coûte : c'est qu'une correction portée sur
 * l'une n'aurait pas touché l'autre, et que la file la moins relue serait restée
 * fausse sans que rien ne le dise (règle 4).
 *
 * ## Pourquoi elle est pure, et ne parle pas à la base
 *
 * Porter une file éprouvée sur une mécanique neuve qu'on ne peut essayer qu'en
 * production, c'est risquer de casser ce qui marche. Les accès à la base entrent
 * donc par `portes`, et la mécanique s'éprouve par `npm test` sur des portes
 * inventées : l'ordre des écritures, la reprise après coupure, le budget épuisé,
 * l'échec d'un document au milieu d'un lot. Ce qu'on ne pouvait vérifier qu'en
 * lançant trente rapports se vérifie en une seconde.
 *
 * ## Ce qu'elle ne décide pas
 *
 * Ce qu'est **lire un document** : c'est `lireUn`, propre à la famille. Ce qu'il
 * faut faire **ensuite, en file et dans l'ordre** : c'est `apresChaque` — la
 * proposition des comptes rendus, que deux lectures menées de front écriraient
 * deux fois. Et les mots de la course, qui viennent du registre des familles.
 */

import { ceQueDitLaFamille, ceQueLaFileDit } from "./les-familles-de-document.js";

import {
  DANS_LA_FILE, EN_MEME_TEMPS, apresUnPas, laFileReprise, lesComptesDeLaFile,
  lesProchainsDeLaFile, phraseDeLaFile, uneFileDeComptesRendus
} from "./la-file-des-comptes-rendus.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Ce qu'on s'autorise à durer avant de se rappeler soi-même.
 *
 * Une fonction de bord est coupée sans préavis au bout de son temps ; coupée en
 * plein appel au modèle, elle laisse une ligne `en_cours` que personne ne reprend.
 * On s'arrête donc **avant**, proprement, et l'on repart (règle 6).
 */
export const LE_BUDGET_MS = 110_000;

/** Le mot que la file rend quand elle s'arrête sur son budget. */
export const LE_BUDGET_EST_EPUISE = "budget épuisé, la suite au prochain réveil";

/**
 * L'état de départ d'une passe : la reprise, ou une file neuve.
 *
 * **Ce qui était en vol réattend** — `laFileReprise` s'en charge, et c'est ce qui
 * réparait « 18 lus sur 19 » sans dix-neuvième visible nulle part. Cette décision
 * n'existait que dans la file des comptes rendus avant d'être partagée : celle
 * des rapports l'a reçue en même temps que la mécanique.
 */
export function letatDeDepart(ligne = null) {
  const documents = Array.isArray(ligne?.documents) ? ligne.documents : [];
  const connues = documents.map((un) => ({
    id: texte(un?.id), nom: texte(un?.nom) || "Document", lecture: "", type: "fichier"
  }));

  return Array.isArray(ligne?.avancement?.pas) && ligne.avancement.pas.length
    ? laFileReprise(ligne.avancement)
    : uneFileDeComptesRendus(new Set(connues.map((un) => un.id)), connues);
}

/**
 * Ce qui a empêché la file d'aboutir, en une phrase, ou `""`.
 *
 * **Aucun lu sur un total non nul**, et non « au moins un échec » : une file de
 * dix-neuf dont un document est illisible a travaillé, et sa course est un
 * avertissement, pas un échec.
 */
export function cequiArreteLaFile(geste = "", etat = null) {
  const comptes = lesComptesDeLaFile(etat);
  if (comptes.lus > 0 || comptes.total === 0) return "";

  const quoi = ceQueDitLaFamille(geste)?.quoi;
  const nomme = comptes.total > 1 ? quoi?.plusieurs : quoi?.un;
  // Sans famille connue, on dit « documents » plutôt que de ne rien dire : la
  // phrase reste vraie, et le geste figure déjà sur la ligne (règle 5).
  return `aucun des ${comptes.total} ${nomme || "documents"} n'a pu être lu`;
}

/**
 * La course à consigner au journal, dans les mots de la famille.
 *
 * **Les mots viennent du registre, la forme vient d'ici.** Le titre et la phrase
 * de clôture étaient écrits dans chaque fonction de bord : « Lecture de 3
 * rapports de bureau de contrôle » d'un côté, « Lecture de 3 comptes rendus de
 * chantier » de l'autre, et deux fois la même structure autour.
 */
export function laCourseDeLaFile({
  geste = "", ligne = null, etat = null, debut = 0, maintenant = Date.now()
}) {
  const comptes = lesComptesDeLaFile(etat);
  const arrete = cequiArreteLaFile(geste, etat);
  const dit = ceQueLaFileDit(geste);

  return {
    project_id: ligne?.project_id ?? null,
    // **Le geste de la file, et non « versement ».** L'onglet Actions lit le mot
    // pour nommer la ligne ; il écrivait « Dépôt de messagerie » sous une lecture
    // de trois comptes rendus.
    geste: texte(geste),
    // Une lecture est privée à qui l'a lancée : rien ne la montre aux
    // collaborateurs du chantier. La politique tient là-dessus, pas sur le geste.
    personnelle: true,
    titre: dit?.titre
      ? dit.titre(comptes.total)
      : `Lecture de ${comptes.total} document${comptes.total > 1 ? "s" : ""}`,
    resume: arrete
      ? `Lecture interrompue : ${arrete}`
      : [phraseDeLaFile(etat), dit?.cloture].filter(Boolean).join(" — "),
    statut: arrete ? "echec" : (comptes.echoues ? "warning" : "ok"),
    started_at: new Date(ligne?.pris_le ?? ligne?.cree_le ?? maintenant).toISOString(),
    finished_at: new Date(maintenant).toISOString(),
    duration_ms: Math.max(0, maintenant - debut),
    steps: [{
      id: "lecture",
      label: `${dit?.pieces || "Documents"} lus`,
      ms: null,
      statut: arrete ? "echec" : "ok",
      lignes: [
        `Demandés : ${comptes.total}`,
        `Lus : ${comptes.lus}`,
        `Illisibles : ${comptes.echoues}`
      ]
    }]
  };
}

/**
 * Vider la file d'un geste, sous budget, et refermer la ligne.
 *
 * ## Les portes
 *
 * Chacune parle à la base, et aucune n'est écrite ici :
 *
 *   - `prendreLaLigne()` → la plus ancienne qui attend, ou celle qu'on a
 *     abandonnée en route, ou `null` ;
 *   - `marquerPrise(ligne)` → vrai si **c'est nous** qui l'avons prise. Deux
 *     réveils simultanés prendraient sinon la même ligne, et liraient deux fois
 *     les mêmes documents — deux factures ;
 *   - `ecrireAvancement(ligne, {avancement, emporte})` → l'état que l'écran relit ;
 *   - `consignerLaCourse(ligne, course)` → l'identifiant de la course, ou `null` ;
 *   - `refermer(ligne, {...})` → le statut final de la ligne de file ;
 *   - `seRappeler()` → un réveil de plus, sans attendre, quand le budget est
 *     épuisé.
 *
 * ## `emporte`
 *
 * Ce qu'une famille **traîne d'un document au suivant**, et qui se réécrit à
 * chaque pas : la proposition des comptes rendus, ouverte au premier et enrichie
 * ensuite. Les rapports n'emportent rien, et la mécanique n'a pas à savoir ce que
 * c'est.
 *
 * @returns `{fait, motif, lus, echoues, arrete, emporte}`
 */
export async function viderLaFile({
  geste = "",
  portes = {},
  lireUn = null,
  apresChaque = null,
  enMemeTemps = EN_MEME_TEMPS,
  budgetMs = LE_BUDGET_MS,
  maintenant = () => Date.now()
} = {}) {
  if (typeof lireUn !== "function") throw new Error("une file sans lecteur ne se vide pas");

  const ligne = await portes.prendreLaLigne();
  if (!ligne?.id) return { fait: false, motif: "rien à lire" };

  // **Marquée prise avant de travailler.** Le filtre sur le statut d'origine fait
  // que le second réveil ne trouve rien à marquer, et s'en va.
  if (!await portes.marquerPrise(ligne)) return { fait: false, motif: "déjà prise" };

  const debut = maintenant();
  let etat = letatDeDepart(ligne);
  let emporte = texte(ligne.emporte);

  try {
    for (;;) {
      const prochains = lesProchainsDeLaFile(etat, enMemeTemps);
      if (!prochains.length) break;

      // **Le budget d'abord**, et avant de marquer quoi que ce soit en cours :
      // coupée en plein appel au modèle, la fonction laisserait des pas en vol et
      // des appels payés pour rien.
      if (maintenant() - debut > budgetMs) {
        await portes.ecrireAvancement(ligne, { avancement: etat, emporte });
        // On se rappelle sans attendre : la suite est un autre réveil.
        portes.seRappeler?.();
        return {
          fait: false, motif: LE_BUDGET_EST_EPUISE, emporte,
          ...lusEtEchoues(etat)
        };
      }

      // Tous marqués en cours d'un coup, puis **une seule écriture** : trois
      // écritures pour trois pas feraient trois fois le tour, et l'écran ne
      // verrait de toute façon que la dernière.
      for (const un of prochains) {
        etat = apresUnPas(etat, un.id, DANS_LA_FILE.EN_COURS, "", maintenant());
      }
      await portes.ecrireAvancement(ligne, { avancement: etat, emporte });

      const lus = await Promise.all(prochains.map(async (prochain) => {
        try {
          return await lireUn(prochain, { ligne, emporte });
        } catch (erreur) {
          return { motif: texte(erreur?.message) || "cause inconnue" };
        }
      }));

      /**
       * **Ce qui suit la lecture se fait un par un, dans l'ordre des documents.**
       *
       * Ajouter à une proposition se fait en deux temps : relire ce qu'elle porte,
       * puis écrire ce qui manque. Deux ajouts simultanés verraient le même état et
       * écriraient les mêmes lignes deux fois — la perte de mise à jour la plus
       * classique, et elle ne se voit qu'après coup, en doublons.
       */
      for (let rang = 0; rang < prochains.length; rang += 1) {
        const prochain = prochains[rang];
        const lu = lus[rang];

        // **Un échec ne fait pas tomber la file** : il se nomme, et la suite part.
        // S'arrêter au premier document illisible abandonnerait les autres, qui
        // sont lisibles (règle 5).
        if (lu?.motif) {
          etat = apresUnPas(etat, prochain.id, DANS_LA_FILE.ECHOUE, lu.motif, maintenant());
          continue;
        }

        let suite = {};
        if (apresChaque) {
          try {
            suite = await apresChaque(lu, prochain, { ligne, emporte }) ?? {};
          } catch (erreur) {
            suite = { motif: texte(erreur?.message) || "cause inconnue" };
          }
          // **Ce qui a été ouvert se garde, même en cas d'échec.** Sans cela le
          // document suivant ouvrirait une seconde proposition, et trois comptes
          // rendus ont donné deux propositions vides exactement comme ça (règle 6).
          if (texte(suite.emporte)) emporte = texte(suite.emporte);
        }

        etat = apresUnPas(etat, prochain.id,
          suite.motif ? DANS_LA_FILE.ECHOUE : DANS_LA_FILE.LU, suite.motif ?? "",
          maintenant());
      }

      await portes.ecrireAvancement(ligne, { avancement: etat, emporte });
    }

    const arrete = cequiArreteLaFile(geste, etat);

    // **Le journal se consigne, puis la file se referme.** Dans l'autre ordre, une
    // panne entre les deux laisserait une file finie sans trace de ce qu'elle a fait.
    const courseId = await portes.consignerLaCourse(
      ligne, laCourseDeLaFile({ geste, ligne, etat, debut, maintenant: maintenant() })
    );

    await portes.refermer(ligne, {
      statut: arrete ? "echec" : "fini",
      avancement: etat,
      arrete,
      emporte,
      courseId: courseId ?? null
    });

    return { fait: !arrete, arrete, emporte, ...lusEtEchoues(etat) };
  } catch (erreur) {
    const dit = texte(erreur?.message) || "cause inconnue";
    // **La ligne se referme même quand tout casse.** Laissée `en_cours`, elle
    // bloquerait la file jusqu'à ce que son abandon soit constaté dix minutes
    // plus tard, et l'écran n'en dirait rien entre-temps.
    await portes.refermer(ligne, {
      statut: "echec", avancement: etat, arrete: dit, emporte, courseId: null
    });
    return { fait: false, arrete: dit, emporte, ...lusEtEchoues(etat) };
  }
}

/** Ce que l'appelant rend à qui a demandé le réveil. */
function lusEtEchoues(etat) {
  const comptes = lesComptesDeLaFile(etat);
  return { lus: comptes.lus, echoues: comptes.echoues };
}
