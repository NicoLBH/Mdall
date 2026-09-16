/**
 * Une barre de recherche à la GitHub : des filtres écrits dans le texte.
 *
 * `nature:hypothese domaine:structure neige` — les filtres et les mots vivent
 * au même endroit, et cet endroit est **le champ de saisie**. C'est ce qui rend
 * une recherche confortable : on lit ce qu'on cherche, on le corrige au clavier,
 * on le copie, on le colle. Des filtres cachés dans des menus obligent à
 * ouvrir quatre listes pour savoir ce qu'on regarde.
 *
 * ## Rien n'est deviné
 *
 * Un jeton n'est un filtre que si **son champ est déclaré** et **sa valeur
 * connue**. `auteur:moi` sur un écran qui n'a pas d'auteur reste du texte
 * ordinaire, et `nature:zoiseau` aussi. Interpréter au plus proche ferait
 * disparaître des lignes sans que personne comprenne pourquoi — et une
 * recherche qui ment est pire qu'une recherche vide.
 *
 * ## Le module ne connaît aucun écran
 *
 * Il reçoit la liste des champs et rend un objet ; c'est l'écran qui sait ce
 * qu'il en fait. La Mémoire s'en sert aujourd'hui ; les sujets, les
 * propositions et les projets s'en serviront demain sans le modifier.
 */

/**
 * Un champ interrogeable.
 *
 * @typedef {object} QueryField
 * @property {string} key le mot avant les deux-points, tel qu'on le tape
 * @property {string} label son nom pour l'écran
 * @property {{value: string, label: string, token?: string, seule?: boolean}[]} values
 *   les valeurs admises. `token` est ce qui s'écrit dans la barre — accentué,
 *   lisible — quand il diffère de la valeur interne.
 *
 *   **Deux valeurs peuvent s'écrire pareil.** Un écran qui traverse les projets
 *   voit quatre labels « Critique », un par chantier : la barre ne sait écrire
 *   que le nom, et ce nom les désigne donc **toutes**. `seule: true` fait
 *   exception — c'est ce qu'il faut pour une valeur réservée comme `@moi`, qui
 *   s'écrit « moi » alors que quelqu'un peut s'appeler Moi.
 * @property {boolean} [multiple] plusieurs valeurs peuvent coexister. Par défaut
 *   non : reposer deux fois le même champ **remplace**, parce qu'une affirmation
 *   n'a qu'une nature et qu'offrir d'en cocher deux promet un résultat vide.
 */

import { escapeHtml } from "../utils/escape-html.js";

function texte(value) {
  return String(value ?? "").trim();
}

