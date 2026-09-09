import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import MiniSearch from 'minisearch';
import { INDEX_OPTIONS } from '../poc/search/engine.ts';
import { loadSource, ROOT } from './dane-poc.ts';

const source = await loadSource();
const start = performance.now();
const index = new MiniSearch(INDEX_OPTIONS);
index.addAll(source.rows);
const indexBuildMs = performance.now() - start;
const rowsJson = JSON.stringify(source.rows);
const indexJson = JSON.stringify(index);
const target = ROOT + 'poc/public/generated/';
await mkdir(target, { recursive: true });
const artifacts = {
  records: { bytes: Buffer.byteLength(rowsJson), gzipBytes: gzipSync(rowsJson).length },
  index: { bytes: Buffer.byteLength(indexJson), gzipBytes: gzipSync(indexJson).length },
};
await writeFile(target + 'records.json', rowsJson);
await writeFile(target + 'index.json', indexJson);
await writeFile(target + 'manifest.json', JSON.stringify({ count: source.rows.length, indexBuildMs, artifacts, sources: source.sources, corrections: source.corrections }, null, 2));
console.log(JSON.stringify({ records: source.rows.length, indexBuildMs: Math.round(indexBuildMs), artifacts }, null, 2));
