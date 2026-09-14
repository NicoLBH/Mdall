-- La transcription d'un document vit **avec lui**, et non à côté.
--
-- ## Ce qu'on vient de défaire
--
-- La restitution d'un compte rendu était déposée comme un **second fichier** —
-- `CR_07.md` à côté de `CR_07.pdf`. C'était commode à écrire, et faux à lire :
-- l'arbre des Fichiers montrait deux entrées pour un seul document, et il
-- fallait savoir laquelle ouvrir. Le pas suivant l'aurait rangée dans la
-- Mémoire, ce qui aurait été pire : `Mémoire/` n'est pas un dossier où l'on
-- dépose, c'est ce que le projet **sait** — et l'on aurait fini par confondre
-- « garder un document » et « savoir quelque chose », les deux étant de la
-- mémoire au sens courant du mot.
--
-- Il n'y a donc qu'un endroit : **le document lui-même**. Le PDF est dans
-- Fichiers, sa transcription est sur sa ligne, et l'écran montre l'une ou
-- l'autre selon ce qu'on veut lire.
--
-- ## Pourquoi une colonne, et pas une table
--
-- Une transcription n'existe pas sans son document, n'en a qu'une, et meurt
-- avec lui. Une table à part aurait ajouté une clé étrangère, une politique de
-- sécurité et une jointure pour porter un texte qui appartient à une ligne
-- (règle 10). La politique des documents s'applique donc inchangée : qui peut
-- lire le PDF peut lire sa transcription, et personne d'autre.
--
-- ## Ce qu'on n'écrit pas ici
--
-- Rien de ce que la lecture a *compris* — ni points, ni lots, ni sujets. Cela
-- se recalcule, et le figer en ferait une réponse périmée au versement suivant
-- (`docs/fondamentaux.md`, règle 4). Seul le texte du document refait est
-- rangé : c'est une transcription, pas une conclusion.
--
-- Strictement additive : deux colonnes, aucune table, aucune politique, aucune
-- contrainte modifiée.

begin;

alter table public.documents
  -- Le document refait, en Markdown, avec ses marqueurs de page
  -- (`<!-- page 3 -->`). Sans eux, le texte relu n'aurait plus de lecture
  -- « Origine », plus de mesure par page, et plus rien à confronter au PDF.
  add column if not exists transcription_markdown text,
  -- Quand elle a été faite. Une transcription sans date ne se compare pas à une
  -- version plus récente du procédé, et l'on ne sait pas s'il faut la refaire.
  add column if not exists transcribed_at timestamptz;

comment on column public.documents.transcription_markdown is
  'Le document refait en Markdown, marqueurs de page compris. Vit avec son document : qui peut lire le fichier peut lire sa transcription.';

comment on column public.documents.transcribed_at is
  'Quand la transcription a été faite. Sert à savoir s''il faut la refaire, pas à décider si elle correspond — c''est l''empreinte du texte qui le dit.';

commit;
