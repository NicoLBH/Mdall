import test from "node:test";
import assert from "node:assert/strict";

import { renderLeDepouillement } from "./le-depouillement-ecran.js";
import { LES_DESTINATIONS, cheminDit } from "../../services/le-depouillement.js";
import { SORT, unJournalNeuf } from "../../services/le-convoi.js";

const unFichier = (name, size = 1024) => ({ name, size });

test("sans porteur ni journal, rien n'est dessiné", () => {
  assert.equal(renderLeDepouillement(), "");
  assert.equal(renderLeDepouillement({ porteurs: [] }), "");
});

/**
 * **Les deux destinations, par leur nom, avant d'agir.** C'est toute la raison
 * d'être de cette étape : un dépôt ne doit pas décider seul où va de la
 * correspondance.
 */
test("les deux destinations sont nommées, chemin compris", () => {
  const dessine = renderLeDepouillement({ porteurs: [unFichier("un.msg")] });
  for (const une of LES_DESTINATIONS) {
    assert.ok(dessine.includes(une.quoi), une.quoi);
    assert.ok(dessine.includes(cheminDit(une.chemin)), cheminDit(une.chemin));
  }
});

/**
 * **Le régime est dit, et il nomme l'équipe.** « Privé » tout seul laisse
 * chacun deviner de qui il se protège — et ici le cadenas veut dire « eux ne
 * peuvent pas », l'inverse de son sens habituel.
 */
