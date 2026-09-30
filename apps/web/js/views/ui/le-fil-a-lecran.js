/**
 * Un échange de mails, **lu pour de bon**.
 *
 * ## Pourquoi il remplace le Markdown
 *
 * Le fil était traduit en Markdown et rendu par le lecteur de documents. Le
 * choix se défendait — ne pas faire un second jeu de classes à recalibrer — et
 * il a tenu jusqu'à ce qu'on regarde un vrai fil de six messages :
 *
 *   * rien ne sépare deux messages : la signature de l'un touche l'en-tête du
 *     suivant, et l'on ne sait plus qui parle ;
 *   * **la signature prend plus de place que le propos** — quatre lignes de
 *     message, quinze de coordonnées, six fois de suite ;
 *   * « Pièces jointes : image001.png, image002.png, image003.png… » : onze
 *     noms, dont neuf sont des morceaux de logo.
 *
 * Aucun de ces trois défauts ne se répare en Markdown : il n'a ni caret, ni
 * pastille, ni repli. Ce module rend donc du HTML — et c'est le seul endroit
 * qui le fait, avec ses classes à lui, comme le lecteur de documents a les
 * siennes.
 *
 * ## Ce qu'on montre en premier
 *
 * Le propos. Tout le reste — coordonnées, bandeaux, destinataires en copie —
 * est là, replié, à un clic. Rien n'est retiré : ce qui est caché sous une
 * signature est parfois une contrainte de planning, et on l'a appris d'un cas
 * réel.
 *
 * ## L'escalier
 *
 * Chaque message est décalé d'un cran vers la droite, avec les barres des crans
 * précédents — comme l'indentation d'un bloc de code. On lit la conversation
 * qui s'enfonce, et l'on voit d'un coup d'œil à quelle profondeur on est.
 *
 * Le décalage est **plafonné** : au-delà de quatre crans, un fil de vingt
 * messages finirait au bord de l'écran, et l'escalier qui servait à se repérer
 * empêcherait de lire.
 *
 * ## Il est pur
 *
 * Des messages dépliés entrent, du HTML sort.
 */

import { escapeHtml } from "../../utils/escape-html.js";
import { svgIcon } from "../../ui/icons.js";
import { poidsDit } from "../../utils/poids-dit.js";
import { lidentiteLisible } from "../../services/une-adresse-lisible.js";
import { laSignatureDunMessage } from "../../services/la-signature-dun-message.js";
import { objetNu } from "../../services/un-mail-deplie.js";
import { lesPiecesQuiComptent, phraseDesPiecesCachees } from "../../services/les-pieces-qui-comptent.js";

const texte = (valeur) => String(valeur ?? "").trim();

/** Au-delà, l'escalier empêche de lire ce qu'il servait à situer. */
export const AU_PLUS_DE_CRANS = 4;

/** Une date de mail, écrite court — on en lit six d'affilée. */
export function leMomentCourt(quand) {
  const lu = Date.parse(texte(quand));
  if (!Number.isFinite(lu)) return "date non lue";
  return new Date(lu).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC"
  });
}

/**
 * L'objet, **seulement quand il change**.
 *
 * Le fil d'Ariane porte déjà celui de l'échange, au-dessus de l'écran. Le
 * redire à chaque message ferait six titres pour un seul sujet — et le jour où
 * quelqu'un change d'objet en cours de route, personne ne le verrait au milieu
 * des cinq autres.
 *
 * La comparaison porte sur l'objet **nu**, celui débarrassé de ses « RE: » et
 * « TR: » : une réponse n'a pas changé de sujet parce qu'elle a répondu.
 */
export function objetADire(lu = null, avant = null) {
  if (!avant) return "";

  // **L'objet nu se recalcule plutôt que de se croire donné.** Le champ existe
  // sur un message déplié, mais pas partout ; sans lui on comparait « TR: Bon
  // de commande » à « RE: Bon de commande » et l'on annonçait un changement de
  // sujet à chaque réponse — le banc l'a montré au premier essai.
  const nu = (un) => objetNu(texte(un?.objetNu) || texte(un?.objet));

  const sien = nu(lu);
  if (!sien) return "";
  return sien.toLowerCase() === nu(avant).toLowerCase() ? "" : texte(lu?.objet) || sien;
}

