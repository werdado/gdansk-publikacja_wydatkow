import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import MiniSearch from 'minisearch';
import { INDEX_OPTIONS } from '../src/search/engine.ts';
import { loadSource, ROOT } from './dane-poc.ts';

const { rows, sources, corrections } = await loadSource();
const index = new MiniSearch(INDEX_OPTIONS);
index.addAll(rows);
const directory = ROOT + 'site/public/generated/';
await rm(directory, { recursive: true, force: true });
await mkdir(directory, { recursive: true });
async function artifact(name: string, value: unknown) {
  const content = JSON.stringify(value);
  const digest = createHash('sha256').update(content).digest('hex').slice(0, 16);
  const file = `${name}.${digest}.json`;
  await writeFile(directory + file, content);
  await writeFile(directory + file + '.gz', gzipSync(content));
  return file;
}
const files = {
  records: await artifact('records', rows),
  index: await artifact('index', index),
};
await writeFile(directory + 'manifest.json', JSON.stringify({ count: rows.length, sources, corrections, files }, null, 2));
console.log(`Przygotowano ${rows.length} wpisy i indeks.`);
