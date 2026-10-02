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

/**
 * Les portes communes de la file, côté base.
 *
 * **C'est là que la plupart de ces épreuves ont déménagé.** La mécanique — tenir
 * le budget, reprendre ce qui était en vol, consigner avant de refermer, faire
 * les ajouts un par un — vit maintenant dans `la-file-dun-geste.js`, qui est pur
 * et que `npm test` **exécute** : ce qui s'y vérifie en jouant ne se lit plus
 * comme du texte ici, et les épreuves qui le faisaient ont été retirées plutôt
 * que réécrites. Ne reste que ce qu'aucune exécution n'atteint : six requêtes.
 */
const LES_PORTES = readFileSync(
  path.join(RACINE, "supabase", "functions", "_shared", "la-file-au-serveur.ts"), "utf8");

/** Les deux fonctions qui vident une file par la mécanique commune. */
const LES_LECTURES = ["lire-les-comptes-rendus", "lire-les-rapports"];

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

test("les portes communes ne prennent que le geste qu'on leur donne", () => {
  const prise = laPrise(LES_PORTES);
  assert.match(prise, /\.eq\("geste", geste\)/,
    "une lecture prendrait un dépôt de messagerie, dont elle ne saurait rien faire");
});

test("chaque lecture passe le geste de sa famille, et le sien seul", () => {
  // **Le geste vient du registre**, et la même constante sert à prendre la ligne
  // et à consigner la course : deux mots auraient fait une file vidée sous un nom
  // et racontée sous un autre (règle 10).
  for (const nom of LES_LECTURES) {
    const texte = source(nom);
    assert.match(texte, /const GESTE = FAMILLE\.\w+;/,
      `${nom} ne prend pas son geste dans le registre des familles`);
    assert.match(texte, /lesPortesDeLaFile\(client, \{\s*\n?\s*geste: GESTE,/,
      `${nom} donne aux portes un geste qui n'est pas le sien`);
  }
});

/**
 * **Marquée prise avant de travailler.**
 *
 * Deux réveils simultanés prendraient sinon la même ligne, et liraient deux fois
 * les mêmes dix-neuf comptes rendus — deux factures. Le filtre sur le statut
 * d'origine fait que le second ne trouve rien à marquer.
 */
test("la ligne se marque prise, et sous son statut d'origine", () => {
  // `verser-les-mails` tient encore sa propre file : son dépôt n'a ni pas par
  // document ni proposition, et la plier dans la mécanique commune lui ferait
  // porter un cas qu'elle seule emploierait.
  const mails = source("verser-les-mails");
  assert.match(mails, /statut: "en_cours", pris_le: new Date\(\)\.toISOString\(\)/,
    "verser-les-mails ne marque pas la ligne prise");
  assert.match(mails, /if \(!prise\?\.length\) return reponse\(\{ fait: false, motif: "déjà prise" \}\)/,
    "verser-les-mails travaille sur une ligne qu'un autre réveil a déjà prise");

  // Les deux lectures passent par les portes communes. **Le filtre sur le statut
  // d'origine est ce qui compte** : sans lui, deux réveils simultanés marquent
  // tous les deux, lisent tous les deux, et facturent deux fois.
  assert.match(LES_PORTES, /statut: "en_cours", pris_le: new Date\(\)\.toISOString\(\)/,
    "les portes ne marquent pas la ligne prise");
  assert.match(LES_PORTES, /\.eq\("statut", ligne\.statut\)/,
    "les portes marquent sans vérifier d'où partait la ligne");
  for (const nom of LES_LECTURES) {
    assert.match(source(nom), /portes: lesPortesDeLaFile\(/,
      `${nom} n'emploie pas les portes communes : sa prise divergera`);
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
  assert.match(LES_PORTES, /ABANDONNEE_APRES_MS/, "rien ne dit quand une ligne est abandonnée");
  assert.match(LES_PORTES, /statut\.eq\.en_cours,pris_le\.lt\./,
    "une ligne prise et abandonnée n'est jamais reprise : la file se bloque");
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
 *
 * **Ce qu'on vérifie ici est le branchement, et non la mécanique.** Qu'une file
 * traîne ce qu'elle emporte d'un document au suivant, et le garde même quand un
 * ajout échoue, est joué par `la-file-dun-geste.test.mjs`. Ce qui reste invisible
 * autrement est que la lecture des comptes rendus **dise aux portes dans quelle
 * colonne** elle l'écrit : sans ce mot, la mécanique traînerait la proposition
 * pendant la passe et la perdrait au réveil suivant, qui en ouvrirait une
 * seconde — et rien, dans aucune épreuve de comportement, ne le dirait.
 */
test("la lecture des comptes rendus dit où s'écrit ce qu'elle emporte", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.match(texte, /emporteDans: "proposition_id"/,
    "la proposition ouverte ne survit pas au réveil suivant, qui en ouvrira une autre");
  assert.match(texte, /propositionId: emporte/,
    "la proposition emportée n'est pas rendue à la lecture du compte rendu suivant");
  assert.match(texte, /emporte: porte\.propositionId/,
    "la proposition ouverte n'est pas rendue à la file : chaque document en ouvrira une");

  // **Et un échec rend celle qu'il a ouverte.** Sans cela, le compte rendu
  // suivant en ouvrait une autre : trois comptes rendus, deux propositions vides
  // (règle 6). La mécanique la garde ; encore faut-il qu'on la lui donne.
  assert.match(texte, /propositionId: texte\(rendu\?\.proposition\?\.id\) \|\| texte\(propositionId\)/,
    "un échec oublie la proposition qu'il vient d'ouvrir");

  // La famille des rapports n'emporte rien : lui donner une colonne lui ferait
  // écrire un identifiant de proposition qu'elle n'a pas ouverte.
  assert.doesNotMatch(source("lire-les-rapports"), /emporteDans/,
    "une lecture de rapport n'ouvre aucune proposition (règle 1)");
});

/**
 * **Les lectures de front, les ajouts en file.**
 *
 * Ajouter des lignes à une proposition se fait en deux temps — relire ce qu'elle
 * porte, puis écrire ce qui manque. Deux ajouts menés ensemble verraient le même
 * état et écriraient les mêmes lignes deux fois : des doublons qu'on ne découvre
 * qu'en production, dans une proposition déjà signée.
 *
 * La mécanique commune fait les lectures de front et les suites une par une, et
 * c'est joué : `la-file-dun-geste.test.mjs` refuse deux suites simultanées. Ce
 * qu'aucune exécution ne peut dire est **de quel côté la lecture des comptes
 * rendus a rangé son ajout** : glissé dans `lireUn`, il repart de front, et la
 * mécanique n'en sait rien.
 *
 * Le jour où quelqu'un voudra « finir de paralléliser », c'est cette épreuve qui
 * l'arrêtera.
 */
test("l'ajout à la proposition est une suite, et non une lecture", () => {
  const texte = source("lire-les-comptes-rendus");

  const ouLireUn = texte.indexOf("lireUn:");
  const ouApres = texte.indexOf("apresChaque:");
  assert.ok(ouLireUn !== -1 && ouApres !== -1, "la file n'est plus branchée");
  assert.ok(ouLireUn < ouApres, "les deux crochets ont changé d'ordre : l'épreuve est à relire");

  const laLecture = texte.slice(ouLireUn, ouApres);
  assert.doesNotMatch(laLecture, /porterDansLaProposition/,
    "l'ajout à la proposition part de front : il écrira des doublons");
  assert.match(texte.slice(ouApres), /porterDansLaProposition\(/,
    "l'ajout à la proposition ne se fait plus en file");
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
  // Les deux lectures le reçoivent par les portes communes ; `verser-les-mails`,
  // qui tient encore sa propre file, le lit elle-même.
  for (const [quoi, texte] of [
    ["verser-les-mails", source("verser-les-mails")],
    ["les portes de la file", LES_PORTES]
  ]) {
    assert.match(texte, /import \{[\s\S]{0,120}ABANDONNEE_APRES_MS[\s\S]{0,160}\} from "\.[\s\S]{0,20}\/versement\/reveiller-la-file\.js"/,
      `${quoi} ne lit pas le délai dans le module partagé`);
    assert.doesNotMatch(texte, /const ABANDONNEE_APRES_MS\s*=/,
      `${quoi} redéclare le délai : il finira par différer de celui de l'écran`);
  }

  // Et aucune lecture ne le redit de son côté.
  for (const nom of LES_LECTURES) {
    assert.doesNotMatch(source(nom), /ABANDONNEE_APRES_MS/,
      `${nom} décide elle-même quand une ligne est abandonnée`);
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
 * **Le serveur garde ce que la lecture a vu, et par le même module que l'écran.**
 *
 * Sans cela, la lecture au serveur ne rend rien à regarder : une proposition
 * tombe dans la mémoire, et tout ce que l'Atelier montrait — les points relevés,
 * la confrontation au projet — n'existe nulle part. C'est ce qu'on a perdu en
 * déplaçant la file.
 */
test("la lecture au serveur conserve ce qu'elle a vu", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.match(texte, /laLigneDuneLecture\(/,
    "la lecture ne se conserve pas : le serveur ne rendrait rien à regarder");
  // **La garde avec son insertion.** Cherchée seule, l'insertion reste écrite
  // dans une branche qu'on a éteinte : `if (false)` laissait l'épreuve verte et
  // le serveur ne gardait plus rien.
  assert.match(
    texte,
    /if \(gardee\) \{\s*\n\s*const \{ error: pasGardee \} = await client\.from\("cr_lectures"\)\.insert\(gardee\);/,
    "la ligne conservée ne part pas en base"
  );
  assert.match(
    texte,
    /import \{[\s\S]{0,120}laLigneDuneLecture[\s\S]{0,120}\} from "\.\.\/_shared\/versement\/la-lecture-conservee\.js"/,
    "le serveur construit la ligne lui-même : elle divergera de celle de l'écran"
  );

  /**
   * **Avant la proposition, et sans la conditionner.** Un compte rendu qui
   * n'apporte rien à proposer a quand même été lu, et c'est souvent celui-là
   * qu'on veut rouvrir pour comprendre pourquoi (règle 6).
   */
  const ouGardee = texte.indexOf("laLigneDuneLecture(");
  const ouRien = texte.indexOf("ce compte rendu n'apporte rien à proposer");
  assert.ok(ouGardee !== -1 && ouRien !== -1);
  assert.ok(ouGardee < ouRien,
    "un compte rendu qui n'apporte rien à proposer ne se conserve pas : "
    + "c'est pourtant celui-là qu'on veut rouvrir");
});

/**
 * **Le procédé de lecture s'écrit à un seul endroit.**
 *
 * Il vivait dans l'écran de l'Atelier, et le serveur — qui lit par les mêmes
 * services — ne l'écrivait pas : deux lectures du même procédé se disaient
 * faites par deux procédés différents, et comparer leurs chiffres ne disait
 * plus si c'est le document qui avait changé ou la façon de le lire (règle 10).
 */
test("le serveur dit par quoi il a lu, dans les mêmes mots que l'Atelier", () => {
  const texte = source("lire-les-comptes-rendus");

  assert.match(texte, /lecture\.luPar = leLecteur\(/, "le serveur ne dit pas par quoi il a lu");
  assert.doesNotMatch(texte, /"lecture de CR v\d"/,
    "le procédé est réécrit ici : il divergera de celui de l'écran");
});
