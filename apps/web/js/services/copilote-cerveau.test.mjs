/**
 * Le cerveau, lu depuis la conversation.
 *
 * ## Ce que ces gardes attrapent
 *
 * **Un aiguillage qui se trompe d'outil.** Deux outils tournent au navigateur ;
 * le serveur dit lequel par un rôle. Router sur le nom lui apprendrait un nom
 * d'outil — ce que ce champ existe pour éviter —, et l'écrire des deux côtés le
 * ferait diverger au premier renommage (règle 4).
 *
 * **Et un matériau relu.** Le bouton « Ouvrir le cerveau » doit montrer le
 * dessin dont la réponse parle, pas celui d'une mémoire relue trois minutes
 * plus tard : sur un projet qui bouge, la différence se voit au premier
 * versement.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { executerLeCerveau, TITRE_CERVEAU } from "./copilote-cerveau.js";

const MEMOIRE = [{ id: "a" }, { id: "b" }];

const faux = () => ({
  noeuds: [
    { id: "a", genre: "valeur", domaine: "sol", poids: 3, sujet: "Portance du sol" },
    { id: "r", genre: "fonction", domaine: "sol", poids: 2, sujet: "Semelle minimale" }
  ],
  liens: [{ de: "a", vers: "r" }],
  profondeur: 1, cycles: [], enregistres: true,
  compte: { socle: 1, rejouables: 0, opaques: 0 }
});

test("la lecture rend des nombres et un récit, et garde de quoi rouvrir", async () => {
  const { resultat, pourLeModele } = await executerLeCerveau({
    assertions: MEMOIRE, projectId: "p", lire: faux
  });

  assert.equal(resultat.statut, "fait");
  assert.equal(resultat.titre, TITRE_CERVEAU);
  assert.equal(resultat.lecture.regles, 1);
  assert.match(resultat.recit, /cube/);

  // **Le matériau reste ici, il ne part pas au modèle** : des milliers de nœuds
  // ne lui apprendraient rien et coûteraient la moitié de sa fenêtre.
  assert.equal(resultat.cerveau.assertions, MEMOIRE);
  assert.equal(pourLeModele.cerveau, undefined);
  assert.equal(pourLeModele.regles, 1);
  assert.match(pourLeModele.recit, /cube/);
});

/**
 * **Un dessin qui ne se construit pas se dit, il ne fait pas tomber la réponse.**
 * La boucle du copilote attend la même forme que les agents du serveur : un
 * refus qui lève arrêterait la conversation au lieu d'expliquer.
 */
test("un cerveau illisible rend un refus, pas une exception", async () => {
  const { resultat, pourLeModele } = await executerLeCerveau({
    assertions: MEMOIRE,
    projectId: "p",
    lire: () => { throw new Error("index introuvable"); }
  });

  assert.equal(resultat.statut, "manque");
  assert.match(resultat.message, /index introuvable/);
  assert.match(pourLeModele.refus, /index introuvable/);
});

/** Ce qui se passe pendant se raconte : un aller-retour muet ressemble à une panne. */
test("la lecture dit ce qu'elle fait pendant qu'elle le fait", async () => {
  const dits = [];
  await executerLeCerveau({
    assertions: MEMOIRE, projectId: "p", lire: faux,
    onEtape: (dit) => dits.push(dit.texte)
  });

  assert.deepEqual(dits, ["Lecture du raisonnement du projet", "Cerveau lu"]);
});

/**
 * **Le rôle, et non le nom.** Le navigateur n'a pas de catalogue : il reçoit du
 * serveur « cerveau » ou « variante », et c'est tout ce qu'il en sait. Une garde
 * de texte, faute de pouvoir importer un écran qui parle à la base — mais elle
 * attrape exactement le défaut qui rendrait le cerveau muet : un aiguillage qui
 * repasse par le nom, ou un rôle écrit différemment des deux côtés.
 */
