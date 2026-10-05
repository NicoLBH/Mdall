/**
 * L'épreuve de la composition d'un lot.
 *
 * **Les trois défauts qu'on cherche ici écrivent dans la mémoire, ou l'en
 * privent, sans le dire.**
 *
 * Le premier est une famille qu'on croit savoir transcrire et qu'on ne sait pas :
 * ses documents entreraient dans le lot, ne donneraient rien, et repartiraient
 * marqués comme portés — disparus du compteur sans être passés nulle part.
 *
 * Le deuxième est un bilan qui fond les trois sorties — a donné, n'avait rien à
 * donner, a échoué. Les deux premières sont finies, la troisième est à refaire,
 * et « 12 portés » ne permet pas de savoir laquelle s'applique.
 *
 * Le troisième est une transcription écrite ici plutôt qu'appelée. Elle
 * proposerait autre chose que ce que l'écran annonce, sur les mêmes documents.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  CE_QUE_LA_FAMILLE_TRANSCRIT, CE_QUE_LE_MOTIF_DIT, POURQUOI_RIEN_A_PORTER,
  laFamilleSeTranscrit, leBilanDuLot, leTitreDunRapport, lesAffirmationsDuneLecture,
  lesEtapesDuLot, lesFamillesSansTranscription, lintroDuLot, lintroDunRapport, phraseDuBilan,
  pourquoiLaFamilleNeSeTranscritPas
} from "./la-propo-dun-lot.js";
import { CE_QUE_DIT_LA_FAMILLE, FAMILLE } from "./les-familles-de-document.js";

/* ── Ce que chaque famille sait donner ─────────────────────────────────────── */

test("chaque famille du registre dit si elle se transcrit", () => {
  /**
   * **L'absence n'est pas une réponse.** Une famille ajoutée au registre et
   * oubliée ici tomberait dans l'inconnu : ses documents n'entreraient pas dans
   * un lot, ce qui est le bon comportement, mais personne ne saurait pourquoi —
   * et surtout, personne ne saurait qu'il reste à écrire sa transcription.
   */
  for (const famille of Object.values(FAMILLE)) {
    const ce = CE_QUE_LA_FAMILLE_TRANSCRIT[famille];
    assert.ok(ce, `la famille « ${famille} » ne dit pas si elle se transcrit`);
    assert.equal(typeof ce.transcrit, "boolean", famille);

    // Celle qui transcrit dit quoi ; celle qui ne transcrit pas dit pourquoi.
    if (ce.transcrit) assert.ok(ce.quoi, `${famille} : sans ce qu'elle donne`);
    else assert.ok(ce.pourquoiPas, `${famille} : sans raison de ne rien donner`);
  }
});

test("le registre des familles ne porte rien que la composition ignore", () => {
  // L'autre sens : une entrée ici pour une famille qui n'existe plus serait un
  // mot mort qu'on croit vivant (règle 1).
  const connues = new Set(Object.keys(CE_QUE_DIT_LA_FAMILLE));
  for (const famille of Object.keys(CE_QUE_LA_FAMILLE_TRANSCRIT)) {
    assert.equal(connues.has(famille), true, `« ${famille} » n'est pas une famille du registre`);
  }
});

test("un fil de messagerie ne se transcrit pas, et la raison le dit", () => {
  // Et elle ne dit pas « un fil n'apporte rien » : il apporte des prises de
  // position, et ce qui manque est en aval.
  assert.equal(laFamilleSeTranscrit(FAMILLE.MAIL), false);
  assert.match(pourquoiLaFamilleNeSeTranscritPas(FAMILLE.MAIL), /prises de position/);
  assert.match(pourquoiLaFamilleNeSeTranscritPas(FAMILLE.MAIL), /transcrit/);
});

test("les deux familles qui se transcrivent le font", () => {
  assert.equal(laFamilleSeTranscrit(FAMILLE.CR), true);
  assert.equal(laFamilleSeTranscrit(FAMILLE.CONTROLE), true);
  assert.equal(pourquoiLaFamilleNeSeTranscritPas(FAMILLE.CR), "");
});

