/**
 * Ranger un compte rendu et sa restitution dans Fichiers.
 *
 * ## Ce que ce fichier fait, et ne fait pas
 *
 * Il dépose deux fichiers dans un dossier, et relit ce qui y est déjà. Il ne
 * décide rien : les règles de nommage et de reconnaissance vivent dans
 * `restitution-rangee.js`, qui se vérifie sans réseau.
 *
 * ## Un document déposé n'est pas une écriture en mémoire
 *
 * La règle 1 interdit de verser dans la mémoire du projet sans passer par une
 * proposition. **Un fichier n'est pas la mémoire** : c'est la matière première,
 * et l'onglet Documents en dépose déjà directement. Ce qui sortira de ce
 * document — des sujets, des lots, des objectifs — passera, lui, par une
 * proposition.
 *
 * ## Les portes sont nommées, et remplaçables
 *
 * Les six accès à la base entrent par `portes`. En usage, elles viennent des
 * modules qui les portent, chargés à la demande — le SDK Supabase ne se résout
 * pas hors navigateur. En test, on les remplace, et le parcours entier
 * s'exécute : quel dossier, quel nom, quel chemin de stockage, et surtout
 * **dans quel cas on ne rappelle pas le modèle**. Le vérifier en relisant le
 * fichier comme du texte ne prouverait rien (fondamental 13).
 *
 * ## Ce qui se passe quand ça échoue
 *
 * Rien de bloquant. Une restitution qu'on n'a pas su ranger reste affichée : on
 * la repaiera au prochain dépôt, ce qui est ennuyeux, pas grave. L'écran le dit
 * plutôt que de le taire.
 */

import { contentFingerprint } from "./document-identity.js";
import { pagesDuFichierMarkdown } from "./reconstitution-markdown.js";
import {
  DOSSIER_DES_CR, RANGEE, sourceRangee, transcriptionRangee
} from "./restitution-rangee.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Les portes de la base, telles qu'elles sont en vrai.
 *
 * Chargées à la demande : `document-deposit.js` et `project-supabase-sync.js`
 * passent par le SDK Supabase, importé depuis le réseau, qu'une exécution hors
 * navigateur ne saurait résoudre.
 */
async function portesParDefaut() {
  const [sync, depot] = await Promise.all([
    import("./project-supabase-sync.js"),
    import("./document-deposit.js")
  ]);

  return {
    listerLesDossiers: sync.listDocumentFolderChildren,
    creerLeDossier: sync.createDocumentFolder,
    listerLeDossier: sync.listDocumentDirectory,
    televerser: depot.uploadDocumentToStorage,
    ecrireLaLigne: depot.insertDocumentRow,
    // La transcription se pose **sur la ligne du document**, et non dans un
    // second fichier : un document, un endroit.
    poserLaTranscription: depot.updateDocumentRow,
    qui: depot.currentUserId
  };
}

/** Le texte d'un document, tel qu'il sert à l'identifier. */
export async function empreinteDesPages(pages = []) {
  const dit = (Array.isArray(pages) ? pages : [])
    .map((page) => texte(page?.text ?? page?.texte))
    .join("\n");

  return dit ? ((await contentFingerprint(dit)) || "") : "";
}

/** Le dossier du projet qui porte ce nom, s'il existe. */
async function dossierNomme(portes, projectId, nom) {
  const dossiers = (await portes.listerLesDossiers(projectId, null)) ?? [];
  return dossiers.find((entree) => texte(entree?.name).toLowerCase() === nom.toLowerCase()) ?? null;
}

/** Ce que le dossier contient déjà. */
async function fichiersDuDossier(portes, projectId, folderId) {
  const contenu = await portes.listerLeDossier(projectId, folderId);
  return Array.isArray(contenu?.files) ? contenu.files : (Array.isArray(contenu) ? contenu : []);
}

/**
 * La transcription déjà rangée pour ce document, s'il y en a une.
 *
 * **C'est ce qui évite de repayer.** Rend le Markdown et l'état du rangement —
 * `PERIMEE` quand le document porte une transcription d'un autre texte, ce qui
 * n'est pas la même chose que de n'en avoir aucune.
 *
 * @returns {Promise<{etat: string, markdown: string, document: object|null}>}
 */
export async function relireLaRestitution({
  projectId = "", fichier = null, empreinte = "", portes = null
} = {}) {
  const vide = { etat: RANGEE.ABSENTE, markdown: "", document: null };
  if (!projectId || !fichier?.name) return vide;

  try {
    const portails = portes ?? (await portesParDefaut());

    const dossier = await dossierNomme(portails, projectId, DOSSIER_DES_CR);
    if (!dossier?.id) return vide;

    // **C'est l'empreinte qui retrouve le document, pas son nom.** Le même
    // compte rendu s'appelle `CR_07.pdf` chez l'un et `07 - CR.pdf` chez
    // l'autre ; deux comptes rendus différents s'appellent tous deux `CR.pdf`.
    const range = sourceRangee(await fichiersDuDossier(portails, projectId, dossier.id), { empreinte });
    if (!range) return vide;

    return { ...transcriptionRangee(range, { empreinte }), document: range };
  } catch {
    // Ne pas savoir ce qui est rangé n'empêche pas de restituer : on refait,
    // et l'on repaie. C'est ennuyeux, pas grave.
    return vide;
  }
}

