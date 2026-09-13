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
  RANGEE, nomDeLaRestitution, nomDuDossier, restitutionRangee, sourceRangee
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
    telecharger: depot.downloadDocumentFile,
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
 * La restitution déjà rangée pour ce document, s'il y en a une.
 *
 * **C'est ce qui évite de repayer.** Rend le Markdown et l'état du rangement —
 * `PERIMEE` quand le dossier porte une restitution d'un autre texte, ce qui
 * n'est pas la même chose que de n'en avoir aucune.
 *
 * @returns {Promise<{etat: string, markdown: string, dossier: object|null}>}
 */
export async function relireLaRestitution({
  projectId = "", fichier = null, empreinte = "", portes = null
} = {}) {
  if (!projectId || !fichier?.name) return { etat: RANGEE.ABSENTE, markdown: "", dossier: null };

  try {
    const portails = portes ?? (await portesParDefaut());

    const dossier = await dossierNomme(portails, projectId, nomDuDossier(fichier.name));
    if (!dossier?.id) return { etat: RANGEE.ABSENTE, markdown: "", dossier: null };

    const fichiers = await fichiersDuDossier(portails, projectId, dossier.id);
    const trouvee = restitutionRangee(fichiers, {
      nom: nomDeLaRestitution(fichier.name), empreinte
    });

    if (trouvee.etat !== RANGEE.A_JOUR) {
      return { etat: trouvee.etat, markdown: "", dossier };
    }

    const lu = await portails.telecharger(trouvee.document);
    return { etat: RANGEE.A_JOUR, markdown: await lu.text(), dossier };
  } catch {
    // Ne pas savoir ce qui est rangé n'empêche pas de restituer : on refait,
    // et l'on repaie. C'est ennuyeux, pas grave.
    return { etat: RANGEE.ABSENTE, markdown: "", dossier: null };
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
 * Dépose un fichier dans le dossier, et écrit sa ligne.
 *
 * **L'empreinte entre dans le chemin de stockage, pas seulement dans la ligne.**
 * Le stockage refuse d'écraser (`x-upsert: false`), et deux versions d'un même
 * compte rendu portent le même nom de fichier : sans elle, ranger la seconde
 * échouerait sur un conflit, et l'écran annoncerait « la restitution n'a pas pu
 * être rangée » sans que rien ne dise que c'est le nom qui était pris.
 */
async function deposer(portes, projectId, folderId, fichier, { empreinte, kind }) {
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
    document_kind: kind,
    // **L'empreinte du texte du PDF, sur les deux fichiers.** C'est elle qui
    // dira plus tard si la restitution rangée correspond au document déposé.
    content_fingerprint: empreinte || null
  }, "id,filename,content_fingerprint,folder_id");
}

/**
 * Ranger le compte rendu et sa restitution.
 *
 * Le PDF n'est déposé que s'il n'est pas déjà là : le redéposer en ferait un
 * second exemplaire du même document, dans le dossier qui porte son nom.
 *
 * @returns {Promise<{range: boolean, dossier: object|null, motif: string}>}
 */
export async function rangerLaRestitution({
  projectId = "", fichier = null, markdown = "", empreinte = "", portes = null
} = {}) {
  if (!projectId) return { range: false, dossier: null, motif: "aucun projet" };
  if (!fichier?.name || !texte(markdown)) {
    return { range: false, dossier: null, motif: "rien à ranger" };
  }

  try {
    const portails = portes ?? (await portesParDefaut());
    const nom = nomDuDossier(fichier.name);

    // **À la racine, et nommé comme le PDF.** Un second dépôt du même document
    // retombe dessus au lieu de créer un jumeau.
    const dossier = (await dossierNomme(portails, projectId, nom))
      ?? (await portails.creerLeDossier(projectId, null, nom));
    if (!dossier?.id) return { range: false, dossier: null, motif: "le dossier n'a pas pu être créé" };

    const fichiers = await fichiersDuDossier(portails, projectId, dossier.id);
    const enMd = nomDeLaRestitution(fichier.name);

    // Déjà rangée pour ce texte-là : la redéposer n'ajouterait qu'un doublon.
    if (restitutionRangee(fichiers, { nom: enMd, empreinte }).etat === RANGEE.A_JOUR) {
      return { range: true, dossier, motif: "" };
    }

    if (!sourceRangee(fichiers, { empreinte })) {
      await deposer(portails, projectId, dossier.id, fichier, { empreinte, kind: "source_pdf" });
    }

    const enMarkdown = new File([markdown], enMd, { type: "text/markdown" });
    await deposer(portails, projectId, dossier.id, enMarkdown, {
      empreinte, kind: "restitution_markdown"
    });

    return { range: true, dossier, motif: "" };
  } catch (erreur) {
    return { range: false, dossier: null, motif: texte(erreur?.message) || "cause inconnue" };
  }
}
