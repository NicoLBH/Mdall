-- Reconnaissance des documents.
--
-- Mdall recevra des comptes rendus de chantier, des notices de sécurité, des
-- plans — et à terme un simple courriel devra suffire à les y faire entrer. La
-- nature d'un document est donc une propriété générique de tout document, pas
-- une spécificité de tel ou tel métier : ces colonnes vivent sur `documents`,
-- et aucune n'est propre au contrôle technique.
--
-- Migration strictement additive : aucune colonne existante n'est modifiée ni
-- supprimée, et les lignes déjà présentes restent valides avec des colonnes à
-- null — une reconnaissance non faite n'est pas une reconnaissance négative.

alter table public.documents
  -- Le verdict, et la raison écrite pour être lue par un humain. Un refus qui
  -- ne dit pas pourquoi n'apprend rien à celui qui l'a sous les yeux.
  add column if not exists detection_status text,
  add column if not exists detection_reason text,
  -- La preuve : la ligne qui a permis de l'affirmer, et sa page. Un verdict
  -- sans preuve ne vaut pas mieux qu'une intuition.
  add column if not exists detection_evidence jsonb,
  add column if not exists detection_confidence text,
  -- La famille (ct_report, …) et le libellé précis (« Rapport initial (RICT) »).
  -- La première sert aux traitements, le second à la lecture.
  add column if not exists detected_kind text,
  add column if not exists detected_kind_label text,
  add column if not exists detected_author text,
  add column if not exists detected_at timestamptz,
  -- Qui a reconnu, et dans quelle version. Sans cela, face à un écart, on ne
  -- saura jamais s'il vient du document ou d'une correction de la veille.
  add column if not exists detector text,
  add column if not exists detector_version text,
  -- Ce que le document déclare de lui-même : sa référence et sa date. Ce sont
  -- ces valeurs, et non le nom de fichier, qui feront son identité.
  add column if not exists declared_reference text,
  add column if not exists issued_at date;

alter table public.documents
  drop constraint if exists documents_detection_status_check;

alter table public.documents
  add constraint documents_detection_status_check
  check (
    detection_status is null
    or detection_status in (
      'RECOGNIZED',
      'RECOGNIZED_WITHOUT_CONTENT',
      'UNRECOGNIZED',
      'NO_TEXT_LAYER'
    )
  );

alter table public.documents
  drop constraint if exists documents_detection_confidence_check;

alter table public.documents
  add constraint documents_detection_confidence_check
  check (detection_confidence is null or detection_confidence in ('certain', 'probable'));

-- Rassembler les livrables d'une nature donnée dans un projet est la question
-- que tout atelier posera : « quels documents sais-tu exploiter ici ? ».
create index if not exists documents_project_detected_kind_idx
  on public.documents (project_id, detected_kind)
  where deleted_at is null;
