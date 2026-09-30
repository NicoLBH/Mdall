/**
 * Évaluer **pour de vrai** chaque module d'écran, imports bouchonnés.
 *
 * ## Le défaut que ce banc existe pour attraper
 *
 * `projects-list.js` est parti en production avec :
 *
 *     const projectListUiState = { rangement: RANGEMENT.EN_COURS, … };
 *
 * et **pas d'import de `RANGEMENT`**. C'est du JavaScript parfaitement valide :
 * `RANGEMENT` pourrait être une variable globale. Rien ne pouvait le voir — ni
 * les épreuves, ni la batterie de mutations, ni les trois constructions, ni
 * `syntaxe-du-navigateur`, qui **analyse sans exécuter**. L'écran des projets
 * ne s'affichait plus du tout.
 *
 * C'est la deuxième fois qu'un import manquant part ainsi.
 *
 * ## Pourquoi on ne peut pas simplement `import()` ces modules
 *
 * Soixante-six modules de `apps/web/js` importent `assets/js/auth.js`, qui vient
 * du CDN de Supabase : Node ne sait pas le résoudre, et la suite entière
 * échouerait avant d'avoir rien éprouvé.
 *
 * `vm.SourceTextModule` laisse **tenir soi-même l'éditeur de liens** : on rend
 * pour chaque import un module de synthèse qui exporte exactement les noms
 * demandés. Le graphe se résout donc sans réseau, sans `node_modules`, et sans
 * dépendance nouvelle.
 *
 * ## Ce qu'on éprouve, et ce qu'on ne bouchonne surtout pas
 *
 * Que le **corps de premier niveau** de chaque module s'exécute sans lever.
 *
 * Les variables globales du navigateur sont fournies **nommément** :
 * `document`, `window`, et une trentaine d'autres. Surtout **pas** un objet
 * attrape-tout — un `Proxy` qui répondrait à n'importe quel nom ferait résoudre
 * `RANGEMENT` et annulerait tout l'intérêt du banc. Un nom qui n'est ni importé,
 * ni déclaré, ni dans cette liste lève, et c'est précisément ce qu'on cherche.
 *
 * Un module qui ferait du réseau ou dessinerait à l'import échouerait aussi — et
 * ce serait une information : un module d'écran ne doit rien faire avant qu'on
 * le lui demande.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VUES = path.join(RACINE, "apps", "web", "js", "views");

/** Tous les modules d'écran, en chemins absolus. */
function lesEcrans(dossier = VUES, trouves = []) {
  for (const nom of readdirSync(dossier).sort()) {
    const complet = path.join(dossier, nom);
    if (statSync(complet).isDirectory()) { lesEcrans(complet, trouves); continue; }
    if (nom.endsWith(".js")) trouves.push(complet);
  }
  return trouves;
}

/**
 * Les noms qu'un module demande à un autre, par ce dont il les demande.
 *
 * Lu à la ligne plutôt qu'au parseur : ces modules écrivent leurs imports comme
 * tout le monde, et un parseur complet serait une dépendance de plus pour la
 * même réponse.
 *
 * **`export … from` compte autant qu'un `import`.** Deux écrans réexportent ce
 * qu'ils tiennent d'ailleurs, et l'oublier faisait échouer leur chargement sur
 * « does not provide an export named … » — un défaut du banc, pas du code.
 */
export function lesNomsImportes(source) {
  const par = new Map();
  const poser = (ou, noms) => {
    if (!par.has(ou)) par.set(ou, new Set());
    for (const nom of noms) par.get(ou).add(nom);
  };
  const desAccolades = (dedans) => dedans.split(",")
    .map((morceau) => morceau.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean);

  const IMPORTE =
    /import\s+(?:([\w$]+)\s*,\s*)?(?:\{([^}]*)\}|\*\s+as\s+([\w$]+)|([\w$]+))?\s*(?:from\s*)?["']([^"']+)["']/g;
  for (const trouve of String(source ?? "").matchAll(IMPORTE)) {
    const [, avantVirgule, accolades, , seul, ou] = trouve;
    const noms = [];
    if (avantVirgule || seul) noms.push("default");
    if (accolades) noms.push(...desAccolades(accolades));
    // `import * as ns` et `import "…"` n'exigent aucun nom précis.
    poser(ou, noms);
  }

  // `export { a, b } from "…"` et `export * from "…"`.
  const REEXPORTE = /export\s+(?:\{([^}]*)\}|\*(?:\s+as\s+[\w$]+)?)\s*from\s*["']([^"']+)["']/g;
  for (const trouve of String(source ?? "").matchAll(REEXPORTE)) {
    const [, accolades, ou] = trouve;
    poser(ou, accolades ? desAccolades(accolades) : []);
  }

  return par;
}

