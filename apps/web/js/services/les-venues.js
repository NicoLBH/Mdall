/**
 * Mesurer le temps passé dans Mdall — **sans mentir sur ce qui est mesuré**.
 *
 * ## Ce qui manquait, et pourquoi on ne l'avait pas
 *
 * La console savait dire **quand** quelqu'un était venu pour la dernière fois :
 * `last_sign_in_at`, la seule trace que Mdall garde sans la fabriquer. Elle ne
 * savait rien dire de combien de temps il était resté, ni combien de monde il y
 * a eu hier — il n'existe aucune table de séances, et l'écran le disait.
 *
 * ## Le piège, et la seule façon de ne pas y tomber
 *
 * Un onglet laissé ouvert toute la nuit, c'est huit heures. Compter le temps
 * pendant lequel la page existe donnerait un « temps moyen d'utilisation » de
 * plusieurs heures par jour, qui serait faux et **flatteur** — le genre de
 * chiffre qu'on finit par montrer à quelqu'un (règle 12).
 *
 * On ne compte donc que le temps **éveillé** : l'onglet est au premier plan, et
 * il y a eu un geste — clic, frappe, défilement — dans les cinq dernières
 * minutes. C'est une minute de plus par minute où les deux sont vrais, et rien
 * sinon.
 *
 * **Ce que cela mesure reste « l'application était ouverte et quelqu'un la
 * touchait »**, et pas « quelqu'un travaillait ». La différence est réelle, et
 * l'écran de la console l'écrit : un indicateur dont on a oublié ce qu'il mesure
 * est pire qu'un indicateur manquant (règle 5).
 *
 * ## Ce qu'une venue porte, et ce qu'elle ne portera jamais
 *
 * Qui, quand elle a commencé, quand on l'a vue pour la dernière fois, et combien
 * de secondes éveillées. **Ni écran ouvert, ni chantier, ni geste, ni rien de ce
 * qu'on a lu ou écrit.** Savoir « qui a passé combien de temps sur quel
 * chantier » serait une autre table et une autre promesse ; la promesse du
 * produit est que le contenu ne traverse pas, et un journal de navigation la
 * défait par la bande.
 *
 * ## Il ne parle à rien
 *
 * Un instant, un état d'onglet et la venue en cours entrent ; ce qu'il faut
 * faire sort. L'accès à la base vit dans `les-venues-supabase.js`, et le minuteur
 * dans `le-battement-des-venues.js`.
 */

const nombre = (valeur) => (Number.isFinite(Number(valeur)) ? Number(valeur) : 0);

/**
 * Un battement par minute.
 *
 * **C'est aussi le grain de la mesure** : on ne saura jamais qu'une venue a duré
 * quatre-vingt-dix secondes, on saura qu'elle en a duré soixante ou cent vingt.
 * C'est largement assez pour un temps moyen d'utilisation, et cela fait une
 * écriture par minute et par personne au lieu d'une par geste.
 */
export const PAS_DU_BATTEMENT_MS = 60 * 1000;

/**
 * Ce qu'un geste achète comme éveil.
 *
 * Cinq minutes : on lit un compte rendu pendant quatre minutes sans toucher à
 * rien, et c'est du temps d'usage. Au-delà, on ne sait plus si quelqu'un est
 * là — et **l'absence de preuve n'est pas une preuve d'absence**, donc on
 * s'arrête de compter plutôt que de deviner dans un sens ou dans l'autre.
 */
export const EVEILLE_PENDANT_MS = 5 * 60 * 1000;

/**
 * Au bout de combien de silence une venue est close.
 *
 * Trente minutes. Au-delà, le battement suivant ouvre une **nouvelle** venue :
 * revenir après le déjeuner n'est pas la même visite, et fondre les deux
 * donnerait une venue de quatre heures dont trois sans personne.
 */
export const UNE_VENUE_SE_FERME_APRES_MS = 30 * 60 * 1000;

/**
 * Le plus de secondes qu'un battement peut déclarer.
 *
 * **Le navigateur envoie un nombre, donc il peut envoyer n'importe lequel.** La
 * base le borne elle-même ; cette constante est là pour que les deux bornes
 * soient le même nombre, écrit une fois (règle 4). Sans elle, un onglet réveillé
 * après une heure de veille pourrait déclarer une heure d'un coup.
 */
export const AU_PLUS_PAR_BATTEMENT_S = 300;

/** Ce qu'il faut faire, à cet instant. */
export const CE_QUIL_FAUT_FAIRE = {
  /** Rien : l'onglet dort, personne ne touche à rien, ou c'est trop tôt. */
  RIEN: "rien",
  /** Ouvrir une venue : il n'y en a pas, ou la précédente est close. */
  COMMENCER: "commencer",
  /** Prolonger celle qui court. */
  PROLONGER: "prolonger"
};

