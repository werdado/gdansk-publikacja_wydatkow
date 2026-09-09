import type { Entry, Hit, Query } from './model.ts';

export type WorkerRequest =
  | { type: 'init'; baseUrl: string }
  | { type: 'search'; requestId: number; query: Query }
  | { type: 'page'; requestId: number; offset: number };
export type WorkerResponse =
  | { type: 'ready'; count: number; timings: { loadMs: number; restoreMs: number; totalMs: number }; artifacts: Record<string, { bytes: number; gzipBytes: number }> }
  | { type: 'result'; requestId: number; offset: number; total: number; elapsedMs: number; facets: { name: string; count: number }[]; rows: { entry: Entry; match: Hit['match'] }[] }
  | { type: 'error'; requestId?: number; message: string };
