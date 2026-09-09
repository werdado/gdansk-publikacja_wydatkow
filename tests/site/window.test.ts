import assert from 'node:assert/strict';
import { test } from 'node:test';
import { windowFor, ROW_HEIGHT } from '../../src/ui/window.ts';

test('pierwsza partia, rozwijanie i ograniczenie liczby wierszy', () => {
  assert.deepEqual(windowFor(0, 600, 66343, 100), {
    start: 0, end: 100, visible: 100, top: 0, bottom: 0,
  });
  const next = windowFor(95 * ROW_HEIGHT, 600, 66343, 100);
  assert.equal(next.visible, 200);
  const middle = windowFor(505 * ROW_HEIGHT, 600, 66343, 700);
  assert.equal(middle.start, 400);
  assert.equal(middle.end, 700);
  assert.equal(middle.top, 400 * ROW_HEIGHT);
  const last = windowFor(66340 * ROW_HEIGHT, 600, 66343, 66343);
  assert.equal(last.end, 66343);
  assert(last.end - last.start <= 300);
  assert.equal(windowFor(0, 600, 0, 0).end, 0);
});