/** Une personne, telle qu'on l'écrit dans un en-tête. */
function laPersonne(qui) {
  const { nom, adresse } = lidentiteLisible(qui);
  const enBleu = adresse
    ? `<span class="fil-mail__adresse">${escapeHtml(adresse)}</span>`
    : "";
  if (nom && adresse) return `<span class="fil-mail__nom">${escapeHtml(nom)}</span>${enBleu}`;
  if (nom) return `<span class="fil-mail__nom">${escapeHtml(nom)}</span>`;
  return enBleu || `<span class="fil-mail__nom">expéditeur non lu</span>`;
}

/** Une liste de destinataires, repliée dès qu'elle est longue. */
function lesGens(gens = []) {
  return (Array.isArray(gens) ? gens : []).map(laPersonne).join(", ");
}

/**
 * Les pastilles des pièces jointes d'un message.
 *
 * **Celles qui comptent seulement.** Les morceaux de logo d'une signature sont
 * des pièces jointes pour le format, pas pour le lecteur : les nommer une à une
 * a fait onze pastilles dont neuf disent « image007.png ».
 */
function lesPastilles(pieces = []) {
  const { gardees, cachees } = lesPiecesQuiComptent(pieces);
  if (!gardees.length && !cachees.length) return "";

  // **Une pastille qui porte un identifiant s'ouvre.** Le fil est lu dans le
  // fichier : ses pièces sont des noms et des tailles. `lesPiecesAppariees` leur
  // rend la ligne que le dépôt a écrite, et sans elle la pastille ne prétend pas
  // s'ouvrir — montrer un plan sans pouvoir l'ouvrir est la pire façon de dire
  // qu'il existe, mais un faux bouton est pire encore.
  const dites = gardees.map((une) => {
    const dedans = `
      ${svgIcon("paperclip", { className: "octicon" })}
      <span class="fil-mail__piece-nom">${escapeHtml(une.nom)}</span>
      <span class="fil-mail__piece-poids mono-small">${escapeHtml(poidsDit(une.taille))}</span>`;
    const titre = escapeHtml(`${une.nom} — ${poidsDit(une.taille)}`);

    return texte(une.id)
      ? `<button type="button" class="fil-mail__piece fil-mail__piece--ouvrable"
           data-fil-piece="${escapeHtml(texte(une.id))}" title="${titre}">${dedans}</button>`
      : `<span class="fil-mail__piece" title="${titre}">${dedans}</span>`;
  }).join("");

  const reste = phraseDesPiecesCachees(cachees);
  return `<div class="fil-mail__pieces">${dites}${
    reste ? `<span class="fil-mail__piece fil-mail__piece--muette">${escapeHtml(reste)}</span>` : ""
  }</div>`;
}

/**
 * Un bloc repliable : un caret, un titre, et ce qu'il cache.
 *
 * `<details>` plutôt qu'un bouton et du JavaScript : il s'ouvre et se ferme
 * sans qu'on ait à s'en occuper, il s'imprime ouvert, et il reste utilisable au
 * clavier — trois choses qu'il aurait fallu réécrire.
 */
function repliable(titre, contenu, { classe = "" } = {}) {
  if (!texte(contenu)) return "";
  return `
    <details class="fil-mail__repli ${classe}">
      <summary class="fil-mail__repli-tete">
        ${svgIcon("chevron-right", { className: "octicon fil-mail__caret" })}
        <span>${escapeHtml(titre)}</span>
      </summary>
      <div class="fil-mail__repli-corps">${contenu}</div>
    </details>
  `;
}

/**
 * Un message du fil.
 *
 * @param {object} lu le message déplié
 * @param {{cran?: number, marque?: boolean}} ou
 */
