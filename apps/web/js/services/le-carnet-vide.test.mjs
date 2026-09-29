/**
 * Ce que le carnet gardait de côté, et qu'on fait d'un coup.
 *
 * Dix chantiers notés « vus, compris, pas maintenant ». Cette page les éprouve
 * ensemble parce qu'ils ont été faits ensemble ; chacun garde son titre, et la
 * raison pour laquelle il attendait est écrite au-dessus de ses épreuves.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  couperLUnite, estMesuree, entreesDuneSignature, ligneDeDonnee, ligneDeFonction,
  blocDeRegle, enClair, texteDesLignes
} from "./memoire-en-texte.js";
import { lireUnFichier, sansBornes, lireUneCondition, jetonsDeLaLigne } from "./memoire-en-lecture.js";
import { ouAllerDansLeTexte } from "./brouillon-mdall.js";
import { renderResultats } from "../views/studio/dev/ecrire-en-mdall.js";
import { renderRejeuDesFonctions } from "../views/project-memoire-fichiers.js";
import { aProposerDuBrouillon } from "./proposition-du-brouillon.js";
import { ceQuElleParaitRendre, ceQuElleAnnonce } from "./memoire-en-lecture.js";
import { verifierLeBrouillon, ENNUI } from "./verification-du-brouillon.js";
import { lancerLeBrouillon } from "./bac-dessai.js";
import {
  ENTRE, HORS, nappeDesCases, courbeDeLaColonne, interpolerLaNappe, interpoler,
  phraseDeLaLectureDeLaNappe, phraseDuRefusDeLaNappe
} from "./courbe-du-mdall.js";
import { champsDuBrouillon } from "./formulaire-du-brouillon.js";

/* ════════════════════════════════════════════════════════════════════════════
 * L'euro se colle au nombre
 *
 * `120 €` se lisait, `120€` non — là où `20%` et `30°` se collent déjà. On
 * obtenait le **texte** « 120€ » au lieu d'une mesure : la comparaison se
 * taisait au lieu de compter, ce qui est le pire des deux (règle 5). Et un
 * devis se recopie tel qu'il est imprimé.
 * ════════════════════════════════════════════════════════════════════════════ */

test("l'euro collé au nombre est une mesure", () => {
  assert.deepEqual(couperLUnite("120€"), { nombre: "120", unite: "€" });
  assert.deepEqual(couperLUnite("1 250,50€"), { nombre: "1 250,50", unite: "€" });
  assert.deepEqual(couperLUnite("-40€"), { nombre: "-40", unite: "€" });
  assert.equal(estMesuree("120€"), true);

  // Les deux formes disent la même chose : c'est tout l'enjeu.
  assert.deepEqual(couperLUnite("120€"), couperLUnite("120 €"));
});

test("les autres monnaies ne suivent pas, et un nom n'en est pas une", () => {
  /**
   * Mdall n'a qu'une monnaie. Ouvrir la porte à `$` et `£` donnerait des
   * mesures qui ne se comparent à rien — aucune unité ne les connaît —, ce qui
   * se relit plus mal qu'un texte.
   */
  assert.deepEqual(couperLUnite("120$"), { nombre: "120$", unite: "" });
  assert.deepEqual(couperLUnite("120£"), { nombre: "120£", unite: "" });
  assert.deepEqual(couperLUnite("€uro"), { nombre: "€uro", unite: "" });
});

test("un euro collé se compare à un euro espacé, dans une vraie règle", () => {
  const lu = lireUnFichier([
    "fonction Régime du marché(zones, Montant) {",
    "   si (Montant > 90000€)",
    '   alors ("procédure formalisée");',
    '   sinon ("procédure adaptée");',
    "}"
  ].join("\n"));

  assert.deepEqual(lu.refus, []);
  assert.deepEqual(lu.blocs[0].conditions[0].valeur, ["90000"]);
  assert.equal(lu.blocs[0].conditions[0].unite, "€");
});

/* ════════════════════════════════════════════════════════════════════════════
 * `si (A) et (B)` sur une seule ligne
 *
 * Le `et` d'une condition veut sa propre ligne. Écrit à la suite, tout ce qui
 * suivait le premier guillemet était avalé dans la valeur attendue : on
 * obtenait une clause `A = 1") et (B = "2` qui s'affichait telle quelle dans la
 * trace et répondait « faux » avec aplomb. Un résultat plausible et faux — la
 * seule faute que cette langue ne pardonne pas.
 *
 * C'est un **refus** qui manquait, pas une lecture à élargir : la forme sur
 * deux lignes existe et marche.
 * ════════════════════════════════════════════════════════════════════════════ */

const REGLE = (condition) => [
  "fonction Teinte(zones, A, B, Hauteur) {",
  `   ${condition}`,
  '   alors ("ivoire");',
  "}"
].join("\n");

test("le `et` entre deux parenthèses se refuse, et se nomme", () => {
  const lu = lireUnFichier(REGLE('si (A = "1") et (B = "2")'));

  assert.deepEqual(lu.blocs[0].conditions, []);
  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /« et » relie deux lignes/);
  // La phrase montre la ligne à écrire : renvoyer relire la grammaire pour un
  // retour chariot serait cruel.
  assert.match(lu.refus[0].raison, /passez à la ligne/);
});

test("le `et` à l'intérieur d'une parenthèse se refuse aussi", () => {
  /**
   * Celui-là ne se voyait **pas du tout** : la ligne se lisait, et la clause
   * répondait. Le premier au moins laissait une parenthèse à l'écran.
   */
  const lu = lireUnFichier(REGLE('si (A = "1" et B = "2")'));

  assert.deepEqual(lu.blocs[0].conditions, []);
  assert.equal(lu.refus.length, 1);
  assert.match(lu.refus[0].raison, /« et » relie deux lignes/);
});

test("la forme sur deux lignes est celle qu'on demande, et elle marche", () => {
  const lu = lireUnFichier([
    "fonction Teinte(zones, A, B) {",
    '   si (A = "1")',
    '   et (B = "2")',
    '   alors ("ivoire");',
    "}"
  ].join("\n"));

  assert.deepEqual(lu.refus, []);
  assert.deepEqual(lu.blocs[0].conditions.map((une) => [une.sujet, une.valeur]),
    [["A", ["1"]], ["B", ["2"]]]);
});

test("le `ou` d'une énumération reste, et le `et` d'un texte cité aussi", () => {
  /**
   * `= "1" ou "2"` est la forme du domaine fermé : elle ne porte aucun second
   * comparateur, et la refuser casserait la moitié des déclarations du projet.
   * `= "porte et fenêtre"` est une valeur — le `et` d'un texte cité n'est pas
   * un mot de la langue.
   */
  const enumeration = lireUnFichier(REGLE('si (A = "1" ou "2")'));
  assert.deepEqual(enumeration.refus, []);
  assert.deepEqual(enumeration.blocs[0].conditions[0].valeur, ["1", "2"]);

  const cite = lireUnFichier(REGLE('si (A = "porte et fenêtre")'));
  assert.deepEqual(cite.refus, []);
  assert.deepEqual(cite.blocs[0].conditions[0].valeur, ["porte et fenêtre"]);
});

