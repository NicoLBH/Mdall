/**
 * La structure reconnue avant la transcription.
 *
 * ## Le défaut qu'elle corrige, observé sur un document réel
 *
 * Un compte rendu de douze pages a rendu son tableau des présences avec
 * « Présent / Excusé / Absent / Représenté » page 1, puis « R / E / Présent /
 * Absent » page 2. Deux tableaux là où le document n'en a qu'un — non parce que
 * le modèle lit mal, mais parce qu'on lui faisait trancher douze fois une
 * question qui n'a qu'une réponse.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSIGNES_DE_STRUCTURE, SCHEMA_DE_LA_STRUCTURE, pagesPourLaStructure, structureEnTexte, structureLue
} from "./structure-du-document.js";

const UNE_STRUCTURE = {
  nature: "compte rendu de réunion de chantier",
  decoupage: "par lot, chaque lot portant ses observations datées",
  entete_repete: "CERES – Architecte / SHIBUMI – Architecte",
  pied_repete: "CERES Jérémy D. – Architecte",
  tableaux: [
    {
      nom: "tableau des observations par lot",
      colonnes: ["Date", "Observations – Directives – Décisions", "Pour le", "Fait le"],
      reconnaissance: "quatre colonnes, la deuxième large"
    }
  ],
  consignes: ["Le tableau se poursuit d'une page à l'autre sans redéclarer ses en-têtes."]
};

/* ── L'échantillon ───────────────────────────────────────────────────────── */

/**
 * **Un échantillon, et non le document.** Envoyer les soixante pages d'un CCTP
 * pour apprendre qu'il a trois colonnes coûterait plus cher que la transcription.
 * Mais un document dont on ne verrait que le début rendrait la forme de son
 * préambule : les pages sont donc prises réparties.
 */
test("l'échantillon prend la première, la dernière, et du milieu", () => {
  const pages = Array.from({ length: 12 }, (_, rang) => ({ page: rang + 1, text: "x" }));
  const prises = pagesPourLaStructure(pages).map((page) => page.page);

  assert.equal(prises.length, 6);
  assert.equal(prises[0], 1);
  assert.equal(prises[prises.length - 1], 12);
  // Réparties, et jamais deux fois la même.
  assert.deepEqual(prises, [...prises].sort((a, b) => a - b));
  assert.equal(new Set(prises).size, prises.length);
});

test("un document court part en entier, et une page vide ne part pas", () => {
  const court = [{ page: 1, text: "a" }, { page: 2, text: "b" }];
  assert.deepEqual(pagesPourLaStructure(court), court);

  assert.deepEqual(pagesPourLaStructure([{ page: 1, text: "a" }, { page: 2, text: "  " }]),
    [{ page: 1, text: "a" }]);
  assert.deepEqual(pagesPourLaStructure([]), []);
});

/* ── Le squelette, tel qu'il entre dans la consigne ──────────────────────── */

/**
 * **C'est le champ qui compte.** Les colonnes imposées à toutes les pages sont
 * ce qui rend les douze pages cohérentes.
 */
test("les colonnes reconnues s'imposent à toutes les pages", () => {
  const dit = structureEnTexte(structureLue(UNE_STRUCTURE));

  assert.match(dit, /Date \| Observations – Directives – Décisions \| Pour le \| Fait le/);
  assert.match(dit, /sur TOUTES les pages où le tableau se poursuit/);
  assert.match(dit, /compte rendu de réunion de chantier/);
  assert.match(dit, /ne le restitue qu'une fois/);
  assert.match(dit, /PIÈGES RELEVÉS/);
});

/**
 * **Ne rien savoir n'est pas « ce document n'a ni forme ni tableau ».** Ajouter
 * un bloc vide à la consigne ferait conclure au modèle qu'il n'y a rien à
 * respecter (règle 5).
 */
test("un squelette vide n'ajoute rien à la consigne", () => {
  assert.equal(structureEnTexte(null), "");
  assert.equal(structureEnTexte(structureLue(null)), "");
  assert.equal(structureEnTexte(structureLue({ nature: "", tableaux: [], consignes: [] })), "");
});

/** Un tableau sans colonne n'apprend rien, et ferait croire à une forme. */
test("un tableau sans colonne est écarté", () => {
  const lue = structureLue({
    ...UNE_STRUCTURE,
    tableaux: [...UNE_STRUCTURE.tableaux, { nom: "vide", colonnes: [], reconnaissance: "" }]
  });

  assert.equal(lue.tableaux.length, 1);
  assert.doesNotMatch(structureEnTexte(lue), /vide/);
});

/* ── Ce qu'elle ne fait pas ──────────────────────────────────────────────── */

/**
 * Elle regarde, elle ne transcrit pas. Une reconnaissance qui recopierait les
 * cellules coûterait le prix de la transcription pour rendre un squelette.
 */
test("la consigne demande la forme, et interdit le contenu", () => {
  assert.match(CONSIGNES_DE_STRUCTURE, /Tu ne transcris rien/);
  assert.match(CONSIGNES_DE_STRUCTURE, /Ne recopie pas le contenu des cellules/);
  assert.match(CONSIGNES_DE_STRUCTURE, /N'invente aucun tableau/);
  // Et rien de propre au chantier : elle sert aussi aux rapports et aux CCTP.
  assert.match(CONSIGNES_DE_STRUCTURE, /CCTP/);
});

/** Le schéma est strict : chaque propriété est requise, et rien d'autre n'entre. */
test("le schéma du squelette est complet", () => {
  const verifier = (noeud, chemin) => {
    if (noeud?.type === "object") {
      const proprietes = Object.keys(noeud.properties ?? {});
      assert.deepEqual([...(noeud.required ?? [])].sort(), proprietes.sort(), `${chemin} : requis incomplets`);
      assert.equal(noeud.additionalProperties, false, `${chemin} : accepte n'importe quoi`);
      for (const [nom, fils] of Object.entries(noeud.properties ?? {})) verifier(fils, `${chemin}.${nom}`);
    }
    if (noeud?.type === "array") verifier(noeud.items, `${chemin}[]`);
  };

  verifier(SCHEMA_DE_LA_STRUCTURE.schema, "schema");
  assert.equal(SCHEMA_DE_LA_STRUCTURE.strict, true);
});
