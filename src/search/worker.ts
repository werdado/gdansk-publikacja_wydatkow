import MiniSearch from 'minisearch';
import { MAX_WINDOW_ROWS, PAGE_SIZE } from '../pagination.ts';
import { SearchEngine, INDEX_OPTIONS } from './engine.ts';
import { publicQuery } from './public-query.ts';
import { readText } from './transport.ts';
import type { Entry, Result } from './model.ts';
import type { Request, Response } from './protocol.ts';

let engine: SearchEngine | undefined;
let current: { requestId: number; result: Result } | undefined;

const send = (message: Response) => postMessage(message);

function emitPage(offset: number, limit: number, windowId: number) {
  if (!engine || !current) return;
  const start = Math.max(0, Math.floor(offset));
  const size = Math.max(1, Math.min(MAX_WINDOW_ROWS, Math.floor(limit)));
  send({
    type: 'result', requestId: current.requestId, windowId, offset: start,
    total: current.result.hits.length, facets: current.result.facets,
    rows: current.result.hits.slice(start, start + size).map(hit => engine!.byId.get(hit.id)!),
  });
}

onmessage = async (event: MessageEvent<Request>) => {
  const message = event.data;
  try {
    if (message.type === 'init') {
      const manifest = JSON.parse(await readText(new URL('generated/manifest.json', message.baseUrl)));
      const [recordsText, indexText] = await Promise.all([
        readText(new URL('generated/' + manifest.files.records, message.baseUrl), true),
        readText(new URL('generated/' + manifest.files.index, message.baseUrl), true),
      ]);
      const rows: Entry[] = JSON.parse(recordsText);
      if (rows.length !== manifest.count) throw new Error('Niepełny zbiór danych.');
      engine = new SearchEngine(rows, MiniSearch.loadJSON<Entry>(indexText, INDEX_OPTIONS));
      send({ type: 'ready', count: rows.length });
    } else if (message.type === 'search') {
      if (!engine) throw new Error('Dane nie są jeszcze gotowe.');
      current = { requestId: message.requestId, result: engine.search(publicQuery(message.query)) };
      emitPage(0, PAGE_SIZE, 0);
    } else if (message.type === 'record') {
      if (!engine) throw new Error('Dane nie są jeszcze gotowe.');
      send({ type: 'record', linkId: message.linkId, entry: engine.byId.get(message.id) ?? null });
    } else if (current?.requestId === message.requestId) {
      emitPage(message.offset, message.limit, message.windowId);
    }
  } catch (error) {
    send({ type: 'error', requestId: 'requestId' in message ? message.requestId : undefined,
      linkId: 'linkId' in message ? message.linkId : undefined,
      message: error instanceof Error ? error.message : String(error) });
  }
};