test("les deux moitiés du refus défendent chacune leur cas", () => {
  /**
   * **Un `et` sans second comparateur** : `= "1" et "2"` — quelqu'un qui voulait
   * écrire « ou ». Il se lisait comme la valeur `1" et "2`, que personne n'a
   * écrite.
   */
  const etSeul = lireUnFichier(REGLE('si (A = "1" et "2")'));
  assert.deepEqual(etSeul.blocs[0].conditions, []);
  assert.equal(etSeul.refus.length, 1);

  /**
   * **Un second comparateur sans `et`** : `A = B = C`, la chaîne de
   * comparaisons des langages de programmation. Elle se lisait comme la valeur
   * `B = C`, c'est-à-dire un nom que personne ne lit.
   */
  const deuxFois = lireUnFichier(REGLE("si (A = B = C)"));
  assert.deepEqual(deuxFois.blocs[0].conditions, []);
  assert.equal(deuxFois.refus.length, 1);
});

test("une comparaison ordinaire ne se prend pas dans le refus", () => {
  for (const condition of [
    "si (Hauteur > 28 m)",
    "si (A != B)",
    'si (A parmi "x" ou "y")',
    "si (A renseigné)",
    'si (Couleur des volets(zones, A) = "violet")'
  ]) {
    const lu = lireUnFichier(REGLE(condition));
    assert.deepEqual(lu.refus, [], `« ${condition} » se fait refuser à tort`);
    assert.equal(lu.blocs[0].conditions.length, 1, `« ${condition} » ne se lit pas`);
  }
});

test("une parenthèse ne se décolle que si elle borne vraiment", () => {
  /**
   * C'est la cause, et elle vit ici : on retirait la première et la dernière
   * sans regarder si elles se répondent.
   */
  assert.deepEqual(sansBornes('(A = "1")'), { corps: 'A = "1"', borne: true });
  assert.deepEqual(sansBornes('(A = "1") et (B = "2")'),
    { corps: '(A = "1") et (B = "2")', borne: false });
  // Une parenthèse imbriquée se répond bien, elle : un appel se décolle comme
  // avant.
  assert.deepEqual(sansBornes("(Couleur des volets(zones, A) = \"violet\")"),
    { corps: 'Couleur des volets(zones, A) = "violet"', borne: true });
});

test("une condition qui porte deux comparaisons n'en est pas une", () => {
  // Au plus près : la lecture d'une condition rend `null`, et c'est l'appelant
  // qui refuse en le disant.
  assert.equal(lireUneCondition('A = "1" et B = "2"'), null);
  assert.equal(lireUneCondition('A = "1" ou "2"') === null, false);
  assert.equal(lireUneCondition('A = "porte et fenêtre"') === null, false);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Le dédoublonnage d'une signature était écrit trois fois
 *
 * « Cette liste de paramètres se dédoublonne-t-elle ? » recevait trois réponses
 * sur le chemin. On l'avait découvert en cassant : il fallait les casser
 * **toutes les trois** pour qu'une épreuve tombe, c'est-à-dire qu'en casser une
 * ne se voyait jamais (règle 4).
 *
 * Laquelle garder n'était pas une affaire de goût : l'une des trois comptait de
 * travers, et cela se voyait à l'écran.
 * ════════════════════════════════════════════════════════════════════════════ */

test("une ligne tapée se recolore au caractère près, doublons compris", () => {
  /**
   * C'est ce qui tranche. `jetonsDeLaLigne` recolore une ligne **telle qu'on
   * l'a tapée** — c'est le rendu d'un diff. Une entrée répétée y disparaissait :
   * du texte qui s'efface d'un écran qui existe pour montrer ce qui change.
   */
  for (const ligne of [
    "Classement du bâtiment (Hauteur, Hauteur)",
    "fonction F(zones, A, A) {",
    "courbe C(zones, A, A) {",
    "X (A)"
  ]) {
    assert.equal(jetonsDeLaLigne(ligne).map((un) => un.texte).join(""), ligne);
  }
});

test("les deux écritures d'une signature posent ce qu'on leur donne", () => {
  // Elles se répondaient différemment ; c'est fini, et c'est `ligneDeFonction`
  // qui avait raison.
  assert.equal(enClair(ligneDeDonnee("X", ["A", "A"], { regle: true })), "fonction X(A, A)");
  assert.equal(enClair(ligneDeFonction("X", ["A", "A"])), "fonction X(A, A)");
});

test("c'est la composition de la liste qui dédoublonne, et elle seule", () => {
  assert.deepEqual(entreesDuneSignature(["A", "A", ""]), ["A"]);
  assert.deepEqual(entreesDuneSignature(["zones", "A", "B", "A"]), ["zones", "A", "B"]);
  // L'ordre est celui de la première apparition : une signature réordonnée se
  // relirait comme un changement qu'on n'a pas fait.
  assert.deepEqual(entreesDuneSignature(["B", "A", "B"]), ["B", "A"]);
  // Un nom vide n'est pas une entrée : il écrirait une virgule qui n'ouvre sur
  // rien.
  assert.deepEqual(entreesDuneSignature([null, undefined, "  ", "A"]), ["A"]);
});

test("une règle qui lit deux fois le même nom ne le déclare qu'une fois", () => {
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: "Teinte",
    conditions: [{ sujet: "Nature", operateur: "=", valeur: ["bois"] }],
    sinonSi: [{ conditions: [{ sujet: "Nature", operateur: "=", valeur: ["alu"] }], alors: "gris" }],
    alors: "violet"
  }));

  assert.match(ecrit, /^fonction Teinte\(zones, Nature\) \{/m);
});

/* ════════════════════════════════════════════════════════════════════════════
 * Un refus mène à sa ligne
 *
 * Le bac disait « essai.ref · ligne 7 », la console « essai.ref:7 », et il
 * fallait aller compter dans la gouttière. Pour quarante lignes, on compte deux
 * fois et l'on se trompe une fois sur trois — puis on corrige la ligne d'à
 * côté, ce qui fait un second refus.
 * ════════════════════════════════════════════════════════════════════════════ */

