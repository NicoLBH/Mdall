/**
 * Retirer d'un message ce que son auteur n'a pas écrit.
 *
 * ## Ce qu'un fil réel a montré
 *
 * Sur un échange de six messages entre un bureau d'études et un bureau de
 * contrôle, **41 % du texte envoyé au modèle n'avait pas été écrit par
 * quelqu'un** : des adresses de redirection de 587 caractères en médiane, des
 * identifiants d'images en ligne, un bandeau de sécurité recopié trois fois.
 *
 * Et le prix ne s'est pas payé qu'en jetons. Les deux messages les plus
 * bruités — 33 % et 42 % de texte utile — sont **les deux seuls dont le modèle
 * n'a rien tiré**, alors qu'ils portaient la position de départ du bureau
 * d'études et son désaccord explicite. Le message le plus propre, 87 % utile, a
 * produit à lui seul plus de la moitié du relevé. Le bruit ne coûte pas : il
 * aveugle.
 *
 * ## On ne coupe pas, on déplie
 *
 * C'est l'arbitrage de l'étape 2, tenu ici aussi : **couper trop perd du
 * propos**. On aurait pu retirer la signature entière, à partir de la formule
 * de politesse. On ne le fait pas, et pour une raison qu'un cas réel a donnée :
 * sous la signature de ce fil se trouvait « je serai en congés du 27/07 au
 * 06/09 », qui est une contrainte de planning — exactement ce qu'on cherche à
 * relever.
 *
 * Ce module ne retire donc que ce qui, **ligne à ligne**, ne peut pas être du
 * propos :
 *
 * - une adresse de redirection se **déplie** vers sa cible : rien n'est perdu,
 *   et six cents caractères deviennent soixante ;
 * - la **queue** qu'une messagerie colle derrière un lien s'en va : elle
 *   double chaque adresse, et elle empêche de lire un en-tête cité ;
 * - un identifiant d'image en ligne devient `(image)` — **et se compte**,
 *   parce que dans un échange technique les images portent les formules, et
 *   qu'un relevé qui les ignore en silence est pire qu'un relevé qui dit
 *   qu'il y a là quelque chose qu'il n'a pas lu (règle 5) ;
 * - un bandeau de sécurité ajouté par une passerelle n'est de personne ;
 * - une ligne qui n'est qu'un numéro de téléphone ou qu'une adresse de site
 *   n'énonce rien.
 *
 * Tout le reste passe, y compris « Bien cordialement » et le nom qui suit.
 * Deux lignes courtes coûtent moins cher qu'une phrase perdue.
 *
 * ## Il est pur
 *
 * Du texte entre, du texte sort, avec le compte de ce qu'on a replié. Aucun
 * réseau.
 */

/** Ce qu'on met à la place d'une image : sa présence, pas son identifiant. */
export const MARQUE_DUNE_IMAGE = "(image)";

/**
 * Les passerelles qui réécrivent les adresses avant de les laisser passer.
 *
 * Il n'y a pas de ligne pour `safelinks` : la seconde la couvre déjà, et une
 * forme qu'on peut retirer sans que rien ne bronche n'est pas un garde-fou,
 * c'est une ligne de plus à relire. Une épreuve l'a montrée morte.
 */
const REDIRECTIONS = [
  /^https?:\/\/urldefense\.com\/v\d\//i,
  /^https?:\/\/[\w.-]*\.protection\.outlook\.com\//i
];

