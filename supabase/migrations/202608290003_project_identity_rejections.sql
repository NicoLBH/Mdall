-- Une réponse humaine négative vaut autant qu'une positive.
--
-- L'écran ne savait poser qu'une question — « cette affaire est-elle celle de ce
-- projet ? » — et n'en accepter qu'une réponse : oui. Refuser n'était pas un
-- acte, c'était une absence d'acte : on n'appuyait sur rien, le document restait
-- écarté, et la question se reposait au dépôt suivant. Indéfiniment.
--
-- Or « non » est une information, et souvent la plus sûre : celui qui vient
-- d'ouvrir le PDF sait mieux que n'importe quelle règle que ce rapport n'est pas
-- de ce chantier. La conserver, c'est ne plus jamais redemander — exactement la
-- promesse qu'on avait faite au « oui ».
--
-- D'où une colonne plutôt qu'une table : un marqueur rejeté est le même
-- marqueur, avec le signe inverse. Les garder ensemble permet de basculer d'un
-- signe à l'autre sans perdre la trace, et interdit qu'une affaire soit à la
-- fois rattachée et écartée — l'unicité porte sur le couple projet/valeur, pas
-- sur la réponse.

alter table public.project_identity_markers
  add column if not exists rejected boolean not null default false;

comment on column public.project_identity_markers.rejected is
  'Vrai lorsqu''un humain a répondu que cette affaire n''est pas celle de ce projet. '
  'Le marqueur est alors une preuve à charge : les livrables qui la portent sont écartés sans qu''on redemande.';