/**
 * Peut-on se servir de ce qui est rangé, plutôt que de rappeler le modèle ?
 *
 * **C'est la décision qui économise l'appel**, et elle est ici — pure, donc
 * vérifiable — plutôt que dans l'écran, où elle ne se serait prouvée qu'en
 * relisant du texte.
 *
 * Deux conditions, et la seconde n'est pas un détail : un fichier rangé sans
 * marqueur de page ne se confronte plus au PDF — plus de lecture « Origine »,
 * plus de mesure par page. Le servir quand même donnerait un document d'une
 * seule page, ce qu'il n'est pas (règle 5). On le refait.
 *
 * @returns {{reutilisable: boolean, pages: {page: number, markdown: string}[]}}
 */
export function restitutionReutilisable(rangee = {}) {
  if (rangee?.etat !== RANGEE.A_JOUR) return { reutilisable: false, pages: [] };

  const pages = pagesDuFichierMarkdown(rangee?.markdown);
  return { reutilisable: pages.length > 0, pages };
}

/**
 * Dépose le compte rendu dans le dossier, avec sa transcription sur sa ligne.
 *
 * **L'empreinte entre dans le chemin de stockage, pas seulement dans la ligne.**
 * Le stockage refuse d'écraser (`x-upsert: false`), et deux versions d'un même
 * compte rendu portent le même nom de fichier : sans elle, ranger la seconde
 * échouerait sur un conflit, et l'écran annoncerait « la restitution n'a pas pu
 * être rangée » sans que rien ne dise que c'est le nom qui était pris.
 */
async function deposer(portes, projectId, folderId, fichier, { empreinte, markdown }) {
  const scope = `${folderId}/${texte(empreinte).slice(0, 16) || "sans-empreinte"}`;
  const stockage = await portes.televerser(fichier, { projectId, scope });

  return await portes.ecrireLaLigne({
    project_id: projectId,
    folder_id: folderId,
    created_by: await portes.qui(),
    filename: fichier.name,
    original_filename: fichier.name,
    mime_type: fichier.type || "application/octet-stream",
    storage_bucket: stockage.storage_bucket,
    storage_path: stockage.storage_path,
    file_size_bytes: fichier.size || null,
    upload_status: "uploaded",
    document_kind: "source_pdf",
    // **L'empreinte du texte du PDF.** C'est elle qui dira plus tard si la
    // transcription rangée correspond au document déposé.
    content_fingerprint: empreinte || null,
    // **Un document, un endroit.** La transcription n'est pas un second
    // fichier : elle est sur la ligne de celui qu'elle transcrit.
    transcription_markdown: texte(markdown) || null,
    transcribed_at: texte(markdown) ? new Date().toISOString() : null
  }, "id,filename,content_fingerprint,folder_id,transcription_markdown");
}

/**
 * Ranger le compte rendu et sa transcription.
 *
 * Le PDF n'est déposé que s'il n'est pas déjà là ; s'il l'est, c'est sa ligne
 * qui reçoit la transcription. Le redéposer en ferait un second exemplaire du
 * même document dans le dossier des comptes rendus.
 *
 * @returns {Promise<{range: boolean, document: object|null, dossier: object|null, motif: string}>}
 */
export async function rangerLaRestitution({
  projectId = "", fichier = null, markdown = "", empreinte = "", portes = null
} = {}) {
  const rate = (motif) => ({ range: false, document: null, dossier: null, motif });

  if (!projectId) return rate("aucun projet");
  if (!fichier?.name || !texte(markdown)) return rate("rien à ranger");

  try {
    const portails = portes ?? (await portesParDefaut());

    // **Un dossier pour tous les comptes rendus**, et non un dossier par
    // compte rendu : quarante réunions faisaient quarante dossiers à la racine
    // de Documents, et l'arbre devenait illisible au vingtième.
    const dossier = (await dossierNomme(portails, projectId, DOSSIER_DES_CR))
      ?? (await portails.creerLeDossier(projectId, null, DOSSIER_DES_CR));
    if (!dossier?.id) return rate("le dossier n'a pas pu être créé");

    const fichiers = await fichiersDuDossier(portails, projectId, dossier.id);
    const deja = sourceRangee(fichiers, { empreinte });

    // Déjà rangé, transcription à jour : rien à réécrire.
    if (deja && transcriptionRangee(deja, { empreinte }).etat === RANGEE.A_JOUR) {
      return { range: true, document: deja, dossier, motif: "" };
    }

    // Le document est là, sa transcription manque ou vient d'un autre texte :
    // c'est sa ligne qu'on complète, pas un second exemplaire qu'on dépose.
    const document = deja
      ? await portails.poserLaTranscription(deja.id, {
        transcription_markdown: texte(markdown),
        transcribed_at: new Date().toISOString(),
        content_fingerprint: empreinte || null
      })
      : await deposer(portails, projectId, dossier.id, fichier, { empreinte, markdown });

    if (!document?.id) return rate("le document n'a pas pu être écrit");
    return { range: true, document, dossier, motif: "" };
  } catch (erreur) {
    return rate(texte(erreur?.message) || "cause inconnue");
  }
}