test("le régime est annoncé, avec le geste qui partage", () => {
  const dessine = renderLeDepouillement({ porteurs: [unFichier("un.msg")] });
  // Les deux moitiés du régime : le dossier se voit, ce qu'on y dépose non.
  assert.match(dessine, /visible par l&#39;équipe|visible par l'équipe/);
  assert.match(dessine, /vous seul verrez ce que vous y déposez/);
  assert.match(dessine, /déplacez/);
  assert.match(dessine, /shield-lock/);
});

/**
 * **Aucun nombre de messages n'est promis.** Personne ne le sait encore : le
 * savoir demanderait d'ouvrir les deux cents fichiers. Un chiffre qu'on ne
 * vérifie pas est une intention (règle 12).
 */
test("l'étape ne promet aucun compte de messages ni de pièces", () => {
  const dessine = renderLeDepouillement({ porteurs: [unFichier("a.msg"), unFichier("b.zip")] });
  assert.equal(/\d+\s+messages\b/.test(dessine), false, dessine.match(/\d+\s+messages\b/)?.[0]);
  assert.equal(/\d+\s+pièces jointes\b/.test(dessine), false);
  // Ce qu'il annonce, c'est le nombre de fichiers déposés — celui-là, il le sait.
  assert.match(dessine, /Dépouiller 2 fichiers/);
});

test("un seul porteur se dit au singulier", () => {
  assert.match(renderLeDepouillement({ porteurs: [unFichier("un.msg")] }),
    /Dépouiller ce fichier de messagerie/);
});

test("chaque porteur est nommé, avec son poids en français", () => {
  const dessine = renderLeDepouillement({
    porteurs: [unFichier("RE_ Étanchéité.msg", 6400), unFichier("historique.zip", 1_200_000)]
  });
  assert.match(dessine, /RE_ Étanchéité\.msg/);
  assert.match(dessine, /6,4 ko/);
  assert.match(dessine, /1,2 Mo/);
});

/**
 * **Rien ne part avant qu'on le demande**, et rien ne repart pendant. Un second
 * clic relancerait deux cents lectures depuis le début.
 */
test("le bouton se désarme pendant le dépouillement", () => {
  const enCours = { ...unJournalNeuf(), fichiers: 3, fini: false };
  const dessine = renderLeDepouillement({ porteurs: [unFichier("a.msg")], journal: enCours });
  assert.match(dessine, /Dépouillement…/);
  assert.match(dessine, /id="documentsDepouillerBtn"[\s\S]{0,80}disabled/);
});

/**
 * **Après coup, ce panneau est un compte rendu.** « Dépouiller ce fichier » au
 * -dessus d'un bouton éteint annonçait un geste qui venait d'avoir lieu ; et
 * rappeler les destinations d'un dépôt terminé encombre le bilan.
 */
test("sans porteur, le panneau devient un compte rendu", () => {
  const fini = { ...unJournalNeuf(), fichiers: 2, lus: 2, verses: 2, fini: true };
  const dessine = renderLeDepouillement({ porteurs: [], journal: fini });

  assert.match(dessine, /Le dépouillement<\/div>/);
  assert.doesNotMatch(dessine, /Dépouiller ce fichier|Dépouiller \d+ fichiers/);
  // **Le bouton s'en va, il ne se grise pas.** Un bouton qui ne fait rien
  // apprend à ne plus lire les boutons.
  assert.doesNotMatch(dessine, /documentsDepouillerBtn/);
  // Le compte rendu, lui, reste lisible : c'est ce qu'on vient regarder.
  assert.match(dessine, /2 messages versés/);
  // Les destinations ne se rappellent plus : le dépôt a eu lieu.
  assert.doesNotMatch(dessine, /Pièces jointes/);
});

/**
 * **Ce qui a résisté se nomme.** « 3 refusés » sur deux cents est une
 * information qu'on ne peut pas exploiter ; « 3 refusés, et voici leurs noms »
 * se rejoue.
 */
test("les accrocs sont nommés, avec leur sort et leur détail", () => {
  const journal = {
    ...unJournalNeuf(), fichiers: 3, verses: 2, illisibles: 1, fini: true,
    accrocs: [{ fichier: "abime.msg", sort: SORT.ILLISIBLE, detail: "signature absente" }]
  };
  const dessine = renderLeDepouillement({ porteurs: [], journal });
  assert.match(dessine, /abime\.msg/);
  assert.match(dessine, /signature absente/);
});

/**
 * **Un arrêt se dit.** Un dépouillement qui s'interrompt sans rien afficher
 * ferait croire qu'il tourne encore, et l'on attendrait.
 */
test("un arrêt est affiché tel quel", () => {
  const journal = {
    ...unJournalNeuf(), fichiers: 4, fini: true,
    arrete: "votre session n'a pas répondu : rien n'a été rangé"
  };
  const dessine = renderLeDepouillement({ porteurs: [], journal });
  assert.match(dessine, /votre session n&#39;a pas répondu|votre session n'a pas répondu/);
});

/**
 * **Un nom de fichier vient du dehors.** Un `.msg` peut s'appeler n'importe
 * comment, et l'écrire tel quel ferait d'un dépôt un vecteur d'injection.
 */
test("un nom de fichier qui ressemble à du HTML ne fait pas de HTML", () => {
  const dessine = renderLeDepouillement({
    porteurs: [unFichier("<img src=x onerror=alert(1)>.msg")]
  });
  assert.equal(dessine.includes("<img src=x"), false);
  assert.match(dessine, /&lt;img/);
});

/**
 * **Une attente sans rotative passe pour une panne.**
 *
 * C'est ce qui est arrivé : vingt mails lâchés dans la zone, et rien à l'écran
 * pendant un aller-retour de réseau. On croyait que ça ne marchait pas.
 */
test("pendant le dépouillement, une barre et une rotative disent l'attente", () => {
  const enCours = { ...unJournalNeuf(), fichiers: 3, lus: 1, verses: 41, fini: false };
  const dessine = renderLeDepouillement({ porteurs: [unFichier("a.msg")], journal: enCours });

  // La rotative elle-même : la classe « est-en-cours » reste sur le paragraphe
  // même sans elle, et s'y fier laissait l'épreuve passer sur un écran figé.
  assert.match(dessine, /class="ui-spinner ui-spinner--sm"/);
  assert.match(dessine, /role="status"/);

  // **Une barre, comme pour le dépôt d'un rapport.** Un compte qui s'incrémente
  // ne dit pas qu'il reste à attendre ; une barre si.
  assert.match(dessine, /role="progressbar"/);
  assert.match(dessine, /aria-valuenow="33"/);
  assert.match(dessine, /1 sur 3 fichiers/);

  // **Et qu'on pourra fermer.** C'est le journal des Actions qui porte la
  // suite : rester là pendant deux minutes n'apprend rien de plus.
  assert.match(dessine, /journal des Actions/);
});

/** Rien de lu encore : la barre ne ment pas avec un zéro, elle balaie. */
test("avant le premier fichier lu, la barre est indéterminée", () => {
  const debut = { ...unJournalNeuf(), fichiers: 3, lus: 0, fini: false };
  const dessine = renderLeDepouillement({ porteurs: [unFichier("a.msg")], journal: debut });
  assert.match(dessine, /is-indeterminate/);
});

/**
 * **Un compte rendu sans suite laisse devant un mur.** « 7 messages versés »,
 * et rien à faire : on cliquait sur « Valider », qui ne concernait pas ce
 * dépôt-là, et il ne se passait rien.
 */
test("le dépouillement terminé propose d'aller voir ce qui a été rangé", () => {
  const fini = {
    ...unJournalNeuf(), fichiers: 2, lus: 2, verses: 7, pieces: 20, fini: true,
    ou: { messages: "dossier-des-mails", pieces: "dossier-des-pieces" }
  };
  const dessine = renderLeDepouillement({ porteurs: [], journal: fini });

  assert.match(dessine, /id="documentsVoirLesMailsBtn"/);
  assert.match(dessine, /data-dossier="dossier-des-mails"/);
  assert.match(dessine, /Voir les mails rangés/);
});

/**
 * **On ne propose pas d'aller voir là où rien n'est allé.** Un dépôt arrêté n'a
 * rangé personne, et le dossier peut n'avoir jamais été créé.
 */
test("un dépouillement arrêté ne propose pas d'aller voir", () => {
  // **Les dossiers ont été creusés avant l'arrêt** : le journal les porte, et
  // c'est bien le cas qu'il faut éprouver. Un journal sans dossier aurait fait
  // passer l'épreuve sans que la condition sur l'arrêt serve à rien.
  const arrete = {
    ...unJournalNeuf(), fichiers: 2, fini: true,
    ou: { messages: "dossier-des-mails", pieces: "dossier-des-pieces" },
    arrete: "votre session n'a pas répondu : rien n'a été rangé"
  };
  assert.doesNotMatch(renderLeDepouillement({ porteurs: [], journal: arrete }),
    /documentsVoirLesMailsBtn/);

  const sansDossier = { ...unJournalNeuf(), fichiers: 1, verses: 1, fini: true };
  assert.doesNotMatch(renderLeDepouillement({ porteurs: [], journal: sansDossier }),
    /documentsVoirLesMailsBtn/);
});
