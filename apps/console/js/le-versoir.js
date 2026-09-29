/**
 * Le versoir : **on dépose une archive, on voit ce qu'elle porte**.
 *
 * ## Le premier écran de la console, et pourquoi celui-là
 *
 * Pas un tableau de bord. Les comptes d'exploitation — combien de comptes,
 * quel taux de rebond, où en est la prédiction — se feront quand il y aura des
 * comptes à faire. Ce qui presse aujourd'hui, c'est de pouvoir ouvrir cent
 * archives de chantier et savoir ce qu'elles contiennent
 * (`docs/nourrir-mdall.md`).
 *
 * ## Deux gestes, et ils ne servent pas à la même chose
 *
 * **Regarder** : une poignée de messages, dépliés, comptés, et l'on décide.
 * C'est ce que fait cet écran, et il garde leurs octets pour pouvoir les
 * montrer.
 *
 * **Absorber** : une archive entière, qu'on ne regardera pas message par
 * message. C'est le convoi (`le-convoi-ecran.js`), qui lit par lots et relâche
 * à mesure.
 *
 * ## Rien ne part sans qu'on le demande
 *
 * Lire, déplier et compter se font **entièrement sur le poste** : aucun appel,
 * aucune dépense. C'est l'ordre des opérations — on regarde cent archives
 * avant de décider ce qu'on en garde.
 *
 * Verser est **un geste à part, et explicite** : un bouton, une fois qu'on a
 * vu. Verser au fil du dépôt aurait été plus court d'un clic, et faux : toutes
 * les archives qu'on ouvre ne méritent pas d'être gardées.
 *
 * Ce qui part, c'est **le message et ses pièces** : le fichier d'origine, la
 * forme qu'on en a lue, les octets des pièces, et le lien entre les deux. Un
 * plan sans son message n'a pas de provenance, et la provenance est ce qu'on ne
 * reconstitue pas après coup (`services/larchive-des-messages.js`).
 *
 * Et cela ne va pas dans la mémoire d'un chantier : l'archive ne connaît aucun
 * projet. Ce qui entre un jour dans la mémoire y entrera par une proposition
 * signée, comme tout le reste (règle 1).
 *
 * ## Il ne dessine que ce qu'il a lu
 *
 * Un message dont rien ne se lit se compte et se nomme, il ne disparaît pas de
 * la liste : une archive laissée derrière soi sans qu'on le sache est pire
 * qu'une archive qu'on sait avoir manquée (règle 5).
 */

import { monterLeConvoi, renderLeConvoi } from "./le-convoi-ecran.js";
import { unMsgDeplie } from "../partage/js/services/un-msg-deplie.js";
import {
  inventaireDunMessage, inventaireDuVersoir, phraseDeCeQuOnNeSaitPasRapprocher,
  phraseDeCeQuiSeRepete, phraseDesImagesDeSignature, phraseDuVersoir, poidsDit
} from "../partage/js/services/linventaire-du-versoir.js";
import {
  lesEmpreintes, marquerLesRepetitions
} from "../partage/js/services/le-dedoublonnage.js";
import { phraseDuVersement } from "../partage/js/services/larchive-des-pieces.js";
import { verserLesPieces } from "../partage/js/services/larchive-des-pieces-supabase.js";
import { phraseDuVersementDesMessages } from "../partage/js/services/larchive-des-messages.js";
import { verserLesMessages } from "../partage/js/services/larchive-des-messages-supabase.js";
import { empreinteDunMessage } from "../partage/js/services/le-dedoublonnage.js";
import { sha256Hex, sha256HexBytes } from "../partage/js/utils/sha256.js";
import { phraseDuTrou } from "../partage/js/services/trous-dun-mail.js";

