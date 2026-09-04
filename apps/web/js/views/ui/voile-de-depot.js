/**
 * Le voile qui s'affiche quand on survole une zone avec un fichier.
 *
 * ## Pourquoi une image, et pas seulement une phrase
 *
 * « Déposez ici » sur un cadre en pointillés dit ce qu'on peut faire ; les trois
 * cartes qui se chevauchent le disent avant qu'on lise. Un dépôt se décide en
 * une demi-seconde, le pointeur déjà en l'air : à ce moment-là on ne lit pas, on
 * reconnaît. C'est la convention de toutes les interfaces qui acceptent un
 * fichier, et s'en écarter oblige à réapprendre ce qu'on savait déjà.
 *
 * ## Le cadre est gris, comme les autres
 *
 * Il l'était en orange ici et en bleu ailleurs, pour la même action. Une couleur
 * d'accent sur un cadre de dépôt promet quelque chose de particulier ; il n'y a
 * rien de particulier — c'est un dépôt de fichier, comme les autres.
 *
 * Les couleurs vives restent sur les trois cartes, où elles distinguent les
 * types de pièces plutôt que d'alerter.
 */

import { escapeHtml } from "../../utils/escape-html.js";

/** Les trois cartes qui se chevauchent : un dessin, une image, un document. */
function cartes() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="226" height="103" viewBox="0 0 226 103"
      fill="none" aria-hidden="true" focusable="false" class="depot-voile__cartes">
      <path fill="rgba(35,134,54,.16)" fill-rule="evenodd" clip-rule="evenodd"
        d="M56.66 10.322v.002l16.824 7.846L92.44 70.254a8.75 8.75 0 0 1-5.23 11.217l-37.009 13.47a8.75 8.75 0 0 1-11.217-5.23L18.531 33.512a8.75 8.75 0 0 1 5.23-11.217z"/>
      <path fill="rgb(35, 134, 54)" fill-rule="evenodd" clip-rule="evenodd" opacity=".55"
        d="m55.29 10.822.802-.293a1.46 1.46 0 0 1 1.116.049l15.73 7.335c.35.163.62.459.753.822l.294.804 18.458 50.715a8.75 8.75 0 0 1-5.23 11.217l-37.008 13.47a8.75 8.75 0 0 1-11.218-5.23L18.533 33.512a8.75 8.75 0 0 1 5.231-11.217zm.997 2.74L24.762 25.038a5.835 5.835 0 0 0-3.487 7.478l20.454 56.198a5.835 5.835 0 0 0 7.478 3.487l37.008-13.47a5.835 5.835 0 0 0 3.487-7.478L71.243 20.537l-5.482 1.996a5.82 5.82 0 0 1-4.461-.195 5.82 5.82 0 0 1-3.017-3.293z"/>
      <path fill="rgb(35, 134, 54)" fill-rule="evenodd" clip-rule="evenodd"
        d="M64.035 44.691c-.703 2.448-1.974 5.334-3.06 7.703-.93 2.029-1.94 3.575-2.932 4.66a5.46 5.46 0 0 1 .165 4.949c-.376.806-1.116 1.478-1.841 2.006-.754.549-1.631 1.04-2.446 1.445a31 31 0 0 1-3.066 1.318l-.053.02-.015.004-.004.002h-.002a1.095 1.095 0 0 1-1.388-.647v-.002l-.002-.004-.006-.015-.02-.053-.07-.196a30.973 30.973 0 0 1-.89-2.999c-.214-.885-.402-1.872-.466-2.803-.062-.895-.022-1.894.354-2.7a5.46 5.46 0 0 1 3.883-3.052c.178-1.474.697-3.268 1.635-5.314 1.092-2.383 2.494-5.198 3.94-7.294.718-1.039 1.498-1.978 2.313-2.587.804-.603 1.896-1.056 3.022-.53 1.134.53 1.46 1.673 1.497 2.667.037 1.011-.2 2.208-.548 3.422m-9.653 9.647a5.5 5.5 0 0 1 2.228 1.035c.515-.598 1.067-1.388 1.623-2.394l-3.1-1.445c-.397 1.08-.635 2.02-.751 2.804m7.55-10.25c-.61 2.121-1.702 4.662-2.733 6.928l-3.212-1.498c1.049-2.259 2.309-4.736 3.565-6.556.672-.973 1.292-1.682 1.823-2.08.541-.404.74-.318.783-.297h.003c.026.012.21.096.235.764.024.663-.136 1.594-.464 2.739m-8.986 19.408c-.682.34-1.342.627-1.862.84a29 29 0 0 1-.553-1.966c-.198-.823-.357-1.68-.41-2.441-.054-.796.02-1.336.155-1.625a3.282 3.282 0 1 1 5.949 2.774c-.135.29-.5.693-1.146 1.162-.617.45-1.375.878-2.133 1.256"/>

      <path fill="rgba(191,75,138,.16)" fill-rule="evenodd" clip-rule="evenodd"
        d="M198.941 19.499 166.042 7.525a8.75 8.75 0 0 0-11.217 5.23L134.37 68.953a8.75 8.75 0 0 0 5.231 11.217l37.008 13.47a8.75 8.75 0 0 0 11.217-5.231l18.959-52.089z"/>
      <path fill="rgb(191, 75, 138)" fill-rule="evenodd" clip-rule="evenodd" opacity=".55"
        d="m197.568 19.003.803.292c.363.132.659.404.823.754l7.335 15.73c.163.35.181.751.049 1.114l-.293.805-18.458 50.715a8.75 8.75 0 0 1-11.217 5.23l-37.008-13.47a8.75 8.75 0 0 1-5.231-11.217l20.454-56.197a8.75 8.75 0 0 1 11.217-5.23zm-.998 2.741L165.045 10.27a5.836 5.836 0 0 0-7.479 3.487l-20.454 56.197a5.834 5.834 0 0 0 3.487 7.478l37.008 13.47a5.836 5.836 0 0 0 7.479-3.487L203.544 36.7l-5.483-1.995a5.82 5.82 0 0 1-3.292-3.017 5.82 5.82 0 0 1-.195-4.461z"/>
      <path fill="rgb(191, 75, 138)" fill-rule="evenodd" clip-rule="evenodd"
        d="M179.168 44.01a2.553 2.553 0 0 1 3.393 1.235l.946 2.03a2.55 2.55 0 0 1-1.235 3.392l-16.096 7.506a2.55 2.55 0 0 1-1.259.232l-4.919-.348a1.094 1.094 0 0 1-.808-1.734l2.894-3.992c.255-.351.595-.632.988-.815zm1.41 2.16a.365.365 0 0 0-.485-.177l-2.36 1.1 1.254 2.692 2.361-1.101a.365.365 0 0 0 .176-.485zm-3.574 4.54-1.254-2.692-11.753 5.48a.36.36 0 0 0-.141.117l-1.739 2.399 2.955.209a.36.36 0 0 0 .18-.033z"/>

      <path fill="rgba(31,111,235,.16)" fill-rule="evenodd" clip-rule="evenodd"
        d="M128.059 0H93.052A8.75 8.75 0 0 0 84.3 8.752v59.804a8.75 8.75 0 0 0 8.752 8.751h39.383a8.75 8.75 0 0 0 8.751-8.751v-55.43z"/>
      <path fill="rgb(31, 111, 235)" fill-rule="evenodd" clip-rule="evenodd" opacity=".55"
        d="M126.6 0h.855c.386 0 .757.154 1.031.427L140.758 12.7c.274.273.427.644.428 1.03v54.826a8.75 8.75 0 0 1-8.751 8.751H93.052a8.75 8.75 0 0 1-8.752-8.751V8.752A8.75 8.75 0 0 1 93.052 0zm0 2.917H93.052a5.835 5.835 0 0 0-5.835 5.835v59.804a5.835 5.835 0 0 0 5.835 5.834h39.383a5.834 5.834 0 0 0 5.834-5.834v-53.97h-5.834a5.82 5.82 0 0 1-4.126-1.709 5.82 5.82 0 0 1-1.709-4.125z"/>
      <path fill="rgb(31, 111, 235)" fill-rule="evenodd" clip-rule="evenodd"
        d="M104.354 31.356a.364.364 0 0 0-.364.365v15.315c0 .202.163.365.364.365h1.373l.042-.045 8.864-8.864c.962-.962 2.509-1 3.518-.088l4.801 4.344V31.72a.365.365 0 0 0-.365-.365zM122.587 47.4h-13.768l7.361-7.362a.365.365 0 0 1 .503-.013l6.269 5.672v1.338a.365.365 0 0 1-.365.365m2.553-.365V31.721a2.553 2.553 0 0 0-2.553-2.553h-18.233a2.553 2.553 0 0 0-2.552 2.553v15.315a2.553 2.553 0 0 0 2.552 2.553h18.233a2.553 2.553 0 0 0 2.553-2.553m-15.316-10.575a.729.729 0 1 1-1.458 0 .729.729 0 0 1 1.458 0m2.188 0a2.917 2.917 0 1 1-5.834 0 2.917 2.917 0 0 1 5.834 0"/>
    </svg>`;
}

/**
 * Le voile d'une zone de dépôt.
 *
 * @param {string} mot ce qu'on dépose ici, en une phrase
 * @returns {string} le HTML du voile, à poser dans la zone
 */
export function renderVoileDeDepot(mot = "Déposez vos fichiers") {
  return `
    <div class="depot-voile" aria-hidden="true">
      <div class="depot-voile__contenu">
        ${cartes()}
        <p class="depot-voile__mot">${escapeHtml(mot)}</p>
      </div>
    </div>`;
}