test("une famille inconnue n'entre pas, et ne prétend pas savoir", () => {
  assert.equal(laFamilleSeTranscrit("brouettes"), false);
  assert.equal(laFamilleSeTranscrit(""), false);
  assert.equal(laFamilleSeTranscrit(null), false);
  assert.match(pourquoiLaFamilleNeSeTranscritPas("brouettes"), /n'est pas connue/);
});

/* ── Ce qu'une lecture donne ───────────────────────────────────────────────── */

test("un fil ne donne rien, et le motif est sa famille", () => {
  const porte = lesAffirmationsDuneLecture({
    ligne: { id: "f-1", analyse_gelee: { fil: { messages: [{}] } } },
    famille: FAMILLE.MAIL
  });
  assert.deepEqual(porte.affirmations, []);
  assert.equal(porte.pourquoiPas, POURQUOI_RIEN_A_PORTER.SANS_TRANSCRIPTION);
  assert.equal(porte.dit, CE_QUE_LE_MOTIF_DIT[POURQUOI_RIEN_A_PORTER.SANS_TRANSCRIPTION]);
});

test("une lecture sans analyse gelée se distingue d'une lecture vide", () => {
  /**
   * **Deux motifs, deux gestes.** Sans analyse, il faut relire le document —
   * les lectures d'avant la colonne n'en ont pas. Rien de transcriptible veut
   * dire que la lecture a eu lieu et que le document ne portait rien, et il n'y
   * a alors rien à faire (règle 5).
   */
  const sansAnalyse = lesAffirmationsDuneLecture({
    ligne: { id: "cr-1" }, famille: FAMILLE.CR
  });
  assert.equal(sansAnalyse.pourquoiPas, POURQUOI_RIEN_A_PORTER.SANS_ANALYSE);
  assert.match(sansAnalyse.dit, /relire/);

  const vide = lesAffirmationsDuneLecture({
    ligne: {
      id: "cr-2", document_id: "",
      analyse_gelee: { lecture: { nom: "CR.pdf", points: [], rubriques: [] }, confrontes: [] }
    },
    famille: FAMILLE.CR
  });
  assert.equal(vide.pourquoiPas, POURQUOI_RIEN_A_PORTER.RIEN_DE_TRANSCRIPTIBLE);
  assert.notEqual(vide.dit, sansAnalyse.dit);
});

test("un compte rendu lu donne des affirmations, un titre et une intro", () => {
  /**
   * **La même transcription que la fonction de bord**, sur une lecture gelée.
   * Si cette épreuve tombe, c'est que la composition d'un lot ne produit plus ce
   * que l'écran d'un document annonce — et c'est la divergence la plus grave
   * possible, parce qu'elle porte sur ce qui entre dans la mémoire.
   */
  const porte = lesAffirmationsDuneLecture({
    ligne: {
      id: "cr-3",
      document: "Réunion du 12 novembre.pdf",
      document_id: "doc-7",
      analyse_gelee: {
        lecture: {
          nom: "Réunion du 12 novembre.pdf",
          identite: { numero: "12", tenueLe: "2024-11-12" },
          luPar: "gpt-4.1-mini · lecture de CR v1",
          rubriques: [],
          idees: [],
          points: []
        },
        /**
         * **`sort: "nouveau"` est ce qui fait un sujet à ouvrir.** C'est la
         * confrontation qui le pose, au moment de la lecture, contre les sujets
         * qui existaient ce jour-là — et c'est pour cela qu'elle est gelée.
         */
        confrontes: [{
          sort: "nouveau",
          titre: "Reprendre l'étanchéité de l'acrotère",
          description: "L'eau passe en tête de mur.",
          lot: "08 Étanchéité"
        }]
      }
    },
    famille: FAMILLE.CR
  });

  assert.equal(porte.pourquoiPas, "");
  assert.equal(porte.titre, "CR n° 12 du 2024-11-12");
  assert.match(porte.intro, /Réunion du 12 novembre\.pdf/);
  assert.equal(porte.source, "Réunion du 12 novembre.pdf");

  /**
   * **Le point relevé y est, et non seulement le document.**
   *
   * `affirmations.length !== 0` ne suffisait pas : la ligne du document fait un
   * item à elle seule, de sorte qu'une confrontation entièrement perdue laissait
   * le compte non nul. La batterie l'a montré en coupant `vue.confrontes` — rien
   * n'est tombé, et la proposition ne portait plus que le document.
   */
  const sujets = porte.affirmations.filter(
    (une) => /étanchéité/i.test(JSON.stringify(une))
  );
  assert.equal(sujets.length, 1, "le point relevé n'arrive pas dans la proposition");
});

test("une confrontation gelée vide ne donne que le document", () => {
  // L'autre face de la même propriété : sans point relevé, il reste la ligne du
  // document — et c'est tout ce qu'il doit rester.
  const porte = lesAffirmationsDuneLecture({
    ligne: {
      id: "cr-3b", document: "CR.pdf", document_id: "doc-7",
      analyse_gelee: {
        lecture: { nom: "CR.pdf", rubriques: [], idees: [], points: [] }, confrontes: []
      }
    },
    famille: FAMILLE.CR
  });
  assert.equal(porte.affirmations.length, 1);
  assert.doesNotMatch(JSON.stringify(porte.affirmations), /étanchéité/i);
});

test("le document du compte rendu n'entre que s'il a un identifiant", () => {
  // Une ligne de proposition qui nomme un document sans identifiant ne pourrait
  // pas s'y rattacher : elle promettrait une provenance qu'on ne peut pas suivre.
  const avecDoc = lesAffirmationsDuneLecture({
    ligne: {
      id: "cr-4", document: "CR.pdf", document_id: "doc-9",
      analyse_gelee: {
        lecture: { nom: "CR.pdf", rubriques: [], idees: [], points: [] }, confrontes: []
      }
    },
    famille: FAMILLE.CR
  });
  assert.notEqual(avecDoc.affirmations.length, 0, "le document seul fait déjà une affirmation");

  const sansDoc = lesAffirmationsDuneLecture({
    ligne: {
      id: "cr-5", document: "CR.pdf", document_id: "",
      analyse_gelee: {
        lecture: { nom: "CR.pdf", rubriques: [], idees: [], points: [] }, confrontes: []
      }
    },
    famille: FAMILLE.CR
  });
  assert.equal(sansDoc.affirmations.length, 0);
});

test("un rapport de contrôle donne ses avis, et dit ce qu'il a laissé dehors", () => {
  /**
   * **Le couple objet vérifié / remarque de contrôle décide.** Un avis réduit à
   * son numéro ne vaut rien en mémoire ; mais le compter dehors en silence
   * ferait croire que le rapport n'en portait qu'un.
   */
  const porte = lesAffirmationsDuneLecture({
    ligne: {
      id: "r-1",
      document: "RICT-03.pdf",
      document_id: "doc-11",
      etabli_le: "28/03/2025",
      analyse_gelee: {
        lecture: {
          nom: "RICT-03.pdf",
          le: "28/03/2025",
          identite: { numero: "CT/13860/0325/0320", etabliLe: "28/03/2025" },
          legende: [{ marque: "S", signification: "Suspendu" }],
          avis: [
            {
              reference: "245",
              intitule: "Conformité des installations",
              constat: "Les notices techniques sont à nous transmettre.",
              marque: "S",
              page: 7
            },
            // Ni objet ni remarque : versé, il ne dirait qu'un numéro.
            { reference: "246", intitule: "", constat: "", marque: "S", page: 8 }
          ]
        }
      }
    },
    famille: FAMILLE.CONTROLE
  });

  assert.equal(porte.affirmations.length, 1, "le second avis ne porte pas son couple");
  assert.equal(porte.pourquoiPas, "");
  assert.ok(porte.laisses, "ce qui est laissé dehors ne se dit pas");
  assert.match(porte.titre, /CT\/13860\/0325\/0320/);

  /**
   * **La date d'émission arrive jusqu'à la provenance de l'avis.**
   *
   * C'est par elle qu'on saura, dans six mois, de quand datait ce constat — et
   * c'est la seule chose qui distingue deux avis du même numéro dans deux
   * rapports. La batterie l'a coupée sans que rien ne tombe.
   */
  assert.match(JSON.stringify(porte.affirmations[0].provenance), /28\/03\/2025/);
});

test("la légende du rapport est l'autorité sur ses propres marques", () => {
  /**
   * **Et elle doit traverser jusqu'ici.** Les marques du métier — S, D, NC, SO,
   * F — se connaissent sans légende ; les autres non. Un rapport qui déclare
   * « PM : pour mémoire » est le seul à savoir ce que `PM` veut dire, et sans sa
   * légende l'avis repart « sans teneur lisible » — c'est-à-dire du bruit, celui
   * que le tour précédent a passé son temps à ne plus verser.
   *
   * La marque est choisie **hors du vocabulaire du métier** exprès : avec `S`,
   * la teneur se retrouve toute seule et la coupure de la légende ne se voit pas.
   */
  const avecUneMarqueQueSeulLeRapportConnait = (legende) => lesAffirmationsDuneLecture({
    ligne: {
      id: "r-2", document: "RICT-04.pdf", document_id: "doc-12", etabli_le: "16/04/2025",
      analyse_gelee: {
        lecture: {
          nom: "RICT-04.pdf", le: "16/04/2025", legende,
          avis: [{
            reference: "301", intitule: "Désenfumage des circulations",
            constat: "Le dossier de désenfumage reste à nous transmettre.",
            marque: "PM", page: 4
          }]
        }
      }
    },
    famille: FAMILLE.CONTROLE
  });

  const lue = avecUneMarqueQueSeulLeRapportConnait([
    { marque: "PM", signification: "Pour mémoire" }
  ]);
  assert.match(lue.affirmations[0].valeur, /Pour mémoire/);

  const perdue = avecUneMarqueQueSeulLeRapportConnait(null);
  assert.match(perdue.affirmations[0].valeur, /sans teneur lisible/);
  assert.notEqual(lue.affirmations[0].valeur, perdue.affirmations[0].valeur);
});

/* ── Les titres et les intros ──────────────────────────────────────────────── */

test("le titre d'un rapport prend son numéro, puis son fichier", () => {
  // C'est par le numéro qu'un bureau de contrôle désigne ses documents, et
  // c'est ce qu'on retrouvera dans la correspondance.
  assert.equal(
    leTitreDunRapport({ identite: { numero: "CT/13860/0325/0320", etabliLe: "28/03/2025" } }),
    "Rapport n° CT/13860/0325/0320 du 28/03/2025"
  );
  assert.equal(
    leTitreDunRapport({}, "RICT-03.pdf"),
    "Rapport de contrôle — RICT-03"
  );
  assert.equal(leTitreDunRapport(null, ""), "Rapport de bureau de contrôle");
});

test("l'intro d'un rapport porte le compte, et ce qui n'y est pas", () => {
  // « 12 avis » sans « sur 20 » ferait chercher les huit autres dans la
  // proposition, où ils ne sont pas (règle 2).
  const dite = lintroDunRapport({
    nom: "RICT-03.pdf", combien: 12, ditDesAvisSansCouple: "8 avis laissés dehors."
  });
  assert.match(dite, /RICT-03\.pdf/);
  assert.match(dite, /12 avis/);
  assert.match(dite, /8 avis laissés dehors\./);
});

test("l'intro du lot nomme ses documents, et porte ce que le premier a laissé", () => {
  /**
   * **La première question devant une proposition de cent quarante lignes est
   * « d'où est-ce que ça vient ».** Un titre qui dit « 12 documents » et une
   * intro qui ne les nomme pas obligeraient à ouvrir chaque ligne pour
   * reconstituer la liste.
   */
  const dite = lintroDuLot(
    [{ titre: "CR du 12 novembre" }, { titre: "RICT-03" }],
    { laisses: "8 avis laissés dehors." }
  );
  assert.match(dite, /2 documents lus/);
  assert.match(dite, /· CR du 12 novembre/);
  assert.match(dite, /· RICT-03/);
  assert.match(dite, /8 avis laissés dehors\./);

  assert.match(lintroDuLot([{ titre: "CR" }]), /1 document lu/);
  assert.equal(lintroDuLot([]), "");
  assert.equal(lintroDuLot(null), "");
});

/* ── Le chemin du lot ─────────────────────────────────────────────────────── */

test("chaque étape porte son rang et son dénominateur", () => {
  // « 3 sur 12 » dit où l'on en est et combien il reste. Un écran qui
  // recompterait le rang à l'affichage se tromperait le jour où le lot se filtre.
  const etapes = lesEtapesDuLot([
    { id: "a", titre: "CR 1", famille: FAMILLE.CR },
    { id: "b", titre: "RICT 3", famille: FAMILLE.CONTROLE }
  ]);
  assert.deepEqual(etapes.map((une) => une.dit), ["1 sur 2 · CR 1", "2 sur 2 · RICT 3"]);
  assert.deepEqual(etapes.map((une) => une.rang), [1, 2]);
  assert.deepEqual(etapes.map((une) => une.sur), [2, 2]);
});

test("un lot vide ne fait aucune étape", () => {
  assert.deepEqual(lesEtapesDuLot([]), []);
  assert.deepEqual(lesEtapesDuLot(null), []);
});

/* ── Le bilan ─────────────────────────────────────────────────────────────── */

test("le bilan sépare ce qui a donné, ce qui n'avait rien, et ce qui a échoué", () => {
  /**
   * **Les deux premiers sont finis, le troisième est à refaire.** « 12 portés »
   * ne permet pas de savoir laquelle des trois suites s'applique, et c'est la
   * seule chose qu'on veut savoir en lisant ce bilan.
   */
  const bilan = leBilanDuLot([
    { titre: "CR 1", affirmations: 24, ecartees: 0, motif: "" },
    { titre: "CR 2", affirmations: 18, ecartees: 3, motif: "" },
    { titre: "Fil", affirmations: 0, ecartees: 0, motif: "" },
    { titre: "RICT 9", affirmations: 0, ecartees: 0, motif: "la proposition n'est plus ouverte" }
  ]);

  assert.equal(bilan.combien, 4);
  assert.equal(bilan.donnantes, 2);
  assert.equal(bilan.muettes, 1);
  assert.equal(bilan.ratees, 1);
  assert.equal(bilan.affirmations, 42);
  assert.equal(bilan.ecartees, 3);
  assert.deepEqual(bilan.motifs, [
    { titre: "RICT 9", motif: "la proposition n'est plus ouverte" }
  ]);
});

test("le bilan nomme les ratées une par une", () => {
  // « 3 n'ont pas pu être portés » sans dire lesquels obligerait à deviner ce
  // qu'un second clic reprendrait.
  const bilan = leBilanDuLot([
    { titre: "A", affirmations: 0, motif: "réseau" },
    { titre: "B", affirmations: 0, motif: "porte fermée" }
  ]);
  assert.deepEqual(bilan.motifs.map((un) => un.titre), ["A", "B"]);
});

test("un lot entièrement raté se lit comme tel", () => {
  const bilan = leBilanDuLot([{ titre: "A", affirmations: 0, motif: "réseau" }]);
  assert.equal(bilan.donnantes, 0);
  assert.equal(bilan.dit, "1 document n'a pas pu être porté");
});

test("un lot vide se dit, et ne se tait pas", () => {
  // Un lot qui n'a rien porté du tout est un résultat, et il faut pouvoir le lire.
  const bilan = leBilanDuLot([]);
  assert.equal(bilan.combien, 0);
  assert.equal(bilan.dit, "Aucun document n'a été porté.");
  assert.equal(leBilanDuLot(null).dit, "Aucun document n'a été porté.");
});

test("la phrase du bilan accorde les noms et les verbes", () => {
  assert.equal(
    phraseDuBilan({ donnantes: 1, muettes: 1, ratees: 1, affirmations: 1 }),
    "1 document a porté 1 ligne · 1 document n'apportait rien · 1 document n'a pas pu être porté"
  );
  assert.equal(
    phraseDuBilan({ donnantes: 9, muettes: 2, ratees: 3, affirmations: 143 }),
    "9 documents ont porté 143 lignes · 2 documents n'apportaient rien"
      + " · 3 documents n'ont pas pu être portés"
  );
});

test("la phrase ne parle que de ce qui existe", () => {
  // Un « 0 document n'a pas pu être porté » ferait chercher un échec.
  assert.equal(phraseDuBilan({ donnantes: 3, affirmations: 7 }), "3 documents ont porté 7 lignes");
  assert.doesNotMatch(phraseDuBilan({ donnantes: 3, affirmations: 7 }), /0 /);
});

/* ── Les familles laissées dehors ─────────────────────────────────────────── */

test("les familles sans transcription se comptent et portent leur nom d'écran", () => {
  /**
   * **Par famille, et non en bloc.** « 3 documents non transcrits » n'apprend
   * rien ; « 3 Mails » dit lesquels, et la phrase de la famille dit pourquoi.
   */
  const dehors = lesFamillesSansTranscription([
    { famille: FAMILLE.MAIL }, { famille: FAMILLE.MAIL },
    { famille: FAMILLE.CR }, { famille: FAMILLE.CONTROLE }
  ]);

  assert.equal(dehors.length, 1, "seuls les mails restent dehors");
  assert.equal(dehors[0].combien, 2);
  assert.equal(dehors[0].nom, "Mails");
  assert.match(dehors[0].pourquoiPas, /prises de position/);
});

test("rien dehors ne rend rien, et non une ligne vide", () => {
  assert.deepEqual(lesFamillesSansTranscription([{ famille: FAMILLE.CR }]), []);
  assert.deepEqual(lesFamillesSansTranscription([]), []);
  assert.deepEqual(lesFamillesSansTranscription(null), []);
});
