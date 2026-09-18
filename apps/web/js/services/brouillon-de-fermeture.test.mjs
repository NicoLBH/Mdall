import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { matiereDuPoint } from "./brouillon-de-fermeture.js";

/** Un sujet et son fil. Aucun nom réel : rien ici ne désigne personne. */
const POINT = {
  id: "p-1",
  title: "Quelle profondeur hors gel retenir au bâtiment A ?",
  description: "L'altitude du terrain est de 742,30 m NGF et le sol est une moraine compacte."
};

const MESSAGES = [
  { id: "m-1", subject_id: "p-1", body_markdown: "On avait envisagé 0,50 m, écarté.",
    created_at: "2026-03-01T09:00:00Z", visibility: "normal", deleted_at: null },
  // La conversation avec le copilote. Elle ne sort jamais du projet.
  { id: "m-2", subject_id: "p-1", body_markdown: "Copilote : d'après la mémoire, l'altitude est 742,30.",
    created_at: "2026-03-01T10:00:00Z", visibility: "ephemeral", deleted_at: null },
  { id: "m-3", subject_id: "p-1", body_markdown: "Un message effacé.",
    created_at: "2026-03-01T11:00:00Z", visibility: "normal", deleted_at: "2026-03-02T08:00:00Z" }
];

/* ── Ce qui part au copilote ─────────────────────────────────────────────── */

test("la conversation avec le copilote ne part jamais", () => {
  // L'interdit qui compte le plus : un échange avec le copilote est privé. Il ne
  // se montre pas aux collaborateurs, et il ne s'envoie pas davantage à un
  // modèle pour qu'il en fasse un brouillon qu'ils liront.
  const matiere = matiereDuPoint(POINT, MESSAGES);

  assert.equal(matiere.includes("d'après la mémoire"), false, "un échange avec le copilote est parti");
  assert.equal(matiere.includes("Copilote :"), false);
});

test("un message effacé ne part pas non plus", () => {
  // Il a été retiré : l'envoyer le ferait revenir par la fenêtre de fermeture.
  assert.equal(matiereDuPoint(POINT, MESSAGES).includes("Un message effacé"), false);
});

