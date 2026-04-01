create policy "projects_open_all"
on public.projects
for all
to anon, authenticated
using (true)
with check (true);

create policy "documents_open_all"
on public.documents
for all
to anon, authenticated
using (true)
with check (true);

create policy "analysis_runs_open_all"
on public.analysis_runs
for all
to anon, authenticated
using (true)
with check (true);

create policy "subjects_open_all"
on public.subjects
for all
to anon, authenticated
using (true)
with check (true);
