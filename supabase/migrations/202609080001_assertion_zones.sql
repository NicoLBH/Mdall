-- Une information peut valoir pour plusieurs zones à la fois.
--
-- La colonne `zone` n'en portait qu'une. Or un usage, une contrainte acoustique,
-- une hypothèse de sol valent souvent pour deux parties de l'ouvrage sans valoir
-- partout : « Bâtiment A / Rdc » et « Bâtiment B / Rdc », mais pas les étages.
-- Une seule zone obligeait à choisir, ou à verser deux fois la même information
-- — et deux lignes pour un même fait, c'est deux histoires à tenir.
--
-- Le tableau vide, comme `null`, veut dire **partout** : c'est la portée
-- générale, pas une ignorance. Les affirmations déjà versées valent donc pour
-- l'ouvrage entier, ce qu'elles ont toujours voulu dire.
--
-- `zone` n'est ni modifiée ni supprimée : elle reste lue comme la première des
-- zones, le temps que les lignes existantes soient reprises. Une migration qui
-- réécrit des données pour gagner une colonne finit toujours par en perdre.
--
-- Additive : aucune colonne existante n'est modifiée ni supprimée.

alter table public.project_assertions
  add column if not exists zones text[];

-- Lire « ce qui vaut pour cette zone » se fait par recouvrement de tableaux :
-- l'index GIN est le seul qui sache répondre à cette question sans tout lire.
create index if not exists project_assertions_zones_idx
  on public.project_assertions using gin (zones);