/**
 * **Deux modules que le banc doit juger, à chaque passage.**
 *
 * Un banc qui ne trouve rien ne prouve rien : il peut être juste, ou aveugle
 * (règle 12). Rendre une globale attrape-tout, ou lier sans évaluer, le rend
 * aveugle **sans rien changer à ce qu'il rend** tant que le code est sain —
 * deux mutations ont survécu ainsi.
 *
 * Ces deux témoins ferment cela. Ils passent par le même contexte, le même
 * éditeur de liens et la même évaluation que les écrans. Le premier porte
 * exactement le défaut parti deux fois en production : un nom référencé au
 * premier niveau et jamais importé. Le second est le même module, l'import en
 * place. Le banc doit signaler le premier et se taire sur le second ; s'il se
 * tait sur les deux, c'est lui qui est cassé.
 */
export const LES_TEMOINS = {
  nomJamaisImporte: `
    import { rendre } from "./ui/un-tableau.js";
    const etat = { rangement: RANGEMENT_DU_TEMOIN.EN_COURS };
    export function monter() { return rendre(etat); }
  `,
  nomBienImporte: `
    import { rendre } from "./ui/un-tableau.js";
    import { RANGEMENT_DU_TEMOIN } from "../services/un-rangement.js";
    const etat = { rangement: RANGEMENT_DU_TEMOIN.EN_COURS };
    export function monter() { return rendre(etat); }
  `
};

/**
 * Les globales du navigateur, nommées une par une.
 *
 * **Jamais un attrape-tout.** Voir l'en-tête : c'est ce qui fait la différence
 * entre un banc et une passoire.
 */
function desGlobalesDeNavigateur() {
  const rien = () => {};
  const noeud = () => ({
    style: { setProperty: rien, removeProperty: rien },
    classList: { add: rien, remove: rien, toggle: rien, contains: () => false },
    dataset: {}, children: [], appendChild: rien, removeChild: rien,
    setAttribute: rien, removeAttribute: rien, getAttribute: () => null,
    addEventListener: rien, removeEventListener: rien, querySelector: () => null,
    querySelectorAll: () => [], closest: () => null, focus: rien, remove: rien,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    innerHTML: "", textContent: "", value: ""
  });

  const document = {
    ...noeud(),
    documentElement: noeud(), body: noeud(), head: noeud(),
    createElement: noeud, createTextNode: noeud, getElementById: () => null,
    createDocumentFragment: noeud, readyState: "complete", cookie: "",
    scrollingElement: noeud()
  };

  const window = {
    document, location: { hash: "", href: "https://banc.local/", search: "" },
    addEventListener: rien, removeEventListener: rien, dispatchEvent: rien,
    matchMedia: () => ({ matches: false, addEventListener: rien, removeEventListener: rien }),
    getComputedStyle: () => ({ getPropertyValue: () => "", overflow: "", position: "" }),
    scrollTo: rien, innerHeight: 900, innerWidth: 1280, scrollY: 0, devicePixelRatio: 1,
    localStorage: { getItem: () => null, setItem: rien, removeItem: rien, clear: rien },
    sessionStorage: { getItem: () => null, setItem: rien, removeItem: rien, clear: rien },
    alert: rien, confirm: () => false, prompt: () => null, open: () => null
  };
  window.self = window;
  window.top = window;

  return {
    console, URL, URLSearchParams, Math, JSON, Date, Promise, Symbol, Proxy, Reflect,
    Array, Object, String, Number, Boolean, RegExp, Map, Set, WeakMap, WeakSet,
    Error, TypeError, RangeError, SyntaxError, Intl, BigInt, globalThis: undefined,
    parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent,
    encodeURI, decodeURI, atob: (un) => Buffer.from(String(un), "base64").toString("binary"),
    btoa: (un) => Buffer.from(String(un), "binary").toString("base64"),
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    requestAnimationFrame: (quoi) => setTimeout(quoi, 0), cancelAnimationFrame: () => {},
    TextEncoder, TextDecoder, structuredClone, AbortController, Blob, crypto,
    Uint8Array, Uint16Array, Uint32Array, Int32Array, Float64Array, DataView, ArrayBuffer,
    fetch: async () => ({ ok: false, status: 0, json: async () => null, text: async () => "" }),
    document, window, navigator: { userAgent: "banc", language: "fr-FR", clipboard: {} },
    location: window.location, localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    getComputedStyle: window.getComputedStyle, matchMedia: window.matchMedia,
    alert: () => {}, requestIdleCallback: (quoi) => setTimeout(quoi, 0),
    Event: class Event {}, CustomEvent: class CustomEvent {},
    HTMLElement: class HTMLElement {}, Node: class Node {},
    FormData: class FormData {}, File: class File {}, FileReader: class FileReader {},
    DOMParser: class DOMParser { parseFromString() { return document; } },
    IntersectionObserver: class IntersectionObserver { observe() {} disconnect() {} },
    ResizeObserver: class ResizeObserver { observe() {} disconnect() {} },
    MutationObserver: class MutationObserver { observe() {} disconnect() {} }
  };
}

