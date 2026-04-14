import test from 'node:test';
import assert from 'node:assert/strict';

import { computeDrilldownTopOffset, normalizeNormalDetailsCompactSnapshot } from './project-subject-drilldown.js';

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

test('computeDrilldownTopOffset retourne 0 si le head normal n’est pas compact', () => {
  assert.equal(computeDrilldownTopOffset({ compact: false }, 146.8), 0);
});

test('computeDrilldownTopOffset arrondit et borne la valeur en mode compact', () => {
  assert.equal(computeDrilldownTopOffset({ compact: true }, 146.8), 147);
  assert.equal(computeDrilldownTopOffset({ compact: true }, -12), 0);
});
