/**
 * **Le dépouillement s'exécute enfin.**
 *
 * Il ne l'avait jamais fait : le module qu'il importait ouvre une session
 * Supabase au chargement, donc rien ne pouvait l'appeler hors d'un navigateur.
 * Tout ce qu'on en savait, on le savait en le lisant — et c'est sous cette forme
 * que le dépôt a passé plusieurs tours à ne pas marcher.
 *
 * Il reçoit maintenant ses accès par `portes`. Le banc en pose de fausses qui
 * tiennent un projet en mémoire, et le parcours entier tourne : les dossiers
 * creusés, les pièces avant les messages, le dédoublonnage, la provenance.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { verser } from "./le-versement-en-ordre.js";

const MOI = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/** Un mail, tel qu'Outlook l'exporte en `.eml`. */
function unMail({ de = "ourdine.ferrand@exemple.example", objet = "Lot 3", piece = null } = {}) {
  if (!piece) {
    return [
      `From: ${de}`, "To: maitrise@exemple.example", `Subject: ${objet}`,
      "Date: Mon, 12 Jan 2026 09:14:00 +0100", `Message-ID: <${objet.replace(/\W/g, "")}@exemple.example>`,
      "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "",
      "Bonjour, le point sur le lot 3.", ""
    ].join("\r\n");
  }
  const limite = "----limite";
  return [
    `From: ${de}`, "To: maitrise@exemple.example", `Subject: ${objet}`,
    "Date: Mon, 12 Jan 2026 09:14:00 +0100", `Message-ID: <${objet.replace(/\W/g, "")}@exemple.example>`,
    "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary="${limite}"`, "",
    `--${limite}`, "Content-Type: text/plain; charset=utf-8", "", "Voir le plan ci-joint.", "",
    `--${limite}`, `Content-Type: application/pdf; name="${piece}"`,
    "Content-Transfer-Encoding: base64", `Content-Disposition: attachment; filename="${piece}"`, "",
    Buffer.from(`plan ${piece}`).toString("base64"), "",
    `--${limite}--`, ""
  ].join("\r\n");
}

const unFichier = (nom, contenu) =>
  new File([new TextEncoder().encode(contenu)], nom, { type: "message/rfc822" });

/**
 * Un projet en mémoire, avec ses dossiers et ses documents.
 *
 * Il refuse comme la base refuse : un nom en double dans un même dossier, et
 * une empreinte déjà connue.
 */
function unProjetDeBanc() {
  const etat = { dossiers: [], documents: [], provenances: [], rangements: 0 };
  let compteur = 0;

  const portes = {
    listerLesEnfants: async (_projet, parent) =>
      etat.dossiers.filter((un) => (un.parent_folder_id ?? null) === (parent ?? null)),

    creerLeDossier: async (projet, parent, nom) => {
      const jumeau = etat.dossiers.find((un) =>
        (un.parent_folder_id ?? null) === (parent ?? null)
        && un.name.toLocaleLowerCase("fr-FR") === nom.toLocaleLowerCase("fr-FR"));
      if (jumeau) throw new Error("duplicate key");
      compteur += 1;
      const dossier = { id: `dossier-${compteur}`, project_id: projet, parent_folder_id: parent ?? null, name: nom, prive: true };
      etat.dossiers.push(dossier);
      return dossier;
    },

    lesNomsDejaLa: async (_projet, folderId) =>
      etat.documents.filter((un) => un.folder_id === folderId).map((un) => un.filename),

    lesOctetsConnus: async (_projet, empreintes) => {
      const connues = new Set(etat.documents.map((un) => un.empreinte).filter(Boolean));
      return new Set(empreintes.filter((une) => connues.has(une)));
    },

    ranger: async (octets, ou) => {
      etat.rangements += 1;
      compteur += 1;
      const ligne = {
        id: `doc-${compteur}`, folder_id: ou.folderId, filename: ou.nom,
        document_kind: ou.nature, empreinte: ou.empreinte, deposant: ou.deposant,
        taille: octets?.length ?? 0, index: ou.index ?? null,
        piece_dans_le_texte: ou.dansLeTexte
      };
      etat.documents.push(ligne);
      return ligne;
    },

    marquerLaProvenance: async (messageId, piecesIds) => {
      etat.provenances.push({ messageId, piecesIds: [...piecesIds] });
    }
  };

  return { etat, portes };
}

test("un dépôt de deux mails crée les dossiers et range les messages", async () => {
  const { etat, portes } = unProjetDeBanc();
  const journal = await verser(
    [unFichier("un.eml", unMail({ objet: "Lot 3" })),
     unFichier("deux.eml", unMail({ objet: "CVC", de: "contact@novaclim.example" }))],
    { projectId: "projet-1", deposant: MOI, portes }
  );

  assert.equal(journal.arrete, false, `le dépôt s'est arrêté : ${journal.arrete}`);
  assert.equal(journal.fini, true);
  assert.equal(journal.verses, 2);
  assert.deepEqual(etat.dossiers.map((un) => un.name), ["Mails", "Pièces jointes"]);
  // Les deux dossiers sont privés à chaque étage : un sous-dossier ordinaire
  // dans un dossier privé serait visible de l'équipe, et ses documents avec lui.
  assert.equal(etat.dossiers.every((un) => un.prive === true), true);
});

