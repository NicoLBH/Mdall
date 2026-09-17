/**
 * Ce qui existe encore au moment où on s'en sert, dans l'envoi au Copilote.
 *
 * ## Le défaut, et pourquoi rien ne l'a vu
 *
 * `assertions` — les affirmations de la mémoire du projet — a été déclaré dans
 * la branche qui les **annonce à l'écran**, et non au niveau de la fonction.
 * Elles servent bien plus bas : les utilitaires s'en pré-remplissent, et le
 * moteur de variante les compare à ce que le projet tient pour vrai.
 *
 * Le résultat est une ligne rouge sous la zone de saisie, `assertions is not
 * defined`, **au premier appel d'outil** — c'est-à-dire sur la question la plus
 * chère de l'écran, celle qui vient avec une note de calcul. La question
 * partait, la réponse ne venait jamais, et le message ne disait rien de la
 * cause.
 *
 * ## Pourquoi c'est une lecture de source
 *
 * Aucune exécution ne l'attrape ici : `copilote-service.js` parle à la base, et
 * son import lève avant la première ligne — l'authentification tire son client
 * d'un CDN. Le dépôt n'a pas de linter, et la syntaxe est parfaitement valide :
 * le défaut n'apparaît qu'au moment où la ligne s'exécute, dans un navigateur,
 * sur un chemin qu'il faut une note de calcul pour atteindre.
 *
 * C'est exactement la catégorie qu'on accepte de vérifier en lisant : un nom
 * qui n'existe plus là où on l'emploie, et que rien ne signale avant l'usage.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./copilote-service.js", import.meta.url), "utf8");

/** Le corps de `sendAssistMessage`, jusqu'à la fin du fichier. */
const envoi = source.slice(source.indexOf("export async function sendAssistMessage"));

/**
 * Chaque `const`/`let` de cette fonction, avec la profondeur d'accolades où il
 * est déclaré. Zéro est le corps de la fonction elle-même.
 */
function declarations(corps) {
  const trouvees = [];
  let profondeur = 0;

  for (const ligne of corps.split("\n")) {
    // Les commentaires ne déclarent rien, et leurs accolades ne comptent pas.
    const code = ligne.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");

    const declare = code.match(/^\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/);
    if (declare) trouvees.push({ nom: declare[1], profondeur });

    profondeur += (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
  }

  return trouvees;
}

/**
 * **Ce qui sert dans la boucle des outils se déclare au niveau de la fonction.**
 *
 * La boucle est tout en bas ; une valeur déclarée dans un `if` du haut n'y
 * existe plus. La garde nomme les trois qui la traversent — le contexte, les
 * affirmations, le projet — parce que ce sont celles dont l'absence ne se voit
 * qu'au moment d'appeler un utilitaire.
 */
test("ce que la boucle des outils emploie existe encore quand elle tourne", () => {
  const posees = declarations(envoi);

  for (const nom of ["context", "assertions", "projectId"]) {
    const sienne = posees.find((declaration) => declaration.nom === nom);
    assert.ok(sienne, `${nom} est déclaré dans l'envoi`);
    assert.equal(
      sienne.profondeur, 1,
      `${nom} est déclaré dans le corps de la fonction, et non dans une branche : `
        + "la boucle des outils s'en sert bien plus bas, et une branche l'y ferait disparaître"
    );
  }
});

/**
 * Et elles s'en servent réellement : une garde qui protégerait une valeur que
 * plus personne n'emploie ne protégerait rien.
 */
test("la boucle des outils emploie bien ces valeurs", () => {
  const boucle = envoi.slice(envoi.indexOf("for (const appel of appels)"));

  for (const nom of ["assertions", "projectId"]) {
    assert.match(boucle, new RegExp(`\\b${nom}\\b`), `${nom} sert dans la boucle`);
  }
});