const URL_DANS_LE_TEXTE = /https?:\/\/[^\s<>()\[\]"]+/g;

/**
 * La queue qu'une messagerie colle derrière un lien.
 *
 * Outlook écrit sa version texte d'un lien en posant l'adresse **derrière** son
 * texte : `le guide<https://…>`, `o.ferrand@novaclim.example<mailto:o.ferrand@novaclim.example>`,
 * et — un deuxième fil réel l'a montré — `+33 1 23 45 67 89<tel:+33%201%2023…>`.
 * Personne ne l'a tapée, elle double chaque adresse du message, et elle coûte
 * plus cher que des caractères :
 *
 * - un en-tête cité — `Ourdine Ferrand <o.ferrand@x<mailto:o.ferrand@x>>` — ne
 *   se découpe plus, et **la même personne prend deux identités** dans le fil ;
 * - une citation qui traverse un lien ne se retrouve plus, parce que le modèle
 *   recopie ce qu'un humain lit et non ce que la messagerie a écrit.
 *
 * **Ce qui la distingue d'un en-tête ordinaire, c'est le schéma** : l'adresse
 * d'un en-tête cité s'écrit `<o.ferrand@novaclim.example>`, sans `mailto:`
 * devant, et ne se reconnaît donc pas ici. Une épreuve l'a montré — on avait
 * d'abord cru que c'était l'espace.
 *
 * **L'espace protège autre chose** : la convention d'un courriel en texte brut,
 * où l'on pose une adresse entre chevrons pour la donner à lire — « le guide
 * est ici <https://www.novaclim.example/guide> ». Celle-là, l'auteur l'a écrite,
 * et elle reste.
 */
const QUEUE_DE_LIEN = /(\S)<((?:https?:\/\/|mailto:|tel:)[^<>\s]*)>/g;

/** `[cid:image018.png@01DD1B52.8A52BFD0]` — une image collée dans le corps. */
const IMAGE_EN_LIGNE = /\[cid:[^\]]*\]/g;

/**
 * Le bandeau qu'une passerelle ajoute en tête d'un message venu du dehors.
 *
 * Il n'est de personne : ni l'auteur ni le destinataire ne l'ont écrit, et il
 * revient à l'identique sur chaque message d'un fil.
 *
 * **La fin se lit `[\s\S]*` et non `.*`**, et ce n'est pas un détail : un
 * courriel se termine par `\r\n`, le point d'une expression régulière ne
 * s'applique pas au retour chariot, et `.*$` ne franchissait donc jamais le
 * `\r` qu'une ligne réelle traîne. Le garde-fou passait toutes ses épreuves —
 * écrites avec des `\n` — et ne retirait pas un seul bandeau d'un vrai fil.
 */
const BANDEAU_DE_SECURITE =
  /^\s*(EXTERNAL SENDER|EXPEDITEUR EXTERNE|EXTERNAL E-?MAIL|COURRIEL EXTERNE)\s*:[\s\S]*$/i;

/** Une ligne qui n'est qu'une façon de joindre quelqu'un. */
const LIGNE_DE_COORDONNEES =
  /^\s*(?:t[ée]l\.?|tel\.?|mob\.?|mobile|portable|fax|gsm)\s*[.:]?\s*[+\d()\s.\-/]{6,}\s*$/i;

/** Une ligne qui n'est qu'une adresse de site. */
const LIGNE_DE_SITE = /^\s*(?:site\s*(?:web)?\s*:\s*)?(?:https?:\/\/|www\.)[^\s]+\s*$/i;

/**
 * Le lien d'une image, qui garde son espace.
 *
 * `(image) <https://…>` : le texte du lien était l'image elle-même. La règle
 * ci-dessus ne le prend pas — il y a un espace —, et celle-ci le prend parce
 * que la marque est la nôtre : rien ne se perd à retirer l'adresse d'un logo.
 */
const LIEN_DUNE_IMAGE = new RegExp(
  `${MARQUE_DUNE_IMAGE.replace(/[()]/g, "\\$&")}\\s*<(?:https?:\\/\\/|mailto:|tel:)[^<>\\s]*>`, "g");

/** Une ligne qui ne porte plus qu'une ou plusieurs marques d'image. */
const LIGNE_DIMAGES = new RegExp(`^\\s*(?:${MARQUE_DUNE_IMAGE.replace(/[()]/g, "\\$&")}\\s*)+$`);

const texte = (valeur) => String(valeur ?? "").trim();

