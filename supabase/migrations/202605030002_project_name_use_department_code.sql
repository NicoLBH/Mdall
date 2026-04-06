create or replace function public.create_project_with_default_phases(
  p_project_name text,
  p_description text default null,
  p_city text default null,
  p_postal_code text default null,
  p_department_code text default null,
  p_project_owner_name text default null,
  p_current_phase_code text default 'PC'
)
returns public.projects
language plpgsql
security invoker
as $$
declare
  v_phase_code text := upper(trim(coalesce(p_current_phase_code, 'PC')));
  v_project_name text := trim(coalesce(p_project_name, ''));
  v_city text := trim(coalesce(p_city, ''));
  v_postal_code text := trim(coalesce(p_postal_code, ''));
  v_department_code text := upper(trim(coalesce(p_department_code, '')));
  v_project_owner_name text := trim(coalesce(p_project_owner_name, ''));
  v_display_name text;
  v_project public.projects;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_phase_code = '' then
    v_phase_code := 'PC';
  end if;

  if v_phase_code not in ('PC', 'AT', 'APS', 'APD', 'PRO', 'DCE', 'MARCHE', 'EXE', 'DOE', 'GPA', 'EXPLOIT') then
    raise exception 'Unsupported phase code: %', v_phase_code;
  end if;

  if v_project_name = '' then
    raise exception 'Project name is required';
  end if;

  if v_city = '' then
    raise exception 'City is required';
  end if;

  if v_postal_code = '' then
    raise exception 'Postal code is required';
  end if;

  if v_project_owner_name = '' then
    raise exception 'Project owner name is required';
  end if;

  if v_department_code = '' then
    if v_postal_code ~ '^[0-9]{5}$' then
      if left(v_postal_code, 3) in ('971', '972', '973', '974', '976') then
        v_department_code := left(v_postal_code, 3);
      else
        v_department_code := left(v_postal_code, 2);
      end if;
    else
      v_department_code := v_postal_code;
    end if;
  end if;

  v_display_name := concat_ws('_', v_department_code, v_city, v_project_owner_name, v_project_name);

  insert into public.projects (
    name,
    description,
    postal_code,
    city,
    project_owner_name,
    current_phase_code,
    owner_id
  )
  values (
    v_display_name,
    nullif(trim(coalesce(p_description, '')), ''),
    v_postal_code,
    v_city,
    v_project_owner_name,
    v_phase_code,
    auth.uid()
  )
  returning * into v_project;

  insert into public.project_phases (project_id, phase_code, phase_label, phase_order, phase_date)
  values
    (v_project.id, 'PC', 'Permis de Construire', 1, null),
    (v_project.id, 'AT', 'Autorisation de Travaux', 2, null),
    (v_project.id, 'APS', 'Avant Projet Sommaire', 3, null),
    (v_project.id, 'APD', 'Avant Projet Détaillé', 4, null),
    (v_project.id, 'PRO', 'Projet', 5, null),
    (v_project.id, 'DCE', 'Dossier de Consultation des Entreprises', 6, null),
    (v_project.id, 'MARCHE', 'Marchés', 7, null),
    (v_project.id, 'EXE', 'Exécution', 8, null),
    (v_project.id, 'DOE', 'Dossier des Ouvrages Exécutés', 9, null),
    (v_project.id, 'GPA', 'Année de Garantie de Parfait Achèvement', 10, null),
    (v_project.id, 'EXPLOIT', 'Exploitation', 11, null)
  on conflict (project_id, phase_code) do nothing;

  return v_project;
end;
$$;