test("où poser le curseur pour atteindre une ligne", () => {
  const texte = ["fonction F() {", "   si (A)", '   alors ("x");', "}"].join("\n");

  assert.deepEqual(ouAllerDansLeTexte(texte, 1), { debut: 0, fin: 14 });
  assert.equal(texte.slice(...Object.values(ouAllerDansLeTexte(texte, 2))), "   si (A)");
  assert.equal(texte.slice(...Object.values(ouAllerDansLeTexte(texte, 4))), "}");

  /**
   * **La ligne se borne sans son retour chariot.** La sélectionner entière
   * avec son saut ferait clignoter la ligne d'en dessous, et l'on croirait
   * s'être trompé de numéro.
   */
  const deuxieme = ouAllerDansLeTexte(texte, 2);
  assert.equal(texte[deuxieme.fin], "\n");
});

test("une ligne qui n'existe pas ne pose pas de curseur au hasard", () => {
  /**
   * Un curseur posé n'importe où ne se voit pas — il se voit **à côté**, et
   * l'on corrige la mauvaise ligne (règle 5).
   */
  const texte = "une ligne\ndeux";

  assert.equal(ouAllerDansLeTexte(texte, 3), null);
  assert.equal(ouAllerDansLeTexte(texte, 0), null);
  assert.equal(ouAllerDansLeTexte(texte, -1), null);
  assert.equal(ouAllerDansLeTexte(texte, "sept"), null);
  assert.equal(ouAllerDansLeTexte(texte, null), null);
  // Un texte vide a bien une première ligne, et elle est vide.
  assert.deepEqual(ouAllerDansLeTexte("", 1), { debut: 0, fin: 0 });
});

test("un refus du bac porte de quoi aller à sa ligne", () => {
  const html = renderResultats([], { refus: [
    { fichier: "essai.ref", ligne: 7, texte: 'si (A = "1") et (B = "2")', raison: "…" }
  ] });

  assert.match(html, /data-brouillon-aller="essai\.ref"/);
  assert.match(html, /data-brouillon-ligne="7"/);
});

test("là où l'on ne peut pas écrire, le refus ne se clique pas", () => {
  /**
   * L'essai d'un utilitaire n'a pas de zone de code : un bouton qui ne mène
   * nulle part se clique deux fois avant qu'on comprenne qu'il ne fait rien.
   * La ligne se lit toujours — c'est le bouton qui part.
   */
  const html = renderResultats([], {
    refus: [{ fichier: "essai.ref", ligne: 7, texte: "…", raison: "…" }],
    menentAuCode: false
  });

  assert.doesNotMatch(html, /data-brouillon-aller/);
  assert.match(html, /essai\.ref/);
  assert.match(html, /ligne 7/);
});