/**
 * Charge chaque écran et rend ceux qui lèvent.
 *
 * @returns {Promise<{sansVm: boolean, combien: number, fautes: string[],
 *                    temoins: Record<string, string|null>}>}
 */
export async function lesEcransQuiNeChargentPas() {
  const vm = await import("node:vm");
  // `vm.SourceTextModule` n'existe que sous `--experimental-vm-modules`.
  if (typeof vm.SourceTextModule !== "function") {
    return { sansVm: true, combien: 0, fautes: [], temoins: {} };
  }

  const contexte = vm.createContext(desGlobalesDeNavigateur());
  const sources = new Map();
  const fautes = [];
  const ecrans = lesEcrans();

  /**
   * Ce qu'un import bouchonné vaut : **quelque chose qui se laisse faire**.
   *
   * `undefined` ne convient pas : un module qui écrit `LES_TONS.DISCUSSION` ou
   * `svgIcon("x")` au premier niveau lèverait — et l'on croirait à un import
   * oublié là où il n'y en a pas. Ce bouchon répond à tout : on l'appelle, on
   * le construit, on le parcourt, on lit n'importe quelle propriété.
   *
   * **Cela n'affaiblit pas le banc.** Seuls les noms *importés* deviennent
   * permissifs ; un nom qui n'est ni importé, ni déclaré, ni une globale
   * nommée reste introuvable et lève. C'est exactement le défaut qu'on cherche.
   */
  const permissif = () => new Proxy(function bouchonne() {}, {
    get(cible, cle) {
      if (cle === Symbol.toPrimitive) return () => "";
      if (cle === Symbol.toStringTag) return "Bouchon";
      if (cle === Symbol.iterator) return function* rien() {};
      if (cle === "toString" || cle === "valueOf") return () => "";
      if (cle === "then") return undefined; // sans quoi tout `await` s'enliserait
      if (cle === "length" || cle === "size") return 0;
      if (cle === "name") return "bouchonne";
      return permissif();
    },
    apply: () => permissif(),
    construct: () => permissif(),
    has: () => true
  });

  /** Un module de synthèse qui exporte exactement ce qu'on lui demande. */
  const bouchon = (noms) => {
    const tous = [...new Set([...noms, "default"])];
    return new vm.SyntheticModule(tous, function poser() {
      for (const nom of tous) this.setExport(nom, permissif());
    }, { context: contexte });
  };

  const lier = (specifier, referencing) => {
    const demandes = lesNomsImportes(sources.get(referencing) ?? "").get(specifier);
    return bouchon(demandes ? [...demandes] : []);
  };

  /** Ce qu'un module lève, ou `null`. Le seul chemin : témoins compris. */
  const evaluer = async (nom, source) => {
    try {
      const module = new vm.SourceTextModule(source, { context: contexte, identifier: nom });
      sources.set(module, source);
      await module.link(lier);
      await module.evaluate();
      return null;
    } catch (erreur) {
      return `${nom} — ${erreur?.message ?? erreur}`;
    }
  };

  for (const chemin of ecrans) {
    const faute = await evaluer(path.relative(RACINE, chemin), readFileSync(chemin, "utf8"));
    if (faute) fautes.push(faute);
  }

  const temoins = {};
  for (const [nom, source] of Object.entries(LES_TEMOINS)) {
    temoins[nom] = await evaluer(`témoin ${nom}`, source);
  }

  return { sansVm: false, combien: ecrans.length, fautes, temoins };
}
