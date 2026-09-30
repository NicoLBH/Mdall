/**
 * Ce qu'on demande à la base quand on lit une ligne de document.
 *
 * ## Le défaut que cette liste existe pour empêcher
 *
 * L'onglet Fichiers lit la table `documents` **à deux endroits** : une fois
 * pour le projet entier, une fois pour le répertoire courant. Les deux
 * écrivaient leur liste de colonnes à la main, et elles ont divergé.
 *
 * Celle du projet entier avait perdu `piece_du_message` et les colonnes de
 * mail. Conséquence visible : dans un échange, **les pastilles de pièces
 * jointes n'étaient pas cliquables**. L'appariement cherchait les lignes dont
 * `pieceDuMessage` désigne le message, ne trouvait rien — la colonne n'avait
 * pas été demandée, donc elle valait `undefined` partout — et chaque pastille
 * sortait sans identifiant, c'est-à-dire en simple libellé.
 *
 * Et la date d'une pièce jointe repartait sur celle du dépôt, pour la même
 * raison : `mail_quand` du message porteur n'était pas là non plus.
 *
 * Rien de tout cela ne se voit en lisant le code des deux côtés : chacun est
 * juste. C'est leur écart qui ne l'est pas — une valeur écrite à deux endroits
 * finit par diverger (règle 4).
 *
 * ## Ce que ce module est
 *
 * Une liste, et un seul endroit où elle vit. Ajouter une colonne ici la donne
 * aux deux lectures d'un coup, ce qui est exactement le comportement qu'on veut
 * : une colonne qu'un écran lit et que l'autre ignore est un défaut en attente.
 */

/** Ce qu'une ligne de document porte, et que les écrans lisent. */
export const LES_COLONNES_DUN_DOCUMENT = [
  "id",
  "project_id",
  "folder_id",
  "filename",
  "original_filename",
  "mime_type",
  "storage_bucket",
  "storage_path",
  "document_kind",
  "upload_status",
  "created_at",
  "updated_at",
  "deleted_at",
  "deposant",
  // Ce qu'un mail porte sur sa ligne : de qui, de quoi, quand, combien de
  // pièces, et de quel échange (`la-ligne-dun-mail.js`).
  "mail_de",
  "mail_objet",
  "mail_quand",
  "mail_pieces",
  "mail_fil",
  // D'où vient une pièce jointe, et si c'est une image du corps du message.
  // **Sans elles, une pièce ne retrouve pas son message** : ni pour s'ouvrir
  // depuis le fil, ni pour porter sa date.
  "piece_du_message",
  "piece_dans_le_texte",
  // Ce que Mdall a reconnu du document.
  "detection_status",
  "detection_reason",
  "detected_kind",
  "detected_kind_label",
  "detected_author",
  "detection_confidence",
  "content_fingerprint",
  "duplicate_of_document_id",
  "reissue_of_document_id",
  // Son rapport à la mémoire et à la proposition par laquelle il est entré.
  "corpus_state",
  "proposition_id",
  "transcribed_at"
];

/** La même liste, telle que PostgREST l'attend. */
export const LE_SELECT_DUN_DOCUMENT = LES_COLONNES_DUN_DOCUMENT.join(",");
