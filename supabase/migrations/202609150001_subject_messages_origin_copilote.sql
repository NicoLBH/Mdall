-- Un commentaire peut venir du copilote.
--
-- ## Ce qui manquait, et ce que ça coûtait
--
-- `subject_messages.origin` n'acceptait que deux valeurs : `human` et `mdall`.
-- Transformer une discussion avec le copilote en sujet écrit ses réponses en
-- commentaires, et il faut qu'elles portent leur marque — sans quoi une réponse
-- du copilote se lit comme un avis du projet, avec l'avatar et le nom de la
-- personne qui a transformé la discussion.
--
-- La contrainte refusait ces lignes. Silencieusement, du point de vue de qui
-- transformait : le sujet s'ouvrait, sa description s'écrivait, et **aucun**
-- commentaire n'entrait. L'écran annonçait « 0 commentaire sur 5 » sans pouvoir
-- dire pourquoi.
--
-- ## Pourquoi une troisième valeur, et pas `mdall`
--
-- Ce n'est pas Mdall qui a parlé. Mdall répond dans un sujet, devant l'équipe,
-- et ce qu'il y dit engage le projet. Le copilote a répondu **en privé**, à une
-- personne, dans une exploration que personne n'a tranchée. Les confondre ferait
-- lire une hypothèse de travail comme une position.
--
-- ## Strictement additive
--
-- On remplace la contrainte par la même, élargie. Aucune ligne existante n'en
-- souffre : `human` et `mdall` restent valides, et rien d'autre n'est touché.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subject_messages_origin_check'
      AND conrelid = 'public.subject_messages'::regclass
  ) THEN
    ALTER TABLE public.subject_messages
      DROP CONSTRAINT subject_messages_origin_check;
  END IF;

  ALTER TABLE public.subject_messages
    ADD CONSTRAINT subject_messages_origin_check
    CHECK (origin IN ('human', 'mdall', 'copilote'));
END
$$;