/** Sans accent ni casse : « Hypothèse » et « hypothese » désignent la même chose. */
function pli(value) {
  return texte(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Le champ déclaré qui répond à ce mot, ou `null`.
 *
 * On accepte la clé et le libellé — on tape « domaine » comme « Domaine » —
 * mais rien d'approchant : « dom » ne vaut pas « domaine ».
 */
function champPour(fields, mot) {
  const cherche = pli(mot);
  return (fields ?? []).find((champ) => pli(champ.key) === cherche || pli(champ.label) === cherche) ?? null;
}

/**
 * La valeur admise qui répond à ce mot, ou `null`.
 *
 * On accepte la valeur interne, le jeton écrit et le libellé — tous **repliés** :
 * « Hypothèse », « hypothèse » et « hypothese » désignent la même chose, parce
 * qu'on tape rarement les accents dans une barre de recherche et jamais deux
 * fois la même casse.
 */
function valeurPour(champ, mot) {
  return valeursPour(champ, mot)[0] ?? null;
}

/**
 * **Toutes** les valeurs admises que ce mot désigne.
 *
 * ## Le défaut qu'elle répare
 *
 * `valeurPour` rendait la **première**, et c'était juste tant qu'un écran ne
 * regardait qu'un projet : deux labels n'y portent pas le même nom. Un écran
 * qui traverse les projets, lui, en voit autant que de projets — « Critique »
 * existe dans quatre chantiers, sous quatre identifiants.
 *
 * Or la barre ne sait écrire qu'un **nom** : `label:critique`. Elle ne
 * retenait donc que le premier des quatre, et les sujets des trois autres
 * disparaissaient sans un mot. Cocher « Critique » dans le menu rendait une
 * liste vide — on cherchait la faute dans la requête, dans les labels, partout
 * sauf là où elle était.
 *
 * ## Pourquoi ce n'est pas « deviner au plus proche »
 *
 * Ce module refuse d'interpréter : `nature:zoiseau` reste du texte. Ici rien
 * n'est deviné — les quatre valeurs **portent le même nom**, et l'écrire les
 * désigne toutes les quatre, exactement. C'est la question qu'on pose en
 * cochant « Critique » : les sujets critiques, où qu'ils soient.
 */
function valeursPour(champ, mot) {
  const cherche = pli(mot);
  const admises = (champ?.values ?? []).filter(
    (valeur) =>
      pli(valeur.value) === cherche ||
      pli(valeur.label) === cherche ||
      pli(jetonDe(valeur)) === cherche
  );

  // **Une valeur réservée ne se confond avec aucune autre.** `@moi` s'écrit
  // « moi », et quelqu'un peut s'appeler Moi : les réunir ferait appliquer le
  // filtre sur cette personne-là quand on ne sait pas qui regarde, au lieu de
  // l'annoncer sans l'appliquer (règle 5). La première réservée gagne, comme
  // avant ce changement.
  const reservee = admises.find((valeur) => valeur.seule === true);
  return reservee ? [reservee] : admises;
}

/**
 * Les valeurs qui s'écrivent comme celle-ci — elle comprise.
 *
 * Deux projets portent un label du même nom : la barre ne peut écrire que ce
 * nom, et les deux identifiants vont donc **ensemble**. Cocher les pose tous
 * les deux, décocher les retire tous les deux ; les séparer ferait un filtre
 * qu'on ne peut plus décocher.
 */
function memesJetons(champ, valeur) {
  const sienne = (champ?.values ?? []).find((candidate) => pli(candidate.value) === pli(valeur));
  if (!sienne) return [texte(valeur)];

  return valeursPour(champ, jetonDe(sienne)).map((autre) => texte(autre.value)).filter(Boolean);
}

/**
 * Ce qui s'écrit dans la barre pour cette valeur.
 *
 * Accentué et en toutes lettres : la barre se lit autant qu'elle s'écrit, et
 * `nature:donnée-de-base` se comprend là où `nature:donnee-de-base` fait code.
 * La valeur interne, elle, ne bouge pas.
 */
function jetonDe(valeur) {
  return texte(valeur?.token) || texte(valeur?.value);
}

/** Un champ à choix multiple garde toutes ses valeurs ; les autres, la dernière. */
function estMultiple(champ) {
  return champ?.multiple === true;
}

/**
 * Les valeurs d'un filtre, toujours comme une liste.
 *
 * `filters[clé]` vaut une chaîne pour un champ à choix simple et un tableau
 * pour un champ à choix multiple. Tout ce qui lit un filtre passe par ici :
 * deux façons de lire la même case finiraient par n'être pas d'accord
 * (règle 4).
 */
export function filterValues(filters = {}, key = "") {
  const brut = filters?.[texte(key)];
  if (Array.isArray(brut)) return brut.map(texte).filter(Boolean);
  return texte(brut) ? [texte(brut)] : [];
}

/**
 * Découpe une requête en filtres reconnus et en texte libre.
 *
 * Un jeton non reconnu **reste du texte** : il n'est ni ignoré, ni corrigé. On
 * le retrouve donc dans la barre, et la recherche porte dessus comme sur
 * n'importe quel mot.
 *
 * ## Un champ à choix multiple garde toutes ses valeurs
 *
 * `label:cr-chantier label:etancheite` cherche **l'un ou l'autre** : c'est ce
 * qu'on attend en cochant deux labels dans un menu, et c'est ce qu'on écrit en
 * les tapant. Sa case porte alors un tableau ; celle d'un champ à choix simple
 * porte une chaîne, et la dernière valeur tapée gagne. Un statut ne peut pas
 * être ouvert **et** fermé, et proposer d'en cocher deux promettrait une liste
 * vide.
 *
 * @returns {{filters: Record<string,string|string[]>, text: string,
 *   inconnus: {champ: string, valeur: string}[]}} `inconnus` nomme les valeurs
 *   qu'un champ **déclaré** n'admet pas : ce sont des fautes de frappe, et une
 *   liste vide ne les distingue pas d'un filtre légitimement sans résultat.
 */
export function parseQuery(query = "", fields = []) {
  const filtres = {};
  const mots = [];
  const inconnus = [];

  for (const morceau of texte(query).split(/\s+/).filter(Boolean)) {
    const coupure = morceau.indexOf(":");
    if (coupure <= 0) {
      mots.push(morceau);
      continue;
    }

    const champ = champPour(fields, morceau.slice(0, coupure));
    // **Toutes celles que ce mot nomme.** Un écran qui traverse les projets
    // voit quatre labels « Critique », un par chantier ; la barre ne sait
    // écrire que le nom, et n'en retenir qu'un faisait disparaître les sujets
    // des trois autres sans un mot.
    const valeurs = champ ? valeursPour(champ, morceau.slice(coupure + 1)) : [];
    const valeur = valeurs[0] ?? null;

    if (!champ || !valeur) {
      mots.push(morceau);
      // **Un champ connu, une valeur qui ne l'est pas : c'est une faute de
      // frappe, et elle se dit.** Le jeton reste du texte — la règle du fichier
      // ne bouge pas —, mais la recherche porte alors sur `projet:Bertrnad`
      // comme sur un mot, ne trouve rien, et la liste vide se lit comme un
      // chantier sans travail. On ne corrige pas ; on prévient (règle 5).
      //
      // Un champ **inconnu** ne compte pas : `http://x` n'est pas une faute.
      if (champ && !inconnus.some((entree) => entree.champ === champ.key && entree.valeur === morceau.slice(coupure + 1))) {
        inconnus.push({ champ: champ.key, valeur: morceau.slice(coupure + 1) });
      }
      continue;
    }

    if (!estMultiple(champ)) {
      // Le dernier gagne : retaper un filtre le remplace, ce qui est ce qu'on
      // attend en corrigeant sa propre requête.
      filtres[champ.key] = valeur.value;
      continue;
    }

    // À choix multiple, on empile — sans doublon : `label:x label:x` est une
    // répétition, pas deux conditions. Les homonymes entrent **ensemble** :
    // c'est la question qu'on pose en cochant « Critique ».
    const deja = Array.isArray(filtres[champ.key]) ? filtres[champ.key] : [];
    filtres[champ.key] = [
      ...deja,
      ...valeurs.map((admise) => admise.value).filter((sienne) => !deja.includes(sienne))
    ];
  }

  return { filters: filtres, text: mots.join(" "), inconnus };
}

/**
 * Ce qu'on n'a pas su reconnaître, dit en une phrase. `""` quand tout va bien.
 *
 * La barre garde le jeton tel quel — on le relit, on le corrige. Mais sans
 * cette phrase, rien ne distingue « ce filtre ne retient rien » de « ce filtre
 * n'existe pas » : dans les deux cas la liste est vide.
 */
export function phraseDesValeursInconnues(inconnus = []) {
  const entrees = (Array.isArray(inconnus) ? inconnus : []).filter((entree) => entree?.champ && entree?.valeur);
  if (!entrees.length) return "";

  const dits = entrees.map((entree) => `« ${entree.valeur} » pour ${entree.champ}`);
  return `${dits.join(", ")} : valeur inconnue. Le filtre n'est pas posé, et le texte est cherché tel quel.`;
}

/**
 * Réécrit une requête depuis ses filtres et son texte.
 *
 * Les filtres viennent en tête, dans l'ordre des champs déclarés — pas dans
 * celui où l'utilisateur les a tapés. Une barre dont l'ordre change à chaque
 * frappe est illisible, et deux requêtes équivalentes doivent s'écrire pareil.
 */
export function formatQuery({ filters = {}, text = "" } = {}, fields = []) {
  const jetons = (fields ?? []).flatMap((champ) => {
    const dits = filterValues(filters, champ.key)
      .map((brute) => {
        const valeur = valeurPour(champ, brute);
        return `${champ.key}:${valeur ? jetonDe(valeur) : brute}`;
      });

    // **Un jeton par nom, et non un par identifiant.** Quatre labels
    // « Critique » s'écrivent tous `label:critique` : les répéter quatre fois
    // rendrait une barre illisible pour une seule condition.
    return [...new Set(dits)];
  });

  return [...jetons, texte(text)].filter(Boolean).join(" ");
}

/**
 * La même requête, avec un filtre posé, remplacé ou retiré.
 *
 * Une valeur vide **retire** le filtre : c'est ce que veut dire choisir
 * « Domaine » dans une liste dont l'entrée neutre porte le nom du champ.
 */
export function withFilter(query = "", fields = [], key = "", value = "") {
  const { filters, text } = parseQuery(query, fields);
  const champ = champPour(fields, key);
  if (!champ) return texte(query);

  const suivant = { ...filters };
  if (texte(value)) suivant[champ.key] = texte(value);
  else delete suivant[champ.key];

  return formatQuery({ filters: suivant, text }, fields);
}

/**
 * La même requête, avec une valeur **ajoutée ou retirée** d'un champ.
 *
 * C'est le geste d'un menu qu'on coche : cliquer une valeur déjà posée la
 * retire, cliquer une autre l'ajoute. Sur un champ à choix simple il n'y a
 * rien à empiler — cocher remplace, recocher retire —, et `withFilter` dit
 * exactement cela.
 */
export function toggleFilter(query = "", fields = [], key = "", value = "") {
  const champ = champPour(fields, key);
  const voulue = texte(value);
  if (!champ || !voulue) return texte(query);

  const { filters, text } = parseQuery(query, fields);
  const posees = filterValues(filters, champ.key);

  if (!estMultiple(champ)) {
    return withFilter(query, fields, key, posees.includes(voulue) ? "" : voulue);
  }

  // **On coche un nom, pas un identifiant.** Quatre chantiers portent un label
  // « Critique » : la barre ne sait écrire que `label:critique`, et les quatre
  // identifiants vont donc ensemble. Ne retirer que celui qu'on a cliqué
  // laissait le jeton en place — un filtre qu'on ne peut plus décocher.
  const soeurs = memesJetons(champ, voulue);
  const suivantes = soeurs.some((soeur) => posees.includes(soeur))
    ? posees.filter((posee) => !soeurs.includes(posee))
    : [...posees, ...soeurs.filter((soeur) => !posees.includes(soeur))];

  const suivant = { ...filters };
  if (suivantes.length) suivant[champ.key] = suivantes;
  else delete suivant[champ.key];

  return formatQuery({ filters: suivant, text }, fields);
}

/**
 * La valeur d'un filtre dans une requête, ou `""`.
 *
 * Sur un champ à choix multiple, c'est la **première** posée : la seule réponse
 * honnête à une question qui n'en attend qu'une. Qui veut les voir toutes
 * appelle `filterValuesOf`.
 */
export function filterValue(query = "", fields = [], key = "") {
  return filterValues(parseQuery(query, fields).filters, key)[0] ?? "";
}

/** Toutes les valeurs d'un filtre dans une requête, dans l'ordre où elles sont posées. */
export function filterValuesOf(query = "", fields = [], key = "") {
  return filterValues(parseQuery(query, fields).filters, key);
}

/**
 * Une requête qui ne porte **que** ces filtres.
 *
 * C'est ce que fait le choix d'une lecture dans le rail : on repart d'une
 * question nette plutôt que d'empiler sur la précédente. Le texte libre est
 * conservé — on cherchait quelque chose, on cherche toujours la même chose.
 */
export function onlyFilters(query = "", fields = [], filters = {}) {
  const { text } = parseQuery(query, fields);
  return formatQuery({ filters, text }, fields);
}

/**
 * Les filtres de cette requête, dits en français.
 *
 * @returns {{key: string, label: string, value: string, valueLabel: string}[]}
 */
export function describeFilters(query = "", fields = []) {
  const { filters } = parseQuery(query, fields);

  // Une entrée **par valeur posée** : deux labels cochés se disent en deux
  // morceaux, comme ils s'écrivent en deux jetons.
  return (fields ?? []).flatMap((champ) => filterValues(filters, champ.key)
    .map((brute) => {
      const valeur = valeurPour(champ, brute);
      return {
        key: champ.key,
        label: champ.label,
        value: brute,
        valueLabel: valeur?.label ?? brute
      };
    }));
}

/**
 * Les propositions de complétion, pour la position du curseur.
 *
 * Deux moments seulement : on tape le nom d'un champ, ou on tape la valeur d'un
 * champ déjà nommé. Ailleurs on écrit du texte, et proposer quoi que ce soit
 * gênerait la frappe.
 *
 * @returns {{kind: "field"|"value", token: string, start: number, end: number,
 *   items: {insert: string, label: string, hint: string}[]}|null}
 */
export function suggestAt(query = "", fields = [], caret = 0) {
  const brut = String(query ?? "");
  const position = Math.max(0, Math.min(brut.length, Number(caret) || 0));

  const debut = brut.lastIndexOf(" ", position - 1) + 1;
  const finBrute = brut.indexOf(" ", position);
  const fin = finBrute === -1 ? brut.length : finBrute;
  const jeton = brut.slice(debut, fin);

  const coupure = jeton.indexOf(":");

  if (coupure === -1) {
    const cherche = pli(jeton);
    const items = (fields ?? [])
      .filter((champ) => !cherche || pli(champ.key).startsWith(cherche))
      .map((champ) => ({ insert: `${champ.key}:`, label: `${champ.key}:`, hint: champ.label }));
    return items.length ? { kind: "field", token: jeton, start: debut, end: fin, items } : null;
  }

  const champ = champPour(fields, jeton.slice(0, coupure));
  if (!champ) return null;

  const cherche = pli(jeton.slice(coupure + 1));
  const items = (champ.values ?? [])
    .filter(
      (valeur) =>
        !cherche ||
        pli(valeur.label).includes(cherche) ||
        pli(jetonDe(valeur)).startsWith(cherche) ||
        pli(valeur.value).startsWith(cherche)
    )
    .map((valeur) => ({
      insert: `${champ.key}:${jetonDe(valeur)} `,
      label: valeur.label,
      hint: champ.label,
      // Un champ à choix simple **remplace** sa valeur précédente : proposer
      // « nature:contrainte » à côté de « nature:hypothèse » promettrait un
      // résultat que la mémoire ne peut pas donner.
      replacesField: champ.multiple !== true ? champ.key : ""
    }));

  return items.length ? { kind: "value", token: jeton, start: debut, end: fin, items } : null;
}


/**
 * La requête découpée en morceaux, pour la peindre derrière le champ.
 *
 * Un champ de saisie ne sait pas colorer une partie de son contenu. On dessine
 * donc **la même requête**, au même endroit, avec la même police, derrière un
 * champ dont le texte est transparent : les jetons reconnus s'y détachent, le
 * reste garde l'aspect du texte ordinaire. Le curseur, la sélection et la
 * frappe restent ceux d'un vrai champ — c'est ce que fait GitHub, et c'est la
 * seule façon d'avoir les deux.
 *
 * Les espaces sont conservés tels quels : le calque doit tomber au pixel près
 * sur le texte qu'il double, sinon il se décale à la première frappe.
 *
 * **Seule la valeur se colore.** « nature: » nomme le champ, et c'est la valeur
 * qui dit ce qu'on cherche : peindre les deux ferait un pâté bleu où l'œil ne
 * distingue plus l'essentiel de son étiquette.
 *
 * @returns {{text: string, isFilter: boolean, key?: string, value?: string}[]}
 */
export function queryPieces(query = "", fields = []) {
  const brut = String(query ?? "");
  if (!brut) return [];

  const morceaux = [];
  for (const part of brut.split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      morceaux.push({ text: part, isFilter: false });
      continue;
    }

    const coupure = part.indexOf(":");
    const champ = coupure > 0 ? champPour(fields, part.slice(0, coupure)) : null;
    const valeur = champ ? valeurPour(champ, part.slice(coupure + 1)) : null;

    if (champ && valeur) {
      morceaux.push({
        text: part,
        isFilter: true,
        key: part.slice(0, coupure + 1),
        value: part.slice(coupure + 1)
      });
      continue;
    }

    morceaux.push({ text: part, isFilter: false });
  }

  return morceaux;
}

/**
 * Le calque à poser derrière le champ.
 *
 * Rendu ici plutôt que dans l'écran : c'est la même règle que l'analyse, et
 * deux endroits qui décident de ce qui est un filtre finiraient par ne plus
 * être d'accord.
 */
export function renderQueryMirror(query = "", fields = [], { tokenClass = "query-token" } = {}) {
  const classe = escapeHtml(tokenClass);

  return queryPieces(query, fields)
    .map((piece) => {
      if (!piece.isFilter) return escapeHtml(piece.text);
      return (
        `<span class="${classe}__key">${escapeHtml(piece.key)}</span>` +
        `<span class="${classe}__value">${escapeHtml(piece.value)}</span>`
      );
    })
    .join("");
}


/**
 * La requête débarrassée des autres jetons d'un champ à choix simple.
 *
 * Appelée après une complétion : on vient d'insérer `nature:contrainte`, il faut
 * retirer le `nature:hypothèse` qui traînait ailleurs dans la ligne. Sans cela
 * la barre montrerait deux valeurs pour un champ qui n'en admet qu'une, et le
 * résultat serait vide sans que rien ne l'explique.
 *
 * @param {number} garde position d'un jeton à conserver
 */
export function dropOtherTokens(query = "", fields = [], key = "", garde = -1) {
  const champ = champPour(fields, key);
  if (!champ || champ.multiple === true) return String(query ?? "");

  const brut = String(query ?? "");
  const morceaux = [];
  let curseur = 0;

  for (const part of brut.split(/(\s+)/)) {
    if (!part) continue;
    const debut = curseur;
    curseur += part.length;

    if (/^\s+$/.test(part)) {
      morceaux.push(part);
      continue;
    }

    const coupure = part.indexOf(":");
    const sien = coupure > 0 && champPour(fields, part.slice(0, coupure)) === champ;
    const aGarder = debut <= garde && garde <= debut + part.length;
    if (sien && !aGarder) continue;

    morceaux.push(part);
  }

  return morceaux.join("").replace(/\s{2,}/g, " ").trim();
}
