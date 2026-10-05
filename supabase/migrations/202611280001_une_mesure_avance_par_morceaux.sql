-- ─────────────────────────────────────────────────────────────────────────────
-- Une mesure avance par morceaux
--
-- ## Le mur qu'on lève
--
-- Deux des quatre outils **relisent des documents avec le modèle**. La batterie
-- de perturbations relit deux documents sous six perturbations chacun, plus
-- leur lecture de référence : quatorze lectures, à trois appels au modèle
-- chacune. Une quarantaine d'appels, et plusieurs minutes.
--
-- Une fonction de bord ne vit pas plusieurs minutes. Elle expirerait au milieu,
-- la ligne resterait `en_cours` pour toujours, et la console afficherait « ça
-- tourne » sur une mesure morte (règle 5).
--
-- ## Comment elle avance
--
-- `passerUneEpreuve` est déjà une **unité indépendante** : un document, une
-- perturbation, trois appels, un verdict. La fonction de bord en fait **une
-- seule** par réveil — une quinzaine de secondes —, range ce qu'elle a obtenu
-- ici, et se rappelle. Le bilan ne se dépose qu'au dernier morceau.
--
-- C'est la mécanique des files de lecture, à ceci près qu'elle avance épreuve
-- par épreuve plutôt que document par document : c'est la bonne granularité
-- pour un travail dont chaque morceau coûte trois appels.
--
-- ## Pourquoi l'avancement est gardé, et pas seulement compté
--
-- Parce que le bilan se compose des épreuves, toutes ensemble : `leBilan` lit
-- les verdicts, les invariants posés et ceux qui sont tombés. Ne garder qu'un
-- compteur obligerait à tout recommencer au moindre réveil manqué — c'est-à-dire
-- à repayer quarante appels.
--
-- ## Strictement additive
--
-- Une colonne, avec un défaut. Aucune ligne existante n'est touchée : celles
-- qui sont déjà passées la prennent vide, ce qui est exactement ce qu'elles
-- valent — elles ont fini.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.mesures_demandees
  add column if not exists avancement jsonb not null default '{}'::jsonb;

comment on column public.mesures_demandees.avancement is
  'Ce que la mesure a déjà obtenu, morceau par morceau : {faits: [...], rang: n}. '
  'Le bilan se compose de l''ensemble, et ne se dépose qu''au dernier morceau.';
