-- Un projet ne met plus rien dans le carnet de personne.
--
-- ## Ce qu'on avait laissé tourner
--
-- Chaque projet créé déclenchait `ensure_default_project_situations`, qui lui
-- écrivait une situation « Tous les sujets ouverts ». C'était cohérent tant
-- qu'une situation appartenait au projet : elle en était le sommaire.
--
-- Depuis l'étape 1, `owner_id` se remplit tout seul avec `auth.uid()`. La
-- situation d'office est donc devenue **celle de la personne qui a créé le
-- projet**, et d'elle seule — ses collaborateurs ne la voient pas, et elle
-- apparaît dans son carnet sans qu'elle l'ait demandé.
--
-- Voir `docs/les-situations-traversent-les-projets.md`, § 7.
--
-- ## Pourquoi on arrête plutôt que de la rendre publique
--
-- **Un carnet est à quelqu'un.** Y verser une ligne au nom d'un geste qui n'a
-- rien à voir — créer un projet — c'est décider à sa place de ce qu'il a à
-- faire. La règle vaut pour la mémoire d'un projet ; elle vaut ici au moins
-- autant, parce qu'un carnet est plus personnel encore.
--
-- La rendre publique n'était pas une option : il n'y a plus d'écran de projet
-- pour la montrer, et une situation sans propriétaire ne se modifie par
-- personne (étape 1). Elle aurait été une ligne que tout le monde voit et que
-- personne ne peut ranger.
--
-- Qui veut ce sommaire le crée : c'est deux clics, et c'est une décision.
--
-- ## Ce qui existe ne disparaît pas
--
-- Les situations déjà créées d'office **restent**, telles qu'elles sont. Un
-- constat ne devient pas faux (règle 6) : quelqu'un s'en sert peut-être, et
-- les effacer ferait disparaître du travail que personne n'a demandé à perdre.
-- On arrête d'en créer ; on ne réécrit pas le passé.
--
-- Strictement additive : un déclencheur retiré, une fonction qui ne fait plus
-- rien. Aucune donnée touchée.

drop trigger if exists trg_projects_default_situations on public.projects;

-- La fonction reste, et ne fait plus rien. La supprimer casserait tout appel
-- resté quelque part — une migration rejouée, un script — et c'est une panne
-- qu'on découvrirait au pire moment. Vidée, elle est inoffensive et se lit.
create or replace function public.ensure_default_project_situations(p_project_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  -- Un projet ne met plus rien dans le carnet de personne : une situation
  -- appartient à qui la crée, et créer un projet n'est pas créer un carnet.
  perform p_project_id;
end;
$$;

comment on function public.ensure_default_project_situations(uuid) is
  'Ne fait plus rien. Un projet ne crée plus de situation : un carnet appartient à qui l''écrit, et créer un projet n''est pas décider de ce que son auteur a à faire. Conservée pour ne casser aucun appel resté en place.';
