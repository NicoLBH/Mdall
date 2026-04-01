drop trigger if exists trg_milestones_updated_at on public.milestones;

create trigger trg_milestones_updated_at
before update on public.milestones
for each row
execute function public.set_updated_at();
