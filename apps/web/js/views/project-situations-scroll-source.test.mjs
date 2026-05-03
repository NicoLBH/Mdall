import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveKanbanScrollableSource } from "./project-situations-scroll-source.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const situationsPath = path.resolve(__dirname, "./project-situations.js");
const situationsSource = fs.readFileSync(situationsPath, "utf8");

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

test("la vue Situations conserve une source locale pour le Kanban", () => {
  assert.match(situationsSource, /setProjectActiveScrollSource\(sourceEl,\s*\{\s*syncImmediately\s*\}\);/);
});

test("la vue Situations réinitialise la source active hors Kanban", () => {
  assert.match(situationsSource, /if \(kanbanColumns\.length\) \{[\s\S]*?\} else \{[\s\S]*?clearProjectActiveScrollSource\(\);/);
});


test("la vue Situations transmet les dépendances sous-sujet partagées aux events", () => {
  assert.match(situationsSource, /openSharedCreateSubissueModal:\s*\(\.\.\.args\)\s*=>\s*openSharedCreateSubissueModal\(\.\.\.args\)/);
  assert.match(situationsSource, /linkExistingSubjectAsSubissueFromSharedDropdown:\s*\(\.\.\.args\)\s*=>\s*linkExistingSubjectAsSubissueFromSharedDropdown\(\.\.\.args\)/);
});
