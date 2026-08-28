-- Identité documentaire et doublons.
--
-- Le nom de fichier ne fait pas l'identité d'un document : le même rapport
-- déposé sous deux noms est un seul document. Ce qui le distingue, c'est ce
-- qu'il déclare de lui-même — sa référence, déjà lue et stockée à l'étape
-- précédente — et son contenu.
--
-- La table porte depuis l'origine un `sha256_hash`, condensé du *fichier*. Il
-- ne peut pas servir ici et n'est pas touché : un même rapport ré-exporté ou
-- ré-imprimé en PDF n'a pas les mêmes octets, et passerait pour un document
-- nouveau. C'est son texte qui est stable, et c'est de lui qu'on prend
-- l'empreinte.
--
-- Migration strictement additive : aucune colonne existante n'est modifiée ni
-- supprimée. Comme la reconnaissance, l'identité est générique — un compte
-- rendu de chantier déposé deux fois se traitera exactement de même.

alter table public.documents
  -- Condensé du texte extrait, blancs réduits. Ce qui ne varie pas d'un export
  -- à l'autre du même document.
  add column if not exists content_fingerprint text,
  -- Le même document, sous un autre nom. Il est conservé — jamais supprimé,
  -- jamais écarté en silence — et renvoie à celui qui l'a précédé.
  add column if not exists duplicate_of_document_id uuid references public.documents(id) on delete set null,
  -- Même référence déclarée, contenu différent : une réédition corrigée, une
  -- version 2 qui ne dit pas son nom. Les deux sont conservés et le lien est
  -- signalé ; c'est l'utilisateur qui tranchera, pas l'outil.
  add column if not exists reissue_of_document_id uuid references public.documents(id) on delete set null;

-- La question posée à chaque dépôt : « ce contenu est-il déjà là ? ».
create index if not exists documents_project_fingerprint_idx
  on public.documents (project_id, content_fingerprint)
  where deleted_at is null and content_fingerprint is not null;

-- Et son pendant : « cette référence est-elle déjà là ? ».
create index if not exists documents_project_declared_reference_idx
  on public.documents (project_id, declared_reference)
  where deleted_at is null and declared_reference is not null;
