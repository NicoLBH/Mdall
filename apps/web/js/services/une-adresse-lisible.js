/**
 * Ce qu'on montre d'un expéditeur, et ce qu'on garde pour soi.
 *
 * ## Le défaut qu'un vrai dépôt a montré
 *
 * La liste des mails affichait, en guise d'expéditeur :
 *
 *     Nicolas Lebihan (/O=EXCHANGELABS/OU=EXCHANGE ADMINISTRATIVE GROUP
 *     (FYDIBOHF23SPDLT)/CN=RECIPIENTS/CN=2130423FA9EF43C6B5B78421F4C7D6A2-NICOLAS.LEB)
 *
 * Trois lignes de titre pour un nom de trois syllabes, et personne ne peut
 * deviner à quoi cela correspond.
 *
 * ## Ce que c'est
 *
 * Une **adresse X.500**, l'identifiant interne d'un annuaire Exchange. Outlook
 * la met à la place de l'adresse de messagerie quand l'expéditeur est du même
 * annuaire que le lecteur — c'est-à-dire, dans un chantier, pour tous les
 * messages qu'on a écrits soi-même.
 *
 * Ce n'est pas une adresse : on ne peut pas y écrire, on ne peut pas la lire,
 * et elle ne désigne rien hors de l'annuaire qui l'a produite. Elle n'a donc
 * rien à faire à l'écran.
 *
 * ## Ce qu'on met à la place
 *
 * Le nom, quand il est là — et il l'est presque toujours, puisque c'est
 * l'annuaire qui le fournit. Sinon l'**alias**, qui est le seul morceau de
 * l'identifiant qui veuille dire quelque chose : `…-NICOLAS.LEB` désigne
 * quelqu'un, le reste est de la plomberie.
 *
 * Et si l'on n'a ni l'un ni l'autre, on le dit. Inventer un nom serait pire que
 * de montrer l'identifiant (règle 5).
 *
 * ## Il est pur
 *
 * Une adresse entre, du texte sort.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Une adresse de messagerie, c'est-à-dire quelque chose où l'on peut écrire.
 *
 * Volontairement large : on ne valide pas une adresse, on écarte ce qui n'en
 * est manifestement pas une. Refuser une adresse exotique mais réelle la
 * remplacerait par un nom — c'est-à-dire ferait disparaître de l'écran la seule
 * façon de joindre quelqu'un.
 */
export function cestUneAdresseDeMessagerie(valeur) {
  const dit = texte(valeur);
  if (!dit) return false;
  if (dit.startsWith("/")) return false;
  const coupe = dit.split("@");
  if (coupe.length !== 2) return false;
  return Boolean(coupe[0]) && coupe[1].includes(".") && !/\s/.test(dit);
}

/** Une adresse X.500 d'annuaire Exchange, telle qu'Outlook les écrit. */
export function cestUneAdresseDannuaire(valeur) {
  return /^\/o=/i.test(texte(valeur));
}

/**
 * L'alias caché au bout d'une adresse d'annuaire.
 *
 * `…/CN=2130423FA9EF43C6B5B78421F4C7D6A2-NICOLAS.LEB` → `NICOLAS.LEB`. Le
 * préfixe hexadécimal est un identifiant de boîte, il ne se lit pas ; ce qui
 * suit le tiret est l'alias que l'annuaire a donné à la personne.
 */
export function lAliasDeLannuaire(valeur) {
  if (!cestUneAdresseDannuaire(valeur)) return "";
  const dernier = texte(valeur).split("/").pop() ?? "";
  const apresLeCn = dernier.replace(/^cn=/i, "");
  const tiret = apresLeCn.lastIndexOf("-");
  const alias = tiret >= 0 ? apresLeCn.slice(tiret + 1) : apresLeCn;
  return texte(alias);
}

/**
 * Ce qu'on affiche d'un expéditeur : `{ nom, adresse }`.
 *
 * `adresse` est vide quand il n'y en a pas de montrable — l'écran n'a alors
 * rien à dessiner à côté du nom, ce qui est exactement ce qu'on veut.
 */
export function lidentiteLisible(qui = null) {
  const nom = texte(typeof qui === "string" ? "" : qui?.nom);
  const brute = texte(typeof qui === "string" ? qui : qui?.adresse);

  if (cestUneAdresseDeMessagerie(brute)) {
    // **Quand le nom n'est que l'adresse, c'est sa casse qui l'emporte** :
    // c'est celle que l'expéditeur a choisi d'afficher, et l'écran la respectait
    // déjà avant ce module. Un comportement éprouvé ne se change pas au passage.
    const memeChose = nom && nom.toLowerCase() === brute.toLowerCase();
    if (memeChose) return { nom: "", adresse: nom };
    return { nom, adresse: brute };
  }

  if (cestUneAdresseDannuaire(brute)) {
    // L'alias ne remplace le nom que si le nom manque : « Nicolas Lebihan »
    // vaut mieux que « NICOLAS.LEB », et l'annuaire donne presque toujours les
    // deux.
    return { nom: nom || lAliasDeLannuaire(brute) || "expéditeur interne", adresse: "" };
  }

  // Ni l'un ni l'autre : une chaîne qu'on ne sait pas qualifier. On la garde
  // telle quelle plutôt que de la jeter — elle dit peut-être quelque chose.
  return { nom: nom || brute, adresse: "" };
}

/** L'expéditeur, sur une seule ligne, comme une liste l'écrit. */
export function lidentiteDite(qui = null) {
  const { nom, adresse } = lidentiteLisible(qui);
  if (nom && adresse) return `${nom} (${adresse})`;
  return nom || adresse;
}

/**
 * Nettoyer un expéditeur **déjà composé**.
 *
 * ## Pourquoi il faut aussi savoir faire cela
 *
 * `mail_de` est écrit au dépôt, une fois, et il ne se recalcule pas : les mails
 * versés avant que ce module existe portent en base la chaîne entière —
 * « Nicolas Lebihan (/O=EXCHANGELABS/…) ». Les relire ne les corrige pas, et
 * redéployer ne réécrit rien.
 *
 * La liste des mails passe donc ce qu'elle lit ici. Une migration nettoie les
 * lignes existantes (`202611010001_...`), mais un écran qui dépend d'une
 * migration pour ne pas afficher d'horreur est un écran qui affichera
 * l'horreur le jour où quelque chose échappe à la migration.
 *
 * ## Ce qu'il reconnaît
 *
 * La forme que `lidentiteDite` produit : « Nom (adresse) ». Quand l'adresse
 * entre parenthèses n'en est pas une, on garde le nom. Tout le reste passe
 * inchangé — y compris un nom qui contiendrait des parenthèses pour une autre
 * raison.
 */
export function lexpediteurNettoye(valeur) {
  const dit = texte(valeur);
  if (!dit) return "";

  const enParentheses = dit.match(/^(.*?)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/s);
  if (!enParentheses) return dit;

  const nom = texte(enParentheses[1]);
  const dedans = texte(enParentheses[2]);
  if (!nom) return dit;
  if (cestUneAdresseDeMessagerie(dedans)) return dit;
  if (cestUneAdresseDannuaire(dedans)) return nom;

  // Des parenthèses qui ne portent pas une adresse font partie du nom.
  return dit;
}
