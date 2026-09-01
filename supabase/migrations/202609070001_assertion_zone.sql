-- La zone d'une affirmation : à quelle partie de l'ouvrage elle s'applique.
--
-- Un corpus de données de base peut valoir pour une partie du bâtiment et un
-- autre pour une autre : le rez-de-chaussée est un ERP, les étages 1 à 3 sont du
-- logement. Sans zone, ces deux corpus se contredisent — « usage : ERP » et
-- « usage : habitation » sur le même projet — alors qu'ils sont tous les deux
-- vrais, chacun chez lui.
--
-- `null` ne veut pas dire « on ne sait pas où » : ça veut dire **partout**. Les
-- affirmations déjà versées valent donc pour l'ouvrage entier, ce qui est
-- exactement ce qu'elles ont toujours voulu dire — aucune reprise n'est
-- nécessaire, et une valeur par défaut serait un choix qu'on n'a pas fait.
--
-- Additive : aucune colonne existante n'est modifiée ni supprimée.

alter table public.project_assertions
  add column if not exists zone text;

-- Lire une zone est le geste de l'écran : on le rend possible sans parcourir
-- toute la mémoire d'un projet.
create index if not exists project_assertions_zone_idx
  on public.project_assertions (project_id, zone);
