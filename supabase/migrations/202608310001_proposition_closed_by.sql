-- Qui a renoncé, et quand.
--
-- Une proposition fusionnée disait déjà par qui et à quel moment : `merged_at`
-- et `merged_by`. Une proposition abandonnée ne disait rien — elle changeait
-- d'état, et c'est tout. Or renoncer est une décision comme une autre, et
-- souvent la plus intrigante six mois plus tard : on ne cherche pas seulement
-- ce qui est entré au projet, on cherche aussi ce qu'on avait décidé de ne pas
-- y faire entrer, et qui l'avait décidé.
--
-- C'est la moitié manquante de « qui, quand, pourquoi » que la conversation
-- d'une proposition doit pouvoir raconter. Le pourquoi vit déjà dans les motifs
-- des refus ; le qui et le quand manquaient à ce seul endroit.
--
-- Additive : les propositions déjà abandonnées gardent des valeurs nulles, et
-- l'écran écrit alors « abandonnée » sans prétendre savoir par qui.

alter table public.propositions
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references auth.users(id) on delete set null;
