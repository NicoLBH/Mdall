/**
 * Écrire du Mdall depuis du français, par le modèle.
 *
 * ## La consigne vit ici, et nulle part ailleurs
 *
 * Elle enseigne la grammaire de Mdall — ce qu'est une fonction, ce qu'un nom
 * doit porter, où chaque chose se range. **C'est du savoir-faire**, et elle ne
 * descend jamais dans le navigateur : celui-ci envoie une phrase en français et
 * reçoit des fichiers déjà relus.
 *
 * ## Deux façons d'écrire du Mdall, et une seule passe ici
 *
 * **Depuis une structure**, c'est déterministe et c'est déjà écrit :
 * `lignesDeLAssertion()` rend une valeur avec sa provenance, une règle avec ses
 * conditions. Le Copilote et les lectures de comptes rendus rendent des
 * structures ; les faire passer par un modèle reviendrait à payer une
 * transcription d'une chose qu'on possède, et à troquer un rendu certain contre
 * un rendu plausible.
 *
 * **Depuis de la prose**, il n'y a aucune structure à convertir : il faut en
 * inventer une. C'est le seul endroit où un modèle apporte quelque chose, et
 * c'est ce module.
 *
 * ## Ce qui revient est relu avant de partir
 *
 * Un modèle qui écrit du code écrit du code **plausible**. Rien dans sa réponse
 * ne distingue une fonction juste d'une fonction dont la condition porte sur un
 * nom que personne n'a déclaré. La fonction relit donc ce qu'il a écrit avec le
 * lecteur du projet, **avant** de répondre — c'est le même garde-fou que les
 * citations d'un compte rendu, et il ne coûte rien.
 */

/**
 * Les fichiers que le modèle a le droit d'écrire, et rien d'autre.
 *
 * **La liste est fermée.** Un nom inventé — `raisonnement.mdall`, `notes.txt` —
 * ne serait pas un fichier de trop : ce serait un fichier que le projet ne sait
 * pas ranger, et dont le contenu ne se verserait jamais. On préfère un refus
 * nommé à un fichier orphelin.
 */
export const FICHIERS_PERMIS = [
  "variables-du-projet.ref",
  "essai.ref",
  "essai.ddb"
];

/** Ce que chaque fichier porte, pour que la consigne n'ait pas à le redire. */
export const CE_QUE_PORTE = {
  "variables-du-projet.ref": "les déclarations de noms — ce que chaque nom désigne",
  "essai.ref": "les fonctions — le raisonnement, avec ses conditions",
  "essai.ddb": "les données de base — ce que l'ouvrage est"
};

/**
 * La forme de la réponse.
 *
 * Un fichier par entrée, et **son contenu entier** : demander des fragments à
 * recoller ferait deux idées de ce qu'est un fichier, la nôtre et la sienne.
 */
export const SCHEMA_DU_MDALL = {
  name: "mdall_ecrit",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["fichiers", "ce_que_je_nai_pas_su_ecrire"],
    properties: {
      fichiers: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["nom", "contenu"],
          properties: {
            nom: { type: "string", enum: FICHIERS_PERMIS },
            contenu: { type: "string" }
          }
        }
      },
      /**
       * Ce que le modèle n'a pas su mettre en Mdall.
       *
       * **On le lui demande explicitement**, parce que le silence est le mode de
       * défaillance le plus coûteux : une phrase du français qui disparaît sans
       * un mot laisse croire qu'elle a été codée. « Multiplie la surface par
       * 0,7 » n'a pas de forme en Mdall — le langage compare et conclut, il ne
       * calcule pas (fondamental 9) — et il faut que cela se dise.
       */
      ce_que_je_nai_pas_su_ecrire: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["phrase", "pourquoi"],
          properties: {
            phrase: { type: "string" },
            pourquoi: { type: "string" }
          }
        }
      }
    }
  }
};

/**
 * La grammaire, enseignée au modèle.
 *
 * Elle est longue parce que le langage a des règles qu'on ne devine pas, et
 * courte sur tout le reste : chaque phrase ici est une erreur qu'on a vue ou
 * qu'on attend.
 */
