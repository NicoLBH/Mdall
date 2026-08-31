/**
 * Donner un fichier à l'utilisateur.
 *
 * Le navigateur n'a pas de « enregistrer sous » : on fabrique un lien, on le
 * clique, on le retire. L'URL de l'objet est révoquée aussitôt après — un
 * export de trois mégaoctets laissé en mémoire à chaque clic finirait par se
 * voir sur un onglet resté ouvert la journée.
 *
 * Rien ici ne sait ce qu'il télécharge : c'est voulu. Le contenu se fabrique
 * dans un module pur, testable ; ce fichier ne fait que le poser sur le disque.
 */
export function downloadTextFile({ filename = "export.txt", text = "", mimeType = "text/plain" } = {}) {
  if (typeof document === "undefined" || typeof URL?.createObjectURL !== "function") return false;

  const blob = new Blob([String(text ?? "")], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const lien = document.createElement("a");
  lien.href = url;
  lien.download = String(filename || "export.txt");
  lien.rel = "noopener";
  document.body.appendChild(lien);
  lien.click();
  lien.remove();

  // Le retrait est différé d'un tour : révoquer dans le même tour annule le
  // téléchargement sur certains navigateurs.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/** Un objet, écrit en JSON lisible — on l'ouvre dans un éditeur, pas dans un parseur. */
export function downloadJsonFile({ filename = "export.json", data = null } = {}) {
  return downloadTextFile({
    filename,
    text: `${JSON.stringify(data, null, 2)}\n`,
    mimeType: "application/json"
  });
}

/** Un tableau, écrit en CSV. */
export function downloadCsvFile({ filename = "export.csv", text = "" } = {}) {
  return downloadTextFile({ filename, text, mimeType: "text/csv" });
}
