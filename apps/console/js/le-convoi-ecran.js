/**
 * Le convoi, à l'écran : **déposer un dossier entier, ou une archive `.zip`**.
 *
 * ## Deux gestes, parce que ce sont deux besoins
 *
 * Le versoir sert à **regarder** : une poignée de messages, dépliés, comptés,
 * et l'on décide. Il garde leurs octets, et c'est très bien pour dix fichiers.
 *
 * Le convoi sert à **absorber** : mille quatre cents messages, qu'on ne
 * regardera pas un par un. Il lit un lot, le verse, **relâche ses octets**, et
 * passe au suivant. Ce qu'on regarde alors n'est plus la matière, c'est le
 * compte rendu — et il faut le dire plutôt que de faire semblant.
 *
 * ## Ce qui n'est pas gardé en mémoire
 *
 * Rien, au-delà du lot en cours. Ni les octets des fichiers, ni ceux des
 * pièces, ni les inventaires. Le journal ne garde que des nombres et **les
 * noms de ce qui a buté** — ce qui est passé se compte, ce qui a résisté se
 * nomme.
 *
 * ## Une archive `.zip` ne se décompresse pas d'un coup
 *
 * On lit son annuaire — quelques kilo-octets à la fin du fichier —, on sait
 * combien de messages elle porte, et l'on décompresse **un par un**, à mesure.
 * Décompresser deux gigaoctets d'un coup referait le mur qu'on vient d'abattre.
 *
 * Le fichier `.zip` lui-même reste en mémoire, lui : c'est un seul objet, et
 * l'annuaire ne se lit pas autrement.
 *
 * ## On s'arrête, on ne perd rien
 *
 * Un convoi interrompu — le bouton, un onglet fermé, une panne — ne fait rien
 * perdre : **ce qui est entré reste**, et le convoi suivant redemande à chaque
 * lot ce que ce lot-là contient déjà. On reprend en redéposant.
 */

import { unMsgDeplie } from "../partage/js/services/un-msg-deplie.js";
import { lesEmpreintes } from "../partage/js/services/le-dedoublonnage.js";
import { verserLesPieces } from "../partage/js/services/larchive-des-pieces-supabase.js";
import { verserLesMessages } from "../partage/js/services/larchive-des-messages-supabase.js";
import { empreinteDunMessage } from "../partage/js/services/le-dedoublonnage.js";
import { sha256Hex, sha256HexBytes } from "../partage/js/utils/sha256.js";
import {
  MOTS_DU_SORT, SORT, avancement, enLots, lesMessagesDuDepot, noter, noterLesPieces,
  phraseDuConvoi, unJournalNeuf
} from "../partage/js/services/le-convoi.js";
import {
  lesMessagesDeLarchive, lireLannuaire, octetsDeLentree
} from "../partage/js/services/un-zip-deplie.js";

