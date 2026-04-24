import test from "node:test";
import assert from "node:assert/strict";

import { resolveKanbanScrollableSource } from "./project-situations-scroll-source.js";

function createMockNode({ classes = [], parent = null, cards = null } = {}) {
  const classSet = new Set(classes);
  const node = {
    parent,
    cards,
    matches(selector) {
      if (selector === ".situation-kanban__cards") return classSet.has("situation-kanban__cards");
      if (selector === ".situation-kanban__col") return classSet.has("situation-kanban__col");
      return false;
    },
    closest(selector) {
      let cursor = this;
      while (cursor) {
        if (typeof cursor.matches === "function" && cursor.matches(selector)) {
          return cursor;
        }
        cursor = cursor.parent || null;
      }
      return null;
    },
    querySelector(selector) {
      if (selector === ".situation-kanban__cards") return this.cards || null;
      return null;
    }
  };
  return node;
}

test("resolveKanbanScrollableSource returns cards when target is inside cards", () => {
  const column = createMockNode({ classes: ["situation-kanban__col"] });
  const cards = createMockNode({ classes: ["situation-kanban__cards"], parent: column });
  column.cards = cards;
  const card = createMockNode({ parent: cards });

  assert.equal(resolveKanbanScrollableSource(card), cards);
});

test("resolveKanbanScrollableSource returns column cards when target is inside column", () => {
  const column = createMockNode({ classes: ["situation-kanban__col"] });
  const cards = createMockNode({ classes: ["situation-kanban__cards"], parent: column });
  column.cards = cards;
  const head = createMockNode({ parent: column });

  assert.equal(resolveKanbanScrollableSource(head), cards);
});

test("resolveKanbanScrollableSource returns null outside kanban column", () => {
  const node = createMockNode({});
  assert.equal(resolveKanbanScrollableSource(node), null);
});

