-- Les domaines que le système reconnaît, sur l'ensemble des chantiers.
--
-- LA QUESTION, ET POURQUOI ELLE EST LÉGITIME
--
-- « Sans cette information, comment savoir le niveau de développement du
-- système ? comment vérifier que la prédiction s'améliore ? »
--
-- On avait répondu que les domaines se calculent à partir du contenu d'un
-- projet, donc que la console n'avait pas à les voir. C'était confondre deux
-- choses. Le contenu, c'est « le désenfumage de l'escalier d'accès aux étages
-- reste à trancher ». Le domaine, c'est `incendie` : **un mot d'un vocabulaire
-- fermé de huit**, écrit dans une colonne, qui ne désigne aucun chantier,
-- aucune personne et aucune affirmation.
--
-- Compter les uns n'est pas lire les autres. Et sans ce compte, la console ne
-- peut répondre à aucune des deux questions posées : un taux de précision sans
-- les domaines dit qu'on se trompe, jamais sur quoi.
--
-- CE QUE LA FONCTION REND
--
-- Une ligne par domaine, et rien d'autre que des nombres :
--
--   * combien d'affirmations le portent,
--   * sur combien de chantiers il apparaît,
--   * quand il a été vu pour la première et la dernière fois.
--
-- Ces deux dates sont ce qui répond à « est-ce que ça s'améliore » : un domaine
-- dont la dernière apparition remonte à six mois n'est plus reconnu, et c'est
-- une panne qu'aucun total n'aurait montrée.
--
-- CE QU'ELLE NE REND PAS
--
-- Aucun texte d'affirmation, aucun identifiant de projet, aucun auteur. Par sa
-- signature : `text` pour le domaine, `bigint` pour les comptes. Un nombre ne
-- se remonte pas jusqu'à la ligne qui l'a produit.
--
-- LE NON-CLASSÉ EST UNE LIGNE COMME LES AUTRES
--
-- `domain is null` veut dire que la classification n'a pas su, et c'est
-- précisément ce qu'un administrateur doit voir : le rapport entre ce qui est
-- classé et ce qui ne l'est pas **est** le niveau de développement du système.
-- Le taire montrerait une taxonomie qui marche toujours (règle 5).
--
-- Additive : aucune table, aucune colonne, aucune politique n'est modifiée.

create or replace function public.les_domaines_du_systeme()
returns table (
  domaine text,
  affirmations bigint,
  chantiers bigint,
  depuis timestamptz,
  jusqua timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- **La porte d'abord.** Sans elle, `security definer` rendrait ces comptes à
  -- n'importe quel compte authentifié.
  if not public.est_administrateur() then
    raise exception 'réservé à la console de Mdall';
  end if;

  return query
  select
    -- Le non-classé porte un nom plutôt qu'un vide : une ligne sans libellé se
    -- lirait comme un défaut d'affichage.
    coalesce(nullif(trim(a.domain), ''), 'non-classe') as domaine,
    count(*)::bigint,
    count(distinct a.project_id)::bigint,
    min(a.created_at),
    max(a.created_at)
  from public.project_assertions a
  group by 1
  order by 2 desc, 1;
end;
$$;

comment on function public.les_domaines_du_systeme() is
  'Combien d''affirmations portent chaque domaine, sur combien de chantiers, et entre quelles dates. Un mot d''un vocabulaire fermé et des nombres : aucun texte, aucun identifiant de projet, aucun auteur. Réservée aux administrateurs.';

revoke all on function public.les_domaines_du_systeme() from public;
grant execute on function public.les_domaines_du_systeme() to authenticated;
