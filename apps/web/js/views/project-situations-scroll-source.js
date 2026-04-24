export function resolveKanbanScrollableSource(target) {
  if (!target || typeof target.closest !== "function") return null;

  const cards = target.closest(".situation-kanban__cards");
  if (cards) return cards;

  const column = target.closest(".situation-kanban__col");
  if (!column) return null;

  return column.querySelector(".situation-kanban__cards") || null;
}

