-- De quoi nommer ce qui a changé, et pas seulement dire que ça a changé.
--
-- `corpus_fingerprint` condense le lot en une empreinte : elle suffit à savoir
-- que deux lots diffèrent, jamais à dire en quoi. L'écran ne pouvait donc
-- annoncer qu'« le lot a changé » — ce qui laisse à l'utilisateur le travail de
-- retrouver lequel des dix-sept documents est arrivé depuis.
--
-- On garde donc, à côté de l'empreinte, la liste de ce qui a été lu : pour
-- chaque document, son identifiant, son empreinte de contenu et le nom sous
-- lequel il a été déposé. La comparaison porte sur les empreintes, pas sur les
-- identifiants : un même rapport redéposé sous un autre nom ne doit pas passer
-- pour un nouveau document.
--
-- Le nom est conservé pour une seule raison : pouvoir écrire la phrase. Un
-- document retiré du projet n'a plus de ligne où aller le lire, et « un
-- livrable a disparu » sans pouvoir le nommer ne vaut guère mieux que le
-- silence.
--
-- Additive, comme les précédentes : aucune colonne existante n'est touchée. Les
-- exécutions déjà enregistrées gardent une valeur nulle, et l'écran le sait —
-- il retombe alors sur l'empreinte, qui dit que le lot a changé sans dire quoi.

alter table public.ct_analysis_runs
  add column if not exists corpus_documents jsonb;
