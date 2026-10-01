/**
 * **Deux fonctions de bord, une seule table, et chacune ne prend que son geste.**
 *
 * ## Le défaut que cette épreuve existe pour attraper
 *
 * `versements` portait un seul travail : des octets de messagerie à dépouiller.
 * Elle en porte deux depuis novembre — la lecture de comptes rendus s'y est
 * ajoutée plutôt que d'ouvrir une seconde file, parce que le cycle, la reprise
 * et le journal sont les mêmes (règle 4).
 *
 * Mais `verser-les-mails` prenait « la plus ancienne qui attend », sans regarder
 * le geste. Une mise à niveau de dix-neuf comptes rendus serait partie chez
 * elle : elle n'y aurait trouvé aucun fichier dans le casier, et l'aurait
 * marquée **en échec**. Dix-neuf comptes rendus perdus par la fonction d'à côté,
 * et rien pour dire pourquoi.
 *
 * ## Pourquoi on relit la source
 *
 * Ce défaut ne se dessine pas et ne se joue pas : c'est une clause absente dans
 * une requête, au milieu d'une fonction Deno que `npm test` n'exécute pas. Il
 * n'y a pas d'autre prise que le texte — et c'est précisément le cas où relire
 * la source se justifie.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const source = (nom) =>
  readFileSync(path.join(RACINE, "supabase", "functions", nom, "index.ts"), "utf8");

/** La requête qui prend une ligne de la file, dans cette fonction. */
function laPrise(texte) {
  const ou = texte.indexOf('.from("versements")');
  assert.notEqual(ou, -1, "cette fonction ne lit pas la file");
  return texte.slice(ou, ou + 600);
}

test("verser-les-mails ne prend que des dépôts de messagerie", () => {
  const prise = laPrise(source("verser-les-mails"));
  assert.match(prise, /\.eq\("geste", GESTE_DES_MAILS\)/,
    "elle prendrait une lecture de comptes rendus, et la marquerait en échec");
});

test("lire-les-comptes-rendus ne prend que des lectures de comptes rendus", () => {
  const prise = laPrise(source("lire-les-comptes-rendus"));
  assert.match(prise, /\.eq\("geste", GESTE\)/,
    "elle prendrait un dépôt de messagerie, dont elle ne saurait rien faire");
});

/**
 * **Marquée prise avant de travailler.**
 *
 * Deux réveils simultanés prendraient sinon la même ligne, et liraient deux fois
 * les mêmes dix-neuf comptes rendus — deux factures. Le filtre sur le statut
 * d'origine fait que le second ne trouve rien à marquer.
 */
test("les deux fonctions marquent la ligne avant de travailler", () => {
  for (const nom of ["verser-les-mails", "lire-les-comptes-rendus"]) {
    const texte = source(nom);
    assert.match(texte, /statut: "en_cours", pris_le: new Date\(\)\.toISOString\(\)/,
      `${nom} ne marque pas la ligne prise`);
    assert.match(texte, /if \(!prise\?\.length\) return reponse\(\{ fait: false, motif: "déjà prise" \}\)/,
      `${nom} travaille sur une ligne qu'un autre réveil a déjà prise`);
  }
});

/**
 * **Une ligne abandonnée en route se reprend.**
 *
 * Une lecture de dix-neuf comptes rendus dépasse de loin ce qu'une fonction de
 * bord a le droit de durer : coupée, elle laisse une ligne `en_cours` que plus
 * aucun réveil ne prend. La file serait bloquée pour toujours, et l'écran
 * afficherait « lecture en cours » jusqu'à la fin des temps (règle 5).
 */
test("une lecture abandonnée en route se reprend", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.match(texte, /ABANDONNEE_APRES_MS/, "rien ne dit quand une ligne est abandonnée");
  assert.match(texte, /statut\.eq\.en_cours,pris_le\.lt\./,
    "une ligne prise et abandonnée n'est jamais reprise : la file se bloque");
});

