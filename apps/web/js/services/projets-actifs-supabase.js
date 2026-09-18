/**
 * Mes traces de travail, lues en base.
 *
 * ## Quatre lectures, pas soixante
 *
 * Une par table, sur tous les projets à la fois. Demander projet par projet
 * aurait fait soixante requêtes pour quinze projets, à l'ouverture de
 * l'accueil — l'écran qu'on voit le plus souvent doit être le moins cher.
 *
 * ## Ce sont **les miennes**, et la base s'en charge
 *
 * Les discussions et les études sont sous politique propriétaire : un `select`
 * ne rend que les siennes, sans qu'on ait à le demander. Les propositions, non
 * — elles appartiennent au projet — et c'est donc nous qui filtrons sur
 * `created_by`. La différence n'est pas un détail : sans ce filtre, l'accueil
 * classerait les projets d'après le travail de l'équipe et les appellerait
 * « les miens ».
 *
 * ## Une lecture qui échoue ne fait pas tomber l'accueil
 *
 * Chacune retombe sur une liste vide, et le classement se fait avec ce qui
 * reste. Un accueil blanc parce qu'une table manque coûte plus cher qu'un
 * classement incomplet — mais l'écran dit qu'il n'a rien trouvé plutôt que
 * d'afficher un classement vide comme s'il était la vérité (règle 5).
 */

import { supabase } from "../../assets/js/auth.js";
import { listerMesTracesDeDiscussion } from "./copilote-conversations-supabase.js";
import { GENRE } from "./projets-actifs.js";

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Combien de traces on remonte par source.
 *
 * Il en faut assez pour **une année entière** : la carte de l'accueil couvre
 * douze mois glissants, et une limite trop basse la tronquerait par son côté le
 * plus ancien — sans que rien ne le dise, ce qui est la pire des pannes
 * (règle 5). Mille par source laisse de la marge pour un rythme soutenu ; au
 * delà, la carte dirait « rien » sur des mois où il y a eu quelque chose, et
 * c'est une dette qu'on assume en la nommant ici plutôt qu'en la découvrant.
 */
const AU_PLUS = 1000;

/**
 * Mes discussions avec le Copilote.
 *
 * **Par la porte, et pas autrement.** Les deux tables du Copilote n'ont qu'un
 * seul module qui leur parle, et la cloison (`copilote-cloison.test.mjs`) casse
 * la construction si un autre s'y met. Ce n'est pas une politesse : c'est ce
 * qui permet de savoir, à un seul endroit, tout ce qui est lu de discussions
 * privées.
 *
 * Ce qui en sort ici : un projet, une date, un titre. Aucun message.
 */
async function discussions() {
  const lues = await listerMesTracesDeDiscussion({ auPlus: AU_PLUS });

  return lues.map((ligne) => ({
    projet: texte(ligne?.projectId),
    genre: GENRE.DISCUSSION,
    quoi: texte(ligne?.title) || "Discussion avec le Copilote",
    quand: texte(ligne?.updatedAt)
  }));
}

/** Les propositions que j'ai ouvertes. */
async function propositions(moi = "") {
  const compte = texte(moi);
  if (!compte) return [];

  const { data, error } = await supabase
    .from("propositions")
    .select("project_id,title,created_at")
    .eq("created_by", compte)
    .order("created_at", { ascending: false })
    .limit(AU_PLUS);

  // **Une erreur se lève.** La rendre sous la forme d'une liste vide effacerait
  // la différence entre « je n'ai rien fait » et « je n'ai pas pu regarder » —
  // et c'est justement ce que `lireMesTraces` doit savoir distinguer (règle 5).
  if (error) throw new Error(error.message || "Lecture impossible.");

  return (Array.isArray(data) ? data : []).map((ligne) => ({
    projet: texte(ligne?.project_id),
    genre: GENRE.PROPOSITION,
    quoi: texte(ligne?.title) || "Proposition",
    quand: texte(ligne?.created_at)
  }));
}

/** Les études d'agent que j'ai remplies. */
async function etudes() {
  const { data, error } = await supabase
    .from("incendie_etudes")
    .select("project_id,titre,updated_at")
    .order("updated_at", { ascending: false })
    .limit(AU_PLUS);

  if (error) throw new Error(error.message || "Lecture impossible.");

  return (Array.isArray(data) ? data : []).map((ligne) => ({
    projet: texte(ligne?.project_id),
    genre: GENRE.ETUDE,
    quoi: texte(ligne?.titre) || "Étude incendie",
    quand: texte(ligne?.updated_at)
  }));
}

/**
 * Les affirmations que j'ai signées.
 *
 * **Le geste le plus lourd de tous** : c'est lui qui fait entrer quelque chose
 * dans la mémoire d'un projet. `decided_by` le rattache à un compte sans
 * ambiguïté — contrairement aux dépôts de documents, dont la table ne dit pas
 * qui les a faits.
 */
async function affirmations(moi = "") {
  const compte = texte(moi);
  if (!compte) return [];

  const { data, error } = await supabase
    .from("project_assertions")
    .select("project_id,subject_key,payload,decided_at")
    .eq("decided_by", compte)
    .order("decided_at", { ascending: false })
    .limit(AU_PLUS);

  if (error) throw new Error(error.message || "Lecture impossible.");

  return (Array.isArray(data) ? data : []).map((ligne) => ({
    projet: texte(ligne?.project_id),
    genre: GENRE.AFFIRMATION,
    quoi: texte(ligne?.payload?.subject) || texte(ligne?.subject_key) || "Affirmation",
    quand: texte(ligne?.decided_at)
  }));
}

/**
 * Tout ce que j'ai fait, dans l'ordre où ça s'est passé.
 *
 * `null` quand **aucune** des quatre lectures n'a abouti : ce n'est pas « je
 * n'ai rien fait », c'est « je n'ai pas pu regarder », et l'écran ne dit pas la
 * même chose dans les deux cas.
 *
 * @param {string} moi l'identifiant de compte de qui regarde
 * @returns {Promise<object[]|null>}
 */
export async function lireMesTraces(moi = "") {
  const lues = await Promise.allSettled([
    discussions(), propositions(moi), etudes(), affirmations(moi)
  ]);

  if (lues.every((lue) => lue.status === "rejected")) return null;

  return lues
    .filter((lue) => lue.status === "fulfilled")
    .flatMap((lue) => lue.value);
}
