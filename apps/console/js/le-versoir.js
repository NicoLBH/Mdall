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
 * ## Rien ne part
 *
 * Les fichiers ne quittent pas le poste. Ils sont lus par le navigateur,
 * dépliés par `un-msg-deplie.js`, comptés par `linventaire-du-versoir.js`, et
 * oubliés dès qu'on ferme l'onglet. **Aucun dépôt, aucun appel, aucune
 * dépense.**
 *
 * Ce n'est pas une précaution de prudence : c'est l'ordre des opérations. On
 * regarde avant de verser, et ce qui se verse un jour se versera par une
 * proposition signée, comme tout le reste (règle 1).
 *
 * ## Il ne dessine que ce qu'il a lu
 *
 * Un message dont rien ne se lit se compte et se nomme, il ne disparaît pas de
 * la liste : une archive laissée derrière soi sans qu'on le sache est pire
 * qu'une archive qu'on sait avoir manquée (règle 5).
 */

import { unMsgDeplie } from "../partage/js/services/un-msg-deplie.js";
import {
  inventaireDunMessage, inventaireDuVersoir, phraseDeCeQuOnNeSaitPasRapprocher,
  phraseDeCeQuiSeRepete, phraseDuVersoir, poidsDit
} from "../partage/js/services/linventaire-du-versoir.js";
import {
  lesEmpreintes, marquerLesRepetitions
} from "../partage/js/services/le-dedoublonnage.js";
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
          sur votre poste, et dit ce qu'ils portent. <strong>Rien n'est envoyé,
          rien n'est versé.</strong>
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
    </div>
  `;
}

function renderUnePiece(piece) {
  return `<li class="forme-reference__ligne">
    <span class="forme-reference__quoi">${echapper(piece.nom || "(sans nom)")}</span>
    <span class="forme-reference__chiffres mono-small">${echapper(poidsDit(piece.taille))}</span>
    <span class="forme-reference__sur mono-small">${echapper(piece.type || "")}</span>
  </li>`;
}

/**
 * **Les images de signature se disent en une ligne, jamais une par une.**
 *
 * Sur le message réel qui a servi de référence, elles étaient huit, toutes
 * identiques à deux près, et elles remplissaient l'écran. On vient ici chercher
 * un plan : le faire chercher au milieu de huit logos, c'est rater la seule
 * chose que cet écran doit montrer. Elles sont gardées — on ne jette rien —,
 * elles ne sont simplement pas détaillées.
 */
function renderLesVignettes(un) {
  if (!un.vignettes.length) return "";
  return `<p class="forme-manques">${echapper(
    `${un.vignettes.length} ${un.vignettes.length > 1 ? "images" : "image"} de signature`
    + ` (${poidsDit(un.poidsDesVignettes)}) : gardées, mais ce ne sont pas des documents`
  )}</p>`;
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
      ${marquerLesRepetitions(messages).map(renderUnMessage).join("")}
    </section>
  `;
}

export function monterLeVersoir(hote) {
  const zone = hote.querySelector("#versoirZone");
  const champ = hote.querySelector("#versoirFichiers");
  const choisir = hote.querySelector("#versoirChoisir");
  const ou = hote.querySelector("#versoirInventaire");
  if (!zone || !champ || !ou) return;

  const lus = [];

  const lire = async (fichiers) => {
    for (const fichier of fichiers) {
      const octets = new Uint8Array(await fichier.arrayBuffer());
      const lu = unMsgDeplie(octets);
      // Les empreintes se calculent ici, une seule fois, sur les octets qu'on a
      // déjà en main : les recalculer à chaque affichage relirait cent
      // mégaoctets à chaque fichier déposé.
      lus.push(inventaireDunMessage(lu, fichier.name, await lesEmpreintes(lu)));
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
