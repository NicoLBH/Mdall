/**
 * Ce que le copilote propose à l'Atelier incendie.
 *
 * ## Une remise, pas un versement
 *
 * Le copilote a répondu à une question — le degré coupe-feu des planchers, le
 * classement — et, pour y répondre, il a réuni des réponses : celles de l'étude
 * du projet, plus celles que la discussion a apportées. L'Atelier, lui, tient
 * l'étude. Entre les deux il n'y a pas d'écriture directe : « L'Atelier propose,
 * la Mémoire enregistre — une seule porte ».
 *
 * Cette remise est donc **en attente** : elle vit en mémoire vive, elle est
 * perdue au rechargement, et elle ne devient des réponses d'étude que si l'on
 * clique.
 *
 * ## Ce qu'on ne fait jamais : écraser en silence
 *
 * L'étude porte peut-être déjà une réponse à la même question, et différente —
 * on a demandé au copilote « et si c'était une 2e famille ? », il a répondu
 * là-dessus, et l'étude dit toujours 3e famille B. Les deux ont un auteur ; ce
 * n'est pas au copilote de trancher.
 *
 * La remise **complète** donc : ce que l'étude ne dit pas s'ajoute, ce qu'elle
 * dit autrement reste affiché côte à côte, et l'on va répondre sur l'écran si
 * l'on veut changer d'avis. À défaut, on ouvre une **étude neuve** : c'est ce
 * qu'on veut quand la discussion explorait une autre hypothèse.
 */

const texte = (valeur) => String(valeur ?? "").trim();

/**
 * Le signal qu'une remise attend.
 *
 * Les panneaux de l'Atelier sont dessinés une fois, à l'ouverture, et le rail ne
 * fait ensuite que les montrer. Une remise qui arrive après ce dessin ne se
 * verrait qu'au rechargement de la page — c'est-à-dire jamais.
 */
export const REMISE_INCENDIE_ANNONCEE = "mdall:incendie-remise";

/** Annoncer la remise à qui l'attend. */
export function annoncerLaRemiseIncendie() {
  if (typeof window?.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent(REMISE_INCENDIE_ANNONCEE));
  }
}

/**
 * Les réponses qu'un résultat rapporte.
 *
 * Elles viennent du serveur, sous `pourLAtelier` : c'est lui qui sait traduire
 * les entrées d'un utilitaire en questions du référentiel, et cette
 * correspondance n'a pas à descendre dans le navigateur.
 */
export function reponsesDeLaRemise(execution) {
  const dit = execution?.pourLAtelier?.reponses;
  return dit && typeof dit === "object" ? dit : null;
}

/** Deux réponses disent-elles la même chose ? Un « 3 » et un 3 sont d'accord. */
function memeReponse(gauche, droite) {
  if (gauche === droite) return true;
  if (typeof gauche === "boolean" || typeof droite === "boolean") {
    return String(gauche) === String(droite);
  }
  const a = Number(gauche);
  const b = Number(droite);
  if (Number.isFinite(a) && Number.isFinite(b)) return a === b;
  return texte(gauche) === texte(droite);
}

/**
 * Ce que l'ajout va faire, dit avant de le faire.
 *
 * Trois tas, et ils n'ont pas le même sort : ce que l'étude ignore s'ajoute, ce
 * qu'elle dit déjà pareil ne bouge pas, ce qu'elle dit autrement **s'affiche**
 * et ne bouge pas non plus. Une remise qui écrase en silence fait douter de
 * l'étude entière la première fois qu'on s'en aperçoit.
 */
export function planDeLaRemiseIncendie(reponses = {}, dejaLa = {}) {
  const etude = dejaLa && typeof dejaLa === "object" ? dejaLa : {};
  const neuves = {};
  const differentes = [];
  let identiques = 0;

  for (const [cle, valeur] of Object.entries(reponses ?? {})) {
    if (valeur === undefined || valeur === null || valeur === "") continue;
    if (!(cle in etude)) { neuves[cle] = valeur; continue; }
    if (memeReponse(etude[cle], valeur)) { identiques += 1; continue; }
    differentes.push({ cle, dansLEtude: etude[cle], dansLaDiscussion: valeur });
  }

  return {
    neuves,
    combienNeuves: Object.keys(neuves).length,
    differentes,
    identiques,
    // Rien à proposer : tout ce que la discussion a réuni, l'étude le disait
    // déjà. Le dire vaut mieux qu'un bouton qui ne fait rien.
    rienAFaire: Object.keys(neuves).length === 0 && differentes.length === 0
  };
}

/**
 * Ce que l'étude devient si l'on complète.
 *
 * Ce qui existe n'est pas touché : « ce qui a été décidé se conserve ».
 */
export function etudeCompletee(dejaLa = {}, plan = null) {
  return { ...(dejaLa && typeof dejaLa === "object" ? dejaLa : {}), ...(plan?.neuves ?? {}) };
}

/**
 * Le nom d'une étude ouverte depuis une discussion.
 *
 * Il dit d'où elle vient : trois semaines plus tard, « Étude du 4 septembre »
 * ne distingue pas ce qu'on a saisi à l'écran de ce qu'une conversation a
 * exploré.
 */
export function nomDeLEtudeVenueDuCopilote(le = new Date()) {
  const jour = le.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `Depuis une discussion — ${jour}`;
}
