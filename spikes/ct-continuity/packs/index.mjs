/**
 * Les packs de lecture, un par émetteur.
 *
 * Le moteur sait lire un tableau ; il ne sait pas comment tel bureau de
 * contrôle intitule ses colonnes ni comment il nomme ses livrables. C'est ce
 * que dit un pack, et c'est tout ce qu'il dit.
 *
 * **Chaque avis consigne le pack et la version qui l'ont lu.** Sans cela, face
 * à un écart entre deux exécutions, on ne saurait jamais s'il vient du document
 * ou d'une correction de la veille. C'est la raison d'être du numéro de
 * version, et elle vaut à elle seule qu'on le porte.
 *
 * Il n'y a aujourd'hui qu'un pack, et il faut le dire franchement : **une
 * abstraction validée sur un seul cas n'est pas validée**. Nous saurons si la
 * séparation entre lecture et vocabulaire tient le jour où un corpus APAVE ou
 * Véritas sera disponible — et il faudra alors s'attendre à reprendre la
 * frontière, pas seulement à écrire un second pack.
 */

import { SOCOTEC } from "./socotec.mjs";

export const PACKS = [SOCOTEC];

/**
 * Le pack retenu à défaut de mieux.
 *
 * Il vaut mieux lire un document avec le mauvais vocabulaire — les garde-fous
 * signaleront alors ce qui ne se vérifie pas — que de ne pas le lire du tout
 * en attendant un pack qui n'existe pas encore.
 */
export const DEFAULT_PACK = SOCOTEC;

/**
 * Choisit le pack d'après ce que le document imprime de lui-même.
 *
 * La reconnaissance est déterministe, et c'est voulu : mettre un choix
 * incertain à la racine de la lecture reviendrait à ce que, lorsque tout est
 * faux, personne ne puisse dire pourquoi.
 */
export function selectPack(text) {
  const content = String(text ?? "");
  return PACKS.find((pack) => pack.detect.test(content)) ?? DEFAULT_PACK;
}

/** Retrouve un pack par son identifiant, tel qu'il a été consigné. */
export function packById(id) {
  return PACKS.find((pack) => pack.id === id) ?? null;
}

/** L'identité d'un pack, telle qu'elle se consigne sur ce qu'il a lu. */
export function packStamp(pack = DEFAULT_PACK) {
  return { pack_id: pack.id, pack_version: pack.version };
}