test("le déposant est écrit sur chaque document", async () => {
  // La politique de lecture cache un document quand son dossier est privé *et*
  // que son déposant n'est pas vide. Un déposant absent publierait la
  // correspondance, en silence, et le dépôt se dirait réussi.
  const { etat, portes } = unProjetDeBanc();
  await verser([unFichier("un.eml", unMail())], { projectId: "projet-1", deposant: MOI, portes });
  assert.equal(etat.documents.length, 1);
  assert.equal(etat.documents[0].deposant, MOI);
});

test("sans déposant connu, rien n'est rangé", async () => {
  const { etat, portes } = unProjetDeBanc();
  const journal = await verser([unFichier("un.eml", unMail())], { projectId: "projet-1", portes });
  assert.match(journal.arrete, /déposant/);
  assert.equal(etat.rangements, 0, "des mails sont partis sans déposant");
});

test("sans portes, rien n'est rangé non plus", async () => {
  const journal = await verser([unFichier("un.eml", unMail())], { projectId: "projet-1", deposant: MOI });
  assert.match(journal.arrete, /accès/);
});

test("l'index du mail est écrit au dépôt, expéditeur et objet compris", async () => {
  const { etat, portes } = unProjetDeBanc();
  await verser([unFichier("un.eml", unMail({ objet: "Reprise des gaines" }))],
    { projectId: "projet-1", deposant: MOI, portes });

  const index = etat.documents[0].index;
  assert.match(index.mail_de, /ourdine\.ferrand@exemple\.example/);
  assert.equal(index.mail_objet, "Reprise des gaines");
  assert.ok(index.mail_quand, "la date du mail n'est pas écrite");
});

test("les pièces jointes partent avant leur message, et leur provenance est marquée", async () => {
  const { etat, portes } = unProjetDeBanc();
  const journal = await verser([unFichier("un.eml", unMail({ piece: "plan-rdc.pdf" }))],
    { projectId: "projet-1", deposant: MOI, portes });

  assert.equal(journal.pieces, 1);
  const pieces = etat.documents.filter((un) => un.folder_id === "dossier-2");
  const messages = etat.documents.filter((un) => un.folder_id === "dossier-1");
  assert.equal(pieces.length, 1);
  assert.equal(messages.length, 1);

  // **L'ordre compte.** Une panne entre les deux laisse des pièces sans
  // message, qui se retrouvent par leur empreinte ; dans l'autre ordre, elle
  // laisserait un message reconnu « déjà là » dont les pièces ne seraient
  // jamais redemandées.
  assert.ok(
    etat.documents.indexOf(pieces[0]) < etat.documents.indexOf(messages[0]),
    "le message est parti avant sa pièce"
  );
  assert.deepEqual(etat.provenances, [{ messageId: messages[0].id, piecesIds: [pieces[0].id] }]);
});

test("un mail déjà versé ne repart pas", async () => {
  const { etat, portes } = unProjetDeBanc();
  const mail = unMail({ objet: "Lot 3" });

  const premier = await verser([unFichier("un.eml", mail)], { projectId: "projet-1", deposant: MOI, portes });
  assert.equal(premier.verses, 1);

  const second = await verser([unFichier("un.eml", mail)], { projectId: "projet-1", deposant: MOI, portes });
  assert.equal(second.verses, 0);
  assert.equal(second.dejaLa, 1);
  assert.equal(etat.documents.length, 1, "le même mail a été rangé deux fois");
});

test("un fichier qui n'est pas un porteur de mails est ignoré, pas refusé", async () => {
  const { etat, portes } = unProjetDeBanc();
  const journal = await verser(
    [new File(["%PDF-1.4"], "rapport.pdf", { type: "application/pdf" })],
    { projectId: "projet-1", deposant: MOI, portes }
  );
  // Il suit le chemin habituel du dépôt, sans rien savoir de celui-ci.
  assert.equal(journal.fichiers, 0);
  assert.equal(etat.rangements, 0);
});

test("une base qui ne répond pas n'entraîne pas un dépôt en double", async () => {
  // Ne pas savoir n'est pas savoir que non : rendre un ensemble vide ferait
  // tout redéposer (règle 5).
  const { etat, portes } = unProjetDeBanc();
  const journal = await verser([unFichier("un.eml", unMail())], {
    projectId: "projet-1", deposant: MOI,
    portes: { ...portes, lesOctetsConnus: async () => null }
  });
  assert.match(journal.arrete, /la base n'a pas répondu/);
  assert.equal(etat.rangements, 0);
});

test("un dossier qu'on ne peut pas créer arrête le dépôt en le disant", async () => {
  const { etat, portes } = unProjetDeBanc();
  const journal = await verser([unFichier("un.eml", unMail())], {
    projectId: "projet-1", deposant: MOI,
    portes: {
      ...portes,
      creerLeDossier: async () => {
        throw new Error('{"code":"42501","message":"new row violates row-level security policy"}');
      }
    }
  });
  assert.match(journal.arrete, /votre session/);
  assert.doesNotMatch(journal.arrete, /42501/);
  assert.equal(etat.rangements, 0);
});

test("l'avancement est dit fichier par fichier, et il finit à tout", async () => {
  const vus = [];
  const { portes } = unProjetDeBanc();
  const journal = await verser(
    [unFichier("un.eml", unMail({ objet: "A" })), unFichier("deux.eml", unMail({ objet: "B" }))],
    { projectId: "projet-1", deposant: MOI, portes, avance: (en) => vus.push(en.lus) }
  );
  assert.ok(vus.length >= 2, "l'avancement ne s'est pas dit");
  assert.equal(journal.lus, 2);
  assert.equal(journal.fichiers, 2);
});