export const CONSIGNES = `Tu écris du **Mdall**, le langage d'un logiciel de mémoire de projet de construction.
On te donne une phrase ou un paragraphe en français. Tu rends des fichiers Mdall.

# Ce que Mdall fait, et ne fait pas

Mdall **compare, calcule et conclut**. Il n'a ni boucle, ni condition imbriquée.
Une loi qui ne s'écrit ni en conditions ni en calculs est un **agent**, qui
s'appelle et dont la loi n'est pas dans le fichier.

Ce qu'il calcule s'écrit avec \`calcule\` (voir plus bas) : les quatre
opérations, la puissance, les parenthèses, le pourcentage en suffixe, et sept
fonctions — \`racine\`, \`abs\`, \`arrondi\`, \`plafond\`, \`plancher\`, \`min\`, \`max\`.

Ce qu'il ne calcule pas : tout le reste. Une moyenne sur une liste, une
intégration, une recherche dans une table de mille lignes, une boucle. Si une
phrase en demande une, **ne l'invente pas** : mets-la dans
\`ce_que_je_nai_pas_su_ecrire\` avec la raison. Une arithmétique inventée est
indiscernable d'une arithmétique juste, et personne ne s'en apercevra.

# Les trois fichiers

- \`variables-du-projet.ref\` — ${CE_QUE_PORTE["variables-du-projet.ref"]}
- \`essai.ref\` — ${CE_QUE_PORTE["essai.ref"]}
- \`essai.ddb\` — ${CE_QUE_PORTE["essai.ddb"]}

Ne rends que les fichiers qui portent quelque chose. Un fichier vide n'a rien à
dire.

# Une déclaration de nom

\`\`\`
const Zone de vent = {
   type: "texte",
   valeurs possibles: "1" ou "2" ou "3" ou "4",
   description: "Zone de vent de la commune, au sens de l'annexe nationale de l'Eurocode 1.",
   utilisation: "Entrée de la vitesse de référence.",
};
\`\`\`

- \`type\` vaut \`"mesure"\`, \`"texte"\` ou \`"logique"\`. Une mesure porte en
  plus \`unité: "m"\`.
- \`valeurs possibles\` n'apparaît **que** si la phrase ferme la liste
  (« vaut 1, 2, 3 ou 4 »). Les valeurs se séparent par \` ou \`, entre
  guillemets. Ne l'invente jamais : une liste fermée qu'on suppose signalerait
  comme une faute la première valeur nouvelle et légitime.
- \`description\` et \`utilisation\` : ce que le nom désigne, et ce à quoi il
  sert. Si la phrase ne le dit pas, écris une description courte et honnête ;
  n'invente pas d'article de réglementation.

Déclare **un nom pour chaque entrée** qu'une fonction lit.

# Une fonction

\`\`\`
fonction Vitesse de référence(zones, Zone de vent) {
   // La vitesse de référence, tirée de la zone de vent.
   importe (variable: Zone de vent, depuis: variables-du-projet.ref, zones: zones);
   si (Zone de vent = "3")
   alors ("120 km/h");
   sinon ("100 km/h");
}
\`\`\`

- la signature porte \`zones\` en premier, puis **chaque nom que la fonction
  lit** ;
- un commentaire \`//\` dit à quoi elle sert, **dans** la fonction ;
- un \`importe\` par entrée ;
- \`si\`, puis \`et\` / \`ou\` / \`non\` / \`sauf si\` pour les clauses
  suivantes ; elles se lisent **de gauche à droite, sans priorité** ;
- \`alors (…)\` conclut ; \`sinon (…)\` est facultatif. **Sans \`sinon\`, une
  règle dont les conditions ne tiennent pas ne dit rien** — c'est parfois ce
  qu'on veut.
- comparateurs : \`=\` \`!=\` \`<=\` \`>=\` \`<\` \`>\` \`parmi\`
  \`renseigné\` \`non renseigné\`. Une mesure porte son unité :
  \`<= 28 m\`.

# Un calcul, dans une fonction

\`\`\`
fonction Prix TTC(zones, Prix HT) {
   // Le prix toutes taxes, au taux normal.
   importe (variable: Prix HT, depuis: variables-du-projet.ref, zones: zones);
   calcule TVA = Prix HT * 20%;
   calcule Prix TTC = Prix HT + TVA;
   si (Prix HT >= 0 €)
   alors (Prix TTC);
}
\`\`\`

- \`calcule <Nom> = <expression>;\` pose une valeur **pour cette fonction
  seule**. Elle se lit ensuite dans une condition et dans un \`alors\`, comme
  n'importe quel nom ;
- les \`calcule\` se posent **après les \`importe\`** et **avant le \`si\`**, dans
  l'ordre où ils se lisent : le second peut lire le premier ;
- **l'expression ne se met pas entre guillemets.** Ce n'est pas un texte ;
- signes : \`+\` \`-\` \`*\` \`/\` \`^\`, les parenthèses, et \`20%\` qui vaut
  \`0,2\` — écris \`Prix HT * 20%\`, jamais \`Prix HT * 0.2\` ;
- fonctions : \`racine\` \`abs\` \`arrondi\` \`plafond\` \`plancher\` \`min\` \`max\`.
  Leurs arguments se séparent d'un **point-virgule**, parce que la virgule est
  décimale : \`arrondi(Cote ; 2)\`, \`min(A ; B)\` ;
- **les unités doivent se composer.** \`3 m + 2\` est refusé, \`3 m * 2 m\` vaut
  des \`m²\`, \`2 m * 3 €\` est refusé. Écris l'unité sur chaque nombre qui en a
  une : \`Niveau du sol + 1 m\`, et non \`Niveau du sol + 1\` ;
- \`calcule\` n'écrit rien dans le projet : ce qui sort passe par \`alors\`,
  comme toujours.

# Une donnée de base

\`\`\`
Altitude du site = 890 m {
   document: relevé topographique du 12 mars 2026
      parce que: "cote NGF au droit du bâtiment A : 890,00 m"
   statut: retenu
}
\`\`\`

N'écris \`document:\`, \`texte:\` ou \`parce que:\` **que si la phrase les
donne**. Une provenance inventée est le pire de ce que tu peux produire : elle
sera citée six mois plus tard comme si elle existait.

# La forme

- l'indentation est de **trois espaces**, jamais une tabulation ;
- une ligne vide sépare deux blocs ;
- tout se tape au clavier : pas de \`§\`, pas de \`←\`, pas de \`≤\`.

# Ce qu'on attend de toi

Écris ce que la phrase dit, **et rien de plus**. Ce que tu n'as pas su écrire
se déclare ; ce que tu inventes ne se verra pas.`;

