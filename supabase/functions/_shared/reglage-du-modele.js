/**
 * Le réglage qui décide si deux lectures du même fil se ressemblent.
 *
 * ## Ce que la température fait, et ce qu'elle ne fait pas
 *
 * **Elle ne change pas ce que le modèle comprend.** À chaque mot qu'il écrit,
 * il dispose d'un classement de ce qui pourrait suivre, avec des probabilités.
 * Ce classement est sa lecture du fil, et il est le même d'un appel à l'autre.
 * La température décide seulement **comment on y pioche** : à 1, on tire au
 * sort selon les probabilités ; à 0, on prend toujours le premier.
 *
 * ## Pourquoi cela coûte des prises entières
 *
 * Un relevé est une **liste**. Des centaines de fois, le modèle arrive au point
 * où il choisit entre « j'ouvre une prise de plus » et « je referme ». À
 * température libre, chacun de ces points est un coup de dé — et dès qu'un dé
 * tombe du mauvais côté, tout ce qui suit en découle : le modèle referme, puis
 * continue de façon parfaitement cohérente sur un relevé plus court.
 *
 * Mesuré sur un fil réel, trois fois de suite, sans rien changer :
 * **12, 14 et 17 prises**, et 9 phrases sur 19 seulement présentes aux trois
 * passages. Au passage le plus pauvre, la position contestée du litige
 * n'apparaissait nulle part — l'écran montrait la réfutation et pas ce qu'elle
 * réfutait.
 *
 * ## Pourquoi c'est une question de doctrine, et pas de confort
 *
 * Règle 1 : rien n'entre dans la mémoire sans une proposition signée, et une
 * proposition porte des citations comme preuves. **Une preuve qui change alors
 * que le document n'a pas changé n'est pas une preuve.** Un sujet ouvert mardi
 * sur un désaccord que le même fil ne montre plus jeudi discrédite l'outil
 * devant celui à qui on l'oppose.
 *
 * Et règle 12 : une consigne qu'on ne vérifie pas est une intention. On ne peut
 * vérifier aucune règle de lecture tant que deux lectures du même fil diffèrent.
 *
 * ## Ce qu'elle ne garantit pas
 *
 * **Elle ne rend pas le relevé meilleur, elle le rend unique.** Si le tirage
 * déterministe est pauvre, il sera pauvre à chaque fois. Et le fournisseur peut
 * changer le modèle derrière le même nom : la reproductibilité tient tant que
 * le modèle tient.
 */

/**
 * Toujours le premier du classement.
 *
 * Zéro plutôt qu'une valeur basse : une valeur basse laisse passer les tirages
 * rares, qui sont précisément ceux qui coupent une liste trop tôt.
 */
export const TEMPERATURE_REPRODUCTIBLE = 0;

/**
 * Le fournisseur refuse-t-il qu'on lui fixe une température ?
 *
 * **Les modèles de raisonnement la rejettent**, et le modèle est un réglage
 * (`OPENAI_PRISES_MODEL`) : quelqu'un peut en poser un demain. Sans cette
 * lecture, le relevé tomberait en panne pour un paramètre de trop, et l'écran
 * annoncerait un fournisseur injoignable — ce qui enverrait chercher très loin
 * de la cause.
 *
 * On ne reconnaît que le refus **nommé** : un 400 qui parle de la température.
 * Deviner plus largement ferait réessayer sur des pannes qui n'ont rien à voir,
 * et ferait payer deux fois.
 */
export function refuseLaTemperature(corps, statut) {
  if (Number(statut) !== 400) return false;
  return /temperature/i.test(String(corps ?? ""));
}
