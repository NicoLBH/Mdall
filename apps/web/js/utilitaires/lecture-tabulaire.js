/**
 * Lire une réponse d'API dont on ne connaît pas la forme exacte.
 *
 * Ce n'est pas un utilitaire — c'est l'outil dont plusieurs se servent, d'où le
 * nom en tirets plutôt qu'en `nom_V1` : la distinction se voit dans le dossier.
 *
 * Géorisques ne publie pas un schéma stable : selon l'endpoint la réponse est
 * `{data: [...]}`, `{results: [...]}`, un objet plat, ou une liste à un seul
 * élément. Écrire un chemin d'accès en dur ferait un lecteur qui marche
 * aujourd'hui et se tait sans bruit demain.
 *
 * D'où la règle qui gouverne ce fichier : **on cherche par nom de colonne, et à
 * défaut on s'abstient.** Ne rien rendre est un résultat ; rendre la première
 * valeur venue n'en est pas un.
 */

function texteBrut(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "object") return "";
  return String(value).trim();
}

function aplatir(value, prefixe = "", ligne = {}) {
  if (Array.isArray(value)) {
    ligne[prefixe || "value"] = value.map((item) => texteBrut(item)).filter(Boolean).join(", ");
    return ligne;
  }

  if (value !== null && value !== undefined && typeof value === "object") {
    for (const [cle, valeur] of Object.entries(value)) {
      const suivant = prefixe ? `${prefixe}.${cle}` : cle;
      if (valeur !== null && valeur !== undefined && typeof valeur === "object" && !Array.isArray(valeur)) {
        aplatir(valeur, suivant, ligne);
      } else if (Array.isArray(valeur)) {
        ligne[suivant] = valeur.map((item) => texteBrut(item)).filter(Boolean).join(", ");
      } else {
        ligne[suivant] = texteBrut(valeur);
      }
    }
    return ligne;
  }

  ligne[prefixe || "value"] = texteBrut(value);
  return ligne;
}

/**
 * Les lignes d'une réponse, à plat.
 *
 * On retient la plus longue liste d'objets trouvée : c'est le tableau de
 * données, les autres sont des enveloppes. À défaut, l'objet lui-même fait une
 * ligne.
 */
export function lignesDe(data) {
  const listes = [];

  const parcourir = (valeur) => {
    if (Array.isArray(valeur)) {
      if (valeur.length > 0 && valeur.some((item) => item !== null && typeof item === "object")) {
        listes.push(valeur.map((item) => aplatir(item, "", {})));
      }
      valeur.forEach(parcourir);
      return;
    }
    if (valeur !== null && valeur !== undefined && typeof valeur === "object") {
      Object.values(valeur).forEach(parcourir);
    }
  };

  parcourir(data);

  const meilleure = listes.filter((liste) => liste.length > 0).sort((a, b) => b.length - a.length)[0];
  if (meilleure) return meilleure;

  if (data !== null && data !== undefined && typeof data === "object") return [aplatir(data, "", {})];
  return [];
}

/**
 * La première valeur dont **le nom de colonne** correspond, et que `accepter`
 * retient.
 *
 * Les deux conditions comptent. Chercher par nom seul ramènerait un libellé là
 * où on veut un code ; accepter par valeur seule ramènerait n'importe quel
 * chiffre de la réponse.
 *
 * @returns {string} la valeur, ou `""` — jamais une approximation
 */
export function valeurParColonne(data, motif, accepter = () => true) {
  for (const ligne of lignesDe(data)) {
    for (const [colonne, valeur] of Object.entries(ligne)) {
      if (!valeur) continue;
      if (!motif.test(colonne)) continue;
      if (!accepter(valeur)) continue;
      return valeur;
    }
  }
  return "";
}
