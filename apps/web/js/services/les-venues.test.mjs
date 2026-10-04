/**
 * **Un onglet oublié ne doit jamais compter comme du temps passé.**
 *
 * C'est la seule ligne qui compte vraiment dans ce module : compter le temps
 * pendant lequel la page existe donnerait un temps moyen de plusieurs heures,
 * faux et flatteur — le genre de chiffre qu'on finit par montrer à quelqu'un.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  AU_PLUS_PAR_BATTEMENT_S, CE_QUE_LE_TEMPS_MESURE, CE_QUIL_FAUT_FAIRE, EVEILLE_PENDANT_MS,
  PAS_DU_BATTEMENT_MS, UNE_VENUE_SE_FERME_APRES_MS, ceQuilFautFaire, cestEveille,
  laDate, lesSecondesDuBattement
} from "./les-venues.js";

const T = Date.parse("2026-10-05T10:00:00Z");
const ilYa = (ms) => new Date(T - ms).toISOString();
const uneVenue = (depuisMs) => ({ id: "v-1", vueLe: ilYa(depuisMs) });

/**
 * **Le cas qui décide de tout.** Un onglet au premier plan que personne ne
 * touche depuis une heure : la page existe, et il ne se passe rien.
 */
test("un onglet oublié ne compte pas", () => {
  const quoi = ceQuilFautFaire({
    maintenant: T, visible: true, derniereInteraction: T - 60 * 60 * 1000,
    venue: uneVenue(2 * 60 * 1000)
  });
  assert.equal(quoi, CE_QUIL_FAUT_FAIRE.RIEN,
    "un onglet oublié depuis une heure prolonge sa venue : le temps moyen serait faux");
});

/** Et un onglet caché ne compte pas non plus, même si l'on vient de taper. */
test("un onglet caché ne compte pas", () => {
  assert.equal(
    ceQuilFautFaire({ maintenant: T, visible: false, derniereInteraction: T,
      venue: uneVenue(2 * 60 * 1000) }),
    CE_QUIL_FAUT_FAIRE.RIEN);

  // **Pas même pour ouvrir une venue.** Rien ne s'écrit d'un onglet endormi.
  assert.equal(
    ceQuilFautFaire({ maintenant: T, visible: false, derniereInteraction: T, venue: null }),
    CE_QUIL_FAUT_FAIRE.RIEN);
});

/**
 * **Les deux conditions, et il faut les deux.** Un onglet au premier plan que
 * personne ne touche n'est pas de l'usage ; un geste dans un onglet caché
 * n'existe pas.
 */
test("l'éveil demande le premier plan et un geste récent", () => {
  assert.equal(cestEveille({ visible: true, derniereInteraction: T, maintenant: T }), true);
  assert.equal(cestEveille({ visible: false, derniereInteraction: T, maintenant: T }), false);

  // Juste dans la fenêtre, puis juste dehors.
  assert.equal(cestEveille({
    visible: true, derniereInteraction: T - EVEILLE_PENDANT_MS + 1, maintenant: T }), true);
  assert.equal(cestEveille({
    visible: true, derniereInteraction: T - EVEILLE_PENDANT_MS - 1, maintenant: T }), false);

  // **Aucun geste du tout n'est pas un geste à l'époque zéro.** Sans cela, une
  // page fraîchement ouverte serait éveillée pour l'éternité de 1970.
  assert.equal(cestEveille({ visible: true, derniereInteraction: 0, maintenant: T }), false);
});

/** Une venue s'ouvre quand il n'y en a pas, et quand la précédente est close. */
test("une venue s'ouvre, et se rouvre après une demi-heure de silence", () => {
  const eveille = { maintenant: T, visible: true, derniereInteraction: T };

  assert.equal(ceQuilFautFaire({ ...eveille, venue: null }), CE_QUIL_FAUT_FAIRE.COMMENCER);
  assert.equal(ceQuilFautFaire({ ...eveille, venue: { id: "", vueLe: ilYa(0) } }),
    CE_QUIL_FAUT_FAIRE.COMMENCER);
  // Une venue sans date de battement ne se prolonge pas : on ne sait pas d'où
  // elle part, et son temps vaudrait n'importe quoi.
  assert.equal(ceQuilFautFaire({ ...eveille, venue: { id: "v", vueLe: null } }),
    CE_QUIL_FAUT_FAIRE.COMMENCER);

  /**
   * **Revenir après le déjeuner n'est pas la même visite.** Fondre les deux
   * donnerait une venue de quatre heures dont trois sans personne.
   */
  assert.equal(
    ceQuilFautFaire({ ...eveille, venue: uneVenue(UNE_VENUE_SE_FERME_APRES_MS + 1000) }),
    CE_QUIL_FAUT_FAIRE.COMMENCER);
  assert.equal(
    ceQuilFautFaire({ ...eveille, venue: uneVenue(UNE_VENUE_SE_FERME_APRES_MS - 1000) }),
    CE_QUIL_FAUT_FAIRE.PROLONGER);
});

/**
 * **On ne bat pas deux fois dans la même minute.**
 *
 * Sans ce pas, une page qui se redessine beaucoup écrirait beaucoup — et la
 * mesure du temps passé deviendrait une mesure du nombre de redessins.
 */
