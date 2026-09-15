/**
 * Les lectures du carnet : des situations qu'on n'a pas écrites.
 *
 * ## Ce qu'une lecture est
 *
 * « Assigné à moi » n'est pas un filtre posé sur une liste de situations :
 * **c'est une situation**, dont le nom est « Assigné à moi » et dont les sujets
 * sont ceux qui répondent à `assigné:moi`, sur tous mes chantiers.
 *
 * C'est ce qui rend l'écran homogène : cliquer une lecture du rail ou une
 * situation qu'on a créée fait la même chose — ouvrir une situation et voir ses
 * sujets. Un second chemin qui montrerait « des sujets » sans passer par une
 * situation aurait son propre tableau, son propre titre, ses propres
 * comportements, et les deux auraient divergé au troisième réglage.
 *
 * Voir `docs/le-carnet-prend-la-forme-des-sujets.md`, étape 2.
 *
 * ## Elles ne s'écrivent pas en base, et c'est délibéré
 *
 * Les créer en base au premier passage reviendrait à verser dans le carnet de
 * quelqu'un des lignes qu'il n'a pas demandées — c'est précisément ce qu'on
 * vient de retirer à la création d'un projet. Elles existent parce que la
 * question « qu'est-ce qui m'est assigné ? » se pose à tout le monde, pas parce
 * qu'on l'a rangée quelque part.
 *
 * Elles ne se modifient donc pas, ne se ferment pas, ne se suppriment pas. Qui
 * veut la sienne la crée, et elle portera son nom.
 *
 * ## Rien n'est redéfini ici
 *
 * Les lectures, leurs noms, leurs icônes et leurs requêtes viennent de
 * `rail-des-sujets.js`, qui les produit déjà pour l'onglet Sujets. Ce fichier
 * ne fait que les **présenter comme des situations** (règle 10).
 */

import {
  ICONES_DE_LA_LECTURE, LECTURE, NOMS_DE_LA_LECTURE, requeteDeLaLecture
} from "./rail-des-sujets.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le préfixe qui distingue une situation de lecture d'une situation écrite.
 *
 * **On doit pouvoir les séparer sans se tromper**, parce que l'une s'enregistre
 * et l'autre pas. Un identifiant de base est un uuid ; celui-ci n'en a pas la
 * forme, et ne peut donc entrer en collision avec aucun.
 */
export const PREFIXE_DE_LECTURE = "lecture:";

/** Le nom de la première entrée du rail, dans le carnet. */
export const NOM_DES_SITUATIONS = "Situations";

/** Cette situation est-elle une lecture, c'est-à-dire une situation qu'on n'a pas écrite ? */
export function estUneLecture(situation = null) {
  const id = texte(situation?.id ?? situation);
  return id.startsWith(PREFIXE_DE_LECTURE);
}

/**
 * Les lectures, présentées comme des situations.
 *
 * `TOUS` n'en fait pas partie : dans le carnet, la première entrée du rail est
 * la **liste des situations**, pas une situation de plus. Y mettre « tous les
 * sujets » ferait une entrée qui ouvre autre chose que ses voisines.
 *
 * Une lecture dont un champ n'est pas déclaré ne se propose pas — c'est la
 * règle de `rail-des-sujets.js`, et elle vaut ici : sans collaborateur connu,
 * « Assigné à moi » perdrait son filtre et montrerait tout.
 *
 * @param {object[]} champs ceux de `champsDesSujets`
 */
export function situationsDeLecture(champs = []) {
  return Object.values(LECTURE)
    .filter((lecture) => lecture !== LECTURE.TOUS)
    .map((lecture) => {
      const requete = requeteDeLaLecture(lecture, champs);
      if (!requete) return null;

      return {
        id: `${PREFIXE_DE_LECTURE}${lecture}`,
        title: NOMS_DE_LA_LECTURE[lecture],
        description: "",
        // Elle est une requête : c'est exactement ce qu'est une situation
        // automatique depuis l'étape 1.
        requete,
        icon: ICONES_DE_LA_LECTURE[lecture],
        color: "",
        mode: "automatic",
        // Toujours ouverte : une lecture ne se ferme pas, elle ne fait que
        // rendre ce qui répond à sa question.
        status: "open",
        // Elle n'a pas de propriétaire écrit, et n'en a pas besoin : elle
        // n'existe que pour qui la regarde.
        owner_id: "",
        perimetre: { portee: "tous" }
      };
    })
    .filter(Boolean);
}

/** Une lecture par son identifiant, ou `null`. */
export function situationDeLectureParId(identifiant = "", champs = []) {
  const id = texte(identifiant);
  if (!id.startsWith(PREFIXE_DE_LECTURE)) return null;
  return situationsDeLecture(champs).find((situation) => situation.id === id) ?? null;
}
