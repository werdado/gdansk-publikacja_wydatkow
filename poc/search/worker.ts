import MiniSearch from 'minisearch';
import { SearchEngine, INDEX_OPTIONS } from './engine.ts';
import type { Entry, Result } from './model.ts';
import type { WorkerRequest, WorkerResponse } from './protocol.ts';

let engine: SearchEngine | undefined;
let latest: { requestId: number; result: Result } | undefined;
const send = (message: WorkerResponse) => postMessage(message);

async function readJson(url: URL) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Nie udało się pobrać danych (${response.status}).`);
  return response.text();
}
function page(offset: number) {
  if (!engine || !latest) return;
  send({ type: 'result', requestId: latest.requestId, offset,
    total: latest.result.hits.length, elapsedMs: latest.result.elapsedMs, facets: latest.result.facets,
    rows: latest.result.hits.slice(offset, offset + 100).map(hit => ({ entry: engine!.byId.get(hit.id)!, match: hit.match })),
  });
}
onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      const start = performance.now();
      const [recordsText, indexText, manifestText] = await Promise.all([
        readJson(new URL('generated/records.json', message.baseUrl)),
        readJson(new URL('generated/index.json', message.baseUrl)),
        readJson(new URL('generated/manifest.json', message.baseUrl)),
      ]);
      const rows: Entry[] = JSON.parse(recordsText);
      const manifest = JSON.parse(manifestText);
      if (rows.length !== manifest.count) throw new Error('Niepełny zbiór danych.');
      const loadMs = performance.now() - start;
      const restoreStart = performance.now();
      const index = MiniSearch.loadJSON<Entry>(indexText, INDEX_OPTIONS);
      engine = new SearchEngine(rows, index);
      const restoreMs = performance.now() - restoreStart;
      send({ type: 'ready', count: rows.length, timings: { loadMs, restoreMs, totalMs: performance.now() - start }, artifacts: manifest.artifacts });
    } else if (message.type === 'search') {
      if (!engine) throw new Error('Dane nie są jeszcze gotowe.');
      latest = { requestId: message.requestId, result: engine.search(message.query) };
      page(0);
    } else if (latest?.requestId === message.requestId) page(message.offset);
  } catch (error) {
    send({ type: 'error', requestId: 'requestId' in message ? message.requestId : undefined, message: error instanceof Error ? error.message : String(error) });
  }
};