test("deux battements dans la même minute n'en font qu'un", () => {
  const eveille = { maintenant: T, visible: true, derniereInteraction: T };

  assert.equal(ceQuilFautFaire({ ...eveille, venue: uneVenue(1000) }),
    CE_QUIL_FAUT_FAIRE.RIEN, "le pas du battement ne tient pas");
  assert.equal(ceQuilFautFaire({ ...eveille, venue: uneVenue(PAS_DU_BATTEMENT_MS - 1) }),
    CE_QUIL_FAUT_FAIRE.RIEN);
  assert.equal(ceQuilFautFaire({ ...eveille, venue: uneVenue(PAS_DU_BATTEMENT_MS) }),
    CE_QUIL_FAUT_FAIRE.PROLONGER);
});

/**
 * **Un onglet réveillé après une veille ne déclare pas une heure d'un coup.**
 *
 * C'est le mensonge exact qu'on refuse : le navigateur suspend ses minuteurs,
 * le battement suivant arrive une heure plus tard, et l'écart brut vaudrait
 * soixante minutes de présence que personne n'a passées.
 */
test("un battement ne déclare jamais plus que la borne", () => {
  assert.equal(
    lesSecondesDuBattement({ maintenant: T, venue: uneVenue(60 * 60 * 1000) }),
    AU_PLUS_PAR_BATTEMENT_S,
    "un onglet réveillé après une heure déclare une heure de présence");

  // Un battement normal déclare ce qui s'est écoulé.
  assert.equal(lesSecondesDuBattement({ maintenant: T, venue: uneVenue(60 * 1000) }), 60);
  assert.equal(lesSecondesDuBattement({ maintenant: T, venue: uneVenue(90 * 1000) }), 90);

  // Et rien ne se déclare sans point de départ, ni à rebours.
  assert.equal(lesSecondesDuBattement({ maintenant: T, venue: null }), 0);
  assert.equal(lesSecondesDuBattement({ maintenant: T, venue: { vueLe: "pas une date" } }), 0);
  assert.equal(
    lesSecondesDuBattement({ maintenant: T, venue: { vueLe: new Date(T + 60000).toISOString() } }),
    0, "une horloge en avance fait reculer le compteur");
});

/**
 * **La borne de la base et celle du navigateur sont le même nombre.**
 *
 * Elles sont écrites des deux côtés parce que chacune doit tenir seule — la base
 * protège, le navigateur évite d'envoyer ce qu'il sait rogné. Deux nombres
 * différents feraient qu'un battement bordé ici arriverait rogné là-bas, et
 * personne ne saurait lequel est le bon (règle 4).
 */
test("la borne du battement est celle que la base applique", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const sql = readFileSync(fileURLToPath(new URL(
    "../../../../supabase/migrations/202611240001_les_venues_de_mdall.sql",
    import.meta.url)), "utf8");

  // Une comparaison littérale plutôt qu'une expression régulière : c'est la
  // ligne exacte que la base exécute, et l'échappement d'une regex sur du SQL
  // plein de parenthèses est une source de faux verts.
  const bornee = `least(greatest(coalesce(p_secondes, 0), 0), ${AU_PLUS_PAR_BATTEMENT_S})`;
  assert.ok(sql.includes(bornee),
    `la base ne borne pas comme le navigateur : « ${bornee} » est absent de la migration`);
});

/** Un instant se lit, et une absence n'en est pas un. */
test("une date se lit, et une absence n'en est pas une", () => {
  assert.equal(laDate("2026-10-05T10:00:00Z"), T);
  assert.equal(laDate(new Date(T)), T);
  assert.equal(laDate(null), null);
  assert.equal(laDate(""), null);
  assert.equal(laDate("pas une date"), null);
});

/**
 * **Ce qui est mesuré est écrit, et l'écran le reprend.**
 *
 * Un indicateur dont on a oublié ce qu'il mesure est pire qu'un indicateur
 * manquant : six mois plus tard, « temps moyen : 34 minutes » se lira « ils
 * travaillent 34 minutes par jour ».
 */
test("ce que le temps mesure est dit, et dit ce qu'il n'est pas", () => {
  assert.ok(CE_QUE_LE_TEMPS_MESURE.length > 120,
    "la phrase est trop courte pour dire ce qui est compté");
  assert.match(CE_QUE_LE_TEMPS_MESURE, /premier plan/);
  assert.match(CE_QUE_LE_TEMPS_MESURE, /pas « du temps de travail »|pas du temps de travail/,
    "la phrase ne dit pas ce que le chiffre n'est pas");
});

/** Les trois seuils se tiennent : un pas plus court que l'éveil, lui-même plus
 * court que la fermeture. Les intervertir ferait une mesure incohérente. */
test("les trois seuils se tiennent dans l'ordre", () => {
  assert.ok(PAS_DU_BATTEMENT_MS < EVEILLE_PENDANT_MS,
    "on bat moins souvent qu'on ne reste éveillé : des minutes se perdraient");
  assert.ok(EVEILLE_PENDANT_MS < UNE_VENUE_SE_FERME_APRES_MS,
    "une venue se ferme avant qu'on cesse d'être éveillé : elle se rouvrirait sans cesse");
});
