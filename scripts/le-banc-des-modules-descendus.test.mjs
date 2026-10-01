/**
 * **Chaque module descendu se charge pour de vrai.**
 *
 * ## Le défaut que ce banc existe pour attraper
 *
 * Les modules de `apps/web/js` sont copiés vers `_shared/versement` et leurs
 * imports **réécrits** : `../utils/sha256.js` devient `./sha256.js`. La copie
 * est vérifiée au caractère près — mais au caractère près d'une réécriture qui
 * peut parfaitement être fausse.
 *
 * Un import qui ne désigne rien ne casse pas la copie : il casse la **fonction
 * de bord**, en production, au premier appel. Et le message parlera d'un module
 * introuvable, pas de la raison.
 *
 * La fermeture est maintenant calculée et compte quatre-vingt-treize modules.
 * Une liste de quinze noms se relisait ; quatre-vingt-treize, non.
 *
 * ## Ce qu'on éprouve, et ce qu'on n'éprouve pas
 *
 * Que le graphe **se résout** et que chaque corps de premier niveau s'exécute
 * sans lever. C'est du JavaScript ordinaire : Node le charge aussi bien que
 * Deno. Ce qui diffère entre les deux — `Deno.env`, les imports `npm:` — vit
 * dans la fonction de bord elle-même, pas dans ce qui descend.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COPIE = path.join(RACINE, "supabase", "functions", "_shared", "versement");

const sansCopie = !existsSync(COPIE) && "la copie n'a pas été faite (npm run prepare:versement)";

test("chaque module descendu se charge", { skip: sansCopie }, async () => {
  const fautes = [];
  const modules = readdirSync(COPIE).filter((nom) => nom.endsWith(".js")).sort();

  for (const nom of modules) {
    try {
      await import(pathToFileURL(path.join(COPIE, nom)).href);
    } catch (erreur) {
      fautes.push(`${nom} — ${erreur?.message ?? erreur}`);
    }
  }

  assert.deepEqual(fautes, [],
    `ces modules ne se chargeraient pas au serveur :\n${fautes.join("\n")}`);
});

/**
 * **Le compte est une garde, pas une décoration.** Un dossier vide rendrait une
 * liste de fautes vide, et l'épreuve passerait en n'ayant rien chargé du tout
 * (règle 12).
 */
test("le banc a bien chargé les modules", { skip: sansCopie }, () => {
  const modules = readdirSync(COPIE).filter((nom) => nom.endsWith(".js"));
  assert.ok(modules.length > 50, `trop peu de modules descendus : ${modules.length}`);
});

/**
 * **Ce que la fonction de bord demande nommément doit s'y trouver.**
 *
 * Elle importe ces noms-là, un par un. Un export renommé dans le service — ce
 * qui est arrivé deux fois à l'Atelier — ne casse ni la copie ni le chargement :
 * il casse l'appel, au premier compte rendu.
 */
test("la fonction de bord trouve ce qu'elle importe", { skip: sansCopie }, async () => {
  const attendus = {
    "la-file-des-comptes-rendus.js": [
      "DANS_LA_FILE", "apresUnPas", "laFileEstFinie", "leProchainDeLaFile",
      "lesComptesDeLaFile", "phraseDeLaFile", "uneFileDeComptesRendus"
    ],
    "lecture-du-cr.js": ["confrontation", "lectureAssemblee"],
    "liens-du-cr.js": ["verifierLesLiens"],
    "reconstitution-markdown.js": [
      "assemblerLeMarkdown", "enFichierMarkdown", "fideliteDeLaReconstitution", "pagesALire"
    ],
    "lire-un-fichier-texte.js": ["estUnFichierTexte", "laRestitutionDunTexte", "pagesDuTexte"],
    "identite-du-compte-rendu.js": ["identiteDuCompteRendu"],
    "proposition-du-cr.js": ["introDuCompteRendu", "itemsDuCompteRendu", "titreDeLaProposition"],
    "atelier-proposition.js": ["preparerUneProposition"],
    // Et ce que la fonction des mails demande, qui descend par le même chemin.
    "le-versement-en-ordre.js": ["verser"],
    "le-journal-du-depouillement.js": ["laLigneDunVersement"],
    "le-convoi.js": ["SORT", "noter", "phraseDuConvoi"]
  };

  for (const [nom, noms] of Object.entries(attendus)) {
    const module = await import(pathToFileURL(path.join(COPIE, nom)).href);
    for (const attendu of noms) {
      assert.notEqual(module[attendu], undefined,
        `« ${nom} » ne rend pas « ${attendu} » : la fonction de bord tomberait à l'appel`);
    }
  }
});