/**
 * Sommes-nous éveillés ?
 *
 * Les deux conditions, et il faut les deux : un onglet au premier plan que
 * personne ne touche n'est pas de l'usage, et un geste dans un onglet caché
 * n'existe pas.
 */
export function cestEveille({
  visible = false, derniereInteraction = 0, maintenant = Date.now(),
  eveillePendantMs = EVEILLE_PENDANT_MS
} = {}) {
  if (visible !== true) return false;

  /**
   * **Aucun geste du tout tombe déjà hors de la fenêtre.**
   *
   * Il y avait ici un `derniereInteraction > 0` de plus. Il ne pouvait pas
   * tomber : sans geste, `depuis` vaut l'heure courante en millisecondes —
   * mille sept cents milliards —, c'est-à-dire très au-delà de cinq minutes. Un
   * garde qu'aucun cassage ne fait tomber se lit comme une protection, et l'on
   * hésite à y toucher pour rien (règle 4).
   */
  const depuis = nombre(maintenant) - nombre(derniereInteraction);
  return depuis >= 0 && depuis <= nombre(eveillePendantMs);
}

/**
 * Ce qu'il faut faire, à cet instant.
 *
 * **L'ordre des tests est la règle.** L'éveil d'abord : rien ne s'écrit d'un
 * onglet endormi, pas même la prolongation d'une venue qui courait. Puis
 * l'ouverture, puis le pas — on ne bat pas deux fois dans la même minute, sans
 * quoi une page qui se redessine beaucoup écrirait beaucoup.
 */
export function ceQuilFautFaire({
  maintenant = Date.now(), visible = false, derniereInteraction = 0, venue = null,
  pasMs = PAS_DU_BATTEMENT_MS,
  eveillePendantMs = EVEILLE_PENDANT_MS,
  fermeApresMs = UNE_VENUE_SE_FERME_APRES_MS
} = {}) {
  if (!cestEveille({ visible, derniereInteraction, maintenant, eveillePendantMs })) {
    return CE_QUIL_FAUT_FAIRE.RIEN;
  }

  const vueLe = laDate(venue?.vueLe);
  if (!venue?.id) return CE_QUIL_FAUT_FAIRE.COMMENCER;

  /**
   * **Une venue sans date de battement est close**, et non prolongeable : on ne
   * saurait pas depuis quand elle court.
   *
   * Il y avait un `vueLe === null` de plus au-dessus. Il ne pouvait pas tomber :
   * sans date, le silence vaut l'heure courante entière, donc bien au-delà de la
   * demi-heure. Le `?? 0` rend ce repli **explicite** plutôt qu'accidentel —
   * l'ancienne version s'appuyait sur `nombre − null`, qui marche par hasard.
   */
  const silence = nombre(maintenant) - (vueLe ?? 0);
  if (silence > nombre(fermeApresMs)) return CE_QUIL_FAUT_FAIRE.COMMENCER;
  if (silence < nombre(pasMs)) return CE_QUIL_FAUT_FAIRE.RIEN;

  return CE_QUIL_FAUT_FAIRE.PROLONGER;
}

/**
 * Combien de secondes éveillées ce battement déclare.
 *
 * Le temps écoulé depuis le dernier, **borné**. Un onglet que le navigateur a
 * mis en veille pendant une heure revient et déclarerait une heure : c'est
 * justement le mensonge qu'on refuse. La borne est la même que celle de la base.
 */
export function lesSecondesDuBattement({
  maintenant = Date.now(), venue = null, auPlus = AU_PLUS_PAR_BATTEMENT_S
} = {}) {
  const vueLe = laDate(venue?.vueLe);
  if (vueLe === null) return 0;

  const secondes = Math.round((nombre(maintenant) - vueLe) / 1000);
  if (!(secondes > 0)) return 0;
  return Math.min(secondes, Math.max(0, Math.trunc(nombre(auPlus))));
}

/** Un instant rendu par la base, en millisecondes — ou `null`. */
export function laDate(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const quand = valeur instanceof Date ? valeur.getTime() : new Date(valeur).getTime();
  return Number.isNaN(quand) ? null : quand;
}

/**
 * Ce que Mdall déclare mesurer, en une phrase.
 *
 * **Écrite ici**, et affichée par la console. Un indicateur dont on a oublié ce
 * qu'il mesure est pire qu'un indicateur manquant : six mois plus tard, « temps
 * moyen : 34 minutes » se lira « ils travaillent 34 minutes par jour », ce qui
 * n'est pas ce qui a été compté.
 */
export const CE_QUE_LE_TEMPS_MESURE =
  "Le temps compté est celui où l'application est au premier plan et où quelqu'un "
  + "l'a touchée dans les cinq minutes. Ce n'est pas « du temps de travail » : "
  + "lire un document à côté de l'écran n'y est pas, et un onglet oublié non plus.";