test("le renvoi va bien à la ligne, et les deux places passent par le même", async () => {
  /**
   * **Un câblage ne s'éprouve que par le code qui le porte.** La console
   * affichait « essai.ref:7 » et ouvrait le fichier en **ignorant** le numéro
   * qu'elle montrait juste à côté : deux endroits, deux gestes, et celui qui
   * comptait n'était branché nulle part (règle 10).
   */
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(fileURLToPath(
    new URL("../views/studio/dev/ecrire-en-mdall.js", import.meta.url)), "utf8");

  const aller = source.match(/\nfunction allerALaLigne\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(aller, "allerALaLigne est introuvable");

  // La fenêtre du bac couvre la zone d'écriture : y poser un curseur derrière
  // ne se verrait pas, et l'on cliquerait une seconde fois.
  assert.match(aller[1], /fermerLaFenetreDeDetails\(\)/,
    "le renvoi laisse la fenêtre devant : le curseur se pose derrière");
  assert.match(aller[1], /ouvertSur\(/, "le renvoi n'ouvre pas le bon onglet");
  assert.match(aller[1], /ouAllerDansLeTexte\(/, "le renvoi ne cherche pas où est la ligne");
  assert.match(aller[1], /setSelectionRange\(/, "le renvoi ne pose pas le curseur");

  const renvois = source.match(/\nfunction brancherLesRenvois\([^)]*\) \{\n([\s\S]*?)\n\}\n/);
  assert.ok(renvois, "brancherLesRenvois est introuvable");
  assert.match(renvois[1], /data-brouillon-aller/);
  assert.match(renvois[1], /allerALaLigne\(/);

  // Les deux places y passent : la console, et le bac.
  for (const quoi of ["brancherLaConsole", "brancherLeBac"]) {
    const bloc = source.match(new RegExp(`\\nfunction ${quoi}\\([^)]*\\) \\{\\n([\\s\\S]*?)\\n\\}\\n`));
    assert.ok(bloc, `${quoi} est introuvable`);
    assert.match(bloc[1], /brancherLesRenvois\(/,
      `${quoi} ne branche pas les renvois : ses numéros de ligne ne mèneraient nulle part`);
  }
});

/* ════════════════════════════════════════════════════════════════════════════
 * Une zone se choisit dans l'écran des fichiers
 *
 * Le rejeu d'une fonction versée tourne zone par zone et les empilait toutes :
 * sur un projet à six bâtiments, c'est six tableaux de quarante lignes à faire
 * défiler pour retrouver celui qu'on cherchait. On ne pouvait pas dire
 * « montre-moi le bâtiment B ».
 * ════════════════════════════════════════════════════════════════════════════ */

/**
 * Une vraie fonction, versée comme une proposition la verse — pas une forme
 * inventée à la main : une fixture qui recopie ce que le code suppose
 * n'éprouve rien.
 */
const DESCENTE = `fonction Descente de charge(zones, Charge par niveau) {
   pour chaque Niveau de 1 à 4 par pas de 1
      calcule Charge cumulée = Charge par niveau * Niveau;

   calcule Charge en pied = le plus grand de Charge cumulée;
   si (Charge en pied > 0 kN)
   alors (Charge en pied);
}
`;

const regleVersee = (zones) => {
  const payload = aProposerDuBrouillon([{ nom: "essai.ref", contenu: DESCENTE }]).affirmations[0];
  return {
    id: "r-descente", subject_key: `regle:${payload.sujet}`,
    status: "assumed", superseded_by: null, zones,
    payload: { ...payload, subject: payload.sujet, value: payload.valeur, zones }
  };
};

const valeurDeZone = (sujet, dite, ou, id) => ({
  id, subject_key: `${sujet}@${ou}`, status: "assumed", superseded_by: null,
  zones: [ou], kind: "assertion", statement: `${sujet} : ${dite}`,
  payload: { subject: sujet, value: dite, zones: [ou] }
});

/** Ce qui **définit** une partie d'ouvrage : c'est là que son nom est écrit. */
const definition = (label, cle, quoi, id) => ({
  id, subject_key: `zone:${cle}`, status: "assumed", superseded_by: null, zones: null,
  kind: "assertion", statement: `${label} : ${quoi}`,
  payload: { subject: label, value: quoi, zoneDefinition: true, zoneKey: cle }
});

/** Le fichier tel que l'écran le tient, et ce que le projet porte autour. */
const deuxBatiments = () => {
  const regle = regleVersee(["Bâtiment A", "Bâtiment B"]);
  return {
    fichier: { lignes: [{ assertion: regle }] },
    assertions: [
      regle,
      definition("Bâtiment A", "batiment-a", "Le corps principal.", "z-a"),
      definition("Bâtiment B", "batiment-b", "L'aile basse.", "z-b"),
      valeurDeZone("Charge par niveau", "3 kN", "Bâtiment A", "v-a"),
      valeurDeZone("Charge par niveau", "5 kN", "Bâtiment B", "v-b")
    ]
  };
};

test("le rejeu offre les zones qu'il déroule, et « toutes » en premier", () => {
  const { fichier, assertions } = deuxBatiments();
  const html = renderRejeuDesFonctions(fichier, assertions);

  assert.match(html, /data-memoire-rejeu-zone/);
  assert.match(html, /<option value=""[^>]*>toutes<\/option>/);

  /**
   * **Le nom de la partie d'ouvrage, pas sa clé.** Le rejeu range par clé —
   * `batiment-a` —, et c'est ce que l'écran affichait en tête de chaque
   * tableau : un identifiant à la place d'un nom que quelqu'un a écrit. C'est
   * la **définition** de la zone qui porte le nom, et il n'y avait qu'à la
   * demander.
   */
  assert.match(html, /<option value="batiment-a"[^>]*>Bâtiment A<\/option>/);
  assert.match(html, /<option value="batiment-b"[^>]*>Bâtiment B<\/option>/);
  assert.doesNotMatch(html.replace(/value="[^"]*"/g, ""), /batiment-a/);
});

test("choisir une zone ne montre que celle-là", () => {
  const { fichier, assertions } = deuxBatiments();

  const toutes = renderRejeuDesFonctions(fichier, assertions);
  const sansLesChoix = (html) => html.replace(/<option[^>]*>[^<]*<\/option>/g, "");
  assert.match(sansLesChoix(toutes), /Bâtiment A/);
  assert.match(sansLesChoix(toutes), /Bâtiment B/);

  const seule = renderRejeuDesFonctions(fichier, assertions, { zone: "batiment-b" });
  assert.match(seule, /<option value="batiment-b" selected>/);
  // Le tableau du bâtiment A n'est plus là — c'est tout l'objet du sélecteur.
  assert.doesNotMatch(sansLesChoix(seule), /Bâtiment A/);
  assert.match(sansLesChoix(seule), /Bâtiment B/);
});

test("une zone qu'on ne déroule pas retombe sur « toutes »", () => {
  /**
   * Le choix se garde d'un fichier à l'autre — on regarde un bâtiment, pas un
   * fichier. Un fichier qui ne déroule pas cette zone-là montrerait un écran
   * vide, et l'on ne saurait pas si c'est le bâtiment qui n'a rien ou l'écran
   * qui n'a pas compris (règle 5).
   */
  const { fichier, assertions } = deuxBatiments();
  const html = renderRejeuDesFonctions(fichier, assertions, { zone: "batiment-z" });

  assert.match(html, /<option value=""[^>]*selected[^>]*>toutes<\/option>/);
  const sansLesChoix = html.replace(/<option[^>]*>[^<]*<\/option>/g, "");
  assert.match(sansLesChoix, /Bâtiment A/);
  assert.match(sansLesChoix, /Bâtiment B/);
});

test("une seule zone n'a pas de sélecteur", () => {
  /** Un sélecteur à un seul choix fait douter de son propre écran. */
  const regle = regleVersee(["Bâtiment A"]);
  const html = renderRejeuDesFonctions(
    { lignes: [{ assertion: regle }] },
    [
      regle,
      definition("Bâtiment A", "batiment-a", "Le corps principal.", "z-a"),
      valeurDeZone("Charge par niveau", "3 kN", "Bâtiment A", "v-a")
    ]
  );

  assert.match(html, /memoire-rejeu/);
  assert.doesNotMatch(html, /data-memoire-rejeu-zone/);
});

/* ════════════════════════════════════════════════════════════════════════════
 * `rend:` — déduit quand il manque, vérifié après lancement, comparé à ce
 * qu'un appelant en attend
 *
 * Trois entrées du carnet, une seule question : **que rend cette fonction, et
 * qui le sait ?**
 * ════════════════════════════════════════════════════════════════════════════ */

const unBloc = (source) => lireUnFichier(source).blocs[0];

test("ce qu'une fonction paraît rendre se déduit de ce qu'elle conclut", () => {
  const mesures = unBloc([
    "fonction Charge(zones, Niveau) {",
    '   si (Niveau = "1")',
    "   alors (12 kN);",
    "   sinon (24 kN);",
    "}"
  ].join("\n"));
  assert.deepEqual(ceQuElleParaitRendre(mesures), { valeurs: [], unite: "kN" });

  const domaine = unBloc([
    "fonction Couleur(zones, Matière) {",
    '   si (Matière = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n"));
  assert.deepEqual(ceQuElleParaitRendre(domaine), { valeurs: ["gris", "blanc"], unite: "" });
});

test("ce qu'on ne peut pas déduire ne se déduit pas", () => {
  /**
   * Trois silences, et chacun a sa raison. Deviner l'un des trois ferait
   * annoncer des mètres sur une fonction qui rend des euros (règle 5).
   */
  const nue = unBloc([
    "fonction Charge(zones, Niveau) {",
    '   si (Niveau = "1")',
    "   alors (12 kN);",
    "   sinon (24);",
    "}"
  ].join("\n"));
  assert.equal(ceQuElleParaitRendre(nue), null, "une branche sans unité ne promet pas de kilonewtons");

  const melangees = unBloc([
    "fonction Charge(zones, Niveau) {",
    '   si (Niveau = "1")',
    "   alors (12 kN);",
    "   sinon (3 m);",
    "}"
  ].join("\n"));
  assert.equal(ceQuElleParaitRendre(melangees), null, "deux grandeurs ne font pas une promesse");

  const locale = unBloc([
    "fonction Prix TTC(zones, Prix HT) {",
    "   calcule TTC = Prix HT * 1,2;",
    "   si (Prix HT > 0 €)",
    "   alors (TTC);",
    "}"
  ].join("\n"));
  assert.equal(ceQuElleParaitRendre(locale), null, "une conclusion qui nomme une locale ne dit rien");

  /**
   * **Des nombres nus ne promettent rien.** Douze quoi ? Rendre « une mesure
   * sans unité » serait une promesse qui n'engage sur rien, et qui se lirait
   * pourtant comme une promesse.
   */
  const nues = unBloc([
    "fonction Charge(zones, Niveau) {",
    '   si (Niveau = "1")',
    "   alors (12);",
    "   sinon (24);",
    "}"
  ].join("\n"));
  assert.equal(ceQuElleParaitRendre(nues), null);

  /**
   * **Une mesure et un texte ne font pas un domaine fermé.** Les mettre
   * ensemble donnerait « rend "12 kN" ou "gris" » : une liste de valeurs dont
   * l'une est une mesure, ce qui n'est ni l'une ni l'autre des deux formes du
   * langage.
   */
  const melange = unBloc([
    "fonction Charge(zones, Niveau) {",
    '   si (Niveau = "1")',
    "   alors (12 kN);",
    '   sinon ("gris");',
    "}"
  ].join("\n"));
  assert.equal(ceQuElleParaitRendre(melange), null);
});

test("l'écrite gagne toujours sur la déduite, et l'écran dit laquelle", () => {
  /**
   * Une promesse déduite d'un texte qu'on est en train d'écrire change à chaque
   * frappe. La poser dans le `rend:` ferait deux versions de la même promesse,
   * et l'on ne saurait plus laquelle fait foi le jour où elles divergent
   * (règle 4). Une est un engagement, l'autre une observation.
   */
  const ecrite = unBloc([
    "fonction Couleur(zones, Matière) {",
    '   rend: "gris" ou "blanc" ou "violet"',
    "",
    '   si (Matière = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n"));

  assert.deepEqual(ceQuElleAnnonce(ecrite),
    { valeurs: ["gris", "blanc", "violet"], unite: "", deduit: false });
  // La déduction, elle, ne voit que deux branches : ce sont bien deux réponses
  // différentes, et c'est l'écrite qui compte.
  assert.deepEqual(ceQuElleParaitRendre(ecrite), { valeurs: ["gris", "blanc"], unite: "" });

  const sans = unBloc([
    "fonction Couleur(zones, Matière) {",
    '   si (Matière = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n"));
  assert.deepEqual(ceQuElleAnnonce(sans), { valeurs: ["gris", "blanc"], unite: "", deduit: true });
});

test("une promesse démentie se voit après le lancement, et pas avant", () => {
  /**
   * **C'est le contrôle qui attrape les vrais cas.** `rend:` se compare aux
   * conclusions écrites, et s'arrête à celles qui nomment un `calcule` : leur
   * valeur dépend des réponses. Or c'est la forme la plus courante du langage.
   */
  const source = [
    "fonction Prix TTC(zones, Prix HT) {",
    "   rend: kN",
    "",
    "   calcule TTC = Prix HT * 1,2;",
    "   si (Prix HT > 0 €)",
    "   alors (TTC);",
    "}"
  ].join("\n");
  const fichiers = [{ nom: "essai.ref", contenu: source }];

  // La vérification statique se tait : elle ne connaît pas la valeur.
  assert.deepEqual(
    verifierLeBrouillon(fichiers).filter((une) => une.quoi === ENNUI.REND), []);

  // Le bac, lui, vient de la calculer.
  const [resultat] = lancerLeBrouillon(fichiers, { "Prix HT": "100 €" });
  assert.equal(resultat.valeur, "120 €");
  assert.match(resultat.promesse, /annonce rendre des kN/);
  assert.match(resultat.promesse, /120 €/);
});

test("une promesse tenue ne dit rien, et une fonction muette non plus", () => {
  const tenue = lancerLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Charge(zones, Niveau) {",
    "   rend: kN",
    "",
    "   calcule Cumul = Niveau * 3 kN;",
    "   si (Niveau > 0)",
    "   alors (Cumul);",
    "}"
  ].join("\n") }], { Niveau: "4" });
  assert.equal(tenue[0].valeur, "12 kN");
  assert.equal(tenue[0].promesse, "");

  // Et une promesse de **domaine** tenue ne dit rien non plus.
  const domaine = lancerLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Couleur(zones, Matière) {",
    '   rend: "gris" ou "blanc"',
    "",
    '   si (Matière = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n") }], { "Matière": "bois" });
  assert.equal(domaine[0].valeur, "gris");
  assert.equal(domaine[0].promesse, "");

  /**
   * **« Elle ne sait pas » n'est pas « elle ment ».** Une fonction qui ne
   * conclut rien n'a rien démenti, et le dire ferait un reproche là où il n'y a
   * qu'une entrée qui manque.
   */
  const muette = lancerLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Charge(zones, Niveau) {",
    "   rend: kN",
    "",
    "   si (Niveau > 0)",
    "   alors (12 kN);",
    "}"
  ].join("\n") }], {});
  assert.equal(muette[0].valeur, "");
  assert.equal(muette[0].promesse, "");
});

test("une promesse déduite ne se vérifie jamais contre elle-même", () => {
  /**
   * Elle tiendrait **toujours** : elle est tirée des conclusions qu'on lui
   * comparerait. Une garde qui ne peut pas tomber n'en est pas une (règle 4).
   */
  const [resultat] = lancerLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Couleur(zones, Matière) {",
    '   si (Matière = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n") }], { Matière: "bois" });

  assert.equal(resultat.valeur, "gris");
  assert.equal(resultat.promesse, "");
});

test("une clause qui attend ce qu'une fonction ne rendra jamais se dit", () => {
  const remarques = verifierLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Couleur des volets(zones, Matériau) {",
    '   rend: "gris" ou "blanc"',
    "",
    '   si (Matériau = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}",
    "",
    "fonction Teinte finale(zones, Matériau) {",
    '   si (Couleur des volets(zones, Matériau) = "violet")',
    '   alors ("ivoire");',
    "}"
  ].join("\n") }]);

  const dite = remarques.find((une) => une.quoi === ENNUI.REND_HORS_DU_DOMAINE);
  assert.ok(dite, "la clause qui ne tiendra jamais passe sans un mot");
  assert.match(dite.dit, /annonce rendre « gris » ou « blanc »/);
  assert.match(dite.dit, /ne tiendra jamais/);
});

test("une seule attente possible suffit à se taire", () => {
  /**
   * `= "gris" ou "violet"` peut tenir : la clause est bonne, et l'on n'a rien à
   * dire de la valeur qui l'accompagne. Crier ici ferait crier sur toutes les
   * énumérations un peu larges.
   */
  const remarques = verifierLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Couleur des volets(zones, Matériau) {",
    '   rend: "gris" ou "blanc"',
    "",
    '   si (Matériau = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}",
    "",
    "fonction Teinte finale(zones, Matériau) {",
    '   si (Couleur des volets(zones, Matériau) = "gris" ou "violet")',
    '   alors ("ivoire");',
    "}"
  ].join("\n") }]);

  assert.deepEqual(remarques.filter((une) => une.quoi === ENNUI.REND_HORS_DU_DOMAINE), []);
});

test("on n'éprouve que ce qui est promis, jamais ce qu'on a déduit", () => {
  /**
   * Une fonction sans `rend:` écrit rend ce que ses branches concluent. Y
   * comparer une attente refuserait un texte qu'on est en train d'écrire : la
   * branche qui manque est peut-être la prochaine ligne.
   */
  const remarques = verifierLeBrouillon([{ nom: "essai.ref", contenu: [
    "fonction Couleur des volets(zones, Matériau) {",
    '   si (Matériau = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}",
    "",
    "fonction Teinte finale(zones, Matériau) {",
    '   si (Couleur des volets(zones, Matériau) = "violet")',
    '   alors ("ivoire");',
    "}"
  ].join("\n") }]);

  assert.deepEqual(remarques.filter((une) => une.quoi === ENNUI.REND_HORS_DU_DOMAINE), []);
});

test("le domaine d'un argument qui est un appel se contrôle", () => {
  /**
   * On l'avait noté comme une limite assumée : un calcul n'a pas de domaine
   * fermé. Mais `F(zones, G(zones, X))` n'est pas un calcul — `G` dit ce
   * qu'elle rend, et c'est exactement le domaine qu'on cherchait.
   */
  const remarques = verifierLeBrouillon([{ nom: "essai.ref", contenu: [
    "const Teinte = {",
    '   type: "texte",',
    '   valeurs possibles: "gris" ou "noir",',
    "};",
    "",
    "fonction Couleur des volets(zones, Matériau) {",
    '   rend: "gris" ou "blanc"',
    "",
    '   si (Matériau = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}",
    "",
    "fonction Rendu(zones, Teinte) {",
    '   si (Teinte = "gris")',
    '   alors ("clair");',
    '   sinon ("sombre");',
    "}",
    "",
    "fonction Façade(zones, Matériau) {",
    "   calcule Dit = Rendu(zones, Couleur des volets(zones, Matériau));",
    '   si (Dit = "clair")',
    '   alors ("ivoire");',
    "}"
  ].join("\n") }]);

  const dite = remarques.find((une) => une.quoi === ENNUI.DONNE_HORS_DU_DOMAINE);
  assert.ok(dite, "l'argument calculé passe sans un mot");
  assert.match(dite.dit, /« Couleur des volets\(…\) » peut valoir « blanc »/);
});

test("une fonction du langage n'est pas une fonction du projet qui porte son nom", () => {
  /**
   * `min(2; 3)` appelle **la fonction du langage**, quel que soit ce que le
   * brouillon déclare à côté : le découpage tranche sur la parenthèse, et un
   * nom du projet ne s'y substitue jamais.
   *
   * Sans cette distinction, on irait lire le `rend:` d'une fonction que
   * personne n'a appelée — et l'on crierait sur un calcul parfaitement juste.
   */
  const remarques = verifierLeBrouillon([{ nom: "essai.ref", contenu: [
    "const Teinte = {",
    '   type: "texte",',
    '   valeurs possibles: "gris" ou "noir",',
    "};",
    "",
    "fonction min(zones, Matériau) {",
    '   rend: "blanc"',
    "",
    '   si (Matériau = "bois")',
    '   alors ("blanc");',
    "}",
    "",
    "fonction Rendu(zones, Teinte) {",
    '   si (Teinte = "gris")',
    '   alors ("clair");',
    '   sinon ("sombre");',
    "}",
    "",
    "fonction Façade(zones, Matériau) {",
    "   calcule Dit = Rendu(zones, min(2; 3));",
    '   si (Dit = "clair")',
    '   alors ("ivoire");',
    "}"
  ].join("\n") }]);

  assert.deepEqual(
    remarques.filter((une) => une.quoi === ENNUI.DONNE_HORS_DU_DOMAINE), [],
    "le « min » du langage est pris pour celui du brouillon");
});

/* ── La mémoire, donnée à la vérification ────────────────────────────────── */

test("une fonction appelée depuis la mémoire se contrôle comme les autres", () => {
  /**
   * « Cette fonction ne saura jamais répondre pour ce nom-là » ne se disait que
   * d'une fonction écrite dans les fichiers qu'on vérifie. Appelée depuis la
   * mémoire — le cas le plus courant une fois qu'on verse — elle échappait au
   * contrôle : on obtenait le silence, qui se lit comme « tout va bien ».
   */
  const versee = aProposerDuBrouillon([{ nom: "projet.ref", contenu: [
    "const Nature des volets = {",
    '   type: "texte",',
    '   valeurs possibles: "bois" ou "pvc",',
    "};",
    "",
    "fonction Couleur des volets(zones, Nature des volets) {",
    '   rend: "gris" ou "blanc"',
    "",
    '   si (Nature des volets = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n") }]).affirmations[0];

  const memoire = [{
    id: "r-couleur", subject_key: `regle:${versee.sujet}`,
    status: "assumed", superseded_by: null, zones: null,
    payload: { ...versee, subject: versee.sujet, value: versee.valeur }
  }];

  const brouillon = [{ nom: "essai.ref", contenu: [
    "fonction Teinte finale(zones, Matériau) {",
    '   si (Couleur des volets(zones, Matériau) = "violet")',
    '   alors ("ivoire");',
    "}"
  ].join("\n") }];

  // Sans mémoire, rien : on ne connaît pas cette fonction, et l'on se tait.
  assert.deepEqual(
    verifierLeBrouillon(brouillon).filter((une) => une.quoi === ENNUI.REND_HORS_DU_DOMAINE), []);

  // Avec, on la connaît — et la clause ne tiendra jamais.
  const dite = verifierLeBrouillon(brouillon, { memoire })
    .find((une) => une.quoi === ENNUI.REND_HORS_DU_DOMAINE);
  assert.ok(dite, "la fonction versée échappe encore au contrôle");
  assert.match(dite.dit, /ne tiendra jamais/);
});

test("ce qu'on sait en plus s'ajoute, et ne retire jamais", () => {
  /**
   * **C'est ce qui empêche la même page de rendre deux verdicts.** Une page
   * vérifiée sans mémoire dit moins ; avec, elle dit davantage. Si une remarque
   * pouvait disparaître en apprenant quelque chose, on ne saurait plus si son
   * absence veut dire « c'est bon » ou « on n'a pas lu la base ».
   */
  const versee = aProposerDuBrouillon([{ nom: "projet.ref", contenu: [
    "fonction Couleur des volets(zones, Nature des volets) {",
    '   rend: "gris" ou "blanc"',
    "",
    '   si (Nature des volets = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n") }]).affirmations[0];

  const memoire = [{
    id: "r-couleur", subject_key: `regle:${versee.sujet}`,
    status: "assumed", superseded_by: null, zones: null,
    payload: { ...versee, subject: versee.sujet, value: versee.valeur }
  }];

  const brouillon = [{ nom: "essai.ref", contenu: [
    "fonction Teinte finale(zones) {",
    "   si (Inconnu renseigné)",
    '   alors ("ivoire");',
    "}",
    "",
    "fonction Autre(zones, Matériau) {",
    '   si (Couleur des volets(zones, Matériau) = "violet")',
    '   alors ("x");',
    "}"
  ].join("\n") }];

  const dit = (remarques) => remarques.map((une) => `${une.quoi}|${une.dit}`);
  const sans = dit(verifierLeBrouillon(brouillon));
  const avec = dit(verifierLeBrouillon(brouillon, { memoire }));

  for (const une of sans) assert.ok(avec.includes(une), `« ${une} » a disparu avec la mémoire`);
  assert.ok(avec.length > sans.length, "la mémoire n'apporte rien : le contrôle ne la lit pas");
});

test("le brouillon gagne sur la mémoire, pour la même fonction", () => {
  /**
   * C'est la version qu'on est en train d'écrire : une fonction reprise pour
   * être corrigée doit être lue telle qu'on vient de la corriger, sinon on
   * corrige et l'écran répond sur l'ancienne.
   */
  const versee = aProposerDuBrouillon([{ nom: "projet.ref", contenu: [
    "fonction Couleur des volets(zones, Nature des volets) {",
    '   rend: "gris" ou "blanc"',
    "",
    '   si (Nature des volets = "bois")',
    '   alors ("gris");',
    '   sinon ("blanc");',
    "}"
  ].join("\n") }]).affirmations[0];

  const memoire = [{
    id: "r-couleur", subject_key: `regle:${versee.sujet}`,
    status: "assumed", superseded_by: null, zones: null,
    payload: { ...versee, subject: versee.sujet, value: versee.valeur }
  }];

  // Le brouillon reprend la fonction et lui ajoute « violet ».
  const brouillon = [{ nom: "essai.ref", contenu: [
    "fonction Couleur des volets(zones, Nature des volets) {",
    '   rend: "gris" ou "blanc" ou "violet"',
    "",
    '   si (Nature des volets = "chêne")',
    '   alors ("violet");',
    '   sinon ("blanc");',
    "}",
    "",
    "fonction Teinte finale(zones, Matériau) {",
    '   si (Couleur des volets(zones, Matériau) = "violet")',
    '   alors ("ivoire");',
    "}"
  ].join("\n") }];

  assert.deepEqual(
    verifierLeBrouillon(brouillon, { memoire })
      .filter((une) => une.quoi === ENNUI.REND_HORS_DU_DOMAINE),
    [], "la version corrigée est ignorée au profit de celle du projet");
});

/* ════════════════════════════════════════════════════════════════════════════
 * L'abaque à double entrée
 *
 * Les Eurocodes n'ont pas que des courbes : ils ont des **nappes** — un
 * coefficient selon l'altitude **et** la zone de vent. Elles s'écrivaient en
 * barème, c'est-à-dire par paliers : on perdait l'interpolation sur l'un des
 * deux axes, et l'on rendait la valeur d'un seuil là où le texte trace une
 * droite.
 *
 * « Interpoler sur deux axes » est un travail connu ; le verrou était **ce
 * qu'on montre**. La réponse tient en une phrase, et c'est celle de l'abaque
 * imprimé : *une nappe est une famille de courbes, et on se place sur l'une
 * d'elles avant de la lire.*
 * ════════════════════════════════════════════════════════════════════════════ */

const EXPOSITION = [
  "courbe Coefficient d'exposition(zones, Altitude, Zone de vent) {",
  "   entre les points: linéaire",
  "   hors bornes: refuse",
  "   |        |    1 |    2 |    3 |",
  "   |    0 m | 1,00 | 1,05 | 1,10 |",
  "   |  500 m | 1,10 | 1,18 | 1,25 |",
  "   | 1000 m | 1,25 | 1,35 | 1,45 |",
  "}"
].join("\n");

const NAPPE = () => nappeDesCases(["", "1", "2", "3"], [
  { x: "0 m", valeurs: ["1,00", "1,05", "1,10"] },
  { x: "500 m", valeurs: ["1,10", "1,18", "1,25"] },
  { x: "1000 m", valeurs: ["1,25", "1,35", "1,45"] }
]);

const luDansLaNappe = (x, z, comment = {}) =>
  interpolerLaNappe(NAPPE(), x, z, { entre: ENTRE.LINEAIRE, hors: HORS.REFUSE, ...comment });

test("une nappe se lit sur ses deux axes, et chacun s'interpole", () => {
  // Une case écrite se retrouve telle quelle : c'est la première vérification.
  assert.equal(luDansLaNappe("500 m", "2").valeur, "1,18");

  // Sur une colonne écrite, entre deux lignes : l'interpolation d'une courbe.
  assert.equal(luDansLaNappe("750 m", "2").valeur, "1,265");

  /**
   * **Entre deux colonnes et entre deux lignes** — ce que le barème ne savait
   * pas faire, et ce pour quoi cette écriture existe.
   *
   * À la main : colonne 1 à 750 m vaut 1,175 ; colonne 2 à 750 m vaut 1,265 ;
   * à mi-chemin, 1,22.
   */
  assert.equal(luDansLaNappe("750 m", "1,5").valeur, "1,22");
});

test("la trace dit les deux pas, dans l'ordre où on les lit", () => {
  /**
   * « sur la colonne 2, lu entre 500 m et 1000 m » : on retrouve les deux cases
   * du tableau d'origine. Un abaque se vérifie en retrouvant ses cases, pas en
   * refaisant le calcul.
   */
  assert.equal(phraseDeLaLectureDeLaNappe(luDansLaNappe("750 m", "2")),
    "sur la colonne 2, lu entre 500 m et 1000 m");
  assert.equal(phraseDeLaLectureDeLaNappe(luDansLaNappe("500 m", "1,5")),
    "entre les colonnes 1 et 2, lu sur le point 500 m");
});

test("on se place sur une courbe, et c'est une vraie courbe", () => {
  /**
   * **C'est la décision de cette ronde.** Une surface ne se compare pas à une
   * figure d'un coup d'œil ; la courbe où l'on se trouve, si — et elle se
   * dessine, se trace et se relit avec tout ce qui existe déjà.
   */
  const { courbe } = courbeDeLaColonne(NAPPE(), "1,5", { entre: ENTRE.LINEAIRE, hors: HORS.REFUSE });

  assert.deepEqual(courbe.points.map((un) => [un.dit, un.vaut]),
    [["0 m", "1,025"], ["500 m", "1,14"], ["1000 m", "1,3"]]);
  assert.equal(courbe.uniteX, "m");

  // Et cette courbe-là se lit comme n'importe quelle autre.
  assert.equal(interpoler(courbe, "750 m", { entre: ENTRE.LINEAIRE, hors: HORS.REFUSE }).valeur, "1,22");
});

test("une nappe refuse d'être extrapolée, sur ses deux axes", () => {
  /**
   * C'est la faute la plus chère : un abaque prolongé rend un nombre
   * parfaitement plausible qui ne vient d'aucun texte. `hors bornes:` vaut pour
   * les deux axes — un seul tableau, une seule déclaration.
   */
  const hautTrop = luDansLaNappe("1200 m", "2");
  assert.equal(hautTrop.connu, false);
  assert.match(hautTrop.pourquoi, /sort de la courbe/);

  const aCote = luDansLaNappe("500 m", "4");
  assert.equal(aCote.connu, false);
  assert.match(aCote.pourquoi, /sort des colonnes/);

  // `borne` prend la colonne de l'extrémité, et le dit.
  const bornee = luDansLaNappe("500 m", "4", { hors: HORS.BORNE });
  assert.equal(bornee.valeur, "1,25");
  assert.match(phraseDeLaLectureDeLaNappe(bornee), /hors des colonnes : celle de 3/);
});

test("en escalier, les deux axes sont des paliers", () => {
  /**
   * `entre les points:` vaut pour les deux axes : un tableau à seuils l'est
   * dans les deux sens, et déclarer deux interpolations pour un seul tableau
   * ferait deux choses à vérifier là où le texte n'en dit qu'une.
   */
  const lu = luDansLaNappe("750 m", "1,5", { entre: ENTRE.ESCALIER });
  assert.equal(lu.valeur, "1,1");
});

test("une nappe fausse se refuse à la lecture, en nommant ce qui cloche", () => {
  const refuse = (entetes, lignes) => {
    const lue = nappeDesCases(entetes, lignes);
    return phraseDuRefusDeLaNappe(lue.refus, lue.ou);
  };

  assert.match(refuse(["", "1"], []), /au moins deux colonnes/);
  assert.match(refuse(["Altitude", "1", "2"], [
    { x: "0 m", valeurs: ["1", "2"] }, { x: "1 m", valeurs: ["1", "2"] }
  ]), /le coin de l'en-tête porte « Altitude »/);
  assert.match(refuse(["", "2", "1"], [
    { x: "0 m", valeurs: ["1", "2"] }, { x: "1 m", valeurs: ["1", "2"] }
  ]), /les colonnes ne montent pas/);
  assert.match(refuse(["", "1", "2"], [
    { x: "0 m", valeurs: ["1"] }, { x: "1 m", valeurs: ["1", "2"] }
  ]), /n'a pas autant de cases que l'en-tête/);
  assert.match(refuse(["", "1", "2"], [
    { x: "1 m", valeurs: ["1", "2"] }, { x: "0 m", valeurs: ["1", "2"] }
  ]), /les abscisses ne montent pas/);
});

test("un abaque à double entrée se lit depuis un fichier, et se relit écrit", () => {
  const lu = lireUnFichier(EXPOSITION);
  assert.deepEqual(lu.refus, []);

  const bloc = lu.blocs[0];
  assert.equal(bloc.courbe.selon, "Altitude");
  assert.equal(bloc.courbe.parColonne, "Zone de vent");
  assert.deepEqual(bloc.courbe.colonnes, ["", "1", "2", "3"]);

  /**
   * **Ce qui s'écrit se relit à l'identique.** Un aller sans retour n'est pas
   * une écriture, c'est une perte (règle 4) — et l'en-tête est précisément ce
   * qu'une écriture distraite laisserait tomber.
   */
  const ecrit = texteDesLignes(blocDeRegle({
    sujet: bloc.sujet, courbe: bloc.courbe, signature: bloc.signature.slice(1)
  }));
  const relu = lireUnFichier(ecrit);

  assert.deepEqual(relu.refus, []);
  assert.deepEqual(relu.blocs[0].courbe, bloc.courbe);
  assert.match(ecrit, /courbe Coefficient d'exposition\(zones, Altitude, Zone de vent\) \{/);

  /**
   * **Et sans signature écrite, elle se déduit — des deux entrées.**
   *
   * C'est le chemin d'un abaque **versé** : la mémoire ne garde pas la ligne
   * de signature, et on la reconstruit de ce que la fonction lit. En oublier la
   * seconde ferait revenir une nappe en courbe simple, muette sur son second
   * axe, après un aller-retour par la mémoire.
   */
  const sansSignature = texteDesLignes(blocDeRegle({ sujet: bloc.sujet, courbe: bloc.courbe }));
  assert.match(sansSignature,
    /courbe Coefficient d'exposition\(zones, Altitude, Zone de vent\) \{/);
  assert.deepEqual(lireUnFichier(sansSignature).refus, []);
});

test("une courbe ordinaire ne devient pas une nappe", () => {
  /**
   * Les deux champs n'existent pas du tout sur une courbe à une entrée : les y
   * poser vides ferait porter à chaque abaque du projet la forme d'un abaque à
   * deux axes, et l'on ne saurait plus lequel en est un.
   */
  const bloc = lireUnFichier([
    "courbe Coefficient de forme(zones, Pente du versant) {",
    "   entre les points: linéaire",
    "   hors bornes: refuse",
    "   |  0° | 0,8 |",
    "   | 60° | 0   |",
    "}"
  ].join("\n")).blocs[0];

  assert.equal("parColonne" in bloc.courbe, false);
  assert.equal("colonnes" in bloc.courbe, false);
});

test("le bac demande les deux entrées d'un abaque, et les nomme quand elles manquent", () => {
  /**
   * **Trouvé à l'écran, pas par une épreuve.** L'abaque concluait — on lui
   * avait donné la valeur à la main —, et son second champ n'était nulle part
   * dans le formulaire : une fonction qu'on ne peut pas essayer sans connaître
   * son texte par cœur.
   */
  const fichiers = [{ nom: "essai.ref", contenu: EXPOSITION }];

  assert.deepEqual(
    champsDuBrouillon(fichiers).map((un) => un.nom),
    ["Altitude", "Zone de vent"]);

  // Les deux manquantes se nomment ensemble : n'en dire qu'une ferait remplir
  // un champ pour découvrir qu'il en manquait un second.
  const [rien] = lancerLeBrouillon(fichiers, {});
  assert.deepEqual(rien.manquants, ["Altitude", "Zone de vent"]);

  const [une] = lancerLeBrouillon(fichiers, { Altitude: "750 m" });
  assert.deepEqual(une.manquants, ["Zone de vent"]);

  const [lu] = lancerLeBrouillon(fichiers, { Altitude: "750 m", "Zone de vent": "1,5" });
  assert.equal(lu.valeur, "1,22");
  // Les points montrés sont ceux de la courbe **lue**, pas ceux d'une colonne
  // écrite : c'est la courbe où l'on se trouve qu'on relit.
  assert.deepEqual(lu.points.map((un) => un.vaut), ["1,025", "1,14", "1,3"]);
});
