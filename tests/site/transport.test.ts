import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { readText } from '../../src/search/transport.ts';

test('transport odczytuje gzip, odkodowane JSON i odrzuca HTTP 503', async () => {
  const original = globalThis.fetch;
  try {
    for (const body of [gzipSync('{"count":66343}'), Buffer.from('{"count":66343}')]) {
      globalThis.fetch = async () => new Response(body);
      assert.equal(await readText(new URL('https://example.test/records.json'), true), '{"count":66343}');
    }
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(readText(new URL('https://example.test/records.json')), /503/);
  } finally { globalThis.fetch = original; }
});