/**
 * **Le budget doit être employé, pas seulement déclaré.**
 *
 * Une constante nommée et jamais lue est une intention (règle 12), et c'est ce
 * qu'un cassage a montré : remplacer le test par `if (false)` ne faisait tomber
 * aucune épreuve, parce qu'elles cherchaient le nom de la constante — qui
 * restait écrit, à sa déclaration.
 *
 * Sans ce test dans la boucle, la fonction est coupée sans préavis au milieu
 * d'un appel au modèle : elle laisse une ligne `en_cours`, un appel payé pour
 * rien, et dix-neuf comptes rendus qui ne repartent qu'au bout de dix minutes.
 */
test("le budget s'éprouve à chaque tour de boucle, et la suite se rappelle", () => {
  const texte = source("lire-les-comptes-rendus");
  const boucle = texte.slice(texte.indexOf("for (;;) {"), texte.indexOf("const comptes ="));
  assert.ok(boucle, "la boucle de la file est introuvable");

  assert.match(boucle, /if \(Date\.now\(\) - debut > LE_BUDGET_MS\) \{/,
    "la boucle ne regarde jamais le budget : la fonction sera coupée en plein appel");

  /**
   * Et ce qu'elle fait quand il est épuisé : écrire où l'on en est, se rappeler,
   * rendre la main. Sans l'écriture, la reprise relirait — et refacturerait —
   * ce qui est déjà lu (règle 6).
   *
   * **Le bloc seul, et pas la boucle entière.** La première version de cette
   * épreuve coupait à `LE_BUDGET_MS` et gardait tout ce qui suivait : elle
   * trouvait `avancement: etat` dans l'écriture de pas d'après, et passait alors
   * même que le bloc du budget n'écrivait plus rien. Une épreuve qui regarde
   * trop large ne regarde rien.
   */
  const ouvre = boucle.indexOf("if (Date.now() - debut > LE_BUDGET_MS)");
  const quandIlEstEpuise = boucle.slice(ouvre, boucle.indexOf("\n      }", ouvre));

  assert.match(quandIlEstEpuise, /avancement: etat/,
    "la file ne garde pas où elle en était : la reprise relirait tout");
  assert.match(quandIlEstEpuise, /lire-les-comptes-rendus/,
    "la fonction ne se rappelle pas : la file s'arrête là");
  assert.match(quandIlEstEpuise, /return reponse\(/,
    "la fonction ne rend pas la main : elle sera coupée quand même");
});

/**
 * **La restitution se pose sur la ligne du document, et rien n'est déposé.**
 *
 * Le premier jet appelait `rangerLaRestitution`, qui cherche le compte rendu
 * dans le dossier « CR de chantier » et **le dépose s'il n'y est pas**. Or ces
 * documents sont déjà dans le projet — c'est là qu'on vient de les choisir :
 * dix-neuf comptes rendus pris dans un dossier en auraient fait dix-neuf copies
 * ailleurs, le genre de doublon qu'on ne remarque qu'au vingtième.
 */
test("la lecture ne dépose aucun second exemplaire d'un compte rendu", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.match(texte, /transcription_markdown: markdown/,
    "la restitution ne se pose nulle part");
  assert.match(texte, /\.update\(\{\s*\n\s*transcription_markdown: markdown/,
    "la restitution ne se pose pas sur la ligne du compte rendu");
  assert.doesNotMatch(texte, /from\("documents"\)\.insert/,
    "la lecture dépose un second exemplaire du compte rendu");
  // **Un appel, pas le mot.** La première version cherchait `rangerLaRestitution`
  // n'importe où, et le trouvait dans le commentaire qui explique pourquoi on ne
  // l'appelle plus : l'épreuve refusait sa propre explication.
  assert.doesNotMatch(texte, /rangerLaRestitution\(/,
    "la lecture passe par le rangement, qui redéposerait le compte rendu");
  assert.doesNotMatch(texte, /import \{ rangerLaRestitution \}/,
    "le rangement est encore importé : il n'a plus de raison d'être là");
});

/**
 * **Une seule proposition, ouverte au premier et enrichie ensuite.**
 *
 * Dix-neuf propositions, c'étaient dix-neuf relectures pour un seul geste. Et
 * l'ouvrir à la fin aurait tout perdu si la fonction expirait en route : ce qui
 * a eu lieu ne devient pas faux (règle 6).
 */
test("la proposition s'ouvre au premier compte rendu et s'enrichit", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.match(texte, /propositionId: texte\(propositionId\)/,
    "chaque compte rendu ouvre sa propre proposition");
  assert.match(texte, /if \(pas\.propositionId\) proposition = pas\.propositionId;/,
    "la proposition ouverte n'est pas gardée d'un compte rendu au suivant");
  assert.match(texte, /proposition_id: proposition \|\| null/,
    "la ligne de file ne porte pas la proposition qu'elle a ouverte");

  // **Et un échec rend celle qu'il a ouverte.** Sans cela, le compte rendu
  // suivant en ouvrait une autre : trois comptes rendus, deux propositions vides
  // (règle 6).
  assert.match(texte, /propositionId: texte\(rendu\?\.proposition\?\.id\) \|\| texte\(propositionId\)/,
    "un échec oublie la proposition qu'il vient d'ouvrir");
});

/**
 * **Elle travaille sous l'identité de celui qui demande**, jamais avec la clé de
 * service. Les politiques s'appliquent donc comme dans le navigateur : lire un
 * document d'un chantier qu'on n'a pas est refusé par la base, et non par une
 * vérification écrite ici qu'il faudrait maintenir à côté de la vraie.
 */
test("les deux fonctions travaillent sous l'identité de celui qui demande", () => {
  for (const nom of ["verser-les-mails", "lire-les-comptes-rendus"]) {
    const texte = source(nom);
    assert.match(texte, /SUPABASE_ANON_KEY/, `${nom} n'emploie pas la clé publique`);
    assert.doesNotMatch(texte, /SUPABASE_SERVICE_ROLE_KEY/,
      `${nom} passe outre les politiques avec la clé de service`);
    assert.match(texte, /requireUser\(req, entetes\)/, `${nom} ne vérifie pas qui appelle`);
  }
});

/**
 * **Un dépôt de messagerie abandonné se referme, il ne se rejoue pas.**
 *
 * `verser-les-mails` n'avait aucune reprise : coupée net, elle laissait sa ligne
 * `en_cours`, et l'onglet Actions montrait un dépôt qui tournait depuis des
 * heures et que personne ne faisait.
 *
 * **La reprendre serait pire** : les messages déjà rangés le seraient deux fois.
 * On la referme en échec, en le disant, et celui qui veut la refaire la relance.
 */
test("un dépôt de messagerie abandonné se referme", () => {
  const texte = source("verser-les-mails");

  assert.match(texte, /ABANDONNEE_APRES_MS/, "rien ne dit quand un dépôt est abandonné");
  // **Les trois moitiés de la clause, et pas seulement sa fin.** La première
  // version ne nommait pas le statut cherché : remplacer « en_cours » par
  // « fini » la laissait verte, et le dépôt bloqué restait bloqué — c'est la
  // ligne prise que l'on referme, et aucune autre.
  assert.match(
    texte,
    /statut: "echec"[\s\S]{0,400}\.eq\("statut", "en_cours"\)\s*\n\s*\.lt\("pris_le", abandonnee\)/,
    "la clause ne referme pas les lignes prises et jamais finies"
  );
  // **Et surtout pas rejouée.** Une reprise de dépôt rangerait deux fois les
  // mêmes messages, ce qu'aucun écran ne montrerait avant le second index.
  const prise = laPrise(texte);
  assert.doesNotMatch(prise, /statut\.eq\.en_cours/,
    "le dépôt reprend une ligne abandonnée : les messages entreraient deux fois");
});

/**
 * **Le délai d'abandon s'écrit à un seul endroit.**
 *
 * L'écran réveille le serveur quand il voit une ligne abandonnée ; la fonction
 * décide si elle la reprend. Deux valeurs auraient fait un écran qui réveille
 * avant que la reprise n'accepte — donc des appels payés pour rien — ou après
 * qu'elle a cessé d'être utile (règle 4).
 */
test("le délai d'abandon vient du module partagé, et de nulle part ailleurs", () => {
  for (const nom of ["verser-les-mails", "lire-les-comptes-rendus"]) {
    const texte = source(nom);
    assert.match(texte, /import \{[\s\S]{0,120}ABANDONNEE_APRES_MS[\s\S]{0,120}\} from "\.\.\/_shared\/versement\/reveiller-la-file\.js"/,
      `${nom} ne lit pas le délai dans le module partagé`);
    assert.doesNotMatch(texte, /const ABANDONNEE_APRES_MS\s*=/,
      `${nom} redéclare le délai : il finira par différer de celui de l'écran`);
  }
});

/**
 * **Les lignes d'une proposition ne se nomment plus ici.**
 *
 * La version précédente posait les lignes d'items ainsi :
 * `{ proposition_id, project_id, ...un }`, où `un` porte `itemType` et `itemKey`.
 * Les colonnes s'appellent `item_type` et `item_key` : chaque insertion était
 * refusée, et trois comptes rendus ont donné deux propositions **vides**.
 */
test("la lecture ne traduit plus les colonnes d'une proposition à la main", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.match(texte, /lesLignesDesItems\(items, \{ propositionId, projectId \}\)/,
    "les lignes d'items ne passent pas par le module partagé");
  assert.match(texte, /laLigneDuneProposition\(\{/,
    "la ligne de la proposition ne passe pas par le module partagé");
  // Aucune colonne d'item nommée ici : c'est la seconde traduction qui a fauté.
  assert.doesNotMatch(texte, /item_type:/, "une colonne d'item se nomme encore ici");
  assert.doesNotMatch(texte, /item_key:/, "une colonne d'item se nomme encore ici");
  // **L'étalement en fin de ligne, et non le mot.** Cherché n'importe où, il se
  // trouvait dans le commentaire qui explique pourquoi on ne le fait plus :
  // l'épreuve refusait sa propre explication.
  assert.doesNotMatch(texte, /\.\.\.un\s*\n/,
    "les lignes se construisent encore en étalant un objet de JavaScript");
});

/**
 * **La table des sujets est `subjects`.** La fonction lisait `project_subjects`,
 * qui n'existe pas : la confrontation au projet se faisait sur une liste vide, et
 * chaque point d'un compte rendu repartait neuf.
 */
test("la lecture confronte aux sujets qui existent", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.doesNotMatch(texte, /from\("project_subjects"\)/, "cette table n'existe pas");
  assert.match(texte, /\.from\(LA_TABLE_DES_SUJETS\)\.select\(LE_SELECT_DES_SUJETS\)/,
    "la table et les colonnes des sujets ne viennent pas du module partagé");
  // **Et ne pas savoir n'est pas savoir qu'il n'y a rien** (règle 5) : confronter
  // à une liste vide reproposerait chaque sujet déjà suivi.
  assert.match(texte, /if \(pasLus \|\| !Array\.isArray\(sujetsDuProjet\)\)/,
    "une lecture ratée des sujets passe pour un projet qui ne suit rien");
});

/**
 * **Le journal nomme le geste qu'il raconte.**
 *
 * La course s'écrivait avec `geste: "versement"`, et l'onglet Actions affichait
 * donc « Dépôt de messagerie » sous une lecture de trois comptes rendus.
 */
test("une lecture de comptes rendus se consigne sous son geste", () => {
  const texte = source("lire-les-comptes-rendus");
  const course = texte.slice(texte.indexOf('.from("project_runs")'));

  assert.match(course, /geste: GESTE,/, "la course se consigne sous le geste d'une autre file");
  assert.doesNotMatch(course, /geste: "versement"/, "la course se dit dépôt de messagerie");
  // **Et elle reste personnelle** : la politique le tient sur cette colonne, pas
  // sur le geste. Sans elle, une lecture de comptes rendus deviendrait lisible
  // par tout le projet.
  assert.match(course, /personnelle: true/, "la course deviendrait lisible par tout le projet");
});