const echapper = (valeur) => String(valeur ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

export function renderLeConvoi() {
  return `
    <section class="conso-usages">
      <h3 class="conso-usages__titre">Le convoi</h3>
      <p class="conso-usages__mot">
        Pour une archive entière : un dossier, ou un <code>.zip</code>. Les
        messages sont lus, versés et <strong>oubliés</strong> par lots — la
        mémoire ne grossit pas, et l'on peut déposer cent chantiers.
      </p>
      <p class="conso-usages__mot">
        <button type="button" class="gh-btn gh-btn--sm gh-btn--default" id="convoiDossier">
          Déposer un dossier
        </button>
        <button type="button" class="gh-btn gh-btn--sm gh-btn--default" id="convoiZip">
          Déposer un <code>.zip</code>
        </button>
        <button type="button" class="gh-btn gh-btn--sm gh-btn--danger" id="convoiArret" hidden>
          Arrêter
        </button>
      </p>
      <input type="file" id="convoiFichiers" webkitdirectory directory multiple hidden />
      <input type="file" id="convoiArchive" accept=".zip" hidden />
      <div id="convoiJournal"></div>
    </section>
  `;
}

/**
 * Le journal, dessiné.
 *
 * **Les accrocs d'abord**, sous le compte : c'est ce qu'on est venu chercher
 * quand on relit un convoi de six heures.
 */
function renderLeJournal(journal) {
  const part = avancement(journal);

  return `
    <p class="conso-usages__mot">${echapper(phraseDuConvoi(journal))}${
      part === null ? "" : ` · ${Math.round(part * 100)} %`
    }${journal.arrete ? " · arrêté" : ""}${
      journal.fini && !journal.arrete ? " · terminé" : ""}</p>
    ${journal.ecartes
      ? `<p class="conso-usages__mot">${echapper(journal.ecartes > 1
          ? `${journal.ecartes} fichiers n'étaient pas des messages, et ne sont pas comptés`
          : "1 fichier n'était pas un message, et n'est pas compté")}</p>`
      : ""}
    ${journal.accrocs.length
      ? `<ul class="forme-reference">${journal.accrocs.map((un) => `
          <li class="forme-reference__ligne">
            <span class="forme-reference__quoi">${echapper(un.fichier)}</span>
            <span class="forme-reference__chiffres mono-small">${
              echapper(MOTS_DU_SORT[un.sort] ?? un.sort)}</span>
            <span class="forme-reference__sur mono-small">${echapper(un.detail)}</span>
          </li>`).join("")}</ul>`
      : ""}
  `;
}

/**
 * Lire un message, le verser, et **ne rien garder**.
 *
 * L'ordre est celui du versoir — les pièces avant les messages —, pour la même
 * raison : un lien n'a de sens que si ses deux bouts existent.
 */
async function absorber(nom, octets, journal) {
  const lu = unMsgDeplie(octets);
  if (lu.trous.some((un) => un.quoi === "pas-un-msg")) {
    return noter(journal, nom, SORT.ILLISIBLE, "ce n'est pas un message Outlook");
  }

  const empreintes = await lesEmpreintes(lu);
  const pieces = (lu.pieces ?? []).map((une, rang) => ({
    empreinte: empreintes.pieces[rang] ?? "",
    octets: une.octets, nom: une.nom, type: une.type,
    taille: une.taille, dansLeTexte: une.dansLeTexte
  }));

  const desPieces = await verserLesPieces(pieces);
  if (!desPieces.lu) return noter(journal, nom, SORT.REFUSE, "l'archive n'a pas répondu");

  const desMessages = await verserLesMessages([{
    empreinte: await sha256Hex(empreinteDunMessage(lu)) ?? "",
    octetsEmpreinte: await sha256HexBytes(octets) ?? "",
    octetsDuFichier: octets,
    fichier: nom,
    lu,
    pieces
  }]);
  if (!desMessages.lu) return noter(journal, nom, SORT.REFUSE, "l'archive n'a pas répondu");
  if (desMessages.refuses) return noter(journal, nom, SORT.REFUSE, "le registre a refusé");

  const suite = noterLesPieces(journal, desPieces);
  return noter(suite, nom, desMessages.dejaLa ? SORT.DEJA_LA : SORT.VERSE);
}

export function monterLeConvoi(hote) {
  const dossier = hote.querySelector("#convoiDossier");
  const zip = hote.querySelector("#convoiZip");
  const arret = hote.querySelector("#convoiArret");
  const champDossier = hote.querySelector("#convoiFichiers");
  const champArchive = hote.querySelector("#convoiArchive");
  const ou = hote.querySelector("#convoiJournal");
  if (!dossier || !zip || !ou) return;

  let journal = unJournalNeuf();
  let onArrete = false;
  let enRoute = false;

  const montrer = () => { ou.innerHTML = renderLeJournal(journal); };

  const commencer = (combien, ecartes) => {
    journal = { ...unJournalNeuf(), fichiers: combien, ecartes };
    onArrete = false;
    enRoute = true;
    arret.hidden = false;
    montrer();
  };

  const finir = () => {
    journal = { ...journal, fini: true, arrete: onArrete };
    enRoute = false;
    arret.hidden = true;
    montrer();
  };

  /**
   * Mener un convoi.
   *
   * `ouvrir` rend les octets d'une entrée, ou `null` : c'est tout ce qui
   * distingue un dossier d'une archive `.zip`, et c'est pour cela que la suite
   * ne sait pas laquelle des deux elle traite.
   */
  const mener = async (entrees, { nomDe, ouvrir }) => {
    for (const lot of enLots(entrees)) {
      if (onArrete) break;
      for (const une of lot) {
        if (onArrete) break;
        const nom = nomDe(une);
        const octets = await ouvrir(une);
        journal = octets
          ? await absorber(nom, octets, journal)
          : noter(journal, nom, SORT.ILLISIBLE, "ces octets ne se sont pas laissé lire");
      }
      // Le lot est fini : ce qu'il tenait n'est plus tenu par personne. Rendre
      // la main au navigateur lui laisse le ramasser.
      montrer();
      await new Promise((suivre) => setTimeout(suivre, 0));
    }
    finir();
  };

  dossier.addEventListener("click", () => { if (!enRoute) champDossier.click(); });
  zip.addEventListener("click", () => { if (!enRoute) champArchive.click(); });
  arret.addEventListener("click", () => { onArrete = true; });

  champDossier.addEventListener("change", async () => {
    const { messages, ecartes } = lesMessagesDuDepot([...champDossier.files]);
    champDossier.value = "";
    commencer(messages.length, ecartes);
    await mener(messages, {
      // Le chemin dans le dossier dit souvent le chantier, là où le nom du
      // fichier ne dit que le sujet.
      nomDe: (un) => un.webkitRelativePath || un.name,
      ouvrir: async (un) => new Uint8Array(await un.arrayBuffer())
    });
  });

  champArchive.addEventListener("change", async () => {
    const fichier = champArchive.files?.[0];
    champArchive.value = "";
    if (!fichier) return;

    const octets = new Uint8Array(await fichier.arrayBuffer());
    const lu = lireLannuaire(octets);
    if (!lu.ok) {
      journal = { ...unJournalNeuf(), fichiers: 1, fini: true };
      journal = noter(journal, fichier.name, SORT.ILLISIBLE, lu.motif);
      montrer();
      return;
    }

    const messages = lesMessagesDeLarchive(lu.entrees);
    commencer(messages.length, lu.entrees.length - messages.length);
    await mener(messages, {
      nomDe: (une) => une.nom,
      ouvrir: (une) => octetsDeLentree(octets, une)
    });
  });
}