test("le titre, la description et les commentaires partent, étiquetés", () => {
  // Sans les étiquettes, le modèle reçoit un bloc de prose où la description et
  // les commentaires se confondent, et il attribue à l'un ce que l'autre a dit.
  const matiere = matiereDuPoint(POINT, MESSAGES);

  assert.match(matiere, /le titre : Quelle profondeur hors gel/);
  assert.match(matiere, /la description : L'altitude du terrain/);
  assert.match(matiere, /un commentaire : On avait envisagé 0,50 m/);
});

test("un sujet sans rien à lire ne fait pas d'appel", () => {
  assert.equal(matiereDuPoint(null, []), "");
  assert.equal(matiereDuPoint({ id: "p-1" }, []), "");
});

test("la garde de confidentialité n'est pas recopiée ici", () => {
  // Une seconde copie de « un échange avec le copilote est privé » finirait par
  // ne plus dire la même chose que la première (règle 10) — et c'est la copie
  // oubliée qui laisserait fuir. Elle vit dans `messageLisible`, et ce fichier
  // passe par `textesDuPoint`, qui l'applique.
  const source = readFileSync(new URL("./brouillon-de-fermeture.js", import.meta.url), "utf8");

  assert.match(source, /textesDuPoint\(point, messages\)/,
    "la matière ne passe pas par la lecture qui refuse les messages privés");
  assert.equal(/ephemeral/.test(source), false,
    "la règle de confidentialité est recopiée dans ce fichier");
});

/* ── Ce que le client ne compose pas ─────────────────────────────────────── */

test("aucune consigne au modèle ne vit dans le navigateur", () => {
  // Ce qu'on demande au modèle ne sort pas du serveur : on ne le lit pas avec
  // F12, et cette fonction Edge ne devient pas un relais ouvert vers un modèle
  // payant. Le client envoie du texte, il ne compose aucune instruction.
  const source = readFileSync(
    new URL("./brouillon-de-fermeture-supabase.js", import.meta.url), "utf8");

  for (const mot of ["instructions", "system", "prompt", "RÈGLE ABSOLUE", "Tu réponds"]) {
    assert.equal(source.includes(mot), false, `« ${mot} » vit dans le navigateur`);
  }
  // Et le corps envoyé ne porte que le projet et la matière.
  assert.match(source, /JSON\.stringify\(\{ project_id: projectId, matiere \}\)/,
    "le client envoie autre chose que le fil");
});

test("le refus du contrôle remonte jusqu'à la fenêtre", () => {
  // « Le copilote a écrit un chiffre qui ne figure nulle part dans ce sujet » dit
  // pourquoi les champs sont vides. Le taire ferait croire que le copilote n'a
  // rien trouvé, et l'on recommencerait.
  const source = readFileSync(
    new URL("./brouillon-de-fermeture-supabase.js", import.meta.url), "utf8");

  assert.match(source, /if \(!reponse\.ok\) return \{ brouillon: null, dit: texte\(lu\?\.dit\) \}/,
    "un brouillon écarté remonte sans sa raison");
});

/* ── La fenêtre de fermeture ─────────────────────────────────────────────── */

test("un champ rempli par le copilote porte sa marque", () => {
  // C'est là, et nulle part ailleurs, que le pré-remplissage deviendrait un
  // mensonge : un champ pré-rempli sans marque se signe comme un champ qu'on a
  // écrit soi-même.
  const fenetre = readFileSync(
    new URL("../views/ui/decision-du-sujet.js", import.meta.url), "utf8"
  );

  // Un seul endroit écrit une valeur du brouillon dans un champ, et cet
  // endroit-là pose la marque. La chercher dans le fichier entier ne prouve
  // rien : le branchement qui la retire la nomme aussi.
  const poseur = fenetre.slice(
    fenetre.indexOf("const propose = (valeur)"), fenetre.indexOf("const ecartes =")
  );
  assert.match(poseur, /value=/, "rien n'écrit la valeur du copilote");
  assert.match(poseur, /data-decision-propose/,
    "une valeur du copilote entre dans un champ sans sa marque");

  // Aucune valeur du brouillon n'arrive dans un champ autrement que par là.
  const corps = fenetre.slice(fenetre.indexOf("function renderFenetre"), fenetre.indexOf("/** La question posée"));
  for (const champ of ["brouillon.question", "brouillon?.retenu", "brouillon?.motif"]) {
    assert.ok(corps.includes(`propose(${champ})`), `« ${champ} » entre dans un champ sans passer par la marque`);
  }
});

test("la marque tombe dès qu'on touche au champ", () => {
  // La laisser ferait porter à une ligne corrigée à la main l'aveu qu'elle vient
  // du copilote, ce qui est faux — et l'on relirait deux fois ce qu'on a écrit
  // soi-même.
  const fenetre = readFileSync(
    new URL("../views/ui/decision-du-sujet.js", import.meta.url), "utf8"
  );

  assert.match(fenetre, /addEventListener\("input", \(\) => champ\.removeAttribute\("data-decision-propose"\)/,
    "la marque reste après correction");
});

test("la fenêtre reçoit les trois lectures, et aucune ne bloque les autres", () => {
  // Trois lectures en série feraient attendre trois fois devant une fenêtre
  // qu'on ouvre en fin de journée. Et l'une qui échouerait emporterait les
  // autres : chacune se tait toute seule, aucune ne jette.
  const source = readFileSync(
    new URL("../views/project-subjects/project-subjects-actions.js", import.meta.url), "utf8"
  );

  assert.match(source, /Promise\.all\(\[\s*cequOnADejaRaisonne\(target\.id\),\s*cequOnATrancheAilleurs\(target\.id\),\s*brouillonDeFermeture\(target\.id\)\s*\]\)/,
    "les trois lectures ne se font pas ensemble");
  assert.match(source, /ailleurs,/, "la fenêtre s'ouvre sans ce qu'on a tranché ailleurs");
  assert.match(source, /brouillon: ecritParLeCopilote\.brouillon/, "la fenêtre s'ouvre sans le brouillon");
});

test("le référentiel se consulte par le départ, avant qu'on ait tranché", () => {
  // La conclusion est ce qu'on s'apprête à écrire : on ne l'a pas. Chercher par
  // elle ne trouverait jamais rien au moment où cela sert.
  const source = readFileSync(
    new URL("../views/project-subjects/project-subjects-actions.js", import.meta.url), "utf8"
  );

  const lecture = source.slice(
    source.indexOf("async function cequOnATrancheAilleurs"),
    source.indexOf("async function brouillonDeFermeture")
  );
  assert.match(lecture, /ceQuAilleursOnEnTire\(entrees, formes\)/,
    "le référentiel n'est pas consulté par le départ du sujet");
  assert.match(lecture, /if \(liens === null \|\| assertions === null \|\| formes === null\) return "";/,
    "une lecture ratée devient une phrase");
});