/**
 * **Une boucle d'animation laissée derrière tourne pour toujours.**
 *
 * Le fil se réécrit entièrement à chaque message, à chaque étape d'agent, à
 * chaque conversation qui arrive : les toiles partent avec, mais pas les
 * boucles — elles continuent sur un canevas détaché, et il y en a une de plus à
 * chaque rendu. Au bout de dix messages l'onglet chauffe, et rien à l'écran ne
 * le dit. C'est exactement la classe de défaut qu'aucune exécution ne montre
 * ici : l'écran parle à la base et ne s'importe pas.
 */
test("les dessins encastrés sont retirés avant d'être reposés", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../views/studio/copilote/copilote.js", import.meta.url), "utf8");

  assert.match(source, /function retirerLesCerveaux[\s\S]{0,300}fermer\(\)/,
    "il y a de quoi les retirer");
  assert.match(source, /async function poserLesCerveaux[\s\S]{0,300}retirerLesCerveaux\(/,
    "et on retire avant de poser");
  assert.match(source, /void poserLesCerveaux\(root\)/, "à chaque rendu");

  // **Les quatre réglages d'arrivée**, qui sont ceux où un projet ressemble à
  // quelque chose : les strates en profondeur, le battement, la séparation
  // horizontale mémoire/raisonnement, et la chaleur.
  assert.match(
    source,
    /reglages: \{ vue: "volume", mode: "vivant", orientation: "horizontal", couleur: "chaleur" \}/
  );
});

/**
 * **Le dessin encastré n'est pas la fenêtre.** Le verrou « une seule à la fois »
 * protège la fenêtre — deux superposées ne se distinguent pas ; un fil peut en
 * porter trois, qui ne se recouvrent pas. Et Échap ne doit pas faire disparaître
 * un morceau de la réponse qu'on est en train de lire.
 */
test("un cerveau encastré ne prend pas le verrou de la fenêtre, et rend de quoi le retirer", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../views/ui/cerveau-du-projet.js", import.meta.url), "utf8");

  assert.match(source, /if \(!encastre && ouverte\) return;/);
  assert.match(source, /if \(!encastre\) ouverte = hote;/);
  assert.match(source, /if \(!encastre && evenement\.key === "Escape"\) fermer\(\);/);
  assert.match(source, /return encastre \? fermer : undefined;/);
});

test("le navigateur route sur le rôle que le serveur lui donne", async () => {
  const { readFile } = await import("node:fs/promises");
  const { ROLES_DU_NAVIGATEUR } = await import(
    "../../../../supabase/functions/_shared/utilitaires/variante-outil.js"
  );
  const [client, serveur] = await Promise.all([
    readFile(new URL("./copilote-service.js", import.meta.url), "utf8"),
    readFile(new URL("../../../../supabase/functions/project-copilot/index.ts", import.meta.url), "utf8")
  ]);

  // Le serveur écrit le rôle, et il le lit dans la table — pas dans une suite
  // de conditions qui oublierait le troisième outil.
  assert.match(serveur, /quoi: roleDuNavigateur\(item\.name\)/, "le serveur écrit un rôle");
  assert.match(client, /appel\?\.quoi/, "le navigateur lit ce rôle");

  // **Chaque rôle déclaré est un rôle que le navigateur sait exécuter.** Un
  // outil ajouté à la table sans être branché ici partirait au navigateur, qui
  // ne saurait qu'en faire — et le tour s'arrêterait sans qu'on sache pourquoi.
  const orphelins = Object.values(ROLES_DU_NAVIGATEUR)
    .filter((role) => !new RegExp(`\\n\\s*${role}: \\(\\) =>`).test(client));
  assert.deepEqual(orphelins, []);

  // Et aucun nom d'outil ne descend dans la page : router sur le nom
  // reviendrait à apprendre au navigateur quels outils existent.
  for (const nom of Object.keys(ROLES_DU_NAVIGATEUR)) {
    assert.ok(!client.includes(nom), `${nom} est écrit dans le navigateur`);
  }
});