/**
 * Ce que le modèle a rendu, remis en fichiers.
 *
 * `null` quand rien ne s'en lit : on ne fabrique pas un brouillon vide qui se
 * lirait comme « le modèle n'a rien trouvé à dire ».
 */
export function fichiersDuModele(lu) {
  const rendus = Array.isArray(lu?.fichiers) ? lu.fichiers : [];
  const fichiers = rendus
    .map((fichier) => ({
      nom: String(fichier?.nom ?? "").trim(),
      contenu: String(fichier?.contenu ?? "")
    }))
    // Le schéma ferme déjà la liste des noms ; on la referme ici, parce qu'un
    // schéma se relâche le jour où quelqu'un le change et que ce module
    // resterait seul à savoir ce qui est permis.
    .filter((fichier) => FICHIERS_PERMIS.includes(fichier.nom) && fichier.contenu.trim());

  return fichiers.length ? fichiers : null;
}

/** Ce que le modèle déclare ne pas avoir su écrire, nettoyé. */
export function lacunesDuModele(lu) {
  return (Array.isArray(lu?.ce_que_je_nai_pas_su_ecrire) ? lu.ce_que_je_nai_pas_su_ecrire : [])
    .map((lacune) => ({
      phrase: String(lacune?.phrase ?? "").trim(),
      pourquoi: String(lacune?.pourquoi ?? "").trim()
    }))
    .filter((lacune) => lacune.phrase);
}
