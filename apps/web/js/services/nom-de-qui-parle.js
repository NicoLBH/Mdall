/**
 * Le nom d'un utilisateur, tel qu'on l'écrit quand il engage quelque chose.
 *
 * ## Pourquoi il vit ici
 *
 * Fermer un sujet signe une décision « par Ourdine Ferrand ». Proposer une
 * valeur depuis un sujet la signe de même. Deux endroits qui construisent ce nom
 * finiraient par ne pas écrire le même — l'un tomberait sur le prénom, l'autre
 * sur l'adresse — et la mémoire porterait deux signatures pour une personne
 * (règle 10).
 *
 * ## Il ne va rien chercher
 *
 * Il reçoit l'utilisateur et rend un nom. L'état de l'écran est à l'écran ; ce
 * fichier ne sait pas ce qu'est un `store`, et c'est ce qui permet de
 * l'exécuter.
 *
 * ## « Human » plutôt que rien
 *
 * Un dernier recours volontairement générique : il dit **qu'un humain a signé**,
 * ce qui est le fait important, là où le vide se lirait comme une signature
 * automatique. C'est le mot que la fermeture d'un sujet écrit depuis toujours,
 * et le changer ici rendrait illisible ce qui est déjà enregistré (règle 6).
 */

const texte = (valeur) => String(valeur ?? "").trim();

/** Ce qu'on écrit quand on ne sait rien de qui parle. */
export const QUELQUUN = "Human";

/**
 * Le nom sous lequel cette personne engage quelque chose.
 *
 * Prénom et nom d'abord, parce que c'est ainsi qu'on se désigne entre gens du
 * projet. Puis ce que le compte porte, puis l'adresse — une adresse se reconnaît
 * encore. `QUELQUUN` en dernier.
 */
export function nomDeQuiParle(utilisateur = null) {
  const qui = utilisateur && typeof utilisateur === "object" ? utilisateur : {};

  const complet = `${texte(qui.firstName)} ${texte(qui.lastName)}`.trim();

  return complet
    || texte(qui.fullName)
    || texte(qui.name)
    || texte(qui.email)
    || QUELQUUN;
}
