import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderAttenteSpinner, renderSpinnerHtml } from "./spinner.js";

const lire = (chemin) => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");

/* ── Une seule figure pour une seule attente ─────────────────────────────── */

/**
 * Trois écrans attendent quelque chose — le copilote pendant qu'il réfléchit,
 * la revue d'une proposition pendant que l'analyse tourne, le bouton de fusion
 * pendant qu'on ne peut pas encore fusionner. Trois attentes de même nature :
 * leur donner trois figures ferait croire à trois choses différentes.
 */
test("le sablier de l'attente est celui du copilote", () => {
  const html = renderAttenteSpinner();

  assert.match(html, /class="copilote-spinner"/);
  assert.match(html, /attachment-upload-spinner/);
});

test("muet par défaut, nommé quand on le nomme", () => {
  // Un sablier posé à côté d'un mot n'a rien à répéter aux lecteurs d'écran ;
  // seul reste à nommer celui qui tourne seul.
  assert.match(renderAttenteSpinner(), /aria-hidden="true"/);

  const nomme = renderAttenteSpinner({ label: "Analyse en cours" });
  assert.match(nomme, /role="status"/);
  assert.match(nomme, /aria-label="Analyse en cours"/);
});

test("il ne se confond pas avec l'anneau des chargements de tableau", () => {
  // L'un se pose en ligne, dans un bouton ; l'autre occupe un vide. Les
  // échanger ferait sauter la largeur d'un bouton ou écraser une cellule.
  assert.doesNotMatch(renderAttenteSpinner(), /ui-spinner/);
  assert.match(renderSpinnerHtml(), /ui-spinner__ring/);
});

test("le copilote et la revue tirent du même endroit", () => {
  for (const chemin of ["../studio/copilote/copilote.js", "../project-propositions.js"]) {
    const source = lire(chemin);
    assert.match(source, /renderAttenteSpinner/, `${chemin} n'emploie pas le sablier commun`);
    assert.doesNotMatch(
      source,
      /class="copilote-spinner"/,
      `${chemin} redessine le sablier au lieu de l'appeler`
    );
  }
});

/**
 * Le bouton ne portait que la roue, au motif qu'écrire « Analyse » à côté
 * aurait dit deux fois la même chose. Une roue dit « ça tourne », elle ne dit
 * pas *quoi* — et depuis que la lecture d'un compte rendu passe par le modèle,
 * elle tourne assez longtemps pour qu'on croie l'écran figé.
 */
test("le bouton d'état dit ce qu'on attend, pas seulement qu'on attend", () => {
  const source = lire("../project-propositions.js");
  const bouton = source.slice(source.indexOf("function renderMergeStateButton"));

  assert.match(bouton.slice(0, 2000), /renderAttenteSpinner\(\)/);
  assert.match(bouton.slice(0, 2000), /Analyse en cours/);
});

/* ── Qui parle dans le fil d'une proposition ─────────────────────────────── */

/**
 * Ouvrir une proposition est l'acte d'une personne. Mdall rédige la note de
 * dépôt — il ne la **dit** pas : l'écran en faisait un second message, avec un
 * second avatar, sous un premier message qui annonçait « aucune description
 * n'a été donnée » alors que le texte était juste en dessous.
 */
test("la note de dépôt n'est plus un message à elle seule", () => {
  const source = lire("../project-propositions.js");

  assert.match(source, /function renderDepositNoteBody/);
  assert.doesNotMatch(
    source,
    /a rédigé la note de dépôt le/,
    "la note se signe encore comme un message du fil"
  );
});
