-- Une fiche d'avis travaux n'a ni phrase ni numéro : elle a des lignes.
--
-- La première version de cette table supposait qu'une figure illustre un avis
-- numéroté. Un rapport réel l'a démentie : sur une fiche d'avis travaux, la
-- plupart des lignes portent une rubrique — « Principe d'étanchéité » —, un
-- avis « F », une photo, et **rien d'autre**. Pas d'observation, pas de numéro.
-- Le numéro n'apparaît que sur les lignes défavorables.
--
-- Trois colonnes s'ajoutent, et une contrainte se relâche.
--
-- `rubric` est ce que la ligne examine, `avis_letter` ce qu'elle en dit (F ou
-- D), `observation` ce que le contrôleur a écrit en face — souvent rien.
--
-- `avis_reference` cesse d'être obligatoire, et c'est le point important : une
-- ligne favorable **n'a pas de numéro**. L'exiger obligeait à en inventer un,
-- et c'est exactement ce qui s'était produit — une photo d'une ligne favorable
-- s'était vu attribuer le numéro d'une ligne défavorable portant le même
-- intitulé, deux pages plus loin. Un numéro inventé est un avis qui n'existe
-- pas.
--
-- C'est la seule modification d'une colonne existante de tout le projet, et
-- elle ne peut rien perdre : elle élargit ce qui est accepté, elle ne retire ni
-- colonne, ni type, ni ligne.

alter table public.avis_figures
  alter column avis_reference drop not null;

alter table public.avis_figures
  add column if not exists rubric text,
  add column if not exists avis_letter text,
  add column if not exists observation text;

create index if not exists avis_figures_rubric_idx
  on public.avis_figures (project_id, rubric);
