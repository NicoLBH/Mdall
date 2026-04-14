import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeNormalDetailsCompactSnapshot } from './project-subject-drilldown.js';

test('normalizeNormalDetailsCompactSnapshot conserve expanded explicite', () => {
  const snapshot = normalizeNormalDetailsCompactSnapshot({ compact: true, expanded: false });
  assert.equal(snapshot.compact, true);
  assert.equal(snapshot.expanded, false);
});

test('normalizeNormalDetailsCompactSnapshot fallback expanded=!compact', () => {
  const compactSnapshot = normalizeNormalDetailsCompactSnapshot({ compact: true });
  assert.deepEqual(compactSnapshot, { compact: true, expanded: false });

  const expandedSnapshot = normalizeNormalDetailsCompactSnapshot({ compact: false });
  assert.deepEqual(expandedSnapshot, { compact: false, expanded: true });
});
