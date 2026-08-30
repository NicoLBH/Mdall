-- Ce qu'on dit en fusionnant.
--
-- Git demande un message au moment du commit, et ce n'est pas une formalité :
-- c'est le seul endroit où l'auteur explique **ce qu'il fait et pourquoi**, au
-- moment précis où il le fait. GitHub reprend la même idée pour la fusion d'une
-- pull request — un titre, une description, et la signature de celui qui
-- confirme.
--
-- Une proposition Mdall a exactement le même besoin. Jusqu'ici, fusionner était
-- un clic muet : la conversation gardait le « pourquoi » d'avant, les
-- affirmations gardaient le « quoi », mais le geste lui-même ne disait rien.
-- Six mois plus tard, « qui a fusionné ça, et qu'en disait-il ? » n'avait de
-- réponse que pour la première moitié.
--
-- Deux colonnes, et pas une table : ce message appartient à la fusion, il n'a
-- pas d'existence séparée, et il ne se modifie pas — on ne réécrit pas ce qu'on
-- a dit en signant.
--
-- Additive : les propositions déjà fusionnées gardent des valeurs nulles, et
-- l'écran affiche alors la phrase qu'il sait construire seul, sans prétendre
-- que quelqu'un l'a écrite.

alter table public.propositions
  add column if not exists merge_title text,
  add column if not exists merge_note text;