function parametreUrl(adresse, nom) {
  const apres = adresse.split("?")[1];
  if (!apres) return "";
  for (const morceau of apres.split("&")) {
    const coupure = morceau.indexOf("=");
    if (coupure < 0) continue;
    if (morceau.slice(0, coupure).toLowerCase() !== nom) continue;
    try {
      return decodeURIComponent(morceau.slice(coupure + 1).replace(/\+/g, " "));
    } catch {
      return morceau.slice(coupure + 1);
    }
  }
  return "";
}

/**
 * L'adresse que cachait une redirection.
 *
 * Deux couches s'empilent en vrai : une passerelle de messagerie enveloppe une
 * adresse déjà enveloppée par un filtre de liens. On déplie tant qu'il y a
 * quelque chose à déplier, sans jamais boucler.
 *
 * Une adresse qu'on ne sait pas déplier revient telle quelle : on ne devine
 * pas ce qu'elle visait.
 */
export function deplierUneRedirection(adresse) {
  let courante = texte(adresse);
  for (let tour = 0; tour < 4; tour += 1) {
    if (!REDIRECTIONS.some((forme) => forme.test(courante))) return courante;

    const dansUnParametre = parametreUrl(courante, "url");
    if (dansUnParametre && /^https?:\/\//i.test(dansUnParametre)) {
      courante = dansUnParametre;
      continue;
    }

    // `urldefense` pose la vraie adresse entre `__` et `__;`.
    const entoure = courante.match(/\/v\d\/__(.+?)__;/);
    if (entoure) {
      try {
        courante = decodeURIComponent(entoure[1]);
      } catch {
        courante = entoure[1];
      }
      continue;
    }

    return courante;
  }
  return courante;
}

/** Une adresse passe-t-elle par une redirection ? */
export function estUneRedirection(adresse) {
  return REDIRECTIONS.some((forme) => forme.test(texte(adresse)));
}

/**
 * Le message, débarrassé de ce que son auteur n'a pas écrit.
 *
 * Rend le texte et le compte de ce qu'on a replié : l'écran doit pouvoir dire
 * combien d'images un message portait, parce qu'elles peuvent porter ce qui
 * compte.
 */
export function leProposNettoye(brut) {
  const source = String(brut ?? "");
  let redirections = 0;
  let images = 0;
  let bandeaux = 0;
  let liensDoubles = 0;

  const sansImages = source.replace(IMAGE_EN_LIGNE, () => {
    images += 1;
    return MARQUE_DUNE_IMAGE;
  });

  // **Les queues partent avant les redirections**, et non après : déplier une
  // adresse qu'on s'apprête à retirer coûterait un travail pour rien, et la
  // compterait comme une redirection du propos alors qu'elle n'en était pas.
  const sansQueues = sansImages
    .replace(LIEN_DUNE_IMAGE, () => { liensDoubles += 1; return MARQUE_DUNE_IMAGE; })
    .replace(QUEUE_DE_LIEN, (tout, avant) => { liensDoubles += 1; return avant; });

  const deplie = sansQueues.replace(URL_DANS_LE_TEXTE, (adresse) => {
    if (!estUneRedirection(adresse)) return adresse;
    redirections += 1;
    return deplierUneRedirection(adresse);
  });

  const gardees = [];
  for (const ligne of deplie.split("\n")) {
    if (BANDEAU_DE_SECURITE.test(ligne)) { bandeaux += 1; continue; }
    if (LIGNE_DE_COORDONNEES.test(ligne)) continue;
    if (LIGNE_DE_SITE.test(ligne)) continue;
    if (LIGNE_DIMAGES.test(ligne)) continue;
    gardees.push(ligne);
  }

  return {
    texte: gardees.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^[\r\n]+/, "").replace(/\s+$/, ""),
    redirections,
    images,
    bandeaux,
    /** Les adresses que la messagerie avait recopiées derrière leur texte. */
    liensDoubles
  };
}