const echapper = (valeur) => String(valeur ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/** Le jour d'un instant, écrit en français : c'est la maille d'une archive. */
function leJour(quand) {
  const lu = Date.parse(String(quand ?? ""));
  if (!Number.isFinite(lu)) return "";
  return new Date(lu).toLocaleDateString("fr-FR",
    { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Un compte, avec ses milliers séparés : « 24 457 » se lit, « 24457 » non. */
const compteDit = (combien) => Number(combien).toLocaleString("fr-FR");

export function renderLeVersoir() {
  return `
    <div class="page-large">
      <section class="conso-usages">
        <h3 class="conso-usages__titre">Le versoir</h3>
        <p class="conso-usages__mot">
          Déposez des messages Outlook (<code>.msg</code>) : Mdall les ouvre ici,
          sur votre poste, et dit ce qu'ils portent. <strong>Rien ne part tant
          que vous ne l'avez pas demandé.</strong>
        </p>

        <div class="documents-dropzone" id="versoirZone">
          <div class="documents-dropzone__inner">
            <h3>Glissez vos <code>.msg</code> ici</h3>
            <p>
              ou <button type="button" class="documents-dropzone__link" id="versoirChoisir">choisissez des fichiers</button>
            </p>
          </div>
        </div>
        <input type="file" id="versoirFichiers" accept=".msg" multiple hidden />

        <div id="versoirInventaire"></div>
      </section>

      ${/*
        **Le convoi est à part, et c'est un autre geste.** Le versoir garde les
        octets de ce qu'on lui donne pour pouvoir le montrer ; à mille quatre
        cents messages c'est l'onglet qui meurt. Mélanger les deux dans une
        seule zone ferait choisir le mauvais mode sans le savoir.
      */""}
      ${renderLeConvoi()}
    </div>
  `;
}

/**
 * Le geste qui verse, et il est **explicite**.
 *
 * Verser au fil du dépôt aurait été plus court d'un clic, et faux : on ouvre
 * cent archives pour regarder ce qu'elles portent, et toutes ne méritent pas
 * d'être gardées. Ce qui part du poste part parce qu'on l'a demandé.
 *
 * Le bouton n'apparaît que s'il y a des documents : un bouton qui ne fait rien
 * apprend à ne plus lire les boutons.
 */
function renderLeGesteDeVerser(inventaire) {
  // **Un message sans pièce se verse aussi** : c'est le propos qui fait
  // l'épisode, pas les plans. Le bouton n'apparaît que s'il y a quelque chose,
  // et un message déposé est déjà quelque chose.
  if (!inventaire.messages) return "";

  return `
    <p class="conso-usages__mot">
      <button type="button" class="gh-btn gh-btn--sm gh-btn--primary" id="versoirVerser">
        Verser dans l'archive
      </button>
      <span class="forme-reference__sur mono-small" id="versoirBilan"></span>
    </p>
  `;
}

function renderUnePiece(piece) {
  return `<li class="forme-reference__ligne">
    <span class="forme-reference__quoi">${echapper(piece.nom || "(sans nom)")}</span>
    <span class="forme-reference__chiffres mono-small">${echapper(poidsDit(piece.taille))}</span>
    <span class="forme-reference__sur mono-small">${echapper(piece.type || "")}</span>
  </li>`;
}

/** Les images de signature, en une ligne. La phrase vit dans le service. */
function renderLesVignettes(un) {
  const dite = phraseDesImagesDeSignature(un.vignettes.length, un.poidsDesVignettes);
  return dite ? `<p class="forme-manques">${echapper(dite)}</p>` : "";
}

/**
 * **Un message déjà vu ne se redessine pas.**
 *
 * Il tient sur une ligne, avec le nom du fichier qui l'a apporté : on garde de
 * quoi y revenir, et on ne fait pas relire un plan qu'on vient de lire. Dire
 * « 1 message déjà vu » en haut et le dessiner deux fois en dessous ferait lire
 * deux plans là où il y en a un.
 *
 * Il n'est pas supprimé : rien n'est jeté ici, c'est le principe de cet écran.
 */
function renderUnMessageDejaVu(un) {
  return `<p class="forme-manques">${echapper(
    `${un.objet || un.fichier || "(sans objet)"} — déjà vu`
    + (un.fichier && un.objet ? ` (${un.fichier})` : "")
  )}</p>`;
}

function renderUnMessage(un) {
  if (un.dejaVu) return renderUnMessageDejaVu(un);

  return `
    <div class="forme-suite">
      <h4 class="forme-suite__titre">${echapper(un.objet || un.fichier || "(sans objet)")}</h4>
      <p class="forme-suite__dit">
        ${echapper([
          un.qui,
          leJour(un.quand),
          `${un.combienDeDestinataires} ${un.combienDeDestinataires > 1 ? "destinataires" : "destinataire"}`,
          `${compteDit(un.signesDuCorps)} signes`
        ].filter(Boolean).join(" · "))}
      </p>
      ${un.documents.length
        ? `<ul class="forme-reference">${un.documents.map(renderUnePiece).join("")}</ul>`
        : `<p class="conso-usages__mot">Aucun document joint.</p>`}
      ${renderLesVignettes(un)}
      ${un.trous.length
        ? `<p class="forme-manques">${echapper(un.trous.map(phraseDuTrou).join(" · "))}</p>`
        : ""}
    </div>
  `;
}

function renderLInventaire(messages) {
  if (!messages.length) return "";

  const inventaire = inventaireDuVersoir(messages);
  const depuis = leJour(inventaire.depuis);
  const jusqua = leJour(inventaire.jusqua);

  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Ce que vous avez déposé</h3>
      <p class="conso-usages__mot">${echapper(phraseDuVersoir(inventaire))}</p>
      ${depuis && jusqua
        ? `<p class="conso-usages__mot">${depuis === jusqua
            ? `Le ${echapper(depuis)}.`
            : `Du ${echapper(depuis)} au ${echapper(jusqua)}.`}</p>`
        : ""}
      ${/*
        **Ce qui se répète, tout en haut.** Sur cent historiques de chantier,
        c'est le premier chiffre à connaître : le volume réel est une fraction
        du volume apparent, et tout ce qui se répète est ce qu'on ne paiera
        nulle part ensuite.
      */""}
      ${phraseDeCeQuiSeRepete(inventaire)
        ? `<p class="conso-usages__mot">${echapper(phraseDeCeQuiSeRepete(inventaire))}</p>`
        : ""}
      ${phraseDeCeQuOnNeSaitPasRapprocher(inventaire)
        ? `<p class="forme-manques">${echapper(phraseDeCeQuOnNeSaitPasRapprocher(inventaire))}</p>`
        : ""}
      ${inventaire.sansDate
        ? `<p class="forme-manques">${echapper(
            `${inventaire.sansDate} ${inventaire.sansDate > 1 ? "messages ne portent" : "message ne porte"} pas de date lisible`
          )}</p>`
        : ""}
      ${renderLeGesteDeVerser(inventaire)}
      ${marquerLesRepetitions(messages).map(renderUnMessage).join("")}
    </section>
  `;
}

export function monterLeVersoir(hote) {
  monterLeConvoi(hote);

  const zone = hote.querySelector("#versoirZone");
  const champ = hote.querySelector("#versoirFichiers");
  const choisir = hote.querySelector("#versoirChoisir");
  const ou = hote.querySelector("#versoirInventaire");
  if (!zone || !champ || !ou) return;

  const lus = [];
  // La matière, gardée à part de l'inventaire : celui-ci ne porte que des
  // nombres, et le versement a besoin des octets.
  const pieces = [];
  const messages = [];

  const lire = async (fichiers) => {
    for (const fichier of fichiers) {
      const octets = new Uint8Array(await fichier.arrayBuffer());
      const lu = unMsgDeplie(octets);
      // Les empreintes se calculent ici, une seule fois, sur les octets qu'on a
      // déjà en main : les recalculer à chaque affichage relirait cent
      // mégaoctets à chaque fichier déposé.
      const empreintes = await lesEmpreintes(lu);
      lus.push(inventaireDunMessage(lu, fichier.name, empreintes));

      const siennes = (lu.pieces ?? []).map((une, rang) => ({
        empreinte: empreintes.pieces[rang] ?? "",
        octets: une.octets,
        nom: une.nom,
        type: une.type,
        taille: une.taille,
        dansLeTexte: une.dansLeTexte
      }));
      pieces.push(...siennes);

      messages.push({
        // **Deux empreintes, et ce ne sont pas deux noms d'une chose.** Celle du
        // message dit que deux dépôts parlent du même échange ; celle de ses
        // octets dit où le fichier est rangé. Deux exports du même message
        // donnent deux fichiers et un seul message.
        empreinte: await sha256Hex(empreinteDunMessage(lu)) ?? "",
        octetsEmpreinte: await sha256HexBytes(octets) ?? "",
        octetsDuFichier: octets,
        fichier: fichier.name,
        lu,
        pieces: siennes
      });
    }
    // **Dans l'ordre du temps**, et non dans celui où l'explorateur les a
    // rendus : une archive se relit comme une chronologie.
    lus.sort((gauche, droite) =>
      String(gauche.quand).localeCompare(String(droite.quand)));
    ou.innerHTML = renderLInventaire(lus);
  };

  choisir?.addEventListener("click", () => champ.click());
  champ.addEventListener("change", () => {
    lire([...champ.files]);
    champ.value = "";
  });

  /**
   * Verser, sur demande.
   *
   * Le bouton se désarme pendant le versement : cinq mégaoctets par plan, et
   * un second clic relancerait tout depuis le début.
   */
  ou.addEventListener("click", async (evenement) => {
    const bouton = evenement.target.closest?.("#versoirVerser");
    if (!bouton) return;

    const bilan = ou.querySelector("#versoirBilan");
    bouton.disabled = true;
    if (bilan) bilan.textContent = "versement…";

    // **Les pièces d'abord, les messages ensuite.** Un lien n'a de sens que si
    // ses deux bouts existent : versés dans l'autre ordre, les premiers liens
    // pointeraient vers des pièces absentes.
    const desPieces = await verserLesPieces(pieces);
    const desMessages = desPieces.lu
      ? await verserLesMessages(messages)
      : { lu: false };
    bouton.disabled = false;
    if (!bilan) return;

    // **Une archive qu'on n'a pas pu lire ne se dit pas « rien à verser ».**
    // Sans savoir ce qui est déjà là, on ne verse pas — et l'on explique.
    if (!desPieces.lu || !desMessages.lu) {
      bilan.textContent = "l'archive n'a pas répondu : rien n'a été versé";
      return;
    }

    const dit = [phraseDuVersementDesMessages(desMessages), phraseDuVersement(desPieces)]
      .filter(Boolean).join(" · ");
    bilan.textContent = dit || "tout était déjà là";
  });

  for (const quoi of ["dragenter", "dragover"]) {
    zone.addEventListener(quoi, (evenement) => {
      evenement.preventDefault();
      zone.classList.add("is-dragover");
    });
  }
  for (const quoi of ["dragleave", "drop"]) {
    zone.addEventListener(quoi, () => zone.classList.remove("is-dragover"));
  }
  zone.addEventListener("drop", (evenement) => {
    evenement.preventDefault();
    lire([...(evenement.dataTransfer?.files ?? [])]);
  });
}