export function unMessageALecran(lu = null, { cran = 0, marque = false, objetAvant = null } = {}) {
  const profondeur = Math.min(Math.max(0, Number(cran) || 0), AU_PLUS_DE_CRANS);

  // **Le propos, et non le corps.** Un `.msg` porte tout l'historique dans son
  // corps ; `leFilDesMails` en a déjà détaché les citations, qui sont devenues
  // des messages à part entière. Lire `corps` ici les afficherait une seconde
  // fois — c'est ce que l'écran faisait, et le même texte s'y voyait trois fois.
  const { propos, signature } = laSignatureDunMessage(
    texte(lu?.propos !== undefined ? lu.propos : lu?.corps)
  );

  // Ce que `ceQuonCite` avait déjà reconnu comme signature — le séparateur
  // normalisé — se replie avec celle qu'on vient de reconnaître à sa formule.
  const sienne = [texte(lu?.signature), texte(signature)].filter(Boolean).join("\n\n");

  const objet = objetADire(lu, objetAvant);
  const reconstitue = texte(lu?.certitude) === "cite";

  const a = lesGens(lu?.a);
  const copie = lesGens(lu?.copie);

  return `
    <article class="fil-mail${marque ? " est-demande" : ""}" data-cran="${profondeur}">
      ${Array.from({ length: profondeur }, () => `<span class="fil-mail__barre"></span>`).join("")}
      <div class="fil-mail__bloc">
        <header class="fil-mail__tete">
          <div class="fil-mail__qui">${laPersonne(lu?.qui)}</div>
          <time class="fil-mail__quand mono-small">${escapeHtml(
            leMomentCourt(lu?.quand) )}</time>
        </header>

        ${/*
          **Un message reconstitué d'une citation se dit.** Aucun fichier ne le
          porte : on l'a retrouvé dans le corps d'un autre. Ses pièces jointes
          ne sont donc pas là, et ses destinataires sont ceux que le bandeau
          nommait — le lecteur doit savoir qu'il lit une recopie.
        */""}
        ${reconstitue
          ? `<p class="fil-mail__recopie">${svgIcon("quote", { className: "octicon" })}
               Retrouvé dans la citation d'un autre message</p>`
          : ""}

        ${/*
          **L'objet ne se répète pas, il se signale quand il change.** Un fil
          porte le même objet du début à la fin ; le réécrire six fois ferait
          six titres pour un seul sujet. Mais quelqu'un qui le change en cours
          de route change de sujet, et c'est précisément ce qu'on veut voir.
        */""}
        ${objet
          ? `<p class="fil-mail__objet">${svgIcon("arrow-right", { className: "octicon" })}
               ${escapeHtml(objet)}</p>`
          : ""}

        ${/*
          **Les destinataires se lisent, ils ne se déplient pas.** Ils étaient
          derrière un caret, pour épargner des lignes. C'était se tromper sur ce
          qu'on lit dans un fil de chantier : savoir qui était en copie d'une
          demande décide de qui peut y répondre, et de qui ne pourra pas dire
          qu'il n'était pas au courant. Ce n'est pas un détail de mise en page.
        */""}
        ${a || copie ? `<div class="fil-mail__gens-bloc">
          ${a ? `<p class="fil-mail__gens"><span class="fil-mail__etiquette">À</span> ${a}</p>` : ""}
          ${copie ? `<p class="fil-mail__gens"><span class="fil-mail__etiquette">Copie</span> ${copie}</p>` : ""}
        </div>` : ""}

        ${lesPastilles(lu?.pieces)}

        ${/*
          **Un message sans corps se dit.** Une page blanche ne se distingue pas
          d'un lecteur en panne (règle 5).
        */""}
        <div class="fil-mail__propos">${
          texte(propos)
            ? escapeHtml(propos)
            : `<span class="fil-mail__vide">Ce message n'a pas de texte lisible.</span>`
        }</div>

        ${repliable("Signature", `<div class="fil-mail__signature-corps">${escapeHtml(sienne)}</div>`,
          { classe: "fil-mail__repli--signature" })}
      </div>
    </article>
  `;
}

/**
 * L'échange entier.
 *
 * @param {object[]} messages les messages dépliés, du plus ancien au plus récent
 * @param {{marque?: string}} ou l'identité du message qu'on a demandé à ouvrir
 */
export function leFilALecran(messages = [], { marque = "" } = {}) {
  const tous = Array.isArray(messages) ? messages : [];
  if (!tous.length) {
    return `<p class="fil-mail__vide">Rien à lire dans cet échange.</p>`;
  }

  const entete = tous.length > 1
    ? `<p class="fil__compte">${escapeHtml(
        `${tous.length} messages dans cet échange, du plus ancien au plus récent.`)}</p>`
    : "";

  return `
    <div class="fil">
      ${entete}
      ${tous.map((lu, rang) => unMessageALecran(lu, {
        cran: rang,
        marque: Boolean(marque) && texte(lu?.identite) === texte(marque),
        objetAvant: rang === 0 ? null : tous[rang - 1]
      })).join("")}
    </div>
  `;
}
