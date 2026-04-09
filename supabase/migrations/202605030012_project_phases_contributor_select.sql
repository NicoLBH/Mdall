-- Allow active project contributors to read visible project phases

DROP POLICY IF EXISTS project_phases_by_project ON public.project_phases;

CREATE POLICY project_phases_by_project
ON public.project_phases
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
  OR project_id IN (
    SELECT pc.project_id
    FROM public.project_collaborators pc
    LEFT JOIN public.directory_people dp ON dp.id = pc.person_id
    WHERE pc.status = 'Actif'
      AND (
        pc.collaborator_user_id = auth.uid()
        OR dp.linked_user_id = auth.uid()
      )
  )
);

CREATE POLICY project_phases_insert_by_owner
ON public.project_phases
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT p.id
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY project_phases_update_by_owner
ON public.project_phases
FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT p.id
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
);

CREATE POLICY project_phases_delete_by_owner
ON public.project_phases
FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT p.id
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
  )
);
