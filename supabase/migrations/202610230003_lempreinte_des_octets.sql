-- Un document dépouillé sait de quels octets il vient.
--
-- POURQUOI UNE COLONNE DE PLUS, ALORS QUE LA TABLE EN PORTE DÉJÀ DEUX
--
-- `documents` porte `sha256_hash` et `content_fingerprint`. Aucune des deux ne
-- convient, et il a fallu les regarder pour le savoir :
--
--   * `sha256_hash` est bien le condensé du fichier, mais il porte un index
--     **unique global** (`idx_documents_sha256_hash_unique`, posé à
--     l'initialisation). Deux chantiers qui reçoivent le même plan — ce qui est
--     le cas ordinaire d'un bureau d'études — ne pourraient pas le déposer tous
--     les deux : le second échouerait sur une contrainte dont le message ne
--     parlerait ni de projet ni de plan ;
--
--   * `content_fingerprint` est l'empreinte du **texte** d'un document, et c'est
--     délibéré : un rapport ré-exporté n'a pas les mêmes octets et reste le même
--     rapport (`document-identity.js`). Y écrire un condensé d'octets ferait dire
--     à cette colonne deux choses selon la ligne — exactement la divergence que
--     la règle 4 nomme.
--
-- Un mail et une pièce jointe, eux, s'identifient par leurs octets et par rien
-- d'autre : « Plan.pdf » désigne quinze plans sur un chantier, et le même plan
-- voyage sous trois noms (`le-dedoublonnage.js`). D'où cette colonne, et un
-- index **par projet** : le même plan peut arriver dans deux chantiers, et le
-- même plan attaché à quinze réponses d'un même chantier n'entre qu'une fois.
--
-- CE QU'ELLE N'EST PAS
--
-- Pas une contrainte. Un `unique` interdirait ce qu'on veut seulement éviter :
-- un second exemplaire est un gaspillage, pas une faute, et une contrainte
-- ferait échouer un versement de deux cents mails sur son cent-quatrième — sans
-- que rien ne dise lequel. Le dépôt demande donc d'abord ce qui est déjà là, et
-- l'index est là pour que cette question reste instantanée.
--
-- Strictement additive : une colonne qui accepte le vide, et un index.

alter table public.documents
  add column if not exists empreinte_des_octets text;

comment on column public.documents.empreinte_des_octets is
  'Condensé SHA-256 des octets du fichier, pour les documents issus d''un dépouillement de mails. Vide partout ailleurs : un rapport ré-exporté reste le même rapport, et c''est content_fingerprint qui le dit.';

-- Par projet, et seulement là où la colonne est remplie : l'index reste petit,
-- et il répond à la seule question qu'on lui pose — « ce chantier a-t-il déjà
-- ces octets-là ? ».
create index if not exists documents_empreinte_des_octets_idx
  on public.documents(project_id, empreinte_des_octets)
  where empreinte_des_octets is not null;
