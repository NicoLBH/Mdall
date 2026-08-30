-- Ce qui a causé une exécution.
--
-- Jusqu'ici, une exécution disait ce qu'elle avait lu et ce qu'elle en avait
-- tiré, jamais POURQUOI elle avait eu lieu. Tant que l'atelier était la seule
-- porte, la question ne se posait pas : on avait cliqué, c'était tout. Depuis
-- qu'une fusion réécrit le suivi des avis, deux exécutions d'un même dossier
-- peuvent différer sans qu'aucune main ne les distingue, et l'onglet Actions
-- affichait deux lignes semblables sans dire laquelle venait de quoi.
--
-- On garde donc la proposition qui l'a causée, quand il y en a une. C'est ce
-- qui permet de remonter d'un chiffre du suivi à la décision qui l'a produit —
-- et c'est la seule chose que l'empreinte du lot ne pourra jamais dire, puisque
-- deux fusions différentes peuvent aboutir au même corpus.
--
-- `on delete set null` plutôt que `cascade` : une proposition supprimée
-- n'efface pas l'exécution qu'elle a causée. Le calcul a eu lieu, il a produit
-- des avis qu'on lit encore ; en perdre la trace parce que sa cause a disparu
-- reviendrait à effacer un fait au motif qu'on ne sait plus l'expliquer.
--
-- Additive, comme les précédentes : aucune colonne existante n'est touchée. Les
-- exécutions déjà enregistrées gardent une valeur nulle, et l'écran les lit
-- comme ce qu'elles sont — des lancements manuels depuis l'atelier.

alter table public.ct_analysis_runs
  add column if not exists proposition_id uuid references public.propositions(id) on delete set null,
  add column if not exists trigger_source text;

create index if not exists ct_analysis_runs_proposition_idx
  on public.ct_analysis_runs (proposition_id)
  where proposition_id is not null;
