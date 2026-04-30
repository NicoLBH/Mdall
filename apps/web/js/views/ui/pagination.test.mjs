import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePaginationState,
  paginateItems,
  renderPaginationControls
} from './pagination.js';

test('normalizePaginationState enforces defaults and clamps currentPage', () => {
  const state = normalizePaginationState({ totalItems: 60, pageSize: null, currentPage: 999 });
  assert.equal(state.pageSize, 25);
  assert.equal(state.totalPages, 3);
  assert.equal(state.currentPage, 3);
  assert.equal(state.startIndex, 50);
  assert.equal(state.endIndex, 60);
});

test('paginateItems returns expected page slice', () => {
  const items = Array.from({ length: 60 }, (_, i) => i + 1);
  const page = paginateItems(items, { pageSize: 25, currentPage: 2 });
  assert.equal(page.items.length, 25);
  assert.deepEqual(page.items.slice(0, 3), [26, 27, 28]);
  assert.deepEqual(page.items.slice(-2), [49, 50]);
});

test('renderPaginationControls hides controls when one page only', () => {
  assert.equal(renderPaginationControls({ totalItems: 3, pageSize: 25, currentPage: 1 }, { entity: 'subjects' }), '');
});

test('renderPaginationControls renders buttons, active page and ellipsis', () => {
  const html = renderPaginationControls({ totalItems: 675, pageSize: 25, currentPage: 4 }, { entity: 'subjects' });
  assert.match(html, /data-pagination-entity="subjects"/);
  assert.match(html, /project-pagination__button--active/);
  assert.match(html, /project-pagination__ellipsis/);
  assert.match(html, /Previous/);
  assert.match(html, /Next/);
});
